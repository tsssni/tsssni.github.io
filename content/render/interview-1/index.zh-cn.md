---
title: "Interview I: Metal + Asahi分析Apple Silicon GPU架构"
date: 2026-06-06
draft: false
description: "interview"
tags: ["graphics", "rendering", "gpu"]
---

## Command

### Command Pool

Mesa中的command pool负责在CPU分配和回收command buffer, 即使用户将command buffer作为一次性对象来频繁销毁创建, mesa中也足够高效. hk的实现中, command pool同时为它所分配的所有command buffer管理显存分配.

### Command Buffer

hk录制的命令存到control stream链表, 通过尾部jump指令链接. 状态修改发生在CPU状态机中, 若调用绘制且状态变化, 上传状态到新分配的显存供shader读取. push constatns等内部数据由command buffer管理显存, 因此为保证数据有效, command buffer不能在执行完成前重置. hk单独分配usc(unified shader core)启动命令, AGX要求它们位于虚拟地址低位, 例如descriptor set地址.

### Command Encoder

Metal的command encoder负责标记状态共享边界与命令同步, 提供`MTL(Render|Compute|AccelerationStructure|Blit)CommandEncoder`等丰富的作用域控制功能. Vulkan除render pass外使用command buffer全局共享状态.

### Command Queue

`MTLCommandQueue`/`VkQueue`对应GPU上的的命令提交前端, 它负责发送命令, 执行屏障. `VkQueueFamilyProperties`的`queueCount`和`queueFlags`表示提交前端的并发数量与处理能力. `MTLCommandQueue`不暴露`queueFlags`, 相当于通用queue. AGX底层拥有多个硬件前端, 在Metal中切换encoder可能触发前端切换. 例如hk使用render和compute两种, 但逻辑上只暴露1个queue并串行化命令.

## Synchronization

### Stage

Vulkan认为管线在GPU上是完全并行的, 阶段屏障提供细粒度执行顺序控制实现最大效率. 若上个管线后续阶段不修改当前管线的依赖, 当前管线不再阻塞; 当前管线前置阶段没有依赖, 可前进到有依赖关系的阶段再阻塞.

### Access

访问屏障用于内存一致性保证, 以RADV为例:

- RAW
    - src: `VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT`
    - dst: `VK_ACCESS_SHADER_SAMPLED_READ_BIT`
    - `FLUSH_AND_INV_CB`将color buffer cache写回L2, `INV_VCACHE`强制L0/L1失效
- WAR
    - src: `VK_ACCESS_SHADER_SAMPLED_READ_BIT`
    - dst: `VK_ACCESS_TRANSFER_WRITE_BIT`
    - `PS_PARTIAL_FLUSH`等待读取完成
- WAW
    - src: `VK_ACCESS_SHADER_STORAGE_WRITE_BIT`
    - dst: `VK_ACCESS_SHADER_STORAGE_WRITE_BIT`
    - `WB_L2`将buffer cache写回L2, `CS_PARTIAL_FLUSH`等待写入完成

### Image Layout

[So Long, Image Layouts: Simplifying Vulkan Synchronization](https://www.khronos.org/blog/so-long-image-layouts-simplifying-vulkan-synchronisation)阐明了image layout出现的原因: 初始化, 外部组件共享, 内部格式解析. 前两者现代GPU依然需要, 例如将图片转为显示引擎可读的格式.

内部格式解析在大部分设备上已不再重要, `VK_KHR_unified_image_layout`启用后保证`VK_IMAGE_LAYOUT_GENERAL`具有最高效率. 例如hk/nvk在图像创建时解析是否可以压缩, 绑定内存时设置压缩元数据, 后续交给硬件处理.

RADV驱动中依然依赖image layout执行格式解析, 因此`VK_KHR_unified_image_layout`不受支持, 例如:
- htile(hierarchical tile)
    - src: `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`
    - 在受支持的设备使用htile压缩depth attachment, 若非texture cache compatible则触发解压
- dcc(delta color compression)
    - src: `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_GENERAL`
    - 在受支持的设备使用dcc压缩color attachment, compute engine上转换为`VK_IMAGE_LAYOUT_GENERAL`代表image可写, 不识别dcc的旧硬件使用通用内存格式, 需要解压.
- 片元掩码(fragment mask)
    - src: `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_GENERAL`
    - 4样本MSAA像素覆盖两个三角形, 只写入两种颜色以降低带宽, 用于索引的fmask设为[0, 0, 1, 1], 后续写入退化为完整存储4个样本.
- 快速清屏消除(fast clear eliminate)
    - src: `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`
    - 非texture cache compatible MSAA图像无法读取快速清屏值, layout转移触发将该值写入MSAA样本

## Pipeline

现代API通过显示声明管线支持AOT, Vulkan中`VkPipelineLayout`和`VkShaderModule`等状态必须静态, viewport等可按需求选择. Metal支持`MTL(Render|Compute)PipelineState`, 从`MTLLibrary`中提取函数, Metal始终不允许静态化viewport等状态, 避免组合爆炸. Vulkan后续推出`VK_EXT_graphics_pipeline_library`, 允许管线不同阶段独立编译再链接, 降低编译开销但同时阻止了跨阶段编译优化.

### Input Assembly

IA阶段负责图元装配与顶点数据获取. 通常图元装配是固定管线, 硬件扫描index buffer, 执行vertex去重, 使用更紧凑的索引, 直到图元或顶点数量达到上限. 顶点数据获取的实现更多样, 例如hk将该阶段转为vertex shader前置的软件内存读取, nvk则完全硬件化.

### TBDR

为减少频繁写入显存的功耗开销, 将屏幕划分为tile, 让多次绘制只操作tile内的缓存, `vk(Begin|End)Rendering`/`MTLRenderCommandEncoder`标记tile复用边界. tiling phase中硬件tiler将render pass内多次绘制的所有图元按tile分类, rendering phase以tile为单位启动并读取图元, 执行剔除与着色.

AGX使用逐像素的HSR(hierarchical surface removal), 会等待tile内所有图元完成深度测试. Adreno生成只计算position的vertex shader, 在tiling phase执行并生成1/8 LRZ(low resolution z), 即8x8最近深度中的最远值, rendering phase使用LRZ剔除. Mali使用保守的Early-Z, 根据已写入depth判断是否着色.

`vkCmdBeginRendering`中, hk会执行多项准备工作, 例如:
1. 基于color attachment的alignment排序, 最大化每个sample可用空间的利用率, hk中每个sample最多占用64字节
2. sample最大空间无法容纳所有attachment, 需要将溢出部分驻留显存, AGX无法处理显存中的压缩格式, 需要解压
3. tiler heap容量有限, 图元过多时触发partial render执行部分绘制, 需要写回显存, 加载剩余图元后回读并继续
4. 非全屏绘制时, 某些tile可能只有一部分位于绘制范围, 因此无法使用tile粒度的fast clear, 执行软件实现

hk的alpha test/blending等output merger操作都使用软件实现, 插入fragment shader尾部以在tile内执行. hk实现了`VK_KHR_dynamic_rendering`, subpass在mesa中由dynamic rendering模拟, 多个subpass间的tile复用退化为显存读写, 因此不推荐在mesa中使用subpass.

### Perspective Correction

对物体做线性变换重心坐标不变. 比如正交投影到 xy 平面, 相当于面积缩放 $n \cdot z$. 内部子三角形缩放相同, 即面积比例不变, 可用二维面积计算重心坐标. 数学证明:

$$
\begin{aligned}
T(\mathbf{x}) &= \mathbf{M}\mathbf{x} + \mathbf{t}, \ \mathbf{P} = \sum_i b_i \mathbf{v}_i, \ \sum_i b_i = 1\\
T(\mathbf{P})
&= \mathbf{M}\left(\sum_i b_i \mathbf{v}_i\right) + \mathbf{t}\\
&=  \sum_i b_i\,\mathbf{M}\mathbf{v}_i + \left(\sum_i b_i\right) \mathbf{t}
= \sum_i b_i\,\mathbf{M}\mathbf{v}_i + \sum_i b_i\,\mathbf{t}\\
&=  \sum_i b_i \left( \mathbf{M}\mathbf{v}_i + \mathbf{t} \right)
= \sum_i b_i\,T(\mathbf{v}_i)
\end{aligned}
$$

透视投影含逐点除以$w$使得重心坐标不再恒定, 但透视除法之前的步骤为线性变换, 可通过分析透视除法前的系数关系得到透视矫正系数. 裁剪空间变换如下:

$$
\tilde{\mathbf{V}}(\mathbf{P})\ =\ \mathbf{M}\,(\mathbf{P},1)\ =\ \sum_i b_i\,\mathbf{M}\,(\mathbf{P}_i,1)\ =\ \sum_i b_i\,\tilde{\mathbf{V}}_i
$$

裁剪空间$w$可用重心坐标插值, 将NDC坐标按透视除法的$\mathbf{p}_i=(x_i,y_i)/w_i$分解:

$$
\begin{aligned}
\mathbf{p}
&=\frac{\sum_i b_i\,(x_i,y_i)}{\sum_j b_j w_j} = \frac{\sum_i b_i w_i\cdot (x_i,y_i)/w_i}{\sum_j b_j w_j}\\
&=\sum_i \frac{b_i w_i}{\sum_j b_j w_j}\,\mathbf{p}_i = \sum_i s_i \mathbf{p}_i
\end{aligned}
$$

基于$s_i$推导$b_i$:

$$
\begin{aligned}
\frac{s_i}{w_i} &= \frac{b_i}{\sum_j b_j w_j}\\
\sum_i \frac{s_i}{w_i} &= \frac{\sum_i b_i}{\sum_j b_j w_j} = \frac{1}{\sum_j b_j w_j}\\
b_i &= \frac{s_i / w_i}{\sum_j s_j / w_j}
\end{aligned}
$$

### Triangle Setup

边函数$e(\mathbf{p}) = \begin{vmatrix}\mathbf{v}_1 - \mathbf{v}_0 \\ \mathbf{p} - \mathbf{v}_0\end{vmatrix}$结果为两条向量组成的平行四边形的有向面积, 可用于重心坐标计算, 同时可通过符号判断位于边的哪一侧, 三个边函数符号相同则位于三角形内.

需要基于$\mathbf{x} = \begin{bmatrix}\frac{\partial u}{\partial x}\ \frac{\partial u}{\partial y} \\ \frac{\partial v}{\partial x}\ \frac{\partial v}{\partial y} \end{bmatrix}$计算纹理屏幕空间微分用于选择预滤波mipmap. 光追应用通常基于相邻像素发射微分光线与三角形求交计算$b = \begin{bmatrix}\frac{\partial\mathbf{P}}{\partial x}\ \frac{\partial\mathbf{P}}{\partial y}\end{bmatrix}$, 结合预计算的$A = \begin{bmatrix}\frac{\partial\mathbf{P}}{\partial u}\ \frac{\partial\mathbf{P}}{\partial v}\end{bmatrix}$, 求解$A\mathbf{x}=b$.

光栅化硬件为提高效率, 通常在预计算边函数系数, 以固定宽度并行扫描包围盒内像素. 着色以2x2 quad为单位, 微分通过读取相邻线程$uv$计算, 三角形边缘处由范围外的helper lane补齐差分. 小三角形下硬件每时钟处理的三角形数量有限, 定宽扫描可能只生效一个像素, 成为串行瓶颈; 三次顶点着色可能只对应一次片元着色, quad中大部分lane为helper. nanite对小三角形改用软件光栅化, 上述流程只占用一个lane以减少浪费.

## Descriptor

### Descriptor Set

若设置`VK_DESCRIPTOR_BINDING_VARIABLE_DESCRIPTOR_COUNT_BIT`, descriptor count设置可以延迟到分配阶段, 这使得descriptor set layout可以被多个只有bindless descriptor count不同的descriptor set使用. Vulkan只允许在最后一个绑定点设置它.

若设置`VK_DESCRIPTOR_BINDING_UPDATE_AFTER_BIND_BIT`, descriptor set绑定后仍然可以更新descriptor, 使得bindless descriptor可在任意时间更新, 提升流式加载的性能.

### Descriptor Buffer

`VK_EXT_descriptor_buffer`使得descriptor set暴露底层的`VkBuffer`, 可直接操作该buffer, 通过一系列接口暴露descriptor offset/size等信息来执行更新. Vulkan descriptor size不等长, 驱动也可能对重排用户声明的descriptor顺序, 因此必须事先查询.

硬件可能特殊处理sampler, 例如hk定义了长度1024, 全局唯一的`hk_sampler_heap`, 创建sampler时写入该heap并去重, descriptor set中只存储指向该堆的索引.

### Descriptor Heap

`VK_EXT_descriptor_heap`可以兼容d3d12 descriptor heap, 不再有隐含的descriptor重排. 若在hlsl中用`ResourceDescriptorHeap`访问任意类型descriptor, 需要保持descriptor等长, 可用最大descriptor size作为统一stride.

### Descriptor Pool

对于许多现代设备, descriptor pool底层与descriptor buffer一致. 例如hk的descriptor pool封装的是可以容纳最大数量descriptor set的heap, 分配set时从heap中分配内存.

旧设备/嵌入式设备的descriptor set可能封装了其它分配/绑定方式, 例如raspberry pi v3dv使用opengl时代的做法, 将uniform设置为地址或值; 更旧的硬件可能直接将descriptor写入寄存器.

### Push Constants

hk push constants位于`hk_root_descriptor_table`, 在command buffer中共享. push constants被上传到显存, 设置uniform寄存器为地址.

### Inline Uniform Block

inline unifomr block将ubo数据直接写入descriptor set内存而非描述符, hk编译期将ubo访问翻译为在descriptor set中寻址.

### Layout

- scalar: C语言对齐, 成员的偏移必须满足自身对齐, 结构体使用最大成员的对齐.
- base: `std430`, 增加向量对齐, `vec3`使用`vec4`对齐, 结构体向上取整到`vec4`.
- extended: `std140`, 由于旧硬件UBO位于寄存器, 动态索引编译期无法分配寄存器, 只能运行时加载完整的16字节寄存器, 因此数组每个成员都向上取整到`vec4`.

### Register

GCN架构中, VGPR是为subgroup中的每个lane单独分配, SGPR在subgroup中共享. VGPR与SGPR从不同的寄存器文件中分配, 计算分别发生在VALU与SALU. 将共享的数据使用SGPR分配可以显著减少ALU和寄存器压力.

AGX使用统一的GPR, 以2字节为单位分配. 此外还有uniform register存储标量, 由于没有SALU, 只能在shader执行前加载或预计算, 除运行时计算结果外也存放push constants, descriptor等数据.

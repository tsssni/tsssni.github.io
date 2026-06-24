---
title: "Interview I: Metal + Asahi分析Apple Silicon GPU架构"
date: 2026-06-06
draft: false
description: "interview"
tags: ["graphics", "rendering", "gpu"]
---

## Command

### Command Pool

Mesa中的命令池负责在CPU分配和回收命令缓冲, 即使用户将命令缓冲作为一次性对象来频繁销毁创建, Mesa中也足够高效. HK的实现中, 命令池同时为它所分配的所有命令缓冲管理内存分配.

### Command Buffer

HK录制的命令存到控制流链表, 通过尾部跳转指令链接. CPU状态机记录状态修改, 若调用绘制且状态变化, 上传状态到新分配的内存. 推送常量等内部数据由命令缓冲管理内存, 因此为保证数据有效, 命令缓冲不能在执行完成前重置. HK单独分配统一着色器核心(Unified Shader Core)启动命令, AGX要求它们位于虚拟地址低位, 例如描述符集地址.

### Command Encoder

Metal的命令编码器负责标记状态共享边界与命令同步, 提供`MTL(Render|Compute|AccelerationStructure|Blit)CommandEncoder`等作用域控制功能. Vulkan除渲染通道外使用命令缓冲全局共享状态.

### Command Queue

`MTLCommandQueue`/`VkQueue`对应GPU上的命令提交前端, 它负责发送命令与执行屏障. `VkQueueFamilyProperties`的`queueCount`和`queueFlags`表示提交前端的并发数量与处理能力. `MTLCommandQueue`不暴露`queueFlags`, 相当于通用队列. AGX底层拥有多个硬件前端, 在Metal中切换编码器可能触发前端切换. 例如HK使用渲染和计算两种, 但逻辑上只暴露1个队列并串行化命令.

## Synchronization

### Barrier

Metal没有Vulkan的细粒度屏障, 不追踪风险时需要通过`MTLFence`在编码器间添加屏障. `MTLDispatchTypeSerial`同步编码器内依赖, `MTLDispatchTypeConcurrent`则不保证, 需要调用`memoryBarrier`, 只支持粗粒度的给调用时所有纹理/缓冲/渲染附件添加屏障.

### Stage

Vulkan认为管线在GPU上是完全并行的, 阶段屏障提供细粒度执行顺序控制实现最大效率. 若当前管线的依赖不被上个管线的后续阶段修改, 管线不再阻塞; 管线前置阶段没有依赖, 可前进到有依赖关系的阶段再阻塞.

### Access

访问屏障用于内存一致性保证, 以RADV为例:

- RAW
    - src: `VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT`
    - dst: `VK_ACCESS_SHADER_SAMPLED_READ_BIT`
    - `FLUSH_AND_INV_CB`将颜色缓存写回L2, `INV_VCACHE`强制L0/L1失效
- WAR
    - src: `VK_ACCESS_SHADER_SAMPLED_READ_BIT`
    - dst: `VK_ACCESS_TRANSFER_WRITE_BIT`
    - `PS_PARTIAL_FLUSH`等待读取完成
- WAW
    - src: `VK_ACCESS_SHADER_STORAGE_WRITE_BIT`
    - dst: `VK_ACCESS_SHADER_STORAGE_WRITE_BIT`
    - `WB_L2`将缓冲缓存写回L2, `CS_PARTIAL_FLUSH`等待写入完成

### Image Layout

[So Long, Image Layouts: Simplifying Vulkan Synchronization](https://www.khronos.org/blog/so-long-image-layouts-simplifying-vulkan-synchronisation)阐明图像布局的存在理由: 初始化, 外部组件共享, 内部格式解析. 前两者现代GPU依然需要, 例如将图片转为显示引擎可读的格式.

内部格式解析在大部分设备上已不再重要, `VK_KHR_unified_image_layout`启用后保证`VK_IMAGE_LAYOUT_GENERAL`具有最高效率. 例如HK/NVK在图像创建时解析是否可以压缩, 绑定内存时设置压缩元数据, 后续交给硬件处理.

RADV驱动依赖图像布局执行格式解析, 故不支持`VK_KHR_unified_image_layout`, 例如:
- HTILE(Hierarchical Tile)
    - src: `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`
    - 使用HTILE压缩深度附件, 若不兼容纹理缓存格式则触发解压
- DCC(Delta Color Compression)
    - src: `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_GENERAL`
    - 使用DCC压缩颜色附件, 在计算引擎上格式转换为`VK_IMAGE_LAYOUT_GENERAL`, 代表图像可写, 不识别DCC的旧硬件使用通用内存格式, 需要解压.
- 片元掩码(Fragment Mask)
    - src: `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_GENERAL`
    - 4样本MSAA像素覆盖两个图元, 只写入两种颜色以降低带宽, 索引片元掩码设为[0, 0, 1, 1], 后续写入退化为完整存储4个样本.
- 快速清屏消除(Fast Clear Eliminate)
    - src: `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`
    - dst: `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`
    - 不兼容纹理缓存格式的MSAA图像无法读取快速清屏值, 需要写入MSAA样本

## Pipeline

现代API显式声明管线以支持AOT, Vulkan中`VkPipelineLayout`和`VkShaderModule`等状态必须静态, 视口等状态可静态化. Metal支持`MTL(Render|Compute)PipelineState`, 从`MTLLibrary`中提取函数, Metal始终不允许静态化视口等状态以避免组合爆炸. Vulkan后续推出`VK_EXT_graphics_pipeline_library`, 允许管线的不同阶段独立编译再链接, 降低编译开销但同时阻止了跨阶段编译优化.

### Input Assembly

IA阶段负责图元装配与顶点数据获取. 通常图元装配是固定管线, 硬件扫描索引缓冲, 执行顶点去重, 使用更紧凑的索引, 直到图元或顶点数量达到上限. 顶点数据获取的实现更多样, 例如HK将该阶段转为顶点着色器前置的软件内存读取, NVK则完全硬件化.

### TBDR

为减少频繁写入内存的功耗增长, 光栅器预先划分屏幕为图块, 多次绘制只操作片上缓存, `vk(Begin|End)Rendering`/`MTLRenderCommandEncoder`标记图块复用边界. 分块阶段中硬件分块器将渲染通道内多次绘制的所有图元按图块分类, 渲染阶段以图块为单位启动, 读取图元并执行剔除与着色.

AGX使用逐像素HSR(Hierarchical Surface Removal), 等待图块内所有图元完成深度测试. Adreno生成只计算位置的顶点着色器, 在分块阶段执行并生成1/8 LRZ(Low Resolution Z), 即8x8最近深度中的最远值. Mali使用保守的Early-Z, 根据已写入深度剔除.

`vkCmdBeginRendering`中, HK会执行多项准备工作, 例如:
1. 基于颜色附件的对齐排序, 最大化空间利用率, HK中每个样本最多占用64字节
2. 颜色附件溢出部分需要驻留内存, AGX无法处理内存中的压缩格式, 执行解压
3. 分块器容量有限, 图元过多时触发部分绘制并写回内存, 加载剩余图元后回读并继续
4. 非全屏绘制时导致部分图块超出绘制范围, 不支持图块粒度快速清屏, 执行软件实现

HK的透明度测试等输出合并操作使用软件实现, 插入到片元着色器尾部以在图块内执行. HK实现了`VK_KHR_dynamic_rendering`, 子通道在Mesa中由动态渲染模拟, 多个子通道的图块复用退化为显存读写, 因此不推荐在Mesa中使用子通道.

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

需要基于$\mathbf{x} = \begin{bmatrix}\frac{\partial u}{\partial x}\ \frac{\partial u}{\partial y} \\ \frac{\partial v}{\partial x}\ \frac{\partial v}{\partial y} \end{bmatrix}$计算纹理屏幕空间微分以选择预滤波Mipmap. 光追应用通常基于相邻像素发射微分光线与三角形求交计算$b = \begin{bmatrix}\frac{\partial\mathbf{P}}{\partial x}\ \frac{\partial\mathbf{P}}{\partial y}\end{bmatrix}$, 结合预计算的$A = \begin{bmatrix}\frac{\partial\mathbf{P}}{\partial u}\ \frac{\partial\mathbf{P}}{\partial v}\end{bmatrix}$, 求解$A\mathbf{x}=b$.

光栅化硬件为提高效率, 通常在预计算边函数系数后, 以固定宽度并行扫描包围盒内像素. 着色以2x2四元组为单位, 微分通过读取组内线程$uv$计算, 图元边缘由范围外的辅助线程补齐差分. 小三角形下硬件每时钟处理的三角形数量有限, 定宽扫描可能只生效一个像素, 成为串行瓶颈; 三次顶点着色可能只对应一次片元着色, 四元组中大部分线程为辅助线程. Nanite对小三角形改用软件光栅化, 上述流程只占用一个线程以减少浪费.

## Descriptor

### Descriptor Set

若设置`VK_DESCRIPTOR_BINDING_VARIABLE_DESCRIPTOR_COUNT_BIT`, 描述符数量的设置延迟到分配阶段, 描述符集布局可以被多个只有无绑定描述符数量不同的描述符集使用. Vulkan只允许将最后一个绑定点设置为可变.

若设置`VK_DESCRIPTOR_BINDING_UPDATE_AFTER_BIND_BIT`, 允许描述符集在绑定后更新, 无绑定描述符更新时机不受限, 提升流式加载的性能.

### Descriptor Buffer

`VK_EXT_descriptor_buffer`使得描述符集暴露底层的`VkBuffer`, 可直接操作该缓冲, 通过一系列接口暴露描述符偏移/长度等信息执行更新. Vulkan不同类型的描述符不等长, 驱动也可能重排用户声明的描述符顺序, 因此必须事先查询.

硬件可能特殊处理采样器, 例如HK定义了长度为1024且全局唯一的`hk_sampler_heap`, 创建采样器时写入该推并去重, 描述符只存储指向该堆的索引.

### Descriptor Heap

`VK_EXT_descriptor_heap`可以兼容D3D12描述符堆, 不再有隐式描述符重排. 在hlsl中用`ResourceDescriptorHeap`访问任意描述符需要保持等长, 可用最大长度作为统一步长.

### Descriptor Pool

对于许多现代设备, 描述符池分配描述符集的方式与描述符缓冲一致. 例如HK的描述符池封装可容纳最大数量描述符集的堆, 分配描述符集时从堆中分配内存.

旧设备或嵌入式设备的描述符集可能封装了其它分配/绑定方式, 例如Raspberry PI V3DV使用OpenGL方法, 将变量设置为地址或值; 更旧的硬件可能直接将描述符写入寄存器.

### Push Constants

HK推送常量位于`hk_root_descriptor_table`, 在命令缓冲中共享. 推送常量上传到内存, 设置在变量寄存器写入地址来访问.

### Inline Uniform Block

内联变量块将UBO数据直接写入描述符集内存, 而非描述符间接访问, HK在编译期将UBO访问翻译为在描述符集中寻址.

### Layout

- scalar: C语言对齐, 成员的偏移必须满足自身对齐, 结构体使用最大成员的对齐.
- base: `std430`, 增加向量对齐, `vec3`使用`vec4`对齐, 结构体向上取整到`vec4`.
- extended: `std140`, 由于旧硬件UBO位于寄存器, 动态索引编译期无法分配寄存器, 只能运行时加载完整的16字节寄存器, 因此数组每个成员都向上取整到`vec4`.

### Register

GCN架构中, VGPR为子组的每个线程单独分配, SGPR为子组共享. VGPR与SGPR使用不同的寄存器文件, 分别用VALU与SALU读取. 共享数据分配到SGPR可减少ALU和寄存器压力.

AGX使用统一GPR, 分配单位2字节, 此外有变量寄存器存储共享标量. 由于没有硬件SALU, 只能在着色器前插入变量加载或预计算. 除运行时计算结果, 变量寄存器也存放推送常量, 描述符等数据.

## Resource

### Sparse Memory

稀疏内存为超大尺寸虚拟纹理/缓冲提供硬件支持, Vulkan将硬件支持分为稀疏绑定/驻留, 稀疏绑定可将资源绑定到不同内存, 稀疏驻留在其基础上可部分绑定, 未绑定区域的访问良定义. 若支持稀疏驻留别名, 相同稀疏内存可绑定到不同资源.

由于稀疏内存暴露虚拟页表, `vkQueueBindSparse`操作队列修改硬件页表, 用信号量同步, 需要队列支持`VK_QUEUE_SPARSE_BINDING_BIT`, 可实现异步绑定.

Metal只支持虚拟纹理, 使用`MTLResourceStateCommandEncoder`执行映射, 因此页表同步发生在编码器的分配/释放. 分配内存需要设置堆为`MTLHeapTypeSparse`, 不支持别名.

HK通过硬件DRM实现虚拟纹理与缓冲, 创建虚拟资源时将整段页表绑定到值为0的页面, 维护额外的稀疏页表. 由于AGX硬件页表16KB, Vulkan规范为64KB, HK将Z-Order连续的纹理页面绑定到Vulkan页面.

对于虚拟纹理, 若支持Mipmap, Vulkan要求高Mip等级用连续内存绑定. AGX图像队列各层连续存储各自的Mip等级, 由于AGX页表为16KB, 小图可能与其它层共享64KB逻辑页面, 无法逐个绑定各层页表. 因此AGX返回`VK_SPARSE_IMAGE_FORMAT_SINGLE_MIPTAIL_BIT`, 偏移返回魔数, 用户将所有层的高Mip写到连续内存, HK将连续内存分散绑定到实际位置.

### Residency Set

Metal中需要通过`useResource`声明资源可被访问, 否则不保证虚拟地址映射到物理内存. 无绑定模型下难以声明所有资源, Metal3添加驻留集以支持一次声明多个资源的驻留情况, 允许向驻留集添加多个资源或内存堆.

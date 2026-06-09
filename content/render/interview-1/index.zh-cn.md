---
title: "Interview I: Metal + Asahi分析Apple Silicon GPU架构"
date: 2026-06-06
draft: false
description: "interview"
tags: ["graphics", "rendering", "gpu"]
---

## Rasterizer

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

## Command

### Command Pool

Mesa中的command pool负责在CPU分配和回收command buffer, 即使用户将command buffer作为一次性对象来频繁销毁创建, mesa中也足够高效. hk的实现中, command pool同时为它所分配的所有command buffer管理显存分配.

### Command Buffer

hk录制的命令存到control stream链表, 通过尾部jump指令链接. 状态修改发生在CPU状态机中, 若调用绘制且状态变化, 上传状态到新分配的显存供shader读取. push constatns等内部数据由command buffer管理显存, 因此为保证数据有效, command buffer不能在执行完成前重置. hk单独分配usc(unified shader core)启动命令, agx要求它们位于虚拟地址低位, 例如descriptor set地址.

### Command Encoder

Metal的command encoder负责标记状态共享边界与命令同步, 例如`MTLRenderCommandEncoder`标记tile复用边界, 同时提供`MTL(Compute|AccelerationStructure|Blit)CommandEncoder`等丰富的作用域控制功能.

Vulkan除render pass外使用command buffer全局共享状态, `vkCmd(Begin|end)(RenderPass|Rendering)`对应`MTLRenderCommandEncoder`. hk实现了`VK_KHR_dynamic_rendering`, subpass在mesa中由dynamic rendering模拟, 多个subpass间的tile复用退化为显存读写.

`vkCmdBeginRendering`中, hk会执行多项准备工作, 例如:
1. 基于color attachment的alignment排序, 最大化每个sample可用空间的利用率, hk中每个sample最多占用64字节
2. sample最大空间无法容纳所有attachment, 需要将溢出部分驻留显存, agx无法处理显存中的压缩格式, 需要解压
3. 处理partial render, 例如tile处理的图元过多, 只能部分绘制, 需要写回显存, 加载剩余图元后回读并继续
4. 非全屏绘制时, 某些tile可能只有一部分位于绘制范围, 因此无法使用tile粒度的fast clear, 执行软件实现

### Command Queue

`MTLCommandQueue`/`VkQueue`对应GPU上的的命令提交前端, 它负责发送命令, 执行屏障. `VkQueueFamilyProperties`的`queueCount`和`queueFlags`表示提交前端的并发数量与处理能力. `MTLCommandQueue`不暴露`queueFlags`, 相当于通用queue. AGX底层拥有多个硬件前端, 在Metal中切换encoder可能触发前端切换. 例如hk使用render和compute两种, 但逻辑上只暴露1个queue并串行化命令.

## Descriptor

### Descriptor Buffer

`VK_EXT_descriptor_buffer`使得descriptor set暴露底层的`VkBuffer`, 可直接操作该buffer, 通过一系列接口暴露descriptor offset/size等信息来执行更新. Vulkan descriptor size不等长, 驱动也可能对重排用户声明的descriptor顺序, 因此必须事先查询.

硬件可能特殊处理sampler, 例如hk定义了长度1024, 全局唯一的`hk_sampler_heap`, 创建sampler时写入该heap并去重, descriptor set中只存储指向该堆的索引.

### Descriptor Heap

`VK_EXT_descriptor_heap`可以兼容d3d12 descriptor heap, 不再有隐含的descriptor重排. 若在hlsl中用`ResourceDescriptorHeap`访问任意类型descriptor, 需要保持descriptor等长, 可用最大descriptor size作为统一stride.

### Descriptor Pool

对于许多现代设备, descriptor pool底层与descriptor buffer一致. 例如hk的descriptor pool封装的是可以容纳最大数量descriptor set的heap, 分配set时从heap中分配内存.

旧设备/嵌入式设备的descriptor set可能封装了其它分配/绑定方式, 例如raspberry pi v3dv使用openg时代的做法, 将uniform设置为地址或值; 更旧的硬件可能直接将descriptor写入寄存器.

### Push Constants

hk push constants位于`hk_root_descriptor_table`, 在command buffer中共享. push constants被上传到显存, 设置uniform寄存器为地址.

### Inline Uniform Block

inline unifomr block将ubo数据直接写入descriptor set内存而非描述符, hk编译期将ubo访问翻译为在descriptor set中寻址.

## Synchronization

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

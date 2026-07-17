---
title: "Interview IV: Q&A"
date: 2026-07-05
draft: false
description: "interview"
tags: ["rendering", "graphics", "global illumination"]
---

## 米哈游提前提前批

### 一面

**Q: 你针对ReSTIR GI的优化会引入pattern吗?**

A: 理论上会提高样本的相关性, 实验发现影响较小, 可能是时域复用和降噪抹平了pattern. 本质是用样本间的独立性换取缓存局部性.

**Q: ReSTIR时间和空间复用哪个对最终结果影响更大?**

A: 时间复用, 有效样本数主要由时域累积贡献, 时域样本可以影响未来20-30帧的结果, 且引入的偏差更小; 空间复用单帧只合并少数邻居, 且空间复用结果不会再被下一帧使用. 关闭时间复用整体噪声大幅上升, 关闭空间复用主要影响遮挡区域填充速度.

**Q: 能否将trace结果统一用于diffuse和specular?**

A: 可以部分统一. specular复用时可以重新计算目标函数(BRDF * Li, 也有方案使用Blinn-Phong加速). 但抽样成本更高, 金属度居中的材质可能由于采样不同lobe引入divergency; 且实践中发现, 漫反射半分辨率trace, 镜面反射全分辨率trace但积分值较小时discard, 比单次全屏发射更高效. 可以考虑对rough specular复用漫反射光线.

**Q: PRTGI为什么不使用光追烘焙?**

A: PRTGI只需要材质信息, 不需要烘焙光照, 光栅化足够完成, 且开发用的机器暂不支持光追. 如果使用光追, 面数较高的场景可能效率更高.

**Q: Metal/Vulkan RHI是如何设计的?**

A: 整体基于Metal为封装, 例如使用command encoder录制, 将command buffer的分配和提交由线程安全的command queue处理. 但暴露细粒度的barrier供Vulkan后端执行同步, 支持资源在不同queue family间转移. 为利用device pointer和argument buffer, 使用slang编写shader.

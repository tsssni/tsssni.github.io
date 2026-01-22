---
title: "Metatron Dev. IV: ReSTIR"
date: 2025-05-17
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "restir", "metatron"]
---

{{<katex>}}

本篇为对[GRIS](https://research.nvidia.com/publication/2022-07_generalized-resampled-importance-sampling-foundations-restir)的补充, 证明[ReSTIR GI](https://research.nvidia.com/publication/2021-06_restir-gi-path-resampling-real-time-path-tracing)复用蓄水池时使用的权重为无偏权重, 只证明时域复用后的第一次空域复用, 多次空域可由之推广得到, 不考虑样本不位于支撑集的情况.

令每个像素蓄水池原本的置信度\\(M_i\\), 限制上限后为\\(M_i^'\\), 权重和为\\(w_i^\sigma\\), 选中的样本的目标分布概率为\\(\hat{p}_i(X_i)\\), 无偏权重为\\(W_i = \frac{w_i^\sigma}{\hat{p}_i(X_i)M_i}\\). 选中的样本的序号为\\(s\\), \\(J\\)为Jacobi行列式, 随机选取\\(N\\)个像素, 合并蓄水池后的无偏权重如下, 与ReSTIR GI一致.

$$
\begin{equation}
\begin{aligned}
W_s^r
&= W_s J_s \frac{\sum\_{i=0}^{N - 1} \frac{M_i^'}{M_i} w_i^\sigma J_i}{\frac{M_s^'}{M_s} w_s^\sigma J_s}\frac{M_s^'}{\sum\_{i=0}^{N - 1}M_i^'}\\\\
&= \frac{w_s^\sigma}{\hat{p}_i(X_s)M_s} J_s \frac{\sum\_{i=0}^{N - 1} \frac{M_i^'}{M_i} w_i^\sigma J_i}{\frac{M_s^'}{M_s} w_s^\sigma J_s}\frac{M_s^'}{\sum\_{i=0}^{N - 1}M_i^'}\\\\
&= \frac{\sum\_{i=0}^{N - 1} \frac{M_i^s}{M_s} w_i^\sigma J_i}{\hat{p}_i(X_s) \sum\_{i=0}^{N - 1}M_i^'}
\end{aligned}
\end{equation}
$$

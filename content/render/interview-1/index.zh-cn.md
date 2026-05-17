---
title: "Interview: Metal + Asahi Linux分析Apple Silicon GPU架构"
date: 2026-06-06
draft: false
description: "interview"
tags: ["graphics", "rendering", "cpp"]
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

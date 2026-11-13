---
title: "Metatron Dev. VI: 矩阵微积分"
date: 2026-10-26
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "matrix calculus", "machine learning"]
---

## Differentiability

设$V$与$W$为有限维赋范空间, 函数$F: U \subseteq V \to W$定义在开集$U$上. 若在$x \in U$处存在一个线性映射$L: V \to W$, 使输入扰动$h$满足:

$$
\begin{equation}
F(x + h) = F(x) + L(h) + r(h), \qquad
\lim_{h \to 0}\frac{\|r(h)\|_W}{\|h\|_V} = 0
\end{equation}
$$

则称$F$在$x$处可微. 范数分别衡量输入扰动与输出误差的大小, 极限条件要求线性近似的误差相对于输入扰动趋于零. 线性映射$L$称为$F$在$x$处的导数, 微分则是该映射作用于输入扰动$\mathrm{d}x$的结果:

$$
\begin{equation}
\mathrm{D}F(x) = L, \qquad
\mathrm{d}F = \mathrm{D}F(x)[\mathrm{d}x] = L(\mathrm{d}x)
\end{equation}
$$

一元函数中, 这个线性映射就是$L(h) = f'(x)h$. 对向量或矩阵输入, 导数仍然是作用于扰动的线性映射.

## Jacobian

Jacobian是导数这一线性映射在选定坐标下的矩阵表示. 对矩阵输入与输出, 先约定$\operatorname{vec}$按列依次堆叠矩阵元素. 记$\mathbf{x}_j$为$X$的第$j$列:

$$
\begin{equation}
X = [\mathbf{x}_1, \dots, \mathbf{x}_n] \in \mathbb{R}^{m \times n}, \qquad
\operatorname{vec}(X) =
\begin{pmatrix}
\mathbf{x}_1\\
\vdots\\
\mathbf{x}_n
\end{pmatrix}
\end{equation}
$$

设$F: \mathbb{R}^{m \times n} \to \mathbb{R}^{p \times q}$在$X$处可微, 其Jacobian为唯一满足下式的矩阵$J_F(X) \in \mathbb{R}^{pq \times mn}$:

$$
\begin{equation}
\operatorname{vec}\bigl(\mathrm{D}F(X)[H]\bigr)
= J_F(X)\operatorname{vec}(H)
\end{equation}
$$

### Kronecker Product

设$A = (a_{ij}) \in \mathbb{R}^{m \times n}$, $B \in \mathbb{R}^{p \times q}$, Kronecker积将$A$的每个元素替换为该元素乘以整个$B$, 得到分块矩阵:

$$
\begin{equation}
A \otimes B =
\begin{pmatrix}
a_{11}B & \cdots & a_{1n}B\\
\vdots & \ddots & \vdots\\
a_{m1}B & \cdots & a_{mn}B
\end{pmatrix}
\in \mathbb{R}^{mp \times nq}
\end{equation}
$$

设$A \in \mathbb{R}^{m \times n}$, $B \in \mathbb{R}^{p \times q}$, $X \in \mathbb{R}^{q \times n}$, 则有如下恒等式:

$$
\begin{equation}
(A \otimes B)\operatorname{vec}(X)
= \operatorname{vec}(BXA^T)
\end{equation}
$$

证明: 令$X = [\mathbf{x}_1, \dots, \mathbf{x}_n]$, 其中$\mathbf{x}_j \in \mathbb{R}^{q}$. 根据Kronecker积的分块定义, 左侧为:

$$
\begin{equation}
\begin{aligned}
(A \otimes B)\operatorname{vec}(X)
&=
\begin{pmatrix}
a_{11}B & \cdots & a_{1n}B\\
\vdots & \ddots & \vdots\\
a_{m1}B & \cdots & a_{mn}B
\end{pmatrix}
\begin{pmatrix}
\mathbf{x}_1\\
\vdots\\
\mathbf{x}_n
\end{pmatrix}\\
&=
\begin{pmatrix}
\sum_{j=1}^{n} a_{1j}B\mathbf{x}_j\\
\vdots\\
\sum_{j=1}^{n} a_{mj}B\mathbf{x}_j
\end{pmatrix}
\end{aligned}
\end{equation}
$$

定义$F(X) = BXA^T$, 对任意扰动$H \in \mathbb{R}^{q \times n}$, 增量恰好是关于$H$的线性映射:

$$
\begin{equation}
\begin{aligned}
F(X + H) - F(X)
&= B(X + H)A^T - BXA^T = BHA^T\\
\mathrm{D}F(X)[H] &= BHA^T
\end{aligned}
\end{equation}
$$

由上述恒等式和Jacobian定义, 对任意$H$均有:

$$
\begin{equation}
\begin{aligned}
J_F(X)\operatorname{vec}(H)
&= \operatorname{vec}\bigl(\mathrm{D}F(X)[H]\bigr)\\
&= \operatorname{vec}(BHA^T)\\
&= (A \otimes B)\operatorname{vec}(H)\\
\Longrightarrow \quad J_F(X) &= A \otimes B
\end{aligned}
\end{equation}
$$

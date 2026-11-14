---
title: "Metatron Dev. VI: 矩阵微积分"
date: 2026-10-26
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "matrix calculus", "machine learning"]
---

## Norm

设$V$为实向量空间, 范数$\|\cdot\|: V \to \mathbb{R}$用于衡量向量的大小. 对任意$\mathbf{u}, \mathbf{v} \in V$与$\alpha \in \mathbb{R}$, 范数满足正定性、绝对齐次性和三角不等式:

$$
\begin{equation}
\begin{aligned}
\|\mathbf{v}\| &\geq 0, \qquad
\|\mathbf{v}\| = 0 \iff \mathbf{v} = \mathbf{0}\\
\|\alpha\mathbf{v}\| &= |\alpha|\|\mathbf{v}\|\\
\|\mathbf{u} + \mathbf{v}\| &\leq \|\mathbf{u}\| + \|\mathbf{v}\|
\end{aligned}
\end{equation}
$$

向量$\mathbf{x} \in \mathbb{R}^{n}$的Euclidean范数为:

$$
\begin{equation}
\|\mathbf{x}\|_2 = \sqrt{\sum_{i=1}^{n}x_i^2}
\end{equation}
$$

矩阵$X = (x_{ij}) \in \mathbb{R}^{m \times n}$的Frobenius范数为所有元素的平方和开平方, 等价于将矩阵展平为向量后的Euclidean范数:

$$
\begin{equation}
\|X\|_F = \sqrt{\sum_{i=1}^{m}\sum_{j=1}^{n}x_{ij}^2}
= \sqrt{\operatorname{tr}(X^T X)}
\end{equation}
$$

配备范数的向量空间称为赋范空间. 若序列$\{\mathbf{x}_k\}_{k=1}^{\infty} \subset V$满足下式, 则称为Cauchy序列, 即足够靠后的任意两项都可以任意接近:

$$
\begin{equation}
\forall \varepsilon > 0, \quad
\exists N \in \mathbb{N}, \quad
\forall m, n \geq N, \quad
\|\mathbf{x}_m - \mathbf{x}_n\| < \varepsilon
\end{equation}
$$

如果其中每个Cauchy序列都在该范数下收敛到空间内的某个元素, 则称该空间完备. 完备赋范空间为Banach空间, 有限维赋范空间总是完备.

## Derivative

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

### Jacobian

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

## Gradient

梯度用于表示标量函数的导数, 其定义需要选定内积. 实向量空间上的内积$\langle\cdot, \cdot\rangle: V \times V \to \mathbb{R}$满足对称性、双线性和正定性. 令$\mathbf{u}, \mathbf{v}, \mathbf{w} \in V$, $\alpha, \beta \in \mathbb{R}$, 可得:

$$
\begin{equation}
\begin{aligned}
\langle\mathbf{u}, \mathbf{v}\rangle
&= \langle\mathbf{v}, \mathbf{u}\rangle\\
\langle\mathbf{u}, \alpha\mathbf{v} + \beta\mathbf{w}\rangle
&= \alpha\langle\mathbf{u}, \mathbf{v}\rangle + \beta\langle\mathbf{u}, \mathbf{w}\rangle\\
\langle\mathbf{v}, \mathbf{v}\rangle
&\geq 0, \qquad
\langle\mathbf{v}, \mathbf{v}\rangle = 0 \iff \mathbf{v} = \mathbf{0}
\end{aligned}
\end{equation}
$$

内积诱导范数$\|\mathbf{v}\| = \sqrt{\langle\mathbf{v}, \mathbf{v}\rangle}$, 若内积空间$V$在内积诱导的范数下完备, 则称$V$为Hilbert空间. 因此Hilbert空间在该范数下也是Banach空间. 有限维实内积空间总是Hilbert空间.

设$V$为有限维实内积空间, 标量函数$f: U \subseteq V \to \mathbb{R}$在$\mathbf{x}$处可微. 梯度$\nabla f(\mathbf{x})$是$V$中唯一满足下式的元素:

$$
\begin{equation}
\mathrm{D}f(\mathbf{x})[\mathbf{h}]
= \langle\nabla f(\mathbf{x}), \mathbf{h}\rangle,
\qquad \forall\mathbf{h} \in V
\end{equation}
$$

导数是将输入扰动映射到一阶变化的线性映射, 梯度则是通过内积表示该映射的元素. 对$V = \mathbb{R}^{n}$采用Euclidean内积时:

$$
\begin{equation}
\mathrm{D}f(\mathbf{x})[\mathbf{h}]
= (\nabla f(\mathbf{x}))^T\mathbf{h}, \qquad
J_f(\mathbf{x}) = (\nabla f(\mathbf{x}))^T
\end{equation}
$$

对矩阵空间$V = \mathbb{R}^{m \times n}$采用Frobenius内积:

$$
\begin{equation}
\langle A, B\rangle_F
= \sum_{i,j}a_{ij}b_{ij}
= \operatorname{tr}(A^T B)
\end{equation}
$$

此时梯度与输入矩阵形状相同, 对任意矩阵扰动$H$有:

$$
\begin{equation}
\begin{aligned}
\mathrm{D}f(X)[H]
&= \operatorname{tr}\bigl((\nabla f(X))^T H\bigr)\\
J_f(X) &= \operatorname{vec}(\nabla f(X))^T
\end{aligned}
\end{equation}
$$

梯度依赖内积的选择. 例如在$\mathbb{R}^{n}$上, 对称正定矩阵$W$定义加权内积$\langle\mathbf{u}, \mathbf{v}\rangle_W = \mathbf{u}^T W\mathbf{v}$. 同一个导数在两种内积下满足:

$$
\begin{equation}
\begin{aligned}
\mathrm{D}f(\mathbf{x})[\mathbf{h}]
&= (\nabla f(\mathbf{x}))^T\mathbf{h}
= (\nabla^{(W)}f(\mathbf{x}))^T W\mathbf{h}\\
\nabla^{(W)}f(\mathbf{x}) &= W^{-1}\nabla f(\mathbf{x})
\end{aligned}
\end{equation}
$$

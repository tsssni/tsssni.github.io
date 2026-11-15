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

## Adjoint Differentiation

设$V$与$W$为有限维实内积空间, 参数$\mathbf{p} \in V$通过可微映射$F: V \to W$决定可微标量目标函数$f: W \to \mathbb{R}$的输入$\mathbf{x}$. 已知$f$对输入的梯度, 希望求目标对参数的梯度, 就需要将同一个目标变化从关于$\mathrm{d}\mathbf{x}$的表达改写为关于$\mathrm{d}\mathbf{p}$的表达:

$$
\begin{equation}
\begin{aligned}
\mathbf{x} &= F(\mathbf{p}), \qquad g(\mathbf{p}) = f(\mathbf{x})\\
\mathrm{d}g
&= \langle\nabla_{\mathbf{x}}f, \mathrm{d}\mathbf{x}\rangle_W
= \langle\nabla_{\mathbf{p}}g, \mathrm{d}\mathbf{p}\rangle_V
\end{aligned}
\end{equation}
$$

链式法则给出$\mathrm{d}\mathbf{x} = \mathrm{D}F(\mathbf{p})[\mathrm{d}\mathbf{p}]$. 为将内积中的扰动改为$\mathrm{d}\mathbf{p}$, 需要把这个线性作用移到内积另一侧. 线性算子$L: V \to W$的伴随算子$L^*: W \to V$定义为满足下式的唯一线性算子:

$$
\begin{equation}
\langle L\mathbf{u}, \mathbf{w}\rangle_W
= \langle\mathbf{u}, L^*\mathbf{w}\rangle_V,
\qquad \forall\mathbf{u} \in V,\ \mathbf{w} \in W
\end{equation}
$$

伴随将内积一侧的线性作用转移到另一侧. 在Euclidean内积下, 矩阵表示的线性算子的伴随就是转置:

$$
\begin{equation}
\langle A\mathbf{u}, \mathbf{w}\rangle
= (A\mathbf{u})^T\mathbf{w}
= \mathbf{u}^T A^T\mathbf{w}
= \langle\mathbf{u}, A^T\mathbf{w}\rangle,
\qquad A^* = A^T
\end{equation}
$$

将伴随定义用于$\mathrm{D}F(\mathbf{p})$, 就能把目标对输入的梯度传回参数空间:

$$
\begin{equation}
\begin{aligned}
\mathrm{d}g
&= \langle\nabla_{\mathbf{x}}f, \mathrm{D}F(\mathbf{p})[\mathrm{d}\mathbf{p}]\rangle_W\\
&= \left\langle\bigl(\mathrm{D}F(\mathbf{p})\bigr)^*[\nabla_{\mathbf{x}}f], \mathrm{d}\mathbf{p}\right\rangle_V\\
\nabla_{\mathbf{p}}g
&= \bigl(\mathrm{D}F(\mathbf{p})\bigr)^*[\nabla_{\mathbf{x}}f]
\end{aligned}
\end{equation}
$$

伴随依赖所选内积. Forward沿原计算方向将参数扰动传到目标函数的输入, reverse则通过导数的伴随将目标对输入的梯度传回参数空间.

以参数化线性系统为例, 设$\mathbf{p} \in \mathbb{R}^{d}$决定可逆矩阵$A(\mathbf{p}) \in \mathbb{R}^{n \times n}$, $A$随参数可微, $\mathbf{b} \in \mathbb{R}^{n}$固定. 目标函数的输入$\mathbf{x}$由方程求解得到:

$$
\begin{equation}
A(\mathbf{p})\mathbf{x}(\mathbf{p}) = \mathbf{b}, \qquad
g(\mathbf{p}) = f(\mathbf{x}(\mathbf{p}))
\end{equation}
$$

对$A\mathbf{x} = \mathbf{b}$使用乘积法则, 由于右端固定, 两种变化引起的一阶影响之和为零:

$$
\begin{equation}
\begin{aligned}
&(\mathrm{d}A)\mathbf{x} + A\,\mathrm{d}\mathbf{x} = 0\\
&A\,\mathrm{d}\mathbf{x} = -(\mathrm{d}A)\mathbf{x}\\
&\mathrm{d}\mathbf{x} = -A^{-1}(\mathrm{d}A)\mathbf{x}
\end{aligned}
\end{equation}
$$

代入目标函数的微分, 就将$\mathrm{d}g$从关于$\mathrm{d}\mathbf{x}$的表达改写为关于$\mathrm{d}A$的表达:

$$
\begin{equation}
\begin{aligned}
\mathrm{d}g
&= (\nabla_{\mathbf{x}}f)^T\mathrm{d}\mathbf{x}\\
&= -(\nabla_{\mathbf{x}}f)^T A^{-1}(\mathrm{d}A)\mathbf{x}\\
&= -\underbrace{\bigl((\nabla_{\mathbf{x}}f)^T A^{-1}\bigr)}_{\mathbf{v}^T}
(\mathrm{d}A)\mathbf{x}
\end{aligned}
\end{equation}
$$

从左向右组合乘法, 得到伴随方程:

$$
\begin{equation}
\begin{aligned}
\mathbf{v}^T &= (\nabla_{\mathbf{x}}f)^T A^{-1}\\
\mathbf{v}^T A &= (\nabla_{\mathbf{x}}f)^T\\
A^T\mathbf{v} &= \nabla_{\mathbf{x}}f
\end{aligned}
\end{equation}
$$

由于$A^T$可逆, 伴随方程唯一确定$\mathbf{v}$, 用$A\,\mathrm{d}\mathbf{x} = -(\mathrm{d}A)\mathbf{x}$代换:

$$
\begin{equation}
\begin{aligned}
\mathrm{d}g
&= \langle A^T\mathbf{v}, \mathrm{d}\mathbf{x}\rangle\\
&= \langle\mathbf{v}, A\,\mathrm{d}\mathbf{x}\rangle\\
&= -\mathbf{v}^T(\mathrm{d}A)\mathbf{x}
\end{aligned}
\end{equation}
$$

矩阵变化$\mathrm{d}A$由$A(\mathbf{p})$对参数的依赖决定. 继续按参数展开, 将标量因子$\mathrm{d}p_k$从矩阵乘积中提出, 得到关于参数变化的表达:

$$
\begin{equation}
\begin{aligned}
\mathrm{d}A
&= \sum_{k=1}^{d}\frac{\partial A}{\partial p_k}\,\mathrm{d}p_k\\
\mathrm{d}g
&= \sum_{k=1}^{d}\left(-\mathbf{v}^T\frac{\partial A}{\partial p_k}\mathbf{x}\right)\mathrm{d}p_k\\
\frac{\partial g}{\partial p_k}
&= -\mathbf{v}^T\frac{\partial A}{\partial p_k}\mathbf{x}
\end{aligned}
\end{equation}
$$

最终各$\mathrm{d}p_k$的系数就是目标对参数的偏导. 先解$A\mathbf{x} = \mathbf{b}$得到目标输入并计算$g$与$\nabla_{\mathbf{x}}f$, 再解$A^T\mathbf{v} = \nabla_{\mathbf{x}}f$, 所有参数都复用同一对$\mathbf{x}$与$\mathbf{v}$.

前向微分则逐个计算各参数引起的输入变化, 相比逆向微分计算量较大:

$$
\begin{equation}
\begin{aligned}
A\frac{\partial\mathbf{x}}{\partial p_k}
&= -\frac{\partial A}{\partial p_k}\mathbf{x}\\
\frac{\partial g}{\partial p_k}
&= (\nabla_{\mathbf{x}}f)^T\frac{\partial\mathbf{x}}{\partial p_k}\\
&= -(\nabla_{\mathbf{x}}f)^T
\left(A^{-1}\frac{\partial A}{\partial p_k}\mathbf{x}\right)
\end{aligned}
\end{equation}
$$

## Auto Differentiation

自动微分是在给定输入处计算导数数值的方法. 运算可以组织为计算图, 节点为计算过程中的值, 边表示计算依赖. 自动微分根据链式法则沿计算图组合局部导数, 得到全局导数.

以如下计算为例, 设$y \ne 0$, 将函数拆成正弦、除法与加法三个基本运算:

$$
\begin{equation}
a = \sin x, \qquad b = \frac{a}{y}, \qquad z = b + x
\end{equation}
$$

{{< mermaid >}}
flowchart LR
    X["x"] -->|"cos x"| A["a = sin x"]
    A -->|"1 / y"| B["b = a / y"]
    Y["y"] -->|"−a / y²"| B
    B -->|"1"| Z["z = b + x"]
    X -->|"1"| Z
{{< /mermaid >}}

边表达计算依赖, 边值为局部偏导. 输入微分乘以偏导得到对下游节点微分的贡献.

沿计算图依次组合各节点的微分:

$$
\begin{equation}
\begin{aligned}
\mathrm{d}a &= \cos x\,\mathrm{d}x\\
\mathrm{d}b &= \frac{1}{y}\,\mathrm{d}a - \frac{a}{y^2}\,\mathrm{d}y\\
\mathrm{d}z &= \mathrm{d}b + \mathrm{d}x\\
&= \frac{1}{y}\bigl(\cos x\,\mathrm{d}x\bigr) - \frac{a}{y^2}\,\mathrm{d}y + \mathrm{d}x\\
&= \left(1 + \frac{\cos x}{y}\right)\mathrm{d}x - \frac{\sin x}{y^2}\,\mathrm{d}y
\end{aligned}
\end{equation}
$$

前向模式从选定的输入出发, 沿图传播各节点对该输入的偏导, 得到输出对该输入的偏导. 逆向模式从标量输出$z$出发, 以$\partial z / \partial z = 1$初始化, 逆向沿图计算$z$对各节点的偏导.

对上例先正向计算并保存各节点的值再逆向传播, 每经过一条反向边就乘以局部偏导:

$$
\begin{equation}
\begin{aligned}
\frac{\partial z}{\partial z} &= 1\\
\frac{\partial z}{\partial b} &= \frac{\partial z}{\partial z}\cdot 1 = 1\\
\frac{\partial z}{\partial a} &= \frac{\partial z}{\partial b}\cdot\frac{1}{y} = \frac{1}{y}\\
\frac{\partial z}{\partial y} &= \frac{\partial z}{\partial b}\cdot\left(-\frac{a}{y^2}\right) = -\frac{\sin x}{y^2}\\
\frac{\partial z}{\partial x} &= \frac{\partial z}{\partial z}\cdot 1 + \frac{\partial z}{\partial a}\cdot\cos x = 1 + \frac{\cos x}{y}
\end{aligned}
\end{equation}
$$

自动微分计算导数数值, 无需构造函数符号导数表达式, 链式法则给出精确导数.

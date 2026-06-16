---
title: "Metatron Dev. IV: ReSTIR"
date: 2025-05-17
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "restir", "metatron"]
---

## RIS

定义无偏贡献权重为随机变量$W$, $\mathrm{supp}(X)$为$f$在$X$的支撑集, 即$f(X) \neq 0$的集合.

$$
\begin{equation}
E[f(X)W] = \int_{\mathrm{supp}(X)} f(x) \mathrm{d}x
\end{equation}
$$

若各样本空间使用相同提议分布, 权重$w=\frac{\hat{p}(X)}{Mp(X)}$的RIS可以将抽样概率收敛为目标分布.

$$
\begin{equation}
\begin{aligned}
E[f(Y)W_Y]
&= E[\sum_{n=1}^M \frac{f(X_n)}{\hat{p}(X_n)}\sum_{i=1}^M w_i \frac{w_n}{\sum_{i=1}^M w_i}]\\
&= M\ E[\frac{f(X_n)}{\hat{p}(X_n)} w_n]\\
&= \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} \frac{f(x_n)}{p_n(x_n)}\prod_{i=1}^M p(x_i)\mathrm{d}x_i\\
&= \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} f(x_n)\mathrm{d}x_n \prod_{i=1, i \neq n}^M p(x_i)\mathrm{d}x_i\\
&= \int_{\mathrm{supp}(Y)} f(y)\mathrm{d}y
\end{aligned}
\end{equation}
$$

若各样本空间提议分布不同, 需泛化$\frac{1}{M} \to c_i(X_i)$, 要求$\sum_{i=1}^M c_i(x) = 1$.

$$
\begin{equation}
\begin{aligned}
E[f(Y)W_Y]
&= E[\sum_{n=1}^M \frac{f(X_n)}{\hat{p}(X_n)}\sum_{i=1}^M w_i \frac{w_n}{\sum_{i=1}^M w_i}]\\
&= \sum_{n=1}^M \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} \frac{f(x_n) c_n(x_n)}{p_n(x_n)}\prod_{i=1}^M p_i(x_i)\mathrm{d}x_i\\
&= \sum_{n=1}^M \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} f(x_n) c_n(x_n)\mathrm{d}x_n \prod_{i=1, i \neq n}^M p_i(x_i)\mathrm{d}x_i\\
&= \sum_{n=1}^M \int_{\mathrm{supp}(X_n)} f(x_n) c_n(x_n)\mathrm{d}x_n\\
&= \int_{\mathrm{supp}(Y)} f(y) \sum_{n=1}^M c_n(y)\mathrm{d}y
\end{aligned}
\end{equation}
$$

## GRIS

依据全期望公式$E(XY)=\int_X x\ p(x)\ E(Y|X=x) \mathrm{d}x$, 可得:

$$
\begin{equation}
E[W|X]=\frac{1}{p(X)}
\end{equation}
$$


若各样本的积分域与最终积分域不同, 需经位移映射$Y = T_x(X)$变换后再计算权重, 得到$w=\frac{\hat{p}(Y)c_x(Y)J_{X \to Y}}{p_x(X)}$, 其中$J_{X \to Y}=\left|\frac{\partial Y}{\partial X}\right|$. 由于变换后为$\mathrm{supp}(Y) \neq T_i(\mathrm{supp}(X_i))$, 记变换后包含$Y$的样本域集合$\mathcal{N}(Y) = \{n : Y \in T_n(\mathrm{supp}(X_n))\}$, 无偏要求$\mathrm{supp}(Y) \subseteq \bigcup_{n=1}^M T_n(\mathrm{supp}(X_n))$且$\sum_{n \in \mathcal{N}(Y)} c_n(Y)=1$

$$
\begin{equation}
\begin{aligned}
E[f(Y)W_Y]
&= E[\frac{f(Y)}{\hat{p}(Y)}\sum_{i=1}^M w_i]\\
&= E[\sum_{n=1, Y=T_n(X_n)}^M \frac{f(Y)}{\hat{p}(Y)}\sum_{i=1}^M w_i \frac{w_Y}{\sum_{i=1}^M w_i}]\\
&= \sum_{n=1, y=T_n(x_n)}^M \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} \frac{f(y) c_n(y) J_{x_n \to y}}{p_n(x_n)}\prod_{i=1}^M p_i(x_i)\mathrm{d}x_i\\
&= \sum_{n=1, y=T_n(x_n)}^M \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} f(y) c_n(y) J_{x_n \to y}\mathrm{d}x_n \prod_{i=1, i \neq n}^M p_i(x_i)\mathrm{d}x_i\\
&= \sum_{n=1, y=T_n(x_n)}^M \int_{T_n(\mathrm{supp}(X_n))} f(y) c_n(y)\mathrm{d}y\\
&= \int_{\bigcup_{n=1}^M T_n(\mathrm{supp}(X_n))} f(y) \sum_{n \in \mathcal{N}(y)} c_n(y)\mathrm{d}y\\
\end{aligned}
\end{equation}
$$

泛化为无偏权重$\frac{1}{p_x(X)} \to W_x$, 不显式定义$w$, 得到$W_Y=\hat{p}(Y)c_x(Y)J_{X \to Y}W_x$, 可以基于全期望公式证明$W_Y=c_x(Y)W_xJ_{X \to Y}\frac{\sum_{i=1}^M w_i}{w_x}$无偏:

$$
\begin{equation}
\begin{aligned}
E[f(Y)W_Y]
&= E[\sum_{n=1, Y=T_n(X_n)}^M f(Y)c_n(Y)W_nJ_{X_n \to Y}\frac{\sum_{i=1}^M w_i}{w_n}\frac{w_n}{\sum_{i=1}^M w_i}]\\
&= \sum_{n=1, Y=T_n(X_n)}^M E[f(Y)c_n(Y)W_nJ_{X_n \to Y}]\\
&= \sum_{n=1, y=T_n(x_n)}^M \int_{\mathrm{supp}(X_n)} f(y) c_n(y) J_{x_n \to y} E[W_n | X_n=x_n] p_n(x_n) \mathrm{d}x_n\\
&= \sum_{n=1, y=T_n(x_n)}^M \int_{\mathrm{supp}(X_n)} f(y) c_n(y) J_{x_n \to y} \mathrm{d}x_n\\
&= \sum_{n=1, y=T_n(x_n)}^M \int_{T_n(\mathrm{supp}(X_n))} f(y) c_n(y)\mathrm{d}y\\
&= \int_{\bigcup_{n=1}^M T_n(\mathrm{supp}(X_n))} f(y) \sum_{n \in \mathcal{N}(y)} c_n(y)\mathrm{d}y\\
\end{aligned}
\end{equation}
$$

令$m_x(Y) \geq 0$为MIS权重, 满足$\sum_{n \in \mathcal{N}(y)} m_n(y) = 1$, RIS权重设置如下:

$$
\begin{equation}
\begin{aligned}
w=
\begin{cases}
m_x(Y)\hat{p}(Y)W_xJ_{X \to Y}, & Y \subseteq T_x(\mathrm{supp}(X))\\
0, &\mathrm{otherwise}
\end{cases}
\end{aligned}
\end{equation}
$$

设置$c_x = m_x$, 此时$W_Y=\frac{1}{\hat{p}(Y)}\sum_{i=1}^Mw_i$, 即$\hat{p}(Y)W_Y = \sum_{i=1}^M w_i$, 对无偏性$E[f(Y)W_Y]=\int_{\mathrm{supp}(Y)} f(y)\mathrm{d}y$取$f=\hat{p}$, 得权重和的期望:

$$
\begin{equation}
E[\sum_{i=1}^M w_i] = E[\hat{p}(Y)W_Y] = \int_{\mathrm{supp}(Y)} \hat{p}(y)\mathrm{d}y = \|\hat{p}\|
\end{equation}
$$

$M \to \infty$时, 由大数定律$\sum_{i=1}^M w_i$收敛至常数$\|\hat{p}\|$. 若$\hat{p}$归一化, 则$W_Y \to \frac{1}{\hat{p}(Y)}$.

$$
\begin{equation}
W_Y = \frac{1}{\hat{p}(Y)}\sum_{i=1}^M w_i \to \frac{\|\hat{p}\|}{\hat{p}(Y)}
\end{equation}
$$

## ReSTIR GI

每次蓄水池复用最终都存储无偏权重, 因此根据GRIS下次复用也可以得到无偏结果. 通常蓄水池结构如下:

```cpp
struct Reservoir {
    f32 p_hat; // target distribution
    f32 w_sum; // RIS weight sum
    f32 M; // confidence
    f32 W; // unbiased weight
};
```

蓄水池累积代码为`w = p_hat * W * M * J`, 可能的疑惑点在于, 相比GRIS定义的$w$, $m_x(Y)$被替换为$M$. 令累积后支撑集中的样本数为$N$, 实际上累积过程会统计$\sum_{i=1}^N M_i$, 最终计算无偏权重时使用`w_sum / p_hat / M_sum`, 此时`w`中的`M`被归一化, 得到满足$\sum_{i=1}^N m_i(Y) = 1$的MIS权重$m_n(Y)=\frac{M_n}{\sum_{i=1}^N M_i}$.

ReSTIR DI/GI都将$M$解释为蓄水池的样本数量, 但它实际决定MIS权重, 可以自由调整, 因此认为$M$是样本置信度更合理, 只是通常它与样本数相关. 若追求无偏, 需要复用过程中投射阴影光线, 若被遮挡不合并该蓄水池, 保证$\sum_{n \in \mathcal{N}(y)} m_n(y) = 1$.

由于Lambertian的均匀分布特性, 基于入射辐亮度分布采样效率更高, 因此ReSTIR GI使用入射辐亮度作为目标分布. 由于Lambertian出射辐亮度均匀, 新样本不需要重新计算. Torrance-Sparrow直接基于BSDF抽样效率更高, 若一定要应用ReSTIR, 新样本目标分布计算开销大, 可采用Blinn-Phong等简单模型.

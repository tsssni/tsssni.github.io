---
title: "Metatron Dev. IV: ReSTIR"
date: 2025-05-17
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "restir", "metatron"]
---

## RIS

定义无偏贡献权重为随机变量$W$, $\mathrm{supp}(X)$为$f$在$X$的支撑集.

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

泛化为无偏权重$\frac{1}{p_x(X)} \to W_x$, 不显式定义$w$, 可以基于全期望公式证明蓄水池合并结果$W_Y=c_x(Y)W_xJ_{X \to Y}\frac{\sum_{i=1}^M w_i}{w_x}$无偏:

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

每次蓄水池复用最终都存储无偏权重, 因此根据GRIS下次复用也可以得到无偏结果, 即链式GRIS. 目标像素的蓄水池总是被使用, 因此满足$\mathrm{supp}(Y) \subseteq \bigcup_{n=1}^M T_n(\mathrm{supp}(X_n))$. 蓄水池结构为:

```cpp
struct Reservoir {
    f32 p_hat; // target distribution
    f32 w_sum; // RIS weight sum
    f32 M; // confidence
    f32 W; // unbiased weight
};
```

蓄水池累积代码为`w = p_hat * W * M * J`, 可能的疑惑点在于, 相比GRIS定义的$w$, $m_x(Y)$被替换为$M$. 令累积后支撑集中的样本数为$N$, 实际上累积过程会统计$\sum_{i=1}^N M_i$, M是分配给该样本域的置信度, 因此该域中的样本具有相同MIS权重. 最终计算无偏权重时使用`w_sum / p_hat / M_sum`, 此时`w`中的`M`被归一化, 得到满足$\sum_{i=1}^N m_i(Y) = 1$的MIS权重$m_n(Y)=\frac{M_n}{\sum_{i=1}^N M_i}$.

ReSTIR DI/GI都将$M$解释为蓄水池的样本数量, 但它实际决定MIS权重, 可以自由调整, 因此认为$M$是样本置信度更合理, 只是通常它与样本数相关. 若追求无偏, 需要复用过程中投射阴影光线, 若被遮挡不合并该蓄水池, 保证$\sum_{n \in \mathcal{N}(y)} m_n(y) = 1$.

由于Lambertian的均匀分布特性, 基于入射辐亮度分布采样效率更高, 因此ReSTIR GI使用入射辐亮度作为目标分布. 由于Lambertian出射辐亮度均匀, 新样本不需要重新计算. Torrance-Sparrow直接基于BSDF抽样效率更高, 若一定要应用ReSTIR, 新样本目标分布计算开销大, 可采用Blinn-Phong等简单模型.

## ReSTIR PT

使用主样本空间执行积分, 令CDF为$P$, 这使得每个顶点生成光线的PDF不再属于无偏权重.

$$
\begin{equation}
\begin{aligned}
\int_{\mathbf{x}} f(\mathbf{x}) d\mathbf{x}
&=\int_{\mathbf{u}} f(P^{-1}(\mathbf{u})) \left|\frac{\partial P^{-1}(\mathbf{u})}{\partial\mathbf{u}}\right| \mathrm{d}\mathbf{u}\\
&=\int_{\mathbf{u}} \frac{f(P^{-1}(\mathbf{u}))}{p(\mathbf{x})} \mathrm{d}\mathbf{u}\\
\end{aligned}
\end{equation}
$$

不同顶点数的积分不相交, 即$f(\mathbf{x})=\sum_{i=1}^\infty\int_{\mathbf{x}_i}f(\mathbf{x}_i)\mathrm{d}\mathbf{x}_i$, $\bigcup_{i=1}^\infty\mathbf{x_i}=\mathbf{x}$使得样本满足$\mathrm{supp}(Y) \subseteq \bigcup_{n=1}^M T_n(\mathrm{supp}(X_n))$, 同时对于单个像素生成的光线, 生成的每个NEE样本总是顶点数不同, $\mathcal{N}(y)$只位于一个支撑集, MIS权重设置为$1$即可.

对于当前像素$y$, 从对所有像素相同的相机顶点$y_0$出发, 发射确定的初始光线击中$y_1$, 之后由随机数$\mathbf{u}_i$生成散射方向$\omega_i$, 其中分量$\tilde{u}_i$选取波瓣. 复用时使用另一个像素$x$的路径使用的随机数, 从$y_1$出发生成新的$\omega^y_i$, 若$y_i$, $x_i$, $x_{i+1}$都满足重连接条件(材质足够粗糙, 顶点距离足够远...), 将$y_i$连接到$x_{i+1}$并复用后续路径, 得到新路径$\mathbf{y}$.

注意到由于重连接$\mathbf{y}$和$\mathbf{x}$拥有相同的顶点数, 且除生成$y_i \to y_{i+1} \to y_{i+2}$使用的随机数外其余随机数相同, 若未使用VNDF等视线相关抽样则只需考虑$y_i \to y_{i+1}$.

由于重要性抽样中$U$为目标分布CDF, 微分可得PDF. 若重连接顶点复制波瓣选择随机数即$\tilde{u}^y_i = \tilde{u}^x_i$, 只变化$\tilde{u}^x_i$而$\omega^x_i$固定时命中点$\mathbf{p}^x_{i+1}$不变, 即$\frac{\partial \omega^y_i}{\partial \tilde{u}^x_i}=0$, 同理$\frac{\partial \omega^x_i}{\partial \tilde{u}^y_i}=0$, 而$\frac{\partial \tilde{u}^y_i}{\partial \tilde{u}^x_i}=1$, 因此只需计算立体角微分$\left|\frac{\partial \omega^y_i}{\partial \omega^x_i}\right|$. 令$\theta$为立体角与法线的夹角, 对于同序顶点Jacobian如下:

$$
\begin{equation}
\begin{aligned}
\left|\frac{\partial \mathbf{u}^y_i}{\partial \mathbf{u}^x_i}\right|
&=\left|\frac{\partial \mathbf{u}^y_i}{\partial (\omega^y_i, \tilde{u}^y_i)}\right|\left|\frac{\partial (\omega^y_i, \tilde{u}^y_i)}{\partial (\omega^x_i, \tilde{u}^x_i)}\right|\left|\frac{\partial (\omega^x_i, \tilde{u}^x_i)}{\partial \mathbf{u}^x_i}\right|\\
&=\frac{p_{y_i}(\omega^y_i, \tilde{u}^y_i)}{p_{x_i}(\omega^x_i, \tilde{u}^x_i)}\left|\frac{\partial\omega^y_i}{\partial\omega^x_i}\right|\\
&=\frac{p_{y_i}(\omega^y_i, \tilde{u}^y_i)}{p_{x_i}(\omega^x_i, \tilde{u}^x_i)}\left|\frac{\cos\theta^y}{\cos\theta^x}\right|\frac{\|\mathbf{p}^x_{i+1}-\mathbf{p}^x_{i}\|^2}{\|\mathbf{p}^x_{i+1}-\mathbf{p}^y_{i}\|^2}
\end{aligned}
\end{equation}
$$

对于非同序顶点, 我们无法得到最后立体角微分的解析形式. 但由于$\omega^x_{i+1}$只依赖$\omega^x_{i}$, 可得$\frac{\partial \omega^y_i}{\partial \omega^x_{i+1}}=0$, Jacobian为下三角行列式. 由于$\omega^y_{i+1}=\omega^x_{i+1}$, 形式如下:

$$
\begin{equation}
\begin{aligned}
J_{\mathbf{x}\to\mathbf{y}}
&=\begin{vmatrix}
\frac{\partial \mathbf{u}^y_i}{\partial \mathbf{u}^x_i}&
\frac{\partial \mathbf{u}^y_i}{\partial \mathbf{u}^x_{i+1}}\\
\frac{\partial \mathbf{u}^y_{i+1}}{\partial \mathbf{u}^x_i}&
\frac{\partial \mathbf{u}^y_{i+1}}{\partial \mathbf{u}^x_{i+1}}
\end{vmatrix}
= \frac{\partial \mathbf{u}^y_i}{\partial \mathbf{u}^x_i}\frac{\partial \mathbf{u}^y_{i+1}}{\partial \mathbf{u}^x_{i+1}}\\
&=\frac{p_{y_i}(\omega^y_i, \tilde{u}^y_i)}{p_{x_i}(\omega^x_i, \tilde{u}^x_i)}\frac{p_{y_{i+1}}(\omega^y_{i+1}, \tilde{u}^y_{i+1})}{p_{x_{i+1}}(\omega^x_{i+1}, \tilde{u}^x_{i+1})}\left|\frac{\cos\theta^y}{\cos\theta^x}\right|\frac{\|\mathbf{p}^x_{i+1}-\mathbf{p}^x_{i}\|^2}{\|\mathbf{p}^x_{i+1}-\mathbf{p}^y_{i}\|^2}
\end{aligned}
\end{equation}
$$

如果直接用置信度计算权重, 需要了解当前样本是否位于所有被复用的样本域的支撑集中. 由于支撑集外的$\hat{p}(x)=0$, 基于它设置MIS权重天然的满足$\sum_{n \in \mathcal{N}(Y)} c_n(Y)=1$. 常用的配对MIS权重如下, 为计算中心规范样本中的$\hat{p}_{\leftarrow i}(y)$, 必须在执行合并前将$y$逆变换到每个候选空间执行重放. 最终重放次数为$2N$, 相比朴素的$O(N^2)$方法显著降低开销.

$$
\begin{equation}
\begin{aligned}
m_i(Y) &= \frac{1}{N+1}\frac{M_i\,\hat{p}_{\leftarrow i}(Y)}{M_i\,\hat{p}_{\leftarrow i}(Y) + \frac{M_c}{N}\hat{p}_c(Y)}, \quad i \neq c\\
m_c(Y) &= \frac{1}{N+1}\left(1 + \sum_{i=1}^N \frac{\frac{M_c}{N}\hat{p}_c(Y)}{M_i\,\hat{p}_{\leftarrow i}(Y) + \frac{M_c}{N}\hat{p}_c(Y)}\right)
\end{aligned}
\end{equation}
$$

目标分布为积分结果对像素的贡献, 初始权重为NEE/BSDF MIS无偏权重, 链式GRIS可实现无偏复用. 为节省内存, 采样时贪心的确定首对满足要求的$x_i,\ x_{i+1}$, 只存储随机数种子.

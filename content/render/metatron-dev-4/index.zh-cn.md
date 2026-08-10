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

分层选取指下标分级确定, 如先选子池$t$再选子池内下标$k$, 记池为$Z=(Z_{t,k})$. 全概率公式展开可得: 只要每一级都不依赖池中样本的数值, 逐级归一后边缘分布不变:

$$
\begin{equation}
\begin{aligned}
p_X(x)
&= \sum_t P(t) \sum_k P(k|t)\ p_{Z_{t,k}}(x)\\
&= \sum_t P(t) \sum_k P(k|t)\ p(x)
= \sum_t P(t)\ p(x) = p(x)
\end{aligned}
\end{equation}
$$

预抽样指抽样与使用分离: 按分布$p$生成样本池$Z=(Z_1, \dots, Z_N)$, 使用样本不再抽样, 而是以下标$J$取出$X=Z_J$. 要求下标与池内容独立, 下标本身可以分层选取, 只要不依赖池中样本的数值. 对$Z$取全期望, 边缘分布为池内样本分布的混合:

$$
\begin{equation}
p_X(x) = \sum_{n=1}^N P(J=n)\ p_{Z_n}(x) = \sum_{n=1}^N P(J=n)\ p(x) = p(x)
\end{equation}
$$

$X$与直接按$p$抽样同分布, 因此可以直接替换任何一次抽样, 下游估计的无偏性不变:

$$
\begin{equation}
E\left[\frac{f(X)}{p(X)}\right] = \int \frac{f(x)}{p(x)}p_X(x)\mathrm{d}x = \int f(x)\mathrm{d}x
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
&= E[\sum_{n=1, Y_n=T_n(X_n)}^M \frac{f(Y_n)}{\hat{p}(Y_n)}\sum_{i=1}^M w_i \frac{w_n}{\sum_{i=1}^M w_i}]\\
&= \sum_{n=1, y_n=T_n(x_n)}^M \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} \frac{f(y_n) c_n(y_n) J_{x_n \to y_n}}{p_n(x_n)}\prod_{i=1}^M p_i(x_i)\mathrm{d}x_i\\
&= \sum_{n=1, y_n=T_n(x_n)}^M \int_{\mathrm{supp}(X_1)}\cdots\int_{\mathrm{supp}(X_M)} f(y_n) c_n(y_n) J_{x_n \to y_n}\mathrm{d}x_n \prod_{i=1, i \neq n}^M p_i(x_i)\mathrm{d}x_i\\
&= \sum_{n=1, y_n=T_n(x_n)}^M \int_{T_n(\mathrm{supp}(X_n))} f(y_n) c_n(y_n)\mathrm{d}y_n\\
&= \int_{\bigcup_{n=1}^M T_n(\mathrm{supp}(X_n))} f(y) \sum_{n \in \mathcal{N}(y)} c_n(y)\mathrm{d}y\\
\end{aligned}
\end{equation}
$$

泛化为无偏权重$\frac{1}{p_x(X)} \to W_x$, 不显式定义$w$, 可以基于全期望公式证明蓄水池合并结果$W_Y=c_x(Y)W_xJ_{X \to Y}\frac{\sum_{i=1}^M w_i}{w_x}$无偏:

$$
\begin{equation}
\begin{aligned}
E[f(Y)W_Y]
&= E[\sum_{n=1, Y_n=T_n(X_n)}^M f(Y_n)c_n(Y_n)W_nJ_{X_n \to Y_n}\frac{\sum_{i=1}^M w_i}{w_n}\frac{w_n}{\sum_{i=1}^M w_i}]\\
&= \sum_{n=1, Y_n=T_n(X_n)}^M E[f(Y_n)c_n(Y_n)W_nJ_{X_n \to Y_n}]\\
&= \sum_{n=1, y_n=T_n(x_n)}^M \int_{\mathrm{supp}(X_n)} f(y_n) c_n(y_n) J_{x_n \to y_n} E[W_n | X_n=x_n] p_n(x_n) \mathrm{d}x_n\\
&= \sum_{n=1, y_n=T_n(x_n)}^M \int_{\mathrm{supp}(X_n)} f(y_n) c_n(y_n) J_{x_n \to y_n} \mathrm{d}x_n\\
&= \sum_{n=1, y_n=T_n(x_n)}^M \int_{T_n(\mathrm{supp}(X_n))} f(y_n) c_n(y_n)\mathrm{d}y_n\\
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

## ReSTIR DI

直接光照使用NEE在光源表面抽样, 样本域为所有发光表面的并集$A=\bigcup_i A_i$, 积分表示如下, 其中$G(\mathbf{p} \leftrightarrow \mathbf{p}_e)=\frac{|\cos\theta \cos\theta_e|}{\|\mathbf{p}_e-\mathbf{p}\|^2}$为几何项, $V$为可见性:

$$
\begin{equation}
L_o(\mathbf{p}, \omega_o) = \int_{A} f(\mathbf{p}, \omega_o, \omega_i) L_e(\mathbf{p}_e, -\omega_i) G(\mathbf{p} \leftrightarrow \mathbf{p}_e) V(\mathbf{p} \leftrightarrow \mathbf{p}_e) \mathrm{d}A
\end{equation}
$$

Delta光源无面积, 作为原子点并入基测度, 样本域扩充为$A' = A \cup \{\mathbf{p}_1, \dots, \mathbf{p}_K\}$:

$$
\begin{equation}
\mu = \mathrm{d}A + \sum_{k=1}^K \delta_{\mathbf{p}_k}, \quad
\int_{A'} f \mathrm{d}\mu = \int_A f\mathrm{d}A + \sum_{k=1}^K f(\mathbf{p}_k)
\end{equation}
$$

面光样本为光源面上的点, 其表示与NEE顶点无关, 且所有顶点的积分域都是同一面积测度下的光源表面, 因此复用时位移映射恒等即$J_{X \to Y}=1$. 点光与聚光的世界空间位置, 或方向光的世界空间方向, 同样与NEE顶点无关, 为恒等映射.

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

末尾为BSDF采样时所有维度均经CDF生成, PSS样本$X=\mathbf{u}$均匀, $p(X)=1$. 若采样包含轮盘赌, 此时$p(X)=\prod_i q_i$. 末尾为NEE时令末端顶点为$\mathbf{p}_e$, 得到混合样本$X=(\mathbf{u}, \mathbf{p}_e)$. 散射维度以立体角测度表示, 末端顶点以ReSTIR DI光源测度$\mu$表示:

$$
\begin{equation}
\int_{\omega} \int_{A'} f(\mathbf{x}) \mathrm{d}\mu(\mathbf{p}_e) \prod_{i=1}^{d-2} \mathrm{d}\omega_i
= \int_{\mathbf{u}} \int_{A'} \frac{f(\mathbf{x})}{\prod_{i=1}^{d-2} p_i(\omega_i)} \mathrm{d}\mu(\mathbf{p}_e) \prod_{i=1}^{d-2}\mathrm{d}\mathbf{u}_i
\end{equation}
$$

$\mathbf{u}$均匀且$\mathbf{p}_e$独立地以NEE分布$p_1$生成, 因此$p(X)=p_1(\mathbf{p}_e)\prod_i q_i$. 若NEE使用RIS生成, $p_1$使用无偏权重即可. 末端顶点复用时为恒等映射, Jacobian只由散射维度贡献.

不同顶点数的积分不相交, 即$f(\mathbf{x})=\sum_{i=1}^\infty\int_{\mathbf{x}_i}f(\mathbf{x}_i)\mathrm{d}\mathbf{x}_i$, $\bigcup_{i=1}^\infty\mathbf{x_i}=\mathbf{x}$使得样本满足$\mathrm{supp}(Y) \subseteq \bigcup_{n=1}^M T_n(\mathrm{supp}(X_n))$, 同时对于单个像素生成的光线, 生成的每个NEE样本总是顶点数不同, $\mathcal{N}(y)$只位于一个支撑集, MIS权重设置为$1$即可.

对于当前像素$y$, 从对所有像素相同的相机顶点$y_0$出发, 发射确定的初始光线击中$y_1$, 之后由随机数$\mathbf{u}_i$生成散射方向$\omega_i$, 其中分量$\tilde{u}_i$选取波瓣. 复用时使用另一个像素$x$的路径使用的随机数, 从$y_1$出发生成新的$\omega^y_i$, 若$y_i$, $x_i$, $x_{i+1}$都满足重连接条件(材质足够粗糙, 顶点距离足够远...), 将$y_i$连接到$x_{i+1}$并复用后续路径, 得到新路径$\mathbf{y}$.

注意到由于重连接$\mathbf{y}$和$\mathbf{x}$拥有相同的顶点数, 且除生成$y_i \to y_{i+1} \to y_{i+2}$使用的随机数外其余随机数相同, 若未使用VNDF等视线相关抽样则只需考虑$y_i \to y_{i+1}$.

重要性抽样中$U$为目标分布CDF, 微分得PDF. 重连接方向$\omega^y_i$由几何确定, 波瓣选择随机数$\tilde{u}^y_i$由$\tilde{u}^x_i$映射至可选中$\omega^y_i$的区间. 变化$\tilde{u}^x_i$而$\omega^x_i$固定, 命中点$\mathbf{p}^x_{i+1}$不变, 可得$\frac{\partial \omega^y_i}{\partial \tilde{u}^x_i}=0$, 同理$\frac{\partial \omega^x_i}{\partial \tilde{u}^y_i}=0$. 根据波瓣选择概率可得$\frac{\partial \tilde{u}^y_i}{\partial \tilde{u}^x_i}=\frac{P_{y_i}(l^y)}{P_{x_i}(l^x)}$, 链式法则给出的Jacobian依赖$l^y$的选取:

$$
\begin{equation}
\begin{aligned}
\left|\frac{\partial \mathbf{u}^y_i}{\partial \mathbf{u}^x_i}\right|
&=\left|\frac{\partial \mathbf{u}^y_i}{\partial (\omega^y_i, \tilde{u}^y_i)}\right|\left|\frac{\partial (\omega^y_i, \tilde{u}^y_i)}{\partial (\omega^x_i, \tilde{u}^x_i)}\right|\left|\frac{\partial (\omega^x_i, \tilde{u}^x_i)}{\partial \mathbf{u}^x_i}\right|\\
&=\frac{P_{y_i}(l^y)p_{y_i}(\omega^y_i|l^y)}{P_{x_i}(l^x)p_{x_i}(\omega^x_i|l^x)}\left|\frac{\partial\omega^y_i}{\partial\omega^x_i}\right|
\end{aligned}
\end{equation}
$$

黑盒材质只有合并波瓣的边缘分布$p(\omega)=\sum_l P(l)p(\omega|l)$, 需要不依赖波瓣的位移映射. 记$\mathbf{u}=(\bar{\mathbf{u}}, \tilde{u})$, $\bar{\mathbf{u}}$为方向维度, $\tilde{u}$为波瓣选择维度. 波瓣选择按概率将$[0, 1)$划分为连续区间, 第$l$段为$I_l=[\sum_{j<l}P(j), \sum_{j \leq l}P(j))$, 记$t=\frac{\tilde{u}-\sum_{j<l}P(j)}{P(l)}$为$\tilde{u}$在段内的相对位置. 将生成$\omega$的各波瓣原像按序拼接并归一化得坐标$s$:

$$
\begin{equation}
s = \frac{\sum_{j<l} P(j)p(\omega|j) + t P(l) p(\omega|l)}{p(\omega)}
\end{equation}
$$

$\omega$与$\tilde{u}$无关, 因此$(\bar{\mathbf{u}}, \tilde{u}) \to (\omega, s)$的Jacobian矩阵为块下三角, $\frac{\partial s}{\partial \bar{\mathbf{u}}}$不参与行列式:

$$
\begin{equation}
\begin{aligned}
\left|\frac{\partial(\omega, s)}{\partial(\bar{\mathbf{u}}, \tilde{u})}\right|
&=\begin{vmatrix}
\frac{\partial \omega}{\partial \bar{\mathbf{u}}} & 0\\
\frac{\partial s}{\partial \bar{\mathbf{u}}} & \frac{\partial s}{\partial \tilde{u}}
\end{vmatrix}
=\left|\frac{\partial \omega}{\partial \bar{\mathbf{u}}}\right|\frac{\partial s}{\partial \tilde{u}}\\
&=\frac{1}{p(\omega|l)}\frac{p(\omega|l)}{p(\omega)}=\frac{1}{p(\omega)}
\end{aligned}
\end{equation}
$$

由此可得$\mathrm{d}\mathbf{u}=p(\omega)\mathrm{d}\omega\mathrm{d}s$, 位移映射定义为即$(\omega^x_i, s) \to (\omega^y_i, s)$, 仍为双射且与材质的波瓣定义无关. $\mathrm{d}s$约去, $\theta$为立体角与法线的夹角, 对于同序顶点Jacobian如下:

$$
\begin{equation}
\begin{aligned}
\left|\frac{\partial \mathbf{u}^y_i}{\partial \mathbf{u}^x_i}\right|
&=\frac{p_{y_i}(\omega^y_i)\mathrm{d}\omega^y_i\mathrm{d}s}{p_{x_i}(\omega^x_i)\mathrm{d}\omega^x_i\mathrm{d}s}
=\frac{p_{y_i}(\omega^y_i)}{p_{x_i}(\omega^x_i)}\left|\frac{\partial\omega^y_i}{\partial\omega^x_i}\right|\\
&=\frac{p_{y_i}(\omega^y_i)}{p_{x_i}(\omega^x_i)}\left|\frac{\cos\theta^y}{\cos\theta^x}\right|\frac{\|\mathbf{p}^x_{i+1}-\mathbf{p}^x_{i}\|^2}{\|\mathbf{p}^x_{i+1}-\mathbf{p}^y_{i}\|^2}
\end{aligned}
\end{equation}
$$

非同序顶点无法得到最后立体角微分的解析形式. 但由于$\omega^x_{i+1}$只依赖$\omega^x_{i}$, 可得$\frac{\partial \omega^y_i}{\partial \omega^x_{i+1}}=0$, Jacobian为下三角行列式. 由于$\omega^y_{i+1}=\omega^x_{i+1}$, 形式如下:

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
&=\frac{p_{y_i}(\omega^y_i)}{p_{x_i}(\omega^x_i)}\frac{p_{y_{i+1}}(\omega^y_{i+1})}{p_{x_{i+1}}(\omega^x_{i+1})}\left|\frac{\cos\theta^y}{\cos\theta^x}\right|\frac{\|\mathbf{p}^x_{i+1}-\mathbf{p}^x_{i}\|^2}{\|\mathbf{p}^x_{i+1}-\mathbf{p}^y_{i}\|^2}
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
统计邻域内共享随机数种子的蓄水池数量来调整$M$, 可抑制时序复用带来的相关性. 此时置信度依赖其它样本, 即$c_n(Y_n) \to c_n(Y_n, Y'_n, \dots)$, 无法提出至对$X_n$的积分, 因此有偏.

重连接要求路径相似, 可由$J\approx1$推出. 记单侧几何项$G(\mathbf{p}_a \to \mathbf{p}_b)=\frac{|\cos\theta_b|}{\|\mathbf{p}_b-\mathbf{p}_a\|^2}$, 其中$\theta_b$为$\mathbf{p}_a \to \mathbf{p}_b$与$\mathbf{p}_b$处法线的夹角, 方向PDF乘单侧几何项即面积密度, Jacobian可改写为:

$$
\begin{equation}
J_{\mathbf{x}\to\mathbf{y}}=\frac{p_{y_i}(\omega^y_i)G(\mathbf{p}^y_i \to \mathbf{p}^x_{i+1})}{p_{x_i}(\omega^x_i)G(\mathbf{p}^x_i \to \mathbf{p}^x_{i+1})}\frac{p_{y_{i+1}}(\omega^y_{i+1})}{p_{x_{i+1}}(\omega^x_{i+1})}
\end{equation}
$$

两个因子分别为重连接顶点$\mathbf{p}^x_{i+1}$的面积密度变化, 以及$\mathbf{p}^x_{i+1}$处出射方向改变导致的BSDF采样密度变化. 令二者相对误差均小于$\epsilon$, 则$(1-\epsilon)^2 < J_{\mathbf{x}\to\mathbf{y}} < (1+\epsilon)^2$:

$$
\begin{equation}
\begin{aligned}
&\left|\frac{p_{y_i}(\omega^y_i)G(\mathbf{p}^y_i \to \mathbf{p}^x_{i+1}) - p_{x_i}(\omega^x_i)G(\mathbf{p}^x_i \to \mathbf{p}^x_{i+1})}{p_{x_i}(\omega^x_i)G(\mathbf{p}^x_i \to \mathbf{p}^x_{i+1})}\right| < \epsilon\\
&\left|\frac{p_{y_{i+1}}(\omega^y_{i+1}) - p_{x_{i+1}}(\omega^x_{i+1})}{p_{x_{i+1}}(\omega^x_{i+1})}\right| < \epsilon
\end{aligned}
\end{equation}
$$

面积密度$p_A$小通常代表光线抽样范围大, 采中当前样本概率小, 因此可用$\frac{1}{p_A}$表示光线足迹. 令$\theta_0$为主光线与$\mathbf{p}^x_1$处法线的夹角, $R_\mathbf{x}^2$为均匀球面采样在该处的足迹, $R_\mathbf{x}$可近似为$\sqrt{\pi r^2}$即足迹半径. 有限场景中相邻像素的路径不会任意发散, 假设两条路径主顶点间距不超过$R_\mathbf{x}$ 的常数倍, 且次级顶点间距随主顶点间距线性增长.

$$
\begin{equation}
\begin{aligned}
&R_\mathbf{x} = \sqrt{\frac{4\pi\|\mathbf{p}^x_1-\mathbf{p}^x_0\|^2}{|\cos\theta_0|}}\\
&\|\mathbf{p}^x_1-\mathbf{p}^y_1\| < C_1R_\mathbf{x}\\
&\|\mathbf{p}^x_j-\mathbf{p}^y_j\| < C_2\|\mathbf{p}^x_1-\mathbf{p}^y_1\|=C_1C_2R_\mathbf{x}
\end{aligned}
\end{equation}
$$

追踪阶段无法做映射与重放, 无法比较$\mathbf{x}$与$\mathbf{y}$的密度函数, 经验假设随机重放保持面积密度, 令$T_r$为从$\mathbf{p}^y_i$不做重连接而是继续重放得到的顶点, 重连接条件变换为:

$$
\begin{equation}
\begin{aligned}
&p^\mathbf{x}(\mathbf{p}^x_{i+1}) = p_{x_i}(\omega^x_i)G(\mathbf{p}^x_i \to \mathbf{p}^x_{i+1}) \approx p^\mathbf{y}(T_r(\mathbf{p}^x_{i+1}))\\
&p^\mathbf{y}(\mathbf{p}^x_{i+1}) = p_{y_i}(\omega^y_i)G(\mathbf{p}^y_i \to \mathbf{p}^x_{i+1})\\
&\left|\frac{p^\mathbf{y}(\mathbf{p}^x_{i+1}) - p^\mathbf{y}(T_r(\mathbf{p}^x_{i+1}))}{p^\mathbf{y}(T_r(\mathbf{p}^x_{i+1}))}\right| < \epsilon
\end{aligned}
\end{equation}
$$

$p_A$为下一次弹射命中点的面积密度, $\mathbf{p}$, $\mathbf{q}$, $\mathbf{r}$均为该命中点的可能位置. 假设$p_A$在自身足迹尺度内近似常数, 即存在$c_2$, 使得以$\mathbf{p}$的足迹为半径的邻域内任取$\mathbf{q}$,$\mathbf{r}$, 密度相对差不超过$\epsilon$.

$$
\begin{equation}
\max(\|\mathbf{q}-\mathbf{p}\|, \|\mathbf{r}-\mathbf{p}\|) < \sqrt{\frac{c_2}{p_A(\mathbf{p})}}
\implies \left|\frac{p_A(\mathbf{r})-p_A(\mathbf{q})}{p_A(\mathbf{q})}\right| < \epsilon
\end{equation}
$$

由几何假设得位移$\|T_r(\mathbf{p}^x_{i+1}) - \mathbf{p}^x_{i+1}\| \leq c_1R_\mathbf{y}$, 其中$c_1=C_1C_2$. 代入前式, 并由位移映射可逆性要求$\mathbf{x}$满足相同重连接条件, 得光线足迹阈值:

$$
\begin{equation}
\begin{aligned}
c_1R_\mathbf{y} < \sqrt{\frac{c_2}{p^\mathbf{y}(\mathbf{p}^x_{i+1})}}
&\implies \frac{1}{p^\mathbf{y}(\mathbf{p}^x_{i+1})} > \frac{c_1^2}{c_2}R_\mathbf{y}^2\\
&\implies \frac{1}{p_{x_i}(\omega^x_i)G(\mathbf{p}^x_i \to \mathbf{p}^x_{i+1})} > \frac{c_1^2}{c_2}R_\mathbf{x}^2
\end{aligned}
\end{equation}
$$

同时需要保证重连接点出射时不会因为低粗糙度材质导致BSDF PDF. 由光滑材质PDF的近似互易性可使用反向光线足迹:

$$
\begin{equation}
\begin{aligned}
p_{x_{i+1}}(\omega^x_{i+1}) &= p(\omega^x_{i+1}|\mathbf{p}^x_{i+1}, -\omega^x_i) \approx p(-\omega^x_i|\mathbf{p}^x_{i+1}, \omega^x_{i+1})\\
p(\mathbf{p}^x_i|\mathbf{p}^x_{i+1}, \omega^x_{i+1}) &= p(-\omega^x_i|\mathbf{p}^x_{i+1}, \omega^x_{i+1})G(\mathbf{p}^x_{i+1} \to \mathbf{p}^x_i)
\end{aligned}
\end{equation}
$$

此时位移量为$\|\mathbf{p}^y_i-\mathbf{p}^x_i\|$, 近似$G(\mathbf{p}^x_{i+1} \to \mathbf{p}^x_i) \approx G(\mathbf{p}^x_{i+1} \to \mathbf{p}^y_i)$, 得形式对称的逆光线足迹阈值. 两式合并, 常数并入用户参数$c$:

$$
\begin{equation}
\max\left(
p_{x_i}(\omega^x_i)G(\mathbf{p}^x_i \to \mathbf{p}^x_{i+1}),\
p_{x_{i+1}}(\omega^x_{i+1})G(\mathbf{p}^x_{i+1} \to \mathbf{p}^x_i)
\right)^{-1} > cR_\mathbf{x}^2
\end{equation}
$$

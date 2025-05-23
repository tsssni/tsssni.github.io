---
title: "pbrt-v4 Ep. II: 随机模拟"
date: 2024-10-02
draft: false
description: "pbrt v4 episode 2"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

随机模拟, 或者说Monte Carlo方法, 是很常用的统计学方法, 渲染任务往往通过大量采样来渲染方程积分结果. pbrt中基本都采用无偏采样器, `SPPMIntegrator`是个例外. Monte Carlo通用形式如下.

$$
\begin{equation}
\begin{aligned}
F_n &\approx E(\frac{1}{n} \sum_{i=1}^n \frac{f(X_i)}{p(X_i)})=\int \frac{f(x)}{p(x)}p(x)dx
\end{aligned}
\end{equation}
$$

这部分可以结合北大的[统计计算](https://www.math.pku.edu.cn/teachers/lidf/docs/statcomp/html/_statcompbook/sim-intro.html), 想起来本科时还上过这个课, 一点都不记得, 很惭愧.

## 效率优化

### 分层抽样

将样本空间划分为多份, 每个空间被称为“层”, 采样时从各层中分别采样. 每层的Monte Carlo积分值可用下式表示.

$$
\begin{equation}
F_i = \frac{1}{n_i} \sum_{j=1}^{n_i} \frac{f(X_{i,j})}{p(X_{i,j})}
\end{equation}
$$

pbrt中认为使用的PDF仍然分布在未分层的空间中, 因此需要除以第i层对应区域的CDF\\(v_i\\), 此时\\(F_i\\)期望值的证明见下式.

$$
\begin{equation}
\begin{aligned}
E(F_i)
&= E(\frac{1}{n_i}\sum_{j=1}^{n_i}\frac{f(X_{i,j})}{p(X_{i,j})})\\\\
&= \frac{1}{n_i}E(\sum_{j=1}^{n_i}\frac{f(X_{i,j})}{p(X_{i,j})})\\\\
&= \frac{1}{n_i}n_iE(\frac{f(X)}{p(X)})\\\\
&\approx \int_{\Lambda_i} \frac{f(x)}{p(x)} \frac{p(x)}{v_i} dx\\\\
&= \frac{1}{v_i} \int_{\Lambda_i} f(x) dx
\end{aligned}
\end{equation}
$$

由此可得最终的Monte Carlo表示方式.

$$
\begin{equation}
F = \sum_{i=1}^n v_i F_i
\end{equation}
$$

分层抽样主要用于降低方差, 对于独立变量\\(X\\)和\\(Y\\), 有\\(Var(X+Y)=Var(X)+Var(Y)\\), 因此每一层的方差如下.

$$
\begin{equation}
\begin{aligned}
Var(F_i)
&= Var(\frac{1}{n_i}\sum_{j=1}^{n_i}\frac{f(X_{i,j})}{p(X_{i,j})})\\\\
&= \frac{1}{n^2_i}Var(\sum_{j=1}^{n_i}\frac{f(X_{i,j})}{p(X_{i,j})})\\\\
&= \frac{1}{n^2_i}n_i Var(\frac{f(X)}{p(X)})\\\\
&\approx \frac{1}{n_i}\sigma_{i}^2 
\end{aligned}
\end{equation}
$$

令层数为m, 可以得出Monte Carlo的方差为下式.

$$
\begin{equation}
\begin{aligned}
Var(F)
&= Var(\sum_{i=1}^m v_i F_i)\\\\
&= \sum_{i=1}^m Var(v_i F_i)\\\\
&= \sum_{i=1}^m \frac{v_i^2\sigma_i^2}{n_i}
\end{aligned}
\end{equation}
$$

令每层的样本数与每层的样本范围线性正相关, 此时每层\\(n_i=nv_i\\), 方差可以简化为下式.

$$
\begin{equation}
Var(F)=\frac{1}{n} \sum_{i=1}^m v_i\sigma_i^2
\end{equation}
$$

对于非分层抽样, 可以看作是先随机选择一个层, 然后在该层中随机抽样出一个值, 抽样出的值\\(X_i\\)是依赖于选择到该层\\(I_i\\)的概率的. 此时积分的方差可以表示为下式.

$$
\begin{equation}
\begin{aligned}
Var(F)
&= \frac{1}{n^2} \sum_{i=1}^n Var(\frac{f(X_i)}{P(X_i)})\\\\
&= \frac{1}{n} Var(\frac{f(X)}{P(X)})
\end{aligned}
\end{equation}
$$

全概率定理如下.

$$
\begin{equation}
\begin{aligned}
E(E(X|Y))
&=\int p(y) \int x p(x|y) dx dy\\\\
&=\int \int x p(x,y) dx dy\\\\
&=\int x p(x) dx\\\\
&=E(X)
\end{aligned}
\end{equation}
$$

全方差定理如下.

$$
\begin{equation}
\begin{aligned}
Var(X)&=E(Var(X|Y))+Var(E(X|Y))\\\\
E(Var(X|Y))
&=E(E(X^2|Y)-E^2(X|Y))\\\\
&=E(E(X^2|Y))-E(E^2(X|Y))\\\\
&=E(X^2)-E(E^2(X|Y))\\\\
Var(E(X|Y))
&=E(E^2(X|Y))-E^2(E(X|Y))\\\\
&=E(E^2(X|Y))-E^2(X)
\end{aligned}
\end{equation}
$$

已知落入某层的概率即为该层在积分中的占比, 即\\(p(I = v) = v\\), 记\\(G=\frac{f(X)}{P(X)}\\), 此时可以解出下式.

$$
\begin{equation}
\begin{aligned}
E(Var(G|I))
&= \sum_{i=1}^m Var(G|I=v_i)p(I=v_i)\\\\
&= \sum_{i=1}^m \sigma_i^2 v_i
\end{aligned}
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
Var(E(G|I))
&= \sum_{i=1}^m (E(G|I=v_i) - E(E(G|I)))^2 p(I=v_i)\\\\
&= \sum_{i=1}^m (\mu_i - E(G))^2 v_i\\\\
&= \sum_{i=1}^m (\mu_i - Q)^2 v_i
\end{aligned}
\end{equation}
$$

将上式结合即可得到非分层抽样下的方差.

$$
\begin{equation}
\begin{aligned}
Var(F)
&= \frac{1}{n} Var(G)
&= \frac{1}{n} \sum_{i=1}^m (\sigma_i^2 v_i + (\mu_i - Q)^2 v_i)
\end{aligned}
\end{equation}
$$

可以看到非分层抽样的方差是大于等于分层抽样的方差的, 但是需要估计每一层的积分和. 同时分层数量也随维度指数增加, 通常只会在某一维上增加层数, 其它维度只有少量的层.

### 重要性抽样

重要性抽样的核心思想就是让采样PDF与积分函数相似, 此时样本会集中在函数值较大处, 有利于积分计算的收敛.根据Jensen不等式可以得到下式, 当且仅当\\(\frac{|f(X)|}{p(X)}\\)为常数时成立.

$$
\begin{equation}
\begin{aligned}
Var(\frac{f(X)}{p(X)})
&= E(\frac{f^2(X)}{p^2(X)}) - E^2(\frac{f(X)}{p(X)})\\\\
&\geq E^2(\frac{|f(X)|}{p(X)}) - F^2 
\end{aligned}
\end{equation}
$$

对于分层抽样, 可以在每一层内部使用重要性抽样来进一步降低方差. 但显然想找到这样的PDF是比较困难的.

#### 多重重要性抽样

积分式往往是由多个方程组成的, 我们可以分别选取与各个方程相似的PDF, 这被称为多重重要性抽样, 简称MIS, 若为无偏估计则在采样结果相同时\\(\sum_{i=1}^n \omega_i(x) = 1\\), 且当\\(p_i(x) = 0\\)时\\(\omega_i(x) = 0\\)否则由于概率为0使得权重不产生影响上一个条件不成立, 证明如下.

$$
\begin{equation}
\begin{aligned}
F
&=E(\sum_{i=1}^n \frac{1}{n_i} \sum_{j=1}^{n_i} \omega_i(X_{i,j})\frac{f(X_{i,j})}{p_i(X_{i,j})})\\\\
&\approx\sum_{i=1}^n\int\omega_i(x)\frac{f(x)}{p_i(x)}p_i(x)dx\\\\
&=\int\sum_{i=1}^n\omega_i(x)\frac{(f(x))}dx\\\\
&=\int f(x)dx
\end{aligned}
\end{equation}
$$

我们希望与函数形状相似的分布具有更高的权重, 我们通过平衡启发式来达到这一目的.

$$
\begin{equation}
\omega_i(x) = \frac{n_i p_i(x)}{\sum_{j=1}^{n} n_j p_j(x)}
\end{equation}
$$

实际使用中幂启发式也是常用的形式, pbrt中幂设置为2.

$$
\begin{equation}
\omega_i(x) = \frac{(n_i p_i(x))^\beta}{\sum_{j=1}^{n} (n_j p_j(x))^\beta}
\end{equation}
$$

若某次采样过程只使用一种PDF, 令选择\\(p_i(x)\\)的概率为\\(q_i\\), 此时可以得到单抽样模型, 同样也是无偏的.

$$
\begin{equation}
\begin{aligned}
F
&=E(\frac{w_i(X)}{q_i}\frac{f(X)}{p_i(X)})\\\\
&=\sum_{i=1}^n\int\frac{\omega_i(x)}{q_i}\frac{f(x)}{p_i(x)}p_i(x)q_i dx\\\\
&=\int\sum_{i=1}^n\omega_i(x)f(x)dx\\\\
&=\int f(x)dx
\end{aligned}
\end{equation}
$$

对于MIS, 若其中一个采样分布与函数式接近, MIS会略微提高方差.

#### MIS补偿

MIS中每个PDF都可以单独用于Monte Carlo, 函数值非0处只需要有一个概率分布不为0即可. 将PDF较小处调整为0可以进一步缩小方差, 这被称为MIS补偿, 一种补偿方法如下.

$$
\begin{equation}
p'(x) = \frac{\max(0, p(x) - \delta)}{\int_\Omega max(0, p(x) - \delta) dx}
\end{equation}
$$

### 俄罗斯轮盘

俄罗斯轮盘主要用于跳过估计值较小处的计算, 提高效率的同时可以保持无偏. 选择概率值\\(q\\)与常数\\(c\\), 可以得到下式. \\(c\\)通常为0.

$$
\begin{equation}
F' =
\begin{cases}
\frac{F-qc}{1-q} & \xi > q\\\\
c & \text{otherwise}
\end{cases}
\end{equation}
$$

可以证明它是无偏的.

$$
\begin{equation}
E(F') = (1 - q)\frac{E(F) - qc}{1 - q} + qc = E(F)
\end{equation}
$$

### 分离法

对于多维积分, 在样本数不变的情况下提高某个维度的样本数被称为分离法, 可以提高采样效率.

$$
\begin{equation}
\begin{aligned}
&\frac{1}{nm} \sum_{i=1}^{nm} \frac{f(X_i, Y_i)}{p_x(X_i) p_y(Y_i)}\\\\
=>&\frac{1}{n} \sum_{i=1}^n \frac{1}{m} \sum_{j=1}^m \frac{f(X_i, Y_{i, j})}{p_x(X_i) p_y(Y_{i, j})}
\end{aligned}
\end{equation}
$$

例如在渲染中, 初始光线方向与相交后的反射方向都是随机变量, 我们可以只发射一次然后对反射方向多次采样来减少初次发射的开销.

## 逆变换法

逆变换法可以通过采样容易构造的均匀分布来得到选定PDF中的样本. 在PDF已知的情况下, 将均匀分布采样结果输入CDF的逆函数即可获取PDF中的样本. 这里主要证明逆变换法得到的采样结果遵循选定的分布.

$$
\begin{equation}
P(P_F^{-1}(U) < x)
= P(U < P_F(x))
= P_F(x)
\end{equation}
$$

### 线性函数采样

线性函数及其PDF与CDF定义如下.

$$
\begin{equation}
\begin{aligned}
f(x)&=(1-x)a+xb\\\\
p(x)&=\frac{2((1-x)a+xb)}{a+b}\\\\
P(x)&=\frac{x(a(2-x)+bx)}{a+b}
\end{aligned}
\end{equation}
$$

求解CDF逆变换即\\(U=P(X)\\)这一二次方程的结果如下, 为保证\\(a=b\\)时结果稳定对结果做简单变换.

$$
\begin{equation}
\begin{aligned}
X
&=\frac{a-\sqrt{(1-U)a^2+Ub^2}}{a-b}\\\\
&=\frac{U(a+b)}{a+\sqrt{(1-U)a^2+Ub^2}}
\end{aligned}
\end{equation}
$$

## 分布变换

为了使得变换后的CDF具有如下性质, 我们要求\\(Y=T(X)\\)在每个维度上都单调递增.

$$
\begin{equation}
P(Y(X)) = P(X)
\end{equation}
$$

此时通过求导可以得到二者PDF的关系, 其中\\(|J_T(x)|\\)代表Jacobi矩阵的行列式.

$$
\begin{equation}
p_T(y)=p_T(T(x))=\frac{p(x)}{|J_T(x)|}
\end{equation}
$$

---
title: "Metatron Dev. IV: 路径追踪加速"
date: 2026-08-28
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "path guiding", "metatron"]
---

## Path Guiding

路径引导基于已有样本估计场景贡献, 通过MIS选择BSDF或PG, 结果无偏.

### ReSTIR PG

局部路径引导拟合的理想分布为后缀贡献:

$$
\begin{equation}
p(\omega_i|\mathbf{p}, \omega_o) \propto f(\mathbf{p}, \omega_o, \omega_i)L_i(\mathbf{p}, \omega_i)|\cos\theta|
\end{equation}
$$

ReSTIR PT将路径贡献作为目标分布$\hat{p}(\mathbf{x})=f(\mathbf{x})$, 记$\mathcal{A}$为场景表面, $W_e$为传感器响应, $h_x$为像素$x$的重建滤波器, $L_e(\mathbf{p}_n)$为末端顶点自发光, 路径贡献函数为:

$$
\begin{equation}
f(\mathbf{x}) = W_e(\mathbf{p}_0 \to \mathbf{p}_1)G(\mathbf{p}_0 \leftrightarrow \mathbf{p}_1)
\prod_{i=1}^{n-1} f(\mathbf{p}_{i+1} \to \mathbf{p}_i \to \mathbf{p}_{i-1})G(\mathbf{p}_i \leftrightarrow \mathbf{p}_{i+1})
L_e(\mathbf{p}_n)
\end{equation}
$$

定义逐顶点的传输因子$T$并简化上式:

$$
\begin{equation}
T(\mathbf{p}_i) =
\begin{cases}
f(\mathbf{p}_{i+1} \to \mathbf{p}_i \to \mathbf{p}_{i-1})G(\mathbf{p}_i \leftrightarrow \mathbf{p}_{i+1}), & i > 1\\
W_e(\mathbf{p}_0 \to \mathbf{p}_1)G(\mathbf{p}_0 \leftrightarrow \mathbf{p}_1)f(\mathbf{p}_2 \to \mathbf{p}_1 \to \mathbf{p}_0)G(\mathbf{p}_1 \leftrightarrow \mathbf{p}_2), & i = 1
\end{cases}
\end{equation}
$$

$$
\begin{equation}
f([\mathbf{p}_0, \dots, \mathbf{p}_n]) = \prod_{i=1}^{n-1}T(\mathbf{p}_i)\ L_e(\mathbf{p}_n)
\end{equation}
$$

记像素$x$的路径空间为$\Omega_x$:

$$
\begin{equation}
C_x = \frac{1}{\int_{\Omega_x} f(\mathbf{x})\mathrm{d}\mathbf{x}}
\end{equation}
$$

全体像素构成对整个路径空间$\Omega=\bigcup_{n=2}^\infty \mathcal{A}^n$的分层抽样, 其密度为各像素分布的混合:

$$
\begin{equation}
p(\mathbf{x}) = \Phi(\mathbf{p}_0, \mathbf{p}_1)f(\mathbf{x}), \quad
\Phi(\mathbf{p}_0, \mathbf{p}_1) = \frac{1}{N}\sum_{x=1}^N C_x[h_x(\mathbf{p}_0 \to \mathbf{p}_1) > 0]
\end{equation}
$$

记$\mathrm{d}\mathbf{p}_{a:b}=\mathrm{d}\mathbf{p}_a \cdots \mathrm{d}\mathbf{p}_b$, 约定$a > b$时积分退化为被积函数本身:

$$
\begin{equation}
p(\mathbf{p}_{i+1}|\mathbf{p}_0, \dots, \mathbf{p}_i)
= \frac{p(\mathbf{p}_0, \dots, \mathbf{p}_{i+1})}{p(\mathbf{p}_0, \dots, \mathbf{p}_i)}
= \frac{\sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i-1}} p(\mathbf{x})\mathrm{d}\mathbf{p}_{i+2:n}}
{\sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i}} p(\mathbf{x})\mathrm{d}\mathbf{p}_{i+1:n}}
\end{equation}
$$

$\Phi$只依赖$\mathbf{p}_0$与$\mathbf{p}_1$, 条件$i \geq 1$已固定二者, 同时$\prod_{t=1}^{i-1}T(\mathbf{p}_t)$与积分变量无关, 一并约去:

$$
\begin{equation}
\begin{aligned}
p(\mathbf{p}_{i+1}|\mathbf{p}_0, \dots, \mathbf{p}_i)
&= \frac{\sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i-1}} \prod_{t=1}^{n-1}T(\mathbf{p}_t)L_e(\mathbf{p}_n)\mathrm{d}\mathbf{p}_{i+2:n}}
{\sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i}} \prod_{t=1}^{n-1}T(\mathbf{p}_t)L_e(\mathbf{p}_n)\mathrm{d}\mathbf{p}_{i+1:n}}\\
&= \frac{T(\mathbf{p}_i)\sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i-1}} \prod_{t=i+1}^{n-1}T(\mathbf{p}_t)L_e(\mathbf{p}_n)\mathrm{d}\mathbf{p}_{i+2:n}}
{\sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i}} \prod_{t=i}^{n-1}T(\mathbf{p}_t)L_e(\mathbf{p}_n)\mathrm{d}\mathbf{p}_{i+1:n}}
\end{aligned}
\end{equation}
$$

分子中$T(\mathbf{p}_i)$之后的求和即入射辐亮度:

$$
\begin{equation}
L_i(\mathbf{p}_{i+1} \to \mathbf{p}_i)
= \sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i-1}} \prod_{t=i+1}^{n-1}T(\mathbf{p}_t)L_e(\mathbf{p}_n)\mathrm{d}\mathbf{p}_{i+2:n}
\end{equation}
$$

分母相比入射辐亮度少了自发光:

$$
\begin{equation}
L_i(\mathbf{p}_i \to \mathbf{p}_{i-1}) - L_e(\mathbf{p}_i \to \mathbf{p}_{i-1})
= \sum_{n=i+1}^\infty \int_{\mathcal{A}^{n-i}} \prod_{t=i}^{n-1}T(\mathbf{p}_t)L_e(\mathbf{p}_n)\mathrm{d}\mathbf{p}_{i+1:n}\\
\end{equation}
$$

分母只依赖$\mathbf{p}_{i-1}$与$\mathbf{p}_i$, 相对$\mathbf{p}_{i+1}$为常数, 因此$\mathbf{p}_0, \dots, \mathbf{p}_{i-2}$对条件分布没有影响:

$$
\begin{equation}
p(\mathbf{p}_{i+1}|\mathbf{p}_{i-1}, \mathbf{p}_i)
\propto f(\mathbf{p}_{i+1} \to \mathbf{p}_i \to \mathbf{p}_{i-1})G(\mathbf{p}_i \leftrightarrow \mathbf{p}_{i+1})L_i(\mathbf{p}_{i+1} \to \mathbf{p}_i)
\end{equation}
$$

转立体角测度结果如下, 即服从路径贡献分布的路径, 局部弹射方向的条件分布为理想的局部引导分布. ReSTIR样本只是无偏权重, 初始样本质量差时相关性较强.


$$
\begin{equation}
p(\omega_i|\mathbf{p}_i, \omega_o) \propto f(\mathbf{p}_i, \omega_o, \omega_i)L_i(\mathbf{p}_i, \omega_i)|\cos\theta|
\end{equation}
$$

$p(\omega_i|\mathbf{p}, \omega_o)$需要拟合7D模型因此实时不可行. 划分场景为空间网格, 在格内拟合求平均以消去$\mathbf{p}$, 降维到4D的$p(\omega_i|\omega_o)$. 漫反射BSDF为常数, 光滑镜面更依赖BSDF抽样, 因此通过积分消去$\omega_o$后, 只有粗糙镜面效果较差, 可进一步降维到2D:

$$
\begin{equation}
p(\omega_i) = \int_{\mathcal{H}^2} p(\omega_i|\omega_o)p(\omega_o)\mathrm{d}\omega_o
\propto L_i(\omega_i)|\cos\theta| \int_{\mathcal{H}^2} f(\omega_o, \omega_i)p(\omega_o)\mathrm{d}\omega_o
\end{equation}
$$

$p(\omega_i)$以vMF拟合, $\mu_k \in \mathcal{S}^2$为单位平均方向, $\kappa_k \geq 0$为集中度, $\sum_k \pi_k = 1$:

$$
\begin{equation}
\mathcal{V}(\omega;\Theta)
= \sum_{k=1}^K \pi_k v(\omega;\mu_k, \kappa_k)
= \sum_{k=1}^K \frac{\kappa}{4\pi\sinh\kappa}e^{\kappa\mu \cdot \omega}
\end{equation}
$$

展开$\sinh$可得vMF随着$\kappa$增长而收窄集中于$\mu$的波瓣:

$$
\begin{equation}
v(\omega;\mu, \kappa) = \frac{\kappa}{2\pi(1 - e^{-2\kappa})}e^{-\kappa(1 - \mu \cdot \omega)} \approx \frac{\kappa}{2\pi}e^{-\kappa(1 - \mu \cdot \omega)}
\end{equation}
$$

以EM迭代求解, E步固定参数, 计算责任:

$$
\begin{equation}
\gamma_k(\omega_n) = \frac{\pi_k v(\omega_n;\mu_k, \kappa_k)}{\sum_{j=1}^K \pi_j v(\omega_n;\mu_j, \kappa_j)}
\end{equation}
$$

M步固定责任, 更新参数, $\epsilon = 0.01$防止分量权重归零:

$$
\begin{equation}
\begin{aligned}
w_k = \sum_{n=1}^N \gamma_k(\omega_n), \quad
r_k = \sum_{n=1}^N \gamma_k(\omega_n)\omega_n\\
\pi_k = \frac{w_k + \epsilon}{\sum_{j=1}^K (w_j + \epsilon)}, \quad
\mu_k = \frac{r_k}{\|r_k\|}, \quad
\bar{R}_k = \frac{\|r_k\|}{w_k}
\end{aligned}
\end{equation}
$$

方向越集中$\bar{R}_k \in [0, 1]$越接近1, 由其反解$\kappa_k$:

$$
\begin{equation}
\kappa_k \approx \frac{\bar{R}_k(3 - \bar{R}_k^2)}{1 - \bar{R}_k^2}
\end{equation}
$$

ReSTIR PT无偏权重包含足够信息, 不复用历史分布, 记录最终路径所有顶点以更新引导.

### VXPG

将第二次弹射顶点的NEE采样结果注入体素, 估计漫反射辐照度:

$$
\begin{equation}
E(v_i) = \frac{1}{N}\sum_{\mathbf{x}_2 \in v_i} L_l(\mathbf{x}_2)
\end{equation}
$$

以$32 \times 32$图块中心像素为矩心, 单次SLIC聚类计算超像素, $\mathbf{p}$, $\mathbf{n}$为世界空间位置和法线, $\mathbf{u}$为像素坐标, $w_u$为超参数, 距离函数如下:

$$
\begin{equation}
\text{dist}_p(x, y) = |\mathbf{p}_x - \mathbf{p}_y|^2 + w_u |\mathbf{u}_x - \mathbf{u}_y|^2 +
\begin{cases}
\begin{aligned}
&0,&\ \text{if}\ \mathbf{n_x}\cdot\mathbf{n_y} > 0.1\\
&1000000,&\ \text{otherwise}
\end{aligned}
\end{cases}
\end{equation}
$$

在屏幕空间分层抽样128条路径, 所有体素向所有样本路径的$\mathbf{x}_2$发射光线以验证可见性, 得128位位域$R$, 执行K-means聚类. $\oplus$为异或, $w_E$为超参数, 距离函数如下:

$$
\begin{equation}
\text{dist}_v(x, y) = \text{countbits}(R_x \oplus R_y) + w_E |E_x - E_y|
\end{equation}
$$

聚类后依据超像素与超体素组成的元组分桶, 从桶中抽取32个路径样本统计平均路径通量:

$$
\begin{equation}
\bar{T}(p', v') = \frac{1}{N}\sum_{i = 1}^N f(\mathbf{p}_2 \rightarrow \mathbf{p}_1 \rightarrow \mathbf{p}_0) G(\mathbf{p}_1 \leftrightarrow \mathbf{p}_2)
\end{equation}
$$

依据平均路径通量重要性抽样得超像素与超体素, 再抽样桶中的体素. 光栅化执行体素化, 得体素中所有三角形的包围盒, $A$为包围盒最大面的面积, 抽样权重如下:

$$
\begin{equation}
\phi(v_i) = E(v_i)A(v_i)
\end{equation}
$$

得到体素后, 使用球面三角形抽样确定与包围盒可见面的相交点, 发射光线求交.

## Radiance Cache

辐射度缓存在探针中存储辐射度, 命中后直接查询缓存, 因此有偏.

### ORCA

根据BSDF抽样概率和粗糙度决定舍弃概率, 根据预算归一化以避免光滑场景光线超支:

$$
\begin{equation}
s'_i=\frac{b s_i}{\sum_{i=1}^N s_i}
\end{equation}
$$

稀疏光线完整追踪, 根据第二次弹射顶点信息计算hash, 更新最细LOD体素的累积辐亮度, LOD与相机距离相关. 下采样以更新LOD体素, 其余光线单次弹射并查询缓存, 模拟重连接. 只用本帧数据, 不做时域累积.

### SHARC

依据世界空间顶点和LOD计算hash, 因此跨帧hash一致, 体素辐亮度逐帧累积.

## Variable Rate Ray Tracing

### COD

根据方差, 遮挡, 历史PSS样本重放的辐射度梯度决定各像素的光线发射率, 按发射率分桶. 按桶降级/升级发射率以调整预算, 根据与屏幕中心的距离进一步细分, 实现注视点绘制.

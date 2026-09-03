---
title: "Metatron Dev. VIII: 路径追踪加速"
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

### RCPG

基于辐射度级联摆放探针, 使用八面体纹理存储辐射度, 转为立体角的Jacobian如下:

$$
\begin{equation}
|J| = \left(1 + 2\min(1 - |u| - |v|, 0) - 2|u| - 2|v| + 2|uv| + 2u^2 + 2v^2\right)^{-\frac{3}{2}}
\end{equation}
$$

贴近物体的探针命中距离短, 需要的采样率率低, 反之采样率高. 因此不同LOD的探针对应不同的距离区间, 基于区间远端与探针体素内嵌球形成的锥体, 可估计角采样Nyquist频率. 令$w$为体素边长, $d$为与体素中心的距离, $c$为超参数, 采样频率估计如下:

$$
\begin{equation}
\theta_{\min} = 2\arcsin\frac{w}{2d_{\max}}, \quad
f_{\max} = \frac{1}{\theta_{\min}} < \frac{f_s}{2}, \quad
d_{\max} = \frac{cw}{2\sin\frac{1}{f_s}}
\end{equation}
$$

所有探针纹素每帧更新, 只追踪距离区间, 命中确定二值透明. 下采样父级探针, 做透明度混合填充区间外辐射度. 探针通过指数混合累积历史, 命中时查询历史探针, 存储无限弹射辐射度. 每帧对场景执行体素化, 剔除空体素对应的探针.

遍历表面对应的LOD 0探针的纹素, 作为解析面光通过LTC计算贡献, 执行功率重要性抽样, 逐级查询父级纹素LTC并抽样. 令$\mathbf{v}$为几何顶点, 面光辐照度如下:

$$
\begin{equation}
E = \frac{1}{2\pi}\sum_{i=1}^m \arccos(\mathbf{v}_i \cdot \mathbf{v}_j)
\frac{\mathbf{v}_i \times \mathbf{v}_j}{|\mathbf{v}_i \times \mathbf{v}_j|} \cdot \mathbf{n}, \quad
j = (i + 1) \bmod m
\end{equation}
$$

使用三参数LTC以减少计算量:

$$
\begin{equation}
M^{-1} =
\begin{pmatrix}
a & 0 & b\\
0 & 1 & 0\\
0 & 0 & c
\end{pmatrix}, \quad
a, b, c \in [0, 1]
\end{equation}
$$

### NASGPG

归一化各向异性球面高斯(NASG)基于正交坐标系$[\mathbf{x}, \mathbf{y}, \mathbf{z}]$定义, $\mathbf{z}$为波瓣轴, $\lambda$为锐度, $a$为各向异性, $a = 0$时退化为球面高斯. 记$u = \frac{\mathbf{v} \cdot \mathbf{z} + 1}{2}$, $e = \frac{a(\mathbf{v} \cdot \mathbf{x})^2}{1 - (\mathbf{v} \cdot \mathbf{z})^2}$, 形式如下:

$$
\begin{equation}
G(\mathbf{v};[\mathbf{x}, \mathbf{y}, \mathbf{z}], \lambda, a) =
\begin{cases}
\begin{aligned}
&\exp\left(2\lambda u^{1 + e} - 2\lambda\right)u^e, &\ \mathbf{v} \neq \pm\mathbf{z}\\
&1, &\ \mathbf{v} = \mathbf{z}\\
&0, &\ \mathbf{v} = -\mathbf{z}
\end{aligned}
\end{cases}
\end{equation}
$$

$u^e$为球坐标换元的Jacobian, 因此NASG有闭式积分, 可归一化:

$$
\begin{equation}
K = \int_{\mathcal{S}^2} G(\mathbf{v};[\mathbf{x}, \mathbf{y}, \mathbf{z}], \lambda, a)\mathrm{d}\omega
= \frac{2\pi(1 - e^{-2\lambda})}{\lambda\sqrt{1 + a}}
\end{equation}
$$

正交坐标系以欧拉角$\theta, \phi, \tau$参数化, $\mathbf{y} = \mathbf{z} \times \mathbf{x}$, 单个NASG分量只需$\cos\theta$, $\sin\phi$, $\cos\phi$, $\sin\tau$, $\cos\tau$, $\lambda$, $a$七个标量表示:

$$
\begin{equation}
\mathbf{z} =
\begin{pmatrix}
\cos\phi\sin\theta\\
\sin\phi\sin\theta\\
\cos\theta
\end{pmatrix}, \quad
\mathbf{x} =
\begin{pmatrix}
\cos\theta\cos\phi\cos\tau - \sin\phi\sin\tau\\
\cos\theta\sin\phi\cos\tau + \cos\phi\sin\tau\\
-\sin\theta\cos\tau
\end{pmatrix}
\end{equation}
$$

神经网络为4层128宽无偏置MLP, 输入为$\mathbf{p}$, $\omega_o$, $\mathbf{n}$, $\mathbf{p}$归一化后应用one-blob编码, 即分为$k$个等宽区间, 每个区间对应$\sigma = \frac{1}{k}$的高斯核, 执行积分:

$$
\begin{equation}
\text{ob}(x)_i = \int_{\frac{i - 1}{k}}^{\frac{i}{k}} \frac{1}{\sqrt{2\pi}\sigma}e^{-\frac{(t - x)^2}{2\sigma^2}}\mathrm{d}t, \quad i = 1, \dots, k
\end{equation}
$$

输出为$8N + 1$维, N为NASG分量数量, 8为NASG7个标量与其权重$A$, 1为MIS抽样概率$c$. 引导分布为归一化分量的混合, 与BSDF按$c$做MIS:

$$
\begin{equation}
\begin{aligned}
\hat{q}(\omega_i)
&= cq(\omega_i) + (1 - c)p_f(\omega_i)\\
&= c\sum_{k=1}^N A_k\frac{G_k(\omega_i)}{K_k} + (1 - c)p_f(\omega_i)
\end{aligned}
\end{equation}
$$

以KL散度衡量$q$与目标分布$p(\omega_i) = Cf(\mathbf{p}, \omega_o, \omega_i)L_i(\mathbf{p}, \omega_i)|\cos\theta|$的差异, 令$\gamma$为NASG参数, $p$与$\gamma$无关, 梯度如下:

$$
\begin{equation}
\begin{aligned}
\nabla_\gamma D_{KL}(p\|q)
&= \nabla_\gamma\int_{\mathcal{S}^2} p(\omega_i)(\log p(\omega_i) - \log q(\omega_i;\gamma))\mathrm{d}\omega_i\\
&= -\int_{\mathcal{S}^2} p(\omega_i)\nabla_\gamma\log q(\omega_i;\gamma)\mathrm{d}\omega_i
\end{aligned}
\end{equation}
$$

基于$\hat{q}$得单样本估计. 归一化常数$C$未知, 但只对梯度整体缩放, Adam归一化矩后可约去:

$$
\begin{equation}
\nabla_\gamma D_{KL}(p\|q) \approx -\frac{p(\omega_i)}{\hat{q}(\omega_i)}\nabla_\gamma\log q(\omega_i;\gamma)
\end{equation}
$$

$D_{KL}(p\|q)$与$c$无关, $D_{KL}(p\|\hat{q})$可对$c$求导, 但只优化$\hat{q}$时$c$会倾向0, 因为初始$q$质量较差. 因此以$D_{KL}(p\|q)$为主项保证$q$持续更新, 混入$D_{KL}(p\|\hat{q})$以学习$c$, $e = 0.2$:

$$
\begin{equation}
\text{loss} = eD_{KL}(p\|\hat{q}) + (1 - e)D_{KL}(p\|q)
\end{equation}
$$

### NPMPG

使用神经网络隐式表示场景, 以$\Phi$为可训练参数, 连续地将位置映射为vMF混合参数:

$$
\begin{equation}
\text{NPM}(\mathbf{x}\mid\Phi) = \hat{\Theta}(\mathbf{x}), \quad
\mathcal{V}(\omega_i\mid\hat{\Theta}(\mathbf{x})) \propto L_i(\mathbf{x}, \omega_i)
\end{equation}
$$

使用可训练多分辨率空间编码处理高频, 定义$L$级均匀LOD网格, 体素存$F$维特征, 查询时拼接各层的三线性插值结果得到$G(\mathbf{x})$:

$$
\begin{equation}
G(\mathbf{x}\mid\Phi_E) = \bigoplus_{l=1}^L \text{trilinear}(\mathbf{x}, V_l[\mathbf{x}])
\end{equation}
$$

MLP为3层64宽ReLU, 输出$K$个vMF. $\kappa', \lambda', \theta', \phi'$为原始输出, $(\theta, \phi)$为$\mu$的归一化球坐标:

$$
\begin{equation}
\begin{aligned}
\kappa_i = \exp(\kappa_i'), \quad
\lambda_i = \frac{\exp(\lambda_i')}{\sum_{j=1}^K\exp(\lambda_j')}\\
\theta_i = \frac{1}{1 + \exp(-\theta_i')}, \quad
\phi_i = \frac{1}{1 + \exp(-\phi_i')}
\end{aligned}
\end{equation}
$$

以KL散度为目标做小批量随机梯度下降. 令$\mathcal{D} \propto L_i$为目标分布, 路径顶点更新附近体素, $\tilde{p}$为BSDF与引导分布组合的实际抽样分布, 梯度估计如下:

$$
\begin{equation}
\begin{aligned}
\nabla_\Theta D_{KL}(\mathcal{D}\|\mathcal{V};\Theta)
&= \nabla_\Theta\int_\Omega \mathcal{D}(\omega)\log\frac{\mathcal{D}(\omega)}{\mathcal{V}(\omega\mid\hat{\Theta})}\mathrm{d}\omega\\
&\approx \nabla_\Theta\frac{1}{N}\sum_{j=1}^N\frac{\mathcal{D}(\omega_j)}{\tilde{p}(\omega_j\mid\hat{\Theta})}\log\frac{\mathcal{D}(\omega_j)}{\mathcal{V}(\omega_j\mid\hat{\Theta})}\\
&= -\frac{1}{N}\sum_{j=1}^N\frac{\mathcal{D}(\omega_j)\nabla_\Theta\mathcal{V}(\omega_j\mid\hat{\Theta})}{\tilde{p}(\omega_j\mid\hat{\Theta})\mathcal{V}(\omega_j\mid\hat{\Theta})}
\end{aligned}
\end{equation}
$$

学习完整被积函数时额外输入$\omega_o$, 目标分布改为$f_s L_i\cos\theta_i$, 余弦项以固定vMF波瓣近似. $\mathbf{n}$与粗糙度$r$作为辅助特征输入, $\omega_o$与$\mathbf{n}$使用球谐编码.

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

---
title: "Metatron Dev. VIII: 抽样优化"
date: 2026-08-28
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "path guiding", "control variates", "metatron"]
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

### MCPG

基于混合vMF估计分布, 链状态为单个波瓣, 存于多分辨率哈希网格, 同时有均匀静态网格保证LOD边界的状态交换. 基于三线性权重抽取$N_\mathrm{mc}$个候选顶点, 以亮度为权重执行RIS.

$f_\mathrm{mc}$为当前样本入射亮度估计, 路径尾部查询辐照度缓存, 接受概率如下, 分母可加速预热:

$$
\begin{equation}
p_\mathrm{accept} = \min\left(\frac{f_\mathrm{mc}}{\mathrm{sum}_\mathrm{mc}/N_\mathrm{mc}}, 1\right)
\end{equation}
$$

以最大似然估计更新状态, 混合因子$\alpha = \max(\frac{1}{N}, \alpha_\mathrm{min})$. 更新后抽样写回位置, 读写两侧的随机访问使状态扩散. 转移步骤不满足细致平衡, 稳态分布不保证收敛到目标分布.

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

### NRC

单个MLP缓存散射辐亮度$L_s(\mathbf{x}, \omega)$, 路径足迹足够大时误差被模糊, 令$p$为BSDF抽样概率, $\theta_1$为主顶点处视线与法线夹角, $c = 0.01$, 路径足迹定义如下:

$$
\begin{equation}
\begin{aligned}
&a(\mathbf{x}_1 \cdots \mathbf{x}_n) = \left(\sum_{i=2}^n\sqrt{\frac{\|\mathbf{x}_{i-1} - \mathbf{x}_i\|^2}{p(\omega_i\mid\mathbf{x}_{i-1}, \omega)|\cos\theta_i|}}\right)^2\\
&a_0 = \frac{\|\mathbf{x}_0 - \mathbf{x}_1\|^2}{4\pi\cos\theta_1}, \quad
a > ca_0
\end{aligned}
\end{equation}
$$

屏幕分块后每块抽样一条路径更新缓存, 高学习率与每帧多步导致闪烁, 因此推理时使用权重的指数移动平均, $\alpha = 0.99$, $\eta_t$修正初期偏差, 不反馈到训练:

$$
\begin{equation}
\bar{W}_t = \frac{1 - \alpha}{\eta_t}W_t + \alpha\eta_{t-1}\bar{W}_{t-1}, \quad
\eta_t = 1 - \alpha^t
\end{equation}
$$

MLP为7层64宽无偏置, 输出RGB. $\omega$, $\mathbf{n}$转球坐标, 与$1 - e^{-r}$一同做4区间one-blob编码, 漫反射与镜面反射率$\alpha$, $\beta$直接输入. 位置微小变化引起辐亮度剧变, 改用频率编码:

$$
\begin{equation}
\text{freq}(x) = \left(\sin(2^0\pi x), \sin(2^1\pi x), \dots, \sin(2^{11}\pi x)\right)
\end{equation}
$$

MLP输出乘$\alpha + \beta$得到近似出射辐射度. 由于$L_s$为无偏估计量, 使用相对L2损失保证梯度无偏, $\text{sg}$为停止梯度, 损失函数如下:

$$
\begin{equation}
\mathcal{L}_2(L_s, \hat{L}_s) = \frac{(L_s - \hat{L}_s)^2}{\text{sg}(\hat{L}_s)^2 + \epsilon}
\end{equation}
$$

## Markov Chain

### Metropolis-Hastings

令$\mathbf{x}_k$为顶点数为$k$的路径, $p_i$为$X_i$的密度, 转移函数$K(\mathbf{x} \to \mathbf{y})$为$\mathbf{x}$转移至$\mathbf{y}$的概率密度, 满足$\sum_{k=1}^\infty\int_{\mathbf{y}_k} K(\mathbf{x} \to \mathbf{y}_k)\mathrm{d}\mathbf{y}_k = 1$, Markov链的演化如下:

$$
\begin{equation}
p_i(\mathbf{x}) = \sum_{k=1}^\infty\int_{\mathbf{y}_k} K(\mathbf{y}_k \to \mathbf{x})p_{i-1}(\mathbf{y}_k)\mathrm{d}\mathbf{y}_k
\end{equation}
$$

稳态分布(stationary distribution)$p_\infty$为不动点即$p_i = p_{i-1}$. Metropolis-Hastings以提议密度$T(\mathbf{x} \to \mathbf{y})$生成候选, 以接受概率$a(\mathbf{x} \to \mathbf{y})$决定是否接受:

$$
\begin{equation}
p_i(\mathbf{x}) =
p_{i-1}(\mathbf{x})(1 - \sum_{k=1}^\infty\int_{\mathbf{y}_k} T(\mathbf{x} \to \mathbf{y}_k)a(\mathbf{x} \to \mathbf{y}_k)\mathrm{d}\mathbf{y}_k) +
\sum_{k=1}^\infty\int_{\mathbf{y}_k} p_{i-1}(\mathbf{y}_k)T(\mathbf{y}_k \to \mathbf{x})a(\mathbf{y}_k \to \mathbf{x})\mathrm{d}\mathbf{y}_k
\end{equation}
$$

给定目标分布$\hat{p}$, 细致平衡(detailed balance)条件如下:

$$
\begin{equation}
\hat{p}(\mathbf{x})T(\mathbf{x} \to \mathbf{y})a(\mathbf{x} \to \mathbf{y}) = \hat{p}(\mathbf{y})T(\mathbf{y} \to \mathbf{x})a(\mathbf{y} \to \mathbf{x})
\end{equation}
$$

归一化常数$\|\hat{p}\| = \sum_{k=1}^\infty\int_{\mathbf{x}_k} \hat{p}(\mathbf{x}_k)\,\mathrm{d}\mathbf{x}_k$, 设$p_{i-1} = \frac{\hat{p}}{\|\hat{p}\|}$, 代入演化得$\frac{\hat{p}}{\|\hat{p}\|}$为不动点:

$$
\begin{equation}
\begin{aligned}
p_i(\mathbf{x}) &= p_{i-1}(\mathbf{x}) - \frac{1}{\|\hat{p}\|}\sum_{k=1}^\infty\int_{\mathbf{y}_k}(
\hat{p}(\mathbf{x})T(\mathbf{x} \to \mathbf{y}_k)a(\mathbf{x} \to \mathbf{y}_k) - \hat{p}(\mathbf{y}_k)T(\mathbf{y}_k \to \mathbf{x})a(\mathbf{y}_k \to \mathbf{x})
)\mathrm{d}\mathbf{y}_k\\
&= p_{i-1}(\mathbf{x})
\end{aligned}
\end{equation}
$$

按如下方式定义$a$, 使得较大的$\hat{p}(\mathbf{x})T(\mathbf{x} \to \mathbf{y})$总是被接受:

$$
\begin{equation}
a(\mathbf{x} \to \mathbf{y}) = \min(1, \frac{\hat{p}(\mathbf{y})T(\mathbf{y} \to \mathbf{x})}{\hat{p}(\mathbf{x})T(\mathbf{x} \to \mathbf{y})})
\end{equation}
$$

不动点不蕴含唯一性, 例如取$\Omega = \{1, 2, 3\}$, 转移矩阵行为起点列为终点:

$$
K = \begin{bmatrix}
\frac{1}{2} & \frac{1}{2} & 0\\
\frac{1}{2} & \frac{1}{2} & 0\\
0 & 0 & 1
\end{bmatrix}
$$

令$p_0 = (\alpha, \beta, \gamma)$, 一步后即为不动点, 可见不动点与初始状态相关:

$$
p_1 = \left(\frac{\alpha + \beta}{2}, \frac{\alpha + \beta}{2}, \gamma\right)
$$

从任意$\mathbf{x}$出发均能在有限步内到达任何$\hat{p} > 0$的区域则不动点唯一. 若满足细致平衡, 已知$p_0 = \frac{\hat{p}}{\|\hat{p}\|}$不动点为$\frac{\hat{p}}{\|\hat{p}\|}$, 因此任意初值均收敛到它:

$$
\begin{equation}
\lim_{i \to \infty}p_i = \frac{\hat{p}}{\|\hat{p}\|}
\end{equation}
$$

### Metropolis Light Transport

基于BDPT实现MLT, 令$p_0$为BDPT的PDF, 初始权重$W_0 = \frac{\hat{p}(X_0)}{p_0(X_0)}$, 变异保持$W_i = W_{i-1}$, 记$\rho_i(w, \mathbf{x})$为$(W_i, X_i)$的联合密度, 加权均衡条件(weighted equilibrium condition)如下:

$$
\begin{equation}
\int_\mathbb{R} w\,\rho_i(w, \mathbf{x})\,\mathrm{d}w = \hat{p}(\mathbf{x})
\end{equation}
$$

$i = 0$时$W_0$由$X_0$确定, $\rho_0(w, \mathbf{x}) = \delta(w - \frac{\hat{p}(\mathbf{x})}{p_0(\mathbf{x})})p_0(\mathbf{x})$, 代入直接满足. 变异与$W$无关, 故$\rho_i$与$p_i$的演化相同:

$$
\begin{equation}
\rho_i(w, \mathbf{x}) =
\rho_{i-1}(w, \mathbf{x})(1 - \sum_{k=1}^\infty\int_{\mathbf{y}_k} T(\mathbf{x} \to \mathbf{y}_k)a(\mathbf{x} \to \mathbf{y}_k)\mathrm{d}\mathbf{y}_k) +
\sum_{k=1}^\infty\int_{\mathbf{y}_k} \rho_{i-1}(w, \mathbf{y}_k)T(\mathbf{y}_k \to \mathbf{x})a(\mathbf{y}_k \to \mathbf{x})\mathrm{d}\mathbf{y}_k
\end{equation}
$$

两侧乘$w$并对$w$积分, 基于加权均衡条件与细致平衡可得:

$$
\begin{equation}
\begin{aligned}
\int_\mathbb{R} w\,\rho_i(w, \mathbf{x})\,\mathrm{d}w &= \hat{p}(\mathbf{x}) - \sum_{k=1}^\infty\int_{\mathbf{y}_k}(
\hat{p}(\mathbf{x})T(\mathbf{x} \to \mathbf{y}_k)a(\mathbf{x} \to \mathbf{y}_k) - \hat{p}(\mathbf{y}_k)T(\mathbf{y}_k \to \mathbf{x})a(\mathbf{y}_k \to \mathbf{x})
)\mathrm{d}\mathbf{y}_k\\
&= \hat{p}(\mathbf{x})
\end{aligned}
\end{equation}
$$

令$h$为滤波器权重, $I_j$为像素$j$的真值, 可验证无偏:

$$
\begin{equation}
\begin{aligned}
E[W_i h_j(X_i)]
&= \sum_{k=1}^\infty\int_{\mathbf{x}_k}\int_\mathbb{R} w\,h_j(\mathbf{x}_k)\rho_i(w, \mathbf{x}_k)\,\mathrm{d}w\,\mathrm{d}\mathbf{x}_k\\
&= \sum_{k=1}^\infty\int_{\mathbf{x}_k} h_j(\mathbf{x}_k)\hat{p}(\mathbf{x}_k)\,\mathrm{d}\mathbf{x}_k\\
&= I_j
\end{aligned}
\end{equation}
$$

### ReSTIR MCMC

添加MCMC后的无偏权重如下:

$$
\begin{equation}
W_i = \frac{\hat{p}(X_{i-1})}{\hat{p}(X_i)}W_{i-1} = \frac{\hat{p}(X_0)}{\hat{p}(X_i)}W_0
\end{equation}
$$

归纳证明$W_i$无偏, 基于GRIS已知$W_0$无偏, 设$W_{i-1}$无偏, 记候选$Z_{i-1} \sim T(X_{i-1} \to \cdot)$:

$$
\begin{equation}
\begin{aligned}
E[f(X_i)W_i]
=\ & E[(1 - a(X_{i-1} \to Z_{i-1}))f(X_{i-1})W_{i-1}] + E[a(X_{i-1} \to Z_{i-1})f(Z_{i-1})\frac{\hat{p}(X_{i-1})}{\hat{p}(Z_{i-1})}W_{i-1}]\\
=\ & E[f(X_{i-1})W_{i-1}] + E[f(Z_{i-1})a(X_{i-1} \to Z_{i-1})\frac{\hat{p}(X_{i-1})}{\hat{p}(Z_{i-1})}W_{i-1}] - E[f(X_{i-1})a(X_{i-1} \to Z_{i-1})W_{i-1}]
\end{aligned}
\end{equation}
$$

后两项含候选$Z_{i-1}$, 消去它才能归纳. $W_{i-1}$仅依赖$X_{i-1}$, 可从条件期望中作为常数提出:

$$
\begin{equation}
\begin{aligned}
E[g(X_{i-1}, Z_{i-1})W_{i-1}]
&= E\big[E[g(X_{i-1}, Z_{i-1})W_{i-1}|\mathcal{F}_{i-1}]\big]\\
&= E\big[W_{i-1}E[g(X_{i-1}, Z_{i-1})|\mathcal{F}_{i-1}]\big]\\
&= E\left[\left(\int_\Omega g(X_{i-1}, \mathbf{z})T(X_{i-1} \to \mathbf{z})\mathrm{d}\mathbf{z}\right)W_{i-1}\right]
\end{aligned}
\end{equation}
$$

此时仅与$X_{i-1}$有关, 代入即得二重积分:

$$
\begin{equation}
\begin{aligned}
E[f(X_i)W_i]
&= \int_\Omega f(\mathbf{x})\mathrm{d}\mathbf{x}\\
&+ \int_\Omega\int_\Omega f(\mathbf{z})a(\mathbf{x} \to \mathbf{z})\frac{\hat{p}(\mathbf{x})}{\hat{p}(\mathbf{z})}T(\mathbf{x} \to \mathbf{z})\mathrm{d}\mathbf{z}\mathrm{d}\mathbf{x}\\
&- \int_\Omega\int_\Omega f(\mathbf{x})a(\mathbf{x} \to \mathbf{z})T(\mathbf{x} \to \mathbf{z})\mathrm{d}\mathbf{z}\mathrm{d}\mathbf{x}
\end{aligned}
\end{equation}
$$

改写细致平衡, 可抵消后两项, 即估计无偏:

$$
\begin{equation}
T(\mathbf{x} \to \mathbf{z})a(\mathbf{x} \to \mathbf{z}) = \frac{\hat{p}(\mathbf{z})}{\hat{p}(\mathbf{x})}T(\mathbf{z} \to \mathbf{x})a(\mathbf{z} \to \mathbf{x})
\end{equation}
$$

变异为对$\mathbf{u}_{i-1}$做高斯扰动, 即$j \neq i$时$\mathbf{p}^y_j = \mathbf{p}^x_j$, 只需变换$\mathbf{u}_{\{i - 1, i, i + 1\}}$. $\mathbf{p}^y_{\{i+1, i+2\}}$固定在$\mathbf{p}^x_{\{i+1, i+2\}}$, 以变异后的前缀$\mathbf{p}^y_{\{0, \dots, i\}}$为条件可得条件密度:

$$
\begin{equation}
p(\mathbf{p}^y_{\{i+1, i+2\}}|\mathbf{p}^y_{\{0, \dots, i\}}) = \delta(\mathbf{p}^y_{i+1} - \mathbf{p}^x_{i+1})\delta(\mathbf{p}^y_{i+2} - \mathbf{p}^x_{i+2})
\end{equation}
$$

$a$需要提议密度比值, $\mathbf{u}_{i-1}$的密度只与$|\mathbf{u}^x_{i-1} - \mathbf{u}^y_{i-1}|$有关, 在比值中约去. $\mathbf{u}^y_{\{i, i+1\}}$的密度为上式的变换$p(\mathbf{p}^y_{\{i+1, i+2\}}|\mathbf{p}^y_{\{0, \dots, i\}})\left|\frac{\partial\mathbf{p}^y_{\{i+1, i+2\}}}{\partial\mathbf{u}^y_{\{i, i+1\}}}\right|$, Dirac delta函数同样约去, 此时可得:

$$
\begin{equation}
\begin{aligned}
\frac{T(\mathbf{y} \to \mathbf{x})}{T(\mathbf{x} \to \mathbf{y})}
&= \frac{\left|\frac{\partial\mathbf{p}^x_{\{i+1, i+2\}}}{\partial\mathbf{u}^x_{\{i, i+1\}}}\right|}{\left|\frac{\partial\mathbf{p}^y_{\{i+1, i+2\}}}{\partial\mathbf{u}^y_{\{i, i+1\}}}\right|}\\
&= \left|\frac{\partial\mathbf{u}^y_{\{i, i+1\}}}{\partial\omega^y_{\{i, i+1\}}}\right|
\left|\frac{\partial\omega^y_{\{i, i+1\}}}{\partial\mathbf{p}^y_{\{i+1, i+2\}}}\right|
\left|\frac{\partial\mathbf{p}^x_{\{i+1, i+2\}}}{\partial\omega^x_{\{i, i+1\}}}\right|
\left|\frac{\partial\omega^x_{\{i, i+1\}}}{\partial\mathbf{u}^x_{\{i, i+1\}}}\right|\\
&= \frac{p_{y_i}(\omega^y_i)G(\mathbf{p}^y_i \to \mathbf{p}^x_{i+1})}{p_{x_i}(\omega^x_i)G(\mathbf{p}^x_i \to \mathbf{p}^x_{i+1})}\frac{p_{y_{i+1}}(\omega^y_{i+1})}{p_{x_{i+1}}(\omega^x_{i+1})}\\
&= J_{\mathbf{x} \to \mathbf{y}}
\end{aligned}
\end{equation}
$$

## Correlated Sampling

### Control Variates

控制变量引入与$f$相关的辅助函数$h$, 积分$H = \int_{\Omega_x} h(\mathbf{x})\mathrm{d}\mathbf{x}$已知, 可改写估计量:

$$
\begin{equation}
\langle I_x \rangle = \alpha H + \left(f(X) - \alpha h(X)\right)W_X
\end{equation}
$$

图像空间控制变量以相邻像素$y$为辅助函数, 要求$I_y$可低方差估计, 估计量如下:

$$
\begin{equation}
\langle I_x \rangle_{\leftarrow y} = \alpha\langle I_y \rangle + \langle I_x - \alpha I_y \rangle
\end{equation}
$$

记$A = f(X)W_X$, $B = f(Y)W_Y$, 分别无偏估计$I_x$与$I_y$, $A - \alpha B$的方差为:

$$
\begin{equation}
\mathrm{Var}[A - \alpha B] = \mathrm{Var}[A] + \alpha^2\mathrm{Var}[B] - 2\alpha\mathrm{Cov}[A, B]
\end{equation}
$$

对$\alpha$求导得最优系数, 令$A$, $B$的相关系数为$\rho = \frac{\mathrm{Cov}[A,B]}{\sqrt{\mathrm{Var}[A]\mathrm{Var}[B]}}$, 代回得方差缩减与$\rho$相关:

$$
\begin{equation}
\alpha^* = \frac{\mathrm{Cov}[A, B]}{\mathrm{Var}[B]}, \quad
\mathrm{Var}[A - \alpha^* B] = (1 - \rho^2)\mathrm{Var}[A]
\end{equation}
$$

若$X$与$Y$独立则$\mathrm{Cov}[A, B] = 0$, 任意$\alpha \neq 0$均使方差增加. 对于$\alpha\langle I_y \rangle + (A - \alpha B)$, 若$\langle I_y \rangle$为$B$则退化为$A$; 若为独立样本$B'$, 方差为$\mathrm{Var}[A] + \alpha^2(\mathrm{Var}[B] + \mathrm{Var}[B'])$. 两种情况都不低于$\mathrm{Var}[A]$, 因此独立样本无法缩减方差, $X$与$Y$必须相关.

令$Y = T_{x \to y}(X)$, 场景连续处$f(\mathbf{x}) \approx f(T_{x \to y}(\mathbf{x}))$, 此时$\rho \to 1$.

$$
\begin{equation}
\begin{aligned}
I_x - \alpha I_y
&= \int_{\Omega_x} f(\mathbf{x})\mathrm{d}\mathbf{x} - \alpha\int_{\Omega_y} f(\mathbf{y})\mathrm{d}\mathbf{y}\\
&= \int_{\Omega_x} \left(f(\mathbf{x}) - \alpha f(T_{x \to y}(\mathbf{x}))J_{\mathbf{x} \to \mathbf{y}}\right)\mathrm{d}\mathbf{x}
\end{aligned}
\end{equation}
$$

不保证$T_{x \to y}(\Omega_x) \supseteq \Omega_y$, 需要MIS:

$$
\begin{equation}
\begin{aligned}
\langle I_x - \alpha I_y \rangle
&= m_x(X)\left(f(X) - \alpha f(T_{x \to y}(X))J_{X \to Y}\right)W_X\\
&+\ m_y(Y)\left(f(T_{y \to x}(Y))J_{Y \to X} - \alpha f(Y)\right)W_Y
\end{aligned}
\end{equation}
$$

### ReSTCV

$x$重投影到$y$, $X$为当前帧新样本, $\langle I_x \rangle_\mathrm{init} = f(X)W_X$. 时域估计为:

$$
\begin{equation}
\langle I_x \rangle = \frac{M_y\langle I_x \rangle_{\leftarrow y} + M_\mathrm{init}\langle I_x \rangle_\mathrm{init}}{M_y + M_\mathrm{init}}
\end{equation}
$$

$\mathcal{N}(x)$为包含$x$自身的空域像素集合, 空域估计为:

$$
\begin{equation}
\langle I_x \rangle = \frac{\sum_{y \in \mathcal{N}(x)} M_y\langle I_x \rangle_{\leftarrow y}}{\sum_{y \in \mathcal{N}(x)} M_y}
\end{equation}
$$

ReSTIR PT下$\langle I_x \rangle_{\leftarrow y}$的参数可从蓄水池获取, GRIS估计量只根据无偏权重调整样本亮度, 控制变量估计量包含多个通道, 可有效降低复杂色彩光照或光谱渲染的方差.

---
title: "pbrt-v4 Ep. VIII: 图像重建"
date: 2024-11-30
draft: false
description: "pbrt-v4 episode 8"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

本章主要介绍采样理论与图像滤波, 利用图像处理技术可以有效降低渲染所需的样本量.

## 采样理论

### 频域与Fourier变换

样本空间通常位于空间中, 利用Fourier变换可以转换到频域中.

#### Fourier级数

对于一个函数集合中任意不同的函数\\(f(x),g(x)\\)若满足\\(\int_{-\infty}^{\infty} f(x)g(x) dx = 0\\), 则该集合被称为正交函数系. 根据Hilbert空间理论, 可以证明三角函数系\\(\lbrace\cos 0, \sin 0, \cos(\omega x), \sin(\omega x), \cos(2 \omega x), \sin(2 \omega x), ...\rbrace\\)为完备的正交函数系, 可以用于表示任意函数. 由此可以得到周期函数Fourier分解的一般形式, 其中频率采用\\(\omega = \frac{1}{T}\\)表示.

$$
\begin{equation}
f(x) = \sum_{n = 0}^{\infty} \left(a_n \cos n 2\pi \omega x + b_n \sin n 2\pi \omega x \right)
\end{equation}
$$

各项系数可以基于正交理论得到并基于极坐标进一步转化以获取相位.

$$
\begin{equation}
\begin{aligned}
a_n &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) \cos n 2\pi \omega x dx &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} a_n \cos^2 n 2\pi \omega x dx\\\\
b_n &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) \sin n 2\pi \omega x dx &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} b_n \sin^2 n 2\pi \omega x dx\\\\
\end{aligned}
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
f(x)
&= \sum_{n = 0}^{\infty} \left(c_n \cos\phi_n \cos n 2\pi \omega x + c_n\sin\phi_n \sin n 2\pi \omega x \right)\\\\
&= \sum_{n = 0}^{\infty} c_n \cos(n 2\pi \omega x + \phi_n)
\end{aligned}
\end{equation}
$$

基于Euler公式\\(e^{ix} = \cos x + i\sin x \\)可以进一步转换Fourier展开.

$$
\begin{equation}
\begin{aligned}
f(x)
&= \sum_{n=0}^{\infty} \left(a_n \frac{e^{i n 2\pi \omega x} + e^{-i n 2\pi \omega x}}{2} + b_n \frac{-i(e^{i n 2\pi \omega x} - e^{-i n 2\pi \omega x})}{2}\right)\\\\
&= \sum_{n=0}^{\infty} \frac{e^{i n 2\pi \omega x}(a_n - i b_n) + e^{-i n 2\pi \omega x}(a_n + i b_n)}{2}\\\\
&= \sum_{n=0}^{\infty} \frac{e^{i n 2\pi \omega x}(a_n - i b_n)}{2} + \sum_{n=-\infty}^{-1} \frac{e^{i n 2\pi \omega x}(a_{-n} + i b_{-n})}{2}\\\\
&= \sum_{n=-\infty}^{\infty} d_n e^{i n 2\pi \omega x}
\end{aligned}
\end{equation}
$$

对于分段系数\\(d_n\\)分别证明可以得到如下的结论.

$$
\begin{equation}
\begin{aligned}
d_{n \ge 0}
&= \frac{a_n - i b_n}{2}\\\\
&= \frac{1}{T}\int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) (\cos n 2\pi \omega x - i\sin n 2\pi \omega x) dx\\\\
&= \frac{1}{T}\int_{\frac{T}{2}}^{\frac{T}{2}} f(x) e^{-i n 2\pi \omega x} dx\\\\
d_{n < 0}
&= \frac{a_{-n} + i b_{-n}}{2}\\\\
&= \frac{1}{T}\int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) (\cos (-n 2\pi \omega x) + i\sin (-n 2\pi \omega x)) dx\\\\
&= \frac{1}{T}\int_0^{T} f(x) e^{-i n 2\pi \omega x} dx\\\\
d_n &= \frac{1}{T}\int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) e^{-i n 2\pi \omega x} dx
\end{aligned}
\end{equation}
$$

经整理得到较为常用的Fourier级数的形式.

$$
\begin{equation}
F_i(x) = \frac{1}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) e^{-i n 2\pi \omega x} dx
\end{equation}
$$

#### Fourier变换

Fourier级数针对周期函数, 对于非周期函数可以看作\\(T \to +\infty\\)的周期函数, 此时各个余弦函数的频率\\(\frac{n}{T}\\)转化为连续变化的频率\\(\omega\\), \\(\frac{1}{T}\\)转化为无穷小\\(d\omega\\), 由此可得下式.

$$
\begin{equation}
f(x) = \int_{-\infty}^{\infty} \int_{-\infty}^{\infty} f(y) e^{-i 2 \pi \omega y}dy\ e^{i 2\pi \omega x} d\omega
\end{equation}
$$

从中可以提取出Fourier变换.

$$
\begin{equation}
F(\omega) = \int_{-\infty}^{\infty} f(x) e^{-i 2 \pi \omega x} dx
\end{equation}
$$

### 理想采样与重建

#### 冲激函数列

利用Dirac方程构建周期为T的冲激函数列.

$$
\begin{equation}
III_T(x) = T \sum_{n = -\infty}^{\infty} \delta(x - n T)
\end{equation}
$$

冲激函数列的Fourier展开与Fourier变换如下. Fourier变换后周期变为倒数代表在空间上较远的样本在频域上较近.

$$
\begin{equation}
\begin{aligned}
III_T(x)
&= \sum_{n=-\infty}^{\infty} \int_{-\frac{T}{2}}^{\frac{T}{2}} T \sum_{j = -\infty}^{\infty} \delta(x - jT) e^{-i \frac{2\pi}{T} n x} dx\ e^{i \frac{2\pi}{T} n x}\\\\
&= T \sum_{n=-\infty}^{\infty} e^{i \frac{2\pi}{T} n x}\\\\
F_{III}(\omega)
&= \sum_{j=-\infty}^{\infty} \int_{-\infty}^{\infty} T \delta(x - jT) e^{-i 2\pi \omega x} dx\\\\
&= \sum_{n=-\infty}^{\infty} T e^{-i 2\pi \omega n T}\\\\
&= \frac{1}{\frac{1}{T}} \sum_{n=-\infty}^{\infty} e^{i \frac{2\pi}{\frac{1}{T}} n (-\omega)}\\\\
&= III_{\frac{1}{T}}(-\omega)\\\\
&= III_{\frac{1}{T}}(\omega)
\end{aligned}
\end{equation}
$$

#### 卷积

卷积定义如下.

$$
\begin{equation}
f(x) \otimes g(x) = \int_{-\infty}^{\infty} f(y)g(x-y) dy
\end{equation}
$$

通过调整积分顺序, 傅里叶变换具有如下的卷积定理.

$$
\begin{equation}
\begin{aligned}
\mathcal{F} \lbrace f(x) \otimes g(x) \rbrace
&= \int_{-\infty}^{\infty} \int_{-\infty}^{\infty} f(x)g(y-x)dx\ e^{-i 2\pi \omega y} dy\\\\
&= \int_{-\infty}^{\infty} f(x) \int_{-\infty}^{\infty} g(y - x) e^{-i 2\pi \omega (y - x + x)} dy dx\\\\
&= \int_{-\infty}^{\infty} f(x) \int_{-\infty}^{\infty} g(z) e^{-i 2\pi \omega (z + x)} dz dx\\\\
&= \int_{-\infty}^{\infty} f(x) e^{-i 2\pi \omega x} dx \int_{-\infty}^{\infty} g(z) e^{-i 2\pi \omega z } dz\\\\
&= \mathcal{F} \lbrace f(x) \rbrace \mathcal{F} \lbrace g(x) \rbrace
\end{aligned}
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
&\mathcal{F}^{-1} \lbrace \mathcal{F} \lbrace f(x) \rbrace \otimes \mathcal{F} \lbrace g(x) \rbrace \rbrace\\\\
&= \int_{-\infty}^{\infty} \int_{-\infty}^{\infty} F(\omega) G(\phi - \omega) d\omega \ e^{i 2\pi \phi x} d\phi\\\\
&= \int_{-\infty}^{\infty} F(\omega) \int_{-\infty}^{\infty} G(\phi - \omega) e^{i 2\pi (\phi - \omega + \omega) x} d\phi d\omega\\\\
&= \int_{-\infty}^{\infty} F(\omega) e^{i 2\pi \omega x} d\omega \int_{-\infty}^{\infty} G(\theta) e^{i 2\pi \theta x} d\theta\\\\
&= f(x)g(x)
\end{aligned}
\end{equation}
$$

#### 滤波

对某个函数的采样结果添加滤波可以按如下方式表示.

$$
\begin{equation}
\begin{aligned}
\tilde{f}(x)
&= (III_T(x)f(x))\otimes r(x)\\\\
&= T \sum_{i=-\infty}^{\infty} f(iT)r(x - iT)
\end{aligned}
\end{equation}
$$

由此可得滤波结果的傅里叶变换.

$$
\begin{equation}
\begin{aligned}
\tilde{f}(x)
&= \mathcal{F} \lbrace III_T(x)f(x) \otimes r(x) \rbrace\\\\
&= \mathcal{F} \lbrace III_T(x)f(x) \rbrace \mathcal{F} \lbrace r(x) \rbrace\\\\
&= (\mathcal{F} \lbrace f(x) \rbrace \otimes III_{\frac{1}{T}}(\omega)) \mathcal{F} \lbrace r(x) \rbrace
\end{aligned}
\end{equation}
$$

盒形滤波定义如下, 其Fourier变换结果为\\(\text{sinc} (T\omega)\\). 由滤波的Fourier变换可知, 若在空间上采用盒形滤波即求附近的样本的均值, 由于\\(\text{sinc}\\)函数的范围是无限的, 在频域上会导致高频样本对滤波结果产生贡献. 同样的, 若在空间上使用高频\\(\text{sinc}\\)函数作为滤波, 在频域上可以获得最优的滤波结果, 但由于无限范围在空间上无法采用该滤波.

$$
\begin{equation}
\begin{aligned}
\pi_{T}(x) =
\begin{cases}
\frac{1}{T}, & |x| < \frac{T}{2}\\\\
0, & otherwise
\end{cases}
\end{aligned}
\end{equation}
$$

### 走样

若采样率过低, Fourier变换后频域样本相距过近出现重叠, 或者说多个样本被卷积复制到频谱上的某个位置, 导致滤波无法还原频域信号, 这被称为走样. 因采样导致的走样为前走样, 重建导致的为后走样, 修复走样的行为被称为反走样. 在实时渲染中走样通常表现为锯齿, 因此反走样也可以翻译为抗锯齿.

解决走样的最好方式为提高采样率, 依据采样定理可知, 当采样频率超过信号频率的两倍即可重建信号, 某个采样率可以重建的信号的最大频率即为Nyquist频率. 由于图形学中的函数几乎都不是带限函数, 需要采取更多提高采样率之外的方法.

### 像素

显示器或摄影中的像素代表发出或检测光线的物理元素, 图片中的像素则为图像函数的样本. 图像中的像素实际上是某个点的样本, 而非通常所认为的是一小块矩形区域. 图像函数的坐标通常通过\\(c'= \lfloor c \rfloor + 0.5\\)来离散化.

### 渲染采样与走样

像素位置\\(x,y\\), 镜头采样位置\\(u,v\\), 时间\\(t\\)以及Monte Carlo样本\\(i\\)都会影响最终获得的辐亮度, 因此图像函数可以总结为如下形式.

$$
\begin{equation}
f(x,y,t,u,v,i_1,i_2,\dots) \rightarrow L
\end{equation}
$$

#### 走样原因

几何物体是最常见的走样原因, 几何物体的边缘或极小的物体会导致图像函数的突变, 此时采用理想的\\(\text{sinc}\\)函数进行重建会导致Gibbs现象或振铃效应, 即采样率不足导致重建出的函数在不连续点附近出现振荡.

贴图与材质也会导致着色走样, 通常由不正确的材质滤波与平面上的高亮点导致. 阴影着色也会引入突变, 且比几何物体的边缘更难检测.

#### 适应性采样

对于超过Nyquist频率的区域提高采样率即位适应性超采样, 通常在相邻样本具有显著变化的区域采用, 但这并不能准确代表当前区域的信号频率, 因此这种方法较难取得理想效果.

#### 预滤波

通过预滤波消除高频信号后的图像函数更易于重建, 图像中通常表现为模糊, 相比走样导致的锯齿模糊不会过于显眼. 令Nyquist频率为\\(\omega_s\\), 理想状态下利用\\(\text{sinc}\\)函数滤波可以消除高于Nyquist频率的信号. 实际使用中基于\\(\text{sinc}\\)函数生成的具有有限范围的函数可以取得较好的预滤波效果.

$$
\begin{equation}
\tilde{f}(x) = f(x) \otimes \text{sinc}(2\omega_s x)
\end{equation}
$$

### 采样模式的频谱分析

采样率固定的情况下采样点的分布也会影响采样质量, 类似shah函数的确定性采样模式在频域上的行为是容易理解的, 而对于随机性采样模式, 除了分析所有可能产生的样本, 我们还需要针对每次生成的样本分析频谱特征.

数学上信号的功率通过信号函数的平方定义, 功率谱密度(power spectral density, PSD)可以用于频谱分析, 根据Wiener-Khinchin定义它可以通过自相关函数的Fourier变换计算, 整理后为Fourier变换结果与其共轭函数的乘积. 对于频域下的偶函数, 其共轭函数即为函数本身, 此时结果为函数的平方. 由卷积定理可得不同函数乘积的PSD为二者PSD的卷积.

$$
\begin{equation}
\begin{aligned}
\mathcal{F}[\mathcal{R}(\chi)]
&= \int_{-\infty}^{\infty} \int_{-\infty}^{\infty} f(x) f(x + \chi) e^{-i 2\pi \omega \chi} d\chi dx\\\\
&= \int_{-\infty}^{\infty} f(x) \int_{-\infty}^{\infty} f(x + \chi) e^{-i 2\pi \omega \chi} d\chi dx\\\\
&= \int_{-\infty}^{\infty} f(x) e^{i 2\pi \omega x} \int_{-\infty}^{\infty} f(x + \chi) e^{-i 2\pi \omega (x + \chi)} d(x + \chi) dx\\\\
&= F(\omega) \overline{F(\omega)}
\end{aligned}
\end{equation}
$$

对于采样密度为无穷的理想采样, 其PSD为位于原点的Dirac delta函数. 对于随机采样可以通过数值方法计算PSD, 将每个采样点视为一个Dirac delta函数, 从而将积分转为求和. 通过对均匀采样添加均匀分布的抖动\\(\epsilon\\)获得的PSD的期望如下, 此时在原点为Dirac delta, 低频下功率接近0, 高频下接近1. 基于图片的能量都集中在低频的假设, 此时通过图片PSD与抖动采样PSD之间的卷积高频能量被分散到低频中, 形成高频噪声, 与低频走样相比人类视觉对噪声的接受程度更高.

$$
\begin{equation}
\begin{aligned}
s_T(x) &= \sum_{n = -\infty}^{\infty} \delta(x - (i + \frac{1}{2} - \epsilon)T)\\\\
P_s(\omega) &= 1 - \text{sinc}^2(\frac{T\omega}{2}) + \delta(\omega)
\end{aligned}
\end{equation}
$$

PSD有时通过颜色描述, 例如白噪声是功率均匀分布的, 蓝噪声则集中在高频, 这与对应颜色的光的性质是相似的. 渲染中通常会使用预计算的噪声贴图, 可以观察到蓝噪声像素之前差异性更大, 白噪声则有相似像素聚集的现象.

## 采样与积分

### 方差的Fourier分析

图形学中的Monte Carlo采样通常位于\\([0,1]^d\\)中, 因此后续Fourier分析都在此基础上简化.

与Fourier变换后的PSD类似, 函数的PSD可以分解为Fourier级数每项的PSD, 对于实偶函数这相当于Fourier系数的平方.

$$
\begin{equation}
\begin{aligned}
P_f(n)
&= f_n e^{-i n 2\pi x} \overline{f_n} e^{i n 2\pi x}\\\\
&= f_n \overline\{f_n}
\end{aligned}
\end{equation}
$$

对于Monte Carlo, 可将其看作多次采样的平均, 可以将这个过程用Dirac delta函数表示.

$$
\begin{equation}
\begin{aligned}
s(x) &= \frac{1}{n} \sum_{i=1}^{n} \delta(x - x_i)\\\\
\int_0^1 f(x) dx
&\approx \frac{1}{n} \sum_{i=1}^n f(x_i)\\\\
&= \int_0^1 f(x) s(x) dx\\\\
&= \int_0^1 \sum_{n = -\infty}^{\infty} s_n e^{i n 2\pi x} f(x) dx\\\\
&= \sum_{n = -\infty}^{\infty} \int_0^1 f(x) e^{i n 2\pi x} dx \int_0^1 s(y) e^{-i n 2\pi y} dy\\\\
&= \sum_{n = -\infty}^{\infty} \overline{f_n} s_n
\end{aligned}
\end{equation}
$$

由于\\(f_0 = \int_0^1 f(x) dx\\), Monte Carlo的误差分析可以转为如下形式.

$$
\begin{equation}
\left|\int_0^1 f(x) dx - \int_0^1 f(x) s(x) dx\right| = \left|f_0 - \sum_{n = -\infty}^{\infty} \overline{f_n} s_n\right| = \sum_{n = -\infty, n \ne 0}^{\infty} \overline{f_n} s_n
\end{equation}
$$

由于Fourier系数的正交性, 在实函数下方差即为二者PSD的乘积. 可以看出当二者的功率谱分布为负相关时可以取得最小的方差. 对于均匀分布采样或者白噪声采样, 此时Fourier系数为\\(\frac{1}{n}\\), 由此可得方差为\\(O(\frac{1}{n})\\). 同样的, 对于Possion圆盘采样进行Fourier分析后可以看出它的方差是劣于抖动采样的.

$$
\begin{equation}
\begin{aligned}
Var[\frac{1}{n} \sum_{i=1}^n f(x_i)]
&= (\sum_{n = -\infty, n \ne 0}^{\infty} \overline{f_n} s_n)^2\\\\
&= \sum_{n = -\infty, n \ne 0}^{\infty} \overline{f_n}^2 s_n^2\\\\
&= \sum_{n = -\infty, n \ne 0}^{\infty} P_f(n) P_s(n)
\end{aligned}
\end{equation}
$$

### 低差异性与准Monte Carlo

采样点的质量可以通过差异性来度量. 我们将固定数量的一些采样点称为采样点集, 由某种算法去生成的任意数量采样点被称为采样点序列. 通过比较每个采样点实际所占的体积与平均分配给每个点的体积可以评估这个采样序列的差异性.

令P为采样点集, \\(B\\)为\\([0,1]^d\\)的子集区域即\\([0, v_0] \times [0, v_1] \times \dots \times [0, v_d]\\), \\(b\\)为\\(B\\)这一集合中的某个元素, \\(V(b)\\)为\\(b\\)所占的体积, \\(\sharp{x_i \in b}\\)为落在\\(b\\)中的采样点的数量, \\(\sup\\)为上确界, 此时差异性可以按如下方式定义.

$$
\begin{equation}
D_n(B, P) = \sup_{b \in B} \left| \frac{\sharp{x_i \in b}}{n} - V(b) \right|
\end{equation}
$$

在一维上\\(x_i = \frac{i - \frac{1}{2}}{n}\\)可以获得最小的差异性. 对于大部分低差异性序列在高维下是具有更弱的均匀性的, 因此可以缓解出现前文所说的均匀采样带来的走样问题, 当然其固有的均匀性还是会使得它比伪随机序列更易产生走样. 低差异性序列所具有的差异性小于\\(O(\frac{(log\ n)^d}{n})\\)即可认为是低差异性序列.

低差异性序列通常通过确定的算法生成, 采用低差异性序列执行Monte Carlo即为准Monte Carlo(quasi-Monte Carlo, QMC). 根据Koksma-Hlawka不等式可以得到低差异性序列采样的误差上界, 其中\\(V_f\\)代表总变差. 随着维数增加, 差异性会趋向于\\(n^{-1}\\), 这使得QMC的误差小于MC的\\(n^{-\frac{1}{2}}\\), 尤其是样本较少的情况. 由于低差异性序列是确定的, 以方差作为度量手段是不适用的, 可以通过在不影响差异性的情况下对序列进行随机化来执行随机准Monte Carlo(randomized quasi-Monte Carlo, RQMC), 这会加速积分的收敛, 后面的部分会介绍.

$$
\begin{equation}
\begin{aligned}
\left| \int_0^1 f(x) dx - \frac{1}{n} \sum_{i = 1}^n f(x_i) \right| \le D_n(B, P) V_f\\\\
V_f = \sup_{0 = y_1 < y_2 < \dots < y_n = 1} \sum_{i=1}^{m} \|f(y_i) - f(y_{i + 1})\|
\end{aligned}
\end{equation}
$$

## 采样接口

`Sampler`的实现需要支持生成在任意维数上的任意数量的样本. 由于低差异性序列确定性的特征, 采样失败时可以快速定位到样本序号并调试, 当然分支代码可能导致运行时的样本编号是不同的, 需要尽量避免分支. 渲染任务只需要使用最高二维的样本, 因此没有提供相关接口, 更高维的样本可以通过组合低维样本实现.

```c++
class Sampler
    : public TaggedPointer<  // Sampler Types
          PMJ02BNSampler, IndependentSampler, StratifiedSampler, HaltonSampler,
          PaddedSobolSampler, SobolSampler, ZSobolSampler, MLTSampler, DebugMLTSampler

          > {
  public:
    // Sampler Interface
    using TaggedPointer::TaggedPointer;

    static Sampler Create(const std::string &name, const ParameterDictionary &parameters,
                          Point2i fullResolution, const FileLoc *loc, Allocator alloc);

    PBRT_CPU_GPU inline int SamplesPerPixel() const;

    PBRT_CPU_GPU inline void StartPixelSample(Point2i p, int sampleIndex,
                                              int dimension = 0);

    PBRT_CPU_GPU inline Float Get1D();
    PBRT_CPU_GPU inline Point2f Get2D();

    PBRT_CPU_GPU inline Point2f GetPixel2D();

    Sampler Clone(Allocator alloc = {});

    std::string ToString() const;
};
```

## 独立采样器

`IndependentSampler`用于生成伪随机样本, 可以在构造函数中设置随机数种子, 通常用于baseline来与其它采样器比较.

```c++
IndependentSampler(int samplesPerPixel, int seed = 0)
        : samplesPerPixel(samplesPerPixel), seed(seed) {}
```

在设置初始采样位置时`IndependentSampler`会根据像素位置, 样本序号与当前维度决定初始偏移. `rng`是`RNG`类型的成员变量, 即随机数生成器(random number generator).

```c++
void StartPixelSample(Point2i p, int sampleIndex, int dimension) {
    rng.SetSequence(Hash(p, seed));
    rng.Advance(sampleIndex * 65536ull + dimension);
}
```

## 分层采样器

`StratifiedSampler`负责分层抽样, 会在每层的中心点添加均匀分布的抖动, 如前文所述这会将走样转为噪声.

在高维下分层抽样会产生过多的样本, 例如包括镜头位置和时间时共有五个维度, 若分为四层则有\\(4^5 = 1024\\)个样本. 可以通过减少某些维度的层数来缓解这一问题, 同样这也会降低渲染质量. pbrt通过填充(padding)方法来解决这一问题, 即低维完整分层, 高层随机选择, 例如在像素位置与镜头位置上使用分层后的所有样本, 而时间则随机选择某一层的样本, 这可以较好的覆盖样本空间.

每个维度上的样本都需要进行混排(shuffle), 以避免不同维度相同序号的样本的相关性. 在pbrt中这通过随机化当前层的序号来实现, 通过向`PermutationElement`输入当前序号, 样本数以及随机种子来实现. 这里维度是递增的, 因此需要为每个样本序号都执行`StartPixelSample`来生成下一组采样点.

```c++
PBRT_CPU_GPU
Float Get1D() {
    // Compute _stratum_ index for current pixel and dimension
    uint64_t hash = Hash(pixel, dimension, seed);
    int stratum = PermutationElement(sampleIndex, SamplesPerPixel(), hash);

    ++dimension;
    Float delta = jitter ? rng.Uniform<Float>() : 0.5f;
    return (stratum + delta) / SamplesPerPixel();
}
```

分层采样器的差异性为\\(O(\frac{\sqrt{d log\ n}}{n^{\frac{1}{2} + \frac{1}{2d}}})\\), 不符合低差异性序列的要求.

## Halton采样器

`HaltonSampler`通过Halton低差异性序列来在各个维度上生成分布良好的采样点.

### Hammersley与Halton序列

Hammersley与Halton序列都通过基反演生成, 即将整数数转化为\\(b\\)进制后映射到小数位上. van der Corput序列即为一维上递增序号的基2反演, 差异性为\\(O(\frac{log\ n}{n})\\).

$$
\begin{equation}
\begin{aligned}
a &= \sum_{i=1}^{n} d_i(a) b^{i - 1}\\\\
\phi_b(a) &= \sum_{i=1}^{n} d_i(a) b{-i}
\end{aligned}
\end{equation}
$$

在每个维度上使用互质的基数即可得到Halton序列, 通常选用递增的质数, 差异性为\\(O(\frac{(log\ n)^d}{n})\\).

$$
\begin{equation}
x_a = (\phi_2(a), \phi_3(a), \phi_5(a),\dots, \phi_{p_d}(a))
\end{equation}
$$

若样本数是确定的, 可以使用Hammersley序列, 同样需要基数互质, Hammersley的差异性比Halton略小.

$$
\begin{equation}
x_a = (\frac{a}{n}, \phi_{b_1}(a), \phi_{b_2}(a), \dots, \phi_{b_{d-1}}(a))
\end{equation}
$$

pbrt通过`RadicalInverse`计算基反演, 同样也支持其逆过程.

```c++
// Low Discrepancy Inline Functions
PBRT_CPU_GPU inline Float RadicalInverse(int baseIndex, uint64_t a) {
    unsigned int base = Primes[baseIndex];
    // We have to stop once reversedDigits is >= limit since otherwise the
    // next digit of |a| may cause reversedDigits to overflow.
    uint64_t limit = ~0ull / base - base;
    Float invBase = (Float)1 / (Float)base, invBaseM = 1;
    uint64_t reversedDigits = 0;
    while (a && reversedDigits < limit) {
        // Extract least significant digit from _a_ and update _reversedDigits_
        uint64_t next = a / base;
        uint64_t digit = a - next * base;
        reversedDigits = reversedDigits * base + digit;
        invBaseM *= invBase;
        a = next;
    }
    return std::min(reversedDigits * invBaseM, OneMinusEpsilon);
}

PBRT_CPU_GPU inline uint64_t InverseRadicalInverse(uint64_t inverse, int base,
                                                   int nDigits) {
    uint64_t index = 0;
    for (int i = 0; i < nDigits; ++i) {
        uint64_t digit = inverse % base;
        inverse /= base;
        index = index * base + digit;
    }
    return index;
}
```

### 扰动随机化

确定性序列使得方差无法被估计, 且Halton序列在高维下会呈现一定的规则, 不利于收敛. 通过对采样点的每一位进行扰动可以解决这一问题, 这种情况下基反演之前的每一位都需要被考虑, 原本对于较小的数高位上的0是可以省略的, 且每一位都需要采用不同的扰动, 否则扰动前后的数仍然具有相似的特征.

pbrt通过`DigitPermutation`实现数位的扰动, 在构造函数中计算出需要的位数以及所有扰动结果, 为了节省空间采用`uint16_t`存储扰动结果. 若1减去当前位的最大值仍为1, 则后续位的计算已经小于最高精度, 不需要再计算. `pbrt`的`PermutationElement`采用伪随机.

```c++
DigitPermutation(int base, uint32_t seed, Allocator alloc) : base(base) {
    CHECK_LT(base, 65536);  // uint16_t
    // Compute number of digits needed for _base_
    nDigits = 0;
    Float invBase = (Float)1 / (Float)base, invBaseM = 1;
    while (1 - (base - 1) * invBaseM < 1) {
        ++nDigits;
        invBaseM *= invBase;
    }

    permutations = alloc.allocate_object<uint16_t>(nDigits * base);
    // Compute random permutations for all digits
    for (int digitIndex = 0; digitIndex < nDigits; ++digitIndex) {
        uint64_t dseed = Hash(base, digitIndex, seed);
        for (int digitValue = 0; digitValue < base; ++digitValue) {
            int index = digitIndex * base + digitValue;
            permutations[index] = PermutationElement(digitValue, base, dseed);
        }
    }
}
```

Owen扰动通过考虑当前处理的位之前的所有位上的数字来实现更优的扰动, 这通过将之前位的扰动结果加入到Hash中来实现.

```c++
PBRT_CPU_GPU inline Float OwenScrambledRadicalInverse(int baseIndex, uint64_t a,
                                                      uint32_t hash) {
    unsigned int base = Primes[baseIndex];
    // We have to stop once reversedDigits is >= limit since otherwise the
    // next digit of |a| may cause reversedDigits to overflow.
    uint64_t limit = ~0ull / base - base;
    Float invBase = (Float)1 / (Float)base, invBaseM = 1;
    uint64_t reversedDigits = 0;
    int digitIndex = 0;
    while (1 - invBaseM < 1 && reversedDigits < limit) {
        // Compute Owen-scrambled digit for _digitIndex_
        uint64_t next = a / base;
        int digitValue = a - next * base;
        uint32_t digitHash = MixBits(hash ^ reversedDigits);
        digitValue = PermutationElement(digitValue, base, digitHash);
        reversedDigits = reversedDigits * base + digitValue;
        invBaseM *= invBase;
        ++digitIndex;
        a = next;
    }
    return std::min(invBaseM * reversedDigits, OneMinusEpsilon);
}
```

### Halton采样器实现

Halton采样器会根据当前采样点编号的基反演结果的缩放取整确定其所位于的像素, 然后在对基反演结果进行扰动, 这使得相邻像素之间的样本不会相距过近. pbrt中缩放的最大值是128, 所以只保证图像某个区域内点不会过于集中, 同时也防止过大的缩放导致的浮点精度问题. 缩放值是基数的幂, 这使得缩放与位的左移保持一致.

```c++
HaltonSampler::HaltonSampler(int samplesPerPixel, Point2i fullRes,
                             RandomizeStrategy randomize, int seed, Allocator alloc)
    : samplesPerPixel(samplesPerPixel), randomize(randomize) {
    if (randomize == RandomizeStrategy::PermuteDigits)
        digitPermutations = ComputeRadicalInversePermutations(seed, alloc);
    // Find radical inverse base scales and exponents that cover sampling area
    for (int i = 0; i < 2; ++i) {
        int base = (i == 0) ? 2 : 3;
        int scale = 1, exp = 0;
        while (scale < std::min(fullRes[i], MaxHaltonResolution)) {
            scale *= base;
            ++exp;
        }
        baseScales[i] = scale;
        baseExponents[i] = exp;
    }

    // Compute multiplicative inverses for _baseScales_
    multInverse[0] = multiplicativeInverse(baseScales[1], baseScales[0]);
    multInverse[1] = multiplicativeInverse(baseScales[0], baseScales[1]);
}
```

可以通过计算像素的`InverseRadicalInverse`获取当前像素对应的采样点序号, 令计算结果为\\((x_r, y_r)\\), 二维Halton下\\((x, y)\\)上的缩放分别为\\((2^j, 3^k)\\), 只要序号i满足\\(x_r \equiv i \pmod {2^j}\\)和\\(y_r \equiv i \pmod {3^k}\\)即可, 这里构成了一个一元线性同余方程, 可以通过中国剩余定理求解. 此时可以实现`StartPixelSample`.

```c++
PBRT_CPU_GPU
void StartPixelSample(Point2i p, int sampleIndex, int dim) {
    haltonIndex = 0;
    int sampleStride = baseScales[0] * baseScales[1];
    // Compute Halton sample index for first sample in pixel _p_
    if (sampleStride > 1) {
        Point2i pm(Mod(p[0], MaxHaltonResolution), Mod(p[1], MaxHaltonResolution));
        for (int i = 0; i < 2; ++i) {
            uint64_t dimOffset =
                (i == 0) ? InverseRadicalInverse(pm[i], 2, baseExponents[i])
                            : InverseRadicalInverse(pm[i], 3, baseExponents[i]);
            haltonIndex +=
                dimOffset * (sampleStride / baseScales[i]) * multInverse[i];
        }
        haltonIndex %= sampleStride;
    }

    haltonIndex += sampleIndex * sampleStride;
    dimension = std::max(2, dim);
}
```

### 效果检验

Owen扰动后的Halton采样器的PSD与一维抖动采样的PSD类似, 低频接近0, 高频接近1. 未随机化的Halton采样器则在高频上具有较大的方差, 某些高频点的功率较大, 这会造成走样. 随机扰动的PSD则介于二者之间.

## Sobol'采样器

`HaltonSampler`需要用到除法来生成采样点, 在大部分处理器上这是最慢的操作. Sobol'序列完全通过基2反演生成, 在计算机上具有更高的效率. Sobol'将基反演的过程矩阵化, 若为单位矩阵则与基反演的结果是相同的.
$$
\begin{equation}
\begin{aligned}
x_a =
\begin{bmatrix}
b^{-1} & b^{-2} & \cdots & b^{-n}
\end{bmatrix}
\begin{bmatrix}
c_{1,1} & c_{1,2} & \cdots & c_{1,n}\\\\
c_{2,1} & \ddots & & c_{2,n}\\\\
\vdots & & \ddots & \vdots\\\\
c_{n,1} & \cdots & \cdots & c_{n,n}
\end{bmatrix}
\begin{bmatrix}
d_1(a)\\\\
d_2(a)\\\\
\vdots\\\\
d_n(a)
\end{bmatrix}
\end{aligned}
\end{equation}
$$

 本节中的Sobol‘序列\\(b=2\\),\\(n=32\\), 此时矩阵中每一项都为0或1, 每列可以用`uint32_t`来表示, 最终转换结果相当于把\\(a\\)为1的位对应的列相加, 这可以通过异或实现. 由于基反演的特性, 列在存储时会按照逆序存储. pbrt不讨论Sobol‘矩阵的生成.

```c++
PBRT_CPU_GPU inline uint32_t MultiplyGenerator(pstd::span<const uint32_t> C, uint32_t a) {
    uint32_t v = 0;
    for (int i = 0; a != 0; ++i, a >>= 1)
        if (a & 1)
            v ^= C[i];
    return v;
}
```

### 元素区间的分层

对于pbrt采用的前两个维度的Sobol'序列, 任意\\(2^{l_1 + l_2}\\)个采样点都分层分布在如下的区间中, 其中\\(a_i = 0,1,2,3,\dots,2^{l_i - 1}\\).

$$
\begin{equation}
E = \left\lbrace \left[ \frac{a_1}{2^{l_1}}, \frac{a_1 + 1}{2^{l_1}} \right), \left[ \frac{a_2}{2^{l_2}}, \frac{a_2 + 1}{2^{l_2}} \right) \right\rbrace
\end{equation}
$$

### 随机化与扰动

扰动过程同样可以采用二进制计算来加速, pbrt通过functor使用随机化类的对象.

最简单的`NoRandomizer`不做任何扰动.

```c++
struct NoRandomizer {
    uint32_t operator()(uint32_t v) const { return v; }
};
```

`BinaryPermuteScrambler`通过与某个整数异或实现扰动.

```c++
struct BinaryPermuteScrambler {
    BinaryPermuteScrambler(uint32_t perm) : permutation(perm) {}
    uint32_t operator()(uint32_t v) const { return permutation ^ v; }
    uint32_t permutation;
};
```

Sobol'同样可以采用二进制话的Owen扰动, pbrt中定义在`OwenScrambler`中, 翻转后的第\\(n - i\\)位是否反转由高\\(i - 1\\)位生成的随机数决定. 由于\\(n-1\\)位之前没有其它高位, pbrt通过种子的第一位来判断是否反转

```c++
struct OwenScrambler {
    PBRT_CPU_GPU
    OwenScrambler(uint32_t seed) : seed(seed) {}
    // OwenScrambler Public Methods
    PBRT_CPU_GPU
    uint32_t operator()(uint32_t v) const {
        if (seed & 1)
            v ^= 1u << 31;
        for (int b = 1; b < 32; ++b) {
            // Apply Owen scrambling to binary digit _b_ in _v_
            uint32_t mask = (~0u) << (32 - b);
            if ((uint32_t)MixBits((v & mask) ^ seed) & (1u << b))
                v ^= 1u << (31 - b);
        }
        return v;
    }

    uint32_t seed;
};
```

这一过程可以进一步二进制化, pbrt实现在`FastOwenSampler`中.

```c++
struct FastOwenScrambler {
    PBRT_CPU_GPU
    FastOwenScrambler(uint32_t seed) : seed(seed) {}
    // FastOwenScrambler Public Methods
    PBRT_CPU_GPU
    uint32_t operator()(uint32_t v) const {
        v = ReverseBits32(v);
        v ^= v * 0x3d20adea;
        v += seed;
        v *= (seed >> 16) | 1;
        v ^= v * 0x05526c56;
        v ^= v * 0x53a22864;
        return ReverseBits32(v);
    }

    uint32_t seed;
};
```

### 样本生成

由于随机类都实现了functor, 这里采用泛型.

```c++
template <typename R>
PBRT_CPU_GPU inline Float SobolSample(int64_t a, int dimension, R randomizer) {
    DCHECK_LT(dimension, NSobolDimensions);
    DCHECK(a >= 0 && a < (1ull << SobolMatrixSize));
    // Compute initial Sobol\+$'$ sample _v_ using generator matrices
    uint32_t v = 0;
    for (int i = dimension * SobolMatrixSize; a != 0; a >>= 1, i++)
        if (a & 1)
            v ^= SobolMatrices32[i];

    // Randomize Sobol\+$'$ sample and return floating-point value
    v = randomizer(v);
    return std::min(v * 0x1p-32f, FloatOneMinusEpsilon);
}
```

### 全局Sobol'采样器

`SobolSampler`的缩放通过可以覆盖屏幕的最小的2的幂来确定, 即长边的2底对数. 对高位与像素坐标相同的Sobol'变换结果执行逆变换即可得到样本序号, 这可以通过矩阵的逆变换实现, pbrt实现在`SobolIntervalToIndex`中(这里没有解释代码的原理, 没太看懂).

```c++
PBRT_CPU_GPU
inline uint64_t SobolIntervalToIndex(uint32_t m, uint64_t frame, Point2i p) {
    if (m == 0)
        return frame;

    const uint32_t m2 = m << 1;
    uint64_t index = uint64_t(frame) << m2;

    uint64_t delta = 0;
    for (int c = 0; frame; frame >>= 1, ++c)
        if (frame & 1)  // Add flipped column m + c + 1.
            delta ^= VdCSobolMatrices[m - 1][c];

    // flipped b
    uint64_t b = (((uint64_t)((uint32_t)p.x) << m) | ((uint32_t)p.y)) ^ delta;

    for (int c = 0; b; b >>= 1, ++c)
        if (b & 1)  // Add column 2 * m - c.
            index ^= VdCSobolMatricesInv[m - 1][c];

    return index;
}
```

### 填充Sobol'采样器

`SobolSampler`生成的多维样本在二维上的投影可能不具有良好的分布, `PaddedSobolSampler`通过混排Sobol'序列实现, 不会进行缩放等操作.

```c++
PBRT_CPU_GPU
Float Get1D() {
    // Get permuted index for current pixel sample
    uint64_t hash = Hash(pixel, dimension, seed);
    int index = PermutationElement(sampleIndex, samplesPerPixel, hash);

    int dim = dimension++;
    // Return randomized 1D van der Corput sample for dimension _dim_
    return SampleDimension(0, index, hash >> 32);
}
```

### 蓝噪声Sobol'采样器

`ZSobolSampler`是pbrt的默认采样器, 它会在`PaddedSobolSampler`的混排过程中遵循蓝噪声分布, 使得更多的误差分布在高频中. 这不会改变MSE, 但是对于人类视觉可以取得更优的效果.

相邻的二次幂个Sobol采样点具有良好的分层, 如果通过当前像素的Morton码决定使用的采样点序号, 那么在相邻像素上可以取得较优的分布. 直接采用Morton码会导致渲染误差呈现结构化特征, 可以通过对每4个相邻的Morton码进行混排来实现扰动. 对于像素内部的采样点, pbrt会左移像素对应的Morton码, 然后将低位设置为像素内部采样点的序号, 这使得内部序号也参与随机扰动的过程.

```c++
PBRT_CPU_GPU
void StartPixelSample(Point2i p, int index, int dim) {
    dimension = dim;
    mortonIndex = (EncodeMorton2(p.x, p.y) << log2SamplesPerPixel) | index;
}
```

pbrt对样本序号的扰动是每4个为一组的, 类似于Owen扰动这里会将已经生成的高位扰动结果添加到扰动过程中. 对于像素内部样本数量为2的幂而非4的幂的情况, 最后一位会单组作为一组来执行扰动, 此时只需要执行异或.

```c++
PBRT_CPU_GPU
uint64_t GetSampleIndex() const {
    // Define the full set of 4-way permutations in _permutations_
    static const uint8_t permutations[24][4] = {
        {0, 1, 2, 3},
        {0, 1, 3, 2},
        {0, 2, 1, 3},
        {0, 2, 3, 1},
        // Define remaining 20 4-way permutations
        {0, 3, 2, 1},
        {0, 3, 1, 2},
        {1, 0, 2, 3},
        {1, 0, 3, 2},
        {1, 2, 0, 3},
        {1, 2, 3, 0},
        {1, 3, 2, 0},
        {1, 3, 0, 2},
        {2, 1, 0, 3},
        {2, 1, 3, 0},
        {2, 0, 1, 3},
        {2, 0, 3, 1},
        {2, 3, 0, 1},
        {2, 3, 1, 0},
        {3, 1, 2, 0},
        {3, 1, 0, 2},
        {3, 2, 1, 0},
        {3, 2, 0, 1},
        {3, 0, 2, 1},
        {3, 0, 1, 2}

    };

    uint64_t sampleIndex = 0;
    // Apply random permutations to full base-4 digits
    bool pow2Samples = log2SamplesPerPixel & 1;
    int lastDigit = pow2Samples ? 1 : 0;
    for (int i = nBase4Digits - 1; i >= lastDigit; --i) {
        // Randomly permute $i$th base-4 digit in _mortonIndex_
        int digitShift = 2 * i - (pow2Samples ? 1 : 0);
        int digit = (mortonIndex >> digitShift) & 3;
        // Choose permutation _p_ to use for _digit_
        uint64_t higherDigits = mortonIndex >> (digitShift + 2);
        int p = (MixBits(higherDigits ^ (0x55555555u * dimension)) >> 24) % 24;

        digit = permutations[p][digit];
        sampleIndex |= uint64_t(digit) << digitShift;
    }

    // Handle power-of-2 (but not 4) sample count
    if (pow2Samples) {
        int digit = mortonIndex & 1;
        sampleIndex |=
            digit ^ (MixBits((mortonIndex >> 1) ^ (0x55555555u * dimension)) & 1);
    }

    return sampleIndex;
}
```

### 效果检验

Owen采样后的Sobol'采样器可以取得较好的PSD, 同时适合计算机执行的二进制操作也大大提高了采样效率.

## 图像重建

理想采样在实践中几乎是不可能的, 而在渲染任务中理想的\\(\text{sinc}\\)滤波器也会导致滤波结果的震荡, pbrt所实现的滤波器都致力于尽量减小误差.

### 滤波器接口

滤波器需要实现`Filter`接口. `Radius`返回滤波器的半径, 超过半径时权重为0, 滤波器在\\(x\\), \\(y\\)轴上的半径可能是不同的, 但都是关于原点对称的. `Evaluate`返回坐标点对应的权重. `Integral`返回当前半径下的积分值, 由于渲染具有归一化的过程, 这里不保证积分值为1. `Sample`用于实现重要性抽样, 返回均匀分布值对应的坐标以及权重与pdf的比值, 由于部分滤波器是可以作为概率分布直接采样的, 此时返回的比值为1.

```c++
class Filter : public TaggedPointer<BoxFilter, GaussianFilter, MitchellFilter,
                                    LanczosSincFilter, TriangleFilter> {
  public:
    // Filter Interface
    using TaggedPointer::TaggedPointer;

    static Filter Create(const std::string &name, const ParameterDictionary &parameters,
                         const FileLoc *loc, Allocator alloc);

    PBRT_CPU_GPU inline Vector2f Radius() const;

    PBRT_CPU_GPU inline Float Evaluate(Point2f p) const;

    PBRT_CPU_GPU inline Float Integral() const;

    PBRT_CPU_GPU inline FilterSample Sample(Point2f u) const;

    std::string ToString() const;
};
```

### 滤波器采样器

`FilterSampler`主要负责重要性抽样的细节, 不具有解析形式逆变换的滤波器会通过分段函数查表的形式采样, pbrt使用的采样率为每单位长度32个样本. 由于对称的特性, 只需要对第一象限进行采样即可.

```c++
FilterSampler::FilterSampler(Filter filter, Allocator alloc)
    : domain(Point2f(-filter.Radius()), Point2f(filter.Radius())),
      f(int(32 * filter.Radius().x), int(32 * filter.Radius().y), alloc),
      distrib(alloc) {
    // Tabularize unnormalized filter function in _f_
    for (int y = 0; y < f.YSize(); ++y)
        for (int x = 0; x < f.XSize(); ++x) {
            Point2f p =
                domain.Lerp(Point2f((x + 0.5f) / f.XSize(), (y + 0.5f) / f.YSize()));
            f(x, y) = filter.Evaluate(p);
        }

    // Compute sampling distribution for filter
    distrib = PiecewiseConstant2D(f, domain, alloc);
}
```

为了避免权重产生过大的方差, `FilterSampler`返回的权重是分段函数而非滤波函数本身的值与pdf的比值, 这使得比值为常数.

```c++
PBRT_CPU_GPU
FilterSample Sample(Point2f u) const {
    Float pdf;
    Point2i pi;
    Point2f p = distrib.Sample(u, &pdf, &pi);
    return FilterSample{p, f[pi] / pdf};
}
```

### 盒形滤波器

盒形滤波器对半径内的采样点都具有相同的权重, 在频域下会导致高频信息泄漏至低频, 导致走样. 盒形滤波器本身就是均匀分布, 因此`Sample`方法只需要对传入的均匀分布样本进行缩放.

```c++
PBRT_CPU_GPU
FilterSample Sample(Point2f u) const {
    Point2f p(Lerp(u[0], -radius.x, radius.x), Lerp(u[1], -radius.y, radius.y));
    return {p, Float(1)};
}
```

### 三角形滤波器

三角形滤波器的权重在坐标轴上是线性减小的, pbrt中将滤波器的斜率设置为1, 可以看出三角形滤波器是可分离的.

```c++
PBRT_CPU_GPU
Float Evaluate(Point2f p) const {
    return std::max<Float>(0, radius.x - std::abs(p.x)) *
           std::max<Float>(0, radius.y - std::abs(p.y));
}
```

由于可分离的特性在重要性抽样时可以在不同的轴上分别采样.

```c++
PBRT_CPU_GPU
FilterSample Sample(Point2f u) const {
    return {Point2f(SampleTent(u[0], radius.x), SampleTent(u[1], radius.y)),
            Float(1)};
}
```

### Gaussian滤波器

由于滤波器只在半径内不为0, pbrt会减去半径处对应的Gaussian函数的值, 这也使得一般的Gaussian分布重要性抽样无法被采样, 需要使用`FilterSampler`. Gaussian滤波器通常会导致边缘的模糊.

$$
\begin{equation}
\begin{aligned}
g(x,\mu,\sigma) &= \frac{1}{\sqrt{2\pi\sigma^2}}e^{-\frac{(x-\mu)^2}{2\sigma^2}}\\\\
f(x) &=
\begin{cases}
g(x,0,\sigma)-g(r,0,\sigma) &|x|<r\\\\
0 &\text{otherwise}
\end{cases}
\end{aligned}
\end{equation}
$$

### Mitchell滤波器

Mitchell滤波器致力于在振荡与模糊之间达成平衡, 这通过在滤波器中引入负值来实现, 负值部分较少会偏向模糊, 反之偏向振荡以及不合法的图像值. Mitchell滤波器的定义如下, 其中的参数\\(b\\)和\\(c\\)在原文中推荐保持\\(b+2c=1\\)的关系.

$$
\begin{equation}
\begin{aligned}
f(x) = \frac{1}{6}
\begin{cases}
(12-9b-6c)|x|^3\\\\
+(-18+12b+6c)|x|^2+(6-2b) &|x|<1\\\\
(-b-6c)|x|^3+(6b+30c)|x|^2\\\\
+(-12b-48c)|x|+(8b+24c) &1\le|x|<2\\\\
0 &\text{otherwise}
\end{cases}
\end{aligned}
\end{equation}
$$

pbrt中会依据设定的半径来缩放坐标值, 通过半径缩放后的Mitchell滤波器的积分具有良好的解析形式.

```c++
PBRT_CPU_GPU
Float Evaluate(Point2f p) const {
    return Mitchell1D(2 * p.x / radius.x) * Mitchell1D(2 * p.y / radius.y);
}

PBRT_CPU_GPU
Float Integral() const { return radius.x * radius.y / 4; }
```

### Lanczos滤波器

Lanczos滤波器基于\\(\text{sinc}\\)函数, 通过将\\(\text{sinc}\\)函数与一个周期缩放后的\\(text{sinc}\\)函数相乘并截断实现. 缩放后的\\(text{sinc}\\)函数被称为窗口函数, 因此该滤波也叫窗口化\\(\text{sinc}\\)滤波器. 与直接使用\\(\text{sinc}\\)相比Lanczos滤波器具有更少的振荡. Lanczos滤波器的积分较难求解, pbrt通过Riemann和来估计.

$$
\begin{equation}
\begin{aligned}
\text{sinc}(x) &= \frac{\sin(\pi x)}{\pi x}\\\\
w(x) &= \text{sinc}(\frac{x}{\tau})\\\\
f(x) &=
\begin{cases}
\text{sinc}(x)w(x) &|x|\le r\\\\
0 &\text{otherwise}
\end{cases}
\end{aligned}
\end{equation}
$$

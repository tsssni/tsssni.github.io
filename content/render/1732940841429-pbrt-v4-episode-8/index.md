---
title: "pbrt-v4 Ep. VIII: 图像重建"
date: 2024-11-30
draft: true
description: "pbrt-v4 episode 8"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

本章主要介绍采样理论与图像滤波, 利用图像处理技术可以有效降低渲染所需的样本量.

## 采样理论

### 频域与Fourier变换

样本空间通常位于空间中, 利用Fourier变换可以转换到频域中.

#### Fourier级数

对于一个函数集合中任意不同的函数\\(f(x),g(x)\\)若满足\\(\int_{-\infty}^{\infty} f(x)g(x) dx = 0\\), 则该集合被称为正交函数系. 根据Hilbert空间理论, 可以证明三角函数系\\(\lbrace\cos 0, \sin 0, \cos(\omega x), \sin(\omega x), \cos(2 \omega x), \sin(2 \omega x), ...\rbrace\\)为完备的正交函数系, 可以用于表示任意函数. 由此可以得到周期函数Fourier分解的一般形式.

$$
\begin{equation}
f(x) = \sum_{n = 0}^{\infty} \left(a_n \cos \frac{2\pi n x}{T} + b_n \sin \frac{2\pi n x}{T} \right)
\end{equation}
$$

各项系数可以基于正交理论得到并基于极坐标进一步转化以获取相位.

$$
\begin{equation}
\begin{aligned}
a_n &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) \cos\frac{2\pi n x}{T} dx &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} a_n \cos^2\frac{2\pi n x}{T} dx\\\\
b_n &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) \sin\frac{2\pi n x}{T} dx &= \frac{2}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} b_n \sin^2\frac{2\pi n x}{T} dx\\\\
\end{aligned}
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
f(x)
&= \sum_{n = 0}^{\infty} \left(c_n \cos\phi_n \cos \frac{2\pi n x}{T} + c_n\sin\phi_n \sin \frac{2\pi n x}{T} \right)\\\\
&= \sum_{n = 0}^{\infty} c_n \cos(n \omega_0 x + \phi_n)
\end{aligned}
\end{equation}
$$

基于Euler公式\\(e^{ix} = \cos x + i\sin x \\)可以进一步转换Fourier展开.

$$
\begin{equation}
\begin{aligned}
f(x)
&= \sum_{n=0}^{\infty} \left(a_n \frac{e^{i n \omega_0 x} + e^{-i n \omega_0 x}}{2} + b_n \frac{-i(e^{i n \omega_0 x} - e^{-i n \omega_0 x})}{2}\right)\\\\
&= \sum_{n=0}^{\infty} \frac{e^{i n \omega_0 x}(a_n - i b_n) + e^{-i n \omega_0 x}(a_n + i b_n)}{2}\\\\
&= \sum_{n=0}^{\infty} \frac{e^{i n \omega_0 x}(a_n - i b_n)}{2} + \sum_{n=-\infty}^{-1} \frac{e^{i n \omega_0 x}(a_{-n} + i b_{-n})}{2}\\\\
&= \sum_{n=-\infty}^{\infty} d_n e^{i n \omega_0 x}
\end{aligned}
\end{equation}
$$

对于分段系数\\(d_n\\)分别证明可以得到如下的结论.

$$
\begin{equation}
\begin{aligned}
d_{n \ge 0}
&= \frac{a_n - i b_n}{2}\\\\
&= \frac{1}{T}\int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) (\cos n \omega_0 x - i\sin n \omega_0 x) dx\\\\
&= \frac{1}{T}\int_{\frac{T}{2}}^{\frac{T}{2}} f(x) e^{-i n \omega_0 x} dx\\\\
d_{n < 0}
&= \frac{a_{-n} + i b_{-n}}{2}\\\\
&= \frac{1}{T}\int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) (\cos (-n \omega_0 x) + i\sin (-n \omega_0 x)) dx\\\\
&= \frac{1}{T}\int_0^{T} f(x) e^{-i n \omega_0 x} dx\\\\
d_n &= \frac{1}{T}\int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) e^{-i n \omega_0 x} dx
\end{aligned}
\end{equation}
$$

经整理得到较为常用的Fourier级数的形式.

$$
\begin{equation}
F_i(x) = \frac{1}{T} \int_{-\frac{T}{2}}^{\frac{T}{2}} f(x) e^{-i n \omega_0 x} dx
\end{equation}
$$

#### Fourier变换

Fourier级数针对周期函数, 对于非周期函数可以看作\\(T \to +\infty\\)的周期函数. 令\\(\omega_0 = 2\pi \omega\\), 此时各个余弦函数的频率\\(\frac{n}{T}\\)转化为连续变化的频率\\(\omega\\), \\(\frac{1}{T}\\)转化为无穷小\\(d\omega\\), 由此可得下式.

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

盒形滤波定义如下, 其Fourier变换结果为\\(\text{sinc} (T\omega)\\). 由滤波的Fourier变换可知, 若在空间上采用盒形滤波即求附近的样本的均值, 由于\\(\text{sin}\\)函数的范围是无限的, 在频域上会导致高频样本对滤波结果产生贡献. 同样的, 若在空间上使用高频\\(\text{sinc}\\)函数作为滤波, 在频域上可以获得最优的滤波结果, 但由于无限范围在空间上无法采用该滤波.

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

功率谱密度(power spectral density, PSD)可以用于频谱分析, 根据Wiener-Khinchin定义它可以通过自相关函数的Fourier变换计算, 整理后为Fourier变换结果与其共轭函数的乘积. 对于频域下的偶函数, 其共轭函数即为函数本身, 此时结果为函数的平方. 由卷积定理可得不同函数乘积的PSD为二者PSD的卷积.

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

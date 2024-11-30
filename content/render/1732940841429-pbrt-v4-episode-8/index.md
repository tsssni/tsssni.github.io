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
f(x) \otimes g(x) = \int_{-\infty}^{\infty} f(x)g(y-x) dx
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
&= (III_{\frac{1}{T}}(\omega) \otimes \mathcal{F} \lbrace f(x) \rbrace) \mathcal{F} \lbrace r(x) \rbrace
\end{aligned}
\end{equation}
$$

盒形滤波定义如下, 其Fourier变换结果为\\(\text{sinc} (T\omega)\\). 由滤波的Fourier变换可知, 若在空间上采用盒形滤波即求附近的样本的均值, 由于\\(\text{sin}\\)函数的定义域是无穷的, 在频域上会导致高频样本对滤波结果产生贡献.

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

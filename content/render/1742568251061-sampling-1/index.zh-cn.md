---
title: "Sampling I: Lambertian BSDF重要性抽样"
date: 2025-03-21
draft: false
description: "sampling"
tags: ["graphics", "rendering", "bsdf", "importance samping"]
---

{{<katex>}}

内容基本来自于pbrt-v4 Sampling Algorithms章节的Sampling Multidimensional Functions部分.

## 圆盘采样

对极坐标\\(r,\theta\\)分别做重要性抽样会导致样本集中在圆盘中央, 因为虽然距离圆心距离的分布是均匀的, 由于不同半径下周长不同, 外侧点的分布会减少.

为了保证样本点在面积上均匀分布, 需要满足\\(p(x,y)=\frac{1}{\pi}\\), 使用Jacobi转为极坐标后可得\\(p(r,\theta)=\frac{r}{\pi}\\). 此时可以计算出如下PDF.

$$
\begin{equation}
\begin{aligned}
p(r)&=\int_0^{2\pi}p(r,\theta)d\theta=2r\\\\
p(\theta|r)&=\frac{p(r,\theta)}{p(r)}=\frac{1}{2\pi}
\end{aligned}
\end{equation}
$$

根据重要性抽样得到的结果如下, 但此时根据Jacobian可得\\(drd\theta=\frac{\pi}{\sqrt{x}}dxdy\\), 由于不是线性关系, 均匀采样结果映射为圆盘采样结果时所占的面积并不均匀, 可以看出越靠近圆盘边缘所占面积越狭窄.

$$
\begin{equation}
\begin{aligned}
r&=\sqrt{\epsilon_1}\\\\
\theta&=2\pi\epsilon_2
\end{aligned}
\end{equation}
$$

Shirley-Chiu方法可以解决这一问题, 根据Cartesian轴及\\(y=x,y=-x\\)将\\([-1,1]\\)空间分为八个象限, 每个象限根据\\(\max(x,y\\))选出的轴是一致的, 长轴选取\\(a\\)点, 短轴选取\\(b\\)点, 需保证该\\(\frac{ab}{2}\\)面积的区域内的采样点在Cartesian及极坐标下所占面积成常数关系. 由于圆弧面积为\\(\frac{\theta r^2}{2}\\), 如下表达式可满足上述条件, 在极坐标中占的面积为\\(\frac{ab}{8\pi}\\), 看图片会更直观.


$$
\begin{equation}
\begin{aligned}
r&=
\begin{cases}
x & |x|>|y|\\\\
y & |x| \le |y|
\end{cases}\\\\
\theta&=
\begin{cases}
\frac{\pi}{4}\frac{y}{x} & |x| > |y|\\\\
\frac{\pi}{2} - \frac{x}{y} & |x| \le |y|
\end{cases}
\end{aligned}
\end{equation}
$$

此时Jacobian行列式满足如下关系, 因此\\(p(r,\theta)=|J|^{-1}p(u,v)=|J|^{-1}\frac{1}{4}=\frac{r}{\pi}\\).

$$
\begin{equation}
\begin{aligned}
|J|&=
\begin{cases}
\frac{\pi}{4x}=\frac{\pi}{4r} & |x|>|y|\\\\
\frac{\pi}{4y}=\frac{\pi}{4r} & |x|\le|y|
\end{cases}
\end{aligned}
\end{equation}
$$

## 余弦加权半球采样

渲染方程中有余弦项, 将它与BSDF一起做重要性抽样可以有效的考虑余弦的影响, 例如减小与法线夹角较大的光线被采样到的概率. 令\\(p(\omega)=c\cos\theta\\), 此时可以得到如下关系.

$$
\begin{equation}
\begin{aligned}
&\int_\Theta p(\omega)d\omega=1\\\\
&\int_0^{2\pi}\int_0^{\frac{\pi}{2}}c\cos\theta\sin\theta d\theta d\phi=1\\\
&c=\frac{1}{\pi}\\\\
&p(\theta,\phi)=\frac{1}{\pi}\cos\theta\sin\theta
\end{aligned}
\end{equation}
$$

Malley方法通过将均匀圆盘采样的结果投影到半球上实现重要性抽样. 由于此时\\(r=\sin\theta\\),将\\(r,\phi\\)转为\\(\theta,\phi\\)的Jacobian如下, 由此可得\\(p(\theta,\phi)=p(r,\phi)\cos\theta=\frac{\sin\theta\cos\theta}{\pi}\\), 满足重要性抽样的要求.


$$
\begin{equation}
\begin{aligned}
|J|=\begin{vmatrix}
\frac{\partial r}{\partial \theta} & \frac{\partial r}{\partial \phi}\\\\
\frac{\partial \phi}{\partial \theta} & \frac{\partial \phi}{\partial \phi}
\end{vmatrix}
=\begin{vmatrix}
\cos\theta & 0\\\\
0 & 1
\end{vmatrix}=\cos\theta
\end{aligned}
\end{equation}
$$

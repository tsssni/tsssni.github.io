---
title: "Interview III: SSGI"
date: 2026-06-15
draft: false
description: "interview"
tags: ["rendering", "graphics", "global illumination"]
---

## Virtual Position

ReBLUR计算镜面反射虚拟位置使用高斯球面镜成像公式解出像距/物距.

$$
\mathrm{mag} = \frac{1}{2 \cdot c \cdot O_z - 1}
$$

整体光路如下: 主光线从像素打到着色点$X=P$, 再沿反射方向走$\mathrm{hitDist}$命中物点$O$; 把表面当作曲面镜, 用$\mathrm{mag}$算出虚像$X_{virt}$, 沿视线方向摆放, 供时间重投影使用.

![reblur-path](reblur-path.svg)

下面把表面局部视为曲率为$c$的球面镜, 推导$\mathrm{mag}$.

设球面镜:

- 半径$R$, 曲率中心$C$, 命中点$P$
- 光轴为直线$CP$
- 轴上物点$O$, 物距$d_o = \overline{OP}$
- 像点$I$, 像距$d_i = \overline{IP}$

从物点$O$发出一条光线, 在镜面上高度为$h$的点$M$处发生反射, 反射光线交光轴于像点$I$. 球面上任意一点的法线都通过球心$C$, 因此$M$点处的法线方向为$\overrightarrow{MC}$.

![mirror-geometry](mirror-geometry.svg)

定义三个相对光轴的夹角:

$$
\alpha = \angle(OM,\ \text{axis}), \qquad
\beta  = \angle(MC,\ \text{axis}), \qquad
\gamma = \angle(MI,\ \text{axis}).
$$

在傍轴(paraxial)近似下, 角度很小且$h$很小, 有:

$$
\alpha \approx \frac{h}{d_o}, \qquad
\beta  \approx \frac{h}{R},   \qquad
\gamma \approx \frac{h}{d_i}.
$$

由反射定律和外角定理可得:

$$
\beta - \alpha = \gamma - \beta
\quad\Longrightarrow\quad
2\beta = \alpha + \gamma.
$$

代入傍轴近似:

$$
2 \cdot \frac{h}{R} = \frac{h}{d_o} + \frac{h}{d_i}.
$$

约去$h$得到Gaussian镜面方程, 可得焦距$f = \frac{R}{2}$:

$$
\frac{1}{d_o} + \frac{1}{d_i} = \frac{2}{R}
$$

记曲率$c = \dfrac{1}{R}$, 物距$d_o = O_z$. 由镜面方程解像距:

$$
\frac{1}{d_i}
= \frac{2}{R} - \frac{1}{d_o}
= 2c - \frac{1}{d_o}
= \frac{2c\,d_o - 1}{d_o},
$$

$$
d_i = \frac{d_o}{2c\,d_o - 1}.
$$

于是放大率即像距与物距之比为:

$$
\mathrm{mag}
= \frac{d_i}{d_o}
= \frac{1}{2 \cdot c \cdot O_z - 1}
$$

平面镜即$R \to \infty$, 亦即$c = 0$:

$$
\mathrm{mag} = \frac{1}{0 - 1} = -1.
$$

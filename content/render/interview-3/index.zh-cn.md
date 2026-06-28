---
title: "Interview III: 项目分析"
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

- 半径$R$, 曲率中心$C$, 顶点$P$, 焦点$F$($\overline{PF}=R/2$)
- 光轴为直线$CP$
- 轴外物点$O$, 物距$d_o = \overline{OP}$(沿轴), 物高$h_o$
- 像点$I$, 像距$d_i = \overline{IP}$, 像高$h_i$

从物点顶端发出两条特殊光线, 汇聚到像点$I$.

- 平行光线: 平行于光轴入射, 反射后过焦点$F$
- 主光线: 射向顶点$P$, $P$处法线即光轴

![mirror-geometry](mirror-geometry.svg)

由相似三角形可得:

$$
\frac{|h_i|}{h_o} = \frac{d_i}{d_o}.
$$

凹面镜像在负轴, 故倒立, 横向放大率为:

$$
m = \frac{h_i}{h_o} = -\frac{d_i}{d_o},
$$

傍轴近似认为镜面在位置上为平面, 以$F$为公共顶点的两个相似三角形给出

$$
\frac{h_o}{f} = \frac{|h_i|}{d_i - f}, \qquad f = \frac{R}{2},
$$

两式联立消去$|h_i|/h_o$:

$$
\frac{d_i}{d_o} = \frac{d_i - f}{f} = \frac{d_i}{f} - 1.
$$

两边同除$d_i$并整理, 得Gaussian镜面方程.

$$
\frac{1}{d_o} + \frac{1}{d_i} = \frac{1}{f} = \frac{2}{R}.
$$

记曲率$c = \dfrac{1}{R}$, 物距$d_o = O_z$, 解像距:

$$
\frac{1}{d_i}
= 2c - \frac{1}{d_o}
= \frac{2c\,d_o - 1}{d_o},
\qquad
d_i = \frac{d_o}{2c\,d_o - 1}.
$$

ReBLUR需要的是沿视线的像距与物距之比:

$$
\mathrm{mag}
= \frac{d_i}{d_o}
= \frac{1}{2 \cdot c \cdot O_z - 1},
$$

平面镜即$R \to \infty$, 亦即$c = 0$, 此时$d_i = -d_o$, 虚像在镜后.

$$
\mathrm{mag} = \frac{1}{0 - 1} = -1,
$$

## Ray Cone

光锥从像素以张角$\alpha$射出, 命中点距相机$t$时, cone在该点的宽度为:

$$
w_0 = 2t\tan\frac{\alpha}{2} \approx \alpha t.
$$

在曲面上反射时, 曲率会改变cone的张角. RT Gems用标量$\beta$建模: 平面 $\beta=0$ 张角不变, 凸面 $\beta>0$ 张角变大, 凹面 $\beta<0$ 张角变小.

![raycone-curve](raycone-curve.svg)

$\beta$由G-Buffer法线差分估计, 法线夹角增加$\phi/2$, 反射夹角增加$\phi$, 得到$\beta = 2\phi$.\
$s=\mathrm{sign}\left(\dfrac{\partial P}{\partial x}\cdot\dfrac{\partial \mathbf{n}}{\partial x}+\dfrac{\partial P}{\partial y}\cdot\dfrac{\partial \mathbf{n}}{\partial y}\right)$, 用于区分凸($+$)/凹($-$).

$$
\beta = 2\phi \approx 2s\left\|\frac{\partial \mathbf{n}}{\partial x}+\frac{\partial \mathbf{n}}{\partial y}\right\|,
$$


法线微分$\frac{\partial\mathbf{n}}{\partial x}$不必依赖G-Buffer, 可用光线微分计算. 设相机单位基为$\mathbf{x}$(右)、$\mathbf{y}$(上)、$\mathbf{z}$(前), 令$a$为宽高比, $f = \tan\frac{\mathrm{fov}}{2}$, $c_{x,y}$为NDC坐标, 非归一化方向$\mathbf{D}=c_x\,af\,\mathbf{x}+c_y\,f\,\mathbf{y}+\mathbf{z}$. 令分辨率为$w \times h$, 对像素坐标求微分:

$$
\bar{\mathbf{x}}=\frac{\partial\mathbf{D}}{\partial x}=\frac{2af}{w}\mathbf{x},\qquad
\bar{\mathbf{y}}=\frac{\partial\mathbf{D}}{\partial y}=\frac{2f}{h}\mathbf{y}.
$$

单位方向$\mathbf{d}=\frac{\mathbf{D}}{\lVert\mathbf{D}\rVert}$的微分使用归一化雅可比:

$$
\frac{\partial\mathbf{d}}{\partial x}=\frac{(\mathbf{D}\cdot\mathbf{D})\,\bar{\mathbf{x}}-(\mathbf{D}\cdot\bar{\mathbf{x}})\,\mathbf{D}}{(\mathbf{D}\cdot\mathbf{D})^{3/2}},
$$

命中点$P=O+t\,\mathbf{d}$, 针孔相机光线共原点, 因此$\frac{\partial O}{\partial x}=0$, 令$\mathbf{q}_x=t\frac{\partial\mathbf{d}}{\partial x}$. 令三角形边为$\mathbf{e}_1=P_1-P_0$, $\mathbf{e}_2=P_2-P_0$, 记

$$
\mathbf{c}_0=\mathbf{e}_2\times\mathbf{d},\quad
\mathbf{c}_1=\mathbf{d}\times\mathbf{e}_1,\quad
k=(\mathbf{e}_1\times\mathbf{e}_2)\cdot\mathbf{d},
$$

重心参数化得$P=P_0+b_0\mathbf{e}_1+b_1\mathbf{e}_2$, 它又等于光线式 $P=O+t\mathbf{d}$, 等式求微分:

$$
\frac{\partial b_0}{\partial x}\mathbf{e}_1+\frac{\partial b_1}{\partial x}\mathbf{e}_2=\mathbf{q}_x+\frac{\partial t}{\partial x}\mathbf{d}.
$$

两边点乘$\mathbf{c}_0$可用正交性消去$\frac{\partial b_1}{\partial x}$与$\frac{\partial t}{\partial x}$项, 点乘 $\mathbf{c}_1$ 同理, 再除以 $k$:

$$
\frac{\partial b_0}{\partial x}=\frac{\mathbf{c}_0\cdot\mathbf{q}_x}{k},\qquad
\frac{\partial b_1}{\partial x}=\frac{\mathbf{c}_1\cdot\mathbf{q}_x}{k}.
$$

对法线重心重新插值求微分:

$$
\frac{\partial\mathbf{n}}{\partial x}=\frac{\partial b_0}{\partial x}(\mathbf{n}_1-\mathbf{n}_0)+\frac{\partial b_1}{\partial x}(\mathbf{n}_2-\mathbf{n}_0),
$$

反射后张角累加$\beta$, 宽度随距离累加, 路径第$i$个命中点宽度为:

$$
\gamma_i = \gamma_{i-1} + \beta_{i-1},\qquad w_i = w_{i-1} + \gamma_i t_i,
$$

光锥近似成沿$\mathbf{d}$, 半径$\frac{w_i}{2}$的圆柱, 与法线为$\mathbf{n}$的三角形相交, 施密特正交化得椭圆轴$\mathbf{h}_1$, $\mathbf{h}_2$. 相似三角形把轴伸到圆柱面($k=1,2$), 在命中点$P$沿轴取$P+\mathbf{a}_1$、$P+\mathbf{a}_2$, 用重心坐标插值纹理坐标, 减去中心纹理坐标得梯度.

$$
\mathbf{a}_k = \frac{w_i/2}{\lVert \mathbf{h}_k-(\mathbf{d}\cdot\mathbf{h}_k)\mathbf{d}\rVert}\,\mathbf{h}_k.
$$

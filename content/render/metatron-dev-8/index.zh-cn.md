---
title: "Metatron Dev. IV: Path Guiding"
date: 2026-08-28
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "path guiding", "metatron"]
---

## ReSTIR PG

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

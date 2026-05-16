---
title: "De Rham Cohomology I"
date: 2026-05-10
draft: false
description: "from culculus to cohomology"
tags: ["maths", "differential geometry"]
---

## 集合

### 开集

$\mathbb{R}$的子集$U$称为**开集**, 如果它内部的每一点都能被一个完全落在$U$内的开区间包住:

$$\forall x \in U,\ \exists \varepsilon > 0,\ \text{使得}\ (x - \varepsilon,\ x + \varepsilon) \subseteq U$$

## 抽象代数

### 线性映射

设$V, W$是同一域$\mathbb{F}$上的向量空间. 映射$\varphi: V \to W$称为**线性映射**, 如果保持加法与数乘:

$$\varphi(c_1 v_1 + c_2 v_2) = c_1 \varphi(v_1) + c_2 \varphi(v_2),\quad \forall v_1, v_2 \in V,\ c_1, c_2 \in \mathbb{F}$$

### 同构

#### 同态

映射$\varphi: G \to H$称为**同态**(homomorphism), 如果保持运算:

$$\varphi(g_1 g_2) = \varphi(g_1) \varphi(g_2),\quad \forall g_1, g_2 \in G$$

由此自动得$\varphi(e_G) = e_H$, $\varphi(g^{-1}) = \varphi(g)^{-1}$.

#### 同构

同态$\varphi: G \to H$称为**同构**(isomorphism), 如果它是双射. 此时存在逆同态$\varphi^{-1}: H \to G$, 满足$\varphi^{-1} \circ \varphi = \operatorname{id}_G$, $\varphi \circ \varphi^{-1} = \operatorname{id}_H$. 记作$G \cong H$.

直观上, $G \cong H$意味着两个群作为代数结构**完全相同**, 仅元素的标签不同.

#### 示例

- $\mathbb{R}/\mathbb{Z} \cong S^1$: $[x] \mapsto e^{2\pi i x}$是同构
- $(\mathbb{R}, +) \cong (\mathbb{R}_{>0}, \cdot)$: $x \mapsto e^x$将加法变成乘法
- $\mathbb{Z}/6\mathbb{Z} \cong \mathbb{Z}/2\mathbb{Z} \times \mathbb{Z}/3\mathbb{Z}$(中国剩余定理)

### 商群

**商群**是把群$G$按某个**正规子群**$N$粘合得到的新群.

#### 正规子群

子群$N \leq G$称为**正规子群**, 记作$N \triangleleft G$, 如果:

$$gNg^{-1} = N,\quad \forall g \in G$$

等价地, 左陪集等于右陪集: $gN = Ng$. Abel群里每个子群自动正规, 此条件只在非交换群中非平凡.

#### 核与像

设$\varphi: G \to H$是群同态.

**核**是映射到$H$的单位元$e_H$的元素全体:

$$\operatorname{Ker}\varphi = \{g \in G : \varphi(g) = e_H\}$$

**像**是$\varphi$实际产出的元素全体:

$$\operatorname{Im}\varphi = \{\varphi(g) : g \in G\}$$

由同态条件易得$\operatorname{Ker}\varphi$是$G$的正规子群, $\operatorname{Im}\varphi$是$H$的子群.

#### 商群

元素$g \in G$对应陪集$gN$, 商群是所有陪集的集合:

$$G/N = \{gN : g \in G\}$$

群运算定义为:

$$(g_1 N) \cdot (g_2 N) = (g_1 g_2) N$$

**运算良定义要求$N$正规**: 设$g_1' = g_1 n_1$, $g_2' = g_2 n_2$, 则

$$g_1' g_2' = g_1 n_1 g_2 n_2 = g_1 g_2 \underbrace{(g_2^{-1} n_1 g_2)}_{\in N} n_2 \in g_1 g_2 N$$

需要$g_2^{-1} N g_2 \subseteq N$, 这正是正规性的来源.

#### 第一同构定理

群同态$\varphi: G \to H$满足:

$$G / \operatorname{Ker}\varphi \cong \operatorname{Im}\varphi$$

**证明**: 记$K = \operatorname{Ker}\varphi$, 定义

$$\overline\varphi: G/K \to \operatorname{Im}\varphi,\quad [g] \mapsto \varphi(g)$$

- **良定义**: $[g_1] = [g_2] \iff g_2 = g_1 k,\ k \in K \iff \varphi(g_1) = \varphi(g_2)$
- **同态**: $\overline\varphi([g_1][g_2]) = \varphi(g_1 g_2) = \varphi(g_1) \varphi(g_2) = \overline\varphi([g_1]) \overline\varphi([g_2])$
- **单射**: $\overline\varphi([g_1]) = \overline\varphi([g_2]) \Rightarrow \varphi(g_1) = \varphi(g_2) \Rightarrow [g_1] = [g_2]$
- **满射**: $h = \varphi(g) = \overline\varphi([g])$

故$\overline\varphi$是群同构.

#### 示例

- $\mathbb{Z}/n\mathbb{Z}$: 模$n$的整数加法群
- $\mathbb{R}/\mathbb{Z} \cong S^1$: 实数粘合整数, 得到圆周
- $\mathbb{R}/2\pi\mathbb{Z} \cong S^1$: 角度空间

### 商环

**商环**是把环$R$按某个**理想**$I$粘合得到的新环, 思想与商群一致, 但需要更强的子结构.

#### 理想

子集$I \subseteq R$称为(双边)**理想**, 如果:

1. $(I, +)$是$(R, +)$的子群
2. **吸收性**: $\forall r \in R,\ a \in I$, 有$ra \in I$且$ar \in I$

例如$n\mathbb{Z} = \{nk : k \in \mathbb{Z}\}$是$\mathbb{Z}$的理想; $(x) = \{x p(x) : p \in \mathbb{R}[x]\}$是$\mathbb{R}[x]$的理想.

#### 商环

商环是所有陪集的集合:

$$R/I = \{a + I : a \in R\}$$

加法和乘法定义为:

$$[a] + [b] = [a + b],\qquad [a] \cdot [b] = [ab]$$

**乘法良定义要求$I$是理想**: 设$a' = a + i$, $b' = b + j$, 则

$$a'b' = ab + \underbrace{aj + ib + ij}_{\in I}$$

#### 第一同构定理

环同态$\varphi: R \to S$满足:

$$R / \operatorname{Ker}\varphi \cong \operatorname{Im}\varphi$$

**证明**: 记$I = \operatorname{Ker}\varphi$, 它是$R$的理想, 定义

$$\overline\varphi: R/I \to \operatorname{Im}\varphi,\quad [a] \mapsto \varphi(a)$$

- **良定义**: $[a_1] = [a_2] \iff a_1 - a_2 \in I \iff \varphi(a_1) = \varphi(a_2)$
- **保加法**: $\overline\varphi([a_1] + [a_2]) = \varphi(a_1 + a_2) = \varphi(a_1) + \varphi(a_2)$
- **保乘法**: $\overline\varphi([a_1] [a_2]) = \varphi(a_1 a_2) = \varphi(a_1) \varphi(a_2)$
- **单射**: $\overline\varphi([a_1]) = \overline\varphi([a_2]) \Rightarrow \varphi(a_1) = \varphi(a_2) \Rightarrow [a_1] = [a_2]$
- **满射**: $h = \varphi(a) = \overline\varphi([a])$

故$\overline\varphi$是环同构.

#### 示例

- $\mathbb{Z}/n\mathbb{Z}$: 模$n$的整数环, 当$n$为素数时是域
- $\mathbb{R}[x]/(x^2 + 1) \cong \mathbb{C}$: 添加关系$x^2 = -1$, $[x]$扮演$i$
- $\mathbb{R}[x]/(x - a) \cong \mathbb{R}$: 对应"在$x = a$处求值"
- $C^\infty(U)/I_p \cong \mathbb{R}$, 其中$I_p = \{f : f(p) = 0\}$: 把函数代换成它在$p$处的值

## 微积分

设$U \subseteq \mathbb{R}^3$是开集.

### 梯度

光滑函数$f \in C^\infty(U)$的**梯度**(gradient)是向量场:

$$\operatorname{grad} f = \nabla f = \left(\frac{\partial f}{\partial x_1},\ \frac{\partial f}{\partial x_2},\ \frac{\partial f}{\partial x_3}\right)$$

### 散度

光滑向量场$F = (f_1, f_2, f_3) \in C^\infty(U, \mathbb{R}^3)$的**散度**(divergence)是标量函数:

$$\operatorname{div} F = \nabla \cdot F = \frac{\partial f_1}{\partial x_1} + \frac{\partial f_2}{\partial x_2} + \frac{\partial f_3}{\partial x_3}$$
### 旋度

光滑向量场$F = (f_1, f_2, f_3) \in C^\infty(U, \mathbb{R}^3)$的**旋度**:

$$\operatorname{rot} F = \nabla \times F = \left(\frac{\partial f_3}{\partial x_2} - \frac{\partial f_2}{\partial x_3},\ \frac{\partial f_1}{\partial x_3} - \frac{\partial f_3}{\partial x_1},\ \frac{\partial f_2}{\partial x_1} - \frac{\partial f_1}{\partial x_2}\right)$$

形式上写作行列式:

$$\operatorname{rot} F = \begin{vmatrix} \mathbf{e}_1 & \mathbf{e}_2 & \mathbf{e}_3 \\ \partial_1 & \partial_2 & \partial_3 \\ f_1 & f_2 & f_3 \end{vmatrix}$$

#### Stokes公式

设$\Sigma \subset \mathbb{R}^3$是带边光滑有向曲面, 单位法向量为$\mathbf{n}$, 边界$\partial\Sigma$按右手定则取向, 则对光滑向量场$F$有

$$\iint_\Sigma \operatorname{rot} F \cdot \mathbf{n}\ \mathrm{d}\sigma = \int_{\partial\Sigma} f_1 \mathrm{d}x_1 + f_2 \mathrm{d}x_2 + f_3 \mathrm{d}x_3$$

**证明**: 思路是先把$\Sigma$切成许多小曲面片, 在每片上验证公式, 再把所有片的等式拼成全局.

把$\Sigma$剖分为充分小的曲面片$\Sigma_1, \ldots, \Sigma_n$. 曲面积分天然可加, 公式左侧拆为

$$\iint_\Sigma \operatorname{rot} F \cdot \mathbf{n}\ \mathrm{d}\sigma = \sum_i \iint_{\Sigma_i} \operatorname{rot} F \cdot \mathbf{n}\ \mathrm{d}\sigma$$

若能在每片上验证局部 Stokes

$$\iint_{\Sigma_i} \operatorname{rot} F \cdot \mathbf{n}\ \mathrm{d}\sigma = \int_{\partial\Sigma_i} f_1 \mathrm{d}x_1 + f_2 \mathrm{d}x_2 + f_3 \mathrm{d}x_3$$

把所有片的等式相加, 右侧每条内部公共边(同时属于两片的边界)在$\partial\Sigma_i, \partial\Sigma_j$中各贡献一次、走向相反, 求和后相消; 不被任何其他片共享的外部边恰好拼成原边界$\partial\Sigma$. 于是问题归约为在每片上证局部 Stokes.

$$\sum_i \int_{\partial\Sigma_i} f_1 \mathrm{d}x_1 + f_2 \mathrm{d}x_2 + f_3 \mathrm{d}x_3 = \int_{\partial\Sigma} f_1 \mathrm{d}x_1 + f_2 \mathrm{d}x_2 + f_3 \mathrm{d}x_3$$

取小片充分细时, 每片可近似为其切平面内的小矩形, 误差为面积的高阶无穷小, 极限下可视为相等. 故只需在该小矩形上验证公式.

选取$T$使$T\mathbf{n} = \mathbf{e}_3$(这样的$T$总存在), 则原切平面被旋转到$x_3 = 0$平面, 小矩形落入其中. 故不失一般性, 可在此标准位置上验证.

设旋转后的小矩形为$R = [a, b] \times [c, d]$. 此时$\mathbf{n} = \mathbf{e}_3$, $\mathrm{d}\sigma = \mathrm{d}x_1 \mathrm{d}x_2$, $\mathrm{d}x_3 = 0$沿$\partial R$, 故只剩$f_1 \mathrm{d}x_1 + f_2 \mathrm{d}x_2$. 沿$\partial R$逆时针:

$$\int_{\partial R} f_1 \mathrm{d}x_1 + f_2 \mathrm{d}x_2 = \int_a^b \big[f_1(x_1, c) - f_1(x_1, d)\big] \mathrm{d}x_1 + \int_c^d \big[f_2(b, x_2) - f_2(a, x_2)\big] \mathrm{d}x_2$$

对每项用Newton-Leibniz公式:

$$= -\iint_R \frac{\partial f_1}{\partial x_2} \mathrm{d}x_1 \mathrm{d}x_2 + \iint_R \frac{\partial f_2}{\partial x_1} \mathrm{d}x_1 \mathrm{d}x_2 = \iint_R \left(\frac{\partial f_2}{\partial x_1} - \frac{\partial f_1}{\partial x_2}\right) \mathrm{d}\sigma$$

而$\operatorname{rot} F$的第三分量$\dfrac{\partial f_2}{\partial x_1} - \dfrac{\partial f_1}{\partial x_2} = \operatorname{rot} F \cdot \mathbf{e}_3$, 故等式成立.

## 上同调

### $U^\star \subseteq \mathbb{R}^2$

叉积展开为(对任意$\mathbf{x}$):

$$F(\mathbf{x}) \times \mathbf{x} = \big(f_2(\mathbf{x}) x_3 - f_3(\mathbf{x}) x_2,\ f_3(\mathbf{x}) x_1 - f_1(\mathbf{x}) x_3,\ f_1(\mathbf{x}) x_2 - f_2(\mathbf{x}) x_1\big)$$

$\operatorname{rot}$是对空间变量$\mathbf{x}$的偏导$\frac{\partial}{\partial x_j}$的组合, 而$\int_0^1 \cdots \mathrm{d}t$是对参数变量$t$的积分, 可交换次序:

$$\operatorname{rot} G(\mathbf{x}) = \operatorname{rot} \int_0^1 F(t\mathbf{x}) \times t\mathbf{x} \ \mathrm{d}t = \int_0^1 \operatorname{rot}\big(F(t\mathbf{x}) \times t\mathbf{x}\big) \ \mathrm{d}t$$

直接计算给出:

$$\operatorname{rot}\big(F(t\mathbf{x}) \times t\mathbf{x}\big) = \frac{\mathrm{d}}{\mathrm{d}t}\big(t^2 F(t\mathbf{x})\big)$$

以第一分量为例验证. 由链式法则, $f_i(t\mathbf{x})$对$x_j$求偏导等于对$tx_j$求偏导再乘以$t$: $\dfrac{\partial}{\partial x_j}\big[f_i(t\mathbf{x})\big] = t\dfrac{\partial f_i(t\mathbf{x})}{\partial (tx_j)}$. 由叉积展开, $F(t\mathbf{x}) \times t\mathbf{x}$的分量为$A_2 = t\big(f_3(t\mathbf{x}) x_1 - f_1(t\mathbf{x}) x_3\big)$, $A_3 = t\big(f_1(t\mathbf{x}) x_2 - f_2(t\mathbf{x}) x_1\big)$, 故

$$\frac{\partial A_3}{\partial x_2} = t\left[t\frac{\partial f_1(t\mathbf{x})}{\partial (tx_2)} x_2 + f_1(t\mathbf{x}) - t\frac{\partial f_2(t\mathbf{x})}{\partial (tx_2)} x_1\right]$$

$$\frac{\partial A_2}{\partial x_3} = t\left[t\frac{\partial f_3(t\mathbf{x})}{\partial (tx_3)} x_1 - t\frac{\partial f_1(t\mathbf{x})}{\partial (tx_3)} x_3 - f_1(t\mathbf{x})\right]$$

相减得$\operatorname{rot}$的第一分量

$$\frac{\partial A_3}{\partial x_2} - \frac{\partial A_2}{\partial x_3} = t\left[2f_1(t\mathbf{x}) + t\frac{\partial f_1(t\mathbf{x})}{\partial (tx_2)} x_2 + t\frac{\partial f_1(t\mathbf{x})}{\partial (tx_3)} x_3 - t\left(\frac{\partial f_2(t\mathbf{x})}{\partial (tx_2)} + \frac{\partial f_3(t\mathbf{x})}{\partial (tx_3)}\right) x_1\right]$$

由$\operatorname{div} F = 0$知$\dfrac{\partial f_2(t\mathbf{x})}{\partial (tx_2)} + \dfrac{\partial f_3(t\mathbf{x})}{\partial (tx_3)} = -\dfrac{\partial f_1(t\mathbf{x})}{\partial (tx_1)}$, 代入:

$$= 2t f_1(t\mathbf{x}) + t^2\left[\frac{\partial f_1(t\mathbf{x})}{\partial (tx_1)} x_1 + \frac{\partial f_1(t\mathbf{x})}{\partial (tx_2)} x_2 + \frac{\partial f_1(t\mathbf{x})}{\partial (tx_3)} x_3\right]$$

另一方面, 由链式法则$\dfrac{\mathrm{d}}{\mathrm{d}t} f_1(t\mathbf{x}) = \sum_j \dfrac{\partial f_1(t\mathbf{x})}{\partial (tx_j)} x_j$, 可得两式相等:

$$\frac{\mathrm{d}}{\mathrm{d}t}\big(t^2 f_1(t\mathbf{x})\big) = 2t f_1(t\mathbf{x}) + t^2 \sum_j \frac{\partial f_1(t\mathbf{x})}{\partial (tx_j)} x_j$$

代入可得:

$$\operatorname{rot} G(\mathbf{x}) = \int_0^1 \frac{\mathrm{d}}{\mathrm{d}t}\big(t^2 F(t\mathbf{x})\big) \ \mathrm{d}t = \Big[t^2 F(t\mathbf{x})\Big]_0^1 = 1^2 \cdot F(\mathbf{x}) - 0 = F(\mathbf{x})$$

故$F = \operatorname{rot} G \in \operatorname{Im}(\operatorname{rot})$. 由$F$任意, $\operatorname{Ker}(\operatorname{div}) \subseteq \operatorname{Im}(\operatorname{rot})$; 又$\operatorname{div} \circ \operatorname{rot} = 0$给出反向包含, 故$\operatorname{Ker}(\operatorname{div}) = \operatorname{Im}(\operatorname{rot})$, 即

$$H^2(U) = \operatorname{Ker}(\operatorname{div}) / \operatorname{Im}(\operatorname{rot}) = 0$$

### $\mathbb{R}^3 \setminus \{x_3 = 0,\ x_1^2 + x_2^2 \geq 1\}$

考虑$\mathbb{R}^3$中向量场, 易证$\operatorname{rot} F(\mathbf{x}) = 0$.

$$F(\mathbf{x}) = \left(\frac{-2x_1 x_3}{x_3^2 + (x_1^2+x_2^2-1)^2},\ \frac{-2x_2 x_3}{x_3^2 + (x_1^2+x_2^2-1)^2},\ \frac{x_1^2+x_2^2-1}{x_3^2 + (x_1^2+x_2^2-1)^2}\right)$$

定义集合$V$

$$V = \mathbb{R}^3 \setminus \{(x_1, x_2, x_3) : x_3 = 0,\ x_1^2 + x_2^2 \geq 1\}$$

引入辅助变量

$$u = x_1^2 + x_2^2 - 1, \qquad v = x_3$$

则$F$化为

$$F_1 = \frac{-2x_1 v}{u^2 + v^2},\quad F_2 = \frac{-2x_2 v}{u^2 + v^2},\quad F_3 = \frac{u}{u^2 + v^2}$$

设原函数形如$G = g(u, v)$, 由链式法则

$$\frac{\partial G}{\partial x_1} = 2x_1 \frac{\partial g}{\partial u},\quad \frac{\partial G}{\partial x_2} = 2x_2 \frac{\partial g}{\partial u},\quad \frac{\partial G}{\partial x_3} = \frac{\partial g}{\partial v}$$

与$F$比对得

$$\frac{\partial g}{\partial u} = -\frac{v}{u^2+v^2},\qquad \frac{\partial g}{\partial v} = \frac{u}{u^2+v^2}$$

根据链式法则

$$\frac{\mathrm{d}}{\mathrm{d}u}\arctan\frac{u}{v} = \frac{1}{v} \cdot \frac{1}{1+\left(\dfrac{u}{v}\right)^2} = \frac{v}{u^2+v^2}$$

对$u$积分(把$v$视为常数):

$$g(u, v) = \int -\frac{v}{u^2+v^2}\,\mathrm{d}u = -\arctan\frac{u}{v} + C(v)$$

对$v$求偏导匹配另一式:

$$\frac{\partial g}{\partial v} = -\frac{1}{1+\left(\dfrac{u}{v}\right)^2}\cdot\left(-\frac{u}{v^2}\right) + C'(v) = \frac{u}{u^2+v^2} + C'(v) = \frac{u}{u^2+v^2}$$

得$C'(v) = 0$, $C$为常数, 故$v \neq 0$处

$$g(u, v) = -\arctan\frac{u}{v} + C$$

该表达在$v = 0$时分母奇异, 不能取值. 但$V$包含整个开圆盘$\{x_3 = 0,\ x_1^2 + x_2^2 < 1\}$(对应$v = 0$), 例如原点$O$. 需要把$g$替换为在$v = 0$处也良定义的等价表达.

用极坐标定义$x_3 = 0$平面上的$u, v$, 把$\theta$定义为$(u, v)$与负$u$轴的夹角(逆时针为正), 取值范围$(-\pi, \pi]$, 即

$$-u = r\cos\theta, \qquad -v = r\sin\theta$$

把它们当作$(r, \theta)$对$(u, v)$的隐函数, 两边同时对$u$求偏导得

$$-1 = \frac{\partial r}{\partial u}\cos\theta - r\sin\theta\cdot\frac{\partial \theta}{\partial u},\qquad 0 = \frac{\partial r}{\partial u}\sin\theta + r\cos\theta\cdot\frac{\partial \theta}{\partial u}$$

两式分别乘$\sin\theta, \cos\theta$相减消去$\dfrac{\partial r}{\partial u}$:

$$-\sin\theta = -r(\sin^2\theta + \cos^2\theta)\frac{\partial \theta}{\partial u} = -r\frac{\partial \theta}{\partial u} \Rightarrow \frac{\partial \theta}{\partial u} = \frac{\sin\theta}{r} = -\frac{v}{u^2+v^2}$$

对$v$同样处理得$\dfrac{\partial \theta}{\partial v} = -\dfrac{\cos\theta}{r} = \dfrac{u}{u^2+v^2}$. 恰为$\dfrac{\partial g}{\partial u}, \dfrac{\partial g}{\partial v}$, 故$g$与$\theta$只有常数项不同.

$\theta$只在两处不连续: 夹角无意义的原点$(u, v) = (0, 0)$, 对应单位圆$S$, 已被$V$排除; 夹角在$\pi$与$-\pi$之间跳变的正$u$轴$\{u > 0, v = 0\}$, 对应$\{x_3 = 0,\ x_1^2 + x_2^2 > 1\}$, 同样被排除. 故$\theta$在$V$上光滑.

用$\operatorname{atan2}$实现$\theta$, 此时$g(u, v)$中$C = -\dfrac{\pi}{2}\operatorname{sgn}(v)$, 且$G(O) = \operatorname{atan2}(0, 1) = 0$.

$$G(\mathbf{x}) = \operatorname{atan2}\big(-x_3,\ 1 - x_1^2 - x_2^2\big)$$

---
title: "「From Calculus to Cohomology」 I"
date: 2026-05-10
draft: false
description: "from culculus to cohomology"
tags: ["maths", "differential geometry"]
---

{{<katex>}}

## 开集

\\(\mathbb{R}\\)的子集\\(U\\)称为**开集**, 如果它内部的每一点都能被一个完全落在\\(U\\)内的开区间包住:

$$\forall x \in U,\ \exists \varepsilon > 0,\ \text{使得}\ (x - \varepsilon,\ x + \varepsilon) \subseteq U$$

## 线性映射

设\\(V, W\\)是同一域\\(\mathbb{F}\\)上的向量空间. 映射\\(\varphi: V \to W\\)称为**线性映射**, 如果保持加法与数乘:

$$\varphi(c_1 v_1 + c_2 v_2) = c_1 \varphi(v_1) + c_2 \varphi(v_2),\quad \forall v_1, v_2 \in V,\ c_1, c_2 \in \mathbb{F}$$

## 同构

### 同态

映射\\(\varphi: G \to H\\)称为**同态** (homomorphism), 如果保持运算:

$$\varphi(g_1 g_2) = \varphi(g_1) \varphi(g_2),\quad \forall g_1, g_2 \in G$$

由此自动得\\(\varphi(e_G) = e_H\\), \\(\varphi(g^{-1}) = \varphi(g)^{-1}\\).

### 同构

同态\\(\varphi: G \to H\\)称为**同构** (isomorphism), 如果它是双射. 此时存在逆同态\\(\varphi^{-1}: H \to G\\), 满足\\(\varphi^{-1} \circ \varphi = \operatorname{id}_G\\), \\(\varphi \circ \varphi^{-1} = \operatorname{id}_H\\). 记作\\(G \cong H\\).

直观上, \\(G \cong H\\)意味着两个群作为代数结构**完全相同**, 仅元素的标签不同.

### 示例

- \\(\mathbb{R}/\mathbb{Z} \cong S^1\\): \\([x] \mapsto e^{2\pi i x}\\)是同构
- \\((\mathbb{R}, +) \cong (\mathbb{R}_{>0}, \cdot)\\): \\(x \mapsto e^x\\)将加法变成乘法
- \\(\mathbb{Z}/6\mathbb{Z} \cong \mathbb{Z}/2\mathbb{Z} \times \mathbb{Z}/3\mathbb{Z}\\) (中国剩余定理)

## 商群

**商群**是把群\\(G\\)按某个**正规子群**\\(N\\)粘合得到的新群.

### 正规子群

子群\\(N \leq G\\)称为**正规子群**, 记作\\(N \triangleleft G\\), 如果:

$$gNg^{-1} = N,\quad \forall g \in G$$

等价地, 左陪集等于右陪集: \\(gN = Ng\\). Abel 群里每个子群自动正规, 此条件只在非交换群中非平凡.

### 核与像

设\\(\varphi: G \to H\\)是群同态.

**核**是映射到\\(H\\)的单位元\\(e_H\\)的元素全体:

$$\operatorname{Ker}\varphi = \\{g \in G : \varphi(g) = e_H\\}$$

**像**是\\(\varphi\\)实际产出的元素全体:

$$\operatorname{Im}\varphi = \\{\varphi(g) : g \in G\\}$$

由同态条件易得\\(\operatorname{Ker}\varphi\\)是\\(G\\)的正规子群, \\(\operatorname{Im}\varphi\\)是\\(H\\)的子群.

### 商群

元素\\(g \in G\\)对应陪集\\(gN\\), 商群是所有陪集的集合:

$$G/N = \\{gN : g \in G\\}$$

群运算定义为:

$$(g_1 N) \cdot (g_2 N) = (g_1 g_2) N$$

**运算良定义要求\\(N\\)正规**: 设\\(g_1' = g_1 n_1\\), \\(g_2' = g_2 n_2\\), 则

$$g_1' g_2' = g_1 n_1 g_2 n_2 = g_1 g_2 \underbrace{(g_2^{-1} n_1 g_2)}_{\in N} n_2 \in g_1 g_2 N$$

需要\\(g_2^{-1} N g_2 \subseteq N\\), 这正是正规性的来源.

### 第一同构定理

群同态\\(\varphi: G \to H\\)满足:

$$G / \operatorname{Ker}\varphi \cong \operatorname{Im}\varphi$$

**证明**: 记\\(K = \operatorname{Ker}\varphi\\), 定义

$$\overline\varphi: G/K \to \operatorname{Im}\varphi,\quad [g] \mapsto \varphi(g)$$

- **良定义**: \\([g_1] = [g_2] \iff g_2 = g_1 k,\ k \in K \iff \varphi(g_1) = \varphi(g_2)\\)
- **同态**: \\(\overline\varphi([g_1][g_2]) = \varphi(g_1 g_2) = \varphi(g_1) \varphi(g_2) = \overline\varphi([g_1]) \overline\varphi([g_2])\\)
- **单射**: \\(\overline\varphi([g_1]) = \overline\varphi([g_2]) \Rightarrow \varphi(g_1) = \varphi(g_2) \Rightarrow [g_1] = [g_2]\\)
- **满射**: \\(h = \varphi(g) = \overline\varphi([g])\\)

故\\(\overline\varphi\\)是群同构.

### 示例

- \\(\mathbb{Z}/n\mathbb{Z}\\): 模\\(n\\)的整数加法群
- \\(\mathbb{R}/\mathbb{Z} \cong S^1\\): 实数粘合整数, 得到圆周
- \\(\mathbb{R}/2\pi\mathbb{Z} \cong S^1\\): 角度空间

## 商环

**商环**是把环\\(R\\)按某个**理想**\\(I\\)粘合得到的新环, 思想与商群一致, 但需要更强的子结构.

### 理想

子集\\(I \subseteq R\\)称为 (双边) **理想**, 如果:

1. \\((I, +)\\)是\\((R, +)\\)的子群
2. **吸收性**: \\(\forall r \in R,\ a \in I\\), 有\\(ra \in I\\)且\\(ar \in I\\)

例如\\(n\mathbb{Z} = \\{nk : k \in \mathbb{Z}\\}\\)是\\(\mathbb{Z}\\)的理想; \\((x) = \\{x p(x) : p \in \mathbb{R}[x]\\}\\)是\\(\mathbb{R}[x]\\)的理想.

### 商环

商环是所有陪集的集合:

$$R/I = \\{a + I : a \in R\\}$$

加法和乘法定义为:

$$[a] + [b] = [a + b],\qquad [a] \cdot [b] = [ab]$$

**乘法良定义要求\\(I\\)是理想**: 设\\(a' = a + i\\), \\(b' = b + j\\), 则

$$a'b' = ab + \underbrace{aj + ib + ij}_{\in I}$$

### 第一同构定理

环同态\\(\varphi: R \to S\\)满足:

$$R / \operatorname{Ker}\varphi \cong \operatorname{Im}\varphi$$

**证明**: 记\\(I = \operatorname{Ker}\varphi\\), 它是\\(R\\)的理想, 定义

$$\overline\varphi: R/I \to \operatorname{Im}\varphi,\quad [a] \mapsto \varphi(a)$$

- **良定义**: \\([a_1] = [a_2] \iff a_1 - a_2 \in I \iff \varphi(a_1) = \varphi(a_2)\\)
- **保加法**: \\(\overline\varphi([a_1] + [a_2]) = \varphi(a_1 + a_2) = \varphi(a_1) + \varphi(a_2)\\)
- **保乘法**: \\(\overline\varphi([a_1] [a_2]) = \varphi(a_1 a_2) = \varphi(a_1) \varphi(a_2)\\)
- **单射**: \\(\overline\varphi([a_1]) = \overline\varphi([a_2]) \Rightarrow \varphi(a_1) = \varphi(a_2) \Rightarrow [a_1] = [a_2]\\)
- **满射**: \\(h = \varphi(a) = \overline\varphi([a])\\)

故\\(\overline\varphi\\)是环同构.

### 示例

- \\(\mathbb{Z}/n\mathbb{Z}\\): 模\\(n\\)的整数环, 当\\(n\\)为素数时是域
- \\(\mathbb{R}[x]/(x^2 + 1) \cong \mathbb{C}\\): 添加关系\\(x^2 = -1\\), \\([x]\\)扮演\\(i\\)
- \\(\mathbb{R}[x]/(x - a) \cong \mathbb{R}\\): 对应"在\\(x = a\\)处求值"
- \\(C^\infty(U)/I_p \cong \mathbb{R}\\), 其中\\(I_p = \\{f : f(p) = 0\\}\\): 把函数代换成它在\\(p\\)处的值

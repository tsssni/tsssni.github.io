---
title: "Metatron Dev. IV: ReSTIR"
date: 2025-05-17
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "restir", "metatron"]
---

{{<katex>}}

图片与部分证明来自[Understanding The Math Behind ReSTIR DI](https://agraphicsguynotes.com/posts/understanding_the_math_behind_restir_di/)

## 重采样重要性抽样

令\\(x_i\\)的目标分布为\\(\hat{p_i}(X)\\), 它可能难以抽样, 为每个样本选择容易抽样的提议分布\\(p_i(X)\\), 每个样本的目标与提议分布都可以不同, 选出\\(M\\)个样本组成序列\\(\bold{x}\\), 设置MIS权重\\(m_i(x_i)\\)且\\(p_i(x_i)=0\\)时\\(m_i(x_i)=0\\), 设置样本权重\\(w_i(x_i)=\frac{m_i(x_i)\hat{p_i}(x_i)}{p_i(x_i)}\\), 随机选择样本\\(x_z\\)概率如下.

$$
\begin{equation}
\begin{aligned}
p(z|\bold{x})
&=\frac{w_z(x_z)}{\sum_{i=1}^M w_i(x_i)}
\end{aligned}
\end{equation}
$$

RIS Monte Carlo无偏证明如下, \\(y\\)为RIS选择的样本, \\(p'\\)为RIS选中的概率, 可见\\(\sum\_{k=1}^Mm_i(x)=1\\)时无偏.

$$
\begin{equation}
\begin{aligned}
E(\frac{1}{N}\sum_{i=1}^N\frac{f(y_i)}{\hat{p_i}(y_i)}\sum_{j=1}^Mw_{ij}(x_{ij}))
&=\frac{1}{N}\sum_{i=1}^NE(\frac{f(y)}{\hat{p_i}(y)}\sum_{j=1}^Mw_{ij}(x_j))\\\\
&=E(\frac{f(y)}{\hat{p_k}(y)}w_{\text{sum}}^k)\\\\
&=\sum_{k=1}^M\int\cdots\int\frac{f(x_k)}{\hat{p}\_k(x_k)}w_{\text{sum}}^kp'(x_k)dx_1 \cdots dx_M\\\\
&=\sum_{k=1}^M\int\cdots\int\frac{f(x_k)}{\hat{p}\_k(x_k)}w_{\text{sum}}^km_k(x_k)\frac{w_k(x_k)}{w_{\text{sum}}^k}\prod_{i=1}^Mp_i(x_i)dx_1 \cdots dx_M\\\\
&=\sum_{k=1}^M\int\cdots\int f(x_k)m_k(x_k)\prod_{i=1,i \neq k}^Mp_i(x_i)dx_1 \cdots dx_M\\\\
&=\sum_{k=1}^M\int f(x_k)m_k(x_k)dx_k\underbrace{\int\cdots\int\prod_{i=1,i \neq k}^Mp_i(x_i)\underbrace{dx_1 \cdots dx_M}_{\text{M - 1, except k}}}\_{1}\\\\
&=\int \sum\_{k=1}^Mm_k(x)f(x)dx\\\\
\end{aligned}
\end{equation}
$$

## 蓄水池抽样

蓄水池抽样只保留一个样本, 样本保留的概率是当前样本的权重与所有已知样本权重和的比值. 蓄水池抽样更新过程如下. 保留新样本, 概率值为\\(\frac{w_i}{W}\\); 保留旧样本, 概率值为\\(\frac{w_j}{W'}\frac{W - w_i}{W}=\frac{w_j}{W'}\frac{W'}{W}=\frac{w_j}{W}\\). 可见概率值一定会更新为权重与已知权重和的比值.

```
Reservoir s, Sample sp, Weight w
s.W += w;
if u < w / s.W then
    s.y = sp;
```

若要合并多个蓄水池, 将每个蓄水池的权重和作为合并权重, 将蓄水池本身作为样本, 对多个蓄水池执行蓄水池抽样过程即可, 此时被选中的蓄水池中的样本的概率更新为\\(\frac{w_i}{W_j}\frac{W_j}{\sum_{k=1}^n W_k}=\frac{w_i}{\sum_{k=1}^n W_k}\\), 仍然满足要求.

## 时空复用

假设所有样本提议分布相同, 则\\(m(y)=\frac{1}{M}\\), 使得\\(w_{\text{sum}}=\hat{p}(y)WM\\), 得到有偏结果.

```
Reservoir s
for r in {r1, ..., rk} do
    s.update(r.y, p_hat(r.y) * r.W * r.M)
s.M = s1.M + s2.M + ... + sk.M
```

无偏需保证\\(p_k(y) = 0\\)时\\(m_k(y)=0\\), 由重采样过程可知\\(\hat{p_k}(y)=0\\)时\\(p_k(y)=0\\). 若目标分布设置为光照贡献, 可用阴影测试验证\\(p_k(y) > 0\\).

```
for qi in {q1, ..., qk} do
    if p_hat_qi(s.y) > 0 then
        Z += ri.M
m = 1 / Z
```

![restir](ReSTIR.png)

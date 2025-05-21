---
title: "Metatron Dev. IV: ReSTIR"
date: 2025-05-17
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "restir", "metatron"]
---

{{<katex>}}

## 重采样重要性抽样

令\\(x\\)的目标概率分布为\\(\hat{p}(x)\\), 它可能难以被重要性抽样. 我们选择一个容易抽样的分布\\(p(X)\\), 选出\\(M\\)个样本组成序列\\(\bold{x}\\), 然后将每个样本的权重设置为\\(w(x)=\frac{\hat{p}(x)}{p(x)}\\), 随机选择其中一个样本\\(x_z\\), 此时概率如下.

$$
\begin{equation}
\begin{aligned}
p(z|\bold{x})
&=\frac{w(x_z)}{\sum_{i=1}^M w(x_i)}
\end{aligned}
\end{equation}
$$

根据条件概率公式可得如下关系, 其中\\(p(y)\\)为最终得到的采样到\\(y=x_z\\)的概率, \\(p(x_z\in\bold{x})\\)为抽样到的\\(\bold{x}\\)中包含\\(x_z\\)的概率.

$$
\begin{equation}
\begin{aligned}
p(z|\bold{x})
&=\frac{p(y)}{p(x_z \in \bold{x})}
\end{aligned}
\end{equation}
$$

由于\\(\bold{x}\\)共采样\\(M\\)次, 每个样本都有\\(p(x_z)\\)的概率采样到\\(x_z\\), 因此\\(p(x_z\in\bold{x})=Mp(x_z)\\). 此时可以得到\\(p(y)\\), 形式如下.

$$
\begin{equation}
\begin{aligned}
p(y)
&=p(z|x)p(x_z\in\bold{x})\\\\
&=\frac{w(x_z)}{\sum_{i=1}^Mw(x_i)}Mp(x_z)\\\\
&=\frac{M\hat{p}(x_z)}{\sum_{i=1}^M\frac{\hat{p}(x_i)}{p(x_i)}}
\end{aligned}
\end{equation}
$$

当\\(M\to\infty\\), 任意\\(x\\)一定在\\(\bold{x}\\)中, 即\\(p(x \in \bold{x})=1\\), \\(p(x)=\frac{1}{M}\\). 代入上式可以证明无偏, 令样本空间为\\(\Omega\\), 证明如下.

$$
\begin{equation}
\begin{aligned}
p(y)
&=\frac{M\hat{p}(x_z)}{M\sum_{i=1}^M\hat{p}(x_i)}\\\\
&=\frac{\hat{p}(x_z)}{\int_\Omega\hat{p}(x)dx}\\\\
&=\hat{p}(x_z)
\end{aligned}
\end{equation}
$$

此时\\(N\\)个样本, \\(M\\)个备选样本下的Monte Carlo形式如下.

$$
\begin{equation}
\begin{aligned}
F_n=\frac{1}{N}\sum_{i=1}^N\frac{f(X_i)}{\hat{p}(X_i)}\left(\frac{1}{M}\sum_{i=1}^M\frac{\hat{p}(X_i)}{p(X_i)}\right)
\end{aligned}
\end{equation}
$$

### 有偏RIS

ReSTIR由于时空复用, 需要每个样本采用不同的采样概率\\(p_i(x)\\), 此时令\\(w_i(x)=\frac{\hat{p}(x)}{p_i(x)}\\), 选中\\(\bold{x}\\)且选择\\(x_z\\)的概率如下.

$$
\begin{equation}
\begin{aligned}
p(\bold{x},z)=p(\bold{x})p(z|\bold{x})=\prod_{i=1}^Mp_i(x_i)\frac{w_z(x_z)}{\sum_{i=1}^Mw_i(x_i)}
\end{aligned}
\end{equation}
$$

定义集合\\(Z(y)=\\{i|1 \le i \le M \land p_i(y)>0\\}\\), 令\\(p(\bold{x}^{i \to y}, i)\\)代表\\(\bold{x}\\)的第\\(i\\)个元素为\\(y\\)且被选中的概率, 此时\\(p(y)\\)如下.

$$
\begin{equation}
\begin{aligned}
p(y)=\sum_{i \in Z(y)}\int\cdots\int p(\bold{x}^{i \to y}, i)\underbrace{dx_1 \dots dx_M}\_{\text{M-1, excpet }x_i}
\end{aligned}
\end{equation}
$$

我们需要保证RIS使用的概率权重\\(W(\bold{x},z)=\frac{1}{\hat{p}(x_z)}\left(\frac{1}{M}\sum_{i=1}^Mw_i(x_i)\right)\\)的期望为\\(\frac{1}{p(y)}\\), 以使得Monte Carlo无偏. 此时权重为\\(W(\bold{x}^{i \to y}, i)\\)的概率为\\(\frac{p(\bold{x}^{i \to y}, i)}{p(y)}\\), 期望证明过程如下. 若RIS序列任意样本的采样概率在y处不为0, \\(|Z(y)|=M\\), 期望成立, 否则会有能量损失.

$$
\begin{equation}
\begin{aligned}
\underset{x_z=y}{E}[W(\bold{x}, z)]
&=\sum_{i \in Z(y)}\int\cdots\int W(\bold{x}^{i \to y}, i)\frac{p(\bold{x}^{i \to y}, i)}{p(y)}dx_1 \dots dx_M\\\\
&=\sum_{i \in Z(y)}\frac{1}{p(y)}\int\cdots\int\frac{1}{M\hat{p}(x_i)}\sum_{j=1}^Mw_j(x_j)\frac{w_i(x_i)}{\sum_{i=j}^Mw_j(x_j)}\prod_{j=1}^Mp_j(x_j)dx_1 \dots dx_M\\\\
&=\frac{1}{Mp(y)}\sum_{i \in Z(y)}\underbrace{\frac{p_i(x_i)w_i(x_i)}{\hat{p}(x_i)}}\_{1}\underbrace{\int\cdots\int\prod_{j=1}^Mp_j(x_j)dx_1 \dots dx_M}_{1}\\\\
&=\frac{|Z(y)|}{Mp(y)}
\end{aligned}
\end{equation}
$$

### 无偏RIS

将\\(\frac{1}{M}\\)替换为\\(m(x_i)\\), 此时期望为\\(\frac{1}{p(y)}\sum_{i \in Z(y)}m(x_i)\\), 构造合适的\\(m(x)\\)使得\\(\sum_{i \in Z(y)}=1\\)即可. 需要注意的是, 这里并没有保证\\(p(y)=\hat{p}(y)\\), 这里只保证Monte Carlo无偏.

通过使用均匀分布可以达到无偏, 即测试\\(y\\)处概率分布不为\\(0\\)的样本数量, 但如果某个样本的概率分布接近\\(0\\)这会提高方差. 若采用MIS则形式如下, 这使得概率值较大处权重提高, 避免方差过大.

$$
\begin{equation}
\begin{aligned}
m(x_z)=\frac{p_z(x_z)}{\sum_{i=1}^M p_i(x_z)}
\end{aligned}
\end{equation}
$$

## 蓄水池抽样

蓄水池抽样只保留一个样本, 样本保留的概率是当前样本的权重与所有已知样本权重和的比值. 蓄水池抽样更新过程如下. 保留新样本, 概率值为\\(\frac{w_i}{W}\\); 保留旧样本, 概率值为\\(\frac{w_j}{W'}\frac{W - w_i}{W}=\frac{w_j}{W'}\frac{W'}{W}=\frac{w_j}{W}\\). 可见概率值一定会更新为权重与已知权重和的比值.

```c++
reservoir_sum += w;
if (sampler.generate_1d() < w / reservoir_sum) {
    reservoir_sample = sample;
    reservoir_w = w;
}
```

若要合并多个蓄水池, 将每个蓄水池的权重和作为合并权重, 将蓄水池本身作为样本, 对多个蓄水池执行蓄水池抽样过程即可, 此时被选中的蓄水池中的样本的概率更新为\\(\frac{w_i}{W_j}\frac{W_j}{\sum_{k=1}^n W_k}=\frac{w_i}{\sum_{k=1}^n W_k}\\), 仍然满足要求.

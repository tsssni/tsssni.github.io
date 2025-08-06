---
title: "pbrt-v4 Ep. XIV: 光线传播: 体渲染"
date: 2025-01-21
draft: false
description: "pbrt-v4 episode 14"
tags: ["graphics", "rendering", "pbrt"]
---

{{< katex >}}

## 辐射转移方程

LTE忽略了介质, 而辐射转移方程(radiative transfer equation, RTE)会考虑介质, 因此也被叫做体积光线传播方程(volumetric light transport equation). RTE通常为积分微分方程, 因为外散射过程涉及到积分. 令\\(p'=p+t\omega\\), 其余符号见之前章节, 此时RTE形式如下.

$$
\begin{equation}
\frac{\partial L_o(p',\omega)}{\partial t} = -\sigma_t(p',\omega)L_i(p',-\omega)+\sigma_t(p',\omega)L_s(p',\omega)
\end{equation}
$$

对于\\(L_i(p,\omega)\\), 它的变化是体渲染的逆过程, 等式右侧需要乘上\\(-1\\), 解积分方程可得如下结果.

$$
\begin{equation}
L_i(p',\omega)=\frac{-\int_0^{t} T_r(p'' \to p)\sigma_t(p'',\omega)L_s(p'',-\omega)dt'+C}{T_r(p' \to p)}
\end{equation}
$$

若第一个散射点位于\\(t_s\\), 该处可以是由表面BSDF表示的散射, 也可以是介质相位方程表示的散射. 由于\\(L_i(p_s, \omega)=L_o(p_s,-\omega)\\), 此时得到如下结果.

$$
\begin{equation}
L_i(p',\omega)=\frac{-\int_0^t T_r(p'' \to p)\sigma_t(p'',\omega)L_s(p'',-\omega)dt'+L_o(p_s,-\omega)T_r(p_s \to p)+\int_0^{t_s} T_r(p'' \to p)\sigma_t(p'',\omega)L_s(p'',-\omega)dt'}{T_r(p' \to p)}
\end{equation}
$$

根据上式可得\\(L_i(p,\omega)\\), 若光路上没有任何交点, 则无穷远处辐亮度为0, 只剩下积分项.

$$
\begin{equation}
L_i(p,\omega)=L_o(p_s, -\omega)T_r(p_s \to p)+\int_0^{t_s} \sigma_t(p',\omega)T_r(p' \to p)L_s(p',-\omega)dt
\end{equation}
$$

### 空散射扩展

Monte Carlo需要根据与\\(L_i(p,\omega)\\)中积分项相似的分布来提高采样效率, 异质介质的\\(\sigma_t(p)\\)是复杂的分布不利于从分布中采样. 如果在一定范围内添加空散射\\(\sigma_n(p)\\)构造同质介质\\(\sigma_{\text{maj}}(p)\\), 即将\\(\sigma_t(p)\\)转为常数或分段常数\\(\sigma_{\text{maj}}(p)\\), 可以有效提高渲染效率. 在RTE右侧添加\\(-\sigma_n(p)L_i(p,\omega)+\sigma_n(p)L_i(p,\omega)\\)可得如下结果, 此时衰减过程使用\\(\sigma_{\text{maj}}(p)\\), 光线传播过程中在自发光与散射之外也会在任意\\(\sigma_n(p)\\)不为0处发生空散射.

$$
\begin{equation}
\begin{aligned}
\frac{\partial L_i(p',\omega)}{\partial t} 
&=\sigma_{\text{maj}}(p')L_i(p',\omega)-\sigma_{\text{maj}}(p')L_n(p',-\omega)\\\\
&=(\sigma_a(p',\omega)+\sigma_s(p',\omega)+\sigma_n(p',\omega))L_i(p',\omega)-\sigma_a(p',\omega)L_e(p,-\omega)-\sigma_s(p',\omega)\int_\Theta p(p',\omega_i,-\omega)L_i(p',\omega_i)d\omega_i-\sigma_n(p',\omega)L_i(p',\omega)
\end{aligned}
\end{equation}
$$

此时可以得到相交点为\\(p_s\\)时在\\(p\\)处的\\(L_i(p,\omega)\\).

$$
\begin{equation}
L_i(p,\omega)=L_o(p_s,-\omega)T_{\text{maj}}(p_s \to p)+\int_0^{t_s} \sigma_{\text{maj}}(p')T_{\text{maj}}(p' \to p)L_n(p',-\omega)dt
\end{equation}
$$

### 采样主透射率

pbrt中`Medium`是\\(\sigma_{\text{maj}}\\)的分段函数, 积分可以按如下方式表示. 此时可以执行递归采样, 首先采样\\(T_{\text{maj}}^1\\), 若得到的\\(t'_1<t_1\\)则采样第一项, 采样结果为\\(\frac{\sigma\_{\text{maj}}^1 T\_{\text{maj}}^1(p \to p')f(p')}{p_1(t'_1)}=f(p')\\), 若\\(t'_1>t_2\\)则采样第二项, 采样结果为\\(\frac{T\_{\text{maj}}^1(p \to p_1)\sigma\_{\text{maj}}^2 T\_{\text{maj}}^2(p \to p')f(p')}{P(t'_1 > t_1)p_1(t'_1)}=f(p')\\), 如此一直递归, 可以看出采样结果始终为\\(f(p')\\).

$$
\begin{equation}
\begin{aligned}
&\int_0^t \sigma_{\text{maj}}(p')T_{\text{maj}}(p \to p')f(p')dt'\\\\
&=\sigma_{\text{maj}}^1\int_0^{t_1}T_{\text{maj}}^1(p \to p')f(p')dt'\\\\
&+T_{\text{maj}}^1(p \to p_1)\sigma_{\text{maj}}^2 \int_{t_1}^{t_2}T_{\text{maj}}^2(p_1 \to p')f(p')dt'\\\\
&+T_{\text{maj}}^1(p \to p_1)T_{\text{maj}}^2(p_1 \to p_2)\sigma_{\text{maj}}^3 \int_{t_2}^{t_3}T_{\text{maj}}^3(p_2 \to p')f(p')dt'\\\\
&+ \cdots
\end{aligned}
\end{equation}
$$

pbrt通过在`SampleT_maj`中实现采样RTE中的积分项, 上式中的\\(f\\)对应\\(L_n\\). pbrt会根据概率选择\\(L_n\\)的三项, 这会在`callback`中实现. 选择\\(\sigma_a\\)或\\(\sigma_s\\)项会完成本次采样, 而由于\\(\sigma_n\\)项包含\\(L_i\\), pbrt会继续递归计算\\(L_i\\), 在`SampleT_maj`中表现为不退出循环.

```c++
template <typename ConcreteMedium, typename F>
PBRT_CPU_GPU SampledSpectrum SampleT_maj(Ray ray, Float tMax, Float u, RNG &rng,
                                         const SampledWavelengths &lambda, F callback) {
    // Normalize ray direction and update _tMax_ accordingly
    tMax *= Length(ray.d);
    ray.d = Normalize(ray.d);

    // Initialize _MajorantIterator_ for ray majorant sampling
    ConcreteMedium *medium = ray.medium.Cast<ConcreteMedium>();
    typename ConcreteMedium::MajorantIterator iter = medium->SampleRay(ray, tMax, lambda);

    // Generate ray majorant samples until termination
    SampledSpectrum T_maj(1.f);
    bool done = false;
    while (!done) {
        // Get next majorant segment from iterator and sample it
        pstd::optional<RayMajorantSegment> seg = iter.Next();
        if (!seg)
            return T_maj;
        // Handle zero-valued majorant for current segment
        if (seg->sigma_maj[0] == 0) {
            Float dt = seg->tMax - seg->tMin;
            // Handle infinite _dt_ for ray majorant segment
            if (IsInf(dt))
                dt = std::numeric_limits<Float>::max();

            T_maj *= FastExp(-dt * seg->sigma_maj);
            continue;
        }

        // Generate samples along current majorant segment
        Float tMin = seg->tMin;
        while (true) {
            // Try to generate sample along current majorant segment
            Float t = tMin + SampleExponential(u, seg->sigma_maj[0]);
            PBRT_DBG("Sampled t = %f from tMin %f u %f sigma_maj[0] %f\n", t, tMin, u,
                     seg->sigma_maj[0]);
            u = rng.Uniform<Float>();
            if (t < seg->tMax) {
                // Call callback function for sample within segment
                PBRT_DBG("t < seg->tMax\n");
                T_maj *= FastExp(-(t - tMin) * seg->sigma_maj);
                MediumProperties mp = medium->SamplePoint(ray(t), lambda);
                if (!callback(ray(t), mp, seg->sigma_maj, T_maj)) {
                    // Returning out of doubly-nested while loop is not as good perf. wise
                    // on the GPU vs using "done" here.
                    done = true;
                    break;
                }
                T_maj = SampledSpectrum(1.f);
                tMin = t;

            } else {
                // Handle sample past end of majorant segment
                Float dt = seg->tMax - tMin;
                // Handle infinite _dt_ for ray majorant segment
                if (IsInf(dt))
                    dt = std::numeric_limits<Float>::max();

                T_maj *= FastExp(-dt * seg->sigma_maj);
                PBRT_DBG("Past end, added dt %f * maj[0] %f\n", dt, seg->sigma_maj[0]);
                break;
            }
        }
    }
    return SampledSpectrum(1.f);
}
```

### 泛化路径空间

这里主要参考[Light transport on path-space manifolds](https://www.mitsuba-renderer.org/~wenzel/papers/phdthesis.pdf)第三章和[A null-scattering path integral formulation of light transport](https://cs.dartmouth.edu/~wjarosz/publications/miller19null.pdf), 证明涉及到泛函分析, 本人水平不够, 这里只讨论证明结果.

令\\(A\\)为表面空间, \\(V\\)为体积空间, \\(V_\emptyset\\)为空散射空间, 此时路径空间定义如下.

$$
\begin{equation}
P=\bigcup_{n=1}^{\infty}(A \cup V \cup V_\emptyset)^{n}
\end{equation}
$$

对于长度为\\(n\\)的路径, 其微分项如下.

$$
\begin{equation}
\begin{aligned}
d\bar{p}_n&=\prod\_{i=1}^n dp_i\\\\
dp_i&=
\begin{cases}
dA(p\_i) & p\_i \in A\\\\
dV(p\_i) & p\_i \in V\\\\
dV\_\emptyset(p\_i) & p\_i \in V\_\emptyset
\end{cases}
\end{aligned}
\end{equation}
$$

立体角与表面积微分的转换之前介绍过, 由于引入了空间中的介质, 我们需要立体角与体积微分的转换关系. 将体积积分视为在一个不断扩张的球上积分, 球表面积微分与立体角转换关系为\\(d\omega=\frac{dA}{t^2}\\), 通过Fubini定理可以得到体积微分.

$$
\begin{equation}
\begin{aligned}
&\int_\Theta\int_0^\infty f(p')V(p \leftrightarrow p') dt d\omega\\\\
=&\int_0^\infty \frac{1}{t^2}\int_\Theta f(p')V(p \leftrightarrow p') dA(p') dt\\\\
=&\int_V \frac{V(p \leftrightarrow p')}{\Vert p - p' \Vert^2} f(p') dV(p')
\end{aligned}
\end{equation}
$$

对于空散射体积空间, 由于不发生散射以改变光路, 空散射顶点必须位于相邻的实散射顶点形成的边上, 此时通过Dirac delta分布表示.

$$
\begin{equation}
dV_\emptyset(p_i)=d\delta_{p_i^{r-} \leftrightarrow p_i^{r+}}(p_i)
\end{equation}
$$

可以看出体积微分与表面积微分相比缺失了余弦项, 同时不难看出只有某个位于表面时, 其上的余弦项才会被考虑, 此时可以定义泛化几何方程. 空散射由于不改变光路不需要求解几何方程.

$$
\begin{equation}
\begin{aligned}
\hat{G}(p \leftrightarrow p')&=V(p \leftrightarrow p')\frac{D(p,p')D(p',p)}{\Vert p-p' \Vert^2}\\\\
D(x, y)&=
\begin{cases}
|n_x \cdot \frac{x-y}{\Vert x-y \Vert}| & p \in A\\\\
1 & p \in V
\end{cases}
\end{aligned}
\end{equation}
$$

在介质中同样可以发生散射, 这由相位方程和散射率决定, 因此需要定义泛化的BSDF, 其中\\(\chi+\\)为Heaviside函数, 参数为正时为1否则为0, 对于空散射这始终为1, 用于限制空散射顶点位于边上.

$$
\begin{equation}
\begin{aligned}
\hat{f}(p_{i+1} \to p_i \to p_{i-1})=
\begin{cases}
f(p_{i+1} \to p_i \to p_{i-1}) & p_i \in A\\\\
\sigma_s(p_i)p(p_{i+1} \to p_i \to p_{i-1}) & p_i \in V\\\\
\sigma_n(p_i)\chi^+((p_i-p_{i-1})(p_{i+1}-p_i)) & p_i \in V_\emptyset
\end{cases}
\end{aligned}
\end{equation}
$$

此时可以得到泛化路径通量, 其中\\(m\\)为实散射顶点数量, \\(r_i\\)为实散射点, 透射率求和从0开始是因为\\(p_0\\)已知.

$$
\begin{equation}
\hat{T}(\bar{p}_n)=\prod\_{i=1}^{n-1}\hat{f}(p\_{i+1} \to p_i \to p\_{i-1})\prod\_{i=0}^{n-1}T_r(p\_{i+1} \to p_i)\prod\_{i=1}^{m-1}\hat{G}(r\_{i+1} \leftrightarrow r_i)
\end{equation}
$$

自发光亮度同样具有泛化形式, 空散射顶点不会发光.

$$
\begin{equation}
\begin{aligned}
\hat{L_e}(p_n \to p_{n-1})=
\begin{cases}
L_e(p_n \to p_{n-1}) & p_i \in A\\\\
\sigma_a(p_n)L_e(p_n \to p_{n-1}) & p_i \in V
\end{cases}
\end{aligned}
\end{equation}
$$

\\(p_0\\)为相机, 所有长度为\\(n+1\\)的路径如下.

$$
\begin{equation}
\hat{P}(\bar{p}_n)=\int\_{P\_{n}}\hat{L\_e}(p\_n \to p\_{n-1})\hat{T}(\bar{p}_n)d\bar{p}\_{n}
\end{equation}
$$

此时Monte Carlo结果如下, 同时可以定义辐射通量权重\\(\beta(\bar{p}_n)\\).

$$
\begin{equation}
\begin{aligned}
\hat{P}(\bar{p}_n)
&=\hat{L\_e}(p\_n \to p\_{n-1})\beta(\bar{p}_n)\\\\
&=\frac{\hat{L\_e}(p\_n \to p\_{n-1})\hat{T}(\bar{p}_n)}{p(\bar{p}_n)}
\end{aligned}
\end{equation}
$$

### 求解路径空间积分

令\\(p_\text{maj}(p_{i+1}|p_i,\omega_i)\\)为从\\(p_i\\)在\\(\omega_i\\)方向上采样到\\(p_{i+1}\\)的概率, \\(p_e(p_i)\\)为在\\(p_i\\)选择吸收, 实散射或空散射的概率, 概率分别为\\(\frac{\sigma_{\\{a,s,n\\}}(p_i)}{\sigma_{\text{maj}}(p_i)}\\), \\(p_\omega(\omega_{i+1}|r_i)\\)为实散射入射方向为\\(\omega_{i+1}\\)的概率, \\(G\\)用于抵消微分转换. 场景中没有表面散射时Monte Carlo结果如下, 根据之前的结论可以看出部分项可以抵消, 同时由于只有\\(p_n\\)为光源, 当且仅当在\\(p_n\\)选择吸收.

$$
\begin{equation}
\begin{aligned}
\hat{P}(\bar{p}\_n)
&=\frac{\hat{T}(\bar{p}\_n)\hat{L}\_e(p_n \to p_{n-1})}{\prod_{i=0}^{n-1}p_{\text{maj}}(p_{i+1}|p_i,\omega_i)\prod_{i=1}^{n}p_e(p_i)\prod_{i=1}^{m-1}p_\omega(\omega_{i+1}|r_i)\hat{G}(r_i \leftrightarrow r_{i+1})}\\\\
&=\frac{\hat{L}\_e(p_n \to p_{n-1})\prod_{i=1}^{n-1}\hat{f}(p_{i+1} \to p_i \to p_{i-1})}{\prod_{i=0}^{n-1}\sigma_{\text{maj}}(p_{i+1})\prod_{i=1}^{n}p_e(p_i)\prod_{i=1}^{m-1}p_\omega(\omega_{i+1}|r_i)}\\\\
&=\frac{\hat{L}\_e(p_n \to p_{n-1})\prod_{i=1}^{n-1}\hat{f}(p_{i+1} \to p_i \to p_{i-1})}{\sigma_{a}(p_n)\prod_{i=1}^{n-1}\sigma_{\\{s,n\\}}(p_i)\prod_{i=1}^{m-1}p_\omega(\omega_{i+1}|r_i)}
\end{aligned}
\end{equation}
$$

若场景中没有表面散射, 此时\\(\hat{f}\\)和\\(\hat{L}_e\\)都是确定的, 可以进一步简化.

$$
\begin{equation}
\hat{P}(\bar{p}\_n)=\prod_{i=1}^{m-1}\frac{p(r_{i+1} \to r_i \to r_{i-1})}{p_\omega(\omega_{i+1}|r_i)}L\_e(p\_n \to p\_{n-1})
\end{equation}
$$

## 体散射积分器


### 简单体积积分器

`SimpleVolPathIntegrator`不支持光源采样与表面散射, 即只用来渲染体积效果. 该类的成员只有`maxDepth`, 表示路径顶点数.

```c++
class SimpleVolPathIntegrator : public RayIntegrator {
  public:
    // SimpleVolPathIntegrator Public Methods
    // ...

  private:
    // SimpleVolPathIntegrator Private Members
    int maxDepth;
};
```

`Li`执行路径追踪, 与`PathIntegrator`的积分过程类似. 由于体数据可能随波长变化, `Li`只保留一个波长样本以简化计算.

`Li`首先计算光线求交, 因为场景中仍然会有一些几何物体, 例如用于表示介质分界的几何形状, 或者不进行散射的面积光源. 此时可以获取光线传播的最大距离, 体渲染样本不会超过这个范围.

`Li`通过`SampleT_maj`获取体渲染样本并执行差值跟踪, 在回调函数中首先选取介质事件, 根据吸收率, 散射率与空散射率进行概率选择.

```c++
// Compute medium event probabilities for interaction
Float pAbsorb = mp.sigma_a[0] / sigma_maj[0];
Float pScatter = mp.sigma_s[0] / sigma_maj[0];
Float pNull = std::max<Float>(0, 1 - pAbsorb - pScatter);

// Randomly sample medium scattering event for delta tracking
int mode = SampleDiscrete({pAbsorb, pScatter, pNull}, uMode);
```

若为吸收则停止采样, 获取光照并返回结果.

```c++
L += beta * mp.Le;
terminated = true;
return false;
```

若为散射则根据相位方程采样散射方向, 由于是实散射路径深度会增加. 发生散射返回`false`, 因为路径已经被改变, 不能再执行当前`SampleT_maj`. 注意到由于可以直接从Henyey-Greenstein中采样, 而pbrt目前只实现了这一种相位函数. 这里`ps->p / ps->pdf`始终为1.

```c++
// Stop path sampling if maximum depth has been reached
if (depth++ >= maxDepth) {
    terminated = true;
    return false;
}

// Sample phase function for medium scattering event
Point2f u{rng.Uniform<Float>(), rng.Uniform<Float>()};
pstd::optional<PhaseFunctionSample> ps =
    mp.phase.Sample_p(-ray.d, u);
if (!ps) {
    terminated = true;
    return false;
}

// Update state for recursive evaluation of $L_\roman{i}$
beta *= ps->p / ps->pdf;
ray.o = p;
ray.d = ps->wi;
scattered = true;
return false;
```

若为空散射则返回`true`以继续采样, 同时由于只有空散射会继续执行当前回调函数, `uMode`需要重新生成.

```c++
uMode = rng.Uniform<Float>();
return true;
```

路径追踪结束后, 若与表面相交则获取面积光源, 否则使用无限光源. 

```c++
if (terminated)
    return L;
if (scattered)
    continue;
// Add emission to surviving ray
if (si)
    L += beta * si->intr.Le(-ray.d, lambda);
else {
    for (const auto &light : infiniteLights)
        L += beta * light.Le(ray, lambda);
    return L;
}
```

pbrt会检查是否有发生散射的几何物体, 在`SimpleVolPathIntegrator`中这是无效的.

```c++
BSDF bsdf = si->intr.GetBSDF(ray, lambda, camera, buf, sampler);
if (!bsdf)
    si->intr.SkipIntersection(&ray, si->tHit);
else {
    // Report error if BSDF returns a valid sample
    Float uc = sampler.Get1D();
    Point2f u = sampler.Get2D();
    if (bsdf.Sample_f(-ray.d, uc, u))
        ErrorExit("SimpleVolPathIntegrator doesn't support surface scattering.");
    else
        break;
}
```

### 改进采样技术

`VolPathIntegrator`支持表面散射, 多重波长介质光谱属性以及光源重要性抽样. 采样时若样本距离超过表面相交点, 则可以进行表面散射.

#### 彩色介质

光谱变化介质属性的实现问题主要在于采样, 如果只采用单个波长做重要性抽样, 会降低其余波长的采样效果. 例如采样\\(\sigma_{\text{maj}}\\)时, 其余波长下可能会发生更多的空散射. 但如果为每个波长分别积分, 这在时间开销上又是低效的. 同时, 对于前文的路径追踪求解方法, 这会导致有些项无法抵消, 极有可能增大方差.

多个波长上不同的概率分布可以通过单抽样MIS解决, pbrt使用均匀分布来选择波长概率分布, 由于构造光谱渲染使用的波长时已经完成了概率选择, 这里直接选用第一个波长. 单抽样MIS下平衡启发式是较优的, pbrt直接通过各个分布密度的归一化实现. 单抽样MIS形式如下.

$$
\begin{equation}
\begin{aligned}
f_\lambda(x)
&=\frac{p_{\lambda_1}(x)}{\frac{1}{n}\sum_1^n p_{\lambda_i}(x)}\frac{\left[f_{\lambda_1}(x),f_{\lambda_2}(x),\dots,f_{\lambda_n}(x)\right]}{p_{\lambda_1}(x)}\\\\
&=\frac{\left[f_{\lambda_1}(x),f_{\lambda_2}(x),\dots,f_{\lambda_n}(x)\right]}{\frac{1}{n}\sum_1^n p_{\lambda_i}(x)}
\end{aligned}
\end{equation}
$$

#### 直接光照

引入体渲染后, 直接光源与表面间的透射率也需要被考虑进PDF, 因此pbrt对路径追踪与直接光照使用不同的采样技术. 路径追踪采用`SimpleVolPathIntegrator`使用的差值跟踪, pbrt称之为单向路径采样, PDF用\\(p_u\\)表示. 直接光照则采用比率跟踪获取透射率, 称之为光源路径采样, PDF用\\(p_l\\)表示.

单向路径采样概率如下, \\(p_s\\)为在\\(p_{n-1}\\)选择散射到并沿\\(\omega_n\\)传播的概率, \\(p_{\emptyset}\\)为实散射之间的空散射顶点对应的概率, 最后一项的\\(T_{\text{maj}}(p_m \to r_n)\\)代表着所有采样到超过\\(p_n\\)的点的累积概率.

$$
\begin{equation}
\begin{aligned}
p_u(\bar{p}\_n)
&=p_u(\bar{p}\_{n-1})p_s(r\_{n-1})p_{\emptyset}(r_{n-1},r_n)\\\\
&=p_u(\bar{p}\_{n-1})\frac{\sigma_s(p_{n-1})}{\sigma_{\text{maj}}(p_{n-1})}p_\omega(r_n|r_{n-1}, \omega_n)(\prod_{k=1}^m\frac{\sigma_n(p_k)}{\sigma_{\text{maj}}(p_k)}\sigma_{\text{maj}}(p_k)T_{\text{maj}}(p_{k-1} \to p_k))T_{\text{maj}}(p_m \to r_n)\\\\
&=p_u(\bar{p}\_{n-1})\frac{\sigma_s(p_{n-1})}{\sigma_{\text{maj}}(p_{n-1})}p_\omega(r_n|r_{n-1}, \omega_n)(\prod_{k=1}^m\sigma_n(p_k)T_{\text{maj}}(p_{k-1} \to p_k))T_{\text{maj}}(p_m \to r_n)
\end{aligned}
\end{equation}
$$

光源路径采样的概率与单向路径采样类似, 由于直接光照下散射点与光源之间不会发生散射, 这里不包含选择折射的概率.

$$
\begin{equation}
\begin{aligned}
p_l(\bar{p}\_n)
&=p_u(\bar{p}\_{n-1})p_s(r\_{n-1})p_{\emptyset}(r_{n-1},r_n)\\\\
&=p_u(\bar{p}\_{n-1})\frac{\sigma_s(p_{n-1})}{\sigma_{\text{maj}}(p_{n-1})}p_{l,\omega}(\omega_n)(\prod_{k=1}^m\sigma_{\text{maj}}(p_k)T_{\text{maj}}(p_{k-1} \to p_k))T_{\text{maj}}(p_m \to r_n)
\end{aligned}
\end{equation}
$$

与光谱单抽样MIS结合后的结果如下.

$$
\begin{equation}
\begin{aligned}
\hat{P}(\bar{p}_n)
&=\omega_u(\bar{p}\_n)\frac{\hat{T}(\bar{p}\_n)L_e(p\_n \to p\_{n-1})}{p\_{u,\lambda_1}(\bar{p}\_n)}+\omega_l(\bar{p}'\_n)\frac{\hat{T}(\bar{p}'\_n)L_e(p'\_n \to p'\_{n-1})}{p\_{l,\lambda_1}(\bar{p}'\_n)}
\end{aligned}
\end{equation}
$$

平衡权重如下.

$$
\begin{equation}
\begin{aligned}
\omega_u(\bar{p}\_n)=\frac{p\_{u,\lambda_1}(\bar{p}\_n)}{\frac{1}{m}\left(\sum\_{i=1}^m p\_{u,\lambda\_i}(\bar{p}\_n)+\sum\_{i=1}^m p\_{l,\lambda\_i}(\bar{p}'\_n)\right)}\\\\
\omega_l(\bar{p}\_n)=\frac{p\_{l,\lambda_1}(\bar{p}\_n)}{\frac{1}{m}\left(\sum\_{i=1}^m p\_{u,\lambda\_i}(\bar{p}\_n)+\sum\_{i=1}^m p\_{l,\lambda\_i}(\bar{p}'\_n)\right)}
\end{aligned}
\end{equation}
$$

### 改进的体积积分器

`VolPathIntegrator`的成员与`PathIntegrator`类似, 构造函数只做成员初始化.

```c++
class VolPathIntegrator : public RayIntegrator {
  public:
    // VolPathIntegrator Public Methods
    // ...

  private:
    // VolPathIntegrator Private Methods
    // ...

    // VolPathIntegrator Private Members
    int maxDepth;
    LightSampler lightSampler;
    bool regularize;
};
```

可以看出平衡权重的分子与采样项分母可以抵消, 但这可能会导致\\(\beta\\)溢出, 例如BSDF采样结果过大, 分母上的PDF可以有效防止溢出. 同样的平衡权重也需要考虑浮点数精度, 因此定义重缩放路径概率.

$$
\begin{equation}
\begin{aligned}
r\_{u,\lambda_i}(\bar{p}\_n)=\frac{p\_{u,\lambda_i}(\bar{p}\_n)}{p\_{\text{path}}(\bar{p}\_n)}\\\\
r\_{l,\lambda_i}(\bar{p}\_n)=\frac{p\_{l,\lambda_i}(\bar{p}\_n)}{p\_{\text{path}}(\bar{p}\_n)}\\\\
\end{aligned}
\end{equation}
$$

\\(p_{\text{path}}\\)是采样当前路径的概率, 在单向路径采样中为\\(p_{u,\lambda_1}\\), 在光源路径采样中为\\(p_{l,\lambda_1}\\), 因此重缩放后的平衡权重如下. 注意这两项中的\\(p_{\text{path}}\\)是不同的, 这里只是防止数值误差的手段, 和之前的权重实际上是一致的.

$$
\begin{equation}
\begin{aligned}
\omega_u(\bar{p}\_n)=\frac{1}{\frac{1}{m}\left(\sum\_{i=1}^m r\_{u,\lambda\_i}(\bar{p}\_n)+\sum\_{i=1}^m r\_{l,\lambda\_i}(\bar{p}'\_n)\right)}\\\\
\omega_l(\bar{p}\_n)=\frac{1}{\frac{1}{m}\left(\sum\_{i=1}^m r\_{u,\lambda\_i}(\bar{p}\_n)+\sum\_{i=1}^m r\_{l,\lambda\_i}(\bar{p}'\_n)\right)}
\end{aligned}
\end{equation}
$$

`VolPathIntegrator`中所有采样点都会添加自发光, 因为是Monte Carlo, 所以这只是多统计了一条路径来提高统计效率, 不影响最终结果. 令新添加的路径顶点为\\(p'\\), 光照结果如下. 由于MIS, \\(p_{\text{maj}}\\)中的\\(T_{\text{maj}}\\)不会再被抵消, 同时由于这条路径始终添加自发光\\(p_e\\)也始终为1.

$$
\begin{equation}
\begin{aligned}
\hat{P}(\left[\bar{p}_n + p'\right])
&=\beta(\left[\bar{p}_n+p'\right])\sigma_a(p')L_e(p' \to p_n)\\\\
&=\frac{\beta(\bar{p}\_n)T\_{\text{maj}(p_n \to p')}}{p_e(p')p\_{\text{maj}}(p'|p_n,\omega)}\sigma_a(p')L_e(p' \to p_n)
\end{aligned}
\end{equation}
$$

由于波长的影响这里同样需要做MIS, MIS权重如下.

$$
\begin{equation}
\omega_e(\left[\bar{p}\_n + p'\right])=\frac{1}{\frac{1}{m}\sum_{i=1}^m r_{e,\lambda_i}([\bar{p}\_n+p'])}
\end{equation}
$$

代码实现如下.

```c++
if (depth < maxDepth && mp.Le) {
    // Compute $\beta'$ at new path vertex
    Float pdf = sigma_maj[0] * T_maj[0];
    SampledSpectrum betap = beta * T_maj / pdf;

    // Compute rescaled path probability for absorption at path vertex
    SampledSpectrum r_e = r_u * sigma_maj * T_maj / pdf;

    // Update _L_ for medium emission
    if (r_e)
        L += betap * mp.sigma_a * mp.Le / r_e.Average();
}
```

之后按照与`SimpleVolPathIntegrator`一样的方法选择散射事件. 由于自发光已经被统计过, 选择吸收时只停止追踪, 不做其它操作. 这里再次强调一下我的理解, Monte Carlo方法选择某条路径的概率是任意的, 只需要符合实际使用的概率就行, 使用不同的PDF只是方差上有区别, 因此每次统计都选择自发光时概率设置为1没有问题, 这里通过散射事件的概率来选择也没有问题.

```c++
terminated = true;
return false;
```

实散射事件中选择当前顶点概率为\\(\sigma_{\text{maj}}(p')T_{\text{maj}}(p_n \to p')\\), 选择实散射概率为\\(\frac{\sigma_s(p')}{\sigma_{\text{maj}}(p')}\\), 这里\\(\sigma_{\text{maj}}(p')\\)被抵消. 这里\\(\beta\\)只更新了与选择顶点相关的部分, 散射部分还没添加, 因此不必在这里纠结.

```c++
Float pdf = T_maj[0] * mp.sigma_s[0];
beta *= T_maj * mp.sigma_s / pdf;
r_u *= T_maj * mp.sigma_s / pdf;
```

直接光照部分后续再介绍, `Li`开头是计算了距离最近的表面的距离的, 采样不会超过这个距离, 因此这里还没有接触到表面, 需要使用相位函数. 对于直接光照路径, 它的顶点除光源外与单向路径\\(\bar{p}_n\\)是相同的, 因此\\(r_l(\left[\bar{p}\_n \to p'\right])\\)可以直接从\\(r_u(\bar{p}\_n)\\)中推导出来, 这里除以`ps->pdf`是因为MIS使用的\\(p\_{\text{path}}\\)为\\(p\_{u,\lambda_1}\\), 分子上的光源路径概率后续再更新. \\(r_u(\left[\bar{p}_n \to p\right])\\)不需要更新是因为相位方程与波长无关, 分子分母抵消了.

```c++
// Sample direct lighting at volume-scattering event
MediumInteraction intr(p, -ray.d, ray.time, ray.medium,
                       mp.phase);
L += SampleLd(intr, nullptr, lambda, sampler, beta, r_u);

// Sample new direction at real-scattering event
Point2f u = sampler.Get2D();
pstd::optional<PhaseFunctionSample> ps =
    intr.phase.Sample_p(-ray.d, u);
if (!ps || ps->pdf == 0)
    terminated = true;
else {
    // Update ray path state for indirect volume scattering
    beta *= ps->p / ps->pdf;
    r_l = r_u / ps->pdf;
    prevIntrContext = LightSampleContext(intr);
    scattered = true;
    ray.o = p;
    ray.d = ps->wi;
    specularBounce = false;
    anyNonSpecularBounces = true;
}
```

空散射事件中概率中的\\(\sigma_{\text{maj}}(p')\\)同样被抵消. 光源路径采样认为当前采样是计算与光源之间的透射率, 因此在路径传播过程中不需要选择散射事件, 只需要记录选择顶点的概率, 因此不包含\\(\frac{\sigma_n(p')}{\sigma_{\text{maj}}(p')}\\), 分母上的`pdf`同样是因为MIS使用的\\(p\_{\text{path}}\\)为\\(p\_{u,\lambda_1}\\).

```c++
SampledSpectrum sigma_n = ClampZero(sigma_maj - mp.sigma_a - mp.sigma_s);
Float pdf = T_maj[0] * sigma_n[0];
beta *= T_maj * sigma_n / pdf;
if (pdf == 0) beta = SampledSpectrum(0.f);
r_u *= T_maj * sigma_n / pdf;
r_l *= T_maj * sigma_maj / pdf;
return beta && r_u;
```

退出`SampleT_maj`后, 如路径大于最大深度, 遇到吸收事件, 散射PDF为0或任意一个波长的\\(\beta\\)或\\(r_u\\)为0, 则返回光照结果. 若遇到散射事件则继续循环.

```c++
if (terminated || !beta || !r_u)
    return L;
if (scattered)
    continue;
```

剩下的情况是没有发生任何散射事件或只经历了空散射, 这部分的实现在`SampleT_maj`中, 因为介质迭代器迭代到末尾而返回当前累计的\\(T_\text{maj}\\). 没有散射事件则返回值在各个波长上都为\\(1\\), 不影响这些系数; 若只经历空散射则代表光线沿直线从介质起点传播到终点, 最后一个采样点超过了介质最大距离, 根据之前章节的结论, 这种情况概率可以从CDF中获取, 值为\\(T_{\text{maj}}\\). \\(\beta\\)分子乘上\\(T_{\text{maj}}\\)是因为路径通量需要统计透射率, \\(r_u\\)和\\(r_l\\)则是各个波长上超过最大距离的概率.

```c++
beta *= T_maj / T_maj[0];
r_u *= T_maj / T_maj[0];
r_l *= T_maj / T_maj[0];
```

处理与物体表面相交的情况, 此时若已经达到最大深度, 则统计表面自发光后就结束路径追踪.

```c++
// Terminate path if maximum depth reached
if (depth++ >= maxDepth)
    return L;
```

获取直接光照, 同样使用`SampleLd`. 与`PathIntegrator`一样, 由于镜面反射概率分布为Dirac delta分布, 无需统计直接光照.

```c++
// Sample illumination from lights to find attenuated path contribution
if (IsNonSpecular(bsdf.Flags())) {
    L += SampleLd(isect, &bsdf, lambda, sampler, beta, r_u);
    DCHECK(IsInf(L.y(lambda)) == false);
}
prevIntrContext = LightSampleContext(isect);
```

根据BSDF生成追踪路径.

```c++
// Sample BSDF to get new volumetric path direction
Vector3f wo = isect.wo;
Float u = sampler.Get1D();
pstd::optional<BSDFSample> bs = bsdf.Sample_f(wo, u, sampler.Get2D());
if (!bs)
    break;
```

更新\\(\beta\\)与\\(r_l\\), \\(r_u\\)因为BSDF与波长无关, 并不需要更新. \\(\beta\\)更新时添加的余弦项可参照泛化路径空间的定义. \\(r_l\\)与之前一样只更新分母上的PDF, `pdfIsProportional`与某些特殊材质相关, 具体见后续章节.

```c++
// Update _beta_ and rescaled path probabilities for BSDF scattering
beta *= bs->f * AbsDot(bs->wi, isect.shading.n) / bs->pdf;
if (bs->pdfIsProportional)
    r_l = r_u / bsdf.PDF(wo, bs->wi);
else
    r_l = r_u / bs->pdf;
```

俄罗斯轮盘部分与`PathIntegrator`类似, 在其基础上添加了\\(r_u\\)相关的系数, \\(r_u\\)在各个波长上的均值越小退出概率越小. 猜测这里是因为较小的\\(r_u\\)代表当前使用的波长越重要.

```c++
SampledSpectrum rrBeta = beta * etaScale / r_u.Average();
Float uRR = sampler.Get1D();
PBRT_DBG("%s\n",
         StringPrintf("etaScale %f -> rrBeta %s", etaScale, rrBeta).c_str());
if (rrBeta.MaxComponentValue() < 1 && depth > 1) {
    Float q = std::max<Float>(0, 1 - rrBeta.MaxComponentValue());
    if (uRR < q)
        break;
    beta /= 1 - q;
}
```

#### 估计直接光照

`SampleLd`实现直接光照, 与`PathIntegrator`相比这里需要计算透射率.

散射点可能是表面或体积, 若为表面则和`PathIntegrator`一样对交点做偏移, 使得反射时位于面外, 折射时位于面内.

```c++
LightSampleContext ctx;
if (bsdf) {
    ctx = LightSampleContext(intr.AsSurface());
    // Try to nudge the light sampling position to correct side of the surface
    BxDFFlags flags = bsdf->Flags();
    if (IsReflective(flags) && !IsTransmissive(flags))
        ctx.pi = intr.OffsetRayOrigin(intr.wo);
    else if (IsTransmissive(flags) && !IsReflective(flags))
        ctx.pi = intr.OffsetRayOrigin(-intr.wo);

} else
    ctx = LightSampleContext(intr);
```

生成随机变量并采样光源, 与`PathIntegrator`一致.

```c++
Float u = sampler.Get1D();
pstd::optional<SampledLight> sampledLight = lightSampler.Sample(ctx, u);
Point2f uLight = sampler.Get2D();
if (!sampledLight)
    return SampledSpectrum(0.f);
Light light = sampledLight->light;
DCHECK(light && sampledLight->p != 0);

// Sample a point on the light source
pstd::optional<LightLiSample> ls = light.SampleLi(ctx, uLight, lambda, true);
if (!ls || !ls->L || ls->pdf == 0)
    return SampledSpectrum(0.f);
Float p_l = sampledLight->p * ls->pdf;
```

分别处理BSDF与相位方程. BSDF的计算方式与`PathIntegrator`一致, 注意这里\\(\hat{f}\\)把\\(D(p,p')\\)即余弦项包括进去了. \\(\hat{f}\\)没有包含\\(\sigma_s\\), 因为已经包括在\\(\beta\\)中了.

```c++
// Evaluate BSDF or phase function for light sample direction
Float scatterPDF;
SampledSpectrum f_hat;
Vector3f wo = intr.wo, wi = ls->wi;
if (bsdf) {
    // Update _f_hat_ and _scatterPDF_ accounting for the BSDF
    f_hat = bsdf->f(wo, wi) * AbsDot(wi, intr.AsSurface().shading.n);
    scatterPDF = bsdf->PDF(wo, wi);

} else {
    // Update _f_hat_ and _scatterPDF_ accounting for the phase function
    CHECK(intr.IsMediumInteraction());
    PhaseFunction phase = intr.AsMedium().phase;
    f_hat = SampledSpectrum(phase.p(wo, wi));
    scatterPDF = phase.PDF(wo, wi);
}
if (!f_hat)
    return SampledSpectrum(0.f);
```

`SampleLd`中会记录单独的\\(r_u\\)与\\(r_l\\), 因为此时\\(p_{\text{path}}\\)为\\(p_l\\)而非\\(p_u\\).

```c++
// Declare path state variables for ray to light source
Ray lightRay = intr.SpawnRayTo(ls->pLight);
SampledSpectrum T_ray(1.f), r_l(1.f), r_u(1.f);
RNG rng(Hash(lightRay.o), Hash(lightRay.d));
```

首先判断是否与光源相交, 如果在与光源相交前就与物体相交则不产生贡献, `SpawnRayTo`不会将光线归一化, 因此这里通过`1 - ShadowEpsilon`保证不会与光源相交. 同时与介质分界面相交也是有可能的, 且介质分界面与光源之间可能还会有物体, 但是此时仍然应该先计算透射率, 例如可能在当前相交的介质里透射率就变为0了.

```c++
// Trace ray through media to estimate transmittance
pstd::optional<ShapeIntersection> si = Intersect(lightRay, 1 - ShadowEpsilon);
// Handle opaque surface along ray's path
if (si && si->intr.material)
    return SampledSpectrum(0.f);
```

路径追踪过程中透射率的计算使用比率跟踪. 之前的章节推导出的结论是只在每个空散射顶点记录\\(\frac{\sigma_n(p)}{\sigma_{\text{maj}}(p)}\\), 这里因为MIS导致的概率不同需要使用完整形式.

```c++
// Update ray transmittance estimate at sampled point
// Update _T_ray_ and PDFs using ratio-tracking estimator
SampledSpectrum sigma_n =
    ClampZero(sigma_maj - mp.sigma_a - mp.sigma_s);
Float pdf = T_maj[0] * sigma_maj[0];
T_ray *= T_maj * sigma_n / pdf;
r_l *= T_maj * sigma_maj / pdf;
r_u *= T_maj * sigma_n / pdf;
```

如果直接根据当前透射率作为俄罗斯轮盘使用的概率, 比率跟踪会转化为差值跟踪, 透射率只能为0或1. pbrt认为这过于激进, 因此只在添加MIS后的透射率过小时执行俄罗斯轮盘.

```c++
SampledSpectrum Tr = T_ray / (r_l + r_u).Average();
if (Tr.MaxComponentValue() < 0.05f) {
    Float q = 0.75f;
    if (rng.Uniform<Float>() < q)
        T_ray = SampledSpectrum(0.);
    else
        T_ray /= 1 - q;
}
```

与前文介绍的一样, 超过最大距离时仍然要更新透射率与重缩放路径概率. 按之前章节的定义这里\\(T_r\\)应该乘1, 同样由于MIS之前的推导不再成立.

```c++
T_ray *= T_maj / T_maj[0];
r_l *= T_maj / T_maj[0];
r_u *= T_maj / T_maj[0];
```

透射率为0立即返回, 没有相交代表使用的是无限光源且已经离开场景, 若都不满足则生成新的光线继续循环.

```c++
if (!T_ray) return SampledSpectrum(0.f);
if (!si) break;
lightRay = si->intr.SpawnRayTo(ls->pLight);
```

在发生散射之前\\(r_u\\)和\\(r_l\\)是相等的, 因此这里将这里单独计算的\\(r_u\\)和\\(r_l\\)直接乘上\\(r_{\text{path}}\\)即可. 理论上这里应该`beta = beta / lightPDF; r_l /= lightPDF; r_u /= lightPDF`, 由于`lightPDF`被抵消因此这里省略. 与`PathIntegrator`一样, Delta光源无法通过散射接触到, 这使得\\(r_u\\)为0, 因此只统计\\(r_l\\).

```c++
r_l *= r_p * lightPDF;
r_u *= r_p * scatterPDF;
if (IsDeltaLight(light.Type()))
    return beta * f_hat * T_ray * ls->L / r_l.Average();
else
    return beta * f_hat * T_ray * ls->L / (r_l + r_u).Average();
```

与`PathIntegrator`类似, 散射光线不与场景相交则计算无限光源的光照, 第一次散射或镜面反射不考虑直接光照, 否则根据选择光源以及选择光源相交点的概率添加MIS.

```c++
// Accumulate contributions from infinite light sources
for (const auto &light : infiniteLights) {
    if (SampledSpectrum Le = light.Le(ray, lambda); Le) {
        if (depth == 0 || specularBounce)
            L += beta * Le / r_u.Average();
        else {
            // Add infinite light contribution using both PDFs with MIS
            Float p_l = lightSampler.PMF(prevIntrContext, light) *
                        light.PDF_Li(prevIntrContext, ray.d, true);
            r_l *= p_l;
            L += beta * Le / (r_u + r_l).Average();
        }
    }
}
```

若有下一个相交点则处理方式类似, 没有自发光时选择这个光源的概率为0, 无需统计.

```c++
SurfaceInteraction &isect = si->intr;
if (SampledSpectrum Le = isect.Le(-ray.d, lambda); Le) {
    // Add contribution of emission from intersected surface
    if (depth == 0 || specularBounce)
        L += beta * Le / r_u.Average();
    else {
        // Add surface light contribution using both PDFs with MIS
        Light areaLight(isect.areaLight);
        Float p_l = lightSampler.PMF(prevIntrContext, areaLight) *
                    areaLight.PDF_Li(prevIntrContext, ray.d, true);
        r_l *= p_l;
        L += beta * Le / (r_u + r_l).Average();
    }
}
```

## 分层材质散射

在两层具有不同BSDF的表面之间填充介质, 即可形成分层材质, pbrt通过`LayeredBxDF`定义. 这是之前章节介绍的`ThinDielectricBxDF`的泛化, 假设光线从同一个点入射与出射, 并添加了中间介质的散射.

### 一维辐射转移方程

将辐射转移方程转化为只与距离表面的深度有关, 即去除起始点相关参数, 此时辐射转移方程如下. \\(|\omega_z|\\)是传播方向与表面法线的点积, 改项用于调整不同\\(\omega\\)下的传播距离.

$$
\begin{equation}
\frac{\partial L_o(z,\omega)}{\partial z} = -\frac{\sigma_t(z)}{|\omega_z|}L_i(z,-\omega)+\frac{\sigma_t(z)}{|\omega_z|}L_s(z,\omega)
\end{equation}
$$

推导出的\\(L_i\\)如下, \\(z_i\\)为介质交界面的深度. 具体推导过程见辐射转移方程章节.

$$
\begin{equation}
\begin{aligned}
&L_i(z,\omega)=T_r(z \to z_i)L_o(z_i,-\omega)+\int_z^{z_i} \frac{\sigma_t(z')}{|\omega_z|}T_r(z \to z',\omega)L_s(z',-\omega)dz'\\\\
&T_r(z_0 \to z_1,\omega)=e^{-\int_{z_0}^{z_1}\frac{\sigma_t(z')}{|\cos\theta|}dz'}
\end{aligned}
\end{equation}
$$

pbrt认为`LayeredBxDF`中的\\(\sigma_t\\)在所有波长上都为常数, 因此不需要空散射.

### 分层BxDF

`LayeredBxDF`的值并不是确定的, pbrt通过定义一个虚拟Delta光源来计算, 在Monte Carlo下这是无偏的.

$$
\begin{equation}
L_o(\omega_o)=\int_\Omega f(\omega_o,\omega)L_i(\omega)\cos\theta d\omega=\int_\Omega f(\omega_o,\omega)\delta(\omega-\omega_i)d\omega=f(\omega_o,\omega_i)
\end{equation}
$$

`LayeredBxDF`允许设置两层BSDF和一种同质介质, 当然这两层BSDF的类型也可以是`LayeredBxDF`, 以此实现更多层数. pbrt认为\\(\sigma_t\\)为常数, 不包含自发光, 因此用户通过`albedo`定义\\(\sigma_s\\), 同时也可以定义厚度控制光线传播. `maxDepth`与`nSamples`是Monte Carlo的相关参数.

```c++
template <typename TopBxDF, typename BottomBxDF, bool twoSided>
class LayeredBxDF {
  public:
    // LayeredBxDF Public Methods
    // ...

  private:
    // LayeredBxDF Private Methods
    // ...

    // LayeredBxDF Private Members
    TopBxDF top;
    BottomBxDF bottom;
    Float thickness, g;
    SampledSpectrum albedo;
    int maxDepth, nSamples;
};
```

`Tr`返回透射率, 基于同质介质的假设.

```c++
static Float Tr(Float dz, Vector3f w) {
    return FastExp(-std::abs(dz / w.z));
}
```

基于交换两层BSDF的需求, pbrt定义了`TopOrBottomBxDF`, 赋值时根据参数类型判断是`TopBxDF`或`BottomBxDF`.

```c++
template <typename TopBxDF, typename BottomBxDF>
class TopOrBottomBxDF {
  public:
    // TopOrBottomBxDF Public Methods
    TopOrBottomBxDF() = default;
    PBRT_CPU_GPU
    TopOrBottomBxDF &operator=(const TopBxDF *t) {
        top = t;
        bottom = nullptr;
        return *this;
    }
    PBRT_CPU_GPU
    TopOrBottomBxDF &operator=(const BottomBxDF *b) {
        bottom = b;
        top = nullptr;
        return *this;
    }

    PBRT_CPU_GPU
    SampledSpectrum f(Vector3f wo, Vector3f wi, TransportMode mode) const {
        return top ? top->f(wo, wi, mode) : bottom->f(wo, wi, mode);
    }

    // ...

  private:
    const TopBxDF *top = nullptr;
    const BottomBxDF *bottom = nullptr;
};
```

#### BSDF求解

BSDF通过多次采样路径求均值获取. 若为单侧材质, 则根据位于内侧或外侧决定接触的材质. 若为双侧材质, 即某个材质被两个相同的材质夹在中间, 则接触的材质是确定的. 在双侧材质时若入射或出射方向指向面内则切换方向, 便于法线参与计算.

```c++
// Set _wo_ and _wi_ for layered BSDF evaluation
if (twoSided && wo.z < 0) {
    wo = -wo;
    wi = -wi;
}

// Determine entrance interface for layered BSDF
TopOrBottomBxDF<TopBxDF, BottomBxDF> enterInterface;
bool enteredTop = twoSided || wo.z > 0;
if (enteredTop)
    enterInterface = &top;
else
    enterInterface = &bottom;
```

根据入射与出射方向是否位于同一半球判断出射位置的材质, 同时也会记录非出射退出的材质, 位于同一半球时这个材质上只会发生反射, 否则光线无法出射. 该步同时也确定出射位置的深度.

```c++
TopOrBottomBxDF<TopBxDF, BottomBxDF> exitInterface, nonExitInterface;
if (SameHemisphere(wo, wi) ^ enteredTop) {
    exitInterface = &bottom;
    nonExitInterface = &top;
} else {
    exitInterface = &top;
    nonExitInterface = &bottom;
}
Float exitZ = (SameHemisphere(wo, wi) ^ enteredTop) ? 0 : thickness;
```

位于同一半球时需要添加入射表面的反射.

```c++
// Account for reflection at the entrance interface
if (SameHemisphere(wo, wi))
    f = nSamples * enterInterface.f(wo, wi, mode);
```

其余BSDF都需要通过Monte Carlo获取结果, 所以接口没有提供随机数相关参数, pbrt在`LayeredBxDF`内部提供相关功能.

```c++
RNG rng(Hash(GetOptions().seed, wo), Hash(wi));
auto r = [&rng]() { return std::min<Float>(rng.Uniform<Float>(),
                                           OneMinusEpsilon); };
```

光照结果是半球上的积分, 反射已经计算所以只考虑透射, 根据BTDF在入射面采样当前出射光线的入射方向.

```c++
Float uc = r();
pstd::optional<BSDFSample> wos =
    enterInterface.Sample_f(wo, uc, Point2f(r(), r()), mode,
                            BxDFReflTransFlags::Transmission);
if (!wos || !wos->f || wos->pdf == 0 || wos->wi.z == 0)
    continue;
```

根据BSDF/相位方程或虚拟光源进入表面后的折射方向来计算虚拟光源的光照都是可行的, 因此pbrt使用MIS. 注意到这里`mode`取反, 因为这里光线是从光源发出的, 而非常规的从相机逆向追踪, 因此对不对称散射的处理方式不同, 具体见之前章节的介绍.

```c++
uc = r();
pstd::optional<BSDFSample> wis =
    exitInterface.Sample_f(wi, uc, Point2f(r(), r()), !mode,
                           BxDFReflTransFlags::Transmission);
if (!wis || !wis->f || wis->pdf == 0 || wis->wi.z == 0)
    continue;
```

由于逆向追踪的特性这里同样需要记录\\(\beta\\).

```c++
SampledSpectrum beta = wos->f * AbsCosTheta(wos->wi) / wos->pdf;
Float z = enteredTop ? thickness : 0;
Vector3f w = wos->wi;
HGPhaseFunction phase(g);
```

`LayeredBxDF`的俄罗斯轮盘策略相对保守, 因为计算开销较小.

```c++
if (depth > 3 && beta.MaxComponentValue() < 0.25f) {
    Float q = std::max<Float>(0, 1 - beta.MaxComponentValue());
    if (r() < q) break;
    beta /= 1 - q;
}
```

如果没有介质散射, 即`albedo`未定义, 则直接抵达表面. 这对应\\(L_i\\)的非积分项.

```c++
z = (z == thickness) ? 0 : thickness;
beta *= Tr(thickness, w);
```

有介质散射就采用体渲染抽样, 通过`Clamp`将深度限制在表面内部. 这里对应\\(L_i\\)的积分项, 由于与比率跟踪使用相同的采样方法, 这里不需要选择概率, 具体见比率跟踪的证明. `sigma_t`应该是`albedo`, 大概是收敛的比较快bug一直没改.

```c++
// Sample medium scattering for layered BSDF evaluation
Float sigma_t = 1;
Float dz = SampleExponential(r(), sigma_t / std::abs(w.z));
Float zp = w.z > 0 ? (z + dz) : (z - dz);
DCHECK_RARE(1e-5, z == zp);
if (z == zp)
    continue;
if (0 < zp && zp < thickness) {
    // ...
}
z = Clamp(zp, 0, thickness);
```

若采样点位于介质内部, 接下来在顶点根据相位方程以及虚拟光源折射方向执行MIS, 同时更新\\(\beta\\)与折射方向.

```c++
// Account for scattering through _exitInterface_ using _wis_
Float wt = 1;
if (!IsSpecular(exitInterface.Flags()))
    wt = PowerHeuristic(1, wis->pdf, 1, phase.PDF(-w, -wis->wi));
f += beta * albedo * phase.p(-w, -wis->wi) * wt *
        Tr(zp - exitZ, wis->wi) * wis->f / wis->pdf;

// Sample phase function and update layered path state
Point2f u{r(), r()};
pstd::optional<PhaseFunctionSample> ps = phase.Sample_p(-w, u);
if (!ps || ps->pdf == 0 || ps->wi.z == 0)
    continue;
beta *= albedo * ps->p / ps->pdf;
w = ps->wi;
z = zp;

// Possibly account for scattering through _exitInterface_
if (((z < exitZ && w.z > 0) || (z > exitZ && w.z < 0)) &&
    !IsSpecular(exitInterface.Flags())) {
    // Account for scattering through _exitInterface_
    SampledSpectrum fExit = exitInterface.f(-w, wi, mode);
    if (fExit) {
        Float exitPDF = exitInterface.PDF(
            -w, wi, mode, BxDFReflTransFlags::Transmission);
        Float wt = PowerHeuristic(1, ps->pdf, 1, exitPDF);
        f += beta * Tr(zp - exitZ, ps->wi) * fExit * wt;
    }
}
```

若到达出射表面, 由于上一个顶点已经计算了与出射表面相交并接触虚拟光源的概率, 这里只统计反射. 若到达非出射表面, 则处理方式与介质内部散射点类似, 使用BSDF做MIS, 这里忽略这部分代码.

```c++
Float uc = r();
pstd::optional<BSDFSample> bs = exitInterface.Sample_f(
    -w, uc, Point2f(r(), r()), mode, BxDFReflTransFlags::Reflection);
if (!bs || !bs->f || bs->pdf == 0 || bs->wi.z == 0)
    break;
beta *= bs->f * AbsCosTheta(bs->wi) / bs->pdf;
w = bs->wi;
```

#### BSDF采样

`Sample_f`通过不断采样路径直到到达出射表面来实现, 此时\\(\beta\\)与路径PDF的比值和BSDF与当前入射方向对应PDF的比值相等, 因此`Sample_f`返回前者, 这里不做证明. 显然这里返回的PDF无法用于MIS, 需要调用`PDF`获取.

#### PDF求解

令底部表面BRDF为\\(f^-_r\\), 顶部表面BRDF为\\(f^+_r\\), BTDF为\\(f^+_t\\), 此时PDF形式如下, 代表无限次的反射与折射. 由于该PDF只会被MIS使用, 因此只随机统计第二项且内部散射不再统计.

$$
\begin{equation}
p(\omega_o,\omega_i)=p^+_r(\omega_o,\omega_i)+\int\_\Theta\int\_\Theta p^+_t(\omega_o,\omega')p^-_r(-\omega',\omega'')p^+_t(-\omega'',\omega_i)d\omega'd\omega''+\cdots
\end{equation}
$$

为保证与`f`中的随机采样不相关, 这里使用不同的hash.

```c++
RNG rng(Hash(GetOptions().seed, wi), Hash(wo));
auto r = [&rng]() { return std::min<Float>(rng.Uniform<Float>(),
                                           OneMinusEpsilon); };
```

若入射/出射方向位于同侧, 估计结果的第一项可以直接给出.

```c++
bool enteredTop = twoSided || wo.z > 0;
Float pdfSum = 0;
if (SameHemisphere(wo, wi)) {
    auto reflFlag = BxDFReflTransFlags::Reflection;
    pdfSum += enteredTop ?
              nSamples * top.PDF(wo, wi, mode, reflFlag) :
              nSamples * bottom.PDF(wo, wi, mode, reflFlag);
}
```

位于同侧时随机统计的光线传播为TRT, pbrt使用两种采样策略进行MIS, 第一种为分别根据入射/出射方向采样相邻的内部传播方向, 第二种为根据出射方向采样相邻的内部传播方向, 然后根据该方向采样与入射方向相邻的内部传播方向. MIS化简后的表达式如下, 由于采样结果与采样概率相等很多项都可以抵消.

$$
\begin{equation}
p(\omega_o,\omega_i)\approx w(\omega_1'')p^-_r(-\omega',\omega_1'')+w(\omega_2'')p^+_t(-\omega_2'',\omega_i)
\end{equation}
$$

两种采样方式都需要用到`wos`, `wis`只应用在第一种.

```c++
auto trans = BxDFReflTransFlags::Transmission;
pstd::optional<BSDFSample> wos, wis;
wos = tInterface.Sample_f(wo, r(), {r(), r()},  mode, trans);
wis = tInterface.Sample_f(wi, r(), {r(), r()}, !mode, trans);
```

`tInterface`为镜面反射时`wos`与`wis`的采样结果是确定的, 不做MIS.

```c++
if (!IsNonSpecular(tInterface.Flags()))
    pdfSum += rInterface.PDF(-wos->wi, -wis->wi, mode);
```

`tInterface`不为镜面反射时获取`rInterface`的采样结果.

```c++
pstd::optional<BSDFSample> rs =
    rInterface.Sample_f(-wos->wi, r(), {r(), r()}, mode);
```

若`rInterface`为镜面反射`rs`采样结果确定, 同样不采用MIS.

```c++
if (!IsNonSpecular(rInterface.Flags()))
        pdfSum += tInterface.PDF(-rs->wi, wi, mode);
```

两个平面都为非镜面反射时应用MIS.

```c++
// Compute MIS-weighted estimate of Equation
// (\ref{eq:pdf-triple-canceled-one})
Float rPDF = rInterface.PDF(-wos->wi, -wis->wi, mode);
Float wt = PowerHeuristic(1, wis->pdf, 1, rPDF);
pdfSum += wt * rPDF;

Float tPDF = tInterface.PDF(-rs->wi, wi, mode);
wt = PowerHeuristic(1, rs->pdf, 1, tPDF);
pdfSum += wt * tPDF;
```

入射/出射方向不在同一半球时的光线传播为TT, 与TRT的实现类似.

高次项与散射通过均匀分布来估计, 与统计项混合得到估计结果.

```c++
return Lerp(0.9f, 1 / (4 * Pi), pdfSum / nSamples);
```

### 涂层漫反射与涂层导体材质

在漫反射或导体材质表面添加一层绝缘体可以更好的模拟某些材质, pbrt通过`CoatedDiffuseBxDF`与`CoatedConductorBxDF`实现, 实现方式与`LayeredBxDF`类似.

```c++
// CoatedDiffuseBxDF Definition
class CoatedDiffuseBxDF : public LayeredBxDF<DielectricBxDF, DiffuseBxDF, true> {
  public:
    // CoatedDiffuseBxDF Public Methods
    using LayeredBxDF::LayeredBxDF;
    PBRT_CPU_GPU
    static constexpr const char *Name() { return "CoatedDiffuseBxDF"; }
};

// CoatedConductorBxDF Definition
class CoatedConductorBxDF : public LayeredBxDF<DielectricBxDF, ConductorBxDF, true> {
  public:
    // CoatedConductorBxDF Public Methods
    PBRT_CPU_GPU
    static constexpr const char *Name() { return "CoatedConductorBxDF"; }
    using LayeredBxDF::LayeredBxDF;
};
```

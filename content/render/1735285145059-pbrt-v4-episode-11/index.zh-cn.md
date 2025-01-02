---
title: "pbrt-v4 Ep. XI: 体散射"
date: 2024-12-27
draft: false
description: "pbrt-v4 episode 11"
tags: ["graphics", "rendering", "pbrt"]
---

{{< katex >}}

## 体散射过程

吸收, 自发光与散射影响传输介质中辐亮度的分布, 这些系数与位置和方向有关, pbrt认为介质中粒子的位置是独立的.

### 吸收

吸收由介质的吸收系数\\(\sigma_a\\)表示, 代表光线在介质中经过单位距离后被吸收的概率, 吸收后辐亮度变化如下形式. 这里入射光方向为负的原因在之前章节有介绍过, 只是方便计算.

$$
\begin{equation}
dL_o(p,\omega)=-\sigma_a(p,\omega)L_i(p,-\omega)dt
\end{equation}
$$

### 自发光

介质中的化学, 热或核过程使得经过它的光线的辐亮度增加, 其形式如下. 自发光是吸收的逆过程, 因此二者系数相同. 注意到pbrt中\\(L_e\\)与\\(L_i\\)无关, 在几何光学中这是成立的.

$$
\begin{equation}
dL_o(p,\omega)=\sigma_a(p,\omega)L_e(p,\omega)dt
\end{equation}
$$

### 外散射与衰减

粒子间的碰撞导致粒子的运动方向被改变, 从而导致辐亮度的衰减, 这被称为外散射. 将吸收与外散射系数结合即可得到衰减系数\\(\sigma_t(p,\omega)=\sigma_a(p,\omega)+\sigma_s(p,\omega)\\). 此时可以定义单散射反照率\\(\rho(p,\omega)=\frac{\sigma_s(p,\omega)}{\sigma_t(p,\omega)}\\), 这表示散射事件中散射的概率. 同时也可以定义平均自由程\\(\frac{1}{\sigma_t(p,\omega)}\\), 这表示衰减系数为\\(\sigma_t(p,\omega)\\)时粒子在与其它粒子交互前运动的平均距离.

$$
\begin{equation}
dL_o(p,\omega)=-\sigma_s(p,\omega)L_i(p,-\omega)dt
\end{equation}
$$

### 内散射

其它光线中的粒子通过外散射成为当前光线中的粒子, 使得辐亮度增加, 这被称为内散射. 定义相位方程\\(p(\omega,\omega')\\)为光线方向为\\(\omega\\)时外散射到\\(\omega'\\)的概率, 这与BSDF类似但是需要归一化, 此时可以定义内散射.

$$
\begin{equation}
dL_o(p,\omega)=\sigma_s(p,\omega)\int_\Theta p(p,\omega_i,\omega)L_i(p,\omega_i)d\omega_idt
\end{equation}
$$

此时可以得到辐亮度总增加量.

$$
\begin{equation}
\begin{aligned}
dL_o(p,\omega)
&=\sigma_t(p,\omega)L_s(p,\omega)dt\\\\
&=\sigma_t(p,\omega)(\frac{\sigma_a(p,\omega)}{\sigma_t(p,\omega)}L_e(p,\omega)+\frac{\sigma_s(p,\omega)}{\sigma_t(p,\omega)}\int_\Theta p(p,\omega_i,\omega)L_i(p,\omega_i)d\omega_i)dt
\end{aligned}
\end{equation}
$$

## 透射率

根据微分方程可以得到透射率, 本节不考虑辐亮度增益.

$$
\begin{equation}
T_r(p \to p') = e^{-\int_0^d \sigma_t(p + t\omega, \omega)dt}
\end{equation}
$$

根据光线的传播过程可知透射率是可逆的.

$$
\begin{equation}
T_r(p \to p')=T_r(p' \to p)
\end{equation}
$$

透射率可以被分解, 这是积分的性质决定的.

$$
\begin{equation}
T_r(p \to p'')=T_r(p \to p')T_r(p' \to p'')
\end{equation}
$$

衰减系数的积分被称为光学厚度. 根据Jensen不等式可知, \\(E[e^{-X}] \ne e^{-E[X]}\\), 因此通过在积分路径上抽样进行Monte Carlo积分是有偏估计.

$$
\begin{equation}
\tau(p \to p')=\int_0^d \sigma_t(p+t\omega,\omega)dt
\end{equation}
$$

路径追踪任务是光线传播的逆过程, 因此\\(-dL(p)=-\sigma_t(p,\omega)L(p)dt\\). pbrt中下列公式都是由这一条件推导出的, 但是并没有注明, 因此尝试推导时会得到相反的结论, 具体推导过程见[Integral formulations of volumetric transmittance](https://dl.acm.org/doi/pdf/10.1145/3355089.3356559).

根据微分方程可以得到\\(L(p,\omega)-L(p+d\omega,\omega)=\int_0^d -\sigma_t(p+t\omega)L(p+t\omega,\omega)dt\\), 已知\\(T_r(p \leftarrow p + d\omega)=\frac{L(p,\omega)}{L(p + d\omega,\omega)}\\), 代入前式可以得到以下积分. 此时可以通过Monte Carlo得到透射率的无偏估计, 但较为复杂.

$$
\begin{equation}
T_r(p \leftarrow p + d\omega)=1 - \int_0^d \sigma_t(p+t\omega)T_r(p + t\omega \leftarrow p+d\omega)dt
\end{equation}
$$

### 空散射

定义一个\\(\sigma_{\text{maj}}\\)作为主衰减系数(为减小方差, pbrt将其设置为大于等于任意一处的衰减系数), 此时可以定义空散射(null-scattering)系数, 由此可得\\(\sigma_{\text{maj}}=\sigma_a(p,\omega)+\sigma_s(p,\omega)+\sigma_n(p,\omega)\\)在介质中为常数.

$$
\begin{equation}
\sigma_n(p,\omega)=\sigma_{\text{maj}}-\sigma_t(p,\omega)
\end{equation}
$$

此时已知\\(-\frac{dL(p,\omega)}{dt}+\sigma_{\text{maj}}(p,\omega)L(p,\omega)=\sigma_n(p,\omega)L(p,\omega)\\), 令\\(h(t)=e^{-\int_0^t \sigma_{\text{maj}} dt}\\), \\(g(t)=\sigma_n(p+t\omega,\omega)L(p+t\omega,\omega)\\), 根据\\(\frac{dh(t)}{dt}=-h(t)\sigma_{\text{maj}}\\), 微分方程两边同乘\\(h(t)\\)可得\\(-h(t)\frac{dL(p+t\omega,\omega)}{dt}-L(p+t\omega,\omega)\frac{h(t)}{dt}=h(t)g(t)\\), 在路径上积分可得\\(h(0)L(p,\omega)-h(d)L(p+d\omega,\omega)=\int_0^d h(t)g(t)dt\\), 两边同除\\(h(0)L(p+d\omega,\omega)\\)后可得下式.

$$
\begin{equation}
\begin{aligned}
T_r(p \leftarrow p+d\omega)
&=\frac{h(d)}{h(0)}+\int_0^d \frac{h(t)g(t)}{h(0){L(p+d\omega,\omega)}}\\\\
&=e^{-\sigma_\text{maj}d}+\int_0^d e^{-\sigma_\text{maj}t}\sigma_n(p+t\omega,\omega)T_r(p+t\omega \leftarrow p+d\omega)dt
\end{aligned}
\end{equation}
$$

计算上式的Monte Carlo需要使用一个与积分项成比例的分布, pbrt使用\\(p_{\text{maj}}(t) \propto e^{-\sigma_{\text{maj}}}\\), 归一化后得到以下PDF.

$$
\begin{equation}
p_{\text{maj}}(t)=\sigma_{\text{maj}}e^{-\sigma_{\text{maj}}}
\end{equation}
$$

将积分项视为\\(t' \ge d\\)时为0的分段函数, Monte Carlo采样可以得到如下结果, 这被称为下一跳(next-flight)估计器, \\(t' \ge d\\)时停止递归采样过程. 在均匀介质下这是无偏的, 不均匀介质下效果一般.

$$
\begin{equation}
T_r(p \leftarrow p+d\omega) \approx e^{-\sigma_{\text{maj}d}}+
\begin{cases}
\frac{\sigma_n(p+t'\omega)}{\sigma_{\text{maj}}}T_r(p+t'\omega \leftarrow p+d\omega) & t'<d\\\\
0 & \text{otherwise}
\end{cases}
\end{equation}
$$

随机选取其中一项也可以进行Monte Carlo, 由于CDF具有\\(P(t' \ge d)=e^{-\sigma_{\text{maj}}d}\\)的性质, 可以将该值作为选择概率. 注意到下一跳估计器中是在\\((0,\infty)\\)上的积分, 而这里是在\\((0,d)\\)上的积分, 因此需要通过除以\\(1-e^{-\sigma_{\text{maj}}d}\\)来归一化. 此时可以得到比率跟踪(ratio-tracking)估计器, 这是pbrt采用的算法.

$$
\begin{equation}
\begin{aligned}
T_r(p \leftarrow p+d\omega)
&\approx
\begin{cases}
\frac{e^{-\sigma_{\text{maj}}d}}{p_e} & \text{with}\ \text{probability}\ p_e\\\\
\frac{1}{1-p_e}\int_0^d e^{-\sigma_{\text{maj}}t}\sigma_n(p+t\omega,\omega)T_r(p+t\omega \leftarrow p+d\omega)dt & \text{otherwise}
\end{cases}\\\\
&\approx
\begin{cases}
1 & t' > d\\\\
\frac{\sigma_n(p+t'\omega,\omega)}{\sigma_{\text{maj}}}T_r(p+t'\omega \leftarrow p+d\omega) & \text{otherwise}
\end{cases}\\\\
&\approx
\prod_{i=1}^n \frac{\sigma_n(p+t_i\omega,\omega)}{\sigma_{\text{maj}}}
\end{aligned}
\end{equation}
$$

比率跟踪估计器在透射率已经很小时仍然会继续采样, 可以通过俄罗斯轮盘解决该问题, 将俄罗斯轮盘概率设置为\\(\frac{\sigma_n(p+t'\omega,\omega)}{\sigma_{\text{maj}}d}\\)可以将其抵消, 这被称为差值跟踪(delta-tracking)估计器.

$$
\begin{equation}
\begin{aligned}
T_r(p \leftarrow p+d\omega)&\approx
\begin{cases}
1 & t' > d\\\\
T_r(p+t'\omega \leftarrow p+d\omega) & t' \le d\ \text{and}\ \text{with}\ \text{probability}\ \frac{\sigma_n(p+t'\omega,\omega)}{\sigma_{\text{maj}}}\\\\
0 & \text{otherwise}
\end{cases}
\end{aligned}
\end{equation}
$$

## 相位函数

只与入射方向和出射方向的夹角有关的相位函数被称为对称相位函数, 否则就是需要用四个维度表示的非对称相位函数. 各个方向均匀分布的相位函数为各向同性相位函数, 只有\\(p(\omega_i,\omega_o)=\frac{1}{\int_0^{2\pi}\int_0^\pi \sin\theta d\theta d\phi}=\frac{1}{4\pi}\\)满足该条件, 否则为各向异性.

pbrt的相位函数定义在`PhaseFunction`中, 目前只有`HGPhaseFunction`一种实现.

```c++
class PhaseFunction : public TaggedPointer<HGPhaseFunction> {
  public:
    // PhaseFunction Interface
    using TaggedPointer::TaggedPointer;

    std::string ToString() const;

    PBRT_CPU_GPU inline Float p(Vector3f wo, Vector3f wi) const;

    PBRT_CPU_GPU inline pstd::optional<PhaseFunctionSample> Sample_p(Vector3f wo,
                                                                     Point2f u) const;

    PBRT_CPU_GPU inline Float PDF(Vector3f wo, Vector3f wi) const;
};
```

### Henyey–Greenstein相位函数

Henyey-Greenstein相位函数来自于对测量散射数据的拟合, 其形式如下. 原文中\\(\cos\theta\\)符号为负, 由于pbrt中入射光线朝外, 这里符号设置为正.

$$
\begin{equation}
p_{HG}(\cos\theta)=\frac{1}{4\pi}\frac{1-g^2}{(1+g^2+2g\cos\theta)^{\frac{3}{2}}}
\end{equation}
$$

Henyey-Greenstein中的\\(g\\)为非对称系数, 它来自于某种相位函数的积分, 这使得任意的相位函数都可以被转为Henyey-Greenstein相位函数. g位于\\((-1,1)\\)中, 接近\\(1\\)时\\(\omega\\)附近的分布密度较大, 接近\\(-1\\)时\\(-\omega\\)附近分布密度较大.

$$
\begin{equation}
g=\int_\Theta p(-\omega\cdot\omega')(\omega\cdot\omega')d\omega'=2\pi\int_0^\pi p(-\cos\theta)\cos\theta\sin\theta d\theta
\end{equation}
$$

逆变换法得到的\\(\cos\theta\\)如下, \\(\epsilon\\)为服从均匀分布的随机变量.

$$
\begin{equation}
\begin{aligned}
\cos\theta=
\begin{cases}
-\frac{1}{2g}(1+g^2-(\frac{1-g^2}{1+g-2g\epsilon})^2) & g \ne 0\\\\
1-2\epsilon & g=0
\end{cases}
\end{aligned}
\end{equation}
$$

## 介质

`Medium`类定义介质, `NanoVDBMedium`这一派生类用于NanoVDB格式的介质, 本节不讨论第三方API的调用.

```c++
class Medium
    : public TaggedPointer<  // Medium Types
          HomogeneousMedium, GridMedium, RGBGridMedium, CloudMedium, NanoVDBMedium

          > {
  public:
    // Medium Interface
    using TaggedPointer::TaggedPointer;

    static Medium Create(const std::string &name, const ParameterDictionary &parameters,
                         const Transform &renderFromMedium, const FileLoc *loc,
                         Allocator alloc);

    std::string ToString() const;

    PBRT_CPU_GPU
    bool IsEmissive() const;

    PBRT_CPU_GPU
    MediumProperties SamplePoint(Point3f p, const SampledWavelengths &lambda) const;

    // Medium Public Methods
    RayMajorantIterator SampleRay(Ray ray, Float tMax, const SampledWavelengths &lambda,
                                  ScratchBuffer &buf) const;
};
```

`SamplePoint`返回介质在空间中某个点处的性质.

```c++
struct MediumProperties {
    SampledSpectrum sigma_a, sigma_s;
    PhaseFunction phase;
    SampledSpectrum Le;
};
```

`SampleRay`返回多个`RayMajorantSegment`, 用于存储每一段的\\(\sigma_{\text{maj}}\\). `RayMajorantIterator`可以每次只返回一段, 减小内存开销.

```c++
struct RayMajorantSegment {
    Float tMin, tMax;
    SampledSpectrum sigma_maj;
};
```

pbrt通过在各个类中组合`Medium`对象来表示当前介质, 例如`Camera`中的介质表示相机当前所处位置的介质, `Light`中的介质初始化时与相机的介质相同, 随着路径追踪的推进而修改. 若介质为空指针则代表位于真空中.

pbrt通过`Primitive`表示介质的边界, 它会存储`MediumInterface`用于表示图元两侧的介质. pbrt不会检查介质是否有效, 例如将相机的介质设置为与实际所处的`Primitive`的某一侧的介质不同是被允许的. 实际只有透明物体需要在相交时将`MediumInterface`传入`SurfaceInteraction`.

```c++
struct MediumInterface {
    // ...

    // MediumInterface Public Members
    Medium inside, outside;
};
```

pbrt中类似云的介质也需要一个`Primitive`来表示范围, 但是并不会改变光线传播路径. 这可以通过将BSDF设置为两侧IOR相同的完美透射实现, 但为了降低复杂度, pbrt通过将材质设置为空指针来表示不改变光线路径.

### 均匀介质

介质中\\(\sigma_a\\), \\(\sigma_s\\), \\(L_e\\)处处相等的介质为均匀介质, pbrt中用`HomogeneousMedium`表示.

```c++
class HomogeneousMedium {
  public:
    // HomogeneousMedium Public Type Definitions
    using MajorantIterator = HomogeneousMajorantIterator;

    // ...

  private:
    // HomogeneousMedium Private Data
    DenselySampledSpectrum sigma_a_spec, sigma_s_spec, Le_spec;
    HGPhaseFunction phase;
};
```

均匀介质不需要进行空散射, 因此`HomogeneousMajorantIterator`只存储一段`RayMajorantSegment`.

```c++
PBRT_CPU_GPU
pstd::optional<RayMajorantSegment> Next() {
    if (called)
        return {};
    called = true;
    return seg;
}
```

### DDA主值迭代器

为保证平均自由程不会过大, 不均匀介质需要分段的\\(\sigma_{\text{maj}}\\)来更好的拟合介质分布, 因此其余的介质类都将每段存储在网格中, 光线被它所经过的网格分割.

```c++
struct MajorantGrid {
    // ...

    // MajorantGrid Public Members
    Bounds3f bounds;
    pstd::vector<Float> voxels;
    Point3i res;
};
```

类似于数字微分分析器(digital differential analyzer, DDA)画线算法, pbrt通过`DDAMajorantIterator`来迭代当前所经过的网格.

```c++
PBRT_CPU_GPU
pstd::optional<RayMajorantSegment> Next() {
    if (tMin >= tMax)
        return {};
    // Find _stepAxis_ for stepping to next voxel and exit point _tVoxelExit_
    int bits = ((nextCrossingT[0] < nextCrossingT[1]) << 2) +
                ((nextCrossingT[0] < nextCrossingT[2]) << 1) +
                ((nextCrossingT[1] < nextCrossingT[2]));
    const int cmpToAxis[8] = {2, 1, 2, 1, 2, 2, 0, 0};
    int stepAxis = cmpToAxis[bits];
    Float tVoxelExit = std::min(tMax, nextCrossingT[stepAxis]);

    // Get _maxDensity_ for current voxel and initialize _RayMajorantSegment_, _seg_
    SampledSpectrum sigma_maj = sigma_t * grid->Lookup(voxel[0], voxel[1], voxel[2]);
    RayMajorantSegment seg{tMin, tVoxelExit, sigma_maj};

    // Advance to next voxel in maximum density grid
    tMin = tVoxelExit;
    if (nextCrossingT[stepAxis] > tMax)
        tMin = tMax;
    voxel[stepAxis] += step[stepAxis];
    if (voxel[stepAxis] == voxelLimit[stepAxis])
        tMin = tMax;
    nextCrossingT[stepAxis] += deltaT[stepAxis];

    return seg;
}
```

### 网格介质

pbrt通过`GridMedium`表示网格介质. 网格介质中的\\(\sigma_a\\)和\\(\sigma_s\\)是确定的, 通过`SampledGrid`在不通位置对其施加缩放, \\(sigma_{\text{maj}}\\)也通过记录当前网格的最大缩放系数来实现.

```c++
for (int z = 0; z < majorantGrid.res.z; ++z)
    for (int y = 0; y < majorantGrid.res.y; ++y)
        for (int x = 0; x < majorantGrid.res.x; ++x) {
            Bounds3f bounds = majorantGrid.VoxelBounds(x, y, z);
            majorantGrid.Set(x, y, z, densityGrid.MaxValue(bounds));
        }
```

自发光有两种实现方式, 第一种为设置空间上各个位置的色温, 第二种为设置\\(L_e\\)以及各个位置的缩放系数.

```c++
pstd::optional<SampledGrid<Float>> temperatureGrid;
DenselySampledSpectrum Le_spec;
SampledGrid<Float> LeScale;
```

### RGB网格介质

`RGBGridMedium`通过RGB网格存储介质信息. 选取区域内的`RGB`的最大值后转为`RGBUnboundedSpectrum`, 然后取最大值作为主值, 这样的结果与直接取区域内`RGBUnboundedSpectrum`的最大值是不同的, 因此pbrt采用`RGBUnboundedSpectrum`类型而非`RGB`类型的网格.

```c++
class RGBGridMedium {
  public:
    // RGBGridMedium Public Type Definitions
    using MajorantIterator = DDAMajorantIterator;

    // ...

  private:
    // RGBGridMedium Private Members
    Bounds3f bounds;
    Transform renderFromMedium;
    pstd::optional<SampledGrid<RGBIlluminantSpectrum>> LeGrid;
    Float LeScale;
    HGPhaseFunction phase;
    pstd::optional<SampledGrid<RGBUnboundedSpectrum>> sigma_aGrid, sigma_sGrid;
    Float sigmaScale;
    MajorantGrid majorantGrid;
};
```

主值通过取区域内各个点的分布中的最大值实现. `RGBUnboundedSpectrum`本身不支持比较, 因此通过传入lambda函数`max`来将其转为`float`.

```c++
for (int z = 0; z < majorantGrid.res.z; ++z)
        for (int y = 0; y < majorantGrid.res.y; ++y)
            for (int x = 0; x < majorantGrid.res.x; ++x) {
                Bounds3f bounds = majorantGrid.VoxelBounds(x, y, z);
                // Initialize _majorantGrid_ voxel for RGB $\sigmaa$ and $\sigmas$
                auto max = [] PBRT_CPU_GPU(RGBUnboundedSpectrum s) {
                    return s.MaxValue();
                };
                Float maxSigma_t =
                    (sigma_aGrid ? sigma_aGrid->MaxValue(bounds, max) : 1) +
                    (sigma_sGrid ? sigma_sGrid->MaxValue(bounds, max) : 1);
                majorantGrid.Set(x, y, z, sigmaScale * maxSigma_t);
            }
```

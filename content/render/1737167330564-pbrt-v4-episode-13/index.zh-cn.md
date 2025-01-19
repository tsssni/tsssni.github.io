---
title: "pbrt-v4 Ep. XIII: 光线传播: 表面反射"
date: 2025-01-18
draft: false
description: "pbrt-v4 episode 12"
tags: ["graphics", "rendering", "pbrt"]
---

{{< katex >}}

## 光线传播方程

光线传播方程(light transport equation, LTE)描述场景中的辐亮度分布. 本章不考虑介质, 下一章再介绍.

### 基础推导

pbrt中的LTE不考虑波动光学, 并认为场景中的辐亮度分布是守恒的. LTE的核心是能量守恒, 离开系统与进入系统的能量的差值和发出与吸收的能量的差值是相等的. 令\\(t(p,\omega)\\)为光线投射方程, 代表从\\(p\\)点出发方向为\\(\omega\\)的光线的第一个相交点, 此时空间中任意一点的辐亮度可以按如下方式表示.

$$
\begin{equation}
L(p,\omega_o)=L_e(p,\omega_o)+\int_\Theta f(p,\omega_o,\omega_i)L(t(p,\omega_i),-\omega_i)|\cos\theta_i| d\omega_i
\end{equation}
$$

### LTE解析式

只有较为简单的LTE才具有解析形式, 例如场景中辐亮度处处相等, 且表面都为Lambertian BRDF.

### LTE表面形式

LTE的复杂度部分原因为光线投射方程只能隐式表达场景中几何物体的关系, pbrt通过过将LTE的积分转为面积上的积分来显示表达几何物体的分布. 令\\(L(p' \to p)=L(p',\omega)\\), \\(f(p'' \to p' \to p)=f(p',\omega_o,\omega_i)\\), 根据立体角转面积的Jacobian行列式, 可以得到如下LTE. 其中\\(V\\)为可见性方程, 两点互相可见为1, 否则为0, 这可以通过追踪光线获取.

$$
\begin{equation}
\begin{aligned}
L(p' \to p)
&=L_e(p' \to p) + \int_A f(p'' \to p' \to p)L(p'' \to p')V(p \longleftrightarrow p')\frac{|\cos\theta||\cos\theta'|}{\Vert p-p' \Vert^2}dA(p'')\\\\
&=L_e(p' \to p) + \int_A f(p'' \to p' \to p)L(p'' \to p')G(p \longleftrightarrow p')dA(p'')\\\\
\end{aligned}
\end{equation}
$$

### 路径积分

所有具有\\(n+1\\)个顶点的光线传播路径的积分如下, T为路径通量.

$$
\begin{equation}
\begin{aligned}
P(\bar{p}_n)
&=\underbrace{\int_A\int_A\cdots\int_A}\_{n-1} L_e(p_n \to p\_{n-1})(\prod\_{i=1}^{n-1} f(p\_{i+1} \to p_i \to p\_{i-1})G(p\_{i+1} \longleftrightarrow p_i))dA(p_2) \cdots dA(p_n)\\\\
&=\underbrace{\int_A\int_A\cdots\int_A}\_{n-1} L_e(p_n \to p\_{n-1})T(\bar{p}_n)dA(p_2) \cdots dA(p_n)
\end{aligned}
\end{equation}
$$

此时路径追踪的统计结果如下.

$$
\begin{equation}
L(p_1 \to p_0) \approx \sum_{n=1}^\infty \frac{P(\bar{p}_n)}{p(\bar{p}_n)}
\end{equation}
$$

### 被积函数中的Delta分布

部分光源与BSDF是Delta分布, 此时可以将积分转为解析式.

### 被积函数分解

分解后的积分可以根据对渲染结果的影响使用不同精度的积分方法, 例如直接光照与间接光照的分解, 小光源与大光源的分解, 以及BSDF中Delta项与非Delta项的分解.

## 路径追踪

路径追踪(path tracing)与Kajiya渲染方程在同一篇论文中被提出, pbrt将使用路径积分形式.

### 概述

由于能量守恒, 反射次数越多的光线散射的光线越少, 通过在路径的每个顶点执行俄罗斯轮盘可以有效的执行这一过程.

### 路径采样

根据物体的面积分配概率, 然后采样多个点形成光路, 显然这样采样出的路径极有可能由于遮挡等原因而无效, 方差较高.

### 增量路径构造

在每次到达顶点时根据BSDF选择下一个顶点所在的方向可以有效的构造光线路径, 其形式如下. 注意到由于光线已经沿着之前的路径传播到当前点, 因此都是可见的, 不需要再加上可见性方程.

$$
\begin{equation}
P(\bar{p}_i)\approx\frac{L_e(p_i \to p\_{i-1})f(p_i \to p\_{i-1} \to p\_{i-2})G(p_i \longleftrightarrow p\_{i-1})}{p_e(p_i)}(\prod\_{j=1}^{i-2}\frac{f(p\_{j+1} \to p_j \to p\_{j-1})|\cos\theta_j|}{p\_\omega(\omega_j)})
\end{equation}
$$

## 简单路径积分器

`SimplePathIntegrator`定义如下, `maxDepth`设置最大路径顶点数, 若`sampleLights`和`sampleBSDF`为`true`则会根据它们的概率分布来采样.

```c++
class SimplePathIntegrator : public RayIntegrator {
  public:
    // SimplePathIntegrator Public Methods
    SimplePathIntegrator(int maxDepth, bool sampleLights, bool sampleBSDF, Camera camera,
                         Sampler sampler, Primitive aggregate, std::vector<Light> lights);

    SampledSpectrum Li(RayDifferential ray, SampledWavelengths &lambda, Sampler sampler,
                       ScratchBuffer &scratchBuffer,
                       VisibleSurface *visibleSurface) const;

    static std::unique_ptr<SimplePathIntegrator> Create(
        const ParameterDictionary &parameters, Camera camera, Sampler sampler,
        Primitive aggregate, std::vector<Light> lights, const FileLoc *loc);

    std::string ToString() const;

  private:
    // SimplePathIntegrator Private Members
    int maxDepth;
    bool sampleLights, sampleBSDF;
    UniformLightSampler lightSampler;
};
```

路径传播过程中会记录路径通量权重, 每次到达新顶点都会更新, 其定义如下. \\(beta\\)中包含了历史顶点的信息, 因此只有当前顶点的状态需要被记录.

$$
\begin{equation}
\beta = \prod\_{j=1}^{i-2}\frac{f(p\_{j+1} \to p_j \to p\_{j-1})|\cos\theta_j|}{p\_\omega(\omega_j)}
\end{equation}
$$

判断光线是否与物体相交.

```c++
// Find next _SimplePathIntegrator_ vertex and accumulate contribution
// Intersect _ray_ with scene
pstd::optional<ShapeIntersection> si = Intersect(ray);
```

若不采样光线, pbrt不会计算直接光照, 只会在光线刚好与光源相交时添加光照. 没有与表面相交时获取环境光源, 否则获取表面的自发光. 注意到这里会考虑上一个相交点是镜面反射的情况, 因为此时光线的传播路径是确定的, 无法采样光源.

```c++
// Account for infinite lights if ray has no intersection
if (!si) {
    if (!sampleLights || specularBounce)
        for (const auto &light : infiniteLights)
            L += beta * light.Le(ray, lambda);
    break;
}

// Account for emissive surface if light was not sampled
SurfaceInteraction &isect = si->intr;
if (!sampleLights || specularBounce)
    L += beta * isect.Le(-ray.d, lambda);
```

相交判断完成后会根据`maxDepth`决定是否退出路径追踪.

```c++
// End path if maximum depth reached
if (depth++ == maxDepth)
    break;
```

若得到了未设置的BSDF, 这代表与介质分界面相交, 光线应该按照当前路径继续传播.

```c++
// Get BSDF and skip over medium boundaries
BSDF bsdf = isect.GetBSDF(ray, lambda, camera, scratchBuffer, sampler);
if (!bsdf) {
    specularBounce = true;
    isect.SkipIntersection(&ray, si->tHit);
    continue;
}
```

若`sampleLights`为`true`, 此时摄像机接收到的直接光照的表达式如下, \\(p_l(\omega_i)\\)为当前光源采样到当前入射方向的概率, \\(p(l)\\)为积分器采样到当前光源的概率.

$$
\begin{equation}
P(\bar{p}_i)=\frac{L_e(p_i \to p\_{i-1})f(p_i \to p\_{i-1} \to p\_{i-2})|\cos\theta_i|V(p_i \longleftrightarrow p\_{i-1})}{p_l(\omega_i)p(l)}\beta
\end{equation}
$$

直接光源的采样过程如下, 通过`Unoccluded`判断光源是否被遮挡.

```c++
// Sample direct illumination if _sampleLights_ is true
Vector3f wo = -ray.d;
if (sampleLights) {
    pstd::optional<SampledLight> sampledLight =
        lightSampler.Sample(sampler.Get1D());
    if (sampledLight) {
        // Sample point on _sampledLight_ to estimate direct illumination
        Point2f uLight = sampler.Get2D();
        pstd::optional<LightLiSample> ls =
            sampledLight->light.SampleLi(isect, uLight, lambda);
        if (ls && ls->L && ls->pdf > 0) {
            // Evaluate BSDF for light and possibly add scattered radiance
            Vector3f wi = ls->wi;
            SampledSpectrum f = bsdf.f(wo, wi) * AbsDot(wi, isect.shading.n);
            if (f && Unoccluded(isect, ls->pLight))
                L += beta * f * ls->L / (sampledLight->p * ls->pdf);
        }
    }
}
```

若`sampleBSDF`为`true`则采样BSDF.

```c++
// Sample BSDF for new path direction
Float u = sampler.Get1D();
pstd::optional<BSDFSample> bs = bsdf.Sample_f(wo, u, sampler.Get2D());
if (!bs)
    break;
beta *= bs->f * AbsDot(bs->wi, isect.shading.n) / bs->pdf;
specularBounce = bs->IsSpecular();
ray = isect.SpawnRay(bs->wi);

```

否则均匀采样入射方向, 保证不折射的表面不会采样到朝向表面内侧的方向.

```c++
// Uniformly sample sphere or hemisphere to get new path direction
Float pdf;
Vector3f wi;
BxDFFlags flags = bsdf.Flags();
if (IsReflective(flags) && IsTransmissive(flags)) {
    wi = SampleUniformSphere(sampler.Get2D());
    pdf = UniformSpherePDF();
} else {
    wi = SampleUniformHemisphere(sampler.Get2D());
    pdf = UniformHemispherePDF();
    if (IsReflective(flags) && Dot(wo, isect.n) * Dot(wi, isect.n) < 0)
        wi = -wi;
    else if (IsTransmissive(flags) && Dot(wo, isect.n) * Dot(wi, isect.n) > 0)
        wi = -wi;
}
beta *= bsdf.f(wo, wi) * AbsDot(wi, isect.shading.n) / pdf;
specularBounce = false;
ray = isect.SpawnRay(wi);
```

## 路径积分器

`PathIntegrator`中使用了更多的优化算法, 例如直接光照的MIS, 光源采样使用`BVHLightSampler`, 俄罗斯轮盘停止光线传播, 以及路径正则化等算法.

由于根据BSDF采样传播方向可能导致无法与光源相交, 根据光源采样的直接光照似乎效率更高. 但这也有例外, 例如对于光滑表面可能有效的传播方向只有很小的一个范围, 光源不一定在这个范围中, 或者位于一个PDF很小的方向, 这会导致较大的方差. 这种有多种采样方式且不同情况下它们的效率不同的情况, 需要使用之前章节介绍的MIS, 其形式如下.

$$
\begin{equation}
\begin{aligned}
P(\bar{p}_i)\approx
&w_l(\omega_l)\frac{L_e(p_l \to p\_{i-1})f(p_l \to p\_{i-1} \to p\_{i-2})|\cos\theta_l|V(p_l \longleftrightarrow p\_{i-1})}{p_l(\omega_l)}\beta +\\\\
&w_b(\omega_b)\frac{L_e(p_b \to p\_{i-1})f(p_b \to p\_{i-1} \to p\_{i-2})|\cos\theta_l|V(p_b \longleftrightarrow p\_{i-1})}{p_b(\omega_b)}\beta
\end{aligned}
\end{equation}
$$

`PathIntegrator`定义如下, 可见与`SimplePathIntegrator`相比这里不再支持关闭直接光照与BSDF采样, `lightSampler`可以为任意类型, 支持通过`regularize`设置路径正则化.

```c++
class PathIntegrator : public RayIntegrator {
  public:
    // PathIntegrator Public Methods
    PathIntegrator(int maxDepth, Camera camera, Sampler sampler, Primitive aggregate,
                   std::vector<Light> lights,
                   const std::string &lightSampleStrategy = "bvh",
                   bool regularize = false);

    SampledSpectrum Li(RayDifferential ray, SampledWavelengths &lambda, Sampler sampler,
                       ScratchBuffer &scratchBuffer,
                       VisibleSurface *visibleSurface) const;

    static std::unique_ptr<PathIntegrator> Create(const ParameterDictionary &parameters,
                                                  Camera camera, Sampler sampler,
                                                  Primitive aggregate,
                                                  std::vector<Light> lights,
                                                  const FileLoc *loc);

    std::string ToString() const;

  private:
    // PathIntegrator Private Methods
    SampledSpectrum SampleLd(const SurfaceInteraction &intr, const BSDF *bsdf,
                             SampledWavelengths &lambda, Sampler sampler) const;

    // PathIntegrator Private Members
    int maxDepth;
    LightSampler lightSampler;
    bool regularize;
};
```

若`Film`需要`VisibleSurface`, 在第一次相交时pbrt会提供其信息, 通过Owen扰动的Halton样本生成低差异性序列以计算半球-方向反射量, 即反照率, 这会用于图像空间降噪.

```c++
// Initialize _visibleSurf_ at first intersection
if (depth == 0 && visibleSurf) {
    // Estimate BSDF's albedo
    // Define sample arrays _ucRho_ and _uRho_ for reflectance estimate
    constexpr int nRhoSamples = 16;
    const Float ucRho[nRhoSamples] = {
        0.75741637, 0.37870818, 0.7083487, 0.18935409, 0.9149363, 0.35417435,
        0.5990858,  0.09467703, 0.8578725, 0.45746812, 0.686759,  0.17708716,
        0.9674518,  0.2995429,  0.5083201, 0.047338516};
    const Point2f uRho[nRhoSamples] = {
        Point2f(0.855985, 0.570367), Point2f(0.381823, 0.851844),
        Point2f(0.285328, 0.764262), Point2f(0.733380, 0.114073),
        Point2f(0.542663, 0.344465), Point2f(0.127274, 0.414848),
        Point2f(0.964700, 0.947162), Point2f(0.594089, 0.643463),
        Point2f(0.095109, 0.170369), Point2f(0.825444, 0.263359),
        Point2f(0.429467, 0.454469), Point2f(0.244460, 0.816459),
        Point2f(0.756135, 0.731258), Point2f(0.516165, 0.152852),
        Point2f(0.180888, 0.214174), Point2f(0.898579, 0.503897)};

    SampledSpectrum albedo = bsdf.rho(isect.wo, ucRho, uRho);

    *visibleSurf = VisibleSurface(isect, albedo, lambda);
}
```

`SampleLd`负责直接光照的采样, 若为镜面反射采样则不需要采样光源.

```c++
// Sample direct illumination from the light sources
if (IsNonSpecular(bsdf.Flags())) {
    ++totalPaths;
    SampledSpectrum Ld = SampleLd(isect, &bsdf, lambda, sampler);
    if (!Ld)
        ++zeroRadiancePaths;
    L += beta * Ld;
}
```

`SampleLd`时, 若表面为纯反射或折射表面, 计算入射光线的参考点会做相应的偏移, 使得反射时位于面外, 折射时位于面内.

```c++
if (IsReflective(flags) && !IsTransmissive(flags))
    ctx.pi = intr.OffsetRayOrigin(intr.wo);
else if (IsTransmissive(flags) && !IsReflective(flags))
    ctx.pi = intr.OffsetRayOrigin(-intr.wo);
```

通过`sampler`生成采样光源与入射方向所需的随机变量.

```c++
Float u = sampler.Get1D();
pstd::optional<SampledLight> sampledLight = lightSampler.Sample(ctx, u);
Point2f uLight = sampler.Get2D();
if (!sampledLight) return {};
```

跳过无效以及被遮挡的光源.

```c++
// Sample a point on the light source for direct lighting
Light light = sampledLight->light;
DCHECK(light && sampledLight->p > 0);
pstd::optional<LightLiSample> ls = light.SampleLi(ctx, uLight, lambda, true);
if (!ls || !ls->L || ls->pdf == 0)
    return {};

// Evaluate BSDF for light sample and check light visibility
Vector3f wo = intr.wo, wi = ls->wi;
SampledSpectrum f = bsdf->f(wo, wi) * AbsDot(wi, intr.shading.n);
if (!f || !Unoccluded(intr, ls->pLight))
    return {};
```

Delta光源无需采样, 直接计算即可, 否则执行MIS.

```c++
Float p_l = sampledLight->p * ls->pdf;
if (IsDeltaLight(light.Type()))
    return ls->L * f / p_l;
else {
    Float p_b = bsdf->PDF(wo, wi);
    Float w_l = PowerHeuristic(1, p_l, 1, p_b);
    return w_l * ls->L * f  / p_l;
}
```

直接光照完成后采样BSDF并生成路径, `etaScale`为在折射时由于两侧介质不同导致BTDF需要缩放, 反射模型章节有介绍.

```c++
// Sample BSDF to get new path direction
Vector3f wo = -ray.d;
Float u = sampler.Get1D();
pstd::optional<BSDFSample> bs = bsdf.Sample_f(wo, u, sampler.Get2D());
if (!bs)
    break;
// Update path state variables after surface scattering
beta *= bs->f * AbsDot(bs->wi, isect.shading.n) / bs->pdf;
p_b = bs->pdfIsProportional ? bsdf.PDF(wo, bs->wi) : bs->pdf;
DCHECK(!IsInf(beta.y(lambda)));
specularBounce = bs->IsSpecular();
anyNonSpecularBounces |= !bs->IsSpecular();
if (bs->IsTransmission())
    etaScale *= Sqr(bs->eta);
prevIntrCtx = si->intr;

ray = isect.SpawnRay(ray, bsdf, bs->wi, bs->flags, bs->eta);
```

相交时若相交失败则使用环境光, 否则使用相交表面的自发光. 第一次相交或镜面反射的情况不需要MIS, 反之则加上BSDF采样对应的MIS权重.

```c++
// Trace ray and find closest path vertex and its BSDF
pstd::optional<ShapeIntersection> si = Intersect(ray);
// Add emitted light at intersection point or from the environment
if (!si) {
    // Incorporate emission from infinite lights for escaped ray
    for (const auto &light : infiniteLights) {
        SampledSpectrum Le = light.Le(ray, lambda);
        if (depth == 0 || specularBounce)
            L += beta * Le;
        else {
            // Compute MIS weight for infinite light
            Float p_l = lightSampler.PMF(prevIntrCtx, light) *
                        light.PDF_Li(prevIntrCtx, ray.d, true);
            Float w_b = PowerHeuristic(1, p_b, 1, p_l);

            L += beta * w_b * Le;
        }
    }

    break;
}
// Incorporate emission from surface hit by ray
SampledSpectrum Le = si->intr.Le(-ray.d, lambda);
if (Le) {
    if (depth == 0 || specularBounce)
        L += beta * Le;
    else {
        // Compute MIS weight for area light
        Light areaLight(si->intr.areaLight);
        Float p_l = lightSampler.PMF(prevIntrCtx, areaLight) *
                    areaLight.PDF_Li(prevIntrCtx, ray.d, true);
        Float w_l = PowerHeuristic(1, p_b, 1, p_l);

        L += beta * w_l * Le;
    }
}
```

俄罗斯轮盘的概率选择方式会极大的影响渲染效果, pbrt会将路径通量权重作为俄罗斯轮盘的概率, 同时通过`etaScale`抵消折射对\\(\beta\\)的影响, 因为如果光线进入物体后又从当前介质中离开, 折射导致的\\(\beta\\)的减小会由于连续的介质变化而被抵消, 如果由于折射导致\\(\beta\\)过小很难再次离开物体会影响渲染效果. 同时pbrt会选用采样波长中的最大\\(\beta\\), 在高饱和度即部分波长的\\(\beta\\)远小于其他波长的\\(\beta\\)的情况下, 这可以有效阻止由于俄罗斯轮盘导致某一个波长的\\(\beta\\)大于\\(1\\), 因为如果采用平均值而非最大值的话无法判断\\(\beta\\)的某一项大于\\(1\\).

```c++
// Possibly terminate the path with Russian roulette
SampledSpectrum rrBeta = beta * etaScale;
if (rrBeta.MaxComponentValue() < 1 && depth > 1) {
    Float q = std::max<Float>(0, 1 - rrBeta.MaxComponentValue());
    if (sampler.Get1D() < q)
        break;
    beta /= 1 - q;
    DCHECK(!IsInf(beta.y(lambda)));
}
```

## 路径正则化

若间接光照时相交的光源占据较小的立体角, 这会导致PDF过小从而增加方差. 模糊路径上的所有BSDF可以解决该问题, 但也会使得渲染出的场景整体更加粗糙. pbrt只在路径中出现非镜面反射时进行正则化.

```c++
if (regularize && anyNonSpecularBounces)
    bsdf.Regularize();
```

对于`DiffuseBxDF`等足够粗糙的BSDF, 正则化是不需要的, 而其他的`DieletricBxDF`和`ConductorBxDF`等情况都有可能出现接近镜面反射的情况, 这通过修改`TrowbridgeRetizDistribution`的粗糙度来实现.

```c++
void Regularize() {
    if (alpha_x < 0.3f) alpha_x = Clamp(2 * alpha_x, 0.1f, 0.3f);
    if (alpha_y < 0.3f) alpha_y = Clamp(2 * alpha_y, 0.1f, 0.3f);
}
```

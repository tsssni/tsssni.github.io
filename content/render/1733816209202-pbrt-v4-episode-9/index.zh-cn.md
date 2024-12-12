---
title: "pbrt-v4 Ep. IX: 反射模型"
date: 2024-12-10
draft: true
description: "pbrt-v4 episode 9"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

pbrt将反射分为以下四类: 漫反射, 光滑镜面反射, 完美镜面反射, 回溯反射. 反射分布方程可以被分为各向同性与各向异性的, 若将物体旋转时在各个角度上具有相同的反射结果即位各向同性, 反之则为各向异性.

## BSDF表示

pbrt中`BxDF`接口代表特性种类表面散射的实现, `BSDF`则是围绕`BxDF`指针做一层封装并提供额外功能.

### 几何设置与约定

pbrt中法线计算发生在由表面的切线, 副切线与法线组成的坐标系中, 分别与\\(x,y,z\\)轴对齐. pbrt中光线入射方向与观察方向都会被归一化并方向朝外, 法线也始终朝外. 着色所用的坐标系很可能与相交所用的不同, 这便于实现法线映射等效果.

### BxDF接口

单独的BRDF与BTDF方法都定义在`BxDF`接口中.

```c++
class BxDF
    : public TaggedPointer<DiffuseTransmissionBxDF, DiffuseBxDF, CoatedDiffuseBxDF,
                           CoatedConductorBxDF, DielectricBxDF, ThinDielectricBxDF,
                           HairBxDF, MeasuredBxDF, ConductorBxDF, NormalizedFresnelBxDF> {
  public:
    // BxDF Interface
    PBRT_CPU_GPU inline BxDFFlags Flags() const;

    using TaggedPointer::TaggedPointer;

    std::string ToString() const;

    PBRT_CPU_GPU inline SampledSpectrum f(Vector3f wo, Vector3f wi,
                                          TransportMode mode) const;

    PBRT_CPU_GPU inline pstd::optional<BSDFSample> Sample_f(
        Vector3f wo, Float uc, Point2f u, TransportMode mode = TransportMode::Radiance,
        BxDFReflTransFlags sampleFlags = BxDFReflTransFlags::All) const;

    PBRT_CPU_GPU inline Float PDF(
        Vector3f wo, Vector3f wi, TransportMode mode,
        BxDFReflTransFlags sampleFlags = BxDFReflTransFlags::All) const;

    PBRT_CPU_GPU
    SampledSpectrum rho(Vector3f wo, pstd::span<const Float> uc,
                        pstd::span<const Point2f> u2) const;
    SampledSpectrum rho(pstd::span<const Point2f> u1, pstd::span<const Float> uc2,
                        pstd::span<const Point2f> u2) const;

    PBRT_CPU_GPU inline void Regularize();
};
```

`Flags`方法用于返回上文所述的材质类型以及区分反射与透射, 部分光线传播算法会通过该返回值决定行为.

```c++
enum BxDFFlags {
    Unset = 0,
    Reflection = 1 << 0,
    Transmission = 1 << 1,
    Diffuse = 1 << 2,
    Glossy = 1 << 3,
    Specular = 1 << 4,
    // Composite _BxDFFlags_ definitions
    DiffuseReflection = Diffuse | Reflection,
    DiffuseTransmission = Diffuse | Transmission,
    GlossyReflection = Glossy | Reflection,
    GlossyTransmission = Glossy | Transmission,
    SpecularReflection = Specular | Reflection,
    SpecularTransmission = Specular | Transmission,
    All = Diffuse | Glossy | Specular | Reflection | Transmission

};
```

`BxDF`的关键方法是`f`, 它根据方向返回BxDF的值, 方向需要位于前文所述的材质的本地空间中. `BxDF`接口认为不同波长的光是被解耦的, 某个波长上的能量不会被反射到不同的波长上, 因此`f`的返回值通过`SampledSpectrum`来表达. 荧光材质会在不同的波长间重新分布能量, 需要返回\\(n \times n\\)的矩阵来表示\\(n\\)个光谱样本之间的转移. `BxDF`的构造函数以及各种方法都没有`SampledSpectrum`中具体某个波长的信息, 这是不需要的. `TransportMode`用于表示出射方向是对着相机还是对着光源, 不对称散射会用到这一特性.

```c++
PBRT_CPU_GPU inline SampledSpectrum BxDF::f(Vector3f wo, Vector3f wi, TransportMode mode) const {
    auto f = [&](auto ptr) -> SampledSpectrum { return ptr->f(wo, wi, mode); };
    return Dispatch(f);
}
```

`BxDF`还需要提供用于重要性抽样的方法, `Sample_f`用于实现这一任务. 由于光线路径是逆向构造的, 因此这里出射方向作为参数, 采样得到的入射方向. 参数中的`uc`与`u`用于实现一维与二维的采样, 通常`uc`用于选择反射或透射, `u`用于选择方向.

```c++
PBRT_CPU_GPU inline pstd::optional<BSDFSample> BxDF::Sample_f(Vector3f wo, Float uc, Point2f u,
                                                 TransportMode mode,
                                                 BxDFReflTransFlags sampleFlags) const {
    auto sample_f = [&](auto ptr) -> pstd::optional<BSDFSample> {
        return ptr->Sample_f(wo, uc, u, mode, sampleFlags);
    };
    return Dispatch(sample_f);
}
```

用户可以通过`sampleFlags`参数限制采样结果为透射或反射, 像在不透明表面采样透射样本的不合法采样会导致采样失效.

```c++
enum class BxDFReflTransFlags {
    Unset = 0,
    Reflection = 1 << 0,
    Transmission = 1 << 1,
    All = Reflection | Transmission
};
```

若采样成功, BSDF的值, 入射方向, 分布密度以及对应的`flags`会被返回, 这里返回的`wi`位于本地空间中, 在`BSDF`中会转到渲染空间.

```c++
struct BSDFSample {
    // BSDFSample Public Methods
    BSDFSample() = default;
    PBRT_CPU_GPU
    BSDFSample(SampledSpectrum f, Vector3f wi, Float pdf, BxDFFlags flags, Float eta = 1,
               bool pdfIsProportional = false)
        : f(f),
          wi(wi),
          pdf(pdf),
          flags(flags),
          eta(eta),
          pdfIsProportional(pdfIsProportional) {}

    PBRT_CPU_GPU
    bool IsReflection() const { return pbrt::IsReflective(flags); }
    PBRT_CPU_GPU
    bool IsTransmission() const { return pbrt::IsTransmissive(flags); }
    PBRT_CPU_GPU
    bool IsDiffuse() const { return pbrt::IsDiffuse(flags); }
    PBRT_CPU_GPU
    bool IsGlossy() const { return pbrt::IsGlossy(flags); }
    PBRT_CPU_GPU
    bool IsSpecular() const { return pbrt::IsSpecular(flags); }

    std::string ToString() const;
    SampledSpectrum f;
    Vector3f wi;
    Float pdf = 0;
    BxDFFlags flags;
    Float eta = 1;
    bool pdfIsProportional = false;
};
```

### 半球反射

`rho`方法的两种重载分别用于计算第四章所介绍的半球-方向反射量与半球-半球反射量, 样本数量由调用者决定.

```c++
PBRT_CPU_GPU SampledSpectrum BxDF::rho(Vector3f wo, pstd::span<const Float> uc,
                          pstd::span<const Point2f> u2) const {
    if (wo.z == 0)
        return {};
    SampledSpectrum r(0.);
    DCHECK_EQ(uc.size(), u2.size());
    for (size_t i = 0; i < uc.size(); ++i) {
        // Compute estimate of $\rho_\roman{hd}$
        pstd::optional<BSDFSample> bs = Sample_f(wo, uc[i], u2[i]);
        if (bs && bs->pdf > 0)
            r += bs->f * AbsCosTheta(bs->wi) / bs->pdf;
    }
    return r / uc.size();
}

SampledSpectrum BxDF::rho(pstd::span<const Point2f> u1, pstd::span<const Float> uc,
                          pstd::span<const Point2f> u2) const {
    DCHECK_EQ(uc.size(), u1.size());
    DCHECK_EQ(u1.size(), u2.size());
    SampledSpectrum r(0.f);
    for (size_t i = 0; i < uc.size(); ++i) {
        // Compute estimate of $\rho_\roman{hh}$
        Vector3f wo = SampleUniformHemisphere(u1[i]);
        if (wo.z == 0)
            continue;
        Float pdfo = UniformHemispherePDF();
        pstd::optional<BSDFSample> bs = Sample_f(wo, uc[i], u2[i]);
        if (bs && bs->pdf > 0)
            r += bs->f * AbsCosTheta(bs->wi) * AbsCosTheta(wo) / (pdfo * bs->pdf);
    }
    return r / (Pi * uc.size());
}
```

### BSDF中的delta分布

delta分布主要用于完美镜面反射, 但是对于`Sample_f`与`PDF`方法, 返回delta函数对应的无穷大密度在c++中是无法得到正确的渲染结果的. 对于`Sample_f`方法, 将delta函数从PDF与BSDF分离, 可以发现delta函数会被抵消, 由于PDF与delta函数一致, 因此PDF设置为1即可. 对于`PDF`方法, 它的返回值为0, 因为恰好位于delta函数对应的反射方向的概率过小.

$$
\begin{equation}
\frac{f_r(p, \omega_o, \omega_i)}{p(\omega_i)} = \frac{\delta(\omega' - \omega_i)f_r^{\text{rem}}(p, \omega_o, \omega_i)}{\delta(\omega' - \omega_i)p^{\text{rem}(\omega_i)}} = \frac{f_r^{\text{rem}}(p, \omega_o, \omega_i)}{p^{\text{rem}(\omega_i)}}
\end{equation}
$$

### BSDF类

`BSDF`主要用于处理从材质本地空间到渲染空间的转换. `BSDF`的构造函数会传入几何法线, 着色法线以及切线, `shadingFrame`用于存储着色所用的坐标系以及处理与渲染空间之间的转换.

```c++
BSDF() = default;
PBRT_CPU_GPU
BSDF(Normal3f ns, Vector3f dpdus, BxDF bxdf)
    : bxdf(bxdf), shadingFrame(Frame::FromXZ(Normalize(dpdus), Vector3f(ns))) {}
```

`BSDF`的`f`方法用于封装`BxDF`中的对应方法, 其中的模板版本用于在用户已知内部`BxDF`类型的情况下直接调用它的`f`方法, 这用于在GPU上避免pbrt中的动态方法分发.

```c++
PBRT_CPU_GPU
SampledSpectrum f(Vector3f woRender, Vector3f wiRender,
                    TransportMode mode = TransportMode::Radiance) const {
    Vector3f wi = RenderToLocal(wiRender), wo = RenderToLocal(woRender);
    if (wo.z == 0)
        return {};
    return bxdf.f(wo, wi, mode);
}

template <typename BxDF>
PBRT_CPU_GPU SampledSpectrum f(Vector3f woRender, Vector3f wiRender,
                                TransportMode mode = TransportMode::Radiance) const {
    Vector3f wi = RenderToLocal(wiRender), wo = RenderToLocal(woRender);
    if (wo.z == 0)
        return {};
    const BxDF *specificBxDF = bxdf.CastOrNullptr<BxDF>();
    return specificBxDF->f(wo, wi, mode);
}
```

`BSDF`的`Sample_f`会通过`std::optional`处理采样失效的情况.

```c++
PBRT_CPU_GPU
pstd::optional<BSDFSample> Sample_f(
    Vector3f woRender, Float u, Point2f u2,
    TransportMode mode = TransportMode::Radiance,
    BxDFReflTransFlags sampleFlags = BxDFReflTransFlags::All) const {
    Vector3f wo = RenderToLocal(woRender);
    if (wo.z == 0 || !(bxdf.Flags() & sampleFlags))
        return {};
    // Sample _bxdf_ and return _BSDFSample_
    pstd::optional<BSDFSample> bs = bxdf.Sample_f(wo, u, u2, mode, sampleFlags);
    if (bs)
        DCHECK_GE(bs->pdf, 0);
    if (!bs || !bs->f || bs->pdf == 0 || bs->wi.z == 0)
        return {};
    PBRT_DBG("For wo = (%f, %f, %f), ns %f %f %f sampled f = %f %f %f %f, pdf = %f, "
                "ratio[0] = %f wi = (%f, %f, %f)\n",
                wo.x, wo.y, wo.z, shadingFrame.z.x, shadingFrame.z.y, shadingFrame.z.z,
                bs->f[0], bs->f[1], bs->f[2], bs->f[3], bs->pdf,
                (bs->pdf > 0) ? (bs->f[0] / bs->pdf) : 0, bs->wi.x, bs->wi.y, bs->wi.z);
    bs->wi = LocalToRender(bs->wi);
    return bs;
}
```

## 漫反射

Lambertian反射模型是最简单的BRDF之一, 它表达了将入射光线均匀的反射到各个方向的完美漫反射. 大部分角度下Lambertian模型都可以很好的表达漫反射, 但是在与法线接近垂直的掠射角下镜面反射会导致明显的偏差.

Lambertian反射的表达式如下, 其中的\\(\pi\\)来自于积分得到的反射值. 在实时渲染中, 材质的反照率通常会预先乘上\\(\pi\\), 这避免了耗时的除法操作.

$$
\begin{equation}
\int_\omega f_r(p, \omega_o, \omega_i) \cos\theta d\omega = \int_0^{2\pi}\int_0^{\frac{\pi}{2}} \frac{R}{\pi} \cos\theta \sin\theta d\theta d\phi = R
\end{equation}
$$

pbrt在采样Lambertian时会将\\(\cos\\)项考虑进pdf中, 这使得分布不在均匀, 但能通过重要性抽样获得更好的渲染结果.

```c++
// Sample cosine-weighted hemisphere to compute _wi_ and _pdf_
Vector3f wi = SampleCosineHemisphere(u);
if (wo.z < 0)
    wi.z *= -1;
Float pdf = CosineHemispherePDF(AbsCosTheta(wi));
```

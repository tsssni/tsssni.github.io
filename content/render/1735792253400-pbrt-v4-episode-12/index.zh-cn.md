---
title: "pbrt-v4 Ep. XII: 光源"
date: 2025-01-02
draft: false
description: "pbrt-v4 episode 12"
tags: ["graphics", "rendering", "pbrt"]
---

{{< katex >}}

pbrt中只有符合物理的光源, 例如带有距离衰减, 只照亮某些物体这类不符合物理的光源是没有实现的. 为提高效率, pbrt会根据概率选择光源.

## 光源接口

pbrt中光源通过`Light`定义.

```c++
class Light : public TaggedPointer<  // Light Source Types
                  PointLight, DistantLight, ProjectionLight, GoniometricLight, SpotLight,
                  DiffuseAreaLight, UniformInfiniteLight, ImageInfiniteLight,
                  PortalImageInfiniteLight

                  > {
  public:
    // Light Interface
    // ...
};
```

光源需要通过`Phi`返回其功率(辐射通量)\\(\phi\\), 这便于通过功率大小采样光源.

```c++
SampledSpectrum Phi(SampledWavelengths lambda) const;
```

考虑到处理上的便捷性, 光源牺牲了一定的抽象, 通过`Type`返回类型.

```c++
LightType Type() const;
```

`DeltaPosition`代表光源只从一个位置发光, 这个名字来自于Dirac delta分布. `DeltaDirection`代表只向一个方向发光. `Area`是面积光源, 通过几何形状决定发光区域. `Infinite`代表无限远的光源, 例如太阳.

```c++
enum class LightType { DeltaPosition, DeltaDirection, Area, Infinite };
```

直接采样有光源的方向可以极大的提高效率. 若光源只能从部分方向照亮表面, 直接采用BSDF的分布采样是低效的, 需要根据光源的分布采样. pbrt中这通过`SampleLi`实现, 若当前点可以被照亮就返回光源信息与PDF. `allowIncompletePDF`用于跳过PDF较小的样本, 用于MIS补偿.

```c++
pstd::optional<LightLiSample>
SampleLi(LightSampleContext ctx, Point2f u, SampledWavelengths lambda,
         bool allowIncompletePDF = false) const;
```

`LightSampleContext`只存储位置, 表面法线与着色法线.

```c++
class LightSampleContext {
  public:
    // LightSampleContext Public Methods
    // ...

    // LightSampleContext Public Members
    Point3fi pi;
    Normal3f n, ns;
};
```

`LightLiSample`结构如下. 根据之前章节介绍的内容, 若为Dirac delta分布且采样到光源, 返回的PDF为1, 因为delta项被抵消了.

```c++
struct LightLiSample {
    // LightLiSample Public Methods
    // ...

    SampledSpectrum L;
    Vector3f wi;
    Float pdf;
    Interaction pLight;
};
```

`L`返回当某条光线与面积光源相交时, 它从相交点获取的辐亮度. 只有面积光源可以调用该接口.

```c++
SampledSpectrum L(Point3f p, Normal3f n, Point2f uv, Vector3f w,
                  const SampledWavelengths &lambda) const;
```

`Le`使得没有与任何物体相交的光线可以获取无限距离光源的辐亮度, 同样只有该类型的光源可以调用.

```c++
SampledSpectrum Le(const Ray &ray, const SampledWavelengths &lambda) const;
```

`SampleLe`与`PDF_Le`用于从光源发射光线时的采样.

### 光度光源标准

pbrt允许指定光度单位并负责转为辐射单位.

### LightBase类

`LightBase`中的`mediumInterface`用于指定光源内外的介质, 若为像点光源一样没有内部介质的光源, 则设置内外介质相同.

```c++
class LightBase {
  public:
    // LightBase Public Methods
    // ...

  protected:
    // LightBase Protected Methods
    // ...

    // LightBase Protected Members
    LightType type;
    Transform renderFromLight;
    MediumInterface mediumInterface;
    static InternCache<DenselySampledSpectrum> *spectrumCache;
};
```

## 点光源

部分光源可以被抽象为从某个点发光, 在角度上遵循某种分布.

如之前章节所介绍的, 由于没有空间上的体积, 点光源需要通过辐射强度来描述. 由于点光源均匀的向任意方向发射光线, 通过除以距离的平方可以将单位转为辐亮度.

```c++
pstd::optional<LightLiSample>
SampleLi(LightSampleContext ctx, Point2f u, SampledWavelengths lambda,
         bool allowIncompletePDF) const {
    Point3f p = renderFromLight(Point3f(0, 0, 0));
    Vector3f wi = Normalize(p - ctx.p());
    SampledSpectrum Li = scale * I->Sample(lambda) /
                         DistanceSquared(p, ctx.p());
    return LightLiSample(Li, wi, 1, Interaction(p, &mediumInterface));
}
```

点光源功率如下.

$$
\begin{equation}
\Phi=\int_\Theta I d\omega=4\pi I
\end{equation}
$$

### 聚光灯

pbrt中聚光灯在本地空间中始终位于原点并指向\\(z\\)轴, 通过相对\\(z\\)轴的角度实现衰减. `cosFalloffStart`定义衰减开始的角度, `cosFalloffEnd`定义聚光灯最大角度.

```c++
const DenselySampledSpectrum *Iemit;
Float scale, cosFalloffStart, cosFalloffEnd;
```

聚光灯功率如下.

$$
\begin{equation}
\begin{aligned}
&2\pi I(\int_0^{\theta_{\text{start}}} \sin\theta d\theta+\int_{\theta_{\text{start}}}^{\theta_{\text{end}}} \text{smoothstep}(\cos\theta,{\theta_{\text{end}}},{\theta_{\text{start}}})\sin\theta d\theta)\\\\
&=\pi I(2-\cos\theta_{\text{start}}-\cos\theta_{\text{end}})
\end{aligned}
\end{equation}
$$

### 纹理投影光源

纹理投影光源根据光线与\\(z=1\\)平面相交的位置决定纹理坐标, 双线性插值采样后得到颜色. 根据之前章节所介绍的, 根据角度和距离可以将\\(dA\\)转为\\(d\omega\\), 在纹理投影光源中这会影响光线强度, 对于\\(z=1\\)平面转换系数为\\(\cos^3\theta\\).

纹理投影光源的功率通过转为面积上的积分来计算, 由于像素只代表中心点, 最后的结果需要乘上像素的面积.

$$
\begin{equation}
\Phi=\int_\Theta I(\omega) d\omega = \int_A I(p) \frac{d\omega}{dA} dA
\end{equation}
$$

### 光度测量角度图光源

光度测量角度图描述点光源在角度上的分布, 经过等面积投影后存储在图片中. 由于等面积投影中每个像素都代表同样大小的立体角, 因此功率可以像素值通过相加得到.

## 远距离光源

远距离光源是距离较远的点光源, 这使得其发出的光线方向都是相同的, 例如太阳. 远距离光源只有位于真空介质是有意义的, 否则由于距离过远在传播过程中就已经都被吸收了.

`DistantLight`返回的`LightLiSample`中的光源位置, 是当前参考点沿入射光线方向行进两倍场景半径后的位置, 阴影光线到达这个点可以保证没有被遮挡.

```c++
pstd::optional<LightLiSample>
SampleLi(LightSampleContext ctx, Point2f u, SampledWavelengths lambda,
         bool allowIncompletePDF) const {
    Vector3f wi = Normalize(renderFromLight(Vector3f(0, 0, 1)));
    Point3f pOutside = ctx.p() + wi * (2 * sceneRadius);
    return LightLiSample(scale * Lemit->Sample(lambda), wi, 1,
                         Interaction(pOutside, nullptr));
}
```

远距离光的功率通过乘上场景包围球对应的圆盘的面积得到.

## 面积光源

面积光源通过将`Shape`与在其表面上的辐亮度分布结合来实现, 其光照计算通常没有解析形式.

`DiffuseAreaLight`定义了在`Shape`表面均匀分布的光源, 支持通过`Image`确定各个点的光照, 以及通过`alpha`使得某些点不发光. pbrt通过调用`Shape::Sample`实现面积光源的采样.

```c++
class DiffuseAreaLight : public LightBase {
  public:
    // DiffuseAreaLight Public Methods
    // ...

  private:
    // DiffuseAreaLight Private Members
    Shape shape;
    FloatTexture alpha;
    Float area;
    bool twoSided;
    const DenselySampledSpectrum *Lemit;
    Float scale;
    Image image;
    const RGBColorSpace *imageColorSpace;

    // DiffuseAreaLight Private Methods
    // ...
};
```

由于对于面积光源上的某个点\\(E(p)=L\int_0^{2\pi}\int_0^{\frac{\pi}{2}}\cos\theta\sin\theta d\theta=\pi L\\), 功率计算方式如下. 对于通过`Image`指定光照的光源, pbrt会计算平均辐亮度.

```c++
SampledSpectrum DiffuseAreaLight::Phi(SampledWavelengths lambda) const {
    SampledSpectrum L(0.f);
    if (image) {
        // Compute average light image emission
        for (int y = 0; y < image.Resolution().y; ++y)
            for (int x = 0; x < image.Resolution().x; ++x) {
                RGB rgb;
                for (int c = 0; c < 3; ++c)
                    rgb[c] = image.GetChannel({x, y}, c);
                L += RGBIlluminantSpectrum(*imageColorSpace, ClampZero(rgb))
                         .Sample(lambda);
            }
        L *= scale / (image.Resolution().x * image.Resolution().y);

    } else
        L = Lemit->Sample(lambda) * scale;
    return Pi * (twoSided ? 2 : 1) * area * L;
}
```

## 无限面积光源

无限面积光源是包围整个场景的无限远的面积光源, 例如环境光.

### 均匀无限光源

均匀无限光源通过`UniformInfiniteLight`定义, 从各个方向发出相同的光. 执行`SampleLi`时`UniformInfiniteLight`可以传入`allowIncompletePDF`参数, 此时会返回未设置的样本, 因为光源辐亮度为常数, 为避免影响MIS的效果此时不应采样光源.

### 图像无限光源

pbrt通过等面积八面体映射将环境纹理存储在图像中.

pbrt通过`PiecewiseConstant2D`构建光照分布, 若`allowIncompletePDF`则在分布中减去平均值来避免采样分布值较小的区域.

```c++
// Initialize sampling PDFs for image infinite area light
    ImageChannelDesc channelDesc = image.GetChannelDesc({"R", "G", "B"});
    if (!channelDesc)
        ErrorExit("%s: image used for ImageInfiniteLight doesn't have R, G, B "
                  "channels.",
                  filename);
    CHECK_EQ(3, channelDesc.size());
    CHECK(channelDesc.IsIdentity());
    if (image.Resolution().x != image.Resolution().y)
        ErrorExit("%s: image resolution (%d, %d) is non-square. It's unlikely "
                  "this is an equal area environment map.",
                  filename, image.Resolution().x, image.Resolution().y);
    Array2D<Float> d = image.GetSamplingDistribution();
    Bounds2f domain = Bounds2f(Point2f(0, 0), Point2f(1, 1));
    distribution = PiecewiseConstant2D(d, domain, alloc);

    // Initialize compensated PDF for image infinite area light
    Float average = std::accumulate(d.begin(), d.end(), 0.) / d.size();
    for (Float &v : d)
        v = std::max<Float>(v - average, 0);
    if (std::all_of(d.begin(), d.end(), [](Float v) { return v == 0; }))
        std::fill(d.begin(), d.end(), Float(1));
    compensatedDistribution = PiecewiseConstant2D(d, domain, alloc);
```

由于分布通过图像的\\(uv\\)空间构建, 在转为球面分布时需要添加转换系数.

```c++
Float pdf = mapPDF / (4 * Pi);
```

### 门户无限光源

`ImageInfiniteLight`不考虑光源的可见性, 遮挡会影响采样的效率, pbrt通过`PortalImageInfiniteLight`解决该问题, 允许用户指定一个四边形的门户.

门户在等面积八面体映射纹理中会对应一个复杂的形状. pbrt将门户本地空间定义为以门户为\\(z=1\\)平面, 向外为\\(z\\)轴正方向. 此时对纹理重新参数化, 将角度转到\\([0,1]\\)中即可存储, 门户在纹理上会对应某个矩形区域.

$$
\begin{equation}
(\alpha,\beta)=\left(\arctan\frac{x}{z},\arctan\frac{y}{z}\right)
\end{equation}
$$

由于积分通常是在立体角上的积分, 我们需要计算\\(\frac{d\omega}{d(u,v)}\\)(因为转换的过程是\\(\frac{d\omega}{d(u,v)}d(u,v)\\), pbrt书里搞反了, 见[Portal-Masked Environment Map Sampling](https://cs.dartmouth.edu/~wjarosz/publications/bitterli15portal.pdf)). 此时由于门户位于\\(x,y\\)平面上, 因此面积与立体角的微分满足\\(d\omega=\frac{dA\cos\theta}{r^2}=\frac{dxdy}{r^3}\\), 经整理后得到如下转换关系.

$$
\begin{equation}
\frac{d\omega}{d(u,v)}=\pi^2\frac{(1-\omega_x^2)(1-\omega_y^2)}{\omega_z}
\end{equation}
$$

## 光源采样

只使用对当前点贡献较大的光源可以有效提高渲染效率, pbrt通过`LightSampler`实现光源采样. `Sample`通过一维随机变量采样, 返回光源与概率, `PMF`返回指定光源的采样概率. 为实现从光源开始的路径追踪, pbrt提供了与空间位置无关的`Sample`与`PMF`.

```c++
class LightSampler : public TaggedPointer<UniformLightSampler, PowerLightSampler,
                                          ExhaustiveLightSampler, BVHLightSampler> {
  public:
    // LightSampler Interface
    using TaggedPointer::TaggedPointer;

    static LightSampler Create(const std::string &name, pstd::span<const Light> lights,
                               Allocator alloc);

    std::string ToString() const;

    PBRT_CPU_GPU inline pstd::optional<SampledLight> Sample(const LightSampleContext &ctx,
                                                            Float u) const;

    PBRT_CPU_GPU inline Float PMF(const LightSampleContext &ctx, Light light) const;

    PBRT_CPU_GPU inline pstd::optional<SampledLight> Sample(Float u) const;
    PBRT_CPU_GPU inline Float PMF(Light light) const;
};
```

### 均匀光源采样

`UniformLightSampler`对所有光源均匀采样.

### 功率光源采样

`PowerLightSampler`根据功率采样光源, 功率从`Light::Phi`获取.

### BVH光源采样

`BVHLightSampler`通过对光源构建包围结构来加速光源采样.

每个光源都在空间上影响某块区域, pbrt通过`LightBounds`表示, 显然这不适用于无限光源, 需要单独处理. \\(\omega\\)指定主要光源表面法线, \\(\theta_o\\)表示光源表面上最大的法线变化角度, \\(\theta_e\\)表示相对于某个法线的最大的可以接收光照的角度.

```c++
class LightBounds {
  public:
    // LightBounds Public Methods
    LightBounds() = default;
    LightBounds(const Bounds3f &b, Vector3f w, Float phi, Float cosTheta_o,
                Float cosTheta_e, bool twoSided);

    PBRT_CPU_GPU
    Point3f Centroid() const { return (bounds.pMin + bounds.pMax) / 2; }

    PBRT_CPU_GPU
    Float Importance(Point3f p, Normal3f n) const;

    std::string ToString() const;

    // LightBounds Public Members
    Bounds3f bounds;
    Float phi = 0;
    Vector3f w;
    Float cosTheta_o, cosTheta_e;
    bool twoSided;
};
```

`Importance`是`LightBounds`的关键方法, 负责返回光源对表面上某个点的贡献. 连接表面点与光源包围盒中心, 法线与该向量形成的角度为\\(\theta_w\\), 包围盒对应的包围球与改点的切线和该向量形成的角度为\\(\theta_b\\). 令\\(\theta'=\max(0,\theta_w-\theta_o-\theta_b)\\), 这是该点与光源上某点的法线所形成的最小角度, 若大于\\(\theta_e\\)则可以认为该点无法被照亮. 令表面法线与该向量形成的角度为\\(\theta_i\\), 令\\(\theta'_i=\theta_i-\theta_b\\), 该角度影响光源对表面的最大贡献. 此时可以得到贡献值\\(I=\frac{\phi\cos\theta'\cos\theta'_i}{d^2}\\).

```c++
PBRT_CPU_GPU Float LightBounds::Importance(Point3f p, Normal3f n) const {
    // Return importance for light bounds at reference point
    // Compute clamped squared distance to reference point
    Point3f pc = (bounds.pMin + bounds.pMax) / 2;
    Float d2 = DistanceSquared(p, pc);
    d2 = std::max(d2, Length(bounds.Diagonal()) / 2);

    // Define cosine and sine clamped subtraction lambdas
    auto cosSubClamped = [](Float sinTheta_a, Float cosTheta_a, Float sinTheta_b,
                            Float cosTheta_b) -> Float {
        if (cosTheta_a > cosTheta_b)
            return 1;
        return cosTheta_a * cosTheta_b + sinTheta_a * sinTheta_b;
    };

    auto sinSubClamped = [](Float sinTheta_a, Float cosTheta_a, Float sinTheta_b,
                            Float cosTheta_b) -> Float {
        if (cosTheta_a > cosTheta_b)
            return 0;
        return sinTheta_a * cosTheta_b - cosTheta_a * sinTheta_b;
    };

    // Compute sine and cosine of angle to vector _w_, $\theta_\roman{w}$
    Vector3f wi = Normalize(p - pc);
    Float cosTheta_w = Dot(Vector3f(w), wi);
    if (twoSided)
        cosTheta_w = std::abs(cosTheta_w);
    Float sinTheta_w = SafeSqrt(1 - Sqr(cosTheta_w));

    // Compute $\cos\,\theta_\roman{\+b}$ for reference point
    Float cosTheta_b = BoundSubtendedDirections(bounds, p).cosTheta;
    Float sinTheta_b = SafeSqrt(1 - Sqr(cosTheta_b));

    // Compute $\cos\,\theta'$ and test against $\cos\,\theta_\roman{e}$
    Float sinTheta_o = SafeSqrt(1 - Sqr(cosTheta_o));
    Float cosTheta_x = cosSubClamped(sinTheta_w, cosTheta_w, sinTheta_o, cosTheta_o);
    Float sinTheta_x = sinSubClamped(sinTheta_w, cosTheta_w, sinTheta_o, cosTheta_o);
    Float cosThetap = cosSubClamped(sinTheta_x, cosTheta_x, sinTheta_b, cosTheta_b);
    if (cosThetap <= cosTheta_e)
        return 0;

    // Return final importance at reference point
    Float importance = phi * cosThetap / d2;
    DCHECK_GE(importance, -1e-3);
    // Account for $\cos\theta_\roman{i}$ in importance at surfaces
    if (n != Normal3f(0, 0, 0)) {
        Float cosTheta_i = AbsDot(wi, n);
        Float sinTheta_i = SafeSqrt(1 - Sqr(cosTheta_i));
        Float cosThetap_i = cosSubClamped(sinTheta_i, cosTheta_i, sinTheta_b, cosTheta_b);
        importance *= cosThetap_i;
    }

    importance = std::max<Float>(importance, 0);
    return importance;
}
```

#### 光源包围结构实现

无限光源返回未设置的`std::optional<LightBounds>`.

```c++
pstd::optional<LightBounds> Bounds() const { return {}; }
```

点光源可以照亮任意方向.

```c++
pstd::optional<LightBounds> PointLight::Bounds() const {
    Point3f p = renderFromLight(Point3f(0, 0, 0));
    Float phi = 4 * Pi * scale * I->MaxValue();
    return LightBounds(Bounds3f(p, p), Vector3f(0, 0, 1), phi, std::cos(Pi),
                       std::cos(Pi / 2), false);
}
```

聚光灯的\\(\theta_o\\)为非衰减区域的角度, \\(\theta_e\\)为衰减区域的角度. 对于两个只有锥体大小不同的聚光灯, 若它们照亮同一个点, 该点对这两个光源的采样概率应该是相同的. 因此二者的\\(\phi\\)应设置为与锥体无关的, 锥体已经在`Importance`中被考虑了, 不需要再次将其添加到\\(\phi\\)中.

```c++
pstd::optional<LightBounds> SpotLight::Bounds() const {
    Point3f p = renderFromLight(Point3f(0, 0, 0));
    Vector3f w = Normalize(renderFromLight(Vector3f(0, 0, 1)));
    Float phi = scale * Iemit->MaxValue() * 4 * Pi;
    Float cosTheta_e = std::cos(std::acos(cosFalloffEnd) -
                                std::acos(cosFalloffStart));
    return LightBounds(Bounds3f(p, p), w, phi, cosFalloffStart,
                       cosTheta_e, false);
}
```

纹理投影光源\\(\theta_o\\)为0, 因为只有一个方向, \\(\theta_e\\)与图片尺寸有关, \\(\phi\\)根据图片像素计算.

```c++
pstd::optional<LightBounds> ProjectionLight::Bounds() const {
    Float sum = 0;
    for (int v = 0; v < image.Resolution().y; ++v)
        for (int u = 0; u < image.Resolution().x; ++u)
            sum += std::max({image.GetChannel({u, v}, 0), image.GetChannel({u, v}, 1),
                             image.GetChannel({u, v}, 2)});
    Float phi = scale * sum / (image.Resolution().x * image.Resolution().y);

    Point3f pCorner(screenBounds.pMax.x, screenBounds.pMax.y, 0);
    Vector3f wCorner = Normalize(Vector3f(lightFromScreen(pCorner)));
    Float cosTotalWidth = CosTheta(wCorner);

    Point3f p = renderFromLight(Point3f(0, 0, 0));
    Vector3f w = Normalize(renderFromLight(Vector3f(0, 0, 1)));
    return LightBounds(Bounds3f(p, p), w, phi, std::cos(0.f), cosTotalWidth, false);
}
```

光度测量角度图光源与点光源类似, \\(\phi\\)根据实际数据计算.

```c++
pstd::optional<LightBounds> GoniometricLight::Bounds() const {
    Float sumY = 0;
    for (int y = 0; y < image.Resolution().y; ++y)
        for (int x = 0; x < image.Resolution().x; ++x)
            sumY += image.GetChannel({x, y}, 0);
    Float phi = scale * Iemit->MaxValue() * 4 * Pi * sumY /
                (image.Resolution().x * image.Resolution().y);

    Point3f p = renderFromLight(Point3f(0, 0, 0));
    // Bound it as an isotropic point light.
    return LightBounds(Bounds3f(p, p), Vector3f(0, 0, 1), phi, std::cos(Pi),
                       std::cos(Pi / 2), false);
}
```

面积光源的法线与角度根据`Shape::NormalBounds`获取, 若光源为图片则\\(\phi\\)为平均值. `Importance`中已经考虑了双面的情况, 因此\\(\phi\\)不需要考虑双面.

```c++
pstd::optional<LightBounds> DiffuseAreaLight::Bounds() const {
    // Compute _phi_ for diffuse area light bounds
    Float phi = 0;
    if (image) {
        // Compute average _DiffuseAreaLight_ image channel value
        // Assume no distortion in the mapping, FWIW...
        for (int y = 0; y < image.Resolution().y; ++y)
            for (int x = 0; x < image.Resolution().x; ++x)
                for (int c = 0; c < 3; ++c)
                    phi += image.GetChannel({x, y}, c);
        phi /= 3 * image.Resolution().x * image.Resolution().y;

    } else
        phi = Lemit->MaxValue();
    phi *= scale * area * Pi;

    DirectionCone nb = shape.NormalBounds();
    return LightBounds(shape.Bounds(), nb.w, phi, nb.cosTheta, std::cos(Pi / 2),
                       twoSided);
}
```

#### 紧凑包围结构光源

为提高缓存效率, 尤其是在GPU上, pbrt实现`CompactLightBounds`来进一步减小存储开销, 主要通过\\(\omega\\)的单位向量压缩, 以及\\(\cos\theta\\)和包围盒对角坐标的量化来实现.

```c++
class CompactLightBounds {
  public:
    // CompactLightBounds Public Methods
    // ...

  private:
    // CompactLightBounds Private Methods
    // ...

    // CompactLightBounds Private Members
    OctahedralVector w;
    Float phi = 0;
    struct {
        unsigned int qCosTheta_o : 15;
        unsigned int qCosTheta_e : 15;
        unsigned int twoSided : 1;
    };
    uint16_t qb[2][3];
};
```

\\(\cos\theta\\)采用\\(15\\)位量化, 通过转为正数后乘上\\(2^{15}-1=32767\\)实现.

```c++
static unsigned int QuantizeCos(Float c) {
    return pstd::floor(32767.f * ((c + 1) / 2));
}
```

构造函数中的`allb`指定包围盒的最大范围, 以及为基准进行量化.

```c++
for (int c = 0; c < 3; ++c) {
    qb[0][c] = pstd::floor(QuantizeBounds(lb.bounds[0][c],
                                          allb.pMin[c], allb.pMax[c]));
    qb[1][c] = pstd::ceil(QuantizeBounds(lb.bounds[1][c],
                                         allb.pMin[c], allb.pMax[c]));
}
```

量化通过乘上\\(2^{16}-1=65535\\)实现.

```c++
static Float QuantizeBounds(Float c, Float min, Float max) {
    if (min == max) return 0;
    return 65535.f * Clamp((c - min) / (max - min), 0, 1);
}
```

#### 光源包围结构层级

`BVHLightSampler`是pbrt中大部分积分器的默认采样器, 通过根据`LightBounds`构建BVH提高效率.

`LightBVHNode`存储BVH节点, 在`CompactLightBounds`的基础上添加数列化后的节点编号与叶节点标记, 采用32位对齐以提高cache效率.

```c++
struct alignas(32) LightBVHNode {
    // LightBVHNode Public Methods
    LightBVHNode() = default;

    PBRT_CPU_GPU
    static LightBVHNode MakeLeaf(unsigned int lightIndex, const CompactLightBounds &cb) {
        return LightBVHNode{cb, {lightIndex, 1}};
    }

    PBRT_CPU_GPU
    static LightBVHNode MakeInterior(unsigned int child1Index,
                                     const CompactLightBounds &cb) {
        return LightBVHNode{cb, {child1Index, 0}};
    }

    PBRT_CPU_GPU
    pstd::optional<SampledLight> Sample(const LightSampleContext &ctx, Float u) const;

    std::string ToString() const;

    // LightBVHNode Public Members
    CompactLightBounds lightBounds;
    struct {
        unsigned int childOrLightIndex : 31;
        unsigned int isLeaf : 1;
    };
};
```

pbrt通过整数记录BVH遍历过程, \\(01\\)分别代表左子树与右子树.

```c++
HashMap<Light, uint32_t> lightToBitTrail;
```

构建BVH时的节点开销与光源角度有关, 形式如下.

$$
\begin{equation}
M_\Omega=\int_0^{2\pi}(\int_0^{\theta_o}\sin\theta'd\theta'+\int_{\theta_o}^{\min(\theta_o+\theta_e,\pi)}\cos(\theta'-\theta_o)\sin\theta'd\theta')d\phi
\end{equation}
$$

此外开销还与功率, 包围盒面积以及对角线相对于当前分割轴的关系有关. 若包围盒较为细长开销会减小, 因为它们占据较大的立体角但实际上贡献不大.

```c++
Float Kr = MaxComponentValue(bounds.Diagonal()) / bounds.Diagonal()[dim];
return b.phi * M_omega * Kr * b.bounds.SurfaceArea();
```

`Sample`中首先判断是否采样无限光源, 若是则采用均匀分布. 每个无限光源的采样概率都与BVH的采样概率相同.

```c++
// Compute infinite light sampling probability _pInfinite_
Float pInfinite = Float(infiniteLights.size()) /
                  Float(infiniteLights.size() + (nodes.empty() ? 0 : 1));

if (u < pInfinite) {
    // Sample infinite lights with uniform probability
    u /= pInfinite;
    int index =
        std::min<int>(u * infiniteLights.size(), infiniteLights.size() - 1);
    Float pmf = pInfinite / infiniteLights.size();
    return SampledLight{infiniteLights[index], pmf};

}
```

若采样BVH, 则根据子节点的`Importance`按概率选择遍历路径.

```c++
// Traverse light BVH to sample light
if (nodes.empty())
    return {};
// Declare common variables for light BVH traversal
Point3f p = ctx.p();
Normal3f n = ctx.ns;
u = std::min<Float>((u - pInfinite) / (1 - pInfinite), OneMinusEpsilon);
int nodeIndex = 0;
Float pmf = 1 - pInfinite;

while (true) {
    // Process light BVH node for light sampling
    LightBVHNode node = nodes[nodeIndex];
    if (!node.isLeaf) {
        // Compute light BVH child node importances
        const LightBVHNode *children[2] = {&nodes[nodeIndex + 1],
                                            &nodes[node.childOrLightIndex]};
        Float ci[2] = {
            children[0]->lightBounds.Importance(p, n, allLightBounds),
            children[1]->lightBounds.Importance(p, n, allLightBounds)};
        if (ci[0] == 0 && ci[1] == 0)
            return {};

        // Randomly sample light BVH child node
        Float nodePMF;
        int child = SampleDiscrete(ci, u, &nodePMF, &u);
        pmf *= nodePMF;
        nodeIndex = (child == 0) ? (nodeIndex + 1) : node.childOrLightIndex;

    } else {
        // Confirm light has nonzero importance before returning light sample
        if (nodeIndex > 0)
            DCHECK_GT(node.lightBounds.Importance(p, n, allLightBounds), 0);
        if (nodeIndex > 0 ||
            node.lightBounds.Importance(p, n, allLightBounds) > 0)
            return SampledLight{lights[node.childOrLightIndex], pmf};
        return {};
    }
}
```

根据`lightToBitTrail`可以计算采样概率.

```c++
PBRT_CPU_GPU
Float PMF(const LightSampleContext &ctx, Light light) const {
    // Handle infinite _light_ PMF computation
    if (!lightToBitTrail.HasKey(light))
        return 1.f / (infiniteLights.size() + (nodes.empty() ? 0 : 1));

    // Initialize local variables for BVH traversal for PMF computation
    uint32_t bitTrail = lightToBitTrail[light];
    Point3f p = ctx.p();
    Normal3f n = ctx.ns;
    // Compute infinite light sampling probability _pInfinite_
    Float pInfinite = Float(infiniteLights.size()) /
                        Float(infiniteLights.size() + (nodes.empty() ? 0 : 1));

    Float pmf = 1 - pInfinite;
    int nodeIndex = 0;

    // Compute light's PMF by walking down tree nodes to the light
    while (true) {
        const LightBVHNode *node = &nodes[nodeIndex];
        if (node->isLeaf) {
            DCHECK_EQ(light, lights[node->childOrLightIndex]);
            return pmf;
        }
        // Compute child importances and update PMF for current node
        const LightBVHNode *child0 = &nodes[nodeIndex + 1];
        const LightBVHNode *child1 = &nodes[node->childOrLightIndex];
        Float ci[2] = {child0->lightBounds.Importance(p, n, allLightBounds),
                        child1->lightBounds.Importance(p, n, allLightBounds)};
        DCHECK_GT(ci[bitTrail & 1], 0);
        pmf *= ci[bitTrail & 1] / (ci[0] + ci[1]);

        // Use _bitTrail_ to find next node index and update its value
        nodeIndex = (bitTrail & 1) ? node->childOrLightIndex : (nodeIndex + 1);
        bitTrail >>= 1;
    }
}
```

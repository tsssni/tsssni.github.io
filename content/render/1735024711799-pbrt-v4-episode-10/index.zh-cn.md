---
title: "pbrt-v4 Ep. X: 材质纹理"
date: 2024-12-24
draft: false
description: "pbrt-v4 episode 10"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

纹理描述表面上标量或光谱量在空间上的变化, 材质通过求解表面上某个点的纹理来决定其BSDF参数.

## 纹理采样与反走样

纹理反走样比光线渲染结果反走样要容易, 某些纹理具有解析形式, 同时也可以做预滤波, 通常来说每个像素不会需要多于一个的纹理样本.

`GenerateRayDifferential`获取相邻像素发出的光线的相交结果, 此时可以计算当前像素的\\(\frac{\partial p}{\partial u}\\)和\\(\frac{\partial p}{\partial v}\\). 对于不支持`GenerateRayDifferential`的相机, pbrt会遍历屏幕对角线上的像素获取最小的光线微分, 然后在每个像素上将添加微分后的新光线与交点对应的切平面相交.

根据交点的法线可以获取\\(\frac{\partial p}{\partial x}\\)和\\(\frac{\partial p}{\partial y}\\), 通过链式法则可以获取\\(\frac{\partial u}{\partial x}\\), \\(\frac{\partial u}{\partial y}\\), \\(\frac{\partial v}{\partial x}\\)和\\(\frac{\partial v}{\partial y}\\). 这可以通过最小二乘法求解, 其计算过程如下, 此时\\(\bold{A}=\begin{bmatrix}\frac{\partial p}{\partial u}\ \frac{\partial p}{\partial v}\end{bmatrix}\\),\\(\bold{b}=\begin{bmatrix}\frac{\partial p}{\partial x}\end{bmatrix}\\),\\(\bold{x}=\begin{bmatrix}\frac{\partial u}{\partial x}\\\\\frac{\partial v}{\partial x}\end{bmatrix}\\).

$$
\begin{equation}
\begin{aligned}
\bold{A}\bold{x}&=\bold{b}\\\\
\bold{x}&=(\bold{A}^T \bold{A})^{-1}\bold{A}^T \bold{b}
\end{aligned}
\end{equation}
$$

### 介质过渡处的光线微分

当光线与表示介质过渡但不散射光线的表面相交是, pbrt会返回未设置的`BSDF`, 光线会将原点设置为交点后继续执行路径追踪, 光线微分也具有同样的行为.

### 镜面反射与透射的光线微分

通过反射或折射可见的物体同样需要反走样, 例如镜子中的物体.

反射方向的偏导数如下, 式中的偏导数都是可以计算出来的.

$$
\begin{equation}
\begin{aligned}
\frac{\partial \omega_i}{\partial x}
&=\frac{\partial}{\partial x}(-\omega_o+2(\omega_o\cdot\bold{n})\bold{n})\\\\
&=-\frac{\partial\omega_o}{\partial x}+2((\omega_o\cdot\bold{n})\frac{\partial\bold{n}}{\partial x}+\bold{n}\frac{\partial(\omega_o\cdot\bold{n})}{\partial x})\\\\
&=-\frac{\partial\omega_o}{\partial x}+2((\omega_o\cdot\bold{n})\frac{\partial\bold{n}}{\partial x}+\bold{n}(\bold{n}\frac{\partial\omega_o}{\partial x}+\omega_o\frac{\partial\bold{n}}{\partial x}))
\end{aligned}
\end{equation}
$$

根据折射光线方向的定义可以得到其微分, 其中\\(\mu=\frac{1}{\eta}(\omega_o\cdot\bold{n})-\cos\theta_i\\). \\(\frac{\partial\mu}{\partial x}\\)中包含\\(\frac{\partial\cos\theta_i}{\partial x}\\), 这可以通过Snell定律得到.

$$
\begin{equation}
\frac{\partial\omega_i}{\partial x}=-\frac{1}{\eta}\frac{\partial\omega_o}{\partial x}+\mu\frac{\partial\bold{n}}{\partial x}+\frac{\partial\mu}{\partial x}\bold{n}
\end{equation}
$$

### 纹理方程滤波

反走样需要限制信号带宽, 去除纹理中频率高于Nyquist频率的部分, 对应的卷积如下, \\(f\\)为将像素坐标映射到纹理坐标的函数. 根据之前章节的内容, 我们可以知道其Fourier变换相当于与盒形方程相乘, 这可以直接去除高频部分.

$$
\begin{equation}
T_b(x,y)=\int_{-\infty}^{\infty}\int_{-\infty}^{\infty}\text{sinc}(x')\text{sinc}(y')T'(f(x-x',y-y'))dx'dy'
\end{equation}
$$

限制带宽后还需要还需要执行采样, \\(g\\)为采样所用的滤波器.

$$
\begin{equation}
T_{\text{ideal}}(x,y)=\int_{-\frac{w_x}{2}}^{\frac{w_x}{2}}\int_{-\frac{w_x}{2}}^{\frac{w_x}{2}}g(x',y')T_b(x-x',y-y')dx'dy'
\end{equation}
$$

这类理想采样实际上只对线性变化的量有效, 例如albedo对光照的贡献的变化, 而像roughness对BSDF的贡献就是非线性的, pbrt不考虑这点.

在纹理滤波这一任务上, 盒形滤波也可以取得较好的效果, 且计算过程简单, 其定义如下, 其中\\(u_0=u-\frac{1}{2}\max(\frac{du}{dx},\frac{dv}{dx})\\), \\(u_1=u+\frac{1}{2}\max(\frac{du}{dx},\frac{dv}{dx})\\), \\(v_0\\), \\(v_1\\)同理.

$$
\begin{equation}
T_{\text{box}}(x,y)=\frac{1}{(u_1-u_0)(v_1-v_0)}\int_{v_0}^{v_1}\int_{u_0}^{u_1}T(u',v')du'dv'
\end{equation}
$$

## 纹理坐标生成

对于参数化几何形状, 纹理坐标是与生俱来的属性. 对于三维纹理, 几何位置就是最佳纹理坐标. 对于其它情况, 纹理坐标需要手动生成, 或者像球的极点一样, 虽然有纹理坐标但是扭曲较为严重, 需要重新生成. pbrt使用\\((u,v)\\)表示参数化表面本来的纹理坐标, \\((s,t)\\)表示生成的纹理坐标.

`TextureMapping2D`接口负责二维纹理坐标的生成.

```c++
class TextureMapping2D : public TaggedPointer<UVMapping, SphericalMapping,
                                              CylindricalMapping, PlanarMapping> {
  public:
    // TextureMapping2D Interface
    using TaggedPointer::TaggedPointer;
    PBRT_CPU_GPU
    TextureMapping2D(
        TaggedPointer<UVMapping, SphericalMapping, CylindricalMapping, PlanarMapping> tp)
        : TaggedPointer(tp) {}

    static TextureMapping2D Create(const ParameterDictionary &parameters,
                                   const Transform &renderFromTexture, const FileLoc *loc,
                                   Allocator alloc);

    PBRT_CPU_GPU inline TexCoord2D Map(TextureEvalContext ctx) const;
};
```

`Map`负责执行映射, 返回的`TexCoord2D`的定义如下, 其中包含\\((s,t)\\)坐标及其导数.

```c++
struct TexCoord2D {
    Point2f st;
    Float dsdx, dsdy, dtdx, dtdy;
    std::string ToString() const;
};
```

`Map`参数为`TextureEvalContext`而非`SurfaceInteraction`是因为考虑到了GPU的缓存结构, 其定义如下.

```c++
struct TextureEvalContext {
    // TextureEvalContext Public Methods
    TextureEvalContext() = default;
    PBRT_CPU_GPU
    TextureEvalContext(const Interaction &intr) : p(intr.p()), uv(intr.uv) {}
    PBRT_CPU_GPU
    TextureEvalContext(const SurfaceInteraction &si)
        : p(si.p()),
          dpdx(si.dpdx),
          dpdy(si.dpdy),
          n(si.n),
          uv(si.uv),
          dudx(si.dudx),
          dudy(si.dudy),
          dvdx(si.dvdx),
          dvdy(si.dvdy),
          faceIndex(si.faceIndex) {}
    PBRT_CPU_GPU
    TextureEvalContext(Point3f p, Vector3f dpdx, Vector3f dpdy, Normal3f n, Point2f uv,
                       Float dudx, Float dudy, Float dvdx, Float dvdy, int faceIndex)
        : p(p),
          dpdx(dpdx),
          dpdy(dpdy),
          n(n),
          uv(uv),
          dudx(dudx),
          dudy(dudy),
          dvdx(dvdx),
          dvdy(dvdy),
          faceIndex(faceIndex) {}

    std::string ToString() const;

    Point3f p;
    Vector3f dpdx, dpdy;
    Normal3f n;
    Point2f uv;
    Float dudx = 0, dudy = 0, dvdx = 0, dvdy = 0;
    int faceIndex = 0;
};
```

### \\((u,v)\\)映射

\\((u,v)\\)映射通过对\\((u,v)\\)坐标的缩放与偏移实现, 定义如下, \\(\frac{ds}{dx}\\)通过链式法则得到.

```c++
class UVMapping {
  public:
    // UVMapping Public Methods
    UVMapping(Float su = 1, Float sv = 1, Float du = 0, Float dv = 0)
        : su(su), sv(sv), du(du), dv(dv) {}

    std::string ToString() const;

    PBRT_CPU_GPU
    TexCoord2D Map(TextureEvalContext ctx) const {
        // Compute texture differentials for 2D $(u,v)$ mapping
        Float dsdx = su * ctx.dudx, dsdy = su * ctx.dudy;
        Float dtdx = sv * ctx.dvdx, dtdy = sv * ctx.dvdy;

        Point2f st(su * ctx.uv[0] + du, sv * ctx.uv[1] + dv);
        return TexCoord2D{st, dsdx, dsdy, dtdx, dtdy};
    }

  private:
    Float su, sv, du, dv;
};
```

### 球形映射

球形映射定义如下, \\(\text{atan2}\\)代表\\(p_x,p_y\\)所形成的角度, 通过`std::atan2`获取, 可以正确的处理符号与象限. 这里认为得到的角度范围在\\([0,2\pi]\\),而非实际返回的\\([-\pi,\pi]\\).

$$
\begin{equation}
f(p)=(\frac{1}{\pi}\text{arccos}\frac{p_x}{\Vert p_x^2+p_y^2+p_z^2 \Vert}, \frac{1}{2\pi}\text{atan2}(p_y,p_x))
\end{equation}
$$

### 圆柱映射

圆柱映射定义如下, 注意到\\(t\\)坐标需要被缩放, 或者通过某种手段采样超出范围的纹理.

$$
\begin{equation}
f(p)=(\frac{1}{2\pi}\text{atan2}(p_y,p_x),p_z)
\end{equation}
$$

### 平面映射

平面映射通过两个不平行的向量和偏移定义.

$$
\begin{equation}
f(p)=((p-(0,0,0)\cdot\bold{v}_s)+d_s,(p-(0,0,0)\cdot\bold{v}_t)+d_t)
\end{equation}
$$

### 三维映射

通过几何坐标采样纹理即可.

## 纹理接口与基础纹理

pbrt支持浮点类型的标量纹理与光谱量纹理, 本文只记录光谱量纹理的定义, 其定义如下. `SpectrumTexture`的`Evaluate`需要考虑波长.


```c++
class SpectrumTexture
    : public TaggedPointer<  // SpectrumTextures
          SpectrumImageTexture, GPUSpectrumImageTexture, SpectrumMixTexture,
          SpectrumDirectionMixTexture, SpectrumScaledTexture, SpectrumConstantTexture,
          SpectrumBilerpTexture, SpectrumCheckerboardTexture, MarbleTexture,
          SpectrumDotsTexture, SpectrumPtexTexture, GPUSpectrumPtexTexture

          > {
  public:
    // SpectrumTexture Interface
    using TaggedPointer::TaggedPointer;

    static SpectrumTexture Create(const std::string &name,
                                  const Transform &renderFromTexture,
                                  const TextureParameterDictionary &parameters,
                                  SpectrumType spectrumType, const FileLoc *loc,
                                  Allocator alloc, bool gpu);

    std::string ToString() const;

    PBRT_CPU_GPU inline SampledSpectrum Evaluate(TextureEvalContext ctx,
                                                 SampledWavelengths lambda) const;
};
```

### 常量纹理

常量纹理主要用于表示材质的某些参数, 使得材质只需要考虑纹理接口.

```c++
PBRT_CPU_GPU
SampledSpectrum Evaluate(TextureEvalContext ctx, SampledWavelengths lambda) const {
    return value.Sample(lambda);
}
```

### 缩放纹理

缩放纹理通过将两张纹理相乘获取新的纹理.

```c++
PBRT_CPU_GPU
SampledSpectrum Evaluate(TextureEvalContext ctx, SampledWavelengths lambda) const {
    Float sc = scale.Evaluate(ctx);
    if (sc == 0)
        return SampledSpectrum(0.f);
    return tex.Evaluate(ctx, lambda) * sc;
}
```

### 混合纹理

混合纹理通过混合系数来混合两张纹理.

```c++
PBRT_CPU_GPU
SampledSpectrum Evaluate(TextureEvalContext ctx, SampledWavelengths lambda) const {
    Float amt = amount.Evaluate(ctx);
    SampledSpectrum t1, t2;
    if (amt != 1)
        t1 = tex1.Evaluate(ctx, lambda);
    if (amt != 0)
        t2 = tex2.Evaluate(ctx, lambda);
    return (1 - amt) * t1 + amt * t2;
}
```

## 图像纹理

图像纹理可以在任意位置被采样, 采样值被称为纹素(texel), 它是图形学中被使用最多的纹理类型. 图像纹理继承`ImageTextureBase`, 同样可以返回标量或光谱量.

```c++
class ImageTextureBase {
  public:
    // ImageTextureBase Public Methods
    ImageTextureBase(TextureMapping2D mapping, std::string filename,
                     MIPMapFilterOptions filterOptions, WrapMode wrapMode, Float scale,
                     bool invert, ColorEncoding encoding, Allocator alloc)
        : mapping(mapping), filename(filename), scale(scale), invert(invert) {
        // Get _MIPMap_ from texture cache if present
        TexInfo texInfo(filename, filterOptions, wrapMode, encoding);
        std::unique_lock<std::mutex> lock(textureCacheMutex);
        if (auto iter = textureCache.find(texInfo); iter != textureCache.end()) {
            mipmap = iter->second;
            return;
        }
        lock.unlock();

        // Create _MIPMap_ for _filename_ and add to texture cache
        mipmap =
            MIPMap::CreateFromFile(filename, filterOptions, wrapMode, encoding, alloc);
        lock.lock();
        // This is actually ok, but if it hits, it means we've wastefully
        // loaded this texture. (Note that in that case, should just return
        // the one that's already in there and not replace it.)
        CHECK(textureCache.find(texInfo) == textureCache.end());
        textureCache[texInfo] = mipmap;
    }

    static void ClearCache() { textureCache.clear(); }

    void MultiplyScale(Float s) { scale *= s; }

  protected:
    // ImageTextureBase Protected Members
    TextureMapping2D mapping;
    std::string filename;
    Float scale;
    bool invert;
    MIPMap *mipmap;

  private:
    // ImageTextureBase Private Members
    static std::mutex textureCacheMutex;
    static std::map<TexInfo, MIPMap *> textureCache;
};
```

```c++
class SpectrumImageTexture : public ImageTextureBase {
  public:
    // SpectrumImageTexture Public Methods
    SpectrumImageTexture(TextureMapping2D mapping, std::string filename,
                         MIPMapFilterOptions filterOptions, WrapMode wrapMode,
                         Float scale, bool invert, ColorEncoding encoding,
                         SpectrumType spectrumType, Allocator alloc)
        : ImageTextureBase(mapping, filename, filterOptions, wrapMode, scale, invert,
                           encoding, alloc),
          spectrumType(spectrumType) {}

    PBRT_CPU_GPU
    SampledSpectrum Evaluate(TextureEvalContext ctx, SampledWavelengths lambda) const;

    static SpectrumImageTexture *Create(const Transform &renderFromTexture,
                                        const TextureParameterDictionary &parameters,
                                        SpectrumType spectrumType, const FileLoc *loc,
                                        Allocator alloc);

    std::string ToString() const;

  private:
    // SpectrumImageTexture Private Members
    SpectrumType spectrumType;
};
```

### 纹理内存管理

pbrt会生成mipmap来处理图像滤波, mipmap只生成一次, 之后通过`textureCache`读取.

```c++
TexInfo texInfo(filename, filterOptions, wrapMode, encoding);
std::unique_lock<std::mutex> lock(textureCacheMutex);
if (auto iter = textureCache.find(texInfo); iter != textureCache.end()) {
    mipmap = iter->second;
    return;
}
lock.unlock();
```

### 图像纹理求解

pbrt中图像以左下角为原点, 而纹理坐标位于左上角, 这需要手动处理.

通过图像中的`RGBColorSpace`与`SpectrumType`可以从RGB中还原光谱, 对于没有色彩空间信息的图像, pbrt认为是灰度图.

```c++
if (const RGBColorSpace *cs = mipmap->GetRGBColorSpace(); cs) {
    if (spectrumType == SpectrumType::Unbounded)
        return RGBUnboundedSpectrum(*cs, rgb).Sample(lambda);
    else if (spectrumType == SpectrumType::Albedo)
        return RGBAlbedoSpectrum(*cs, Clamp(rgb, 0, 1)).Sample(lambda);
    else
        return RGBIlluminantSpectrum(*cs, rgb).Sample(lambda);
}
DCHECK(rgb[0] == rgb[1] && rgb[1] == rgb[2]);
return SampledSpectrum(rgb[0]);
```

### mipmap

mipmap通过将图像预处理为图像金字塔来减小滤波开销, 即每一层为上一层分辨率的一半, mipmap所需的内存只比原图多\\(\frac{1}{3}\\).

### 图像滤波

pbrt支持以下四种滤波, 除EWA外都具有GPU硬件支持, 根据最大梯度执行各向同性滤波, pbrt会选择使得滤波窗口覆盖四个像素的mip层级. 点滤波只需要选取四个像素中最近的采样点, 双线性插值为三角形滤波, 三线形插值则根据计算出的非整数层级来混合相邻两个层级的双线性滤波结果.

```c++
enum class FilterFunction { Point, Bilinear, Trilinear, EWA };
```

EWA为椭圆加权平均(elliptically weighted average), 它会在不同方向使用不同的梯度, 即各向异性滤波, 且不要求方向与\\(x\\)轴或\\(y\\)轴平行. EWA的带限和滤波过程都采用Gaussian滤波器, 而非上述方法所用的盒滤波器带限. pbrt使用短轴长度选择mip层级, 若长短轴比率过大会导致过多的采样点, pbrt会适当增长短轴以使用更高的mip层级, 虽然会有模糊但并不明显

EWA根据梯度计算得到椭圆, 其形式如下, 然后根据椭圆的梯度得到包围盒, 此时可以选取包围盒内位于椭圆内部的点执行滤波.

$$
\begin{equation}
\begin{aligned}
e(s,t)&=\frac{A}{F}s^2+\frac{B}{F}st+\frac{C}{F}t^2<1\\\\
A&=(\frac{\partial s}{\partial y})^2+(\frac{\partial t}{\partial y})^2+1\\\\
B&=-2(\frac{\partial s}{\partial x}\frac{\partial s}{\partial y}+\frac{\partial t}{\partial x}\frac{\partial t}{\partial y})\\\\
C&=(\frac{\partial s}{\partial x})^2+(\frac{\partial t}{\partial x})^2+1\\\\
F&=AC-\frac{B^2}{4}
\end{aligned}
\end{equation}
$$

已知\\(e(s,t)\\)为某个点到椭圆中心的距离与对应直线上的椭圆边界到中心的距离的比值的平方, 这与Gaussian滤波器的定义相符, 因此可以通过该值来查表获取滤波权重.

## 材质接口与实现

材质用于求解纹理获取参数后初始化BSDF, 其定义如下.

```c++
class Material
    : public TaggedPointer<  // Material Types
          CoatedDiffuseMaterial, CoatedConductorMaterial, ConductorMaterial,
          DielectricMaterial, DiffuseMaterial, DiffuseTransmissionMaterial, HairMaterial,
          MeasuredMaterial, SubsurfaceMaterial, ThinDielectricMaterial, MixMaterial

          > {
  public:
    // Material Interface
    using TaggedPointer::TaggedPointer;

    static Material Create(const std::string &name,
                           const TextureParameterDictionary &parameters, Image *normalMap,
                           /*const */ std::map<std::string, Material> &namedMaterials,
                           const FileLoc *loc, Allocator alloc);

    std::string ToString() const;

    template <typename TextureEvaluator>
    inline BSDF GetBSDF(TextureEvaluator texEval, MaterialEvalContext ctx,
                        SampledWavelengths &lambda, ScratchBuffer &buf) const;

    template <typename TextureEvaluator>
    inline BSSRDF GetBSSRDF(TextureEvaluator texEval, MaterialEvalContext ctx,
                            SampledWavelengths &lambda, ScratchBuffer &buf) const;

    template <typename TextureEvaluator>
    PBRT_CPU_GPU inline bool CanEvaluateTextures(TextureEvaluator texEval) const;

    PBRT_CPU_GPU inline const Image *GetNormalMap() const;

    PBRT_CPU_GPU inline FloatTexture GetDisplacement() const;

    PBRT_CPU_GPU inline bool HasSubsurfaceScattering() const;
};
```

`Material`最核心的方法为`GetBxDF`, 这里的返回值`ConcreteBxDF`对于每个派生类都是不同的. pbrt在这里不要求函数签名相同, 这使得`BxDF`被分配在栈上而非堆上, 有利于GPU渲染.

```c++
template <typename TextureEvaluator>
PBRT_CPU_GPU ConcreteBxDF GetBxDF(TextureEvaluator texEval, MaterialEvalContext ctx,
                                 SampledWavelengths &lambda) const;
```

`GetBSDF`会调用`GetBxDF`, 这里通过模板获取实际的返回类型.

```c++
template <typename TextureEvaluator>
inline BSDF Material::GetBSDF(TextureEvaluator texEval, MaterialEvalContext ctx,
                              SampledWavelengths &lambda,
                              ScratchBuffer &scratchBuffer) const {
    // Define _getBSDF_ lambda function for _Material::GetBSDF()_
    auto getBSDF = [&](auto mtl) -> BSDF {
        using ConcreteMtl = typename std::remove_reference_t<decltype(*mtl)>;
        using ConcreteBxDF = typename ConcreteMtl::BxDF;
        if constexpr (std::is_same_v<ConcreteBxDF, void>)
            return BSDF();
        else {
            // Allocate memory for _ConcreteBxDF_ and return _BSDF_ for material
            ConcreteBxDF *bxdf = scratchBuffer.Alloc<ConcreteBxDF>();
            *bxdf = mtl->GetBxDF(texEval, ctx, lambda);
            return BSDF(ctx.ns, ctx.dpdus, bxdf);
        }
    };

    return DispatchCPU(getBSDF);
}
```

包含了次表面散射的材质需要实现`GetBSSRDF`, 实现上与`GetBSDF`类似.

```c++
template <typename TextureEvaluator>
PBRT_CPU_GPU ConcreteBSSRDF GetBSSRDF(TextureEvaluator texEval,
                                      const MaterialEvalContext &ctx,
                                      SampledWavelengths &lambda) const;
```

```c++
template <typename TextureEvaluator>
inline BSSRDF Material::GetBSSRDF(TextureEvaluator texEval, MaterialEvalContext ctx,
                                  SampledWavelengths &lambda,
                                  ScratchBuffer &scratchBuffer) const {
    auto get = [&](auto mtl) -> BSSRDF {
        using Material = typename std::remove_reference_t<decltype(*mtl)>;
        using MaterialBSSRDF = typename Material::BSSRDF;
        if constexpr (std::is_same_v<MaterialBSSRDF, void>)
            return nullptr;
        else {
            MaterialBSSRDF *bssrdf = scratchBuffer.Alloc<MaterialBSSRDF>();
            *bssrdf = mtl->GetBSSRDF(texEval, ctx, lambda);
            return BSSRDF(bssrdf);
        }
    };
    return DispatchCPU(get);
}
```

`MaterialEvalContext`与`TextureEvalContext`类似, 包含了求解材质的必要信息, 这些信息包含在`TextureEvalContext`中, 因此pbrt采用了继承.

```c++
struct MaterialEvalContext : public TextureEvalContext {
    // MaterialEvalContext Public Methods
    MaterialEvalContext() = default;
    PBRT_CPU_GPU
    MaterialEvalContext(const SurfaceInteraction &si)
        : TextureEvalContext(si), wo(si.wo), ns(si.shading.n), dpdus(si.shading.dpdu) {}
    std::string ToString() const;

    Vector3f wo;
    Normal3f ns;
    Vector3f dpdus;
};
```

pbrt通过`TextureEvaluator`求解纹理, 而非直接调用`Texture::Evaluate`, 这使得pbrt可以在GPU上根据`TextureEvaluator::CanEvaluate`返回的信息预先判断材质是否具有重量级的纹理, 并将这两种纹理分离. 在CPU上pbrt只使用`UniversalTextureEvaluator`, 它内部直接调用`Evaluate`.

```c++
SampledSpectrum UniversalTextureEvaluator::operator()(SpectrumTexture tex,
                                                      TextureEvalContext ctx,
                                                      SampledWavelengths lambda) {
    return tex.Evaluate(ctx, lambda);
}
```

### 材质实现

#### 漫反射材质

漫反射的`GetBxDF`会将反射值限制在\\([0,1]\\).

```c++
template <typename TextureEvaluator>
DiffuseBxDF GetBxDF(TextureEvaluator texEval, MaterialEvalContext ctx,
                    SampledWavelengths &lambda) const {
    SampledSpectrum r = Clamp(texEval(reflectance, ctx, lambda), 0, 1);
    return DiffuseBxDF(r);
}
```

#### 绝缘体材质

`DielectricMaterial`的IOR通过光谱分布存储, 光谱渲染时会导致散射, pbrt在折射时通过`TerminateSecondary`来只保留一条光线, 除非IOR是常量.

```c++
template <typename TextureEvaluator>
PBRT_CPU_GPU DielectricBxDF GetBxDF(TextureEvaluator texEval, MaterialEvalContext ctx,
                                    SampledWavelengths &lambda) const {
    // Compute index of refraction for dielectric material
    Float sampledEta = eta(lambda[0]);
    if (!eta.template Is<ConstantSpectrum>())
        lambda.TerminateSecondary();
    // Handle edge case in case lambda[0] is beyond the wavelengths stored by the
    // Spectrum.
    if (sampledEta == 0)
        sampledEta = 1;

    // Create microfacet distribution for dielectric material
    Float urough = texEval(uRoughness, ctx), vrough = texEval(vRoughness, ctx);
    if (remapRoughness) {
        urough = TrowbridgeReitzDistribution::RoughnessToAlpha(urough);
        vrough = TrowbridgeReitzDistribution::RoughnessToAlpha(vrough);
    }
    TrowbridgeReitzDistribution distrib(urough, vrough);

    // Return BSDF for dielectric material
    return DielectricBxDF(sampledEta, distrib);
}
```

#### 混合材质

混合材质无法返回BSDF, 因此这里的混合是概率上的混合, 每次随机选取一个材质来执行材质求解.

```c++
template <typename TextureEvaluator>
Material ChooseMaterial(TextureEvaluator texEval,
                        MaterialEvalContext ctx) const {
    Float amt = texEval(amount, ctx);
    if (amt <= 0) return materials[0];
    if (amt >= 1) return materials[1];
    Float u = HashFloat(ctx.p, ctx.wo, materials[0], materials[1]);
    return (amt < u) ? materials[0] : materials[1];
}
```

### 获取表面BSDF

pbrt的`Integrator`通过`SurfaceInteraction`获取表面信息, 因此需要`SurfaceInteraction`返回BSDF.

```c++
BSDF SurfaceInteraction::GetBSDF(const RayDifferential &ray, SampledWavelengths &lambda,
                                 Camera camera, ScratchBuffer &scratchBuffer,
                                 Sampler sampler) {
    // Estimate $(u,v)$ and position differentials at intersection point
    ComputeDifferentials(ray, camera, sampler.SamplesPerPixel());

    // Resolve _MixMaterial_ if necessary
    while (material.Is<MixMaterial>()) {
        MixMaterial *mix = material.Cast<MixMaterial>();
        material = mix->ChooseMaterial(UniversalTextureEvaluator(), *this);
    }

    // Return unset _BSDF_ if surface has a null material
    if (!material)
        return {};

    // Evaluate normal or bump map, if present
    FloatTexture displacement = material.GetDisplacement();
    const Image *normalMap = material.GetNormalMap();
    if (displacement || normalMap) {
        // Get shading $\dpdu$ and $\dpdv$ using normal or bump map
        Vector3f dpdu, dpdv;
        if (normalMap)
            NormalMap(*normalMap, *this, &dpdu, &dpdv);
        else
            BumpMap(UniversalTextureEvaluator(), displacement, *this, &dpdu, &dpdv);

        Normal3f ns(Normalize(Cross(dpdu, dpdv)));
        SetShadingGeometry(ns, dpdu, dpdv, shading.dndu, shading.dndv, false);
    }

    // Return BSDF for surface interaction
    BSDF bsdf =
        material.GetBSDF(UniversalTextureEvaluator(), *this, lambda, scratchBuffer);
    if (bsdf && GetOptions().forceDiffuse) {
        // Override _bsdf_ with diffuse equivalent
        SampledSpectrum r = bsdf.rho(wo, {sampler.Get1D()}, {sampler.Get2D()});
        bsdf = BSDF(shading.n, shading.dpdu, scratchBuffer.Alloc<DiffuseBxDF>(r));
    }
    return bsdf;
}
```

### 法线映射

法线映射通过法线纹理实现, 纹理中存储的是切线空间下的法线, 在pbrt中即以法线为\\(z\\)轴, 切线为\\(x\\)轴. 在pbrt-v4中只有法线纹理是明确要用RGB存储的, 因此只存储在图片中, 通过`NormalMap`函数返回.

```c++
inline PBRT_CPU_GPU void NormalMap(const Image &normalMap,
                                   const NormalBumpEvalContext &ctx, Vector3f *dpdu,
                                   Vector3f *dpdv) {
    // Get normalized normal vector from normal map
    WrapMode2D wrap(WrapMode::Repeat);
    Point2f uv(ctx.uv[0], 1 - ctx.uv[1]);
    Vector3f ns(2 * normalMap.BilerpChannel(uv, 0, wrap) - 1,
                2 * normalMap.BilerpChannel(uv, 1, wrap) - 1,
                2 * normalMap.BilerpChannel(uv, 2, wrap) - 1);
    ns = Normalize(ns);

    // Transform tangent-space normal to rendering space
    Frame frame = Frame::FromXZ(Normalize(ctx.shading.dpdu), Vector3f(ctx.shading.n));
    ns = frame.FromLocal(ns);

    // Find $\dpdu$ and $\dpdv$ that give shading normal
    Float ulen = Length(ctx.shading.dpdu), vlen = Length(ctx.shading.dpdv);
    *dpdu = Normalize(GramSchmidt(ctx.shading.dpdu, ns)) * ulen;
    *dpdv = Normalize(Cross(ns, *dpdu)) * vlen;
}
```

`NormalBumpEvalContext`定义如下.

```c++
struct NormalBumpEvalContext {
    // NormalBumpEvalContext Public Methods
    NormalBumpEvalContext() = default;
    PBRT_CPU_GPU
    NormalBumpEvalContext(const SurfaceInteraction &si)
        : p(si.p()),
          uv(si.uv),
          n(si.n),
          dudx(si.dudx),
          dudy(si.dudy),
          dvdx(si.dvdx),
          dvdy(si.dvdy),
          dpdx(si.dpdx),
          dpdy(si.dpdy),
          faceIndex(si.faceIndex) {
        shading.n = si.shading.n;
        shading.dpdu = si.shading.dpdu;
        shading.dpdv = si.shading.dpdv;
        shading.dndu = si.shading.dndu;
        shading.dndv = si.shading.dndv;
    }
    std::string ToString() const;

    PBRT_CPU_GPU
    operator TextureEvalContext() const {
        return TextureEvalContext(p, dpdx, dpdy, n, uv, dudx, dudy, dvdx, dvdy,
                                  faceIndex);
    }

    // NormalBumpEvalContext Public Members
    Point3f p;
    Point2f uv;
    Normal3f n;
    struct {
        Normal3f n;
        Vector3f dpdu, dpdv;
        Normal3f dndu, dndv;
    } shading;
    Float dudx = 0, dudy = 0, dvdx = 0, dvdy = 0;
    Vector3f dpdx, dpdy;
    int faceIndex = 0;
};
```

### 视差映射

视差纹理记录表面高度, 以此生成新的几何位置和法线.

$$
\begin{equation}
p'(u,v)=p(u,v)+d(u,v)\bold{n}(u,v)
\end{equation}
$$

此时可以得到新的导数, 由于\\(d(u,v)\\)通常很小, 有些渲染器会省略最后一项.

$$
\begin{equation}
\frac{\partial p'}{\partial u}=\frac{\partial p(u,v)}{\partial u}+\bold{n}(u,v)\frac{\partial d(u,v)}{\partial u}+d(u,v)\frac{\partial\bold{n}(u,v)}{\partial u}
\end{equation}
$$

\\(d(u,v)\\)的导数可以通过导数的定义来计算.

$$
\begin{equation}
\frac{\partial d(u,v)}{\partial u}=\lim_{\Delta_u \to 0}\frac{d(u+\Delta_u,v)-d(u,v)}{\Delta_u}
\end{equation}
$$

\\(\Delta_u\\)的计算方式如下, 这里考虑到了浮点精度.

```c++
Float du = .5f * (std::abs(ctx.dudx) + std::abs(ctx.dudy));
if (du == 0) du = .0005f;
shiftedCtx.p = ctx.p + du * ctx.shading.dpdu;
shiftedCtx.uv = ctx.uv + Vector2f(du, 0.f);
```

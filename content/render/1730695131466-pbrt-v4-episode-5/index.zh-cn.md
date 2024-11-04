---
title: "pbrt-v4 Ep. V: 相机模型"
date: 2024-11-04
draft: false
description: "a description"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

## 相机接口

pbrt的相机接口生成的样本包括`time`成员, 用于模拟在相机快门打开这一时间段的不同时刻抵达的光线. 这给Monte Carlo增加了一个维度, 采样\\((0,1)\\)均匀分布即可.

pbrt的相机接口支持修改图片元数据, 最终会写入硬盘.

### 坐标空间

光栅化渲染器通常使用相机空间作为渲染空间来裁掉视锥空间以外的物体, 光追渲染器则以世界空间为主, 这保证了基于轴对齐包围盒的加速结构的有效性,但世界空间很容易带来浮点精度问题. pbrt采用相机世界空间, 即原点位于相机但是坐标轴与世界空间对齐.

pbrt的相机保留以下两个变换, 通过修改`renderFromCamera`来渲染运动物体, 否则修改`worldFromRender`会影响包围盒的构建, 因为运动物体的包围盒需要考虑运动范围. 这两个变换从场景指定的`worldFromCamera`分解出来.

```c++
AnimatedTransform renderFromCamera;
Transform worldFromRender;
```

### 基类

基类`CameraBase`在`GenerateRayDifferential`实现了光线微分的计算, 通过多次调用`GenerateRay`来实现. 该函数计算dx与dy, 为防止超出图像范围, 正负两侧都会尝试计算. 由于pbrt不使用虚函数, 派生类需要实现相关函数并把`this`传入.

```c++
pstd::optional<CameraRayDifferential> CameraBase::GenerateRayDifferential(
    Camera camera, CameraSample sample, SampledWavelengths &lambda) {
    // Generate regular camera ray _cr_ for ray differential
    pstd::optional<CameraRay> cr = camera.GenerateRay(sample, lambda);
    if (!cr)
        return {};
    RayDifferential rd(cr->ray);

    // Find camera ray after shifting one pixel in the $x$ direction
    pstd::optional<CameraRay> rx;
    for (Float eps : {.05f, -.05f}) {
        CameraSample sshift = sample;
        sshift.pFilm.x += eps;
        // Try to generate ray with _sshift_ and compute $x$ differential
        if (rx = camera.GenerateRay(sshift, lambda); rx) {
            rd.rxOrigin = rd.o + (rx->ray.o - rd.o) / eps;
            rd.rxDirection = rd.d + (rx->ray.d - rd.d) / eps;
            break;
        }
    }

    // Find camera ray after shifting one pixel in the $y$ direction
    pstd::optional<CameraRay> ry;
    for (Float eps : {.05f, -.05f}) {
        CameraSample sshift = sample;
        sshift.pFilm.y += eps;
        if (ry = camera.GenerateRay(sshift, lambda); ry) {
            rd.ryOrigin = rd.o + (ry->ray.o - rd.o) / eps;
            rd.ryDirection = rd.d + (ry->ray.d - rd.d) / eps;
            break;
        }
    }

    // Return approximate ray differential and weight
    rd.hasDifferentials = rx && ry;
    return CameraRayDifferential{rd, cr->weight};
}
```

## 投影相机

光追渲染器只通过投影矩阵生成光线, 不考虑光栅化渲染中常见的裁剪问题.

### 正交投影

正交投影的性质使得光线微分只需要考虑光线原点的位移.

### 透视投影

略.

### 薄镜头模型

现实里的小孔成像模型需要长时间的曝光, 会导致严重的动态模糊. 真实镜头系统可以调节光圈, 光圈小则物体清晰但进光量小, 否则远处物体模糊但进光量大. pbrt通过`RealisticCamera`实现薄镜头模型近似, 通过传统投影模型来模拟真实镜头, 镜头厚度相较于镜头曲率具有较小的值. pbrt遵循高斯镜头公式, 距离焦距过远会导致弥散圆, 弥散圆的半径可以根据三角形的相似性计算. 镜头光圈大小通常通过焦距与镜头半径的比值来表示, 即f-stop值.

$$ \frac{1}{z^'} = \frac{1}{z} + \frac{1}{f} $$

对于薄镜头模型, pbrt首先计算成像点与镜头中心形成的光线与焦平面的交点, 由于所有经过透镜到达当前成像点的光线都需要经过该点, 因此只需要圆盘采样镜头上的位置与该点形成一条新的光线, 此时可以获得景深效果.

## 球形相机

pbrt通过`SphericalCamera`实现球形相机, 采用球面坐标采样, 可以通过等效矩形投影或等面积投影获取渲染图像.

## 胶片成像

### 相机测量方程

将基于立体角积分的辐射照度转换为基于面积的积分, 该式可用于积分计算镜头后切面上各个点发出的辐射亮度汇聚到胶片上某点后形成的辐射照度, 其中\\(z_f\\)是胶片到镜头的距离. 对于镜头半径与镜头距离的比值较大的镜头系统, \\(\cos\theta\\)可以有效的降低边缘光线的影响, 现代摄像机会有意的增加边缘光线的贡献度.

$$
\begin{equation}
d\omega = \frac{dA\cos\theta}{r^2}
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
E(p) 
&= \int_{A_e} L_i(p, p') \frac{|\cos\theta \cos\theta'|}{\Vert p' - p \Vert^2} dA_e\\\\
&= \frac{1}{z^2_f} \int_{A_e} L_i(p, p') |\cos\theta|^4 dA_e
\end{aligned}
\end{equation}
$$

在时间上对辐射照度进行积分可以获得辐射曝光度.

$$
\begin{equation}
H(p) = \int_{t_0}^{t_1} \frac{1}{z^2_f} \int_{A_e} L_i(p, p', t') |\cos\theta|^4 dA_e dt'
\end{equation}
$$

在感光单元面积上进行积分即可获取相机测量方程, 获取的积分值为感光元件所接收到的能量.

$$
\begin{equation}
J = \int_{A_p} \int_{t_0}^{t_1} \frac{1}{z^2_f} \int_{A_e} L_i(p, p', t') |\cos\theta|^4 dA_e dt' dA_p
\end{equation}
$$

### 感光元件感应建模

感光元件捕捉到的值可以通过光谱感应曲线计算, 由于人眼对绿色更敏感, 相机胶片中绿色感光元件的数量通常为红色与蓝色的两倍.

相机胶卷通常会设置ISO值, 高ISO值需要较少的时间来记录像素值. 在数码相机上会调整相机增益, 也就是直接给原始像素乘上某个值. 通常调高ISO值会带来更多的噪点. 

现代相机可能会按照扫描线的方式捕获图像, 需要多次打开快门, 这可能会导致动态环境下错误的渲染结果.

pbrt不会模拟噪点, 马赛克, 泛光这些现象, ISO可以用于调整曝光.

pbrt通过`PixelSensor`类来定义感光元件, 用于控制曝光, RGB响应与白平衡. 由于pbrt有小孔相机等理想模型, pbrt会特殊处理他们, 否则像小孔相机就会因为曝光量过小导致全黑的图像. 对于真实相机, 在生成相机样本时会考虑每个光线的权重, 前文薄镜头模型有提到. 光圈大小由相机类负责, 因此感光元件类只需要考虑ISO与快门时间, 这两个值构成了图像比率`imagingRatio`.

`PixelSensor`的构造需要RGB响应方程, 图像比率, 色彩空间与标准光源. 记录像素的色彩空间与输出图像的色彩空间未必是相同的, 前者由感光元件本身的性质决定, 后者与设备无光, 因此需要计算转换到XYZ空间的变换矩阵, pbrt通过积分计算在当前设定的标准光源与响应方程下各类反照率在RGB与XYZ空间下的颜色, 然后通过最小二乘法获取变换矩阵.

```c++
PixelSensor(Spectrum r, Spectrum g, Spectrum b, const RGBColorSpace *outputColorSpace,
            Spectrum sensorIllum, Float imagingRatio, Allocator alloc)
    : r_bar(r, alloc), g_bar(g, alloc), b_bar(b, alloc), imagingRatio(imagingRatio) {
    // Compute XYZ from camera RGB matrix
    // Compute _rgbCamera_ values for training swatches
    Float rgbCamera[nSwatchReflectances][3];
    for (int i = 0; i < nSwatchReflectances; ++i) {
        RGB rgb = ProjectReflectance<RGB>(swatchReflectances[i], sensorIllum, &r_bar,
                                            &g_bar, &b_bar);
        for (int c = 0; c < 3; ++c)
            rgbCamera[i][c] = rgb[c];
    }

    // Compute _xyzOutput_ values for training swatches
    Float xyzOutput[24][3];
    Float sensorWhiteG = InnerProduct(sensorIllum, &g_bar);
    Float sensorWhiteY = InnerProduct(sensorIllum, &Spectra::Y());
    for (size_t i = 0; i < nSwatchReflectances; ++i) {
        Spectrum s = swatchReflectances[i];
        XYZ xyz =
            ProjectReflectance<XYZ>(s, &outputColorSpace->illuminant, &Spectra::X(),
                                    &Spectra::Y(), &Spectra::Z()) *
            (sensorWhiteY / sensorWhiteG);
        for (int c = 0; c < 3; ++c)
            xyzOutput[i][c] = xyz[c];
    }

    // Initialize _XYZFromSensorRGB_ using linear least squares
    pstd::optional<SquareMatrix<3>> m =
        LinearLeastSquares(rgbCamera, xyzOutput, nSwatchReflectances);
    if (!m)
        ErrorExit("Sensor XYZ from RGB matrix could not be solved.");
    XYZFromSensorRGB = *m;
}
```

`PixelSensor`的`ToSensorRGB`通过Monte Carlo计算出某种光谱分布在感光元件上的RGB值, 并乘上`imagingRatio`来矫正最终得到的结果. 

```c++
RGB ToSensorRGB(SampledSpectrum L, const SampledWavelengths &lambda) const {
    L = SafeDiv(L, lambda.PDF());
    return imagingRatio * RGB((r_bar.Sample(lambda) * L).Average(),
                                (g_bar.Sample(lambda) * L).Average(),
                                (b_bar.Sample(lambda) * L).Average());
}
```

#### 色彩适应与白平衡

由于色彩适应, 在不同的光照条件下人眼可以看到一致的颜色, 相机也会实现色彩适应的过程以保证获取与拍摄者观察到的结果相一致. pbrt实现了von Kries算法, 即计算当前光源与目标光源在LMS空间下的值, 将目标LMS与源LMS的比值赋给矩阵的对角线即可获取色彩适应矩阵.

#### 感光元件响应采样

直接使用Y响应曲线采样由于峰值较为集中会导致噪点过多, 使用X,Y,Z响应曲线之和采样会导致采样点集中在人眼不敏感的波长. pbrt采用的概率分布实现了二者的平衡, 其中\\(A=0.0072\text{nm}^{-1}\\), \\(B=538\text{nm}\\), 波长采样范围为\\([360, 830]\text{nm}\\).

$$
\begin{equation}
\begin{aligned}
p_v(\lambda) &= (\int_{\lambda_{\min}}^{\lambda_{\max}} f(\lambda) d\lambda)^{-1} f(\lambda)\\\\
f(\lambda) &= (\cosh^2 (A(\lambda - B)))^{-1}
\end{aligned}
\end{equation}
$$

### 图像样本滤波

对于滤波函数\\(f\\)与图像函数\\(r\\), 滤波可以表示为以下形式, 所有像素的样本都可以影响滤波结果.

$$
\begin{equation}
r_f(x,y) = \int f(x - x', y - y') r(x', y') dx' dy'
\end{equation}
$$

通常认为每个点的贡献是相同的, 因此离散形式可以简化, \\(A\\)为胶片面积.

$$
\begin{equation}
r_f(x,y) \approx \frac{1}{n} \sum_i^n frac{f(x - x_i, y - y_i) r(x_i, y_i)}{p(x_i, y_i)}
\end{equation}
$$

$$
\begin{equation}
r_f(x,y) \approx \frac{A}{n} \sum_i^n f(x - x_i, y - y_i) r(x_i, y_i)
\end{equation}
$$

上式为无偏估计, 但样本较少时会产生估计错误, 例如图像方程为常数时由于滤波函数的和不为\\(1\\)导致错误的结果, 通常使用归一化的离散估计.

$$
\begin{equation}
r_f(x,y) \approx \frac{\sum_i f(x - x_i, y - y_i) r(x_i, y_i)}{\sum_i f(x - x_i, y - y_i)}
\end{equation}
$$

将滤波函数作为概率密度函数可以实现重要性滤波, 只需要使用当前像素的样本的性质提高了并发效率. 此时\\(p \propto f\\), 二者可以相互抵消. 考虑到滤波函数为负的情况, 最终可以表示为如下形式.

$$
\begin{equation}
r_f(x,y) \approx (\int |f(x',y')| dx' dy')(\frac{1}{n} \sum_i^n \text{sign}(f(x - x_i, y - y_i)) r(x_i, y_i))
\end{equation}
$$

由于同样的原因pbrt采用归一化的估计.

$$
\begin{equation}
\begin{aligned}
r_f(x,y) &\approx \frac{\sum_i w(x - x_i, y - y_i) r(x_i, y_i)} {\sum_i w(x - x_i, y - y_i)}\\\\
w(x,y) &= \frac{f(x,y)}{p(x,y)}
\end{aligned}
\end{equation}
$$

### 胶片接口

光线传播算法要求将光线的贡献溅射到相邻像素中, pbrt在`Film`类中定义了`AddSplat`接口. 与`AddSample`不同, `AddSplat`是线程安全的.

#### RGBFilm

`RGBFilm`类记录用RGB表示的图像, 因此构造函数需要传入色彩空间, 同时会计算与感光元件的色彩空间的变换. 为保证样本较多时的权重求和精度, `RGBFilm`采用`double`存储, 尽管这种情况十分罕见.

为避免高亮噪点, 或者说萤火虫像素, `RGBFilm`中会截断RGB值, 尽管会带来能量损失, 这有效的提升了图像质量.

```c++
Float m = std::max({rgb.r, rgb.g, rgb.b});
    if (m > maxComponentValue)
        rgb *= maxComponentValue / m;
```

`RGBFilm`通过滤波的半径来决定溅射范围, 根据滤波函数决定溅射值的权重.

```c++
PBRT_CPU_GPU void RGBFilm::AddSplat(Point2f p, SampledSpectrum L, const SampledWavelengths &lambda) {
    CHECK(!L.HasNaNs());
    // Convert sample radiance to _PixelSensor_ RGB
    RGB rgb = sensor->ToSensorRGB(L, lambda);

    // Optionally clamp sensor RGB value
    Float m = std::max({rgb.r, rgb.g, rgb.b});
    if (m > maxComponentValue)
        rgb *= maxComponentValue / m;

    // Compute bounds of affected pixels for splat, _splatBounds_
    Point2f pDiscrete = p + Vector2f(0.5, 0.5);
    Vector2f radius = filter.Radius();
    Bounds2i splatBounds(Point2i(Floor(pDiscrete - radius)),
                         Point2i(Floor(pDiscrete + radius)) + Vector2i(1, 1));
    splatBounds = Intersect(splatBounds, pixelBounds);

    for (Point2i pi : splatBounds) {
        // Evaluate filter at _pi_ and add splat contribution
        Float wt = filter.Evaluate(Point2f(p - pi - Vector2f(0.5, 0.5)));
        if (wt != 0) {
            Pixel &pixel = pixels[pi];
            for (int i = 0; i < 3; ++i)
                pixel.rgbSplat[i].Add(wt * rgb[i]);
        }
    }
}
```

#### GBufferFilm

与实时渲染类似, `GBufferFilm`在颜色信息之外会存储与当前像素对应的光线相交的物体的几何信息, 以下是`GBufferFilm`中的`Pixel`的定义.

```c++
// GBufferFilm::Pixel Definition
struct Pixel {
    Pixel() = default;
    double rgbSum[3] = {0., 0., 0.};
    double weightSum = 0., gBufferWeightSum = 0.;
    AtomicDouble rgbSplat[3];
    Point3f pSum;
    Float dzdxSum = 0, dzdySum = 0;
    Normal3f nSum, nsSum;
    Point2f uvSum;
    double rgbAlbedoSum[3] = {0., 0., 0.};
    VarianceEstimator<Float> rgbVariance[3];
};
```

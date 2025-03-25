---
title: "pbrt-v4 Ep. IV: 辐射与光"
date: 2024-10-07
draft: false
description: "pbrt v4 episode 4"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

辐射度量学研究光的表示与传播, pbrt通过光谱而非RGB来表示颜色.

## 辐射度量学

几何光学足够用于完成渲染任务, 主要损失在于无法模拟干涉与衍射.
几何光学具有以下特征.

1. 线性
2. 能量守恒
3. 无偏振
4. 无荧光、磷光, 即光在某个波长下的表现与别的波长或时间下的表现无关
5. 状态稳定, 即辐射亮度分布不随时间变化

### 基本量

#### 能量

光源发出光子, 光子携带能量.
能量单位为焦耳(J), 特定波长的光子携带的能量如下式.
其中c为光速, h为Planck常量, \\(h = 6.626\times 10^{-34} m^2 kg/s\\).

$$
\begin{equation}
Q = \frac{hc}{\lambda}
\end{equation}
$$

#### 辐射通量

辐射通量是(radiant flux)单位时间通过表面或空间的能量,
也可以被称作功率(power), 单位为J/s, 即瓦特(W).
辐射通量的定义见下式.

$$
\begin{equation}
\Phi = \frac{dQ}{dt}
\end{equation}
$$

对于一个点光源, 辐射通量为以光源为球心的球面单位时间接收到的能量,
球的半径不影响辐射通量的值.

#### 辐射照度 & 辐射出射度

辐射照度(irradiance)是单位面积接收到的辐射通量,
与之对应的辐射出射度(radiant exitance)是单位面积发出的辐射通量,
他们的单位为\\(W/m^2\\).

$$
\begin{equation}
E(p) = \frac{d\Phi}{dA}
\end{equation}
$$

同样以点光源为例, 以光源为球心的球面的辐射照度见下式.

$$
\begin{equation}
E = \frac{\Phi}{4 \pi r^2}
\end{equation}
$$

非垂直光线根据投影到光线垂直面的面积计算, \\(\theta\\)为光线与法线的夹角.

$$
\begin{equation}
E(p) = \frac{d\Phi \cos\theta}{dA}
\end{equation}
$$

#### 辐射强度

辐射强度(radiant intensity)是单位立体角上的辐射通量,
它描述了光在方向上的分布, 但实际上只对点光源有意义.

$$
\begin{equation}
I = \frac{dQ}{d\omega}
\end{equation}
$$

以点光源为球心的球面的辐射强度见下式.

$$
\begin{equation}
I = \frac{\Phi}{4 \pi}
\end{equation}
$$

#### 辐射亮度

辐射亮度(radiance)是单位面积单位立体角上的辐射通量, 即将辐射照度进一步在每个方向上微分.
辐射亮度定义见下式, 其中\\(E_{\omega}\\)代表与\\(\omega\\)垂直的表面的辐射照度.

$$
\begin{equation}
L(p, \omega)
= \frac{E_{\omega}(p)}{d\omega}
= \frac{d^2\Phi}{d\omega dA^{\perp}}
= \frac{d^2\Phi}{d\omega dA \cos\theta}
\end{equation}
$$

辐射亮度是渲染任务中最重要的辐射度量值, 别的值都可以由它积分得到,
且光在真空中传播时具有辐射亮度不变的特性.

### 入射/出射辐射方程

辐射亮度在表面边界处未必是连续的, 表面某点上方与下方的极限值需要单独表示.

$$
\begin{equation}
L^+(p,\omega)=\lim_{t \to 0^+} L(p + t \bold{n}_p, \omega)
\end{equation}
$$

$$
\begin{equation}
L^-(p,\omega)=\lim_{t \to 0^-} L(p - t \bold{n}_p, \omega)
\end{equation}
$$

为解决这一问题需要区分入射与出射辐射亮度.

$$
\begin{equation}
L_i(p, \omega) =
\begin{cases}
L^+(p, -\omega), & \omega \cdot \bold{n}_p > 0\\\\
L^-(p, -\omega), & \omega \cdot \bold{n}_p < 0
\end{cases}
\end{equation}
$$

$$
\begin{equation}
L_i(p, \omega) =
\begin{cases}
L^+(p, \omega), & \omega \cdot \bold{n}_p > 0\\\\
L^-(p, \omega), & \omega \cdot \bold{n}_p < 0
\end{cases}
\end{equation}
$$

对于空间中不在表面上的某点, 辐射亮度是连续的.

$$
\begin{equation}
L_o(p, \omega) = L_i(p, -\omega) = L(p, \omega)
\end{equation}
$$

### 辐射光谱分布

辐射亮度可以进一步对波长微分以获取辐射光谱分布.

$$
\begin{equation}
L_\lambda = \frac{dL}{d\lambda}
\end{equation}
$$

### 亮度与光度

辐射度单位都有与之对应的光度单位, 这里只讨论最基本的亮度, 其余可以积分得到.
亮度表示人眼观察到的某个光谱功率分布的值, 定义如下.
V为响应曲线即人眼对各个波长的光的敏感程度, 目前所使用的响应曲线是基于室内的实验得到的,
人眼在较暗环境对颜色的敏感度会降低, 因此无法很好的表示室外光照环境, 但仍然将其作为研究基准.

$$
\begin{equation}
Y = \int_{\lambda} L_\lambda(\lambda) V(\lambda) d\lambda
\end{equation}
$$

## 辐射度量值的积分

从辐射亮度到辐射照度的积分如图所示, 其中\\(\Omega\\)是法线上方半球覆盖的立体角,
\\(\theta\\)是立体角在单位球上对应的向量与法线的夹角.

$$
\begin{equation}
E(p, \bold{n}) = \int_\Omega L_i(p,\omega) |\cos\theta| d\omega
\end{equation}
$$

### 投影立体角上的积分

通过将单位球上的立体角投影到与法线垂直的平面可以转化为2D上的积分,
投影立体角与立体角满足Lambert定律. pbrt不会使用这种积分.

$$
\begin{equation}
\begin{aligned}
d\omega^{\perp} &= d\omega|cos\theta|\\\\
E(p, \bold{n}) &= \int_{H^2(\bold{n})} L_i(p,\omega) d\omega^{\perp}
\end{aligned}
\end{equation}
$$

### 球面坐标系上的积分

利用单位球表面积可以将立体角微分转化为球面坐标系.

$$
\begin{equation}
\begin{aligned}
d\omega &= sin\theta d\theta d\phi\\\\
E(p, \bold{n}) &= \int_0^{2\pi} \int_0^{\frac{\pi}{2}} L_i(p, \theta, \phi) cos\theta sin\theta d\theta d\phi
\end{aligned}
\end{equation}
$$

### 面积上的积分

这里的面积指的是立体角对应的入射光源处的面积, 这种转化可以方便度量面积光源对某一点的影响.
\\(\theta_o\\)是这个面积位于的平面与立体角对应的向量的夹角, r是这个表面与辐射照度度量点的距离.

$$
\begin{equation}
\begin{aligned}
d\omega &= \frac{\cos\theta_o dA}{r^2}\\\\
E(p, \bold{n}) &= \int_{A} L cos\theta_i \frac{\cos\theta_o dA}{r^2}
\end{aligned}
\end{equation}
$$

## 表面反射

我们需要反射光线的光谱与方向分布来描述反射, 对于透明物体更复杂的次表面光线传播会影响出射光线的位置.
渲染任务中通过BRDF与BSSRDF来抽象这一过程, BRDF描述反射, BSSRDF在此基础上考虑透明物体.

### BRDF

BRDF代表双向反射分布函数, 它描述出射辐射亮度与入射辐射照度的关系.

$$
\begin{equation}
f_r(p, \omega_o, \omega_i) = \frac{dL_o(p, \omega_o)}{dE(p, \omega_i)} = \frac{dL_o(p, \omega_o)}{L_i(p, \omega_i) \cos\theta_i d\omega_i}
\end{equation}
$$

BRDF具有以下两点性质.

1. 互易性

$$
\begin{equation}
f_r(p, \omega_o, \omega_i) = f_r(p, \omega_i, \omega_o)
\end{equation}
$$

2. 能量守恒

$$
\begin{equation}
\int_\Omega f_r(p, \omega_o, \omega_i) cos\theta_i d\omega_i < 1
\end{equation}
$$

BRDF的半球-方向反射量可以用于表示入射光从所有方向均匀照射时某个方向的反射辐射亮度,
由于互易性也可以表示各个方向都具有相同的反射辐射亮度时对应的某个方向的入射辐射亮度.

$$
\begin{equation}
\rho_{hd}(\omega_o) = \int_\Omega f_r(p, \omega_o, \omega_i) cos\theta_i d\omega_i
\end{equation}
$$

BRDF的半球-半球反射量代表入射光从所有方向均匀照射时的反射率.

$$
\begin{equation}
\rho_{hh} = \int_\Omega \frac{\int_\Omega f_r(p, \omega_o, \omega_i) \cos\theta_i d\omega_i}{\int_\Omega \cos\theta_i d\omega_i} \cos\theta_o d\omega_o
\end{equation}
$$

### BTDF

BTDF代表双向透射分布函数, 与BRDF具有相似的形式, 它不遵循互易性.

### BSDF

将BRDF与BTDF一起考虑时被称为BSDF, 即双向散射分布函数, 此时可以使用整个球面的入射光线计算出射方向的辐射亮度.

$$
\begin{equation}
L_o(p, \omega_o) = \int_\Theta f(p, \omega_o, \omega_i) L_i(p, \omega_i) |\cos\theta_i| d\omega_i
\end{equation}
$$

### BSSRDF

BSSRDF代表双向散射表面反射分布函数, 时出射位置辐射亮度微分与入射位置辐射通量微分的比值,
用于表示光线在表面内部传播再后离开表面的现象, 即次表面散射.

$$
\begin{equation}
S(p_o, \omega_o, p_i, \omega_i) = \frac{dL_o(p_o, \omega_o)}{d\Phi(p_i, \omega_i)}
\end{equation}
$$

出射辐射亮度需要计算在入射立体角与面积上的积分.

$$
\begin{equation}
L_o(p_o, \omega_o) = \int_A \int_\Omega S(p_o, \omega_o, p_i, \omega_i) L_i(p_i, \omega_i) |\cos\theta_i| d\omega_i dA
\end{equation}
$$

## 自发光

达到一定温度后带电荷的原子的运动会导致不同波长的电磁辐射的释放, 室温下大部分物体只发射红外光.

发光效率代表光源将多少功率转化为可见光, 单位lm/W.
分母可以是光源使用的功率或发出的所有波长上的功率, 若为使用功率,
则发光效率也代表光源将功率转化为电磁辐射的效率.

此外, 光出射度与辐射照度在单位面积上的比值或出射亮度与辐射亮度在单位面积单位立体角上的比值也可以定义发光效率.

$$
\begin{equation}
\frac{\int_\lambda \Phi_e(\lambda) V(\lambda) d\lambda}{\int_\lambda \Phi_i(\lambda) d\lambda}
\end{equation}
$$

### 黑体发光

黑体是一种理想发光光源, 可以最高效率的将功率转化为电磁辐射.
黑体这个名字是因为它几乎吸收所有波长的光线且不会反射它们.

Planck定律表达了黑体中波长、温度与辐射亮度的关系.
h为Planck常数, c为光速, \\(k_b\\)为Boltzmann常数, \\(k_b = 1.3806488 \times 10^{-23} J/K\\).

$$
\begin{equation}
L_e(\lambda, T) = \frac{2hc^2}{\lambda^5(e^{\frac{hc}{\lambda k_b T}} - 1)}
\end{equation}
$$

根据Kirchhoff定律, 非黑体的辐射与它吸收掉的辐射亮度相关, 利用半球-方向反射量可以得到下式.

$$
\begin{equation}
{L_e}'(T, \omega, \lambda) = L_e(\lambda, T)(1 - \rho_{hd}(\omega))
\end{equation}
$$

Stefan–Boltzmann定律给出了黑体的辐射出射度, \\(\sigma\\)为Stefan–Boltzmann常数,
\\(\sigma = 5.67032 \times 10^{-8} Wm^{-2}K^{-4}\\).

$$
\begin{equation}
M(p) = \sigma T^4
\end{equation}
$$

若发光体发出的光谱分布与某个温度下黑体辐射发出的光谱分布类似, 此时该发光体以该温度作为色温.
通过光源发光最大处的波长与Wien位移定律可以确定当前的色温, b为Wien位移常数,
\\(b = 2.897721 \times 10^{-3}mK\\).

$$
\begin{equation}
\lambda_{\max} = \frac{b}{T}
\end{equation}
$$

通常5000K以上的色温为冷色, 2700-3000K为暖色.

### 标准光源

标准光源是由CIE(国际照明委员会)定义的.

标准光源A用于表示常见的白炽灯, 色温2856K.

标准光源D用于描述日光的不同阶段, 一个权重用于表示受云量影响的黄蓝变化,
另一个表示受湿度影响的粉绿变化. D65与欧洲中午光照类似, 色温6504K, CIE推荐将它作为标准日光.

标准光源F用于表示荧光.

## 光谱分布

本节主要介绍pbrt中对光谱的抽象, 注意这里并不特指辐射光谱分布, 可以是任意值的分布. pbrt只会存储可见光.

```c++
constexpr Float Lambda_min = 360, Lambda_max = 830;
```

### 光谱接口

pbrt中的`Spectrum`继承自`TaggedPointer`来实现运行时多态并避免虚表开销,
`TaggedPointer`中定义的函数子类必须实现.

```c++
class Spectrum : public TaggedPointer<ConstantSpectrum, DenselySampledSpectrum,
                                      PiecewiseLinearSpectrum, RGBAlbedoSpectrum,
                                      RGBUnboundedSpectrum, RGBIlluminantSpectrum,
                                      BlackbodySpectrum> {
  // ...
};
```

`Spectrum`通过函数子返回特定波长下的分布. `Dispatch`用于确定分派函数到具体实现.

```c++
inline Float Spectrum::operator()(Float lambda) const {
    auto op = [&](auto ptr) { return (*ptr)(lambda); };
    return Dispatch(op);
}
```

`Spectrum`的实现必须提供`MaxValue`以保证高效的采样.

```c++
Float MaxValue() const;
```

### 通用光谱分布

#### ConstantSpectrum

返回常数值.

#### DenselySampledSpectrum

`DenselySampledSpectrum`存储\\([\lambda_min, \lambda_max]\\)下以1nm为区间采样到的值.
这通过采样另一个`Spectrum`来实现. 显然这种查表方法会分配较大的内存.

```c++
DenselySampledSpectrum(Spectrum spec, int lambda_min = Lambda_min,
                       int lambda_max = Lambda_max, Allocator alloc = {})
    : lambda_min(lambda_min), lambda_max(lambda_max),
      values(lambda_max - lambda_min + 1, alloc) {
    if (spec)
        for (int lambda = lambda_min; lambda <= lambda_max; ++lambda)
            values[lambda - lambda_min] = spec(lambda);
}
```

#### PiecewiseLinearSpectrum

`PiecewiseLinearSpectrum`定义少量插值点再插值得到各个波长下的值,
对于部分区间比较平滑的分布这可以有效节省内存.
构造函数中会对插值点排序, 读取功率时`PiecewiseLinearSpectrum`找到对应区间并插值.

```c++
Float PiecewiseLinearSpectrum::operator()(Float lambda) const {
    // Handle _PiecewiseLinearSpectrum_ corner cases
    if (lambdas.empty() || lambda < lambdas.front() || lambda > lambdas.back())
        return 0;

    // Find offset to largest _lambdas_ below _lambda_ and interpolate
    int o = FindInterval(lambdas.size(), [&](int i) { return lambdas[i] <= lambda; });
    DCHECK(lambda >= lambdas[o] && lambda <= lambdas[o + 1]);
    Float t = (lambda - lambdas[o]) / (lambdas[o + 1] - lambdas[o]);
    return Lerp(t, values[o], values[o + 1]);
}
```

#### BlackbodySpectrum

`BlackbodySpectrum`通过温度构造, 由于黑体光谱中功率过大采样时会通过最大功率值归一化.

```c++
PBRT_CPU_GPU
BlackbodySpectrum(Float T) : T(T) {
    // Compute blackbody normalization constant for given temperature
    Float lambdaMax = 2.8977721e-3f / T;
    normalizationFactor = 1 / Blackbody(lambdaMax * 1e9f, T);
}

PBRT_CPU_GPU
Float operator()(Float lambda) const {
    return Blackbody(lambda, T) * normalizationFactor;
}
```

### 嵌入光谱数据

部分常见的光谱分布可以直接通过字符串获取, 例如`DenselySampledSpectrum`类型的D65光源.

```c++
Spectrum GetNamedSpectrum(std::string name);
```

### 采样光谱分布

pbrt不提供复杂的积分计算功能, 但是会提供采样函数以执行Monte Carlo积分, 默认采样4个不同的波长.

#### SampledSpectrum

`SampledSpectrum`用于存储多个采样样本.

```c++
explicit SampledSpectrum(Float c) { values.fill(c); }
SampledSpectrum(pstd::span<const Float> v) {
    for (int i = 0; i < NSpectrumSamples; ++i)
        values[i] = v[i];
}
```

pbrt提供bool重载使得采样值全为0时可以跳过计算.

```c++
explicit operator bool() const {
    for (int i = 0; i < NSpectrumSamples; ++i)
        if (values[i] != 0) return true;
    return false;
}
```

pbrt支持逐样本数学计算, 例如加法.

```c++
SampledSpectrum &operator+=(const SampledSpectrum &s) {
    for (int i = 0; i < NSpectrumSamples; ++i)
        values[i] += s.values[i];
    return *this;
}
```

#### SampledWavelengths

`SampledWavelengths`会存储每个样本的采样波长与概率密度,
与`SampledSpectrum`分开存储主要是因为`SampledSpectrum`在渲染过程中(尤其是GPU)需要大量创建,
分离出去可以减小对象的内存占用. 同时, 经过一段时间的开发后, pbrt的作者发现混合不同波长的计算并不会导致bug.

```c++
pstd::array<Float, NSpectrumSamples> lambda, pdf;
```

最基础的均匀采样如下.

```c++
PBRT_CPU_GPU
static SampledWavelengths SampleUniform(Float u, Float lambda_min = Lambda_min,
                                        Float lambda_max = Lambda_max) {
    SampledWavelengths swl;
    // Sample first wavelength using _u_
    swl.lambda[0] = Lerp(u, lambda_min, lambda_max);

    // Initialize _lambda_ for remaining wavelengths
    Float delta = (lambda_max - lambda_min) / NSpectrumSamples;
    for (int i = 1; i < NSpectrumSamples; ++i) {
        swl.lambda[i] = swl.lambda[i - 1] + delta;
        if (swl.lambda[i] > lambda_max)
            swl.lambda[i] = lambda_min + (swl.lambda[i] - lambda_max);
    }

    // Compute PDF for sampled wavelengths
    for (int i = 0; i < NSpectrumSamples; ++i)
        swl.pdf[i] = 1 / (lambda_max - lambda_min);

    return swl;
}
```

散射可能导致不同波长的光具有不同的传播路径, pbrt支持只保留一个样本继续传播光线.
由于这些样本都遵循相同的分布, pbrt保留第0个样本即可. 类似于俄罗斯轮盘,
保留的样本的概率密度会乘上它在这个过程中存活的概率`1 / NSpectrumSamples`.

```c++
PBRT_CPU_GPU
void TerminateSecondary() {
    if (SecondaryTerminated())
        return;
    // Update wavelength probabilities for termination
    for (int i = 1; i < NSpectrumSamples; ++i)
        pdf[i] = 0;
    pdf[0] /= NSpectrumSamples;
}

PBRT_CPU_GPU
bool SecondaryTerminated() const {
    for (int i = 1; i < NSpectrumSamples; ++i)
        if (pdf[i] != 0)
            return false;
    return true;
}
```

## 颜色

与光谱分布相比, 颜色会更多的考虑人眼的感知, 而非单纯的物理量.
pbrt基于光谱分布而非颜色, 但是由于处理渲染图像输出、部分场景描述使用颜色来表示反射率等信息等原因,
pbrt需要正确的处理颜色与光谱分布的转换.

三刺激理论中使用三个光谱匹配函数计算得到的刺激值即可表示颜色.
匹配函数是以波长为参数的函数, 值代表某个波长的光对应的刺激值.
某种颜色的光通常由多个波长上的光混合得到, 与匹配函数内积相当于把每个波长上的光转为刺激值后再线性相加.
由于人眼对光刺激的响应是线性的, 在色彩空间中颜色的加法与缩放是允许的,
但是颜色之间并不能相乘, 这也是RGB渲染的问题之一.

颜色匹配积分如下, S为光谱分布, \\(m_{1,2,3}\\)为三刺激理论中RGB对应的波长各自的匹配函数.

$$
\begin{equation}
v_i = \int_\lambda S(\lambda)m_i(\lambda)d\lambda
\end{equation}
$$

### XYZ色彩空间

CIE通过大量实验定义了RGB色彩空间, 通过将选定的三原色混合来形成所测量的颜色,
根据三种颜色的功率获取对应的当前波长的颜色在色彩匹配函数中的值.
其中R是有负值的, 因为部分颜色无法表示, 需要从相反方向添加红色形成该颜色.

RGB色度图边缘代表光谱颜色, 即某个波长的光形成的颜色.
非光谱颜色由多个波长的光混合得到, 即对色度图边缘上的点做线性插值.
由于色度图边缘形成凸包, 因此非光谱颜色一定位于色度图的内部.

由于RGB空间有负值不便于计算, 经过线性变换后得到XYZ色彩空间.
XYZ色彩空间是设备无关的, 通常用于色彩空间转换的中介.

Y上的匹配函数在设计时特地与用于计算亮度的光谱响应曲线成正比,
满足\\(V(\lambda) = 683 Y(\lambda)\\).
pbrt中使用Y归一化后的色彩值, 这使得常数光谱的Y值仍然为相同的常数.

$$
\begin{equation}
\begin{aligned}
x_\lambda &= \frac{\int_\lambda S(\lambda)X(\lambda)d\lambda}{\int_\lambda Y(\lambda)d\lambda}\\\\
y_\lambda &= \frac{\int_\lambda S(\lambda)Y(\lambda)d\lambda}{\int_\lambda Y(\lambda)d\lambda}\\\\
z_\lambda &= \frac{\int_\lambda S(\lambda)Z(\lambda)d\lambda}{\int_\lambda Y(\lambda)d\lambda}
\end{aligned}
\end{equation}
$$

pbrt支持获取X、Y、Z对应的`DenselySampledSpectrum`类型的光谱分布.

```c++
namespace Spectra {
    const DenselySampledSpectrum &X();
    const DenselySampledSpectrum &Y();
    const DenselySampledSpectrum &Z();
}
```

pbrt支持通过计算积分将光谱分布转化为XYZ空间的颜色.

```c++
XYZ SpectrumToXYZ(Spectrum s) {
    return XYZ(InnerProduct(&Spectra::X(), s),
               InnerProduct(&Spectra::Y(), s),
               InnerProduct(&Spectra::Z(), s)) / CIE_Y_integral;
}
```

`SampledSpectrum`可以通过Monte Carlo转化为XYZ(感觉样本不太够).

```c++
XYZ SampledSpectrum::ToXYZ(const SampledWavelengths &lambda) const {
    // Sample the $X$, $Y$, and $Z$ matching curves at _lambda_
    SampledSpectrum X = Spectra::X().Sample(lambda);
    SampledSpectrum Y = Spectra::Y().Sample(lambda);
    SampledSpectrum Z = Spectra::Z().Sample(lambda);

    // Evaluate estimator to compute $(x,y,z)$ coefficients
    SampledSpectrum pdf = lambda.PDF();
    return XYZ(SafeDiv(X * *this, pdf).Average(), SafeDiv(Y * *this, pdf).Average(),
               SafeDiv(Z * *this, pdf).Average()) /
           CIE_Y_integral;
}
```

### xyY色彩空间

颜色可以被分离为亮度(lightness, 不是luminance)与色度(chroma),
色度通过投影到\\(x+y+z=1\\)平面即可得到, 投影后为舌状图.

$$
\begin{equation}
\begin{aligned}
x &= \frac{x_\lambda}{x_\lambda + y_\lambda + z_\lambda}\\\\
y &= \frac{y_\lambda}{x_\lambda + y_\lambda + z_\lambda}\\\\
Y &= x_\lambda + y_\lambda + z_\lambda
\end{aligned}
\end{equation}
$$

### RGB颜色

每个显示器都具有不同的RGB响应曲线, 这代表着显示器三原色的光谱响应特性, 其它颜色都通过三原色的线性相加获取.
在RGB响应曲线已知的情况下, 通过XYZ匹配函数获取原色色度, 根据白点添加色度变换, 即可定义到XYZ空间的色彩变换矩阵.

$$
\begin{equation}
\begin{bmatrix}
x_\lambda\\\\
y_\lambda\\\\
z_\lambda
\end{bmatrix} =
\begin{pmatrix}
\int_\lambda R(\lambda) X(\lambda)d\lambda & \int_\lambda G(\lambda) X(\lambda)d\lambda & \int_\lambda B(\lambda) X(\lambda)d\lambda\\\\
\int_\lambda R(\lambda) Y(\lambda)d\lambda & \int_\lambda G(\lambda) Y(\lambda)d\lambda & \int_\lambda B(\lambda) Y(\lambda)d\lambda\\\\
\int_\lambda R(\lambda) Z(\lambda)d\lambda & \int_\lambda G(\lambda) Z(\lambda)d\lambda & \int_\lambda B(\lambda) Z(\lambda)d\lambda
\end{pmatrix}
\begin{bmatrix}
r\\\\
g\\\\
b
\end{bmatrix}
\end{equation}
$$

pbrt中通过三刺激值直接得到对应的光谱, 这步是不对的, 代码里没有这么做, 同时矩阵也是反的.


### RGB色彩空间

某种响应曲线对应下三原色(R为当前响应曲线下的(1, 0, 0)对应的颜色, G、B同理)的色度在色度图上构成的三角形定义了当前色彩空间的范围.
该色彩空间下三色值为1的颜色在色度图上的色度为白点, 由于人眼感知的问题白色通常在短波具有更高的功率, 一般选用D65作为白点. 根据白点的不同, 需要对色彩空间添加对应的变换.

`RGBColorSpace`的构造需要提供三原色的色度以及白点光谱分布. 通过三原色可以确定从XYZ到当前色彩空间的变换矩阵. 白点色度转换首先将白点从XYZ转到当前色彩空间, 然后应用缩放矩阵, 这使得当前色彩空间下的白色\\((1.0, 1.0, 1.0)\\)可以映射到正确的颜色上. 矩阵表达式与构造函数代码如下.

$$
\begin{equation}
\begin{bmatrix}
w_x \\\\
w_y \\\\
w_z \\\\
\end{bmatrix} =
\begin{pmatrix}
r_x & g_x & b_x\\\\
r_y & g_y & b_y\\\\
r_z & g_z & b_z
\end{pmatrix}
\begin{pmatrix}
c_x & 0 & 0\\\\
0 & c_y & 0\\\\
0 & 0 & c_z
\end{pmatrix}
\begin{bmatrix}
1\\\\
1\\\\
1
\end{bmatrix}
\end{equation}
$$

```c++
RGBColorSpace::RGBColorSpace(Point2f r, Point2f g, Point2f b, Spectrum illuminant,
                             const RGBToSpectrumTable *rgbToSpec, Allocator alloc)
    : r(r), g(g), b(b), illuminant(illuminant, alloc), rgbToSpectrumTable(rgbToSpec) {
    // Compute whitepoint primaries and XYZ coordinates
    XYZ W = SpectrumToXYZ(illuminant);
    w = W.xy();
    XYZ R = XYZ::FromxyY(r), G = XYZ::FromxyY(g), B = XYZ::FromxyY(b);

    // Initialize XYZ color space conversion matrices
    SquareMatrix<3> rgb(R.X, G.X, B.X, R.Y, G.Y, B.Y, R.Z, G.Z, B.Z);
    XYZ C = InvertOrExit(rgb) * W;
    XYZFromRGB = rgb * SquareMatrix<3>::Diag(C[0], C[1], C[2]);
    RGBFromXYZ = InvertOrExit(XYZFromRGB);
}
```

#### 标准色彩空间

常见的色彩空间如下, 它们在pbrt中都被预定义了.

1. sRGB, 90年代为Web标准颜色而开发, 目前应用最广泛
2. DCI-P3, 为数字影视行业开发, 色域广于sRGB, 应用逐渐扩大(比如我写这篇文章的mba就默认P3色域)
3. Rec2020, 为UHDTV开发, 色域广于DCI-P3
4. ACES2065-1, 色彩空间范围超过色度图, 可用于长期数据存储, 不受行业发展的影响.

### 使用光谱渲染的原因

RGB色彩空间中颜色相乘不等于对应的光谱相乘, 例如用RGB表示入射光与反射率时得到的漫反射颜色是不正确的.
提到的另一点强调光谱提供的波长信息可以更方便的对色散、薄膜干涉、微表面的衍射等现象建模,
这一点我感觉更重要.

### 波长样本数的选择

由于每个像素会生成多个样本, 通常采样到不同的波长, 每个样本并不需要采样过多的波长.
经过数据分析简单场景下采样32个波长可以达到最优的效果, 而复杂场景下8个样本可以达到最优.
Monte Carlo下需要每个像素生成多个不同光线路径的样本来减小损失,
且Monte Carlo带来的损失要大于波长样本数造成的损失, 因此pbrt采用默认4个样本.

### RGB转光谱

光谱转RGB的过程是确定的, 但由于同色异谱等原因RGB转光谱要相对困难.
由于现有3D工具通常以RGB参数或纹理存储反射率、自发光等信息, RGB转光谱是一项重要的任务.

转换过程需要考虑3种光谱分布.

1. 发光光谱, 用于自发光光源, RGB取值范围是无界的
2. 反射光谱, 用于描述可吸收光照的表面的反射率, 由于能量守恒RGB位于[0,1]中
3. 无界光谱, 自发光之外的其他无界值, 如折射率与介质散射

首先解决反射光谱转换, 它需要满足以下三点性质.

1. 一致性, 转换得到光谱可以通过一般方法转换为当前的RGB
2. 光滑性, RGB值的微小变动应该也对应光谱的微小变动
3. 能量守恒

pbrt使用2次多项式对光谱建模, 利用sigmoid函数保持能量守恒.
由于sigmoid函数的特征, 反射率为0与1需要特殊处理.

$$
\begin{equation}
\begin{aligned}
s(x) &= \frac{1}{2} + \frac{x}{2 \sqrt{1 + x^2}}\\\\
S(\lambda) &= s(c_2 \lambda^2 + c_1 \lambda + c_0)\\\\
\end{aligned}
\end{equation}
$$

pbrt通过数值优化来求解参数, 优化方程中加入白点是为了保证在三原色上具有均匀分布.
pbrt选用CIE76\\(\Delta E\\)作为优化范式, 利用Gauss-Newton方法求解.

$$
\begin{equation}
(c_0^\*, c_1^\*, c_2^\*) = \underset{c_0,c_1,c_2} {\operatorname{argmin}}
\left\Vert
\begin{bmatrix}
r\\\\
g\\\\
b
\end{bmatrix} -
\int
\begin{bmatrix}
R(\lambda)\\\\
G(\lambda)\\\\
B(\lambda)
\end{bmatrix}
S(\lambda, c_0, c_1, c_2)
W(\lambda)
d\lambda
\right\Vert
\end{equation}
$$

为了使插值更平滑, 根据对色彩空间中参数梯度变化, pbrt根据RGB哪个值最大来决定要查的表.
例如当R最大时会把颜色做如下的转换. x、y在表中的位置是线性的, z因为在0与1附近变化最大,
是非线性的, 需要通过二分找到在表中的位置.

$$
\begin{equation}
(x,y,z)=(\frac{g}{r}, \frac{b}{r}, r)
\end{equation}
$$

此时我们可以定义`RGBAlbedoSpectrum`, 构造函数通过颜色来得到反射率分布.

```c++
RGBAlbedoSpectrum::RGBAlbedoSpectrum(const RGBColorSpace &cs, RGB rgb) {
    rsp = cs.ToRGBCoeffs(rgb);
}
```

#### 无界光谱

无界光谱定义在`RGBUnboundedSpectrum`中, 通过将最大值归一化为\\(\frac{1}{2}\\)来提升参数优化的效果.

```c++
RGBUnboundedSpectrum::RGBUnboundedSpectrum(const RGBColorSpace &cs,
                                           RGB rgb) {
    Float m = std::max({rgb.r, rgb.g, rgb.b});
    scale = 2 * m;
    rsp = cs.ToRGBCoeffs(scale ? rgb / scale : RGB(0, 0, 0));
}
Float RGBUnboundedSpectrum::operator()(Float lambda) const { return scale * rsp(lambda); }
Float RGBUnboundedSpectrum::MaxValue() const { return scale * rsp.MaxValue(); }
```

#### 自发光光谱

自发光光谱定义在`RGBIlluminantSpectrum`中, 在`RGBUnboundedSpectrum`的基础上,
自发光光源在取值时会乘上当前色彩空间的标准光源在该波长下的值,
这是为了模拟人眼对颜色的自适应, 或者说白平衡.

```c++
RGBIlluminantSpectrum::RGBIlluminantSpectrum(const RGBColorSpace &cs,
                                             RGB rgb)
    : illuminant(&cs.illuminant) {
    Float m = std::max({rgb.r, rgb.g, rgb.b});
    scale = 2 * m;
    rsp = cs.ToRGBCoeffs(scale ? rgb / scale : RGB(0, 0, 0));
}
Float RGBIlluminantSpectrum::operator()(Float lambda) const {
    if (!illuminant) return 0;
    return scale * rsp(lambda) * (*illuminant)(lambda);
}
```

## 结语

这章对辐射度量学与光谱渲染进行了详细的介绍, 反射模型相关内容也有涉及,
由于它直接影响渲染过程中光线传播显示的颜色, 后面第9章会有单独的章节细化这些内容.

RGB渲染只能说是光谱渲染的一个简化版本, 不过考虑到现有GPU架构,
光谱渲染应用在实时渲染应该还有一段距离, 积分的计算有点为难shader了.

另外, `TaggedPointer`这种显示指明子类的多态实现属实有点丑陋,
但不借助反射的话应该也没什么好方法了.

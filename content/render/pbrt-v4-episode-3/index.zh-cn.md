---
title: "pbrt-v4 Ep. III: 几何与变换"
date: 2024-10-05
draft: false
description: "pbrt v4 episode 3"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

对于所有图形学任务, 几何物体的表示都是设计的核心部分.
这一章主要介绍pbrt中几何物体接口的设计.

## 坐标系

左手系, y朝上.

## n元基类

pbrt中n元类都继承自n元基类, n元基类是带有子类的模板类,
这样可以更方便的实现子类的模板方法. `Tuple3`定义如下.

```c++
template <template <typename> class Child, typename T>
class Tuple3 {
    // ...
};
```

pbrt并未将tuple长度模板化, 这样可以支持类似`v.x`的访问方式,
当然长度模板化后可以通过下标访问, 如`v[i]`, pbrt也是支持的.

pbrt实现的方法都会限制输入输出类型与子类一致, 以加法重载为例,
参数与返回值都限制为`Child`类. 在pbrt的设计中, 子类也是模板类, 例如`Vector3<T>`.
包含不同类型参数的子类是可以运算的, 返回值由模板推导得到.

```c++
template <typename U>
auto operator+(Child<U> c) const -> Child<decltype(T{} + U{})> {
    return {x + c.x, y + c.y, z + c.z};
}
```

## 向量

向量类支持计算长度, 长度类型通过`TupleLength`类提供, 其定义如下.

```c++
template <typename T>
struct TupleLength { using type = Float; };

template <>
struct TupleLength<double> { using type = double; };
```

长度计算方法如下. 这里使用using是为了通过自定义sqrt来支持不被std::sqrt支持的类型.

```c++
template <typename T>
T LengthSquared(Vector3<T> v) { return Sqr(v.x) + Sqr(v.y) + Sqr(v.z); }

template <typename T>
auto Length(Vector3<T> v) -> typename TupleLength<T>::type {
    using std::sqrt;
    return sqrt(LengthSquared(v));
}
```

支持长度计算后`Normalize`的支持就顺水推舟了, 这里通过`auto`来保证归一化后具有正确的类型,
例如`Vector3<int>`转化为`Vector3<Float>`.

```c++
template <typename T>
auto Normalize(Vector3<T> v) { return v / Length(v); }
```

为避免`std::acos`在向量接近平行处的精度损失,
pbrt采用如下方式计算夹角, 参数需要是单位向量.

```c++
template <typename T>
Float AngleBetween(Vector3<T> v1, Vector3<T> v2) {
    if (Dot(v1, v2) < 0)
        return Pi - 2 * SafeASin(Length(v1 + v2) / 2);
    else
        return 2 * SafeASin(Length(v2 - v1) / 2);
}
```

pbrt支持施密特正交的计算.

```c++
template <typename T>
Vector3<T> GramSchmidt(Vector3<T> v, Vector3<T> w) {
    return v - Dot(v, w) * w;
}
```

pbrt支持叉乘, `DifferenceOfProducts`可以为`a*b-c*d`保留更高的精度.

```c++
template <typename T>
Vector3<T> Cross(Vector3<T> v, Vector3<T> w) {
    return {DifferenceOfProducts(v.y, w.z, v.z, w.y),
            DifferenceOfProducts(v.z, w.x, v.x, w.z),
            DifferenceOfProducts(v.x, w.y, v.y, w.x)};
}
```
pbrt支持通过一个`Vector3`来生成一个坐标系, 其余两个基向量如下.
为避免\\(1 + v_z = 0\\), 式中的符号根据\\(v_z\\)的符号修改.

$$
\left( 1 - \frac{v_x^2}{1 + v_z}, -\frac{v_x v_z}{1 + v_z}, -v_x \right)
$$
$$
\left( -\frac{v_x v_y}{1 + v_z}, 1 - \frac{v_y^2}{1 + v_z}, -v_y \right)
$$

```c++
template <typename T>
void CoordinateSystem(Vector3<T> v1, Vector3<T> *v2, Vector3<T> *v3) {
    Float sign = pstd::copysign(Float(1), v1.z);
    Float a = -1 / (sign + v1.z);
    Float b = v1.x * v1.y * a;
    *v2 = Vector3<T>(1 + sign * Sqr(v1.x) * a, sign * b, -sign * v1.x);
    *v3 = Vector3<T>(b, sign + Sqr(v1.y) * a, -v1.y);
}
```

## 点

对点进行减法可以返回向量, 点之间的距离通过向量的长度计算.

```c++
template <typename U>
auto operator-(Point3<U> p) const -> Vector3<decltype(T{} - U{})> {
    return {x - p.x, y - p.y, z - p.z};
}

template <typename T>
auto DistanceSquared(Point3<T> p1, Point3<T> p2) {
    return LengthSquared(p1 - p2);
}
```

## 法线

法线可以由平面上两个不平行的切线向量的叉乘得到, 法线可以不归一化.
与向量类相比, 法线类不允许叉乘、相加等操作.

法线通常需要在平面上方, 即某个向量对应的半球上, pbrt中通过`FaceForward`修改法线方向.

```c++
template <typename T>
Normal3<T> FaceForward(Normal3<T> n, Vector3<T> v) {
    return (Dot(n, v) < 0.f) ? -n : n;
}
```

## 光线

光线类定义了一个射线, 包括一个`Point3f`类型的原点与`Vector3f`类型的射线方向.

pbrt通过函数子计算光线上某点, 即\\(o+td\\).

```c++
Point3f operator()(Float t) const { return o + d * t; }
```

`Ray`拥有时间成员`time`, 用于特定时间的采样动态场景.

`Ray`同时拥有介质成员`medium`, 用于光线传播体渲染的计算.

### 光线微分

光线微分继承自光线, 主要用于获取\\(x\\)与\\(y\\)方向相邻样本对应的光线的信息,
以计算光线对应的面积来实现纹理采样的抗锯齿.

## 包围盒

pbrt使用轴对称包围盒(AABB), 支持2D包围盒`Bounds2`与3D包围盒`Bounds3`,
同样是通过模板类支持顶点为不同类型的包围盒.

包围盒的构造函数为赋值为当前类型的极大值与极小值.

```c++
Bounds3() {
    T minNum = std::numeric_limits<T>::lowest();
    T maxNum = std::numeric_limits<T>::max();
    pMin = Point3<T>(maxNum, maxNum, maxNum);
    pMax = Point3<T>(minNum, minNum, minNum);
}
```

包围盒支持通过下标访问最小顶点与最大顶点.

```c++
Point3<T> operator[](int i) const { return (i == 0) ? pMin : pMax; }
Point3<T> &operator[](int i) { return (i == 0) ? pMin : pMax; }
```

`Corner`函数用于通过bit flag来返回顶点, 0对应最小点, 1对应最大点.

```c++
Point3<T> Corner(int corner) const {
    return Point3<T>((*this)[(corner & 1)].x,
                     (*this)[(corner & 2) ? 1 : 0].y,
                     (*this)[(corner & 4) ? 1 : 0].z);
}
```
通过比较某点到最小点与最大点的距离可以得出该点与包围盒的最短距离, 距离类型为TupleLength.

```c++
template <typename T, typename U>
auto DistanceSquared(Point3<T> p, const Bounds3<U> &b) {
    using TDist = decltype(T{} - U{});
    TDist dx = std::max<TDist>({0, b.pMin.x - p.x, p.x - b.pMax.x});
    TDist dy = std::max<TDist>({0, b.pMin.y - p.y, p.y - b.pMax.y});
    TDist dz = std::max<TDist>({0, b.pMin.z - p.z, p.z - b.pMax.z});
    return Sqr(dx) + Sqr(dy) + Sqr(dz);
}

template <typename T, typename U>
auto Distance(Point3<T> p, const Bounds3<U> &b) {
    auto dist2 = DistanceSquared(p, b);
    using TDist = typename TupleLength<decltype(dist2)>::type;
    return std::sqrt(TDist(dist2));
}
```

pbrt支持通过AABB对角线构建包围球.

```c++
void BoundingSphere(Point3<T> *center, Float *radius) const {
    *center = (pMin + pMax) / 2;
    *radius = Inside(*center, *this) ? Distance(*center, pMax) : 0;
}
```

## 球体

球体可以用于高效的构建多个方向向量的包围结构.

### 立体角

以锥体的顶点作为球心作球面, 这个面积与半径平方的比值即为立体角, 一个球体对应的立体角为\\(4\pi\\).
立体角可以用于表示物体投影到单位圆上的投影面积, 根据球面积分单位立体角具有如下的映射方式,
其中\\(\theta\\)为极角, \\(\phi\\)为水平角.

$$
\begin{equation}
d\bold{l} = \sin \theta d\theta d\phi
\end{equation}
$$

### 球面多边形

球形多边形即为某个多面锥体在单位球上的投影面积.

球面多边形每个角的角度是这个顶点对应的两个锥体上的平面形成的二面角,
球面角超是球面多边形内角和超过平面多边形面积的部分, 它与球面多边形的面积相等.

$$
\begin{equation}
E = \sum_{i=1}^{n} \theta_i - (n - 2)\pi
\end{equation}
$$

在pbrt中, 利用球面三角恒等式将球面角超的计算化简为如下形式, 以避免过多使用反三角函数损失精度.

$$
\begin{equation}
\tan\left(\frac{1}{2} A\right) = \frac{\bold{a} \cdot (\bold{b} \times \bold{c})}{1 + (\bold{a} \cdot \bold{b}) + (\bold{a} \cdot \bold{c}) + (\bold{b} \cdot \bold{c})}
\end{equation}
$$

pbrt中球面四边形仍然采用直接计算二面角的方式来计算.

### 球面参数化

#### 球面坐标系

$$
\begin{equation}
\begin{aligned}
x &= r \sin\theta \cos\phi\\\\
y &= r \sin\theta \sin\phi\\\\
z &= r \cos\theta
\end{aligned}
\end{equation}
$$

逆运算如下.

$$
\begin{equation}
\begin{aligned}
\theta &= \arccos z\\\\
\phi &= \arctan \frac{y}{x}
\end{aligned}
\end{equation}
$$

\\(\phi\\)对应的三角函数也可以快速计算.

$$
\begin{equation}
\begin{aligned}
\cos\theta &= \frac{x}{r \sin\theta}\\\\
\sin\theta &= \frac{y}{r \sin\theta}
\end{aligned}
\end{equation}
$$

#### 八面体编码

由于浮点精度, 球面坐标系的两极比赤道具有更高的精度, 八面体压缩得到更均匀的分布.
利用八面体压缩可以将`Vector3f`展开到二维平面, pbrt将每个元素用2个字节存储, 只需要4个字节即可存储一个单位向量.

八面体压缩收集计算绝对值向量投影到\\(x+y+z=1\\)平面, 再投影到\\(xy\\)平面得到压缩向量\\((x, y)\\),
上半球面的向量只需要设置符号, 下半球面向量先计算其对应上半球面绝对值向量的压缩值关于\\(x+y=1\\)的对称值再去修改符号.

```c++
OctahedralVector(Vector3f v) {
    v /= std::abs(v.x) + std::abs(v.y) + std::abs(v.z);
    if (v.z >= 0) {
        x = Encode(v.x);
        y = Encode(v.y);
    } else {
        x = Encode((1 - std::abs(v.y)) * Sign(v.x));
        y = Encode((1 - std::abs(v.x)) * Sign(v.y));
    }
}
```

pbrt将八面体压缩值最终存储在整数中.

```c++
static uint16_t Encode(Float f) {
    return pstd::round(Clamp((f + 1) / 2, 0, 1) * 65535.f);
}
```

解压缩过程如下.

```c++
explicit operator Vector3f() const {
    Vector3f v;
    v.x = -1 + 2 * (x / 65535.f);
    v.y = -1 + 2 * (y / 65535.f);
    v.z = 1 - (std::abs(v.x) + std::abs(v.y));
    if (v.z < 0) {
        v.x = (1 - std::abs(v.y)) * Sign(v.x);
        v.y = (1 - std::abs(v.x)) * Sign(v.y);
    }
    return Normalize(v);
}
```

#### 等面积映射

等面积映射保证球面上任意区域的面积与参数化后的空间中对应的面积的比例相似.

令\\((u,v)\in[-1,1]\\), \\(u\ge0\\)且\\(u-|v|\ge0\\)时等面积映射的极坐标见下式.
此时\\(\phi\in[-\frac{\pi}{4}, \frac{\pi}{4}]\\), 其它区域的映射具有相似的形式.

$$
\begin{equation}
\begin{aligned}
r &= u\\\\
\phi &= \frac{\pi}{4}\frac{v}{u}
\end{aligned}
\end{equation}
$$

极坐标到球面坐标的等面积映射如下.

$$
\begin{equation}
\begin{aligned}
x &= (\cos\phi) r \sqrt{2-r^2}\\\\
y &= (\sin\phi) r \sqrt{2-r^2}\\\\
z &= 1 - r^2
\end{aligned}
\end{equation}
$$

pbrt中等面积映射的解压缩遵循如下步骤.

1. 取\\((u, v)\\)的绝对值即映射到第一象限来简化计算
1. 根据与象限对角线的距离来计算\\(r\\)
2. 计算出对应的极坐标, 并且由于旋转需要\\(\phi+\frac{\pi}{4}\\)
3. 根据\\(u,v\\)位于\\(x+y=1\\)的哪一侧确定z的方向.
4. 等面积映射到球面坐标, 根据\\(u,v\\)的符号确定最终映射值的符号

压缩过程基本是解压缩的逆过程.

### 方向包围结构

方向包围结构用于快速获取对应的立体角范围, 典型应用场景是剔除掉没有射向物体方向的光线.

pbrt在`DirectionCone`中通过锥体的中心轴方向与锥体扩散角的余弦定义了包围锥.

pbrt支持通过包围盒与锥体顶点计算出对应的包围锥体, 这通过计算顶点到包围盒对应的包围球的切线扩散角来实现.

```c++
PBRT_CPU_GPU inline DirectionCone BoundSubtendedDirections(const Bounds3f &b, Point3f p) {
    // Compute bounding sphere for _b_ and check if _p_ is inside
    Float radius;
    Point3f pCenter;
    b.BoundingSphere(&pCenter, &radius);
    if (DistanceSquared(p, pCenter) < Sqr(radius))
        return DirectionCone::EntireSphere();

    // Compute and return _DirectionCone_ for bounding sphere
    Vector3f w = Normalize(pCenter - p);
    Float sin2ThetaMax = Sqr(radius) / DistanceSquared(pCenter, p);
    Float cosThetaMax = SafeSqrt(1 - sin2ThetaMax);
    return DirectionCone(w, cosThetaMax);
}
```

## 变换

图形学中通常利用四维矩阵进行三维空间中物体的变换.

### 齐次坐标

通过4D的齐次坐标可以只用一个矩阵表示变换, 要求第4个元素不为0, 前三个元素除以第四个元素可以得到3D空间上的值.

### 变换类定义

`Transform`类存储`SquareMatrix<4>`类型的矩阵`m`与逆矩阵`mInv`.
为避免相同的矩阵占有过多内存, pbrt通过`InternCache`类构建哈希表,
相同的变换使用同一块存储在哈希表中的内存.

### 基础操作

变换初始化时为单位变换, 即对角线为1其余为0.
对于奇异矩阵即非可逆矩阵, `mInv`会被初始化为`NaN`.

### 平移

通过设置矩阵第四列可以实现平移.

### 缩放

通过设置对角线上前三个元素可以实现缩放.

### x,y,z旋转

通过设置另外两个轴的元素可以实现顺时针旋转.
由于y轴下x到z是逆时针的, 所以符号不同.

### 任意轴旋转

任意轴旋转通过Rodrigues公式实现, 遵循以下步骤.

1. 将旋转轴转为单位向量
2. 向量投影到旋转轴顶端对应的平面
3. 投影向量与旋转轴叉乘, 二者组成坐标系
4. 在该坐标系下执行旋转, 最后乘上向量长度

通过获取x,y,z轴旋转后的结果可以得到旋转矩阵.

$$
\begin{equation}
\begin{aligned}
\bold{v_c} &= \bold{a}\|\|\bold{v}\|\| \cos\alpha = \bold{a}(\bold{v} \cdot \bold{a})\\\\
\bold{v_1} &= \bold{v} - \bold{v_c}\\\\
\bold{v_2} &= \bold{v_1} \times \bold{a}\\\\
\bold{v'} &= \bold{v_c} + \bold{v_1}\cos\theta + \bold{v_2}\sin\theta
\end{aligned}
\end{equation}
$$

### 从一个向量旋转到另一个

给定两个向量, 我们可以通过叉乘来生成旋转坐标轴,
但是在两个向量接近平行时这种方法不再稳定, 且需要昂贵的三角函数参与.

pbrt通过Householder矩阵实现反射.

$$
\begin{equation}
\begin{aligned}
H(\bold{v}) &= I - 2 \frac{\bold{v} \bold{v}^T}{\bold{v} \cdot \bold{v}}\\\\
H(\bold{v})\bold{x} &= \bold{x} - 2 \frac{\bold{v}}{\|\|\bold{v}\|\|}(\frac{\bold{v}}{\|\|\bold{v}\|\|} \cdot \bold{x}) 
\end{aligned}
\end{equation}
$$

pbrt默认参数是归一化的, 通过向量的数值选择距离两个向量相对较远的轴作为反射中间轴.
这里0.72使用是因为\\(0.72\approx\frac{\sqrt{2}}{2}\\).

```c++
Vector3f refl;
if (std::abs(from.x) < 0.72f && std::abs(to.x) < 0.72f)
    refl = Vector3f(1, 0, 0);
else if (std::abs(from.y) < 0.72f && std::abs(to.y) < 0.72f)
    refl = Vector3f(0, 1, 0);
else
    refl = Vector3f(0, 0, 1);
```

最终旋转矩阵如下式. 由于这里f、t、r都是归一化的,
Householder相当于根据等腰三角形的长边来反射.

$$
\begin{equation}
R = H(\bold{r} - \bold{t}) H(\bold{r} - \bold{f})
\end{equation}
$$

### 观察矩阵

给出摄像机位置、目标位置、上方向即可很快通过叉乘构建出坐标系.

## 应用变换

### 点 & 向量

直接矩阵计算.

### 法线

法线需要考虑不均匀缩放带来的影响. 令t为变换前与法线正交的切线,
T为一般的变换, S为正确的变换, ‘代表变换后的结果, 可得下式.

$$
\begin{equation}
\begin{aligned}
0
&= (\bold{n}')^T \bold{t}'\\\\ 
&= (S\bold{n})^T (T\bold{t})\\\\
&= \bold{n}^T S^T T \bold{t}
\end{aligned}
\end{equation}
$$

由于\\(\bold{n}^T\bold{t}=0\\), 故\\(S=(M^{-1})^T\\).

### 光线
应用变换在光线起始点与光线方向.

### 包围盒
应用变换在包围盒中心点与包围盒范围(即对角线的一半, 与方向类似).

### 变换的组合 & 坐标系的变换

都是线性代数的基础知识.

## 交互

渲染任务中需要处理各类物体的交互, 例如光线与表面的交互影响反射方向、光线与介质的交互影响radiance.
pbrt中定义了`Interaction`类来对各类交互进行抽象, 构造函数如下.

```c++
Interaction(Point3fi pi, Normal3f n, Point2f uv, Vector3f wo, Float time)
    : pi(pi), n(n), uv(uv), wo(Normalize(wo)), time(time) {}
```

交互都需要存储点, 例如光线与表面的交点. pbrt通过`Point3i`中的`Interval`来表示交点的数值误差.

部分交互需要存储方向, 例如光线的方向, pbrt将其存储在`wo`中.

由于部分交互并不关心是表面交互还是介质交互, 表面相关的值为0时就将其忽略,
所以pbrt将法线与表面uv这些表面参数存储在基类中以简化交互的实现.
pbrt支持通过法线判断当前为表面交互还是介质交互.

```c++
bool IsSurfaceInteraction() const { return n != Normal3f(0, 0, 0); }
bool IsMediumInteraction() const { return !IsSurfaceInteraction(); }
```

`Interaction`类中通过`MediumInterface`来表示介质间的交互, 并存储某个点的介质.

```c++
const MediumInterface *mediumInterface = nullptr;
Medium medium = nullptr;
```

### 表面交互

`SurfaceInteraction`会额外存储点和法线在u、v上的偏导数, 法线是根据点的偏导数的叉乘计算的,
u、v的偏导数可以不是正交的.

pbrt在`SurfaceInteraction`类中定义了`shading`成员来存储着色后的值,
例如normal mapping会修改mesh实际的法线. `shading`用几何物体上的实际值来初始化.

```c++
struct {
    Normal3f n;
    Vector3f dpdu, dpdv;
    Normal3f dndu, dndv;
} shading;
```

部分着色过程需要用到mesh的三角形编号, 这会被存储在`SurfaceInteraction`中.

```c++
int faceIndex = 0;
```

pbrt中闭合形状的法线是指向外侧的, 如果着色过程中生成的法线指向内侧,
pbrt支持通过传入参数决定几何法线和着色法线哪个需要改变方向.

```c++
shading.n = ns;
if (orientationIsAuthoritative)
    n = FaceForward(n, shading.n);
else
    shading.n = FaceForward(shading.n, n);
```

### 介质交互

`MediumInteraction`在`Interaction`基础上添加了`PhaseFunction`.

## 结语

这部分并未涉及具体几何形状的存储方式, 主要介绍渲染过程中用到的各类三维空间中的工具,
具体几何形状的内容会在第6章详细介绍.

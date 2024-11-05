---
title: "pbrt-v4 Ep. VI: 几何形状"
date: 2024-11-05
draft: false
description: "pbrt-v4 episode 6"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

`pbrt`通过`Shape`抽象出光线相交, 包围盒等接口, 其余形状无关的功能由`Primitive`封装. 本章主要介绍`Shape`.

## 基础接口

### 包围结构

`Shape`中`Bounds()`接口返回包围盒, `NormalBounds()`返回法线方向的包围锥.

### 光线-包围结构相交

`Bounds3<T>::IntersectP`接口提供该功能. 光线与各个轴上的近平面与远平面相交, 三轴近平面上最大的\\(t\\)即为\\(t_{near}\\), 同理可得\\(t_{far}\\), 若\\(t_{far} < t_{near}\\)则与包围盒不相交. 为提高效率, pbrt支持传入光线方向倒数与表示各个轴方向是否为负的向量, 避免重复计算. 对于NaN, 由于任何NaN参与的逻辑运算都为否, 这里不需要特殊处理.

### 相交测试

`Shape`的派生类需要实现`Intersect`接口, 传入的光线位于渲染空间, 返回`ShapeIntersection`, 代表最近的相交点. 同样的派生类实现`IntersectP`用于判断是否相交而非具体相交细节.

```c++
// ShapeIntersection Definition
struct ShapeIntersection {
    SurfaceInteraction intr;
    Float tHit;
    std::string ToString() const;
};
```

### 相交坐标空间

大部分形状的相交在渲染空间中计算, 部分形状需要在本地空间表示, 例如球. 变换不会影响相交的\\(t\\).

### 面判断

光栅化中通常只考虑物体的正面, pbrt中为避免光追失效正反面都需要判断相交.

### 面积

派生类需要实现`Area`接口来提供面积信息, 用于将`Shape`作为面积光源.

### 采样

采样返回当前采样点的几何信息.

```c++
// ShapeSample Definition
struct ShapeSample {
    Interaction intr;
    Float pdf;
    std::string ToString() const;
};
```

`Shape`的采样可以采用类似于二维概率密度函数的形式, 调用者需要保证传入的坐标在形状范围内.

```c++
PBRT_CPU_GPU inline pstd::optional<ShapeSample> Sample(Point2f u) const;

PBRT_CPU_GPU inline Float PDF(const Interaction &) const;
```

同样也可以提供参考点, 例如将`Shape`作为面积光照, 某点需要在`Shape`上采样来计算辐射亮度, 此时提供参考点或立体角的采样会更加合适. 采样的实现可能需要判断当前立体角对应的光线是否相交.

```c++
PBRT_CPU_GPU inline pstd::optional<ShapeSample> Sample(const ShapeSampleContext &ctx,
                                                           Point2f u) const;
PBRT_CPU_GPU inline Float PDF(const ShapeSampleContext &ctx, Vector3f wi) const;
```

## 球体

球面坐标可以转化为uv方程以用于纹理映射, 也可以用于表示不完整的球.

$$
\begin{equation}
\begin{aligned}
\phi &= u \phi_{\max}\\\\
\theta &= \theta_{\min} + v(\theta_{\max} - \theta_{\min})
\end{aligned}
\end{equation}
$$

由于球体使用本地空间, 构造函数需要传入变换. pbrt没有使用添加动画的变换, 动画由`Primitive`处理.

### 包围结构

由于球体可能是不完整的, pbrt会计算出对应的\\(z_{\min}\\)和\\(z_{\max}\\), x轴与y轴不做额外计算.

```c++
PBRT_CPU_GPU Bounds3f Sphere::Bounds() const {
    return (*renderFromObject)(
        Bounds3f(Point3f(-radius, -radius, zMin), Point3f(radius, radius, zMax)));
}
```

### 表面面积

定义在\\([a,b]\\)上的曲线\\(f(x)\\)绕x轴形成的形状的表面积可以表示为下式.

$$
\begin{equation}
\begin{aligned}
A
&= \phi_{\max} \int_a^b f(x) ds\\\\
&= \phi_{\max} \int_a^b f(x) \sqrt{dx^2 + dy^2}\\\\
&= \phi_{\max} \int_a^b f(x) \sqrt{1 + f'^2(x)} dx
\end{aligned}
\end{equation}
$$

将球面视为绕z轴旋转, 可以得到下式.

$$
\begin{equation}
\begin{aligned}
A
&= \phi_{\max} \int_{z_{\min}}^{z_{\max}} \sqrt{r^2 - z^2} \sqrt{1 + \frac{z^2}{r^2 - z^2}} dz\\\\
&= \phi_{\max} r (z_{\max} - z{\min})
\end{aligned}
\end{equation}
$$

### 相交测试

球体首先执行`BasicIntersect`, 获取本地空间下的相交结果, 返回`QuadricIntersection`, 别的二次曲面形状也会使用这个结构体. 之后再执行`InteractionFromIntersection`, 这样分离使得`IntersectP`只需要执行`BasicIntersect`, 且在GPU上可以先对所有可相交的形状执行`BasicIntersect`, 找到最近点后在执行`InteractionFromIntersection`.

```c++
struct QuadricIntersection {
    Float tHit;
    Point3f pObj;
    Float phi;
};
```
通过相交点计算出uv后pbrt会计算偏导数, 空间位置的偏导数根据球面坐标的定义计算, 法线的偏导数通过微分几何中常用的Weingarten方程计算.

上述过程执行完成后即可构造`SurfaceInteraction`.

```c++
bool flipNormal = reverseOrientation ^ transformSwapsHandedness;
Vector3f woObject = (*objectFromRender)(wo);
return (*renderFromObject)(SurfaceInteraction(Point3fi(pHit, pError),
                                              Point2f(u, v), woObject, dpdu, dpdv,
                                              dndu, dndv, time, flipNormal));
```

### 表面采样

本地空间下的球面均匀采样较为简单, pdf为面积的倒数. 对于有参考点的采样, pbrt会将采样点朝向球心偏移, 以避免位于球面附近的点因为浮点误差而位于错误的一侧, 同时pdf会从面积微分转为立体角微分.

```c++
Point3f pCenter = (*renderFromObject)(Point3f(0, 0, 0));
Point3f pOrigin = ctx.OffsetRayOrigin(pCenter);
```

球外的参考点会与球面形成一个可见锥体, 与参考点到球心形成的中心向量可以形成的最大角度见下式. 此时可以在可见锥体内均匀采样立体角方向, 获取与中心向量的夹角\\(\theta\\)和绕中心向量的旋转角\\(\omega\\)即可. pbrt在\\([\cos\theta_{max}, 1]\\)这一范围内采样.

$$
\begin{equation}
\theta_{\max} = \text{arcsin}(\frac{r}{|p-p_c|})
\end{equation}
$$

对于\\(\theta_{max}\\)较小的情况, 由\\(\cos\theta\\)计算\\(\sin\theta\\)会导致浮点误差, 因为\\(\cos\theta\\)接近1, 1附近的浮点精度与0附近相比是不够的. 在角度较小的情况下根据\\(\sin\theta\\)的一阶泰勒展开可以得到\\(\sin\theta \approx \theta\\), 此时可以得到足够的精度. 采样完成后可以计算得到交点.

```c++
if (sin2ThetaMax < 0.00068523f /* sin^2(1.5 deg) */) {
    // Compute cone sample via Taylor series expansion for small angles
    sin2Theta = sin2ThetaMax * u[0];
    cosTheta = std::sqrt(1 - sin2Theta);
    oneMinusCosThetaMax = sin2ThetaMax / 2;
}
```

对于pdf, 首先需要满足如下的关系.

$$
\begin{equation}
\begin{aligned}
1
&= \int_{\Phi} p(\omega) d\omega\\\\
&= \int_0^{2\pi} \int_0^{\theta_{\max}} p(\phi)p(\theta) \sin\theta d\theta d\omega
\end{aligned}
\end{equation}
$$

已知\\(p(\phi)=\frac{1}{2\pi}\\), \\(p(\theta)\\)为均匀分布, 则有如下关系.

$$
\begin{equation}
\begin{aligned}
1
&= c \int_0^{\theta_{\max}} \sin\theta d\theta\\\\
&= c (1 - \cos\theta_{\max})
\end{aligned}
\end{equation}
$$

此时可以得到最终的pdf.

$$
\begin{equation}
p(\omega) = \frac{1}{2\pi(1 - \cos\theta_{\max})}
\end{equation}
$$

## 圆柱

圆柱的参数方程如下, z是圆柱的高度.

$$
\begin{equation}
\begin{aligned}
\phi &= u \phi_{\max}\\\\
x &= r \cos\phi\\\\
y &= r \sin\phi\\\\
z &= z_{\min} + v(z_{\max} - z_{\min})
\end{aligned}
\end{equation}
$$

### 包围结构

```c++
PBRT_CPU_GPU Bounds3f Cylinder::Bounds() const {
    return (*renderFromObject)(
        Bounds3f({-radius, -radius, zMin}, {radius, radius, zMax}));
}
```

### 表面面积

```c++
PBRT_CPU_GPU
Float Area() const { return (zMax - zMin) * radius * phiMax; }
```

### 相交测试

通过\\(x^2 + y^2 = r^2\\)计算相交, \\(u = \frac{\phi}{\phi_{\max}}\\), \\(v = \frac{z - z_{\min}}{z_{\max} - z_{\min}}\\).

### 表面采样

圆柱体没有特定的根据参考点的立体角采样的方法, 而是先进行面积采样再转为立体角, 根据立体角与面积的转换公式可以获取pdf.

$$
\begin{equation}
p(\omega) = \frac{1}{A} \frac{r^2}{\cos\theta}
\end{equation}
$$

## 圆盘

圆盘参数方程如下, 本地空间中圆盘位于xy平面, \\(r_i\\)代表inner radius.

$$
\begin{equation}
\begin{aligned}
\phi &= u \phi_{\max}\\\\
x &= ((1-v)r + vr_i)\cos\phi\\\\
y &= ((1-v)r + vr_i)\sin\phi\\\\
z &= h
\end{aligned}
\end{equation}
$$

### 包围结构

```c++
PBRT_CPU_GPU Bounds3f Disk::Bounds() const {
    return (*renderFromObject)(
        Bounds3f(Point3f(-radius, -radius, height), Point3f(radius, radius, height)));
}

PBRT_CPU_GPU DirectionCone Disk::NormalBounds() const {
    Normal3f n = (*renderFromObject)(Normal3f(0, 0, 1));
    if (reverseOrientation)
        n = -n;
    return DirectionCone(Vector3f(n));
}
```

### 表面面积

$$
\begin{equation}
A = \frac{\phi_{\max}}{2}(r^2 - r^2_i)
\end{equation}
$$

### 相交测试

计算出z位于h时光线对应的t值以及判断该点是否位于圆盘内部即可, \\(u=\frac{\phi}{\phi_{\max}}, v=\frac{r - r_{\text{hit}}}{r - r_i}\\).

### 表面采样

对于圆盘采样, 如果在\\(r\\)和\\(\theta\\)上分别均匀采样, 由于半径的增长导致\\(\phi\\)采样点对应的位置越来越分散, 采样点会集中在圆心附近.

我们需要满足\\(p(x,y)=\frac{1}{\pi}\\), 即\\(p(r,\theta)=\frac{r}{\pi}\\), 此时可以得到如下关系以及根据逆变换法得到的采样方程.

$$
\begin{equation}
\begin{aligned}
p(r) &= \int_0^{2\pi} p(r,\theta) d\theta = 2r\\\\
p(\theta|r) &= \frac{p(r, \theta)}{p(r)} = \frac{1}{2\pi}
\end{aligned}
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
r &= \sqrt{\epsilon_1}\\\\
\theta &= 2\pi\epsilon_2
\end{aligned}
\end{equation}
$$

此时由于\\(r\\)的非线性, 导致u,v对应的面积的不均匀, 这影响了分层抽样的效果. pbrt采用同心映射将\\([-1,1]\\)对应的xy平面映射到圆上. 下式分别为\\(|x|>|y|\\)与\\(|y| \ge |x|\\)的情况.

$$
\begin{equation}
\begin{aligned}
r &= x\\\\
\theta &= \frac{\pi}{4} \frac{y}{x}
\end{aligned}
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
r &= y\\\\
\theta &= \frac{\pi}{2} - \frac{\pi}{4} \frac{x} {y}
\end{aligned}
\end{equation}
$$

## 三角网格

根据Euler–Poincaré公式, 闭合几何体的顶点数\\(V\\), 边数\\(E\\)与面数\\(F\\)满足如下关系, 其中\\(g\\)代表几何体上洞的数量.

$$
\begin{equation}
V - E + F = 2 (1 - g)
\end{equation}
$$

对于三角形网格还有如下关系, 面数较多时\\(g\\)可以忽略不计.

$$
\begin{equation}
\begin{aligned}
E &= \frac{3}{2} F\\\\
F &\approx 2 V
\end{aligned}
\end{equation}
$$

### 网格存储

`TriangleMesh`类的声明如下. 尽管构造函数传入的是`vector`, 内部仍然使用指针来存储数据, 以此来达到多个共享几何数据的效果. 尽管pbrt提供了instance功能, 像高精度地形的存储仍然需要这种方式来节省内存.

```c++
class TriangleMesh {
  public:
    // TriangleMesh Public Methods
    TriangleMesh(const Transform &renderFromObject, bool reverseOrientation,
                 std::vector<int> vertexIndices, std::vector<Point3f> p,
                 std::vector<Vector3f> S, std::vector<Normal3f> N,
                 std::vector<Point2f> uv, std::vector<int> faceIndices, Allocator alloc);

    std::string ToString() const;

    bool WritePLY(std::string filename) const;

    static void Init(Allocator alloc);

    // TriangleMesh Public Members
    int nTriangles, nVertices;
    const int *vertexIndices = nullptr;
    const Point3f *p = nullptr;
    const Normal3f *n = nullptr;
    const Vector3f *s = nullptr;
    const Point2f *uv = nullptr;
    const int *faceIndices = nullptr;
    bool reverseOrientation, transformSwapsHandedness;
};
```

pbrt通过`BufferCache`类来将`vector`转为指针, 它会查找cache中是否已经有一份相同的数据并返回它的指针. 为了防止mutex导致的低并发效率, pbrt根据数据的hash将它存储在不同的cache中. pbrt中通过全局对象来访问`BufferCache`.

```c++
const T *LookupOrAdd(pstd::span<const T> buf, Allocator alloc) {
    ++nBufferCacheLookups;
    // Return pointer to data if _buf_ contents are already in the cache
    Buffer lookupBuffer(buf.data(), buf.size());
    int shardIndex = uint32_t(lookupBuffer.hash) >> (32 - logShards);
    DCHECK(shardIndex >= 0 && shardIndex < nShards);
    mutex[shardIndex].lock_shared();
    if (auto iter = cache[shardIndex].find(lookupBuffer);
        iter != cache[shardIndex].end()) {
        const T *ptr = iter->ptr;
        mutex[shardIndex].unlock_shared();
        DCHECK(std::memcmp(buf.data(), iter->ptr, buf.size() * sizeof(T)) == 0);
        ++nBufferCacheHits;
        redundantBufferBytes += buf.size() * sizeof(T);
        return ptr;
    }

    // Add _buf_ contents to cache and return pointer to cached copy
    mutex[shardIndex].unlock_shared();
    T *ptr = alloc.allocate_object<T>(buf.size());
    std::copy(buf.begin(), buf.end(), ptr);
    bytesUsed += buf.size() * sizeof(T);
    mutex[shardIndex].lock();
    // Handle the case of another thread adding the buffer first
    if (auto iter = cache[shardIndex].find(lookupBuffer);
        iter != cache[shardIndex].end()) {
        const T *cachePtr = iter->ptr;
        mutex[shardIndex].unlock();
        alloc.deallocate_object(ptr, buf.size());
        ++nBufferCacheHits;
        redundantBufferBytes += buf.size() * sizeof(T);
        return cachePtr;
    }

    cache[shardIndex].insert(Buffer(ptr, buf.size()));
    mutex[shardIndex].unlock();
    return ptr;
}
```

`Buffer`类用于存储指针并在构造时计算hash. 

```c++
struct Buffer {
    // BufferCache::Buffer Public Methods
    Buffer() = default;
    Buffer(const T *ptr, size_t size) : ptr(ptr), size(size) {
        hash = HashBuffer(ptr, size);
    }

    bool operator==(const Buffer &b) const {
        return size == b.size && hash == b.hash &&
                std::memcmp(ptr, b.ptr, size * sizeof(T)) == 0;
    }

    const T *ptr = nullptr;
    size_t size = 0, hash;
}
```

对于三角网格pbrt会在构造时将顶点位置, 法线等属性转到渲染空间中, 然后再存储到cache, 以此节省后续访问时的计算开销. 显然cache miss会增加, 但是计算开销减小了.

### 三角形类

为节省空间开销, `Triangle`类只存储对应的`TriangleMesh`的序号以及自身在网格中的序号.

```c++
Triangle() = default;
Triangle(int meshIndex, int triIndex) : meshIndex(meshIndex), triIndex(triIndex) {}
```

`NormalBounds`计算三角面的几何法线, 如果几何法线与顶点法线的插值结果不指向同一侧, 几何法线会被调整.

```c++
PBRT_CPU_GPU DirectionCone Triangle::NormalBounds() const {
    // Get triangle vertices in _p0_, _p1_, and _p2_
    const TriangleMesh *mesh = GetMesh();
    const int *v = &mesh->vertexIndices[3 * triIndex];
    Point3f p0 = mesh->p[v[0]], p1 = mesh->p[v[1]], p2 = mesh->p[v[2]];

    Normal3f n = Normalize(Normal3f(Cross(p1 - p0, p2 - p0)));
    // Ensure correct orientation of geometric normal for normal bounds
    if (mesh->n) {
        Normal3f ns(mesh->n[v[0]] + mesh->n[v[1]] + mesh->n[v[2]]);
        n = FaceForward(n, ns);
    } else if (mesh->reverseOrientation ^ mesh->transformSwapsHandedness)
        n *= -1;

    return DirectionCone(Vector3f(n));
}
```

### 相交测试

三角形的光纤测试是一个独立函数, 而非实现了`Shape`的接口. pbrt首先变换到以光线起始点为原点, 光线方向为\\(z\\)轴的空间, 这样可以避免恰好打到边上的光线被认为不相交, 后续章节会解释. 由于浮点精度问题, 需要判断转换后的三角形是否退化为线段.

变换分为三步, 首先平移变换将光线起始点移到原点, 其次将绝对值最大的轴置换为\\(z\\)轴, 最后通过切变变换将光线与z轴对齐. 切变变换定义如下, 与旋转相比切变的开销较小. 经过变换后, 只需要判断\\((0, 0)\\)是否位于三角形在\\(xy\\)平面的投影上.

$$
\begin{equation}
\begin{aligned}
S =
\begin{pmatrix}
1 & 0 & -\frac{\bold{d}_x}{\bold{d}_z} & 0\\\\
0 & 1 & -\frac{\bold{d}_y}{\bold{d}_z} & 0\\\\
0 & 0 & -\frac{1}{\bold{d}_z} & 0\\\\
0 & 0 & 0 & 1
\end{pmatrix}
\end{aligned}
\end{equation}
$$

利用叉乘结果具有方向的特性, 利用行列式可以构造边方程, 用于判断判断点\\(p\\)在边\\(p_0p_1\\)的哪一侧. 若某点位于三角形三条边的同侧, 可以认为它位于三角形内部. 由于行列式也可以用于计算两条边组成的平行四边形的面积, 边方程同时计算了重心坐标.

$$
\begin{equation}
\begin{aligned}
e(p) =
\begin{vmatrix}
p_x - p_{0x} & p_y - p_{0y}\\\\
p_{1x} - p_{0x} & p_{1y} - p_{0y}
\end{vmatrix}
\end{aligned}
\end{equation}
$$

为避免除以分母带来的误差, pbrt计算交点是否超过光线最大\\(t\\)值时采用尚未归一化的插值, 由于经过了变换\\(z\\)与\\(t\\)是相同的. 判断完成后可以计算重心坐标与相交的\\(t\\)值.

```c++
// Compute scaled hit distance to triangle and test against ray $t$ range
p0t.z *= Sz;
p1t.z *= Sz;
p2t.z *= Sz;
Float tScaled = e0 * p0t.z + e1 * p1t.z + e2 * p2t.z;
if (det < 0 && (tScaled >= 0 || tScaled < tMax * det))
    return {};
else if (det > 0 && (tScaled <= 0 || tScaled > tMax * det))
    return {};

// Compute barycentric coordinates and $t$ value for triangle intersection
Float invDet = 1 / det;
Float b0 = e0 * invDet, b1 = e1 * invDet, b2 = e2 * invDet;
Float t = tScaled * invDet;
```

为了使得GPU也能调用, `Triangle`的`InteractionFromIntersection`是静态函数而不是成员函数. 根据贴图\\(uv\\)与顶点位置可以得到如下关系, 此时可以计算得到对应的偏导数. 如果没有\\(uv\\)值pbrt会使用默认值. `SurfaceInteraction`将几何法线初始化为p在\\(uv\\)偏导的叉乘, 三角网格由于贴图\\(uv\\)的缘故无法采用这种方式, pbrt采用边的叉乘来得到几何边线. 若顶点拥有法线与切线pbrt会采用插值结果, 且采用类似的方式计算法线在\\(uv\\)的偏导.

$$
\begin{equation}
\begin{aligned}
\begin{pmatrix}
u_0 - u_2 & v_0 - v_2\\\\
u_1 - u_2 & v_1 - v_2
\end{pmatrix}
\begin{pmatrix}
\frac{\partial p}{\partial u}\\\\
\frac{\partial p}{\partial v}
\end{pmatrix} =
\begin{pmatrix}
p_0 - p_2\\\\
p_1 - p_2
\end{pmatrix}
\end{aligned}
\end{equation}
$$

### 表面采样

采样通过将均匀采样结果转化为重心坐标来实现. 通过将正方形中关于对角线对称的采样结果视为同一个点可以得到均匀的采样分布, 但这会使得原本相距较远的采样点变为同一个采样点, 这会影响部分采样器的效果. pbrt采用如下转换方式, 此时Jacobi行列式为常数, 所以具有面积保持的特征.

$$
\begin{equation}
\begin{aligned}
f(x, y) = (x - \delta, y - \delta),
\delta =
\begin{cases}
\frac{x}{2} & x < y\\\\
\frac{y}{2} & y \le x
\end{cases}
\end{aligned}
\end{equation}
$$

假设三角形光源各个点发射相同的光, BSDF为常数值, 利用面积与立体角微分的转换可以得到如下的采样公式, 其中\\(V\\)为可见性方程, \\(p\\)为观察点位置, \\(p'\\)为光源上的采样点的位置. 由于分母上的平方项, 距离光源较近的物体会有较大的采样误差, 因此直接将立体角采样转为面积采样并不合适.

$$
\begin{equation}
\frac{\rho L_e}{1/A}\left(V(p, p')|\cos\theta'|\frac{|\cos\theta_1|}{\Vert p' - p \Vert^2} \right)
\end{equation}
$$

对于立体角范围过小和过大的三角形, 由于浮点误差pbrt仍然采用上述面积采样. 对于其他情况, pbrt首先计算当前三角形在单位球上的投影形成的球面角, 获得球面三角形的面积\\(A\\) 采样获取\\(\epsilon_0\\)使得\\(ac\\)边上的点\\(c'\\)形成的\\(abc'\\)的面积为\\(\epsilon_0 A\\), 然后在\\(bc'\\)上采样, 由于均匀采样会使得采样点集中在\\(b\\)附近, 概率密度是由\\(b\\)到\\(c'\\)增长的. pbrt直接计算球面三角形内角和, 而非减去\\(\pi\\)的球面角超, 以此减少浮点误差.

pbrt通过计算\\(\bar{\bold{b}}'\\)边的长度来进行第一次采样, 经过球面三角公式的推导可以获得如下的求解公式.

$$
\begin{equation}
\begin{aligned}
\cos\bar{\bold{b}}' &= \frac{k_2 + (k_2\cos\phi - k_1\sin\phi)\cos\alpha}{(k_2\sin\phi + k_1\cos\phi)\sin\alpha}\\\\
\phi &= \beta' + \gamma'\\\\
k_1 &= \cos\phi + \cos\alpha\\\\
k_2 &= \sin\phi - \sin\alpha\cos{\bar{\bold{c}}}
\end{aligned}
\end{equation}
$$

最终的采样点与\\(\bold{b}\\)形成的夹角可以按如下方式计算, 此时可以得到均匀的采样结果.

$$
\begin{equation}
\cos\theta = 1 - \epsilon_1 (1 - (\bold{c}' \cdot \bold{b}))
\end{equation}
$$

Kajiya方程中的\\(\cos\theta\\)项同样也会影响方差, pbrt将其包括在pdf中. 由于在\\(uv\\)坐标上它是平滑变化的, pbrt通过双线性采样来获取pdf. `InvertSphericalTriangleSample`通过当前提供的立体角方向确定可以得到该采样点的采样值.

```c++
Float pdf = 1 / solidAngle;
// Adjust PDF for warp product sampling of triangle $\cos\theta$ factor
if (ctx.ns != Normal3f(0, 0, 0)) {
    // Get triangle vertices in _p0_, _p1_, and _p2_
    const TriangleMesh *mesh = GetMesh();
    const int *v = &mesh->vertexIndices[3 * triIndex];
    Point3f p0 = mesh->p[v[0]], p1 = mesh->p[v[1]], p2 = mesh->p[v[2]];

    Point2f u = InvertSphericalTriangleSample({p0, p1, p2}, ctx.p(), wi);
    // Compute $\cos\theta$-based weights _w_ at sample domain corners
    Point3f rp = ctx.p();
    Vector3f wi[3] = {Normalize(p0 - rp), Normalize(p1 - rp), Normalize(p2 - rp)};
    pstd::array<Float, 4> w =
        pstd::array<Float, 4>{std::max<Float>(0.01, AbsDot(ctx.ns, wi[1])),
                              std::max<Float>(0.01, AbsDot(ctx.ns, wi[1])),
                              std::max<Float>(0.01, AbsDot(ctx.ns, wi[0])),
                              std::max<Float>(0.01, AbsDot(ctx.ns, wi[2]))};

    pdf *= BilinearPDF(u, w);
}
```

## 双线性片

由四个点组成的面可以覆盖\\([0,1]^2\\)的uv空间的形状即位双线性片, 表面上的点对应的值可以通过插值获取. 与三角形网格类似, `BilinearPatchMesh`内部数据存储在cache中, 构造时变换到渲染空间, `BilinearPatch`中只存储序号.

$$
\begin{equation}
\begin{aligned}
f(u,v) &= (1 - u)(1 - v)p_{0,0} + u (1 - v) p_{1,0} + (1 - u) v p_{0,1} + u v p_{1,1}\\\\
\frac{\partial p}{\partial u} &= (1 - v)(p_{1,0} - p_{0,0}) + v(p_{1,1} - p_{0,1})\\\\
\frac{\partial p}{\partial v} &= (1 - u)(p_{1,0} - p_{0,0}) + u(p_{1,1} - p_{0,1})
\end{aligned}
\end{equation}
$$

双线性片很多时候以矩形的形式出现, 这种情况可以简化很多计算, pbrt通过判断某个点到第四个点的向量是否与前三个点组成的平面的法线垂直来检查四个点是否共面, 通过判断四个点到他们的中心距离是否相等来判断是否是矩形.

```c++
PBRT_CPU_GPU
bool IsRectangle(const BilinearPatchMesh *mesh) const {
    // Get bilinear patch vertices in _p00_, _p01_, _p10_, and _p11_
    const int *v = &mesh->vertexIndices[4 * blpIndex];
    Point3f p00 = mesh->p[v[0]], p10 = mesh->p[v[1]];
    Point3f p01 = mesh->p[v[2]], p11 = mesh->p[v[3]];

    if (p00 == p01 || p01 == p11 || p11 == p10 || p10 == p00)
        return false;
    // Check if bilinear patch vertices are coplanar
    Normal3f n(Normalize(Cross(p10 - p00, p01 - p00)));
    if (AbsDot(Normalize(p11 - p00), n) > 1e-5f)
        return false;

    // Check if planar vertices form a rectangle
    Point3f pCenter = (p00 + p01 + p10 + p11) / 4;
    Float d2[4] = {DistanceSquared(p00, pCenter), DistanceSquared(p01, pCenter),
                    DistanceSquared(p10, pCenter), DistanceSquared(p11, pCenter)};
    for (int i = 1; i < 4; ++i)
        if (std::abs(d2[i] - d2[0]) / d2[0] > 1e-4f)
            return false;
    return true;
}
```

双线性片的法线包围锥体由四个点处法线的均值决定.

```c++
// Compute average normal and return normal bounds for patch
Vector3f n = Normalize(n00 + n10 + n01 + n11);
Float cosTheta = std::min({Dot(n, n00), Dot(n, n01), Dot(n, n10), Dot(n, n11)});
return DirectionCone(n, Clamp(cosTheta, -1, 1));
```

### 相交测试

首先找到一条对\\(u\\)进行插值形成的直线使得它到光线的距离为0, 计算两条不平行的直线的距离首先求二者叉乘获取法线, 再与两条直线分别组成两个平行的平面, 求二者的距离即可. 最终得到的\\(u\\)的二次方程系数如下.

$$
\begin{equation}
\begin{aligned}
a &= ((p_{1,0} - p_{0,0}) \times (p_{0,1} - p_{1, 1})) \cdot \bold{d}\\\\
c &= (p_{0,0} - \bold{o}) \times \bold{d}) \cdot (p_{0,1} - p_{0,0})\\\\
b &= (p_{1,0} - \bold{o}) \times \bold{d}) \cdot (p_{1,1} - p_{1,0}) - (a + c)
\end{aligned}
\end{equation}
$$

若\\(u\\)有解则可以按如下方式得到\\(v\\)与光线的\\(t\\)值.

$$
\begin{equation}
f_u(v) &= (1 - v)p_{u,0} + vp_{u,1}\\\\
\end{equation}
$$

$$
\begin{equation}
\begin{aligned}
t &= \frac{\text{det}(f_u(0) - \bold{o}, f_u(1) - f_u(0), \bold{d} \times (f_u(1) - f_u(0)))}{\Vert \bold{d} \times (f_u(1) - f_u(0)) \Vert^2}\\\\
v &= \frac{\text{det}(f_u(0) - \bold{o}, \bold{d}, \bold{d} \times (f_u(1) - f_u(0)))}{\Vert \bold{d} \times (f_u(1) - f_u(0)) \Vert^2}
\end{aligned}
\end{equation}
$$

为了不与`BilinearPatch`本身的\\(uv\\)混淆, 贴图的\\(uv\\)用\\(st\\)来表示. 由于`SurfaceInteraction`中的位置在\\(uv\\)上的偏导实际上是在sv上的偏导, pbrt通过链式法则求得该值.

$$
\begin{equation}
\begin{aligned}
\frac{\partial p}{\partial u} &= p_{1,0} + v (p_{1,1} - p{1,0}) - p_{0, 0} - v (p_{0, 1} - p{0, 0})\\\\
\frac{\partial s}{\partial u} &= s_{1,0} + v (s_{1,1} - s{1,0}) - s_{0, 0} - v (s_{0, 1} - s{0, 0})\\\\
\end{aligned}
\end{equation}
$$

### 表面采样

pbrt中双线性片采样的pdf与当前的微分面积相关, 这使得\\(uv\\)变化较为剧烈处不会聚集过多的采样点.

```c++
// Compute PDF for sampling the $(u,v)$ coordinates given by _intr.uv_
Float pdf;
if (mesh->imageDistribution)
    pdf = mesh->imageDistribution->PDF(uv);
else if (!IsRectangle(mesh)) {
    // Initialize _w_ array with differential area at bilinear patch corners
    pstd::array<Float, 4> w = {
        Length(Cross(p10 - p00, p01 - p00)), Length(Cross(p10 - p00, p11 - p10)),
        Length(Cross(p01 - p00, p11 - p01)), Length(Cross(p11 - p10, p11 - p01))};

    pdf = BilinearPDF(uv, w);
} else
    pdf = 1;

// Find $\dpdu$ and $\dpdv$ at bilinear patch $(u,v)$
Point3f pu0 = Lerp(uv[1], p00, p01), pu1 = Lerp(uv[1], p10, p11);
Vector3f dpdu = pu1 - pu0;
Vector3f dpdv = Lerp(uv[0], p01, p11) - Lerp(uv[0], p00, p10);

// Return final bilinear patch area sampling PDF
return pdf / Length(Cross(dpdu, dpdv));
```

对于非矩形, 有采样分布贴图或面积较小的双线性片采用面积采样转化为立体角采样的方法, 否则将矩形投影到球上形成球面矩形再进行采样. 对于矩形的\\(uv\\), 可以通过将点投影到边上并根据边长归一化获得.

## 曲线

pbrt的`Curve`类采用具有宽度的一维三次Bézier曲线, 可以渲染为平面, 圆柱体或带状曲面. 对于带状曲面, pbrt会提供顶点的法线用于后续的插值, 支持只表示曲线的某一部分.

$$
\begin{equation}
p(u) = (1 - u)^3 p_0 + 3(1 - u)^2 u p_1 + 3(1 - u)u^2 p_2 + u^3 p_3
\end{equation}
$$

### 包围结构

pbrt首先计算控制点形成的包围盒, 再根据曲线宽度扩展包围盒. 法线包围结构返回的是完整的球这一保守结果.

```c++
PBRT_CPU_GPU Bounds3f Curve::Bounds() const {
    pstd::span<const Point3f> cpSpan(common->cpObj);
    Bounds3f objBounds = BoundCubicBezier(cpSpan, uMin, uMax);
    // Expand _objBounds_ by maximum curve width over $u$ range
    Float width[2] = {Lerp(uMin, common->width[0], common->width[1]),
                      Lerp(uMax, common->width[0], common->width[1])};
    objBounds = Expand(objBounds, std::max(width[0], width[1]) * 0.5f);

    return (*common->renderFromObject)(objBounds);
}
```

### 相交测试

`Curve`类的相交测试接口通过调用`IntersectRay`成员函数来实现, 通过不断二分判断当前曲线包围盒是否与光线相交, 最终使得曲线区域接近线性线段方便计算相交. 

将曲线转换到光线空间使用`lookAt`矩阵实现, 相机正上方对应的向量会被设置为与曲线两端连成的向量垂直, 这使得曲线位于\\(xy\\)平面上且与\\(x\\)轴接近平行, 可以获取范围更小的包围盒以加速二分.

pbrt根据variation diminishing判断细分曲线所需要的深度, 深度为0时控制点形成的曲线接近直线. 由于可能出现与曲线拥有多个交点的情况, 非阴影光线递归求交时若深度不为0二分的两个分支都会搜索.

```c++
// Compute refinement depth for curve, _maxDepth_
Float L0 = 0;
for (int i = 0; i < 2; ++i)
    L0 = std::max(
        L0, std::max(std::max(std::abs(cp[i].x - 2 * cp[i + 1].x + cp[i + 2].x),
                                std::abs(cp[i].y - 2 * cp[i + 1].y + cp[i + 2].y)),
                        std::abs(cp[i].z - 2 * cp[i + 1].z + cp[i + 2].z)));
int maxDepth = 0;
if (L0 > 0) {
    Float eps = std::max(common->width[0], common->width[1]) * .05f;  // width / 20
    // Compute log base 4 by dividing log2 in half.
    int r0 = Log2Int(1.41421356237f * 6.f * L0 / (8.f * eps)) / 2;
    maxDepth = Clamp(r0, 0, 10);
}
```

深度为0判断相交时, 首先根据控制点获得首尾两侧与曲线垂直的直线, 计算在\\(xy\\)平面上对于当前原点的边函数, 以判断光线交点是否在曲线范围内.

```c++
// Intersect ray with curve segment
// Test ray against segment endpoint boundaries
// Test sample point against tangent perpendicular at curve start
Float edge = (cp[1].y - cp[0].y) * -cp[0].y + cp[0].x * (cp[0].x - cp[1].x);
if (edge < 0)
    return false;

// Test sample point against tangent perpendicular at curve end
edge = (cp[2].y - cp[3].y) * -cp[3].y + cp[3].x * (cp[3].x - cp[2].x);
if (edge < 0)
    return false;
```

对于带状曲面, pbrt会根据球面插值得到的法线调整条带宽度.

```c++
// Compute $u$ coordinate of curve intersection point and _hitWidth_
Float u = Clamp(Lerp(w, u0, u1), u0, u1);
Float hitWidth = Lerp(u, common->width[0], common->width[1]);
Normal3f nHit;
if (common->type == CurveType::Ribbon) {
    // Scale _hitWidth_ based on ribbon orientation
    if (common->normalAngle == 0)
        nHit = common->n[0];
    else {
        Float sin0 =
            std::sin((1 - u) * common->normalAngle) * common->invSinNormalAngle;
        Float sin1 =
            std::sin(u * common->normalAngle) * common->invSinNormalAngle;
        nHit = sin0 * common->n[0] + sin1 * common->n[1];
    }
    hitWidth *= AbsDot(nHit, ray.d) / rayLength;
}
```

曲线上的\\(uv\\)空间的\\(v\\)与点在与曲线\\(u\\)处的垂线上的位置有关.

```c++
// Initialize _SurfaceInteraction_ _intr_ for curve intersection
// Compute $v$ coordinate of curve intersection point
Float ptCurveDist = std::sqrt(ptCurveDist2);
Float edgeFunc = dpcdw.x * -pc.y + pc.x * dpcdw.y;
Float v = (edgeFunc > 0) ? 0.5f + ptCurveDist / hitWidth
                         : 0.5f - ptCurveDist / hitWidth;
```

u上的偏微分可以直接由Bézier曲线的定义获取. 对于条状曲线, 由于法线已知, 可以直接计算v上的偏微分. 对于平面, v上的偏微分方向沿着垂线, 且长度与当前宽度相等. 对于圆柱体, v上的偏微分会绕u上的偏微分旋转.

```c++
// Compute $\dpdu$ and $\dpdv$ for curve intersection
Vector3f dpdu, dpdv;
EvaluateCubicBezier(pstd::MakeConstSpan(common->cpObj), u, &dpdu);
CHECK_NE(Vector3f(0, 0, 0), dpdu);
if (common->type == CurveType::Ribbon)
    dpdv = Normalize(Cross(nHit, dpdu)) * hitWidth;
else {
    // Compute curve $\dpdv$ for flat and cylinder curves
    Vector3f dpduPlane = objectFromRay.ApplyInverse(dpdu);
    Vector3f dpdvPlane =
        Normalize(Vector3f(-dpduPlane.y, dpduPlane.x, 0)) * hitWidth;
    if (common->type == CurveType::Cylinder) {
        // Rotate _dpdvPlane_ to give cylindrical appearance
        Float theta = Lerp(v, -90, 90);
        Transform rot = Rotate(-theta, dpduPlane);
        dpdvPlane = rot(dpdvPlane);
    }
    dpdv = objectFromRay(dpdvPlane);
}
```

## 浮点精度

浮点精度对渲染结果具有很大的影响, 典型的就是实时渲染中的depth bias, 光追中的浮点误差通常发生在求交中. 比较简单的做法是通过添加\\(\epsilon\\)值来做offset, pbrt的浮点误差处理不需要使用这种方式.

### 浮点算数

#### 算数运算

默认当前浮点运算采用的是IEEE754的默认舍入模式, 即4以下向下取, 6以上想上去, 5舍入到最近的偶数, 这种方式可以减少四舍五入时5总是向上舍入带来的系统误差. 

对于指数为\\(e\\)的浮点数, 各个浮点数之间的最小距离为\\(2^{e-23}\\), 这个距离被称为最低有效位的量级(ulp). 对于浮点加法的运算结果, 令其误差范围为\\([(a+b)(1-\epsilon),(a+b)(1+\epsilon)]\\), 由于此时ulp为\\((a+b)2^{-23}\\), 可知\\(|\epsilon| \le 2^{-24} \approx 5.960464\ldots \times 10^{-8}\\).

#### 工具代码

pbrt支持获取浮点数中的下一个值, 即当前指数下距离最近的两个浮点数, 除NaN, 无穷大等特殊情况, 这通过直接修改最后一位bit来实现.

```c++
PBRT_CPU_GPU
inline float NextFloatUp(float v) {
    // Handle infinity and negative zero for _NextFloatUp()_
    if (IsInf(v) && v > 0.f)
        return v;
    if (v == -0.f)
        v = 0.f;

    // Advance _v_ to next higher float
    uint32_t ui = FloatToBits(v);
    if (v >= 0)
        ++ui;
    else
        --ui;
    return BitsToFloat(ui);
}
```

#### 误差传播

绝对误差与相对误差的定义如下.

$$
\begin{equation}
\begin{aligned}
\delta_a &= |\tilde{a} - a|\\\\
\delta_r &= |\frac{\tilde{a} - a}{a}| = \frac{\delta_a}{a}
\end{aligned}
\end{equation}
$$

舍入后的浮点数与对应的实数具有如下关系.

$$
\tilde{a} \in a \pm \sigma_a = a(1 \pm \sigma_r)
$$

进行多次浮点加法的舍入结果如下.

$$
(((a \oplus b) \oplus c) \oplus d) \in (a+b)(1 \pm \epsilon_m)^3 + c(1 \pm \epsilon_m)^2 + d(1 \pm \epsilon_m)
$$

对于高阶误差的幂具有如下的不等式.

$$
(1 \pm \epsilon_m)^n \le (1 \pm (n + 1) \epsilon_m)
$$

此时简化舍入后的结果, 获得的最大浮点误差如下.

$$
\begin{equation}
4 \epsilon_m |a + b| + 3 \epsilon_m |c| + 2 \epsilon_m |d|
\end{equation}
$$

上述方法被称为前向误差分析, 也可以通过判断输入得到同一个输出的输入范围来进行后向误差分析, 这不是很适用于几何计算. 

下述不等式具有更精确的上界.

$$
\begin{equation}
\begin{aligned}
(1 \pm \epsilon_m)^n \le 1 + \gamma_n\\\\
\gamma_n = \frac{n \epsilon_m}{1 - n \epsilon_m}
\end{aligned}
\end{equation}
$$

可以用上式来表示计算时输入本身所带有的误差, 对于乘法和加法可得如下结果, 可以看出乘法的误差比加法小很多, 且当加法输入绝对值相近但符号相反时误差会很大, 这种现象被称为灾难性抵消.

$$
a(1 \pm \gamma_i) \otimes b(1 \pm \gamma_j) \in ab(1 \pm \gamma_{i + j + 1})\\\\
\delta_r = \gamma_{i+j+1}
$$

$$
a(1 \pm \gamma_i) \oplus b(1 \pm \gamma_j) \in a(1 \pm \gamma_{i+1}) + b(1 \pm \gamma_{j+1})\\\\
\delta_r = \frac{|a|\gamma_{i+1} + |b|\gamma_{j+1}}{a + b}
$$

#### 误差分析

pbrt通过`Interval`类提供误差分析的功能, 每次执行运算时它都会执行误差区间累积的计算.

### 保守光线-包围结构相交

光线相交计算的误差如下. 若\\(t_{\min}\\)与\\(t_{\max}\\)的误差区间重合, pbrt会给\\(t_{\max}\\)增加\\(2 \gamma_3 t_{\max}\\)来保守的确定光线与物体相交.

$$
\begin{equation}
\begin{aligned}
t = (x \ominus o_x) &\otimes (1 \oslash \bold{d}_x) \in \frac{x - o_x}{\bold{d}_x}(1 \pm \epsilon)^3\\\\
\frac{x - o_x}{\bold{d}_x} &\in t (1 \pm \gamma_3)\\\\
\delta_r &= \gamma_3 |t|
\end{aligned}
\end{equation}
$$

### 精确二次方程判别式

球和圆柱等物体的相交计算需要用到二次方程判别式\\(b^2 - 4ac\\), 当物体较远时若\\(b^2 \approx 4ac\\)会导致灾难性抵消现象的出现.

球体和圆柱体的二次方程判别式可以转为如下形式, 此时不再需要计算\\(c\\), 因此误差更小.

$$
\begin{equation}
\begin{aligned}
b^2 - 4ac
&= 4a\left(\frac{b^2}{4a} - c\right)\\\\
&= 4a\left((\bold{o} \cdot \hat{\bold{d}})^2 - (\bold{o} \cdot \bold{o}) + r^2\right)\\\\
&= 4a\left(-\Vert \bold{o} - \frac{b}{2a}\bold{d} \Vert^2 + r^2\right)
\end{aligned}
\end{equation}
$$

$$
\begin{equation}
b^2 - 4ac = 4a \left(r^2 - \Vert \bold{o_{xy}} - \frac{b}{2a} \bold{d_{xy}} \Vert^2\right)
\end{equation}
$$

### 稳定三角形相交

由于边方程只需要判断符号, 浮点误差的影响不大. 对于边方程为0的情况暂时没有很好的精度误差检查方法, 需要用double重新计算, 实际使用中几乎不可能有这种情况.

### 边界交点误差

若\\(t\\)本身带有误差, 光线相交的绝对误差如下.

$$
\begin{equation}
\delta_a = \gamma_1|o_x|+\delta_t(1 + \gamma_2)|\bold{d_x}|+\gamma_2|t_{\text{hit}}\bold{d_x}|
\end{equation}
$$

#### 二次曲面重投影

计算出与二次曲面的交点后可以进行重投影来减小误差, 例如下式中对于球面可以通过半径来重投影, 误差为\\(\gamma_5\\). 圆柱只需要在\\(xy\\)上投影, 误差为\\(\gamma_3\\). 圆盘由于只需要设置\\(z\\)值, 它相当于是没有误差的.

$$
\begin{equation}
x'
= x \frac{r}{x^2 + y^2 + z^2}
\end{equation}
$$

#### 三角形参数评估

采用边方程计算重心坐标后再进行插值的误差如下.

$$
\begin{equation}
\delta_a = \gamma_7(|b_0x_0| + |b_1x_1| + |b_2x_2|)
\end{equation}
$$

#### 双线性片参数评估

双线性插值误差如下.

$$
\begin{equation}
\gamma_6(|x_{0,0}|+|x_{0,1}|+|x_{1,0}|+|x_{1,1}|)
\end{equation}
$$

#### 曲线参数评估

为避免离开曲线的光线与其重新相交, 误差会被设置为曲线的宽度, 若曲线宽度过宽用双线性片来代替是更好的选择.

#### 变换误差

变换后的\\(x'\\)误差如下, 下式分别是原值不包括和包括误差的情况.

$$
\begin{equation}
\gamma_3(|m_{0,0}x|+|m_{0,1}y|+|m_{0,2}|z+|m_{0,3}|)
\end{equation}
$$

$$
\begin{equation}
(\gamma_3+1)(|m_{0,0}|\delta_x + |m_{0,1}|\delta_y + |m_{0,2}|\delta_z) + \gamma_3(|m_{0,0}x| + |m_{0,1}y| + |m_{0,2}z| + |m_{0,3}|)
\end{equation}
$$

#### 稳定生成光线起点

我们需要将某个面附近的光线起点沿着法线移动, 使得它位于交点的误差范围之外, 以此使用最小的偏移量避免错误的相交, 保证了阴影, 反射等效果的质量. 偏移向量定义如下, 为避免向下舍入pbrt会将值移动一个ulp.

$$
\begin{equation}
\bold{n} \cdot (\delta_x, \delta_y, \delta_z)
\end{equation}
$$

```c++
for (int i = 0; i < 3; ++i) {
    if (offset[i] > 0)      po[i] = NextFloatUp(po[i]);
    else if (offset[i] < 0) po[i] = NextFloatDown(po[i]);
}
```

在阴影与光源求交的计算中有可能因为距离光源过近的物体导致错误相交, pbrt通过提前停止来求交来简单的处理.

```c++
constexpr Float ShadowEpsilon = 0.0001f;
```

为避免变换带来的误差, 每次变换中光线起点都会移动到误差边界.

```c++
if (Float lengthSquared = LengthSquared(d); lengthSquared > 0) {
    Float dt = Dot(Abs(d), o.Error()) / lengthSquared;
    o += d * dt;
    if (tMax)
        *tMax -= dt;
}
```

### 避免光线起点后方的相交

由于误差实际为负的\\(t\\)值可能计算结果为正, 对于部分形状pbrt实现了高效的保守误差分析.

#### 三角形

采用边方程重心坐标计算出的\\(t\\)误差如下, 若不超过这个值则认为交点在后方.

$$
\begin{equation}
\begin{aligned}
\delta_e &= 2(\gamma_2 \max_i|x_i|\max_i|y_i| + \delta_y\max_i|x_i|+\delta_x\max_i|y_i|)\\\\
\delta_t &= 3(\gamma_3 \max_i|e_i||z_i| + \delta_e\max_i|z_i|+\delta_z\max_i|e_i|)
\end{aligned}
\end{equation}
$$

#### 双线性片

pbrt通过计算一个简单的\\(\epsilon\\)来解决后方相交误差.

$$
\begin{equation}
\begin{aligned}
c_{\max}(\bold{v}) &= \max(\bold{v_x}, \bold{v_y}, \bold{v_z})\\\\
\epsilon
&= \gamma_10 (c_{\max}(|\bold{o}|) + c_{\max}(|\bold{d}|)\\\\
&+ c_{\max}(|\bold{p_{0,0}}|)+ c_{\max}(|\bold{p_{0,1}}|)\\\\
&+ c_{\max}(|\bold{p_{1,0}}|)+ c_{\max}(|\bold{p_{1,1}}|))
\end{aligned}
\end{equation}
$$

---
title: "pbrt-v4 Ep. VII: 图元与加速结构"
date: 2024-11-19
draft: false
description: "pbrt-v4 episode 7"
tags: ["graphics", "rendering", "pbrt"]
---

{{<katex>}}

上一节的`Shape`类主要提供相交, 包围结构, 采样等功能, 这些与几何物体本身相关, pbrt通过`Primitive`接口来提供材质等特征. 通过`Primitive`的集合可以实现加速结构, pbrt实现了`BVHAggregate`与`KdTreeAggregate`. 本节只介绍在CPU上的实现, GPU上由于光追图形接口需要另一套实现.

## 图元接口与几何图元

`Bounds`用于构建加速结构, `Intersect`用于求交.

```c++
class Primitive
    : public TaggedPointer<SimplePrimitive, GeometricPrimitive, TransformedPrimitive,
                           AnimatedPrimitive, BVHAggregate, KdTreeAggregate> {
  public:
    // Primitive Interface
    using TaggedPointer::TaggedPointer;

    Bounds3f Bounds() const;

    pstd::optional<ShapeIntersection> Intersect(const Ray &r,
                                                Float tMax = Infinity) const;
    bool IntersectP(const Ray &r, Float tMax = Infinity) const;
};
```

### 几何图元

几何图元内部保存对应的`Shape`以及材质与自发光属性, `Bounds`与`Intersect`直接通过调用`Shape`的接口实现.

```c++
Shape shape;
Material material;
Light areaLight;
MediumInterface mediumInterface;
FloatTexture alpha;
```

树叶等物体需要通过alpha test来决定相交是否有效, pbrt通过随机alpha test来实现, 将alpha作为概率值随机返回0或1, 若为0则重新求交. 为保证结果的确定性, pbrt通过`HashFloat`使得相同的光线产生相同的随机值.

大部分物体不需要考虑alpha以及表面两侧的介质差异, pbrt提供了`SimplePrimitive`接口, 只存储`Shape`与`Material`.

### 物体多实例与运动图元

对于大量重复物体多实例可以只存储一份几何数据, 有效节省存储资源. pbrt通过`TransformedPrimitive`实现, 内部存储一个`Primitive`以及额外的到渲染空间的变换. 对于运动物体, pbrt使用`AnimatedPrimitive`, 变换采用`AnimatedTransform`存储, 包围盒取物体运动范围的包围盒.

## 聚合

线性的与所有图元求交带来的时间复杂度是显著的, 需要通过将多个图元聚合来减小求交的规模. 目前主要有两类主流方案, 物体细分由`BVHAggregate`实现, 空间细分由`KdTreeAggregate`实现. 聚合图元通过`TransformedPrimitive`或`AnimatedPrimitive`存储, 不考虑材质与光照.

## 包围结构层级

包围结构层级(bounding volume hierarchies)即为BVH, pbrt使用以下几种分割方法, `SAH`具有最高的分割质量, `HLBVH`相对效率较高, 后两类效果较差, 主要用于比较.

```c++
enum class SplitMethod { SAH, HLBVH, Middle, EqualCounts };
```

### 包围结构层级构建

BVH构建分为三步, 首先计算图元的包围信息存储在数组中, 其次根据分割方法构建二叉树, 每个节点存储一个或多个图元的引用, 最后将树压缩为更高效的无指针实现, 与在树的构建过程中压缩相比这种方法的实现更为简单.

BVH中的图元通过`BVHPrimitive`存储, 内部存储其包围盒与在图元数列中的序号. 在构建完成后会生成`orderedPrims`, 保证同一个叶结点上的图元在内存中连续.

```c++
size_t primitiveIndex;
Bounds3f bounds;
```

pbrt通过标准库中的`pmr::monotonic_buffer_resource`分配BVH所需要的大内存, 与通用内存分配器相比可以减小10%的空间开销. 这个分配器不保证线程安全, pbrt通过`ThreadLocal`类实现.

BVH节点通过`BVHNode`存储, 其中存储着子树所有图元的包围盒, 对于叶节点会存储第一个图元的序号与图元数量. 叶节点与中间节点通过后代指针是否为`nullptr`来区分. 在`orderedPrims`中的需要通过原子变量获取.

```c++
Bounds3f bounds;
BVHBuildNode *children[2];
int splitAxis, firstPrimOffset, nPrimitives;
```

pbrt选取包围盒长度最长的轴作为分割轴, 以此减小某个图元穿过被分割的两个包围盒的情况, 决定分割轴后根据分割方法将图元分成两组, 递归到子节点中继续分割.

`Middle`是最简单的分割方法, 判断包围盒中心在分割面的哪一侧即可, 利用`std::partition`可以快速实现. 分割后数据仍然在原有的容器中, `std::partition`返回的是第二组第一个元素的迭代器.

```c++
auto midIter = std::partition(
    bvhPrimitives.begin(), bvhPrimitives.end(),
    [=](const BVHPrimitive &bp) {
        int b =
            nBuckets * centroidBounds.Offset(bp.Centroid())[dim];
        if (b == nBuckets)
            b = nBuckets - 1;
        return b <= minCostSplitBucket;
    });
mid = midIter - bvhPrimitives.begin();
```

对于无法分割为两组的情况, pbrt会回退到`EqualCounts`方法, 即通过`std::nth_element`使得位于中间的图元处在正确的位置上, 其余根据图元中心位置分为两组. `std::nth_element`内部采用部分快速排序, 由于不需要完全排序, 时间复杂度为\\(O(n)\\).

### 表面面积启发式分割

前两种方法往往会得到不理想的分割结果导致较高的求交开销, 表面面积启发式分割(Surface Area Heuristic, SAH)是较优的分割方法.

我们认为对于某个叶子节点它的所有图元都需要进行相交测试, 因此将某个节点分为\\(A\\), \\(B\\)两个子树后, 与所有图元计算相交的开销如下, \\(p\\)为与当前节点相交的光线与某个子树相交的概率, \\(t_{trav}\\)为遍历当前节点的开销.

$$
\begin{equation}
c(A, B) = t_{\text{trav}} + p_A \sum_{i = 1}^{n_A} t_{\text{isect}}(a_i) + p_B \sum_{i = 1}^{n_B} t_{\text{isect}}(b_i)
\end{equation}
$$

SAH会将分割轴均分为多个区域(或者说"桶", bucket, 翻译过来有点怪...), 根据包围盒中心在哪个区域中进行分组, 以区域边界作为备选分割面. pbrt将包围盒的面积与图元数量的乘积作为启发式开销, 选择最小的分割面使得两侧的聚合图元的启发式开销之和最小, 通过正向与逆向累加可以以\\(O(n)\\)的复杂度计算出结果.

```c++
// Compute costs for splitting after each bucket
constexpr int nSplits = nBuckets - 1;
Float costs[nSplits] = {};
// Partially initialize _costs_ using a forward scan over splits
int countBelow = 0;
Bounds3f boundBelow;
for (int i = 0; i < nSplits; ++i) {
    boundBelow = Union(boundBelow, buckets[i].bounds);
    countBelow += buckets[i].count;
    costs[i] += countBelow * boundBelow.SurfaceArea();
}

// Finish initializing _costs_ using a backward scan over splits
int countAbove = 0;
Bounds3f boundAbove;
for (int i = nSplits; i >= 1; --i) {
    boundAbove = Union(boundAbove, buckets[i].bounds);
    countAbove += buckets[i].count;
    costs[i - 1] += countAbove * boundAbove.SurfaceArea();
}

// Find bucket to split at that minimizes SAH metric
int minCostSplitBucket = -1;
Float minCost = Infinity;
for (int i = 0; i < nSplits; ++i) {
    // Compute cost for candidate split and update minimum if
    // necessary
    if (costs[i] < minCost) {
        minCost = costs[i];
        minCostSplitBucket = i;
    }
}
```

pbrt认为当前节点遍历开销为0.5, 图元相交开销为1, 此时若为叶节点则开销为图元数量, 否则为0.5加上启发式开销除以所有图元的包围盒的面积. 遍历开销实际上是较大的, pbrt设置为0.5使得BVH树的深度不会过大.

```c++
// Compute leaf cost and SAH split cost for chosen split
Float leafCost = bvhPrimitives.size();
minCost = 1.f / 2.f + minCost / bounds.SurfaceArea();
```

### 线性包围结构层级分割

线性包围结构层级分割即LBVH分割方法. 每个节点都计算SAH开销较大, 且不利于并行化. LBVH可以解决这些问题, 它通过Morton码对包围盒中心排序, 选取中间的图元进行分割. pbrt实现了层级线性包围结构层级(hierarchical linear bounding volume hierarchy, HLBVH), 自底向上构建BVH.

pbrt通过`MortonPrimitive`存储图元序号与对应的Morton码, \\(x\\), \\(y\\), \\(z\\)各占10位. 图元包围盒中心在当前节点的相对位置值域在\\([0,1]\\)中, 通过缩放\\(2^{10}\\)倍来获取Morton码. pbrt采用基数排序, 每次处理6位, 经过试验效率高于`std::sort`. 排序后的图元簇采用`LBVHTreelet`表示, 存储在`mortonPrims`中的序号与数量.

```c++
struct MortonPrimitive {
    int primitiveIndex;
    uint32_t mortonCode;
};

struct LBVHTreelet {
    size_t startIndex, nPrimitives;
    BVHBuildNode *buildNodes;
};
```

pbrt首先根据高12位进行图元分簇, 完成分簇后立即分配`BVHBuildNode`所需的空间, 即\\(2^n - 1\\)个节点. 由于每次并行处理的图元簇都具有相同的高位, 包围盒可以从中获取. 同时当前分割位与分割轴是相关的, 无需额外进行分割轴的选取, 处理到最后一位或图元数小于阈值时会创建叶节点. 叶子节点建立完成后即可开始创建中间节点, 由于所有节点已经按照Morton码排序, 创建过程中节省了许多划分与重排的开销. 各个高位对应的子树都处理完成后, 剩余节点仍然采用SAH构建

### 加速树压缩

pbrt在`flattenBVH()`中实现压缩, 压缩后的二叉树转为数组存储, 利用下标表达父子关系. 压缩后的节点存储为`LinearBVHNode`, 最终得到的数组指针存储在`BVHAggregate`中.

```c++
struct alignas(32) LinearBVHNode {
    Bounds3f bounds;
    union {
        int primitivesOffset;   // leaf
        int secondChildOffset;  // interior
    };
    uint16_t nPrimitives;  // 0 -> interior node
    uint8_t axis;          // interior node: xyz
};
```

### 相交测试

相交测试时pbrt将需要访问的节点序号存储在`nodesToVisit`栈中, 由于访问的节点数量不会很多, pbrt用数组手工模拟.

```c++
int toVisitOffset = 0, currentNodeIndex = 0;
int nodesToVisit[64];
int nodesVisited = 0;
```

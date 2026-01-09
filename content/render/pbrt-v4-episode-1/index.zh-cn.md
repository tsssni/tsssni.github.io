---
title: "pbrt-v4 Ep. I: 代码实现"
date: 2024-10-01
draft: false
description: "pbr4 v4 episode 1"
tags: ["graphics", "rendering", "pbrt"]
---
国庆开坑pbrt-v4的学习, 主要想深入了解光谱渲染.
pbrt是与pbr-v4这本书配套的渲染器实现.
大部分书只是有配套代码, 而非一个完整的开源软件,
pbrt这一点确实不错.

## 编译环境

pbrt-v4的依赖项都写在git submodule里了, 安装cmake即可.
对于nix-darwin用户, 由于编译器不会包含impure的系统framework路径,
需要在flake中手动指定, 否则glfw会编不过.
```nix
{
  description = "pbrt devenv";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-24.05-darwin";

  outputs = { 
    nixpkgs
    , ...
  }:
  let
    system = "aarch64-darwin";
    pkgs = import nixpkgs {
      inherit system;
    };
  in {
    devShells."${system}".default = pkgs.mkShell {
      packages = []
        ++ (with pkgs; [
          clang
          lldb
          cmake
        ])
        ++ (with pkgs.darwin.apple_sdk.frameworks; [
          Cocoa
          IOKit
          CoreFoundation
          Kernel
        ]);
      shellHook = ''
        exec zsh
      '';
    };
  };
}
```

## 程序结构

pbrt-v4基于C++17, 遵循面向对象的结构(会有继承地狱的样子), 针对光线、相机、BxDF等设计了抽象接口.
pbrt-v4在设计上同时支持CPU/GPU光追, 支持CUDA与OptiX(显然darwin跑不了GPU, 毕竟23年的M3/A17才加上光追单元).

## 运行流程

1. 读取参数
2. 解析描述文件
3. 创建场景
4. integrator渲染循环 

一气呵成的结构, 这里把renderer类称作integrator是因为渲染的核心流程就是求解渲染方程这一积分式, 这个名字还是比较贴切的.

场景中的物体通过`Primitive`存储, 其中包含`Material`与`Shape`, 整个场景都包含在`aggregate`这一`Primitive`的实现中.
除`aggregate`之外场景只会存储`lights`, pbrt将平行光这类无限距离的光源单独存储, 只考虑这些光源可以更高效的渲染出可以接受的结果.
部分光源需要获取场景的包围盒, 因此pbrt给光源添加了`preprocess`接口.

`Integrator`接口需要实现`Render`与`Intersect`函数.
`Intersect`有一种特殊实现叫做`IntersectP`, 只考虑是否相交而非具体的相交信息, 通常用于阴影.
作者说这种命名方式来自于Lisp, 其实国庆本来想学SICP的, 可惜时间就这么点.

### ImageTileIntegrator

`ImageTileIntegrator`实现了`Integrator`, 支持将渲染图像划分为tile来实现并行渲染,
该类的构造函数需要额外的`Camera`与`Sampler`, 最终渲染结果存储在`Camera`中的`Film`成员.
`ImageTileIntegrator`渲染时会分为多次wave, 每次wave的sample数逐步增加, 以此来实现渲染图像的预览.

由于需要分配大量小内存来存储光线求解过程中的表面散射信息, pbrt通过自定义的`ScratchBuffer`来提高效率.
该类通过address offset的递增来快速分配相同大小的内存, 但是释放时只能通过将offset设置为0来释放当前所有分配的小内存, 
也因此每个thread都需要创建`ScratchBuffer`, pbrt通过`ThreadLocal`模板类来实现.

虚函数`EvaluatePixelSample`负责调用`Sampler`生成采样点供`Integrator`发射光线.
由于需要存储像素位置等状态, `Sampler`也通过`ThreadLocal`来定义.
在每个采样点渲染完成后, 会调用`ScratchBuffer::Reset()`来统一释放光追过程中分配的内存.

### RayIntegrator

`RayIntegrator`继承自`ImageTileIntegrator`(继承链开始变长了, 有种不好的预感),
在划分tile的基础上通过实现`EvaluatePixelSample`提供光线路径相关的功能.

不同于传统的RGB渲染, `RayIntegrator`会在有效光谱范围中均匀采样, 每个sample都具有不同的波长, 默认是4个sample.
按我的理解, RGB就是只有三个固定波长的特殊形式的光谱渲染, 这里是更一般化的形式.
RGB是可以三种波长一次计算的, 通用光谱渲染应该是要各个波长单独走光追流程了, 开销更大.

`Camera`接口负责实现`GenerateRay`与`GenerateRayDifferential`, `GenerateRay`负责生成光线,
`GenerateRayDifferential`负责生成相邻像素的光线信息以支持抗锯齿.
`CameraSample`用于存储采样点在`Film`的位置.
它还会包含用于非小孔成像的镜头位置以及样本权重, 主要用于实现非pinhole的camera.
这一章给出的示例图是有景深效果的, pbrt应该实现了透镜镜头.

`RayIntegrator`声明了`Li`这一虚函数用于实现具体的光照过程, 返回值为`SampledSpectrum`, 即样本的光谱信息.
该函数的参数包含`VisibleSurface`指针, 对于需要存储物体表面几何信息的`Film`这会返回它所需要的信息.

### RandomWalkIntegrator

上面的都是虚类, 这里终于到具体实现了, 继承吼可怕.

`RandomWalkIntegrator`主要实现了Monte Carlo方法, 通过物体的自发光与用BSDF得到的反射光线返回的结果得到渲染样本.
这里没有考虑直接光源, 自然会缺少有阴影与高光项, 光线也几乎不会与场景里的光源相交.
按照作者的说法, 那张满是噪点的示例图是每个像素4096个样本的结果, 这里也可以窥见AI降噪缘何如此火热.

## 代码使用

### 命名

类名采用大写开头camel case, 变量采用小写开头.

### 指针 or 引用

可变的或者可以传入空值的用指针, 否则const引用.

### 标准库

pbrt尽量使用标准库来降低代码复杂度, 部分标准库的重新实现会放在pstd namespace下.

### 内存分配

pbrt使用`std::pmr::polymorphic_allocator`来分配对象, 这是c++17提供的内存管理器接口, 用于实现多态的内存管理器.
相比于`new`&`delete`, 通过函数调用显示分配内存方便pbrt收集内存分配情况并提高小对象分配效率, 同时也便于分配GPU可见的内存.

### 动态分派

pbrt不使用虚表来实现多态, 而是通过`TaggedPointer`来存储函数与类型信息,
主要是为了减少复杂场景下大量虚表指针带来的性能开销以及实现GPU代码的多态.

### 代码优化

这里主要提到了pbrt会优化访存速度, 并未设计具体实现.

### 调试 & 错误处理

pbrt中包含大量单元测试来保证代码的正确性, 运行时通过assertion来报错.
pbrt会报告具体哪个像素与样本发生错误, 并支持只重新执行这个样本来查找错误.
pbrt中的类提供了toString类来实现类似于运行时反射的功能.

### 多线程

pbrt为了保证效率, 绝大部分数据结构都是非线程安全的, 基本也都是每个线程单独创建自己需要的或者是只读的.

绝大部分工具类是线程安全的, 例如`Camera`、 `BxDF`.
`Light::Preprocess`是非线程安全的, 因为场景的构建过程为单线程.
`Sampler`是非线程安全的, 这是考虑到光线采样过程中的性能开销, 因此每个线程都会创建Sampler.

所有全局函数都是线程安全的.

### 可扩展性

教学用的软件可扩展性肯定要保证的, 后面我应该也会尝试实现新的渲染方法.

### Bugs

(去pbrt.org提issue吧)

## PBR历史

这里我就不总结了, 按我自己的经历来说, 首次接触是在RTR4, 现在在实时渲染上GGX+Smith应该是绝对主流了.

## 结语

这一章主要介绍pbrt的代码结构, 这对于后续的阅读与代码练习是很有意义的.
至于为什么要着重强调这次加入了GPU光追, 答案很显然: 2/3的作者是nVidia的.
后续章节这两天应该就会更新.

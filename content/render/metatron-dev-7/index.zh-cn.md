---
title: "Metatron Dev. VII: GPU"
date: 2026-01-09
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "metatron", "metal", "vulkan"]
---

新版本决定添加GPU后端, 基于Metal做一套Metal/Vulkan RHI. 相比于CUDA/HIP, graphics API无法直接复用cpp代码, metatron最终实现了一套简易的上传机制, 代码可从cpp copy到slang, 稍作修改即可.

## stl::buf

大量资源需要通过`std::vector`或`std::array`来分配, 由于Metal/Vulkan都支持指针, 可以实现自定义的`stl::buf`用于动态分配, 上传时替换其中的指针即可.

`stl::buf`的数据结构如下, 其中`handle`用于存储底层GPU buffer对象的指针, 加速结构构建等操作需要直接获取该对象; idx为在全局分配池中的序号.

```cpp
struct buf {
    mut<byte> ptr = nullptr;
    uptr handle = 0;
    u32 bytelen = 0;
    u32 idx = math::maxv<u32>;
};
```

全局分配池的实现为`stl::stack`, 其成员如下. `bufs`存储程序运行期间所有分配的`stl::buf`, 上传GPU时可直接从这里获取. `deleters`为分配时添加的析构函数. `flag`用于多线程加锁.

```cpp
struct stack final: singleton<stack> {
    using deleter = std::function<void(mut<buf>)>;
    std::vector<mut<buf>> bufs;
    std::vector<deleter> deleters;
    std::atomic_flag flag;
}
```

为便于使用, 在metatron的全局命名空间添加了`buf<T>`, 可直接通过长度或`std::span`来构造.

```cpp
template<typename T>
struct buf final: stl::buf {
    buf(usize size) noexcept;
    template<typename U>
    requires std::is_same_v<T, std::remove_const_t<U>>
    buf(std::span<U> range) noexcept: buf(range.size());
};
```

场景初始化过程会伴随着大量的移动构造/赋值, 这会导致原来存储在bufs中的指针失效, `stl::stack`实现了线程安全的`swap`来解决该问题.

```cpp
auto swap(mut<buf> buf) noexcept -> void {
    if (buf->idx == math::maxv<u32>) return;
    while (flag.test_and_set(std::memory_order::acquire));
    if (bufs[buf->idx] != buf) bufs[buf->idx] = buf;
    flag.clear(std::memory_order::release);
}
```

## stl::vector

类似于ECS, 全局资源都存储在对应的`stl::vector<T>`中, 特化的`stl::vector<byte>`用于实现实际的分配. 为实现高校的并发分配, `stl::vector<byte>::spin()`会一次性分配`block_size`个对象需要的空间, 序号小于已分配对象数量的线程可以并发构造, 当前可容纳的所有对象分配完成后再进行下一次分配与后续构造.

```cpp
auto spin() noexcept -> std::tuple<mut<byte>, u32> {
    auto idx = length.fetch_add(1);
    auto block = idx / block_size;
    auto start = block * block_size;
    auto local_idx = idx % block_size;
    if (idx >= max_idx) stl::abort("vector overflow");

    while (fetched.load(std::memory_order::acquire) < start);
    if (local_idx == 0) {
        blocks.push_back(mut<byte>(std::malloc(bytelen * block_size)));
        pathes.resize(start + block_size);
        allocated.fetch_add(1, std::memory_order::release);
    } else while (allocated.load(std::memory_order::acquire) <= block);

    auto ptr = blocks[block] + local_idx * bytelen;
    return {ptr, idx};
}
```

特化的`stl::vector<>`用于存储全局所有正在使用的`stl::vector<T>`, 每个`stl::vector<T>`会存储在其中的序号, 由于下文提到的`tag<T>`的限制数量被限定为256.

```cpp

template<>
struct vector<void> final: singleton<vector<void>> {
    auto constexpr static max_idx = 256;
    std::array<stl::vector<byte>, max_idx> storage;
};
```

对于多态类型, 也就是本项目中符合`pro::facade`的类型, 需要执行`emplace_type`来为派生类型分配需要, 运行时通过`tag<T>`中的序号还确定底层类型并执行需要的操作, 例如`reinterpreter`用于获取派生类对象并转为基类指针.

```cpp
template<typename T>
requires poliable<F, T>
auto emplace_type() noexcept -> void {
    if (map.contains(typeid(T))) return;
    if (sid.size() >= max_idx) stl::abort("facade vector overflow");
    sid.push_back(vector<void>::instance().push<T>());
    map[typeid(T)] = sid.size() - 1;
    length.push_back(sizeof(T));
    reinterpreter.push_back([](view<byte> ptr) {
        return make_mut<F>(*(mut<T>)ptr);
    });
    if constexpr (F::copyability != pro::constraint_level::none)
        copier.push_back([](view<byte> ptr) {
            auto x = *(mut<T>)ptr; return make_obj<F, T>(std::move(x));
        });
}
```

所有通过`stl::vector<T>`管理的资源都可以通过`tag<T>`访问, 其本身只存储一个`uint`, 0-20位存储在`vector`中的偏移量/索引, 20-23存储当前多态类型的序号, 24-31存储当前对象数组在`stl::vector<>::storage`中的序号.

```cpp

template<typename T>
struct tag final {
    using vec = stl::vector<T>;

    tag(): idx(math::maxv<u32>) {};
    tag(u32 idx): idx(idx) {}
};
```

## Shader

glsl不便于cpp代码迁移. hlsl不支持指针, 两大最流行的shader language都被排除. 基于cpp17的MSL是理想选择, 但官方只支持转译到dxil, 无法支持指针, 社区未提供任何spirv转译方案. 若使用slang原生的MSL后端, 指针与光追等特性都不被支持. 因此最终选择slang编译到spirv, 再通过支持指针与光追的[spirv-cross](https://github.com/KhronosGroup/SPIRV-Cross)反编译到MSL.

在slang中GPU全局数据结构如下, 由于Metal无法支持多重指针, 即slang中的`Ptr<Ptr<...Ptr<<T>>`, 这里使用`uptr`类型, 使用时强制转为指针.

```slang
public struct Resources {
    public uptr vectors;
    public uptr volumes;
    [vk_binding(1, 1)] public RaytracingAccelerationStructure accel;
}
[vk_binding(0, 1)] public ParameterBlock<Resources> resources;
```

`buf<T>`直接强转为指针再访问元素.

```slang
public struct buf<T> {
    public uptr ptr = 0;
    public uptr handle = 0;
    public u32 bytelen = 0;
    public u32 idx = 0xffffffffu;
    public __subscript(u32 i) -> T { get { return Ptr<T>(ptr)[i]; } }
}
```

`tag<T>`由于MSL不支持多重指针, 这里需要先转为Ptr<uptr>, 再转为Ptr<T>.

```slang
public struct tag<T> {
    public u32 idx;
    public func get() -> Ptr<T> {
        let base = Ptr<uptr>(resources.vectors);
        let arr = Ptr<T>(base[storage()]);
        return arr + index();
    }
}
```

对于多态类型的`tag<T>`, slang本身直接使用基类对象, 但由于GPU不支持基于指针的动态分派, 基类大小为所有派生类之和, 对部分类型过于浪费了, 因此shader中针对每种多态实现各自的`tag<T>`, 通过分支选择调用的函数, 例如`Spectrum_Tag`.

```slang
public struct Spectrum_Tag: Spectrum {
    tag<byte> idx = {};

    public f32 operator()(f32 lambda) {
        if (idx.type() == 0) return tag<Constant_Spectrum>(idx).get()(lambda);
        else if (idx.type() == 1) return tag<Rgb_Spectrum>(idx).get()(lambda);
        else if (idx.type() == 2) return tag<Blackbody_Spectrum>(idx).get()(lambda);
        else if (idx.type() == 3) return tag<Visible_Spectrum>(idx).get()(lambda);
        else if (idx.type() == 4) return tag<Discrete_Spectrum>(idx).get()(lambda);
        else return {};
    }

    public func empty() -> bool { return idx.empty(); }
}
```

## RHI

考虑到易用性, RHI本身基于Metal3实现, 即使Metal4与引入大量与D3D12对齐的特性后更方便实现RHI.

命令录制遵循Metal3的流程, 通过queue分配buffer, 使用encoder来更紧凑的录制. 为控制Vulkan下的多queue并行, 在Metal的基础上额外支持family transfer.

针对metatron需要的光追功能, Metal由于有原生的函数指针, 没有定义额外的ray tracing pipeline, 直接在render/compute pipeline中调用, 额外添加intersection function用于过程几何求交. spirv-cross尚未支持将ray tracing pipeline转译为visible functions, 因此最终基于ray query实现求交, 只支持compute shader.

对于command buffer间的同步, `MTLEvent`和timeline下的`VkSemaphore`具有相同的功能, 需要注意的是Metal调用`eventWait`时只保证后续录制的命令会acquire该event, 因此需要在录制前生命等待的timeline, 而Vulkan是在提交到queue时声明.

Metal不支持资源本身的状态同步, 但command encoder之间在untracked模式下是需要同步的, 因此每个command encoder在录制前与录制后会acquire/release `MTLFence`.

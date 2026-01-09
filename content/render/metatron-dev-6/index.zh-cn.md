---
title: "Metatron Dev. VI: ECS & SERDE"
date: 2025-08-06
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "metatron"]
---

利用[EnTT](https://github.com/skypjack/entt)和[Glaze](https://github.com/stephenberry/glaze)构建了一套场景管理系统.

## ECS

metatron的ecs系统中, entity/component由entt管理, system则需要实现`ecs::Daemon`接口.

`ecs::Hierarchy`用于维护世界树, 树节点采用Unix路径命名并分配对应的`ecs::Entity`. hierarchy会包含多个`ecs::Stage`, stage中则包含多个`ecs::Daemon`, stage会按序更新, 但内部的daemon可能会由于多线程不能保证有序, 若需有序需位于不同的stage.

```c++
// ...
resource_stage->daemons = {
    &transform_daemon,
    &shape_daemon,
    &medium_daemon,
    &texture_daemon,
};
// ...
hierarchy.stages = {
    spectrum_stage.get(),
    resource_stage.get(),
    material_stage.get(),
    camera_stage.get(),
    render_stage.get(),
};
```

各个daemon会有`init`与`update`接口, `init`用于提前挂载预定义的components(例如金属的IOR光谱)以及注册serde, `update`则执行前述的更新操作, 负载重的任务可通过`stl::scheduler`实现多线程.

```c++
struct Daemon final: pro::facade_builder
::add_convention<daemon_init, auto () noexcept -> void>
::add_convention<daemon_update, auto () noexcept -> void>
::add_skill<pro::skills::as_view>
::build {};
```

entt不会记录component是否被修改, metatron通过在世界树节点上挂载额外的`ecs::Dirty_Mark<T>`实现, 各个daemon更新完毕后需要清除.

```c++
template<typename T>
auto attach(Entity entity, T&& component = {}) noexcept -> void {
    registry.emplace<Dirty_Mark<T>>(entity);
    registry.emplace<T>(entity, std::forward<T>(component));
}
```

当前活跃的hierarchy可以通过global static `ecs::Hierarchy::instance`访问, 执行`activate()`来修改instance. 这主要用于方便entity与路径的转换, 例如可以通过字面量`_et`执行转换.

```c++
namespace mtt::ecs {
	auto to_path(Entity entity) -> std::string {
		return Hierarchy::instance->path(entity);
	}

	auto to_entity(std::string const& path) -> Entity {
		return Hierarchy::instance->create(path);
	}
}

namespace mtt {
	auto operator"" _et(view<char> path, usize size) -> ecs::Entity {
		return ecs::to_entity(path);
	}
}
```

## SERDE

Glaze库通过调用编译器的internal函数实现反射功能, 对于aggregate的反射无需手动注册, 对部分容器也有支持, 在c++26的静态反射实装前是很好用的替代品.

对于`ecs::Entity`, 我们通过全局的`ecs::Hierarchy::instance`调用`ecs::to_path`与`ecs::to_entity`即可. 对于metatron中最基础的`math::Matrix`类型, 注册为反射内部实际存储数据的`std::array<Element, first_dim>`, Glaze会处理`Element`的递归. `math::Quaternion`的反射同理. 除这三个类型外别的都可以交给Glaze处理.

```c++
template<typename T, mtt::usize first_dim, mtt::usize... rest_dims>
struct from<JSON, mtt::math::Matrix<T, first_dim, rest_dims...>> {
    template<auto Opts>
    auto static op(mtt::math::Matrix<T, first_dim, rest_dims...>& v, auto&&... args) noexcept -> void {
        using M = mtt::math::Matrix<T, first_dim, rest_dims...>;
        using E = M::Element;
        auto data = std::array<E, first_dim>{};
        parse<JSON>::op<Opts>(data, args...);
        v = M{std::span<E const>{data}};
    }
};

template<typename T, mtt::usize first_dim, mtt::usize... rest_dims>
struct to<JSON, mtt::math::Matrix<T, first_dim, rest_dims...>> {
    template<auto Opts>
    auto static op(mtt::math::Matrix<T, first_dim, rest_dims...> const& v, auto&&... args) noexcept -> void {
        using E = mtt::math::Matrix<T, first_dim, rest_dims...>::Element;
        auto const& data = std::array<E, first_dim>(v);
        serialize<JSON>::op<Opts>(data, args...);
    }
};
```

对于`enum`, Glaze需要手动注册才能反射出各项名称, 如果后续添加c++26支持的话理论上是不需要的, 或者说实现类似[magic_enum](https://github.com/Neargye/magic_enum)的功能, 两种方法都会方便很多.

```c++
template<>
struct glz::meta<mtt::color::Color_Space::Spectrum_Type> {
	using enum mtt::color::Color_Space::Spectrum_Type;
	auto constexpr static value = glz::enumerate(
		albedo,
		unbounded,
		illuminant
	);
};
```

对于需要多态的components, 例如不同的光源, metatron通过std::variant实现, 避免同时存储各个子component的数据. 每个子component最后的`i32`用于Glaze序列化时标记, 否则需要为所有类型手动注册`glz::meta::value`, 并为`std::variant<Ts...>`注册`glz::meta::tag`与`glz::meta::ids`.

```c++
struct Parallel_Light final {
    ecs::Entity spectrum;
    i32 parallel{0};
};

struct Point_Light final {
    ecs::Entity spectrum;
    i32 point{0};
};

struct Spot_Light final {
    ecs::Entity spectrum;
    f32 falloff_start_theta;
    f32 falloff_end_theta;
    i32 spot{0};
};

struct Environment_Light final {
    ecs::Entity env_map;
    i32 environment{0};
};

using Light = std::variant<
    Parallel_Light,
    Point_Light,
    Spot_Light,
    Environment_Light
>;
```

需要注意的是对于多重`std::variant`(`std::variant<std::variant<Ts...>, std::varaint<Us...>>`)Glaze是无法正确反序列化的, 原本metatron中有这种写法, 因为texture需要分为spectrum_texture与vector_texture, 后面还是展开到单个`std::variant`中, 通过实现`stl::is_variant_alternative`判断是否位于原本的内部`std::variant`中, 不再走`std::visit`来判断.

```c++
template<typename T, typename Variant>
struct is_variant_alternative : std::false_type {};

template<typename T, typename... Types>
struct is_variant_alternative<T, std::variant<Types...>>
    : std::disjunction<std::is_same<T, Types>...> {};

template<typename T, typename Variant>
auto constexpr is_variant_alternative_v = is_variant_alternative<T, Variant>::value;
```

json序列化结构如下, 每个daemon会注册处理序列化与反序列化的函数, 通过`type`索引到对应的`std::function`.

```json
{
    "entity": "/divider/cloud",
    "type": "divider",
    "serialized": {
        "shape": "/hierarchy/shape/bound",
        "medium": "/hierarchy/medium/cloud",
        "material": "/material/cloud"
    }
}
```

注册的函数在`ecs::Hierarchy`中通过模板实现, 各个daemon提供类型即可, 类型名会通过宏`MTT_SERDE(T)`获取.

```cpp
template<typename T>
auto static serde(std::string const& type) noexcept -> void {
    auto sanitized_type = type;
    std::ranges::transform(
        sanitized_type,
        sanitized_type.begin(),
        ::tolower
    );

    auto fr = [](ecs::Entity e, glz::raw_json const& s) -> void {
        auto d = T{};
        if (auto er = glz::read_json<T>(d, s.str); er) {
            std::println("desrialize {} with glaze error: {}", s.str, glz::format_error(er));
            std::abort();
        } else {
            ecs::Hierarchy::instance->attach(e, std::move(d));
        }
    };
    auto fw = [sanitized_type]() -> std::vector<serde::json> {
        auto v = std::vector<serde::json>{};
        auto& r = ecs::Hierarchy::instance->registry;
        for (auto e: r.view<T>()) {
            auto s = glz::write_json(r.get<T>(e));
            if (!s) {
                std::println(
                    "failed to serialize component {} on {}",
                    sanitized_type, ecs::Hierarchy::instance->path(e)
                );
                std::abort();
            }
            v.emplace_back(e, sanitized_type, s.value());
        }
        return v;
    };
    ecs::Hierarchy::instance->enable(sanitized_type, fr, fw);
}
```

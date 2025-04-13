---
title: "Metatron Dev. II: 矩阵运算"
date: 2025-04-12
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "metatron"]
---

metatron的数学库是手动实现的, 通过模板定义任意维度.

## 矩阵构造

高维矩阵通过成员的递归定义来实现, 即用一个数组存储每一行, 每一行的类型仍然为矩阵.

```c++
// forward declaration to support the declaration of 0d matrix
template<typename T, usize... dims>
struct Matrix;

template<typename T, usize first_dim, usize... rest_dims>
requires (first_dim > 0 && (... && (rest_dims > 0)))
struct Matrix<T, first_dim, rest_dims...> {
    using Element = std::conditional_t<sizeof...(rest_dims) == 0, T, Matrix<T, rest_dims...>>;
    auto static constexpr dimensions = std::array<usize, 1 + sizeof...(rest_dims)>{first_dim, rest_dims...
    
    // ...
private:
		std::array<Element, first_dim> data{};

		template<typename U, usize... dims>
		friend struct Matrix;
};
```

此时构造函数也可以递归实现, 传入行类型的初始化列表即可. 如果列表只有一个元素会用来填充所有行.

```c++
constexpr Matrix(std::initializer_list<Element const> initializer_list)
{
    if (initializer_list.size() > 1) {
        std::copy_n(initializer_list.begin(), std::min(first_dim, initializer_list.size()), data.begin());
    } else {
        for (auto& line: data) {
            line = initializer_list.size() == 1 ? *initializer_list.begin() : Element{};
        }
    }
}

constexpr Matrix(std::span<Element const> initializer_list)
{
    if (initializer_list.size() > 1) {
        std::copy_n(initializer_list.begin(), std::min(first_dim, initializer_list.size()), data.begin());
    } else {
        for (auto& line: data) {
            line = *initializer_list.begin();
        }
    }
}
```

如果构造函数传入标量, 一维矩阵(向量)会依次填充这些向量, 二维矩阵会填充对角线, 高维矩阵则递归构造成员. 同样的, 若参数长度为1, 会填充整个向量或矩阵对角线.

```c++
template<typename U>
requires std::is_convertible_v<U, T>
explicit constexpr Matrix(U&& scalar) {
    if constexpr (dimensions.size() == 1) {
        data.fill(scalar);
    } else if constexpr (dimensions.size() == 2) {
        auto constexpr diagonal_n = std::min(dimensions[0], dimensions[1]);
        for (auto i = 0; i < diagonal_n; i++) {
            data[i][i] = std::forward<U>(scalar);
        }
    } else {
        for (auto& line: data) {
            line = Element{std::forward<U>(scalar)};
        }
    }  
};

template<typename... Args>
requires (true
    && (std::is_convertible_v<Args, T> && ...)
    && dimensions.size() > 1
    && sizeof...(Args) <= std::min(*(dimensions.end() - 2), *(dimensions.end() - 1))
)
explicit constexpr Matrix(Args&&... args) {
    if constexpr (dimensions.size() > 2) {
        for (auto& line: data) {
            line = {args...};
        }
    } else {
        [this, args...]<usize... idxs>(std::index_sequence<idxs...>) {
            ((data[idxs][idxs] = args), ...);
        }(std::make_index_sequence<sizeof...(Args)>{});
    }
}
```

赋值构造函数支持传入比当前矩阵更小的矩阵来填充对应区域, 也可以裁剪更大的矩阵. 在此基础上, 矩阵支持在原有矩阵的基础上继续填充, 例如在向量后再添加两个标量来构造新向量, 同时也支持将除最高维度外各个维度长度相等的两个矩阵拼接.

```c++
template<typename U, typename... Args, usize rhs_first_dim>
requires (true
    && std::is_convertible_v<U, T>
    && (std::is_convertible_v<Args, Element> && ...)
)
constexpr Matrix(Matrix<U, rhs_first_dim, rest_dims...> const& rhs, Args&&... rest) {
    *this = rhs;
    if constexpr (first_dim > rhs_first_dim) {
        [this, rest...]<usize... idxs>(std::index_sequence<idxs...>) {
                ((data[rhs_first_dim + idxs] = rest), ...);
        }(std::make_index_sequence<std::min(sizeof...(rest), first_dim - rhs_first_dim)>{});
    }

}

template<usize rhs_first_dim0, usize rhs_first_dim1>
constexpr Matrix(
    Matrix<T, rhs_first_dim0, rest_dims...> const& rhs0,
    Matrix<T, rhs_first_dim1, rest_dims...> const& rhs1
) {
    *this = rhs0;
    if constexpr (first_dim > rhs_first_dim0) {
        std::copy_n(rhs1.data.begin(), std::min(first_dim, rhs_first_dim1) - rhs_first_dim0, data.begin() + rhs_first_dim0);
    }
}

template<typename U, usize rhs_first_dim, usize... rhs_rest_dims>
requires true
    && std::is_convertible_v<U, T>
    && (sizeof...(rest_dims) == sizeof...(rhs_rest_dims))
auto constexpr operator=(Matrix<U, rhs_first_dim, rhs_rest_dims...> const& rhs) -> Matrix& {
    std::copy_n(rhs.data.begin(), std::min(first_dim, rhs_first_dim), data.begin());
    return *this;
}
```

## 矩阵乘法

加减乘除比较之类的基础运算这里省略("乘"指逐元素相乘), 它们通过重载相应的运算符实现. c++20引入了`operator<=>`来定义比较, metatron认为矩阵的每个元素都需要满足比较关系, 因此将该运算符重载设为`default`即可, `std::array`已经实现了该比较.

矩阵运算要求两者维度之差不超过1, 且维度较长的向量维度超过1. 例如二维矩阵和向量相乘是可行的, 三维矩阵和向量相乘是无效的, 两个向量相乘则不应该调用矩阵乘法. 这里通过模板检查向量长度, 其中`higher_n`是高维度的长度, 即超过2的维度.

```c++
template<
    usize... rhs_dims,
    usize l_n = dimensions.size(),
    usize r_n = sizeof...(rhs_dims),
    usize shorter_n = std::min(l_n, r_n),
    usize longer_n = std::max(l_n, r_n),
    usize higher_n = std::max(usize(0), longer_n - 2),
    std::array<usize, l_n> lds = dimensions,
    std::array<usize, r_n> rds = {rhs_dims...}
>
```

利用`requires`可以进一步检查类型是否匹配. 第一个lambda检查高维度是否相等, 第二个lambda检查左矩阵的列与右矩阵的行是否相等, 向量需要特殊处理, 因为维度只有1.

```c++
requires (true
    && longer_n > 1
    && (false
        || i32(l_n) - i32(r_n) < 2
        || i32(r_n) - i32(l_n) < 2
    ) // clangd could not use std::abs
    && []() -> bool {
        return std::equal(
            lds.begin(), lds.begin() + higher_n,
            rds.begin(), rds.begin() + higher_n
        );
    }()
    && []() -> bool {
        return lds[higher_n + (l_n > 1 ? 1 : 0)] == rds[higher_n];
    }()
)
```

高维矩阵乘法最麻烦的地方在于返回类型, 因为返回值的维度是由左右矩阵共同决定的. 这里通过让编译器自动推导返回值来实现, 因此无需显式定义返回值, 最终的返回值与`Product_Matrix`相等即可. 维度不等的矩阵乘法最终得到的是较短维度的矩阵, 因此可以通过`std::index_sequence`以及参数包展开填入每个维度的长度.

```c++

using Product_Matrix = decltype([]<usize... dims>(std::index_sequence<dims...>) {
    return Matrix<T, (
        dims < higher_n ? lds[dims] : 
        dims == higher_n ? (l_n < r_n ? rds[higher_n + 1] : lds[higher_n]) : 
        rds[higher_n + 1]
    )...>{};
}(std::make_index_sequence<shorter_n>{}));
```

矩阵乘法的实际运算这里省略. 为了与逐元素乘法区分, 这里使用管道运算符`|`定义矩阵乘法.

```c++
auto constexpr operator|(
    Matrix<T, rhs_dims...> const& rhs
) const {
    // ...
}
```

由于向量使用频率更大, metatron提供了别名以及`dot`, `cross`等各类辅助函数.

```c++
template<typename T, usize size>
using Vector = Matrix<T, size>;
```

## 矩阵变换

变换类中会存储变换矩阵及其逆矩阵, 矩阵通过`config`中的参数生成.

```c++
struct Transform final {
    struct Config {
        math::Vector<f32, 3> translation{};
        math::Vector<f32, 3> scaling{1.f};
        math::Quaternion<f32> rotation{0.f, 0.f, 0.f, 1.f};

        auto operator<=>(Config const& rhs) const = default;
    } config;

    mutable math::Matrix<f32, 4, 4> transform;
    mutable math::Matrix<f32, 4, 4> inv_transform;

    // ...
};
```

在执行变换之前会调用`update`来更新矩阵, 比较`config`而不是`transform`是因为只需要比较10个元素.

```c++
auto Transform::update(bool force) const -> void {
    if (force || config != old_config) {
        auto translation = math::Matrix<f32, 4, 4>{
            {1.f, 0.f, 0.f, config.translation[0]},
            {0.f, 1.f, 0.f, config.translation[1]},
            {0.f, 0.f, 1.f, config.translation[2]},
            {0.f, 0.f, 0.f, 1.f}
        };
        auto scaling = math::Matrix<f32, 4, 4>{
            config.scaling[0], config.scaling[1], config.scaling[2], 1.f
        };
        auto rotation = math::Matrix<f32, 4, 4>{config.rotation};

        old_config = config;
        transform = translation | rotation | scaling;
        inv_transform = math::inverse(transform);
    }
}
```

变换通过`concept`定义可以变换的类型. `operator|`用于执行变换, `operator^`则执行逆变换.

```c++
template<typename T>
concept Transformable = false
|| std::is_same_v<std::remove_cvref_t<T>, math::Vector<f32, 4>>
|| std::is_same_v<std::remove_cvref_t<T>, math::Ray>
|| std::is_same_v<std::remove_cvref_t<T>, math::Ray_Differential>;

struct Transform final {
    // ...
    
    template<Transformable T>
    auto operator|(T&& rhs) const -> std::remove_cvref_t<T> {
        // ...
    }

    template<Transformable T>
    auto operator^(T&& rhs) const -> std::remove_cvref_t<T> {
        // ...
    }

    // ...
};
```

## 矩阵效率

由于用行主序存储, (...(M2 | (M1 | (M0 | x))))这样的矩阵向量运算是较为容易自动向量化的, 由于改变运算符顺序不太可能, 通过函数来实现又比较丑陋, 目前代码中都是手动添加括号来进行连续矩阵运算.

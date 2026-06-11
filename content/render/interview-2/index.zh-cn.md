---
title: "Interview II: C++模板元与并发编程"
date: 2026-06-10
draft: false
description: "interview"
tags: ["cpp", "template", "concurrent"]
---

## Dependent Name

模板编译分为定义阶段和实例化阶段, 定义阶段解析语法, 实例化阶段约束类型. C++默认将`::`, `->`, `.`后的名字解析为变量, 若为依赖名字即依赖尚未实例化的模板, 定义阶段可能无法正确解析, 例如:

```cpp
struct A {
    template<typename T>
    using B = int;
};

template<typename T>
auto f() {
    T::B<T> x; // 语法错误, T::B默认解释为非类型
    typename T::B<T> y; // 语法错误, typename T::B默认解释为非模板
    T::template B<T> z; // 语法错误, T::template B默认解释为非类型
    typename T::template B<T> w;
}
```

## Concept

要求子句在重载决议时检查布尔值为真, 只接收[初等表达式](https://en.cppreference.com/cpp/language/expressions#Primary_expressions)(比如: 字面量, 标识符, 要求表达式, 折叠表达式, 括号表达式)和由`&&`或`||`连接的初等表达式. 例如:

```cpp
template<typename T> requires std::is_same_v<T, int> auto f() {} // is_same_v是布尔变量标识符
template<typename T> requires std::same_as<T, int> auto f() {} // same_as是概念标识符
template<typename T> requires sizeof(T) > 4 auto f() {} // 错误, 非初等表达式
template<typename T> requires (sizeof(T) > 4) auto f() {} // 括号表达式为初等表达式
template<typename T> requires (sizeof(T) > 4) && (sizeof(T) < 8) auto f() {} // &&连接的初等表达式
```

要求表达式在模板实参代换时检查要求是否满足, 代换失败时为假, 只接收[以下检查](https://en.cppreference.com/cpp/language/requires): 表达式合法, 类型存在, 嵌套要求布尔值为真以及复合要求. 可引入无存储与生存期的记号形参, 例如:

```cpp
requires { sizeof(int) > 8; } // 表达式合法, 返回真
requires { typename std::vector<int>::value_type; } // 类型存在, 返回真
requires { requires sizeof(int) > 8; } // 嵌套要求为假, 返回假
```

复合要求按固定顺序检查: 表达式合法, 若有`noexcept`不潜在抛出异常, `decltype((x))`满足`->`后的概念. 例如:

```cpp
requires(int x) { { x + x } noexcept -> std::same_as<int>; } // 表达式合法, 不抛异常且满足概念, 返回真
requires(int x) { { x + x } -> int; } // 错误, 裸类型不是概念
requires(int x) { { x } -> std::same_as<int>; } // decltype((x))为int&, 返回假
requires(int x) { { x } -> std::same_as<int&>; } // 形参为左值, 返回真
requires(int x) { { x + 0 } -> std::convertible_to<long>; } // convertible_to<int, long>, 返回真
```

概念是具名的布尔常量表达式, 不可特化与递归. 若有多个候选, 有偏序关系时选择更强的约束, 否则有歧义. 例如:

```cpp
template<typename T> concept integral = std::is_integral_v<T>; // 布尔常量
template<typename T> concept addable = requires(T x) { x + x; }; // 要求表达式
template<integral T> auto f(T) {} // 约束模板形参
auto g(std::convertible_to<long> auto) {} // 约束auto
template<typename T> requires std::integral<T> auto h(T) {}
template<typename T> requires std::integral<T> && std::signed_integral<T> auto h(T) {} // 约束更强, h(0)选中
```

## Pack

C++参数包用于定义不定长的参数, 除函数模板外定义模板参数时参数包必须位于尾部. 例如:

```cpp
template<typename... Ts> struct T: Ts... {}; // 类型包
template<int n, int... ns> using M = Matrix<int, n, ns...>; // 非类型包
template<auto... xs> auto static x = std::make_tuple(xs...); // 可推导非类型包
template<Concept... Cs> struct T {}; // 概念包
template<template<typename...> typename... Ts> struct T { using v = std::variant<Ts<int, float>...>; }; // 模板模板形参包
```

对于函数模板参数包, 若不位于尾部, 只要后续模板参数不产生歧义即合法. 例如:

```cpp
template<typename F, typename... Ts, std::size_t N>
auto foreach(F f, Vector<Ts, N>... vectors); // 所有模板参数都可自动推导, 不产生歧义
template<typename... Ts, typename R>
auto reduce(R init, Ts... xs); // 函数中参数包位于尾部, 无歧义, 模板参数可不位于尾部
template<typename... Ts, typename R>
auto make(Ts... xs) -> R; // R不参与推导, 需写make<T1, T2, R>, R是否位于参数包有歧义
```

由于`[]`和`()`的优先级高于`*`, `&`等前缀, 函数/数组的指针/引用需要额外添加`()`, 对这些类型添加参数包时, `...`需要位于括号内, 例如:

```cpp
template<int... N> auto f(int (&... arrs)[N]) -> void;
template<typename... Ts> auto f(Ts (*... ptrs)(int)) -> void;
template<typename... Ts> auto f(auto (Ts::*... ptrs)() -> void) -> void;
```

C++20支持lambda捕获参数包, C++26支持结构化绑定参数包和参数包索引. 两种新参数包需要定义新名字, `...`前置以解决与参数包展开的冲突, 例如:

```cpp
template<typename... Ts>
auto defer(Ts... args) { return [...xs = args] { return g(xs...); }; }
auto [first, ...rest] = std::tuple{1, 2.0, '3'};
template<typename... Ts>
auto front(Ts... xs) -> Ts...[0] { return xs...[0]; }
```

展开参数包时以左侧最大语法树节点为单位展开, 若有嵌套则先展开内层, 例如:

```cpp
f(&xs...); // f(&x0, &x1, &x2)
f(n, ++xs...); // f(n, ++x0, ++x1, ++x2);
f((Args const*)&xs...); // f((T0 const*)&x0, (T1 const*)&x1, (T2 const*)&x2)
f(g(xs...) + xs...); // f(g(x0, x1, x2) + x0, g(x0, x1, x2) + x1, g(x0, x1, x2) + x2)
f<Ts&...>(T{&xs...}) // f<T0&, T1&, T2&>(T{&x0, &x1, &x2})
template<typename Bs> struct A: public Bs... {}; // public B0, public B1, public B2
```

折叠表达式来自函数式语言, 例如Haskell的`foldl`和`foldr`, 使得参数包之间可以直接通过运算符连接, 可以区分左右折叠并添加初值. 为不与参数包展开冲突, 必须添加括号. 例如:

```cpp
template<int... ns>
auto f() -> int {
    return 0
    + (... - xs) // 一元左折叠: ((1 - 2) - 3) = -4
    + (xs - ...) // 一元右折叠: (1 - (2 - 3)) = 2
    + (10 - ... - xs) // 二元左折叠: (((10 - 1) - 2) - 3) = 4
    + (xs - ... - 10) // 二元右折叠: (1 - (2 - (3 - 10))) = -8
    ;
}
```

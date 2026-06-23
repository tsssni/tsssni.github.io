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

## Deduction

若非类模板的模板参数需要推导, 与`T&&`和`auto&&`严格一致, 触发转发引用, 例如:

```cpp
template<typename T> auto f(T&&); // T需要被推导
template<typename T> auto f(T const&&); // 不满足T&&
template<typename T> auto f(std::type_identity_t<T>&&); // 不满足T&&

auto f(auto&&); // auto需要被推导
auto f(auto volatile&&); // 不满足auto&&

template<typename T> struct S {
    S(T&&); // auto s = S{x}; 类模板推导不触发转发, x为左值时报错
    auto f(T&&); // auto s = S<int>{}; 已实例化T, 调用s.f(x)不需要推导
    template<typename U> auto f(U&&); // U需要被推导
};
```

若参数为左值, `T`推导为`T&`, 从而`T& && = T&`得到左值; 右值时推导为`T`, 类型为`T&&`. 由于具名变量都是左值, 即使推导出右值引用, 使用参数时仍然触发左值重载, 因此需要`std::forward<T>`将`T`的具体引用类型传播, 实现如下:

```cpp
template<typename T>
auto constexpr forward(std::remove_reference_t<T>& t) noexcept -> T&& {
    return static_cast<T&&>(t); // T& && = T&
}

template<typename T>
auto constexpr forward(std::remove_reference_t<T>&& t) noexcept -> T&& {
    static_assert(!std::is_lvalue_reference_v<T>);  // avoid forward<int&>(std::move(x))
    return static_cast<T&&>(t); //  T&& && = T&&
}

template<typename... Args>
auto f(Args&&... args) { g(std::forward<Args>(args)...); } // g接收到的引用类型和f一致
```

使用`auto`推导会删除cv限定符和引用, 需要用`auto&&`, `auto const&`等方式添加限定符, 若使用`decltype(auto)`则保留表达式类型.

```cpp
auto x = 1; // int
auto& rx = x; // int&
auto const& crx = x; // int const&
auto y = crx; // int
decltype(auto) z = crx; // int const&

template<typename T> auto f(T&& x) { return x; } // return std::decay_t<T>
template<typename T> decltype(auto) f(T&& x) { return x; } // return T&&
```

## CRTP

当模板类在构造时不需要模板类型参数的完整定义, 将派生类型传给基类是不会导致循环依赖的, 从而实现奇异递归模板模式. C++23支持`this`推导, 首参为`this Self&&`时`Self`推导为调用它的对象的类型. lambda是实现了`operator()`的匿名对象, 但`this`被用于捕获外围对象, 无法再使用lambda自身的`this`, `this`推导使得lambda可以递归.

```cpp
struct B {
    auto f(this auto&& self) { self.g(); }
};

struct D: B {
    auto g() { auto x = 0; }
    auto h() { f(); } // f执行D::g
};

auto fib = [](this auto self, int n) -> int {
    return n < 2 ? n : self(n - 1) + self(n - 2);
};
```

## Atomic

`std::atomic`使得对同一原子变量的操作在多线程下串行化, `load`/`store`保证不存在并发的读取和写入. `wait`传入期望值, 原子变量等于该值时阻塞, `notify_one`/`notify_all`唤醒一个或多个等待线程. `compare_exchange`比较期望值与原子变量实际值, 相等时执行修改, 否则写回实际值. 例如上次读取原子变量的结果是期望值, 我们期望它未被其它线程修改. `compare_exchange`保证修改一定进入缓存以对后续`compare_exchange`可见.

ARM等架构为LL/SC, 即`load-linked`/`store-conditional`一对指令: `load-linked`读取值并对该地址登记独占监视, `store-conditional`仅当监视未被上下文切换, 中断, 其它核心触碰同一缓存行等操作破坏才写入. 这导致`compare_exchange_weak`伪失败即值相等时也由于`store-conditional`而返回假. LL/SC架构的`compare_exchange_strong`需在内部循环重试以消除伪失败, 因此开销更高.

## Memory Order

编译器重排和乱序执行导致并发内存读写顺序不被保证, 存储缓冲和失效队列导致可见性延迟, 可通过内存序`std::memory_order`解决. `relaxed`只保证原子操作本身语义正确, 不约束周围内存读写.

`release`保证原子操作前的内存读写不重排到之后, 保证之前的内存写入先于`release`本身进入缓存和发出失效消息. `acquire`保证原子操作之后的内存读写不重排到之前, 并处理已入队的失效消息, 当`acquire`读到`release`的写入, `release`前的写入已被失效队列处理, 因此已经可见.

`acq_rel`兼具`acquire`/`release`的特性, 而`seq_cst`在此基础上要求原子写入执行后立即排空存储缓冲并发送失效消息, 后续`acquire`触发的失效队列排空令写入可见, 因此`acquire`读取执行顺序在`seq_cst`写入之后时能立即获取写入结果.

## Promise

`std::promise<T>`是一次性值/异常的写端, 配对的读端`std::future<T>`由`get_future`获得. 生产者调用`set_value`/`set_exception`写入, 消费者调用`future.get()`, 未就绪时阻塞, 就绪后返回值或重抛异常.

`std::packaged_task`包装可调用对象, 自动用返回值填充内部`promise`. `std::async`启动任务并返回`std::future`. `std::launch::async`立即执行, 对应的`future`析构时会阻塞. `std::launch::deferred`延迟到首次`future`读取, 相当于在调用线程同步执行. `std::shared_future`将返回值以`T const&`的形式暴露, 可被多个消费者重复读取.

## Value Category

具有身份即有稳定存储空间的表达式是泛左值, 否则为纯右值. 纯右值分为两种情况, 示例:

```cpp
auto x = 1 + 2 * 3;
x = 1 + 2 * 4;
struct A { int x; auto f(float x) { return x + 1.f; } };
auto y = A{1 + 2 * 5};
auto z = y.f(1.f);
auto w = z;
y.f(0.f);
```

1. 计算内建运算符的操作数
    - `1 + 2 * 3`中的`1`, `2`, `3`, `2 * 3`都是纯右值表达式
    - `1 + 2 * 3`是初始化语法`=`的操作数, 不符合定义
    - `1 + 2 * 4`是内建赋值运算符`=`的操作数, 符合定义
2. 表达式初始化了一个对象
    - `1 + 2 * 3`用于初始化`x`, 符合定义
    - `1 + 2 * 5`用于初始化`A::x`, 符合定义
    - `1.f`用于初始化`A::f`的形参`x`, 符合定义
    - `w = z`的`z`具有身份, 不符合定义
    - `y.f(0.f)`为丢弃表达式, 触发临时实体化对象的初始化, 符合定义

将亡值为标记资源可被复用的泛左值, 不具有名称, 如何复用取决于移动构造函数, 示例:

```cpp
auto pi = 3.14f;
struct A { int x; float&& y; };
A a{0, pi};
A&& b = static_cast<A&&>(a);
A&& c = std::move(a);
A{1, pi}.x; A{}.y;
```

1. 强制转换为右值引用
    - `static_cast<A&&>(a)`
2. 函数返回右值引用
    - `std::move(a)`执行强制转换, 返回右值引用, 符合定义
    - `A&& b`和`A&& c`都是具名引用, 不符合定义
3. 临时实体化并向下传播
    - `A{}.x`由于需要访问`x`, `A{}`被临时实体化, 符合定义
    - `A{}.x`为将亡值的成员, 符合定义
    - `A{}.y`访问引用成员, 访问引用的结果一定为左值, 不符合定义

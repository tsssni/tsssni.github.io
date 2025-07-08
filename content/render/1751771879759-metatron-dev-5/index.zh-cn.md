---
title: "Metatron Dev. V: proxy"
date: 2025-07-06
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "metatron"]
---

尝试在项目里用上proxy的多态, 目前版本为master上未发布的4.0.0, 用官方的example研究一下源码与[compiler explorer](https://godbolt.org/z/PjP9obzoP)里的预处理展开结果, 内容会参考[C++ proxy库的多态是怎么实现的](https://zhuanlan.zhihu.com/p/22307747744).

```c++
#include "proxy.h"
#include <iostream>
#include <sstream>

PRO_DEF_MEM_DISPATCH(MemDraw, Draw);
PRO_DEF_MEM_DISPATCH(MemArea, Area);

struct Drawable : pro::facade_builder
    ::add_convention<MemDraw, void(std::ostream& output)>
    ::add_convention<MemArea, double() noexcept>
    ::support_copy<pro::constraint_level::nontrivial>
    ::build {};

class Rectangle {
 public:
  Rectangle(double width, double height) : width_(width), height_(height) {}
  Rectangle(const Rectangle&) = default;

  void Draw(std::ostream& out) const {
    out << "{Rectangle: width = " << width_ << ", height = " << height_ << "}";
  }
  double Area() const noexcept { return width_ * height_; }

 private:
  double width_;
  double height_;
};

std::string PrintDrawableToString(pro::proxy<Drawable> p) {
  std::stringstream result;
  result << "entity = ";
  p->Draw(result);
  result << ", area = " << p->Area();
  return std::move(result).str();
}

int main() {
  pro::proxy<Drawable> p = pro::make_proxy<Drawable, Rectangle>(3, 5);
  std::string str = PrintDrawableToString(p);
  std::cout << str << "\n";  // Prints "entity = {Rectangle: width = 3, height = 5}, area = 15"
}
```

## abbr.

- F：facade （鸭子类型约束）
- D：dispatch （成员函数调用器）
- Os： overloads （各类重载的函数签名）
- C/Cs： convention （成员函数meta)
- R/Rs： return/reflection
- A/As：accessor
- Q： qualifier （enum标记）
- NE：noexcept (bool标记)
- P: proxied (proxy接管的对象)

## macro

展开`PRO_DEF_MEM_DISPATCH(MemDraw, Draw)`的结果如下.

```c++
struct MemDraw {
    template <class __T, class... __Args>
    decltype(auto) operator()(__T &&__self, __Args &&...__args) const
        noexcept(noexcept(::std::forward<__T>(__self).Draw(
            ::std::forward<__Args>(__args)...)))
        requires(requires {
            ::std::forward<__T>(__self).Draw(::std::forward<__Args>(__args)...);
        })
    {
        return ::std::forward<__T>(__self).Draw(
            ::std::forward<__Args>(__args)...);
    }
    template <class __F, bool __IsDirect, class __D, class... __Os>
    struct accessor {
        accessor() = delete;
    };
    template <class __F, bool __IsDirect, class __D, class... __Os>
        requires(
            sizeof...(__Os) > 1u &&
            (::std::is_constructible_v<accessor<__F, __IsDirect, __D, __Os>> &&
             ...))
    struct accessor<__F, __IsDirect, __D, __Os...>
        : accessor<__F, __IsDirect, __D, __Os>... {
        using accessor<__F, __IsDirect, __D, __Os>::Draw...;
    };
    template <class __F, bool __IsDirect, class __D, class __R, class... __Args>
    struct accessor<__F, __IsDirect, __D, __R(__Args...)> {
        accessor() noexcept { ::std::ignore = &accessor::Draw; }
        __R Draw(__Args... __args) {
            return ::pro::proxy_invoke<__IsDirect, __D, __R(__Args...)>(
                ::pro::access_proxy<__F>(*this),
                ::std::forward<__Args>(__args)...);
        }
    };
    template <class __F, bool __IsDirect, class __D, class __R, class... __Args>
    struct accessor<__F, __IsDirect, __D, __R(__Args...) noexcept> {
        accessor() noexcept { ::std::ignore = &accessor::Draw; }
        __R Draw(__Args... __args) noexcept {
            return ::pro::proxy_invoke<__IsDirect, __D,
                                       __R(__Args...) noexcept>(
                ::pro::access_proxy<__F>(*this),
                ::std::forward<__Args>(__args)...);
        }
    };
    // ...
};
```

先解读一下这里的部分c++语法.

- **decltype(auto)**: 用于保留返回值的ref type与cv qualifier.
- **noexcept(noexcept(...))**:
    - 内部为noexcept operator, 用于判断表达式是否为noexcept的
    - 外部为noexcept specifier, 用于判断括号内是否为true
- **requires(requires(...))**:
    - 内部为requires expression, 检查表达式是否有效, 可以通过`requires(args...){}`传入参数后再执行判断
    - 外部为requires clauses, 用于限制模板参数, 判断括号内是否为true.

此时`operator()`的限制条件就很清晰了: 只在调用的函数为`noexcept`时开启`noexcept`, 限制`__T`必须含有`Draw(__args...)`函数.

proxy为ref, const与noexcept的每种组合情况生成一种`accessor`, 用于调用实际对象的`Draw`.

## facade

`facade`意为虚伪的表面, 在proxy里用于声明鸭子类型, 通过`facade_builder`实现.

```c++
template <class Cs, class Rs, proxiable_ptr_constraints C>
struct basic_facade_builder {
  template <class D, details::extended_overload... Os>
    requires(sizeof...(Os) > 0u)
  using add_indirect_convention = basic_facade_builder<
      details::add_conv_t<Cs, details::conv_impl<false, D, Os...>>, Rs, C>;
  template <class D, details::extended_overload... Os>
    requires(sizeof...(Os) > 0u)
  using add_direct_convention = basic_facade_builder<
      details::add_conv_t<Cs, details::conv_impl<true, D, Os...>>, Rs, C>;
  template <class D, details::extended_overload... Os>
    requires(sizeof...(Os) > 0u)
  using add_convention = add_indirect_convention<D, Os...>;
  // ...
  using build = details::facade_impl<Cs, Rs, details::normalize(C)>;
  basic_facade_builder() = delete;
};
```

`facade_builder`会不断递归调用自己来收集函数签名, 最终调用`build`结束收集, 存储convention与reflection.

```c++
template <class Cs, class Rs, proxiable_ptr_constraints C>
struct facade_impl {
  using convention_types = Cs;
  using reflection_types = Rs;
  static constexpr proxiable_ptr_constraints constraints = C;
};
```

## convention

`conv_impl`负责构建convention, `D`为macro生成的dispatcher, `Os`为该函数各类重载的函数签名.

```c++
template <bool IsDirect, class D, class... Os>
struct conv_impl {
  static constexpr bool is_direct = IsDirect;
  using dispatch_type = D;
  using overload_types = std::tuple<Os...>;
  template <class F>
  using accessor =
      instantiated_accessor_t<D, F, IsDirect, substituted_overload_t<Os, F>...>;
};
```

`accessor`为从macro生成的dispatcher中根据限定符获取的accessor, `instantiated_accessor_t`会调用macro生成的dispatcher中的第二个`accessor`类, 它会继承所有重载. 注意到上文的dispatcher中`using`了多个同名方法, 在c++中引入不同重载到命名空间中是合法的, 不会造成歧义.

```c++
template <class SFINAE, class T, class F, bool IsDirect, class... Args>
struct accessor_instantiation_traits : std::type_identity<void> {};
template <class T, class F, bool IsDirect, class... Args>
struct accessor_instantiation_traits<
    std::void_t<typename T::template accessor<F, IsDirect, T, Args...>>, T, F,
    IsDirect, Args...>
    : std::type_identity<
          typename T::template accessor<F, IsDirect, T, Args...>> {};
template <class T, class F, bool IsDirect, class... Args>
using instantiated_accessor_t =
    typename accessor_instantiation_traits<void, T, F, IsDirect, Args...>::type;
```

## proxy

`proxy`负责根据facade构建派生类.

```c++
template <facade F>
class proxy : public details::facade_traits<F>::direct_accessor,
              public details::inplace_ptr<proxy_indirect_accessor<F>> {
  // ...
}

```

proxy中的`ptr_`为一个分配了足够空间的数组, 构造proxy时会在数组上构造实际对象, 例如`pro::make_proxy<Drawable, Rectangle>(3, 5)`初始化过程如下, 使用`std::construct_at`构造.

```c++
template <class P, class... Args>
  constexpr P& initialize(Args&&... args) {
    PRO4D_DEBUG(std::ignore = &_symbol_guard;)
    P& result = *std::construct_at(reinterpret_cast<P*>(ptr_),
                                   std::forward<Args>(args)...);
    if constexpr (proxiable<P, F>) {
      meta_ = details::meta_ptr<typename _Traits::meta>{std::in_place_type<P>};
    } else {
      _Traits::template diagnose_proxiable<P>();
    }
    return result;
  }
```

`facade_traits`展开所有convention与reflection, `facade_conv_traits_impl`收集所有`conv_impl`中的accessor.

```c++
struct facade_traits<F>
    : instantiated_t<facade_conv_traits_impl, typename F::convention_types, F>,
      instantiated_t<facade_refl_traits_impl, typename F::reflection_types, F> {
  // ...

  using indirect_accessor =
      merged_composite_accessor<typename facade_traits::conv_indirect_accessor,
                                typename facade_traits::refl_indirect_accessor>;

  // ...
}
```

`facade_conv_traits_impl`最终会生成`composite_accessor_impl`, 它通过继承合并所有convention中的accessor, 且这些accessor都已传入`conv_impl`中accessor的`F`参数, 即当前facade.

```c++
template <class... As>
class PRO4D_ENFORCE_EBO composite_accessor_impl : public As... {
  template <facade>
  friend class pro::v4::proxy;
  template <facade>
  friend struct pro::v4::proxy_indirect_accessor;

  composite_accessor_impl() noexcept = default;
  composite_accessor_impl(const composite_accessor_impl&) noexcept = default;
  composite_accessor_impl&
      operator=(const composite_accessor_impl&) noexcept = default;
};
```

`inplace_ptr`传入合并后的`accessor`类型后, 即可通过指针或引用调用`T`中所有`using`的函数.

```c++
template <class T>
class inplace_ptr {
public:
  template <class... Args>
  explicit inplace_ptr(std::in_place_t, Args&&... args)
      : value_(std::forward<Args>(args)...) {}
  inplace_ptr() = default;
  inplace_ptr(const inplace_ptr&) = default;
  inplace_ptr(inplace_ptr&&) = default;
  inplace_ptr& operator=(const inplace_ptr&) = default;
  inplace_ptr& operator=(inplace_ptr&&) = default;

  T* operator->() noexcept { return std::addressof(value_); }
  const T* operator->() const noexcept { return std::addressof(value_); }
  T& operator*() & noexcept { return value_; }
  const T& operator*() const& noexcept { return value_; }
  T&& operator*() && noexcept { return std::move(value_); }
  const T&& operator*() const&& noexcept { return std::move(value_); }

private:
  [[PROD_NO_UNIQUE_ADDRESS_ATTRIBUTE]]
  T value_;
};
```

此时已经可以调用底层对象的函数, 例如`Draw`, 通过上文可以看出`proxy_invoke`会执行调用过程, 它最终展开到`invoke_impl`中调用`meta`存储的dispatcher.

```c++
template <class F, bool IsDirect, class D, class O, class P, class... Args>
decltype(auto) invoke_impl(P&& p, Args&&... args) {
  auto dispatcher =
      proxy_helper<F>::get_meta(p)
          .template invocation_meta<F, IsDirect, D, O>::dispatcher;
  return dispatcher(std::forward<P>(p), std::forward<Args>(args)...);
}
```

对于convention, `meta`存储的dispatcher展开后为`conv_dispatcher`, 它将`self`内部的指针转为`P`类型, 在`invoke_dispatch`中调用macro生成的accessor. `conv_dispatch`会以函数指针的形式存储在`meta`中, 实现运行时多态.

```c++
template <class D, class R, class... Args>
R invoke_dispatch(Args&&... args) {
  if constexpr (std::is_void_v<R>) {
    D{}(std::forward<Args>(args)...);
  } else {
    return D{}(std::forward<Args>(args)...);
  }
}
template <bool IsDirect, class P>
decltype(auto) get_operand(P&& ptr) {
  if constexpr (IsDirect) {
    return std::forward<P>(ptr);
  } else {
    if constexpr (std::is_constructible_v<bool, P&>) {
      assert(ptr);
    }
    return *std::forward<P>(ptr);
  }
}
template <class F, bool IsDirect, class D, class P, qualifier_type Q, class R,
          class... Args>
R conv_dispatcher(add_qualifier_t<proxy<F>, Q> self, Args... args) noexcept(
    invocable_dispatch_ptr<IsDirect, D, P, Q, true, R, Args...>) {
  if constexpr (Q == qualifier_type::rv) {
    proxy_resetting_guard<F, P> guard{self};
    return invoke_dispatch<D, R>(
        get_operand<IsDirect>(
            proxy_helper<F>::template get_ptr<P, Q>(std::move(self))),
        std::forward<Args>(args)...);
  } else {
    return invoke_dispatch<D, R>(
        get_operand<IsDirect>(proxy_helper<F>::template get_ptr<P, Q>(
            std::forward<add_qualifier_t<proxy<F>, Q>>(self))),
        std::forward<Args>(args)...);
  }
}
```

## direct

`add_direct_convention`定义接口类型中该类型本身的函数, 可以直接调用, 而非间接调用底层实际对象的函数.

```c++
#include <iostream>
#include <memory>
#include <string>

#include <proxy/proxy.h>

PRO_DEF_FREE_DISPATCH(FreeToString, std::to_string, ToString);

struct BasicStringable : pro::facade_builder                                 //
                         ::add_convention<FreeToString, std::string() const> //
                         ::build {};

struct Stringable : pro::facade_builder                               //
                    ::add_facade<BasicStringable>                     //
                    ::support_copy<pro::constraint_level::nontrivial> //
                    ::add_direct_convention<pro::conversion_dispatch,
                                            pro::proxy<BasicStringable>() &&> //
                    ::build {};

int main() {
  pro::proxy<Stringable> p1 = std::make_shared<int>(123);
  pro::proxy<Stringable> p2 = p1;
  pro::proxy<BasicStringable> p3 =
      static_cast<pro::proxy<BasicStringable>>(std::move(p2));
  pro::proxy<BasicStringable> p4 = std::move(p3);
  // pro::proxy<BasicStringable> p5 = p4; // Won't compile
  std::cout << ToString(*p4) << "\n";                    // Prints "123"
  std::cout << std::boolalpha << p3.has_value() << "\n"; // Prints "false"
}
```

## reflection

将类型传入用户自定义的reflector收集类型信息并支持运行时获取, 并非相对复杂的反射实现.

```c++
#include <array>
#include <iostream>

#include <proxy/proxy.h>

struct LayoutReflector {
public:
  template <class T>
  constexpr explicit LayoutReflector(std::in_place_type_t<T>)
      : Size(sizeof(T)), Align(alignof(T)) {}

  template <class F, bool IsDirect, class R>
  struct accessor {
    friend std::size_t
        SizeOf(const std::conditional_t<IsDirect, pro::proxy<F>,
                                        pro::proxy_indirect_accessor<F>>&
                   self) noexcept {
      const LayoutReflector& refl =
          pro::proxy_reflect<IsDirect, R>(pro::access_proxy<F>(self));
      return refl.Size;
    }

    friend std::size_t
        AlignOf(const std::conditional_t<IsDirect, pro::proxy<F>,
                                         pro::proxy_indirect_accessor<F>>&
                    self) noexcept {
      const LayoutReflector& refl =
          pro::proxy_reflect<IsDirect, R>(pro::access_proxy<F>(self));
      return refl.Align;
    }
  };

  std::size_t Size, Align;
};

struct LayoutAware : pro::facade_builder                        //
                     ::add_direct_reflection<LayoutReflector>   //
                     ::add_indirect_reflection<LayoutReflector> //
                     ::build {};

int main() {
  int a = 123;
  pro::proxy<LayoutAware> p = &a;
  std::cout << SizeOf(p) << "\n";   // Prints sizeof(raw pointer)
  std::cout << AlignOf(p) << "\n";  // Prints alignof(raw pointer)
  std::cout << SizeOf(*p) << "\n";  // Prints sizeof(int)
  std::cout << AlignOf(*p) << "\n"; // Prints alignof(int)

  p = pro::make_proxy<LayoutAware>(123); // SBO enabled
  std::cout << SizeOf(p) << "\n";        // Prints sizeof(int)
  std::cout << AlignOf(p) << "\n";       // Prints alignof(int)
  std::cout << SizeOf(*p) << "\n";       // Prints sizeof(int)
  std::cout << AlignOf(*p) << "\n";      // Prints alignof(int)

  p = pro::make_proxy<LayoutAware, std::array<char, 100>>(); // SBO disabled
  std::cout << SizeOf(p) << "\n";   // Prints sizeof(raw pointer)
  std::cout << AlignOf(p) << "\n";  // Prints alignof(raw pointer)
  std::cout << SizeOf(*p) << "\n";  // Prints "100"
  std::cout << AlignOf(*p) << "\n"; // Prints "1"
}
```

## conclusion

与c++虚函数相比proxy可总结出以下优势.

- 鸭子类型, 无需继承或宏
- 虚表位于多态对象, 保持内存布局
- 抽象类可调用自由函数重载
- 支持传值, 有小对象优化
- 可约束构造函数, 析构函数

设计理念上proxy和rust等现代语言一样, 抛弃了java那套oo, 性能提升大概也来自于此.

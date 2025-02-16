---
title: "Metatron Dev. I: 构建系统"
date: 2025-02-16
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "metatron"]
---

今天正式开始开发metatron-renderer, 名字由来第一版发布再说.

## 工具链

原本计划使用c++20 modules, 因为懒得分离定义和实现. linux上只有clang对模块有正式支持, [但当clang的exe为符号链接时模块无法找到系统头文件](https://clang.llvm.org/docs/StandardCPlusPlusModules.html#possible-issues-failed-to-find-system-headers), 而NixOS更是封装了一层bash. 官方推荐手动设置-I/path/to/system/headers, 但最后clang会引用到gcc的头文件, 导致找不到定义. 即使不用模块, 现在nixos-24.11的clang也有封装问题, 同样找不到系统头文件. 之后试过用c++23 `import std;`, 但cmake即使打开实验特性也会报`only support libc++`.

rust也是个选择, 但rust的`trait`和`impl`其实也一定程度分离了定义和实现. 加上我对c++还是有好感的, 也希望项目里能练习一些新特性, 最后还是fallback到更稳妥的gcc+headers

## 编辑器

使用自己配置的nixvim, 测试模块时发现clangd默认不支持c++20语法特性, 需要通过`.clangd`文件设置.

```yaml
CompileFlags:
  Add: [-std=c++20]
```

## 构建系统

为了兼容性使用CMake, 构建流程的设计目标如下:

- 模块可被独立链接
- 自动分析依赖关系
- 第三方依赖可配置

### 项目结构

整体结构分为以下处理单元集合:

- lib: 第三方依赖
- src: 项目内模块
- exe: 可执行程序

此外还有额外的文件夹:
- cmake: 自定义的cmake函数

### 分批处理

将lib/src/exe下面的子文件作为最小处理单元, `metatron_classify`负责收集处理单元. `path`是单元集合目录, 目录下的单元会使用相似的构建方式, 例如`exe`下的单元都会通过`add_executable`创建target. `mode`记录当前处理模式, 同样可设置为`"lib"|"src"|"exe"`, 主要用于单元构建时选择不同的策略. 为防止冲突模块名会添加`metatron-`的前缀.

```cmake
function(metatron_classify path mode)
  if (IS_DIRECTORY ${path})
    file(GLOB units RELATIVE ${path} ${path}/*)
    foreach(unit ${units})
      if(IS_DIRECTORY ${path}/${unit})
        metatron_evaluate(metatron-${unit} ${path}/${unit} ${mode})
      endif()
    endforeach()
  endif()
endfunction()
```

### 单元设置

每个单元下都可以通过`setup.cmake`做一些设置, 例如`exe/renderer/setup.cmake`, 大部分工作都在这里完成, `CMakeLists.txt`只做简单的配置与全局变量定义. `metatron-build`用于收集所有构建单元, 然后再分析依赖关系.

```cmake
cmake_minimum_required(VERSION 3.30.5)

project(metatron-renderer LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin/lib)

set(metatron-root ${CMAKE_CURRENT_LIST_DIR})
set(metatron-bin ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})
set(metatron-lib ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/lib)

define_property(TARGET PROPERTY metatron-units)
define_property(TARGET PROPERTY metatron-path)
define_property(TARGET PROPERTY metatron-mode)
define_property(TARGET PROPERTY metatron-access)

include(cmake/classify.cmake)
include(cmake/evaluate.cmake)
include(cmake/link.cmake)

add_library(metatron-build INTERFACE)
set_property(TARGET metatron-build PROPERTY metatron-units)

metatron_classify(${metatron-root}/lib "lib")
metatron_classify(${metatron-root}/src "src")
metatron_classify(${metatron-root}/exe "exe")

get_property(metatron-units TARGET metatron-build PROPERTY metatron-units)
foreach(unit ${metatron-units})
  metatron_link(${unit})
endforeach()
```

对于处理单元集合, `setup.cmake`只是调用`metatron_classify`.

```cmake
message(STATUS "processing libraries ...")
metatron_classify("${metatron-root}/src" "src")
```

对于exe/src, `setup.cmake`主要用于分析依赖关系, 将依赖的模块存储在`metatron-deps`中.

```cmake
list(APPEND metatron-deps mimalloc)
```

对于lib, `setup.cmake`还会设置第三方库的构建选项. 第三方库也需要设置`metatron-deps`, 主要用于以统一的格式设置依赖.

```cmake
set(MI_USE_CXX ON CACHE BOOL "")
set(MI_BUILD_STATIC OFF CACHE BOOL "")
set(MI_BUILD_OBJECT OFF CACHE BOOL "")
set(MI_BUILD_TESTS OFF CACHE BOOL "")
add_subdirectory(${path}/mimalloc)
list(APPEND metatron-deps mimalloc)
```

### 求解模块

模块生成过程在`metatron_evaluate`中.

对于lib, 创建interface target, 用于传递与第三方库的依赖关系, 并不会生成实际构建结果.

```cmake
message(STATUS "build 3rd-party library ${target}")
add_library(${target} INTERFACE)
```

src/exe下如果有cpp文件, 则创建target, 传递头文件目录的依赖, 最后会生成动态库或可执行文件. 模块的头文件必须位于`include/metatron/${unit}/`, 这样头文件都可以通过`#include <metatron/${unit}/...>`引入, 且分析完依赖关系后, 只有依赖的模块的头文件会被补全.

```cmake
if(${mode} STREQUAL "exe")
    message(STATUS "build executable ${target}")
    add_executable(${target} ${sources})
else()
    message(STATUS "build library ${target}")
    add_library(${target} SHARED EXCLUDE_FROM_ALL ${sources})
endif()
target_include_directories(${target} PUBLIC ${path}/include)
```

构建单元如果是纯头文件库, 或者是只用于收集依赖并传播的接口库, 采用和lib类似的处理方式, 因为只需要被include或target链接.

```cmake
if(headers)
    message(STATUS "build header-only library ${target}")
else()
    message(STATUS "build interface library ${target}")
endif()
add_library(${target} INTERFACE)
target_include_directories(${target} INTERFACE ${path}/include)
set(mode "inc")
```

最后设置target属性用于依赖分析.

```cmake
set_property(TARGET ${target} PROPERTY metatron-path ${path})
set_property(TARGET ${target} PROPERTY metatron-mode ${mode})
if(${mode} STREQUAL "lib" OR ${mode} STREQUAL "inc")
    set_property(TARGET ${target} PROPERTY metatron-access INTERFACE)
else()
    set_property(TARGET ${target} PROPERTY metatron-access PUBLIC)
endif()
```

### 链接依赖

获取target属性.

```cmake
set(target metatron-${unit})
get_property(path TARGET ${target} PROPERTY metatron-path)
get_property(mode TARGET ${target} PROPERTY metatron-mode)
get_property(access TARGET ${target} PROPERTY metatron-access)
```

执行`setup.cmake`中的自定义构建流程.

```cmake
# execute setup file
set(metatron-deps)
set(setup-file ${path}/setup.cmake)
if(EXISTS ${setup-file})
    include(${setup-file})
endif()
```

获取依赖项, 由于构建系统自动添加前缀, src/exe需要重命名依赖项.

```cmake
# solve dependencies
set(linked-libs)
foreach(dep ${metatron-deps})
    if(${mode} STREQUAL "lib")
        list(APPEND linked-libs ${dep})
    else()
        list(APPEND linked-libs metatron-${dep})
    endif()
endforeach()
```

执行target链接.

```cmake
# link dependencies
if(linked-libs)
    message(STATUS "${target} link libraries ${linked-libs}")
    target_link_libraries(${target} ${access} ${linked-libs})
endif()
```

## 构建运行

为避免`cmake`命令行参数不一致导致的问题, 项目中含有`CMakePresets.json`.

```json
{
  "cmakeMinimumRequired": {
    "major": 3,
    "minor": 30,
    "patch": 5
  },
  "configurePresets": [
    {
      "name": "default",
      "generator": "Ninja",
      "cacheVariables": {
        "CMAKE_EXPORT_COMPILE_COMMANDS": "ON"
      }
    },
    {
      "name": "linux-native-dev",
      "inherits": "default",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug"
      }
    },
    {
      "name": "linux-native-rel",
      "inherits": "default",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release"
      }
    }
  ],
  "version": 8
}
```

运行`cmake -B build --preset linux-native-dev`即可生成构建目标, `cmake --build build`启动构建.

无论neovim还是vscode的CMake插件我都使用过一段时间, 其实和命令行也没差多少, 无非是可以打开编辑器自动生成, 对于我自己的项目确实没必要了.

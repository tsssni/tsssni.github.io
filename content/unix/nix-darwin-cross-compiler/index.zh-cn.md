---
title: "在Nix-Darwin中使用交叉编译器"
date: 2024-09-14
draft: false
description: "fix errors for cross compilation on darwin"
tags: ["nix", "nix-darwin", "darwin", "macos", "cross-compilation"]
---
Nix这边对交叉编译的支持是很不错的, 但它是用来通过stdenv编译nixpkgs中的某个包的.
浙软的高级操作系统Lab需要直接使用交叉编译器, 那么只能通过在环境中导入stdenv.cc来实现, 这一步是有坑的.
Homebrew可以一键安装, 但我又无法抛弃通过nix develop来实现便捷的环境配置, 因此相关的解决方案今天记录在这里.

## 系统配置

Nix本身具有良好的交叉编译环境支持, 对于已经记录在lib.systems.examples中的系统,
可以通过pkgs.pkgsCross.[cross-env]直接导入. lib.systems.examples的部分定义如下:

```nix

# ... 

{

  # ...

  aarch64-embedded = {
    config = "aarch64-none-elf";
    libc = "newlib";
    rustc.config = "aarch64-unknown-none";
  };

  # ...

  gnu64 = { config = "x86_64-unknown-linux-gnu"; };
  gnu64_simplekernel = gnu64 // platforms.pc_simplekernel; # see test/cross/default.nix
  gnu32  = { config = "i686-unknown-linux-gnu"; };

  # ...

}
```

这里最核心的部分就是config里这个字符串, 如果没有指定libc等别的要求,
通常可以用这个字符串替代attribute set, 例如:

```
# the following are the same
system = "aarch64-darwin";
system = { config = "aarch64-darwin"; };
```

系统字符串具有特定的格式:

```nix
arch-vendor-kernel-abi
```

该字符串可以包含其中的任意部分, 例如aarch64-darwin就只包含arch-kernel.
nixpkgs会利用lib.systems.elaborate来补充省略的部分, 并扩展为一个attribute set来提供更多功能.
例如aarch64-darwin会被扩展为如下形式, 这里截取部分属性作为例子:

```nix
{
  # ...
  config = "aarch64-apple-darwin";
  darwinArch = "arm64";
  darwinMinVersion = "11.0";
  darwinMinVersionVariable = "MACOSX_DEPLOYMENT_TARGET";
  darwinPlatform = "macos";
  darwinSdkVersion = "11.0";
  # ...
  gcc = { ... };
  hasSharedLibraries = true;
  is32bit = false;
  is64bit = true;
  isAarch = true;
  isAarch32 = false;
  isAarch64 = true;
  # ...
  isBigEndian = false;
  isCompatible = «lambda @ /Users/tsssni/nixpkgs/lib/systems/default.nix:82:22»;
  isDarwin = true;
  # ...
  isMacOS = true;
  isMacho = true;
  # ...
  libc = "libSystem";
  linker = "cctools";
  # ...
  system = "aarch64-darwin";
  ubootArch = "arm64";
  uname = { ... };
  useAndroidPrebuilt = false;
  useLLVM = false;
  useiOSPrebuilt = false;
}
```

可以看到系统信息得到了充分的补全, 给用户提供了足够的系统信息,
例如通过(if localSystem.isDarwin)即可判断当前交叉编译环境下的本地系统是否为Darwin.

## 自定义系统

并非所有交叉编译环境都会在pkgsCross中提供, pkgsCross中的命名方式可能也不符合用户的要求.
例如Homebrew中提供的aarch64-embedded环境的前缀为aarch64-elf, Nix中为aarch64-none-elf.
两者编译出的二进制文件并无区别, 且都是符合gcc交叉编译器的传统命名方式的,
但是部分代码中可能直接指定编译器前缀, 例如我的OS Lab中使用的Unikraft的make文件中有如下定义:

```make
# set cross compile
ifeq ($(call qstrip,$(CONFIG_CROSS_COMPILE)),)
ifeq ($(HOSTOSENV),Darwin)
	CONFIG_CROSS_COMPILE := aarch64-elf-
else
ifneq ($(CONFIG_UK_ARCH),$(HOSTARCH))
	CONFIG_CROSS_COMPILE := aarch64-linux-gnu-
endif
endif
endif
```

显然它默认我们使用Homebrew(Nix-Darwin确实挺难用的...), 可以参考Unikraft官方的[Homebrew Tap](https://github.com/unikraft/homebrew-cli).
此时我们可以自定义系统设置来解决该问题, 例如在我的[NUR仓库](github.com/tsssni/NUR)参照aarch64-embedded定义了如下系统:

```nix
{
  aarch64-elf = {
    config = "aarch64-elf";
    libc = "newlib";
    rustc.config = "aarch64-unknown-none";
  };
}
```

这会导致Nix编译出的cc-wrapper前缀的变化, 只有在交叉编译环境中才会使用带前缀的cc. 
经过我的测试, aarch64-embedded并未存储于nixos cache中, 和aarch64-elf一样需要本地编译, 因此使用体验是相同的.
交叉编译器前缀与系统配置字符串是相同的, 影响交叉编译器前缀的代码如下:

```nix
# pkgs/build-support/cc-wrapper/default.nix

# ...

let
  targetPrefix = optionalString (targetPlatform != hostPlatform) (targetPlatform.config + "-");
in:

# ...

```

## 交叉编译stdenv

想要在配置中导入自定义交叉编译系统对应的nixpkgs环境, 重新import nixpkgs即可.
例如我这里只需要在develop环境中使用交叉编译器, 可以这样编写mkShell:

```nix
let
  aarch64-elf-pkgs = import nixpkgs {
  localSystem = system;
  crossSystem = tsssni-lib.systems.aarch64-elf;
  };
in pkgs.mkShell {
  packages = [ aarch64-elf-pkgs.stdenv.cc ];
};
```

然而此时编译出的aarch64-elf-gcc会报-iframework unknown option错误, 这是darwin平台特有的选项,
对于交叉编译器该选项是不支持的, 显然这是因为cc-wrapper在darwin平台上自动导入这个flag了.
开始我以为这是nixpkgs的bug, 但从[cc-wrapper的setup-hook.sh](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/cc-wrapper/setup-hook.sh)可以看出,
这个flag是只在targetSystem.isDarwin时才会引入.

归根结底, 这还是由于在一个环境中引入了不同的系统配置导致的.
除了aarch64-elf-gcc之外我还安装了其他darwin-native的包, 因此nix develop会导入darwin-native环境中cc-wrapper的setup-hooks.
cc-wrapper是依赖setup-hooks中设置的NIX_CFLAGS_COMPILEF来引入flag的, darwin-native-gcc需要的flags也会被aarch64-elf-gcc使用, 从而导致报错.

由于这些-isystem和-iframework对于我的OS LAB来说是无关紧要的,
此时在mkShell时可以参照[simavr的setup-hook](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/simavr/setup-hook-darwin.sh)来把-iframework过滤掉,
simavr中-isystem也是被过滤掉的, 这里我也一并过滤:

```nix
pkgs.mkShell {
  # ...
  shellHook = ''
    # Because it’s getting called from a Darwin stdenv, aarch64-elf-cc will pick up on
    # Darwin-specific flags, and it will barf and die on -iframework in
    # particular. Strip them out, so simavr can compile its test firmware.
    cflagsFilter='s|-F[^ ]*||g;s|-iframework [^ ]*||g;s|-isystem [^ ]*||g;s|  *| |g'

    # The `CoreFoundation` reference is added by `linkSystemCoreFoundationFramework` in the
    # Apple SDK’s setup hook. Remove that because aarch64-elf-cc will fail due to file not found.
    ldFlagsFilter='s|/nix/store/[^-]*-apple-framework-CoreFoundation[^ ]*||g'

    # Make sure the global flags aren’t accidentally influencing the platform-specific flags.
    export NIX_CFLAGS_COMPILE="$(sed "$cflagsFilter" <<< "$NIX_CFLAGS_COMPILE")"
    export NIX_LDFLAGS="$(sed "$ldFlagsFilter;$cflagsFilter" <<< "$NIX_LDFLAGS")"

    exec zsh
  '';
}
```

## Flake

此时交叉编译器就可以正常使用了, 完整的flake如下:

```nix
{
  description = "OSLAB devenv";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-24.05-darwin";
    tsssni-nur = {
      url = "github:tsssni/NUR";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, tsssni-nur, ... }: let
    system = "aarch64-darwin";
  in {
    devShells."${system}".default = let
      pkgs = import nixpkgs {
        inherit system;
      };
      tsssni-lib = tsssni-nur.lib;
      tsssni-pkgs = tsssni-nur.pkgs {
        localSystem = system;
      };
      aarch64-elf-pkgs = import nixpkgs {
        localSystem = system;
        crossSystem = tsssni-lib.systems.aarch64-elf;
      };
    in pkgs.mkShell {
      packages = []
        ++ (with pkgs; [
            clang
            lldb
            qemu
            coreutils-prefixed
            cmake
          ]) 
        ++ (with tsssni-pkgs.gnu; [
            ggrep
            gmake
            gsed
          ])
        ++ (with aarch64-elf-pkgs; [
            stdenv.cc
          ]);
      shellHook = ''
        # Because it’s getting called from a Darwin stdenv, aarch64-elf-cc will pick up on
        # Darwin-specific flags, and it will barf and die on -iframework in
        # particular. Strip them out, so simavr can compile its test firmware.
        cflagsFilter='s|-F[^ ]*||g;s|-iframework [^ ]*||g;s|-isystem [^ ]*||g;s|  *| |g'

        # The `CoreFoundation` reference is added by `linkSystemCoreFoundationFramework` in the
        # Apple SDK’s setup hook. Remove that because aarch64-elf-cc will fail due to file not found.
        ldFlagsFilter='s|/nix/store/[^-]*-apple-framework-CoreFoundation[^ ]*||g'

        # Make sure the global flags aren’t accidentally influencing the platform-specific flags.
        export NIX_CFLAGS_COMPILE="$(sed "$cflagsFilter" <<< "$NIX_CFLAGS_COMPILE")"
        export NIX_LDFLAGS="$(sed "$ldFlagsFilter;$cflagsFilter" <<< "$NIX_LDFLAGS")"

        exec zsh
      '';
    };
  };
}
```


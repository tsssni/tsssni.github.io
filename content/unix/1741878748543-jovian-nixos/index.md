---
title: "Jovian-NixOS: steamdeck完全nix化"
date: 2025-03-13
draft: false
description: "Jovian-NixOS first meet"
tags: ["jovian", "nixos", "steamdeck"]
---

由于一直想在steamdeck上手动管理代理, 但即使SteamOS有默认的/nix路径, NixOS模块仍然无法使用, 因此无法通过systemctl service在启动时自动创建tun. 了解了[Jovian-NixOS](https://github.com/Jovian-Experiments/Jovian-NixOS/tree/development)这个项目后我决定nix化我的deck.

## 简介

Jovian-NixOS将Valve上游的更新迁移到NixOS上, 同时通过模块提供与SteamOS类似的体验. Jovian致力于运行在各类x86_64设备上, 但目前只重点维护steamdeck.

## 安装

Jovian-NixOS的安装是相对最复杂的, 但并Jovian并没有提供专门的安装镜像(有篇23年的文章会让你生成镜像, 现在已经不支持了), 遵循一般的NixOS安装过程即可, 我会讲一下我遇到的坑.

由于steamdeck只有一个usb-c接口, 最好使用micro sd卡(tf卡)安装(淘宝上搜sd卡都是大号的, 害我还得再买tf卡), 把usb口留给键盘. 插入tf卡时会有类似弹簧的手感, 再用点劲往里推听到咔哒一声才算是装上了. 拓展坞理论上也是可行的, 我并没有尝试. 长按音量-键然后按开机键就可以进入引导菜单了.

steamdeck的wifi是高通网卡, 不是每个内核版本的驱动都比较稳定. 我在安装时6.11.11-valve7版本的内核会驱动加载失败, 升级到valve8后可以检测到网卡, 但是通过nmcli上网仍然容易失败, 最后通过删除所有已知网络并重启来解决. 无法连接网络会导致卡在logo界面, 最好插上键盘通过ctrl+alt+f[2, 3, 4 ...]切换tty去解决问题. 安装时建议打开openssh, 不然不方便远程控制.

配置中硬件与内核相关的参数可以删掉, Jovian的模块里会配置这些内容. 同时也不要在配置里指定内核包, 未经过Valve patch的内核很有可能出问题, 比如我一开始使用6.12会导致屏幕有雪花噪点且gamescope无法启动.

对于硬盘分区, 我是通过disko将硬盘格式化为开启zstd压缩的btrfs. disko支持用flake中的disko配置来自动做硬盘分区. 执行disko的`nix run`命令之前最好通过NIX_CONFIG环境变量开启试验特性, 比如我的配置用到了管道操作符, 但是在命令中无论在哪个位置插入--extra-experimental-features都无法开启这个特性, 必须通过环境变量.

## 配置

Jovian的配置基本是开箱即用的, 有以下这些配置就够了, 更多的选项可以看官网或者源码. 这里desktopSession是steamdeck切换桌面选项后会打开的桌面, gamescope-wayland代表仍然打开steam ui, 这里还可以选择gnome或KDE. updater.splash是开机的logo, 可以选择steamdeck, jovian和当前主板的logo.

```nix
jovian.steam = {
    enable = true;
    autoStart = true;
    desktopSession = "gamescope-wayland";
    updater.splash = "jovian";
    user = "deck";
};
jovian = {
    devices.steamdeck.enable = true;
    hardware.has.amd.gpu = true;
};
```

deckyloader的话Jovian可以通过模块开启, 但因为我不需要tommon我就没有安装, steamdeck有了好看的steam娘启动画面后我也不需要用decky里的自定义启动画面了. Jovian对decky的支持问题还挺多的, decky跟nixos不太合得来, 之前SteamOS的时候每次系统更新可能都需要重新安装decky, 挺麻烦的.

## 体验

基本和steamdeck一致, 也不会因为系统的关系影响硬件识别, deck用户该拿的福利还是会有. 同时因为我可以很方便的把NixOS配置搬过来, 用steamdeck做一些开发也会方便很多, 不会被SteamOS限制修改系统环境了. 我在steamdeck上安装fish和我的nixvim配置模块后和普通的linux设备体验很像了.

之前steamos时通过tomoon开启代理会导致ssh过去速度异常的慢, 用我自己的sing-box配置完全解决了这个问题. sing-box需要配置steamserver.net走直连, 这样steam下载才不会走代理.

问题也是有的, 除了上面所说的网卡问题之外, Jovian-NixOS现在不支持CJK字体, 似乎几个月了还没修好, 当然游戏里还是会有中文的.

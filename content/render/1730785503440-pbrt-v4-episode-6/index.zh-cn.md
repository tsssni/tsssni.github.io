---
title: "pbrt-v4 Ep. VI: 几何形状"
date: 2024-11-05
draft: true
description: "pbrt-v4 episode 6"
tags: ["graphics", "rendering", "pbrt"]
---

`pbrt`通过`Shape`抽象出光线相交, 包围盒等接口, 其余形状无关的功能由`Primitive`封装. 本章主要介绍`Shape`.

## 基础接口

### 包围结构

`Shape`中`Bounds()`接口返回包围盒, `NormalBounds()`返回法线方向的包围锥.

### 光线-包围结构相交

光线与各个轴上的近平面与远平面相交, 三轴近平面上最大的\\(t\\)即为\\(t_{near}\\), 同理可得\\(t_{far}\\), 若\\(t_{far} < t_{near}\\)则与包围盒不相交.

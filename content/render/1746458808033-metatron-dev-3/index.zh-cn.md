---
title: "Metatron Dev. III: 体数据"
date: 2025-05-05
draft: false
description: "metatron development log"
tags: ["graphics", "rendering", "metatron"]
---

pbrt通过`RayMajorantIterator`遍历体数据, 独立于体数据之外, 将体数据采样方式暴露给积分器. metatron开发时决定将采样细节封装在介质类中, 实现了`math::Grid`以及`media::Grid_Medium`以划分体素和访问体数据, 效果如下.

![disney-fire](disney-fire.png)

## 体素网格

`Grid`将空间在各个维度上均匀划分, 底层采用`Matrix`存储, 网格大小在编译期确定. `operator()`采用局部坐标访问网格获取实际数据, `operator[]`采用序号访问网格获取某种在当前体素中一致的数据, 为支持负数网格序号, 参数使用`i32`. `bounding_box`无论哪种输入, 返回的都是当前体素的包围盒, 若在包围盒外部则返回整体的包围盒.

```c++
template<typename T, usize x, usize y, usize z>
struct Grid {
	auto static constexpr dimensions = std::array<usize, 3>{x, y, z};
	virtual ~Grid() = default;

	auto virtual to_local(math::Vector<i32, 3> const& ijk) const -> math::Vector<f32, 3> = 0;
	auto virtual to_index(math::Vector<f32, 3> const& pos) const -> math::Vector<i32, 3> = 0;

	auto virtual bounding_box() const -> math::Bounding_Box = 0;
	auto virtual bounding_box(math::Vector<f32, 3> const& pos) const -> math::Bounding_Box = 0;
	auto virtual bounding_box(math::Vector<i32, 3> const& ijk) const -> math::Bounding_Box = 0;

	auto virtual operator()(math::Vector<f32, 3> const& pos) const -> T = 0;
	auto virtual operator[](math::Vector<i32, 3> const& ijk) -> T& = 0;
	auto virtual operator[](math::Vector<i32, 3> const& ijk) const -> T const& = 0;
};
```

`Nanovdb_Grid`读取nanovdb格式的体数据, 并使用`Uniform_Grid`建立主值网格, 将nanovdb的包围盒均匀划分, 读取内部所有体素取最大值. `Uniform_Grid`是`Grid`最基础的实现, 采用局部坐标或序号访问的结果是相同的, 而`Nanovdb_Grid`采用局部坐标获取实际数据, 序号获取主值. pbrt构造主值网格时会将体素包围盒向外扩展一个单位, 构建更loose的网格, 这里暂时不太清楚原因, 因此未采用.

```c++
Nanovdb_Grid(std::string_view path): /* ... */ {
	// ...
	for (auto i = pmin[0]; i <= pmax[0]; i++) {
		for (auto j = pmin[1]; j <= pmax[1]; j++) {
			for (auto k = pmin[2]; k <= pmax[2]; k++) {
				majorant_grid[ijk] = std::max(majorant_grid[ijk], accessor.getValue({i, j, k}));
			}
		}
	}
}
```

由于需要主值, 在构造函数中就已经通过让`sampler`访问包围盒之外以获取背景值了, 通过序号访问时判断是否位于包围盒内部即可.

```c++
auto virtual operator()(math::Vector<f32, 3> const& pos) const -> T {
	return sampler(nanovdb_grid->worldToIndex(to_nanovdb(pos)));
}
auto virtual operator[](math::Vector<i32, 3> const& ijk) -> T& {
	if (ijk == clamp(ijk, math::Vector<i32, 3>{0}, math::Vector<i32, 3>{x - 1, y - 1, z - 1})) {
		return majorant_grid[ijk];
	} else {
		return background;
	}
}
```

## 网格介质

采样过程在`Grid_Medium::sample`中实现, 由于delta tracking的特性, 采样时没有超过体素边界才会返回, 否则光线继续追踪.

`Grid_Medium`内部会保存一份`cache`, 如果积分器采样到空散射事件, 由于光线按原路径传播, 直接读取缓存继续采样过程. 缓存是`thread_local`的, 否则不同像素并发发射的光线对缓存的读取会冲突.

```c++
struct Cache final {
	math::Ray r{
		{math::maxv<f32>},
		{0.f}
	};
	math::Bounding_Box bbox{};
	f32 t_max{-1.f};
	f32 density_maj{0.f};
	spectra::Stochastic_Spectrum sigma_maj{};
	math::Exponential_Distribution distr{0.f};
};

std::unordered_map<Grid_Medium const*, Grid_Medium::Cache> thread_local Grid_Medium::thread_caches;
```

透射率按如下方式更新, `t_transmitted`用于返回实际追踪距离, `t_boundary`用于记录与几何交点的距离.

```c++
auto update_transmittance = [&](f32 t) -> void {
	t_transmitted += t;
	t_boundary -= t;
	cache.t_max -= t;
	cache.r.o += t * cache.r.d;
	for (auto i = 0uz; i < transmittance.lambda.size(); i++) {
		transmittance.value[i] *= std::exp(-cache.sigma_maj.value[i] * t);
	}
};
```

穿过体素后主值更新方式如下, 如果不与包围盒相交代表位于整个网格外部, 此时`t_max`设置为与几何物体的相交点. 由于需要主值这里使用`operator[]`访问网格.

```c++
auto update_majorant = [&](f32 t_max) -> void {
	cache.bbox = grid->bounding_box(cache.r.o);
	cache.t_max = math::hit(cache.r, cache.bbox).value_or(t_max);
	cache.density_maj = (*grid)[grid->to_index(cache.r.o)] * density_scale;
	cache.sigma_maj = cache.density_maj * sigma_t;
	cache.distr = math::Exponential_Distribution(cache.sigma_maj.value.front());
};
```

对于当前与包围盒交点超过到下一个几何物体的交点的情况, 若主值为0或采样点超过几何物体边界, 更新透射率后返回. 这代表光线追踪过程中没有发生任何事件, 直接传播到下一个交点.

```c++
if (t_boundary <= cache.t_max && (cache.density_maj == 0.f || t_u >= t_boundary)) {
	update_transmittance(t_boundary + t_offset);
	return Interaction{
		cache.r.o,
		phase.get(),
		t_max,
		transmittance.value.front(),
		transmittance,
		transmittance,
		{}, {}, {}, {}, {}
	};
}
```

如果到达包围盒交点或者当前体素主值为0, 直接穿过包围盒, 更新主值与透射率后继续追踪.

```c++
else if (t_boundary > cache.t_max && (cache.density_maj == 0.f || t_u >= cache.t_max)) {
	update_transmittance(cache.t_max + t_offset);
	update_majorant(t_boundary);
}
```

其余情况代表成功采样, 返回并交给积分器做决定.

```c++
else {
	update_transmittance(t_u);
	auto spectra_pdf = cache.sigma_maj * transmittance;
	auto density = (*grid)(cache.r.o);

	return Interaction{
		cache.r.o,
		phase.get(),
		t_transmitted,
		spectra_pdf.value.front(),
		spectra_pdf,
		transmittance,
		density * sigma_a,
		density * sigma_s,
		cache.sigma_maj - density * sigma_t,
		cache.sigma_maj,
		density * (ctx.L & *Le),
	};
}
```

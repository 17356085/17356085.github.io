---
title: 快速上手TailwindCSS
published: 2025-09-15
updated: 2025-09-15
description: TailwindCSS快速上手
author: mio
tags:
  - 编程学习
  - 前端开发
category: CSS
draft: false
---
# 1) 基本规则与“看懂类名”

- **原子类** = 单一样式：`p-4`(内边距 1rem)、`text-gray-700`、`lg:flex`。
    
- **类名结构**：`[可选变体]:[工具类]-[值]`，如 `hover:bg-indigo-600`、`md:rounded-2xl`。
    
- **负值**：前缀 `-`，如 `-mt-2`、`-translate-x-1/2`。
    
- **重要性**：前缀 `!`，如 `!hidden`、`!text-black`（慎用）。
    
- **任意值**：用方括号 `[]`：`w-[72px]`、`bg-[rgba(0,0,0,0.4)]`、`grid-cols-[1fr_200px]`。
    

---

# 2) 响应式与变体（Modifiers）

- **响应式断点**：`sm` `md` `lg` `xl` `2xl`（移动优先）
    
    ```html
    <div class="p-3 md:p-6 lg:p-10">…</div>
    ```
    
- **交互状态**：`hover:` `focus:` `active:` `disabled:` `focus-visible:` `focus-within:`
    
    ```html
    <button class="bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-600">…</button>
    ```
    
- **结构伪类**：`first:` `last:` `odd:` `even:` `only:` `empty:`
    
    ```html
    <li class="first:pt-0 last:pb-0 odd:bg-gray-50">…</li>
    ```
    
- **表单/占位**：`placeholder:` `file:`（文件按钮）
    
- **选择文本**：`selection:`
    
- **列表标记**：`marker:`（`<li>` 的圆点/编号）
    
- **对话框背景**：`backdrop:`（配合 `<dialog>` 或 ::backdrop）
    
- **父子联动**：`group` / `group-hover:*`、`peer` / `peer-checked:*`
    
    ```html
    <label class="group block cursor-pointer">
      <input type="checkbox" class="peer sr-only" />
      <span class="block rounded-xl p-4 border
                  group-hover:border-indigo-400
                  peer-checked:bg-indigo-50">
        选我
      </span>
    </label>
    ```
    
- **ARIA / data 状态**：`aria-expanded:`、`aria-selected:`、`data-[state=open]:`
    
    ```html
    <button aria-expanded="false" class="aria-expanded:bg-indigo-50">…</button>
    <div data-state="open" class="data-[state=open]:block hidden">内容</div>
    ```
    
- **主题与媒体**：`dark:` `print:` `motion-reduce:` `portrait:` `landscape:`
    

---

# 3) 布局与显示

### Display

`block` `inline-block` `inline` `flex` `inline-flex` `grid` `table` `hidden` `sr-only`

```html
<div class="hidden sm:block">小屏隐藏，大屏显示</div>
```

### 容器与居中

`container` `mx-auto` `max-w-*`（`sm`/`md`/`lg`/`xl`/`2xl`/像素）

```html
<div class="container mx-auto px-4 max-w-5xl">…</div>
```

### Flex 常用

`flex` `flex-row|col` `flex-wrap` `items-*` `justify-*` `gap-*` `flex-1` `grow` `shrink-0`

```html
<div class="flex items-center justify-between gap-4">…</div>
```

### Grid 常用

`grid` `grid-cols-*` `grid-rows-*` `gap-*` `col-span-*` `row-span-*` `place-items-center`

```html
<ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">…</ul>
```

### 定位

`relative` `absolute` `fixed` `sticky` `inset-0` `inset-x-0` `top-0`… `z-*`

```html
<header class="sticky top-0 z-50 bg-white/80 backdrop-blur">…</header>
```

---

# 4) 尺寸与间距

### 盒模型

- **内外边距**：`p-*` / `m-*`；轴向：`px`/`py`、单边：`pt`/`pr`/`pb`/`pl`
    
- **宽高**：`w-*` `h-*`；最小/最大：`min-w-*` `max-h-*`
    
- **常见值**：`0 0.5 1 1.5 2 … 96`、`px`(1px)、分数 `1/2 1/3 2/3 1/4…`、`full`、`screen`
    

```html
<div class="p-4 md:p-8 w-full max-w-xl h-64">…</div>
```

### 比例

`aspect-square` `aspect-video`（需插件或内置版本）

```html
<div class="aspect-video bg-gray-200 rounded-xl"></div>
```

---

# 5) 文字与排版

- 字号：`text-xs sm base lg xl 2xl … 9xl`
    
- 字重：`font-light normal medium semibold bold black`
    
- 行高：`leading-none tight snug normal relaxed loose`
    
- 字间：`tracking-tighter tight normal wide wider widest`
    
- 对齐：`text-left center right justify`
    
- 截断：`truncate`（单行） `line-clamp-2`（多行，需插件）
    
- 文本色/不透明：`text-gray-700/80`（等同 80% 透明）
    

```html
<p class="text-sm text-gray-600 leading-relaxed line-clamp-2">…</p>
```

---

# 6) 颜色、背景与渐变

- 前景色：`text-*`
    
- 背景：`bg-*` / 图像：`bg-[url('/img/hero.png')]`
    
- 渐变：`bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500`
    
- 不透明度：`bg-black/60`、`text-white/90`
    

```html
<div class="bg-gradient-to-br from-indigo-100 to-indigo-200 p-6 rounded-2xl">…</div>
```

---

# 7) 边框、圆角、分割线、Ring/Outline

- 边框：`border` `border-2` `border-x` `border-b-0` `border-gray-200`
    
- 圆角：`rounded` `rounded-md` `rounded-xl` `rounded-full`（或 `rounded-tl-2xl`）
    
- 分割线（容器子元素间）：`divide-y` `divide-gray-200`
    
- 焦点环：`ring` `ring-2` `ring-indigo-600` `ring-offset-2` `ring-inset`
    
- 轮廓线：`outline` `outline-2` `outline-red-500`
    

```html
<button class="rounded-xl border px-4 py-2 ring-offset-2 focus:ring-2 focus:ring-indigo-600">…</button>
```

---

# 8) 阴影、滤镜、Backdrop 与混合

- 阴影：`shadow` `shadow-sm` `shadow-lg` `shadow-none`
    
- 滤镜：`blur` `blur-sm` `brightness-110` `grayscale` `sepia`
    
- Backdrop（毛玻璃）：`backdrop-blur` `backdrop-brightness-90`
    
- 混合与透明：`mix-blend-multiply` `bg-white/70`
    

```html
<div class="bg-white/70 backdrop-blur shadow-lg rounded-2xl">…</div>
```

---

# 9) 溢出与滚动

`overflow-hidden` `overflow-x-auto` `overscroll-contain` `scroll-smooth` `snap-x snap-mandatory snap-start`

```html
<div class="overflow-x-auto snap-x snap-mandatory flex gap-4">…</div>
```

---

# 10) 媒体与对象适配

- 对象适配：`object-contain` `object-cover` `object-center`
    
- 图片圆角/边框同普通盒子类
    

```html
<img class="w-32 h-32 object-cover rounded-xl" />
```

---

# 11) 交互与可用性

`cursor-pointer` `select-none` `pointer-events-none` `disabled:opacity-50` `disabled:pointer-events-none`

```html
<button disabled class="cursor-not-allowed disabled:opacity-50">…</button>
```

---

# 12) 过渡与动画

- 过渡：`transition` `transition-colors` `duration-300` `ease-in-out` `delay-150`
    
- 预设动画：`animate-spin` `animate-ping` `animate-bounce` `animate-pulse`
    

```html
<div class="transition transform hover:scale-105 hover:-translate-y-1 duration-300">…</div>
```

---

# 13) 变换（Transform）

`transform`（v3 起多数变换类会自动加 transform）  
`scale-*` `rotate-*` `translate-x-*` `-translate-y-1/2` `skew-x-*` `origin-top`

```html
<div class="rotate-6 hover:rotate-0 transition">…</div>
```

---

# 14) 深色模式与环境首选项

- **深色**：在 `tailwind.config.js` 配置 `darkMode: 'class'`，用 `dark:*`
    
    ```html
    <article class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">…</article>
    ```
    
- **动效/对比度**：`motion-reduce:` `contrast-more:`（不同设备/系统设置）
    
- **打印**：`print:hidden`
    

---

# 15) 伪元素与特殊元素

- **before/after**（配合 `content-*` 任意值）：
    
    ```html
    <h3 class="relative pl-4 before:content-['#'] before:absolute before:left-0 before:text-indigo-600">标题</h3>
    ```
    
- **placeholder**：`placeholder-gray-400`
    
- **file**：定制 `<input type="file">` 的按钮：`file:rounded-lg file:bg-indigo-600 file:text-white`
    
- **selection**：`selection:bg-yellow-200`
    
- **marker**：`marker:text-indigo-600`（列表圆点/编号）
    
- **backdrop**：模态遮罩样式：`backdrop:blur`
    

---

# 16) 任意值与任意 CSS 属性

- **任意值**：`w-[732px]`、`text-[13px]`、`leading-[1.35]`、`tracking-[.02em]`
    
- **任意属性**（更底层）：`[mask-image:linear-gradient(to_bottom,black,transparent)]`
    
    ```html
    <div class="bg-[url('/hero.jpg')] [mask-image:linear-gradient(to_bottom,black,transparent)]">…</div>
    ```
    

---

# 17) 抽象与复用（@apply / @layer / @screen / theme）

在你的全局 CSS（例如 `src/assets/main.css`）里：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 抽象组件类 */
@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-2xl font-medium
           transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
           disabled:opacity-50 disabled:pointer-events-none;
  }
  .btn-primary { @apply bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-600; }
  .btn-secondary { @apply bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400; }
  .btn-sm { @apply h-8 px-3 text-sm; }
  .btn-md { @apply h-10 px-4; }
}

/* 响应式指令：在 CSS 里写断点 */
@screen md {
  .card-md { @apply grid grid-cols-2 gap-6; }
}

/* 读取主题值 */
.badge {
  color: theme('colors.indigo.700');
}
```

---

# 18) 常见陷阱与解决

- **内容扫描（Purge）**：生产构建时只保留能“静态分析”到的类名。**不要**拼接不可预测字符串：
    
    ```vue
    <!-- ❌ 会被摇掉 -->
    <div :class="`bg-${color}-600`"></div>
    
    <!-- ✅ 用映射或 safelist -->
    <div :class="({primary:'bg-indigo-600', danger:'bg-rose-600'})[color] || 'bg-indigo-600'"></div>
    ```
    
- **Safelist**（`tailwind.config.js`）：
    
    ```js
    export default {
      content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
      safelist: ['bg-indigo-600', 'bg-rose-600', /^grid-cols-/],
    }
    ```
    
- **命名冲突**：尽量不要把自定义类名与 Tailwind 工具类重名；自定义类放在 `@layer components`。
    
- **可读性**：装 `prettier-plugin-tailwindcss` 自动排序类名。
    

---

# 19) 高频场景小抄（直接用）

**卡片**

```html
<article class="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition">
  <h3 class="font-semibold">标题</h3>
  <p class="mt-1 text-sm text-gray-600 line-clamp-2">说明文案……</p>
  <button class="mt-4 btn btn-primary btn-sm">操作</button>
</article>
```

**响应式网格**

```html
<section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">…</section>
```

**粘性页眉 + 毛玻璃**

```html
<header class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
  <div class="container mx-auto px-4 h-14 flex items-center justify-between">…</div>
</header>
```

**图片裁剪**

```html
<img class="w-32 h-32 object-cover rounded-xl" src="/avatar.jpg" alt="">
```

**按钮组（等分）**

```html
<div class="grid grid-cols-3 gap-2">
  <button class="btn btn-secondary">日</button>
  <button class="btn btn-secondary">周</button>
  <button class="btn btn-primary">月</button>
</div>
```

---

# 20) 和 Vue 一起用的小技巧

- `:class` 支持 **数组/对象**，非常适合按条件切换：
    
    ```vue
    <div :class="['p-4', isActive ? 'bg-indigo-50' : 'bg-white']">…</div>
    ```
    
- 把变体/尺寸做成 **映射表**：
    
    ```ts
    const variants = { primary:'bg-indigo-600 text-white', ghost:'bg-transparent' }
    ```
    
- 深色模式用 `darkMode: 'class'`，切换时改 `<html>` 的 `classList`。
    

---

想更进阶的话，我可以按你的设计稿给你**定制一份 `tailwind.config.js` 主题**（品牌色、圆角、阴影、字号刻度等），或者把这些语法整理成**Vue + Tailwind 的最小可运行模板**（含组件示例与最佳实践）。你更想先做哪一个？

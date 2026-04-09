# 个人项目经历｜Fuwari 静态博客与主题系统

**项目类型**：个人作品 / 技术博客站点（静态站点）

## 项目背景
- 目标：搭建一套可长期维护的个人博客系统，兼顾内容生产效率（Markdown 写作）、访问体验（转场/搜索/目录）、以及 SEO 与部署成本（静态化部署）。
- 场景：面向公开读者的技术文章与生活记录站点，要求支持归档/分类/标签、全文搜索、代码高亮与数学公式等技术写作能力。

## 技术栈
- 框架与渲染：`Astro`（静态站点生成）+ `Svelte`（局部交互组件）
- 样式方案：`TailwindCSS` + Typography 插件
- 路由与交互体验：`Swup`（PJAX 页面切换与转场容器）
- 搜索：`Pagefind`（构建期索引、离线全文检索）
- 内容与 Markdown：Astro Content Collections（`zod` schema）+ `remark/rehype` 插件链（TOC、数学公式 `KaTeX`、自定义指令组件、标题锚点）
- 代码展示：`astro-expressive-code`（可折叠区块、行号、语言徽标、自定义复制按钮）
- 资源与图片：`sharp`（图片处理）+ `PhotoSwipe`（文章图片灯箱）
- 工程质量：`TypeScript` + `astro check` + `tsc --isolatedDeclarations` + `Biome`（format/lint）

## 核心功能
- 内容系统：文章集合与 frontmatter 校验、草稿控制、自动摘要/阅读时长/字数统计。
- 文章与列表：分页列表、文章卡片、文章详情页（封面、上下篇导航、License、评论组件）。
- 站点结构：导航栏、侧边栏组件（个人信息/标签/分类等）、右侧目录（TOC）。
- 搜索：生产环境加载 Pagefind 索引并全文检索，开发环境提供 Mock 结果保证交互可调试。
- SEO 与分发：RSS 输出、robots.txt 与 sitemap 集成，适配静态托管。
- 阅读体验：Swup 转场、回到顶部、主题色/明暗模式、图片灯箱。

## 个人职责
- 独立完成站点架构搭建与主题配置体系设计（站点配置、导航、主题色、Banner、TOC 等）。
- 设计并实现内容生产链路（Markdown 增强、frontmatter schema、摘要/阅读时长、new-post 脚本）。
- 实现关键交互体验（Swup 转场容器、搜索面板、TOC/回到顶部/灯箱等组件联动）。
- 负责工程化与质量保障（类型检查、格式化与 lint、构建脚本与部署产物）。

## 关键技术难点与解决方案
- 内容一致性与可维护性：
  - 难点：博客文章元信息（标题/时间/标签/草稿等）容易在多人/长期写作中产生不一致。
  - 方案：使用 Astro Content Collections + `zod` schema 对 frontmatter 进行结构化校验，并在生产构建阶段过滤 `draft` 内容，降低错误发布风险。

- 构建期全文搜索与运行时加载：
  - 难点：静态站点缺少后端检索服务，同时希望支持高质量的全文搜索。
  - 方案：在 `build` 中串联 `astro build` 与 `pagefind --site dist`，构建产物生成可离线加载的索引；运行时按环境区分：生产动态加载 `/pagefind/pagefind.js` 并调用 `window.pagefind.search()`，开发环境返回 Mock 数据以保证 UI/交互开发效率。

- Swup 转场下的组件重绑定与体验细节：
  - 难点：PJAX 方式替换内容会导致 DOM 事件/第三方组件失效，且转场期间容易出现滚动跳动与布局闪烁。
  - 方案：将 `main` 与 `#toc` 作为 Swup 容器统一管理；通过 Swup hooks 在 `content:replace`/`page:view` 生命周期中重新初始化交互（如自定义滚动条、图片灯箱），并用临时高度扩展与 TOC 状态切换降低转场抖动。

- Markdown 写作能力扩展与渲染一致性：
  - 难点：需要同时支持数学公式、可复用的提示块（note/tip/warning 等）、目录生成与标题锚点，且保证渲染稳定。
  - 方案：建立 `remark + rehype` 插件链：`remark-math` + `rehype-katex`、`remark-toc`、`rehype-slug`/`rehype-autolink-headings`，并通过 `rehype-components` 将自定义指令渲染为组件，实现可扩展的写作语法。

- 代码块可用性与复制体验：
  - 难点：默认代码块复制/信息展示能力有限，且样式需要适配主题。
  - 方案：基于 `astro-expressive-code` 组合插件（折叠区块/行号/语言徽标），并在渲染后处理阶段注入自定义 Copy Button，实现一致的交互与视觉规范。

- 图片交互与尺寸信息：
  - 难点：文章内图片需要灯箱预览，但静态渲染下无法提前获得稳定的尺寸信息。
  - 方案：引入 `PhotoSwipe`，在初始化时从 DOM 读取 `naturalWidth/naturalHeight` 作为展示尺寸，并在 Swup 置换前销毁/置换后重建，避免内存泄漏与失效。

## 项目成果（可量化）
- 内容规模：累计维护 `25` 篇 Markdown 文章。
- 功能体量：实现 `28` 个组件文件、`6` 个页面入口，覆盖分页列表/文章详情/归档/关于/订阅等站点能力。
- 部署产物：静态构建产物约 `51MB`（含 Pagefind 索引），可直接部署至静态托管平台。

## 可验证的实现依据（仓库内关键位置）
- 站点配置：`src/config.ts`
- 构建与搜索索引：`package.json`（`build: astro build && pagefind --site dist`）
- Markdown/代码块管线：`astro.config.mjs`、`src/plugins/*`
- Swup 转场与灯箱初始化：`src/layouts/Layout.astro`
- 页面入口：`src/pages/*`


# Shirone 迁移说明

## 当前状态

本地迁移分支为 `migration/shirone`，使用 `shirones@0.1.4` 的 npm package mode。
仓库根目录保留站点自己的内容与配置覆盖，不把 Shirone 上游源码复制进项目。
迁移日期：`2026-09-19`。主题源码：[Shirone](https://github.com/LyraVoid/Shirone)，
实际依赖包：[shirones](https://github.com/yCENzh/shirones) `0.1.4`。
官方参考：[Shirone](https://github.com/LyraVoid/Shirone)、
[shirones package pipeline](https://github.com/yCENzh/shirones)、
[官方文档](https://docs.shirone.mysqil.com/)。

## 内容与配置

- 25 个文章 Markdown 源文件保留在 `src/content/posts/`，其中 17 个非草稿文章进入生产输出。
- 1 个公开笔记保留在 `src/content/notes/`，笔记列表与详情页仍由仓库自定义页面提供。
- 公开文章与公开笔记是站点内容；Obsidian 私人工作区不纳入内容集合。
- `shirones/config/` 保存站点、个人资料、导航、评论、音乐和功能开关覆盖。
- Shirone 默认演示功能已关闭：相册、指南针、设备、友链、游戏、动态、项目、系列、技能与时间线均不生成站内入口。
- Anime 页面使用 Shirone `0.1.4` 的 snapshot 模式，固定同步 Bangumi 用户 `657838`；`/anime/` 只展示提交到仓库的真实快照，不带入主题示例数据。
- `pnpm anime:sync` 通过 Bangumi v0 API 分页抓取动画收藏，将状态映射为 `planned`、`completed`、`watching`、`onHold`、`dropped`，并在写入前校验非空数据、用户标识、Bangumi 外链和进度字段。同步异常、超时、无效 JSON 或空结果会保留上一份有效 `bangumi.json`；没有有效基线时才失败。
- `shirones/config/data/anime-snapshots/bangumi.json` 是受 `.gitignore` 保护规则中特别放行的生产基线；构建阶段不直接请求外部 API，CI 先尝试同步，失败时沿用已提交基线。
- 导航保留主页、归档、笔记、Anime、关于和个人 GitHub；原 Giscus 仓库、分类与主题参数保持不变。

## 本地验证

```text
pnpm install --frozen-lockfile
pnpm check
pnpm type-check
pnpm check:manifest
pnpm anime:sync
pnpm build
pnpm check:output
pnpm preview
```

`pnpm sync` 仍然是公开博客仓库的安全 Git 主干同步命令：只在 `main`、正确的
`origin` 和 clean worktree 上执行 fetch；本地落后时只更新到 `origin/main` 的
fast-forward ref，不执行 merge、rebase、stash、reset、checkout 或 push。当前工作区
有任何 tracked/untracked 修改时会在 fetch 前停止。未来如果启用 Shirone 的外部
Content Repository，`pnpm content:sync` 才表示内容仓同步，两者不合并。

`pnpm build` 先运行 Astro，再执行 `scripts/build-pagefind.mjs` 生成
`dist/pagefind/`。Shirones `0.1.4` 的集成构建钩子在 Windows 路径下会把盘符拼成
`/D:/...`，因此配置中关闭了集成钩子，改用 Pagefind 的 Node API 以绝对路径生成索引；
这不是绕过内容构建，而是对 Windows 构建路径的兼容处理。

## URL 与发布

原构建中存在的主页、`/posts/` 列表、归档、关于、笔记、`/posts/guide/`、
`/posts/2025/spring-aop/`、`/posts/2025/spring-ioc/`、`rss.xml`、
`robots.txt`、站点地图、Google/Bing 验证文件均保留。新增文章 URL 按内容文件路径生成，
英文大小写会按 Astro 内容 ID 归一化为小写。

GitHub Pages 工作流仍只负责 `main` 的构建与发布，迁移分支不推送。部署流程固定使用
Node `22.12.0`、pnpm `9.14.4` 与 frozen lockfile。

## 已知告警

- `moments` 与 `series` 集合目前为空，因此 Shirone 会发出非阻断的空集合提示。
- 一篇 Tailwind 教程中的演示代码仍包含 `/img/hero.png`、`/hero.jpg` 等示例路径，构建会提示
  无法解析这些示例资源；它们不是站点导航或主题默认资源，文章正文未被改写。
- 部分上游 MDX 依赖会产生 `MODULE_LEVEL_DIRECTIVE` 警告，不影响静态输出。
- 本次只做本地构建与本地路由验收，不向 GitHub 推送，也不把线上 Pages 状态当作本地构建证据。

# 公开知识库维护规范

这个仓库同时是博客源码、公开 Markdown 知识库和 Blog Vault。仓库是公开的：任何进入这里的内容都必须按“公开内容”处理。私人日记、聊天记录、密码、Token、Cookie、API Key、公司内部资料、未公开项目材料和学校内部敏感材料不能进入本仓库。

## 内容边界

- `src/content/posts/` 保存正式博客文章，强调发布时间、阅读体验、RSS 和首页时间流。
- `src/content/notes/` 保存可以持续补充的公开知识，强调 `updated`、分类、关系和检索。
- `src/content/spec/` 保存站点所需的特殊内容，例如关于页面。
- 私人草稿和不可公开材料放在独立的 Personal Vault，不通过本仓库同步。

旧文章保留原有路径，不为了整齐而批量迁移。新的学习知识默认进入 Notes；只有成熟、完整且值得单独阅读的内容才整理成 Post。

## Notes 目录、命名与 URL

Notes 使用稳定、可读、少变动的文件名和目录。目录表达领域，不表达临时学习日期；Git 历史负责版本。

```text
src/content/notes/
├── 408/
│   └── network/
│       └── TCP三次握手.md
├── math/
└── engineering/
    └── java/
```

Note 的 URL 由相对 `src/content/notes/` 的路径生成，例如：

```text
/notes/408/network/TCP三次握手/
```

重命名文件会改变 URL。重命名前先判断是否需要保留旧链接，并在必要时单独设计重定向；不要仅为 URL 美观批量重命名。

## Frontmatter

每个 Note 都必须有以下字段：

```yaml
---
title: TCP 三次握手
created: 2026-09-19
updated: 2026-09-19
description: TCP 建立连接的过程、目的以及为什么不能只握手两次
tags:
  - 408
  - 计算机网络
  - TCP
category: 计算机网络
status: learning
draft: false
---
```

规则：

- 首次创建时同时设置 `created` 和 `updated`；之后只更新 `updated`。
- `status` 只使用 `seed`、`learning`、`reviewed`、`stable`，它表示知识成熟度，不表示任务状态。
- 一般使用 2–5 个稳定标签；不要为同一个概念创建同义重复标签。
- 优先用正文中的标准 Markdown 链接表达知识关系，不依赖 Obsidian 专有的 `[[wikilink]]`。
- `draft: true` 只是不在生产站点显示，不代表源码私密；公开仓库中的草稿仍然是公开源码。

Posts 继续使用既有的 `published` / `updated` Schema；历史文章中的 `author` 已纳入 Schema 兼容范围，不要求批量改写。

## “记一下”写入协议

只有用户明确说“记一下”“整理成笔记”“发布成文章”或同等明确意图时，ChatGPT/Agent 才可以准备写入公开仓库。普通问答、私人内容和不确定是否公开的内容不得自动写入。

写入前：

1. 判断内容是否适合公开。
2. 获取 GitHub `main` 上的最新文件，不使用对话中的旧副本直接覆盖。
3. 搜索现有 Note，优先增量更新主题相同的 Note，不要“一题一文件”。
4. 保留原有正文和 `created`，只补充确认过的知识并更新 `updated`。
5. 检查标签、分类、相关链接和敏感信息。

写入后：

1. 只提交用户授权范围内的文件。
2. Commit message 使用 `notes(领域): 动词 + 内容` 或 `posts: 动词 + 内容`，例如 `notes(计网): 补充 TCP 三次握手`。
3. 不自动 push 私人内容，不自动处理冲突，不自动覆盖本地未提交编辑。

## 本地同步

```bash
pnpm sync
```

同步器只允许在正确的公开博客仓库、`main` 分支和 clean working tree 上运行。它会 fetch `origin`，相同则结束，仅 behind 则 fast-forward；ahead 或 diverged 会停止并要求人工处理。它不会 stash、merge、rebase、reset、checkout、force push、自动解决冲突、创建 commit 或 push。

本地编辑建议：

```text
pnpm sync
→ Obsidian / VS Code 编辑
→ 检查公开边界和 Markdown 链接
→ pnpm dev 预览
→ commit
→ 人工 push
```

`.obsidian` 中的窗口布局是设备状态，不应被同步器自动处理。当前 Obsidian Git 的自动 commit、pull、push 均保持关闭；跨设备切换使用显式 `pnpm sync`。

## 图片与附件

现有文章的图片路径保持不动。新 Notes 的公开图片暂统一放在 `public/img/notes/` 下，并使用站点绝对路径 `/img/notes/...`；文件名保持稳定、可读，不包含密码或临时导出信息。需要在 Obsidian 和 GitHub 预览中都保持更强可移植性时，再单独评估共置附件方案，不在首轮批量迁移旧图片。

## 常用命令

```bash
pnpm sync   # 安全同步 GitHub main
pnpm dev    # 本地预览
pnpm build  # Astro 构建并生成 Pagefind 索引
```

公开站点是 `https://17356085.github.io/`。GitHub Actions 负责构建和 GitHub Pages 发布；本地构建成功不等于线上发布已经完成，发布后仍需检查站点、RSS、Sitemap、Notes 路由和搜索。

## 回滚原则

优先用 Git 历史回滚由本次变更产生的 commit；不要 reset 或覆盖其他人的未提交修改。若同步遇到 dirty、ahead 或 diverged，先保存并审查本地差异，再由用户决定 merge、rebase 或恢复路径。

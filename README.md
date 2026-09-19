# mio 的小窝

这是 `17356085.github.io` 的个人知识管理站点，当前使用 Astro 与
[Shirone](https://github.com/LyraVoid/Shirone) 的 npm package mode 构建。

## 内容边界

- `src/content/posts/`：公开博客文章，生产构建会过滤 `draft: true`。
- `src/content/notes/`：公开知识库笔记，与 Obsidian 工作区内容分开管理。
- `src/content/spec/`：站点说明与公开约束材料。
- `public/`：站点静态资源、验证文件与 robots.txt。
- `shirones/config/`：主题配置与音乐等数据覆盖，不把 Shirone 源码 vendoring 到仓库。

## 本地命令

```text
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm type-check
pnpm check:manifest
pnpm build
pnpm check:output
pnpm preview
```

构建会在 Astro 输出完成后生成 `dist/pagefind/` 搜索索引。迁移说明、URL 兼容性、
Giscus 配置和已知构建告警见 [docs/shirone-migration.md](docs/shirone-migration.md)。

## 发布约束

GitHub Pages 工作流只在 `main` 的 push 或手动触发时发布。本地迁移分支不会自动推送，
`.obsidian/workspace.json` 也不属于站点发布内容。

# mio 的小窝

这是 [mio 的个人博客](https://17356085.github.io/)，也是一套公开的个人知识管理站点。

这里记录编程学习、项目实践、阅读、番剧和生活里的片段。博客源码、公开文章和公开知识笔记都以 Markdown 为中心，使用 Git 管理，最后通过 GitHub Pages 发布。

> 这里不是一个主题演示站，也不是一份包装好的简历。它更像是一座会持续生长的个人数字花园：有已经整理好的文章，也有仍在补充的笔记。

## 站点地址

- 主页：[https://17356085.github.io/](https://17356085.github.io/)
- GitHub：[17356085/17356085.github.io](https://github.com/17356085/17356085.github.io)
- 内容入口：主页、归档、Notes、Anime、友链和关于页面

## 内容结构

```text
src/content/
├── posts/              # 正式博客文章、教程、项目记录、阅读文章
├── notes/              # 可以持续补充的公开知识笔记
├── spec/about.md       # 关于页面
└── ...

shirones/config/
├── siteConfig.ts       # 站点标题、描述、主题等
├── profileConfig.ts    # 头像、名称、个人简介、社交链接
├── navBarConfig.ts     # 导航栏
├── animeConfig.ts      # Anime 页面和数据源配置
└── data/
    ├── friends.ts      # 友链数据
    └── ...              # 音乐、Anime 快照等站点数据

scripts/
├── media/              # 图片审计、迁移、检查与上传
├── sync-bangumi.mjs    # Bangumi 收藏同步
└── sync-blog.mjs       # 公开博客主干同步
```

### Posts 与 Notes

- **Posts** 是相对完整的内容：技术文章、教程、项目总结、阅读文章和阶段复盘。
- **Notes** 是持续生长的知识单元：一个概念、一堂课、一道题，或者暂时还没有完全想明白的问题。
- Note 可以经过多次补充、验证后整理成 Post，也可以一直保持短小。
- `draft: true` 只代表生产站点不显示，不代表源码私密；公开仓库中的草稿仍然是公开内容。

仓库是公开的。私人日记、聊天记录、密码、Token、Cookie、API Key、公司内部材料、未公开项目材料和学校内部敏感信息都不能进入这里。

## 技术栈

- [Astro](https://astro.build/)：静态站点生成
- [Svelte](https://svelte.dev/)：局部交互组件
- [Shirone](https://github.com/LyraVoid/Shirone) / `shirones@0.1.4`：主题与站点能力
- TypeScript：配置、脚本和类型检查
- Pagefind：构建期全文搜索
- Cloudflare R2：文章和知识库图片存储
- GitHub Actions + GitHub Pages：自动检查与发布

主题采用 npm package mode。仓库只维护自己的内容和 `shirones/config/` 配置覆盖，不把 Shirone 上游源码复制进来。

## 本地开发

当前 CI 与 GitHub Pages 使用 Node `22.12.0` 和 pnpm `9.14.4`。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

开发服务器启动后访问 `http://127.0.0.1:4321/`。如果端口被占用，Astro 会自动选择下一个可用端口。

常用检查和构建命令：

```bash
pnpm check             # Astro 内容与组件检查
pnpm type-check        # TypeScript 检查
pnpm check:manifest    # 检查站点 manifest
pnpm build             # 构建站点并生成 Pagefind 索引
pnpm check:output      # 检查生成路由、内容、图片和搜索输出
pnpm preview           # 预览 dist 构建结果
```

完整迁移说明、URL 兼容性和已知构建告警见 [`docs/shirone-migration.md`](docs/shirone-migration.md)。

## 日常写作

### 新建文章

可以使用脚本创建文章骨架：

```bash
pnpm new-post -- "文章文件名"
```

文件会生成在 `src/content/posts/`。文章继续使用已有的 `published` / `updated` Schema；写完后检查标题、描述、标签、分类、草稿状态和图片引用。

文章模板见 [`templates/博客文章模板.md`](templates/博客文章模板.md)。知识笔记模板见 [`templates/知识笔记模板.md`](templates/知识笔记模板.md)。

### Obsidian 本地写作

1. 在 Obsidian 中编辑公开文章或 Note。
2. 复制图片后直接粘贴到文章中。
3. Image auto upload 插件会调用本机 PicGo Server。
4. PicGo 将图片上传到 Cloudflare R2，并把公共 URL 写回 Markdown。
5. 使用 `pnpm dev` 预览，确认正文、图片、链接和 frontmatter。

PicGo Server 默认地址为 `http://127.0.0.1:36677/upload`。PicGo 需要保持运行，但写作时不需要手动打开 PicGo 上传每张图片。

### ChatGPT / Agent 带笔写作

GPT/Agent 不把图片或音频复制进仓库，而是直接调用仓库的上传脚本写入 Cloudflare R2：

```bash
pnpm media:upload -- <媒体路径> --category posts --json
```

`--category` 只允许以下五种值：

```text
posts   文章正文和封面
notes   知识笔记
anime   Anime 页面图片
site    网站背景、头像、图标
music   音乐文件和音乐封面
```

上传脚本会校验公共 URL，并输出可以直接粘贴到 Markdown 的结果。它优先读取本机 PicGo 的 S3 配置，也可以使用以下环境变量：

```text
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT
R2_PUBLIC_BASE_URL
```

密钥只放在本机配置或环境变量中，禁止写入仓库、文章、截图和提交记录。

### 图片目录规则

R2 对象键固定使用以下目录：

```text
images/posts/    # 文章正文、文章封面
images/notes/    # 知识笔记
images/anime/    # 动漫图片
images/site/     # 网站背景、头像、图标
images/music/    # 音乐文件和音乐封面
blog/            # 旧资源目录，等待引用迁移完成后再处理
```

对象名使用内容哈希，例如 `images/posts/<md5>.<ext>`。音乐资源建议使用同一曲目目录，例如 `images/music/mahoyo/main-theme.mp3` 与 `images/music/mahoyo/cover.webp`。新的上传流程禁止生成 `images/YYYY/MM/`，也不要在仓库中重新堆积正文图片、封面或音乐文件。

### 媒体硬约束

- 本地写作只能走 `Obsidian Image auto upload → PicGo → Cloudflare R2`；不能把本地图片、音频或封面路径直接提交到文章或站点配置。
- GPT/Agent 写作只能走 `pnpm media:upload` 直传 Cloudflare R2，再把返回的公共 URL 写入 Markdown 或配置。
- 音乐文件和音乐封面都必须放在 R2 的 `images/music/<曲目>/` 下；音乐配置只能引用 R2 URL。现有头像等历史站点资源按迁移计划逐步处理。
- `pnpm media:policy -- --staged` 已接入提交钩子，GitHub Actions 也会执行全量检查；发现本地媒体引用或不合规音乐路径时会阻止提交/构建。
- 旧文章中的外部示例图片、教程代码中的示例路径和 Bangumi 缓存属于兼容边界；新增或修改的正文、封面和音乐资源不适用这些例外。

图片相关命令：

```bash
pnpm media:audit                 # 盘点本地图片、远程图片、重复文件和未解析引用
pnpm media:migrate               # 上传并精确改写活动引用
pnpm media:check                 # 检查清单、旧引用、哈希和公共 URL
pnpm media:policy -- --staged    # 提交前检查本地媒体和音乐 R2 约束
pnpm media:migrate -- --prune    # 校验通过后再清理已完成迁移的本地源文件
```

默认不要使用 `--prune`。先完成上传、引用改写、构建和检查，再决定是否清理本地源文件。

## Anime 页面

Anime 页面使用 Bangumi 快照模式，生产数据来自 `shirones/config/data/anime-snapshots/bangumi.json`，不会在页面运行时直接请求外部 API。

```bash
pnpm anime:sync
```

同步器固定读取 Bangumi 用户 `657838`，分页抓取收藏并校验用户标识、非空结果、外链、状态、评分和观看进度。同步失败、超时、返回无效 JSON 或空结果时，会保留上一份有效快照。

因此，Anime 页面既可以在构建时稳定生成，也不会因为 Bangumi 临时不可用而清空线上收藏数据。

## 页面和配置怎么改

- 关于页：`src/content/spec/about.md`
- 站点标题、描述和主题：`shirones/config/siteConfig.ts`
- 头像、名称、简介和社交链接：`shirones/config/profileConfig.ts`
- 导航栏：`shirones/config/navBarConfig.ts`
- 友链：`shirones/config/data/friends.ts`
- Anime 数据源与开关：`shirones/config/animeConfig.ts`
- 侧栏组件：`shirones/config/sidebarConfig.ts`
- 音乐：`shirones/config/musicConfig.ts` 与 `shirones/config/data/music.ts`

修改配置时优先改 `shirones/config/` 覆盖文件，不要直接修改 `node_modules` 中的 Shirone 源码。

## 同步、提交和发布

公开博客的 Git 主干是 `main`。日常切换设备前，可以使用：

```bash
pnpm sync
```

`pnpm sync` 只负责安全同步 GitHub `origin/main`：它会检查仓库、远程、分支和工作区状态；本地落后时只执行 fast-forward 更新，不会自动 stash、merge、rebase、reset、checkout、创建提交或 push。

首次在本机启用仓库自带的提交钩子：

```bash
pnpm hooks:install
```

启用后，当一次提交包含 `src/content/posts/`、`src/content/notes/` 或 `src/content/spec/` 文件时，`pre-commit` 会自动先 `fetch origin`。如果远程领先且路径不冲突，它会临时保存本地 staged/unstaged/untracked 改动，fast-forward 到最新 `origin/main`，再恢复本地改动并继续提交。如果远程改动与本地路径重叠、发生分叉、fetch 失败或恢复失败，提交会被阻止；它不会自动解决冲突、reset、覆盖或 push。

推荐流程：

```text
pnpm sync
→ Obsidian / VS Code 编辑
→ 检查公开边界、frontmatter 和 Markdown 链接
→ pnpm dev 预览
→ pnpm check / pnpm type-check / pnpm build
→ 只提交本次明确授权的文件
→ 人工 push 到 main
```

GitHub Actions 只在 `main` push 或手动触发时发布 GitHub Pages。发布流程会安装依赖、同步 Anime 快照、运行检查、构建站点并检查生成产物。

本地构建成功不等于线上发布已经完成。推送后仍应检查：

- 主页和关于页
- Posts 与 Notes 列表、详情页和旧链接
- Anime 页面和图片加载
- RSS、Atom、Sitemap
- Pagefind 搜索
- GitHub Actions 与 GitHub Pages 部署状态

`.obsidian/workspace.json` 是本地窗口布局，不属于站点发布内容；不要把它和博客内容一起提交。

## 相关文档

- [`docs/knowledge-system.md`](docs/knowledge-system.md)：公开知识库、Markdown、Obsidian 与图片工作流
- [`docs/shirone-migration.md`](docs/shirone-migration.md)：Shirone 迁移、URL 兼容性和已知告警
- [`CONTRIBUTING.md`](CONTRIBUTING.md)：贡献说明
- [`templates/博客文章模板.md`](templates/博客文章模板.md)：文章模板
- [`templates/知识笔记模板.md`](templates/知识笔记模板.md)：知识笔记模板

## 许可与致谢

本站基于 [Shirone](https://github.com/LyraVoid/Shirone) 与 [shirones](https://github.com/yCENzh/shirones) 构建，感谢开源项目和所有维护者。

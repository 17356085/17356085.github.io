# 博客 Live2D 维护与发布

## 文件职责

| 位置 | 职责 | 发布范围 |
| --- | --- | --- |
| `public/live2d/whale-maid/` | 唯一模型包：MOC、纹理、物理、参数显示信息、六组动作 | 随静态站点部署 |
| `public/live2d/whale-maid/fallback/` | WebGL 或模型加载失败时的精灵图后备 | 随静态站点部署 |
| `public/live2d/vendor/` | 官方 Cubism Core 压缩运行文件及许可文件 | 随静态站点部署 |
| `src/components/WhaleMascot.astro` | 布局、问候、小工具、休息和弹窗避让 | 应用源码 |
| `src/scripts/whale-live2d.ts` | Core 加载、WebGL 绘制、运动时钟和动作衔接 | 应用源码 |
| `src/scripts/whale-live2d-motion.ts` | motion3 读取和采样 | 应用源码 |
| `src/scripts/whale-live2d-physics.ts` | physics3 读取和计算，保留 Live2D 版权声明 | 应用源码 |
| `src/scripts/whale-live2d-secondary.ts` | 当前模型的网页补充运动 | 应用源码 |
| `src/layouts/MainGridLayout.astro` | 全站挂载助手 | 应用源码 |
| `docs/live2d/` | 维护说明、官方来源和发布资源清单 | 版本管理，非 public 资源 |
| `artwork/whale-maid-live2d/` | 原画、PSD、CMO、历史候选、截图、工具和备份 | 本机档案，Git 与类型检查排除 |

原画和工程仍可在本地继续制作。制作档案不在 Git 中，长期保存需独立备份。

## 当前约定

- 模型地址固定为 `/live2d/whale-maid/whale-maid.model3.json`，应用使用站点 `url()` 工具处理 base。
- 没有独立公开预览包，也不再使用 `?whalePreview=smile` 切换模型；正常页与预览使用同一套资源。
- 桌面 260px，窄屏 120px；不显示名字、不默认播放声音；工具为打招呼、随机阅读、休息。
- 36 秒待机、鼠标靠近跟随和 wave / pet / greet 回应；连点只保留最新一次待执行回应。
- 搜索、图片灯箱及原生 dialog 打开时临时隐藏并暂停，不改变主动休息设置。
- 记住休息状态后刷新暂不加载模型；唤回时挂载。系统减少动态与页面不可见时暂停。
- 没有额外引入运行时依赖。

## 模型与来源

当前 MOC SHA-256 为 `c3c2da16f065ae8ac7cb46fa91ce883d6696eb837ad528fa54f8e8ff6a37d56e`。
原生模型已绑定部分头部、眼嘴眉、呼吸、头发、左手和尾巴参数；身体重心、右手、耳鳍、呆毛等运动还有网页网格补充。当前模型的嘴部开合和微笑也由同一哈希限定的网页补充校正：以中性网格驱动独立的嘴形，上唇固定后向下打开，嘴角、宽度和开合平滑变化。嘴的中心与角度从 FaceBase 当前网格取样，再与脸部共用头部和身体的补充运动，避免转头时独立嘴形偏离脸部。网页补充不等于在 Cubism 工程里新增了原生绑定。

### 当前嘴部素材

运行纹理的闭嘴图案已替换为无肤色补丁、无白边的浅弧线；张嘴图案改为柔和的圆角口腔，去掉白色牙齿横条。同时对 FaceBase 底图中残留的旧撅嘴进行肤色修补，避免独立嘴层透明时露出旧轮廓。源图案保存在 `mouth-art/closed.svg` 和 `mouth-art/open.svg`，纹理坐标见 `mouth-art/atlas-regions.json`。

本次仅改动纹理中列出的三处矩形，解码 RGBA 核对显示矩形外改动为零；MOC、PSD、CMO 工程未改写。它属于当前运行包的素材修正。重新从 Cubism 导出时，应重新核对 UV 和嘴形后移植修正，不能把这些固定坐标直接应用到新的纹理排布。

`whale-live2d-secondary.ts` 按当前 MOC 哈希启用。更新 MOC 时，应先检查新原生绑定是否覆盖补充运动，再决定更新哈希和补充层，避免重复驱动。

Core 来自用户提供的官方 `CubismSdkForWeb-5-r.5.zip`，Core 版本为 `06.00.0001`。`vendor-source.json` 保留原始归档条目、长度与哈希，文件名为初次提取时名称；CoreREADME 和 CoreCHANGELOG 已移到本目录。CoreCHANGELOG 文档副本去掉了一处行末空格以通过仓库格式门禁，原始来源哈希和副本哈希分别记录。该清单不包含个人下载目录的绝对路径。

官方 Core 与 SDK 许可文件保留于 `public/live2d/vendor/`，没有改写；物理源文件保留其 Live2D Open Software 版权和许可链接。这些第三方文件不由仓库根目录 LICENSE 重新授权。发布许可说明入口见 SDKLICENSE 中的官方链接。

## 资源清单

运行 `node scripts/live2d/generate-manifest.mjs` 生成 `docs/live2d/release-manifest.json`。
清单按稳定顺序记录运行资源和集成源码的大小与 SHA-256，并在写出前核对模型文件引用。它不记录 PSD、CMO、截图或个人绝对路径，也不表示已通过构建或正式部署。

## 首次发布范围

准备提交以下明确路径：

- `public/live2d/whale-maid/`
- `public/live2d/vendor/`
- `src/components/WhaleMascot.astro`
- `src/scripts/whale-live2d.ts`
- `src/scripts/whale-live2d-motion.ts`
- `src/scripts/whale-live2d-physics.ts`
- `src/scripts/whale-live2d-secondary.ts`
- `src/layouts/MainGridLayout.astro`
- `docs/live2d/`
- `scripts/live2d/generate-manifest.mjs`
- `.gitignore` 与 `tsconfig.json` 本次制作目录排除规则
- `astro.config.mjs` 中 `layouts/MainGridLayout` 注册所需改动；该文件的其他已有改动需单独核对

提交前先核对范围、远端状态和现有站点发布门禁。`.obsidian/workspace.json`、文章、本地 `.base` 文件及其他已有修改不属于本次 Live2D 整理。不要把整个工作区一起暂存。

本站已有 GitHub Pages 工作流会执行类型检查、媒体政策、构建和生成内容检查。推送后还需确认工作流与线上模型加载，不能将本地预览视为已上线。

## 本次整理

- 11 文件的旧预览包与当前模型包逐文件字节相同，已完整移入本地制作档案。
- 三张后备精灵图从 `public/img/` 移入模型包，移动前后哈希一致。
- 制作记录没有删除，正式模型、纹理、物理和六组动作没有改写。
- 发布准备状态及当前资源总量以同目录清单为准；本轮未提交、推送或部署。

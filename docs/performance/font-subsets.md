# Yozai Medium 字符分包

`scripts/fonts/prepare-yozai.mjs` 在 Astro 配置加载前生成 Yozai Medium 的本地
WOFF2 分包。源文件通过 `createRequire(import.meta.resolve("shirones"))` 从
`shirones/src/assets/fonts/Yozai-Medium.ttf` 解析，不会把原始 15 MB 字体复制到仓库。

生成器优先集中简体中文界面、配置字符串、公开文章卡片元信息和助手文案的字符，
再对 `src/content`、`shirones/config` 和 Shirones 的 `src/i18n` 按字符频率排序。
每包最多 256 个源字体 cmap 字符。`variants.json` 中每个变体都带有互斥的
`unicodeRange`；字体配置保持 `display: "swap"` 和 `preload: false`。Yozai 的
`fontConfig.subsetting.enable` 为 `false`，因此主题的单文件子集流程不会再次合并这些预分包。

当前源字体的生成统计：

- 25,977 个源 cmap 字符，102 个分包；
- 分包总计约 8.5 MB，最大单包约 111 KiB；总量随分组调整略有变化；
- 源字体 15,225,614 字节，首屏收益以浏览器实际请求的包数和字节为准；
- 逐包读取输出 cmap，并确认所有分配字符均存在、没有源字体之外的字符，联合覆盖与源 cmap 一致。

缓存清单写入 `src/assets/fonts/yozai/manifest.json`，依据源字体 SHA-256、字符分组 fingerprint
和分包大小复用已有 WOFF2。第一次逐包核对 cmap 后记录输出 SHA-256，缓存复用时
验证哈希；文件缺失或哈希不匹配会重新生成。临时文件包含进程 ID，避免开发配置
重载与生成命令同时写入时冲突。源文件或参与排序的文本发生变化时会重新生成；
从空的输出目录运行同一命令即可构建：

```powershell
node scripts/fonts/prepare-yozai.mjs
```

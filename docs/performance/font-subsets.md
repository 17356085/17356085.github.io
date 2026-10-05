# Yozai Medium 字符分包

`scripts/fonts/prepare-yozai.mjs` 在 Astro 配置加载前生成 Yozai Medium 的本地
WOFF2 分包。源文件通过 `createRequire(import.meta.resolve("shirones"))` 从
`shirones/src/assets/fonts/Yozai-Medium.ttf` 解析，不会把原始 15 MB 字体复制到仓库。

生成器扫描 `src/content`、`shirones/config` 和 Shirones 的 `src/i18n`，按字符频率排序，
每包最多 256 个源字体 cmap 字符。`variants.json` 中每个变体都带有互斥的
`unicodeRange`；字体配置保持 `display: "swap"` 和 `preload: false`。Yozai 的
`fontConfig.subsetting.enable` 为 `false`，因此主题的单文件子集流程不会再次合并这些预分包。

当前源字体的生成统计：

- 25,977 个源 cmap 字符，102 个分包；
- 分包总计 8,492,776 字节（约 8,293.7 KiB），最大单包 113,708 字节（约 111.0 KiB）；
- 源字体 15,225,614 字节，按总分包体积计算节省 44.22%；
- 逐包读取输出 cmap，并确认所有分配字符均存在、没有源字体之外的字符，联合覆盖与源 cmap 一致。

缓存清单写入 `src/assets/fonts/yozai/manifest.json`，依据源字体 SHA-256、字符分组 fingerprint
和分包大小复用已有 WOFF2。源文件或参与排序的文本发生变化时会重新生成；从空的输出目录运行同一命令即可构建：

```powershell
node scripts/fonts/prepare-yozai.mjs
```

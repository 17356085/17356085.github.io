import type { LlmsConfig } from "@/types/llmsConfig";
import { withUserConfig } from "@/utils/config-overlay.ts";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Shirone LLMs.txt 与 AI 友好内容系统配置指南
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 遵循「零额外负担」原则与 https://llmstxt.org/ 官方规范：
 * - 为大语言模型 (ChatGPT, Claude, Perplexity, Cursor 等) 提供结构化 Markdown 索引；
 * - 纯服务端静态生成 `/llms.txt`（精简索引）与 `/llms-full.txt`（全量正文汇编）；
 * - 客户端 JS 主包增加 0 KB，前台读者浏览速度 0 影响；
 * - 安全隔离：自动过滤密码保护文章 (encrypted: true) 与草稿 (draft: true)，绝不泄漏私密内容。
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 【自动化机制说明（平时写作无需维护本文件）】
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. 公开博客文章（Articles）：
 *    - 构建期系统自动调用 `getSortedPosts()` 扫描全站 Markdown 文件；
 *    - 自动提取每篇文章的标题、链接、简介与标签，无需手动登记！
 * 2. 站点基本信息：
 *    - 站点标题、副标题与简介默认自动继承 `siteConfig` 与 `profileConfig`；
 * 3. 正文脱敏与清洗：
 *    - `/llms-full.txt` 自动展开 `<llm-only>` AI 专属提示，自动剔除 `<llm-exclude>` 内容。
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 【常用配置场景】
 * ─────────────────────────────────────────────────────────────────────────────
 * 场景 A：使用默认配置（开箱即用，最推荐）
 *   - 保持下方默认配置即可，全站文章自动收录并生成 `/llms.txt` 与 `/llms-full.txt`。
 *
 * 场景 B：完全关闭 AI 检索端点
 *   - 将 `enable` 设置为 `false`（访问对应链接返回 404，不生成任何静态文件）。
 *
 * 场景 C：文章量极大时仅生成精简目录，不生成超长全文 dump
 *   - 将 `generateFull` 设置为 `false`（只生成 `/llms.txt`，跳过 `/llms-full.txt`）。
 *
 * 场景 D：防止某些私密标签被大模型检索
 *   - 在 `excludeTags` 中追加标签名，例如：`excludeTags: ["secret", "private", "diary"]`。
 *
 * 场景 E：内容仓（external 模式）覆盖
 *   - 在内容仓 `config/llms.yaml` 里只写想改的键即可（如 `siteSummary`、`excludeTags`）；
 *   - 合并规则为「对象递归合并，数组整体替换」，因此改 `corePages` / `customSections`
 *     需要把整个清单写全。契约见 `docs/content-separation/config-overlay.md`。
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const llmsConfig: LlmsConfig = withUserConfig("llms", {
	/**
	 * 是否启用 /llms.txt 与 /llms-full.txt 静态端点生成
	 * - true (默认): 构建期自动在 dist/ 输出纯文本 Markdown 文件；
	 * - false: 彻底禁用此功能，访问返回 404，不产生任何构建文件。
	 */
	enable: true,

	/**
	 * 是否同时生成包含全站公开文章完整正文的 /llms-full.txt 文件
	 * - true (默认): 将所有公开非加密文章的正文清洗后合并为一个文件，方便 AI 全量学习与 RAG 导入；
	 * - false: 仅生成目录索引 /llms.txt，不生成全量正文。
	 */
	generateFull: true,

	/**
	 * 站点在大模型眼中的自我介绍（可选）
	 * - 省略或留空时：自动回退使用 `siteConfig.subtitle` 或 `profileConfig.bio`；
	 * - 填写字符串时：优先使用此处的自定义英文/中文介绍覆盖默认值。
	 */
	siteSummary: "",

	/**
	 * 单篇文章在 /llms.txt 目录索引中的摘要截断字数上限（默认 200 字）
	 * - 超出长度时会自动在句尾添加省略号 "…"；
	 * - 不影响 /llms-full.txt 中的完整正文输出。
	 */
	descriptionMaxLength: 200,

	/**
	 * 敏感标签黑名单过滤（可选）
	 * - 凡是包含此列表中任意标签的文章，将同时从 /llms.txt 与 /llms-full.txt 中剔除；
	 * - 即使文章本身为公开状态（非加密），只要命中黑名单标签也绝不暴露给 AI 模型。
	 */
	excludeTags: ["secret", "private"],

	/**
	 * 敏感分类黑名单过滤（可选）
	 * - 凡是属于此分类的文章，将彻底从 LLM 产物中排除。
	 */
	excludeCategories: [],

	/**
	 * 核心引导页面清单（Core Pages）
	 * - 向大模型重点介绍站点的核心栏目与功能入口；
	 * - 可填写站内相对路径（如 "/about/"）或外部完整 URL；
	 * - 省略或设为空数组 [] 时，系统会自动使用默认核心页面。
	 */
	corePages: [
		{
			title: "Home",
			url: "/",
			description: "Main blog entrance and latest post stream.",
		},
		{
			title: "About",
			url: "/about/",
			description: "Author profile, technical stack, and background.",
		},
		{
			title: "Archive",
			url: "/archive/",
			description: "Chronological index of all published writings.",
		},
	],

	/**
	 * 自定义扩展章节（可选）
	 * - 用于向 AI Agent 额外推荐外部开源项目、API 文档或衍生资源；
	 * - 默认为空数组 []，不输出额外章节。
	 *
	 * 示例：
	 * ```ts
	 * customSections: [
	 *   {
	 *     title: "Open Source Projects",
	 *     description: "Featured open source repositories maintained by the author.",
	 *     items: [
	 *       { title: "Shirone Theme", url: "https://github.com/LyraVoid/Shirone", description: "M3E blog theme for Astro." },
	 *     ],
	 *   },
	 * ]
	 * ```
	 */
	customSections: [],
});

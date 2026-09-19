import type { FabConfig } from "@/types/fabConfig";
import { withUserConfig } from "@/utils/config-overlay.ts";

/**
 * 右下角悬浮控制流（FAB）导航配置。
 *
 * 【核心配置项】
 * - enable：是否开启悬浮操作栏；
 * - align："start"（靠左）| "end"（靠右，默认）；
 * - size："small" | "regular"（默认）| "large"；
 * - offset：右下角边距（支持 CSS 变量或具体像素）；
 * - items：操作按钮清单（按数组顺序渲染）：
 *   - type: "top" —— 平滑返回顶部按钮（滚过横幅后自动浮现）；
 *   - type: "toc" —— 悬浮文章目录面板（桌面端已有侧栏粘性 TOC，默认仅在 mobile/tablet 显示）；
 *   - type: "comment" —— 直达评论区按钮（评论系统关闭或文章关闭评论时零 DOM 产物）；
 *   - type: "home" —— 返回首页按钮（onlySubPages: true 表示仅在非首页展示）；
 *   - devices：受控设备矩阵（"mobile" | "tablet" | "desktop"），省略表示全设备生效；
 *   - pages：页面范围过滤（如 ["post"]）。
 *
 * 架构规范见 docs/fab-system.md。
 */
export const fabConfig: FabConfig = withUserConfig("fab", {
	enable: true,
	align: "end",
	size: "regular",
	offset: {
		bottom: "var(--m3e-space-8)",
		right: "var(--m3e-space-6)",
	},
	items: [
		{
			type: "top",
			enable: true,
			devices: ["mobile", "tablet", "desktop"],
		},
		{
			type: "toc",
			enable: true,
			devices: ["mobile", "tablet"],
			pages: ["post"],
			depth: 3,
			closeOnSelect: true,
		},
		{
			type: "comment",
			enable: true,
			devices: ["mobile", "tablet"],
			pages: ["post"],
		},
		{
			type: "home",
			enable: true,
			devices: ["mobile", "tablet"],
			onlySubPages: true,
		},
	],
});

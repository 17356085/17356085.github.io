import type { PostCardWidth, PostListConfig } from "@/types/postListConfig";
import { withUserConfig } from "@/utils/config-overlay.ts";

/**
 * 文章列表页配置：分页大小与排版布局。
 *
 * 【核心配置项】
 * - pageSize：每页展示的文章数量（默认 8 篇）；
 * - layout：
 *   - mode："list"（经典纵向列表）| "grid"（双列/三列卡片网格）；
 *   - cover："left"（封面在左）| "right"（封面在右，默认）；
 *   - cardWidth（仅在 grid 模式下生效）：
 *     - "compact"：紧凑卡片（最小宽 20rem，适合高密度展示）；
 *     - "regular"：标准卡片（最小宽 24rem，默认推荐）；
 *     - "relaxed"：宽松大卡（最小宽 28rem，突出大图）。
 *
 * 注意：访客可在前端显示设置面板中动态切换 list/grid，此处为站点初始默认值。
 * GridUI 仅在主内容容器至少能容纳两张所选宽度的卡片时生效；侧栏等因素压窄
 * 内容后会暂时回退 ListUI，但保留 grid 偏好，空间恢复后自动切回。
 */
export const postListConfig: PostListConfig = withUserConfig("postList", {
	pageSize: 8,
	layout: {
		mode: "list",
		cover: "right",
		cardWidth: "regular",
	},
});

/** grid 档位 → 卡片最小宽度（--post-card-min 预设，与 shape/type 分档哲学同构）。
    页面框架 90rem：regular 24rem 保证宽屏为 2 列大卡（3 列窄卡会让
    日期/分类/字数元信息行换行），compact 才给密排选项。 */
export const POST_CARD_MIN_WIDTH: Record<PostCardWidth, string> = {
	compact: "20rem",
	regular: "24rem",
	relaxed: "28rem",
};

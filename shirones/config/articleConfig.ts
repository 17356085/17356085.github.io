import type { ArticleConfig } from "@/types/articleConfig";
import { withUserConfig } from "@/utils/config-overlay.ts";

/**
 * 文章详情页配置。
 */
export const articleConfig: ArticleConfig = withUserConfig("article", {
	lastUpdated: {
		// 关闭后不渲染最后更新提示。
		enable: true,
		// 按 UTC 日历日计算；达到该天数当天开始显示，0 表示立即显示。
		minimumAgeDays: 90,
	},
	discovery: {
		// 总开关关闭后不计算、不渲染文章尾部的延伸阅读区域。
		enable: true,
		related: {
			// 只展示至少共享一个标签或分类的文章。
			enable: true,
			count: 3,
		},
		random: {
			// 按当前文章标识稳定抽样；同一构建中的结果不会随刷新变化。
			enable: true,
			count: 2,
		},
	},
	share: {
		// 关闭后不渲染文章尾部的分享区块，不引入客户端水合。
		enable: true,
		// 生成海报时是否默认包含文章封面（封面不可用时自动降级为无封面排版）。
		includeCover: true,
	},
});

const MAX_DISCOVERY_COUNT = 6;

export interface ArticleDiscoveryOptions {
	relatedCount: number;
	randomCount: number;
}

export interface ArticleShareOptions {
	includeCover: boolean;
}

export function normalizeDiscoveryCount(value: number): number {
	return Number.isFinite(value)
		? Math.min(MAX_DISCOVERY_COUNT, Math.max(0, Math.floor(value)))
		: 0;
}

export function resolveArticleDiscoveryOptions(
	config: Pick<ArticleConfig, "discovery">,
): ArticleDiscoveryOptions | null {
	if (!config.discovery.enable) return null;

	const relatedCount = config.discovery.related.enable
		? normalizeDiscoveryCount(config.discovery.related.count)
		: 0;
	const randomCount = config.discovery.random.enable
		? normalizeDiscoveryCount(config.discovery.random.count)
		: 0;

	return relatedCount > 0 || randomCount > 0
		? { relatedCount, randomCount }
		: null;
}

export function resolveArticleShareOptions(
	config: Pick<ArticleConfig, "share">,
): ArticleShareOptions | null {
	if (!config.share.enable) return null;
	return { includeCover: config.share.includeCover };
}

export function resolveLastUpdatedNoticeOptions(
	config: Pick<ArticleConfig, "lastUpdated">,
): ArticleConfig["lastUpdated"] | null {
	return config.lastUpdated.enable ? config.lastUpdated : null;
}

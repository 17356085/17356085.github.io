/**
 * 番剧收藏数据（本地数据源）。
 * 用于番剧页：src/pages/anime.astro → organisms/AnimeSection → molecules/AnimeCard。
 *
 * 添加条目：在 animeData 中追加一项即可，状态筛选 chips 与计数自动生成。
 * - cover 省略时卡片显示主题色渐变占位（补图前不破版）；
 * - link 省略时封面不可点；rating 为 0-10 个人评分；
 * - progress 是结构化追番进度，watching 状态在卡片上渲染进度条。
 * JSON 数据源（外部收藏服务拉取）见 utils/anime-data.ts 的 AnimeSource 分发。
 */

import type { AnimeIdentity } from "@/types/animeConfig.ts";

/** 收藏状态（Bangumi 领域通行五态） */
export type AnimeStatus =
	| "watching"
	| "completed"
	| "planned"
	| "onHold"
	| "dropped";

export interface AnimeItem {
	title: string;
	/** 封面图地址（相对 /public 或绝对 URL）；省略 = 渐变占位 */
	cover?: string;
	/** 条目外链（Bangumi/官方站等）；省略则封面不可点 */
	link?: string;
	status: AnimeStatus;
	/** 个人评分 0-10 */
	rating: number;
	/** 追番进度：已看 / 总集数（未知时可选省略） */
	progress?: { watched: number; total: number };
	/** 一句话感想 */
	description?: string;
	/** 放送年份（展示用） */
	year: string;
	/** 制作公司 */
	studio?: string;
	/** 题材标签 */
	genres: string[];
	/** 观看时间段（年-月） */
	period?: { start: string; end: string };
	/** 条目来源身份标识（可选，用于跨源去重与归档） */
	identity?: AnimeIdentity;
}

/**
 * 本地回退数据保持为空；生产页使用
 * shirones/config/data/anime-snapshots/bangumi.json 的 Bangumi 快照。
 *
 * 快照同步失败时只保留上一份有效快照，不猜测、不填入 Shirone 的示例条目。
 */
export const animeData: AnimeItem[] = [];

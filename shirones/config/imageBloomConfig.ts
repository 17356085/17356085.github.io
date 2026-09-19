/**
 * Tonal Bloom（色调辉光占位）默认配置。
 * 与 M3E HCT 色彩系统同源，为全站图片提供防抖动尺寸占位与色彩过渡体验。
 */
import type { ImageBloomConfig } from "@/types/imageBloomConfig";
import { withUserConfig } from "@/utils/config-overlay.ts";

export const imageBloomConfig: ImageBloomConfig = withUserConfig("imageBloom", {
	enable: true,
	blurRadius: 20,
	opacity: 0.7,
	transitionDuration: 300,
});

export function resolveImageBloomOptions(
	config: Partial<ImageBloomConfig> = imageBloomConfig,
): ImageBloomConfig {
	return {
		enable: config.enable ?? true,
		blurRadius: config.blurRadius ?? 20,
		opacity: config.opacity ?? 0.7,
		transitionDuration: config.transitionDuration ?? 300,
	};
}

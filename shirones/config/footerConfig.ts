import type { FooterConfig } from "@/types/footerConfig";
import { withUserConfig } from "@/utils/config-overlay.ts";

/**
 * 页脚自定义 HTML 注入配置。
 * 开启后将读取 src/config/FooterConfig.html 文件内容并注入到页脚版权信息上方。
 * 关闭时（enable: false）零额外 DOM 占位、零文件读取开销。
 */
export const footerConfig: FooterConfig = withUserConfig("footer", {
	enable: false,
});

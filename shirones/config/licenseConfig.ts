import type { LicenseConfig } from "@/types/config";
import { withUserConfig } from "@/utils/config-overlay.ts";

/**
 * 文章版权声明（文章页 License 区块消费）。类型见 src/types/config.ts。
 */
export const licenseConfig: LicenseConfig = withUserConfig("license", {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
});

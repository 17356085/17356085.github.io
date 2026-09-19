import type { CompassConfig } from "@/types/compassConfig.ts";
import { withUserConfig } from "@/utils/config-overlay.ts";

export const compassConfig: CompassConfig = withUserConfig("compass", {
	enable: false,
	title: "$t:compass",
	description: "$t:compassBanner",
});

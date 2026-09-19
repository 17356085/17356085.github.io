import type { MomentsConfig } from "@/types/momentsConfig.ts";
import { withUserConfig } from "@/utils/config-overlay.ts";

export const momentsConfig: MomentsConfig = withUserConfig("moments", {
	enable: false,
	title: "$t:moments",
	description: "$t:momentsBanner",
});

import type { FriendsConfig } from "@/types/friendsConfig.ts";
import { withUserConfig } from "@/utils/config-overlay.ts";

export const friendsConfig: FriendsConfig = withUserConfig("friends", {
	enable: false,
	title: "$t:friends",
	description: "$t:friendsBanner",
});

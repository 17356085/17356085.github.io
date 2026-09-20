import { spawnSync } from "node:child_process";

const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
	cwd: process.cwd(),
	encoding: "utf8",
	shell: false,
	windowsHide: true,
});

if (result.status !== 0) {
	const detail = String(result.stderr ?? result.error?.message ?? "").trim();
	console.error("Git hooks 安装失败。" + (detail ? "\n" + detail : ""));
	process.exitCode = 1;
} else {
	console.log("Git hooks 已启用：core.hooksPath=.githooks");
}

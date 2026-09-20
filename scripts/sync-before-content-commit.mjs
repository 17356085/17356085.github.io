import { spawnSync } from "node:child_process";
import path from "node:path";

const REQUIRED_BRANCH = "main";
const EXPECTED_ORIGIN_URLS = new Set([
	"https://github.com/17356085/17356085.github.io",
	"git@github.com:17356085/17356085.github.io",
	"ssh://git@github.com/17356085/17356085.github.io",
]);
const CONTENT_PREFIXES = [
	"src/content/posts/",
	"src/content/notes/",
	"src/content/spec/",
];

function runGit(args) {
	const result = spawnSync("git", args, {
		cwd: process.cwd(),
		encoding: "utf8",
		shell: false,
		windowsHide: true,
	});

	return {
		ok: result.status === 0,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		status: result.status,
		error: result.error,
	};
}

function commandName(args) {
	return "git " + args.join(" ");
}

function reportFailure(action, args, result) {
	console.error("提交前同步已停止：" + action + "失败。");

	const stderr = String(result.stderr).trim();
	if (stderr) {
		console.error(stderr.length > 2000 ? stderr.slice(0, 2000) + "…" : stderr);
	} else if (result.error) {
		console.error(commandName(args) + "：" + result.error.message);
	} else if (result.status !== null && result.status !== undefined) {
		console.error(commandName(args) + " 退出码：" + result.status);
	}
}

function normalizePath(value) {
	const normalized = value.replaceAll("\\", "/").replace(/^\.\/+/, "");
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function parseNulSeparatedNames(raw) {
	return raw
		.split("\0")
		.filter(Boolean)
		.map(normalizePath)
		.filter(Boolean);
}

function parseStatusNames(raw) {
	const entries = raw.split("\0");
	const names = [];

	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (!entry) {
			continue;
		}

		const status = entry.slice(0, 2);
		const name = entry.length > 3 ? entry.slice(3) : "";
		if (name) {
			names.push(normalizePath(name));
		}

		if ((status.includes("R") || status.includes("C")) && entries[index + 1]) {
			index += 1;
			names.push(normalizePath(entries[index]));
		}
	}

	return names.filter(Boolean);
}

function pathKey(value) {
	return normalizePath(value);
}

function isContentPath(filePath) {
	return CONTENT_PREFIXES.some((prefix) =>
		normalizePath(filePath).startsWith(prefix),
	);
}

function samePath(left, right) {
	return pathKey(left) === pathKey(right);
}

function verifyRepository() {
	const rootArgs = ["rev-parse", "--show-toplevel"];
	const root = runGit(rootArgs);
	if (!root.ok) {
		reportFailure("确认 Git 仓库根目录", rootArgs, root);
		return false;
	}

	const current = path.resolve(process.cwd());
	const repositoryRoot = path.resolve(root.stdout.trim());
	const normalizeForCompare = (value) =>
		process.platform === "win32" ? value.toLowerCase() : value;

	if (normalizeForCompare(current) !== normalizeForCompare(repositoryRoot)) {
		console.error("提交前同步已停止：Git hook 没有在仓库根目录运行。");
		return false;
	}

	const branchArgs = ["branch", "--show-current"];
	const branch = runGit(branchArgs);
	if (!branch.ok) {
		reportFailure("确认当前分支", branchArgs, branch);
		return false;
	}

	if (branch.stdout.trim() !== REQUIRED_BRANCH) {
		console.error(
			"提交前同步已停止：当前分支为 " +
				(branch.stdout.trim() || "detached HEAD") +
				"，只允许 main。",
		);
		return false;
	}

	const originArgs = ["config", "--get-all", "remote.origin.url"];
	const origin = runGit(originArgs);
	if (!origin.ok) {
		reportFailure("读取 origin URL", originArgs, origin);
		return false;
	}

	const urls = origin.stdout
		.split(/\r?\n/)
		.map((value) => value.trim().replace(/\.git$/i, ""))
		.filter(Boolean);

	if (!urls.some((url) => EXPECTED_ORIGIN_URLS.has(url))) {
		console.error(
			"提交前同步已停止：origin 不是受保护的 17356085/17356085.github.io 仓库。",
		);
		return false;
	}

	return true;
}

function readStagedPaths() {
	const args = [
		"-c",
		"core.quotePath=false",
		"diff",
		"--cached",
		"--name-only",
		"-z",
	];
	const result = runGit(args);
	if (!result.ok) {
		reportFailure("读取暂存区文件", args, result);
		return null;
	}
	return parseNulSeparatedNames(result.stdout);
}

function readAllLocalPaths() {
	const args = [
		"-c",
		"core.quotePath=false",
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all",
	];
	const result = runGit(args);
	if (!result.ok) {
		reportFailure("读取工作区状态", args, result);
		return null;
	}
	return parseStatusNames(result.stdout);
}

function readRemoteChangedPaths() {
	const args = [
		"-c",
		"core.quotePath=false",
		"diff",
		"--name-only",
		"-z",
		"HEAD",
		"origin/main",
	];
	const result = runGit(args);
	if (!result.ok) {
		reportFailure("读取远程改动路径", args, result);
		return null;
	}
	return parseNulSeparatedNames(result.stdout);
}

function readOriginMain() {
	const args = [
		"rev-parse",
		"--verify",
		"--quiet",
		"refs/remotes/origin/main^{commit}",
	];
	const result = runGit(args);
	if (!result.ok || !result.stdout.trim()) {
		reportFailure("确认 origin/main", args, result);
		return null;
	}
	return result.stdout.trim();
}

function readAheadBehind() {
	const args = ["rev-list", "--left-right", "--count", "HEAD...origin/main"];
	const result = runGit(args);
	if (!result.ok) {
		reportFailure("比较本地与远程提交", args, result);
		return null;
	}

	const counts = result.stdout.trim().split(/\s+/).map(Number);
	if (
		counts.length !== 2 ||
		counts.some((count) => !Number.isInteger(count) || count < 0)
	) {
		console.error("提交前同步已停止：无法解析本地与远程提交数量。");
		return null;
	}

	return { ahead: counts[0], behind: counts[1] };
}

function readStashHead() {
	const args = ["rev-parse", "--verify", "--quiet", "refs/stash"];
	const result = runGit(args);
	return result.ok ? result.stdout.trim() : "";
}

function saveLocalState() {
	const before = readStashHead();
	const message =
		"codex content pre-commit sync " + new Date().toISOString();
	const args = ["stash", "push", "--include-untracked", "--message", message];
	const result = runGit(args);

	if (!result.ok) {
		reportFailure("临时保存本地改动", args, result);
		return null;
	}

	const after = readStashHead();
	if (!after || after === before) {
		console.error("提交前同步已停止：没有得到可恢复的临时保存点。");
		return null;
	}

	return after;
}

function restoreLocalState(stashRef) {
	const applyArgs = ["stash", "apply", "--index", stashRef];
	const apply = runGit(applyArgs);
	if (!apply.ok) {
		reportFailure(
			"恢复本地改动；临时保存点仍保留，请先处理冲突",
			applyArgs,
			apply,
		);
		return false;
	}

	const dropArgs = ["stash", "drop", stashRef];
	const drop = runGit(dropArgs);
	if (!drop.ok) {
		reportFailure(
			"清理已成功恢复的临时保存点；本地内容已恢复，请检查 stash",
			dropArgs,
			drop,
		);
		return false;
	}

	return true;
}

function main() {
	if (!verifyRepository()) {
		return 1;
	}

	const stagedPaths = readStagedPaths();
	if (stagedPaths === null) {
		return 1;
	}

	if (!stagedPaths.some(isContentPath)) {
		console.log(
			"提交前同步：本次提交不包含 posts/notes/spec，跳过远程同步。",
		);
		return 0;
	}

	console.log("提交前同步：检测到内容提交，正在 fetch origin…");
	const fetchArgs = ["fetch", "origin"];
	const fetch = runGit(fetchArgs);
	if (!fetch.ok) {
		reportFailure("从 origin 获取更新", fetchArgs, fetch);
		return 1;
	}

	if (!readOriginMain()) {
		return 1;
	}

	const counts = readAheadBehind();
	if (!counts) {
		return 1;
	}

	if (counts.behind === 0) {
		if (counts.ahead > 0) {
			console.log(
				"提交前同步完成：远程没有新提交，本地领先 origin/main " +
					counts.ahead +
					" 个提交；继续提交。",
			);
		} else {
			console.log("提交前同步完成：本地 main 已是 origin/main 最新状态。");
		}
		return 0;
	}

	if (counts.ahead > 0) {
		console.error(
			"提交前同步已停止：本地与 origin/main 已分叉；未自动合并或覆盖。",
		);
		return 1;
	}

	const localPaths = readAllLocalPaths();
	const remotePaths = readRemoteChangedPaths();
	if (!localPaths || !remotePaths) {
		return 1;
	}

	const overlap = remotePaths.filter((remotePath) =>
		localPaths.some((localPath) => samePath(localPath, remotePath)),
	);
	if (overlap.length > 0) {
		console.error(
			"提交前同步已停止：远程更新与本地未提交路径重叠，未自动解决冲突。",
		);
		for (const filePath of [...new Set(overlap)].slice(0, 20)) {
			console.error("  " + filePath);
		}
		return 1;
	}

	console.log(
		"提交前同步：远程领先 " +
			counts.behind +
			" 个提交，路径不冲突；临时保存本地改动并 fast-forward。",
	);

	const stashRef = saveLocalState();
	if (!stashRef) {
		return 1;
	}

	const mergeArgs = ["merge", "--ff-only", "origin/main"];
	const merge = runGit(mergeArgs);
	if (!merge.ok) {
		reportFailure("fast-forward 到 origin/main", mergeArgs, merge);
		const restored = restoreLocalState(stashRef);
		return restored ? 1 : 1;
	}

	if (!restoreLocalState(stashRef)) {
		return 1;
	}

	console.log("提交前同步完成：远程更新已合入，本地改动已恢复；继续提交。");
	return 0;
}

try {
	process.exitCode = main();
} catch (error) {
	console.error(
		"提交前同步已停止：" +
			(error instanceof Error ? error.message : String(error)),
	);
	process.exitCode = 1;
}

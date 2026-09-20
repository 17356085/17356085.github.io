import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import {
	AUDIO_EXTENSIONS,
	absolutePath,
	IMAGE_EXTENSIONS,
	loadMediaConfig,
	MANIFEST_PATH,
	ROOT,
	readJson,
	relativePath,
	walkFiles,
} from "./media-common.mjs";

const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS]);
const CONTENT_ROOTS = [
	"src/content/posts",
	"src/content/notes",
	"src/content/spec",
];
const MUSIC_CONFIGS = [
	"shirones/config/data/music.ts",
	"shirones/config/musicConfig.ts",
];
const LOCAL_MEDIA_ROOTS = [
	"public/img/",
	"public/music/",
	"src/assets/images/",
	"src/assets/music/",
];
const ALLOWED_LOCAL_ROOTS = [
	"public/favicon/",
	"public/assets/anime/covers/",
	"public/assets/moments/thumbnails/",
];
const MARKDOWN_IMAGE_PATTERN =
	/!\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/gu;
const FRONTMATTER_MEDIA_PATTERN =
	/^\s*(?:image|cover)\s*:\s*(?:["']([^"']+)["']|([^\s#]+))/u;
const HTML_MEDIA_PATTERN =
	/(?:src|poster)\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gu;
const MUSIC_VALUE_PATTERN = /\b(?:source|cover)\s*:\s*["']([^"']+)["']/gu;

function parseArgs() {
	const args = new Set(process.argv.slice(2));
	if (args.has("--remote") && args.has("--no-remote")) {
		throw new Error("--remote and --no-remote cannot be used together.");
	}
	return {
		staged: args.has("--staged"),
		remote: args.has("--remote"),
	};
}

function runGit(args) {
	const result = spawnSync("git", args, {
		cwd: ROOT,
		encoding: "utf8",
		shell: false,
		windowsHide: true,
	});
	return {
		ok: result.status === 0,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

function stagedMediaPaths() {
	const result = runGit([
		"-c",
		"core.quotePath=false",
		"diff",
		"--cached",
		"--diff-filter=ACMR",
		"--name-only",
		"-z",
	]);
	if (!result.ok) throw new Error("无法读取暂存区路径。");
	return result.stdout
		.split("\0")
		.filter(Boolean)
		.map((value) => value.replaceAll("\\", "/"));
}

function isMediaFile(file) {
	return MEDIA_EXTENSIONS.has(extname(file).toLowerCase());
}

function isAllowedLocalPath(file) {
	const normalized = file.replaceAll("\\", "/");
	return ALLOWED_LOCAL_ROOTS.some((prefix) => normalized.startsWith(prefix));
}

function isBlockedLocalMediaPath(file) {
	const normalized = file.replaceAll("\\", "/");
	return (
		isMediaFile(normalized) &&
		LOCAL_MEDIA_ROOTS.some((prefix) => normalized.startsWith(prefix)) &&
		!isAllowedLocalPath(normalized)
	);
}

function isRemote(value) {
	return /^(?:https?:|data:|blob:|mailto:|tel:|#|\/\/)/iu.test(value.trim());
}

function cleanReference(value) {
	return value.trim().replace(/^<|>$/g, "").split(/[?#]/, 1)[0];
}

function isLocalMediaReference(value) {
	const reference = cleanReference(value);
	return Boolean(
		reference &&
			!isRemote(reference) &&
			MEDIA_EXTENSIONS.has(extname(reference).toLowerCase()),
	);
}

function isCodeFenceLine(line) {
	return /^\s*(```+|~~~+)/u.test(line);
}

function collectContentReferences(file) {
	const text = readFileSync(absolutePath(file), "utf8");
	const references = [];
	let inFence = false;
	const lines = text.split(/\r?\n/u);

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		if (isCodeFenceLine(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const frontmatter = FRONTMATTER_MEDIA_PATTERN.exec(line);
		const frontmatterValue = frontmatter?.[1] ?? frontmatter?.[2];
		if (frontmatterValue && isLocalMediaReference(frontmatterValue)) {
			references.push({ file, line: index + 1, value: frontmatterValue });
		}

		for (const match of line.matchAll(MARKDOWN_IMAGE_PATTERN)) {
			const value = match[1];
			if (isLocalMediaReference(value)) {
				references.push({ file, line: index + 1, value });
			}
		}

		for (const match of line.matchAll(HTML_MEDIA_PATTERN)) {
			const value = match[1] ?? match[2];
			if (isLocalMediaReference(value)) {
				references.push({ file, line: index + 1, value });
			}
		}
	}

	return references;
}

function contentFiles() {
	return CONTENT_ROOTS.flatMap((root) =>
		walkFiles(absolutePath(root))
			.map(relativePath)
			.filter((file) => /\.mdx?$/iu.test(file)),
	);
}

function publicBaseUrl() {
	try {
		const config = loadMediaConfig();
		if (config.publicBaseUrl) return config.publicBaseUrl;
	} catch {
		// CI does not have the local PicGo profile; use the committed manifest below.
	}

	for (const path of [
		MANIFEST_PATH,
		absolutePath("scripts/media/media-audit.json"),
	]) {
		if (!existsSync(path)) continue;
		try {
			const value = readJson(path).publicBaseUrl;
			if (typeof value === "string" && value.trim()) return value.trim();
		} catch {
			// A malformed report is reported by the media checks that own it.
		}
	}
	return (
		process.env.R2_PUBLIC_BASE_URL ?? process.env.MEDIA_PUBLIC_BASE_URL ?? ""
	);
}

function normalizedBaseUrl() {
	const value = publicBaseUrl().replace(/\/+$/u, "");
	return value ? new URL(value) : null;
}

function isR2PublicUrl(value, base) {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:") return false;
		if (base) {
			return (
				url.origin === base.origin &&
				url.pathname.startsWith(`${base.pathname.replace(/\/+$/u, "")}/`)
			);
		}
		return url.hostname.endsWith(".r2.dev");
	} catch {
		return false;
	}
}

function musicValues() {
	const values = [];
	for (const file of MUSIC_CONFIGS) {
		if (!existsSync(absolutePath(file))) continue;
		const text = readFileSync(absolutePath(file), "utf8");
		for (const [index, line] of text.split(/\r?\n/u).entries()) {
			if (/^\s*(?:\/\/|\*|\/\*)/u.test(line)) continue;
			for (const match of line.matchAll(MUSIC_VALUE_PATTERN)) {
				values.push({ file, line: index + 1, value: match[1] });
			}
		}
	}
	return values;
}

async function verifyUrl(url) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 20_000);
	try {
		let response = await fetch(url, {
			method: "HEAD",
			signal: controller.signal,
		});
		if (response.status === 405 || response.status === 403) {
			response = await fetch(url, {
				method: "GET",
				headers: { range: "bytes=0-0" },
				signal: controller.signal,
			});
		}
		return response.status;
	} finally {
		clearTimeout(timer);
	}
}

async function main() {
	const options = parseArgs();
	const issues = [];

	if (options.staged) {
		for (const file of stagedMediaPaths()) {
			if (isBlockedLocalMediaPath(file)) {
				issues.push(
					`${file} 是本地媒体文件，不能提交；请先使用 pnpm media:upload -- "${file}" --category ${file.startsWith("public/music/") || file.startsWith("src/assets/music/") ? "music" : "posts"} --json 上传到 R2。`,
				);
			}
		}
	}

	const localReferences = contentFiles().flatMap(collectContentReferences);
	for (const reference of localReferences) {
		issues.push(
			`${reference.file}:${reference.line} 仍引用本地媒体 ${reference.value}；正文和封面只能引用 Cloudflare R2 公共 URL。`,
		);
	}

	const base = normalizedBaseUrl();
	for (const reference of musicValues()) {
		if (!isR2PublicUrl(reference.value, base)) {
			issues.push(
				`${reference.file}:${reference.line} 的音乐资源不是项目 R2 URL：${reference.value}；音乐文件和封面必须放在 images/music/<曲目>/ 下。`,
			);
			continue;
		}
		try {
			const pathname = new URL(reference.value).pathname;
			if (!pathname.includes("/images/music/")) {
				issues.push(
					`${reference.file}:${reference.line} 的音乐资源不在 images/music/ 目录：${reference.value}`,
				);
			}
		} catch {
			// isR2PublicUrl already reports malformed URLs.
		}
	}

	if (options.remote) {
		const urls = new Set([
			...musicValues().map((reference) => reference.value),
		]);
		for (const file of contentFiles()) {
			const text = readFileSync(absolutePath(file), "utf8");
			for (const match of text.matchAll(MARKDOWN_IMAGE_PATTERN)) {
				const value = match[1].replace(/^<|>$/g, "");
				if (isR2PublicUrl(value, base)) urls.add(value);
			}
		}
		for (const url of urls) {
			try {
				const status = await verifyUrl(url);
				if (status < 200 || status >= 400) {
					issues.push(`R2 公共 URL 返回 HTTP ${status}：${url}`);
				} else {
					console.log(`[media:policy] ${status} ${url}`);
				}
			} catch (error) {
				issues.push(
					`R2 公共 URL 无法访问：${url}（${error instanceof Error ? error.message : "unknown error"}）`,
				);
			}
		}
	}

	if (issues.length > 0) {
		for (const issue of issues) console.error(`[media:policy] ${issue}`);
		process.exitCode = 1;
		return;
	}

	console.log(
		`[media:policy] pass: contentFiles=${contentFiles().length}, musicValues=${musicValues().length}, mode=${options.staged ? "staged" : "full"}, remote=${options.remote ? "verified" : "skipped"}`,
	);
}

try {
	await main();
} catch (error) {
	console.error(
		`[media:policy] ${error instanceof Error ? error.message : "policy check failed"}`,
	);
	process.exitCode = 1;
}

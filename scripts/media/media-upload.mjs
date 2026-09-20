import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";

import {
	AUDIO_EXTENSIONS,
	formatBytes,
	IMAGE_EXTENSIONS,
	loadMediaConfig,
	mimeType,
	r2ObjectUrl,
	r2UploadUrl,
	signR2Request,
} from "./media-common.mjs";

const DEFAULT_CATEGORY = "posts";
const CATEGORY_PREFIXES = Object.freeze({
	posts: "images/posts",
	notes: "images/notes",
	anime: "images/anime",
	site: "images/site",
	music: "video/music",
});
const MEDIA_CATEGORIES = new Set(Object.keys(CATEGORY_PREFIXES));

function parseArgs() {
	const args = process.argv.slice(2);
	const files = [];
	let alt = "";
	let category = DEFAULT_CATEGORY;
	let key = "";
	let json = false;
	let dryRun = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--alt") {
			alt = args[++index] ?? "";
		} else if (arg === "--category") {
			category = args[++index] ?? DEFAULT_CATEGORY;
		} else if (arg === "--key") {
			key = args[++index] ?? "";
		} else if (arg === "--json") {
			json = true;
		} else if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		} else if (arg.startsWith("--")) {
			throw new Error(`Unknown option: ${arg}`);
		} else {
			files.push(arg);
		}
	}

	if (files.length === 0) {
		throw new Error("Please provide at least one local image or audio path.");
	}
	if (key && files.length > 1) {
		throw new Error("--key can only be used with one media file.");
	}
	if (!MEDIA_CATEGORIES.has(category)) {
		throw new Error(
			`Invalid category: ${category}. Use posts, notes, anime, site, or music.`,
		);
	}
	if (category === "music" && !key) {
		throw new Error(
			"Music uploads require --key under video/music/<work>/, for example video/music/mahoyo/tracks/main-theme.mp3.",
		);
	}

	return { alt, category, key, json, dryRun, files };
}

function printHelp() {
	console.log(`Usage: pnpm media:upload -- <image-or-audio> [options]

Uploads a local image or audio file directly to Cloudflare R2 and prints its public URL.
Credentials are read from R2_*/MEDIA_* environment variables or the local PicGo S3 profile.

Options:
  --alt <text>       Markdown alt text (defaults to the file name)
  --category <name>  One of posts, notes, anime, site, music (default: posts)
  --key <path>       Exact key under the category prefix (only for one media file)
  --json             Print machine-readable JSON
  --dry-run          Validate and show the planned key without uploading
  --help             Show this help
`);
}

function fetchWithTimeout(url, options = {}, timeoutMs = 30_000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	return fetch(url, { ...options, signal: controller.signal }).finally(() => {
		clearTimeout(timer);
	});
}

function resolveInputPath(value) {
	const path = resolve(process.cwd(), value);
	if (!existsSync(path)) throw new Error(`Media file does not exist: ${value}`);
	if (!statSync(path).isFile())
		throw new Error(`Media path is not a file: ${value}`);
	const extension = extname(path).toLowerCase();
	if (!IMAGE_EXTENSIONS.has(extension) && !AUDIO_EXTENSIONS.has(extension)) {
		throw new Error(
			`Unsupported media extension: ${value}. Supported image/audio extensions are ${[
				...IMAGE_EXTENSIONS,
				...AUDIO_EXTENSIONS,
			].join(", ")}.`,
		);
	}
	return path;
}

function resolveInputPathForCategory(value, category) {
	const path = resolveInputPath(value);
	const normalized = value.replaceAll("\\", "/");
	const isMusicPath =
		normalized.startsWith("public/music/") ||
		normalized.startsWith("src/assets/music/");
	if (isMusicPath && category !== "music") {
		throw new Error(
			`Music files under ${normalized} require --category music. Use video/music/ for music assets.`,
		);
	}
	if (
		category !== "music" &&
		AUDIO_EXTENSIONS.has(extname(path).toLowerCase())
	) {
		throw new Error(
			`Audio uploads require --category music: ${value}. Use --category music for video/music/.`,
		);
	}
	return path;
}

function cleanSegment(value, fallback) {
	const cleaned = value
		.replaceAll("\\", "/")
		.split("/")
		.filter((segment) => segment && segment !== "." && segment !== "..")
		.map((segment) => segment.replace(/[?#]/gu, "-"))
		.join("/");
	return cleaned || fallback;
}

function categoryPrefix(category) {
	if (!MEDIA_CATEGORIES.has(category)) {
		throw new Error(
			`Invalid category: ${category}. Use posts, notes, anime, site, or music.`,
		);
	}
	return CATEGORY_PREFIXES[category];
}

function makeObjectKey(file, body, category, explicitKey) {
	const prefix = categoryPrefix(category);
	if (explicitKey) {
		if (explicitKey.includes("..")) {
			throw new Error(`R2 key cannot contain '..': ${explicitKey}`);
		}
		const normalized = cleanSegment(explicitKey, "");
		if (!normalized.startsWith(`${prefix}/`)) {
			throw new Error(`R2 key must stay under ${prefix}/: ${explicitKey}`);
		}
		return normalized;
	}
	const digest = createHash("md5").update(body).digest("hex");
	const extension = extname(file).toLowerCase() || ".bin";
	return `${prefix}/${digest}${extension}`;
}

function defaultAlt(file, providedAlt) {
	if (providedAlt) return providedAlt;
	return basename(file).replace(new RegExp(`${extname(file)}$`, "iu"), "");
}

async function verifyPublicUrl(url) {
	let response = await fetchWithTimeout(url, { method: "HEAD" });
	if (response.ok || (response.status >= 300 && response.status < 400))
		return response.status;
	if (response.status === 405 || response.status === 403) {
		response = await fetchWithTimeout(url, {
			method: "GET",
			headers: { range: "bytes=0-0" },
		});
	}
	if (!response.ok && !(response.status >= 300 && response.status < 400)) {
		throw new Error(
			`Public URL verification failed with HTTP ${response.status}`,
		);
	}
	return response.status;
}

async function upload(config, file, body, key) {
	const uploadUrl = r2UploadUrl(config, key);
	const headers = signR2Request({
		method: "PUT",
		url: uploadUrl,
		body,
		contentType: mimeType(file),
		config,
	});
	const response = await fetchWithTimeout(uploadUrl, {
		method: "PUT",
		headers,
		body,
	});
	if (!response.ok)
		throw new Error(`R2 upload failed with HTTP ${response.status}`);

	const url = r2ObjectUrl(config.publicBaseUrl, key);
	const publicStatus = await verifyPublicUrl(url);
	return { url, publicStatus };
}

async function main() {
	const options = parseArgs();
	const config = loadMediaConfig({ requireCredentials: !options.dryRun });
	const results = [];

	for (const input of options.files) {
		const file = resolveInputPathForCategory(input, options.category);
		const body = readFileSync(file);
		const key = makeObjectKey(file, body, options.category, options.key);
		const result = {
			source: input,
			key,
			size: body.length,
			url: config.publicBaseUrl ? r2ObjectUrl(config.publicBaseUrl, key) : null,
			markdown: config.publicBaseUrl
				? `![${defaultAlt(file, options.alt)}](${r2ObjectUrl(config.publicBaseUrl, key)})`
				: null,
		};

		if (!options.dryRun) {
			const uploaded = await upload(config, file, body, key);
			result.publicStatus = uploaded.publicStatus;
		}
		results.push(result);
	}

	if (options.json) {
		console.log(JSON.stringify(results, null, 2));
		return;
	}
	for (const result of results) {
		console.log(
			`${options.dryRun ? "[media:upload] planned" : "[media:upload] uploaded"} ${result.source} (${formatBytes(result.size)})`,
		);
		console.log(result.markdown ?? result.key);
	}
}

try {
	await main();
} catch (error) {
	console.error(
		`[media:upload] ${error instanceof Error ? error.message : "upload failed"}`,
	);
	process.exitCode = 1;
}

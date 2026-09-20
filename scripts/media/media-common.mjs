import { createHash, createHmac } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const MEDIA_DIR = join(ROOT, "scripts", "media");
export const AUDIT_PATH = join(MEDIA_DIR, "media-audit.json");
export const MANIFEST_PATH = join(MEDIA_DIR, "media-migration.json");

export const IMAGE_EXTENSIONS = new Set([
	".avif",
	".gif",
	".jpeg",
	".jpg",
	".png",
	".svg",
	".webp",
]);

export const AUDIO_EXTENSIONS = new Set([
	".aac",
	".flac",
	".m4a",
	".mp3",
	".ogg",
	".opus",
	".wav",
	".webm",
]);

export const TEXT_EXTENSIONS = new Set([
	".astro",
	".css",
	".html",
	".js",
	".json",
	".md",
	".mdx",
	".mjs",
	".scss",
	".ts",
	".tsx",
	".yaml",
	".yml",
]);

export function toPosix(value) {
	return value.replaceAll("\\", "/");
}

export function relativePath(absolutePath) {
	return toPosix(relative(ROOT, absolutePath));
}

export function absolutePath(relativeValue) {
	return resolve(ROOT, relativeValue.replaceAll("/", "\\"));
}

export function walkFiles(directory) {
	if (!existsSync(directory)) return [];
	const files = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const absolute = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...walkFiles(absolute));
		else files.push(absolute);
	}
	return files;
}

export function isInsideRoot(absolute) {
	const rootWithSeparator = `${ROOT.endsWith("\\") ? ROOT : `${ROOT}\\`}`;
	const normalized = resolve(absolute);
	return normalized === ROOT || normalized.startsWith(rootWithSeparator);
}

export function stripReferenceDecorations(value) {
	let result = value.trim().replace(/^<|>$/g, "");
	result = result.split("#", 1)[0].split("?", 1)[0];
	try {
		result = decodeURIComponent(result);
	} catch {
		// Keep the original path when it is not valid percent-encoding.
	}
	return result;
}

export function isRemoteReference(value) {
	return /^(?:https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(value.trim());
}

export function resolveLocalReference(reference, sourceRelativePath) {
	const cleaned = stripReferenceDecorations(reference);
	if (!cleaned || isRemoteReference(cleaned)) return null;

	let candidate;
	if (cleaned.startsWith("/")) {
		candidate = join(ROOT, "public", cleaned.slice(1));
	} else if (cleaned.startsWith("public/")) {
		candidate = join(ROOT, cleaned);
	} else if (cleaned.startsWith("src/")) {
		candidate = join(ROOT, cleaned);
	} else if (cleaned.startsWith("assets/")) {
		candidate = join(ROOT, "src", cleaned);
	} else {
		candidate = resolve(ROOT, dirname(sourceRelativePath), cleaned);
	}

	if (!isInsideRoot(candidate)) return null;
	return {
		absolute: candidate,
		relative: relativePath(candidate),
		exists: existsSync(candidate),
	};
}

export function isImagePath(relativeValue) {
	return IMAGE_EXTENSIONS.has(extname(relativeValue).toLowerCase());
}

export function isAudioPath(relativeValue) {
	return AUDIO_EXTENSIONS.has(extname(relativeValue).toLowerCase());
}

export function isTextPath(relativeValue) {
	return TEXT_EXTENSIONS.has(extname(relativeValue).toLowerCase());
}

export function sha256File(absolute) {
	return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}

export function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

export function mimeType(relativeValue) {
	const extension = extname(relativeValue).toLowerCase();
	return (
		{
			".avif": "image/avif",
			".aac": "audio/aac",
			".flac": "audio/flac",
			".gif": "image/gif",
			".jpeg": "image/jpeg",
			".jpg": "image/jpeg",
			".m4a": "audio/mp4",
			".mp3": "audio/mpeg",
			".ogg": "audio/ogg",
			".opus": "audio/opus",
			".png": "image/png",
			".svg": "image/svg+xml",
			".wav": "audio/wav",
			".webp": "image/webp",
			".webm": "audio/webm",
		}[extension] ?? "application/octet-stream"
	);
}

export function readJson(file) {
	return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function trimUrl(value) {
	return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

function candidatePicGoPaths() {
	const home = process.env.USERPROFILE || process.env.HOME || "";
	const appData = process.env.APPDATA;
	const xdg = process.env.XDG_CONFIG_HOME || join(home, ".config");
	return [
		appData ? join(appData, "picgo", "data.json") : "",
		join(home, "AppData", "Roaming", "picgo", "data.json"),
		join(home, "Library", "Application Support", "picgo", "data.json"),
		join(xdg, "picgo", "data.json"),
	].filter(Boolean);
}

export function loadPicGoS3Config() {
	for (const path of [...new Set(candidatePicGoPaths())]) {
		try {
			if (!existsSync(path)) continue;
			const config = readJson(path);
			const s3 =
				config.picBed?.["aws-s3"] ??
				config.uploader?.["aws-s3"]?.configList?.[0];
			if (s3?.bucketName && (s3.accessKeyID || s3.accessKeyId)) {
				return { path, config: s3 };
			}
		} catch {
			// A locked or malformed local PicGo profile should not prevent env use.
		}
	}
	return null;
}

function publicBaseFromPattern(value) {
	if (typeof value !== "string") return "";
	const match = value.match(/^(https?:\/\/[^/]+)/i);
	return match ? trimUrl(match[1]) : "";
}

export function loadMediaConfig({ requireCredentials = false } = {}) {
	const picgo = loadPicGoS3Config();
	const source = picgo?.config ?? {};
	const accessKeyId =
		process.env.R2_ACCESS_KEY_ID ??
		process.env.MEDIA_R2_ACCESS_KEY_ID ??
		source.accessKeyID ??
		source.accessKeyId ??
		"";
	const secretAccessKey =
		process.env.R2_SECRET_ACCESS_KEY ??
		process.env.MEDIA_R2_SECRET_ACCESS_KEY ??
		source.secretAccessKey ??
		"";
	const bucket =
		process.env.R2_BUCKET ??
		process.env.MEDIA_R2_BUCKET ??
		source.bucketName ??
		"";
	const endpoint = trimUrl(
		process.env.R2_ENDPOINT ??
			process.env.MEDIA_R2_ENDPOINT ??
			source.endpoint ??
			"",
	).replace(/\/(?:[^/]+)$/, (suffix) => {
		// PicGo may store an endpoint with the bucket suffix; the signer adds it later.
		return suffix === `/${bucket}` ? "" : suffix;
	});
	const publicBaseUrl = trimUrl(
		process.env.MEDIA_PUBLIC_BASE_URL ??
			process.env.R2_PUBLIC_BASE_URL ??
			source.urlPrefix ??
			publicBaseFromPattern(source.outputURLPattern),
	);

	const result = {
		accessKeyId,
		secretAccessKey,
		bucket,
		endpoint,
		region:
			process.env.R2_REGION ??
			process.env.MEDIA_R2_REGION ??
			source.region ??
			"auto",
		publicBaseUrl,
		picgoPath: picgo?.path ?? null,
	};

	if (requireCredentials) {
		const missing = [
			["access key", result.accessKeyId],
			["secret key", result.secretAccessKey],
			["bucket", result.bucket],
			["endpoint", result.endpoint],
			["public base URL", result.publicBaseUrl],
		]
			.filter(([, value]) => !value)
			.map(([name]) => name);
		if (missing.length > 0) {
			throw new Error(
				`Missing media configuration: ${missing.join(", ")}. Set R2_* / MEDIA_* variables or configure PicGo S3.`,
			);
		}
	}
	return result;
}

export function r2ObjectUrl(publicBaseUrl, key) {
	return `${trimUrl(publicBaseUrl)}/${key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

function hmac(key, value) {
	return createHmac("sha256", key).update(value).digest();
}

export function signR2Request({ method, url, body, contentType, config }) {
	const parsed = new URL(url);
	const payload = body ?? Buffer.alloc(0);
	const payloadHash = createHash("sha256").update(payload).digest("hex");
	const now = new Date();
	const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
	const amzDate = iso;
	const shortDate = amzDate.slice(0, 8);
	const headers = {
		host: parsed.host,
		"x-amz-content-sha256": payloadHash,
		"x-amz-date": amzDate,
	};
	if (contentType) headers["content-type"] = contentType;

	const signedHeaderNames = Object.keys(headers).sort();
	const canonicalHeaders = signedHeaderNames
		.map((name) => `${name}:${String(headers[name]).trim()}\n`)
		.join("");
	const signedHeaders = signedHeaderNames.join(";");
	const canonicalUri = parsed.pathname || "/";
	const canonicalRequest = [
		method,
		canonicalUri,
		parsed.search.slice(1),
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join("\n");
	const scope = `${shortDate}/${config.region}/s3/aws4_request`;
	const stringToSign = [
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		sha256(canonicalRequest),
	].join("\n");
	const signingKey = hmac(
		hmac(
			hmac(hmac(`AWS4${config.secretAccessKey}`, shortDate), config.region),
			"s3",
		),
		"aws4_request",
	);
	const signature = createHmac("sha256", signingKey)
		.update(stringToSign)
		.digest("hex");
	const authorization =
		`AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, ` +
		`SignedHeaders=${signedHeaders}, Signature=${signature}`;

	return {
		...headers,
		authorization,
	};
}

export function r2UploadUrl(config, key) {
	const endpoint = trimUrl(config.endpoint);
	return `${endpoint}/${encodeURIComponent(config.bucket)}/${key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

export function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KiB", "MiB", "GiB"];
	let value = bytes;
	for (const unit of units) {
		value /= 1024;
		if (value < 1024 || unit === units.at(-1))
			return `${value.toFixed(2)} ${unit}`;
	}
	return `${bytes} B`;
}

export function safeSegment(value) {
	const normalized = value
		.normalize("NFKC")
		.replace(/\.[^.]+$/, "")
		.replace(/[^\p{L}\p{N}_-]+/gu, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();
	return normalized || "asset";
}

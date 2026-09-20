import {
	existsSync,
	readFileSync,
	statSync,
} from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	AUDIT_PATH,
	IMAGE_EXTENSIONS,
	ROOT,
	TEXT_EXTENSIONS,
	absolutePath,
	formatBytes,
	isImagePath,
	isRemoteReference,
	loadMediaConfig,
	mimeType,
	relativePath,
	resolveLocalReference,
	sha256File,
	toPosix,
	walkFiles,
	writeJson,
} from "./media-common.mjs";

const SOURCE_ROOTS = ["public", "src", "shirones/config", "docs", "scripts"];
const SKIP_TEXT = new Set([
	"shirones/config/data/anime-snapshots/bangumi.json",
	"scripts/media/media-audit.json",
	"scripts/media/media-migration.json",
]);

const LOCAL_PATH_PATTERN =
	/(?:\/img\/|public\/img\/|src\/assets\/images\/|assets\/images\/|(?:\.\.\/)+assets\/images\/)[^\s)\]}'"`<>;,]+/gu;
const MARKDOWN_IMAGE_PATTERN =
	/!\[([^\]]*)\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/gu;

const ALT_BY_FILENAME = new Map([
	["SpringAOP01.png", "Spring AOP 核心概念示意图"],
	["SpringAOP02.png", "Spring AOP 切面执行流程"],
	["SpringMVC01.png", "Spring MVC 架构图"],
	["SpringMVC02.png", "Spring MVC 请求处理流程"],
	["SpringMVC03.png", "Spring MVC 与三层架构"],
	["SpringIOC01.png", "Spring IOC 容器示意图"],
	["SpringIOC02.png", "Spring Bean 生命周期"],
	["SpringIOC03.png", "Spring 依赖注入流程"],
	["SpringIOC04.png", "Spring BeanFactory 结构"],
	["SpringIOC05.png", "Spring ApplicationContext 结构"],
	["SpringIOC06.png", "Spring IOC 组件关系"],
	["Java动态代理.png", "Java 动态代理示意图"],
]);

function isWithinAny(source, index, ranges) {
	return ranges.some(({ start, end }) => index >= start && index < end);
}

function codeFenceRanges(source) {
	const ranges = [];
	let open = null;
	let offset = 0;
	for (const line of source.split(/\r?\n/)) {
		const fence = line.match(/^\s*(```+|~~~+)/);
		if (fence) {
			if (open === null) open = offset;
			else {
				ranges.push({ start: open, end: offset + line.length });
				open = null;
			}
		}
		offset += line.length + 1;
	}
	if (open !== null) ranges.push({ start: open, end: source.length });
	return ranges;
}

function isInlineCode(source, index) {
	const lineStart = source.lastIndexOf("\n", index - 1) + 1;
	const line = source.slice(lineStart, index);
	return (line.match(/`/g)?.length ?? 0) % 2 === 1;
}

function lineNumber(source, index) {
	return source.slice(0, index).split(/\r?\n/).length;
}

function sourceKind(relative) {
	if (relative.startsWith("docs/")) return "documentation";
	if (relative.startsWith("src/content/")) return "content";
	if (relative.startsWith("shirones/config/")) return "config";
	return "source";
}

function extractFrontmatterRefs(source, text) {
	const result = [];
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
	if (!match) return result;
	const headerStart = match.index + 4;
	let relativeOffset = 0;
	for (const line of match[1].split(/\r?\n/)) {
		const field = line.match(/^\s*(image|cover)\s*:\s*(.*?)\s*$/u);
		if (field) {
			const value = field[2];
			const quote = value.match(/^(['"])(.*?)\1(?:\s|$)/u);
			const raw = quote ? quote[2] : value.split(/\s+#|\s+<!--/u, 1)[0].trim();
			const local = raw.match(LOCAL_PATH_PATTERN);
			if (local) {
				const valueStart = headerStart + relativeOffset + line.indexOf(value);
				const start = valueStart + (quote ? 1 : value.indexOf(raw));
				result.push({
					file: source,
					line: lineNumber(text, start),
					kind: "frontmatter-image",
					reference: raw,
					active: true,
					resolvedSource: null,
					resolvedExists: false,
					remote: null,
					start,
					end: start + raw.length,
				});
			}
		}
		relativeOffset += line.length + 1;
	}
	return result;
}

function scanTextFile(source, text) {
	const references = [];
	const seen = new Set();
	const fences = codeFenceRanges(text);
	const markdown = /\.mdx?$/iu.test(source);

	for (const reference of extractFrontmatterRefs(source, text)) {
		seen.add(`${reference.start}:${reference.end}`);
		references.push(reference);
	}

	if (markdown) {
		for (const match of text.matchAll(MARKDOWN_IMAGE_PATTERN)) {
			const start = match.index + match[0].indexOf(match[2]);
			const wrapped = match[2].startsWith("<");
			const tokenStart = start + (wrapped ? 1 : 0);
			const tokenEnd = start + match[2].length - (wrapped ? 1 : 0);
			const key = `${tokenStart}:${tokenEnd}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const fenced = isWithinAny(text, match.index, fences);
			const inline = isInlineCode(text, match.index);
			const active = !fenced && !inline;
			const altStart = match.index + 2;
			const altEnd = altStart + match[1].length;
			references.push({
				file: source,
				line: lineNumber(text, tokenStart),
				kind: isRemoteReference(match[2])
					? "markdown-remote-image"
					: "markdown-image",
				reference: match[2].replace(/^<|>$/g, ""),
				active,
				resolvedSource: null,
				resolvedExists: false,
				remote: isRemoteReference(match[2]) ? match[2] : null,
				start: tokenStart,
				end: tokenEnd,
				alt: match[1],
				altStart,
				altEnd,
			});
		}
	}

	for (const match of text.matchAll(LOCAL_PATH_PATTERN)) {
		const start = match.index;
		const end = start + match[0].length;
		if (seen.has(`${start}:${end}`)) continue;
		const fenced = isWithinAny(text, start, fences);
		const inline = markdown && isInlineCode(text, start);
		const documentation = source.startsWith("docs/");
		const kind = fenced || inline
			? "code-example"
			: documentation
				? "documentation-example"
				: sourceKind(source) === "config"
					? "config-string"
					: "text-reference";
		references.push({
				file: source,
				line: lineNumber(text, start),
				kind,
				reference: match[0],
				active: !fenced && !inline && !documentation,
				resolvedSource: null,
				resolvedExists: false,
				remote: null,
				start,
				end,
			});
	}

	return references;
}

function classifyAsset(asset, references) {
	const source = asset.source;
	const active = references.filter((reference) => reference.active);
	const activeFrontmatter = active.some(
		(reference) => reference.kind === "frontmatter-image",
	);
	const activeMarkdown = active.some(
		(reference) => reference.kind === "markdown-image",
	);
	if (source.startsWith("public/assets/anime/covers/")) return "bangumi-cache";
	if (source.startsWith("public/favicon/")) return "favicon";
	if (source.startsWith("public/music/") || source.startsWith("src/assets/music/")) {
		return "theme-resource";
	}
	if (
		active.some(
			(reference) =>
				reference.file === "shirones/config/siteConfig.ts" &&
				reference.reference.includes("bg01"),
		)
	) {
		return "site-background";
	}
	if (activeFrontmatter && active.some((reference) => reference.file.startsWith("src/content/notes/"))) {
		return "note-cover";
	}
	if (activeFrontmatter) return "post-cover";
	if (activeMarkdown && active.some((reference) => reference.file.startsWith("src/content/notes/"))) {
		return "note-body";
	}
	if (activeMarkdown) return "post-body";
	if (
		active.some(
			(reference) =>
				reference.file === "shirones/config/profileConfig.ts" &&
				reference.reference.includes("older.jpg"),
		)
	) {
		return "avatar";
	}
	if (source.startsWith("src/assets/images/") && references.length > 0) {
		return "teaching-example";
	}
	return "unreferenced";
}

function decisionForCategory(category) {
	return new Set([
		"post-body",
		"post-cover",
		"note-body",
		"note-cover",
		"site-background",
	]).has(category)
		? "migrate"
		: category === "bangumi-cache"
			? "skip"
			: "retain";
}

function buildAssets() {
	const files = [];
	for (const root of [join(ROOT, "public"), join(ROOT, "src")]) {
		for (const file of walkFiles(root)) {
			const relative = relativePath(file);
			if (isImagePath(relative)) files.push({ absolute: file, source: relative });
		}
	}
	return files;
}

function buildScanFiles() {
	const files = [];
	for (const root of SOURCE_ROOTS) {
		const absolute = absolutePath(root);
		if (existsSync(absolute)) files.push(...walkFiles(absolute));
	}
	for (const file of ["astro.config.mjs", "package.json", ".gitignore"]) {
		const absolute = absolutePath(file);
		if (existsSync(absolute)) files.push(absolute);
	}
	return [...new Set(files)].filter((file) => {
		const relative = relativePath(file);
		return (
			TEXT_EXTENSIONS.has(extname(relative).toLowerCase()) &&
			!SKIP_TEXT.has(relative) &&
			!relative.startsWith("scripts/media/") &&
			!relative.startsWith("node_modules/") &&
			!relative.startsWith("dist/")
		);
	});
}

export function buildAudit() {
	const references = [];
	for (const file of buildScanFiles()) {
		const source = relativePath(file);
		const text = readFileSync(file, "utf8");
		for (const reference of scanTextFile(source, text)) {
			if (reference.resolvedSource === null && reference.reference) {
				const resolved = resolveLocalReference(reference.reference, source);
				if (resolved?.exists) {
					reference.resolvedSource = resolved.relative;
					reference.resolvedExists = true;
				}
			}
			references.push(reference);
		}
	}

	const remoteImages = references
		.filter((reference) => reference.remote)
		.map(({ file, line, kind, remote, active }) => ({
			file,
			line,
			kind,
			url: remote,
			active,
		}));

	const assets = buildAssets().map(({ absolute, source }) => {
		const fileReferences = references.filter(
			(reference) => reference.resolvedSource === source,
		);
		const stat = statSync(absolute);
		const category = classifyAsset({ source }, fileReferences);
		return {
			source,
			size: stat.size,
			mime: mimeType(source),
			sha256: sha256File(absolute),
			category,
			decision: decisionForCategory(category),
			references: fileReferences,
		};
	});

	const duplicateGroups = new Map();
	for (const asset of assets) {
		const group = duplicateGroups.get(asset.sha256) ?? [];
		group.push(asset.source);
		duplicateGroups.set(asset.sha256, group);
	}
	const duplicates = [...duplicateGroups.entries()]
		.filter(([, sources]) => sources.length > 1)
		.map(([sha256, sources]) => ({ sha256, sources }));

	const config = loadMediaConfig();
	const summary = {
		imageCount: assets.length,
		totalBytes: assets.reduce((sum, asset) => sum + asset.size, 0),
		migratableCount: assets.filter((asset) => asset.decision === "migrate").length,
		migratableBytes: assets
			.filter((asset) => asset.decision === "migrate")
			.reduce((sum, asset) => sum + asset.size, 0),
		remoteReferenceCount: remoteImages.length,
		unresolvedLocalReferenceCount: references.filter(
			(reference) =>
				reference.active &&
			!reference.remote &&
			!reference.resolvedExists,
		).length,
		duplicateGroupCount: duplicates.length,
		categories: Object.fromEntries(
			[...new Set(assets.map((asset) => asset.category))].map((category) => [
				category,
				assets.filter((asset) => asset.category === category).length,
			]),
		),
	};

	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		publicBaseUrl: config.publicBaseUrl || null,
		assets,
		duplicates,
		remoteImages,
		references,
		summary,
	};
}

export function semanticAltFor(source) {
	const fileName = source.split("/").at(-1) ?? source;
	return ALT_BY_FILENAME.get(fileName) ?? `${fileName.replace(/\.[^.]+$/, "")} 图片`;
}

export function main() {
	const audit = buildAudit();
	writeJson(AUDIT_PATH, audit);
	console.log(
		`[media:audit] images=${audit.summary.imageCount}, migratable=${audit.summary.migratableCount} (${formatBytes(audit.summary.migratableBytes)}), remoteRefs=${audit.summary.remoteReferenceCount}, duplicates=${audit.summary.duplicateGroupCount}`,
	);
	console.log(`[media:audit] report: ${relativePath(AUDIT_PATH)}`);
	if (audit.summary.unresolvedLocalReferenceCount > 0) {
		console.warn(
			`[media:audit] unresolved active local references: ${audit.summary.unresolvedLocalReferenceCount}`,
		);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}

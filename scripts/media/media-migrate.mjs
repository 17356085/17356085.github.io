import {
	existsSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	AUDIT_PATH,
	MANIFEST_PATH,
	absolutePath,
	formatBytes,
	TEXT_EXTENSIONS,
	loadMediaConfig,
	mimeType,
	r2ObjectUrl,
	r2UploadUrl,
	readJson,
	safeSegment,
	sha256File,
	signR2Request,
	writeJson,
	writeJson as writeAuditJson,
	relativePath,
	walkFiles,
} from "./media-common.mjs";
import { buildAudit } from "./media-audit.mjs";

const KEY_OVERRIDES = new Map([
	["public/img/bg01.jpg", "blog/site/banner/bg01.jpg"],
	["public/img/SpringAOP01.png", "blog/posts/spring-aop/aop-01.png"],
	["public/img/SpringAOP02.png", "blog/posts/spring-aop/aop-02.png"],
	["public/img/SpringMVC01.png", "blog/posts/spring-mvc/mvc-architecture.png"],
	["public/img/SpringMVC02.png", "blog/posts/spring-mvc/mvc-request-flow.png"],
	["public/img/SpringMVC03.png", "blog/posts/spring-mvc/mvc-and-three-tier.png"],
	["public/img/SpringIOC01.png", "blog/posts/spring-ioc/ioc-01.png"],
	["public/img/SpringIOC02.png", "blog/posts/spring-ioc/ioc-02.png"],
	["public/img/SpringIOC03.png", "blog/posts/spring-ioc/ioc-03.png"],
	["public/img/SpringIOC04.png", "blog/posts/spring-ioc/ioc-04.png"],
	["public/img/SpringIOC05.png", "blog/posts/spring-ioc/ioc-05.png"],
	["public/img/SpringIOC06.png", "blog/posts/spring-ioc/ioc-06.png"],
	["public/img/Java动态代理.png", "blog/posts/java-reflection/dynamic-proxy.png"],
	["public/img/魔法使之夜.jpg", "blog/covers/mahoyo.jpg"],
	["public/img/魔法使之夜1.jpg", "blog/covers/mahoyo-1.jpg"],
	["public/img/轻音少女1.webp", "blog/covers/k-on-1.webp"],
	["public/img/祥子.png", "blog/covers/sakiko.png"],
	["public/img/中野梓.jpg", "blog/covers/nakano-azusa.jpg"],
]);

function parseArgs() {
	const args = new Set(process.argv.slice(2));
	return {
		dryRun: args.has("--dry-run"),
		prune: args.has("--prune"),
		refreshManifest: args.has("--refresh-manifest"),
		skipRemoteCheck: args.has("--skip-remote-check"),
	};
}

function extensionFor(source) {
	return extname(source).toLowerCase() || ".bin";
}

function postStem(reference) {
	const file = reference?.file ?? "post";
	const stem = file.split("/").at(-1)?.replace(/\.[^.]+$/u, "") ?? "post";
	return safeSegment(stem);
}

function fileStem(source) {
	return safeSegment(source.split("/").at(-1) ?? "asset");
}

function deriveKey(asset) {
	const extension = extensionFor(asset.source);
	const reference = asset.references.find((item) => item.active) ?? asset.references[0];
	if (asset.category === "site-background") {
		return `blog/site/${fileStem(asset.source)}${extension}`;
	}
	if (asset.category === "post-cover") {
		return `blog/covers/${fileStem(asset.source)}${extension}`;
	}
	if (asset.category === "note-cover" || asset.category === "note-body") {
		return `blog/notes/${postStem(reference)}/${fileStem(asset.source)}${extension}`;
	}
	return `blog/posts/${postStem(reference)}/${fileStem(asset.source)}${extension}`;
}

function buildKeyByHash(assets) {
	const keyByHash = new Map();
	for (const asset of assets) {
		if (asset.decision !== "migrate") continue;
		const explicit = KEY_OVERRIDES.get(asset.source);
		if (explicit) keyByHash.set(asset.sha256, explicit);
	}
	for (const asset of assets) {
		if (asset.decision !== "migrate" || keyByHash.has(asset.sha256)) continue;
		keyByHash.set(asset.sha256, deriveKey(asset));
	}
	return keyByHash;
}

function keyForAsset(asset, keyByHash) {
	return KEY_OVERRIDES.get(asset.source) ?? keyByHash.get(asset.sha256) ?? deriveKey(asset);
}

function ensureAudit() {
	if (existsSync(AUDIT_PATH)) return readJson(AUDIT_PATH);
	const audit = buildAudit();
	writeAuditJson(AUDIT_PATH, audit);
	return audit;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	return fetch(url, { ...options, signal: controller.signal }).finally(() => {
		clearTimeout(timer);
	});
}

async function verifyPublicUrl(url) {
	let response = await fetchWithTimeout(url, { method: "HEAD" });
	if (response.ok || (response.status >= 300 && response.status < 400)) return response.status;
	if (response.status === 405 || response.status === 403) {
		response = await fetchWithTimeout(url, {
			method: "GET",
			headers: { range: "bytes=0-0" },
		});
	}
	if (!response.ok && !(response.status >= 300 && response.status < 400)) {
		throw new Error(`Public media verification failed with HTTP ${response.status}`);
	}
	return response.status;
}

async function uploadObject(config, asset, key, skipRemoteCheck) {
	const body = readFileSync(absolutePath(asset.source));
	const uploadUrl = r2UploadUrl(config, key);
	const headers = signR2Request({
		method: "PUT",
		url: uploadUrl,
		body,
		contentType: asset.mime || mimeType(asset.source),
		config,
	});
	const response = await fetchWithTimeout(uploadUrl, {
		method: "PUT",
		headers,
		body,
	});
	if (!response.ok) {
		throw new Error(`R2 upload failed with HTTP ${response.status}`);
	}
	const publicUrl = r2ObjectUrl(config.publicBaseUrl, key);
	const verifiedStatus = skipRemoteCheck ? null : await verifyPublicUrl(publicUrl);
	return { publicUrl, verifiedStatus };
}

function manifestEntryFromAsset(asset, key, url, localState = "retained") {
	return {
		source: asset.source,
		r2Key: key,
		url,
		sha256: asset.sha256,
		size: asset.size,
		mime: asset.mime,
		category: asset.category,
		decision: asset.decision,
		localState,
	};
}

function applyReplacements(file, replacements) {
	const absolute = absolutePath(file);
	let text = readFileSync(absolute, "utf8");
	const ordered = [...replacements].sort((left, right) => right.start - left.start);
	for (const replacement of ordered) {
		const current = text.slice(replacement.start, replacement.end);
		if (current !== replacement.expected) {
			throw new Error(
				`Reference changed before rewrite: ${file}:${replacement.start} expected ${JSON.stringify(replacement.expected)}`,
			);
		}
		text = `${text.slice(0, replacement.start)}${replacement.value}${text.slice(replacement.end)}`;
	}
	// The replacement operation only changes URLs/alt text, so existing line endings remain stable.
	writeFileSync(absolute, text, "utf8");
}

function rewriteReferences(audit, entriesBySource) {
	const replacementsByFile = new Map();
	let rewritten = 0;
	for (const reference of audit.references) {
		if (!reference.active || !reference.resolvedSource) continue;
		const entry = entriesBySource.get(reference.resolvedSource);
		if (!entry) continue;
		const fileReplacements = replacementsByFile.get(reference.file) ?? [];
		fileReplacements.push({
			expected: reference.reference,
			start: reference.start,
			end: reference.end,
			value: entry.url,
		});
		if (
			reference.kind === "markdown-image" &&
			(reference.alt === "" || reference.alt === "img") &&
			reference.altStart !== undefined
		) {
			fileReplacements.push({
				expected: reference.alt,
				start: reference.altStart,
				end: reference.altEnd,
				value: semanticAltForSource(reference.resolvedSource),
			});
		}
		replacementsByFile.set(reference.file, fileReplacements);
		rewritten += 1;
	}
	for (const [file, replacements] of replacementsByFile) {
		applyReplacements(file, replacements);
	}
	return { fileCount: replacementsByFile.size, referenceCount: rewritten };
}

function semanticAltForSource(source) {
	const name = source.split("/").at(-1)?.replace(/\.[^.]+$/u, "") ?? "图片";
	const labels = {
		SpringAOP01: "Spring AOP 核心概念示意图",
		SpringAOP02: "Spring AOP 切面执行流程",
		SpringMVC01: "Spring MVC 架构图",
		SpringMVC02: "Spring MVC 请求处理流程",
		SpringMVC03: "Spring MVC 与三层架构",
		SpringIOC01: "Spring IOC 容器示意图",
		SpringIOC02: "Spring Bean 生命周期",
		SpringIOC03: "Spring 依赖注入流程",
		SpringIOC04: "Spring BeanFactory 结构",
		SpringIOC05: "Spring ApplicationContext 结构",
		SpringIOC06: "Spring IOC 组件关系",
		Java动态代理: "Java 动态代理示意图",
	};
	return labels[name] ?? `${name} 图片`;
}

function makeManifest(config, entries, audit, uploadedObjectCount, uploadedBytes) {
	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		publicBaseUrl: config.publicBaseUrl,
		bucket: config.bucket,
		referencesRewritten: false,
		entries,
		skipped: audit.assets
			.filter((asset) => asset.decision !== "migrate")
			.map(({ source, size, sha256, category, decision }) => ({
				source,
				size,
				sha256,
				category,
				decision,
			})),
		summary: {
			sourceCount: entries.length,
			uniqueObjectCount: uploadedObjectCount,
			uploadedBytes,
			migratableBytes: audit.summary.migratableBytes,
		},
	};
}

function countManifestReferences(manifest) {
	const urls = [...new Set(manifest.entries.map((entry) => entry.url))];
	const files = [
		...walkFiles(absolutePath("src")),
		...walkFiles(absolutePath("shirones/config")),
	].filter((file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase()));
	const touchedFiles = new Set();
	let referenceCount = 0;
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		let fileCount = 0;
		for (const url of urls) fileCount += text.split(url).length - 1;
		if (fileCount > 0) {
			touchedFiles.add(relativePath(file));
			referenceCount += fileCount;
		}
	}
	return { fileCount: touchedFiles.size, referenceCount };
}

function refreshManifestCounts(manifest) {
	if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) {
		throw new Error("Media manifest is missing or has an unsupported schema.");
	}
	const counts = countManifestReferences(manifest);
	manifest.rewrite = {
		...manifest.rewrite,
		...counts,
		refreshedAt: new Date().toISOString(),
	};
	writeJson(MANIFEST_PATH, manifest);
	console.log(
		`[media:migrate] refreshed manifest reference counts: ${counts.referenceCount} references in ${counts.fileCount} files`,
	);
}

function validateManifestForPrune(manifest) {
	if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) {
		throw new Error("Media manifest is missing or has an unsupported schema.");
	}
	if (!manifest.referencesRewritten) {
		throw new Error("Refusing to prune before all references are rewritten and validated.");
	}
	for (const entry of manifest.entries) {
		if (entry.localState === "removed") continue;
		const absolute = absolutePath(entry.source);
		if (!existsSync(absolute)) {
			throw new Error(`Expected migrated source is missing: ${entry.source}`);
		}
		if (sha256File(absolute) !== entry.sha256) {
			throw new Error(`Migrated source changed after upload: ${entry.source}`);
		}
	}
}

function pruneManifest(manifest, audit) {
	validateManifestForPrune(manifest);
	const activeSources = new Set(
		audit.references
			.filter((reference) => reference.active && reference.resolvedSource)
			.map((reference) => reference.resolvedSource),
	);
	for (const entry of manifest.entries) {
		if (entry.localState === "removed") continue;
		if (activeSources.has(entry.source)) {
			throw new Error(`Refusing to prune source still referenced locally: ${entry.source}`);
		}
		unlinkSync(absolutePath(entry.source));
		entry.localState = "removed";
		entry.prunedAt = new Date().toISOString();
	}
	manifest.prunedAt = new Date().toISOString();
	writeJson(MANIFEST_PATH, manifest);
	return manifest.entries.filter((entry) => entry.localState === "removed").length;
}

function resumeManifestIfReady(manifest, audit) {
	if (!manifest || manifest.schemaVersion !== 1 || manifest.referencesRewritten) return false;
	if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) return false;
	const migratedSources = new Set(manifest.entries.map((entry) => entry.source));
	const staleReferences = audit.references.filter(
		(reference) => reference.active && migratedSources.has(reference.resolvedSource),
	);
	if (staleReferences.length > 0) {
		throw new Error(
			`Incomplete migration still has ${staleReferences.length} local references; refusing to finalize.`,
		);
	}
	for (const entry of manifest.entries) {
		const source = absolutePath(entry.source);
		if (!existsSync(source) || sha256File(source) !== entry.sha256) {
			throw new Error(`Cannot finalize migration; source changed or is missing: ${entry.source}`);
		}
		entry.referencesRewritten = true;
	}
	const counts = countManifestReferences(manifest);
	manifest.referencesRewritten = true;
	manifest.rewrite = {
		...counts,
		completedAt: new Date().toISOString(),
		resumedAfterUpload: true,
	};
	writeJson(MANIFEST_PATH, manifest);
	console.log("[media:migrate] finalized previously uploaded objects and rewritten references");
	return true;
}

async function migrate({ dryRun, prune, refreshManifest, skipRemoteCheck }) {
	const audit = ensureAudit();
	if (prune) {
		if (!existsSync(MANIFEST_PATH)) throw new Error("No media migration manifest is available for pruning.");
		const manifest = readJson(MANIFEST_PATH);
		const removed = pruneManifest(manifest, audit);
		console.log(`[media:migrate] pruned=${removed} exact migrated source files`);
		return;
	}
	if (!dryRun && existsSync(MANIFEST_PATH)) {
		const existingManifest = readJson(MANIFEST_PATH);
		if (refreshManifest) {
			refreshManifestCounts(existingManifest);
			return;
		}
		if (resumeManifestIfReady(existingManifest, audit)) return;
	}

	const config = loadMediaConfig({ requireCredentials: !dryRun });
	const migratable = audit.assets.filter((asset) => asset.decision === "migrate");
	if (migratable.length === 0) {
		console.log("[media:migrate] no migratable assets found");
		return;
	}
	const keyByHash = buildKeyByHash(migratable);
	const entriesBySource = new Map();
	const entries = [];
	const uploadedByHash = new Map();
	let uploadedBytes = 0;

	for (const asset of migratable) {
		const key = keyForAsset(asset, keyByHash);
		const known = uploadedByHash.get(asset.sha256);
		if (dryRun) {
			const url = config.publicBaseUrl ? r2ObjectUrl(config.publicBaseUrl, key) : key;
			entriesBySource.set(asset.source, manifestEntryFromAsset(asset, key, url));
			entries.push(manifestEntryFromAsset(asset, key, url));
			continue;
		}
		let uploaded = known;
		if (!uploaded) {
			console.log(`[media:migrate] uploading ${asset.source} -> ${key}`);
			const result = await uploadObject(config, asset, key, skipRemoteCheck);
			uploaded = { ...result, size: asset.size };
			uploadedByHash.set(asset.sha256, uploaded);
			uploadedBytes += asset.size;
		}
		const entry = manifestEntryFromAsset(asset, key, uploaded.publicUrl);
		entry.publicStatus = uploaded.verifiedStatus;
		entriesBySource.set(asset.source, entry);
		entries.push(entry);
	}

	if (dryRun) {
		console.log(`[media:migrate] dry-run assets=${entries.length}`);
		for (const entry of entries) console.log(`  ${entry.source} -> ${entry.url}`);
		return;
	}

	const manifest = makeManifest(
		config,
		entries,
		audit,
		uploadedByHash.size,
		uploadedBytes,
	);
	writeJson(MANIFEST_PATH, manifest);
	const rewritten = rewriteReferences(audit, entriesBySource);
	manifest.referencesRewritten = true;
	manifest.rewrite = {
		fileCount: rewritten.fileCount,
		referenceCount: rewritten.referenceCount,
		completedAt: new Date().toISOString(),
	};
	for (const entry of manifest.entries) entry.referencesRewritten = true;
	writeJson(MANIFEST_PATH, manifest);
	console.log(
		`[media:migrate] uploaded=${uploadedByHash.size} objects (${formatBytes(uploadedBytes)}), sources=${entries.length}, rewritten=${rewritten.referenceCount} references in ${rewritten.fileCount} files`,
	);
	console.log(`[media:migrate] manifest: ${relativePath(MANIFEST_PATH)}`);
}

export async function main() {
	try {
		await migrate(parseArgs());
	} catch (error) {
		console.error(`[media:migrate] ${error instanceof Error ? error.message : "migration failed"}`);
		process.exitCode = 1;
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}

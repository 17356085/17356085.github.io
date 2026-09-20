import { existsSync, existsSync as mediaExistsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	MANIFEST_PATH,
	absolutePath,
	formatBytes,
	r2ObjectUrl,
	readJson,
	resolveLocalReference,
	sha256File,
} from "./media-common.mjs";
import { buildAudit } from "./media-audit.mjs";

function parseArgs() {
	return { noRemote: new Set(process.argv.slice(2)).has("--no-remote") };
}

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	return fetch(url, { ...options, signal: controller.signal }).finally(() => {
		clearTimeout(timer);
	});
}

async function verifyUrl(url) {
	let response = await fetchWithTimeout(url, { method: "HEAD" });
	if (response.ok || (response.status >= 300 && response.status < 400)) return response.status;
	if (response.status === 405 || response.status === 403) {
		response = await fetchWithTimeout(url, {
			method: "GET",
			headers: { range: "bytes=0-0" },
		});
	}
	if (!response.ok && !(response.status >= 300 && response.status < 400)) {
		throw new Error(`HTTP ${response.status}`);
	}
	return response.status;
}

async function checkManifest({ noRemote }) {
	if (!existsSync(MANIFEST_PATH)) throw new Error("Media migration manifest is missing.");
	const manifest = readJson(MANIFEST_PATH);
	const issues = [];
	if (manifest.schemaVersion !== 1) issues.push("unsupported manifest schema");
	if (!manifest.publicBaseUrl || !/^https?:\/\//iu.test(manifest.publicBaseUrl)) {
		issues.push("manifest has no valid publicBaseUrl");
	}
	if (!manifest.referencesRewritten) issues.push("referencesRewritten is false");
	if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
		issues.push("manifest has no migrated entries");
	}

	const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
	const serialized = JSON.stringify(manifest);
	if (/(?:secretAccessKey|accessKeyId|R2_SECRET|AWS_SECRET|Authorization)/iu.test(serialized)) {
		issues.push("manifest contains a credential-like field");
	}

	const audit = buildAudit();
	const staleReferences = [];
	for (const reference of audit.references) {
		if (!reference.active || reference.remote) continue;
		for (const entry of entries) {
			const resolved = resolveLocalReference(reference.reference, reference.file);
			if (resolved?.relative === entry.source) {
				staleReferences.push(`${reference.file}:${reference.line} -> ${entry.source}`);
			}
		}
	}
	if (staleReferences.length > 0) {
		issues.push(`old local references remain (${staleReferences.length})`);
	}

	const seenKeys = new Set();
	for (const entry of entries) {
		if (!entry.source || !entry.r2Key || !entry.url || !entry.sha256) {
			issues.push(`incomplete manifest entry: ${entry.source ?? "unknown"}`);
			continue;
		}
		if (seenKeys.has(entry.r2Key)) {
			// Duplicate sources are intentional when their content hash is shared.
			const first = entries.find((candidate) => candidate.r2Key === entry.r2Key);
			if (first?.sha256 !== entry.sha256) issues.push(`R2 key collision: ${entry.r2Key}`);
		} else {
			seenKeys.add(entry.r2Key);
		}
		if (!entry.r2Key.startsWith("blog/")) issues.push(`unexpected R2 key: ${entry.r2Key}`);
		const expectedUrl = r2ObjectUrl(manifest.publicBaseUrl, entry.r2Key);
		if (entry.url !== expectedUrl) issues.push(`URL/key mismatch: ${entry.source}`);
		const source = absolutePath(entry.source);
		if (entry.localState === "removed") {
			if (mediaExistsSync(source)) issues.push(`source was not removed: ${entry.source}`);
		} else if (entry.localState === "retained") {
			if (!mediaExistsSync(source)) issues.push(`retained source is missing: ${entry.source}`);
			else if (sha256File(source) !== entry.sha256) issues.push(`source hash changed: ${entry.source}`);
		} else {
			issues.push(`unknown localState for ${entry.source}`);
		}
		if (!noRemote) {
			try {
				const status = await verifyUrl(entry.url);
				console.log(`[media:check] ${status} ${entry.r2Key}`);
			} catch (error) {
				issues.push(`public URL failed: ${entry.url} (${error instanceof Error ? error.message : "unknown error"})`);
			}
		}
	}

	if (issues.length > 0) {
		for (const issue of issues) console.error(`[media:check] ${issue}`);
		process.exitCode = 1;
		return;
	}
	const remaining = audit.assets.length;
	console.log(
		`[media:check] pass: entries=${entries.length}, localImages=${remaining}, migratedBytes=${formatBytes(manifest.summary?.migratableBytes ?? 0)}, remote=${noRemote ? "skipped" : "verified"}`,
	);
}

export async function main() {
	try {
		await checkManifest(parseArgs());
	} catch (error) {
		console.error(`[media:check] ${error instanceof Error ? error.message : "check failed"}`);
		process.exitCode = 1;
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}

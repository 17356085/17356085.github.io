import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = resolve(repoRoot, "docs/live2d/release-manifest.json");

const assetGroups = Object.freeze([
	{
		name: "whale-maid-model", root: "public/live2d/whale-maid",
		files: ["whale-maid.model3.json", "whale-maid.moc3", "whale-maid.physics3.json", "whale-maid.cdi3.json", "whale-maid.2048/texture_00.png", "motions/greet.motion3.json", "motions/idle.motion3.json", "motions/pet.motion3.json", "motions/sleep.motion3.json", "motions/wake.motion3.json", "motions/wave.motion3.json"],
	},
	{ name: "whale-maid-fallback", root: "public/live2d/whale-maid/fallback", files: ["actions.webp", "idle.webp", "look.webp"] },
	{ name: "cubism-core", root: "public/live2d/vendor", files: ["live2dcubismcore.min.js", "CoreLICENSE.md", "SDKLICENSE.md", "RedistributableFiles.txt"] },
]);

const sourceFiles = Object.freeze([
	"src/components/WhaleMascot.astro",
	"src/layouts/MainGridLayout.astro",
	"src/scripts/whale-live2d-motion.ts",
	"src/scripts/whale-live2d-physics.ts",
	"src/scripts/whale-live2d-secondary.ts",
	"src/scripts/whale-live2d.ts",
]);

const declaredAssets = new Set(assetGroups.flatMap((group) =>
	group.files.map((file) => `${group.root}/${file}`)));

function fail(message) {
	throw new Error(`[live2d-manifest] ${message}`);
}

function comparePaths(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}

function escapes(base, target) {
	const fromBase = relative(base, target);
	return fromBase === ".." || fromBase.startsWith("..\\") || fromBase.startsWith("../") || isAbsolute(fromBase);
}

function repoPath(path) {
	const normalized = path.replaceAll("\\", "/");
	if (isAbsolute(normalized)) fail(`Path must be repository-relative: ${path}`);
	const absolutePath = resolve(repoRoot, normalized);
	if (escapes(repoRoot, absolutePath)) fail(`Path escapes the repository: ${path}`);
	return absolutePath;
}

function ensureFile(path) {
	const absolutePath = repoPath(path);
	if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) fail(`Required file is missing: ${path}`);
	return absolutePath;
}

function relativePath(path) {
	return relative(repoRoot, path).replaceAll("\\", "/");
}

function fileRecord(path) {
	const bytes = readFileSync(ensureFile(path));
	return {
		path: path.replaceAll("\\", "/"),
		bytes: bytes.length,
		sha256: createHash("sha256").update(bytes).digest("hex"),
	};
}

function sumBytes(files) {
	return files.reduce((total, file) => total + file.bytes, 0);
}

function modelReferencePath(modelRoot, reference, label) {
	if (typeof reference !== "string" || reference.trim() === "") fail(`Malformed model reference at ${label}`);
	const normalized = reference.replaceAll("\\", "/");
	if (isAbsolute(normalized) || /^[a-z][a-z\d+.-]*:/iu.test(normalized) || normalized.includes("\0")) {
		fail(`Model reference must be local at ${label}: ${reference}`);
	}
	const absolutePath = resolve(modelRoot, normalized);
	if (relative(modelRoot, absolutePath) === "" || escapes(modelRoot, absolutePath)) {
		fail(`Model reference escapes the model package at ${label}: ${reference}`);
	}
	return absolutePath;
}

function validateModelReferences() {
	const modelPath = "public/live2d/whale-maid/whale-maid.model3.json";
	let model;
	try {
		model = JSON.parse(readFileSync(ensureFile(modelPath), "utf8"));
	} catch (error) {
		fail(`Malformed model3 JSON at ${modelPath}: ${error.message}`);
	}
	if (!model || typeof model !== "object" || Array.isArray(model)) {
		fail(`Malformed model3 JSON at ${modelPath}`);
	}
	const references = model.FileReferences;
	if (!references || typeof references !== "object" || Array.isArray(references)) fail(`Malformed FileReferences in ${modelPath}`);
	const modelRoot = repoPath("public/live2d/whale-maid");
	const check = (value, label) => {
		const path = relativePath(modelReferencePath(modelRoot, value, label));
		if (!declaredAssets.has(path)) fail(`Referenced file is not in the release inventory at ${label}: ${path}`);
		ensureFile(path);
	};
	check(references.Moc, "FileReferences.Moc");
	check(references.Physics, "FileReferences.Physics");
	check(references.DisplayInfo, "FileReferences.DisplayInfo");
	if (!Array.isArray(references.Textures)) fail(`Malformed FileReferences.Textures in ${modelPath}`);
	references.Textures.forEach((value, index) => check(value, `FileReferences.Textures[${index}]`));
	if (!references.Motions || typeof references.Motions !== "object" || Array.isArray(references.Motions)) fail(`Malformed FileReferences.Motions in ${modelPath}`);
	for (const [name, entries] of Object.entries(references.Motions)) {
		if (!Array.isArray(entries)) fail(`Malformed motion group ${name} in ${modelPath}`);
		entries.forEach((entry, index) => {
			if (!entry || typeof entry !== "object") fail(`Malformed motion ${name}[${index}] in ${modelPath}`);
			check(entry.File, `FileReferences.Motions.${name}[${index}].File`);
		});
	}
}

function buildGroup(group) {
	const paths = group.files.map((file) => `${group.root}/${file}`);
	const files = paths.sort(comparePaths).map(fileRecord);
	return { name: group.name, root: group.root, files, total_bytes: sumBytes(files) };
}

function buildManifest() {
	validateModelReferences();
	const groups = assetGroups.map(buildGroup);
	const source = sourceFiles.slice().sort(comparePaths).map(fileRecord);
	const sourceBytes = sumBytes(source);
	return {
		manifest_version: 1,
		asset: "live2d-whale-maid",
		groups,
		source: { files: source, total_bytes: sourceBytes },
		totals: {
			assets_bytes: groups.reduce((total, group) => total + group.total_bytes, 0),
			source_bytes: sourceBytes,
		},
	};
}

function main() {
	const manifest = buildManifest();
	mkdirSync(dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
	console.log(`Wrote ${relativePath(outputPath)} (${manifest.totals.assets_bytes} asset bytes; ${manifest.totals.source_bytes} source bytes)`);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}

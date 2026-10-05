import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import {
	mkdir,
	readFile,
	readdir,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CHUNK_SIZE = 256;
const SOURCE_SPECIFIER = "shirones/src/assets/fonts/Yozai-Medium.ttf";
const TEXT_EXTENSIONS = new Set([".md", ".mdx", ".ts", ".js", ".json"]);

// subset-font is a transitive dependency of Shirones. Resolving it from the
// theme package keeps this script independent of the application's direct
// dependency list.
const shironesRequire = createRequire(import.meta.resolve("shirones"));
const subsetFontModule = shironesRequire("subset-font");
const subsetFont = subsetFontModule.default ?? subsetFontModule;
const fontverter = shironesRequire("fontverter");

/**
 * Read a big-endian unsigned integer from an SFNT buffer.
 * @param {Buffer} buffer
 * @param {number} offset
 * @param {number} size
 */
function readUnsigned(buffer, offset, size) {
	if (offset < 0 || offset + size > buffer.length) {
		throw new Error(`SFNT read out of bounds at ${offset} (${size} bytes)`);
	}
	if (size === 2) return buffer.readUInt16BE(offset);
	if (size === 4) return buffer.readUInt32BE(offset);
	throw new Error(`Unsupported SFNT integer size: ${size}`);
}

/**
 * Parse one format 4 cmap subtable and return its non-.notdef code points.
 * @param {Buffer} buffer
 * @param {number} offset
 */
function parseFormat4(buffer, offset) {
	const length = readUnsigned(buffer, offset + 2, 2);
	const end = Math.min(buffer.length, offset + length);
	const segCount = readUnsigned(buffer, offset + 6, 2) / 2;
	const endCodeOffset = offset + 14;
	const startCodeOffset = endCodeOffset + segCount * 2 + 2;
	const idDeltaOffset = startCodeOffset + segCount * 2;
	const idRangeOffsetOffset = idDeltaOffset + segCount * 2;
	const codePoints = new Set();

	for (let index = 0; index < segCount; index += 1) {
		const segmentEnd = readUnsigned(buffer, endCodeOffset + index * 2, 2);
		const segmentStart = readUnsigned(buffer, startCodeOffset + index * 2, 2);
		if (segmentEnd < segmentStart) continue;
		const idDelta = buffer.readInt16BE(idDeltaOffset + index * 2);
		const idRangeOffsetAddress = idRangeOffsetOffset + index * 2;
		const idRangeOffset = readUnsigned(buffer, idRangeOffsetAddress, 2);

		for (
			let codePoint = segmentStart;
			codePoint <= segmentEnd;
			codePoint += 1
		) {
			if (codePoint > 0x10ffff) continue;
			let glyphId;
			if (idRangeOffset === 0) {
				glyphId = (codePoint + idDelta) & 0xffff;
			} else {
				const glyphAddress =
					idRangeOffsetAddress + idRangeOffset + (codePoint - segmentStart) * 2;
				if (glyphAddress + 2 > end) continue;
				glyphId = readUnsigned(buffer, glyphAddress, 2);
				if (glyphId !== 0) glyphId = (glyphId + idDelta) & 0xffff;
			}
			if (glyphId !== 0 && !(codePoint >= 0xd800 && codePoint <= 0xdfff)) {
				codePoints.add(codePoint);
			}
		}
	}
	return codePoints;
}

/**
 * Parse one format 12 cmap subtable and return its non-.notdef code points.
 * @param {Buffer} buffer
 * @param {number} offset
 */
function parseFormat12(buffer, offset) {
	const length = readUnsigned(buffer, offset + 4, 4);
	const end = Math.min(buffer.length, offset + length);
	const groupCount = readUnsigned(buffer, offset + 12, 4);
	const codePoints = new Set();

	for (let index = 0; index < groupCount; index += 1) {
		const groupOffset = offset + 16 + index * 12;
		if (groupOffset + 12 > end) break;
		const start = readUnsigned(buffer, groupOffset, 4);
		const groupEnd = readUnsigned(buffer, groupOffset + 4, 4);
		const startGlyph = readUnsigned(buffer, groupOffset + 8, 4);
		if (groupEnd < start || startGlyph === 0) continue;
		for (let codePoint = start; codePoint <= groupEnd; codePoint += 1) {
			if (
				codePoint <= 0x10ffff &&
				!(codePoint >= 0xd800 && codePoint <= 0xdfff)
			) {
				codePoints.add(codePoint);
			}
		}
	}
	return codePoints;
}

/**
 * Read every Unicode cmap subtable that this task supports. Format 4 and 12
 * are both collected because fonts commonly carry one for BMP and one for
 * supplementary planes.
 * @param {Buffer} buffer
 */
export function readSupportedCodePoints(buffer) {
	if (buffer.length < 12) throw new Error("Font is too small to be an SFNT");
	const tableCount = readUnsigned(buffer, 4, 2);
	let cmapOffset = -1;
	for (let index = 0; index < tableCount; index += 1) {
		const recordOffset = 12 + index * 16;
		if (recordOffset + 16 > buffer.length) break;
		if (buffer.toString("ascii", recordOffset, recordOffset + 4) === "cmap") {
			cmapOffset = readUnsigned(buffer, recordOffset + 8, 4);
			break;
		}
	}
	if (cmapOffset < 0) throw new Error("Font has no cmap table");

	const cmapTableCount = readUnsigned(buffer, cmapOffset + 2, 2);
	const codePoints = new Set();
	for (let index = 0; index < cmapTableCount; index += 1) {
		const recordOffset = cmapOffset + 4 + index * 8;
		const subtableOffset =
			cmapOffset + readUnsigned(buffer, recordOffset + 4, 4);
		const format = readUnsigned(buffer, subtableOffset, 2);
		let parsed;
		if (format === 4) parsed = parseFormat4(buffer, subtableOffset);
		else if (format === 12) parsed = parseFormat12(buffer, subtableOffset);
		else continue;
		for (const codePoint of parsed) codePoints.add(codePoint);
	}
	if (codePoints.size === 0)
		throw new Error("Font cmap has no supported Unicode code points");
	return codePoints;
}

/** @param {string} root */
async function collectTextFiles(root) {
	if (!existsSync(root)) return [];
	const files = [];
	for (const entry of await readdir(root, { withFileTypes: true })) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...(await collectTextFiles(path)));
		else if (
			TEXT_EXTENSIONS.has(
				entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase(),
			)
		) {
			files.push(path);
		}
	}
	return files;
}

/**
 * Count characters in the same content/config/i18n areas used by Shirones'
 * built-in subsetting pass.
 * @param {string} projectRoot
 */
async function collectCharacterFrequency(projectRoot) {
	const themeRoot = dirname(shironesRequire.resolve("shirones"));
	const roots = [
		join(projectRoot, "src/content"),
		join(projectRoot, "shirones/config"),
		join(themeRoot, "src/i18n"),
	];
	const frequencies = new Map();
	for (const root of roots) {
		for (const file of await collectTextFiles(root)) {
			const text = await readFile(file, "utf8");
			for (const codePoint of text) {
				const value = codePoint.codePointAt(0);
				if (value > 31)
					frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
			}
		}
	}
	return frequencies;
}

/** Keep interface and public card text together before article-body glyphs. */
async function collectInterfaceCharacters(projectRoot) {
	const characters = new Set();
	const add = (text) => {
		for (const character of text) characters.add(character.codePointAt(0));
	};
	const addStrings = (text) => {
		const withoutLineComments = text
			.split(/\r?\n/)
			.filter((line) => !line.trimStart().startsWith("//"))
			.join("\n");
		for (const match of withoutLineComments.matchAll(/["']([^"'\r\n]*)["']/g))
			add(match[1]);
	};
	const themeRoot = dirname(shironesRequire.resolve("shirones"));
	addStrings(
		await readFile(join(themeRoot, "src/i18n/languages/zh_CN.ts"), "utf8"),
	);
	for (const entry of await readdir(join(projectRoot, "shirones/config"), {
		withFileTypes: true,
	})) {
		if (entry.isFile() && entry.name.endsWith(".ts"))
			addStrings(
				await readFile(
					join(projectRoot, "shirones/config", entry.name),
					"utf8",
				),
			);
	}
	for (const file of await collectTextFiles(join(projectRoot, "src/content"))) {
		if (!/\.mdx?$/.test(file)) continue;
		const text = await readFile(file, "utf8");
		const frontmatter = text.match(
			/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
		)?.[1];
		if (frontmatter && !/^draft:\s*true\b/m.test(frontmatter)) add(frontmatter);
	}
	const mascotPath = join(projectRoot, "src/components/WhaleMascot.astro");
	if (existsSync(mascotPath)) addStrings(await readFile(mascotPath, "utf8"));
	return characters;
}

/** @param {number[]} codePoints */
function toUnicodeRange(codePoints) {
	const sorted = [...codePoints].sort((left, right) => left - right);
	const ranges = [];
	let start = sorted[0];
	let previous = sorted[0];
	for (let index = 1; index < sorted.length; index += 1) {
		const current = sorted[index];
		if (current === previous + 1) {
			previous = current;
			continue;
		}
		ranges.push([start, previous]);
		start = previous = current;
	}
	ranges.push([start, previous]);
	return ranges
		.map(([rangeStart, rangeEnd]) =>
			rangeStart === rangeEnd
				? `U+${rangeStart.toString(16).toUpperCase()}`
				: `U+${rangeStart.toString(16).toUpperCase()}-${rangeEnd.toString(16).toUpperCase()}`,
		)
		.join(", ");
}

/** @param {string} path */
async function readJson(path) {
	try {
		return JSON.parse(await readFile(path, "utf8"));
	} catch (error) {
		if (error?.code === "ENOENT") return null;
		throw error;
	}
}

/** @param {string} path @param {unknown} value */
async function writeJson(path, value) {
	const temporaryPath = `${path}.${process.pid}.tmp`;
	await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
	await rename(temporaryPath, path);
}

/** @param {string} value */
function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

/**
 * Generate disjoint Yozai Medium WOFF2 subsets and the FontVariant manifest
 * consumed by shirones/config/fontConfig.ts. The returned array is directly
 * usable as a FontVariant[]; build statistics are persisted in manifest.json.
 *
 * @returns {Promise<Array<{file: string, weight: number, style: "normal", subset: string, unicodeRange: string}>>}
 */
export async function prepareYozaiFontSubsets() {
	const projectRoot = resolve(process.cwd());
	const outputDir = join(projectRoot, "src/assets/fonts/yozai");
	const variantsPath = join(outputDir, "variants.json");
	const manifestPath = join(outputDir, "manifest.json");
	const sourcePath = shironesRequire.resolve(SOURCE_SPECIFIER);
	const sourceBuffer = await readFile(sourcePath);
	const sourceHash = createHash("sha256").update(sourceBuffer).digest("hex");
	const supportedCodePoints = readSupportedCodePoints(sourceBuffer);
	const frequencies = await collectCharacterFrequency(projectRoot);
	const interfaceCharacters = await collectInterfaceCharacters(projectRoot);
	const orderedCodePoints = [...supportedCodePoints].sort((left, right) => {
		const interfaceDifference =
			Number(interfaceCharacters.has(right)) -
			Number(interfaceCharacters.has(left));
		if (interfaceDifference) return interfaceDifference;
		const frequencyDifference =
			(frequencies.get(right) ?? 0) - (frequencies.get(left) ?? 0);
		return frequencyDifference || left - right;
	});
	const groupingFingerprint = sha256(
		`${CHUNK_SIZE}:${orderedCodePoints.join(",")}`,
	);
	const chunks = [];
	for (let index = 0; index < orderedCodePoints.length; index += CHUNK_SIZE) {
		chunks.push(orderedCodePoints.slice(index, index + CHUNK_SIZE));
	}

	await mkdir(outputDir, { recursive: true });
	const previousManifest = await readJson(manifestPath);
	const previousVariants = Array.isArray(previousManifest?.variants)
		? previousManifest.variants
		: [];
	const previousCacheMatches =
		previousManifest?.sourceHash === sourceHash &&
		previousManifest?.groupingFingerprint === groupingFingerprint &&
		previousManifest?.chunkSize === CHUNK_SIZE &&
		previousVariants.length === chunks.length &&
		(await readJson(variantsPath)) !== null;
	const cacheFilesExist = previousVariants.every(
		(variant) =>
			typeof variant?.file === "string" &&
			existsSync(join(projectRoot, variant.file)),
	);
	const cachedHashes = [];
	if (previousCacheMatches && cacheFilesExist) {
		for (const variant of previousVariants) {
			cachedHashes.push(
				sha256(await readFile(join(projectRoot, variant.file))),
			);
		}
	}
	const hasVerifiedCache =
		previousManifest?.coverageVerified === true &&
		Array.isArray(previousManifest.outputHashes) &&
		previousManifest.outputHashes.length === previousVariants.length &&
		cachedHashes.every(
			(hash, index) => hash === previousManifest.outputHashes[index],
		);
	const cacheCorrupted =
		Array.isArray(previousManifest?.outputHashes) && !hasVerifiedCache;

	let variants;
	let generated = false;
	if (previousCacheMatches && cacheFilesExist && !cacheCorrupted) {
		variants = previousVariants;
	} else {
		generated = true;
		variants = chunks.map((chunk, index) => ({
			file: `src/assets/fonts/yozai/yozai-${String(index + 1).padStart(4, "0")}.woff2`,
			weight: 500,
			style: "normal",
			subset: `yozai-${String(index + 1).padStart(4, "0")}`,
			unicodeRange: toUnicodeRange(chunk),
		}));

		for (const [index, chunk] of chunks.entries()) {
			const relativeOutput = variants[index].file;
			const outputPath = join(projectRoot, relativeOutput);
			const temporaryPath = `${outputPath}.${process.pid}.tmp`;
			const subsetBuffer = await subsetFont(
				sourceBuffer,
				String.fromCodePoint(...chunk),
				{
					targetFormat: "woff2",
					noLayoutClosure: true,
				},
			);
			if (!subsetBuffer?.length)
				throw new Error(`Empty subset generated for ${relativeOutput}`);
			await writeFile(temporaryPath, subsetBuffer);
			await rename(temporaryPath, outputPath);
		}
		await writeJson(variantsPath, variants);
	}

	const expectedSets = chunks.map((chunk) => new Set(chunk));
	const coveredCodePoints = new Set();
	const sizes = [];
	const outputHashes = [];
	for (const [index, variant] of variants.entries()) {
		const outputPath = join(projectRoot, variant.file);
		const outputBuffer = await readFile(outputPath);
		outputHashes.push(sha256(outputBuffer));
		if (!generated && hasVerifiedCache) {
			for (const codePoint of expectedSets[index])
				coveredCodePoints.add(codePoint);
			sizes.push(outputBuffer.length);
			continue;
		}
		const sfntBuffer = await fontverter.convert(outputBuffer, "sfnt");
		const outputCodePoints = readSupportedCodePoints(Buffer.from(sfntBuffer));
		for (const codePoint of outputCodePoints) {
			if (!supportedCodePoints.has(codePoint)) {
				throw new Error(
					`${variant.file} contains unsupported code point U+${codePoint.toString(16).toUpperCase()}`,
				);
			}
			coveredCodePoints.add(codePoint);
		}
		for (const codePoint of expectedSets[index]) {
			if (!outputCodePoints.has(codePoint)) {
				throw new Error(
					`${variant.file} is missing U+${codePoint.toString(16).toUpperCase()}`,
				);
			}
		}
		sizes.push(outputBuffer.length);
	}
	if (coveredCodePoints.size !== supportedCodePoints.size) {
		throw new Error(
			`Yozai subset coverage mismatch: source=${supportedCodePoints.size}, output=${coveredCodePoints.size}`,
		);
	}
	for (const codePoint of supportedCodePoints) {
		if (!coveredCodePoints.has(codePoint)) {
			throw new Error(
				`Yozai subset coverage is missing U+${codePoint.toString(16).toUpperCase()}`,
			);
		}
	}

	const sourceBytes = sourceBuffer.length;
	const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
	const stats = {
		sourceBytes,
		totalBytes,
		maxSubsetBytes: Math.max(...sizes),
		minSubsetBytes: Math.min(...sizes),
		compressionPercent: Number(
			((1 - totalBytes / sourceBytes) * 100).toFixed(2),
		),
	};
	const manifest = {
		schemaVersion: 1,
		source: "node_modules/shirones/src/assets/fonts/Yozai-Medium.ttf",
		sourceHash,
		groupingFingerprint,
		chunkSize: CHUNK_SIZE,
		supportedCharacters: supportedCodePoints.size,
		variantCount: variants.length,
		coverageVerified: true,
		outputHashes,
		generatedAt: new Date().toISOString(),
		cached: !generated,
		stats,
		variants,
	};
	await writeJson(manifestPath, manifest);

	const staleFiles = previousVariants
		.map((variant) => variant?.file)
		.filter(
			(file) =>
				typeof file === "string" &&
				!variants.some((variant) => variant.file === file),
		);
	for (const staleFile of staleFiles) {
		const stalePath = join(projectRoot, staleFile);
		if (relative(outputDir, stalePath).startsWith("..")) continue;
		await rm(stalePath, { force: true });
	}

	console.info(
		`[yozai] ${generated ? "generated" : "reused cache"}: ${variants.length} subsets, ${supportedCodePoints.size} characters, ` +
			`${(totalBytes / 1024).toFixed(1)} KiB total, ${(Math.max(...sizes) / 1024).toFixed(1)} KiB max; ` +
			"cmap coverage verified",
	);
	return variants;
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	await prepareYozaiFontSubsets();
}

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const work = join(root, ".tmp/site-images-20261006");
const base = "https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev";
const sources = [
	{
		id: "banner",
		url: `${base}/blog/site/banner/bg01.jpg`,
		widths: [960, 1920],
		quality: 85,
	},
	{
		id: "mahoyo-cover",
		url: `${base}/blog/covers/mahoyo-1.jpg`,
		widths: [320, 480, 640],
		quality: 82,
	},
	{
		id: "orange-road-cover",
		url: `${base}/images/posts/orange-road/frame-04.jpg`,
		widths: [320, 480, 640],
		quality: 82,
	},
	{
		id: "sakiko-cover",
		url: `${base}/blog/covers/sakiko.png`,
		widths: [320, 480, 640],
		quality: 82,
	},
];
const publish = process.argv.includes("--publish");
await mkdir(work, { recursive: true });
const prepared = await Promise.all(
	sources.map(async (source) => {
		const originalPath = join(work, `${source.id}.original`);
		let original;
		try {
			original = await readFile(originalPath);
		} catch {
			const response = await fetch(source.url, {
				signal: AbortSignal.timeout(600000),
			});
			if (!response.ok)
				throw new Error(
					`Image download failed (${response.status}): ${source.id}`,
				);
			original = Buffer.from(await response.arrayBuffer());
			await writeFile(originalPath, original);
		}
		const metadata = await sharp(original).metadata();
		if (!metadata.width || !metadata.height)
			throw new Error(`Missing dimensions: ${source.id}`);
		const variants = [];
		for (const width of [
			...new Set(source.widths.map((w) => Math.min(w, metadata.width))),
		]) {
			const { data, info } = await sharp(original)
				.rotate()
				.resize({ width, withoutEnlargement: true })
				.webp({ quality: source.quality, effort: 6 })
				.toBuffer({ resolveWithObject: true });
			const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
			const name = `${source.id}-${hash}-${info.width}.webp`;
			const path = join(work, name);
			await writeFile(path, data);
			variants.push({
				path,
				key: `images/site/responsive/${name}`,
				width: info.width,
				height: info.height,
				bytes: data.length,
				url: `${base}/images/site/responsive/${name}`,
			});
		}
		return {
			source: source.url,
			id: source.id,
			originalBytes: original.length,
			width: metadata.width,
			height: metadata.height,
			variants,
		};
	}),
);
if (publish) {
	for (const image of prepared)
		for (const variant of image.variants) {
			const result = JSON.parse(
				execFileSync(
					process.execPath,
					[
						join(root, "scripts/media/media-upload.mjs"),
						variant.path,
						"--category",
						"site",
						"--key",
						variant.key,
						"--json",
					],
					{ cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 },
				),
			)[0];
			if (result.publicStatus !== 200 || result.url !== variant.url)
				throw new Error(`Upload readback failed: ${variant.key}`);
		}
	const covers = Object.fromEntries(
		prepared
			.filter((image) => image.id !== "banner")
			.map((image) => {
				const largest = image.variants.at(-1);
				return [
					image.source,
					{
						src: largest.url,
						srcset: image.variants
							.map((v) => `${v.url} ${v.width}w`)
							.join(", "),
						width: image.width,
						height: image.height,
					},
				];
			}),
	);
	await mkdir(join(root, "src/data"), { recursive: true });
	await writeFile(
		join(root, "src/data/responsive-covers.json"),
		`${JSON.stringify(covers, null, 2)}\n`,
	);
}
await writeFile(
	join(work, "manifest.json"),
	`${JSON.stringify(prepared, null, 2)}\n`,
);
console.log(
	JSON.stringify(
		prepared.map((image) => ({
			id: image.id,
			originalBytes: image.originalBytes,
			variants: image.variants.map(({ width, bytes, url }) => ({
				width,
				bytes,
				url,
			})),
		})),
		null,
		2,
	),
);

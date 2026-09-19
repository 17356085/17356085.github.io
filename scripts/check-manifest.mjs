import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packagePath = join(root, "node_modules", "shirones", "package.json");

function fail(message) {
	console.error(`[manifest] ${message}`);
	process.exitCode = 1;
}

if (!existsSync(packagePath)) {
	fail("shirones is not installed; run pnpm install first.");
} else {
	const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
	if (packageJson.name !== "shirones" || packageJson.version !== "0.1.4") {
		fail(
			`expected shirones@0.1.4, found ${packageJson.name ?? "unknown"}@${packageJson.version ?? "unknown"}.`,
		);
	}
	if (!packageJson.exports?.["./collections"]) {
		fail("shirones does not expose the package-mode collections entry point.");
	}
}

const requiredPaths = [
	"astro.config.mjs",
	"src/content.config.ts",
	"src/content/posts",
	"src/content/notes",
	"src/pages/notes/index.astro",
	"src/pages/notes/[...slug].astro",
	"shirones/config/siteConfig.ts",
	"shirones/config/commentConfig.ts",
];

for (const relativePath of requiredPaths) {
	if (!existsSync(join(root, relativePath))) {
		fail(`missing ${relativePath}`);
	}
}

function countMarkdown(relativePath) {
	const directory = join(root, relativePath);
	if (!existsSync(directory)) return 0;
	let count = 0;
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory())
			count += countMarkdown(join(relativePath, entry.name));
		else if (/\.mdx?$/i.test(entry.name)) count += 1;
	}
	return count;
}

if (process.exitCode !== 1) {
	console.log(
		`[manifest] shirones@0.1.4 package mode is ready; posts=${countMarkdown("src/content/posts")}, notes=${countMarkdown("src/content/notes")}.`,
	);
}

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const issues = [];

function fail(message) {
	issues.push(message);
}

function walkFiles(directory) {
	if (!existsSync(directory)) return [];

	const files = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const absolutePath = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...walkFiles(absolutePath));
		else files.push(absolutePath);
	}
	return files;
}

function markdownFiles(directory) {
	return walkFiles(directory).filter((file) => /\.mdx?$/i.test(file));
}

function parseScalar(rawValue) {
	const value = rawValue.trim();
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null" || value === "~") return null;
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replaceAll("''", "'");
	}
	if (value.startsWith('"') && value.endsWith('"')) {
		try {
			return JSON.parse(value);
		} catch {
			return value.slice(1, -1);
		}
	}
	return value;
}

function readDocument(file) {
	const source = readFileSync(file, "utf8");
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	const frontmatter = {};
	if (match) {
		for (const line of match[1].split(/\r?\n/)) {
			const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
			if (field) frontmatter[field[1]] = parseScalar(field[2]);
		}
	}
	return { source, frontmatter };
}

function collectionDocuments(directory) {
	return markdownFiles(directory).map((file) => ({
		file,
		relative: relative(directory, file).replaceAll("\\", "/"),
		...readDocument(file),
	}));
}

function outputFileForRoute(route) {
	const cleanRoute = route.replace(/^\/+/, "");
	if (cleanRoute === "") return join(dist, "index.html");
	if (cleanRoute.endsWith("/")) {
		return join(dist, cleanRoute, "index.html");
	}
	return join(dist, cleanRoute);
}

function routeExists(route) {
	return existsSync(outputFileForRoute(route));
}

function stripUrlDecorations(value) {
	return value.split("#", 1)[0].split("?", 1)[0];
}

function resolveSourceImage(reference, sourceFile) {
	const value = stripUrlDecorations(reference.trim().replace(/^<|>$/g, ""));
	if (
		value === "" ||
		/^(?:https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(value)
	) {
		return null;
	}
	if (value.startsWith("/")) return join(root, "public", value.slice(1));
	if (value.startsWith("public/")) return join(root, value);
	return resolve(join(sourceFile, ".."), value);
}

function localOutputFile(reference) {
	let value = stripUrlDecorations(reference);
	try {
		value = decodeURIComponent(value);
	} catch {
		return null;
	}
	if (!value.startsWith("/")) return null;
	const cleanPath = value.replace(/^\/+/, "");
	if (cleanPath.endsWith("/")) return join(dist, cleanPath, "index.html");
	return join(dist, cleanPath);
}

function collectSourceImageReferences(documents) {
	const references = [];
	for (const document of documents) {
		const imageField = document.frontmatter.image;
		if (typeof imageField === "string" && imageField.trim()) {
			references.push({
				file: document.file,
				reference: imageField.trim(),
			});
		}

		const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;
		for (const match of document.source.matchAll(markdownImagePattern)) {
			references.push({ file: document.file, reference: match[1] });
		}
	}
	return references;
}

function contentCounts(documents) {
	return {
		total: documents.length,
		drafts: documents.filter((document) => document.frontmatter.draft === true)
			.length,
		public: documents.filter((document) => document.frontmatter.draft !== true)
			.length,
	};
}

function assertRequiredRoutes() {
	const routes = [
		"/",
		"/posts/",
		"/archive/",
		"/notes/",
		"/notes/engineering/knowledge-base/",
		"/anime/",
		"/robots.txt",
		"/rss.xml",
		"/sitemap-index.xml",
	];
	for (const route of routes) {
		if (!routeExists(route)) fail(`missing generated route: ${route}`);
	}
	console.log(`[output] required routes: ${routes.length} checked`);
}

function assertContentCounts(posts, notes) {
	const postCounts = contentCounts(posts);
	const noteCounts = contentCounts(notes);
	const postPages = walkFiles(join(dist, "posts")).filter(
		(file) =>
			file.endsWith("index.html") && file !== join(dist, "posts", "index.html"),
	);
	const notePages = walkFiles(join(dist, "notes")).filter((file) =>
		file.endsWith("index.html"),
	);

	if (postPages.length !== postCounts.public) {
		fail(
			`post page count mismatch: expected ${postCounts.public}, found ${postPages.length}`,
		);
	}
	if (notePages.length !== noteCounts.public + 1) {
		fail(
			`note page count mismatch: expected ${noteCounts.public + 1}, found ${notePages.length}`,
		);
	}

	const postHtml = postPages
		.map((file) => readFileSync(file, "utf8"))
		.join("\n");
	const noteHtml = notePages
		.map((file) => readFileSync(file, "utf8"))
		.join("\n");
	const corpus = postHtml + noteHtml;
	for (const document of [...posts, ...notes]) {
		const title = document.frontmatter.title;
		if (typeof title !== "string" || !title.trim()) {
			fail(`missing title in ${relative(root, document.file)}`);
			continue;
		}
		if (document.frontmatter.draft === true && corpus.includes(title)) {
			fail(`draft title leaked into generated article output: ${title}`);
		}
	}

	console.log(
		`[output] content counts: posts total=${postCounts.total}, public=${postCounts.public}, drafts=${postCounts.drafts}; notes total=${noteCounts.total}, public=${noteCounts.public}, drafts=${noteCounts.drafts}`,
	);
}

function assertImages(posts, notes) {
	const references = collectSourceImageReferences([...posts, ...notes]);
	let checked = 0;
	for (const { file, reference } of references) {
		const resolved = resolveSourceImage(reference, file);
		if (!resolved) continue;
		checked += 1;
		if (!existsSync(resolved)) {
			fail(`missing source image: ${relative(root, file)} -> ${reference}`);
		}
	}

	const generatedHtml = walkFiles(dist).filter((file) =>
		file.endsWith(".html"),
	);
	for (const file of generatedHtml) {
		const html = readFileSync(file, "utf8");
		const assetPattern = /\b(?:src|href)=["']([^"']+)["']/g;
		for (const match of html.matchAll(assetPattern)) {
			const outputFile = localOutputFile(match[1]);
			if (outputFile && !existsSync(outputFile)) {
				fail(`missing generated asset: ${relative(root, file)} -> ${match[1]}`);
			}
		}
	}

	console.log(`[output] image references checked: ${checked}; missing=0`);
}

function assertSiteIdentity() {
	const identity = "https://17356085.github.io";
	for (const route of [
		"/",
		"/posts/2026/快速了解cdn/",
		"/notes/engineering/knowledge-base/",
	]) {
		const file = outputFileForRoute(route);
		if (existsSync(file) && !readFileSync(file, "utf8").includes(identity)) {
			fail(`canonical site identity missing from ${route}`);
		}
	}

	const robots = join(dist, "robots.txt");
	if (
		!existsSync(robots) ||
		!readFileSync(robots, "utf8").includes("sitemap-index.xml")
	) {
		fail("robots.txt does not advertise sitemap-index.xml");
	}

	const commentConfig = readFileSync(
		join(root, "shirones", "config", "commentConfig.ts"),
		"utf8",
	);
	for (const marker of [
		'repo: "17356085/17356085.github.io"',
		'repoId: "R_kgDOPcYMPg"',
		'category: "Announcements"',
		'categoryId: "DIC_kwDOPcYMPs4CuH1t"',
		'lang: "zh-CN"',
	]) {
		if (!commentConfig.includes(marker))
			fail(`Giscus marker missing: ${marker}`);
	}
	console.log("[output] canonical, robots, and Giscus markers checked");
}

function assertNoDemoData() {
	const productionText = walkFiles(dist)
		.filter((file) => /\.(?:html|js|json|txt|xml|css)$/i.test(file))
		.map((file) => readFileSync(file, "utf8"))
		.join("\n");
	for (const marker of [
		"Lycoris Recoil",
		"Yowamushi Pedal",
		"Asteroid in Love",
		"The Secret of the Magic Girl",
		"dazbee",
		"hitori",
		"demo-avatar",
		"14164869977",
	]) {
		if (productionText.includes(marker))
			fail(`demo marker leaked into dist: ${marker}`);
	}
	console.log("[output] Anime is enabled with zero production demo entries");
}

function createStaticServer() {
	const server = createServer((request, response) => {
		try {
			const requestedPath = decodeURIComponent(
				new URL(request.url ?? "/", "http://127.0.0.1").pathname,
			);
			const file = resolve(dist, `.${requestedPath}`);
			if (!file.startsWith(resolve(dist))) {
				response.statusCode = 403;
				response.end();
				return;
			}
			if (!existsSync(file)) {
				response.statusCode = 404;
				response.end();
				return;
			}
			response.statusCode = 200;
			response.end(readFileSync(file));
		} catch {
			response.statusCode = 400;
			response.end();
		}
	});
	return server;
}

async function pagefindSearchChecks() {
	const pagefindEntry = join(dist, "pagefind", "pagefind.js");
	const pagefindMetadata = join(dist, "pagefind", "pagefind-entry.json");
	const fragments = walkFiles(join(dist, "pagefind", "fragment")).filter(
		(file) => file.endsWith(".pf_fragment"),
	);
	if (
		!existsSync(pagefindEntry) ||
		!existsSync(pagefindMetadata) ||
		fragments.length === 0
	) {
		fail("Pagefind output is incomplete");
		return;
	}

	const server = createStaticServer();
	await new Promise((resolveServer, rejectServer) => {
		server.once("error", rejectServer);
		server.listen(0, "127.0.0.1", resolveServer);
	});

	try {
		const port = server.address().port;
		const pagefind = await import(pathToFileURL(pagefindEntry).href);
		const index = pagefind.createInstance({
			basePath: `http://127.0.0.1:${port}/pagefind/`,
			noWorker: true,
		});
		await index.init();

		const search = async (term) => {
			const result = await index.search(term);
			return Promise.all(result.results.map((item) => item.data()));
		};
		const postResults = await search("CDN");
		const noteResults = await search("公开知识库的主干与边界");
		const draftResults = await search("深夜反思");

		if (
			postResults.length !== 1 ||
			postResults[0]?.raw_url !== "/posts/2026/快速了解cdn/"
		) {
			fail(
				"Pagefind Post query did not resolve uniquely to /posts/2026/快速了解cdn/",
			);
		}
		if (
			noteResults.length !== 1 ||
			noteResults[0]?.raw_url !== "/notes/engineering/knowledge-base/"
		) {
			fail(
				"Pagefind Note query did not resolve uniquely to the knowledge-base note",
			);
		}
		if (draftResults.length !== 0) {
			fail("Pagefind exposed the draft query 深夜反思");
		}
		await index.destroy();
		console.log(
			`[output] Pagefind search: Post=1, Note=1, draft=0; fragments=${fragments.length}`,
		);
	} catch (error) {
		fail(
			`Pagefind runtime search failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	} finally {
		server.close();
	}
}

async function main() {
	if (!existsSync(dist)) {
		fail("missing dist; run pnpm build first");
		return;
	}

	const posts = collectionDocuments(join(root, "src", "content", "posts"));
	const notes = collectionDocuments(join(root, "src", "content", "notes"));
	assertRequiredRoutes();
	assertContentCounts(posts, notes);
	assertImages(posts, notes);
	assertSiteIdentity();
	assertNoDemoData();
	await pagefindSearchChecks();

	if (issues.length > 0) {
		for (const issue of issues) console.error(`[output] FAIL: ${issue}`);
		process.exitCode = 1;
		return;
	}
	console.log("[output] migration output checks passed");
}

await main();

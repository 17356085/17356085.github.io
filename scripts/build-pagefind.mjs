import { resolve } from "node:path";
import { createIndex } from "pagefind";

const siteDirectory = resolve("dist");
const outputDirectory = resolve("dist", "pagefind");
const { index } = await createIndex({});

if (!index) {
	throw new Error("Pagefind failed to create an index.");
}

await index.addDirectory({ path: siteDirectory });
await index.writeFiles({ outputPath: outputDirectory });
console.log(`[pagefind] index generated at ${outputDirectory}`);

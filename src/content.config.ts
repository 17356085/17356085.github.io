import { defineCollection } from "astro:content";
import type { CollectionConfig } from "astro/content/config";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// These schemas mirror Shirone's public package-mode collection contract.
// They are kept inline because shirones@0.1.4 ships a malformed JSDoc code
// fence in collections.d.ts, which TypeScript parses as an unterminated file.
const postSchema: any = z.object({
	title: z.string(),
	published: z.date(),
	publishedAt: z.date().optional(),
	updated: z.date().optional(),
	updatedAt: z.date().optional(),
	pinned: z.boolean().optional().default(false),
	draft: z.boolean().optional().default(false),
	comment: z.boolean().optional().default(true),
	description: z.string().optional().default(""),
	image: z.string().optional().default(""),
	tags: z.array(z.string()).optional().default([]),
	category: z.string().optional().nullable().default(""),
	series: z
		.string()
		.optional()
		.default("")
		.transform((value) => value.trim()),
	seriesOrder: z.number().int().optional(),
	lang: z.string().optional().default(""),
	encrypted: z.boolean().optional().default(false),
	password: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.optional(),
	passwordHint: z.string().optional().default(""),
	hideHomeContent: z.boolean().optional().default(true),
	alias: z.string().optional(),
	permalink: z.string().optional(),
	prevUrl: z.string().optional(),
	nextUrl: z.string().optional(),
	prevTitle: z.string().default(""),
	prevSlug: z.string().default(""),
	nextTitle: z.string().default(""),
	nextSlug: z.string().default(""),
});

const momentSchema: any = z.object({
	published: z.date(),
	pinned: z.boolean().optional().default(false),
	location: z.string().optional().default(""),
	mood: z.string().optional().default(""),
	tags: z.array(z.string()).optional().default([]),
	images: z
		.array(
			z.object({ src: z.string(), alt: z.string().optional().default("") }),
		)
		.optional()
		.default([]),
	draft: z.boolean().optional().default(false),
});

const specSchema: any = z.object({});

const seriesSchema: any = z.object({
	title: z.string(),
	status: z.enum(["ongoing", "completed"]).optional().default("ongoing"),
	defaultCategory: z.string().optional().default(""),
});

const postsSchema: any = postSchema.extend({
	// Kept for compatibility with the existing post front matter.
	author: z.string().optional(),
});

const posts: CollectionConfig<any, any> = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		pattern: "**/*.{md,mdx}",
	}),
	schema: postsSchema,
});

const noteSchema: any = z.object({
	title: z.string(),
	created: z.date(),
	updated: z.date(),
	description: z.string().optional().default(""),
	tags: z.array(z.string()).optional().default([]),
	category: z.string().optional().default(""),
	status: z
		.enum(["seed", "learning", "reviewed", "stable"])
		.optional()
		.default("seed"),
	draft: z.boolean().optional().default(false),
	lang: z.string().optional().default("zh_CN"),
});

const notes: CollectionConfig<any, any> = defineCollection({
	loader: glob({
		base: "./src/content/notes",
		pattern: "**/*.{md,mdx}",
	}),
	schema: noteSchema,
});

const moments: CollectionConfig<any, any> = defineCollection({
	loader: glob({
		base: "./src/content/moments",
		pattern: "**/*.md",
	}),
	schema: momentSchema,
});

const spec: CollectionConfig<any, any> = defineCollection({
	loader: glob({
		base: "./src/content/spec",
		pattern: "**/*.{md,mdx}",
	}),
	schema: specSchema,
});

const series: CollectionConfig<any, any> = defineCollection({
	loader: glob({
		base: "./src/content/series",
		pattern: "**/*.md",
	}),
	schema: seriesSchema,
});

type Collections = {
	posts: typeof posts;
	notes: typeof notes;
	moments: typeof moments;
	spec: typeof spec;
	series: typeof series;
};

export const collections: Collections = {
	posts: posts,
	notes: notes,
	moments: moments,
	spec: spec,
	series: series,
} as const;

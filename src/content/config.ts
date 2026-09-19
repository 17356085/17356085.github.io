import { defineCollection, z } from "astro:content";

type CollectionDefinition = ReturnType<typeof defineCollection>;

const postsCollection: CollectionDefinition = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		author: z.string().optional(),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const notesCollection: CollectionDefinition = defineCollection({
	schema: z.object({
		title: z.string(),
		created: z.date(),
		updated: z.date(),
		description: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().default(""),
		status: z.enum(["seed", "learning", "reviewed", "stable"]).default("seed"),
		draft: z.boolean().optional().default(false),
		lang: z.string().optional().default(""),
	}),
});
const specCollection: CollectionDefinition = defineCollection({
	schema: z.object({}),
});

type Collections = {
	posts: typeof postsCollection;
	notes: typeof notesCollection;
	spec: typeof specCollection;
};

export const collections: Collections = {
	posts: postsCollection,
	notes: notesCollection,
	spec: specCollection,
};

import { type CollectionEntry, getCollection } from "astro:content";

export type NoteEntry = CollectionEntry<"notes">;

export async function getSortedNotes(): Promise<NoteEntry[]> {
	const notes = await getCollection<"notes">("notes", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	return notes.sort(
		(a, b) => b.data.updated.getTime() - a.data.updated.getTime(),
	);
}

export function getNoteUrl(slug: string): string {
	const base = import.meta.env.BASE_URL.endsWith("/")
		? import.meta.env.BASE_URL
		: `${import.meta.env.BASE_URL}/`;
	return `${base}notes/${slug}/`;
}

export function getNotesUrl(): string {
	const base = import.meta.env.BASE_URL.endsWith("/")
		? import.meta.env.BASE_URL
		: `${import.meta.env.BASE_URL}/`;
	return `${base}notes/`;
}

export function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export async function getNoteCategoryList(): Promise<
	Array<{ name: string; count: number }>
> {
	const notes = await getSortedNotes();
	const counts = new Map<string, number>();
	for (const note of notes) {
		const category = note.data.category.trim() || "未分类";
		counts.set(category, (counts.get(category) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort(([left], [right]) => left.localeCompare(right, "zh-CN"))
		.map(([name, count]) => ({ name, count }));
}

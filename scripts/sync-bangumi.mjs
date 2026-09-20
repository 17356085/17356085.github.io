import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const snapshotPath = join(
	root,
	"shirones",
	"config",
	"data",
	"anime-snapshots",
	"bangumi.json",
);

const USER_ID = "657838";
const API_BASE_URL = (
	process.env.BANGUMI_API_BASE_URL ?? "https://api.bgm.tv/v0"
).replace(/\/+$/, "");
const PAGE_SIZE = boundedInteger(process.env.BANGUMI_PAGE_SIZE, 50, 1, 100);
const MAX_ITEMS = boundedInteger(
	process.env.BANGUMI_MAX_ITEMS,
	2000,
	PAGE_SIZE,
	10000,
);
const MIN_DELAY_MS = boundedInteger(
	process.env.BANGUMI_MIN_DELAY_MS,
	200,
	0,
	60000,
);
const TIMEOUT_MS = boundedInteger(
	process.env.BANGUMI_TIMEOUT_MS,
	15000,
	1000,
	120000,
);
const USER_AGENT = "mio-blog-anime-sync/1.0 (+https://17356085.github.io)";

const STATUS_BY_COLLECTION_TYPE = new Map([
	[1, "planned"],
	[2, "completed"],
	[3, "watching"],
	[4, "onHold"],
	[5, "dropped"],
]);
const VALID_STATUSES = new Set(STATUS_BY_COLLECTION_TYPE.values());

function boundedInteger(rawValue, fallback, minimum, maximum) {
	const value = Number.parseInt(rawValue ?? "", 10);
	if (!Number.isInteger(value)) return fallback;
	return Math.min(Math.max(value, minimum), maximum);
}

function sleep(milliseconds) {
	return new Promise((resolvePromise) =>
		setTimeout(resolvePromise, milliseconds),
	);
}

function finiteNumber(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonNegativeInteger(value, fallback = 0) {
	const number = finiteNumber(value);
	return number === null ? fallback : Math.max(0, Math.floor(number));
}

function clampRating(value) {
	const number = finiteNumber(value);
	if (number === null) return 0;
	return Math.max(0, Math.min(10, Math.round(number * 10) / 10));
}

function firstNonEmptyString(...values) {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return "";
}

function uniqueStrings(values) {
	return [
		...new Set(
			values
				.filter((value) => typeof value === "string")
				.map((value) => value.trim())
				.filter(Boolean),
		),
	];
}

function extractTags(collection, subject) {
	const subjectTags = Array.isArray(subject.tags) ? subject.tags : [];
	const collectionTags = Array.isArray(collection.tags) ? collection.tags : [];
	return uniqueStrings([
		...subjectTags.map((tag) => (typeof tag === "string" ? tag : tag?.name)),
		...collectionTags.map((tag) => (typeof tag === "string" ? tag : tag?.name)),
	]);
}

function subjectIdOf(collection) {
	const value = collection?.subject_id ?? collection?.subject?.id;
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return String(value);
	}
	if (typeof value === "string" && /^\d+$/.test(value.trim())) {
		return value.trim();
	}
	return null;
}

function toAnimeItem(collection) {
	if (!collection || typeof collection !== "object") return null;
	const subject =
		collection.subject && typeof collection.subject === "object"
			? collection.subject
			: {};
	const subjectId = subjectIdOf(collection);
	const status = STATUS_BY_COLLECTION_TYPE.get(collection.type);
	const title = firstNonEmptyString(subject.name_cn, subject.name);
	if (!subjectId || !status || !title) return null;

	const date = firstNonEmptyString(subject.date, subject.air_date);
	const watched = nonNegativeInteger(collection.ep_status);
	const total = nonNegativeInteger(subject.eps);
	const rating = clampRating(collection.rate);
	const cover = firstNonEmptyString(
		subject.images?.large,
		subject.images?.medium,
		subject.images?.common,
	);
	const description = firstNonEmptyString(
		subject.short_summary,
		subject.summary,
	);

	return {
		title,
		...(cover ? { cover } : {}),
		link: `https://bgm.tv/subject/${subjectId}`,
		status,
		rating,
		progress: { watched, total },
		...(description ? { description } : {}),
		year: /^\d{4}/.test(date) ? date.slice(0, 4) : "",
		genres: extractTags(collection, subject),
		identity: {
			provider: "bangumi",
			sourceId: subjectId,
			subjectId,
		},
	};
}

function validateSnapshot(snapshot, label = "snapshot") {
	if (!snapshot || typeof snapshot !== "object") {
		throw new Error(`${label} must be an object`);
	}
	if (snapshot.schemaVersion !== 1) {
		throw new Error(`${label}.schemaVersion must be 1`);
	}
	if (snapshot.provider !== "bangumi") {
		throw new Error(`${label}.provider must be bangumi`);
	}
	if (snapshot.accountRef !== USER_ID) {
		throw new Error(
			`${label}.accountRef must be ${USER_ID}, got ${String(snapshot.accountRef)}`,
		);
	}
	if (
		typeof snapshot.fetchedAt !== "string" ||
		!Number.isFinite(Date.parse(snapshot.fetchedAt))
	) {
		throw new Error(`${label}.fetchedAt must be an ISO date`);
	}
	if (!Array.isArray(snapshot.items) || snapshot.items.length === 0) {
		throw new Error(`${label}.items must be a non-empty array`);
	}

	const subjectIds = new Set();
	for (const [index, item] of snapshot.items.entries()) {
		const itemLabel = `${label}.items[${index}]`;
		if (!item || typeof item !== "object") {
			throw new Error(`${itemLabel} must be an object`);
		}
		if (typeof item.title !== "string" || !item.title.trim()) {
			throw new Error(`${itemLabel}.title is required`);
		}
		if (!VALID_STATUSES.has(item.status)) {
			throw new Error(`${itemLabel}.status is invalid`);
		}
		if (
			typeof item.rating !== "number" ||
			!Number.isFinite(item.rating) ||
			item.rating < 0 ||
			item.rating > 10
		) {
			throw new Error(`${itemLabel}.rating must be between 0 and 10`);
		}
		if (typeof item.year !== "string" || !Array.isArray(item.genres)) {
			throw new Error(`${itemLabel}.year and genres are required`);
		}
		if (!/^https:\/\/bgm\.tv\/subject\/\d+$/.test(item.link ?? "")) {
			throw new Error(`${itemLabel}.link must point to bgm.tv`);
		}
		if (
			!item.identity ||
			item.identity.provider !== "bangumi" ||
			!/^\d+$/.test(item.identity.subjectId ?? "") ||
			item.identity.subjectId !== item.identity.sourceId
		) {
			throw new Error(
				`${itemLabel}.identity must contain the Bangumi subject id`,
			);
		}
		if (item.identity.subjectId !== item.link.split("/").at(-1)) {
			throw new Error(`${itemLabel} identity and link disagree`);
		}
		if (subjectIds.has(item.identity.subjectId)) {
			throw new Error(
				`${itemLabel} duplicates subject ${item.identity.subjectId}`,
			);
		}
		subjectIds.add(item.identity.subjectId);
		if (item.progress !== undefined) {
			if (
				!item.progress ||
				!Number.isInteger(item.progress.watched) ||
				!Number.isInteger(item.progress.total) ||
				item.progress.watched < 0 ||
				item.progress.total < 0
			) {
				throw new Error(`${itemLabel}.progress is invalid`);
			}
		}
		if (
			item.cover !== undefined &&
			(typeof item.cover !== "string" || !/^https:\/\//.test(item.cover))
		) {
			throw new Error(`${itemLabel}.cover must be an https URL`);
		}
	}

	return snapshot;
}

async function fetchJson(url) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: "application/json",
				"User-Agent": USER_AGENT,
			},
		});
		const body = await response.text();
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
		}
		try {
			return JSON.parse(body);
		} catch {
			throw new Error("response was not valid JSON");
		}
	} catch (error) {
		if (error?.name === "AbortError") {
			throw new Error(`request timed out after ${TIMEOUT_MS}ms`);
		}
		throw error instanceof Error ? error : new Error(String(error));
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchCollections() {
	const collections = [];
	let offset = 0;
	let reportedTotal = null;

	while (collections.length < MAX_ITEMS) {
		const limit = Math.min(PAGE_SIZE, MAX_ITEMS - collections.length);
		const url = new URL(
			`${API_BASE_URL}/users/${encodeURIComponent(USER_ID)}/collections`,
		);
		url.searchParams.set("subject_type", "2");
		url.searchParams.set("limit", String(limit));
		url.searchParams.set("offset", String(offset));

		const payload = await fetchJson(url);
		if (!payload || !Array.isArray(payload.data)) {
			throw new Error("response.data must be an array");
		}
		if (payload.total !== undefined) {
			if (!Number.isInteger(payload.total) || payload.total < 0) {
				throw new Error("response.total must be a non-negative integer");
			}
			reportedTotal = payload.total;
		}

		collections.push(...payload.data);
		console.log(
			`[anime:sync] fetched ${collections.length}${reportedTotal === null ? "" : `/${reportedTotal}`} collection entries`,
		);

		if (payload.data.length === 0) break;
		if (reportedTotal !== null && collections.length >= reportedTotal) break;
		if (payload.data.length < limit) {
			if (reportedTotal !== null && collections.length < reportedTotal) {
				throw new Error(
					`pagination ended early at ${collections.length}/${reportedTotal}`,
				);
			}
			break;
		}

		offset += payload.data.length;
		if (MIN_DELAY_MS > 0) await sleep(MIN_DELAY_MS);
	}

	if (reportedTotal !== null && reportedTotal > MAX_ITEMS) {
		throw new Error(
			`collection has ${reportedTotal} entries, exceeding MAX_ITEMS=${MAX_ITEMS}`,
		);
	}
	return collections;
}

function buildSnapshot(collections) {
	const items = [];
	const seen = new Set();
	for (const collection of collections) {
		const item = toAnimeItem(collection);
		if (!item || seen.has(item.identity.subjectId)) continue;
		seen.add(item.identity.subjectId);
		items.push(item);
	}
	const snapshot = {
		schemaVersion: 1,
		provider: "bangumi",
		fetchedAt: new Date().toISOString(),
		accountRef: USER_ID,
		items,
	};
	validateSnapshot(snapshot, "new snapshot");
	return snapshot;
}

function readValidBaseline() {
	if (!existsSync(snapshotPath)) {
		return { valid: false, reason: "baseline file does not exist" };
	}
	try {
		const baseline = JSON.parse(readFileSync(snapshotPath, "utf8"));
		validateSnapshot(baseline, "baseline");
		return { valid: true, baseline };
	} catch (error) {
		return {
			valid: false,
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

function writeAtomically(snapshot) {
	const directory = dirname(snapshotPath);
	mkdirSync(directory, { recursive: true });
	const temporaryPath = join(
		directory,
		`.bangumi-${process.pid}-${Date.now()}.tmp`,
	);
	let moved = false;
	try {
		writeFileSync(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
			encoding: "utf8",
			flag: "wx",
		});
		const written = JSON.parse(readFileSync(temporaryPath, "utf8"));
		validateSnapshot(written, "temporary snapshot");
		// The temporary file is in the same directory, so rename is the atomic replace boundary.
		renameSync(temporaryPath, snapshotPath);
		moved = true;
	} finally {
		if (!moved && existsSync(temporaryPath)) unlinkSync(temporaryPath);
	}
}

async function main() {
	try {
		const collections = await fetchCollections();
		if (collections.length === 0) {
			throw new Error("API returned an empty collection");
		}
		const snapshot = buildSnapshot(collections);
		writeAtomically(snapshot);
		console.log(
			`[anime:sync] wrote ${snapshot.items.length} Bangumi items for account ${USER_ID}`,
		);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		const baseline = readValidBaseline();
		if (baseline.valid) {
			console.warn(
				`[anime:sync] warning: ${reason}; kept last valid baseline (${baseline.baseline.items.length} items)`,
			);
			return;
		}
		console.error(
			`[anime:sync] failed: ${reason}; no valid baseline is available (${baseline.reason})`,
		);
		process.exitCode = 1;
	}
}

await main();

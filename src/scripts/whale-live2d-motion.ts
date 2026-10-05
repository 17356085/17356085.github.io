/**
 * A small, dependency-free reader and sampler for Cubism motion3.json files.
 *
 * The packed segment layout and evaluator behavior follow the official
 * motion3 specification and Cubism Web Framework implementation:
 * - https://raw.githubusercontent.com/Live2D/CubismSpecs/master/FileFormats/motion3.json.md
 * - https://raw.githubusercontent.com/Live2D/CubismWebFramework/develop/src/motion/cubismmotion.ts
 *
 * This adapter intentionally handles parameter curves only.  It does not
 * apply motion weights, start a timer, or infer a playback frame rate.
 */

export type WhaleMotionSegmentType = 'linear' | 'cubicBezier' | 'stepped' | 'inverseStepped';

export interface WhaleMotionPoint {
	readonly time: number;
	readonly value: number;
}

export interface WhaleMotionSegment {
	readonly type: WhaleMotionSegmentType;
	readonly points: readonly WhaleMotionPoint[];
}

export interface WhaleMotionCurve {
	readonly id: string;
	/** The curve-level FadeInTime field, when present in the source JSON. */
	readonly fadeInSeconds: number | undefined;
	/** The curve-level FadeOutTime field, when present in the source JSON. */
	readonly fadeOutSeconds: number | undefined;
	readonly segments: readonly WhaleMotionSegment[];
}

export interface WhaleMotionClip {
	readonly duration: number;
	readonly loop: boolean;
	readonly fadeInSeconds: number;
	readonly fadeOutSeconds: number;
	readonly areBeziersRestricted: boolean;
	readonly curves: readonly WhaleMotionCurve[];
}

type MotionRecord = Record<string, unknown>;

const ROOT_REQUIRED_KEYS = new Set(['Version', 'Meta', 'Curves']);
const META_KEYS = new Set([
	'Duration',
	'Fps',
	'Loop',
	'AreBeziersRestricted',
	'FadeInTime',
	'FadeOutTime',
	'CurveCount',
	'TotalSegmentCount',
	'TotalPointCount',
	'UserDataCount',
	'TotalUserDataSize',
]);
const CURVE_KEYS = new Set(['Target', 'Id', 'FadeInTime', 'FadeOutTime', 'Segments']);
const USER_DATA_KEYS = new Set(['Time', 'Value']);

function hasOwn(record: MotionRecord, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value: unknown): value is MotionRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(path: string, detail: string): never {
	throw new Error(`Invalid motion3 ${path}: ${detail}`);
}

function unsupportedTarget(target: string): never {
	throw new Error(`Unsupported motion3 target "${target}"; only "Parameter" curves are supported.`);
}

function expectRecord(value: unknown, path: string): MotionRecord {
	if (!isRecord(value)) {
		invalid(path, 'expected an object.');
	}
	return value;
}

function expectArray(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) {
		invalid(path, 'expected an array.');
	}
	return value;
}

function assertAllowedKeys(record: MotionRecord, allowed: ReadonlySet<string>, path: string): void {
	for (const key of Object.keys(record)) {
		if (!allowed.has(key)) {
			invalid(`${path}.${key}`, 'unsupported property.');
		}
	}
}

function finiteNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		invalid(path, 'expected a finite number.');
	}
	return value;
}

function requiredFiniteNumber(record: MotionRecord, key: string, path: string): number {
	if (!hasOwn(record, key)) {
		invalid(`${path}.${key}`, 'is required.');
	}
	return finiteNumber(record[key], `${path}.${key}`);
}

function optionalFiniteNumber(record: MotionRecord, key: string, path: string): number | undefined {
	if (!hasOwn(record, key)) {
		return undefined;
	}
	return finiteNumber(record[key], `${path}.${key}`);
}

function optionalBoolean(record: MotionRecord, key: string, path: string, fallback: boolean): boolean {
	if (!hasOwn(record, key)) {
		return fallback;
	}
	if (typeof record[key] !== 'boolean') {
		invalid(`${path}.${key}`, 'expected a boolean.');
	}
	return record[key] as boolean;
}

function requiredString(record: MotionRecord, key: string, path: string): string {
	if (!hasOwn(record, key) || typeof record[key] !== 'string') {
		invalid(`${path}.${key}`, 'expected a string.');
	}
	return record[key] as string;
}

function countNumber(value: unknown, path: string): number {
	const count = finiteNumber(value, path);
	if (!Number.isSafeInteger(count) || count < 0) {
		invalid(path, 'expected a non-negative integer count.');
	}
	return count;
}

function requiredCount(record: MotionRecord, key: string, path: string): number {
	if (!hasOwn(record, key)) {
		invalid(`${path}.${key}`, 'is required.');
	}
	return countNumber(record[key], `${path}.${key}`);
}

function makePoint(time: number, value: number): WhaleMotionPoint {
	return Object.freeze({ time, value });
}

function readPoint(values: readonly unknown[], offset: number, path: string): WhaleMotionPoint {
	return makePoint(
		finiteNumber(values[offset], `${path}[${offset}]`),
		finiteNumber(values[offset + 1], `${path}[${offset + 1}]`),
	);
}

function nearlyEqual(left: number, right: number, scale: number): boolean {
	return Math.abs(left - right) <= 1e-6 * Math.max(1, scale);
}

function segmentType(value: number, path: string): WhaleMotionSegmentType {
	if (!Number.isInteger(value)) {
		invalid(path, 'segment identifier must be an integer from 0 to 3.');
	}
	switch (value) {
		case 0:
			return 'linear';
		case 1:
			return 'cubicBezier';
		case 2:
			return 'stepped';
		case 3:
			return 'inverseStepped';
		default:
			invalid(path, 'unsupported segment identifier; expected 0, 1, 2, or 3.');
	}
}

function parseCurve(
	value: unknown,
	curveIndex: number,
	duration: number,
	areBeziersRestricted: boolean,
	seenIds: Set<string>,
): { curve: WhaleMotionCurve; segmentCount: number; pointCount: number } {
	const path = `Curves[${curveIndex}]`;
	const record = expectRecord(value, path);
	assertAllowedKeys(record, CURVE_KEYS, path);

	const target = requiredString(record, 'Target', path);
	if (target !== 'Parameter') {
		unsupportedTarget(target);
	}

	const id = requiredString(record, 'Id', path);
	if (id.trim().length === 0) {
		invalid(`${path}.Id`, 'must be non-empty.');
	}
	if (seenIds.has(id)) {
		invalid(`${path}.Id`, `duplicate parameter ID "${id}".`);
	}
	seenIds.add(id);

	const rawSegments = expectArray(record.Segments, `${path}.Segments`);
	if (rawSegments.length < 5) {
		invalid(`${path}.Segments`, 'must contain an initial point and at least one segment.');
	}

	const firstPoint = readPoint(rawSegments, 0, `${path}.Segments`);
	if (firstPoint.time < 0 || firstPoint.time > duration) {
		invalid(`${path}.Segments[0]`, `time must be within 0..${duration}.`);
	}

	const segments: WhaleMotionSegment[] = [];
	let pointCount = 1;
	let position = 2;
	let previousPoint = firstPoint;

	while (position < rawSegments.length) {
		const typePath = `${path}.Segments[${position}]`;
		const type = segmentType(finiteNumber(rawSegments[position], typePath), typePath);
		const addedPointCount = type === 'cubicBezier' ? 3 : 1;
		const encodedWidth = 1 + addedPointCount * 2;
		if (position + encodedWidth > rawSegments.length) {
			invalid(typePath, 'segment is truncated.');
		}

		const segmentPoints: WhaleMotionPoint[] = [previousPoint];
		for (let pointIndex = 0; pointIndex < addedPointCount; pointIndex += 1) {
			const pointOffset = position + 1 + pointIndex * 2;
			const point = readPoint(rawSegments, pointOffset, `${path}.Segments`);
			if (point.time < 0 || point.time > duration) {
				invalid(`${path}.Segments[${pointOffset}]`, `time must be within 0..${duration}.`);
			}
			if (point.time < previousPoint.time) {
				invalid(`${path}.Segments[${pointOffset}]`, 'point times must be monotonic.');
			}
			segmentPoints.push(point);
			previousPoint = point;
		}

		const endPoint = segmentPoints[segmentPoints.length - 1];
		if (endPoint.time <= segmentPoints[0].time) {
			invalid(typePath, 'segment end time must be greater than its start time.');
		}

		if (type === 'cubicBezier' && areBeziersRestricted) {
			const start = segmentPoints[0];
			const control1 = segmentPoints[1];
			const control2 = segmentPoints[2];
			const end = segmentPoints[3];
			const span = end.time - start.time;
			const expectedControl1Time = start.time + span / 3;
			const expectedControl2Time = start.time + (2 * span) / 3;
			if (
				!nearlyEqual(control1.time, expectedControl1Time, duration) ||
				!nearlyEqual(control2.time, expectedControl2Time, duration)
			) {
				invalid(typePath, 'restricted cubic Bézier time handles must be at one-third and two-thirds.');
			}
		}

		segments.push(
			Object.freeze({
				type,
				points: Object.freeze(segmentPoints),
			}),
		);
		pointCount += addedPointCount;
		position += encodedWidth;
	}

	const curve: WhaleMotionCurve = Object.freeze({
		id,
		fadeInSeconds: optionalFiniteNumber(record, 'FadeInTime', path),
		fadeOutSeconds: optionalFiniteNumber(record, 'FadeOutTime', path),
		segments: Object.freeze(segments),
	});
	return { curve, segmentCount: segments.length, pointCount };
}

function validateUserData(root: MotionRecord, meta: MotionRecord): void {
	const userDataValue = hasOwn(root, 'UserData') ? expectArray(root.UserData, 'UserData') : [];
	for (let index = 0; index < userDataValue.length; index += 1) {
		const path = `UserData[${index}]`;
		const entry = expectRecord(userDataValue[index], path);
		assertAllowedKeys(entry, USER_DATA_KEYS, path);
		finiteNumber(entry.Time, `${path}.Time`);
		if (typeof entry.Value !== 'string') {
			invalid(`${path}.Value`, 'expected a string.');
		}
	}

	if (hasOwn(meta, 'UserDataCount')) {
		const expectedCount = countNumber(meta.UserDataCount, 'Meta.UserDataCount');
		if (expectedCount !== userDataValue.length) {
			invalid('Meta.UserDataCount', `declares ${expectedCount}, found ${userDataValue.length}.`);
		}
	}
	if (hasOwn(meta, 'TotalUserDataSize')) {
		countNumber(meta.TotalUserDataSize, 'Meta.TotalUserDataSize');
	}
}

function normalizedFadeSeconds(value: number | undefined): number {
	// CubismMotion uses one second when a motion fade is omitted or negative.
	return value === undefined || value < 0 ? 1 : value;
}

/** Parse and strictly validate a parsed motion3.json value. */
export function parseWhaleMotion3(value: unknown): WhaleMotionClip {
	const root = expectRecord(value, 'motion3');
	for (const key of ROOT_REQUIRED_KEYS) {
		if (!hasOwn(root, key)) {
			invalid(`motion3.${key}`, 'is required.');
		}
	}

	const version = finiteNumber(root.Version, 'Version');
	if (version !== 3) {
		invalid('Version', 'only motion3 Version 3 is supported.');
	}

	const meta = expectRecord(root.Meta, 'Meta');
	assertAllowedKeys(meta, META_KEYS, 'Meta');
	const duration = requiredFiniteNumber(meta, 'Duration', 'Meta');
	if (duration <= 0) {
		invalid('Meta.Duration', 'must be greater than zero.');
	}
	finiteNumber(meta.Fps, 'Meta.Fps');
	const loop = optionalBoolean(meta, 'Loop', 'Meta', false);
	const areBeziersRestricted = optionalBoolean(meta, 'AreBeziersRestricted', 'Meta', false);
	const fadeInSeconds = normalizedFadeSeconds(optionalFiniteNumber(meta, 'FadeInTime', 'Meta'));
	const fadeOutSeconds = normalizedFadeSeconds(optionalFiniteNumber(meta, 'FadeOutTime', 'Meta'));
	const expectedCurveCount = requiredCount(meta, 'CurveCount', 'Meta');
	const expectedSegmentCount = requiredCount(meta, 'TotalSegmentCount', 'Meta');
	const expectedPointCount = requiredCount(meta, 'TotalPointCount', 'Meta');
	validateUserData(root, meta);

	const rawCurves = expectArray(root.Curves, 'Curves');
	if (rawCurves.length !== expectedCurveCount) {
		invalid('Meta.CurveCount', `declares ${expectedCurveCount}, found ${rawCurves.length}.`);
	}

	const curves: WhaleMotionCurve[] = [];
	const seenIds = new Set<string>();
	let segmentCount = 0;
	let pointCount = 0;
	for (let index = 0; index < rawCurves.length; index += 1) {
		const parsed = parseCurve(rawCurves[index], index, duration, areBeziersRestricted, seenIds);
		curves.push(parsed.curve);
		segmentCount += parsed.segmentCount;
		pointCount += parsed.pointCount;
	}

	if (segmentCount !== expectedSegmentCount) {
		invalid('Meta.TotalSegmentCount', `declares ${expectedSegmentCount}, found ${segmentCount}.`);
	}
	if (pointCount !== expectedPointCount) {
		invalid('Meta.TotalPointCount', `declares ${expectedPointCount}, found ${pointCount}.`);
	}

	return Object.freeze({
		duration,
		loop,
		fadeInSeconds,
		fadeOutSeconds,
		areBeziersRestricted,
		curves: Object.freeze(curves),
	});
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function cubicCoordinate(
	first: number,
	control1: number,
	control2: number,
	last: number,
	t: number,
): number {
	const inverse = 1 - t;
	return (
		inverse * inverse * inverse * first +
		3 * inverse * inverse * t * control1 +
		3 * inverse * t * t * control2 +
		t * t * t * last
	);
}

function solveCubicTime(points: readonly WhaleMotionPoint[], time: number, restricted: boolean): number {
	const first = points[0];
	const control1 = points[1];
	const control2 = points[2];
	const last = points[3];
	const target = clamp(time, first.time, last.time);
	if (target <= first.time) {
		return 0;
	}
	if (target >= last.time) {
		return 1;
	}
	if (restricted) {
		return clamp((target - first.time) / (last.time - first.time), 0, 1);
	}

	// All control-point times are monotonic by validation, so bisection keeps
	// the root bracketed even for flat handles or nearly horizontal tangents.
	let lower = 0;
	let upper = 1;
	for (let iteration = 0; iteration < 52; iteration += 1) {
		const middle = (lower + upper) / 2;
		const x = cubicCoordinate(first.time, control1.time, control2.time, last.time, middle);
		if (x < target) {
			lower = middle;
		} else {
			upper = middle;
		}
	}
	return clamp((lower + upper) / 2, 0, 1);
}

function cubicValue(points: readonly WhaleMotionPoint[], time: number, restricted: boolean): number {
	const first = points[0];
	const last = points[3];
	if (time <= first.time) {
		return first.value;
	}
	if (time >= last.time) {
		return last.value;
	}
	const t = solveCubicTime(points, time, restricted);
	return cubicCoordinate(points[0].value, points[1].value, points[2].value, points[3].value, t);
}

function evaluateSegment(segment: WhaleMotionSegment, time: number, restricted: boolean): number {
	const points = segment.points;
	const first = points[0];
	switch (segment.type) {
		case 'linear': {
			const last = points[1];
			if (time <= first.time) {
				return first.value;
			}
			if (time >= last.time) {
				return last.value;
			}
			const progress = clamp((time - first.time) / (last.time - first.time), 0, 1);
			return first.value + (last.value - first.value) * progress;
		}
		case 'cubicBezier':
			return cubicValue(points, time, restricted);
		case 'stepped':
			return first.value;
		case 'inverseStepped':
			return points[1].value;
	}
}

function evaluateCurve(curve: WhaleMotionCurve, time: number, restricted: boolean): number {
	const first = curve.segments[0].points[0];
	const lastSegment = curve.segments[curve.segments.length - 1];
	const last = lastSegment.points[lastSegment.points.length - 1];
	if (time < first.time) {
		return first.value;
	}
	if (time >= last.time) {
		return last.value;
	}

	for (let index = 0; index < curve.segments.length; index += 1) {
		const segment = curve.segments[index];
		const end = segment.points[segment.points.length - 1];
		if (time < end.time || index === curve.segments.length - 1) {
			return evaluateSegment(segment, time, restricted);
		}
	}
	return last.value;
}

function repeatTime(elapsedSeconds: number, duration: number): number {
	const remainder = elapsedSeconds % duration;
	return remainder < 0 ? remainder + duration : remainder;
}

/** Sample a parsed clip into a caller-owned, reusable parameter map. */
export function sampleWhaleMotion3(
	clip: WhaleMotionClip,
	elapsedSeconds: number,
	out: Map<string, number>,
): void {
	if (!Number.isFinite(elapsedSeconds)) {
		throw new Error('Cannot sample motion3 with a non-finite elapsed time.');
	}

	const time = clip.loop
		? repeatTime(elapsedSeconds, clip.duration)
		: clamp(elapsedSeconds, 0, clip.duration);
	out.clear();
	for (const curve of clip.curves) {
		out.set(curve.id, evaluateCurve(curve, time, clip.areBeziersRestricted));
	}
}

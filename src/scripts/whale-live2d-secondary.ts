/**
 * Renderer-independent secondary mesh motion for the whale maid.
 *
 * Cubism Core remains the source of truth for parameter and drawable arrays.
 * This rig only reads the current Core positions, writes a separate
 * Float32Array per drawable, and applies its fields immediately before the
 * renderer uploads a drawable. No Core array, UV, opacity, camera, RAF, or
 * timer is touched here.
 */

export type WhaleSecondaryReaction = 'greet' | 'pet' | 'wave' | 'sleep' | 'wake';

export interface WhaleSecondaryPose {
	readonly seconds: number;
	readonly idleSeconds: number;
	readonly sleeping: boolean;
	readonly lookX: number;
	readonly headX: number;
	readonly headY: number;
	readonly headZ: number;
	readonly bodyZ: number;
	readonly tail: number;
	readonly breath: number;
	readonly reaction: WhaleSecondaryReaction | null;
	readonly reactionProgress: number;
}

/** Semantic drawable IDs receiving local or public secondary fields. */
export type WhaleSecondarySummary = readonly string[];

export interface WhaleSecondaryRig {
	/** Set the scalar state used by the next positions() calls. */
	readonly update: (pose: WhaleSecondaryPose, currentPositions: readonly Float32Array[]) => void;
	/** Return a non-Core output buffer for the drawable, or the input on error. */
	readonly positions: (drawableIndex: number, currentPositions: Float32Array) => Float32Array;
	/** Static semantic IDs with secondary fields enabled. */
	readonly summary: () => WhaleSecondarySummary;
	/** Maximum absolute per-coordinate displacement observed since update(). */
	readonly maxDisplacement: number;
}

interface Bounds {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
	readonly width: number;
	readonly height: number;
	readonly centerX: number;
	readonly centerY: number;
}

interface DrawableCache {
	readonly id: string;
	readonly rest: Float32Array;
	readonly output: Float32Array;
	readonly armWeight: Float32Array;
	readonly finWeight: Float32Array;
	readonly ahogeWeight: Float32Array;
	readonly tailWeight: Float32Array;
	readonly skirtWeight: Float32Array;
	readonly hairLagWeight: Float32Array;
	readonly bounds: Bounds;
	pivotIndex: number;
	hairRootIndex: number;
	hairRootDistance: number;
	hairLiveShiftX: number;
	hairLiveShiftY: number;
	hairLagShiftX: number;
	hairLagShiftY: number;
	hairLagAngle: number;
	hairLagInitialized: boolean;
}

const BODY_ID = 'Body2';
const ARM_ID = 'ArmR2';
const FIN_R_ID = 'FinR';
const FIN_L_ID = 'FinL';
const AHOGE_ID = 'Ahoge2';
const BOW_R_EDGE_ID = 'BowREdge';
const HAIR_BACK_R_ID = 'HairBackR2';
const HAIR_BACK_L_ID = 'HairBackL2';
const TAIL_ID = 'Tail2';

/** The first 18 model drawables are one shared head field by design. */
const HEAD_IDS = [
	'MouthOpen2',
	'EyelashClosedR',
	'EyelashClosedL',
	'Ahoge2',
	'MaidHeadband',
	'NeckHairEdges',
	'HairFront2',
	'BowREdge',
	'FinR',
	'FinL',
	'MouthClosed',
	'BrowR2',
	'BrowL2',
	'IrisR',
	'IrisL',
	'EyeWhiteR',
	'EyeWhiteL',
	'FaceBase',
] as const;
const HEAD_ID_SET = new Set<string>(HEAD_IDS);
const HAIR_BACK_IDS = new Set([HAIR_BACK_R_ID, HAIR_BACK_L_ID]);
const REQUIRED_LOCAL_IDS = [BODY_ID, ARM_ID, FIN_R_ID, FIN_L_ID, AHOGE_ID] as const;

const TWO_PI = Math.PI * 2;
const ARM_PERIOD_SECONDS = 9.3;
const FIN_R_PERIOD_SECONDS = 5.7;
const FIN_L_PERIOD_SECONDS = 6.3;
const AHOGE_PERIOD_SECONDS = 4.9;
const BODY_PERIOD_SECONDS = 6.9;
const GLOBAL_PERIOD_A_SECONDS = 8.7;
const GLOBAL_PERIOD_B_SECONDS = 13.1;
const WAVE_PERIOD_SECONDS = 36;

const GLOBAL_SWAY_HEIGHT_FRACTION = 0.014;
const SKIRT_SWAY_HEIGHT_FRACTION = 0.007;
const ARM_SWAY_DEGREES = 5;
const ARM_LIFT_DEGREES = 32;
const WAVE_ARM_EXTRA_DEGREES = 40;
const FIN_SWAY_DEGREES = 9;
const AHOGE_SWAY_DEGREES = 12;
const TAIL_CORE_DEGREES = 3;
const HEAD_MAX_ROTATION_DEGREES = 8;
const BODY_MAX_ROTATION_DEGREES = 2.5;
const BODY_TINY_SWAY_DEGREES = 0.3;
const SLEEP_GLOBAL_SCALE = 0.2;
const SLEEP_LOCAL_SCALE = 0.15;
const BODY_PIVOT_Y_FRACTION = 0.22;
const BODY_FOOT_RIGID_FRACTION = 0.15;
const BODY_FOOT_BLEND_END_FRACTION = 0.30;
const NECK_BLEND_START_FRACTION = 0.015;
const NECK_BLEND_END_FRACTION = 0.065;
const DEGREES_TO_RADIANS = Math.PI / 180;

function isFiniteNumber(value: number): boolean {
	return Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
	if (value < minimum) {
		return minimum;
	}
	if (value > maximum) {
		return maximum;
	}
	return value;
}

function safePoseValue(value: number, fallback: number): number {
	return isFiniteNumber(value) ? value : fallback;
}

function smoothstep(value: number): number {
	const clamped = clamp(value, 0, 1);
	return clamped * clamped * (3 - 2 * clamped);
}

function exponentialBlend(rate: number, seconds: number): number {
	return seconds > 0 ? 1 - Math.exp(-rate * seconds) : 0;
}

function boundsFromPositions(positions: Float32Array): Bounds | null {
	if (positions.length < 2 || positions.length % 2 !== 0) {
		return null;
	}
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (let index = 0; index < positions.length; index += 2) {
		const x = positions[index];
		const y = positions[index + 1];
		if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
			return null;
		}
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}
	const width = maxX - minX;
	const height = maxY - minY;
	if (
		!isFiniteNumber(minX) ||
		!isFiniteNumber(minY) ||
		!isFiniteNumber(maxX) ||
		!isFiniteNumber(maxY) ||
		!isFiniteNumber(width) ||
		!isFiniteNumber(height) ||
		height <= 0
	) {
		return null;
	}
	return {
		minX,
		minY,
		maxX,
		maxY,
		width,
		height,
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
	};
}

function mergeBounds(current: Bounds | null, next: Bounds): Bounds {
	if (!current) {
		return next;
	}
	const minX = Math.min(current.minX, next.minX);
	const minY = Math.min(current.minY, next.minY);
	const maxX = Math.max(current.maxX, next.maxX);
	const maxY = Math.max(current.maxY, next.maxY);
	return {
		minX,
		minY,
		maxX,
		maxY,
		width: maxX - minX,
		height: maxY - minY,
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
	};
}

function nearestVertexIndex(positions: Float32Array, targetX: number, targetY: number): number {
	let nearest = 0;
	let distance = Infinity;
	for (let index = 0; index < positions.length; index += 2) {
		const dx = positions[index] - targetX;
		const dy = positions[index + 1] - targetY;
		const candidate = dx * dx + dy * dy;
		if (candidate < distance) {
			distance = candidate;
			nearest = index / 2;
		}
	}
	return nearest;
}

function currentCoordinate(
	positions: Float32Array | undefined,
	vertexIndex: number,
	coordinate: 0 | 1,
	fallback: number,
): number {
	const offset = vertexIndex * 2 + coordinate;
	if (positions && offset >= 0 && offset < positions.length && isFiniteNumber(positions[offset])) {
		return positions[offset];
	}
	return fallback;
}

function maxDistanceFromPivot(positions: Float32Array, rootX: number, rootY: number): number {
	let maximumDistance = 0;
	for (let vertex = 0; vertex < positions.length; vertex += 2) {
		const dx = positions[vertex] - rootX;
		const dy = positions[vertex + 1] - rootY;
		maximumDistance = Math.max(maximumDistance, Math.sqrt(dx * dx + dy * dy));
	}
	return maximumDistance;
}

function makeDistanceWeight(
	positions: Float32Array,
	rootX: number,
	rootY: number,
	maximumDistance: number,
	rootRigidFraction = 0,
): Float32Array {
	const result = new Float32Array(positions.length / 2);
	if (!(maximumDistance > 0) || !isFiniteNumber(maximumDistance)) {
		return result;
	}
	for (let vertex = 0; vertex < result.length; vertex += 1) {
		const dx = positions[vertex * 2] - rootX;
		const dy = positions[vertex * 2 + 1] - rootY;
		const distance = Math.sqrt(dx * dx + dy * dy) / maximumDistance;
		result[vertex] = smoothstep((distance - rootRigidFraction) / (1 - rootRigidFraction));
	}
	return result;
}

function makeVerticalWeight(
	positions: Float32Array,
	minimum: number,
	maximum: number,
	fromTop: boolean,
): Float32Array {
	const result = new Float32Array(positions.length / 2);
	const range = maximum - minimum;
	if (!(range > 0) || !isFiniteNumber(range)) {
		return result;
	}
	for (let vertex = 0; vertex < result.length; vertex += 1) {
		const y = positions[vertex * 2 + 1];
		const normalized = fromTop ? (maximum - y) / range : (y - minimum) / range;
		// Pin only the shoulder attachment; the arm below it rotates as one
		// limb instead of distributing bend through the whole hand texture.
		result[vertex] = smoothstep(normalized / (fromTop ? 0.22 : 1));
	}
	return result;
}

function makeSkirtWeight(positions: Float32Array, bounds: Bounds): Float32Array {
	const result = new Float32Array(positions.length / 2);
	// The upper chest and apron remain in the public body field. Only the lower
	// skirt gets this extra, very small horizontal inertia field.
	const waistY = bounds.maxY - bounds.height * 0.45;
	const range = bounds.height * 0.45;
	if (!(range > 0) || !isFiniteNumber(range)) {
		return result;
	}
	for (let vertex = 0; vertex < result.length; vertex += 1) {
		result[vertex] = smoothstep((waistY - positions[vertex * 2 + 1]) / range);
	}
	return result;
}

function bodyFieldWeight(y: number, bounds: Bounds): number {
	const start = bounds.minY + bounds.height * BODY_FOOT_RIGID_FRACTION;
	const end = bounds.minY + bounds.height * BODY_FOOT_BLEND_END_FRACTION;
	return smoothstep((y - start) / (end - start));
}

function modelSwayWeight(y: number, bounds: Bounds): number {
	// Keep the lowest 15% of the model anchored so the feet do not slide while
	// the public upper-body field moves the rest of the silhouette.
	return bodyFieldWeight(y, bounds);
}

function headBoundaryWeight(y: number, neckY: number, modelHeight: number): number {
	// The chin, side locks and neck must use the same anchored field. Moving
	// FaceBase rigidly while only pinning NeckHairEdges opens the collar seam.
	const start = neckY - modelHeight * NECK_BLEND_START_FRACTION;
	const end = neckY + modelHeight * NECK_BLEND_END_FRACTION;
	return smoothstep((y - start) / (end - start));
}

function finiteOrFallback(value: number, fallback: number): number {
	return isFiniteNumber(value) ? value : fallback;
}

/**
 * Create a secondary mesh rig from Core drawable semantic IDs and default
 * positions. Numeric drawable IDs are intentionally not accepted or guessed.
 */
export function createWhaleSecondaryRig(
	ids: readonly string[],
	restPositions: readonly Float32Array[],
): WhaleSecondaryRig | null {
	if (!Array.isArray(ids) || !Array.isArray(restPositions) || ids.length !== restPositions.length) {
		return null;
	}

	const seen = new Set<string>();
	const indexById = new Map<string, number>();
	const drawables = new Array<DrawableCache>(ids.length);
	let modelBounds: Bounds | null = null;

	for (let index = 0; index < ids.length; index += 1) {
		const id = ids[index];
		const input = restPositions[index];
		if (
			typeof id !== 'string' ||
			id.length === 0 ||
			seen.has(id) ||
			!(input instanceof Float32Array)
		) {
			return null;
		}
		const rest = new Float32Array(input);
		const bounds = boundsFromPositions(rest);
		if (!bounds) {
			return null;
		}
		seen.add(id);
		indexById.set(id, index);
		modelBounds = mergeBounds(modelBounds, bounds);
		drawables[index] = {
			id,
			rest,
			output: new Float32Array(rest.length),
			armWeight: new Float32Array(rest.length / 2),
			finWeight: new Float32Array(rest.length / 2),
			ahogeWeight: new Float32Array(rest.length / 2),
			tailWeight: new Float32Array(rest.length / 2),
			skirtWeight: new Float32Array(rest.length / 2),
			hairLagWeight: new Float32Array(rest.length / 2),
			bounds,
			pivotIndex: 0,
			hairRootIndex: 0,
			hairRootDistance: 0,
			hairLiveShiftX: 0,
			hairLiveShiftY: 0,
			hairLagShiftX: 0,
			hairLagShiftY: 0,
			hairLagAngle: 0,
			hairLagInitialized: false,
		};
	}

	if (!modelBounds || modelBounds.height <= 0) {
		return null;
	}
	for (const id of REQUIRED_LOCAL_IDS) {
		if (!indexById.has(id)) {
			return null;
		}
	}

	const body = drawables[indexById.get(BODY_ID)!];
	const arm = drawables[indexById.get(ARM_ID)!];
	const finR = drawables[indexById.get(FIN_R_ID)!];
	const finL = drawables[indexById.get(FIN_L_ID)!];
	const ahoge = drawables[indexById.get(AHOGE_ID)!];
	const bowIndex = indexById.get(BOW_R_EDGE_ID);
	const bow = bowIndex === undefined ? null : drawables[bowIndex];
	const tailIndex = indexById.get(TAIL_ID);
	const tail = tailIndex === undefined ? null : drawables[tailIndex];
	const hairRIndex = indexById.get(HAIR_BACK_R_ID);
	const hairLIndex = indexById.get(HAIR_BACK_L_ID);
	const hairR = hairRIndex === undefined ? null : drawables[hairRIndex];
	const hairL = hairLIndex === undefined ? null : drawables[hairLIndex];

	const neckRootIndex = nearestVertexIndex(body.rest, body.bounds.centerX, body.bounds.maxY);
	const neckRootRestX = body.rest[neckRootIndex * 2];
	const neckRootRestY = body.rest[neckRootIndex * 2 + 1];
	let cachedNeckRootX = neckRootRestX;
	let cachedNeckRootY = neckRootRestY;

	arm.pivotIndex = nearestVertexIndex(arm.rest, arm.bounds.centerX, arm.bounds.maxY);
	arm.armWeight.set(makeVerticalWeight(arm.rest, arm.bounds.minY, arm.bounds.maxY, true));

	finR.pivotIndex = nearestVertexIndex(
		finR.rest,
		finR.bounds.minX + finR.bounds.width * 0.08,
		finR.bounds.minY + finR.bounds.height * 0.68,
	);
	finL.pivotIndex = nearestVertexIndex(
		finL.rest,
		finL.bounds.maxX - finL.bounds.width * 0.08,
		finL.bounds.minY + finL.bounds.height * 0.68,
	);
	const finRPivotRestX = finR.rest[finR.pivotIndex * 2];
	const finRPivotRestY = finR.rest[finR.pivotIndex * 2 + 1];
	const finLPivotRestX = finL.rest[finL.pivotIndex * 2];
	const finLPivotRestY = finL.rest[finL.pivotIndex * 2 + 1];
	const finRRadius = maxDistanceFromPivot(finR.rest, finRPivotRestX, finRPivotRestY);
	const finLRadius = maxDistanceFromPivot(finL.rest, finLPivotRestX, finLPivotRestY);
	finR.finWeight.set(makeDistanceWeight(finR.rest, finRPivotRestX, finRPivotRestY, finRRadius));
	finL.finWeight.set(makeDistanceWeight(finL.rest, finLPivotRestX, finLPivotRestY, finLRadius));

	if (bow) {
		// The bow uses FinR's current Core root and FinR's fixed rest radius. It
		// therefore remains joined even when render order changes.
		bow.pivotIndex = nearestVertexIndex(bow.rest, finRPivotRestX, finRPivotRestY);
		bow.finWeight.set(makeDistanceWeight(bow.rest, finRPivotRestX, finRPivotRestY, finRRadius));
	}

	ahoge.pivotIndex = nearestVertexIndex(
		ahoge.rest,
		ahoge.bounds.maxX - ahoge.bounds.width * 0.18,
		ahoge.bounds.minY + ahoge.bounds.height * 0.12,
	);
	const ahogePivotRestX = ahoge.rest[ahoge.pivotIndex * 2];
	const ahogePivotRestY = ahoge.rest[ahoge.pivotIndex * 2 + 1];
	const ahogeRadius = maxDistanceFromPivot(ahoge.rest, ahogePivotRestX, ahogePivotRestY);
	ahoge.ahogeWeight.set(makeDistanceWeight(ahoge.rest, ahogePivotRestX, ahogePivotRestY, ahogeRadius, 0.2));

	if (tail) {
		tail.pivotIndex = nearestVertexIndex(tail.rest, tail.bounds.centerX, tail.bounds.maxY);
		const tailPivotX = tail.rest[tail.pivotIndex * 2];
		const tailPivotY = tail.rest[tail.pivotIndex * 2 + 1];
		tail.tailWeight.set(
			makeDistanceWeight(tail.rest, tailPivotX, tailPivotY, maxDistanceFromPivot(tail.rest, tailPivotX, tailPivotY)),
		);
	}
	body.skirtWeight.set(makeSkirtWeight(body.rest, body.bounds));

	const initializeHair = (drawable: DrawableCache | null): void => {
		if (!drawable) {
			return;
		}
		drawable.hairRootIndex = nearestVertexIndex(drawable.rest, drawable.bounds.centerX, drawable.bounds.maxY);
		const rootX = drawable.rest[drawable.hairRootIndex * 2];
		const rootY = drawable.rest[drawable.hairRootIndex * 2 + 1];
		drawable.hairRootDistance = maxDistanceFromPivot(drawable.rest, rootX, rootY);
		drawable.hairLagWeight.set(makeDistanceWeight(drawable.rest, rootX, rootY, drawable.hairRootDistance));
	};
	initializeHair(hairR);
	initializeHair(hairL);

	const globalAmplitude = modelBounds.height * GLOBAL_SWAY_HEIGHT_FRACTION;
	const skirtAmplitude = modelBounds.height * SKIRT_SWAY_HEIGHT_FRACTION;
	const bodyPivotX = modelBounds.centerX;
	const bodyPivotY = modelBounds.minY + modelBounds.height * BODY_PIVOT_Y_FRACTION;

	let globalSway = 0;
	let bodyAngle = 0;
	let skirtSway = 0;
	let armAngle = 0;
	let smoothedArmDegrees = 0;
	let finRAngle = 0;
	let finLAngle = 0;
	let ahogeAngle = 0;
	let tailAngle = 0;
	let headShiftX = 0;
	let headShiftY = 0;
	let headAngle = 0;
	let headScale = 1;
	let sleepingScale = 1;
	let frameMaxDisplacement = 0;
	let motionInitialized = false;
	let lastSeconds = 0;
	let smoothedLookX = 0;
	let smoothedHeadX = 0;
	let smoothedHeadY = 0;
	let smoothedHeadZ = 0;
	let smoothedBodyZ = 0;
	let earLagX = 0;
	let earLagZ = 0;
	let cachedFinRPivotX = finRPivotRestX;
	let cachedFinRPivotY = finRPivotRestY;
	let cachedFinLPivotX = finLPivotRestX;
	let cachedFinLPivotY = finLPivotRestY;
	let cachedAhogePivotX = ahogePivotRestX;
	let cachedAhogePivotY = ahogePivotRestY;
	let cachedArmPivotX = arm.rest[arm.pivotIndex * 2];
	let cachedArmPivotY = arm.rest[arm.pivotIndex * 2 + 1];
	let cachedTailPivotX = tail ? tail.rest[tail.pivotIndex * 2] : 0;
	let cachedTailPivotY = tail ? tail.rest[tail.pivotIndex * 2 + 1] : 0;

	const refreshHairTarget = (
		drawable: DrawableCache | null,
		corePositions: readonly Float32Array[],
		rate: number,
		deltaSeconds: number,
	): void => {
		if (!drawable) {
			return;
		}
		const hairPositions = corePositions[indexById.get(drawable.id)!];
		const currentRootX = currentCoordinate(
			hairPositions,
			drawable.hairRootIndex,
			0,
			drawable.rest[drawable.hairRootIndex * 2],
		);
		const currentRootY = currentCoordinate(
			hairPositions,
			drawable.hairRootIndex,
			1,
			drawable.rest[drawable.hairRootIndex * 2 + 1],
		);
		const rootDX = currentRootX - cachedNeckRootX;
		const rootDY = currentRootY - cachedNeckRootY;
		const cosine = Math.cos(headAngle);
		const sine = Math.sin(headAngle);
		const transformedRootX = cachedNeckRootX + rootDX * cosine - rootDY * sine + headShiftX;
		const transformedRootY = cachedNeckRootY + rootDX * sine + rootDY * cosine + headShiftY;
		const targetShiftX = transformedRootX - currentRootX;
		const targetShiftY = transformedRootY - currentRootY;
		drawable.hairLiveShiftX = targetShiftX;
		drawable.hairLiveShiftY = targetShiftY;
		if (!drawable.hairLagInitialized) {
			drawable.hairLagShiftX = targetShiftX;
			drawable.hairLagShiftY = targetShiftY;
			drawable.hairLagAngle = headAngle;
			drawable.hairLagInitialized = true;
			return;
		}
		const blend = exponentialBlend(rate, deltaSeconds);
		drawable.hairLagShiftX += (targetShiftX - drawable.hairLagShiftX) * blend;
		drawable.hairLagShiftY += (targetShiftY - drawable.hairLagShiftY) * blend;
		drawable.hairLagAngle += (headAngle - drawable.hairLagAngle) * blend;
	};

	const enabledSummary = new Array<string>();
	const addSummaryID = (id: string): void => {
		if (indexById.has(id) && !enabledSummary.includes(id)) {
			enabledSummary.push(id);
		}
	};
	for (const id of HEAD_IDS) {
		addSummaryID(id);
	}
	for (const id of [HAIR_BACK_R_ID, HAIR_BACK_L_ID, TAIL_ID, ARM_ID, BODY_ID, FIN_R_ID, FIN_L_ID, BOW_R_EDGE_ID, AHOGE_ID]) {
		addSummaryID(id);
	}
	const summary: WhaleSecondarySummary = Object.freeze(enabledSummary);

	const update = (pose: WhaleSecondaryPose, corePositions: readonly Float32Array[]): void => {
		frameMaxDisplacement = 0;
		const seconds = Math.max(0, safePoseValue(pose.seconds, 0));
		const firstMotionUpdate = !motionInitialized;
		let deltaSeconds = 0;
		if (firstMotionUpdate) {
			motionInitialized = true;
			lastSeconds = seconds;
		} else if (seconds > lastSeconds) {
			deltaSeconds = clamp(seconds - lastSeconds, 0, 0.05);
			lastSeconds = seconds;
		} else if (seconds < lastSeconds) {
			// A restarted/rewound clock must not advance any lag state during the
			// same redraw; the next forward frame resumes from the new clock.
			lastSeconds = seconds;
		}

		const targetLookX = clamp(safePoseValue(pose.lookX, 0), -1, 1);
		const targetHeadX = clamp(safePoseValue(pose.headX, 0), -30, 30);
		const targetHeadY = clamp(safePoseValue(pose.headY, 0), -30, 30);
		const targetHeadZ = clamp(safePoseValue(pose.headZ, 0), -30, 30);
		const targetBodyZ = clamp(safePoseValue(pose.bodyZ, 0), -10, 10);
		if (firstMotionUpdate) {
			smoothedLookX = targetLookX;
			smoothedHeadX = targetHeadX;
			smoothedHeadY = targetHeadY;
			smoothedHeadZ = targetHeadZ;
			smoothedBodyZ = targetBodyZ;
			earLagX = targetHeadX;
			earLagZ = targetHeadZ;
		} else if (deltaSeconds > 0) {
			const blend = exponentialBlend(10, deltaSeconds);
			smoothedLookX += (targetLookX - smoothedLookX) * blend;
			smoothedHeadX += (targetHeadX - smoothedHeadX) * blend;
			smoothedHeadY += (targetHeadY - smoothedHeadY) * blend;
			smoothedHeadZ += (targetHeadZ - smoothedHeadZ) * blend;
			smoothedBodyZ += (targetBodyZ - smoothedBodyZ) * blend;
			const earBlend = exponentialBlend(7, deltaSeconds);
			earLagX += (smoothedHeadX - earLagX) * earBlend;
			earLagZ += (smoothedHeadZ - earLagZ) * earBlend;
		}

		const bootScale = smoothstep(seconds / 2);
		sleepingScale = pose.sleeping === true ? SLEEP_LOCAL_SCALE : 1;
		headScale = sleepingScale * bootScale;
		const globalScale = (pose.sleeping === true ? SLEEP_GLOBAL_SCALE : 1) * bootScale;

		const currentBodyPositions = corePositions[indexById.get(BODY_ID)!];
		cachedNeckRootX = currentCoordinate(currentBodyPositions, neckRootIndex, 0, neckRootRestX);
		cachedNeckRootY = currentCoordinate(currentBodyPositions, neckRootIndex, 1, neckRootRestY);
		const currentFinRPositions = corePositions[indexById.get(FIN_R_ID)!];
		const currentFinLPositions = corePositions[indexById.get(FIN_L_ID)!];
		const currentAhogePositions = corePositions[indexById.get(AHOGE_ID)!];
		const currentArmPositions = corePositions[indexById.get(ARM_ID)!];
		cachedFinRPivotX = currentCoordinate(currentFinRPositions, finR.pivotIndex, 0, finRPivotRestX);
		cachedFinRPivotY = currentCoordinate(currentFinRPositions, finR.pivotIndex, 1, finRPivotRestY);
		cachedFinLPivotX = currentCoordinate(currentFinLPositions, finL.pivotIndex, 0, finLPivotRestX);
		cachedFinLPivotY = currentCoordinate(currentFinLPositions, finL.pivotIndex, 1, finLPivotRestY);
		cachedAhogePivotX = currentCoordinate(currentAhogePositions, ahoge.pivotIndex, 0, ahogePivotRestX);
		cachedAhogePivotY = currentCoordinate(currentAhogePositions, ahoge.pivotIndex, 1, ahogePivotRestY);
		cachedArmPivotX = currentCoordinate(currentArmPositions, arm.pivotIndex, 0, cachedArmPivotX);
		cachedArmPivotY = currentCoordinate(currentArmPositions, arm.pivotIndex, 1, cachedArmPivotY);
		if (tail) {
			const currentTailPositions = corePositions[indexById.get(TAIL_ID)!];
			cachedTailPivotX = currentCoordinate(currentTailPositions, tail.pivotIndex, 0, cachedTailPivotX);
			cachedTailPivotY = currentCoordinate(currentTailPositions, tail.pivotIndex, 1, cachedTailPivotY);
		}

		const rawHeadAngle = clamp(smoothedHeadZ * 0.95 + smoothedHeadY * 0.18, -HEAD_MAX_ROTATION_DEGREES, HEAD_MAX_ROTATION_DEGREES) * DEGREES_TO_RADIANS;
		headAngle = rawHeadAngle * headScale;
		// A rigid head turns around the collar/chin anchor. Independent head
		// translations and a y-varying face field caused stretching and gaps.
		headShiftX = 0;
		headShiftY = 0;

		const globalSignal =
			Math.sin((seconds * TWO_PI) / GLOBAL_PERIOD_A_SECONDS) * (0.65 + smoothedLookX * 0.1) +
			Math.sin((seconds * TWO_PI) / GLOBAL_PERIOD_B_SECONDS) * 0.25;
		globalSway = globalAmplitude * globalSignal * globalScale;

		const publicBodyDegrees = clamp(smoothedBodyZ, -BODY_MAX_ROTATION_DEGREES, BODY_MAX_ROTATION_DEGREES);
		const tinyBodyDegrees = Math.sin((seconds * TWO_PI) / BODY_PERIOD_SECONDS + 0.7) * BODY_TINY_SWAY_DEGREES;
		bodyAngle = (publicBodyDegrees + tinyBodyDegrees * (pose.sleeping === true ? SLEEP_GLOBAL_SCALE : 1)) * DEGREES_TO_RADIANS * globalScale;
		const skirtSignal =
			Math.sin((seconds * TWO_PI) / BODY_PERIOD_SECONDS + 0.5) * 0.72 +
			clamp(smoothedBodyZ / BODY_MAX_ROTATION_DEGREES, -1, 1) * 0.28;
		skirtSway = skirtAmplitude * skirtSignal * globalScale;

		const idleSeconds = Math.max(0, safePoseValue(pose.idleSeconds, seconds));
		const phase = idleSeconds % WAVE_PERIOD_SECONDS;
		const liftIn = smoothstep((phase - 28) / 0.9);
		const liftOut = 1 - smoothstep((phase - 31.1) / 0.9);
		const cycleLift = pose.reaction === null ? clamp(liftIn * liftOut, 0, 1) : 0;
		const reactionProgress = clamp(safePoseValue(pose.reactionProgress, 0), 0, 1);
		const reactionEnvelope = Math.sin(Math.PI * reactionProgress);
		const waveExtra = pose.reaction === 'wave'
			? (WAVE_ARM_EXTRA_DEGREES + 5 * Math.sin(reactionProgress * TWO_PI * 2)) * reactionEnvelope
			: pose.reaction === 'greet' ? 28 * reactionEnvelope
				: pose.reaction === 'pet' ? 20 * reactionEnvelope : 0;
		const armTargetDegrees =
			(ARM_SWAY_DEGREES * Math.sin((seconds * TWO_PI) / ARM_PERIOD_SECONDS) +
				ARM_LIFT_DEGREES * cycleLift +
				waveExtra) *
			sleepingScale *
			bootScale;
		if (deltaSeconds > 0) {
			smoothedArmDegrees += (armTargetDegrees - smoothedArmDegrees) * exponentialBlend(10, deltaSeconds);
		}
		armAngle = smoothedArmDegrees * DEGREES_TO_RADIANS;

		const earElastic = clamp((smoothedHeadX - earLagX) * 0.08 + (smoothedHeadZ - earLagZ) * 0.04, -1.5, 1.5);
		finRAngle =
			(FIN_SWAY_DEGREES * Math.sin((seconds * TWO_PI) / FIN_R_PERIOD_SECONDS) + earElastic) *
			DEGREES_TO_RADIANS *
			sleepingScale *
			bootScale;
		finLAngle =
			(-FIN_SWAY_DEGREES * Math.sin((seconds * TWO_PI) / FIN_L_PERIOD_SECONDS) - earElastic) *
			DEGREES_TO_RADIANS *
			sleepingScale *
			bootScale;
		ahogeAngle =
			(AHOGE_SWAY_DEGREES * Math.sin((seconds * TWO_PI) / AHOGE_PERIOD_SECONDS) + earElastic * 0.8) *
			DEGREES_TO_RADIANS *
			sleepingScale *
			bootScale;
		tailAngle = clamp(safePoseValue(pose.tail, 0) * TAIL_CORE_DEGREES, -8, 8) * DEGREES_TO_RADIANS * sleepingScale * bootScale;

		refreshHairTarget(hairR, corePositions, 2.5, deltaSeconds);
		refreshHairTarget(hairL, corePositions, 3.5, deltaSeconds);
	};

	const positions = (drawableIndex: number, currentPositions: Float32Array): Float32Array => {
		const drawable = drawables[drawableIndex];
		if (
			!drawable ||
			!(currentPositions instanceof Float32Array) ||
			currentPositions.length !== drawable.output.length
		) {
			return currentPositions;
		}

		drawable.output.set(currentPositions);
		const id = drawable.id;
		const isHead = HEAD_ID_SET.has(id);
		const isHairBack = HAIR_BACK_IDS.has(id);
		const isArm = id === ARM_ID;
		const isFinR = id === FIN_R_ID || id === BOW_R_EDGE_ID;
		const isFinL = id === FIN_L_ID;
		const isAhoge = id === AHOGE_ID;
		const isTail = id === TAIL_ID;
		const isBody = id === BODY_ID;

		let localPivotX = 0;
		let localPivotY = 0;
		if (isArm) {
			localPivotX = cachedArmPivotX;
			localPivotY = cachedArmPivotY;
		} else if (isFinR) {
			localPivotX = cachedFinRPivotX;
			localPivotY = cachedFinRPivotY;
		} else if (isFinL) {
			localPivotX = cachedFinLPivotX;
			localPivotY = cachedFinLPivotY;
		} else if (isAhoge) {
			localPivotX = cachedAhogePivotX;
			localPivotY = cachedAhogePivotY;
		} else if (isTail) {
			localPivotX = cachedTailPivotX;
			localPivotY = cachedTailPivotY;
		}

		for (let vertex = 0; vertex < currentPositions.length; vertex += 2) {
			const weightIndex = vertex / 2;
			const currentX = currentPositions[vertex];
			const currentY = currentPositions[vertex + 1];
			let x = finiteOrFallback(currentX, 0);
			let y = finiteOrFallback(currentY, 0);

			// Local rotations are applied first, using current Core roots so Core
			// physics and expression movement remain the source of truth.
			let localAngle = 0;
			if (isArm) {
				localAngle = armAngle * drawable.armWeight[weightIndex];
			} else if (isFinR) {
				localAngle = finRAngle * drawable.finWeight[weightIndex];
			} else if (isFinL) {
				localAngle = finLAngle * drawable.finWeight[weightIndex];
			} else if (isAhoge) {
				localAngle = ahogeAngle * drawable.ahogeWeight[weightIndex];
			} else if (isTail) {
				localAngle = tailAngle * drawable.tailWeight[weightIndex];
			} else if (isBody) {
				x += skirtSway * drawable.skirtWeight[weightIndex];
			}
			if (localAngle !== 0) {
				const dx = x - localPivotX;
				const dy = y - localPivotY;
				const cosine = Math.cos(localAngle);
				const sine = Math.sin(localAngle);
				x = localPivotX + dx * cosine - dy * sine;
				y = localPivotY + dx * sine + dy * cosine;
			}

			// Back hair gets the head root immediately and blends toward a delayed
			// head transform at its tips. Core ParamHairBack movement remains in x/y.
			if (isHairBack) {
				const rootX = currentPositions[drawable.hairRootIndex * 2];
				const rootY = currentPositions[drawable.hairRootIndex * 2 + 1];
				const lagWeight = drawable.hairLagWeight[weightIndex];
				const appliedAngle = headAngle + (drawable.hairLagAngle - headAngle) * lagWeight;
				const appliedShiftX = drawable.hairLiveShiftX + (drawable.hairLagShiftX - drawable.hairLiveShiftX) * lagWeight;
				const appliedShiftY = drawable.hairLiveShiftY + (drawable.hairLagShiftY - drawable.hairLiveShiftY) * lagWeight;
				const dx = x - rootX;
				const dy = y - rootY;
				const cosine = Math.cos(appliedAngle);
				const sine = Math.sin(appliedAngle);
				x = rootX + dx * cosine - dy * sine + appliedShiftX;
				y = rootY + dx * sine + dy * cosine + appliedShiftY;
			}

			// Face, eyes, mouth and head silhouette rotate rigidly together.
			// Only the neck-covering hair bridges into the fixed collar.
			if (isHead) {
				const weight = id === 'NeckHairEdges'
					? headBoundaryWeight(y, cachedNeckRootY, modelBounds!.height) : 1;
				const angle = headAngle * weight;
				const dx = x - cachedNeckRootX;
				const dy = y - cachedNeckRootY;
				const cosine = Math.cos(angle);
				const sine = Math.sin(angle);
				x = cachedNeckRootX + dx * cosine - dy * sine + headShiftX * weight;
				y = cachedNeckRootY + dx * sine + dy * cosine + headShiftY * weight;
			}

			// Shared public fields are applied after local/head fields, so a common
			// edge receives the same coordinate math regardless of draw order.
			x += globalSway * modelSwayWeight(y, modelBounds!);
			const bodyWeight = bodyFieldWeight(y, modelBounds!);
			const bodyAngleForVertex = bodyAngle * bodyWeight;
			const bodyDX = x - bodyPivotX;
			const bodyDY = y - bodyPivotY;
			const bodyCosine = Math.cos(bodyAngleForVertex);
			const bodySine = Math.sin(bodyAngleForVertex);
			x = bodyPivotX + bodyDX * bodyCosine - bodyDY * bodySine;
			y = bodyPivotY + bodyDX * bodySine + bodyDY * bodyCosine;

			const displacementX = Math.abs(x - currentX);
			const displacementY = Math.abs(y - currentY);
			frameMaxDisplacement = Math.max(frameMaxDisplacement, displacementX, displacementY);
			drawable.output[vertex] = x;
			drawable.output[vertex + 1] = y;
		}
		return drawable.output;
	};

	return Object.freeze({
		update,
		positions,
		summary: () => summary,
		get maxDisplacement(): number {
			return frameMaxDisplacement;
		},
	});
}

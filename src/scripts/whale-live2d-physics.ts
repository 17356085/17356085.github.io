/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

/**
 * A dependency-free physics3 parser and evaluator for the raw Cubism Core
 * adapter. The data layout and evaluator formulas follow the official
 * Cubism Web Framework sources:
 *
 * - https://raw.githubusercontent.com/Live2D/CubismSpecs/master/FileFormats/physics3.json.md
 * - https://raw.githubusercontent.com/Live2D/CubismWebFramework/develop/src/physics/cubismphysics.ts
 * - https://raw.githubusercontent.com/Live2D/CubismWebFramework/develop/src/physics/cubismphysicsinternal.ts
 * - https://raw.githubusercontent.com/Live2D/CubismWebFramework/develop/src/math/cubismmath.ts
 *
 * This file keeps the Framework evaluator state machine while replacing
 * CubismModel and ID handles with a small parameter-array view. It has no
 * timer, render-loop, or FPS scheduler.
 */

export type WhalePhysicsType = 'X' | 'Y' | 'Angle';

export interface WhalePhysicsVector2 {
	readonly x: number;
	readonly y: number;
}

export interface WhalePhysicsNormalization {
	readonly minimum: number;
	readonly default: number;
	readonly maximum: number;
}

export interface WhalePhysicsInput {
	readonly sourceId: string;
	readonly weight: number;
	/**
	 * Cubism input Reflect semantics: true preserves normalized value, false
	 * negates it.
	 */
	readonly reflect: boolean;
	readonly type: WhalePhysicsType;
}

export interface WhalePhysicsOutput {
	readonly destinationId: string;
	readonly vertexIndex: number;
	/**
	 * Angle output values are radians before Scale is applied, matching the
	 * official directionToRadian helper.
	 */
	readonly scale: number;
	readonly weight: number;
	readonly type: WhalePhysicsType;
	/**
	 * The official output getter negates the value when Reflect is true.
	 */
	readonly reflect: boolean;
}

export interface WhalePhysicsParticle {
	readonly position: WhalePhysicsVector2;
	readonly mobility: number;
	readonly delay: number;
	readonly acceleration: number;
	readonly radius: number;
}

export interface WhalePhysicsSetting {
	readonly id: string;
	readonly inputs: readonly WhalePhysicsInput[];
	readonly outputs: readonly WhalePhysicsOutput[];
	readonly vertices: readonly WhalePhysicsParticle[];
	readonly normalizationPosition: WhalePhysicsNormalization;
	readonly normalizationAngle: WhalePhysicsNormalization;
}

export interface WhalePhysicsDictionaryEntry {
	readonly id: string;
	readonly name: string;
}

export interface WhalePhysicsRigCounts {
	readonly physicsSettingCount: number;
	readonly totalInputCount: number;
	readonly totalOutputCount: number;
	readonly vertexCount: number;
}

/**
 * Immutable result of parseWhalePhysics3().
 *
 * settings retain the per-setting grouping from physics3.json. The flat
 * arrays are exposed too for inspection and resource accounting.
 */
export interface WhalePhysicsRig {
	readonly version: 3;
	readonly fps: number;
	readonly gravity: WhalePhysicsVector2;
	readonly wind: WhalePhysicsVector2;
	readonly counts: WhalePhysicsRigCounts;
	readonly physicsDictionary: readonly WhalePhysicsDictionaryEntry[];
	readonly settings: readonly WhalePhysicsSetting[];
	readonly inputs: readonly WhalePhysicsInput[];
	readonly outputs: readonly WhalePhysicsOutput[];
	readonly particles: readonly WhalePhysicsParticle[];
}

/**
 * The model view exposes only the parameter arrays used by the official
 * physics evaluator. The values array must be writable.
 */
export interface WhalePhysicsMutableValues {
	readonly length: number;
	[index: number]: number;
}

export interface WhalePhysicsModelView {
	readonly parameterIds: readonly string[];
	readonly values: WhalePhysicsMutableValues;
	readonly minimumValues: ArrayLike<number>;
	readonly maximumValues: ArrayLike<number>;
	readonly defaultValues: ArrayLike<number>;
}

export interface WhalePhysicsRuntime {
	stabilize(): void;
	evaluate(deltaSeconds: number): void;
	reset(): void;
}

type PhysicsRecord = Record<string, unknown>;

const ROOT_KEYS = new Set(['Version', 'Meta', 'PhysicsSettings']);
const META_KEYS = new Set([
	'PhysicsSettingCount',
	'TotalInputCount',
	'TotalOutputCount',
	'VertexCount',
	'Fps',
	'EffectiveForces',
	'PhysicsDictionary',
]);
const EFFECTIVE_FORCES_KEYS = new Set(['Gravity', 'Wind']);
const DICTIONARY_KEYS = new Set(['Id', 'Name']);
const SETTING_KEYS = new Set(['Id', 'Input', 'Output', 'Vertices', 'Normalization']);
const NORMALIZATION_KEYS = new Set(['Position', 'Angle']);
const NORMALIZATION_VALUE_KEYS = new Set(['Minimum', 'Default', 'Maximum']);
const INPUT_KEYS = new Set(['Source', 'Weight', 'Type', 'Reflect']);
const OUTPUT_KEYS = new Set([
	'Destination',
	'VertexIndex',
	'Scale',
	'Weight',
	'Type',
	'Reflect',
]);
const PARAMETER_KEYS = new Set(['Target', 'Id']);
const VERTEX_KEYS = new Set(['Position', 'Mobility', 'Delay', 'Acceleration', 'Radius']);

const AIR_RESISTANCE = 5;
const MAXIMUM_WEIGHT = 100;
const MOVEMENT_THRESHOLD = 0.001;
const MAX_DELTA_TIME = 5;
const DEGREES_TO_RADIANS = Math.PI / 180;

function hasOwn(record: PhysicsRecord, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value: unknown): value is PhysicsRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(path: string, detail: string): never {
	throw new Error('Invalid physics3 ' + path + ': ' + detail);
}

function unsupported(path: string, detail: string): never {
	throw new Error('Unsupported physics3 ' + path + ': ' + detail);
}

function expectRecord(value: unknown, path: string): PhysicsRecord {
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

function assertAllowedKeys(record: PhysicsRecord, allowed: ReadonlySet<string>, path: string): void {
	for (const key of Object.keys(record)) {
		if (!allowed.has(key)) {
			invalid(path + '.' + key, 'unsupported property.');
		}
	}
}

function finiteNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		invalid(path, 'expected a finite number.');
	}
	return value;
}

function requiredFiniteNumber(record: PhysicsRecord, key: string, path: string): number {
	if (!hasOwn(record, key)) {
		invalid(path + '.' + key, 'is required.');
	}
	return finiteNumber(record[key], path + '.' + key);
}

function optionalFiniteNumber(
	record: PhysicsRecord,
	key: string,
	path: string,
	fallback: number,
): number {
	if (!hasOwn(record, key)) {
		return fallback;
	}
	return finiteNumber(record[key], path + '.' + key);
}

function requiredBoolean(record: PhysicsRecord, key: string, path: string): boolean {
	if (!hasOwn(record, key) || typeof record[key] !== 'boolean') {
		invalid(path + '.' + key, 'expected a boolean.');
	}
	return record[key] as boolean;
}

function requiredString(record: PhysicsRecord, key: string, path: string): string {
	if (!hasOwn(record, key) || typeof record[key] !== 'string') {
		invalid(path + '.' + key, 'expected a string.');
	}
	return record[key] as string;
}

function nonEmptyString(record: PhysicsRecord, key: string, path: string): string {
	const value = requiredString(record, key, path);
	if (value.trim().length === 0) {
		invalid(path + '.' + key, 'must be non-empty.');
	}
	return value;
}

function requiredCount(record: PhysicsRecord, key: string, path: string): number {
	const value = requiredFiniteNumber(record, key, path);
	if (!Number.isSafeInteger(value) || value < 0) {
		invalid(path + '.' + key, 'expected a non-negative safe integer count.');
	}
	return value;
}

function rangeNumber(value: number, minimum: number, maximum: number, path: string): number {
	if (value < minimum || value > maximum) {
		invalid(path, 'must be in ' + minimum + '..' + maximum + '.');
	}
	return value;
}

function frozenVector(x: number, y: number): WhalePhysicsVector2 {
	return Object.freeze({ x, y });
}

function readVector(value: unknown, path: string): WhalePhysicsVector2 {
	const record = expectRecord(value, path);
	assertAllowedKeys(record, new Set(['X', 'Y']), path);
	return frozenVector(
		requiredFiniteNumber(record, 'X', path),
		requiredFiniteNumber(record, 'Y', path),
	);
}

function readNormalization(value: unknown, path: string): WhalePhysicsNormalization {
	const record = expectRecord(value, path);
	assertAllowedKeys(record, NORMALIZATION_VALUE_KEYS, path);
	const minimum = requiredFiniteNumber(record, 'Minimum', path);
	const defaultValue = requiredFiniteNumber(record, 'Default', path);
	const maximum = requiredFiniteNumber(record, 'Maximum', path);
	if (minimum >= maximum) {
		invalid(path, 'Minimum must be less than Maximum.');
	}
	if (defaultValue < minimum || defaultValue > maximum) {
		invalid(path + '.Default', 'must be within Minimum..Maximum.');
	}
	return Object.freeze({ minimum, default: defaultValue, maximum });
}

function readPhysicsType(value: unknown, path: string): WhalePhysicsType {
	if (value === 'X' || value === 'Y' || value === 'Angle') {
		return value;
	}
	unsupported(path, 'Type must be "X", "Y", or "Angle".');
}

function readParameter(value: unknown, path: string): string {
	const record = expectRecord(value, path);
	assertAllowedKeys(record, PARAMETER_KEYS, path);
	const target = requiredString(record, 'Target', path);
	if (target !== 'Parameter') {
		unsupported(path + '.Target', 'only "Parameter" is supported, received "' + target + '".');
	}
	return nonEmptyString(record, 'Id', path);
}

function readInput(value: unknown, path: string): WhalePhysicsInput {
	const record = expectRecord(value, path);
	assertAllowedKeys(record, INPUT_KEYS, path);
	const sourceId = readParameter(record.Source, path + '.Source');
	const weight = rangeNumber(
		requiredFiniteNumber(record, 'Weight', path),
		0,
		100,
		path + '.Weight',
	);
	const type = readPhysicsType(record.Type, path + '.Type');
	const reflect = requiredBoolean(record, 'Reflect', path);
	return Object.freeze({ sourceId, weight, type, reflect });
}

function readOutput(value: unknown, path: string, vertexCount: number): WhalePhysicsOutput {
	const record = expectRecord(value, path);
	assertAllowedKeys(record, OUTPUT_KEYS, path);
	const destinationId = readParameter(record.Destination, path + '.Destination');
	const vertexIndex = requiredFiniteNumber(record, 'VertexIndex', path);
	if (!Number.isSafeInteger(vertexIndex)) {
		invalid(path + '.VertexIndex', 'must be a safe integer.');
	}
	if (vertexIndex < 1 || vertexIndex >= vertexCount) {
		invalid(path + '.VertexIndex', 'must be in 1..' + (vertexCount - 1) + '.');
	}
	const scale = requiredFiniteNumber(record, 'Scale', path);
	const weight = rangeNumber(
		requiredFiniteNumber(record, 'Weight', path),
		0,
		100,
		path + '.Weight',
	);
	const type = readPhysicsType(record.Type, path + '.Type');
	const reflect = requiredBoolean(record, 'Reflect', path);
	return Object.freeze({ destinationId, vertexIndex, scale, weight, type, reflect });
}

function readParticle(value: unknown, path: string): WhalePhysicsParticle {
	const record = expectRecord(value, path);
	assertAllowedKeys(record, VERTEX_KEYS, path);
	const position = readVector(record.Position, path + '.Position');
	const mobility = requiredFiniteNumber(record, 'Mobility', path);
	const delay = requiredFiniteNumber(record, 'Delay', path);
	const acceleration = requiredFiniteNumber(record, 'Acceleration', path);
	const radius = requiredFiniteNumber(record, 'Radius', path);
	for (const [key, field] of [
		['Mobility', mobility],
		['Delay', delay],
		['Acceleration', acceleration],
		['Radius', radius],
	] as const) {
		if (field < 0) {
			invalid(path + '.' + key, 'must not be negative.');
		}
	}
	return Object.freeze({ position, mobility, delay, acceleration, radius });
}

function readSetting(
	value: unknown,
	index: number,
	seenSettingIds: Set<string>,
): WhalePhysicsSetting {
	const path = 'PhysicsSettings[' + index + ']';
	const record = expectRecord(value, path);
	assertAllowedKeys(record, SETTING_KEYS, path);
	const id = nonEmptyString(record, 'Id', path);
	if (seenSettingIds.has(id)) {
		invalid(path + '.Id', 'duplicate physics setting ID "' + id + '".');
	}
	seenSettingIds.add(id);

	const inputs = expectArray(record.Input, path + '.Input').map((item, inputIndex) =>
		readInput(item, path + '.Input[' + inputIndex + ']'),
	);
	const rawVertices = expectArray(record.Vertices, path + '.Vertices');
	if (rawVertices.length === 0) {
		invalid(path + '.Vertices', 'must contain at least the root particle.');
	}
	const vertices = rawVertices.map((item, vertexIndex) =>
		readParticle(item, path + '.Vertices[' + vertexIndex + ']'),
	);
	const outputs = expectArray(record.Output, path + '.Output').map((item, outputIndex) =>
		readOutput(item, path + '.Output[' + outputIndex + ']', vertices.length),
	);
	const normalization = expectRecord(record.Normalization, path + '.Normalization');
	assertAllowedKeys(normalization, NORMALIZATION_KEYS, path + '.Normalization');
	const normalizationPosition = readNormalization(
		normalization.Position,
		path + '.Normalization.Position',
	);
	const normalizationAngle = readNormalization(
		normalization.Angle,
		path + '.Normalization.Angle',
	);

	return Object.freeze({
		id,
		inputs: Object.freeze(inputs),
		outputs: Object.freeze(outputs),
		vertices: Object.freeze(vertices),
		normalizationPosition,
		normalizationAngle,
	});
}

/**
 * Parse and strictly validate a physics3.json object.
 *
 * Model lookup is deferred to createWhalePhysicsRuntime(), so an immutable
 * resource can be parsed and cached before a Core model exists.
 */
export function parseWhalePhysics3(value: unknown): WhalePhysicsRig {
	const root = expectRecord(value, 'physics3');
	assertAllowedKeys(root, ROOT_KEYS, 'physics3');
	if (!hasOwn(root, 'Version') || finiteNumber(root.Version, 'Version') !== 3) {
		invalid('Version', 'only physics3 Version 3 is supported.');
	}

	const meta = expectRecord(root.Meta, 'Meta');
	assertAllowedKeys(meta, META_KEYS, 'Meta');
	const expectedSettingCount = requiredCount(meta, 'PhysicsSettingCount', 'Meta');
	const expectedInputCount = requiredCount(meta, 'TotalInputCount', 'Meta');
	const expectedOutputCount = requiredCount(meta, 'TotalOutputCount', 'Meta');
	const expectedVertexCount = requiredCount(meta, 'VertexCount', 'Meta');
	const fps = optionalFiniteNumber(meta, 'Fps', 'Meta', 0);
	if (fps < 0) {
		invalid('Meta.Fps', 'must not be negative.');
	}
	const effectiveForces = expectRecord(meta.EffectiveForces, 'Meta.EffectiveForces');
	assertAllowedKeys(effectiveForces, EFFECTIVE_FORCES_KEYS, 'Meta.EffectiveForces');
	const gravity = readVector(effectiveForces.Gravity, 'Meta.EffectiveForces.Gravity');
	const wind = readVector(effectiveForces.Wind, 'Meta.EffectiveForces.Wind');

	const rawDictionary = expectArray(meta.PhysicsDictionary, 'Meta.PhysicsDictionary');
	const dictionaryIds = new Set<string>();
	const physicsDictionary = rawDictionary.map((item, index) => {
		const path = 'Meta.PhysicsDictionary[' + index + ']';
		const record = expectRecord(item, path);
		assertAllowedKeys(record, DICTIONARY_KEYS, path);
		const id = nonEmptyString(record, 'Id', path);
		if (dictionaryIds.has(id)) {
			invalid(path + '.Id', 'duplicate physics dictionary ID "' + id + '".');
		}
		dictionaryIds.add(id);
		const name = requiredString(record, 'Name', path);
		return Object.freeze({ id, name });
	});

	const rawSettings = expectArray(root.PhysicsSettings, 'PhysicsSettings');
	if (rawSettings.length !== expectedSettingCount) {
		invalid(
			'Meta.PhysicsSettingCount',
			'declares ' + expectedSettingCount + ', found ' + rawSettings.length + '.',
		);
	}
	const seenSettingIds = new Set<string>();
	const settings = rawSettings.map((item, index) => readSetting(item, index, seenSettingIds));
	const inputs = settings.flatMap((setting) => setting.inputs);
	const outputs = settings.flatMap((setting) => setting.outputs);
	const particles = settings.flatMap((setting) => setting.vertices);
	if (inputs.length !== expectedInputCount) {
		invalid(
			'Meta.TotalInputCount',
			'declares ' + expectedInputCount + ', found ' + inputs.length + '.',
		);
	}
	if (outputs.length !== expectedOutputCount) {
		invalid(
			'Meta.TotalOutputCount',
			'declares ' + expectedOutputCount + ', found ' + outputs.length + '.',
		);
	}
	if (particles.length !== expectedVertexCount) {
		invalid(
			'Meta.VertexCount',
			'declares ' + expectedVertexCount + ', found ' + particles.length + '.',
		);
	}

	const counts = Object.freeze({
		physicsSettingCount: expectedSettingCount,
		totalInputCount: expectedInputCount,
		totalOutputCount: expectedOutputCount,
		vertexCount: expectedVertexCount,
	});
	return Object.freeze({
		version: 3 as const,
		fps,
		gravity,
		wind,
		counts,
		physicsDictionary: Object.freeze(physicsDictionary),
		settings: Object.freeze(settings),
		inputs: Object.freeze(inputs),
		outputs: Object.freeze(outputs),
		particles: Object.freeze(particles),
	});
}

interface MutableVector2 {
	x: number;
	y: number;
}

interface ParticleState {
	readonly mobility: number;
	readonly delay: number;
	readonly acceleration: number;
	readonly radius: number;
	position: MutableVector2;
	lastPosition: MutableVector2;
	lastGravity: MutableVector2;
	force: MutableVector2;
	velocity: MutableVector2;
}

interface RuntimeInput {
	readonly input: WhalePhysicsInput;
	readonly sourceIndex: number;
}

interface RuntimeOutput {
	readonly output: WhalePhysicsOutput;
	readonly destinationIndex: number;
}

interface RuntimeSetting {
	readonly setting: WhalePhysicsSetting;
	readonly inputs: readonly RuntimeInput[];
	readonly outputs: readonly RuntimeOutput[];
	readonly particles: ParticleState[];
	readonly currentOutputs: number[];
	readonly previousOutputs: number[];
}

function mutableVector(x: number, y: number): MutableVector2 {
	return { x, y };
}

function copyVector(value: MutableVector2): MutableVector2 {
	return mutableVector(value.x, value.y);
}

function vectorLength(value: MutableVector2): number {
	return Math.sqrt(value.x * value.x + value.y * value.y);
}

function normalizeVector(value: MutableVector2): void {
	const length = vectorLength(value);
	if (length > 0) {
		value.x /= length;
		value.y /= length;
	} else {
		value.x = 0;
		value.y = 0;
	}
}

function addVectors(left: MutableVector2, right: MutableVector2): MutableVector2 {
	return mutableVector(left.x + right.x, left.y + right.y);
}

function subtractVectors(left: MutableVector2, right: MutableVector2): MutableVector2 {
	return mutableVector(left.x - right.x, left.y - right.y);
}

function multiplyVector(value: MutableVector2, scalar: number): MutableVector2 {
	return mutableVector(value.x * scalar, value.y * scalar);
}

function degreesToRadian(degrees: number): number {
	return degrees * DEGREES_TO_RADIANS;
}

function radianToDirection(radian: number): MutableVector2 {
	return mutableVector(Math.sin(radian), Math.cos(radian));
}

function directionToRadian(from: MutableVector2, to: MutableVector2): number {
	const q1 = Math.atan2(to.y, to.x);
	const q2 = Math.atan2(from.y, from.x);
	let result = q1 - q2;
	while (result < -Math.PI) {
		result += Math.PI * 2;
	}
	while (result > Math.PI) {
		result -= Math.PI * 2;
	}
	return result;
}

function rotateBySourceOrder(value: MutableVector2, radian: number): void {
	// Keep the operation order used by CubismPhysics. The second assignment
	// observes the already-updated x component.
	value.x = Math.cos(radian) * value.x - value.y * Math.sin(radian);
	value.y = Math.sin(radian) * value.x + value.y * Math.cos(radian);
}

function normalizeParameterValue(
	value: number,
	parameterMinimum: number,
	parameterMaximum: number,
	_parameterDefault: number,
	normalizedMinimum: number,
	normalizedMaximum: number,
	normalizedDefault: number,
	reflect: boolean,
): number {
	const maximum = Math.max(parameterMaximum, parameterMinimum);
	const minimum = Math.min(parameterMaximum, parameterMinimum);
	const clamped = Math.min(maximum, Math.max(minimum, value));
	const normalizedMinimumValue = Math.min(normalizedMinimum, normalizedMaximum);
	const normalizedMaximumValue = Math.max(normalizedMinimum, normalizedMaximum);
	const middleValue = minimum + (maximum - minimum) / 2;
	const difference = clamped - middleValue;
	let result = normalizedDefault;
	if (difference > 0) {
		const positiveLength = maximum - middleValue;
		if (positiveLength !== 0) {
			result = difference * ((normalizedMaximumValue - normalizedDefault) / positiveLength);
			result += normalizedDefault;
		}
	} else if (difference < 0) {
		const negativeLength = minimum - middleValue;
		if (negativeLength !== 0) {
			result = difference * ((normalizedMinimumValue - normalizedDefault) / negativeLength);
			result += normalizedDefault;
		}
	}
	// Current CubismPhysics input semantics: false negates, true preserves.
	return reflect ? result : result * -1;
}

function loadInputs(
	runtimeSetting: RuntimeSetting,
	parameterValues: WhalePhysicsMutableValues | Float64Array,
	model: WhalePhysicsModelView,
): { translation: MutableVector2; angle: number } {
	const translation = mutableVector(0, 0);
	let angle = 0;
	for (const runtimeInput of runtimeSetting.inputs) {
		const { input, sourceIndex } = runtimeInput;
		const weight = input.weight / MAXIMUM_WEIGHT;
		const normalization =
			input.type === 'Angle'
				? runtimeSetting.setting.normalizationAngle
				: runtimeSetting.setting.normalizationPosition;
		const normalized = normalizeParameterValue(
			parameterValues[sourceIndex],
			model.minimumValues[sourceIndex],
			model.maximumValues[sourceIndex],
			model.defaultValues[sourceIndex],
			normalization.minimum,
			normalization.maximum,
			normalization.default,
			input.reflect,
		);
		if (input.type === 'X') {
			translation.x += normalized * weight;
		} else if (input.type === 'Y') {
			translation.y += normalized * weight;
		} else {
			angle += normalized * weight;
		}
	}
	return { translation, angle };
}

function rotateInputTranslation(translation: MutableVector2, angle: number): void {
	rotateBySourceOrder(translation, degreesToRadian(-angle));
}

function updateParticles(
	runtimeSetting: RuntimeSetting,
	totalTranslation: MutableVector2,
	totalAngle: number,
	deltaSeconds: number,
	wind: WhalePhysicsVector2,
	threshold: number,
): void {
	// The full Framework receives wind through Options. This raw-Core runtime
	// has no separate Options object, so it uses physics3 EffectiveForces.Wind.
	const particles = runtimeSetting.particles;
	particles[0].position = copyVector(totalTranslation);
	const currentGravity = radianToDirection(degreesToRadian(totalAngle));
	normalizeVector(currentGravity);
	for (let index = 1; index < particles.length; index += 1) {
		const particle = particles[index];
		particle.force = addVectors(
			multiplyVector(currentGravity, particle.acceleration),
			mutableVector(wind.x, wind.y),
		);
		particle.lastPosition = copyVector(particle.position);
		const delay = particle.delay * deltaSeconds * 30;
		const direction = subtractVectors(particle.position, particles[index - 1].position);
		const radian = directionToRadian(particle.lastGravity, currentGravity) / AIR_RESISTANCE;
		rotateBySourceOrder(direction, radian);
		particle.position = addVectors(particles[index - 1].position, direction);
		const velocity = multiplyVector(particle.velocity, delay);
		const force = multiplyVector(multiplyVector(particle.force, delay), delay);
		particle.position = addVectors(addVectors(particle.position, velocity), force);
		const newDirection = subtractVectors(particle.position, particles[index - 1].position);
		normalizeVector(newDirection);
		particle.position = addVectors(
			particles[index - 1].position,
			multiplyVector(newDirection, particle.radius),
		);
		if (Math.abs(particle.position.x) < threshold) {
			particle.position.x = 0;
		}
		if (delay !== 0) {
			particle.velocity = multiplyVector(
				multiplyVector(
					subtractVectors(particle.position, particle.lastPosition),
					1 / delay,
				),
				particle.mobility,
			);
		}
		particle.force = mutableVector(0, 0);
		particle.lastGravity = copyVector(currentGravity);
	}
}

function stabilizeParticles(
	runtimeSetting: RuntimeSetting,
	totalTranslation: MutableVector2,
	totalAngle: number,
	wind: WhalePhysicsVector2,
	threshold: number,
): void {
	const particles = runtimeSetting.particles;
	particles[0].position = copyVector(totalTranslation);
	const currentGravity = radianToDirection(degreesToRadian(totalAngle));
	normalizeVector(currentGravity);
	for (let index = 1; index < particles.length; index += 1) {
		const particle = particles[index];
		particle.force = addVectors(
			multiplyVector(currentGravity, particle.acceleration),
			mutableVector(wind.x, wind.y),
		);
		particle.lastPosition = copyVector(particle.position);
		particle.velocity = mutableVector(0, 0);
		const force = copyVector(particle.force);
		normalizeVector(force);
		particle.position = addVectors(
			particles[index - 1].position,
			multiplyVector(force, particle.radius),
		);
		if (Math.abs(particle.position.x) < threshold) {
			particle.position.x = 0;
		}
		particle.force = mutableVector(0, 0);
		particle.lastGravity = copyVector(currentGravity);
	}
}

function outputValue(
	output: WhalePhysicsOutput,
	translation: MutableVector2,
	particles: readonly ParticleState[],
	parentGravity: WhalePhysicsVector2,
): number {
	// The full Framework receives the parent gravity through Options. The
	// parsed physics3 EffectiveForces.Gravity is the local equivalent here.
	let value: number;
	if (output.type === 'X') {
		value = translation.x;
	} else if (output.type === 'Y') {
		value = translation.y;
	} else {
		let reference: MutableVector2;
		if (output.vertexIndex >= 2) {
			reference = subtractVectors(
				particles[output.vertexIndex - 1].position,
				particles[output.vertexIndex - 2].position,
			);
		} else {
			reference = mutableVector(-parentGravity.x, -parentGravity.y);
		}
		value = directionToRadian(reference, translation);
	}
	// Current CubismPhysics output semantics: true negates, false preserves.
	return output.reflect ? value * -1 : value;
}

function applyOutput(
	values: WhalePhysicsMutableValues | Float64Array,
	destinationIndex: number,
	minimum: number,
	maximum: number,
	physicsValue: number,
	output: WhalePhysicsOutput,
): number {
	let value = physicsValue * output.scale;
	if (value < minimum) {
		value = minimum;
	} else if (value > maximum) {
		value = maximum;
	}
	const weight = output.weight / MAXIMUM_WEIGHT;
	const current = values[destinationIndex];
	const blended = weight >= 1 ? value : current * (1 - weight) + value * weight;
	values[destinationIndex] = blended;
	return blended;
}

function readArrayLikeLength(value: unknown, path: string): number {
	if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
		throw new Error('Invalid physics model ' + path + ': expected an array-like object.');
	}
	const length = (value as { readonly length?: unknown }).length;
	if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) {
		throw new Error(
			'Invalid physics model ' + path + '.length: expected a non-negative safe integer.',
		);
	}
	return length;
}

function validateModelView(model: WhalePhysicsModelView): void {
	if (!model || typeof model !== 'object') {
		throw new Error('Invalid physics model: expected a model view object.');
	}
	if (!Array.isArray(model.parameterIds)) {
		throw new Error('Invalid physics model parameterIds: expected an array.');
	}
	const parameterCount = model.parameterIds.length;
	const valuesLength = readArrayLikeLength(model.values, 'values');
	const minimumLength = readArrayLikeLength(model.minimumValues, 'minimumValues');
	const maximumLength = readArrayLikeLength(model.maximumValues, 'maximumValues');
	const defaultLength = readArrayLikeLength(model.defaultValues, 'defaultValues');
	if (
		valuesLength !== parameterCount ||
		minimumLength !== parameterCount ||
		maximumLength !== parameterCount ||
		defaultLength !== parameterCount
	) {
		throw new Error('Invalid physics model: parameter arrays must have equal lengths.');
	}
	const seenIds = new Set<string>();
	for (let index = 0; index < parameterCount; index += 1) {
		const id = model.parameterIds[index];
		if (typeof id !== 'string' || id.trim().length === 0) {
			throw new Error(
				'Invalid physics model parameterIds[' + index + ']: expected a non-empty string.',
			);
		}
		if (seenIds.has(id)) {
			throw new Error(
				'Invalid physics model parameterIds[' + index + ']: duplicate ID "' + id + '".',
			);
		}
		seenIds.add(id);
		const value = model.values[index];
		const minimum = model.minimumValues[index];
		const maximum = model.maximumValues[index];
		const defaultValue = model.defaultValues[index];
		if (
			!Number.isFinite(value) ||
			!Number.isFinite(minimum) ||
			!Number.isFinite(maximum) ||
			!Number.isFinite(defaultValue)
		) {
			throw new Error(
				'Invalid physics model parameter ' + id + ': values and ranges must be finite.',
			);
		}
		if (minimum > maximum) {
			throw new Error('Invalid physics model parameter ' + id + ': minimum exceeds maximum.');
		}
		if (defaultValue < minimum || defaultValue > maximum) {
			throw new Error(
				'Invalid physics model parameter ' + id + ': default is outside its range.',
			);
		}
	}
}

function cloneParticle(particle: WhalePhysicsParticle): ParticleState {
	return {
		mobility: particle.mobility,
		delay: particle.delay,
		acceleration: particle.acceleration,
		radius: particle.radius,
		position: mutableVector(0, 0),
		lastPosition: mutableVector(0, 0),
		lastGravity: mutableVector(0, 1),
		force: mutableVector(0, 0),
		velocity: mutableVector(0, 0),
	};
}

function makeRuntimeSetting(
	setting: WhalePhysicsSetting,
	parameterIndices: ReadonlyMap<string, number>,
): RuntimeSetting {
	const inputs = setting.inputs.map((input) => {
		const sourceIndex = parameterIndices.get(input.sourceId);
		if (sourceIndex === undefined) {
			throw new Error(
				'Physics parameter ID "' + input.sourceId + '" is missing from the model.',
			);
		}
		return Object.freeze({ input, sourceIndex });
	});
	const outputs = setting.outputs.map((output) => {
		const destinationIndex = parameterIndices.get(output.destinationId);
		if (destinationIndex === undefined) {
			throw new Error(
				'Physics parameter ID "' + output.destinationId + '" is missing from the model.',
			);
		}
		return Object.freeze({ output, destinationIndex });
	});
	const particles = setting.vertices.map(cloneParticle);
	const currentOutputs = new Array<number>(outputs.length).fill(0);
	const previousOutputs = new Array<number>(outputs.length).fill(0);
	return {
		setting,
		inputs: Object.freeze(inputs),
		outputs: Object.freeze(outputs),
		particles,
		currentOutputs,
		previousOutputs,
	};
}

function initializeParticles(runtimeSettings: readonly RuntimeSetting[]): void {
	for (const runtimeSetting of runtimeSettings) {
		const particles = runtimeSetting.particles;
		const root = particles[0];
		root.position = mutableVector(0, 0);
		root.lastPosition = mutableVector(0, 0);
		root.lastGravity = mutableVector(0, 1);
		root.velocity = mutableVector(0, 0);
		root.force = mutableVector(0, 0);
		for (let index = 1; index < particles.length; index += 1) {
			const particle = particles[index];
			const previous = particles[index - 1];
			particle.position = mutableVector(previous.position.x, previous.position.y + particle.radius);
			particle.lastPosition = copyVector(particle.position);
			particle.lastGravity = mutableVector(0, 1);
			particle.velocity = mutableVector(0, 0);
			particle.force = mutableVector(0, 0);
		}
	}
}

/**
 * Bind an immutable rig to a raw Core-style parameter view.
 *
 * Missing source/destination IDs are rejected here instead of becoming array
 * index -1 as the full Framework lazy ID lookup can allow.
 */
export function createWhalePhysicsRuntime(
	rig: WhalePhysicsRig,
	model: WhalePhysicsModelView,
): WhalePhysicsRuntime {
	if (!rig || rig.version !== 3 || !Array.isArray(rig.settings)) {
		throw new Error('Invalid physics rig: expected parseWhalePhysics3() output.');
	}
	validateModelView(model);
	const parameterIndices = new Map<string, number>();
	for (let index = 0; index < model.parameterIds.length; index += 1) {
		parameterIndices.set(model.parameterIds[index], index);
	}
	const runtimeSettings = rig.settings.map((setting) =>
		makeRuntimeSetting(setting, parameterIndices),
	);
	const parameterCaches = new Float64Array(model.parameterIds.length);
	const parameterInputCaches = new Float64Array(model.parameterIds.length);
	let remainTime = 0;

	initializeParticles(runtimeSettings);

	function copyModelParametersToCaches(): void {
		for (let index = 0; index < model.parameterIds.length; index += 1) {
			const value = model.values[index];
			if (!Number.isFinite(value)) {
				throw new Error(
					'Physics model parameter ' + model.parameterIds[index] + ' is non-finite.',
				);
			}
			parameterCaches[index] = value;
			parameterInputCaches[index] = value;
		}
	}

	function applyInterpolatedOutputs(weight: number): void {
		for (const runtimeSetting of runtimeSettings) {
			for (let index = 0; index < runtimeSetting.outputs.length; index += 1) {
				const runtimeOutput = runtimeSetting.outputs[index];
				const destinationIndex = runtimeOutput.destinationIndex;
				applyOutput(
					model.values,
					destinationIndex,
					model.minimumValues[destinationIndex],
					model.maximumValues[destinationIndex],
					runtimeSetting.previousOutputs[index] * (1 - weight) +
						runtimeSetting.currentOutputs[index] * weight,
					runtimeOutput.output,
				);
			}
		}
	}

	function stabilize(): void {
		remainTime = 0;
		copyModelParametersToCaches();
		for (const runtimeSetting of runtimeSettings) {
			const input = loadInputs(runtimeSetting, model.values, model);
			rotateInputTranslation(input.translation, input.angle);
			stabilizeParticles(
				runtimeSetting,
				input.translation,
				input.angle,
				rig.wind,
				MOVEMENT_THRESHOLD * runtimeSetting.setting.normalizationPosition.maximum,
			);
			for (let index = 0; index < runtimeSetting.outputs.length; index += 1) {
				const runtimeOutput = runtimeSetting.outputs[index];
				const particleIndex = runtimeOutput.output.vertexIndex;
				const translation = subtractVectors(
					runtimeSetting.particles[particleIndex].position,
					runtimeSetting.particles[particleIndex - 1].position,
				);
				const rawValue = outputValue(
					runtimeOutput.output,
					translation,
					runtimeSetting.particles,
					rig.gravity,
				);
				runtimeSetting.currentOutputs[index] = rawValue;
				runtimeSetting.previousOutputs[index] = rawValue;
				const destinationIndex = runtimeOutput.destinationIndex;
				const blended = applyOutput(
					model.values,
					destinationIndex,
					model.minimumValues[destinationIndex],
					model.maximumValues[destinationIndex],
					rawValue,
					runtimeOutput.output,
				);
				parameterCaches[destinationIndex] = blended;
			}
		}
	}

	function evaluate(deltaSeconds: number): void {
		if (!Number.isFinite(deltaSeconds)) {
			throw new Error('Cannot evaluate physics3 with a non-finite delta time.');
		}
		if (deltaSeconds <= 0) {
			return;
		}
		remainTime += deltaSeconds;
		if (remainTime > MAX_DELTA_TIME) {
			remainTime = 0;
		}
		const physicsDeltaTime = rig.fps > 0 ? 1 / rig.fps : deltaSeconds;
		while (remainTime >= physicsDeltaTime) {
			for (const runtimeSetting of runtimeSettings) {
				for (let index = 0; index < runtimeSetting.outputs.length; index += 1) {
					runtimeSetting.previousOutputs[index] = runtimeSetting.currentOutputs[index];
				}
			}
			const inputWeight = physicsDeltaTime / remainTime;
			for (let index = 0; index < model.parameterIds.length; index += 1) {
				const value = model.values[index];
				if (!Number.isFinite(value)) {
					throw new Error(
						'Physics model parameter ' + model.parameterIds[index] + ' is non-finite.',
					);
				}
				parameterCaches[index] =
					parameterInputCaches[index] * (1 - inputWeight) + value * inputWeight;
				parameterInputCaches[index] = parameterCaches[index];
			}
			for (const runtimeSetting of runtimeSettings) {
				const input = loadInputs(runtimeSetting, parameterCaches, model);
				rotateInputTranslation(input.translation, input.angle);
				updateParticles(
					runtimeSetting,
					input.translation,
					input.angle,
					physicsDeltaTime,
					rig.wind,
					MOVEMENT_THRESHOLD * runtimeSetting.setting.normalizationPosition.maximum,
				);
				for (let index = 0; index < runtimeSetting.outputs.length; index += 1) {
					const runtimeOutput = runtimeSetting.outputs[index];
					const particleIndex = runtimeOutput.output.vertexIndex;
					const translation = subtractVectors(
						runtimeSetting.particles[particleIndex].position,
						runtimeSetting.particles[particleIndex - 1].position,
					);
					const rawValue = outputValue(
						runtimeOutput.output,
						translation,
						runtimeSetting.particles,
						rig.gravity,
					);
					runtimeSetting.currentOutputs[index] = rawValue;
					const destinationIndex = runtimeOutput.destinationIndex;
					applyOutput(
						parameterCaches,
						destinationIndex,
						model.minimumValues[destinationIndex],
						model.maximumValues[destinationIndex],
						rawValue,
						runtimeOutput.output,
					);
				}
			}
			remainTime -= physicsDeltaTime;
		}
		applyInterpolatedOutputs(remainTime / physicsDeltaTime);
	}

	function reset(): void {
		remainTime = 0;
		initializeParticles(runtimeSettings);
		for (const runtimeSetting of runtimeSettings) {
			runtimeSetting.currentOutputs.fill(0);
			runtimeSetting.previousOutputs.fill(0);
		}
		copyModelParametersToCaches();
	}

	reset();
	return Object.freeze({ stabilize, evaluate, reset });
}

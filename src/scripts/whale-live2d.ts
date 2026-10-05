import {
  parseWhaleMotion3,
  sampleWhaleMotion3,
  type WhaleMotionClip,
} from './whale-live2d-motion';
import {
  createWhalePhysicsRuntime,
  parseWhalePhysics3,
  type WhalePhysicsRig,
  type WhalePhysicsRuntime,
} from './whale-live2d-physics';
import {
  createWhaleSecondaryRig,
  type WhaleSecondaryPose,
  type WhaleSecondaryRig,
} from './whale-live2d-secondary';

/**
 * A small, dependency-free WebGL adapter for a Cubism Core model.
 *
 * The data flow here follows the official Cubism Core/Web Framework sources:
 * Core owns model evaluation and exposes drawable vertex/UV/index/opacity
 * arrays; a model-specific secondary rig adds gentle appendage motion to
 * separate upload buffers without changing Core's arrays. Core is loaded at
 * runtime because the official Core binary is distributed with the licensed
 * Cubism SDK and is not included in the Web Framework repository.
 *
 * References:
 * - https://docs.live2d.com/en/cubism-sdk-manual/cubism-core-api-reference/
 * - https://docs.live2d.com/en/cubism-sdk-manual/drawablevertexpositions/
 * - https://github.com/Live2D/CubismWebFramework
 * - https://raw.githubusercontent.com/Live2D/CubismWebFramework/develop/Shaders/WebGL/vertshadersrc.vert
 * - https://raw.githubusercontent.com/Live2D/CubismWebFramework/develop/src/rendering/cubismshader_webgl.ts
 * - https://github.com/Live2D/CubismWebSamples
 */

export type WhaleLive2DReaction = 'greet' | 'pet' | 'wave' | 'sleep' | 'wake';

export interface WhaleLive2DOptions {
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface WhaleLive2DHandle {
  setLook(x: number, y: number): void;
  react(kind: WhaleLive2DReaction): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}

type NumberArray = ArrayLike<number>;
type MutableNumberArray = {
  readonly length: number;
  [index: number]: number;
};

interface CoreParameters {
  count: number;
  ids: string[];
  values: MutableNumberArray;
  minimumValues?: NumberArray;
  maximumValues?: NumberArray;
  defaultValues?: NumberArray;
}

interface CoreDrawables {
  count: number;
  ids?: string[];
  indices: Uint16Array[];
  vertexPositions: Float32Array[];
  vertexUvs: Float32Array[];
  opacities: NumberArray;
  textureIndices: NumberArray;
  maskCounts?: NumberArray;
  masks?: Int32Array[];
  constantFlags?: NumberArray;
  dynamicFlags?: NumberArray;
  renderOrders?: NumberArray;
  blendModes?: NumberArray;
}

interface CoreModel {
  parameters: CoreParameters;
  drawables: CoreDrawables;
  offscreens?: {
    count: number;
    maskCounts?: NumberArray;
  };
  canvasinfo?: {
    CanvasWidth: number;
    CanvasHeight: number;
    PixelsPerUnit: number;
  };
  getRenderOrders?: () => NumberArray;
  update: () => void;
  release?: () => void;
  _release?: () => void;
}

interface CoreMoc {
  release?: () => void;
  _release?: () => void;
}

interface CoreUtils {
  hasBlendAdditiveBit?: (flags: number) => boolean;
  hasBlendMultiplicativeBit?: (flags: number) => boolean;
  hasIsDoubleSidedBit?: (flags: number) => boolean;
  hasIsVisibleBit?: (flags: number) => boolean;
}

interface CubismCoreNamespace {
  Moc: {
    fromArrayBuffer: (buffer: ArrayBuffer) => CoreMoc | null;
  };
  Model: {
    fromMoc: (moc: CoreMoc) => CoreModel | null;
  };
  Utils?: CoreUtils;
  [name: string]: unknown;
}

interface Model3FileReferences {
  Moc?: string;
  Textures?: string[];
  Motions?: Record<string, Array<{ File: string; FadeInTime?: number; FadeOutTime?: number }>>;
  Physics?: string;
}

interface Model3Json {
  FileReferences?: Model3FileReferences;
}

type MotionGroup = 'idle' | 'greet' | 'wave' | 'pet' | 'sleep' | 'wake';

interface LoadedMotion {
  clip: WhaleMotionClip;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

type LoadedMotions = Partial<Record<MotionGroup, LoadedMotion>>;

interface ActiveMotionAction {
  kind: WhaleLive2DReaction;
  motion: LoadedMotion;
  elapsed: number;
}

interface ImageSource {
  source: ImageBitmap | HTMLImageElement;
  premultiplied: boolean;
  close(): void;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ActiveReaction {
  kind: WhaleLive2DReaction;
  elapsed: number;
}

type GestureReaction = Exclude<WhaleLive2DReaction, 'sleep' | 'wake'>;

interface RendererResources {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  textures: WebGLTexture[];
}

const CORE_LOAD_TIMEOUT_MS = 15_000;
const MAX_DEVICE_PIXEL_RATIO = 2;
const FRAME_DELTA_LIMIT_SECONDS = 0.05;
const FIT_MARGIN = 0.86;
const BLINK_DURATION_SECONDS = 0.18;
const LOOK_SMOOTHING_RATE = 10;
const LOOK_HEAD_ANGLE_X = 6;
const LOOK_HEAD_ANGLE_Y = 4;

const PARAMETER_LIMITS: Readonly<Record<string, readonly [number, number]>> = {
  ParamAngleX: [-6, 6],
  ParamAngleY: [-4, 4],
  ParamAngleZ: [-8, 8],
  ParamBodyAngleZ: [-2.5, 2.5],
  ParamEyeBallX: [-1, 1],
  ParamEyeBallY: [-1, 1],
  ParamEyeLOpen: [0, 1],
  ParamEyeROpen: [0, 1],
  ParamEyeLSmile: [0, 1],
  ParamEyeRSmile: [0, 1],
  ParamMouthOpenY: [0, 1],
  ParamBreath: [0, 1],
  ParamHairFront: [-1, 1],
  ParamHairBack: [-1, 1],
  ParamTail: [-3, 3],
  ParamArmLA: [-4, 4],
};

const PHYSICS_HAIR_FRONT_LIMIT = [-0.45, 0.45] as const;

// Retire this supplemental web rig when a different native model is exported.
// A hash gate prevents it from doubling newly authored native keyforms.
const SECONDARY_MOC_SHA256 = 'c3c2da16f065ae8ac7cb46fa91ce883d6696eb837ad528fa54f8e8ff6a37d56e';

async function supportsSecondaryRig(buffer: ArrayBuffer): Promise<boolean> {
  if (buffer.byteLength !== 150144 || !globalThis.crypto?.subtle) return false;
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    return hash === SECONDARY_MOC_SHA256;
  } catch {
    return false;
  }
}

const MOTION_PARAMETER_IDS = [
  'ParamAngleX',
  'ParamAngleY',
  'ParamAngleZ',
  'ParamBodyAngleZ',
  'ParamEyeBallX',
  'ParamEyeBallY',
  'ParamEyeLOpen',
  'ParamEyeROpen',
  'ParamMouthOpenY',
  'ParamBreath',
  'ParamHairFront',
  'ParamHairBack',
  'ParamTail',
  'ParamArmLA',
] as const;

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform mat4 u_matrix;
varying vec2 v_texCoord;

void main() {
  gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
  v_texCoord.y = 1.0 - v_texCoord.y;
}
`;

/*
 * Textures are uploaded in premultiplied-alpha form. Explicitly
 * premultiplied ImageBitmap sources keep the unpack conversion off, while
 * the HTMLImageElement fallback enables UNPACK_PREMULTIPLY_ALPHA_WEBGL. The
 * shader therefore multiplies the premultiplied sample by drawable opacity
 * only; multiplying rgb by alpha a second time would make translucent art
 * darker.
 */
const FRAGMENT_SHADER_SOURCE = `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_opacity;
varying vec2 v_texCoord;

void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord) * u_opacity;
}
`;

const corePromises = new Map<string, Promise<CubismCoreNamespace>>();

function asError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === 'string' ? error : fallback);
}

function getGlobalCore(): CubismCoreNamespace | undefined {
  const globalObject = globalThis as typeof globalThis & {
    Live2DCubismCore?: CubismCoreNamespace;
  };
  return globalObject.Live2DCubismCore;
}

function waitForCore(): Promise<CubismCoreNamespace> {
  const start = performance.now();

  return new Promise((resolve, reject) => {
    const check = (): void => {
      const core = getGlobalCore();
      if (core) {
        resolve(core);
        return;
      }

      if (performance.now() - start >= CORE_LOAD_TIMEOUT_MS) {
        reject(new Error('Live2DCubismCore did not appear after loading the Core script.'));
        return;
      }

      window.setTimeout(check, 0);
    };

    check();
  });
}

function loadCoreScript(coreUrl: string): Promise<CubismCoreNamespace> {
  const existingCore = getGlobalCore();
  if (existingCore) {
    return Promise.resolve(existingCore);
  }

  const absoluteUrl = new URL(coreUrl, document.baseURI).href;
  const previous = corePromises.get(absoluteUrl);
  if (previous) {
    return previous;
  }

  const promise = new Promise<CubismCoreNamespace>((resolve, reject) => {
    const existingScript = Array.from(document.scripts).find((script) => script.src === absoluteUrl);
    const script = existingScript ?? document.createElement('script');
    let settled = false;

    const fail = (error: unknown): void => {
      if (!settled) {
        settled = true;
        reject(asError(error, `Unable to load Cubism Core from ${absoluteUrl}.`));
      }
    };

    const finish = (): void => {
      waitForCore().then(
        (core) => {
          if (!settled) {
            settled = true;
            resolve(core);
          }
        },
        fail,
      );
    };

    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => fail(new Error(`Unable to load Cubism Core from ${absoluteUrl}.`)), {
      once: true,
    });

    if (!existingScript) {
      script.async = false;
      script.dataset.whaleCubismCore = 'true';
      script.src = absoluteUrl;
      document.head.appendChild(script);
    } else if (getGlobalCore()) {
      finish();
    } else {
      // A script already in the document may have completed before listeners
      // were attached.  Polling also covers scripts inserted by the host app.
      finish();
    }
  });

  corePromises.set(absoluteUrl, promise);
  return promise;
}

async function fetchJson(url: string): Promise<Model3Json> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load model3.json (${response.status} ${response.statusText}): ${url}`);
  }
  return (await response.json()) as Model3Json;
}

async function fetchMotionJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load motion3.json (${response.status} ${response.statusText}): ${url}`);
  }
  return response.json();
}

async function fetchPhysicsJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load physics3.json (${response.status} ${response.statusText}): ${url}`);
  }
  return response.json();
}

const MOTION_GROUPS: readonly MotionGroup[] = ['idle', 'greet', 'wave', 'pet', 'sleep', 'wake'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function optionalMotionFade(value: unknown, path: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid model3.json ${path}: expected a finite number.`);
  }
  return value;
}

function motionReferenceGroups(
  references: Model3FileReferences,
  modelAbsoluteUrl: string,
): Map<MotionGroup, { url: string; fadeInSeconds?: number; fadeOutSeconds?: number }> | undefined {
  const rawReferences = references as unknown as Record<string, unknown>;
  if (!hasOwn(rawReferences, 'Motions')) {
    return undefined;
  }

  const rawMotions = rawReferences.Motions;
  if (!isRecord(rawMotions)) {
    throw new Error('Invalid model3.json FileReferences.Motions: expected an object.');
  }

  const result = new Map<MotionGroup, { url: string; fadeInSeconds?: number; fadeOutSeconds?: number }>();
  for (const [rawGroup, rawEntries] of Object.entries(rawMotions)) {
    if (!Array.isArray(rawEntries)) {
      throw new Error(`Invalid model3.json FileReferences.Motions.${rawGroup}: expected an array.`);
    }
    if (rawEntries.length === 0) {
      continue;
    }

    const first = rawEntries[0];
    if (!isRecord(first) || typeof first.File !== 'string' || first.File.trim().length === 0) {
      throw new Error(`Invalid model3.json FileReferences.Motions.${rawGroup}[0].File: expected a non-empty string.`);
    }
    const fadeInSeconds = optionalMotionFade(first.FadeInTime, `FileReferences.Motions.${rawGroup}[0].FadeInTime`);
    const fadeOutSeconds = optionalMotionFade(
      first.FadeOutTime,
      `FileReferences.Motions.${rawGroup}[0].FadeOutTime`,
    );
    const normalizedGroup = rawGroup.toLowerCase() as MotionGroup;
    if (!MOTION_GROUPS.includes(normalizedGroup)) {
      continue;
    }
    if (result.has(normalizedGroup)) {
      throw new Error(`Invalid model3.json FileReferences.Motions: duplicate group ${rawGroup}.`);
    }
    result.set(normalizedGroup, {
      url: new URL(first.File, modelAbsoluteUrl).href,
      fadeInSeconds,
      fadeOutSeconds,
    });
  }
  return result;
}

async function loadMotionClips(
  references: Model3FileReferences,
  modelAbsoluteUrl: string,
): Promise<LoadedMotions | null> {
  const groups = motionReferenceGroups(references, modelAbsoluteUrl);
  if (!groups) {
    return null;
  }

  const loaded = await Promise.all(
    Array.from(groups.entries()).map(async ([group, reference]) => {
      const parsed = parseWhaleMotion3(await fetchMotionJson(reference.url));
      return [
        group,
        {
          clip: parsed,
          fadeInSeconds: reference.fadeInSeconds !== undefined && reference.fadeInSeconds >= 0
            ? reference.fadeInSeconds
            : parsed.fadeInSeconds,
          fadeOutSeconds: reference.fadeOutSeconds !== undefined && reference.fadeOutSeconds >= 0
            ? reference.fadeOutSeconds
            : parsed.fadeOutSeconds,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(loaded) as LoadedMotions;
}

async function loadPhysicsRig(
  references: Model3FileReferences,
  modelAbsoluteUrl: string,
): Promise<WhalePhysicsRig | null> {
  const rawReferences = references as unknown as Record<string, unknown>;
  if (!hasOwn(rawReferences, 'Physics')) {
    return null;
  }
  const file = rawReferences.Physics;
  if (typeof file !== 'string' || file.trim().length === 0) {
    throw new Error('Invalid model3.json FileReferences.Physics: expected a non-empty string.');
  }
  const physicsUrl = new URL(file, modelAbsoluteUrl).href;
  return parseWhalePhysics3(await fetchPhysicsJson(physicsUrl));
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load moc3 (${response.status} ${response.statusText}): ${url}`);
  }
  return response.arrayBuffer();
}

async function loadImageSource(url: string): Promise<ImageSource> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load model texture (${response.status} ${response.statusText}): ${url}`);
  }

  const blob = await response.blob();
  if (typeof createImageBitmap === 'function') {
    try {
      // Make PMA explicit on the source. Some browsers ignore the WebGL
      // unpack hint for ImageBitmap instances created with default options.
      const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'premultiply' });
      return {
        source: bitmap,
        premultiplied: true,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to an HTMLImageElement path when bitmap options or
      // decoding are unavailable in the current browser.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Unable to decode model texture: ${url}`));
      element.src = objectUrl;
    });
    return {
      source: image,
      premultiplied: false,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function loadImageSources(urls: string[]): Promise<ImageSource[]> {
  const results = await Promise.allSettled(urls.map((url) => loadImageSource(url)));
  const loaded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const failure = results.find((result) => result.status === 'rejected');
  if (failure) {
    for (const source of loaded) {
      source.close();
    }
    throw failure.reason;
  }
  return loaded;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to allocate a WebGL shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'unknown shader compilation error';
    gl.deleteShader(shader);
    throw new Error(`Cubism WebGL shader compilation failed: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  let fragmentShader: WebGLShader;
  try {
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  } catch (error) {
    gl.deleteShader(vertexShader);
    throw error;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error('Unable to allocate a WebGL program.');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'unknown program link error';
    gl.deleteProgram(program);
    throw new Error(`Cubism WebGL program linking failed: ${info}`);
  }
  return program;
}

function getCoreNumber(core: CubismCoreNamespace, name: string): number | undefined {
  const value = core[name];
  return typeof value === 'number' ? value : undefined;
}

function hasAdditiveBlendFlag(core: CubismCoreNamespace, flags: number): boolean {
  const helper = core.Utils?.hasBlendAdditiveBit;
  return helper ? helper(flags) : (flags & 1) !== 0;
}

function hasMultiplicativeBlendFlag(core: CubismCoreNamespace, flags: number): boolean {
  const helper = core.Utils?.hasBlendMultiplicativeBit;
  return helper ? helper(flags) : (flags & 2) !== 0;
}

function hasDoubleSidedFlag(core: CubismCoreNamespace, flags: number): boolean {
  const helper = core.Utils?.hasIsDoubleSidedBit;
  return helper ? helper(flags) : (flags & 4) !== 0;
}

function getBlendMode(core: CubismCoreNamespace, drawables: CoreDrawables, index: number): 'normal' | 'additive' | 'multiplicative' {
  if (drawables.blendModes && drawables.blendModes.length >= drawables.count) {
    const packed = drawables.blendModes[index] ?? 0;
    const colorBlend = packed & 0xff;
    const alphaBlend = (packed >>> 8) & 0xff;
    const normalColor = getCoreNumber(core, 'ColorBlendType_Normal') ?? 0;
    const additiveColor = getCoreNumber(core, 'ColorBlendType_AddCompatible');
    const multiplicativeColor = getCoreNumber(core, 'ColorBlendType_MultiplyCompatible');
    const alphaOver = getCoreNumber(core, 'AlphaBlendType_Over') ?? 1;
    const alphaNone = getCoreNumber(core, 'AlphaBlendType_None');
    const alphaCompatible =
      alphaBlend === alphaOver ||
      alphaBlend === 0 ||
      alphaBlend === 255 ||
      (alphaNone !== undefined && alphaNone >= 0 && alphaBlend === alphaNone);

    if (colorBlend === normalColor && alphaCompatible) {
      return 'normal';
    }
    if (additiveColor !== undefined && colorBlend === additiveColor && alphaCompatible) {
      return 'additive';
    }
    if (
      multiplicativeColor !== undefined &&
      colorBlend === multiplicativeColor &&
      alphaCompatible
    ) {
      return 'multiplicative';
    }

    throw new Error(`Unsupported Cubism drawable blend mode at drawable ${index} (color ${colorBlend}, alpha ${alphaBlend}).`);
  }

  const flags = drawables.constantFlags?.[index] ?? 0;
  if (hasAdditiveBlendFlag(core, flags)) {
    return 'additive';
  }
  if (hasMultiplicativeBlendFlag(core, flags)) {
    return 'multiplicative';
  }
  return 'normal';
}

function assertSupportedDrawables(core: CubismCoreNamespace, drawables: CoreDrawables, textureCount: number): void {
  for (let index = 0; index < drawables.count; index += 1) {
    const maskCount = drawables.maskCounts?.[index] ?? 0;
    if (maskCount > 0) {
      throw new Error(
        `Cubism clipping masks are not supported by this renderer (drawable ${index} has ${maskCount} mask(s)).`,
      );
    }

    const positions = drawables.vertexPositions[index];
    const uvs = drawables.vertexUvs[index];
    const indices = drawables.indices[index];
    if (!positions || !uvs || !indices || positions.length !== uvs.length || positions.length % 2 !== 0) {
      throw new Error(`Invalid Cubism drawable vertex data at drawable ${index}.`);
    }

    const textureIndex = drawables.textureIndices[index];
    if (!Number.isInteger(textureIndex) || textureIndex < 0 || textureIndex >= textureCount) {
      throw new Error(`Cubism drawable ${index} references missing texture ${textureIndex}.`);
    }

    // Resolve and validate every mode before the first frame, so an advanced
    // blend mode cannot silently render with normal alpha blending.
    getBlendMode(core, drawables, index);
  }
}

function assertSupportedOffscreens(model: CoreModel): void {
  const offscreens = model.offscreens;
  if (!offscreens || offscreens.count <= 0) {
    return;
  }
  const masked = Array.from({ length: offscreens.count }, (_, index) => offscreens.maskCounts?.[index] ?? 0).some(
    (count) => count > 0,
  );
  throw new Error(
    masked
      ? 'Cubism offscreen clipping masks are not supported by this renderer.'
      : 'Cubism offscreen drawables are not supported by this renderer.',
  );
}

function computeBounds(drawables: CoreDrawables): Bounds {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (const positions of drawables.vertexPositions) {
    for (let index = 0; index + 1 < positions.length; index += 2) {
      const x = positions[index];
      const y = positions[index + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }

  if (
    !Number.isFinite(bounds.minX) ||
    !Number.isFinite(bounds.minY) ||
    !Number.isFinite(bounds.maxX) ||
    !Number.isFinite(bounds.maxY) ||
    bounds.maxX <= bounds.minX ||
    bounds.maxY <= bounds.minY
  ) {
    throw new Error('Cubism model has no finite drawable bounds.');
  }
  return bounds;
}

function getRenderOrder(model: CoreModel): number[] {
  const orders = model.getRenderOrders?.() ?? model.drawables.renderOrders;
  const indices = Array.from({ length: model.drawables.count }, (_, index) => index);
  if (!orders) {
    return indices;
  }
  return indices.sort((left, right) => {
    const orderDifference = (orders[left] ?? left) - (orders[right] ?? right);
    return orderDifference === 0 ? left - right : orderDifference;
  });
}

function makeFitMatrix(bounds: Bounds, width: number, height: number): Float32Array {
  const viewportAspect = Math.max(width, 1) / Math.max(height, 1);
  const modelWidth = bounds.maxX - bounds.minX;
  const modelHeight = bounds.maxY - bounds.minY;
  const scaleY = Math.min((2 * FIT_MARGIN) / modelHeight, (2 * FIT_MARGIN * viewportAspect) / modelWidth);
  const scaleX = scaleY / viewportAspect;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Cubism Core vertex positions use an upward Y axis. Keep that orientation
  // in clip space so the model is not vertically inverted.
  return new Float32Array([
    scaleX,
    0,
    0,
    0,
    0,
    scaleY,
    0,
    0,
    0,
    0,
    1,
    0,
    -scaleX * centerX,
    -scaleY * centerY,
    0,
    1,
  ]);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function releaseCoreObject(resource: CoreMoc | CoreModel | null): void {
  if (!resource) {
    return;
  }
  if (typeof resource.release === 'function') {
    resource.release();
  } else if (typeof resource._release === 'function') {
    resource._release();
  }
}

/**
 * Mount a real Cubism model into an existing canvas.
 *
 * The returned controls are deliberately model-parameter controls.  Missing
 * parameters are ignored so one model can omit optional rig features without
 * making the player pretend that those features are bound.
 */
export async function mountWhaleLive2D(
  canvas: HTMLCanvasElement,
  modelUrl: string,
  coreUrl: string,
  options: WhaleLive2DOptions = {},
): Promise<WhaleLive2DHandle> {
  let coreModel: CoreModel | null = null;
  let coreMoc: CoreMoc | null = null;
  let imageSources: ImageSource[] = [];
  let renderer: RendererResources | null = null;
  let gl: WebGLRenderingContext | null = null;
  let animationFrame = 0;
  let destroyed = false;
  let contextLost = false;
  let manualPaused = false;
  let visibilityPaused = document.visibilityState === 'hidden';
  let lastTimestamp: number | null = null;
  let elapsedSeconds = 0;
  let fitBounds: Bounds | null = null;
  let fitMatrix: Float32Array = new Float32Array([
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ]);
  let activeReaction: ActiveReaction | null = null;
  let pendingReaction: GestureReaction | null = null;
  let sleeping = false;
  let lookX = 0;
  let lookY = 0;
  let lookTargetX = 0;
  let lookTargetY = 0;
  let blinkWait = 2.5 + Math.random() * 3.5;
  let blinkElapsed = 0;
  let blinkRemaining = 0;
  let physicsRig: WhalePhysicsRig | null = null;
  let physicsRuntime: WhalePhysicsRuntime | null = null;
  let physicsStable = false;
  let secondaryRig: WhaleSecondaryRig | null = null;
  const secondaryPose: { -readonly [Key in keyof WhaleSecondaryPose]: WhaleSecondaryPose[Key] } = {
    seconds: 0,
    idleSeconds: 0,
    sleeping: false,
    lookX: 0,
    headX: 0,
    headY: 0,
    headZ: 0,
    bodyZ: 0,
    tail: 0,
    breath: 0,
    reaction: null,
    reactionProgress: 0,
  };
  let reportedError = false;
  let renderPassCount = 0;
  let renderSampleCount = 0;
  let renderSampleStartedAt: number | null = null;

  const reportError = (error: unknown): Error => {
    const normalized = asError(error, 'Whale Live2D playback failed.');
    if (!reportedError) {
      reportedError = true;
      try {
        options.onError?.(normalized);
      } catch {
        // A consumer callback must not replace the playback error.
      }
    }
    return normalized;
  };

  const updatePausedTelemetry = (): void => {
    canvas.dataset.live2dPaused = String(manualPaused || visibilityPaused);
  };

  const resetRenderSampling = (): void => {
    renderSampleCount = 0;
    renderSampleStartedAt = null;
    canvas.dataset.live2dLastCount = '0';
    canvas.dataset.live2dLastTime = '0';
    canvas.dataset.live2dLastFps = '0';
  };

  // Cadence telemetry measures successful WebGL submissions from RAF renders;
  // it does not claim a display or compositor FPS.
  const recordRenderPass = (drawCallCount: number, sampleCadence: boolean): void => {
    if (drawCallCount < 1) {
      return;
    }

    renderPassCount += 1;
    canvas.dataset.live2dRenderCount = String(renderPassCount);
    if (!sampleCadence) {
      return;
    }

    const now = performance.now();
    if (renderSampleStartedAt === null) {
      renderSampleStartedAt = now;
      return;
    }
    renderSampleCount += 1;
    const elapsedMilliseconds = now - renderSampleStartedAt;
    if (elapsedMilliseconds < 1000) {
      return;
    }

    canvas.dataset.live2dLastCount = String(renderSampleCount);
    canvas.dataset.live2dLastTime = elapsedMilliseconds.toFixed(1);
    canvas.dataset.live2dLastFps = (renderSampleCount / (elapsedMilliseconds / 1000)).toFixed(2);
    // Read-only DOM diagnostics, sampled once a second alongside cadence.
    // No diagnostic labels are displayed in the blog interface.
    if (coreModel) {
      const pose: Record<string, number> = {};
      for (const id of ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamBodyAngleZ', 'ParamEyeBallX', 'ParamEyeBallY', 'ParamBreath', 'ParamHairFront', 'ParamHairBack', 'ParamTail', 'ParamArmLA']) {
        const index = coreModel.parameters.ids.indexOf(id);
        if (index >= 0) pose[id] = Number(coreModel.parameters.values[index].toFixed(4));
      }
      canvas.dataset.live2dPose = JSON.stringify(pose);
      canvas.dataset.live2dMotionTime = secondaryPose.seconds.toFixed(2);
      canvas.dataset.live2dIdleSecond = String(Math.floor(secondaryPose.idleSeconds));
      canvas.dataset.live2dReaction = secondaryPose.reaction ?? 'idle';
      canvas.dataset.live2dReactionProgress = secondaryPose.reactionProgress.toFixed(3);
      canvas.dataset.live2dSecondaryShift = (secondaryRig?.maxDisplacement ?? 0).toFixed(5);
    }
    renderSampleCount = 0;
    renderSampleStartedAt = now;
  };

  const removeListeners: Array<() => void> = [];
  const cleanup = (): void => {
    for (const remove of removeListeners.splice(0)) {
      remove();
    }
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    if (renderer && gl) {
      for (const texture of renderer.textures) {
        gl.deleteTexture(texture);
      }
      gl.deleteBuffer(renderer.positionBuffer);
      gl.deleteBuffer(renderer.uvBuffer);
      gl.deleteBuffer(renderer.indexBuffer);
      gl.deleteProgram(renderer.program);
    }
    renderer = null;
    for (const source of imageSources.splice(0)) {
      source.close();
    }
    releaseCoreObject(coreModel);
    releaseCoreObject(coreMoc);
    coreModel = null;
    coreMoc = null;
    physicsRuntime = null;
    physicsRig = null;
    physicsStable = false;
    secondaryRig = null;
    if (canvas instanceof HTMLCanvasElement) {
      delete canvas.dataset.live2dSecondaryParts;
      delete canvas.dataset.live2dPose;
      delete canvas.dataset.live2dMotionTime;
      delete canvas.dataset.live2dIdleSecond;
      delete canvas.dataset.live2dReaction;
      delete canvas.dataset.live2dReactionProgress;
      delete canvas.dataset.live2dSecondaryShift;
    }
  };

  try {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('mountWhaleLive2D requires an HTMLCanvasElement.');
    }
    canvas.dataset.live2dPaused = String(manualPaused || visibilityPaused);
    canvas.dataset.live2dRenderCount = '0';
    canvas.dataset.live2dLastCount = '0';
    canvas.dataset.live2dLastTime = '0';
    canvas.dataset.live2dLastFps = '0';

    const [core, modelJson] = await Promise.all([loadCoreScript(coreUrl), fetchJson(new URL(modelUrl, document.baseURI).href)]);
    const references = modelJson.FileReferences;
    if (!references || typeof references.Moc !== 'string' || !Array.isArray(references.Textures)) {
      throw new Error('model3.json is missing FileReferences.Moc or FileReferences.Textures.');
    }

    const modelAbsoluteUrl = new URL(modelUrl, document.baseURI).href;
    const mocUrl = new URL(references.Moc, modelAbsoluteUrl).href;
    const textureUrls = references.Textures.map((texture) => new URL(texture, modelAbsoluteUrl).href);
    const resourceResults = await Promise.allSettled([
      fetchArrayBuffer(mocUrl),
      loadImageSources(textureUrls),
      loadMotionClips(references, modelAbsoluteUrl),
      loadPhysicsRig(references, modelAbsoluteUrl),
    ] as const);
    const mocResult = resourceResults[0];
    const imageResult = resourceResults[1];
    const motionResult = resourceResults[2];
    const physicsResult = resourceResults[3];
    if (imageResult.status === 'fulfilled') {
      imageSources = imageResult.value;
    }
    if (
      mocResult.status === 'rejected' ||
      imageResult.status === 'rejected' ||
      motionResult.status === 'rejected' ||
      physicsResult.status === 'rejected'
    ) {
      // Promise.allSettled lets a successful image batch be closed when any
      // parallel model or motion resource fails.
      for (const source of imageSources.splice(0)) {
        source.close();
      }
      if (mocResult.status === 'rejected') {
        throw mocResult.reason;
      }
      if (imageResult.status === 'rejected') {
        throw imageResult.reason;
      }
      if (motionResult.status === 'rejected') {
        throw motionResult.reason;
      }
      if (physicsResult.status === 'rejected') throw physicsResult.reason;
      throw new Error('Live2D resource loading did not settle consistently.');
    }
    const mocBuffer = mocResult.value;
    const motionClips = motionResult.value;
    physicsRig = physicsResult.value;

    coreMoc = core.Moc.fromArrayBuffer(mocBuffer);
    if (!coreMoc) {
      throw new Error(`Cubism Core rejected the moc3 data: ${mocUrl}`);
    }
    coreModel = core.Model.fromMoc(coreMoc);
    if (!coreModel) {
      throw new Error('Cubism Core could not create a model from the moc3 data.');
    }

    assertSupportedDrawables(core, coreModel.drawables, imageSources.length);
    assertSupportedOffscreens(coreModel);
    const defaults = coreModel.parameters.defaultValues;
    if (defaults) {
      for (let index = 0; index < coreModel.parameters.count; index += 1) {
        const value = defaults[index];
        if (Number.isFinite(value)) {
          coreModel.parameters.values[index] = value;
        }
      }
    }
    if (physicsRig) {
      const parameters = coreModel.parameters;
      if (
        !Array.isArray(parameters.ids) ||
        !parameters.values ||
        !parameters.minimumValues ||
        !parameters.maximumValues ||
        !parameters.defaultValues
      ) {
        throw new Error('Physics requires Core parameter IDs and finite value, minimum, maximum, and default arrays.');
      }
      const parameterCount = parameters.ids.length;
      if (
        parameters.count !== parameterCount ||
        parameters.values.length !== parameterCount ||
        parameters.minimumValues.length !== parameterCount ||
        parameters.maximumValues.length !== parameterCount ||
        parameters.defaultValues.length !== parameterCount
      ) {
        throw new Error('Physics requires Core parameter arrays with matching lengths.');
      }
      for (let index = 0; index < parameterCount; index += 1) {
        const id = parameters.ids[index];
        if (typeof id !== 'string' || id.trim().length === 0) {
          throw new Error(`Physics requires a non-empty Core parameter ID at index ${index}.`);
        }
        if (
          !Number.isFinite(parameters.values[index]) ||
          !Number.isFinite(parameters.minimumValues[index]) ||
          !Number.isFinite(parameters.maximumValues[index]) ||
          !Number.isFinite(parameters.defaultValues[index])
        ) {
          throw new Error(`Physics requires finite Core parameter arrays for ${id}.`);
        }
      }
      physicsRuntime = createWhalePhysicsRuntime(physicsRig, {
        parameterIds: parameters.ids,
        values: parameters.values,
        minimumValues: parameters.minimumValues,
        maximumValues: parameters.maximumValues,
        defaultValues: parameters.defaultValues,
      });
    }
    coreModel.update();
    if (coreModel.drawables.ids && await supportsSecondaryRig(mocBuffer)) {
      secondaryRig = createWhaleSecondaryRig(coreModel.drawables.ids, coreModel.drawables.vertexPositions);
    }
    canvas.dataset.live2dSecondaryParts = secondaryRig?.summary().join(',') ?? '';
    fitBounds = computeBounds(coreModel.drawables);

    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      throw new Error('WebGL is unavailable for the Live2D canvas.');
    }

    const program = createProgram(gl);
    const positionBuffer = gl.createBuffer();
    const uvBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!positionBuffer || !uvBuffer || !indexBuffer) {
      if (positionBuffer) {
        gl.deleteBuffer(positionBuffer);
      }
      if (uvBuffer) {
        gl.deleteBuffer(uvBuffer);
      }
      if (indexBuffer) {
        gl.deleteBuffer(indexBuffer);
      }
      gl.deleteProgram(program);
      throw new Error('Unable to allocate Cubism WebGL geometry buffers.');
    }

    const textures: WebGLTexture[] = [];
    try {
      for (const image of imageSources) {
        const texture = gl.createTexture();
        if (!texture) {
          throw new Error('Unable to allocate a Cubism WebGL texture.');
        }
        textures.push(texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        // ImageBitmap was explicitly premultiplied above. HTMLImageElement
        // needs the WebGL unpack conversion to reach the same PMA texture.
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, image.premultiplied ? 0 : 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image.source);
      }
    } catch (error) {
      for (const texture of textures) {
        gl.deleteTexture(texture);
      }
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
      throw error;
    }

    renderer = {
      program,
      positionBuffer,
      uvBuffer,
      indexBuffer,
      textures,
    };
    for (const source of imageSources.splice(0)) {
      source.close();
    }

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const uvLocation = gl.getAttribLocation(program, 'a_texCoord');
    const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    const textureLocation = gl.getUniformLocation(program, 'u_texture');
    const opacityLocation = gl.getUniformLocation(program, 'u_opacity');
    if (positionLocation < 0 || uvLocation < 0 || !matrixLocation || !textureLocation || !opacityLocation) {
      throw new Error('Cubism WebGL shader locations are incomplete.');
    }

    const parameterIndex = new Map<string, number>();
    for (let index = 0; index < coreModel.parameters.ids.length; index += 1) {
      const id = coreModel.parameters.ids[index];
      if (typeof id === 'string') {
        parameterIndex.set(id, index);
      }
    }

    const clampParameter = (id: string, value: number, limitOverride?: readonly [number, number]): number => {
      const index = parameterIndex.get(id);
      if (index === undefined) {
        return value;
      }
      const parameters = coreModel!.parameters;
      const minimum = parameters.minimumValues?.[index] ?? Number.NEGATIVE_INFINITY;
      const maximum = parameters.maximumValues?.[index] ?? Number.POSITIVE_INFINITY;
      const [hardMinimum, hardMaximum] =
        limitOverride ?? PARAMETER_LIMITS[id] ?? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
      return clamp(value, Math.max(minimum, hardMinimum), Math.min(maximum, hardMaximum));
    };

    const setParameter = (id: string, value: number, limitOverride?: readonly [number, number]): void => {
      const index = parameterIndex.get(id);
      if (index === undefined) {
        return;
      }
      coreModel!.parameters.values[index] = clampParameter(id, value, limitOverride);
    };

    const parameterDefaults = new Map<string, number>();
    for (const [id, index] of parameterIndex) {
      const defaultValue = coreModel.parameters.defaultValues?.[index];
      const currentValue = coreModel.parameters.values[index];
      parameterDefaults.set(id, typeof defaultValue === 'number' && Number.isFinite(defaultValue) ? defaultValue : Number.isFinite(currentValue) ? currentValue : 0);
    }

    const physicsOutputIds = new Set(physicsRig?.outputs.map((output) => output.destinationId) ?? []);
    const physicsDrivesHairFront = physicsOutputIds.has('ParamHairFront');
    const motionRuntime = Boolean(motionClips && (motionClips.idle || motionClips.sleep));
    const motionManagedIds = new Set<string>(MOTION_PARAMETER_IDS);
    if (motionClips) {
      for (const motion of Object.values(motionClips)) {
        for (const curve of motion?.clip.curves ?? []) {
          if (parameterIndex.has(curve.id) && !['ParamArmRA', 'ParamHairSide', 'ParamBodyAngleX'].includes(curve.id)) {
            motionManagedIds.add(curve.id);
          }
        }
      }
    }
    const motionBaseValues = new Map<string, number>();
    const motionBaseSample = new Map<string, number>();
    const motionActionSample = new Map<string, number>();
    const motionOutput = new Map<string, number>();
    const lastMotionOutput = new Map<string, number>();
    let motionBaseKind: MotionGroup | null = null;
    let motionBaseElapsed = 0;
    let activeMotionAction: ActiveMotionAction | null = null;
    let motionTransitionFrom: Map<string, number> | null = null;
    let motionTransitionElapsed = 0;
    let motionTransitionDuration = 0;

    const resetMotionValues = (values: Map<string, number>): void => {
      values.clear();
      for (const id of motionManagedIds) {
        values.set(id, parameterDefaults.get(id) ?? 0);
      }
    };

    const motionFadeInProgress = (elapsed: number, duration: number): number => {
      if (duration <= 0) {
        return 1;
      }
      return Math.sin(Math.PI * clamp(elapsed / duration, 0, 1) * 0.5);
    };

    const motionFadeOutProgress = (elapsed: number, duration: number, clipDuration: number): number => {
      if (duration <= 0) {
        return elapsed < clipDuration ? 1 : 0;
      }
      if (elapsed <= clipDuration - duration) {
        return 1;
      }
      return Math.sin(Math.PI * clamp((clipDuration - elapsed) / duration, 0, 1) * 0.5);
    };

    const effectiveMotionFade = (value: number | undefined, overall: number): number =>
      value === undefined || value < 0 ? overall : value;

    const motionFadeDurations = (motion: LoadedMotion): { fadeIn: number; fadeOut: number } => {
      let fadeIn = motion.fadeInSeconds;
      let fadeOut = motion.fadeOutSeconds;
      for (const curve of motion.clip.curves) {
        fadeIn = Math.max(fadeIn, effectiveMotionFade(curve.fadeInSeconds, motion.fadeInSeconds));
        fadeOut = Math.max(fadeOut, effectiveMotionFade(curve.fadeOutSeconds, motion.fadeOutSeconds));
      }
      return { fadeIn, fadeOut };
    };

    const beginMotionTransition = (duration: number): void => {
      if (lastMotionOutput.size === 0) {
        motionTransitionFrom = null;
        motionTransitionElapsed = 0;
        motionTransitionDuration = 0;
        return;
      }
      motionTransitionFrom = new Map(lastMotionOutput);
      motionTransitionElapsed = 0;
      motionTransitionDuration = Math.max(0, duration);
    };

    const advancePhysics = (delta: number): void => {
      if (!physicsRig || !physicsRuntime || !coreModel) {
        return;
      }
      if (!physicsStable) {
        physicsRuntime.stabilize();
        physicsStable = true;
      } else if (delta > 0) {
        physicsRuntime.evaluate(delta);
      }
      for (const id of physicsOutputIds) {
        const index = parameterIndex.get(id);
        if (index === undefined) {
          throw new Error(`Physics output parameter ID "${id}" is missing from the Core model.`);
        }
        const value = coreModel.parameters.values[index];
        if (!Number.isFinite(value)) {
          throw new Error(`Physics output parameter ${id} became non-finite.`);
        }
        // A very small ambient input keeps the fringe alive while the pointer
        // is still. Start at zero, preserve the physics result, and never
        // feed an accumulated output into the next Core frame.
        const fringe = id === 'ParamHairFront'
          ? Math.sin(elapsedSeconds * Math.PI * 2 / 7.1) * 0.18 * (sleeping ? 0.15 : 1)
          : 0;
        setParameter(id, value + fringe, id === 'ParamHairFront' ? PHYSICS_HAIR_FRONT_LIMIT : undefined);
      }
    };

    const resizeCanvas = (): void => {
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width || canvas.clientWidth || canvas.width || 1;
      const cssHeight = rect.height || canvas.clientHeight || canvas.height || 1;
      const pixelRatio = Math.min(MAX_DEVICE_PIXEL_RATIO, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(cssWidth * pixelRatio));
      const height = Math.max(1, Math.round(cssHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl!.viewport(0, 0, width, height);
      if (fitBounds) {
        fitMatrix = makeFitMatrix(fitBounds, width, height);
      }
    };

    const updateBlink = (delta: number): number => {
      if (sleeping) {
        blinkRemaining = 0;
        blinkElapsed = 0;
        return 0.04;
      }
      blinkElapsed += delta;
      if (blinkRemaining <= 0 && blinkElapsed >= blinkWait) {
        blinkRemaining = BLINK_DURATION_SECONDS;
        blinkElapsed = 0;
        blinkWait = 2.5 + Math.random() * 3.5;
      }
      if (blinkRemaining <= 0) {
        return 1;
      }
      blinkRemaining = Math.max(0, blinkRemaining - delta);
      const progress = 1 - blinkRemaining / BLINK_DURATION_SECONDS;
      return 1 - Math.sin(Math.PI * progress);
    };

    const updateReaction = (delta: number): {
      angleX: number;
      angleY: number;
      angleZ: number;
      bodyX: number;
      bodyZ: number;
      armL: number;
      armR: number;
      mouthOpen: number;
      breath: number;
    } => {
      const result = {
        angleX: 0,
        angleY: 0,
        angleZ: 0,
        bodyX: 0,
        bodyZ: 0,
        armL: 0,
        armR: 0,
        mouthOpen: 0,
        breath: 1,
      };
      if (!activeReaction && pendingReaction) {
        activeReaction = { kind: pendingReaction, elapsed: 0 };
        pendingReaction = null;
      }
      if (!activeReaction) {
        return result;
      }

      const duration = activeReaction.kind === 'sleep' ? 1.4 : activeReaction.kind === 'wake' ? 0.9 : 0.65;
      activeReaction.elapsed += delta;
      const progress = clamp(activeReaction.elapsed / duration, 0, 1);
      const envelope = Math.sin(Math.PI * progress);
      switch (activeReaction.kind) {
        case 'greet':
          result.angleX = envelope * 5;
          result.bodyX = envelope * 2;
          result.mouthOpen = envelope * 0.25;
          break;
        case 'pet':
          result.angleY = envelope * 3;
          result.bodyX = envelope * -2;
          result.mouthOpen = envelope * 0.18;
          break;
        case 'wave':
          result.angleZ = envelope * 8;
          result.bodyZ = envelope * 3;
          result.armL = envelope * 4;
          result.armR = envelope * -4;
          break;
        case 'sleep':
          result.breath = 1 - 0.75 * progress;
          result.bodyZ = Math.sin(elapsedSeconds * 0.7) * 0.6;
          break;
        case 'wake':
          result.breath = 0.35 + 0.65 * progress;
          result.bodyX = envelope * 2;
          break;
      }

      if (progress >= 1 && activeReaction.kind !== 'sleep') {
        activeReaction = null;
      }
      return result;
    };

    const updateLegacyParameters = (delta: number): void => {
      const reaction = updateReaction(delta);
      const lookBlend = 1 - Math.exp(-LOOK_SMOOTHING_RATE * delta);
      lookX += (lookTargetX - lookX) * lookBlend;
      lookY += (lookTargetY - lookY) * lookBlend;
      const breath = (0.5 + Math.sin(elapsedSeconds * 2.4) * 0.5) * reaction.breath;
      const eyeOpen = updateBlink(delta);
      const idleMotionScale = sleeping ? 0.2 : 1;
      setParameter('ParamAngleX', lookX * LOOK_HEAD_ANGLE_X + reaction.angleX);
      setParameter('ParamAngleY', lookY * LOOK_HEAD_ANGLE_Y + reaction.angleY);
      setParameter('ParamAngleZ', Math.sin(elapsedSeconds * 0.55) * 2 * idleMotionScale + reaction.angleZ);
      setParameter('ParamEyeBallX', lookX);
      setParameter('ParamEyeBallY', lookY);
      setParameter('ParamEyeLOpen', eyeOpen);
      setParameter('ParamEyeROpen', clamp(eyeOpen - (blinkRemaining > 0 ? 0.02 : 0), 0, 1));
      setParameter('ParamMouthOpenY', reaction.mouthOpen);
      setParameter('ParamBreath', breath);
      setParameter('ParamBodyAngleX', Math.sin(elapsedSeconds * 0.45) * 1.5 * idleMotionScale + reaction.bodyX);
      setParameter('ParamBodyAngleZ', Math.sin(elapsedSeconds * 0.35 + 1.1) * 1.25 * idleMotionScale + reaction.bodyZ);
      setParameter('ParamArmLA', reaction.armL);
      setParameter('ParamArmRA', reaction.armR);
      setParameter(
        'ParamHairFront',
        physicsDrivesHairFront
          ? parameterDefaults.get('ParamHairFront') ?? 0
          : Math.sin(elapsedSeconds * 1.4) * 1.4 * idleMotionScale,
      );
      setParameter('ParamHairSide', Math.sin(elapsedSeconds * 1.15 + 0.8) * 1.2 * idleMotionScale);
      setParameter('ParamHairBack', Math.sin(elapsedSeconds * 0.95 + 1.6) * 1.1 * idleMotionScale);
      setParameter('ParamTail', Math.sin(elapsedSeconds * 0.8 + 2) * 1.8 * idleMotionScale);
      advancePhysics(delta);
      coreModel!.update();
    };

    const selectMotionBase = (): { kind: MotionGroup; motion: LoadedMotion } | null => {
      if (!motionClips) {
        return null;
      }
      if (sleeping && motionClips.sleep) {
        return { kind: 'sleep', motion: motionClips.sleep };
      }
      if (motionClips.idle) {
        return { kind: 'idle', motion: motionClips.idle };
      }
      if (motionClips.sleep) {
        return { kind: 'sleep', motion: motionClips.sleep };
      }
      return null;
    };

    const updateMotionParameters = (delta: number): void => {
      if (!motionRuntime || !motionClips) {
        return;
      }
      const selectedBase = selectMotionBase();
      if (!selectedBase) {
        return;
      }
      if (motionBaseKind !== selectedBase.kind) {
        if (motionBaseKind !== null) {
          beginMotionTransition(motionFadeDurations(selectedBase.motion).fadeIn);
        }
        motionBaseKind = selectedBase.kind;
        motionBaseElapsed = 0;
      }

      motionBaseElapsed += delta;
      resetMotionValues(motionBaseValues);
      sampleWhaleMotion3(selectedBase.motion.clip, motionBaseElapsed, motionBaseSample);
      for (const [id, value] of motionBaseSample) {
        if (motionManagedIds.has(id)) {
          motionBaseValues.set(id, value);
        }
      }
      if (!motionBaseSample.has('ParamHairFront')) {
        motionBaseValues.set(
          'ParamHairFront',
          physicsDrivesHairFront ? parameterDefaults.get('ParamHairFront') ?? 0 : Math.sin(elapsedSeconds * 1.2) * 0.2,
        );
      }

      resetMotionValues(motionOutput);
      for (const [id, value] of motionBaseValues) {
        motionOutput.set(id, value);
      }

      if (!activeMotionAction && pendingReaction) {
        const queuedKind = pendingReaction;
        pendingReaction = null;
        const queuedMotion = motionClips[queuedKind];
        if (queuedMotion) {
          activeMotionAction = { kind: queuedKind, motion: queuedMotion, elapsed: 0 };
          beginMotionTransition(motionFadeDurations(queuedMotion).fadeIn);
        }
      }
      const action = activeMotionAction;
      let actionFinished = false;
      if (action) {
        action.elapsed += delta;
        sampleWhaleMotion3(action.motion.clip, action.elapsed, motionActionSample);
        for (const [id, value] of motionActionSample) {
          if (!motionManagedIds.has(id)) {
            continue;
          }
          const curve = action.motion.clip.curves.find((candidate) => candidate.id === id);
          if (!curve) {
            continue;
          }
          const curveFadeIn = effectiveMotionFade(curve.fadeInSeconds, action.motion.fadeInSeconds);
          const curveFadeOut = effectiveMotionFade(curve.fadeOutSeconds, action.motion.fadeOutSeconds);
          const fadeIn = motionFadeInProgress(action.elapsed, curveFadeIn);
          const fadeOut = action.motion.clip.loop
            ? 1
            : motionFadeOutProgress(action.elapsed, curveFadeOut, action.motion.clip.duration);
          const baseValue = motionBaseValues.get(id) ?? parameterDefaults.get(id) ?? 0;
          motionOutput.set(id, baseValue + (value - baseValue) * (fadeIn * fadeOut));
        }
        actionFinished = !action.motion.clip.loop && action.elapsed >= action.motion.clip.duration;
      }

      let transitionProgress = 1;
      if (motionTransitionFrom) {
        motionTransitionElapsed += delta;
        transitionProgress = motionFadeInProgress(motionTransitionElapsed, motionTransitionDuration);
      }
      for (const id of motionManagedIds) {
        const target = motionOutput.get(id) ?? parameterDefaults.get(id) ?? 0;
        const from = motionTransitionFrom?.get(id) ?? target;
        motionOutput.set(id, clampParameter(id, from + (target - from) * transitionProgress));
      }
      if (motionTransitionFrom && transitionProgress >= 1) {
        motionTransitionFrom = null;
        motionTransitionElapsed = 0;
        motionTransitionDuration = 0;
      }

      const lookBlend = 1 - Math.exp(-LOOK_SMOOTHING_RATE * delta);
      lookX += (lookTargetX - lookX) * lookBlend;
      lookY += (lookTargetY - lookY) * lookBlend;
      const eyeBlink = updateBlink(delta);
      const eyeMotionL = motionOutput.get('ParamEyeLOpen') ?? parameterDefaults.get('ParamEyeLOpen') ?? 1;
      const eyeMotionR = motionOutput.get('ParamEyeROpen') ?? parameterDefaults.get('ParamEyeROpen') ?? 1;
      const eyeMaximum = sleeping ? 0.04 : 1;

      for (const id of motionManagedIds) {
        const value = clampParameter(id, motionOutput.get(id) ?? parameterDefaults.get(id) ?? 0);
        motionOutput.set(id, value);
        setParameter(id, value);
      }
      setParameter('ParamAngleX', (motionOutput.get('ParamAngleX') ?? 0) + lookX * LOOK_HEAD_ANGLE_X);
      setParameter('ParamAngleY', (motionOutput.get('ParamAngleY') ?? 0) + lookY * LOOK_HEAD_ANGLE_Y);
      // Idle glances are part of the acting; nearby mouse tracking blends over
      // them instead of erasing the animated eye direction every frame.
      setParameter('ParamEyeBallX', (motionOutput.get('ParamEyeBallX') ?? 0) + lookX * (sleeping ? 0.2 : 0.75));
      setParameter('ParamEyeBallY', (motionOutput.get('ParamEyeBallY') ?? 0) + lookY * (sleeping ? 0.2 : 0.75));
      setParameter('ParamEyeLOpen', Math.min(eyeMotionL, eyeBlink, eyeMaximum));
      setParameter('ParamEyeROpen', Math.min(eyeMotionR, eyeBlink, eyeMaximum));

      lastMotionOutput.clear();
      for (const id of motionManagedIds) {
        const index = parameterIndex.get(id);
        const value = motionOutput.get(id);
        if (index !== undefined && value !== undefined && Number.isFinite(value)) {
          lastMotionOutput.set(id, clampParameter(id, value));
        }
      }
      advancePhysics(delta);
      coreModel!.update();
      if (actionFinished && activeMotionAction === action) {
        activeMotionAction = null;
      }
    };

    const updateParameters = (delta: number): void => {
      if (motionRuntime) {
        updateMotionParameters(delta);
      } else {
        updateLegacyParameters(delta);
      }
    };

    const render = (sampleCadence = false): void => {
      if (!renderer || !gl || !coreModel) {
        return;
      }

      let drawCallCount = 0;
      if (secondaryRig) {
        secondaryPose.seconds = elapsedSeconds;
        secondaryPose.idleSeconds = motionBaseKind === 'idle' && motionClips?.idle
          ? motionBaseElapsed % motionClips.idle.clip.duration : 0;
        secondaryPose.sleeping = sleeping;
        secondaryPose.lookX = lookX;
        secondaryPose.headX = coreModel.parameters.values[parameterIndex.get('ParamAngleX') ?? -1] ?? 0;
        secondaryPose.headY = coreModel.parameters.values[parameterIndex.get('ParamAngleY') ?? -1] ?? 0;
        secondaryPose.headZ = coreModel.parameters.values[parameterIndex.get('ParamAngleZ') ?? -1] ?? 0;
        secondaryPose.bodyZ = coreModel.parameters.values[parameterIndex.get('ParamBodyAngleZ') ?? -1] ?? 0;
        secondaryPose.tail = coreModel.parameters.values[parameterIndex.get('ParamTail') ?? -1] ?? 0;
        secondaryPose.breath = coreModel.parameters.values[parameterIndex.get('ParamBreath') ?? -1] ?? 0;
        secondaryPose.reaction = activeMotionAction?.kind ?? activeReaction?.kind ?? null;
        secondaryPose.reactionProgress = activeMotionAction
          ? clamp(activeMotionAction.elapsed / activeMotionAction.motion.clip.duration, 0, 1)
          : activeReaction ? clamp(activeReaction.elapsed / 0.9, 0, 1) : 0;
        secondaryRig.update(secondaryPose, coreModel.drawables.vertexPositions);
      }

      gl.useProgram(renderer.program);
      gl.uniformMatrix4fv(matrixLocation, false, fitMatrix);
      gl.uniform1i(textureLocation, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.STENCIL_TEST);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.frontFace(gl.CCW);

      for (const drawableIndex of getRenderOrder(coreModel)) {
        const dynamicFlags = coreModel.drawables.dynamicFlags?.[drawableIndex] ?? 0;
        const visibleHelper = core.Utils?.hasIsVisibleBit;
        if (
          coreModel.drawables.dynamicFlags &&
          (visibleHelper ? !visibleHelper(dynamicFlags) : (dynamicFlags & 1) === 0)
        ) {
          continue;
        }
        const opacity = coreModel.drawables.opacities[drawableIndex] ?? 0;
        if (!(opacity > 0)) {
          continue;
        }
        const corePositions = coreModel.drawables.vertexPositions[drawableIndex];
        const positions = corePositions && secondaryRig
          ? secondaryRig.positions(drawableIndex, corePositions)
          : corePositions;
        const uvs = coreModel.drawables.vertexUvs[drawableIndex];
        const indices = coreModel.drawables.indices[drawableIndex];
        const textureIndex = coreModel.drawables.textureIndices[drawableIndex];
        if (!positions || !uvs || !indices || textureIndex < 0 || textureIndex >= renderer.textures.length) {
          continue;
        }

        const constantFlags = coreModel.drawables.constantFlags?.[drawableIndex] ?? 0;
        const doubleSided = coreModel.drawables.constantFlags
          ? hasDoubleSidedFlag(core, constantFlags)
          : true;
        if (doubleSided) {
          gl.disable(gl.CULL_FACE);
        } else {
          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.BACK);
        }

        switch (getBlendMode(core, coreModel.drawables, drawableIndex)) {
          case 'additive':
            gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
            break;
          case 'multiplicative':
            gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
            break;
          default:
            gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            break;
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderer.textures[textureIndex]);
        gl.uniform1f(opacityLocation, clamp(opacity, 0, 1));

        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(uvLocation);
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        drawCallCount += 1;
      }

      recordRenderPass(drawCallCount, sampleCadence);
    };

    const redrawCurrentPose = (): void => {
      try {
        resizeCanvas();
        render();
      } catch (error) {
        destroyed = true;
        cleanup();
        reportError(error);
      }
    };

    let frame: (timestamp: number) => void;
    const scheduleFrame = (): void => {
      if (!destroyed && !contextLost && !manualPaused && !visibilityPaused && !animationFrame) {
        animationFrame = requestAnimationFrame(frame);
      }
    };

    frame = (timestamp: number): void => {
      animationFrame = 0;
      if (destroyed || contextLost || manualPaused || visibilityPaused) {
        lastTimestamp = null;
        return;
      }
      const delta = lastTimestamp === null ? 0 : clamp((timestamp - lastTimestamp) / 1000, 0, FRAME_DELTA_LIMIT_SECONDS);
      lastTimestamp = timestamp;
      elapsedSeconds += delta;
      try {
        updateParameters(delta);
        resizeCanvas();
        render(true);
      } catch (error) {
        destroyed = true;
        cleanup();
        reportError(error);
        return;
      }
      scheduleFrame();
    };

    const onVisibilityChange = (): void => {
      visibilityPaused = document.visibilityState === 'hidden';
      lastTimestamp = null;
      resetRenderSampling();
      updatePausedTelemetry();
      if (!visibilityPaused) {
        scheduleFrame();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    removeListeners.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));

    const onResize = (): void => {
      if (manualPaused || visibilityPaused) {
        redrawCurrentPose();
        return;
      }
      resizeCanvas();
    };
    window.addEventListener('resize', onResize);
    removeListeners.push(() => window.removeEventListener('resize', onResize));

    const onContextLost = (event: Event): void => {
      event.preventDefault();
      if (!contextLost && !destroyed) {
        contextLost = true;
        destroyed = true;
        lastTimestamp = null;
        cleanup();
        reportError(new Error('WebGL context lost; the Live2D player has been paused.'));
      }
    };
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    removeListeners.push(() => canvas.removeEventListener('webglcontextlost', onContextLost, false));

    updateParameters(0);
    resizeCanvas();
    render();
    scheduleFrame();

    const handle: WhaleLive2DHandle = {
      setLook(x: number, y: number): void {
        if (destroyed) {
          return;
        }
        lookTargetX = clamp(Number.isFinite(x) ? x : 0, -1, 1);
        lookTargetY = clamp(Number.isFinite(y) ? y : 0, -1, 1);
      },
      react(kind: WhaleLive2DReaction): void {
        if (destroyed) {
          return;
        }
        if (kind === 'sleep' || kind === 'wake') {
          pendingReaction = null;
        }
        if (kind === 'sleep') {
          sleeping = true;
        } else if (kind === 'wake') {
          sleeping = false;
        }
        if (motionRuntime && motionClips) {
          if (kind !== 'sleep' && kind !== 'wake' && activeMotionAction) {
            pendingReaction = kind;
            scheduleFrame();
            return;
          }
          pendingReaction = null;
          activeMotionAction = null;
          const motion = kind === 'sleep' ? undefined : motionClips[kind];
          if (motion) {
            activeMotionAction = { kind, motion, elapsed: 0 };
            beginMotionTransition(motionFadeDurations(motion).fadeIn);
          } else {
            const base = selectMotionBase();
            beginMotionTransition(base ? motionFadeDurations(base.motion).fadeIn : 0);
          }
          scheduleFrame();
          return;
        }
        if (kind !== 'sleep' && kind !== 'wake' && activeReaction) {
          pendingReaction = kind;
          scheduleFrame();
          return;
        }
        pendingReaction = null;
        activeReaction = { kind, elapsed: 0 };
        scheduleFrame();
      },
      setPaused(paused: boolean): void {
        if (destroyed) {
          return;
        }
        if (paused) {
          pendingReaction = null;
        }
        manualPaused = paused;
        lastTimestamp = null;
        resetRenderSampling();
        updatePausedTelemetry();
        if (paused && animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
        if (paused) {
          redrawCurrentPose();
        } else {
          scheduleFrame();
        }
      },
      destroy(): void {
        if (destroyed) {
          return;
        }
        destroyed = true;
        cleanup();
      },
    };

    try {
      options.onReady?.();
    } catch (error) {
      reportError(error);
    }
    return handle;
  } catch (error) {
    cleanup();
    throw reportError(error);
  }
}

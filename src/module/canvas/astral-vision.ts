/**
 * Astral perception and projection on the canvas.
 *
 * - The map is tinted (desaturated violet) for a user whose controlled token
 *   perceives the astral plane (astral perception, or an astral form). It is
 *   a client-side colour filter on the canvas, so it works whether or not
 *   token vision is enabled.
 * - For such viewers tokens lose their details and show only what anyone
 *   sees at a glance on the astral plane: a faint, softly undulating aura
 *   for a living being that is only physical, a blazing shape for an astral
 *   form (a being active on the astral plane), a still black-and-white
 *   picture for what is not alive. Awakened and ordinary beings look the same, and Essence
 *   does not show: both take an astral observation test (a world setting
 *   can show the loss of Essence as a house rule).
 *   Nothing shows through anything solid: astral sight is blocked by any
 *   wall that blocks movement OR sight, so a window blocks it too.
 * - Astral projection: the body token stays, an astral form token is created
 *   next to it; the form is hidden from mundane viewers, moves through walls
 *   and its own sight is blocked by anything solid (windows included).
 * - Astral beings (spirits, elementals) switch between materialised and
 *   astral form: in astral form their own token behaves like a projection's
 *   astral form (no body left behind).
 * - Dual-natured beings (and materialised astral beings) perceive the astral
 *   plane permanently.
 *
 * Which states an actor can enter comes from its active feats (awakened,
 * power or trait): astral perception, astral projection, dual nature, astral being.
 *
 * Visibility is computed client-side from the viewer's controlled tokens;
 * astral form tokens are created/deleted by the active GM's client.
 */

declare const foundry: any;
declare const canvas: any;
declare const CONFIG: any;
declare const game: any;
declare const Hooks: any;
declare const PIXI: any;
declare const document: any;
declare const HTMLVideoElement: any;
declare const ui: any;

const FLAG_SCOPE = 'sra2';
/** On an astral form token: { bodyTokenId } */
const FLAG_ASTRAL_FORM = 'astralForm';
/** On a body token: id of its astral form token */
const FLAG_ASTRAL_FORM_TOKEN = 'astralFormTokenId';
/** Delete option: the astral form is removed by the state sync, not by a user */
const OPTION_ASTRAL_SYNC = 'sra2AstralSync';

/**
 * Aura colours (RGB). Nothing tells an awakened being from an ordinary one
 * at a glance (that takes an astral observation test): the only visible
 * difference is between a plain aura and an astral form, i.e. a being that
 * is active on the astral plane.
 */
const AURA_COLOR = [0.45, 0.7, 0.95];
const ASTRAL_FORM_COLOR = [0.9, 0.55, 1.0];
/** World setting (house rule): auras show the loss of Essence */
const SETTING_AURA_ESSENCE = 'astralAuraEssence';
/** Speed of the aura animation (undulation, breathing, decay): 1 = slowest, dreamier */
const AURA_ANIMATION_SPEED = 2.5;
/** Essence of an intact aura: below it the aura darkens, down to black at 0 */
const AURA_FULL_ESSENCE = 6;

/** Canvas tint: share of grey mixed in, and colour multiplier (R, G, B) */
const TINT_DESATURATION = 0.35;
const TINT_COLOR = [0.92, 0.78, 1.15];

/** Astral form tokens: base opacity, and pulse (opacity multiplier range, period in ms) */
const ASTRAL_FORM_ALPHA = 0.8;
const PULSE_MIN = 0.5;
const PULSE_PERIOD_MS = 2000;

let canvasTintFilter: any = null;

/** Is this actor projecting (its body stays behind, an astral form token moves)? */
export function isAstrallyProjected(actor: any): boolean {
  return actor?.system?.astralState === 'projection';
}

/** Is this token (placeable or document) the astral form of a projecting character? */
export function isProjectionFormToken(token: any): boolean {
  const doc = token?.document ?? token;
  return !!doc?.getFlag?.(FLAG_SCOPE, FLAG_ASTRAL_FORM);
}

/**
 * Is this token (placeable or document) on the astral plane only? The astral
 * form of a projecting character, or an astral being that is not materialised.
 */
export function isAstralFormToken(token: any): boolean {
  return isProjectionFormToken(token) || token?.actor?.system?.astralState === 'astral';
}

/**
 * Does this token look at the astral plane? An astral form, a character in
 * astral perception, or a dual-natured being in the flesh — not the vacant
 * body of a projecting character.
 */
export function perceivesAstral(token: any): boolean {
  if (isAstralFormToken(token)) return true;
  const actor = token?.actor;
  const state = actor?.system?.astralState ?? 'physical';
  if (state === 'perception') return true;
  if (state !== 'physical') return false;
  const abilities = getAstralAbilities(actor);
  return abilities.dual || abilities.astralBeing;
}

/** Feat types that can carry astral abilities */
const ASTRAL_FEAT_TYPES = ['awakened', 'power', 'trait'];

export interface AstralAbilities {
  /** Can switch astral perception on */
  perception: boolean;
  /** Can leave its body (includes perception) */
  projection: boolean;
  /** Present on both planes at once: always perceives the astral */
  dual: boolean;
  /** Spirit, elemental: materialised or in astral form */
  astralBeing: boolean;
}

/** Astral abilities granted by the actor's active awakened, power and trait feats */
export function getAstralAbilities(actor: any): AstralAbilities {
  const feats = (actor?.items ?? []).filter((i: any) =>
    i.type === 'feat' && ASTRAL_FEAT_TYPES.includes(i.system?.featType) && i.system?.active !== false
  );
  const has = (key: string) => feats.some((i: any) => i.system?.[key] === true);
  const projection = has('astralProjection');
  return {
    perception: projection || has('astralPerception'),
    projection,
    dual: has('dualNature'),
    astralBeing: has('astralBeing'),
  };
}

/**
 * Astral states this actor can be in. "physical" is always there: it is the
 * materialised state of an astral being and the dual state of a dual-natured
 * one (who needs no separate perception state).
 */
export function getAstralStates(actor: any): string[] {
  const abilities = getAstralAbilities(actor);
  if (abilities.astralBeing) return ['physical', 'astral'];
  const states = ['physical'];
  if (abilities.perception && !abilities.dual) states.push('perception');
  if (abilities.projection) states.push('projection');
  return states;
}

/** Can this actor be in the given astral state? */
export function canEnterAstralState(actor: any, state: string): boolean {
  return getAstralStates(actor).includes(state);
}

/** House rule setting: do auras show the loss of Essence? (By the rules that takes a test.) */
function aurasShowEssence(): boolean {
  try {
    return game.settings?.get(FLAG_SCOPE, SETTING_AURA_ESSENCE) === true;
  } catch (err) {
    return false;
  }
}

export type AuraLook = 'lifeless' | 'aura' | 'astral';

/**
 * How a token looks on the astral plane, the same for every viewer: what
 * anyone sees at a glance, without an astral observation test.
 * - lifeless: not a living being (vehicle, drone, ICE…), no aura: shown in
 *   black and white.
 * - aura: a living being that is only physical. Awakened or ordinary, it
 *   looks the same.
 * - astral: a being active on the astral plane (astral perception, astral
 *   form of a projection, dual nature, spirit), a much stronger shape.
 * Vitality is 1 unless the house rule setting shows the loss of Essence:
 * then it goes from 1 (Essence intact) down to 0 (no Essence left).
 */
export function getTokenAura(token: any): { look: AuraLook; vitality: number } {
  const actor = token?.actor;
  if (!actor || actor.type !== 'character') return { look: 'lifeless', vitality: 1 };
  let vitality = 1;
  if (aurasShowEssence()) {
    const essence = Number(actor.system?.currentEssence ?? actor.system?.maxEssence ?? AURA_FULL_ESSENCE);
    vitality = Math.min(1, Math.max(0, (Number.isFinite(essence) ? essence : AURA_FULL_ESSENCE) / AURA_FULL_ESSENCE));
  }
  return { look: perceivesAstral(token) ? 'astral' : 'aura', vitality };
}

/**
 * Is there anything solid between two points? Astral sight is blocked by any
 * wall restricting movement or sight (windows included).
 */
export function isAstralSightBlocked(origin: any, destination: any): boolean {
  const backends = CONFIG.Canvas.polygonBackends;
  const level = canvas.level;
  for (const type of ['move', 'sight']) {
    const backend = backends[type];
    if (backend?.testCollision(origin, destination, { type, mode: 'any', level })) return true;
  }
  return false;
}

/** Tokens through which the current user looks at the astral plane */
function astralViewers(): any[] {
  const tokens: any[] = canvas.tokens?.placeables ?? [];
  let viewers = tokens.filter(t => t.controlled);
  // Players with nothing controlled see through the tokens they own
  if (viewers.length === 0 && !game.user?.isGM) viewers = tokens.filter(t => t.isOwner && t.document?.sight?.enabled);
  return viewers.filter(t => perceivesAstral(t));
}

/**
 * Fragment shader of the astral look of a token: the texture's details are
 * replaced by a shape in the aura colour, with a halo around it, swaying and
 * breathing slowly like something seen in a dream. What is not alive keeps
 * its drawing, still and in black and white, without halo. As vitality drops the colour goes to
 * black, the breathing slows down and dark blotches eat the shape.
 *
 * The vertex shader is PIXI's default filter one with an explicit mediump
 * precision: both shaders declare inputSize, and the program does not link
 * if its precision differs between them.
 */
const ASTRAL_AURA_VERTEX = `
precision mediump float;
attribute vec2 aVertexPosition;
uniform mat3 projectionMatrix;
uniform vec4 inputSize;
uniform vec4 outputFrame;
varying vec2 vTextureCoord;

void main(void) {
  vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.0)) + outputFrame.xy;
  gl_Position = vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
  vTextureCoord = aVertexPosition * (outputFrame.zw * inputSize.zw);
}`;

const ASTRAL_AURA_FRAGMENT = `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputSize;
uniform vec4 inputClamp;
uniform vec3 auraColor;
uniform float vitality;
uniform float time;
uniform float zoom;
uniform float presence;
uniform float alive;

const float PI = 3.14159265359;
const float DIST = 6.0;
const float ANGLES = 10.0;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float inside(vec2 uv) {
  return step(3.5, step(inputClamp.x, uv.x) + step(inputClamp.y, uv.y) + step(uv.x, inputClamp.z) + step(uv.y, inputClamp.w));
}
float shapeAlpha(vec2 uv) {
  return texture2D(uSampler, uv).a * inside(uv);
}

void main(void) {
  vec2 px = inputSize.zw * zoom;
  vec2 np = vTextureCoord * inputSize.xy / (zoom * 11.0);

  // A dream world: the whole shape sways, wide, slow and slightly chaotic
  vec2 sway = vec2(
    noise(np * 0.32 + vec2(time * 0.11, time * 0.07)) + 0.5 * noise(np * 0.7 - vec2(time * 0.05, time * 0.13)),
    noise(np * 0.32 + vec2(31.7 - time * 0.09, 12.3 + time * 0.1)) + 0.5 * noise(np * 0.7 + vec2(7.1 + time * 0.12, -time * 0.06))
  ) / 1.5 - 0.5;
  vec2 uv = vTextureCoord + sway * px * mix(5.0, 9.0, presence) * alive;
  vec4 src = texture2D(uSampler, uv) * inside(uv);

  // How much of the shape lies around this pixel (1 deep inside, 0 far away)
  float near = 0.0;
  for (float i = 0.0; i < ANGLES; i++) {
    float angle = i * 2.0 * PI / ANGLES;
    vec2 dir = vec2(cos(angle), sin(angle)) * px * mix(1.3, 2.3, presence);
    for (float d = 1.0; d <= DIST; d++) {
      near += (DIST - d + 1.0) * smoothstep(0.5, 1.0, shapeAlpha(uv + dir * d));
    }
  }
  near /= ANGLES * DIST * (DIST + 1.0) / 2.0;

  // Slow breathing, slower and fainter as life drains away
  float beat = 0.5 + 0.5 * sin(time * mix(0.55, 1.1, vitality));
  float pulse = mix(1.0, mix(mix(0.6, 0.86, vitality), 1.0, beat), alive);

  // The shape: aura colour with wide, soft waves of light and a brighter
  // rim; only a faint trace of the original drawing is left
  vec3 rgb = src.a > 0.0 ? src.rgb / src.a : vec3(0.0);
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
  float shade = mix(0.9, 1.03, smoothstep(0.05, 0.85, lum));
  float flow = mix(1.0, 0.88 + 0.24 * noise(np * 0.45 + vec2(time * 0.08, -time * 0.06)), alive);
  float rim = 1.0 + 0.9 * (1.0 - smoothstep(0.55, 1.0, near));
  vec3 life = auraColor * mix(0.04, 1.0, pow(vitality, 1.3));
  // A plain aura is faint; an astral form blazes
  vec3 body = life * shade * flow * rim * pulse * mix(0.55, 1.3, presence);
  // What is not alive has no aura: its own picture, still, in black and white
  body = mix(vec3(lum), body, alive);

  // Decay: dark blotches creeping over the shape
  // (the noise mostly lies in 0.2..0.85: spread the blotches evenly over the Essence range)
  float n = 0.6 * noise(np + vec2(0.0, time * 0.12)) + 0.4 * noise(np * 2.3 - vec2(time * 0.09, 0.0));
  float edge = mix(0.2, 0.85, vitality);
  float decay = smoothstep(edge - 0.08, edge + 0.12, n) * (1.0 - smoothstep(0.9, 1.0, vitality));
  body = mix(body, vec3(0.0), decay * 0.92);

  // Halo outside the shape, its width drifting too (a dark smoke when there is no life left)
  float drift = 0.75 + 0.5 * noise(np * 0.4 + vec2(-time * 0.07, time * 0.09));
  float halo = near * (1.0 - smoothstep(0.35, 1.0, src.a)) * mix(1.1, 3.4, presence) * pulse * drift * alive;
  halo = min(1.0 - src.a, halo);

  gl_FragColor = vec4(body * src.a, src.a) + vec4(life * halo, halo);
}`;

/**
 * Cut the figure out of a "disc" token image: a figure drawn on a white disc
 * inside a frame ring, like the system's generic tokens. Without it the
 * astral shape of such a token would be a plain disc.
 *
 * Returns the new alpha channel (one byte per pixel), or null when the image
 * is not such a token (already cut out, other background…).
 */
export function computeDiscCutout(rgba: ArrayLike<number>, width: number, height: number): Uint8ClampedArray | null {
  const cx = width / 2, cy = height / 2, radius = Math.min(width, height) / 2;
  if (radius < 16) return null;
  const alphaAt = (x: number, y: number) => rgba[4 * (y * width + x) + 3]!;
  const isWhite = (i: number) => {
    const r = rgba[4 * i]!, g = rgba[4 * i + 1]!, b = rgba[4 * i + 2]!;
    const min = Math.min(r, g, b);
    return rgba[4 * i + 3]! > 200 && min >= 225 && Math.max(r, g, b) - min <= 24;
  };

  // 1. A full disc: transparent corners, opaque rim
  for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
    if (alphaAt(x!, y!) > 32) return null;
  }
  const ANGLES = 64;
  const pixelAt = (angle: number, r: number) => {
    const x = Math.min(width - 1, Math.max(0, Math.round(cx + Math.cos(angle) * r - 0.5)));
    const y = Math.min(height - 1, Math.max(0, Math.round(cy + Math.sin(angle) * r - 0.5)));
    return y * width + x;
  };
  let opaqueRim = 0;
  for (let k = 0; k < ANGLES; k++) if (rgba[4 * pixelAt((k * 2 * Math.PI) / ANGLES, radius * 0.93) + 3]! > 200) opaqueRim++;
  if (opaqueRim < ANGLES * 0.9) return null;

  // 2. Inner edge of the frame: walking inwards, where the white background
  // starts (a run of white, not a highlight of the frame itself)
  const edges: number[] = [];
  for (let k = 0; k < ANGLES; k++) {
    const angle = (k * 2 * Math.PI) / ANGLES;
    for (let r = radius * 0.99; r >= radius * 0.6; r -= 1) {
      if ([0, 1, 2, 3, 4].every(step => isWhite(pixelAt(angle, r - step)))) { edges.push(r); break; }
    }
  }
  if (edges.length < ANGLES * 0.6) return null; // not a white background
  edges.sort((a, b) => a - b);
  // The frame is not evenly thick: take its deepest reach (low percentile),
  // without following the angles where the figure itself touches the frame
  const median = edges[Math.floor(edges.length / 2)]!;
  const inner = Math.max(edges[Math.floor(edges.length * 0.2)]!, median - radius * 0.06) - 1.5;
  const innerSq = inner * inner;
  const distSq = (i: number) => {
    const dx = (i % width) + 0.5 - cx, dy = Math.floor(i / width) + 0.5 - cy;
    return dx * dx + dy * dy;
  };

  // 3. Background = the white connected to the frame (white inside the figure stays)
  const background = new Uint8Array(width * height);
  const queue: number[] = [];
  const seedSq = (inner - 3) * (inner - 3);
  for (let i = 0; i < width * height; i++) {
    const d = distSq(i);
    if (d <= innerSq && d >= seedSq && isWhite(i)) { background[i] = 1; queue.push(i); }
  }
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % width;
    for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
      if (j < 0 || j >= width * height || background[j] || distSq(j) > innerSq || !isWhite(j)) continue;
      background[j] = 1;
      queue.push(j);
    }
  }

  // 4. New alpha: nothing outside the frame's inner edge nor on the background
  const alpha = new Uint8ClampedArray(width * height);
  let kept = 0, area = 0;
  for (let i = 0; i < width * height; i++) {
    if (distSq(i) > innerSq) continue;
    area++;
    if (background[i]) continue;
    let a = rgba[4 * i + 3]!;
    // Soften the light fringe left where the figure meets the background
    const x = i % width;
    const touchesBackground = (x > 0 && background[i - 1]) || (x < width - 1 && background[i + 1]) ||
      (i >= width && background[i - width]) || (i + width < width * height && background[i + width]);
    if (touchesBackground) {
      const min = Math.min(rgba[4 * i]!, rgba[4 * i + 1]!, rgba[4 * i + 2]!);
      a *= Math.min(1, Math.max(0.2, (255 - min) / 70));
    }
    alpha[i] = a;
    if (a > 0) kept++;
  }
  // An empty or full result means the picture was not understood: leave it alone
  if (kept < area * 0.03 || kept > area * 0.97) return null;
  return alpha;
}

/** Cut-out textures by base texture (null: no cut-out for that image) */
const cutoutTextures = new WeakMap<object, any>();
const CUTOUT_MAX_PIXELS = 1024 * 1024;

/** The cut-out version of a token texture, if it is a disc token image */
function getCutoutTexture(texture: any): any {
  const base = texture?.baseTexture;
  if (!base?.valid) return null;
  if (cutoutTextures.has(base)) return cutoutTextures.get(base);
  let cutout: any = null;
  try {
    const source = base.resource?.source;
    const width = base.realWidth, height = base.realHeight;
    const wholeImage = texture.frame?.width === base.width && texture.frame?.height === base.height;
    const isVideo = typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement;
    if (source && !isVideo && wholeImage && width * height <= CUTOUT_MAX_PIXELS) {
      const element = document.createElement('canvas');
      element.width = width;
      element.height = height;
      const context = element.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(source, 0, 0, width, height);
      const image = context.getImageData(0, 0, width, height); // throws for a cross-origin image without CORS
      const alpha = computeDiscCutout(image.data, width, height);
      if (alpha) {
        for (let i = 0; i < alpha.length; i++) image.data[4 * i + 3] = alpha[i]!;
        context.putImageData(image, 0, 0);
        cutout = PIXI.Texture.from(element, { resolution: base.resolution });
      }
    }
  } catch (err) {
    cutout = null;
  }
  cutoutTextures.set(base, cutout);
  return cutout;
}

/** Cut-out texture currently shown by a token mesh instead of its own */
const shownCutouts = new WeakMap<object, any>();

/** Show the cut-out figure of a disc token while it has its astral look */
function setCutout(token: any, active: boolean): void {
  const mesh = token.mesh;
  const shown = shownCutouts.get(mesh);
  const cutout = active && !token.hasDynamicRing ? getCutoutTexture(token.texture) : null;
  if (cutout) {
    if (mesh.texture !== cutout) mesh.texture = cutout;
    shownCutouts.set(mesh, cutout);
  } else if (shown) {
    if (mesh.texture === shown) mesh.texture = token.texture ?? PIXI.Texture.EMPTY;
    shownCutouts.delete(mesh);
  }
}

let AstralAuraFilterClass: any = null;

/** Filter class, created on first use (PIXI is not available at import time) */
function getAstralAuraFilterClass(): any {
  if (AstralAuraFilterClass) return AstralAuraFilterClass;
  class AstralAuraFilter extends PIXI.Filter {
    constructor() {
      super(ASTRAL_AURA_VERTEX, ASTRAL_AURA_FRAGMENT, { auraColor: [1, 1, 1], vitality: 1, time: 0, zoom: 1, presence: 0, alive: 1 });
      (this as any).padding = 30;
    }

    /** Start time of this token's animation, in seconds: tokens don't move in sync */
    timeOffset = 0;

    apply(filterManager: any, input: any, output: any, clearMode: any): void {
      const uniforms = (this as any).uniforms;
      // Keep the halo the same size on the map whatever the zoom
      uniforms.zoom = Math.min(2, Math.max(0.35, canvas.stage?.worldTransform?.d ?? 1));
      uniforms.time = this.timeOffset + (canvas.photosensitiveMode ? 0 : ((canvas.app.ticker.lastTime / 1000) * AURA_ANIMATION_SPEED) % 3600);
      filterManager.applyFilter(this, input, output, clearMode);
    }
  }
  AstralAuraFilterClass = AstralAuraFilter;
  return AstralAuraFilterClass;
}

/** A start time of its own for each token (0–600 s), stable for a given token id */
export function auraTimeOffset(tokenId: string): number {
  let hash = 0;
  for (const char of String(tokenId ?? '')) hash = (hash * 31 + char.charCodeAt(0)) % 60000;
  return hash / 100;
}

/** One filter per token mesh (each has its own look, vitality and start time) */
const auraFilters = new WeakMap<object, any>();

/** Give a token its astral look (aura shape), or restore its normal one */
function setAura(token: any, aura: { look: AuraLook; vitality: number } | null): void {
  const mesh = token.mesh;
  if (!mesh) return;
  let filter = auraFilters.get(mesh);
  const filters: any[] = mesh.filters ?? [];
  // What is not alive keeps its whole picture: without the white disc a line
  // drawing would be black on a dark map
  setCutout(token, !!aura && aura.look !== 'lifeless');
  if (!aura) {
    if (filter && filters.includes(filter)) mesh.filters = filters.filter(f => f !== filter);
    return;
  }
  if (!filter) {
    filter = new (getAstralAuraFilterClass())();
    filter.timeOffset = auraTimeOffset(token.id);
    auraFilters.set(mesh, filter);
  }
  filter.uniforms.auraColor = aura.look === 'astral' ? ASTRAL_FORM_COLOR : AURA_COLOR;
  filter.uniforms.presence = aura.look === 'astral' ? 1 : 0;
  filter.uniforms.alive = aura.look === 'lifeless' ? 0 : 1;
  filter.uniforms.vitality = aura.vitality;
  // First in the chain: Foundry's own filters apply to the astral shape
  if (!filters.includes(filter)) mesh.filters = [filter, ...filters];
}

/** Colour matrix: partial desaturation, then a violet tint */
function getCanvasTintFilter(): any {
  if (!canvasTintFilter) {
    const d = TINT_DESATURATION;
    const grey = [0.3, 0.59, 0.11];
    const matrix: number[] = [];
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < 3; i++) matrix.push(TINT_COLOR[c]! * ((1 - d) * (i === c ? 1 : 0) + d * grey[i]!));
      matrix.push(0, 0);
    }
    matrix.push(0, 0, 0, 1, 0);
    canvasTintFilter = new PIXI.ColorMatrixFilter();
    canvasTintFilter.matrix = matrix;
  }
  return canvasTintFilter;
}

function setCanvasTint(active: boolean): void {
  // Environment group = map + tokens + lighting: tint the final lit image.
  // (Not the primary group, whose ambience filter handles the lighting.)
  const group = canvas.environment;
  if (!group) return;
  const filter = getCanvasTintFilter();
  const filters: any[] = group.filters ?? [];
  const has = filters.includes(filter);
  if (active && !has) group.filters = [...filters, filter];
  else if (!active && has) group.filters = filters.filter(f => f !== filter);
}

/** Recompute the canvas tint and the aura of every token for the current user */
export function refreshAstralAuras(): void {
  if (!canvas?.ready) return;
  const viewers = astralViewers();
  setCanvasTint(viewers.length > 0);
  for (const token of canvas.tokens.placeables) {
    const aura = viewers.length > 0 && token.visible ? getTokenAura(token) : null;
    const inAstralSight = !!aura &&
      viewers.some(viewer => viewer === token || !isAstralSightBlocked(viewer.center, token.center));
    setAura(token, inAstralSight ? aura : null);
  }
}

/* -------------------------------------------- */
/*  Astral projection                           */
/* -------------------------------------------- */

/**
 * Can the current user see this astral form? Only through a token that
 * perceives the astral plane, with nothing solid in between (windows
 * included). Its owner (player) always sees it; a GM with nothing selected
 * sees everything.
 */
export function canSeeAstralForm(target: any): boolean {
  if (target.controlled) return true;
  if (target.isOwner && !game.user?.isGM) return true;
  const tokens: any[] = canvas.tokens?.placeables ?? [];
  let viewers = tokens.filter(t => t.controlled);
  if (viewers.length === 0) {
    if (game.user?.isGM) return true;
    viewers = tokens.filter(t => t.isOwner);
  }
  const bodyTokenId = target.document?.getFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM)?.bodyTokenId;
  return viewers.some(v =>
    v.id === bodyTokenId || // a body always sees its own astral form
    (perceivesAstral(v) && !isAstralSightBlocked(v.center, target.center))
  );
}

/**
 * When an astral form appears next to a body this client has selected, switch
 * the selection to the form: the user "steps out" into it (astral tint, auras).
 */
function selectNewAstralForm(tokenDoc: any): void {
  const bodyTokenId = tokenDoc.getFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM)?.bodyTokenId;
  const body = bodyTokenId ? canvas.tokens?.get(bodyTokenId) : null;
  if (!body?.controlled) return;
  // The placeable is drawn asynchronously after the document is created
  setTimeout(() => {
    const form = canvas.tokens?.get(tokenDoc.id);
    if (form?.isOwner) form.control({ releaseOthers: true });
  }, 100);
}

/**
 * Register the canvas classes needed for astral projection (call during init).
 * Each subclass behaves exactly like Foundry's own unless an astral form is involved.
 */
export function registerAstralCanvasClasses(): void {
  // Token: astral forms are hidden from mundane viewers and move through walls
  const BaseToken = CONFIG.Token.objectClass;
  class SRA2Token extends BaseToken {
    get isVisible(): boolean {
      const visible = super.isVisible;
      if (!visible || !isAstralFormToken(this)) return visible;
      if ((this as any).isPreview) return true;
      return canSeeAstralForm(this);
    }

    constrainMovementPath(waypoints: any, options: any = {}): any {
      if (isAstralFormToken(this)) options = { ...options, ignoreWalls: true };
      return super.constrainMovementPath(waypoints, options);
    }
  }
  CONFIG.Token.objectClass = SRA2Token;

  // Sight polygon: for an astral form, walls that block movement block its
  // sight fully — including windows, whether see-through ("invisible wall",
  // sight NONE) or proximity-based (Foundry's "window" tool, sight PROXIMITY)
  const { NONE, NORMAL } = (globalThis as any).CONST.EDGE_SENSE_TYPES;
  const isSeeThroughSolid = (edge: any) => edge.move !== NONE && edge.sight !== NORMAL;
  const BaseSweep = CONFIG.Canvas.polygonBackends.sight;
  class AstralSightPolygon extends BaseSweep {
    _testEdgeInclusion(edge: any, edgeTypes: any): boolean {
      const config = (this as any).config;
      if (config?.sra2Astral && isSeeThroughSolid(edge)) {
        const type = config.type;
        config.type = 'move';
        try { return super._testEdgeInclusion(edge, edgeTypes); } finally { config.type = type; }
      }
      return super._testEdgeInclusion(edge, edgeTypes);
    }

    _identifyEdges(): void {
      super._identifyEdges();
      if (!(this as any).config?.sra2Astral) return;
      // Edges are cloned per polygon: make the included see-through ones opaque
      for (const edge of (this as any).edges) {
        if (isSeeThroughSolid(edge)) edge.sight = NORMAL;
      }
    }
  }
  CONFIG.Canvas.polygonBackends.sight = AstralSightPolygon;

  // Vision source: flag the polygon of an astral form
  const BaseVisionSource = CONFIG.Canvas.visionSourceClass;
  class SRA2VisionSource extends BaseVisionSource {
    _getPolygonConfiguration(): any {
      const config = super._getPolygonConfiguration();
      if (isAstralFormToken((this as any).object)) {
        config.sra2Astral = true;
        // No proximity see-through (Foundry's "window" tool) for astral sight
        config.useThreshold = false;
      }
      return config;
    }
  }
  CONFIG.Canvas.visionSourceClass = SRA2VisionSource;
}

/**
 * Tokens of an actor to sync after a change made by a user: the token itself
 * for a token actor, otherwise the actor's tokens in the scene that user is
 * viewing (the GM running the sync may be looking at another scene).
 */
function actorTokensForUser(actor: any, userId: string): any[] {
  if (actor.isToken) return actor.token ? [actor.token] : [];
  const sceneId = game.users?.get(userId)?.viewedScene;
  const scene = sceneId ? game.scenes?.get(sceneId) : null;
  return scene ? actor.getDependentTokens({ scenes: scene }) : [];
}

/**
 * Keep astral form tokens in sync with the actor's astral state: going into
 * projection leaves the body token in place and creates an astral form token
 * next to it; leaving projection (from the body or from the form) deletes the
 * astral form. Must run on a single client allowed to create tokens.
 */
async function syncAstralFormTokens(actor: any, userId: string): Promise<void> {
  for (const tokenDoc of actorTokensForUser(actor, userId)) {
    const scene = tokenDoc.parent;
    if (!scene?.tokens.has(tokenDoc.id)) continue; // already deleted in this pass
    // An unlinked token can override the state of the actor it derives from
    const state = tokenDoc.actor?.system?.astralState;

    const form = tokenDoc.getFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM);
    if (form) {
      if (state === 'projection') continue;
      // Back from projection through the astral form: remove it, bring the body back
      const body = scene.tokens.get(form.bodyTokenId);
      await tokenDoc.delete({ [OPTION_ASTRAL_SYNC]: true });
      if (body) {
        await body.unsetFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM_TOKEN);
        if (body.actor && body.actor.system?.astralState !== state) await body.actor.update({ 'system.astralState': state });
      }
      continue;
    }

    const formTokenId = tokenDoc.getFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM_TOKEN);
    // Also find a form whose link back to the body was never recorded
    const existingForm = (formTokenId ? scene.tokens.get(formTokenId) : null) ??
      scene.tokens.find((t: any) => t.getFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM)?.bodyTokenId === tokenDoc.id) ?? null;
    if (state === 'projection') {
      if (existingForm) continue;
      const data = tokenDoc.toObject();
      delete data._id;
      data.x += scene.grid.size * (tokenDoc.width ?? 1);
      data.name = `${tokenDoc.name} (${game.i18n.localize('SRA2.ASTRAL.FORM')})`;
      data.alpha = ASTRAL_FORM_ALPHA;
      if (data.flags?.[FLAG_SCOPE]) delete data.flags[FLAG_SCOPE][FLAG_ASTRAL_FORM_TOKEN];
      foundry.utils.setProperty(data, `flags.${FLAG_SCOPE}.${FLAG_ASTRAL_FORM}`, { bodyTokenId: tokenDoc.id });
      // The form is a copy of the body: skip the optional/choice feats dialog
      // that preCreateToken shows (and which cancels the creation)
      const [created] = await scene.createEmbeddedDocuments('Token', [data], { sra2SkipFeatChoice: true });
      if (created) await tokenDoc.setFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM_TOKEN, created.id);
    } else if (formTokenId || existingForm) {
      if (existingForm) await existingForm.delete({ [OPTION_ASTRAL_SYNC]: true });
      if (formTokenId) await tokenDoc.unsetFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM_TOKEN);
    }
  }
}

/**
 * A user deleting an astral form token ends the projection: the body goes
 * back to physical.
 */
async function onAstralFormDeleted(tokenDoc: any): Promise<void> {
  const bodyTokenId = tokenDoc.getFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM)?.bodyTokenId;
  const body = bodyTokenId ? tokenDoc.parent?.tokens.get(bodyTokenId) : null;
  if (!body) return;
  if (body.getFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM_TOKEN)) await body.unsetFlag(FLAG_SCOPE, FLAG_ASTRAL_FORM_TOKEN);
  if (isAstrallyProjected(body.actor)) await body.actor.update({ 'system.astralState': 'physical' });
}

/**
 * The active GM's client creates/deletes astral form tokens (players usually
 * can't create tokens). Without a GM online, the user who made the change tries.
 */
function isAstralFormRunner(userId: string): boolean {
  const gm = game.users?.activeGM;
  return gm ? gm.isSelf : userId === game.user?.id;
}

/** Recompute vision and token visibility after an astral state change */
function refreshAstralVisibility(): void {
  if (!canvas?.ready) return;
  canvas.perception.update({ initializeVision: true, refreshVision: true });
  // refreshState also restores the opacity of a token that stopped pulsing
  for (const token of canvas.tokens.placeables) token.renderFlags.set({ refreshVisibility: true, refreshState: true });
}

/* -------------------------------------------- */
/*  Astral form pulse                           */
/* -------------------------------------------- */

let pulseElapsedMs = 0;
let pulseRegistered = false;

/** Make visible astral forms pulse (opacity), so they stand out from bodies */
function animateAstralForms(): void {
  if (!canvas?.ready || !canvas.tokens) return;
  pulseElapsedMs += canvas.app.ticker.deltaMS;
  for (const token of canvas.tokens.placeables) {
    if (!token.visible || !token.mesh || !isAstralFormToken(token)) continue;
    // Each form pulses on its own time
    const elapsed = pulseElapsedMs + auraTimeOffset(token.id) * 1000;
    const wave = 0.5 + 0.5 * Math.sin((elapsed / PULSE_PERIOD_MS) * 2 * Math.PI);
    const factor = PULSE_MIN + (1 - PULSE_MIN) * wave;
    // A projection's form carries its opacity in its own token document
    const opacity = isProjectionFormToken(token) ? 1 : ASTRAL_FORM_ALPHA;
    token.mesh.alpha = token.alpha * (token.document.alpha ?? 1) * opacity * factor;
  }
}

/**
 * Debounced refresh: token visibility and wall edges are only up to date
 * once Foundry has finished its own perception update, so recompute the
 * auras shortly after the last relevant change.
 */
const scheduleAuraRefresh = foundry.utils.debounce(() => refreshAstralAuras(), 50);

/**
 * Astral forms' visibility depends on walls and on every viewer's position,
 * which Foundry doesn't track for them: re-test it after vision updates and
 * wall changes. (Only sets render flags; refreshToken doesn't loop back here.)
 */
const scheduleAstralFormVisibilityRefresh = foundry.utils.debounce(() => {
  for (const token of canvas.tokens?.placeables ?? []) {
    if (isAstralFormToken(token)) token.renderFlags.set({ refreshVisibility: true });
  }
}, 50);

/** Register the world settings of the astral plane (call during init) */
export function registerAstralSettings(): void {
  game.settings.register(FLAG_SCOPE, SETTING_AURA_ESSENCE, {
    name: 'SRA2.SETTINGS.AURA_ESSENCE.TITLE',
    hint: 'SRA2.SETTINGS.AURA_ESSENCE.DESC',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => scheduleAuraRefresh(),
  });
}

/** Register hooks (call once at startup) */
export function registerAstralVisionHooks(): void {
  Hooks.on('canvasReady', () => {
    if (pulseRegistered) return;
    canvas.app.ticker.add(animateAstralForms);
    pulseRegistered = true;
  });
  for (const hook of ['sightRefresh', 'createWall', 'updateWall', 'deleteWall']) {
    Hooks.on(hook, () => scheduleAstralFormVisibilityRefresh());
  }
  for (const hook of ['sightRefresh', 'controlToken', 'createWall', 'updateWall', 'deleteWall', 'createToken', 'deleteToken']) {
    Hooks.on(hook, () => scheduleAuraRefresh());
  }
  Hooks.on('refreshToken', (_token: any, flags: any) => {
    if (flags?.refreshVisibility || flags?.refreshPosition || flags?.refreshMesh) scheduleAuraRefresh();
  });
  // Leaving the physical plane disconnects the character from the Matrix
  Hooks.on('preUpdateActor', (_actor: any, changes: any) => {
    if (['projection', 'astral'].includes(foundry.utils.getProperty(changes, 'system.astralState'))) {
      foundry.utils.setProperty(changes, 'system.connectionMode', 'disconnected');
    }
  });
  Hooks.on('updateActor', (actor: any, changes: any, _options: any, userId: string) => {
    if (changes?.system?.maxEssence !== undefined) scheduleAuraRefresh(); // the aura darkens with Essence
    if (changes?.system?.astralState === undefined) return;
    if (isAstralFormRunner(userId)) {
      syncAstralFormTokens(actor, userId).catch((err: any) => {
        console.error('SRA2 | Astral projection: could not sync the astral form token', err);
        ui.notifications?.error(game.i18n.localize('SRA2.ASTRAL.FORM_SYNC_ERROR'));
      });
    }
    refreshAstralVisibility();
    scheduleAuraRefresh();
  });
  Hooks.on('createToken', (tokenDoc: any) => {
    if (isProjectionFormToken(tokenDoc)) selectNewAstralForm(tokenDoc);
  });
  Hooks.on('deleteToken', (tokenDoc: any, options: any, userId: string) => {
    if (options?.[OPTION_ASTRAL_SYNC]) return; // removed by the sync, which handles the body itself
    if (!isProjectionFormToken(tokenDoc) || !isAstralFormRunner(userId)) return;
    onAstralFormDeleted(tokenDoc).catch((err: any) => console.error('SRA2 | Astral projection: could not end the projection', err));
  });
  // Selection decides who looks at the astral plane
  Hooks.on('controlToken', () => {
    for (const token of canvas.tokens?.placeables ?? []) token.renderFlags.set({ refreshVisibility: true });
  });
  // Feats added/removed/toggled can change an actor's aura, and
  // losing the awakened feat that grants the current astral state ends it
  const onItemChange = (item: any, userId: string) => {
    const actor = item.parent;
    if (actor?.documentName !== 'Actor') return;
    scheduleAuraRefresh();
    if (userId !== game.user?.id || item.type !== 'feat') return;
    const state = actor.system?.astralState;
    if (state && state !== 'physical' && !canEnterAstralState(actor, state)) {
      actor.update({ 'system.astralState': 'physical' })
        .catch((err: any) => console.error('SRA2 | Astral state: could not return to physical', err));
    }
  };
  Hooks.on('createItem', (item: any, _options: any, userId: string) => onItemChange(item, userId));
  Hooks.on('updateItem', (item: any, _changes: any, _options: any, userId: string) => onItemChange(item, userId));
  Hooks.on('deleteItem', (item: any, _options: any, userId: string) => onItemChange(item, userId));
}

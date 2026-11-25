import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// The module creates debounced functions at import time
(globalThis as any).foundry.utils = { debounce: (fn: any) => fn };

const { isAstralFormToken, perceivesAstral, getTokenAura, computeDiscCutout, auraTimeOffset, canSeeAstralForm, getAstralAbilities, getAstralStates, canEnterAstralState } =
  await import('../canvas/astral-vision.js');

/** Walls as [ax, ay, bx, by, blocksMove, blocksSight]; a collision test per polygon type */
let walls: Array<[number, number, number, number, boolean, boolean]>;
let tokens: any[];
let isGM: boolean;

function crosses(o: any, d: any, wall: Array<number | boolean>): boolean {
  const [ax, ay, bx, by] = wall as number[];
  const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return side(o.x, o.y, d.x, d.y, ax!, ay!) !== side(o.x, o.y, d.x, d.y, bx!, by!) &&
    side(ax!, ay!, bx!, by!, o.x, o.y) !== side(ax!, ay!, bx!, by!, d.x, d.y);
}

function makeToken(id: string, x: number, opts: { astralState?: string; form?: string; controlled?: boolean; isOwner?: boolean; feats?: any[] } = {}) {
  const flags: any = opts.form ? { sra2: { astralForm: { bodyTokenId: opts.form } } } : {};
  return {
    id, center: { x, y: 0 }, controlled: !!opts.controlled, isOwner: !!opts.isOwner,
    document: { getFlag: (scope: string, key: string) => flags[scope]?.[key] },
    actor: { type: 'character', system: { astralState: opts.astralState ?? 'physical' }, items: opts.feats ?? [] },
  };
}

beforeEach(() => {
  walls = []; tokens = []; isGM = true;
  (globalThis as any).game = { user: { get isGM() { return isGM; } } };
  const backend = (index: number) => ({
    testCollision: (o: any, d: any) => walls.some(w => w[index] && crosses(o, d, w)),
  });
  (globalThis as any).CONFIG = { Canvas: { polygonBackends: { move: backend(4), sight: backend(5) } } };
  (globalThis as any).canvas = { level: null, tokens: { get placeables() { return tokens; } } };
});
afterEach(() => {
  delete (globalThis as any).game; delete (globalThis as any).CONFIG; delete (globalThis as any).canvas;
});

describe('astral helpers', () => {
  it('recognises astral form tokens by their flag', () => {
    expect(isAstralFormToken(makeToken('f', 0, { form: 'body' }))).toBe(true);
    expect(isAstralFormToken(makeToken('b', 0, { astralState: 'projection' }))).toBe(false);
  });

  it('a form and a character in perception look at the astral plane, a vacant body does not', () => {
    expect(perceivesAstral(makeToken('f', 0, { form: 'body' }))).toBe(true);
    expect(perceivesAstral(makeToken('p', 0, { astralState: 'perception' }))).toBe(true);
    expect(perceivesAstral(makeToken('b', 0, { astralState: 'projection' }))).toBe(false);
    expect(perceivesAstral(makeToken('m', 0))).toBe(false);
  });

  it('what is not alive has no aura: a lifeless shape', () => {
    const being = (type: string) => ({ actor: { type, items: [], system: {} }, document: { getFlag: () => undefined } });
    expect(getTokenAura(being('character')).look).toBe('aura');
    expect(getTokenAura(being('vehicle')).look).toBe('lifeless');
    expect(getTokenAura(being('ice')).look).toBe('lifeless');
    expect(getTokenAura({ document: { getFlag: () => undefined } }).look).toBe('lifeless');
  });

  it('awakened and ordinary beings show the same plain aura', () => {
    const awakened = { type: 'feat', system: { featType: 'awakened', active: true, astralProjection: true } };
    expect(getTokenAura(makeToken('o', 0))).toEqual({ look: 'aura', vitality: 1 });
    expect(getTokenAura(makeToken('a', 0, { feats: [awakened] }))).toEqual({ look: 'aura', vitality: 1 });
  });

  it('only beings active on the astral plane show as an astral form', () => {
    const trait = (system: any) => ({ type: 'feat', system: { featType: 'trait', active: true, ...system } });
    expect(getTokenAura(makeToken('p', 0, { astralState: 'perception' })).look).toBe('astral');
    expect(getTokenAura(makeToken('f', 0, { form: 'body' })).look).toBe('astral');
    expect(getTokenAura(makeToken('d', 0, { feats: [trait({ dualNature: true })] })).look).toBe('astral');
    expect(getTokenAura(makeToken('s', 0, { feats: [trait({ astralBeing: true })], astralState: 'astral' })).look).toBe('astral');
    expect(getTokenAura(makeToken('m', 0, { feats: [trait({ astralBeing: true })] })).look).toBe('astral'); // materialised: dual
    expect(getTokenAura(makeToken('b', 0, { astralState: 'projection' })).look).toBe('aura'); // vacant body
  });

  it('Essence does not show in an aura, unless the house rule setting is on', () => {
    const vitality = (system: any) => getTokenAura({ actor: { type: 'character', items: [], system }, document: { getFlag: () => undefined } }).vitality;
    expect(vitality({ currentEssence: 6 })).toBe(1);
    expect(vitality({ currentEssence: 2 })).toBe(1);
    expect(vitality({ currentEssence: 0 })).toBe(1);

    (globalThis as any).game.settings = { get: (scope: string, key: string) => scope === 'sra2' && key === 'astralAuraEssence' };
    expect(vitality({ currentEssence: 6 })).toBe(1);
    expect(vitality({ currentEssence: 3 })).toBe(0.5);
    expect(vitality({ currentEssence: 0 })).toBe(0);
    expect(vitality({})).toBe(1);
  });
});

describe('canSeeAstralForm', () => {
  const form = () => makeToken('form', 100, { form: 'body' });

  it('a GM with nothing selected sees every astral form', () => {
    expect(canSeeAstralForm(form())).toBe(true);
  });

  it('a mundane viewer does not see it, a viewer in astral perception does', () => {
    const f = form();
    tokens = [f, makeToken('mundane', 0, { controlled: true })];
    expect(canSeeAstralForm(f)).toBe(false);
    tokens = [f, makeToken('mage', 0, { controlled: true, astralState: 'perception' })];
    expect(canSeeAstralForm(f)).toBe(true);
  });

  it('a window (blocks movement, not sight) hides it from astral perception', () => {
    const f = form();
    tokens = [f, makeToken('mage', 0, { controlled: true, astralState: 'perception' })];
    walls = [[50, -10, 50, 10, true, false]];
    expect(canSeeAstralForm(f)).toBe(false);
  });

  it('a body sees its own astral form, another vacant body does not', () => {
    const f = form();
    tokens = [f, makeToken('body', 0, { controlled: true, astralState: 'projection' })];
    expect(canSeeAstralForm(f)).toBe(true);
    tokens = [f, makeToken('other', 0, { controlled: true, astralState: 'projection' })];
    expect(canSeeAstralForm(f)).toBe(false);
  });

  it('its owner (player) always sees it; another player only through astral sight', () => {
    isGM = false;
    const owned = makeToken('form', 100, { form: 'body', isOwner: true });
    expect(canSeeAstralForm(owned)).toBe(true);
    const f = form();
    tokens = [f, makeToken('mine', 0, { isOwner: true })];
    expect(canSeeAstralForm(f)).toBe(false);
    tokens = [f, makeToken('mine', 0, { isOwner: true, astralState: 'perception' })];
    expect(canSeeAstralForm(f)).toBe(true);
  });
});

describe('astral abilities granted by feats', () => {
  const feat = (featType: string, system: any = {}) => ({ type: 'feat', system: { featType, active: true, ...system } });
  const awakened = (system: any = {}) => feat('awakened', system);
  const none = { perception: false, projection: false, dual: false, astralBeing: false };

  it('a mundane character can only be physical', () => {
    const actor = { items: [feat('cyberware', { astralPerception: true, dualNature: true })] };
    expect(getAstralAbilities(actor)).toEqual(none);
    expect(getAstralStates(actor)).toEqual(['physical']);
    expect(canEnterAstralState(actor, 'perception')).toBe(false);
    expect(canEnterAstralState(actor, 'projection')).toBe(false);
    expect(canEnterAstralState(actor, 'astral')).toBe(false);
  });

  it('an awakened feat without astral options grants nothing', () => {
    expect(getAstralAbilities({ items: [awakened({ sorcery: true })] })).toEqual(none);
  });

  it('astral perception alone does not allow projection', () => {
    const actor = { items: [awakened({ astralPerception: true })] };
    expect(getAstralStates(actor)).toEqual(['physical', 'perception']);
  });

  it('astral projection includes perception', () => {
    const actor = { items: [awakened({ astralProjection: true })] };
    expect(getAstralAbilities(actor)).toEqual({ ...none, perception: true, projection: true });
    expect(getAstralStates(actor)).toEqual(['physical', 'perception', 'projection']);
  });

  it('an inactive feat grants nothing', () => {
    const actor = { items: [awakened({ astralProjection: true, dualNature: true, active: false })] };
    expect(getAstralAbilities(actor)).toEqual(none);
  });

  it('a dual-natured being has no perception state, but can project if it has the ability', () => {
    const ghoul = { items: [feat('trait', { dualNature: true })] };
    expect(getAstralStates(ghoul)).toEqual(['physical']);
    const vampire = { items: [feat('trait', { dualNature: true }), awakened({ astralProjection: true })] };
    expect(getAstralStates(vampire)).toEqual(['physical', 'projection']);
  });

  it('an astral being is either materialised or in astral form', () => {
    const spirit = { items: [feat('power', { astralBeing: true, astralProjection: true })] };
    expect(getAstralStates(spirit)).toEqual(['physical', 'astral']);
    expect(canEnterAstralState(spirit, 'projection')).toBe(false);
  });
});

describe('dual-natured and astral beings on the canvas', () => {
  const trait = (system: any) => ({ type: 'feat', system: { featType: 'trait', active: true, ...system } });

  it('a dual-natured being always perceives the astral plane, except its vacant body', () => {
    const dual = [trait({ dualNature: true })];
    expect(perceivesAstral(makeToken('d', 0, { feats: dual }))).toBe(true);
    expect(perceivesAstral(makeToken('b', 0, { feats: dual, astralState: 'projection' }))).toBe(false);
  });

  it('an astral being in astral form is an astral form token; materialised it is dual', () => {
    const spirit = [trait({ astralBeing: true })];
    const astral = makeToken('s', 0, { feats: spirit, astralState: 'astral' });
    expect(isAstralFormToken(astral)).toBe(true);
    expect(perceivesAstral(astral)).toBe(true);
    const materialised = makeToken('m', 0, { feats: spirit });
    expect(isAstralFormToken(materialised)).toBe(false);
    expect(perceivesAstral(materialised)).toBe(true);
  });

  it('a spirit in astral form is hidden from mundane viewers and seen by dual ones', () => {
    isGM = false;
    const spirit = makeToken('s', 100, { feats: [trait({ astralBeing: true })], astralState: 'astral' });
    const mundane = makeToken('m', 0, { controlled: true });
    tokens = [spirit, mundane];
    expect(canSeeAstralForm(spirit)).toBe(false);
    const ghoul = makeToken('g', 0, { controlled: true, feats: [trait({ dualNature: true })] });
    tokens = [spirit, ghoul];
    expect(canSeeAstralForm(spirit)).toBe(true);
    walls = [[50, -50, 50, 50, true, false]]; // a window still blocks astral sight
    expect(canSeeAstralForm(spirit)).toBe(false);
  });
});

describe('cut-out of disc token images', () => {
  const SIZE = 100;
  /** A token image: grey frame ring, white disc, and a painter for the figure */
  function discToken(figure: (x: number, y: number) => number[] | null, background = [255, 255, 255]) {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2);
      if (d > SIZE / 2) continue; // transparent outside the disc
      const colour = d > SIZE / 2 - 5 ? [140, 142, 146] : (figure(x, y) ?? background);
      data.set([...colour, 255], 4 * (y * SIZE + x));
    }
    return data;
  }
  const square = (x: number, y: number) => (x >= 35 && x < 65 && y >= 35 && y < 65 ? [200, 30, 0] : null);
  const at = (alpha: Uint8ClampedArray, x: number, y: number) => alpha[y * SIZE + x];

  it('keeps the figure and drops the white disc and its frame', () => {
    const alpha = computeDiscCutout(discToken(square), SIZE, SIZE)!;
    expect(alpha).not.toBeNull();
    expect(at(alpha, 50, 50)).toBe(255); // figure
    expect(at(alpha, 20, 50)).toBe(0);   // white background
    expect(at(alpha, 50, 2)).toBe(0);    // frame ring
    expect(at(alpha, 0, 0)).toBe(0);     // outside the disc
  });

  it('keeps white areas enclosed in the figure', () => {
    const ringFigure = (x: number, y: number) => {
      const inSquare = x >= 30 && x < 70 && y >= 30 && y < 70;
      const inHole = x >= 45 && x < 55 && y >= 45 && y < 55;
      return inSquare && !inHole ? [200, 30, 0] : null;
    };
    const alpha = computeDiscCutout(discToken(ringFigure), SIZE, SIZE)!;
    expect(at(alpha, 50, 50)).toBe(255); // white eye inside the figure
    expect(at(alpha, 20, 50)).toBe(0);
  });

  it('leaves alone images that are not a figure on a white disc', () => {
    expect(computeDiscCutout(discToken(square, [30, 60, 120]), SIZE, SIZE)).toBeNull(); // coloured background
    expect(computeDiscCutout(discToken(() => null), SIZE, SIZE)).toBeNull();            // empty disc
    const opaque = new Uint8ClampedArray(SIZE * SIZE * 4).fill(255);
    expect(computeDiscCutout(opaque, SIZE, SIZE)).toBeNull();                           // full square picture
    const cutOut = new Uint8ClampedArray(SIZE * SIZE * 4);                               // already cut out
    for (let y = 35; y < 65; y++) for (let x = 35; x < 65; x++) cutOut.set([200, 30, 0, 255], 4 * (y * SIZE + x));
    expect(computeDiscCutout(cutOut, SIZE, SIZE)).toBeNull();
  });
});

describe('aura animation', () => {
  it('each token starts its animation at its own time, always the same for a given token', () => {
    const ids = ['XZpcoARMlT25hPpx', 'ZDUry0fF0HrqsGu8', '1hZH4bYNwvE2st4y', 'mp6fFfGVtfsrBERg'];
    const offsets = ids.map(id => auraTimeOffset(id));
    expect(new Set(offsets).size).toBe(ids.length);
    for (const offset of offsets) { expect(offset).toBeGreaterThanOrEqual(0); expect(offset).toBeLessThan(600); }
    expect(auraTimeOffset(ids[0]!)).toBe(offsets[0]);
  });
});

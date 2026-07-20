import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// item-search is imported transitively by sheet-helpers. Mirror the real
// normalizeSearchText behaviour we rely on (lowercase, strip parenthesised text).
vi.mock('../../../item-search.js', () => ({
  normalizeSearchText: (t: string) =>
    (t ?? '').toLowerCase().replace(/ ?\(.*\)/g, ''),
}));

vi.mock('../models/item-feat.js', () => ({
  VEHICLE_TYPES: {},
  WEAPON_TYPES: {},
}));

const { getRRSources, getLinkedVehicleActors, calculateAttackPool } = await import('../helpers/sheet-helpers.js');
const { prepareVehicleWeaponAttack } = await import('../helpers/combat-helpers.js');

const makeFeat = (name: string, rrList: any[], opts: any = {}) => ({
  id: opts.id || name,
  name,
  type: 'feat',
  system: { active: true, featType: opts.featType || 'various', rrList, ...opts.system },
});

const makeVehicle = (name: string, uuid: string, items: any[]) => ({
  uuid,
  type: 'vehicle',
  name,
  items,
  system: { attributes: { autopilot: 6 }, vehicleType: '' },
});

beforeEach(() => {
  (globalThis as any).game = { items: null, i18n: { localize: (k: string) => k } };
});
afterEach(() => {
  delete (globalThis as any).game;
});

describe('getLinkedVehicleActors', () => {
  it('returns [] when the actor has no linkedVehicles', () => {
    expect(getLinkedVehicleActors({ system: {} })).toEqual([]);
    expect(getLinkedVehicleActors({})).toEqual([]);
  });

  it('resolves linked vehicles through game.actors and skips non-vehicles', () => {
    const drone = makeVehicle('Lockheed', 'Actor.abc', []);
    const npc = { uuid: 'Actor.def', type: 'npc' };
    (globalThis as any).game.actors = {
      find: (fn: any) => [drone, npc].find(fn),
      get: () => null,
    };
    const actor = { system: { linkedVehicles: ['Actor.abc', 'Actor.def', 'Actor.missing'] } };
    expect(getLinkedVehicleActors(actor)).toEqual([drone]);
  });
});

describe('getRRSources with linked vehicles', () => {
  const droneFeat = makeFeat('Optique avancée', [
    { rrType: 'skill', rrTarget: 'perception', rrValue: 1 },
  ]);
  const drone = makeVehicle('Lockheed', 'Actor.abc', [droneFeat]);

  const actor = {
    items: [] as any[],
    system: { linkedVehicles: ['Actor.abc'] },
  };

  beforeEach(() => {
    (globalThis as any).game.actors = {
      find: (fn: any) => [drone].find(fn),
      get: () => null,
    };
  });

  it("includes a linked drone's targeted RR in the owner's sources, labeled with the drone name", () => {
    const sources = getRRSources(actor, 'skill', 'perception');
    expect(sources).toEqual([
      {
        featName: 'Optique avancée (Lockheed)',
        rrValue: 1,
        rrLabel: undefined,
        sourceFeatName: 'Optique avancée',
      },
    ]);
  });

  it('ignores inactive drone feats', () => {
    const inactive = makeFeat('Mod éteint', [{ rrType: 'skill', rrTarget: 'perception', rrValue: 2 }]);
    inactive.system.active = false;
    drone.items.push(inactive);
    const sources = getRRSources(actor, 'skill', 'perception');
    expect(sources).toHaveLength(1);
    drone.items.pop();
  });

  it('does not match untargeted drone entries on skill lookups', () => {
    const generic = makeFeat('Gyrostab', [{ rrType: 'skill', rrTarget: '', rrValue: 1 }]);
    drone.items.push(generic);
    const sources = getRRSources(actor, 'skill', 'perception');
    expect(sources).toHaveLength(1);
    drone.items.pop();
  });
});

describe('calculateAttackPool double-count guard for drone weapons', () => {
  it("excludes the rolled drone weapon's own targeted entries returned by getRRSources", () => {
    // The drone weapon carries an RR targeting the skill used to control it.
    // Its entries are passed via itemRRList AND surface through getRRSources
    // (linked vehicle scan, suffixed name) — they must be counted only once.
    const droneWeapon = makeFeat('Canon', [
      { rrType: 'skill', rrTarget: 'ingenierie', rrValue: 1 },
    ], { featType: 'weapon' });
    const drone = makeVehicle('Lockheed', 'Actor.abc', [droneWeapon]);
    (globalThis as any).game.actors = {
      find: (fn: any) => [drone].find(fn),
      get: () => null,
    };

    const actor = {
      items: [
        { type: 'skill', name: 'Ingénierie', system: { slug: 'ingenierie' } },
      ],
      system: { linkedVehicles: ['Actor.abc'] },
    };

    const skillSpecResult = {
      skillName: 'Ingénierie',
      skillLevel: 6,
      specName: undefined,
      specLevel: undefined,
      linkedAttribute: undefined,
    } as any;

    const itemRRList = droneWeapon.system.rrList.map((rr: any) => ({ ...rr, featName: 'Canon' }));
    const result = calculateAttackPool(actor, skillSpecResult, itemRRList, 'Canon');

    expect(result.totalRR).toBe(1);
    expect(result.allRRSources).toHaveLength(1);
  });

  it("counts another drone feat's targeted entry alongside the weapon's own", () => {
    const droneWeapon = makeFeat('Canon', [
      { rrType: 'skill', rrTarget: 'ingenierie', rrValue: 1 },
    ], { featType: 'weapon' });
    const droneMod = makeFeat('Assist visée', [
      { rrType: 'skill', rrTarget: 'ingenierie', rrValue: 1 },
    ]);
    const drone = makeVehicle('Lockheed', 'Actor.abc', [droneWeapon, droneMod]);
    (globalThis as any).game.actors = {
      find: (fn: any) => [drone].find(fn),
      get: () => null,
    };

    const actor = {
      items: [
        { type: 'skill', name: 'Ingénierie', system: { slug: 'ingenierie' } },
      ],
      system: { linkedVehicles: ['Actor.abc'] },
    };

    const skillSpecResult = {
      skillName: 'Ingénierie',
      skillLevel: 6,
      specName: undefined,
      specLevel: undefined,
      linkedAttribute: undefined,
    } as any;

    const itemRRList = droneWeapon.system.rrList.map((rr: any) => ({ ...rr, featName: 'Canon' }));
    const result = calculateAttackPool(actor, skillSpecResult, itemRRList, 'Canon');

    expect(result.totalRR).toBe(2);
    expect(result.allRRSources.map((s: any) => s.featName).sort()).toEqual([
      'Assist visée (Lockheed)',
      'Canon',
    ]);
  });
});

describe('prepareVehicleWeaponAttack RR rules', () => {
  const autopilotRR = { rrType: 'attribute', rrTarget: 'autopilot', rrValue: 1 };
  const genericRR = { rrType: 'skill', rrTarget: '', rrValue: 1 };
  const perceptionRR = { rrType: 'skill', rrTarget: 'perception', rrValue: 1 };

  it('applies autopilot-targeted RR from any active feat', () => {
    const weapon = makeFeat('Canon', [], { featType: 'weapon' });
    const mod = makeFeat('Pilote amélioré', [autopilotRR]);
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', [weapon, mod]);

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toEqual([{ featName: 'Pilote amélioré', rrValue: 1 }]);
  });

  it("applies the rolled weapon's own generic RR, and drone-level generic RR, but not another weapon's", () => {
    const weapon = makeFeat('Canon', [genericRR], { featType: 'weapon' });
    const otherWeapon = makeFeat('Mitrailleuse', [genericRR], { featType: 'weapon', id: 'other' });
    const mod = makeFeat('Gyrostab', [genericRR]);
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', [weapon, otherWeapon, mod]);

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList.map((rr: any) => rr.featName).sort()).toEqual(['Canon', 'Gyrostab']);
  });

  it('does not apply skill-targeted RR to the autopilot roll', () => {
    const weapon = makeFeat('Canon', [], { featType: 'weapon' });
    const mod = makeFeat('Optique avancée', [perceptionRR]);
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', [weapon, mod]);

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toEqual([]);
  });

  it("counts an inactive rolled weapon's own autopilot/generic RR exactly once", () => {
    const weapon = makeFeat('Canon', [autopilotRR, genericRR], { featType: 'weapon' });
    weapon.system.active = false;
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', [weapon]);

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toHaveLength(2);
  });

  it("counts an active rolled weapon's autopilot RR exactly once (no double scan)", () => {
    const weapon = makeFeat('Canon', [autopilotRR], { featType: 'weapon' });
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', [weapon]);

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toEqual([{ featName: 'Canon', rrValue: 1 }]);
  });
});

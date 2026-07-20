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

const makeWeapon = (name: string, rrList: any[] = [], opts: any = {}) => ({
  id: opts.id || name,
  name,
  type: 'feat',
  system: { active: true, featType: 'weapon', rrList, ...opts.system },
});

const makeVehicle = (name: string, uuid: string, opts: { items?: any[], rrList?: any[] } = {}) => ({
  uuid,
  type: 'vehicle',
  name,
  items: opts.items || [],
  system: { attributes: { autopilot: 6 }, vehicleType: '', rrList: opts.rrList || [] },
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
    const drone = makeVehicle('Lockheed', 'Actor.abc');
    const npc = { uuid: 'Actor.def', type: 'npc' };
    (globalThis as any).game.actors = {
      find: (fn: any) => [drone, npc].find(fn),
      get: () => null,
    };
    const actor = { system: { linkedVehicles: ['Actor.abc', 'Actor.def', 'Actor.missing'] } };
    expect(getLinkedVehicleActors(actor)).toEqual([drone]);
  });
});

describe('getRRSources with linked vehicle rrList', () => {
  const drone = makeVehicle('Lockheed', 'Actor.abc', {
    rrList: [
      { rrType: 'skill', rrTarget: 'perception', rrValue: 1, rrLabel: 'Surveillance' },
      { rrType: 'skill', rrTarget: '', rrValue: 1 },
    ],
  });

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

  it("includes a linked drone's targeted RR in the owner's sources, with the drone as source", () => {
    const sources = getRRSources(actor, 'skill', 'perception');
    expect(sources).toEqual([
      {
        featName: 'Lockheed',
        rrValue: 1,
        rrLabel: 'Surveillance',
        sourceFeatName: 'Lockheed',
      },
    ]);
  });

  it('does not match untargeted drone entries on skill lookups', () => {
    const sources = getRRSources(actor, 'skill', 'furtivite');
    expect(sources).toEqual([]);
  });

  it('still returns the actor own feat RR alongside drone RR', () => {
    const actorWithFeat = {
      items: [
        {
          type: 'feat',
          name: 'Optique cyber',
          system: { active: true, rrList: [{ rrType: 'skill', rrTarget: 'perception', rrValue: 1 }] },
        },
      ],
      system: { linkedVehicles: ['Actor.abc'] },
    };
    const sources = getRRSources(actorWithFeat, 'skill', 'perception');
    expect(sources.map((s: any) => s.featName).sort()).toEqual(['Lockheed', 'Optique cyber']);
  });
});

describe('calculateAttackPool with drone RR', () => {
  it("counts a drone rrList entry targeting the control skill alongside the weapon's own RR", () => {
    const drone = makeVehicle('Lockheed', 'Actor.abc', {
      rrList: [{ rrType: 'skill', rrTarget: 'ingenierie', rrValue: 1 }],
    });
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

    // The weapon itself carries a generic RR passed via itemRRList
    const itemRRList = [{ rrType: 'skill', rrTarget: '', rrValue: 1, featName: 'Canon' }];
    const result = calculateAttackPool(actor, skillSpecResult, itemRRList, 'Canon');

    expect(result.totalRR).toBe(2);
    expect(result.allRRSources.map((s: any) => s.featName).sort()).toEqual(['Canon', 'Lockheed']);
  });

  it('does not double count when the drone shares its name with the rolled item', () => {
    const drone = makeVehicle('Canon', 'Actor.abc', {
      rrList: [{ rrType: 'skill', rrTarget: 'ingenierie', rrValue: 1 }],
    });
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

    // itemName matches the drone name: the drone entry is excluded as "own item"
    const result = calculateAttackPool(actor, skillSpecResult, [], 'Canon');
    expect(result.totalRR).toBe(0);
  });
});

describe('prepareVehicleWeaponAttack RR rules', () => {
  const autopilotRR = { rrType: 'attribute', rrTarget: 'autopilot', rrValue: 1 };
  const genericRR = { rrType: 'skill', rrTarget: '', rrValue: 1 };
  const perceptionRR = { rrType: 'skill', rrTarget: 'perception', rrValue: 1 };

  it('applies autopilot-targeted RR from any active weapon feat', () => {
    const weapon = makeWeapon('Canon');
    const otherWeapon = makeWeapon('Tourelle', [autopilotRR], { id: 'other' });
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', { items: [weapon, otherWeapon] });

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toEqual([{ featName: 'Tourelle', rrValue: 1 }]);
  });

  it("applies the rolled weapon's own generic RR but not another weapon's", () => {
    const weapon = makeWeapon('Canon', [genericRR]);
    const otherWeapon = makeWeapon('Mitrailleuse', [genericRR], { id: 'other' });
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', { items: [weapon, otherWeapon] });

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toEqual([{ featName: 'Canon', rrValue: 1 }]);
  });

  it("applies the vehicle's generic and autopilot-targeted rrList entries, not skill-targeted ones", () => {
    const weapon = makeWeapon('Canon');
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', {
      items: [weapon],
      rrList: [genericRR, autopilotRR, perceptionRR],
    });

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toEqual([
      { featName: 'Lockheed', rrValue: 1 },
      { featName: 'Lockheed', rrValue: 1 },
    ]);
  });

  it("counts an inactive rolled weapon's own autopilot/generic RR exactly once", () => {
    const weapon = makeWeapon('Canon', [autopilotRR, genericRR]);
    weapon.system.active = false;
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', { items: [weapon] });

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toHaveLength(2);
  });

  it("counts an active rolled weapon's autopilot RR exactly once (no double scan)", () => {
    const weapon = makeWeapon('Canon', [autopilotRR]);
    const vehicle = makeVehicle('Lockheed', 'Actor.abc', { items: [weapon] });

    const { rrList } = prepareVehicleWeaponAttack(vehicle, weapon);
    expect(rrList).toEqual([{ featName: 'Canon', rrValue: 1 }]);
  });
});

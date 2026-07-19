import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// item-search is imported transitively by sheet-helpers. Mirror the real
// normalizeSearchText behaviour we rely on (lowercase, strip parenthesised text).
vi.mock('../../../item-search.js', () => ({
  normalizeSearchText: (t: string) =>
    (t ?? '').toLowerCase().replace(/ ?\(.*\)/g, ''),
}));

const { filterItemRRForRoll, calculateAttackPool } = await import('../helpers/sheet-helpers.js');

beforeEach(() => {
  (globalThis as any).game = { items: null, i18n: { localize: (k: string) => k } };
});
afterEach(() => {
  delete (globalThis as any).SRA2_SLUG_METADATA_CACHE;
  delete (globalThis as any).game;
});

describe('filterItemRRForRoll', () => {
  const stealthRR = { rrType: 'skill', rrTarget: 'stealth', rrValue: 2 };
  const untargetedRR = { rrType: 'skill', rrTarget: '', rrValue: 1 };
  const specRR = { rrType: 'specialization', rrTarget: 'spec_pistols', rrValue: 1 };

  it('keeps untargeted entries (generic RR for the item\'s own rolls)', () => {
    expect(filterItemRRForRoll([untargetedRR], ['ranged-weapons'])).toEqual([untargetedRR]);
  });

  it('drops entries targeting another skill (Puzzler case: stealth RR on an attack roll)', () => {
    expect(filterItemRRForRoll([stealthRR], ['ranged-weapons', 'Armes à distance', 'agility'])).toEqual([]);
  });

  it('keeps entries targeting the rolled skill (slug match)', () => {
    const attackRR = { rrType: 'skill', rrTarget: 'ranged-weapons', rrValue: 1 };
    expect(filterItemRRForRoll([attackRR], ['ranged-weapons'])).toEqual([attackRR]);
  });

  it('keeps entries targeting the rolled skill by localized name (case/parenthesis-insensitive)', () => {
    const attackRR = { rrType: 'skill', rrTarget: 'Armes à distance', rrValue: 1 };
    expect(filterItemRRForRoll([attackRR], ['armes à distance (tir)'])).toEqual([attackRR]);
  });

  it('keeps spec-targeted entries only when the spec is among the roll targets', () => {
    expect(filterItemRRForRoll([specRR], ['ranged-weapons', 'spec_pistols'])).toEqual([specRR]);
    expect(filterItemRRForRoll([specRR], ['ranged-weapons'])).toEqual([]);
  });

  it('ignores undefined roll targets', () => {
    expect(filterItemRRForRoll([stealthRR], [undefined, undefined])).toEqual([]);
  });
});

describe('calculateAttackPool item RR filtering', () => {
  const makeActor = (items: any[]) => ({ items });

  const skillSpecResult = {
    skillName: 'Armes à distance',
    skillLevel: 6,
    specName: undefined,
    specLevel: undefined,
    linkedAttribute: 'agility',
  };

  it('does not apply weapon RR targeting another skill to the attack roll', () => {
    const actor = makeActor([
      { type: 'skill', name: 'Armes à distance', system: { slug: 'ranged-weapons' } },
    ]);
    const puzzlerRRList = [{ rrType: 'skill', rrTarget: 'stealth', rrValue: 2 }];

    const result = calculateAttackPool(actor as any, skillSpecResult as any, puzzlerRRList, 'Shiawase Arms Puzzler');

    expect(result.totalRR).toBe(0);
  });

  it('still applies untargeted weapon RR to the attack roll', () => {
    const actor = makeActor([
      { type: 'skill', name: 'Armes à distance', system: { slug: 'ranged-weapons' } },
    ]);
    const rrList = [{ rrType: 'skill', rrTarget: '', rrValue: 1 }];

    const result = calculateAttackPool(actor as any, skillSpecResult as any, rrList, 'Smartgun');

    expect(result.totalRR).toBe(1);
  });

  it('applies weapon RR targeting the attack skill exactly once', () => {
    const weapon = {
      type: 'feat',
      name: 'Custom Rifle',
      system: {
        active: true,
        featType: 'weapon',
        rrList: [{ rrType: 'skill', rrTarget: 'ranged-weapons', rrValue: 1 }],
      },
    };
    const actor = makeActor([
      { type: 'skill', name: 'Armes à distance', system: { slug: 'ranged-weapons' } },
      weapon,
    ]);

    const result = calculateAttackPool(actor as any, skillSpecResult as any, weapon.system.rrList, 'Custom Rifle');

    expect(result.totalRR).toBe(1);
  });
});

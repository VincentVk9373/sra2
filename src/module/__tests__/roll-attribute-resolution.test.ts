import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// item-search is imported transitively by sheet-helpers. Mirror the real
// normalizeSearchText behaviour we rely on (lowercase, strip parenthesised text).
vi.mock('../../../item-search.js', () => ({
  normalizeSearchText: (t: string) =>
    (t ?? '').toLowerCase().replace(/ ?\(.*\)/g, ''),
}));

const { findAttackSkillAndSpec, getDefaultAttributeForSkill } = await import('../helpers/sheet-helpers.js');

// Minimal `game` global used by _resolveSkillNameFromSlug fallback paths.
beforeEach(() => {
  (globalThis as any).game = { items: null, i18n: { localize: (k: string) => k } };
});
afterEach(() => {
  delete (globalThis as any).SRA2_SLUG_METADATA_CACHE;
  delete (globalThis as any).game;
});

function makeSkill(slug: string, name: string, linkedAttribute: string, rating: number) {
  return { type: 'skill', name, system: { slug, linkedAttribute, rating } };
}

function makeActor(items: any[], attributes: Record<string, number>) {
  return { items, system: { attributes } };
}

describe('getDefaultAttributeForSkill', () => {
  it('resolves canonical weapon skills from the static map', () => {
    expect(getDefaultAttributeForSkill('ranged-weapons')).toBe('agility');
    // close-combat is Agility in Anarchy (matches the compendium & sheet), not Strength
    expect(getDefaultAttributeForSkill('close-combat')).toBe('agility');
    expect(getDefaultAttributeForSkill('athletics')).toBe('strength');
  });

  it('prefers the runtime metadata cache over the static map', () => {
    (globalThis as any).SRA2_SLUG_METADATA_CACHE = {
      'ranged-weapons': { linkedAttribute: 'logic' },
    };
    expect(getDefaultAttributeForSkill('ranged-weapons')).toBe('logic');
  });

  it('returns undefined for an unknown skill', () => {
    expect(getDefaultAttributeForSkill('made-up-skill')).toBeUndefined();
    expect(getDefaultAttributeForSkill('')).toBeUndefined();
  });
});

describe('findAttackSkillAndSpec — issue #116 (missing specialization)', () => {
  it('uses the owned skill attribute when the linked spec is not owned', () => {
    // Actor owns "Ranged Weapons" (agility, rating 1) but NOT the "Pistols" spec.
    const actor = makeActor(
      [makeSkill('ranged-weapons', 'Ranged Weapons', 'agility', 1)],
      { strength: 2, agility: 3 }
    );

    const res = findAttackSkillAndSpec(actor, 'spec_pistols', 'ranged-weapons', {
      defaultAttribute: 'strength',
    });

    expect(res.linkedAttribute).toBe('agility'); // not strength
    expect(res.specName).toBeUndefined();
    expect(res.skillName).toBe('Ranged Weapons');
    expect(res.skillLevel).toBe(1 + 3); // skill rating + agility
  });

  it('falls back to the skill-slug attribute when neither skill nor spec is owned', () => {
    const actor = makeActor([], { strength: 2, agility: 3 });

    const res = findAttackSkillAndSpec(actor, 'spec_pistols', 'ranged-weapons', {
      defaultAttribute: 'strength',
    });

    // Must resolve agility from the slug, never the passed-in strength default.
    expect(res.linkedAttribute).toBe('agility');
    expect(res.skillLevel).toBe(0 + 3); // 0 rating + agility
  });

  it('resolves close-combat weapons to agility even when unowned', () => {
    const actor = makeActor([], { strength: 4, agility: 2 });

    const res = findAttackSkillAndSpec(actor, 'spec_blades', 'close-combat', {
      defaultAttribute: 'strength',
    });

    expect(res.linkedAttribute).toBe('agility');
    expect(res.skillLevel).toBe(0 + 2);
  });

  it('honours the slug-derived default even when the spec is owned but its parent skill is not', () => {
    // Actor owns the "Pistols" spec (no explicit linkedAttribute) but not the
    // parent "Ranged Weapons" skill. The builder now passes the slug-derived
    // default (agility), which must win over a bare Strength fallback.
    const pistolsSpec = {
      type: 'specialization',
      name: 'Spec: Pistols',
      system: { slug: 'spec_pistols', linkedSkill: 'ranged-weapons', linkedAttribute: '' },
    };
    const actor = makeActor([pistolsSpec], { strength: 2, agility: 3 });

    const res = findAttackSkillAndSpec(actor, 'spec_pistols', 'ranged-weapons', {
      defaultAttribute: 'agility', // what _rollWeaponOrSpell now derives from the slug
      lookupBySlug: true,
    });

    expect(res.specName).toBe('Spec: Pistols');
    expect(res.linkedAttribute).toBe('agility'); // never Strength
  });
});

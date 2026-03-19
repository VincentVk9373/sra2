import { describe, it, expect, vi } from 'vitest';
import { DAMAGE_STEP, SPECIALIZATION_BONUS } from '../config/constants.js';

// Mock Foundry-dependent modules
vi.mock('../helpers/sheet-helpers.js', () => ({
  getSpecializationsForSkill: vi.fn(() => []),
  calculateSpecDicePool: vi.fn(() => 0),
}));

vi.mock('../models/item-feat.js', () => ({
  VEHICLE_TYPES: {},
  WEAPON_TYPES: {},
}));

// Mock item-search (imported transitively by sheet-helpers)
vi.mock('../../../item-search.js', () => ({
  normalizeSearchText: (t: string) => t?.toLowerCase() ?? '',
}));

const { calculateDamageThresholds, getDamageThresholds } = await import('../helpers/combat-helpers.js');

// ─────────────────────────────────────────────────────────
// calculateDamageThresholds  (pure function — character)
// ─────────────────────────────────────────────────────────
describe('calculateDamageThresholds', () => {
  function makeSystem(strength: number, armorLevel = 0, feats: any[] = []) {
    return {
      attributes: { strength },
      armorLevel,
      parent: { items: feats },
    };
  }

  it('light threshold equals strength when no armor', () => {
    const { light } = calculateDamageThresholds(makeSystem(3), false);
    expect(light).toBe(3);
  });

  it('severe threshold = light + DAMAGE_STEP', () => {
    const { light, severe } = calculateDamageThresholds(makeSystem(3), false);
    expect(severe).toBe(light + DAMAGE_STEP);
  });

  it('incapacitating threshold = light + DAMAGE_STEP * 2', () => {
    const { light, incapacitating } = calculateDamageThresholds(makeSystem(3), false);
    expect(incapacitating).toBe(light + DAMAGE_STEP * 2);
  });

  it('armor adds to all thresholds when included', () => {
    const noArmor = calculateDamageThresholds(makeSystem(3, 0), true);
    const withArmor = calculateDamageThresholds(makeSystem(3, 2), true);
    expect(withArmor.light).toBe(noArmor.light + 2);
    expect(withArmor.severe).toBe(noArmor.severe + 2);
    expect(withArmor.incapacitating).toBe(noArmor.incapacitating + 2);
  });

  it('armor is excluded when includeArmor = false', () => {
    const noArmor = calculateDamageThresholds(makeSystem(3, 0), false);
    const noArmorFlag = calculateDamageThresholds(makeSystem(3, 5), false);
    expect(noArmorFlag.light).toBe(noArmor.light);
  });

  it('thresholds increase with strength', () => {
    const str3 = calculateDamageThresholds(makeSystem(3), false);
    const str5 = calculateDamageThresholds(makeSystem(5), false);
    expect(str5.light).toBeGreaterThan(str3.light);
    expect(str5.severe).toBeGreaterThan(str3.severe);
    expect(str5.incapacitating).toBeGreaterThan(str3.incapacitating);
  });

  it('missing strength defaults to 1', () => {
    const { light } = calculateDamageThresholds({ parent: null }, false);
    expect(light).toBe(1);
  });

  it('feat bonuses are applied when parent.items is provided', () => {
    const feats = [
      {
        type: 'feat',
        system: { active: true, bonusPhysicalThreshold: 2, bonusMentalThreshold: 0 },
      },
    ];
    const base = calculateDamageThresholds(makeSystem(3, 0, []), false);
    const withBonus = calculateDamageThresholds(makeSystem(3, 0, feats), false);
    expect(withBonus.light).toBe(base.light + 2);
  });

  it('inactive feats do not contribute bonuses', () => {
    const feats = [
      {
        type: 'feat',
        system: { active: false, bonusPhysicalThreshold: 5, bonusMentalThreshold: 0 },
      },
    ];
    const base = calculateDamageThresholds(makeSystem(3, 0, []), false);
    const withInactiveFeat = calculateDamageThresholds(makeSystem(3, 0, feats), false);
    expect(withInactiveFeat.light).toBe(base.light);
  });
});

// ─────────────────────────────────────────────────────────
// getDamageThresholds  (reads actor.type + actor.system)
// ─────────────────────────────────────────────────────────
describe('getDamageThresholds', () => {
  function makeActor(type: string, thresholds?: object) {
    return {
      type,
      system: {
        damageThresholds: thresholds,
      },
    };
  }

  describe('ICE actors', () => {
    it('returns ICE defaults when no system thresholds set (light=1, severe=2, incapacitating=3)', () => {
      const actor = makeActor('ice');
      const t = getDamageThresholds(actor);
      expect(t.light).toBe(1);
      expect(t.severe).toBe(2);
      expect(t.incapacitating).toBe(3);
    });

    it('uses system thresholds when available for ICE', () => {
      const actor = makeActor('ice', { light: 2, severe: 4, incapacitating: 6 });
      const t = getDamageThresholds(actor);
      expect(t.light).toBe(2);
    });
  });

  describe('Vehicle actors', () => {
    it('returns vehicle defaults when no system thresholds (light=1, severe=4, incapacitating=7)', () => {
      const actor = makeActor('vehicle');
      const t = getDamageThresholds(actor);
      expect(t.light).toBe(1);
      expect(t.severe).toBe(4);
      expect(t.incapacitating).toBe(7);
    });

    it('vehicle severe–light gap is 3, incapacitating–light gap is 6', () => {
      const actor = makeActor('vehicle');
      const t = getDamageThresholds(actor);
      // Default vehicle thresholds: 1/4/7 → gaps of 3 and 6
      expect(t.severe! - t.light).toBe(3);
      expect(t.incapacitating - t.light).toBe(6);
    });
  });

  describe('Character actors — mental damage', () => {
    it('returns mental defaults when no system thresholds (light=1, severe=4, incapacitating=7)', () => {
      const actor = makeActor('character');
      const t = getDamageThresholds(actor, 'mental');
      expect(t.light).toBe(1);
      expect(t.severe).toBe(4);
      expect(t.incapacitating).toBe(7);
    });

    it('uses system.damageThresholds.mental when set', () => {
      const actor = makeActor('character', { mental: { light: 3, severe: 6, incapacitating: 9 } });
      const t = getDamageThresholds(actor, 'mental');
      expect(t.light).toBe(3);
    });
  });

  describe('Character actors — matrix damage', () => {
    it('returns matrix zeros by default', () => {
      const actor = makeActor('character');
      const t = getDamageThresholds(actor, 'matrix');
      expect(t.light).toBe(0);
      expect(t.incapacitating).toBe(0);
    });
  });

  describe('Character actors — physical damage (default)', () => {
    it('uses withArmor thresholds by default', () => {
      const actor = makeActor('character', {
        withArmor: { light: 5, severe: 8, incapacitating: 11 },
      });
      const t = getDamageThresholds(actor);
      expect(t.light).toBe(5);
    });

    it('falls back to defaults when withArmor not set', () => {
      const actor = makeActor('character');
      const t = getDamageThresholds(actor);
      expect(t.light).toBe(1);
      expect(t.severe).toBe(4);
      expect(t.incapacitating).toBe(7);
    });
  });
});

// ─────────────────────────────────────────────────────────
// SPECIALIZATION_BONUS integration check
// ─────────────────────────────────────────────────────────
describe('SPECIALIZATION_BONUS', () => {
  it('specialization effective rating = skillRating + SPECIALIZATION_BONUS', () => {
    const skillRating = 4;
    const effectiveRating = skillRating + SPECIALIZATION_BONUS;
    expect(effectiveRating).toBe(6);
  });
});

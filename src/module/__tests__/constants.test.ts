import { describe, it, expect } from 'vitest';
import {
  DELAYS,
  RR_MAX,
  ACTOR_ATTRIBUTES,
  SUCCESS_THRESHOLDS,
  DAMAGE_STEP,
  DAMAGE_BOX_DEFAULTS,
  SPECIALIZATION_BONUS,
  RISK_DICE_SUCCESS_MULTIPLIER,
  NARRATIVE_SAVE_DEBOUNCE,
  SKILL_NAMES,
} from '../config/constants.js';

describe('constants', () => {
  describe('DELAYS', () => {
    it('should have all required delay keys', () => {
      expect(DELAYS.SEARCH_DEBOUNCE).toBe(300);
      expect(DELAYS.SEARCH_HIDE).toBe(200);
      expect(DELAYS.SEARCH_HIDE_LONG).toBe(300);
      expect(DELAYS.SHEET_RENDER).toBe(100);
      expect(DELAYS.UI_RETRY).toBe(500);
      expect(DELAYS.BUTTON_REENABLE).toBe(1000);
    });

    it('SEARCH_HIDE should be shorter than SEARCH_DEBOUNCE for correct UX order', () => {
      expect(DELAYS.SEARCH_HIDE).toBeLessThan(DELAYS.SEARCH_DEBOUNCE);
    });

    it('SHEET_RENDER should be the shortest delay', () => {
      expect(DELAYS.SHEET_RENDER).toBeLessThan(DELAYS.SEARCH_HIDE);
    });
  });

  describe('RR_MAX', () => {
    it('should be 3 (maximum RR level in the system)', () => {
      expect(RR_MAX).toBe(3);
    });
  });

  describe('ACTOR_ATTRIBUTES', () => {
    it('should contain all 5 core attributes', () => {
      expect(ACTOR_ATTRIBUTES).toHaveLength(5);
      expect(ACTOR_ATTRIBUTES).toContain('strength');
      expect(ACTOR_ATTRIBUTES).toContain('agility');
      expect(ACTOR_ATTRIBUTES).toContain('willpower');
      expect(ACTOR_ATTRIBUTES).toContain('logic');
      expect(ACTOR_ATTRIBUTES).toContain('charisma');
    });
  });

  describe('SUCCESS_THRESHOLDS', () => {
    it('advantage threshold should be lowest (more ways to succeed)', () => {
      expect(SUCCESS_THRESHOLDS.advantage).toBeLessThan(SUCCESS_THRESHOLDS.normal);
    });

    it('disadvantage threshold should be highest (harder to succeed)', () => {
      expect(SUCCESS_THRESHOLDS.disadvantage).toBeGreaterThan(SUCCESS_THRESHOLDS.normal);
    });

    it('all thresholds should be valid d6 values (1-6)', () => {
      for (const threshold of Object.values(SUCCESS_THRESHOLDS)) {
        expect(threshold).toBeGreaterThanOrEqual(1);
        expect(threshold).toBeLessThanOrEqual(6);
      }
    });
  });

  describe('DAMAGE_STEP', () => {
    it('should be 3 (increment between severity levels)', () => {
      expect(DAMAGE_STEP).toBe(3);
    });

    it('double step should equal 6 (light to incapacitating)', () => {
      expect(DAMAGE_STEP * 2).toBe(6);
    });
  });

  describe('DAMAGE_BOX_DEFAULTS', () => {
    it('base character should have 2 light damage boxes', () => {
      expect(DAMAGE_BOX_DEFAULTS.LIGHT).toBe(2);
    });

    it('base character should have 1 severe damage box', () => {
      expect(DAMAGE_BOX_DEFAULTS.SEVERE).toBe(1);
    });

    it('base character should have 3 anarchy boxes', () => {
      expect(DAMAGE_BOX_DEFAULTS.ANARCHY).toBe(3);
    });
  });

  describe('SPECIALIZATION_BONUS', () => {
    it('should be +2 (standard specialization bonus in Shadowrun Anarchy)', () => {
      expect(SPECIALIZATION_BONUS).toBe(2);
    });
  });

  describe('RISK_DICE_SUCCESS_MULTIPLIER', () => {
    it('should be 2 (risk dice successes count double)', () => {
      expect(RISK_DICE_SUCCESS_MULTIPLIER).toBe(2);
    });
  });

  describe('NARRATIVE_SAVE_DEBOUNCE', () => {
    it('should be 500ms', () => {
      expect(NARRATIVE_SAVE_DEBOUNCE).toBe(500);
    });

    it('should be longer than SEARCH_DEBOUNCE (text areas need more stability)', () => {
      expect(NARRATIVE_SAVE_DEBOUNCE).toBeGreaterThan(DELAYS.SEARCH_DEBOUNCE);
    });
  });

  describe('SKILL_NAMES', () => {
    it('should have sorcellerie skill name', () => {
      expect(SKILL_NAMES.SORCELLERIE).toBe('sorcellerie');
    });

    it('should have conjuration skill name', () => {
      expect(SKILL_NAMES.CONJURATION).toBe('conjuration');
    });

    it('should have close combat skill name', () => {
      expect(SKILL_NAMES.CLOSE_COMBAT).toBe('Combat rapproché');
    });
  });
});

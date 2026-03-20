/**
 * System-wide constants for SRA2
 * Centralizes magic numbers and hardcoded strings to improve maintainability.
 */

/** Timeout delays in milliseconds */
export const DELAYS = {
  /** Debounce delay for search inputs */
  SEARCH_DEBOUNCE: 300,
  /** Delay before hiding search results on blur, to allow clicking results */
  SEARCH_HIDE: 200,
  /** Longer blur delay to allow button clicks within results to register */
  SEARCH_HIDE_LONG: 300,
  /** Small delay to ensure derived data and sheets re-render in correct order */
  SHEET_RENDER: 100,
  /** Retry delay for UI elements that may not be rendered yet */
  UI_RETRY: 500,
  /** Delay before re-enabling a button after action */
  BUTTON_REENABLE: 1000,
} as const;

/** Maximum RR (Risk Reduction) level */
export const RR_MAX = 3;

/** Default attribute when none is specified */
export const DEFAULT_ATTRIBUTE = 'strength';

/** All actor attribute names in display order */
export const ACTOR_ATTRIBUTES = ['strength', 'agility', 'willpower', 'logic', 'charisma'] as const;
export type ActorAttribute = typeof ACTOR_ATTRIBUTES[number];

/** Success thresholds by roll mode (minimum die value that counts as a success) */
export const SUCCESS_THRESHOLDS = {
  advantage: 4,    // 4, 5, 6 = success
  normal: 5,       // 5, 6 = success
  disadvantage: 6, // only 6 = success
} as const;
export type RollMode = keyof typeof SUCCESS_THRESHOLDS;

/** Skill names used as identifiers across the system */
export const SKILL_NAMES = {
  SORCELLERIE: 'sorcellerie',
  CONJURATION: 'conjuration',
  TECHNOMANCIE: 'technomancie',
  PIRATAGE: 'piratage',
  CLOSE_COMBAT: 'Combat rapproché',
} as const;

/**
 * Damage threshold step between severity levels.
 * light → severe = +DAMAGE_STEP, light → incapacitating = +DAMAGE_STEP * 2
 */
export const DAMAGE_STEP = 3;

/**
 * Default number of damage boxes per severity level.
 * Actors start with 2 light boxes and 1 severe box before feats modify them.
 */
export const DAMAGE_BOX_DEFAULTS = {
  LIGHT: 2,
  SEVERE: 1,
  ANARCHY: 3,
} as const;

/**
 * Bonus to effective dice pool when using a specialization instead of base skill.
 * A specialization adds +2 to the skill rating for threshold/comparison purposes.
 */
export const SPECIALIZATION_BONUS = 2;

/**
 * Risk dice successes count as this many normal successes each.
 */
export const RISK_DICE_SUCCESS_MULTIPLIER = 2;

/**
 * Debounce delay (ms) for saving long-text fields like narrative effects.
 */
export const NARRATIVE_SAVE_DEBOUNCE = 500;

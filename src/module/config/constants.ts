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

/** Language-independent skill identifiers (slugs stored in item.system.slug) */
export const SKILL_SLUGS = {
  ATHLETICS: 'athletics',
  CLOSE_COMBAT: 'close-combat',
  RANGED_WEAPONS: 'ranged-weapons',
  STEALTH: 'stealth',
  HACKING: 'hacking',
  ENGINEERING: 'engineering',
  BIOTECH: 'biotech',
  PILOTING: 'piloting',
  PERCEPTION: 'perception',
  SURVIVAL: 'survival',
  SORCERY: 'sorcery',
  CONJURATION: 'conjuration',
  TECHNOMANCY: 'technomancy',
  INFLUENCE: 'influence',
  DECEPTION: 'deception',
  INTIMIDATION: 'intimidation',
} as const;
export type SkillSlug = typeof SKILL_SLUGS[keyof typeof SKILL_SLUGS];

/** Language-independent specialization identifiers (slugs stored in item.system.slug) */
export const SPEC_SLUGS = {
  // Close combat
  BARE_HANDS: 'bare-hands',
  BLADES: 'blades',
  BLUNT_WEAPONS: 'blunt-weapons',
  DEFENSE: 'defense',
  // Ranged
  THROWING: 'throwing',
  PROJECTILE: 'projectile',
  PISTOLS: 'pistols',
  SMGS: 'smgs',
  RIFLES: 'rifles',
  GRENADE_LAUNCHERS: 'grenade-launchers',
  HEAVY_WEAPONS: 'heavy-weapons',
  RANGED_DEFENSE: 'ranged-defense',
  // Hacking
  CYBERCOMBAT: 'cybercombat',
  BRUTE_FORCE: 'brute-force',
  BACKDOOR: 'backdoor',
  // Sorcery
  COMBAT_SPELLS: 'combat-spells',
  DETECTION_SPELLS: 'detection-spells',
  HEALTH_SPELLS: 'health-spells',
  ILLUSION_SPELLS: 'illusion-spells',
  MANIPULATION_SPELLS: 'manipulation-spells',
  COUNTERSPELL: 'counterspell',
  // Technomancy
  COMPLEX_FORMS: 'complex-forms',
  COMPILATION: 'compilation',
  DECOMPILATION: 'decompilation',
  // Engineering
  REMOTE_WEAPONS: 'remote-weapons',
} as const;
export type SpecSlug = typeof SPEC_SLUGS[keyof typeof SPEC_SLUGS];

/** Default attribute for each skill, indexed by slug AND normalized French names (for fallback) */
export const SKILL_DEFAULT_ATTRIBUTES: Record<string, string> = {
  // By slug (preferred)
  [SKILL_SLUGS.ATHLETICS]: 'strength',
  [SKILL_SLUGS.CLOSE_COMBAT]: 'strength',
  [SKILL_SLUGS.RANGED_WEAPONS]: 'agility',
  [SKILL_SLUGS.STEALTH]: 'agility',
  [SKILL_SLUGS.PILOTING]: 'agility',
  [SKILL_SLUGS.HACKING]: 'logic',
  [SKILL_SLUGS.ENGINEERING]: 'logic',
  [SKILL_SLUGS.BIOTECH]: 'logic',
  [SKILL_SLUGS.PERCEPTION]: 'willpower',
  [SKILL_SLUGS.SURVIVAL]: 'willpower',
  [SKILL_SLUGS.SORCERY]: 'willpower',
  [SKILL_SLUGS.CONJURATION]: 'willpower',
  [SKILL_SLUGS.TECHNOMANCY]: 'willpower',
  [SKILL_SLUGS.INFLUENCE]: 'charisma',
  [SKILL_SLUGS.DECEPTION]: 'charisma',
  [SKILL_SLUGS.INTIMIDATION]: 'charisma',
  // By normalized French name (fallback for items without slug)
  'athletisme': 'strength',
  'combat rapproche': 'strength',
  'armes a distance': 'agility',
  'furtivite': 'agility',
  'pilotage': 'agility',
  'piratage': 'logic',
  'ingenierie': 'logic',
  'biotech': 'logic',
  'perception': 'willpower',
  'survie': 'willpower',
  'sorcellerie': 'willpower',
  'conjuration': 'willpower',
  'technomancie': 'willpower',
  'influence': 'charisma',
  'tromperie': 'charisma',
  'intimidation': 'charisma',
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

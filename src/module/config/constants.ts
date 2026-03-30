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

/** Canonical skill slugs — language-independent identifiers */
export const SKILL_SLUGS = {
  CLOSE_COMBAT: 'close-combat',
  RANGED_WEAPONS: 'ranged-weapons',
  ATHLETICS: 'athletics',
  STEALTH: 'stealth',
  CRACKING: 'cracking',
  ENGINEERING: 'engineering',
  ELECTRONICS: 'electronics',
  PILOTING: 'piloting',
  SORCERY: 'sorcery',
  CONJURATION: 'conjuration',
  TECHNOMANCER: 'technomancer',
  INFLUENCE: 'influence',
  PERCEPTION: 'perception',
  SURVIVAL: 'survival',
  NETWORKING: 'networking',
  ASTRAL_COMBAT: 'astral-combat',
} as const;
export type SkillSlug = typeof SKILL_SLUGS[keyof typeof SKILL_SLUGS];

/**
 * Maps localized skill names (FR and EN, lowercased without accents) to canonical slugs.
 * Used by the migration and for runtime slug resolution.
 */
export const SKILL_NAME_TO_SLUG: Record<string, SkillSlug> = {
  // FR
  'combat rapproche': SKILL_SLUGS.CLOSE_COMBAT,
  'armes a distance': SKILL_SLUGS.RANGED_WEAPONS,
  'athletisme': SKILL_SLUGS.ATHLETICS,
  'furtivite': SKILL_SLUGS.STEALTH,
  'piratage': SKILL_SLUGS.CRACKING,
  'ingenierie': SKILL_SLUGS.ENGINEERING,
  'electronique': SKILL_SLUGS.ELECTRONICS,
  'pilotage': SKILL_SLUGS.PILOTING,
  'sorcellerie': SKILL_SLUGS.SORCERY,
  'conjuration': SKILL_SLUGS.CONJURATION,
  'technomancie': SKILL_SLUGS.TECHNOMANCER,
  'influence': SKILL_SLUGS.INFLUENCE,
  'perception': SKILL_SLUGS.PERCEPTION,
  'survie': SKILL_SLUGS.SURVIVAL,
  'reseau': SKILL_SLUGS.NETWORKING,
  'combat astral': SKILL_SLUGS.ASTRAL_COMBAT,
  // EN
  'close combat': SKILL_SLUGS.CLOSE_COMBAT,
  'ranged weapons': SKILL_SLUGS.RANGED_WEAPONS,
  'athletics': SKILL_SLUGS.ATHLETICS,
  'stealth': SKILL_SLUGS.STEALTH,
  'cracking': SKILL_SLUGS.CRACKING,
  'engineering': SKILL_SLUGS.ENGINEERING,
  'electronics': SKILL_SLUGS.ELECTRONICS,
  'piloting': SKILL_SLUGS.PILOTING,
  'sorcery': SKILL_SLUGS.SORCERY,
  'technomancer': SKILL_SLUGS.TECHNOMANCER,
  'survival': SKILL_SLUGS.SURVIVAL,
  'networking': SKILL_SLUGS.NETWORKING,
  'astral combat': SKILL_SLUGS.ASTRAL_COMBAT,
  // Old wrong names
  'corps a corps': SKILL_SLUGS.CLOSE_COMBAT,
  'arme a distance': SKILL_SLUGS.RANGED_WEAPONS,
  'hacking': SKILL_SLUGS.CRACKING,
} as const;

/**
 * Canonical slugs for specializations (based on EN names, prefixed with spec_).
 */
export const SPEC_SLUGS = {
  ACADEMIC: 'spec_academic',
  AIR_SPIRITS: 'spec_air-spirits',
  ANIMAL_TRAINING: 'spec_animal-training',
  AQUATIC_DRONES: 'spec_aquatic-drones',
  AQUATIC_VEHICLES: 'spec_aquatic-vehicles',
  ASTRAL_COMBAT: 'spec_astral-combat',
  ASTRAL_PERCEPTION: 'spec_astral-perception',
  ASTRAL_STEALTH: 'spec_astral-stealth',
  BACKDOOR: 'spec_backdoor',
  BANISHING: 'spec_banishing',
  BEAST_SPIRITS: 'spec_beast-spirits',
  BIKES: 'spec_bikes',
  BLADES: 'spec_blades',
  BLUFF: 'spec_bluff',
  BLUNT_WEAPONS: 'spec_blunt-weapons',
  BRUTE_FORCE: 'spec_brute-force',
  CARS: 'spec_cars',
  CLIMBING: 'spec_climbing',
  COMBAT_SPELLS: 'spec_combat-spells',
  COMPILATION: 'spec_compilation',
  COMPLEX_FORMS: 'spec_complex-forms',
  COMPOSURE: 'spec_composure',
  CORPORATE: 'spec_corporate',
  COUNTERSPELLING: 'spec_counterspelling',
  CR_DRONES: 'spec_cr-drones',
  CRIMINAL: 'spec_criminal',
  CR_MECHANICAL_DEVICES: 'spec_cr-mechanical-devices',
  CR_VEHICLES: 'spec_cr-vehicles',
  CYBERCOMBAT: 'spec_cybercombat',
  CYBERNETICS: 'spec_cybernetics',
  DECOMPILATION: 'spec_decompilation',
  DEFENSE: 'spec_defense',
  DETECTION_SPELLS: 'spec_detection-spells',
  EARTH_SPIRITS: 'spec_earth-spirits',
  ELECTRONIC_WARFARE: 'spec_electronic-warfare',
  ENGINEERING: 'spec_engineering',
  ETIQUETTE: 'spec_etiquette',
  EXPLOSIVES: 'spec_explosives',
  FANGS: 'spec_fangs',
  FIRE_SPIRITS: 'spec_fire-spirits',
  FIRST_AID: 'spec_first-aid',
  FLYING_DRONES: 'spec_flying-drones',
  FLYING_VEHICLES: 'spec_flying-vehicles',
  GOVERNMENT: 'spec_government',
  GRENADE_LAUNCHERS: 'spec_grenade-launchers',
  GROUND_DRONES: 'spec_ground-drones',
  HEALTH_SPELLS: 'spec_health-spells',
  HEAVY_WEAPONS: 'spec_heavy-weapons',
  ILLUSION_SPELLS: 'spec_illusion-spells',
  IMPERSONATION: 'spec_impersonation',
  INTIMIDATION: 'spec_intimidation',
  KIN_SPIRITS: 'spec_kin-spirits',
  LA_RUE: 'spec_la-rue',
  LOCKPICKING: 'spec_lockpicking',
  MAGIC: 'spec_magic',
  MANIPULATION_SPELLS: 'spec_manipulation-spells',
  MATRIX: 'spec_matrix',
  MATRIX_PERCEPTION: 'spec_matrix-perception',
  MATRIX_PROTECTION: 'spec_matrix-protection',
  MATRIX_SEARCH: 'spec_matrix-search',
  MATRIX_STEALTH: 'spec_matrix-stealth',
  MEDIA: 'spec_media',
  MEDICAL: 'spec_medical',
  MONOFILAMENT: 'spec_monofilament',
  MOUNTED_WEAPONS: 'spec_mounted-weapons',
  NAVIGATION: 'spec_navigation',
  NEGOTIATION: 'spec_negotiation',
  PARKOUR: 'spec_parkour',
  PERSONAL_DEVICES: 'spec_personal-devices',
  PERSONAL_ELECTRONICS: 'spec_personal-electronics',
  PHYSICAL: 'spec_physical',
  PHYSICAL_PERCEPTION: 'spec_physical-perception',
  PHYSICAL_STEALTH: 'spec_physical-stealth',
  PISTOLS: 'spec_pistols',
  PLANT_SPIRITS: 'spec_plant-spirits',
  RANGED_DEFENSE: 'spec_ranged-defense',
  REMOTE_CONTROLLED_WEAPONS: 'spec_remote-controlled-weapons',
  RIFLES: 'spec_rifles',
  RUNNING: 'spec_running',
  SHOTGUNS: 'spec_shotguns',
  SMGS: 'spec_smgs',
  SOCIAL_PERCEPTION: 'spec_social-perception',
  STEALTH: 'spec_stealth',
  SWIMMING: 'spec_swimming',
  THROWN_WEAPONS: 'spec_thrown-weapons',
  TRUCKS: 'spec_trucks',
  UNARMED: 'spec_unarmed',
  WATER_SPIRITS: 'spec_water-spirits',
  WILDERNESS_SURVIVAL: 'spec_wilderness-survival',
} as const;
export type SpecSlug = typeof SPEC_SLUGS[keyof typeof SPEC_SLUGS];

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

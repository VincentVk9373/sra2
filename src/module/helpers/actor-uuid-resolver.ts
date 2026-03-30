/**
 * Actor / Token UUID resolution helpers for SRA2
 *
 * Wraps `foundry.utils.fromUuidSync` with error handling and consolidates
 * the repeated attacker/defender loading pattern used in the defense and
 * counter-attack chat-button handlers.
 */
import { SKILL_SLUGS, SPEC_SLUGS } from '../config/constants.js';
import { findSkillByName } from './sheet-helpers.js';

/**
 * Safely resolve a Foundry UUID string to a document (actor or token).
 * Returns null if the UUID is empty, invalid, or resolution throws.
 */
export function resolveUuidSync(uuid: string | undefined, label?: string): any | null {
  if (!uuid) return null;
  try {
    return (foundry.utils as any)?.fromUuidSync?.(uuid) ?? null;
  } catch (e) {
    console.warn(`SRA2 | Failed to resolve UUID${label ? ` (${label})` : ''}:`, uuid, e);
    return null;
  }
}

/**
 * Resolve the UUID of a token document.
 * Handles both plain token placeables and token documents that expose `.document.uuid`.
 */
export function resolveTokenUuid(token: any, fallback?: string): string | undefined {
  if (token) return token.uuid ?? token.document?.uuid ?? undefined;
  return fallback;
}

/**
 * Determine the "canonical" actor UUID for a combatant.
 * Prefers the token's embedded actor UUID (stable across compendium imports)
 * over the bare actor UUID.
 */
export function resolveActorUuid(token: any, actor: any): string | undefined {
  return token?.actor?.uuid ?? actor?.uuid ?? undefined;
}

export interface CombatantResult {
  actor: any | null;
  token: any | null;
}

/**
 * Load actor and token from message flag UUIDs, with a canvas-search fallback.
 *
 * Resolution priority:
 *   1. `actorUuid` flag → actor via `fromUuidSync`
 *   2. `tokenUuid` flag → token via `fromUuidSync`; token.actor used as actor if missing
 *   3. `actorId` flag  → `game.actors.get(id)` + canvas token search
 *
 * @param flags.actorUuid   UUID of the actor stored in the message flags
 * @param flags.tokenUuid   UUID of the token stored in the message flags
 * @param flags.actorId     Legacy ID-based fallback
 * @param label             Label for debug logging (e.g. 'Attacker', 'Defender')
 */
export function loadCombatantFromFlags(
  flags: { actorUuid?: string; tokenUuid?: string; actorId?: string },
  label: string
): CombatantResult {
  let actor: any | null = null;
  let token: any | null = null;

  // Step 1: load actor from UUID flag
  if (flags.actorUuid) {
    actor = resolveUuidSync(flags.actorUuid, `${label} actor`);
    if (actor) {
      console.log(`SRA2 | ${label} loaded from actorUuid:`, flags.actorUuid);
    }
  }

  // Step 2: load token from UUID flag; derive actor if still missing
  if (flags.tokenUuid) {
    token = resolveUuidSync(flags.tokenUuid, `${label} token`);
    if (token?.actor && !actor) {
      actor = token.actor;
      console.log(`SRA2 | ${label} actor derived from token:`, flags.tokenUuid);
    }
  }

  // Step 3: ID-based fallback (legacy)
  if (!actor && flags.actorId) {
    actor = (game as any).actors?.get(flags.actorId) ?? null;
  }
  if (actor && !token) {
    token =
      (canvas as any)?.tokens?.placeables?.find(
        (t: any) => t.actor?.id === actor.id || t.actor?.uuid === actor.uuid
      ) ?? null;
  }

  return { actor, token };
}

export interface DefenseSkillData {
  skill: string | null;
  spec: string | null;
  skillLevel: number | undefined;
  specLevel: number | undefined;
  linkedAttribute: string | undefined;
}

/**
 * Resolve the defender actor and token for the defend-button handler.
 * For vehicle weapons, prefer a canvas-selected target over the stored flags
 * (so the real target—not the drone—is used as defender).
 */
export function resolveDefenderForDefend(
  flags: { defenderUuid?: string; defenderTokenUuid?: string; defenderId?: string },
  isVehicleWeapon: boolean,
  vehicleUuid: string | undefined
): CombatantResult {
  if (isVehicleWeapon) {
    const selected = Array.from((game as any).user?.targets ?? []) as any[];
    if (selected.length > 0) {
      const t = selected[0];
      if (t?.actor) return { actor: t.actor, token: t };
    }
  }
  const result = loadCombatantFromFlags(
    { actorUuid: flags.defenderUuid, tokenUuid: flags.defenderTokenUuid, actorId: flags.defenderId },
    'Defense Defender'
  );
  // Never let the vehicle itself be its own defender
  if (isVehicleWeapon && vehicleUuid && result.actor?.uuid === vehicleUuid) {
    return { actor: null, token: null };
  }
  return result;
}

/**
 * Determine which defense skill/specialisation the defender should roll,
 * and pre-calculate the dice pool levels.
 */
export function resolveDefenseSkillData(defenderActor: any, rollData: any, isVehicle: boolean): DefenseSkillData {
  if (isVehicle) {
    return {
      skill: 'Autopilot',
      spec: null,
      skillLevel: (defenderActor.system as any)?.attributes?.autopilot ?? 0,
      specLevel: undefined,
      linkedAttribute: undefined,
    };
  }

  const isIceAttack   = rollData.itemType === 'ice-attack' || rollData.attackRollData?.itemType === 'ice-attack';
  const attackSpec: string | null    = rollData.linkedAttackSpecialization || rollData.specName || null;
  const defenseSpec: string | null   = rollData.linkedDefenseSpecialization || null;
  const defenseSkill: string | null  = rollData.linkedDefenseSkill || null;

  let finalSkill: string | null = null;
  let finalSpec:  string | null = null;

  if (isIceAttack) {
    const pirSkill = defenderActor.items.find((i: any) => i.type === 'skill' && i.system.slug === SKILL_SLUGS.CRACKING);
    finalSkill = pirSkill?.name || 'Piratage';
    const cyberSpec = defenderActor.items.find((i: any) =>
      i.type === 'specialization' && i.system.slug === SPEC_SLUGS.CYBERCOMBAT && i.system.linkedSkill === SKILL_SLUGS.CRACKING
    );
    if (cyberSpec) finalSpec = cyberSpec.name;
  } else if (attackSpec) {
    const spec = defenderActor.items.find((i: any) =>
      i.type === 'specialization' && (i.name === attackSpec || i.system?.slug === attackSpec) && i.system.linkedSkill === SKILL_SLUGS.CLOSE_COMBAT
    );
    if (spec) { finalSpec = spec.name; finalSkill = spec.system.linkedSkill; }
  }

  if (!finalSpec && defenseSpec) {
    const spec = defenderActor.items.find((i: any) => i.type === 'specialization' && (i.name === defenseSpec || i.system?.slug === defenseSpec));
    if (spec) { finalSpec = spec.name; finalSkill = spec.system.linkedSkill; }
  }

  if (!finalSpec && defenseSkill) {
    const skill = findSkillByName(defenderActor, defenseSkill);
    if (skill) finalSkill = skill.name;
  }

  if (!finalSkill) {
    // Ranged attacks (including spells) default to Athletics + Spé : Défense à distance
    // Melee attacks default to Close Combat + Spé : Défense
    const isSpellLike = rollData.isMagicRoll || rollData.isTechnomancerRoll || rollData.isPower ||
                        rollData.itemType === 'spell' || rollData.itemType === 'complex-form';
    const isMelee = !isSpellLike && rollData.meleeRange && rollData.meleeRange !== 'none';
    const fallbackSlug = isMelee ? SKILL_SLUGS.CLOSE_COMBAT : SKILL_SLUGS.ATHLETICS;
    const fallbackSkill = findSkillByName(defenderActor, fallbackSlug);
    const slugCache = (globalThis as any).SRA2_SKILL_SLUG_CACHE || {};
    finalSkill = fallbackSkill?.name || slugCache[fallbackSlug] || fallbackSlug;
  }

  let skillLevel:      number | undefined;
  let specLevel:       number | undefined;
  let linkedAttribute: string | undefined;

  if (finalSpec) {
    const spec = defenderActor.items.find((i: any) => i.type === 'specialization' && (i.name === finalSpec || i.system?.slug === finalSpec));
    if (spec) {
      const linkedSkill = defenderActor.items.find((i: any) => i.type === 'skill' && (i.name === spec.system.linkedSkill || i.system?.slug === spec.system.linkedSkill));
      if (linkedSkill) {
        linkedAttribute = spec.system.linkedAttribute || linkedSkill.system.linkedAttribute || 'strength';
        const attrVal   = (defenderActor.system as any)?.attributes?.[linkedAttribute!] ?? 0;
        skillLevel = attrVal + ((linkedSkill.system as any).rating ?? 0);
        specLevel  = skillLevel + 2;
      }
    }
  } else if (finalSkill) {
    const skill = findSkillByName(defenderActor, finalSkill);
    if (skill) {
      finalSkill = skill.name;
      linkedAttribute = (skill.system as any).linkedAttribute || 'strength';
      const attrVal   = (defenderActor.system as any)?.attributes?.[linkedAttribute!] ?? 0;
      skillLevel = attrVal + ((skill.system as any).rating ?? 0);
    }
  }

  return { skill: finalSkill, spec: finalSpec, skillLevel, specLevel, linkedAttribute };
}

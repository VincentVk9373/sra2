/**
 * Shared Dice Rolling Utilities for SRA2
 * This module contains common dice rolling functions used across character sheets, NPC sheets, and item sheets.
 */

// Roll is available globally in FoundryVTT
declare const Roll: any;
declare const renderTemplate: any;
declare const ChatMessage: any;

// Import ItemSearch for text normalization
import * as ItemSearch from '../../../item-search.js';
import * as SheetHelpers from './sheet-helpers.js';
import { RR_MAX, SUCCESS_THRESHOLDS, RISK_DICE_SUCCESS_MULTIPLIER } from '../config/constants.js';
import { resolveTokenUuid, resolveActorUuid } from './actor-uuid-resolver.js';

/**
 * Parse a damage value string to a safe numeric value.
 * Tries direct parseInt first; falls back to SheetHelpers.parseDamageValue for
 * legacy attribute-expression strings (e.g. "strength+2").
 * Always returns a finite number (0 on failure).
 */
function parseDamageValueSafe(
  valueStr: string,
  attributes: Record<string, number>,
  context: string
): number {
  let value = parseInt(valueStr, 10);
  if (isNaN(value)) {
    try {
      // Late import to avoid circular dependency — SheetHelpers is already imported later
      const parsed = SheetHelpers.parseDamageValue(valueStr, attributes, 0);
      value = parsed.numericValue;
    } catch (error) {
      console.error(`SRA2 | Error parsing ${context} damage value:`, valueStr, error);
      return 0;
    }
  }
  if (isNaN(value) || value == null) {
    console.error(`SRA2 | Invalid ${context} damage value:`, valueStr);
    return 0;
  }
  return value;
}

/**
 * RR source information
 */
export interface RRSource {
  featName: string;
  rrValue: number;
  rrLabel?: string;
}

/**
 * Risk reduction constants
 */
export const RISK_DICE_BY_RR = [2, 5, 8, 12];

export const RISK_THRESHOLDS = {
  0: { normal: 2, fort: 4, extreme: 6 },
  1: { normal: 5, fort: 7, extreme: 9 },
  2: { normal: 8, fort: 11, extreme: 13 },
  3: { normal: 12, fort: 15, extreme: 999 }
};

/**
 * Get risk dice count based on RR level
 */
export function getRiskDiceByRR(rr: number): number {
  return RISK_DICE_BY_RR[Math.min(RR_MAX, Math.max(0, rr))] || 2;
}

/**
 * Get RR sources from an actor for a specific item type and name
 * This is the main function used by most sheets for their own actor
 */
export function getRRSources(
  actor: any,
  itemType: 'skill' | 'specialization' | 'attribute',
  itemName: string
): RRSource[] {
  const sources: RRSource[] = [];
  
  // Get all active feats from the actor
  const feats = actor.items.filter((item: any) => 
    item.type === 'feat' && 
    item.system.active === true
  );
  
  // Calculate RR from feats that target this item
  for (const feat of feats) {
    const featSystem = feat.system as any;
    const rrList = featSystem.rrList || [];
    
    // Loop through all RR entries in this feat
    for (const rrEntry of rrList) {
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';
      
      // Check if this RR entry provides RR for the given item
      if (rrType === itemType && rrTarget === itemName && rrValue > 0) {
        sources.push({
          featName: feat.name,
          rrValue: rrValue,
          rrLabel: rrEntry.rrLabel || undefined
        });
      }
    }
  }
  
  return sources;
}

/**
 * Get RR sources from any actor for a specific item type and name
 * This is useful for defense rolls where we need to check another actor's RR
 * (identical to getRRSources but kept separate for clarity in combat scenarios)
 */
export function getRRSourcesForActor(
  actor: any,
  itemType: 'skill' | 'specialization' | 'attribute',
  itemName: string
): RRSource[] {
  return getRRSources(actor, itemType, itemName);
}

/**
 * Get success threshold based on roll mode
 */
export function getSuccessThreshold(mode: string): number {
  return SUCCESS_THRESHOLDS[mode as keyof typeof SUCCESS_THRESHOLDS] ?? SUCCESS_THRESHOLDS.normal;
}

/**
 * Build RR sources HTML for dialog
 */
export function buildRRSourcesHtml(rrSources: RRSource[]): string {
  if (rrSources.length === 0) return '';
  
  let html = '<div class="rr-sources"><strong>Sources RR:</strong>';
  rrSources.forEach((source) => {
    html += `
      <label class="rr-source-item">
        <input type="checkbox" class="rr-source-checkbox" data-rr-value="${source.rrValue}" checked />
        <span>${source.featName} (+${source.rrValue})</span>
      </label>`;
  });
  html += '</div>';
  
  return html;
}

/**
 * Roll Request Data Interface
 * Contains all information needed for a roll request
 */
export interface RollRequestData {
  // Item information
  itemType?: string;
  weaponType?: string;
  itemName?: string;
  itemId?: string;
  itemRating?: number;
  itemActive?: boolean;
  
  // Linked skills (merged from weapon types and custom fields)
  linkedAttackSkill?: string;
  linkedAttackSpecialization?: string;
  linkedDefenseSkill?: string;
  linkedDefenseSpecialization?: string;
  linkedAttribute?: string;
  
  // Weapon properties
  isWeaponFocus?: boolean;
  damageValue?: string;  // FINAL damage value (base + bonus)
  damageValueBonus?: number;  // Bonus from feat
  damageType?: 'physical' | 'mental' | 'matrix';  // Type of damage: physical, mental (magic), or matrix
  meleeRange?: string;  // "none" | "ok" | "disadvantage"
  shortRange?: string;  // "none" | "ok" | "disadvantage"
  mediumRange?: string; // "none" | "ok" | "disadvantage"
  longRange?: string;   // "none" | "ok" | "disadvantage"
  
  // Skill/Spec information (undefined if not found)
  skillName?: string;
  specName?: string;
  skillLevel?: number;
  specLevel?: number;
  
  // Defense Skill/Spec information (for defense rolls)
  defenseSkillName?: string;
  defenseSpecName?: string;
  defenseSkillLevel?: number;
  defenseSpecLevel?: number;
  defenseLinkedAttribute?: string;
  
  // NPC threshold (when not rolling dice)
  threshold?: number;
  
  // Actor information
  actorId?: string;
  actorUuid?: string;
  actorName?: string;
  
  // Token information
  attackerTokenUuid?: string;
  defenderTokenUuid?: string;
  
  // RR List
  rrList?: any[];
  
  // Risk dice count (number of risk dice selected)
  riskDiceCount?: number;
  
  // Final calculated values
  finalRR?: number;
  dicePool?: number;
  
  // Roll mode
  rollMode?: 'normal' | 'disadvantage' | 'advantage';
  
  // Defense/Counter-attack flags
  isDefend?: boolean;
  isCounterAttack?: boolean;
  
  // Spell-specific properties
  spellType?: 'direct' | 'indirect';  // For spells: 'direct' or 'indirect'
  isSpellDirect?: boolean;  // Flag for direct spells (no defense allowed)
  
  // ICE-specific properties
  iceType?: string;  // Type of ICE (blaster, black, killer, etc.)
  iceDamageValue?: number;  // ICE damage value (stored separately for defense calculation)
  
  // Attack roll data (for defense/counter-attack rolls)
  attackRollResult?: RollResult;
  attackRollData?: RollRequestData;
  availableWeapons?: Array<{
    id: string;
    name: string;
    linkedAttackSkill: string;
    damageValue: string;
    damageValueBonus: number;
    weaponType?: string;
    meleeRange?: string;
  }>;
  selectedWeaponId?: string; // ID of selected weapon for counter-attack

  // Vehicle weapon properties
  isVehicleWeapon?: boolean;
  vehicleUuid?: string; // UUID of the vehicle owning this weapon
  vehicleName?: string; // Name of the vehicle for display

  // Power/adept properties
  isPower?: boolean;
}

/**
 * Handle roll request - central function for all roll clicks
 * Displays a roll dialog with roll information
 */
export function handleRollRequest(data: RollRequestData): void {
  console.log('=== ROLL REQUEST ===', {
    itemType: data.itemType,
    weaponType: data.weaponType,
    linkedAttackSkill: data.linkedAttackSkill,
    linkedAttackSpecialization: data.linkedAttackSpecialization,
    linkedDefenseSkill: data.linkedDefenseSkill,
    linkedDefenseSpecialization: data.linkedDefenseSpecialization,
    linkedAttribute: data.linkedAttribute,
    isWeaponFocus: data.isWeaponFocus,
    damageValue: data.damageValue,
    damageValueBonus: data.damageValueBonus,
    meleeRange: data.meleeRange,
    shortRange: data.shortRange,
    mediumRange: data.mediumRange,
    longRange: data.longRange,
    skillName: data.skillName,
    specName: data.specName,
    itemName: data.itemName,
    itemId: data.itemId,
    threshold: data.threshold,
    actorId: data.actorId,
    actorUuid: data.actorUuid,
    actorName: data.actorName,
    specLevel: data.specLevel,
    skillLevel: data.skillLevel,
    itemRating: data.itemRating,
    itemActive: data.itemActive,
    rrList: data.rrList
  });

  // Import RollDialog dynamically to avoid circular dependencies
  import('../applications/roll-dialog.js').then((module) => {
    const dialog = new module.RollDialog(data);
    dialog.render(true);
  });
}

/**
 * Roll result interface
 */
export interface RollResult {
  normalDice: number[];
  riskDice: number[];
  normalSuccesses: number;
  riskSuccesses: number;
  totalSuccesses: number;
  criticalFailures: number;
  finalRR: number;
  remainingFailures: number;
  complication: 'none' | 'minor' | 'critical' | 'disaster';
}

/**
 * Execute a dice roll with DiceSoNice support
 * Steps 2-5: Roll dice, calculate results, complications, and create chat message
 */
export interface DefenderEntry { actor: any; token: any; }

export async function executeRoll(
  attacker: any,
  defenders: DefenderEntry[],
  attackerToken: any,
  rollData: RollRequestData
): Promise<void> {
  if (!attacker) {
    console.error('No attacker provided for roll');
    return;
  }

  const dicePool = rollData.dicePool || 0;
  const riskDiceCount = rollData.riskDiceCount || 0;
  const normalDiceCount = Math.max(0, dicePool - riskDiceCount);
  const rollMode = rollData.rollMode || 'normal';
  const finalRR = Math.min(RR_MAX, rollData.finalRR || 0);
  const threshold = rollData.threshold;

  // If threshold is defined, use it instead of rolling dice
  let rollResult: RollResult;
  if (threshold !== undefined) {
    // Apply threshold: number of successes equals threshold
    rollResult = {
      normalDice: [],
      riskDice: [],
      normalSuccesses: threshold,
      riskSuccesses: 0,
      totalSuccesses: threshold,
      criticalFailures: 0,
      finalRR: finalRR,
      remainingFailures: 0,
      complication: 'none'
    };
  } else {
  // Step 2: Create and roll dice
  let normalRoll: any = null;
  let riskRoll: any = null;

  // Roll normal dice
  if (normalDiceCount > 0) {
    normalRoll = new Roll(`${normalDiceCount}d6`);
    await normalRoll.evaluate();
    
    // Show DiceSoNice animation for normal dice
    if ((game as any).dice3d && normalRoll) {
      (game as any).dice3d.showForRoll(normalRoll, game.user, true, null, false);
    }
  }

  // Roll risk dice with purple color
  if (riskDiceCount > 0) {
    riskRoll = new Roll(`${riskDiceCount}d6`);
    await riskRoll.evaluate();
    
    // Show DiceSoNice animation for risk dice with purple color
    if ((game as any).dice3d && riskRoll) {
      const dice3dConfig = {
        colorset: 'purple',
        theme: 'default'
      };
      (game as any).dice3d.showForRoll(riskRoll, game.user, true, dice3dConfig, false);
    }
  }

  // Step 3: Calculate results
  const normalResults: number[] = normalRoll ? (normalRoll.dice[0]?.results?.map((r: any) => r.result) || []) : [];
  const riskResults: number[] = riskRoll ? (riskRoll.dice[0]?.results?.map((r: any) => r.result) || []) : [];
  
  // Calculate successes for normal dice
  const successThreshold = getSuccessThreshold(rollMode);
  let normalSuccesses = 0;
  for (const result of normalResults) {
    if (result >= successThreshold) normalSuccesses++;
  }

  // Calculate successes and critical failures for risk dice
  let riskSuccesses = 0;
  let criticalFailures = 0;
  for (const result of riskResults) {
    if (result === 1) {
      criticalFailures++;
    } else if (result >= successThreshold) {
      riskSuccesses++;
    }
  }

  // Risk dice successes count as RISK_DICE_SUCCESS_MULTIPLIER normal successes each
  const totalRiskSuccesses = riskSuccesses * RISK_DICE_SUCCESS_MULTIPLIER;
  const totalSuccesses = normalSuccesses + totalRiskSuccesses;

  // Step 4: Calculate complications
  const remainingFailures = Math.max(0, criticalFailures - finalRR);
  
  let complication: 'none' | 'minor' | 'critical' | 'disaster' = 'none';
  if (remainingFailures === 1) {
    complication = 'minor';
  } else if (remainingFailures === 2) {
    complication = 'critical';
  } else if (remainingFailures >= 3) {
    complication = 'disaster';
  }

    rollResult = {
    normalDice: normalResults,
    riskDice: riskResults,
    normalSuccesses: normalSuccesses,
    riskSuccesses: riskSuccesses,
    totalSuccesses: totalSuccesses,
    criticalFailures: criticalFailures,
    finalRR: finalRR,
    remainingFailures: remainingFailures,
    complication: complication
  };
  }

  // Step 5: Create chat message(s) — one per defender (or one with no target for skill rolls)
  await createRollChatMessage(attacker, defenders, attackerToken, rollData, rollResult);
}

/**
 * Build defender data object with correct token image.
 */
function buildDefenderData(defender: any, defenderToken: any): any {
  if (!defender) return null;
  let tokenImg = defender.img;
  if (defenderToken) {
    tokenImg = (defenderToken as any).document?.texture?.src ||
               (defenderToken as any).document?.img ||
               (defenderToken as any).data?.img ||
               (defenderToken as any).texture?.src ||
               defender.img;
  }
  return { ...defender, img: tokenImg };
}

/**
 * Build the defenseResult object for a defense roll.
 * For defense: attacker param = the one defending, defender param = the original attacker.
 */
function buildDefenseResult(
  rollData: RollRequestData,
  rollResult: RollResult,
  finalAttackerUuid: string | undefined,
  finalDefenderUuid: string | undefined,
  attacker: any,
  defender: any,
  attackerToken: any,
  defenderToken: any
): any {
  const attackSuccesses = rollData.attackRollResult!.totalSuccesses;
  const defenseSuccesses = rollResult.totalSuccesses;
  const isIceAttack = rollData.attackRollData!.itemType === 'ice-attack' || rollData.attackRollData!.iceType;
  const iceType = rollData.attackRollData!.iceType;
  const originalAttackerName = defenderToken?.name || defender?.name || 'Inconnu';
  const defenderName = attackerToken?.name || attacker?.name || 'Inconnu';

  let calculatedDamage = 0;
  let attackFailed = false;

  if (attackSuccesses >= defenseSuccesses) {
    if (isIceAttack) {
      const iceDamageValue = rollData.attackRollData!.iceDamageValue || 0;
      if (iceType === 'blaster' || iceType === 'black' || iceType === 'killer') {
        calculatedDamage = iceDamageValue + attackSuccesses - defenseSuccesses;
      }
    } else {
      const damageValueStr = rollData.attackRollData!.damageValue || '0';
      const attackerAttributes = (defender?.system as any)?.attributes || {};
      const damageValue = parseDamageValueSafe(damageValueStr, attackerAttributes, 'defense');
      calculatedDamage = damageValue + attackSuccesses - defenseSuccesses;
    }
  } else {
    attackFailed = true;
    calculatedDamage = 0;
  }

  const originalAttackerUuid = finalDefenderUuid;
  const defenderUuid = finalAttackerUuid;

  if (!attackFailed) {
    console.log('Defense: Attack succeeds - original attacker inflicts damage to defender');
    console.log('  Original attacker (inflicter):', originalAttackerName, '(', originalAttackerUuid, ')');
    console.log('  Defender (receiver):', defenderName, '(', defenderUuid, ')');
  }

  const attackDamageType = (rollData.attackRollData!.damageType || 'physical') as 'physical' | 'mental' | 'matrix';

  return {
    attackSuccesses,
    defenseSuccesses,
    calculatedDamage,
    attackFailed,
    originalAttackerName,
    defenderName,
    originalAttackerUuid,
    defenderUuid,
    isIceAttack,
    iceType,
    damageType: attackDamageType
  };
}

/**
 * Build the defenseResult object for a counter-attack roll.
 * For counter-attack: attacker param = original defender (counter-attacker), defender param = original attacker.
 */
function buildCounterAttackResult(
  rollData: RollRequestData,
  rollResult: RollResult,
  finalAttackerUuid: string | undefined,
  finalDefenderUuid: string | undefined,
  attacker: any,
  defender: any,
  attackerToken: any,
  defenderToken: any
): any {
  const originalAttackerName = defenderToken?.document?.name ||
                               (defenderToken as any)?.name ||
                               defenderToken?.actor?.name ||
                               defender?.name ||
                               'Inconnu';
  const originalDefenderName = attackerToken?.document?.name ||
                                (attackerToken as any)?.name ||
                                attackerToken?.actor?.name ||
                                attacker?.name ||
                                'Inconnu';

  const attackSuccesses = rollData.attackRollResult!.totalSuccesses;
  const counterAttackSuccesses = rollResult.totalSuccesses;

  const attackDamageValueStr = rollData.attackRollData!.damageValue || '0';
  const originalAttackerAttributes = (defender?.system as any)?.attributes || {};
  const attackDamageValue = parseDamageValueSafe(attackDamageValueStr, originalAttackerAttributes, 'counter-attack original');

  let counterAttackDamageValue = parseDamageValueSafe(rollData.damageValue || '0', (attacker?.system as any)?.attributes || {}, 'counter-attack');

  if (!counterAttackDamageValue && attacker) {
    const selectedWeaponId = (rollData as any).selectedWeaponId;
    if (selectedWeaponId) {
      const weapon = attacker.items.find((item: any) => item.id === selectedWeaponId);
      if (weapon) {
        const weaponSystem = weapon.system as any;
        try {
          counterAttackDamageValue = SheetHelpers.calculateFinalNumericDamageValue(
            weaponSystem.damageValue || '0',
            (attacker?.system as any)?.attributes || {},
            weaponSystem.damageValueBonus || 0
          );
        } catch (error) {
          console.error('SRA2 | Error calculating weapon damage value:', weaponSystem.damageValue, error);
        }
      }
    }
  }

  let attackerDamage = 0;
  let defenderDamage = 0;
  let isTie = false;
  let winner: 'attacker' | 'defender' | 'tie' = 'tie';

  if (attackSuccesses > counterAttackSuccesses) {
    winner = 'attacker';
    attackerDamage = attackDamageValue + attackSuccesses - counterAttackSuccesses;
  } else if (counterAttackSuccesses > attackSuccesses) {
    winner = 'defender';
    defenderDamage = counterAttackDamageValue + counterAttackSuccesses - attackSuccesses;
  } else {
    isTie = true;
  }

  console.log('=== COUNTER-ATTACK RESULTS ===');
  console.log('Attack Successes:', attackSuccesses, '| Counter-Attack Successes:', counterAttackSuccesses);
  console.log('Attack Damage Value:', attackDamageValue, '| Counter-Attack Damage Value:', counterAttackDamageValue);
  console.log('Winner:', winner, '| Attacker Damage:', attackerDamage, '| Defender Damage:', defenderDamage);
  console.log('==============================');

  const originalAttackerUuid = finalDefenderUuid;
  const originalDefenderUuid = finalAttackerUuid;

  let damageInflicterUuid: string | undefined;
  let damageReceiverUuid: string | undefined;
  let damageInflicterName = '';
  let damageReceiverName = '';

  if (winner === 'attacker') {
    damageInflicterUuid = originalAttackerUuid;
    damageReceiverUuid = originalDefenderUuid;
    damageInflicterName = originalAttackerName;
    damageReceiverName = originalDefenderName;
  } else if (winner === 'defender') {
    damageInflicterUuid = originalDefenderUuid;
    damageReceiverUuid = originalAttackerUuid;
    damageInflicterName = originalDefenderName;
    damageReceiverName = originalAttackerName;
  }

  const attackerDamageType = (rollData.attackRollData!.damageType || 'physical') as 'physical' | 'mental' | 'matrix';
  const defenderDamageType = (rollData.damageType || 'physical') as 'physical' | 'mental' | 'matrix';

  return {
    attackSuccesses,
    counterAttackSuccesses,
    winner,
    attackerDamage,
    defenderDamage,
    isTie,
    originalAttackerName,
    originalDefenderName,
    originalAttackerUuid,
    originalDefenderUuid,
    damageInflicterUuid,
    damageReceiverUuid,
    damageInflicterName,
    damageReceiverName,
    attackerDamageType,
    defenderDamageType
  };
}

/**
 * Create chat message for roll result
 * Step 5: Display roll results in chat
 */
async function createRollChatMessage(
  attacker: any,
  defenders: DefenderEntry[],
  attackerToken: any,
  rollData: RollRequestData,
  rollResult: RollResult
): Promise<void> {
  const isAttack = rollData.itemType === 'weapon' ||
                   rollData.weaponType !== undefined ||
                   (rollData.meleeRange || rollData.shortRange || rollData.mediumRange || rollData.longRange);

  const attackerTokenUuid = resolveTokenUuid(attackerToken, rollData.attackerTokenUuid);
  const finalAttackerUuid = resolveActorUuid(attackerToken, attacker);

  // For defense/counter-attack there is exactly one defender
  const firstEntry   = defenders[0] ?? { actor: null, token: null };
  const defender     = firstEntry.actor;
  const defenderToken = firstEntry.token;
  const defenderTokenUuid = resolveTokenUuid(defenderToken, rollData.defenderTokenUuid);
  const finalDefenderUuid = resolveActorUuid(defenderToken, defender);

  // Defense / counter-attack result (single-defender flows)
  let defenseResult: any = null;
  if (rollData.isDefend && rollData.attackRollResult && rollData.attackRollData) {
    defenseResult = buildDefenseResult(rollData, rollResult, finalAttackerUuid, finalDefenderUuid, attacker, defender, attackerToken, defenderToken);
  } else if (rollData.isCounterAttack && rollData.attackRollResult && rollData.attackRollData) {
    defenseResult = buildCounterAttackResult(rollData, rollResult, finalAttackerUuid, finalDefenderUuid, attacker, defender, attackerToken, defenderToken);
  }

  // Build per-defender data for the template (one entry per canvas target)
  const defendersData = defenders.map(({ actor: a, token: t }) => {
    const tokenUuid  = resolveTokenUuid(t, undefined);
    const actorUuid  = resolveActorUuid(t, a);
    const defData    = buildDefenderData(a, t);
    return defData ? {
      ...defData,
      uuid:      actorUuid ?? defData.uuid,
      tokenUuid: tokenUuid,
    } : null;
  }).filter(Boolean);

  const attackerWithUuid = attacker ? {
    ...attacker,
    uuid: finalAttackerUuid ?? attacker.uuid
  } : null;

  // Keep a single `defender` in template data for defense/counter-attack result sections
  const defenderWithUuid = buildDefenderData(defender, defenderToken) ? {
    ...buildDefenderData(defender, defenderToken),
    uuid: finalDefenderUuid ?? defender?.uuid
  } : null;

  const templateData: any = {
    attacker:        attackerWithUuid,
    defender:        defenderWithUuid,   // used only for defense/counter-attack result sections
    defenders:       defendersData,      // used for multi-target attack-actions section
    rollData:        rollData,
    rollResult:      rollResult,
    isAttack:        isAttack,
    isDefend:        rollData.isDefend        || false,
    isCounterAttack: rollData.isCounterAttack || false,
    skillName:       rollData.specName || rollData.skillName || rollData.linkedAttackSkill || 'Unknown',
    itemName:        rollData.itemName,
    damageValue:     rollData.damageValue,
    defenseResult:   defenseResult,
    attackerUuid:    finalAttackerUuid,
    defenderUuid:    finalDefenderUuid,
    attackerTokenUuid,
    defenderTokenUuid,
    isSpellDirect:   rollData.isSpellDirect || false,
  };

  const html = await renderTemplate('systems/sra2/templates/roll-result.hbs', templateData);

  const messageData: any = {
    user:    game.user?.id,
    speaker: { actor: attacker?.id, alias: attacker?.name },
    content: html,
    type:    CONST.CHAT_MESSAGE_TYPES.OTHER,
    flags: {
      sra2: {
        rollType:          isAttack ? 'attack' : 'skill',
        attackerId:        attacker?.id,
        attackerUuid:      finalAttackerUuid,
        attackerTokenUuid: attackerTokenUuid,
        // First defender kept for backward-compat with defend/counter-attack handlers
        defenderId:        defender?.id,
        defenderUuid:      finalDefenderUuid,
        defenderTokenUuid: defenderTokenUuid,
        rollResult:        rollResult,
        rollData:          rollData,
      }
    }
  };

  await ChatMessage.create(messageData);

  // Handle drain for Sorcery and Conjuration tests
  await handleDrain(attacker, rollData, rollResult);
}

/**
 * Handle drain effects for Sorcery and Conjuration tests
 * Applies drain effects based on complications
 */
async function handleDrain(
  actor: any,
  rollData: RollRequestData,
  rollResult: RollResult
): Promise<void> {
  if (!actor || !rollData || !rollResult) {
    return;
  }

  // Check if this is a spell (spells always use Sorcery, even with specializations like "Spé: Sorts de combat")
  const isSpell = rollData.itemType === 'spell' || rollData.itemType === 'weapon-spell';
  
  // Check if this is a Sorcery or Conjuration test
  // Priority: linkedAttackSkill (for spells/weapons) > skillName (for specializations) > specName (fallback)
  let skillName = rollData.linkedAttackSkill || rollData.skillName || rollData.specName || '';
  let normalizedSkillName = ItemSearch.normalizeSearchText(skillName);
  
  // If it's a spell, it's always Sorcery (regardless of specialization like "Spé: Sorts de combat")
  // Also check linkedAttackSkill in case it's explicitly set to Sorcery
  if (isSpell || ItemSearch.normalizeSearchText(rollData.linkedAttackSkill || '') === 'sorcellerie') {
    normalizedSkillName = 'sorcellerie';
  } else if (rollData.itemType === 'specialization') {
    // For specialization rolls, check skillName first (should be set from linkedSkill)
    // If not found, try to find the linked skill from the specialization item
    if (!normalizedSkillName || (normalizedSkillName !== 'sorcellerie' && normalizedSkillName !== 'conjuration')) {
      if (rollData.itemId && actor) {
        const specItem = actor.items.find((item: any) => item.id === rollData.itemId);
        if (specItem && specItem.type === 'specialization') {
          const specSystem = specItem.system as any;
          const linkedSkill = specSystem.linkedSkill || '';
          if (linkedSkill) {
            skillName = linkedSkill;
            normalizedSkillName = ItemSearch.normalizeSearchText(linkedSkill);
          }
        }
      }
    }
  }
  
  const isSorcery = normalizedSkillName === 'sorcellerie';
  const isConjuration = normalizedSkillName === 'conjuration';
  
  if (!isSorcery && !isConjuration) {
    return; // Not a magic test, no drain
  }

  // Only apply drain if there's a complication
  if (rollResult.complication === 'none') {
    return;
  }

  const actorSystem = actor.system as any;
  if (!actorSystem || actor.type !== 'character') {
    return; // Only apply to character actors
  }

  // Handle different complication levels
  if (rollResult.complication === 'minor') {
    // Minor complication: display message in chat about disadvantage until next narration
    const message = game.i18n!.localize('SRA2.SKILLS.DRAIN_MINOR_COMPLICATION');
    await ChatMessage.create({
      user: game.user?.id,
      speaker: {
        actor: actor.id,
        alias: actor.name
      },
      content: `<div class="drain-message minor-complication" style="padding: 8px; margin: 4px 0; background-color: rgba(255, 193, 7, 0.1); border-left: 3px solid #ffc107; border-radius: 4px;">
        <i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> 
        <strong style="color: #ffc107;">Drain - ${game.i18n!.localize('SRA2.SKILLS.MINOR_COMPLICATION')}</strong>
        <br/>
        <span style="margin-left: 20px; display: block; margin-top: 4px;">${message}</span>
      </div>`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  } else if (rollResult.complication === 'critical') {
    // Critical complication: apply light wound
    const damage = actorSystem.damage || {};
    const lightWounds = Array.isArray(damage.light) ? damage.light : [false, false];
    
    // Find first available light wound slot
    let woundApplied = false;
    for (let i = 0; i < lightWounds.length; i++) {
      if (!lightWounds[i]) {
        lightWounds[i] = true;
        woundApplied = true;
        break;
      }
    }
    
    if (woundApplied) {
      await actor.update({
        'system.damage.light': lightWounds
      });
      
      const message = game.i18n!.localize('SRA2.SKILLS.DRAIN_CRITICAL_COMPLICATION');
      await ChatMessage.create({
        user: game.user?.id,
        speaker: {
          actor: actor.id,
          alias: actor.name
        },
        content: `<div class="drain-message critical-complication" style="padding: 8px; margin: 4px 0; background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 4px;">
          <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i> 
          <strong style="color: #dc3545;">Drain - ${game.i18n!.localize('SRA2.SKILLS.CRITICAL_COMPLICATION')}</strong>
          <br/>
          <span style="margin-left: 20px; display: block; margin-top: 4px;">${message}</span>
        </div>`,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });
    } else {
      // All light wound slots are full, upgrade to severe or incapacitating
      const severeWounds = Array.isArray(damage.severe) ? damage.severe : [false];
      let severeApplied = false;
      
      for (let i = 0; i < severeWounds.length; i++) {
        if (!severeWounds[i]) {
          severeWounds[i] = true;
          severeApplied = true;
          break;
        }
      }
      
      if (severeApplied) {
        await actor.update({
          'system.damage.severe': severeWounds
        });
      } else {
        // All severe slots full, apply incapacitating
        await actor.update({
          'system.damage.incapacitating': true
        });
      }
      
      const message = game.i18n!.localize('SRA2.SKILLS.DRAIN_CRITICAL_COMPLICATION');
      await ChatMessage.create({
        user: game.user?.id,
        speaker: {
          actor: actor.id,
          alias: actor.name
        },
        content: `<div class="drain-message critical-complication" style="padding: 8px; margin: 4px 0; background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 4px;">
          <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i> 
          <strong style="color: #dc3545;">Drain - ${game.i18n!.localize('SRA2.SKILLS.CRITICAL_COMPLICATION')}</strong>
          <br/>
          <span style="margin-left: 20px; display: block; margin-top: 4px;">${message}</span>
        </div>`,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });
    }
  } else if (rollResult.complication === 'disaster') {
    // Disaster: apply incapacitating wound
    await actor.update({
      'system.damage.incapacitating': true
    });
    
    const message = game.i18n!.localize('SRA2.SKILLS.DRAIN_DISASTER');
    await ChatMessage.create({
      user: game.user?.id,
      speaker: {
        actor: actor.id,
        alias: actor.name
      },
      content: `<div class="drain-message disaster" style="padding: 8px; margin: 4px 0; background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 4px;">
        <i class="fas fa-skull" style="color: #dc3545;"></i> 
        <strong style="color: #dc3545;">Drain - ${game.i18n!.localize('SRA2.SKILLS.DISASTER')}</strong>
        <br/>
        <span style="margin-left: 20px; display: block; margin-top: 4px;">${message}</span>
      </div>`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}


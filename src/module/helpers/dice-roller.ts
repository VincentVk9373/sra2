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

/**
 * RR source information
 */
export interface RRSource {
  featName: string;
  rrValue: number;
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
  return RISK_DICE_BY_RR[Math.min(3, Math.max(0, rr))] || 2;
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
          rrValue: rrValue
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
  switch (mode) {
    case 'advantage': return 4;  // 4, 5, 6 = success
    case 'disadvantage': return 6; // only 6 = success
    default: return 5;  // 5, 6 = success
  }
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
export async function executeRoll(
  attacker: any,
  defender: any,
  attackerToken: any,
  defenderToken: any,
  rollData: RollRequestData
): Promise<void> {
  if (!attacker) {
    console.error('No attacker provided for roll');
    return;
  }

  // Log token information
  console.log('=== EXECUTE ROLL ===');
  console.log('Attacker:', attacker?.name || 'Unknown');
  console.log('Attacker UUID:', attacker?.uuid || 'Unknown');
  console.log('Attacker Token:', attackerToken ? 'Found' : 'Not found');
  console.log('Attacker Token UUID:', attackerToken?.uuid || attackerToken?.document?.uuid || rollData.attackerTokenUuid || 'Unknown');
  if (attackerToken?.actor) {
    console.log('Attacker Token Actor UUID:', attackerToken.actor.uuid || 'Unknown');
  }
  console.log('Defender:', defender?.name || 'None');
  console.log('Defender UUID:', defender?.uuid || 'Unknown');
  console.log('Defender Token:', defenderToken ? 'Found' : 'Not found');
  console.log('Defender Token UUID:', defenderToken?.uuid || defenderToken?.document?.uuid || rollData.defenderTokenUuid || 'Unknown');
  if (defenderToken?.actor) {
    console.log('Defender Token Actor UUID:', defenderToken.actor.uuid || 'Unknown');
  }
  console.log('===================');

  const dicePool = rollData.dicePool || 0;
  const riskDiceCount = rollData.riskDiceCount || 0;
  const normalDiceCount = Math.max(0, dicePool - riskDiceCount);
  const rollMode = rollData.rollMode || 'normal';
  const finalRR = Math.min(3, rollData.finalRR || 0);
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
  let normalSuccesses = 0;
  for (const result of normalResults) {
    if (rollMode === 'advantage' && result >= 4) {
      normalSuccesses++;
    } else if (rollMode === 'disadvantage' && result === 6) {
      normalSuccesses++;
    } else if (rollMode === 'normal' && result >= 5) {
      normalSuccesses++;
    }
  }

  // Calculate successes and critical failures for risk dice
  let riskSuccesses = 0;
  let criticalFailures = 0;
  for (const result of riskResults) {
    if (result === 1) {
      criticalFailures++;
    } else if (rollMode === 'advantage' && result >= 4) {
      riskSuccesses++;
    } else if (rollMode === 'disadvantage' && result === 6) {
      riskSuccesses++;
    } else if (rollMode === 'normal' && result >= 5) {
      riskSuccesses++;
    }
  }

  // Risk dice successes count double
  const totalRiskSuccesses = riskSuccesses * 2;
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

  // Step 5: Create chat message
  await createRollChatMessage(attacker, defender, attackerToken, defenderToken, rollData, rollResult);
}

/**
 * Create chat message for roll result
 * Step 5: Display roll results in chat
 */
async function createRollChatMessage(
  attacker: any,
  defender: any,
  attackerToken: any,
  defenderToken: any,
  rollData: RollRequestData,
  rollResult: RollResult
): Promise<void> {
  // Determine if this is an attack
  const isAttack = rollData.itemType === 'weapon' || 
                   rollData.weaponType !== undefined ||
                   (rollData.meleeRange || rollData.shortRange || rollData.mediumRange || rollData.longRange);

  // Log token information
  console.log('=== CREATE ROLL CHAT MESSAGE ===');
  console.log('Attacker:', attacker?.name || 'Unknown');
  console.log('Attacker UUID:', attacker?.uuid || 'Unknown');
  console.log('Attacker Token:', attackerToken ? 'Found' : 'Not found');
  
  // Get attacker token UUID (priority: token > rollData)
  let attackerTokenUuid: string | undefined = undefined;
  if (attackerToken) {
    attackerTokenUuid = attackerToken.uuid || attackerToken.document?.uuid || undefined;
    console.log('Attacker Token UUID:', attackerTokenUuid || 'Unknown');
    // If token exists, use token's actor UUID (for NPCs)
    if (attackerToken.actor) {
      console.log('Attacker Token Actor UUID:', attackerToken.actor.uuid || 'Unknown');
    }
  } else if (rollData.attackerTokenUuid) {
    attackerTokenUuid = rollData.attackerTokenUuid;
    console.log('Attacker Token UUID (from rollData):', attackerTokenUuid);
  }
  
  // Determine final attacker UUID: if token exists, use token's actor UUID, otherwise use actor UUID
  const finalAttackerUuid = attackerToken?.actor?.uuid || attacker?.uuid;
  console.log('Final Attacker UUID (token actor or actor):', finalAttackerUuid || 'Unknown');
  
  console.log('Defender:', defender?.name || 'None');
  console.log('Defender UUID:', defender?.uuid || 'Unknown');
  console.log('Defender Token:', defenderToken ? 'Found' : 'Not found');
  
  // Get defender token UUID (priority: token > rollData)
  let defenderTokenUuid: string | undefined = undefined;
  if (defenderToken) {
    defenderTokenUuid = defenderToken.uuid || defenderToken.document?.uuid || undefined;
    console.log('Defender Token UUID:', defenderTokenUuid || 'Unknown');
    // If token exists, use token's actor UUID (for NPCs)
    if (defenderToken.actor) {
      console.log('Defender Token Actor UUID:', defenderToken.actor.uuid || 'Unknown');
    }
  } else if (rollData.defenderTokenUuid) {
    defenderTokenUuid = rollData.defenderTokenUuid;
    console.log('Defender Token UUID (from rollData):', defenderTokenUuid);
  }
  
  // Determine final defender UUID: if token exists, use token's actor UUID, otherwise use actor UUID
  const finalDefenderUuid = defenderToken?.actor?.uuid || defender?.uuid;
  console.log('Final Defender UUID (token actor or actor):', finalDefenderUuid || 'Unknown');
  console.log('--- UUIDs to be stored in flags ---');
  console.log('attackerUuid (final):', finalAttackerUuid || 'Unknown');
  console.log('attackerTokenUuid (final):', attackerTokenUuid || 'Unknown');
  console.log('defenderUuid (final):', finalDefenderUuid || 'Unknown');
  console.log('defenderTokenUuid (final):', defenderTokenUuid || 'Unknown');
  console.log('================================');

  // Prepare defender data with token image if available
  let defenderData: any = null;
  if (defender) {
    // Get token image - try different ways to access it depending on Foundry version
    let tokenImg = defender.img; // fallback to actor image
    if (defenderToken) {
      // FoundryVTT v13: token.document.texture.src or token.document.img
      tokenImg = (defenderToken as any).document?.texture?.src || 
                 (defenderToken as any).document?.img || 
                 (defenderToken as any).data?.img || 
                 (defenderToken as any).texture?.src ||
                 defender.img;
    }
    
    defenderData = {
      ...defender,
      img: tokenImg
    };
  }

  // Handle defense/counter-attack rolls
  let defenseResult: any = null;
  let calculatedDamage: number | null = null;
  let attackFailed: boolean = false;
  
  if (rollData.isDefend && rollData.attackRollResult && rollData.attackRollData) {
    // Defense roll: compare with attack
    // For defense: attacker = defender (one defending), defender = original attacker
    const attackSuccesses = rollData.attackRollResult.totalSuccesses;
    const defenseSuccesses = rollResult.totalSuccesses;
    
    // Check if this is an ICE attack
    const isIceAttack = rollData.attackRollData.itemType === 'ice-attack' || rollData.attackRollData.iceType;
    const iceType = rollData.attackRollData.iceType;
    
    // Get actor names (use token name if available, otherwise actor name)
    const originalAttackerName = defenderToken?.name || defender?.name || 'Inconnu';
    const defenderName = attackerToken?.name || attacker?.name || 'Inconnu';
    
    if (attackSuccesses >= defenseSuccesses) {
      // Attack succeeds
      if (isIceAttack) {
        // For ICE attacks, calculate damage based on type
        let damageValue = 0;
        const iceDamageValue = rollData.attackRollData.iceDamageValue || 0;
        
        // ICE damage calculation: VD + (succès ICE - succès défense)
        // But for some ICE types, there's no damage, only effects
        if (iceType === 'blaster' || iceType === 'black' || iceType === 'killer') {
          damageValue = iceDamageValue + attackSuccesses - defenseSuccesses;
        }
        // Other ICE types (acid, blocker, glue, tracker) don't deal damage
        
        calculatedDamage = damageValue;
        attackFailed = false;
      } else {
        // Normal attack damage calculation
        // damageValue should already be a numeric string (calculated value, not "attribut+bonus")
        const damageValueStr = rollData.attackRollData.damageValue || '0';
        
        // Try to parse as numeric first (most common case now)
        let damageValue = parseInt(damageValueStr, 10);
        
        // If not a simple number, try to parse with attributes (backward compatibility)
        if (isNaN(damageValue)) {
          const attackerAttributes = (defender?.system as any)?.attributes || {};
          try {
            const parsed = SheetHelpers.parseDamageValue(damageValueStr, attackerAttributes, 0);
            damageValue = parsed.numericValue;
          } catch (error) {
            console.error('SRA2 | Error parsing damage value:', damageValueStr, error);
            damageValue = 0;
          }
        }
        
        // Ensure damageValue is a valid number
        if (isNaN(damageValue) || damageValue === null || damageValue === undefined) {
          console.error('SRA2 | Invalid damage value:', damageValueStr);
          calculatedDamage = 0;
        } else {
          calculatedDamage = damageValue + attackSuccesses - defenseSuccesses;
        }
        
        attackFailed = false;
      }
    } else {
      // Attack fails
      attackFailed = true;
      calculatedDamage = 0;
    }
    
    // For defense: attacker = defender (one defending), defender = original attacker
    // If attack succeeds, original attacker (defender in context) inflicts damage to defender (attacker in context)
    const originalAttackerUuid = finalDefenderUuid; // Original attacker is defender in defense context
    const defenderUuid = finalAttackerUuid; // Defender is attacker in defense context
    
    console.log('Defense: Attack succeeds - original attacker inflicts damage to defender');
    console.log('  Original attacker (inflicter):', originalAttackerName, '(', originalAttackerUuid, ')');
    console.log('  Defender (receiver):', defenderName, '(', defenderUuid, ')');
    
    // Get damage type from attack roll data (default to physical)
    const attackDamageType = (rollData.attackRollData?.damageType || 'physical') as 'physical' | 'mental' | 'matrix';
    
    defenseResult = {
      attackSuccesses: attackSuccesses,
      defenseSuccesses: defenseSuccesses,
      calculatedDamage: calculatedDamage,
      attackFailed: attackFailed,
      originalAttackerName: originalAttackerName,
      defenderName: defenderName,
      // UUIDs for applying damage
      originalAttackerUuid: originalAttackerUuid, // Who inflicts damage if attack succeeds
      defenderUuid: defenderUuid, // Who receives damage if attack succeeds
      // ICE-specific fields
      isIceAttack: isIceAttack,
      iceType: iceType,
      // Damage type from weapon/attack
      damageType: attackDamageType
    };
  } else if (rollData.isCounterAttack && rollData.attackRollResult && rollData.attackRollData) {
    // Counter-attack: compare with original attack
    // In counter-attack context:
    // - attacker = original defender (the one doing counter-attack)
    // - defender = original attacker (the one being counter-attacked)
    
    // Get actor names (use token name if available, otherwise actor name)
    // For original attacker (defender in counter-attack context)
    // Try: token.document.name, token.name, token.actor.name, actor.name
    const originalAttackerName = defenderToken?.document?.name || 
                                  (defenderToken as any)?.name || 
                                  defenderToken?.actor?.name || 
                                  defender?.name || 
                                  'Inconnu';
    // For original defender/counter-attacker (attacker in counter-attack context)
    const originalDefenderName = attackerToken?.document?.name || 
                                  (attackerToken as any)?.name || 
                                  attackerToken?.actor?.name || 
                                  attacker?.name || 
                                  'Inconnu';
    const attackSuccesses = rollData.attackRollResult.totalSuccesses;
    const counterAttackSuccesses = rollResult.totalSuccesses;
    
    // Get damage values for the original attacker
    // damageValue should already be a numeric string (calculated value, not "attribut+bonus")
    let attackDamageValue = 0;
    const attackDamageValueStr = rollData.attackRollData.damageValue || '0';
    
    // Try to parse as numeric first (most common case now)
    attackDamageValue = parseInt(attackDamageValueStr, 10);
    
    // If not a simple number, try to parse with attributes (backward compatibility)
    if (isNaN(attackDamageValue)) {
      const attackerAttributes = (defender?.system as any)?.attributes || {}; // defender = original attacker
      try {
        const attackParsed = SheetHelpers.parseDamageValue(attackDamageValueStr, attackerAttributes, 0);
        attackDamageValue = attackParsed.numericValue;
      } catch (error) {
        console.error('SRA2 | Error parsing attack damage value:', attackDamageValueStr, error);
        attackDamageValue = 0;
      }
    }
    
    if (isNaN(attackDamageValue) || attackDamageValue === null || attackDamageValue === undefined) {
      console.error('SRA2 | Invalid attack damage value:', attackDamageValueStr);
      attackDamageValue = 0;
    }
    
    // Get counter-attack damage value from rollData
    // rollData.damageValue should already be a numeric string (calculated value)
    let counterAttackDamageValue = 0;
    const damageValueStr = rollData.damageValue || '0';
    
    // Try to parse as numeric first (most common case now)
    counterAttackDamageValue = parseInt(damageValueStr, 10);
    
    // If not a simple number, try to parse with attributes (backward compatibility)
    if (isNaN(counterAttackDamageValue)) {
      const counterAttackerAttributes = (attacker?.system as any)?.attributes || {};
      try {
        const counterParsed = SheetHelpers.parseDamageValue(damageValueStr, counterAttackerAttributes, 0);
        counterAttackDamageValue = counterParsed.numericValue;
      } catch (error) {
        console.error('SRA2 | Error parsing counter-attack damage value:', damageValueStr, error);
        counterAttackDamageValue = 0;
      }
    }
    
    if (isNaN(counterAttackDamageValue) || counterAttackDamageValue === null || counterAttackDamageValue === undefined) {
      console.error('SRA2 | Invalid counter-attack damage value:', damageValueStr);
      counterAttackDamageValue = 0;
    }
    
    // If still no damage value, try to find weapon (fallback)
    if (!counterAttackDamageValue && attacker) {
      // Find weapon matching the counter-attack skill/item
      const selectedWeaponId = (rollData as any).selectedWeaponId;
      if (selectedWeaponId) {
          const weapon = attacker.items.find((item: any) => item.id === selectedWeaponId);
          if (weapon) {
            const weaponSystem = weapon.system as any;
            // Calculate finalDamageValue from weapon using helper
            const baseDamageValue = weaponSystem.damageValue || '0';
            const damageValueBonus = weaponSystem.damageValueBonus || 0;
            
            // Calculate final numeric damage value
            const counterAttackerAttributes = (attacker?.system as any)?.attributes || {};
            try {
              counterAttackDamageValue = SheetHelpers.calculateFinalNumericDamageValue(
                baseDamageValue,
                counterAttackerAttributes,
                damageValueBonus
              );
            } catch (error) {
              console.error('SRA2 | Error calculating weapon damage value:', baseDamageValue, error);
              counterAttackDamageValue = 0;
            }
        }
      }
    }
    
    // Determine winner and calculate damage
    let attackerDamage = 0;
    let defenderDamage = 0;
    let isTie = false;
    let winner: 'attacker' | 'defender' | 'tie' = 'tie';
    
    if (attackSuccesses > counterAttackSuccesses) {
      // Attacker wins
      winner = 'attacker';
      attackerDamage = attackDamageValue + attackSuccesses - counterAttackSuccesses;
    } else if (counterAttackSuccesses > attackSuccesses) {
      // Defender (counter-attacker) wins
      winner = 'defender';
      defenderDamage = counterAttackDamageValue + counterAttackSuccesses - attackSuccesses;
    } else {
      // Tie
      isTie = true;
      winner = 'tie';
    }
    
    console.log('=== COUNTER-ATTACK RESULTS ===');
    console.log('Attack Successes:', attackSuccesses);
    console.log('Counter-Attack Successes:', counterAttackSuccesses);
    console.log('Attack Damage Value:', attackDamageValue);
    console.log('Counter-Attack Damage Value:', counterAttackDamageValue);
    console.log('Winner:', winner);
    console.log('Attacker Damage:', attackerDamage);
    console.log('Defender Damage:', defenderDamage);
    console.log('Original Attacker Name:', originalAttackerName);
    console.log('Original Defender Name:', originalDefenderName);
    console.log('--- Context ---');
    console.log('Attacker param:', attacker?.name);
    console.log('Defender param:', defender?.name);
    console.log('AttackerToken object:', attackerToken ? 'Found' : 'Not found');
    console.log('AttackerToken.name:', (attackerToken as any)?.name);
    console.log('AttackerToken.document?.name:', attackerToken?.document?.name);
    console.log('AttackerToken.actor?.name:', attackerToken?.actor?.name);
    console.log('DefenderToken object:', defenderToken ? 'Found' : 'Not found');
    console.log('DefenderToken.name:', (defenderToken as any)?.name);
    console.log('DefenderToken.document?.name:', defenderToken?.document?.name);
    console.log('DefenderToken.actor?.name:', defenderToken?.actor?.name);
    console.log('--- UUIDs to be stored in flags ---');
    console.log('attackerUuid (final):', finalAttackerUuid || 'Unknown');
    console.log('attackerTokenUuid (final):', attackerTokenUuid || 'Unknown');
    console.log('defenderUuid (final):', finalDefenderUuid || 'Unknown');
    console.log('defenderTokenUuid (final):', defenderTokenUuid || 'Unknown');
    console.log('==============================');
    
    // For counter-attack: attacker = counter-attacker (original defender), defender = original attacker
    // Winner is determined by who has more successes
    const originalAttackerUuid = finalDefenderUuid; // Original attacker is defender in counter-attack context
    const originalDefenderUuid = finalAttackerUuid; // Original defender/counter-attacker is attacker in counter-attack context
    
    // Determine who inflicts damage based on winner
    let damageInflicterUuid: string | undefined = undefined;
    let damageReceiverUuid: string | undefined = undefined;
    let damageInflicterName: string = '';
    let damageReceiverName: string = '';
    
    if (winner === 'attacker') {
      // Original attacker wins (attackSuccesses > counterAttackSuccesses)
      // Original attacker inflicts damage to counter-attacker
      damageInflicterUuid = originalAttackerUuid;
      damageReceiverUuid = originalDefenderUuid;
      damageInflicterName = originalAttackerName;
      damageReceiverName = originalDefenderName;
      console.log('Counter-attack: Original attacker wins - inflicts damage to counter-attacker');
      console.log('  Inflicter:', damageInflicterName, '(', damageInflicterUuid, ')');
      console.log('  Receiver:', damageReceiverName, '(', damageReceiverUuid, ')');
    } else if (winner === 'defender') {
      // Counter-attacker wins (counterAttackSuccesses > attackSuccesses)
      // Counter-attacker inflicts damage to original attacker
      damageInflicterUuid = originalDefenderUuid;
      damageReceiverUuid = originalAttackerUuid;
      damageInflicterName = originalDefenderName;
      damageReceiverName = originalAttackerName;
      console.log('Counter-attack: Counter-attacker wins - inflicts damage to original attacker');
      console.log('  Inflicter:', damageInflicterName, '(', damageInflicterUuid, ')');
      console.log('  Receiver:', damageReceiverName, '(', damageReceiverUuid, ')');
    }
    
    // Get damage types: attacker uses original attack's type, defender uses counter-attack weapon's type
    const attackerDamageType = (rollData.attackRollData?.damageType || 'physical') as 'physical' | 'mental' | 'matrix';
    const defenderDamageType = (rollData.damageType || 'physical') as 'physical' | 'mental' | 'matrix';
    
    defenseResult = {
      attackSuccesses: attackSuccesses,
      counterAttackSuccesses: counterAttackSuccesses,
      winner: winner,
      attackerDamage: attackerDamage,
      defenderDamage: defenderDamage,
      isTie: isTie,
      originalAttackerName: originalAttackerName,
      originalDefenderName: originalDefenderName,
      // UUIDs for applying damage
      originalAttackerUuid: originalAttackerUuid,
      originalDefenderUuid: originalDefenderUuid,
      damageInflicterUuid: damageInflicterUuid,
      damageReceiverUuid: damageReceiverUuid,
      damageInflicterName: damageInflicterName,
      damageReceiverName: damageReceiverName,
      // Damage types
      attackerDamageType: attackerDamageType,
      defenderDamageType: defenderDamageType
    };
  }

  // Prepare template data
  // Create attacker and defender objects with correct UUIDs (token actor UUID for NPCs)
  const attackerWithUuid = attacker ? {
    ...attacker,
    uuid: finalAttackerUuid || attacker.uuid // Use calculated UUID (token actor UUID for NPCs)
  } : null;
  
  const defenderWithUuid = defenderData ? {
    ...defenderData,
    uuid: finalDefenderUuid || defenderData.uuid // Use calculated UUID (token actor UUID for NPCs)
  } : null;
  
  const templateData: any = {
    attacker: attackerWithUuid,
    defender: defenderWithUuid,
    rollData: rollData,
    rollResult: rollResult,
    isAttack: isAttack,
    isDefend: rollData.isDefend || false,
    isCounterAttack: rollData.isCounterAttack || false,
    skillName: rollData.specName || rollData.skillName || rollData.linkedAttackSkill || 'Unknown',
    itemName: rollData.itemName,
    damageValue: rollData.damageValue,
    defenseResult: defenseResult,
    // Also pass UUIDs directly for template convenience
    attackerUuid: finalAttackerUuid,
    defenderUuid: finalDefenderUuid,
    attackerTokenUuid: attackerTokenUuid,
    defenderTokenUuid: defenderTokenUuid,
    // Spell-specific flags
    isSpellDirect: rollData.isSpellDirect || false
  };

  // Render template
  const html = await renderTemplate('systems/sra2/templates/roll-result.hbs', templateData);

  // Create chat message
  const messageData: any = {
    user: game.user?.id,
    speaker: {
      actor: attacker?.id,
      alias: attacker?.name
    },
    content: html,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    flags: {
      sra2: {
        rollType: isAttack ? 'attack' : 'skill',
        attackerId: attacker?.id,
        attackerUuid: finalAttackerUuid, // Use token's actor UUID if token exists, otherwise actor UUID
        attackerTokenUuid: attackerTokenUuid, // Store token UUID
        defenderId: defender?.id,
        defenderUuid: finalDefenderUuid, // Use token's actor UUID if token exists, otherwise actor UUID
        defenderTokenUuid: defenderTokenUuid, // Store token UUID
        rollResult: rollResult,
        rollData: rollData
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
    const message = game.i18n.localize('SRA2.SKILLS.DRAIN_MINOR_COMPLICATION');
    await ChatMessage.create({
      user: game.user?.id,
      speaker: {
        actor: actor.id,
        alias: actor.name
      },
      content: `<div class="drain-message minor-complication" style="padding: 8px; margin: 4px 0; background-color: rgba(255, 193, 7, 0.1); border-left: 3px solid #ffc107; border-radius: 4px;">
        <i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> 
        <strong style="color: #ffc107;">Drain - ${game.i18n.localize('SRA2.SKILLS.MINOR_COMPLICATION')}</strong>
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
      
      const message = game.i18n.localize('SRA2.SKILLS.DRAIN_CRITICAL_COMPLICATION');
      await ChatMessage.create({
        user: game.user?.id,
        speaker: {
          actor: actor.id,
          alias: actor.name
        },
        content: `<div class="drain-message critical-complication" style="padding: 8px; margin: 4px 0; background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 4px;">
          <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i> 
          <strong style="color: #dc3545;">Drain - ${game.i18n.localize('SRA2.SKILLS.CRITICAL_COMPLICATION')}</strong>
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
      
      const message = game.i18n.localize('SRA2.SKILLS.DRAIN_CRITICAL_COMPLICATION');
      await ChatMessage.create({
        user: game.user?.id,
        speaker: {
          actor: actor.id,
          alias: actor.name
        },
        content: `<div class="drain-message critical-complication" style="padding: 8px; margin: 4px 0; background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 4px;">
          <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i> 
          <strong style="color: #dc3545;">Drain - ${game.i18n.localize('SRA2.SKILLS.CRITICAL_COMPLICATION')}</strong>
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
    
    const message = game.i18n.localize('SRA2.SKILLS.DRAIN_DISASTER');
    await ChatMessage.create({
      user: game.user?.id,
      speaker: {
        actor: actor.id,
        alias: actor.name
      },
      content: `<div class="drain-message disaster" style="padding: 8px; margin: 4px 0; background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 4px;">
        <i class="fas fa-skull" style="color: #dc3545;"></i> 
        <strong style="color: #dc3545;">Drain - ${game.i18n.localize('SRA2.SKILLS.DISASTER')}</strong>
        <br/>
        <span style="margin-left: 20px; display: block; margin-top: 4px;">${message}</span>
      </div>`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}


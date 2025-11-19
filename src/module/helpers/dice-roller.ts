/**
 * Shared Dice Rolling Utilities for SRA2
 * This module contains common dice rolling functions used across character sheets, NPC sheets, and item sheets.
 */

// Roll is available globally in FoundryVTT
declare const Roll: any;
declare const renderTemplate: any;
declare const ChatMessage: any;

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
 * REMOVED: Roll dialog script generation
 */

/**
 * REMOVED: Roll dialog content creation
 */

/**
 * REMOVED: Dice rolling logic
 * All dice rolling and chat message functions have been removed.
 * Only UI triggers and threshold calculations remain.
 */

/**
 * REMOVED: HTML building for dice results
 */

/**
 * REMOVED: Chat message posting
 */

/**
 * REMOVED: Dialog creation for rolls
 * Dialogs and callbacks have been removed as they trigger dice rolls.
 */

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
  meleeRange?: string;  // "none" | "ok" | "disadvantage"
  shortRange?: string;  // "none" | "ok" | "disadvantage"
  mediumRange?: string; // "none" | "ok" | "disadvantage"
  longRange?: string;   // "none" | "ok" | "disadvantage"
  
  // Skill/Spec information (undefined if not found)
  skillName?: string;
  specName?: string;
  skillLevel?: number;
  specLevel?: number;
  
  // NPC threshold (when not rolling dice)
  threshold?: number;
  
  // Actor information
  actorId?: string;
  actorUuid?: string;
  actorName?: string;
  
  // RR List
  rrList?: any[];
  
  // Risk dice count (number of risk dice selected)
  riskDiceCount?: number;
  
  // Final calculated values
  finalRR?: number;
  dicePool?: number;
  
  // Roll mode
  rollMode?: 'normal' | 'disadvantage' | 'advantage';
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
  defenderToken: any,
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
  const finalRR = Math.min(3, rollData.finalRR || 0);

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

  const rollResult: RollResult = {
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

  // Step 5: Create chat message
  await createRollChatMessage(attacker, defender, defenderToken, rollData, rollResult);
}

/**
 * Create chat message for roll result
 * Step 5: Display roll results in chat
 */
async function createRollChatMessage(
  attacker: any,
  defender: any,
  defenderToken: any,
  rollData: RollRequestData,
  rollResult: RollResult
): Promise<void> {
  // Determine if this is an attack
  const isAttack = rollData.itemType === 'weapon' || 
                   rollData.weaponType !== undefined ||
                   (rollData.meleeRange || rollData.shortRange || rollData.mediumRange || rollData.longRange);

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

  // Prepare template data
  const templateData: any = {
    attacker: attacker,
    defender: defenderData,
    rollData: rollData,
    rollResult: rollResult,
    isAttack: isAttack,
    skillName: rollData.specName || rollData.skillName || rollData.linkedAttackSkill || 'Unknown',
    itemName: rollData.itemName,
    damageValue: rollData.damageValue
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
        attackerUuid: attacker?.uuid,
        defenderId: defender?.id,
        defenderUuid: defender?.uuid,
        rollResult: rollResult,
        rollData: rollData
      }
    }
  };

  await ChatMessage.create(messageData);
}


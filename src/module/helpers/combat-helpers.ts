/**
 * Combat Helpers for SRA2
 * Shared functions for combat, defense, and attack calculations
 */

import * as SheetHelpers from './sheet-helpers.js';
import { VEHICLE_TYPES } from '../models/item-feat.js';

/**
 * Calculate NPC threshold for a skill or specialization
 */
export function calculateNPCThreshold(
  actor: any,
  item: any,
  dicePool: number,
  itemType: 'skill' | 'specialization',
  parentSkill?: any
): { threshold: number; totalRR: number } {
  let totalRR = 0;
  
  // Get all active feats
  const activeFeats = actor.items.filter((i: any) => 
    i.type === 'feat' && i.system.active === true
  );
  
  // Get linked attribute for this item
  const linkedAttribute = item.system.linkedAttribute;
  
  // Check each feat for RR that applies
  activeFeats.forEach((feat: any) => {
    const rrList = feat.system.rrList || [];
    rrList.forEach((rrEntry: any) => {
      // Check if RR applies to this item
      if (itemType === 'skill' && rrEntry.rrType === 'skill' && rrEntry.rrTarget === item.name) {
        totalRR += rrEntry.rrValue || 0;
      } else if (itemType === 'specialization') {
        // For specializations, check spec RR and also inherit skill RR
        if (rrEntry.rrType === 'specialization' && rrEntry.rrTarget === item.name) {
          totalRR += rrEntry.rrValue || 0;
        } else if (parentSkill && rrEntry.rrType === 'skill' && rrEntry.rrTarget === parentSkill.name) {
          totalRR += rrEntry.rrValue || 0;
        }
      }
      
      // Also check for attribute RR
      if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === linkedAttribute) {
        totalRR += rrEntry.rrValue || 0;
      }
    });
  });
  
  // Calculate NPC threshold: round(dice pool / 3) + RR + 1
  const threshold = Math.round(dicePool / 3) + totalRR + 1;
  
  return { threshold, totalRR };
}

/**
 * Build skill and specialization options HTML for defense dialog
 */
export interface BuildSkillOptionsParams {
  defenderActor: any;
  skills: any[];
  allSpecializations: any[];
  defaultSelection: string;
  includeThreshold?: boolean; // Whether to show NPC threshold
}

export function buildSkillOptionsHtml(params: BuildSkillOptionsParams): string {
  const { defenderActor, skills, allSpecializations: _allSpecializations, defaultSelection, includeThreshold = false } = params;
  
  let html = '<option value="">-- ' + game.i18n!.localize('SRA2.COMBAT.SELECT_DEFENSE_SKILL') + ' --</option>';
  
  // Sort skills alphabetically by name
  const sortedSkills = [...skills].sort((a: any, b: any) => a.name.localeCompare(b.name));
  
  sortedSkills.forEach((skill: any) => {
    const skillSystem = skill.system as any;
    const linkedAttribute = skillSystem.linkedAttribute || 'strength';
    const attributeValue = (defenderActor.system as any).attributes?.[linkedAttribute] || 0;
    const skillRating = skillSystem.rating || 0;
    const totalDicePool = attributeValue + skillRating;
    
    let optionText = `${skill.name} (${totalDicePool} dés)`;
    let dataAttrs = `data-dice-pool="${totalDicePool}"`;
    
    // Calculate threshold if requested
    if (includeThreshold) {
      const { threshold } = calculateNPCThreshold(defenderActor, skill, totalDicePool, 'skill');
      optionText = `${skill.name} (Seuil: ${threshold} / ${totalDicePool} dés)`;
      dataAttrs += ` data-threshold="${threshold}"`;
    }
    
    // Check if this skill should be selected by default
    const selected = defaultSelection === `skill-${skill.id}` ? ' selected' : '';
    
    html += `<option value="skill-${skill.id}" ${dataAttrs}${selected}>${optionText}</option>`;
    
    // Add specializations for this skill using helper
    const specs = SheetHelpers.getSpecializationsForSkill(defenderActor, skill.name);
    
    specs.forEach((spec: any) => {
      const specTotalDicePool = SheetHelpers.calculateSpecDicePool(defenderActor, spec, skill);
      const effectiveRating = skillRating + 2;
      
      let specOptionText = `  → ${spec.name} (${specTotalDicePool} dés)`;
      let specDataAttrs = `data-dice-pool="${specTotalDicePool}" data-effective-rating="${effectiveRating}"`;
      
      // Calculate threshold if requested
      if (includeThreshold) {
        const { threshold: specThreshold } = calculateNPCThreshold(defenderActor, spec, specTotalDicePool, 'specialization', skill);
        specOptionText = `  → ${spec.name} (Seuil: ${specThreshold} / ${specTotalDicePool} dés)`;
        specDataAttrs += ` data-threshold="${specThreshold}"`;
      }
      
      // Check if this specialization should be selected by default
      const specSelected = defaultSelection === `spec-${spec.id}` ? ' selected' : '';
      
      html += `<option value="spec-${spec.id}" ${specDataAttrs}${specSelected}>${specOptionText}</option>`;
    });
  });
  
  return html;
}

/**
 * REMOVED: Defense dice roll function
 */

/**
 * REMOVED: Dice results HTML building
 */

/**
 * Parse weapon damage value and calculate base VD
 * Includes damageValueBonus from weapon feat
 * 
 * @deprecated Use SheetHelpers.parseDamageValue() for more complete information
 */
export function parseWeaponDamageValue(
  weaponDamageValue: string | number,
  actorStrength: number,
  damageValueBonus: number = 0
): { baseVD: number; vdDisplay: string } {
  // Delegate to the shared helper
  const result = SheetHelpers.parseDamageValue(String(weaponDamageValue), actorStrength, damageValueBonus);
  
  return {
    baseVD: result.isToxin ? -1 : result.numericValue,
    vdDisplay: result.displayValue
  };
}

/**
 * REMOVED: NPC attack HTML building
 */

/**
 * REMOVED: Threshold defense result creation
 */

/**
 * Build skill selection options for weapon/spell attack
 * Similar to buildSkillOptionsHtml but without threshold calculation
 */
export function buildAttackSkillOptionsHtml(
  actor: any,
  skills: any[],
  _allSpecializations: any[],
  defaultSelection: string
): string {
  let html = '<option value="">-- ' + game.i18n!.localize('SRA2.FEATS.WEAPON.SELECT_SKILL') + ' --</option>';
  
  // Sort skills alphabetically by name
  const sortedSkills = [...skills].sort((a: any, b: any) => a.name.localeCompare(b.name));
  
  sortedSkills.forEach((skill: any) => {
    const skillSystem = skill.system as any;
    const linkedAttribute = skillSystem.linkedAttribute || 'strength';
    const attributeValue = (actor.system as any).attributes?.[linkedAttribute] || 0;
    const skillRating = skillSystem.rating || 0;
    const totalDicePool = attributeValue + skillRating;
    
    const selected = defaultSelection === `skill-${skill.id}` ? ' selected' : '';
    html += `<option value="skill-${skill.id}" data-dice-pool="${totalDicePool}"${selected}>${skill.name} (${totalDicePool} dés)</option>`;
    
    // Add specializations for this skill using helper
    const specs = SheetHelpers.getSpecializationsForSkill(actor, skill.name);
    
    specs.forEach((spec: any) => {
      const specTotalDicePool = SheetHelpers.calculateSpecDicePool(actor, spec, skill);
      const effectiveRating = skillRating + 2;
      
      const specSelected = defaultSelection === `spec-${spec.id}` ? ' selected' : '';
      html += `<option value="spec-${spec.id}" data-dice-pool="${specTotalDicePool}" data-effective-rating="${effectiveRating}"${specSelected}>  → ${spec.name} (${specTotalDicePool} dés)</option>`;
    });
  });
  
  return html;
}

/**
 * REMOVED: Weapon/spell dialog content creation
 */

/**
 * REMOVED: Attack result display and chat message creation
 */

/**
 * Prepare vehicle/drone weapon attack data for dice rolling
 * Vehicles use autopilot as dice pool instead of skills
 */
export function prepareVehicleWeaponAttack(
  vehicleActor: any,
  weapon: any
): {
  dicePool: number;
  rrList: Array<{ featName: string; rrValue: number }>;
  damageValue: string;
} {
  const vehicleSystem = vehicleActor.system as any;
  const weaponSystem = weapon.system as any;
  
  // Get autopilot as base dice pool (with bonus included)
  // attributes.autopilot should already contain finalAutopilot = baseAutopilot + autopilotBonus (max 12)
  // But to ensure bonus is always included, we recalculate it if needed
  let autopilot = vehicleSystem.attributes?.autopilot;
  
  // Always recalculate to ensure autopilotBonus is included (in case prepareDerivedData wasn't called)
  const vehicleType = vehicleSystem.vehicleType || "";
  const vehicleStats = vehicleType && VEHICLE_TYPES[vehicleType as keyof typeof VEHICLE_TYPES] 
    ? VEHICLE_TYPES[vehicleType as keyof typeof VEHICLE_TYPES] 
    : null;
  const baseAutopilot = vehicleStats?.autopilot || 6;
  const autopilotBonus = vehicleSystem.autopilotBonus || 0;
  const calculatedAutopilot = Math.min(12, baseAutopilot + autopilotBonus);
  
  // Use calculated value to ensure bonus is always included
  autopilot = calculatedAutopilot;
  const dicePool = autopilot;
  
  // Get all active feats for RR calculation
  const activeFeats = vehicleActor.items.filter((item: any) => 
    item.type === 'feat' && item.system.active === true
  );
  
  // Calculate RR from active feats (only autopilot attribute RR applies)
  const rrList: Array<{ featName: string; rrValue: number }> = [];
  activeFeats.forEach((feat: any) => {
    const featRRList = feat.system.rrList || [];
    featRRList.forEach((rrEntry: any) => {
      if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === 'autopilot') {
        rrList.push({
          featName: feat.name,
          rrValue: rrEntry.rrValue || 0
        });
      }
    });
  });
  
  // Also check weapon's own RR list and enrich with featName
  const weaponRRList = weaponSystem.rrList || [];
  weaponRRList.forEach((rrEntry: any) => {
    if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === 'autopilot') {
      rrList.push({
        featName: weapon.name,
        rrValue: rrEntry.rrValue || 0
      });
    }
  });
  
  // Calculate final damage value (base + bonus) - same logic as character-sheet.ts
  const baseDamageValue = parseInt(weaponSystem.damageValue || '0') || 0;
  const damageValueBonus = parseInt(weaponSystem.damageValueBonus || '0') || 0;
  
  let finalDamageValue = baseDamageValue + damageValueBonus;
  
  return {
    dicePool,
    rrList,
    damageValue: finalDamageValue.toString()
  };
}

/**
 * Prepare complete vehicle/drone weapon roll request data for DiceRoller
 * Uses prepareVehicleWeaponAttack and adds weapon type links
 */
export function prepareVehicleWeaponRollRequest(
  vehicleActor: any,
  weapon: any,
  WEAPON_TYPES: any
): any {
  const weaponSystem = weapon.system as any;
  const weaponType = weaponSystem.weaponType || 'custom-weapon';
  
  // Get weapon attack data using existing helper
  const attackData = prepareVehicleWeaponAttack(vehicleActor, weapon);
  
  // Get weapon type links for defense skills
  let weaponLinkedDefenseSkill = '';
  let weaponLinkedDefenseSpecialization = '';
  
  if (weaponType && weaponType !== 'custom-weapon') {
    const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
    if (weaponStats) {
      weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || '';
      weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || '';
    }
  }
  
  // Merge with custom fields (weapon type has priority)
  const finalDefenseSkill = weaponLinkedDefenseSkill || weaponSystem.linkedDefenseSkill || '';
  const finalDefenseSpec = weaponLinkedDefenseSpecialization || weaponSystem.linkedDefenseSpecialization || '';
  
  // Return complete roll request data
  return {
    itemType: 'weapon',
    weaponType: weaponType,
    itemName: weapon.name,
    itemId: weapon.id,
    itemRating: weaponSystem.rating || 0,
    itemActive: weaponSystem.active,
    
    // No linked attack skill/spec for vehicles (uses autopilot directly)
    linkedAttackSkill: '',
    linkedAttackSpecialization: '',
    linkedDefenseSkill: finalDefenseSkill,
    linkedDefenseSpecialization: finalDefenseSpec,
    linkedAttribute: 'autopilot', // Vehicles use autopilot attribute
    
    // Weapon properties
    isWeaponFocus: weaponSystem.isWeaponFocus || false,
    damageValue: attackData.damageValue, // Already includes bonus
    meleeRange: weaponSystem.meleeRange,
    shortRange: weaponSystem.shortRange,
    mediumRange: weaponSystem.mediumRange,
    longRange: weaponSystem.longRange,
    
    // Attack skill/spec (empty for vehicles, dice pool comes from autopilot)
    skillName: undefined,
    skillLevel: attackData.dicePool, // Use autopilot as skill level for dice pool
    specName: undefined,
    specLevel: undefined,
    
    // Actor information
    actorId: vehicleActor.id,
    actorUuid: vehicleActor.uuid,
    actorName: vehicleActor.name || '',
    
    // RR List
    rrList: attackData.rrList
  };
}

/**
 * Apply damage to a defender (character, NPC, or vehicle/drone)
 * Handles different damage thresholds for vehicles vs characters
 * @param defenderUuid - UUID of the defender
 * @param damageValue - Damage value to apply
 * @param defenderName - Name of the defender (for notifications)
 * @param damageType - Type of damage: 'physical' (default) or 'mental' (for direct spells)
 */
/**
 * Create an ICE attack message in chat
 * ICEs have a fixed threshold (server index) instead of rolling dice
 */
export async function createIceAttackMessage(
  iceActor: any,
  iceToken: any,
  defender: any,
  defenderToken: any
): Promise<void> {
  const iceSystem = iceActor.system as any;
  const iceType = iceSystem.iceType;
  const serverIndex = iceSystem.serverIndex || 1;
  const threshold = iceSystem.threshold || serverIndex;
  const damageValue = iceSystem.damageValue || 0;
  
  // Only ICEs that can attack (not Patrol, Acid, Blocker, Glue, Tracker)
  const attackingIceTypes = ['blaster', 'black', 'killer'];
  if (!attackingIceTypes.includes(iceType)) {
    ui.notifications?.warn(game.i18n!.localize('SRA2.ICE.CANNOT_ATTACK'));
    return;
  }
  
  // Get token UUIDs
  const iceTokenUuid = iceToken?.uuid || iceToken?.document?.uuid;
  const defenderTokenUuid = defenderToken?.uuid || defenderToken?.document?.uuid;
  
  // Determine final UUIDs (token actor UUID for NPCs)
  const finalIceUuid = iceToken?.actor?.uuid || iceActor.uuid;
  const finalDefenderUuid = defenderToken?.actor?.uuid || defender.uuid;
  
  // Create a fake roll result with fixed threshold
  const rollResult = {
    normalDice: [],
    riskDice: [],
    normalSuccesses: 0,
    riskSuccesses: 0,
    totalSuccesses: threshold, // ICE uses fixed threshold
    criticalFailures: 0,
    finalRR: 0,
    remainingFailures: 0,
    complication: 'none'
  };
  
  // Prepare roll data for ICE attack
  const rollData = {
    itemType: 'ice-attack',
    iceType: iceType,
    serverIndex: serverIndex,
    threshold: threshold,
    damageValue: damageValue.toString(),
    iceDamageValue: damageValue, // Store separately for defense calculation
    skillName: 'Cybercombat (GLACE)',
    itemName: iceActor.name,
    isAttack: true,
    isDefend: false,
    isCounterAttack: false,
    isSpellDirect: false
  };
  
  // Prepare defender data with token image
  let defenderData: any = null;
  if (defender) {
    let tokenImg = defender.img;
    if (defenderToken) {
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
    attacker: {
      ...iceActor,
      uuid: finalIceUuid
    },
    defender: defenderData,
    rollData: rollData,
    rollResult: rollResult,
    isAttack: true,
    isDefend: false,
    isCounterAttack: false,
    skillName: 'Cybercombat (GLACE)',
    itemName: iceActor.name,
    damageValue: damageValue.toString(),
    attackerUuid: finalIceUuid,
    defenderUuid: finalDefenderUuid,
    attackerTokenUuid: iceTokenUuid,
    defenderTokenUuid: defenderTokenUuid
  };
  
  // Render template
  const html = await renderTemplate('systems/sra2/templates/roll-result.hbs', templateData);
  
  // Create chat message
  const messageData: any = {
    user: game.user?.id,
    speaker: {
      actor: iceActor.id,
      alias: iceActor.name
    },
    content: html,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    flags: {
      sra2: {
        rollType: 'ice-attack',
        attackerId: iceActor.id,
        attackerUuid: finalIceUuid,
        attackerTokenUuid: iceTokenUuid,
        defenderId: defender?.id,
        defenderUuid: finalDefenderUuid,
        defenderTokenUuid: defenderTokenUuid,
        rollResult: rollResult,
        rollData: rollData,
        iceType: iceType,
        iceThreshold: threshold,
        iceDamageValue: damageValue
      }
    }
  };
  
  await ChatMessage.create(messageData);
}

export async function applyDamage(defenderUuid: string, damageValue: number, defenderName: string, damageType: 'physical' | 'mental' = 'physical'): Promise<void> {
  // Use fromUuid to get the token's actor if it's a token UUID, or the actor if it's an actor UUID
  const defender = await fromUuid(defenderUuid as any) as any;
  
  if (!defender) {
    ui.notifications?.error(`Cannot find defender: ${defenderName}`);
    return;
  }
  
  // If this is a token, get its actor
  const defenderActor = defender.actor || defender;
  
  const defenderSystem = defenderActor.system as any;
  const isVehicle = defenderActor.type === 'vehicle';
  const isIce = defenderActor.type === 'ice';
  
  // Get damage thresholds based on actor type and damage type
  let damageThresholds: { light: number; severe?: number; incapacitating: number };
  if (isIce) {
    // For ICE, thresholds are based on FW = 1: light = 1, severe = 2, incapacitating = 3
    damageThresholds = defenderSystem.damageThresholds || {
      light: 1,
      severe: 2,
      incapacitating: 3
    };
  } else if (isVehicle) {
    // For vehicles/drones, thresholds are directly in damageThresholds
    // Vehicles don't have mental damage thresholds, use physical
    damageThresholds = defenderSystem.damageThresholds || {
      light: 1,
      severe: 4,
      incapacitating: 7
    };
  } else {
    // For characters, use mental thresholds for mental damage, physical for physical damage
    if (damageType === 'mental') {
      damageThresholds = defenderSystem.damageThresholds?.mental || {
        light: 1,
        severe: 4,
        incapacitating: 7
      };
    } else {
      // Physical damage: use withArmor thresholds
      damageThresholds = defenderSystem.damageThresholds?.withArmor || {
        light: 1,
        severe: 4,
        incapacitating: 7
      };
    }
  }
  
  // Deep copy of damage object with arrays
  let damage = {
    light: [...(defenderSystem.damage?.light || [])],
    severe: [...(defenderSystem.damage?.severe || [])],
    incapacitating: defenderSystem.damage?.incapacitating || false
  };
  let woundType = '';
  let overflow = false;
  
  // Determine damage type based on thresholds
  // For ICE: light = 1, severe = 2, incapacitating = 3 (based on FW = 1)
  // For vehicles: light = Structure + Armor, severe = (2 × Structure) + Armor, incapacitating = (3 × Structure) + Armor
  // For characters: light, severe, incapacitating from withArmor thresholds
  
  if (isIce) {
    // ICE damage thresholds
    if (damageThresholds.incapacitating && damageValue > damageThresholds.incapacitating) {
      // Incapacitating wound: VD > 3
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_INCAPACITATING');
      damage.incapacitating = true;
    } else if (damageValue > (damageThresholds?.severe || 0)) {
      // Severe wound: VD > 2
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_SEVERE');
      
      // Find first empty severe box
      let applied = false;
      for (let i = 0; i < damage.severe.length; i++) {
        if (!damage.severe[i]) {
          damage.severe[i] = true;
          applied = true;
          break;
        }
      }
      
      // If no space in severe, overflow to incapacitating
      if (!applied) {
        ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE'));
        damage.incapacitating = true;
        overflow = true;
      }
    } else if (damageValue > damageThresholds.light) {
      // Light wound: VD > 1
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_LIGHT');
      
      // Find first empty light box
      let applied = false;
      for (let i = 0; i < damage.light.length; i++) {
        if (!damage.light[i]) {
          damage.light[i] = true;
          applied = true;
          break;
        }
      }
      
      // If no space in light, overflow to severe
      if (!applied) {
        ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_LIGHT'));
        
        // Try to apply to severe
        let severeApplied = false;
        for (let i = 0; i < damage.severe.length; i++) {
          if (!damage.severe[i]) {
            damage.severe[i] = true;
            severeApplied = true;
            break;
          }
        }
        
        // If no space in severe either, overflow to incapacitating
        if (!severeApplied) {
          ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE'));
          damage.incapacitating = true;
        }
        overflow = true;
      }
    } else {
      // Damage below light threshold, no wound: VD ≤ 1
      ui.notifications?.info(game.i18n!.format('SRA2.COMBAT.DAMAGE_APPLIED', { 
        damage: `${damageValue} (en dessous du seuil)`,
        target: defenderName 
      }));
      return;
    }
  } else if (isVehicle) {
    // Vehicle/drone damage thresholds
    if (damageThresholds.incapacitating && damageValue > damageThresholds.incapacitating) {
      // Incapacitating wound: VD > (3 × Structure) + Blindage
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_INCAPACITATING');
      damage.incapacitating = true;
    } else if (damageValue > (damageThresholds.severe || 0)) {
      // Severe wound: VD > (2 × Structure) + Blindage
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_SEVERE');
      
      // Find first empty severe box
      let applied = false;
      for (let i = 0; i < damage.severe.length; i++) {
        if (!damage.severe[i]) {
          damage.severe[i] = true;
          applied = true;
          break;
        }
      }
      
      // If no space in severe, overflow to incapacitating
      if (!applied) {
        ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE'));
        damage.incapacitating = true;
        overflow = true;
      }
    } else if (damageValue > damageThresholds.light) {
      // Light wound: VD > Structure + Blindage
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_LIGHT');
      
      // Find first empty light box
      let applied = false;
      for (let i = 0; i < damage.light.length; i++) {
        if (!damage.light[i]) {
          damage.light[i] = true;
          applied = true;
          break;
        }
      }
      
      // If no space in light, overflow to severe
      if (!applied) {
        ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_LIGHT'));
        
        // Try to apply to severe
        let severeApplied = false;
        for (let i = 0; i < damage.severe.length; i++) {
          if (!damage.severe[i]) {
            damage.severe[i] = true;
            severeApplied = true;
            break;
          }
        }
        
        // If no space in severe either, overflow to incapacitating
        if (!severeApplied) {
          ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE'));
          damage.incapacitating = true;
        }
        overflow = true;
      }
    } else {
      // Damage below light threshold, no wound: VD ≤ Structure + Blindage
      ui.notifications?.info(game.i18n!.format('SRA2.COMBAT.DAMAGE_APPLIED', { 
        damage: `${damageValue} (en dessous du seuil)`,
        target: defenderName 
      }));
      return;
    }
  } else {
    // Character damage thresholds
    if (damageValue > (damageThresholds?.incapacitating || 0)) {
      // Incapacitating wound
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_INCAPACITATING');
      damage.incapacitating = true;
    } else if (damageThresholds.severe && damageValue > (damageThresholds.severe || 0)) {
      // Severe wound
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_SEVERE');
      
      // Find first empty severe box
      let applied = false;
      for (let i = 0; i < damage.severe.length; i++) {
        if (!damage.severe[i]) {
          damage.severe[i] = true;
          applied = true;
          break;
        }
      }
      
      // If no space in severe, overflow to incapacitating
      if (!applied) {
        ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE'));
        damage.incapacitating = true;
        overflow = true;
      }
    } else if (damageValue > damageThresholds.light) {
      // Light wound
      woundType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_LIGHT');
      
      // Find first empty light box
      let applied = false;
      for (let i = 0; i < damage.light.length; i++) {
        if (!damage.light[i]) {
          damage.light[i] = true;
          applied = true;
          break;
        }
      }
      
      // If no space in light, overflow to severe
      if (!applied) {
        ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_LIGHT'));
        
        // Try to apply to severe
        let severeApplied = false;
        for (let i = 0; i < damage.severe.length; i++) {
          if (!damage.severe[i]) {
            damage.severe[i] = true;
            severeApplied = true;
            break;
          }
        }
        
        // If no space in severe either, overflow to incapacitating
        if (!severeApplied) {
          ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE'));
          damage.incapacitating = true;
        }
        overflow = true;
      }
    } else {
      // Damage below light threshold, no wound
      ui.notifications?.info(game.i18n!.format('SRA2.COMBAT.DAMAGE_APPLIED', { 
        damage: `${damageValue} (en dessous du seuil)`,
        target: defenderName 
      }));
      return;
    }
  }
  
  // Update the actor's damage (use defenderActor to update the token's actor data)
  // The prepareDerivedData() method now preserves existing damage values, so normal update should work
  await defenderActor.update({ 'system.damage': damage });
  
  // Check if now incapacitated
  if (damage.incapacitating === true) {
    ui.notifications?.error(game.i18n!.format('SRA2.COMBAT.NOW_INCAPACITATED', { target: defenderName }));
  } else {
    ui.notifications?.info(game.i18n!.format('SRA2.COMBAT.DAMAGE_APPLIED', { 
      damage: overflow ? `${woundType} (débordement)` : woundType,
      target: defenderName 
    }));
  }
}


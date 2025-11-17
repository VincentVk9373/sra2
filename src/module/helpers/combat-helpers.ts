/**
 * Combat Helpers for SRA2
 * Shared functions for combat, defense, and attack calculations
 */

import * as ItemSearch from './item-search.js';

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
  const { defenderActor, skills, allSpecializations, defaultSelection, includeThreshold = false } = params;
  
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
      optionText = `${skill.name} (${game.i18n!.localize('SRA2.NPC.THRESHOLD')}: ${threshold} / ${totalDicePool} dés)`;
      dataAttrs += ` data-threshold="${threshold}"`;
    }
    
    // Check if this skill should be selected by default
    const selected = defaultSelection === `skill-${skill.id}` ? ' selected' : '';
    
    html += `<option value="skill-${skill.id}" ${dataAttrs}${selected}>${optionText}</option>`;
    
    // Add specializations for this skill
    const specs = allSpecializations.filter((spec: any) => {
      const linkedSkillName = spec.system.linkedSkill;
      return ItemSearch.normalizeSearchText(linkedSkillName) === ItemSearch.normalizeSearchText(skill.name);
    });
    
    specs.forEach((spec: any) => {
      const specSystem = spec.system as any;
      const specLinkedAttribute = specSystem.linkedAttribute || 'strength';
      const specAttributeValue = (defenderActor.system as any).attributes?.[specLinkedAttribute] || 0;
      const parentRating = skillRating;
      const effectiveRating = parentRating + 2;
      const specTotalDicePool = specAttributeValue + effectiveRating;
      
      let specOptionText = `  → ${spec.name} (${specTotalDicePool} dés)`;
      let specDataAttrs = `data-dice-pool="${specTotalDicePool}" data-effective-rating="${effectiveRating}"`;
      
      // Calculate threshold if requested
      if (includeThreshold) {
        const { threshold: specThreshold } = calculateNPCThreshold(defenderActor, spec, specTotalDicePool, 'specialization', skill);
        specOptionText = `  → ${spec.name} (${game.i18n!.localize('SRA2.NPC.THRESHOLD')}: ${specThreshold} / ${specTotalDicePool} dés)`;
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
 */
export function parseWeaponDamageValue(
  weaponDamageValue: string | number,
  actorStrength: number,
  damageValueBonus: number = 0
): { baseVD: number; vdDisplay: string } {
  // Ensure weaponDamageValue is a string
  const vdString = String(weaponDamageValue);
  
  let baseVD = 0;
  let vdDisplay = vdString;
  
  if (vdString === 'FOR') {
    baseVD = actorStrength + damageValueBonus;
    if (damageValueBonus > 0) {
      vdDisplay = `FOR+${damageValueBonus} (${baseVD})`;
    } else {
      vdDisplay = `FOR (${actorStrength})`;
    }
  } else if (vdString.startsWith('FOR+')) {
    const modifier = parseInt(vdString.substring(4)) || 0;
    baseVD = actorStrength + modifier + damageValueBonus;
    if (damageValueBonus > 0) {
      vdDisplay = `FOR+${modifier}+${damageValueBonus} (${baseVD})`;
    } else {
      vdDisplay = `FOR+${modifier} (${baseVD})`;
    }
  } else if (vdString === 'toxin') {
    vdDisplay = 'selon toxine';
    baseVD = -1; // Special case
  } else {
    const base = parseInt(vdString) || 0;
    baseVD = base + damageValueBonus;
    if (damageValueBonus > 0) {
      vdDisplay = `${baseVD} (${base}+${damageValueBonus})`;
    } else {
      vdDisplay = `${baseVD}`;
    }
  }
  
  return { baseVD, vdDisplay };
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
  allSpecializations: any[],
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
    
    // Add specializations for this skill
    const specs = allSpecializations.filter((spec: any) => {
      const linkedSkillName = spec.system.linkedSkill;
      return ItemSearch.normalizeSearchText(linkedSkillName) === ItemSearch.normalizeSearchText(skill.name);
    });
    
    specs.forEach((spec: any) => {
      const specSystem = spec.system as any;
      const specLinkedAttribute = specSystem.linkedAttribute || 'strength';
      const specAttributeValue = (actor.system as any).attributes?.[specLinkedAttribute] || 0;
      const parentRating = skillRating;
      const effectiveRating = parentRating + 2;
      const specTotalDicePool = specAttributeValue + effectiveRating;
      
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


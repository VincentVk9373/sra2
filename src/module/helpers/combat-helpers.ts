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
 * Perform a defense dice roll
 */
export async function performDefenseRoll(
  dicePool: number,
  riskDice: number,
  riskReduction: number,
  rollMode: string,
  skillName: string
): Promise<any> {
  let normalSuccesses = 0;
  let riskSuccesses = 0;
  let criticalFailures = 0;
  let normalDiceResults = '';
  let riskDiceResults = '';
  
  const getSuccessThreshold = (mode: string): number => {
    switch (mode) {
      case 'advantage': return 4;
      case 'disadvantage': return 6;
      default: return 5;
    }
  };
  
  const successThreshold = getSuccessThreshold(rollMode);
  
  // Roll normal dice
  let normalRoll: Roll | null = null;
  if (dicePool > 0) {
    normalRoll = new Roll(`${dicePool}d6`);
    await normalRoll.evaluate();
    
    const normalResults = normalRoll.dice[0]?.results || [];
    normalSuccesses = normalResults.filter((r: any) => r.result >= successThreshold).length;
    
    normalDiceResults = normalResults.map((r: any) => {
      const isSuccess = r.result >= successThreshold;
      return `<span class="die normal ${isSuccess ? 'success' : 'failure'}">${r.result}</span>`;
    }).join(' ');
  }
  
  // Roll risk dice
  let riskRoll: Roll | null = null;
  if (riskDice > 0) {
    riskRoll = new Roll(`${riskDice}d6`);
    await riskRoll.evaluate();
    
    const riskResults = riskRoll.dice[0]?.results || [];
    
    riskResults.forEach((r: any) => {
      if (r.result >= successThreshold) {
        riskSuccesses += 2;
      } else if (r.result === 1) {
        criticalFailures++;
      }
    });
    
    riskDiceResults = riskResults.map((r: any) => {
      let cssClass = 'die risk ';
      if (r.result >= successThreshold) {
        cssClass += 'success';
      } else if (r.result === 1) {
        cssClass += 'critical';
      } else {
        cssClass += 'failure';
      }
      return `<span class="${cssClass}">${r.result}</span>`;
    }).join(' ');
  }
  
  // Show Dice So Nice animations if available
  if ((game as any).dice3d) {
    const dice3d = (game as any).dice3d;
    const promises: Promise<any>[] = [];
    
    if (normalRoll) {
      promises.push(
        dice3d.showForRoll(normalRoll, game.user, true, null, false, null, null, {
          colorset: "grey"
        }).catch(() => {})
      );
    }
    
    if (riskRoll) {
      await new Promise(resolve => setTimeout(resolve, 100));
      promises.push(
        dice3d.showForRoll(riskRoll, game.user, true, null, false, null, null, {
          colorset: "black"
        }).catch(() => {})
      );
    }
    
    await Promise.all(promises);
  }
  
  const rawCriticalFailures = criticalFailures;
  criticalFailures = Math.max(0, criticalFailures - riskReduction);
  const totalSuccesses = normalSuccesses + riskSuccesses;
  
  return {
    skillName,
    normalDiceResults,
    riskDiceResults,
    totalSuccesses,
    normalSuccesses,
    riskSuccesses,
    criticalFailures,
    rawCriticalFailures,
    dicePool,
    riskDice,
    riskReduction,
    rollMode
  };
}

/**
 * Build dice results HTML for display in combat
 */
export function buildDiceResultsHtml(rollResult: any, weaponDamageValue?: string, actorStrength?: number, damageValueBonus?: number): string {
  let html = '';
  
  // Check if this is a threshold-based defense (NPC)
  if (rollResult.isThreshold) {
    html += '<div class="dice-pool">';
    html += `<strong>${game.i18n!.localize('SRA2.NPC.THRESHOLD')}:</strong> `;
    html += `<span class="threshold-badge">${rollResult.totalSuccesses}</span>`;
    html += '</div>';
    
    html += `<div class="successes has-success">`;
    html += `<strong>${game.i18n!.localize('SRA2.SKILLS.TOTAL_SUCCESSES')}:</strong> ${rollResult.totalSuccesses}`;
    html += '</div>';
    
    return html;
  }
  
  // Normal dice roll
  const totalPool = rollResult.dicePool + rollResult.riskDice;
  html += '<div class="dice-pool">';
  html += `<strong>${game.i18n!.localize('SRA2.SKILLS.DICE_POOL')}:</strong> `;
  html += `${totalPool}d6`;
  if (rollResult.riskDice > 0) {
    html += ` (${rollResult.dicePool} ${game.i18n!.localize('SRA2.SKILLS.NORMAL')} + <span class="risk-label">${rollResult.riskDice} ${game.i18n!.localize('SRA2.SKILLS.RISK')}</span>`;
    if (rollResult.riskReduction > 0) {
      html += ` | <span class="rr-label">RR ${rollResult.riskReduction}</span>`;
    }
    html += `)`;
  } else if (rollResult.riskReduction > 0) {
    html += ` | <span class="rr-label">RR ${rollResult.riskReduction}</span>`;
  }
  html += '</div>';
  
  // Normal dice results
  if (rollResult.normalDiceResults) {
    html += '<div class="dice-results">';
    html += `<strong>${game.i18n!.localize('SRA2.SKILLS.NORMAL_DICE')}:</strong> ${rollResult.normalDiceResults}`;
    html += '</div>';
  }
  
  // Risk dice results
  if (rollResult.riskDiceResults) {
    html += '<div class="dice-results risk">';
    html += `<strong>${game.i18n!.localize('SRA2.SKILLS.RISK_DICE')}:</strong> ${rollResult.riskDiceResults}`;
    html += '</div>';
  }
  
  // Total successes
  html += `<div class="successes ${rollResult.totalSuccesses > 0 ? 'has-success' : 'no-success'}">`;
  html += `<strong>${game.i18n!.localize('SRA2.SKILLS.TOTAL_SUCCESSES')}:</strong> ${rollResult.totalSuccesses}`;
  
  // Weapon Damage Value (VD) if provided
  if (weaponDamageValue && weaponDamageValue !== '0' && actorStrength !== undefined) {
    const { baseVD, vdDisplay } = parseWeaponDamageValue(weaponDamageValue, actorStrength, damageValueBonus || 0);
    
    if (baseVD >= 0) {
      html += ` | <strong>VD:</strong> <span class="vd-display">${vdDisplay}</span>`;
    }
  }
  
  html += '</div>';
  
  // Critical failures with severity levels
  if (rollResult.rawCriticalFailures > 0 || rollResult.riskReduction > 0) {
    const criticalFailures = rollResult.criticalFailures;
    const rawCriticalFailures = rollResult.rawCriticalFailures;
    const riskReduction = rollResult.riskReduction || 0;
    
    let criticalLabel = '';
    let criticalClass = '';
    
    if (criticalFailures >= 3) {
      criticalLabel = game.i18n!.localize('SRA2.SKILLS.DISASTER');
      criticalClass = 'disaster';
    } else if (criticalFailures === 2) {
      criticalLabel = game.i18n!.localize('SRA2.SKILLS.CRITICAL_COMPLICATION');
      criticalClass = 'critical-complication';
    } else if (criticalFailures === 1) {
      criticalLabel = game.i18n!.localize('SRA2.SKILLS.MINOR_COMPLICATION');
      criticalClass = 'minor-complication';
    } else {
      criticalLabel = game.i18n!.localize('SRA2.SKILLS.NO_COMPLICATION');
      criticalClass = 'reduced-to-zero';
    }
    
    html += `<div class="critical-failures ${criticalClass}">`;
    html += `<div class="complication-header">`;
    html += `<div class="complication-icon">⚠</div>`;
    html += `<div class="complication-title">${criticalLabel}</div>`;
    html += `</div>`;
    
    if (riskReduction > 0 && rawCriticalFailures > 0) {
      html += `<div class="complication-calculation">`;
      const label = rollResult.rollMode === 'threshold' ? 'Attaque' : rollResult.isDefense ? 'Défense' : 'Attaque';
      html += `${label}: ${rawCriticalFailures} - ${riskReduction} RR = ${criticalFailures}`;
      html += `</div>`;
    }
    
    html += '</div>';
  }
  
  return html;
}

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
 * Build NPC attack HTML (threshold based)
 */
export function buildNPCAttackHtml(threshold: number, weaponDamageValue?: string, actorStrength?: number, damageValueBonus?: number): string {
  let html = '';
  
  html += '<div class="dice-pool">';
  html += `<strong>${game.i18n!.localize('SRA2.NPC.THRESHOLD')}:</strong> `;
  html += `<span class="threshold-badge">${threshold}</span>`;
  html += '</div>';
  
  html += `<div class="successes has-success">`;
  html += `<strong>${game.i18n!.localize('SRA2.SKILLS.TOTAL_SUCCESSES')}:</strong> ${threshold}`;
  
  // Add VD if provided
  if (weaponDamageValue && weaponDamageValue !== '0' && actorStrength !== undefined) {
    const { vdDisplay } = parseWeaponDamageValue(weaponDamageValue, actorStrength, damageValueBonus || 0);
    html += ` | <strong>VD:</strong> <span class="vd-display">${vdDisplay}</span>`;
  }
  
  html += '</div>';
  
  return html;
}

/**
 * Create a fake threshold-based defense result (for NPCs or threshold defense)
 */
export function createThresholdDefenseResult(defenseName: string, threshold: number): any {
  return {
    skillName: defenseName,
    totalSuccesses: threshold,
    isThreshold: true,
    normalDiceResults: '',
    riskDiceResults: '',
    normalSuccesses: threshold,
    riskSuccesses: 0,
    criticalFailures: 0,
    rawCriticalFailures: 0,
    dicePool: 0,
    riskDice: 0,
    riskReduction: 0,
    rollMode: 'threshold'
  };
}

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
 * Create weapon/spell selection dialog content
 */
export function createWeaponSkillSelectionDialogContent(
  itemName: string,
  weaponDamageValue: string,
  type: 'weapon' | 'spell',
  skillOptionsHtml: string,
  actorStrength?: number,
  damageValueBonus?: number,
  actor?: any
): string {
  const titleKey = type === 'spell' ? 'SRA2.FEATS.SPELL.SECTION_TITLE' : 'SRA2.FEATS.WEAPON.WEAPON_NAME';
  
  // Calculate final damage value with bonus for display
  let displayDamageValue = weaponDamageValue;
  if (weaponDamageValue !== '0' && actorStrength !== undefined) {
    const { vdDisplay } = parseWeaponDamageValue(weaponDamageValue, actorStrength, damageValueBonus || 0);
    displayDamageValue = vdDisplay;
  }
  
  return `
    <form class="sra2-weapon-roll-dialog">
      ${actor ? `
      <div class="actor-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
        <img src="${actor.img}" alt="${actor.name}" style="width: 48px; height: 48px; border-radius: 4px; border: 2px solid #444;" />
        <strong style="font-size: 1.2em;">${actor.name}</strong>
      </div>
      ` : ''}
      <div class="form-group">
        <label>${game.i18n!.localize(titleKey)}:</label>
        <p class="weapon-name"><strong>${itemName}</strong></p>
      </div>
      ${weaponDamageValue !== '0' ? `
      <div class="form-group">
        <label>${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE_VALUE')}:</label>
        <p class="damage-value"><strong>${displayDamageValue}</strong></p>
      </div>
      ` : ''}
      <div class="form-group">
        <label>${game.i18n!.localize('SRA2.FEATS.WEAPON.SELECT_SKILL')}:</label>
        <select id="skill-select" class="skill-select">
          ${skillOptionsHtml}
        </select>
      </div>
    </form>
  `;
}

/**
 * Display attack result with optional defense (unified for both dice rolls and NPC thresholds)
 */
export async function displayAttackResult(
  attacker: any,
  attackName: string,
  attackResultOrThreshold: any | number,
  defenseResult: any | null,
  defenderActor: any,
  weaponDamageValue?: string,
  damageValueBonus?: number,
  defenderToken?: any
): Promise<void> {
  // Determine if this is a dice attack or threshold attack
  const isDiceAttack = typeof attackResultOrThreshold === 'object';
  const attackResult = isDiceAttack ? attackResultOrThreshold : null;
  const attackThreshold = isDiceAttack ? null : attackResultOrThreshold;
  
  let resultsHtml = '<div class="sra2-combat-roll">';
  
  // Determine outcome first
  let attackSuccess: boolean;
  let attackSuccesses: number;
  
  if (isDiceAttack) {
    attackSuccesses = attackResult!.totalSuccesses;
    attackSuccess = !defenseResult || defenseResult.totalSuccesses <= attackSuccesses;
  } else {
    attackSuccesses = attackThreshold!;
    attackSuccess = !defenseResult || defenseResult.totalSuccesses < attackSuccesses;
  }
  
  // Display outcome header FIRST
  if (attackSuccess) {
    resultsHtml += `<div class="combat-outcome-header attack-success">`;
    resultsHtml += `<div class="outcome-icon"><i class="fas fa-crosshairs"></i></div>`;
    resultsHtml += `<div class="outcome-text">${game.i18n!.localize('SRA2.COMBAT.ATTACK_SUCCESS')}</div>`;
    resultsHtml += '</div>';
  } else {
    resultsHtml += `<div class="combat-outcome-header attack-failed">`;
    resultsHtml += `<div class="outcome-icon"><i class="fas fa-shield-alt"></i></div>`;
    resultsHtml += `<div class="outcome-text">${game.i18n!.localize('SRA2.COMBAT.ATTACK_FAILED')}</div>`;
    resultsHtml += '</div>';
  }
  
  // Attack section
  resultsHtml += '<div class="attack-section">';
  resultsHtml += `<h3>${game.i18n!.localize('SRA2.COMBAT.ATTACK')}: ${attackName}</h3>`;
  
  if (isDiceAttack) {
    const attackerStrength = (attacker.system as any).attributes?.strength || 0;
    resultsHtml += buildDiceResultsHtml(attackResult!, weaponDamageValue, attackerStrength, damageValueBonus);
  } else {
    resultsHtml += buildNPCAttackHtml(attackThreshold!);
  }
  
  resultsHtml += '</div>';
  
  // Defense section
  if (defenseResult) {
    resultsHtml += '<div class="defense-section">';
    resultsHtml += `<h3>${game.i18n!.localize('SRA2.COMBAT.DEFENSE')}: ${defenseResult.skillName}</h3>`;
    if (!isDiceAttack) {
      defenseResult.isDefense = true;
    }
    resultsHtml += buildDiceResultsHtml(defenseResult);
    resultsHtml += '</div>';
  }
  
  // Combat result
  resultsHtml += '<div class="combat-result">';
  
  if (!attackSuccess) {
    // Defense successful - ECHEC DE L'ATTAQUE
    resultsHtml += `<div class="defense-success">`;
    resultsHtml += `<p>${game.i18n!.format('SRA2.COMBAT.DEFENSE_BLOCKS_ATTACK', {
      defender: defenderActor.name || '?',
      defenseSuccesses: defenseResult!.totalSuccesses,
      attackSuccesses: attackSuccesses
    })}</p>`;
    resultsHtml += '</div>';
  } else {
    // Attack successful, calculate damage
    const defenseSuccesses = defenseResult ? defenseResult.totalSuccesses : 0;
    const netSuccesses = attackSuccesses - defenseSuccesses;
    
    if (isDiceAttack && weaponDamageValue && weaponDamageValue !== '0') {
      // Dice attack with weapon damage value
      const attackerStrength = (attacker.system as any).attributes?.strength || 0;
      const { baseVD } = parseWeaponDamageValue(weaponDamageValue, attackerStrength, damageValueBonus || 0);
      
      if (baseVD >= 0) {
        const finalDamage = baseVD + netSuccesses;
        resultsHtml += `<div class="final-damage-value">`;
        resultsHtml += `<div class="damage-label">${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE')} : ${finalDamage}</div>`;
        if (defenseResult) {
          resultsHtml += `<div class="calculation">${baseVD} VD + ${attackSuccesses} succès attaque - ${defenseSuccesses} succès défense</div>`;
        } else {
          resultsHtml += `<div class="calculation">${attackSuccesses} succès + ${baseVD} VD</div>`;
        }
        
        // Add button to apply damage
        if (defenderActor) {
          const defenderUuid = defenderToken?.document?.uuid || defenderActor.uuid;
          resultsHtml += `<button class="apply-damage-btn" data-defender-uuid="${defenderUuid}" data-damage="${String(finalDamage)}" data-defender-name="${defenderActor.name}" title="${game.i18n!.format('SRA2.COMBAT.APPLY_DAMAGE_TITLE', {damage: finalDamage, defender: defenderActor.name})}">`;
          resultsHtml += `<i class="fas fa-heart-broken"></i> ${game.i18n!.localize('SRA2.COMBAT.APPLY_DAMAGE')}`;
          resultsHtml += `</button>`;
        }
        
        resultsHtml += '</div>';
      }
    } else {
      // NPC threshold attack or no weapon damage
      resultsHtml += `<div class="final-damage-value">`;
      resultsHtml += `<div class="damage-label">${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE')} : ${netSuccesses}</div>`;
      if (defenseResult) {
        resultsHtml += `<div class="calculation">${attackSuccesses} succès attaque - ${defenseSuccesses} succès défense</div>`;
      } else {
        resultsHtml += `<div class="calculation">${attackSuccesses} succès</div>`;
      }
      
      // Add button to apply damage
      if (defenderActor) {
        const defenderUuid = defenderToken?.document?.uuid || defenderActor.uuid;
        resultsHtml += `<button class="apply-damage-btn" data-defender-uuid="${defenderUuid}" data-damage="${String(netSuccesses)}" data-defender-name="${defenderActor.name}" title="${game.i18n!.format('SRA2.COMBAT.APPLY_DAMAGE_TITLE', {damage: netSuccesses, defender: defenderActor.name})}">`;
        resultsHtml += `<i class="fas fa-heart-broken"></i> ${game.i18n!.localize('SRA2.COMBAT.APPLY_DAMAGE')}`;
        resultsHtml += `</button>`;
      }
      
      resultsHtml += '</div>';
    }
  }
  
  resultsHtml += '</div>';
  resultsHtml += '</div>';
  
  // Create the chat message
  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: attacker }),
    flavor: game.i18n!.format('SRA2.COMBAT.ATTACK_ROLL', { name: attackName }),
    content: resultsHtml,
    sound: CONFIG.sounds?.dice
  };
  
  await ChatMessage.create(messageData);
}


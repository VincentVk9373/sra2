/**
 * Shared Dice Rolling Utilities for SRA2
 * This module contains common dice rolling functions used across character sheets, NPC sheets, and item sheets.
 */

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
 * Generate the inline JavaScript for the roll dialog
 */
export function generateRollDialogScript(maxDice: number): string {
  return `
    (function() {
      const form = document.querySelector('.sra2-roll-dialog');
      const checkboxes = form.querySelectorAll('.rr-source-checkbox');
      const rrDisplay = form.querySelector('#rr-display');
      const riskDiceInput = form.querySelector('#risk-dice-input');
      const diceSelector = form.querySelector('#dice-selector');
      const diceIcons = diceSelector.querySelectorAll('.dice-icon');
      const maxDice = ${maxDice};
      const riskDiceByRR = [2, 5, 8, 12];
      
      // Risk thresholds based on RR level
      const riskThresholds = {
        0: { normal: 2, fort: 4, extreme: 6 },
        1: { normal: 5, fort: 7, extreme: 9 },
        2: { normal: 8, fort: 11, extreme: 13 },
        3: { normal: 12, fort: 15, extreme: 999 }
      };
      
      function getRiskLevel(diceCount, rr) {
        const thresholds = riskThresholds[rr] || riskThresholds[0];
        if (diceCount <= thresholds.normal) return 'faible';
        if (diceCount <= thresholds.fort) return 'normal';
        if (diceCount <= thresholds.extreme) return 'fort';
        return 'extreme';
      }
      
      function updateRR() {
        let totalRR = 0;
        checkboxes.forEach(cb => {
          if (cb.checked) {
            totalRR += parseInt(cb.dataset.rrValue);
          }
        });
        totalRR = Math.min(3, totalRR);
        rrDisplay.textContent = totalRR;
        
        const suggestedRisk = Math.min(maxDice, riskDiceByRR[totalRR]);
        setDiceSelection(suggestedRisk, totalRR);
      }
      
      function setDiceSelection(count, currentRR) {
        riskDiceInput.value = count;
        
        // Get current RR if not provided
        if (currentRR === undefined) {
          currentRR = 0;
          checkboxes.forEach(cb => {
            if (cb.checked) {
              currentRR += parseInt(cb.dataset.rrValue);
            }
          });
          currentRR = Math.min(3, currentRR);
        }
        
        diceIcons.forEach((dice, index) => {
          const diceNumber = index + 1;
          dice.classList.remove('selected', 'risk-faible', 'risk-normal', 'risk-fort', 'risk-extreme');
          
          const riskLevel = getRiskLevel(diceNumber, currentRR);
          dice.classList.add('risk-' + riskLevel);
          
          if (index < count) {
            dice.classList.add('selected');
          }
        });
      }
      
      diceIcons.forEach((dice) => {
        dice.addEventListener('click', function() {
          const index = parseInt(this.dataset.diceIndex);
          const currentValue = parseInt(riskDiceInput.value);
          // Toggle: si on clique sur le dernier dé sélectionné, désélectionner tout
          if (index === currentValue) {
            setDiceSelection(0);
          } else {
            setDiceSelection(index);
          }
        });
      });
      
      checkboxes.forEach(cb => {
        cb.addEventListener('change', updateRR);
      });
      
      // Initial color setup
      setDiceSelection(riskDiceInput.value);
    })();
  `;
}

/**
 * Create roll dialog content HTML
 */
export interface RollDialogOptions {
  title: string;
  basePool: number;
  poolDescription: string;
  autoRR: number;
  defaultRiskDice: number;
  rrSourcesHtml: string;
}

export function createRollDialogContent(options: RollDialogOptions): string {
  const { basePool, poolDescription, autoRR, defaultRiskDice, rrSourcesHtml } = options;
  
  return `
    <form class="sra2-roll-dialog">
      <div class="form-group">
        <label>${game.i18n!.localize('SRA2.SKILLS.BASE_POOL')}: <strong>${basePool}</strong></label>
        ${poolDescription ? `<p class="notes">${poolDescription}</p>` : ''}
      </div>
      <div class="form-group roll-mode-group">
        <label>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE')}:</label>
        <div class="radio-group">
          <label class="radio-option disadvantage">
            <input type="radio" name="rollMode" value="disadvantage" />
            <span>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_DISADVANTAGE')}</span>
          </label>
          <label class="radio-option normal">
            <input type="radio" name="rollMode" value="normal" checked />
            <span>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_NORMAL')}</span>
          </label>
          <label class="radio-option advantage">
            <input type="radio" name="rollMode" value="advantage" />
            <span>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_ADVANTAGE')}</span>
          </label>
        </div>
      </div>
      ${rrSourcesHtml}
      <div class="form-group">
        <label>${game.i18n!.localize('SRA2.SKILLS.RISK_REDUCTION')}: <span id="rr-display">${autoRR}</span>/3</label>
      </div>
      <div class="form-group">
        <label>${game.i18n!.localize('SRA2.SKILLS.RISK_DICE')}:</label>
        <input type="hidden" name="riskDice" id="risk-dice-input" value="${defaultRiskDice}" />
        <div class="dice-selector" id="dice-selector">
          ${Array.from({length: basePool}, (_, i) => 
            `<div class="dice-icon ${i < defaultRiskDice ? 'selected' : ''}" data-dice-index="${i + 1}">
              <i class="fas fa-dice-d6"></i>
              <span class="dice-number">${i + 1}</span>
            </div>`
          ).join('')}
        </div>
        <p class="notes">${game.i18n!.localize('SRA2.SKILLS.RISK_DICE_HINT')}</p>
      </div>
    </form>
    <script>
      ${generateRollDialogScript(basePool)}
    </script>
  `;
}

/**
 * Roll dice and calculate results
 */
export interface DiceRollResult {
  normalSuccesses: number;
  riskSuccesses: number;
  criticalFailures: number;
  rawCriticalFailures: number;
  normalDiceResults: string;
  riskDiceResults: string;
  normalRoll: Roll | null;
  riskRoll: Roll | null;
  totalSuccesses: number;
}

export async function rollDice(
  dicePool: number,
  riskDice: number,
  riskReduction: number,
  rollMode: string
): Promise<DiceRollResult> {
  let normalSuccesses = 0;
  let riskSuccesses = 0;
  let criticalFailures = 0;
  let normalDiceResults = '';
  let riskDiceResults = '';
  
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
    
    // Risk dice: success threshold gives 2 successes, 1 gives critical failure
    riskResults.forEach((r: any) => {
      if (r.result >= successThreshold) {
        riskSuccesses += 2; // Double success on risk dice
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
    
    // Show normal dice with gray color
    if (normalRoll) {
      promises.push(
        dice3d.showForRoll(normalRoll, game.user, true, null, false, null, null, {
          colorset: "grey"  // Grey color for normal dice
        }).catch(() => {})
      );
    }
    
    // Show risk dice with purple color
    if (riskRoll) {
      // Wait a bit before showing risk dice so they appear after normal dice
      await new Promise(resolve => setTimeout(resolve, 100));
      promises.push(
        dice3d.showForRoll(riskRoll, game.user, true, null, false, null, null, {
          colorset: "black"  // Black color for risk dice
        }).catch(() => {})
      );
    }
    
    // Wait for all dice animations to complete
    await Promise.all(promises);
  }
  
  // Apply risk reduction to critical failures
  const rawCriticalFailures = criticalFailures;
  criticalFailures = Math.max(0, criticalFailures - riskReduction);
  
  const totalSuccesses = normalSuccesses + riskSuccesses;
  
  return {
    normalSuccesses,
    riskSuccesses,
    criticalFailures,
    rawCriticalFailures,
    normalDiceResults,
    riskDiceResults,
    normalRoll,
    riskRoll,
    totalSuccesses
  };
}

/**
 * Build dice roll results HTML for chat message
 */
export interface BuildResultsHtmlOptions {
  skillName: string;
  dicePool: number;
  riskDice: number;
  riskReduction: number;
  rollMode: string;
  result: DiceRollResult;
  weaponDamageValue?: string;
  actorStrength?: number;
  damageValueBonus?: number;
}

export function buildRollResultsHtml(options: BuildResultsHtmlOptions): string {
  const {
    dicePool,
    riskDice,
    riskReduction,
    rollMode,
    result,
    weaponDamageValue,
    actorStrength,
    damageValueBonus
  } = options;
  
  const {
    normalDiceResults,
    riskDiceResults,
    totalSuccesses,
    rawCriticalFailures,
    criticalFailures
  } = result;
  
  let resultsHtml = '<div class="sra2-skill-roll">';
  
  // Dice pool info
  const totalPool = dicePool + riskDice;
  resultsHtml += '<div class="dice-pool">';
  resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.DICE_POOL')}:</strong> `;
  resultsHtml += `${totalPool}d6`;
  if (riskDice > 0) {
    resultsHtml += ` (${dicePool} ${game.i18n!.localize('SRA2.SKILLS.NORMAL')} + <span class="risk-label">${riskDice} ${game.i18n!.localize('SRA2.SKILLS.RISK')}</span>`;
    if (riskReduction > 0) {
      resultsHtml += ` | <span class="rr-label">RR ${riskReduction}</span>`;
    }
    resultsHtml += `)`;
  } else if (riskReduction > 0) {
    resultsHtml += ` | <span class="rr-label">RR ${riskReduction}</span>`;
  }
  
  // Display roll mode if not normal
  if (rollMode !== 'normal') {
    const modeKey = rollMode === 'advantage' ? 'ROLL_MODE_ADVANTAGE' : 'ROLL_MODE_DISADVANTAGE';
    resultsHtml += ` | <span class="mode-label">${game.i18n!.localize(`SRA2.SKILLS.${modeKey}`)}</span>`;
  }
  
  resultsHtml += '</div>';
  
  // Normal dice results
  if (normalDiceResults) {
    resultsHtml += '<div class="dice-results">';
    resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.NORMAL_DICE')}:</strong> ${normalDiceResults}`;
    resultsHtml += '</div>';
  }
  
  // Risk dice results
  if (riskDiceResults) {
    resultsHtml += '<div class="dice-results risk">';
    resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.RISK_DICE')}:</strong> ${riskDiceResults}`;
    resultsHtml += '</div>';
  }
  
  // Total successes
  resultsHtml += `<div class="successes ${totalSuccesses > 0 ? 'has-success' : 'no-success'}">`;
  resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.TOTAL_SUCCESSES')}:</strong> ${totalSuccesses}`;
  
  // Weapon Damage Value (VD) displayed next to successes
  if (weaponDamageValue && weaponDamageValue !== '0' && actorStrength !== undefined) {
    // Import parseWeaponDamageValue from combat-helpers to avoid duplication
    // For now, we need to implement it here to avoid circular dependencies
    const strength = actorStrength;
    const bonus = damageValueBonus || 0;
    let baseVD = 0;
    let vdDisplay = weaponDamageValue;
    
    // Parse the damage value with bonus
    if (weaponDamageValue === 'FOR') {
      baseVD = strength + bonus;
      if (bonus > 0) {
        vdDisplay = `FOR+${bonus} (${baseVD})`;
      } else {
        vdDisplay = `FOR (${strength})`;
      }
    } else if (weaponDamageValue.startsWith('FOR+')) {
      const modifier = parseInt(weaponDamageValue.substring(4)) || 0;
      baseVD = strength + modifier + bonus;
      if (bonus > 0) {
        vdDisplay = `FOR+${modifier}+${bonus} (${baseVD})`;
      } else {
        vdDisplay = `FOR+${modifier} (${baseVD})`;
      }
    } else if (weaponDamageValue === 'toxin') {
      vdDisplay = 'selon toxine';
      baseVD = -1; // Special case, don't calculate final VD
    } else {
      const base = parseInt(weaponDamageValue) || 0;
      baseVD = base + bonus;
      if (bonus > 0) {
        vdDisplay = `${baseVD} (${base}+${bonus})`;
      } else {
        vdDisplay = `${baseVD}`;
      }
    }
    
    if (baseVD >= 0) {
      resultsHtml += ` | `;
      resultsHtml += `<strong>${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE_VALUE_SHORT')}:</strong> `;
      resultsHtml += `<span class="vd-display">${vdDisplay}</span>`;
    }
  }
  
  resultsHtml += '</div>';
  
  // Critical failures with severity levels
  if (rawCriticalFailures > 0 || riskReduction > 0) {
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
    
    resultsHtml += `<div class="critical-failures ${criticalClass}">`;
    resultsHtml += `<div class="complication-header">`;
    resultsHtml += `<div class="complication-icon">⚠</div>`;
    resultsHtml += `<div class="complication-title">${criticalLabel}</div>`;
    resultsHtml += `</div>`;
    
    if (rawCriticalFailures > 0) {
      resultsHtml += `<div class="complication-details">`;
      if (riskReduction > 0) {
        resultsHtml += `<span class="critical-count-before">${rawCriticalFailures}</span> → `;
        resultsHtml += `<span class="critical-count-after">${criticalFailures}</span>`;
        resultsHtml += ` <span class="rr-reduction">(RR -${riskReduction})</span>`;
      } else {
        resultsHtml += `<span class="critical-count">${criticalFailures}</span>`;
      }
      resultsHtml += `</div>`;
    }
    
    resultsHtml += `</div>`;
  }
  
  resultsHtml += '</div>';
  
  return resultsHtml;
}

/**
 * Post roll results to chat
 */
export async function postRollToChat(
  actor: any,
  skillName: string,
  resultsHtml: string
): Promise<void> {
  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: game.i18n!.format('SRA2.SKILLS.ROLL_FLAVOR', { name: skillName }),
    content: resultsHtml,
    sound: CONFIG.sounds?.dice
  };
  
  await ChatMessage.create(messageData);
}

/**
 * Parameters for creating a skill roll dialog
 */
export interface CreateSkillRollDialogParams {
  title: string;
  basePool: number;
  poolDescription: string;
  autoRR: number;
  defaultRiskDice: number;
  rrSources: RRSource[];
  onRollCallback: (normalDice: number, riskDice: number, riskReduction: number, rollMode: string) => void;
}

/**
 * Create a complete skill roll dialog with RR sources, dice selector, and roll modes
 * This eliminates the massive duplication of dialog creation code
 */
export function createSkillRollDialog(params: CreateSkillRollDialogParams): Dialog {
  const { title, basePool, poolDescription, autoRR, defaultRiskDice, rrSources, onRollCallback } = params;
  
  const rrSourcesHtml = buildRRSourcesHtml(rrSources);
  const dialogContent = createRollDialogContent({
    title,
    basePool,
    poolDescription,
    autoRR,
    defaultRiskDice,
    rrSourcesHtml
  });
  
  return new Dialog({
    title,
    content: dialogContent,
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice-d6"></i>',
        label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
        callback: (html: any) => {
          const riskDice = Math.min(basePool, parseInt(html.find('[name="riskDice"]').val()) || 0);
          const normalDice = basePool - riskDice;
          let riskReduction = 0;
          html.find('.rr-source-checkbox:checked').each((_: number, cb: any) => {
            riskReduction += parseInt(cb.dataset.rrValue);
          });
          riskReduction = Math.min(3, riskReduction);
          const rollMode = html.find('[name="rollMode"]:checked').val() || 'normal';
          
          onRollCallback(normalDice, riskDice, riskReduction, rollMode);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n!.localize('Cancel')
      }
    },
    default: 'roll'
  }, { width: 600 });
}


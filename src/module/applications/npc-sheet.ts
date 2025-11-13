/**
 * NPC Sheet Application
 * NPCs don't roll dice - they use predefined thresholds
 * Threshold = floor(dice pool / 3) + RR level + 1
 */
export class NpcSheet extends ActorSheet {
  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'npc'],
      template: 'systems/sra2/templates/actor-npc-sheet.hbs',
      width: 800,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: '.skill-item', dropSelector: '.skills-list' },
        { dragSelector: '.feat-item', dropSelector: '.feats-list' },
        { dragSelector: '.specialization-item', dropSelector: '.skills-list' }
      ],
      submitOnChange: true,
    });
  }

  override getData(): any {
    const context = super.getData() as any;

    // Ensure system data is available
    context.system = this.actor.system;

    // Get feats
    const allFeats = this.actor.items.filter((item: any) => item.type === 'feat');
    context.feats = allFeats;

    // Get skills with NPC threshold calculations
    const skills = this.actor.items.filter((item: any) => item.type === 'skill');
    
    // Get all specializations
    const allSpecializations = this.actor.items.filter((item: any) => item.type === 'specialization');
    
    // Organize specializations by linked skill
    const specializationsBySkill = new Map<string, any[]>();
    
    allSpecializations.forEach((spec: any) => {
      const linkedSkillName = spec.system.linkedSkill;
      if (linkedSkillName) {
        const linkedSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        
        if (linkedSkill && linkedSkill.id) {
          const skillId = linkedSkill.id;
          if (!specializationsBySkill.has(skillId)) {
            specializationsBySkill.set(skillId, []);
          }
          specializationsBySkill.get(skillId)!.push(spec);
        }
      }
    });

    // Calculate NPC thresholds for skills
    const skillsWithThresholds = skills.map((skill: any) => {
      const skillData = {
        ...skill,
        _id: skill.id || skill._id, // Ensure ID is present
        id: skill.id || skill._id
      };
      
      // Get attribute value
      const linkedAttribute = skill.system.linkedAttribute;
      let attributeValue = 0;
      if (linkedAttribute && this.actor.system.attributes) {
        attributeValue = this.actor.system.attributes[linkedAttribute] || 0;
      }
      
      // Calculate total dice pool (attribute + skill rating)
      const skillRating = skill.system.rating || 0;
      const totalDicePool = attributeValue + skillRating;
      
      // Calculate total RR for this skill
      let totalRR = 0;
      
      // Get all active feats
      const activeFeats = this.actor.items.filter((item: any) => 
        item.type === 'feat' && item.system.active === true
      );
      
      // Check each feat for RR that applies to this skill
      activeFeats.forEach((feat: any) => {
        const rrList = feat.system.rrList || [];
        rrList.forEach((rrEntry: any) => {
          if (rrEntry.rrType === 'skill' && rrEntry.rrTarget === skill.name) {
            totalRR += rrEntry.rrValue || 0;
          }
          // Also check for attribute RR
          if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === linkedAttribute) {
            totalRR += rrEntry.rrValue || 0;
          }
        });
      });
      
      // Calculate NPC threshold: floor(dice pool / 3) + RR + 1
      const npcThreshold = Math.floor(totalDicePool / 3) + totalRR + 1;
      
      skillData.totalDicePool = totalDicePool;
      skillData.totalRR = totalRR;
      skillData.npcThreshold = npcThreshold;
      
      // Attach specializations for this skill with their thresholds
      const specs = specializationsBySkill.get(skill.id) || [];
      skillData.specializations = specs.map((spec: any) => {
        const specData = {
          ...spec,
          _id: spec.id || spec._id, // Ensure ID is present
          id: spec.id || spec._id
        };
        
        // Specialization adds +2 dice to the pool
        const specDicePool = totalDicePool + 2;
        
        // Calculate total RR for specialization
        let specTotalRR = totalRR; // Inherits skill's RR
        
        // Check for specialization-specific RR
        activeFeats.forEach((feat: any) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry: any) => {
            if (rrEntry.rrType === 'specialization' && rrEntry.rrTarget === spec.name) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
        
        // Calculate specialization threshold
        const specThreshold = Math.floor(specDicePool / 3) + specTotalRR + 1;
        
        specData.totalDicePool = specDicePool;
        specData.totalRR = specTotalRR;
        specData.npcThreshold = specThreshold;
        
        return specData;
      });
      
      return skillData;
    });

    context.skills = skillsWithThresholds;

    return context;
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    // Roll skill
    html.find('[data-action="roll-skill"]').on('click', this._onRollSkill.bind(this));

    // Roll specialization
    html.find('[data-action="roll-specialization"]').on('click', this._onRollSpecialization.bind(this));

    // Attack with threshold
    html.find('[data-action="attack-threshold"]').on('click', this._onAttackThreshold.bind(this));

    // Edit skill
    html.find('[data-action="edit-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete skill
    html.find('[data-action="delete-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.SKILLS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Edit specialization
    html.find('[data-action="edit-specialization"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete specialization
    html.find('[data-action="delete-specialization"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.SPECIALIZATIONS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Edit feat
    html.find('[data-action="edit-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete feat
    html.find('[data-action="delete-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.FEATS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Add world skill button
    html.find('[data-action="add-world-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      this._showItemBrowser('skill');
    });

    // Add world feat button
    html.find('[data-action="add-world-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      this._showItemBrowser('feat');
    });
  }

  /**
   * Handle rolling a skill
   */
  private async _onRollSkill(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');

    if (!itemId) {
      console.error("SRA2 | No skill ID found");
      return;
    }

    const skill = this.actor.items.get(itemId);
    if (!skill || skill.type !== 'skill') return;

    const skillSystem = skill.system as any;
    const rating = skillSystem.rating || 0;
    const linkedAttribute = skillSystem.linkedAttribute || 'strength';
    
    // Get the attribute value from the actor
    const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
    const basePool = rating + attributeValue;
    
    if (basePool <= 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SKILLS.NO_DICE'));
      return;
    }

    // Get localized attribute name
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    
    // Get RR sources for skill and attribute
    const skillRRSources = this.getRRSources('skill', skill.name);
    const attributeRRSources = this.getRRSources('attribute', linkedAttribute);
    const allRRSources = [...skillRRSources, ...attributeRRSources.map(s => ({ ...s, featName: s.featName + ` (${attributeLabel})` }))];
    const autoRR = Math.min(3, allRRSources.reduce((total, s) => total + s.rrValue, 0));
    const defaultRiskDice = Math.min(basePool, this.getRiskDiceByRR(autoRR));

    // Build RR sources HTML
    let rrSourcesHtml = '';
    if (allRRSources.length > 0) {
      rrSourcesHtml = '<div class="rr-sources"><strong>Sources RR:</strong>';
      allRRSources.forEach((source) => {
        rrSourcesHtml += `
          <label class="rr-source-item">
            <input type="checkbox" class="rr-source-checkbox" data-rr-value="${source.rrValue}" checked />
            <span>${source.featName} (+${source.rrValue})</span>
          </label>`;
      });
      rrSourcesHtml += '</div>';
    }

    // Create a dialog to optionally add modifiers and risk dice
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.SKILLS.ROLL_TITLE', { name: skill.name }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.BASE_POOL')}: <strong>${basePool}</strong></label>
            <p class="notes">(${game.i18n!.localize('SRA2.SKILLS.RATING')}: ${rating} + ${attributeLabel}: ${attributeValue})</p>
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
          (function() {
            const form = document.querySelector('.sra2-roll-dialog');
            const checkboxes = form.querySelectorAll('.rr-source-checkbox');
            const rrDisplay = form.querySelector('#rr-display');
            const riskDiceInput = form.querySelector('#risk-dice-input');
            const diceSelector = form.querySelector('#dice-selector');
            const diceIcons = diceSelector.querySelectorAll('.dice-icon');
            const maxDice = ${basePool};
            const riskDiceByRR = [2, 5, 8, 12];
            
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
            
            setDiceSelection(riskDiceInput.value);
          })();
        </script>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
          callback: (html: any) => {
            const totalPool = basePool;
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            let riskReduction = 0;
            html.find('.rr-source-checkbox:checked').each((_: number, cb: any) => {
              riskReduction += parseInt(cb.dataset.rrValue);
            });
            riskReduction = Math.min(3, riskReduction);
            const rollMode = html.find('[name="rollMode"]:checked').val() || 'normal';
            this._rollSkillDice(skill.name, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'roll'
    }, { width: 600 });
    
    dialog.render(true);
  }

  /**
   * Handle rolling a specialization
   */
  private async _onRollSpecialization(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    
    if (!itemId) {
      console.error("SRA2 | No specialization ID found");
      return;
    }

    const specialization = this.actor.items.get(itemId);
    if (!specialization || specialization.type !== 'specialization') return;

    const specSystem = specialization.system as any;
    const linkedAttribute = specSystem.linkedAttribute || 'strength';
    const rating = specSystem.rating || 0;
    
    // Get the attribute value from the actor
    const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
    
    // Get the linked skill
    const linkedSkillName = specSystem.linkedSkill;
    const linkedSkill = this.actor.items.find((i: any) => i.type === 'skill' && i.name === linkedSkillName);
    const skillRating = linkedSkill ? (linkedSkill.system as any).rating || 0 : 0;
    
    const basePool = attributeValue + skillRating + 2; // +2 from specialization

    if (basePool <= 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SPECIALIZATIONS.NO_DICE'));
      return;
    }

    // Get localized attribute name
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    
    // Get RR sources for specialization, skill, and attribute
    const specRRSources = this.getRRSources('specialization', specialization.name);
    const attributeRRSources = this.getRRSources('attribute', linkedAttribute);
    const skillRRSources = linkedSkillName ? this.getRRSources('skill', linkedSkillName) : [];
    
    const allRRSources = [
      ...specRRSources,
      ...skillRRSources.map(s => ({ ...s, featName: s.featName + ` (${linkedSkillName})` })),
      ...attributeRRSources.map(s => ({ ...s, featName: s.featName + ` (${attributeLabel})` }))
    ];
    const autoRR = Math.min(3, allRRSources.reduce((total, s) => total + s.rrValue, 0));
    const defaultRiskDice = Math.min(basePool, this.getRiskDiceByRR(autoRR));

    // Build RR sources HTML
    let rrSourcesHtml = '';
    if (allRRSources.length > 0) {
      rrSourcesHtml = '<div class="rr-sources"><strong>Sources RR:</strong>';
      allRRSources.forEach((source) => {
        rrSourcesHtml += `
          <label class="rr-source-item">
            <input type="checkbox" class="rr-source-checkbox" data-rr-value="${source.rrValue}" checked />
            <span>${source.featName} (+${source.rrValue})</span>
          </label>`;
      });
      rrSourcesHtml += '</div>';
    }

    // Create a dialog
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.SPECIALIZATIONS.ROLL_TITLE', { name: specialization.name }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.BASE_POOL')}: <strong>${basePool}</strong></label>
            <p class="notes">(${attributeLabel}: ${attributeValue} + ${linkedSkillName}: ${skillRating} + ${game.i18n!.localize('SRA2.SPECIALIZATIONS.BONUS')}: 2)</p>
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
          (function() {
            const form = document.querySelector('.sra2-roll-dialog');
            const checkboxes = form.querySelectorAll('.rr-source-checkbox');
            const rrDisplay = form.querySelector('#rr-display');
            const riskDiceInput = form.querySelector('#risk-dice-input');
            const diceSelector = form.querySelector('#dice-selector');
            const diceIcons = diceSelector.querySelectorAll('.dice-icon');
            const maxDice = ${basePool};
            const riskDiceByRR = [2, 5, 8, 12];
            
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
            
            setDiceSelection(riskDiceInput.value);
          })();
        </script>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
          callback: (html: any) => {
            const totalPool = basePool;
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            let riskReduction = 0;
            html.find('.rr-source-checkbox:checked').each((_: number, cb: any) => {
              riskReduction += parseInt(cb.dataset.rrValue);
            });
            riskReduction = Math.min(3, riskReduction);
            const rollMode = html.find('[name="rollMode"]:checked').val() || 'normal';
            this._rollSkillDice(specialization.name, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'roll'
    }, { width: 600 });
    
    dialog.render(true);
  }

  /**
   * Handle attack with threshold
   */
  private async _onAttackThreshold(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    const threshold = element.data('threshold') || element.attr('data-threshold');
    const itemName = element.data('item-name') || element.attr('data-item-name');
    const isSpecialization = element.data('is-specialization') === 'true' || element.attr('data-is-specialization') === 'true';

    if (!itemId || threshold === undefined) {
      console.error("SRA2 | No item ID or threshold found");
      return;
    }

    // Get user targets
    const targets = Array.from(game.user!.targets || []);
    
    if (targets.length === 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.NPC.NO_TARGET_SELECTED'));
      return;
    }

    // For each target, prompt defense roll
    for (const target of targets) {
      const targetActor = target.actor;
      if (targetActor) {
        await this._promptDefenseRollForNPC(targetActor, threshold, itemName);
      }
    }
  }

  /**
   * Prompt target to make a defense roll against NPC attack
   */
  private async _promptDefenseRollForNPC(defenderActor: any, attackThreshold: number, attackName: string): Promise<void> {
    // Get all skills and specializations from defender
    const skills = defenderActor.items.filter((i: any) => i.type === 'skill');
    const allSpecializations = defenderActor.items.filter((i: any) => i.type === 'specialization');
    
    // Build skill options HTML
    let skillOptionsHtml = '<option value="">-- ' + game.i18n!.localize('SRA2.COMBAT.SELECT_DEFENSE_SKILL') + ' --</option>';
    skills.forEach((skill: any) => {
      const skillSystem = skill.system as any;
      const linkedAttribute = skillSystem.linkedAttribute || 'strength';
      const attributeValue = (defenderActor.system as any).attributes?.[linkedAttribute] || 0;
      const skillRating = skillSystem.rating || 0;
      const totalDicePool = attributeValue + skillRating;
      
      skillOptionsHtml += `<option value="skill-${skill.id}" data-dice-pool="${totalDicePool}">${skill.name} (${totalDicePool} dés)</option>`;
      
      // Add specializations for this skill
      const specs = allSpecializations.filter((spec: any) => {
        const linkedSkillName = spec.system.linkedSkill;
        return linkedSkillName === skill.name;
      });
      
      specs.forEach((spec: any) => {
        const specSystem = spec.system as any;
        const specLinkedAttribute = specSystem.linkedAttribute || 'strength';
        const specAttributeValue = (defenderActor.system as any).attributes?.[specLinkedAttribute] || 0;
        const parentRating = skillRating;
        const effectiveRating = parentRating + 2;
        const specTotalDicePool = specAttributeValue + effectiveRating;
        
        skillOptionsHtml += `<option value="spec-${spec.id}" data-dice-pool="${specTotalDicePool}" data-effective-rating="${effectiveRating}">  → ${spec.name} (${specTotalDicePool} dés)</option>`;
      });
    });
    
    // Create defense dialog
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.COMBAT.DEFENSE_ROLL_TITLE', { 
        attacker: this.actor.name,
        defender: defenderActor.name
      }),
      content: `
        <form class="sra2-defense-roll-dialog">
          <div class="form-group">
            <p><strong>${game.i18n!.localize('SRA2.COMBAT.ATTACK_INFO')}:</strong></p>
            <p>${attackName}</p>
            <p><strong>${game.i18n!.localize('SRA2.NPC.THRESHOLD')}:</strong> ${attackThreshold}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.COMBAT.SELECT_DEFENSE_SKILL')}:</label>
            <select id="defense-skill-select" class="skill-select">
              ${skillOptionsHtml}
            </select>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-shield-alt"></i>',
          label: game.i18n!.localize('SRA2.COMBAT.DEFEND'),
          callback: async (html: any) => {
            const selectedValue = html.find('#defense-skill-select').val();
            if (!selectedValue || selectedValue === '') {
              ui.notifications?.warn(game.i18n!.localize('SRA2.COMBAT.NO_DEFENSE_SKILL_SELECTED'));
              // No defense, full damage
              await this._displayNPCAttackResult(attackName, attackThreshold, null, defenderActor);
              return;
            }
            
            const [itemType, itemId] = (selectedValue as string).split('-');
            const defenseItem = defenderActor.items.get(itemId);
            
            if (defenseItem) {
              await this._rollDefenseAgainstNPC(defenseItem, itemType as 'skill' | 'spec', attackName, attackThreshold, defenderActor);
            }
          }
        },
        noDefense: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('SRA2.COMBAT.NO_DEFENSE'),
          callback: async () => {
            // No defense, full damage
            await this._displayNPCAttackResult(attackName, attackThreshold, null, defenderActor);
          }
        }
      },
      default: 'roll'
    }, { width: 500 });
    
    dialog.render(true);
  }

  /**
   * Roll defense against NPC attack and calculate damage
   */
  private async _rollDefenseAgainstNPC(defenseItem: any, itemType: 'skill' | 'spec', attackName: string, attackThreshold: number, defenderActor: any): Promise<void> {
    const defenseSystem = defenseItem.system as any;
    const linkedAttribute = defenseSystem.linkedAttribute || 'strength';
    const attributeValue = (defenderActor.system as any).attributes?.[linkedAttribute] || 0;
    
    let rating = 0;
    let defenseName = defenseItem.name;
    
    if (itemType === 'skill') {
      rating = defenseSystem.rating || 0;
    } else {
      // Specialization
      const parentSkillName = defenseSystem.linkedSkill;
      const parentSkill = defenderActor.items.find((i: any) => i.type === 'skill' && i.name === parentSkillName);
      const parentRating = parentSkill ? (parentSkill.system.rating || 0) : 0;
      rating = parentRating + 2;
    }
    
    const basePool = rating + attributeValue;
    
    if (basePool <= 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SKILLS.NO_DICE'));
      // No defense dice, full damage
      await this._displayNPCAttackResult(attackName, attackThreshold, null, defenderActor);
      return;
    }
    
    // Get RR for defense
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    const skillRRSources = itemType === 'skill' ? this.getRRSourcesForActor(defenderActor, 'skill', defenseItem.name) : this.getRRSourcesForActor(defenderActor, 'specialization', defenseItem.name);
    const attributeRRSources = this.getRRSourcesForActor(defenderActor, 'attribute', linkedAttribute);
    const allRRSources = [...skillRRSources, ...attributeRRSources.map(s => ({ ...s, featName: s.featName + ` (${attributeLabel})` }))];
    const autoRR = Math.min(3, allRRSources.reduce((total, s) => total + s.rrValue, 0));
    const defaultRiskDice = Math.min(basePool, this.getRiskDiceByRR(autoRR));
    
    // Build RR sources HTML
    let rrSourcesHtml = '';
    if (allRRSources.length > 0) {
      rrSourcesHtml = '<div class="rr-sources"><strong>Sources RR:</strong>';
      allRRSources.forEach((source) => {
        rrSourcesHtml += `
          <label class="rr-source-item">
            <input type="checkbox" class="rr-source-checkbox" data-rr-value="${source.rrValue}" checked />
            <span>${source.featName} (+${source.rrValue})</span>
          </label>`;
      });
      rrSourcesHtml += '</div>';
    }
    
    // Create defense roll dialog
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.COMBAT.DEFENSE_ROLL_CONFIG', { skill: defenseName }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.BASE_POOL')}: <strong>${basePool}</strong></label>
            <p class="notes">(${game.i18n!.localize(itemType === 'skill' ? 'SRA2.SKILLS.RATING' : 'SRA2.SPECIALIZATIONS.BONUS')}: ${rating} + ${attributeLabel}: ${attributeValue})</p>
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
          (function() {
            const form = document.querySelector('.sra2-roll-dialog');
            const checkboxes = form.querySelectorAll('.rr-source-checkbox');
            const rrDisplay = form.querySelector('#rr-display');
            const riskDiceInput = form.querySelector('#risk-dice-input');
            const diceSelector = form.querySelector('#dice-selector');
            const diceIcons = diceSelector.querySelectorAll('.dice-icon');
            const maxDice = ${basePool};
            const riskDiceByRR = [2, 5, 8, 12];
            
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
            
            setDiceSelection(riskDiceInput.value);
          })();
        </script>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-shield-alt"></i>',
          label: game.i18n!.localize('SRA2.COMBAT.DEFEND'),
          callback: async (html: any) => {
            const totalPool = basePool;
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            let riskReduction = 0;
            html.find('.rr-source-checkbox:checked').each((_: number, cb: any) => {
              riskReduction += parseInt(cb.dataset.rrValue);
            });
            riskReduction = Math.min(3, riskReduction);
            const rollMode = html.find('[name="rollMode"]:checked').val() || 'normal';
            
            // Roll defense
            const defenseResult = await this._performDefenseRoll(normalDice, riskDice, riskReduction, rollMode, defenseName);
            
            // Display combined result
            await this._displayNPCAttackResult(attackName, attackThreshold, defenseResult, defenderActor);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'roll'
    }, { width: 600 });
    
    dialog.render(true);
  }

  /**
   * Perform defense roll
   */
  private async _performDefenseRoll(dicePool: number, riskDice: number, riskReduction: number, rollMode: string, skillName: string): Promise<any> {
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
   * Display NPC attack result with defense
   */
  private async _displayNPCAttackResult(attackName: string, attackThreshold: number, defenseResult: any | null, defenderActor: any): Promise<void> {
    let resultsHtml = '<div class="sra2-combat-roll">';
    
    // Determine outcome first
    const attackSuccess = !defenseResult || defenseResult.totalSuccesses < attackThreshold;
    
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
    resultsHtml += this._buildNPCAttackHtml(attackThreshold);
    resultsHtml += '</div>';
    
    // Defense section
    if (defenseResult) {
      resultsHtml += '<div class="defense-section">';
      resultsHtml += `<h3>${game.i18n!.localize('SRA2.COMBAT.DEFENSE')}: ${defenseResult.skillName}</h3>`;
      resultsHtml += this._buildDiceResultsHtml(defenseResult);
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
        attackSuccesses: attackThreshold
      })}</p>`;
      resultsHtml += '</div>';
    } else {
      // Attack successful, calculate net successes
      const defenseSuccesses = defenseResult ? defenseResult.totalSuccesses : 0;
      const netSuccesses = attackThreshold - defenseSuccesses;
      
      resultsHtml += `<div class="final-damage-value">`;
      resultsHtml += `<div class="damage-label">${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE')} : ${netSuccesses}</div>`;
      if (defenseResult) {
        resultsHtml += `<div class="calculation">${attackThreshold} succès attaque - ${defenseSuccesses} succès défense</div>`;
      } else {
        resultsHtml += `<div class="calculation">${attackThreshold} succès</div>`;
      }
      resultsHtml += '</div>';
    }
    
    resultsHtml += '</div>';
    resultsHtml += '</div>';
    
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n!.format('SRA2.COMBAT.ATTACK_ROLL', { name: attackName }),
      content: resultsHtml,
      sound: CONFIG.sounds?.dice
    };
    
    await ChatMessage.create(messageData);
  }

  /**
   * Build NPC attack HTML (threshold based)
   */
  private _buildNPCAttackHtml(threshold: number): string {
    let html = '';
    
    html += '<div class="dice-pool">';
    html += `<strong>${game.i18n!.localize('SRA2.NPC.THRESHOLD')}:</strong> `;
    html += `<span class="threshold-badge">${threshold}</span>`;
    html += '</div>';
    
    html += `<div class="successes has-success">`;
    html += `<strong>${game.i18n!.localize('SRA2.SKILLS.TOTAL_SUCCESSES')}:</strong> ${threshold}`;
    html += '</div>';
    
    return html;
  }

  /**
   * Build dice results HTML (same as character sheet)
   */
  private _buildDiceResultsHtml(rollResult: any): string {
    let html = '';
    
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
    html += '</div>';
    
    // Critical failures
    if (rollResult.rawCriticalFailures > 0) {
      html += '<div class="critical-failures">';
      html += `<strong>${game.i18n!.localize('SRA2.SKILLS.CRITICAL_FAILURES')}:</strong> `;
      if (rollResult.riskReduction > 0 && rollResult.rawCriticalFailures > rollResult.criticalFailures) {
        html += `<span class="reduced">${rollResult.rawCriticalFailures}</span> → <strong>${rollResult.criticalFailures}</strong>`;
        html += ` <span class="rr-reduction">(RR -${rollResult.riskReduction})</span>`;
      } else {
        html += `<strong>${rollResult.criticalFailures}</strong>`;
      }
      
      // Add warning if there are critical failures remaining
      if (rollResult.criticalFailures > 0) {
        html += ` <span class="critical-warning"><i class="fas fa-exclamation-triangle"></i> ${game.i18n!.localize('SRA2.COMBAT.COMPLICATION')}</span>`;
      }
      html += '</div>';
    }
    
    return html;
  }

  /**
   * Get RR sources for another actor
   */
  private getRRSourcesForActor(actor: any, itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{ featName: string, rrValue: number }> {
    const sources: Array<{ featName: string, rrValue: number }> = [];
    
    const feats = actor.items.filter((item: any) => 
      item.type === 'feat' && 
      item.system.active === true
    );
    
    for (const feat of feats) {
      const featSystem = feat.system as any;
      const rrList = featSystem.rrList || [];
      
      for (const rrEntry of rrList) {
        const rrType = rrEntry.rrType;
        const rrValue = rrEntry.rrValue || 0;
        const rrTarget = rrEntry.rrTarget || '';
        
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
   * Get risk dice count based on RR level
   */
  private getRiskDiceByRR(rr: number): number {
    const riskDiceByRR = [2, 5, 8, 12];
    return riskDiceByRR[Math.min(3, Math.max(0, rr))] || 2;
  }

  /**
   * Get RR sources from active feats
   */
  private getRRSources(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{ featName: string, rrValue: number }> {
    const sources: Array<{ featName: string, rrValue: number }> = [];
    
    const feats = this.actor.items.filter((item: any) => 
      item.type === 'feat' && 
      item.system.active === true
    );
    
    for (const feat of feats) {
      const featSystem = feat.system as any;
      const rrList = featSystem.rrList || [];
      
      for (const rrEntry of rrList) {
        const rrType = rrEntry.rrType;
        const rrValue = rrEntry.rrValue || 0;
        const rrTarget = rrEntry.rrTarget || '';
        
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
   * Roll skill dice and display results with Dice So Nice
   */
  private async _rollSkillDice(skillName: string, dicePool: number, riskDice: number = 0, riskReduction: number = 0, rollMode: string = 'normal'): Promise<void> {
    let normalSuccesses = 0;
    let riskSuccesses = 0;
    let criticalFailures = 0;
    let normalDiceResults = '';
    let riskDiceResults = '';
    
    // Define success threshold based on roll mode
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
    
    // Build the results display
    let resultsHtml = '<div class="sra2-skill-roll">';
    
    const totalPool = dicePool + riskDice;
    resultsHtml += '<div class="dice-pool">';
    resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.DICE_POOL')}:</strong> `;
    resultsHtml += `${totalPool}d6`;
    if (riskDice > 0) {
      resultsHtml += ` (${dicePool} ${game.i18n!.localize('SRA2.SKILLS.NORMAL')} + <span class="risk-label">${riskDice} ${game.i18n!.localize('SRA2.SKILLS.RISK')}</span>`;
      if (riskReduction > 0) {
        resultsHtml += ` | <span class="rr-label">RR ${riskReduction}</span>`;
      }
      resultsHtml += ')';
    }
    resultsHtml += '</div>';
    
    resultsHtml += '<div class="roll-mode">';
    resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE')}:</strong> `;
    resultsHtml += game.i18n!.localize(`SRA2.SKILLS.ROLL_MODE_${rollMode.toUpperCase()}`);
    resultsHtml += '</div>';
    
    resultsHtml += '<div class="dice-results">';
    if (normalDiceResults) {
      resultsHtml += `<div class="normal-dice">${normalDiceResults}</div>`;
    }
    if (riskDiceResults) {
      resultsHtml += `<div class="risk-dice">${riskDiceResults}</div>`;
    }
    resultsHtml += '</div>';
    
    resultsHtml += '<div class="roll-summary">';
    resultsHtml += `<div class="successes"><strong>${game.i18n!.localize('SRA2.SKILLS.SUCCESSES')}:</strong> ${totalSuccesses}`;
    if (riskDice > 0) {
      resultsHtml += ` (${normalSuccesses} + <span class="risk-label">${riskSuccesses}</span>)`;
    }
    resultsHtml += '</div>';
    
    if (rawCriticalFailures > 0) {
      resultsHtml += `<div class="critical-failures"><strong>${game.i18n!.localize('SRA2.SKILLS.CRITICAL_FAILURES')}:</strong> `;
      if (riskReduction > 0 && rawCriticalFailures > criticalFailures) {
        resultsHtml += `<span class="reduced">${rawCriticalFailures}</span> → ${criticalFailures} (RR -${riskReduction})`;
      } else {
        resultsHtml += criticalFailures;
      }
      resultsHtml += '</div>';
    }
    resultsHtml += '</div>';
    
    resultsHtml += '</div>';
    
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n!.format('SRA2.SKILLS.ROLL_FLAVOR', { name: skillName }),
      content: resultsHtml,
      sound: CONFIG.sounds?.dice
    };
    
    await ChatMessage.create(messageData);
  }

  /**
   * Show item browser dialog
   */
  private async _showItemBrowser(itemType: string): Promise<void> {
    const items = game.items!.filter((item: any) => item.type === itemType);
    
    const itemOptions = items.map((item: any) => {
      return `<option value="${item.id}">${item.name}</option>`;
    }).join('');

    const content = `
      <div class="form-group">
        <label>${game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.WORLD_ITEMS`)}</label>
        <select id="item-select" style="width: 100%;">
          <option value="">${game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.SEARCH_PLACEHOLDER`)}</option>
          ${itemOptions}
        </select>
      </div>
    `;

    new Dialog({
      title: game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.ADD_${itemType.toUpperCase()}`),
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.ADD_${itemType.toUpperCase()}`),
          callback: async (html: JQuery) => {
            const itemId = html.find('#item-select').val() as string;
            if (itemId) {
              const item = game.items!.get(itemId);
              if (item) {
                await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
              }
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'add'
    }).render(true);
  }

  protected override async _onDropItem(event: DragEvent, data: ActorSheet.DropData.Item): Promise<unknown> {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;

    // Check if item already exists on the actor
    const existingItem = this.actor.items.find((i: any) => i.name === item.name && i.type === item.type);
    if (existingItem) {
      ui.notifications!.warn(game.i18n!.format('SRA2.ALREADY_EXISTS', { name: item.name }));
      return false;
    }

    // Create the item on the actor
    return await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
  }
}


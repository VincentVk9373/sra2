/**
 * Character Sheet Application
 */
export class CharacterSheet extends ActorSheet {
  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'character'],
      template: 'systems/sra2/templates/actor-character-sheet.hbs',
      width: 900,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: '.metatype-item', dropSelector: '.metatype-drop-zone' },
        { dragSelector: '.feat-item', dropSelector: '.feats-list' },
        { dragSelector: '.skill-item', dropSelector: '.skills-list' },
        { dragSelector: '.specialization-item', dropSelector: '.skills-list' }
      ],
      submitOnChange: true,
    });
  }

  override getData(): any {
    const context = super.getData() as any;

    // Ensure system data is available
    context.system = this.actor.system;

    // Get metatype (there should be only one)
    const metatypes = this.actor.items.filter((item: any) => item.type === 'metatype');
    context.metatype = metatypes.length > 0 ? metatypes[0] : null;

    // Get feats and enrich with RR target labels
    const allFeats = this.actor.items.filter((item: any) => item.type === 'feat').map((feat: any) => {
      // Add translated labels for attribute targets in RR entries
      feat.rrEntries = [];
      const rrList = feat.system.rrList || [];
      
      for (let i = 0; i < rrList.length; i++) {
        const rrEntry = rrList[i];
        const rrType = rrEntry.rrType;
        const rrValue = rrEntry.rrValue || 0;
        const rrTarget = rrEntry.rrTarget || '';
        
        const entry: any = { rrType, rrValue, rrTarget };
        
        if (rrType === 'attribute' && rrTarget) {
          entry.rrTargetLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${rrTarget.toUpperCase()}`);
        }
        
        feat.rrEntries.push(entry);
      }
      
      return feat;
    });
    
    // Group feats by type
    context.featsByType = {
      trait: allFeats.filter((feat: any) => feat.system.featType === 'trait'),
      contact: allFeats.filter((feat: any) => feat.system.featType === 'contact'),
      awakened: allFeats.filter((feat: any) => feat.system.featType === 'awakened'),
      adeptPower: allFeats.filter((feat: any) => feat.system.featType === 'adept-power'),
      equipment: allFeats.filter((feat: any) => feat.system.featType === 'equipment'),
      cyberware: allFeats.filter((feat: any) => feat.system.featType === 'cyberware'),
      cyberdeck: allFeats.filter((feat: any) => feat.system.featType === 'cyberdeck'),
      vehicle: allFeats.filter((feat: any) => feat.system.featType === 'vehicle'),
      weaponsSpells: allFeats.filter((feat: any) => feat.system.featType === 'weapons-spells'),
      weapon: allFeats.filter((feat: any) => feat.system.featType === 'weapon'),
      spell: allFeats.filter((feat: any) => feat.system.featType === 'spell')
    };
    
    // Keep the feats array for backwards compatibility
    context.feats = allFeats;
    
    // Get skills
    const skills = this.actor.items.filter((item: any) => item.type === 'skill');
    
    // Get all specializations
    const allSpecializations = this.actor.items.filter((item: any) => item.type === 'specialization');
    
    // Organize specializations by linked skill
    const specializationsBySkill = new Map<string, any[]>();
    const unlinkedSpecializations: any[] = [];
    
    allSpecializations.forEach((spec: any) => {
      const linkedSkillName = spec.system.linkedSkill;
      if (linkedSkillName) {
        // linkedSkill is stored as a name, find the skill by name
        const linkedSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        
        if (linkedSkill && linkedSkill.id) {
          // Valid linked skill found
          const skillId = linkedSkill.id;
          if (!specializationsBySkill.has(skillId)) {
            specializationsBySkill.set(skillId, []);
          }
          specializationsBySkill.get(skillId)!.push(spec);
        } else {
          // Linked skill doesn't exist (name doesn't match any skill), mark as unlinked
          unlinkedSpecializations.push(spec);
        }
      } else {
        // No linked skill specified
        unlinkedSpecializations.push(spec);
      }
    });
    
    // Calculate RR for attributes first (needed for skills and specializations)
    const attributesRR = {
      strength: Math.min(3, this.calculateRR('attribute', 'strength')),
      agility: Math.min(3, this.calculateRR('attribute', 'agility')),
      willpower: Math.min(3, this.calculateRR('attribute', 'willpower')),
      logic: Math.min(3, this.calculateRR('attribute', 'logic')),
      charisma: Math.min(3, this.calculateRR('attribute', 'charisma'))
    };
    
    // Add specializations to each skill and calculate RR
    context.skills = skills.map((skill: any) => {
      // Get linked attribute label for the skill
      const linkedAttribute = skill.system?.linkedAttribute || 'strength';
      skill.linkedAttributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
      
      // Calculate RR for this skill (skill RR + attribute RR, max 3)
      const skillRR = this.calculateRR('skill', skill.name);
      const attributeRR = (attributesRR as any)[linkedAttribute] || 0;
      skill.rr = Math.min(3, skillRR + attributeRR);
      
      // Calculate total dice pool (attribute + skill rating)
      const attributeValue = (this.actor.system as any).attributes[linkedAttribute] || 0;
      const skillRating = skill.system?.rating || 0;
      skill.totalDicePool = attributeValue + skillRating;
      
      // Get specializations for this skill and add calculated ratings
      const specs = specializationsBySkill.get(skill.id) || [];
      skill.specializations = specs.map((spec: any) => {
        const parentRating = skill.system?.rating || 0;
        // Add properties directly to the spec object instead of creating a new one
        spec.parentRating = parentRating;
        spec.effectiveRating = parentRating + 2;  // Specialization adds +2 to skill rating
        spec.parentSkillName = skill.name;
        
        // Get linked attribute label for the specialization
        const specLinkedAttribute = spec.system?.linkedAttribute || 'strength';
        spec.linkedAttributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${specLinkedAttribute.toUpperCase()}`);
        
        // Calculate RR for this specialization (attribute RR + skill RR + spec RR, max 3)
        const specRR = this.calculateRR('specialization', spec.name);
        const specAttributeRR = (attributesRR as any)[specLinkedAttribute] || 0;
        const parentSkillRR = skillRR; // RR of the parent skill
        spec.rr = Math.min(3, specAttributeRR + parentSkillRR + specRR);
        
        // Calculate total dice pool (attribute + effective rating)
        const specAttributeValue = (this.actor.system as any).attributes[specLinkedAttribute] || 0;
        spec.totalDicePool = specAttributeValue + spec.effectiveRating;
        
        return spec;
      });
      return skill;
    });
    
    // Add unlinked specializations with attribute labels and RR
    context.unlinkedSpecializations = unlinkedSpecializations.map((spec: any) => {
      const linkedAttribute = spec.system?.linkedAttribute || 'strength';
      spec.linkedAttributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
      
      // Calculate RR for this specialization (spec RR + attribute RR, max 3)
      // Note: unlinked specializations don't have a parent skill, so only attribute + spec RR
      const specRR = this.calculateRR('specialization', spec.name);
      const attributeRR = (attributesRR as any)[linkedAttribute] || 0;
      spec.rr = Math.min(3, specRR + attributeRR);
      
      // Calculate total dice pool (attribute only, since no skill linked)
      const attributeValue = (this.actor.system as any).attributes[linkedAttribute] || 0;
      spec.totalDicePool = attributeValue;
      
      return spec;
    });
    
    // Store attributesRR in context
    context.attributesRR = attributesRR;

    return context;
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    // Clean up document-level event listeners
    $(document).off('click.skill-search');
    $(document).off('click.feat-search');
    return super.close(options);
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Edit metatype
    html.find('[data-action="edit-metatype"]').on('click', this._onEditMetatype.bind(this));
    
    // Delete metatype
    html.find('[data-action="delete-metatype"]').on('click', this._onDeleteMetatype.bind(this));

    // Edit feat
    html.find('[data-action="edit-feat"]').on('click', this._onEditFeat.bind(this));

    // Delete feat
    html.find('[data-action="delete-feat"]').on('click', this._onDeleteFeat.bind(this));

    // Edit skill
    html.find('[data-action="edit-skill"]').on('click', this._onEditSkill.bind(this));

    // Delete skill
    html.find('[data-action="delete-skill"]').on('click', this._onDeleteSkill.bind(this));

    // Edit specialization
    html.find('[data-action="edit-specialization"]').on('click', this._onEditSpecialization.bind(this));

    // Delete specialization
    html.find('[data-action="delete-specialization"]').on('click', this._onDeleteSpecialization.bind(this));

    // Roll attribute
    html.find('[data-action="roll-attribute"]').on('click', this._onRollAttribute.bind(this));

    // Roll skill
    html.find('[data-action="roll-skill"]').on('click', this._onRollSkill.bind(this));

    // Quick roll skill (from dice badge)
    html.find('[data-action="quick-roll-skill"]').on('click', this._onQuickRollSkill.bind(this));

    // Roll specialization
    html.find('[data-action="roll-specialization"]').on('click', this._onRollSpecialization.bind(this));

    // Quick roll specialization (from dice badge)
    html.find('[data-action="quick-roll-specialization"]').on('click', this._onQuickRollSpecialization.bind(this));

    // Send catchphrase to chat
    html.find('[data-action="send-catchphrase"]').on('click', this._onSendCatchphrase.bind(this));

    // Handle rating changes
    html.find('.rating-input').on('change', this._onRatingChange.bind(this));

    // Skill search
    html.find('.skill-search-input').on('input', this._onSkillSearch.bind(this));
    html.find('.skill-search-input').on('focus', this._onSkillSearchFocus.bind(this));
    html.find('.skill-search-input').on('blur', this._onSkillSearchBlur.bind(this));
    
    // Close skill search results when clicking outside
    $(document).on('click.skill-search', (event) => {
      const target = event.target as unknown as HTMLElement;
      const skillSearchContainer = html.find('.skill-search-container')[0] as HTMLElement;
      if (skillSearchContainer && !skillSearchContainer.contains(target)) {
        html.find('.skill-search-results').hide();
      }
    });

    // Feat search
    html.find('.feat-search-input').on('input', this._onFeatSearch.bind(this));
    html.find('.feat-search-input').on('focus', this._onFeatSearchFocus.bind(this));
    html.find('.feat-search-input').on('blur', this._onFeatSearchBlur.bind(this));
    
    // Close feat search results when clicking outside
    $(document).on('click.feat-search', (event) => {
      const target = event.target as unknown as HTMLElement;
      const featSearchContainer = html.find('.feat-search-container')[0] as HTMLElement;
      if (featSearchContainer && !featSearchContainer.contains(target)) {
        html.find('.feat-search-results').hide();
      }
    });

    // Make feat items draggable
    html.find('.feat-item').each((_index, item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', this._onDragStart.bind(this));
    });

    // Make skill items draggable
    html.find('.skill-item').each((_index, item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', this._onDragStart.bind(this));
    });

    // Make specialization items draggable
    html.find('.specialization-item').each((_index, item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', this._onDragStart.bind(this));
    });
  }

  /**
   * Handle form submission to update actor data
   */
  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    // Filter out item data (handled separately by _onRatingChange)
    const actorData: any = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!key.startsWith('items.')) {
        actorData[key] = value;
      }
    }
    
    // Expand the form data to handle nested properties
    const expandedData = foundry.utils.expandObject(actorData);
    
    // Update the actor with the form data
    return this.actor.update(expandedData);
  }

  /**
   * Handle editing a metatype
   */
  private async _onEditMetatype(event: Event): Promise<void> {
    event.preventDefault();
    const metatypeId = (event.currentTarget as HTMLElement).closest('.metatype-item')?.getAttribute('data-item-id');
    if (metatypeId) {
      const metatype = this.actor.items.get(metatypeId);
      if (metatype) {
        metatype.sheet?.render(true);
      }
    }
  }

  /**
   * Handle deleting a metatype
   */
  private async _onDeleteMetatype(event: Event): Promise<void> {
    event.preventDefault();
    const metatypeId = (event.currentTarget as HTMLElement).closest('.metatype-item')?.getAttribute('data-item-id');
    if (metatypeId) {
      const metatype = this.actor.items.get(metatypeId);
      if (metatype) {
        await metatype.delete();
        this.render(false);
      }
    }
  }

  /**
   * Handle editing a feat
   */
  private async _onEditFeat(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) return;

    const feat = this.actor.items.get(itemId);
    if (feat) {
      feat.sheet?.render(true);
    }
  }

  /**
   * Handle deleting a feat
   */
  private async _onDeleteFeat(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (item) {
      await item.delete();
    }
  }

  /**
   * Handle editing a skill
   */
  private async _onEditSkill(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) return;

    const skill = this.actor.items.get(itemId);
    if (skill) {
      skill.sheet?.render(true);
    }
  }

  /**
   * Handle deleting a skill
   */
  private async _onDeleteSkill(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (item) {
      await item.delete();
    }
  }

  /**
   * Handle editing a specialization
   */
  private async _onEditSpecialization(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) return;

    const specialization = this.actor.items.get(itemId);
    if (specialization) {
      specialization.sheet?.render(true);
    }
  }

  /**
   * Handle deleting a specialization
   */
  private async _onDeleteSpecialization(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (item) {
      await item.delete();
    }
  }

  /**
   * Get detailed RR sources for a given skill, specialization, or attribute
   */
  private getRRSources(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{featName: string, rrValue: number}> {
    const sources: Array<{featName: string, rrValue: number}> = [];
    
    // Get all active feats from the actor
    const feats = this.actor.items.filter((item: any) => 
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
   * Calculate Risk Reduction (RR) from active feats for a given skill, specialization, or attribute
   */
  private calculateRR(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): number {
    const sources = this.getRRSources(itemType, itemName);
    return sources.reduce((total, source) => total + source.rrValue, 0);
  }

  /**
   * Handle rating changes for items
   */
  private async _onRatingChange(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLInputElement;
    const itemId = element.dataset.itemId;
    const newRating = parseInt(element.value);
    
    if (!itemId || isNaN(newRating)) return;

    const item = this.actor.items.get(itemId);
    if (item) {
      await item.update({ system: { rating: newRating } } as any);
    }
  }

  /**
   * Handle rolling a specialization
   */
  private async _onRollSpecialization(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    const effectiveRating = parseInt(element.dataset.effectiveRating || '0');
    
    if (!itemId) {
      console.error("SRA2 | No specialization ID found");
      return;
    }

    const specialization = this.actor.items.get(itemId);
    if (!specialization || specialization.type !== 'specialization') return;

    const specSystem = specialization.system as any;
    const linkedAttribute = specSystem.linkedAttribute || 'strength';
    
    // Get the attribute value from the actor
    const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
    const basePool = effectiveRating + attributeValue;

    if (basePool <= 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SPECIALIZATIONS.NO_DICE'));
      return;
    }

    // Get localized attribute name
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    
    // Get RR sources for specialization, skill, and attribute
    const specRRSources = this.getRRSources('specialization', specialization.name);
    const attributeRRSources = this.getRRSources('attribute', linkedAttribute);
    const linkedSkillName = specSystem.linkedSkill;
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
      allRRSources.forEach((source, index) => {
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
      title: game.i18n!.format('SRA2.SPECIALIZATIONS.ROLL_TITLE', { name: specialization.name }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.BASE_POOL')}: <strong>${basePool}</strong></label>
            <p class="notes">(${game.i18n!.localize('SRA2.SPECIALIZATIONS.BONUS')}: ${effectiveRating} + ${attributeLabel}: ${attributeValue})</p>
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
   * Handle quick rolling a skill (from dice badge click) - opens dialog
   */
  private async _onQuickRollSkill(event: Event): Promise<void> {
    // Simply call the regular roll skill function which opens the dialog
    return this._onRollSkill(event);
  }

  /**
   * Handle quick rolling a specialization (from dice badge click) - opens dialog
   */
  private async _onQuickRollSpecialization(event: Event): Promise<void> {
    // Simply call the regular roll specialization function which opens the dialog
    return this._onRollSpecialization(event);
  }

  /**
   * Get risk dice count based on RR level
   */
  private getRiskDiceByRR(rr: number): number {
    const riskDiceByRR = [2, 5, 8, 12];
    return riskDiceByRR[Math.min(3, Math.max(0, rr))] || 2;
  }

  /**
   * Handle rolling an attribute
   */
  private async _onRollAttribute(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const attributeName = element.dataset.attribute;
    
    if (!attributeName) return;

    const attributeValue = (this.actor.system as any).attributes?.[attributeName] || 0;
    
    if (attributeValue <= 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.ATTRIBUTES.NO_DICE'));
      return;
    }

    // Get RR sources for this attribute
    const rrSources = this.getRRSources('attribute', attributeName);
    const autoRR = Math.min(3, rrSources.reduce((total, s) => total + s.rrValue, 0));
    const defaultRiskDice = Math.min(attributeValue, this.getRiskDiceByRR(autoRR));

    // Get localized attribute name
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`);

    // Build RR sources HTML
    let rrSourcesHtml = '';
    if (rrSources.length > 0) {
      rrSourcesHtml = '<div class="rr-sources"><strong>Sources RR:</strong>';
      rrSources.forEach((source, index) => {
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
      title: game.i18n!.format('SRA2.ATTRIBUTES.ROLL_TITLE', { name: attributeLabel }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.ATTRIBUTES.BASE_POOL')}: <strong>${attributeValue}</strong></label>
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
              ${Array.from({length: attributeValue}, (_, i) => 
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
            const maxDice = ${attributeValue};
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
        </script>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
          callback: (html: any) => {
            const totalPool = attributeValue;
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            let riskReduction = 0;
            html.find('.rr-source-checkbox:checked').each((_: number, cb: any) => {
              riskReduction += parseInt(cb.dataset.rrValue);
            });
            riskReduction = Math.min(3, riskReduction);
            const rollMode = html.find('[name="rollMode"]:checked').val() || 'normal';
            this._rollSkillDice(attributeLabel, normalDice, riskDice, riskReduction, rollMode);
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
   * Handle rolling a skill
   */
  private async _onRollSkill(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) {
      console.error("SRA2 | No item ID found");
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
      allRRSources.forEach((source, index) => {
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
        case 'advantage': return 4;  // 4, 5, 6 = success
        case 'disadvantage': return 6; // only 6 = success
        default: return 5;  // 5, 6 = success
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
    
    // Build the results display
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
      resultsHtml += `<span class="mini-success"> (${normalSuccesses} ${game.i18n!.localize('SRA2.SKILLS.SUCCESSES_SHORT')})</span>`;
      resultsHtml += '</div>';
    }
    
    // Risk dice results
    if (riskDiceResults) {
      resultsHtml += '<div class="dice-results risk">';
      resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.RISK_DICE')}:</strong> ${riskDiceResults}`;
      resultsHtml += `<span class="mini-success"> (${riskSuccesses} ${game.i18n!.localize('SRA2.SKILLS.SUCCESSES_SHORT')})</span>`;
      resultsHtml += '</div>';
    }
    
    // Total successes
    resultsHtml += `<div class="successes ${totalSuccesses > 0 ? 'has-success' : 'no-success'}">`;
    resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.TOTAL_SUCCESSES')}:</strong> ${totalSuccesses}`;
    resultsHtml += '</div>';
    
    // Critical failures
    if (rawCriticalFailures > 0 || riskReduction > 0) {
      resultsHtml += `<div class="critical-failures ${criticalFailures === 0 ? 'reduced-to-zero' : ''}">`;
      resultsHtml += `<strong>${game.i18n!.localize('SRA2.SKILLS.CRITICAL_FAILURES')}:</strong> `;
      
      if (riskReduction > 0) {
        resultsHtml += `<span class="calculation">${rawCriticalFailures} - ${riskReduction} RR = </span>`;
      }
      
      resultsHtml += `<span class="final-value">${criticalFailures}</span>`;
      resultsHtml += '</div>';
    }
    
    resultsHtml += '</div>';
    
    // Create the chat message
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n!.format('SRA2.SKILLS.ROLL_FLAVOR', { name: skillName }),
      content: resultsHtml,
      sound: CONFIG.sounds?.dice
    };
    
    await ChatMessage.create(messageData);
  }

  /**
   * Handle drag start for feat items
   */
  protected override _onDragStart(event: DragEvent): void {
    const itemId = (event.currentTarget as HTMLElement).dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    const dragData = {
      type: 'Item',
      uuid: item.uuid,
    };

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  /**
   * Override to handle dropping feats and skills
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    const data = TextEditor.getDragEventData(event) as any;
    const dropTarget = (event.target as HTMLElement).closest('[data-drop-zone]') as HTMLElement;
    
    // Handle Item drops
    if (data && data.type === 'Item') {
      const item = await Item.implementation.fromDropData(data) as any;
      
      if (!item) return super._onDrop(event);
      
      // Check if dropping in metatype section
      if (dropTarget && dropTarget.dataset.dropZone === 'metatype') {
        if (item.type === 'metatype') {
          // Check if the item is from a compendium or another actor
          if (!item.actor || item.actor.id !== this.actor.id) {
            // Check if there's already a metatype
            const existingMetatype = this.actor.items.find((i: any) => i.type === 'metatype');
            
            if (existingMetatype) {
              const message = game.i18n!.localize('SRA2.METATYPES.ONLY_ONE_METATYPE');
              ui.notifications?.warn(message);
              return;
            }
            
            await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
            return;
          }
        } else {
          ui.notifications?.warn(game.i18n!.localize('SRA2.METATYPES.ONLY_METATYPES'));
          return;
        }
      }
      
      // Check if dropping in feats section
      if (dropTarget && dropTarget.dataset.dropZone === 'feat') {
        if (item.type === 'feat') {
          // Check if the item is from a compendium or another actor
          if (!item.actor || item.actor.id !== this.actor.id) {
            // Check for duplicates by name
            const existingFeat = this.actor.items.find((i: any) => 
              i.type === 'feat' && i.name === item.name
            );
            
            if (existingFeat) {
              const message = game.i18n!.format('SRA2.FEATS.ALREADY_EXISTS', { name: item.name });
              ui.notifications?.warn(message);
              return;
            }
            
            await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
            return;
          }
        } else {
          ui.notifications?.warn(game.i18n!.localize('SRA2.FEATS.ONLY_FEATS'));
          return;
        }
      }
      
      // Check if dropping in skills section
      if (dropTarget && dropTarget.dataset.dropZone === 'skill') {
        if (item.type === 'skill' || item.type === 'specialization') {
          // Check if the item is from a compendium or another actor
          if (!item.actor || item.actor.id !== this.actor.id) {
            // Check for duplicates by name
            const existingItem = this.actor.items.find((i: any) => 
              i.type === item.type && i.name === item.name
            );
            
            if (existingItem) {
              const messageKey = item.type === 'skill' ? 'SRA2.SKILLS.ALREADY_EXISTS' : 'SRA2.SPECIALIZATIONS.ALREADY_EXISTS';
              const message = game.i18n!.format(messageKey, { name: item.name });
              ui.notifications?.warn(message);
              return;
            }
            
            await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
            return;
          }
        } else {
          ui.notifications?.warn(game.i18n!.localize('SRA2.SKILLS.ONLY_SKILLS'));
          return;
        }
      }
    }

    return super._onDrop(event);
  }

  /**
   * Handle skill search input
   */
  private searchTimeout: any = null;
  
  private async _onSkillSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = input.value.trim().toLowerCase();
    const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.searchTimeout = setTimeout(async () => {
      await this._performSkillSearch(searchTerm, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual skill search in compendiums and world items
   */
  private async _performSkillSearch(searchTerm: string, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    
    // Store search term for potential creation
    this.lastSearchTerm = searchTerm;
    
    // Search in world items first
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === 'skill' && item.name.toLowerCase().includes(searchTerm)) {
          // Check if skill already exists on actor
          const existingSkill = this.actor.items.find((i: any) => 
            i.type === 'skill' && i.name === item.name
          );
          
          results.push({
            name: item.name,
            uuid: item.uuid,
            pack: game.i18n!.localize('SRA2.SKILLS.WORLD_ITEMS'),
            exists: !!existingSkill
          });
        }
      }
    }
    
    // Search in all compendiums
    for (const pack of game.packs as any) {
      // Only search in Item compendiums
      if (pack.documentName !== 'Item') continue;
      
      // Get all documents from the pack
      const documents = await pack.getDocuments();
      
      // Filter for skills that match the search term
      for (const doc of documents) {
        if (doc.type === 'skill' && doc.name.toLowerCase().includes(searchTerm)) {
          // Check if skill already exists on actor
          const existingSkill = this.actor.items.find((i: any) => 
            i.type === 'skill' && i.name === doc.name
          );
          
          results.push({
            name: doc.name,
            uuid: doc.uuid,
            pack: pack.title,
            exists: !!existingSkill
          });
        }
      }
    }
    
    // Display results
    this._displaySkillSearchResults(results, resultsDiv);
  }

  /**
   * Display skill search results
   */
  private lastSearchTerm: string = '';
  
  private _displaySkillSearchResults(results: any[], resultsDiv: HTMLElement): void {
    // Check if exact match exists on the actor
    const formattedSearchTerm = this.lastSearchTerm
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const exactMatchOnActor = this.actor.items.find((i: any) => 
      i.type === 'skill' && i.name.toLowerCase() === this.lastSearchTerm.toLowerCase()
    );
    
    let html = '';
    
    // If no results at all, show only the create button with message
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SKILLS.SEARCH_NO_RESULTS')}
          </div>
          <button class="create-skill-btn" data-skill-name="${this.lastSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n!.localize('SRA2.SKILLS.CREATE_SKILL')}
          </button>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        const disabledClass = result.exists ? 'disabled' : '';
        const buttonText = result.exists ? '✓' : game.i18n!.localize('SRA2.SKILLS.ADD_SKILL');
        
        html += `
          <div class="search-result-item ${disabledClass}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.pack}</span>
            </div>
            <button class="add-skill-btn" data-uuid="${result.uuid}" ${result.exists ? 'disabled' : ''}>
              ${buttonText}
            </button>
          </div>
        `;
      }
      
      // Add create button if exact match doesn't exist on actor
      if (!exactMatchOnActor) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n!.localize('SRA2.SKILLS.CREATE_NEW')}</span>
            </div>
            <button class="create-skill-btn-inline" data-skill-name="${this.lastSearchTerm}">
              ${game.i18n!.localize('SRA2.SKILLS.CREATE')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Attach click handlers to buttons
    $(resultsDiv).find('.add-skill-btn').on('click', this._onAddSkillFromSearch.bind(this));
    $(resultsDiv).find('.create-skill-btn, .create-skill-btn-inline').on('click', this._onCreateNewSkill.bind(this));
    
    // Make entire result items clickable (except disabled ones and create button)
    $(resultsDiv).find('.search-result-item:not(.disabled):not(.no-results-create):not(.create-new-item)').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.add-skill-btn').length > 0) return;
      
      // Find the button in this item and trigger its click
      const button = $(event.currentTarget).find('.add-skill-btn')[0] as HTMLButtonElement;
      if (button && !button.disabled) {
        $(button).trigger('click');
      }
    });
    
    // Make create items clickable on the entire row
    $(resultsDiv).find('.search-result-item.create-new-item').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.create-skill-btn-inline').length > 0) return;
      
      // Find the button and trigger its click
      const button = $(event.currentTarget).find('.create-skill-btn-inline')[0];
      if (button) {
        $(button).trigger('click');
      }
    });
  }

  /**
   * Handle adding a skill from search results
   */
  private async _onAddSkillFromSearch(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const uuid = button.dataset.uuid;
    
    if (!uuid) return;
    
    // Get the skill from the compendium
    const skill = await fromUuid(uuid as any) as any;
    
    if (!skill) {
      ui.notifications?.error('Skill not found');
      return;
    }
    
    // Check if skill already exists
    const existingSkill = this.actor.items.find((i: any) => 
      i.type === 'skill' && i.name === skill.name
    );
    
    if (existingSkill) {
      ui.notifications?.warn(game.i18n!.format('SRA2.SKILLS.ALREADY_EXISTS', { name: skill.name }));
      return;
    }
    
    // Add the skill to the actor
    await this.actor.createEmbeddedDocuments('Item', [skill.toObject()]);
    
    // Mark button as added
    button.textContent = '✓';
    button.disabled = true;
    button.closest('.search-result-item')?.classList.add('disabled');
    
    ui.notifications?.info(`${skill.name} ${game.i18n!.localize('SRA2.SKILLS.ADD_SKILL')}`);
  }

  /**
   * Handle skill search focus
   */
  private _onSkillSearchFocus(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
    
    return Promise.resolve();
  }

  /**
   * Handle skill search blur
   */
  private _onSkillSearchBlur(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        // Check if the related target (where focus is going) is inside the results div
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          // Don't hide if focus is moving to an element within the results
          return;
        }
        
        // Also check if any element in the results is focused
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          // Don't hide if an element in results is active
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, 200);
    
    return Promise.resolve();
  }

  /**
   * Handle creating a new skill from search
   */
  private async _onCreateNewSkill(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const skillName = button.dataset.skillName;
    
    if (!skillName) return;
    
    // Capitalize first letter of each word
    const formattedName = skillName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Create the new skill with default values
    const skillData = {
      name: formattedName,
      type: 'skill',
      system: {
        rating: 1,
        linkedAttribute: 'strength',
        description: ''
      }
    } as any;
    
    // Add the skill to the actor
    const createdItems = await this.actor.createEmbeddedDocuments('Item', [skillData]) as any;
    
    if (createdItems && createdItems.length > 0) {
      const newSkill = createdItems[0] as any;
      
      // Clear the search input and hide results
      const searchInput = this.element.find('.skill-search-input')[0] as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }
      
      const resultsDiv = this.element.find('.skill-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        resultsDiv.style.display = 'none';
      }
      
      // Open the skill sheet for editing
      if (newSkill && newSkill.sheet) {
        setTimeout(() => {
          newSkill.sheet.render(true);
        }, 100);
      }
      
      ui.notifications?.info(game.i18n!.format('SRA2.SKILLS.SKILL_CREATED', { name: formattedName }));
    }
  }

  /**
   * FEAT SEARCH FUNCTIONS
   */
  
  private featSearchTimeout: any = null;
  private lastFeatSearchTerm: string = '';
  
  /**
   * Handle feat search input
   */
  private async _onFeatSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = input.value.trim().toLowerCase();
    const resultsDiv = $(input).siblings('.feat-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this.featSearchTimeout) {
      clearTimeout(this.featSearchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.featSearchTimeout = setTimeout(async () => {
      await this._performFeatSearch(searchTerm, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual feat search in compendiums and world items
   */
  private async _performFeatSearch(searchTerm: string, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    
    // Store search term for potential creation
    this.lastFeatSearchTerm = searchTerm;
    
    // Search in world items first
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === 'feat' && item.name.toLowerCase().includes(searchTerm)) {
          // Check if feat already exists on actor
          const existingFeat = this.actor.items.find((i: any) => 
            i.type === 'feat' && i.name === item.name
          );
          
          results.push({
            name: item.name,
            uuid: item.uuid,
            pack: game.i18n!.localize('SRA2.FEATS.WORLD_ITEMS'),
            featType: item.system.featType,
            exists: !!existingFeat
          });
        }
      }
    }
    
    // Search in all compendiums
    for (const pack of game.packs as any) {
      // Only search in Item compendiums
      if (pack.documentName !== 'Item') continue;
      
      // Get all documents from the pack
      const documents = await pack.getDocuments();
      
      // Filter for feats that match the search term
      for (const doc of documents) {
        if (doc.type === 'feat' && doc.name.toLowerCase().includes(searchTerm)) {
          // Check if feat already exists on actor
          const existingFeat = this.actor.items.find((i: any) => 
            i.type === 'feat' && i.name === doc.name
          );
          
          results.push({
            name: doc.name,
            uuid: doc.uuid,
            pack: pack.title,
            featType: doc.system.featType,
            exists: !!existingFeat
          });
        }
      }
    }
    
    // Display results
    this._displayFeatSearchResults(results, resultsDiv);
  }

  /**
   * Display feat search results
   */
  private _displayFeatSearchResults(results: any[], resultsDiv: HTMLElement): Promise<void> {
    // Check if exact match exists on the actor
    const formattedSearchTerm = this.lastFeatSearchTerm
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const exactMatchOnActor = this.actor.items.find((i: any) => 
      i.type === 'feat' && i.name.toLowerCase() === this.lastFeatSearchTerm.toLowerCase()
    );
    
    let html = '';
    
    // If no results at all, show only the create button with message and type selector
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.FEATS.SEARCH_NO_RESULTS')}
          </div>
          <select class="feat-type-selector">
            <option value="equipment">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.EQUIPMENT')}</option>
            <option value="trait">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.TRAIT')}</option>
            <option value="contact">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CONTACT')}</option>
            <option value="awakened">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.AWAKENED')}</option>
            <option value="adept-power">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.ADEPT_POWER')}</option>
            <option value="cyberware">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERWARE')}</option>
            <option value="cyberdeck">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERDECK')}</option>
            <option value="vehicle">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.VEHICLE')}</option>
            <option value="weapons-spells">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS')}</option>
            <option value="weapon">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPON')}</option>
            <option value="spell">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.SPELL')}</option>
          </select>
          <button class="create-feat-btn" data-feat-name="${this.lastFeatSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n!.localize('SRA2.FEATS.CREATE')}
          </button>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        const disabledClass = result.exists ? 'disabled' : '';
        const buttonText = result.exists ? '✓' : game.i18n!.localize('SRA2.FEATS.ADD_FEAT');
        const featTypeLabel = game.i18n!.localize(`SRA2.FEATS.FEAT_TYPE.${result.featType.toUpperCase().replace('-', '_')}`);
        
        html += `
          <div class="search-result-item ${disabledClass}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.pack} - ${featTypeLabel}</span>
            </div>
            <button class="add-feat-btn" data-uuid="${result.uuid}" ${result.exists ? 'disabled' : ''}>
              ${buttonText}
            </button>
          </div>
        `;
      }
      
      // Add create button if exact match doesn't exist on actor
      if (!exactMatchOnActor) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n!.localize('SRA2.FEATS.CREATE_NEW')}</span>
            </div>
            <select class="feat-type-selector-inline">
              <option value="equipment">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.EQUIPMENT')}</option>
              <option value="trait">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.TRAIT')}</option>
              <option value="contact">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CONTACT')}</option>
              <option value="awakened">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.AWAKENED')}</option>
              <option value="adept-power">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.ADEPT_POWER')}</option>
              <option value="cyberware">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERWARE')}</option>
              <option value="cyberdeck">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERDECK')}</option>
              <option value="vehicle">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.VEHICLE')}</option>
              <option value="weapons-spells">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS')}</option>
              <option value="weapon">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPON')}</option>
              <option value="spell">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.SPELL')}</option>
            </select>
            <button class="create-feat-btn-inline" data-feat-name="${this.lastFeatSearchTerm}">
              ${game.i18n!.localize('SRA2.FEATS.CREATE')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Attach click handlers
    $(resultsDiv).find('.add-feat-btn').on('click', this._onAddFeatFromSearch.bind(this));
    $(resultsDiv).find('.create-feat-btn, .create-feat-btn-inline').on('click', this._onCreateNewFeat.bind(this));
    
    // Make entire result items clickable (except disabled ones and create button)
    $(resultsDiv).find('.search-result-item:not(.disabled):not(.no-results-create):not(.create-new-item)').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.add-feat-btn').length > 0) return;
      
      // Find the button in this item and trigger its click
      const button = $(event.currentTarget).find('.add-feat-btn')[0] as HTMLButtonElement;
      if (button && !button.disabled) {
        $(button).trigger('click');
      }
    });
    
    // Make create items clickable on the entire row
    $(resultsDiv).find('.search-result-item.create-new-item').on('click', (event) => {
      // Don't trigger if clicking directly on the button or select
      if ($(event.target).closest('.create-feat-btn-inline, .feat-type-selector-inline').length > 0) return;
      
      // Find the button and trigger its click
      const button = $(event.currentTarget).find('.create-feat-btn-inline')[0];
      if (button) {
        $(button).trigger('click');
      }
    });
    
    return Promise.resolve();
  }

  /**
   * Handle adding a feat from search results
   */
  private async _onAddFeatFromSearch(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const uuid = button.dataset.uuid;
    
    if (!uuid) return;
    
    // Get the feat from the compendium
    const feat = await fromUuid(uuid as any) as any;
    
    if (!feat) {
      ui.notifications?.error('Feat not found');
      return;
    }
    
    // Check if feat already exists
    const existingFeat = this.actor.items.find((i: any) => 
      i.type === 'feat' && i.name === feat.name
    );
    
    if (existingFeat) {
      ui.notifications?.warn(game.i18n!.format('SRA2.FEATS.ALREADY_EXISTS', { name: feat.name }));
      return;
    }
    
    // Add the feat to the actor
    await this.actor.createEmbeddedDocuments('Item', [feat.toObject()]);
    
    // Mark button as added
    button.textContent = '✓';
    button.disabled = true;
    button.closest('.search-result-item')?.classList.add('disabled');
    
    ui.notifications?.info(`${feat.name} ${game.i18n!.localize('SRA2.FEATS.ADD_FEAT')}`);
  }

  /**
   * Handle feat search focus
   */
  private _onFeatSearchFocus(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings('.feat-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
    
    return Promise.resolve();
  }

  /**
   * Handle feat search blur
   */
  private _onFeatSearchBlur(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = $(input).siblings('.feat-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        // Check if the related target (where focus is going) is inside the results div
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          // Don't hide if focus is moving to an element within the results
          return;
        }
        
        // Also check if any select element in the results is focused
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          // Don't hide if a select or other element in results is active
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, 200);
    
    return Promise.resolve();
  }

  /**
   * Handle sending a catchphrase to chat
   */
  private async _onSendCatchphrase(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const catchphrase = element.dataset.catchphrase;
    
    if (!catchphrase) return;

    // Create the chat message
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="sra2-catchphrase">${catchphrase}</div>`
    };
    
    await ChatMessage.create(messageData as any);
  }

  /**
   * Handle creating a new feat from search
   */
  private async _onCreateNewFeat(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const featName = button.dataset.featName;
    
    if (!featName) return;
    
    // Get the feat type from the selector
    const selector = $(button).siblings('.feat-type-selector, .feat-type-selector-inline')[0] as HTMLSelectElement;
    const featType = selector ? selector.value : 'equipment';
    
    // Capitalize first letter of each word
    const formattedName = featName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Create the new feat with default values
    const featData = {
      name: formattedName,
      type: 'feat',
      system: {
        description: '',
        rating: 0,
        cost: 'free-equipment',
        active: true,
        featType: featType,
        rrType: [],
        rrValue: [],
        rrTarget: [],
        bonusLightDamage: 0,
        bonusSevereDamage: 0,
        bonusPhysicalThreshold: 0,
        bonusMentalThreshold: 0,
        bonusAnarchy: 0,
        essenceCost: 0
      }
    } as any;
    
    // Add the feat to the actor
    const createdItems = await this.actor.createEmbeddedDocuments('Item', [featData]) as any;
    
    if (createdItems && createdItems.length > 0) {
      const newFeat = createdItems[0] as any;
      
      // Clear the search input and hide results
      const searchInput = this.element.find('.feat-search-input')[0] as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }
      
      const resultsDiv = this.element.find('.feat-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        resultsDiv.style.display = 'none';
      }
      
      // Open the feat sheet for editing
      if (newFeat && newFeat.sheet) {
        setTimeout(() => {
          newFeat.sheet.render(true);
        }, 100);
      }
      
      ui.notifications?.info(game.i18n!.format('SRA2.FEATS.FEAT_CREATED', { name: formattedName }));
    }
  }
}


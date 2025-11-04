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
      const rrTypes = feat.system.rrType || [];
      const rrValues = feat.system.rrValue || [];
      const rrTargets = feat.system.rrTarget || [];
      
      for (let i = 0; i < rrTypes.length; i++) {
        const rrType = rrTypes[i];
        const rrValue = rrValues[i] || 0;
        const rrTarget = rrTargets[i] || '';
        
        if (rrType === 'none') continue;
        
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
      equipment: allFeats.filter((feat: any) => feat.system.featType === 'equipment'),
      cyberware: allFeats.filter((feat: any) => feat.system.featType === 'cyberware'),
      cyberdeck: allFeats.filter((feat: any) => feat.system.featType === 'cyberdeck'),
      vehicle: allFeats.filter((feat: any) => feat.system.featType === 'vehicle'),
      weaponsSpells: allFeats.filter((feat: any) => feat.system.featType === 'weapons-spells')
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
      strength: this.calculateRR('attribute', 'strength'),
      agility: this.calculateRR('attribute', 'agility'),
      willpower: this.calculateRR('attribute', 'willpower'),
      logic: this.calculateRR('attribute', 'logic'),
      charisma: this.calculateRR('attribute', 'charisma')
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

    // Handle rating changes
    html.find('.rating-input').on('change', this._onRatingChange.bind(this));

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
   * Calculate Risk Reduction (RR) from active feats for a given skill, specialization, or attribute
   */
  private calculateRR(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): number {
    let totalRR = 0;
    
    // Get all active feats from the actor
    const feats = this.actor.items.filter((item: any) => 
      item.type === 'feat' && 
      item.system.active === true
    );
    
    // Calculate RR from feats that target this item
    for (const feat of feats) {
      const featSystem = feat.system as any;
      const rrTypes = featSystem.rrType || [];
      const rrValues = featSystem.rrValue || [];
      const rrTargets = featSystem.rrTarget || [];
      
      // Loop through all RR entries in this feat
      for (let i = 0; i < rrTypes.length; i++) {
        const rrType = rrTypes[i];
        const rrValue = rrValues[i] || 0;
        const rrTarget = rrTargets[i] || '';
        
        // Check if this RR entry provides RR for the given item
        if (rrType === itemType && rrTarget === itemName) {
          totalRR += rrValue;
        }
      }
    }
    
    // RR is capped at 3
    return Math.min(3, totalRR);
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
    console.log("SRA2 | Roll specialization clicked!");
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
    
    // Calculate automatic RR from feats (specialization + attribute + parent skill)
    const specializationRR = this.calculateRR('specialization', specialization.name);
    const attributeRR = this.calculateRR('attribute', linkedAttribute);
    
    // Get RR from parent skill (if linked)
    const linkedSkillName = specSystem.linkedSkill;
    const skillRR = linkedSkillName ? this.calculateRR('skill', linkedSkillName) : 0;
    
    const autoRR = Math.min(3, specializationRR + attributeRR + skillRR);

    // Create a dialog to optionally add modifiers and risk dice
    new Dialog({
      title: game.i18n!.format('SRA2.SPECIALIZATIONS.ROLL_TITLE', { name: specialization.name }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.BASE_POOL')}: <strong>${basePool}</strong></label>
            <p class="notes">(${game.i18n!.localize('SRA2.SPECIALIZATIONS.BONUS')}: ${effectiveRating} + ${attributeLabel}: ${attributeValue})</p>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.MODIFIER')}:</label>
            <input type="number" name="modifier" value="0" min="-10" max="10" />
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE')}:</label>
            <select name="rollMode">
              <option value="normal" selected>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_NORMAL')}</option>
              <option value="advantage">${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_ADVANTAGE')}</option>
              <option value="disadvantage">${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_DISADVANTAGE')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.RISK_DICE')} (max ${basePool}):</label>
            <input type="number" name="riskDice" value="0" min="0" max="${basePool}" />
            <p class="notes">${game.i18n!.localize('SRA2.SKILLS.RISK_DICE_HINT')}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.RISK_REDUCTION')} </label>
            <input type="number" name="riskReduction" value="${autoRR}" min="0" max="3" />
            <p class="notes">${game.i18n!.localize('SRA2.SKILLS.RISK_REDUCTION_HINT')}${autoRR > 0 ? ' <strong>(Auto: ' + autoRR + ')</strong>' : ''}</p>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
          callback: (html: any) => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const totalPool = Math.max(1, basePool + modifier);
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            const riskReduction = Math.max(0, Math.min(3, parseInt(html.find('[name="riskReduction"]').val()) || 0));
            const rollMode = html.find('[name="rollMode"]').val() || 'normal';
            this._rollSkillDice(specialization.name, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'roll'
    }).render(true);
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

    // Calculate automatic RR from feats for this attribute
    const autoRR = this.calculateRR('attribute', attributeName);

    // Get localized attribute name
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`);

    // Create a dialog to optionally add modifiers and risk dice
    new Dialog({
      title: game.i18n!.format('SRA2.ATTRIBUTES.ROLL_TITLE', { name: attributeLabel }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.ATTRIBUTES.BASE_POOL')}: <strong>${attributeValue}</strong></label>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.MODIFIER')}:</label>
            <input type="number" name="modifier" value="0" min="-10" max="10" />
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE')}:</label>
            <select name="rollMode">
              <option value="normal" selected>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_NORMAL')}</option>
              <option value="advantage">${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_ADVANTAGE')}</option>
              <option value="disadvantage">${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_DISADVANTAGE')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.RISK_DICE')} (max ${attributeValue}):</label>
            <input type="number" name="riskDice" value="0" min="0" max="${attributeValue}" />
            <p class="notes">${game.i18n!.localize('SRA2.SKILLS.RISK_DICE_HINT')}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.RISK_REDUCTION')} (max 3):</label>
            <input type="number" name="riskReduction" value="${autoRR}" min="0" max="3" />
            <p class="notes">${game.i18n!.localize('SRA2.SKILLS.RISK_REDUCTION_HINT')}${autoRR > 0 ? ' <strong>(Auto: ' + autoRR + ')</strong>' : ''}</p>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
          callback: (html: any) => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const totalPool = Math.max(1, attributeValue + modifier);
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            const riskReduction = Math.max(0, Math.min(3, parseInt(html.find('[name="riskReduction"]').val()) || 0));
            const rollMode = html.find('[name="rollMode"]').val() || 'normal';
            this._rollSkillDice(attributeLabel, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'roll'
    }).render(true);
  }

  /**
   * Handle rolling a skill
   */
  private async _onRollSkill(event: Event): Promise<void> {
    event.preventDefault();
    console.log("SRA2 | Roll skill clicked!");
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
    
    // Calculate automatic RR from feats (skill + attribute)
    const skillRR = this.calculateRR('skill', skill.name);
    const attributeRR = this.calculateRR('attribute', linkedAttribute);
    const autoRR = Math.min(3, skillRR + attributeRR);

    // Create a dialog to optionally add modifiers and risk dice
    new Dialog({
      title: game.i18n!.format('SRA2.SKILLS.ROLL_TITLE', { name: skill.name }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.BASE_POOL')}: <strong>${basePool}</strong></label>
            <p class="notes">(${game.i18n!.localize('SRA2.SKILLS.RATING')}: ${rating} + ${attributeLabel}: ${attributeValue})</p>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.MODIFIER')}:</label>
            <input type="number" name="modifier" value="0" min="-10" max="10" />
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE')}:</label>
            <select name="rollMode">
              <option value="normal" selected>${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_NORMAL')}</option>
              <option value="advantage">${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_ADVANTAGE')}</option>
              <option value="disadvantage">${game.i18n!.localize('SRA2.SKILLS.ROLL_MODE_DISADVANTAGE')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.RISK_DICE')} (max ${basePool}):</label>
            <input type="number" name="riskDice" value="0" min="0" max="${basePool}" />
            <p class="notes">${game.i18n!.localize('SRA2.SKILLS.RISK_DICE_HINT')}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.SKILLS.RISK_REDUCTION')}:</label>
            <input type="number" name="riskReduction" value="${autoRR}" min="0" max="3" />
            <p class="notes">${game.i18n!.localize('SRA2.SKILLS.RISK_REDUCTION_HINT')}${autoRR > 0 ? ' <strong>(Auto: ' + autoRR + ')</strong>' : ''}</p>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
          callback: (html: any) => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const totalPool = Math.max(1, basePool + modifier);
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            const riskReduction = Math.max(0, Math.min(3, parseInt(html.find('[name="riskReduction"]').val()) || 0));
            const rollMode = html.find('[name="rollMode"]').val() || 'normal';
            this._rollSkillDice(skill.name, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'roll'
    }).render(true);
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
}


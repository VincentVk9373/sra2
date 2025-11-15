import * as DiceRoller from '../helpers/dice-roller.js';

/**
 * Normalize text for search: lowercase and remove accents/special characters
 */
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Character Sheet Application
 */
export class CharacterSheet extends ActorSheet {
  /** Active section for tabbed navigation */
  private _activeSection: string = 'identity';

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

    // Add active section for navigation
    context.activeSection = this._activeSection;

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

    // Section navigation
    html.find('.section-nav .nav-item').on('click', this._onSectionNavigation.bind(this));

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

    // Roll weapon
    html.find('[data-action="roll-weapon"]').on('click', this._onRollWeapon.bind(this));

    // Roll spell
    html.find('[data-action="roll-spell"]').on('click', this._onRollSpell.bind(this));

    // Roll weapon/spell (old type)
    html.find('[data-action="roll-weapon-spell"]').on('click', this._onRollWeaponSpell.bind(this));

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
   * Handle section navigation
   */
  private _onSectionNavigation(event: Event): void {
    event.preventDefault();
    const button = event.currentTarget as HTMLElement;
    const section = button.dataset.section;
    
    if (!section) return;
    
    // Update active section
    this._activeSection = section;
    
    // Update UI
    const form = $(this.form);
    form.find('.section-nav .nav-item').removeClass('active');
    button.classList.add('active');
    
    form.find('.content-section').removeClass('active');
    form.find(`[data-section-content="${section}"]`).addClass('active');
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
    return DiceRoller.getRRSources(this.actor, itemType, itemName);
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
    const rrSourcesHtml = DiceRoller.buildRRSourcesHtml(allRRSources);

    // Create a dialog to optionally add modifiers and risk dice
    const poolDescription = `(${game.i18n!.localize('SRA2.SPECIALIZATIONS.BONUS')}: ${effectiveRating} + ${attributeLabel}: ${attributeValue})`;
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.SPECIALIZATIONS.ROLL_TITLE', { name: specialization.name }),
      content: DiceRoller.createRollDialogContent({
        title: game.i18n!.format('SRA2.SPECIALIZATIONS.ROLL_TITLE', { name: specialization.name }),
        basePool,
        poolDescription,
        autoRR,
        defaultRiskDice,
        rrSourcesHtml
      }),
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
    return DiceRoller.getRiskDiceByRR(rr);
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
    const rrSourcesHtml = DiceRoller.buildRRSourcesHtml(rrSources);

    // Create a dialog to optionally add modifiers and risk dice
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.ATTRIBUTES.ROLL_TITLE', { name: attributeLabel }),
      content: DiceRoller.createRollDialogContent({
        title: game.i18n!.format('SRA2.ATTRIBUTES.ROLL_TITLE', { name: attributeLabel }),
        basePool: attributeValue,
        poolDescription: '',
        autoRR,
        defaultRiskDice,
        rrSourcesHtml
      }),
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
    const rrSourcesHtml = DiceRoller.buildRRSourcesHtml(allRRSources);

    // Create a dialog to optionally add modifiers and risk dice
    const poolDescription = `(${game.i18n!.localize('SRA2.SKILLS.RATING')}: ${rating} + ${attributeLabel}: ${attributeValue})`;
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.SKILLS.ROLL_TITLE', { name: skill.name }),
      content: DiceRoller.createRollDialogContent({
        title: game.i18n!.format('SRA2.SKILLS.ROLL_TITLE', { name: skill.name }),
        basePool,
        poolDescription,
        autoRR,
        defaultRiskDice,
        rrSourcesHtml
      }),
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
  private async _rollSkillDice(skillName: string, dicePool: number, riskDice: number = 0, riskReduction: number = 0, rollMode: string = 'normal', weaponDamageValue?: string): Promise<void> {
    // Roll dice using helper function
    const result = await DiceRoller.rollDice(dicePool, riskDice, riskReduction, rollMode);
    
    // Build results HTML using helper function
    const actorStrength = (this.actor.system as any).attributes?.strength || 0;
    const resultsHtml = DiceRoller.buildRollResultsHtml({
      skillName,
      dicePool,
      riskDice,
      riskReduction,
      rollMode,
      result,
      weaponDamageValue,
      actorStrength
    });
    
    // Post to chat using helper function
    await DiceRoller.postRollToChat(this.actor, skillName, resultsHtml);
  }

  /**
   * Roll an attack with defense system
   */
  private async _rollAttackWithDefense(skillName: string, dicePool: number, riskDice: number = 0, riskReduction: number = 0, rollMode: string = 'normal', weaponDamageValue?: string, attackingWeapon?: any): Promise<void> {
    // First, roll the attack
    const attackResult = await this._performDiceRoll(dicePool, riskDice, riskReduction, rollMode);
    
    // Check if there are any targeted tokens
    const targets = Array.from((game as any).user?.targets || []);
    
    if (targets.length === 0 || !weaponDamageValue || weaponDamageValue === '0') {
      // No target or no weapon damage, just display normal roll
      await this._displayRollResult(skillName, attackResult, weaponDamageValue);
      return;
    }
    
    // There's at least one target, ask for defense roll
    const target = targets[0] as any;
    const targetActor = target.actor;
    
    if (!targetActor) {
      // No actor on target, just display normal roll
      await this._displayRollResult(skillName, attackResult, weaponDamageValue);
      return;
    }
    
    // Prepare defense dialog
    ui.notifications?.info(game.i18n!.format('SRA2.COMBAT.WAITING_FOR_DEFENSE', { 
      attacker: this.actor.name,
      defender: targetActor.name,
      successes: attackResult.totalSuccesses
    }));
    
    // Prompt defense roll
    await this._promptDefenseRoll(targetActor, attackResult, skillName, weaponDamageValue, attackingWeapon);
  }

  /**
   * Prompt target to make a defense roll
   */
  private async _promptDefenseRoll(defenderActor: any, attackResult: any, attackName: string, weaponDamageValue: string, attackingWeapon?: any): Promise<void> {
    // Get all skills and specializations from defender
    const skills = defenderActor.items.filter((i: any) => i.type === 'skill');
    const allSpecializations = defenderActor.items.filter((i: any) => i.type === 'specialization');
    
    // Get linked defense specialization from attacking weapon if available
    const linkedDefenseSpecId = attackingWeapon?.system?.linkedDefenseSpecialization || '';
    let defaultSelection = '';
    let linkedSpec: any = null;
    let linkedSkill: any = null;
    
    // Try to find the linked defense specialization
    if (linkedDefenseSpecId) {
      linkedSpec = allSpecializations.find((s: any) => s.id === linkedDefenseSpecId);
      if (linkedSpec) {
        defaultSelection = `spec-${linkedSpec.id}`;
        // Find the parent skill for this specialization
        const linkedSkillName = linkedSpec.system.linkedSkill;
        linkedSkill = skills.find((s: any) => s.name === linkedSkillName);
      }
    }
    
    // If no specialization found, use the first skill as default
    if (!defaultSelection && skills.length > 0) {
      linkedSkill = skills[0]; // Default to first skill
      defaultSelection = `skill-${linkedSkill.id}`;
    }
    
    // Build skill options HTML - ALWAYS show both threshold and dice pool
    let skillOptionsHtml = '<option value="">-- ' + game.i18n!.localize('SRA2.COMBAT.SELECT_DEFENSE_SKILL') + ' --</option>';
    
    skills.forEach((skill: any) => {
      const skillSystem = skill.system as any;
      const linkedAttribute = skillSystem.linkedAttribute || 'strength';
      const attributeValue = (defenderActor.system as any).attributes?.[linkedAttribute] || 0;
      const skillRating = skillSystem.rating || 0;
      const totalDicePool = attributeValue + skillRating;
      
      // Calculate threshold for all actors (NPC or PC)
      const { threshold } = this._calculateNPCThreshold(defenderActor, skill, totalDicePool, 'skill');
      
      // Check if this skill should be selected by default
      const selected = defaultSelection === `skill-${skill.id}` ? ' selected' : '';
      
      // Display both threshold and dice pool
      skillOptionsHtml += `<option value="skill-${skill.id}" data-dice-pool="${totalDicePool}" data-threshold="${threshold}"${selected}>${skill.name} (${game.i18n!.localize('SRA2.NPC.THRESHOLD')}: ${threshold} / ${totalDicePool} dés)</option>`;
      
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
        
        const { threshold: specThreshold } = this._calculateNPCThreshold(defenderActor, spec, specTotalDicePool, 'specialization', skill);
        
        // Check if this specialization should be selected by default
        const specSelected = defaultSelection === `spec-${spec.id}` ? ' selected' : '';
        
        skillOptionsHtml += `<option value="spec-${spec.id}" data-dice-pool="${specTotalDicePool}" data-threshold="${specThreshold}" data-effective-rating="${effectiveRating}"${specSelected}>  → ${spec.name} (${game.i18n!.localize('SRA2.NPC.THRESHOLD')}: ${specThreshold} / ${specTotalDicePool} dés)</option>`;
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
            <p><strong>${game.i18n!.localize('SRA2.COMBAT.ATTACK_SUCCESSES')}:</strong> ${attackResult.totalSuccesses}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.COMBAT.SELECT_DEFENSE_SKILL')}:</label>
            <select id="defense-skill-select" class="skill-select">
              ${skillOptionsHtml}
            </select>
          </div>
          <div class="form-group defense-method-group">
            <label>${game.i18n!.localize('SRA2.COMBAT.DEFENSE_METHOD')}:</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="defenseMethod" value="threshold" checked />
                <span>${game.i18n!.localize('SRA2.COMBAT.USE_THRESHOLD')}</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="defenseMethod" value="roll" />
                <span>${game.i18n!.localize('SRA2.COMBAT.ROLL_DICE')}</span>
              </label>
            </div>
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
              await this._displayAttackResult(attackName, attackResult, null, weaponDamageValue, defenderActor.name, defenderActor);
              return;
            }
            
            const [itemType, itemId] = (selectedValue as string).split('-');
            const defenseItem = defenderActor.items.get(itemId);
            
            if (defenseItem) {
              // Check which defense method was chosen
              const defenseMethod = html.find('input[name="defenseMethod"]:checked').val();
              const selectedOption = html.find('#defense-skill-select option:selected');
              
              if (defenseMethod === 'threshold') {
                // Use threshold (no dice roll)
                const threshold = parseInt(selectedOption.attr('data-threshold')) || 0;
                await this._defendWithThreshold(defenseItem, itemType as 'skill' | 'spec', threshold, attackName, attackResult, weaponDamageValue, defenderActor);
              } else {
                // Roll dice
                await this._rollDefenseAndCalculateDamage(defenseItem, itemType as 'skill' | 'spec', attackName, attackResult, weaponDamageValue, defenderActor);
              }
            }
          }
        },
        noDefense: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('SRA2.COMBAT.NO_DEFENSE'),
          callback: async () => {
            // No defense, full damage
            await this._displayAttackResult(attackName, attackResult, null, weaponDamageValue, defenderActor.name, defenderActor);
          }
        }
      },
      default: 'roll'
    }, { width: 500 });
    
    dialog.render(true);
  }

  /**
   * Roll defense and calculate final damage
   */
  private async _rollDefenseAndCalculateDamage(defenseItem: any, itemType: 'skill' | 'spec', attackName: string, attackResult: any, weaponDamageValue: string, defenderActor: any): Promise<void> {
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
      await this._displayAttackResult(attackName, attackResult, null, weaponDamageValue, defenderActor.name, defenderActor);
      return;
    }
    
    // Get RR for defense
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    const skillRRSources = itemType === 'skill' ? this._getRRSourcesForActor(defenderActor, 'skill', defenseItem.name) : this._getRRSourcesForActor(defenderActor, 'specialization', defenseItem.name);
    const attributeRRSources = this._getRRSourcesForActor(defenderActor, 'attribute', linkedAttribute);
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
            const defenseResult = await this._performDiceRoll(normalDice, riskDice, riskReduction, rollMode);
            defenseResult.skillName = defenseName;
            
            // Display combined result
            await this._displayAttackResult(attackName, attackResult, defenseResult, weaponDamageValue, defenderActor.name, defenderActor);
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
   * Calculate NPC threshold for defense
   */
  private _calculateNPCThreshold(actor: any, item: any, dicePool: number, itemType: 'skill' | 'specialization', parentSkill?: any): { threshold: number, totalRR: number } {
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
    
    // Calculate NPC threshold: floor(dice pool / 3) + RR + 1
    const threshold = Math.floor(dicePool / 3) + totalRR + 1;
    
    return { threshold, totalRR };
  }

  /**
   * Defend with NPC threshold (no dice roll)
   */
  private async _defendWithThreshold(defenseItem: any, itemType: 'skill' | 'spec', threshold: number, attackName: string, attackResult: any, weaponDamageValue: string, defenderActor: any): Promise<void> {
    const defenseName = defenseItem.name;
    
    // Create a "fake" defense result that looks like a roll result but uses threshold
    const defenseResult = {
      skillName: defenseName,
      totalSuccesses: threshold,
      isThreshold: true, // Flag to indicate this is a threshold-based defense
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
    
    // Display the attack result with threshold defense
    await this._displayAttackResult(attackName, attackResult, defenseResult, weaponDamageValue, defenderActor.name, defenderActor);
  }

  /**
   * Perform dice roll and return results
   */
  private async _performDiceRoll(dicePool: number, riskDice: number, riskReduction: number, rollMode: string): Promise<any> {
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
      dicePool,
      riskDice,
      riskReduction,
      rollMode,
      normalSuccesses,
      riskSuccesses,
      totalSuccesses,
      rawCriticalFailures,
      criticalFailures,
      normalDiceResults,
      riskDiceResults
    };
  }

  /**
   * Display attack result with optional defense
   */
  private async _displayAttackResult(attackName: string, attackResult: any, defenseResult: any | null, weaponDamageValue: string, defenderName?: string, defenderActor?: any): Promise<void> {
    const strength = (this.actor.system as any).attributes?.strength || 0;
    let baseVD = 0;
    let vdDisplay = weaponDamageValue;
    
    // Parse the damage value
    if (weaponDamageValue === 'FOR') {
      baseVD = strength;
      vdDisplay = `FOR (${strength})`;
    } else if (weaponDamageValue.startsWith('FOR+')) {
      const modifier = parseInt(weaponDamageValue.substring(4)) || 0;
      baseVD = strength + modifier;
      vdDisplay = `FOR+${modifier} (${baseVD})`;
    } else if (weaponDamageValue === 'toxin') {
      vdDisplay = 'selon toxine';
      baseVD = -1;
    } else {
      baseVD = parseInt(weaponDamageValue) || 0;
    }
    
    let resultsHtml = '<div class="sra2-combat-roll">';
    
    // Determine outcome first
    const attackSuccess = !defenseResult || defenseResult.totalSuccesses <= attackResult.totalSuccesses;
    
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
    resultsHtml += this._buildDiceResultsHtml(attackResult, weaponDamageValue);
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
        defender: defenderName || '?',
        defenseSuccesses: defenseResult!.totalSuccesses,
        attackSuccesses: attackResult.totalSuccesses
      })}</p>`;
      resultsHtml += '</div>';
    } else {
      // Attack successful, calculate damage
      const defenseSuccesses = defenseResult ? defenseResult.totalSuccesses : 0;
      const netSuccesses = attackResult.totalSuccesses - defenseSuccesses;
      
      if (baseVD >= 0) {
        const finalDamage = baseVD + netSuccesses;
        resultsHtml += `<div class="final-damage-value">`;
        resultsHtml += `<div class="damage-label">${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE')} : ${finalDamage}</div>`;
        if (defenseResult) {
          resultsHtml += `<div class="calculation">${baseVD} VD + ${attackResult.totalSuccesses} succès attaque - ${defenseSuccesses} succès défense</div>`;
        } else {
          resultsHtml += `<div class="calculation">${attackResult.totalSuccesses} succès + ${baseVD} VD</div>`;
        }
        
        // Add button to apply damage if we have a defender
        if (defenderActor && defenderName) {
          resultsHtml += `<button class="apply-damage-btn" data-defender-id="${defenderActor.id}" data-damage="${finalDamage}" data-defender-name="${defenderName}" title="${game.i18n!.format('SRA2.COMBAT.APPLY_DAMAGE_TITLE', {damage: finalDamage, defender: defenderName})}">`;
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
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n!.format('SRA2.COMBAT.ATTACK_ROLL', { name: attackName }),
      content: resultsHtml,
      sound: CONFIG.sounds?.dice
    };
    
    await ChatMessage.create(messageData);
  }

  /**
   * Apply damage to a defender
   */
  static async applyDamage(defenderId: string, damageValue: number, defenderName: string): Promise<void> {
    const defender = game.actors?.get(defenderId);
    
    if (!defender) {
      ui.notifications?.error(`Cannot find defender: ${defenderName}`);
      return;
    }
    
    const defenderSystem = defender.system as any;
    const damageThresholds = defenderSystem.damageThresholds?.withArmor || {
      light: 1,
      moderate: 4,
      severe: 7
    };
    
    // Deep copy of damage object with arrays
    let damage = {
      light: [...(defenderSystem.damage?.light || [])],
      severe: [...(defenderSystem.damage?.severe || [])],
      incapacitating: defenderSystem.damage?.incapacitating || false
    };
    let damageType = '';
    let overflow = false;
    
    // Determine damage type based on thresholds
    if (damageValue >= damageThresholds.severe) {
      // Incapacitating wound
      damageType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_INCAPACITATING');
      damage.incapacitating = true;
    } else if (damageValue >= damageThresholds.moderate) {
      // Severe wound
      damageType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_SEVERE');
      
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
    } else if (damageValue >= damageThresholds.light) {
      // Light wound
      damageType = game.i18n!.localize('SRA2.COMBAT.DAMAGE_LIGHT');
      
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
    
    // Update the actor's damage
    await defender.update({ 'system.damage': damage });
    
    // Check if now incapacitated
    if (damage.incapacitating === true) {
      ui.notifications?.error(game.i18n!.format('SRA2.COMBAT.NOW_INCAPACITATED', { target: defenderName }));
    } else {
      ui.notifications?.info(game.i18n!.format('SRA2.COMBAT.DAMAGE_APPLIED', { 
        damage: overflow ? `${damageType} (débordement)` : damageType,
        target: defenderName 
      }));
    }
  }

  /**
   * Build dice results HTML
   */
  private _buildDiceResultsHtml(rollResult: any, weaponDamageValue?: string): string {
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
    
    // Normal dice roll (PC)
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
    
    // Total successes with weapon damage value next to it
    html += `<div class="successes ${rollResult.totalSuccesses > 0 ? 'has-success' : 'no-success'}">`;
    html += `<strong>${game.i18n!.localize('SRA2.SKILLS.TOTAL_SUCCESSES')}:</strong> ${rollResult.totalSuccesses}`;
    
    // Weapon Damage Value (VD) displayed next to successes
    if (weaponDamageValue && weaponDamageValue !== '0') {
      const strength = (this.actor.system as any).attributes?.strength || 0;
      let baseVD = 0;
      let vdDisplay = weaponDamageValue;
      
      // Parse the damage value
      if (weaponDamageValue === 'FOR') {
        baseVD = strength;
        vdDisplay = `FOR (${strength})`;
      } else if (weaponDamageValue.startsWith('FOR+')) {
        const modifier = parseInt(weaponDamageValue.substring(4)) || 0;
        baseVD = strength + modifier;
        vdDisplay = `FOR+${modifier} (${baseVD})`;
      } else if (weaponDamageValue === 'toxin') {
        vdDisplay = 'selon toxine';
        baseVD = -1; // Special case, don't calculate final VD
      } else {
        baseVD = parseInt(weaponDamageValue) || 0;
      }
      
      if (baseVD >= 0) {
        const finalVD = rollResult.totalSuccesses + baseVD;
        html += ` | `;
        html += `<strong>${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE_VALUE_SHORT')}:</strong> `;
        html += `<span class="final-damage-value">`;
        html += `<span class="calculation">${rollResult.totalSuccesses} + ${baseVD} = </span>`;
        html += `<span class="final-value">${finalVD}</span>`;
        html += `</span>`;
      }
    }
    
    html += '</div>';
    
    // Critical failures
    if (rollResult.rawCriticalFailures > 0 || rollResult.riskReduction > 0) {
      let criticalLabel = '';
      let criticalClass = '';
      
      if (rollResult.criticalFailures >= 3) {
        criticalLabel = game.i18n!.localize('SRA2.SKILLS.DISASTER');
        criticalClass = 'disaster';
      } else if (rollResult.criticalFailures === 2) {
        criticalLabel = game.i18n!.localize('SRA2.SKILLS.CRITICAL_COMPLICATION');
        criticalClass = 'critical-complication';
      } else if (rollResult.criticalFailures === 1) {
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
      
      if (rollResult.riskReduction > 0) {
        html += `<div class="complication-calculation">Attaque: ${rollResult.rawCriticalFailures} - ${rollResult.riskReduction} RR = ${rollResult.criticalFailures}</div>`;
      }
      
      html += '</div>';
    }
    
    return html;
  }

  /**
   * Display simple roll result (without defense)
   */
  private async _displayRollResult(skillName: string, rollResult: any, weaponDamageValue?: string): Promise<void> {
    let resultsHtml = '<div class="sra2-skill-roll">';
    resultsHtml += this._buildDiceResultsHtml(rollResult, weaponDamageValue);
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
   * Get RR sources for an actor
   */
  private _getRRSourcesForActor(actor: any, itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{featName: string, rrValue: number}> {
    const sources: Array<{featName: string, rrValue: number}> = [];
    
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
    const searchTerm = normalizeSearchText(input.value.trim());
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
        if (item.type === 'skill' && normalizeSearchText(item.name).includes(searchTerm)) {
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
        if (doc.type === 'skill' && normalizeSearchText(doc.name).includes(searchTerm)) {
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
      i.type === 'skill' && normalizeSearchText(i.name) === normalizeSearchText(this.lastSearchTerm)
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
    const searchTerm = normalizeSearchText(input.value.trim());
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
        if (item.type === 'feat' && normalizeSearchText(item.name).includes(searchTerm)) {
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
        if (doc.type === 'feat' && normalizeSearchText(doc.name).includes(searchTerm)) {
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
      i.type === 'feat' && normalizeSearchText(i.name) === normalizeSearchText(this.lastFeatSearchTerm)
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
   * Handle rolling a weapon
   */
  private async _onRollWeapon(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) {
      console.error("SRA2 | No weapon ID found");
      return;
    }

    const weapon = this.actor.items.get(itemId);
    if (!weapon || weapon.type !== 'feat') return;

    await this._rollWeaponOrSpell(weapon, 'weapon');
  }

  /**
   * Handle rolling a spell
   */
  private async _onRollSpell(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) {
      console.error("SRA2 | No spell ID found");
      return;
    }

    const spell = this.actor.items.get(itemId);
    if (!spell || spell.type !== 'feat') return;

    await this._rollWeaponOrSpell(spell, 'spell');
  }

  /**
   * Handle rolling a weapon/spell (old type)
   */
  private async _onRollWeaponSpell(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) {
      console.error("SRA2 | No weapon/spell ID found");
      return;
    }

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== 'feat') return;

    await this._rollWeaponOrSpell(item, 'weapon-spell');
  }

  /**
   * Normalize a string for comparison (lowercase, no special chars)
   */
  private _normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, ''); // Remove special characters
  }

  /**
   * Handle rolling dice for a weapon or spell
   */
  private async _rollWeaponOrSpell(item: any, type: 'weapon' | 'spell' | 'weapon-spell'): Promise<void> {
    const itemSystem = item.system as any;
    
    // Get all skills and specializations
    const skills = this.actor.items.filter((i: any) => i.type === 'skill');
    const allSpecializations = this.actor.items.filter((i: any) => i.type === 'specialization');
    
    // Get linked attack specialization from weapon if available
    const linkedAttackSpecId = itemSystem.linkedAttackSpecialization || '';
    let defaultSelection = '';
    let linkedSpec: any = null;
    let linkedSkill: any = null;
    
    // NEW AUTO-SELECTION LOGIC:
    // 1. Try to find the linked specialization by ID on character
    if (linkedAttackSpecId) {
      linkedSpec = allSpecializations.find((s: any) => s.id === linkedAttackSpecId);
      
      if (linkedSpec) {
        const specName = linkedSpec.name;
        const normalizedSpecName = this._normalizeString(specName);
        
        // 1. Search for a skill on the character that has the same name as the specialization
        const matchingSkill = skills.find((s: any) => 
          this._normalizeString(s.name) === normalizedSpecName
        );
        
        if (matchingSkill) {
          // Found a skill with the same name - preselect it
          defaultSelection = `skill-${matchingSkill.id}`;
          linkedSkill = matchingSkill;
        } else {
          // 2. Check if the linked skill from specialization exists on character
          const linkedSkillName = linkedSpec.system.linkedSkill;
          if (linkedSkillName) {
            const normalizedLinkedSkillName = this._normalizeString(linkedSkillName);
            const matchingLinkedSkill = skills.find((s: any) => 
              this._normalizeString(s.name) === normalizedLinkedSkillName
            );
            
            if (matchingLinkedSkill) {
              // Found the linked skill on character - preselect it
              defaultSelection = `skill-${matchingLinkedSkill.id}`;
              linkedSkill = matchingLinkedSkill;
            } else {
              // 3. Linked skill not found, search in game.items for the specialization by NAME
              // to find alternative linked skill
              const gameSpec = (game as any).items?.find((i: any) => 
                i.type === 'specialization' && 
                this._normalizeString(i.name) === normalizedSpecName
              );
              
              if (gameSpec) {
                const gameLinkedSkillName = gameSpec.system?.linkedSkill || '';
                if (gameLinkedSkillName) {
                  const normalizedGameLinkedSkill = this._normalizeString(gameLinkedSkillName);
                  const matchingGameSkill = skills.find((s: any) => 
                    this._normalizeString(s.name) === normalizedGameLinkedSkill
                  );
                  
                  if (matchingGameSkill) {
                    defaultSelection = `skill-${matchingGameSkill.id}`;
                    linkedSkill = matchingGameSkill;
                  }
                }
              }
              
              // 4. If still not found, try "arme à distance"
              if (!defaultSelection) {
                const normalizedRangedWeapon = this._normalizeString('arme à distance');
                const rangedSkill = skills.find((s: any) => 
                  this._normalizeString(s.name) === normalizedRangedWeapon
                );
                
                if (rangedSkill) {
                  defaultSelection = `skill-${rangedSkill.id}`;
                  linkedSkill = rangedSkill;
                } else {
                  // Use the specialization itself as last resort before default
                  defaultSelection = `spec-${linkedSpec.id}`;
                  linkedSkill = skills[0]; // Will be used for fallback
                }
              }
            }
          } else {
            // Specialization has no linked skill, use the specialization itself
            defaultSelection = `spec-${linkedSpec.id}`;
            linkedSkill = skills.find((s: any) => s.name === linkedSkillName);
          }
        }
      }
    }
    
    // 4. If still no selection, use the first skill as default
    if (!defaultSelection && skills.length > 0) {
      linkedSkill = skills[0];
      defaultSelection = `skill-${linkedSkill.id}`;
    }
    
    // Build skill options HTML
    let skillOptionsHtml = '<option value="">-- ' + game.i18n!.localize('SRA2.FEATS.WEAPON.SELECT_SKILL') + ' --</option>';
    skills.forEach((skill: any) => {
      const skillSystem = skill.system as any;
      const linkedAttribute = skillSystem.linkedAttribute || 'strength';
      const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
      const skillRating = skillSystem.rating || 0;
      const totalDicePool = attributeValue + skillRating;
      
      const selected = defaultSelection === `skill-${skill.id}` ? ' selected' : '';
      skillOptionsHtml += `<option value="skill-${skill.id}" data-dice-pool="${totalDicePool}"${selected}>${skill.name} (${totalDicePool} dés)</option>`;
      
      // Add specializations for this skill
      const specs = allSpecializations.filter((spec: any) => {
        const linkedSkillName = spec.system.linkedSkill;
        return linkedSkillName === skill.name;
      });
      
      specs.forEach((spec: any) => {
        const specSystem = spec.system as any;
        const specLinkedAttribute = specSystem.linkedAttribute || 'strength';
        const specAttributeValue = (this.actor.system as any).attributes?.[specLinkedAttribute] || 0;
        const parentRating = skillRating;
        const effectiveRating = parentRating + 2;
        const specTotalDicePool = specAttributeValue + effectiveRating;
        
        const specSelected = defaultSelection === `spec-${spec.id}` ? ' selected' : '';
        skillOptionsHtml += `<option value="spec-${spec.id}" data-dice-pool="${specTotalDicePool}" data-effective-rating="${effectiveRating}"${specSelected}>  → ${spec.name} (${specTotalDicePool} dés)</option>`;
      });
    });
    
    // Get weapon/spell info
    const damageValue = itemSystem.damageValue || '0';
    const weaponName = item.name;
    
    const titleKey = type === 'spell' ? 'SRA2.FEATS.SPELL.ROLL_TITLE' : 'SRA2.FEATS.WEAPON.ROLL_TITLE';
    
    // Create dialog to select skill/specialization
    const dialog = new Dialog({
      title: game.i18n!.format(titleKey, { name: weaponName }),
      content: `
        <form class="sra2-weapon-roll-dialog">
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.FEATS.WEAPON.WEAPON_NAME')}:</label>
            <p class="weapon-name"><strong>${weaponName}</strong></p>
          </div>
          ${damageValue !== '0' ? `
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.FEATS.WEAPON.DAMAGE_VALUE')}:</label>
            <p class="damage-value"><strong>${damageValue}</strong></p>
          </div>
          ` : ''}
          <div class="form-group">
            <label>${game.i18n!.localize('SRA2.FEATS.WEAPON.SELECT_SKILL')}:</label>
            <select id="skill-select" class="skill-select">
              ${skillOptionsHtml}
            </select>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n!.localize('SRA2.SKILLS.ROLL'),
          callback: (html: any) => {
            const selectedValue = html.find('#skill-select').val();
            if (!selectedValue || selectedValue === '') {
              ui.notifications?.warn(game.i18n!.localize('SRA2.FEATS.WEAPON.NO_SKILL_SELECTED'));
              return;
            }
            
            const [itemType, itemId] = (selectedValue as string).split('-');
            
            if (!itemId) return;
            
            if (itemType === 'skill') {
              const skill = this.actor.items.get(itemId);
              if (skill) {
                // Trigger the skill roll with weapon name (using old method for non-combat rolls)
                // This is kept for backward compatibility with spells and non-targeted attacks
                this._rollSkillWithWeapon(skill, weaponName, 'skill', damageValue || '0', item);
              }
            } else if (itemType === 'spec') {
              const spec = this.actor.items.get(itemId);
              if (spec) {
                // Trigger the specialization roll with weapon name
                const effectiveRating = parseInt(html.find(`#skill-select option:selected`).data('effective-rating') || '0');
                this._rollSpecializationWithWeapon(spec, weaponName, effectiveRating, damageValue || '0', item);
              }
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'roll'
    }, { width: 500 });
    
    dialog.render(true);
  }

  /**
   * Roll a skill with weapon context
   */
  private async _rollSkillWithWeapon(skill: any, weaponName: string, _skillType: 'skill', weaponDamageValue?: string, weapon?: any): Promise<void> {
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
      title: game.i18n!.format('SRA2.FEATS.WEAPON.ROLL_WITH_SKILL', { weapon: weaponName, skill: skill.name }),
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
            this._rollAttackWithDefense(`${weaponName} (${skill.name})`, normalDice, riskDice, riskReduction, rollMode, weaponDamageValue, weapon);
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
   * Roll a specialization with weapon context
   */
  private async _rollSpecializationWithWeapon(specialization: any, weaponName: string, effectiveRating: number, weaponDamageValue?: string, weapon?: any): Promise<void> {
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
      title: game.i18n!.format('SRA2.FEATS.WEAPON.ROLL_WITH_SKILL', { weapon: weaponName, skill: specialization.name }),
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
            this._rollAttackWithDefense(`${weaponName} (${specialization.name})`, normalDice, riskDice, riskReduction, rollMode, weaponDamageValue, weapon);
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


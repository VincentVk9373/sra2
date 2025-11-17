import * as DiceRoller from '../helpers/dice-roller.js';
import * as ItemSearch from '../helpers/item-search.js';
import * as DefenseSelection from '../helpers/defense-selection.js';
import * as CombatHelpers from '../helpers/combat-helpers.js';
import * as SheetHelpers from '../helpers/sheet-helpers.js';
import { WEAPON_TYPES } from '../models/item-feat.js';

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
        { dragSelector: '.metatype-item', dropSelector: null },
        { dragSelector: '.feat-item', dropSelector: null },
        { dragSelector: '.skill-item', dropSelector: null },
        { dragSelector: '.specialization-item', dropSelector: null }
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

    // Get actor's strength for damage value calculations
    const actorStrength = (this.actor.system as any).attributes?.strength || 0;
    
    // Get feats and enrich with RR target labels and calculated damage values
    const rawFeats = this.actor.items.filter((item: any) => item.type === 'feat');
    const allFeats = SheetHelpers.enrichFeats(rawFeats, actorStrength, SheetHelpers.calculateFinalDamageValue);
    
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
    
    // Get skills (sorted alphabetically)
    const skills = this.actor.items
      .filter((item: any) => item.type === 'skill')
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Get all specializations (sorted alphabetically)
    const allSpecializations = this.actor.items
      .filter((item: any) => item.type === 'specialization')
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Organize specializations by linked skill using helper
    const { bySkill: specializationsBySkill, unlinked: unlinkedSpecializations } = 
      SheetHelpers.organizeSpecializationsBySkill(allSpecializations, this.actor.items.contents);
    
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
      
      // Get specializations for this skill and add calculated ratings (sorted alphabetically)
      const specs = (specializationsBySkill.get(skill.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
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
    
    // Add unlinked specializations with attribute labels and RR (sorted alphabetically)
    context.unlinkedSpecializations = unlinkedSpecializations
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((spec: any) => {
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
    const expandedData = SheetHelpers.handleSheetUpdate(this.actor, formData);
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

  // Generic item handlers using SheetHelpers
  private async _onEditMetatype(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteMetatype(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor, this.render.bind(this)); }
  private async _onEditFeat(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteFeat(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor); }
  private async _onEditSkill(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteSkill(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor); }
  private async _onEditSpecialization(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteSpecialization(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor); }

  /**
   * Get detailed RR sources for a given skill, specialization, or attribute
   */
  private getRRSources(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{featName: string, rrValue: number}> {
    return SheetHelpers.getRRSources(this.actor, itemType, itemName);
  }

  /**
   * Calculate Risk Reduction (RR) from active feats for a given skill, specialization, or attribute
   */
  private calculateRR(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): number {
    return SheetHelpers.calculateRR(this.actor, itemType, itemName);
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
    const defaultRiskDice = Math.min(basePool, DiceRoller.getRiskDiceByRR(autoRR));

    // Create roll dialog using helper
    const poolDescription = `(${game.i18n!.localize('SRA2.SPECIALIZATIONS.BONUS')}: ${effectiveRating} + ${attributeLabel}: ${attributeValue})`;
    const dialog = DiceRoller.createSkillRollDialog({
      title: game.i18n!.format('SRA2.SPECIALIZATIONS.ROLL_TITLE', { name: specialization.name }),
      basePool,
      poolDescription,
      autoRR,
      defaultRiskDice,
      rrSources: allRRSources,
      actor: this.actor,
      onRollCallback: (normalDice, riskDice, riskReduction, rollMode) => {
        this._rollSkillDice(specialization.name, normalDice, riskDice, riskReduction, rollMode);
      }
    });
    
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
    const defaultRiskDice = Math.min(attributeValue, DiceRoller.getRiskDiceByRR(autoRR));

    // Get localized attribute name
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`);

    // Create roll dialog using helper
    const dialog = DiceRoller.createSkillRollDialog({
      title: game.i18n!.format('SRA2.ATTRIBUTES.ROLL_TITLE', { name: attributeLabel }),
      basePool: attributeValue,
      poolDescription: '',
      autoRR,
      defaultRiskDice,
      rrSources,
      actor: this.actor,
      onRollCallback: (normalDice, riskDice, riskReduction, rollMode) => {
        this._rollSkillDice(attributeLabel, normalDice, riskDice, riskReduction, rollMode);
      }
    });
    
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
    const defaultRiskDice = Math.min(basePool, DiceRoller.getRiskDiceByRR(autoRR));

    // Create roll dialog using helper
    const poolDescription = `(${game.i18n!.localize('SRA2.SKILLS.RATING')}: ${rating} + ${attributeLabel}: ${attributeValue})`;
    const dialog = DiceRoller.createSkillRollDialog({
      title: game.i18n!.format('SRA2.SKILLS.ROLL_TITLE', { name: skill.name }),
      basePool,
      poolDescription,
      autoRR,
      defaultRiskDice,
      rrSources: allRRSources,
      actor: this.actor,
      onRollCallback: (normalDice, riskDice, riskReduction, rollMode) => {
        this._rollSkillDice(skill.name, normalDice, riskDice, riskReduction, rollMode);
      }
    });
    
    dialog.render(true);
  }


  /**
   * Roll skill dice and display results with Dice So Nice
   */
  private async _rollSkillDice(skillName: string, dicePool: number, riskDice: number = 0, riskReduction: number = 0, rollMode: string = 'normal', weaponDamageValue?: string, damageValueBonus?: number): Promise<void> {
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
      actorStrength,
      damageValueBonus
    });
    
    // Post to chat using helper function
    await DiceRoller.postRollToChat(this.actor, skillName, resultsHtml);
  }

  /**
   * Roll an attack with defense system
   */
  private async _rollAttackWithDefense(skillName: string, dicePool: number, riskDice: number = 0, riskReduction: number = 0, rollMode: string = 'normal', weaponDamageValue?: string, attackingWeapon?: any, damageValueBonus?: number): Promise<void> {
    // First, roll the attack
    const attackResult = await this._performDiceRoll(dicePool, riskDice, riskReduction, rollMode);
    
    // Check if there are any targeted tokens
    const targets = Array.from((game as any).user?.targets || []);
    
    if (targets.length === 0 || !weaponDamageValue || weaponDamageValue === '0') {
      // No target or no weapon damage, just display normal roll
      await this._displayRollResult(skillName, attackResult, weaponDamageValue, damageValueBonus);
      return;
    }
    
    // There's at least one target, ask for defense roll
    const target = targets[0] as any;
    const targetActor = target.actor;
    
    if (!targetActor) {
      // No actor on target, just display normal roll
      await this._displayRollResult(skillName, attackResult, weaponDamageValue, damageValueBonus);
      return;
    }
    
    // Prepare defense dialog
    ui.notifications?.info(game.i18n!.format('SRA2.COMBAT.WAITING_FOR_DEFENSE', { 
      attacker: this.actor.name,
      defender: targetActor.name,
      successes: attackResult.totalSuccesses
    }));
    
    // Prompt defense roll, passing both the actor and the token
    await this._promptDefenseRoll(targetActor, attackResult, skillName, weaponDamageValue, attackingWeapon, damageValueBonus, target);
  }

  /**
   * Prompt target to make a defense roll
   */
  private async _promptDefenseRoll(defenderActor: any, attackResult: any, attackName: string, weaponDamageValue: string, attackingWeapon?: any, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    // Get all skills and specializations from defender
    const skills = defenderActor.items.filter((i: any) => i.type === 'skill');
    const allSpecializations = defenderActor.items.filter((i: any) => i.type === 'specialization');
    
    // Get linked defense skill and specialization from attacking weapon
    const { defenseSkillName, defenseSpecName } = DefenseSelection.getDefenseInfoFromWeapon(attackingWeapon, allSpecializations);
    
    // Use the helper to find the appropriate defense selection by NAME
    const { defaultSelection } = DefenseSelection.findDefaultDefenseSelection(
      defenderActor,
      defenseSpecName,
      defenseSkillName
    );
    
    // Build skill options HTML using helper
    const skillOptionsHtml = CombatHelpers.buildSkillOptionsHtml({
      defenderActor,
      skills,
      allSpecializations,
      defaultSelection,
      includeThreshold: true
    });
    
    // Create defense dialog
    const dialog = new Dialog({
      title: game.i18n!.format('SRA2.COMBAT.DEFENSE_ROLL_TITLE', { 
        attacker: this.actor.name,
        defender: defenderActor.name
      }),
      content: `
        <form class="sra2-defense-roll-dialog">
          <div class="actor-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
            <img src="${defenderActor.img}" alt="${defenderActor.name}" style="width: 48px; height: 48px; border-radius: 4px; border: 2px solid #444;" />
            <strong style="font-size: 1.2em;">${defenderActor.name}</strong>
          </div>
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
                <input type="radio" name="defenseMethod" value="threshold" ${defenderActor.sheet?.constructor?.name === 'NpcSheet' ? 'checked' : ''} />
                <span>${game.i18n!.localize('SRA2.COMBAT.USE_THRESHOLD')}</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="defenseMethod" value="roll" ${defenderActor.sheet?.constructor?.name === 'CharacterSheet' ? 'checked' : ''} />
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
              await this._displayAttackResult(attackName, attackResult, null, weaponDamageValue, defenderActor.name, defenderActor, damageValueBonus, defenderToken);
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
                await this._defendWithThreshold(defenseItem, itemType as 'skill' | 'spec', threshold, attackName, attackResult, weaponDamageValue, defenderActor, damageValueBonus, defenderToken);
              } else {
                // Roll dice
                await this._rollDefenseAndCalculateDamage(defenseItem, itemType as 'skill' | 'spec', attackName, attackResult, weaponDamageValue, defenderActor, damageValueBonus, defenderToken);
              }
            }
          }
        },
        noDefense: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('SRA2.COMBAT.NO_DEFENSE'),
          callback: async () => {
            // No defense, full damage
            await this._displayAttackResult(attackName, attackResult, null, weaponDamageValue, defenderActor.name, defenderActor, damageValueBonus, defenderToken);
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
  private async _rollDefenseAndCalculateDamage(defenseItem: any, itemType: 'skill' | 'spec', attackName: string, attackResult: any, weaponDamageValue: string, defenderActor: any, damageValueBonus?: number, defenderToken?: any): Promise<void> {
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
      await this._displayAttackResult(attackName, attackResult, null, weaponDamageValue, defenderActor.name, defenderActor, damageValueBonus, defenderToken);
      return;
    }
    
    // Get RR for defense
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    const skillRRSources = itemType === 'skill' ? DiceRoller.getRRSourcesForActor(defenderActor, 'skill', defenseItem.name) : DiceRoller.getRRSourcesForActor(defenderActor, 'specialization', defenseItem.name);
    const attributeRRSources = DiceRoller.getRRSourcesForActor(defenderActor, 'attribute', linkedAttribute);
    const allRRSources = [...skillRRSources, ...attributeRRSources.map(s => ({ ...s, featName: s.featName + ` (${attributeLabel})` }))];
    const autoRR = Math.min(3, allRRSources.reduce((total, s) => total + s.rrValue, 0));
    const defaultRiskDice = Math.min(basePool, DiceRoller.getRiskDiceByRR(autoRR));
    
    // Capture damageValueBonus for callback
    const vdBonus = damageValueBonus;
    
    // Create defense roll dialog using helper
    const poolDescription = `(${game.i18n!.localize(itemType === 'skill' ? 'SRA2.SKILLS.RATING' : 'SRA2.SPECIALIZATIONS.BONUS')}: ${rating} + ${attributeLabel}: ${attributeValue})`;
    const dialog = DiceRoller.createSkillRollDialog({
      title: game.i18n!.format('SRA2.COMBAT.DEFENSE_ROLL_CONFIG', { skill: defenseName }),
      basePool,
      poolDescription,
      autoRR,
      defaultRiskDice,
      rrSources: allRRSources,
      actor: defenderActor,
      onRollCallback: async (normalDice, riskDice, riskReduction, rollMode) => {
        // Roll defense
        const defenseResult = await this._performDiceRoll(normalDice, riskDice, riskReduction, rollMode);
        defenseResult.skillName = defenseName;
        
        // Display combined result
        await this._displayAttackResult(attackName, attackResult, defenseResult, weaponDamageValue, defenderActor.name, defenderActor, vdBonus, defenderToken);
      }
    });
    
    dialog.render(true);
  }


  /**
   * Defend with NPC threshold (no dice roll)
   */
  private async _defendWithThreshold(defenseItem: any, _itemType: 'skill' | 'spec', threshold: number, attackName: string, attackResult: any, weaponDamageValue: string, defenderActor: any, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    const defenseName = defenseItem.name;
    
    // Create a threshold defense result using helper
    const defenseResult = CombatHelpers.createThresholdDefenseResult(defenseName, threshold);
    
    // Display the attack result with threshold defense
    await this._displayAttackResult(attackName, attackResult, defenseResult, weaponDamageValue, defenderActor.name, defenderActor, damageValueBonus, defenderToken);
  }

  /**
   * Perform dice roll and return results
   */
  private async _performDiceRoll(dicePool: number, riskDice: number, riskReduction: number, rollMode: string): Promise<any> {
    return await CombatHelpers.performDefenseRoll(dicePool, riskDice, riskReduction, rollMode, '');
  }

  /**
   * Display attack result with optional defense
   */
  private async _displayAttackResult(attackName: string, attackResult: any, defenseResult: any | null, weaponDamageValue: string, defenderName?: string, defenderActor?: any, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    await CombatHelpers.displayAttackResult(
      this.actor,
      attackName,
      attackResult,
      defenseResult,
      defenderActor,
      weaponDamageValue,
      damageValueBonus,
      defenderToken
    );
  }

  /**
   * Apply damage to a defender
   */
  static async applyDamage(defenderUuid: string, damageValue: number, defenderName: string): Promise<void> {
    // Use fromUuid to get the token's actor if it's a token UUID, or the actor if it's an actor UUID
    const defender = await fromUuid(defenderUuid) as any;
    
    if (!defender) {
      ui.notifications?.error(`Cannot find defender: ${defenderName}`);
      return;
    }
    
    // If this is a token, get its actor
    const defenderActor = defender.actor || defender;
    
    const defenderSystem = defenderActor.system as any;
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
    
    // Update the actor's damage (use defenderActor to update the token's actor data)
    await defenderActor.update({ 'system.damage': damage });
    
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
   * Display simple roll result (without defense)
   */
  private async _displayRollResult(skillName: string, rollResult: any, weaponDamageValue?: string, damageValueBonus?: number): Promise<void> {
    let resultsHtml = '<div class="sra2-skill-roll">';
    resultsHtml += CombatHelpers.buildDiceResultsHtml(rollResult, weaponDamageValue, (this.actor.system as any).attributes?.strength || 0, damageValueBonus);
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
   * Override to handle dropping feats and skills anywhere on the sheet
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    const handled = await SheetHelpers.handleItemDrop(event, this.actor);
    return handled ? undefined : super._onDrop(event);
  }

  /**
   * Handle skill search input
   */
  private searchTimeout: any = null;
  
  private async _onSkillSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
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
    // Store search term for potential creation
    this.lastSearchTerm = searchTerm;
    
    // Use the helper function to search everywhere
    const existingItemsCheck = (itemName: string) => 
      ItemSearch.itemExistsOnActor(this.actor, 'skill', itemName);
    
    const results = await ItemSearch.searchItemsEverywhere(
      'skill',
      searchTerm,
      undefined,
      existingItemsCheck
    );
    
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
      i.type === 'skill' && ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(this.lastSearchTerm)
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
        const disabledClass = result.alreadyExists ? 'disabled' : '';
        const buttonText = result.alreadyExists ? '✓' : game.i18n!.localize('SRA2.SKILLS.ADD_SKILL');
        
        html += `
          <div class="search-result-item ${disabledClass}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source}</span>
            </div>
            <button class="add-skill-btn" data-uuid="${result.uuid}" ${result.alreadyExists ? 'disabled' : ''}>
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
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
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
        if (item.type === 'feat' && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
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
        if (doc.type === 'feat' && ItemSearch.normalizeSearchText(doc.name).includes(searchTerm)) {
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
      i.type === 'feat' && ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(this.lastFeatSearchTerm)
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
   * Handle rolling dice for a weapon or spell
   */
  private async _rollWeaponOrSpell(item: any, type: 'weapon' | 'spell' | 'weapon-spell'): Promise<void> {
    const itemSystem = item.system as any;
    
    // Get all skills and specializations
    const actorSkills = this.actor.items.filter((i: any) => i.type === 'skill');
    const actorSpecializations = this.actor.items.filter((i: any) => i.type === 'specialization');
    
    // Get linked attack skill and specialization names from weapon
    let linkedSkillName = '';
    let linkedSpecName = '';
    
    const weaponType = itemSystem.weaponType;
    if (weaponType && weaponType !== 'custom-weapon') {
      // Arme pré-définie : récupérer depuis WEAPON_TYPES
      const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
      if (weaponStats) {
        linkedSkillName = weaponStats.linkedSkill || '';
        linkedSpecName = weaponStats.linkedSpecialization || '';
      }
    } else if (weaponType === 'custom-weapon') {
      // Arme custom : récupérer depuis les champs du système
      linkedSkillName = itemSystem.linkedAttackSkill || '';
      linkedSpecName = itemSystem.linkedAttackSpecialization || '';
    }
    
    let defaultSelection = '';
    
    // 1. Chercher si le personnage a la spécialisation
    if (linkedSpecName) {
      const foundSpec = actorSpecializations.find((s: any) => 
        ItemSearch.normalizeSearchText(s.name) === ItemSearch.normalizeSearchText(linkedSpecName)
      );
      if (foundSpec) {
        defaultSelection = `spec-${foundSpec.id}`;
      }
    }
    
    // 2. Si pas de spé trouvée, chercher la compétence
    if (!defaultSelection && linkedSkillName) {
      const foundSkill = actorSkills.find((s: any) => 
        ItemSearch.normalizeSearchText(s.name) === ItemSearch.normalizeSearchText(linkedSkillName)
      );
      if (foundSkill) {
        defaultSelection = `skill-${foundSkill.id}`;
      }
    }
    
    // 3. Si rien trouvé, sélectionner le premier skill
    if (!defaultSelection && actorSkills.length > 0) {
      const firstSkill = actorSkills[0];
      if (firstSkill?.id) {
        defaultSelection = `skill-${firstSkill.id}`;
      }
    }

    // Get weapon/spell info
    const damageValue = itemSystem.damageValue || '0';
    const weaponName = item.name;
    
    // Build skill options HTML using helper
    const skillOptionsHtml = CombatHelpers.buildAttackSkillOptionsHtml(
      this.actor,
      actorSkills,
      actorSpecializations,
      defaultSelection
    );
    
    const titleKey = type === 'spell' ? 'SRA2.FEATS.SPELL.ROLL_TITLE' : 'SRA2.FEATS.WEAPON.ROLL_TITLE';
    
    // Get weapon damage bonus
    const weaponDamageBonus = itemSystem.damageValueBonus || 0;
    const actorStrength = (this.actor.system as any).attributes?.strength || 0;
    
    // Create dialog to select skill/specialization
    const dialogContent = CombatHelpers.createWeaponSkillSelectionDialogContent(
      weaponName,
      damageValue,
      type === 'spell' ? 'spell' : 'weapon',
      skillOptionsHtml,
      actorStrength,
      weaponDamageBonus,
      this.actor
    );
    
    const dialog = new Dialog({
      title: game.i18n!.format(titleKey, { name: weaponName }),
      content: dialogContent,
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
    const defaultRiskDice = Math.min(basePool, DiceRoller.getRiskDiceByRR(autoRR));

    // Create roll dialog using helper
    const poolDescription = `(${game.i18n!.localize('SRA2.SKILLS.RATING')}: ${rating} + ${attributeLabel}: ${attributeValue})`;
    const dialog = DiceRoller.createSkillRollDialog({
      title: game.i18n!.format('SRA2.FEATS.WEAPON.ROLL_WITH_SKILL', { weapon: weaponName, skill: skill.name }),
      basePool,
      poolDescription,
      autoRR,
      defaultRiskDice,
      rrSources: allRRSources,
      actor: this.actor,
      onRollCallback: (normalDice, riskDice, riskReduction, rollMode) => {
        const damageBonus = (weapon?.system as any)?.damageValueBonus || 0;
        this._rollAttackWithDefense(`${weaponName} (${skill.name})`, normalDice, riskDice, riskReduction, rollMode, weaponDamageValue, weapon, damageBonus);
      }
    });
    
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
    const defaultRiskDice = Math.min(basePool, DiceRoller.getRiskDiceByRR(autoRR));

    // Create roll dialog using helper
    const poolDescription = `(${game.i18n!.localize('SRA2.SPECIALIZATIONS.BONUS')}: ${effectiveRating} + ${attributeLabel}: ${attributeValue})`;
    const dialog = DiceRoller.createSkillRollDialog({
      title: game.i18n!.format('SRA2.FEATS.WEAPON.ROLL_WITH_SKILL', { weapon: weaponName, skill: specialization.name }),
      basePool,
      poolDescription,
      autoRR,
      defaultRiskDice,
      rrSources: allRRSources,
      actor: this.actor,
      onRollCallback: (normalDice, riskDice, riskReduction, rollMode) => {
        const damageBonus = (weapon?.system as any)?.damageValueBonus || 0;
        this._rollAttackWithDefense(`${weaponName} (${specialization.name})`, normalDice, riskDice, riskReduction, rollMode, weaponDamageValue, weapon, damageBonus);
      }
    });
    
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


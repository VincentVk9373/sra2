import { WEAPON_TYPES } from '../models/item-feat.js';
import * as ItemSearch from '../../../item-search.js';

/**
 * Feat Sheet Application
 */
export class FeatSheet extends ItemSheet {
  /** Track the currently active section */
  private _activeSection: string = 'general';
  /** Timeout for power search debouncing */
  private powerSearchTimeout: any = null;
  
  static override get defaultOptions(): DocumentSheet.Options<Item> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'item', 'feat'],
      template: 'systems/sra2/templates/item-feat-sheet.hbs',
      width: 720,
      height: 680,
      tabs: [],
      dragDrop: [
        { dropSelector: '.rr-target-drop-zone' }
      ],
      submitOnChange: true,
    });
  }

  override getData(): any {
    const context = super.getData() as any;
    
    // Ensure prepareDerivedData is called to calculate recommendedLevel
    this.item.prepareData();
    
    context.system = this.item.system;
    
    // Pass the active section to the template
    context.activeSection = this._activeSection;
    
    // Calculate final damage value
    context.finalDamageValue = this._calculateFinalDamageValue();
    
    // Calculate cyberdeck damage thresholds
    context.cyberdeckDamageThresholds = this._calculateCyberdeckDamageThresholds();
    
    // Build RR entries array from rrList
    context.rrEntries = [];
    const rrList = context.system.rrList || [];
    
    for (let i = 0; i < rrList.length; i++) {
      const rrEntry = rrList[i];
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';
      
      const entry: any = {
        index: i,
        rrType,
        rrValue,
        rrTarget,
        rrTargetName: rrTarget
      };
      
      if (rrType === 'skill' || rrType === 'specialization') {
        entry.rrTargetType = rrType === 'skill' 
          ? game.i18n!.localize('SRA2.FEATS.RR_TYPE.SKILL')
          : game.i18n!.localize('SRA2.FEATS.RR_TYPE.SPECIALIZATION');
        
        // If the feat is on an actor, check if the target exists
        if (this.item.actor && rrTarget) {
          const targetItem = this.item.actor.items.find((i: any) => 
            i.type === rrType && i.name === rrTarget
          );
          
          if (!targetItem) {
            entry.rrTargetNotFound = true;
          }
        }
      }
      
      context.rrEntries.push(entry);
    }
    
    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    
    // Add RR entry button
    html.find('[data-action="add-rr-entry"]').on('click', this._onAddRREntry.bind(this));
    
    // Remove RR entry button
    html.find('[data-action="remove-rr-entry"]').on('click', this._onRemoveRREntry.bind(this));
    
    // Clear RR target button
    html.find('[data-action="clear-rr-target"]').on('click', this._onClearRRTarget.bind(this));
    
    // Add narrative effect button
    html.find('[data-action="add-narrative-effect"]').on('click', this._onAddNarrativeEffect.bind(this));
    
    // Remove narrative effect button
    html.find('[data-action="remove-narrative-effect"]').on('click', this._onRemoveNarrativeEffect.bind(this));
    
    // Narrative effect negative checkbox change
    html.find('input[name^="system.narrativeEffects"][name$=".isNegative"]').on('change', this._onNarrativeEffectNegativeChange.bind(this));
    
    // Weapon type selection
    html.find('[data-action="select-weapon-type"]').on('change', this._onWeaponTypeChange.bind(this));
    
    // Damage value bonus checkboxes
    html.find('.damage-bonus-checkbox').on('change', this._onDamageValueBonusChange.bind(this));
    
    // Sustained spell checkboxes
    html.find('.sustained-spell-checkbox').on('change', this._onSustainedSpellChange.bind(this));
    
    // Summoned spirit checkbox
    html.find('.summoned-spirit-checkbox').on('change', this._onSummonedSpiritChange.bind(this));
    
    // Range improvement checkboxes
    html.find('.range-improvement-checkbox input[type="checkbox"]').on('change', this._onRangeImprovementChange.bind(this));
    
    // Astral projection checkbox change - automatically enable astral perception
    html.find('input[name="system.astralProjection"]').on('change', this._onAstralProjectionChange.bind(this));
    
    // Section navigation
    html.find('.section-nav .nav-item').on('click', this._onSectionNavigation.bind(this));
    
    // RR target search
    html.find('.rr-target-search-input').on('input', this._onRRTargetSearch.bind(this));
    html.find('.rr-target-search-input').on('focus', this._onRRTargetSearchFocus.bind(this));
    html.find('.rr-target-search-input').on('blur', this._onRRTargetSearchBlur.bind(this));
    
    // Close RR target search results when clicking outside
    $(document).on('click.rr-target-search', (event) => {
      const target = event.target as unknown as HTMLElement;
      const searchContainers = html.find('.rr-target-search-container');
      searchContainers.each((_, container) => {
        if (!container.contains(target)) {
          $(container).find('.rr-target-search-results').hide();
        }
      });
    });
    
    // Power skill/spec search
    html.find('.power-skill-search-input').on('input', this._onPowerSkillSearch.bind(this));
    html.find('.power-skill-search-input').on('focus', this._onPowerSkillSearchFocus.bind(this));
    html.find('.power-skill-search-input').on('blur', this._onPowerSkillSearchBlur.bind(this));
    
    html.find('.power-spec-search-input').on('input', this._onPowerSpecSearch.bind(this));
    html.find('.power-spec-search-input').on('focus', this._onPowerSpecSearchFocus.bind(this));
    html.find('.power-spec-search-input').on('blur', this._onPowerSpecSearchBlur.bind(this));
    
    // Close power search results when clicking outside
    $(document).on('click.power-search', (event) => {
      const target = event.target as unknown as HTMLElement;
      
      // Don't close if clicking on a button inside results
      if ($(target).closest('.select-power-skill-btn, .select-power-spec-btn').length > 0) {
        return;
      }
      
      // Don't close if clicking on a result item
      if ($(target).closest('.search-result-item').length > 0) {
        return;
      }
      
      const searchContainers = html.find('.power-skill-search-container, .power-spec-search-container');
      searchContainers.each((_, container) => {
        if (!container.contains(target)) {
          $(container).find('.power-skill-search-results, .power-spec-search-results').hide();
        }
      });
    });
  }
  
  /**
   * Handle section navigation
   */
  private _onSectionNavigation(event: Event): void {
    event.preventDefault();
    
    const button = event.currentTarget as HTMLElement;
    const section = button.dataset.section;
    
    if (!section) return;
    
    // Save the active section
    this._activeSection = section;
    
    // Find the form element
    if (!this.form) return;
    const form = $(this.form);
    
    // Update navigation buttons
    form.find('.section-nav .nav-item').removeClass('active');
    button.classList.add('active');
    
    // Update content sections
    form.find('.content-section').removeClass('active');
    form.find(`[data-section-content="${section}"]`).addClass('active');
  }

  /**
   * Handle adding a new RR entry
   */
  private async _onAddRREntry(event: Event): Promise<void> {
    event.preventDefault();
    
    const rrList = [...((this.item.system as any).rrList || [])];
    
    rrList.push({
      rrType: 'skill',
      rrValue: 0,
      rrTarget: ''
    });
    
    await this.item.update({
      'system.rrList': rrList
    } as any);
    
    this.render(false);
  }

  /**
   * Handle removing an RR entry
   */
  private async _onRemoveRREntry(event: Event): Promise<void> {
    event.preventDefault();
    
    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    
    const rrList = [...((this.item.system as any).rrList || [])];
    
    rrList.splice(index, 1);
    
    await this.item.update({
      'system.rrList': rrList
    } as any);
    
    this.render(false);
  }

  /**
   * Handle clearing the RR target for a specific entry
   */
  private async _onClearRRTarget(event: Event): Promise<void> {
    event.preventDefault();
    
    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    const rrList = [...((this.item.system as any).rrList || [])];
    
    if (rrList[index]) {
      rrList[index] = { ...rrList[index], rrTarget: '' };
    }
    
    await this.item.update({ 'system.rrList': rrList } as any);
    this.render(false);
  }

  /**
   * Handle dropping a skill or specialization onto the RR target field
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    const data = TextEditor.getDragEventData(event) as any;
    
    // Handle Item drops
    if (data && data.type === 'Item') {
      const item = await Item.implementation.fromDropData(data) as any;
      
      if (!item) return super._onDrop(event);
      
      // Find the drop zone and get the index
      const dropZone = (event.target as HTMLElement).closest('[data-rr-index]');
      if (!dropZone) return super._onDrop(event);
      
      const index = parseInt((dropZone as HTMLElement).dataset.rrIndex || '0');
      const rrList = [...((this.item.system as any).rrList || [])];
      const rrType = rrList[index]?.rrType;
      
      // Check if it's a skill or specialization matching the RR type
      if (item.type === 'skill' && rrType === 'skill') {
        // Store the skill name (not ID) so the feat can be prepared in advance
        rrList[index] = { ...rrList[index], rrTarget: item.name };
        await this.item.update({ 'system.rrList': rrList } as any);
        this.render(false);
        ui.notifications?.info(game.i18n!.format('SRA2.FEATS.LINKED_TO_TARGET', { name: item.name }));
        return;
      } else if (item.type === 'specialization' && rrType === 'specialization') {
        // Store the specialization name (not ID) so the feat can be prepared in advance
        rrList[index] = { ...rrList[index], rrTarget: item.name };
        await this.item.update({ 'system.rrList': rrList } as any);
        this.render(false);
        ui.notifications?.info(game.i18n!.format('SRA2.FEATS.LINKED_TO_TARGET', { name: item.name }));
        return;
      } else if (rrType === 'skill' || rrType === 'specialization') {
        // Wrong type of item
        ui.notifications?.warn(game.i18n!.localize('SRA2.FEATS.WRONG_TARGET_TYPE'));
        return;
      }
    }

    return super._onDrop(event);
  }

  /**
   * Handle adding a new narrative effect
   */
  private async _onAddNarrativeEffect(event: Event): Promise<void> {
    event.preventDefault();
    
    const narrativeEffects = [...((this.item.system as any).narrativeEffects || [])];
    
    narrativeEffects.push({
      text: "",
      isNegative: false,
      value: 1
    });
    
    await this.item.update({
      'system.narrativeEffects': narrativeEffects
    } as any);
    
    this.render(false);
  }

  /**
   * Handle removing a narrative effect
   */
  private async _onRemoveNarrativeEffect(event: Event): Promise<void> {
    event.preventDefault();
    
    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    
    const narrativeEffects = [...((this.item.system as any).narrativeEffects || [])];
    
    narrativeEffects.splice(index, 1);
    
    await this.item.update({
      'system.narrativeEffects': narrativeEffects
    } as any);
    
    this.render(false);
  }

  /**
   * Handle narrative effect negative checkbox change
   * Reset value to appropriate default when switching between positive and negative
   */
  private async _onNarrativeEffectNegativeChange(event: Event): Promise<void> {
    const checkbox = event.currentTarget as HTMLInputElement;
    const name = checkbox.name;
    
    // Extract index from name like "system.narrativeEffects.0.isNegative"
    const match = name.match(/system\.narrativeEffects\.(\d+)\.isNegative/);
    if (!match || !match[1]) return;
    
    const index = parseInt(match[1]);
    const isNegative = checkbox.checked;
    
    const narrativeEffects = [...((this.item.system as any).narrativeEffects || [])];
    
    if (narrativeEffects[index]) {
      // Reset value to appropriate default: 1 for positive, -1 for negative
      narrativeEffects[index] = {
        ...narrativeEffects[index],
        isNegative: isNegative,
        value: isNegative ? -1 : 1
      };
    }
    
    await this.item.update({
      'system.narrativeEffects': narrativeEffects
    } as any);
    
    this.render(false);
  }

  /**
   * Calculate the final damage value taking into account STRENGTH attribute
   */
  private _calculateFinalDamageValue(): string {
    const damageValue = (this.item.system as any).damageValue || "0";
    const damageValueBonus = (this.item.system as any).damageValueBonus || 0;
    
    // Get the actor's strength if available
    const strength = this.item.actor ? ((this.item.actor.system as any)?.attributes?.strength || 0) : 0;
    
    // Parse the damage value
    if (damageValue === "FOR") {
      // Pure STRENGTH
      const total = strength + damageValueBonus;
      if (!this.item.actor) {
        return damageValueBonus > 0 ? `FOR+${damageValueBonus}` : "FOR";
      }
      return `${total} (FOR${damageValueBonus > 0 ? `+${damageValueBonus}` : ''})`;
    } else if (damageValue.startsWith("FOR+")) {
      // STRENGTH + modifier
      const modifier = parseInt(damageValue.substring(4)) || 0;
      const total = strength + modifier + damageValueBonus;
      if (!this.item.actor) {
        return damageValueBonus > 0 ? `FOR+${modifier}+${damageValueBonus}` : `FOR+${modifier}`;
      }
      return `${total} (FOR+${modifier}${damageValueBonus > 0 ? `+${damageValueBonus}` : ''})`;
    } else if (damageValue === "toxin") {
      // Special case for gas grenades
      return game.i18n?.localize('SRA2.FEATS.WEAPON.TOXIN_DAMAGE') || 'according to toxin';
    } else {
      // Numeric value
      const base = parseInt(damageValue) || 0;
      const total = base + damageValueBonus;
      if (damageValueBonus > 0) {
        return `${total} (${base}+${damageValueBonus})`;
      }
      return total.toString();
    }
  }

  /**
   * Handle weapon type selection change
   */
  private async _onWeaponTypeChange(event: Event): Promise<void> {
    event.preventDefault();
    
    const weaponType = (event.currentTarget as HTMLSelectElement).value;
    
    if (!weaponType || !WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES]) {
      return;
    }
    
    const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
    
    // Convert damage value to string
    const damageValue = typeof weaponStats.vd === 'number' ? weaponStats.vd.toString() : weaponStats.vd;
    
    const updateData: any = {
      'system.weaponType': weaponType,
      'system.damageValue': damageValue,
      'system.meleeRange': weaponStats.melee,
      'system.shortRange': weaponStats.short,
      'system.mediumRange': weaponStats.medium,
      'system.longRange': weaponStats.long
    };
    
    // For custom weapons, initialize linked skills/specializations with default values if not already set
    if (weaponType === 'custom-weapon') {
      const currentSystem = (this.item.system as any);
      if (!currentSystem.linkedAttackSkill) {
        updateData['system.linkedAttackSkill'] = weaponStats.linkedSkill;
      }
      if (!currentSystem.linkedAttackSpecialization) {
        updateData['system.linkedAttackSpecialization'] = weaponStats.linkedSpecialization;
      }
      if (!currentSystem.linkedDefenseSkill) {
        updateData['system.linkedDefenseSkill'] = weaponStats.linkedDefenseSkill;
      }
      if (!currentSystem.linkedDefenseSpecialization) {
        updateData['system.linkedDefenseSpecialization'] = weaponStats.linkedDefenseSpecialization;
      }
    }
    
    await this.item.update(updateData);
    
    this.render(false);
  }

  /**
   * Calculate cyberdeck damage thresholds based on firewall
   */
  private _calculateCyberdeckDamageThresholds(): any {
    const firewall = (this.item.system as any).firewall || 1;
    
    return {
      light: firewall,
      severe: firewall * 2,
      incapacitating: firewall * 3
    };
  }

  /**
   * Handle damage value bonus checkbox changes
   */
  private _onDamageValueBonusChange(event: Event): void {
    event.preventDefault();
    
    const checkbox = event.currentTarget as HTMLInputElement;
    const value = parseInt(checkbox.dataset.bonusValue || '0');
    const currentBonus = (this.item.system as any).damageValueBonus || 0;
    
    let newBonus: number;
    
    if (checkbox.checked) {
      // If checking, set to the checkbox value
      newBonus = value;
    } else {
      // If unchecking, decrease appropriately
      if (value === 2 && currentBonus === 2) {
        newBonus = 1;
      } else if (value === 1 && currentBonus >= 1) {
        newBonus = 0;
      } else {
        newBonus = currentBonus;
      }
    }
    
    // Update the hidden input field
    const hiddenInput = this.element.find('input[name="system.damageValueBonus"]')[0] as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = newBonus.toString();
    }
    
    // Update the checkboxes state
    const checkboxes = this.element.find('.damage-bonus-checkbox');
    checkboxes.each((_, cb) => {
      const cbElement = cb as HTMLInputElement;
      const cbValue = parseInt(cbElement.dataset.bonusValue || '0');
      if (cbValue === 1) {
        cbElement.checked = newBonus >= 1;
      } else if (cbValue === 2) {
        cbElement.checked = newBonus === 2;
      }
    });
  }

  /**
   * Handle sustained spell checkbox changes
   */
  private _onSustainedSpellChange(event: Event): void {
    event.preventDefault();
    
    const checkbox = event.currentTarget as HTMLInputElement;
    const value = parseInt(checkbox.dataset.spellValue || '0');
    const currentCount = (this.item.system as any).sustainedSpellCount || 0;
    
    let newCount: number;
    
    if (checkbox.checked) {
      // If checking, set to the checkbox value
      newCount = value;
    } else {
      // If unchecking, decrease appropriately
      if (value === 2 && currentCount === 2) {
        newCount = 1;
      } else if (value === 1 && currentCount >= 1) {
        newCount = 0;
      } else {
        newCount = currentCount;
      }
    }
    
    // Update the hidden input field
    const hiddenInput = this.element.find('input[name="system.sustainedSpellCount"]')[0] as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = newCount.toString();
    }
    
    // Update the checkboxes state
    const checkboxes = this.element.find('.sustained-spell-checkbox');
    checkboxes.each((_, cb) => {
      const cbElement = cb as HTMLInputElement;
      const cbValue = parseInt(cbElement.dataset.spellValue || '0');
      if (cbValue === 1) {
        cbElement.checked = newCount >= 1;
      } else if (cbValue === 2) {
        cbElement.checked = newCount === 2;
      }
    });
  }

  /**
   * Handle summoned spirit checkbox change
   */
  private _onSummonedSpiritChange(event: Event): void {
    event.preventDefault();
    
    const checkbox = event.currentTarget as HTMLInputElement;
    const newCount = checkbox.checked ? 1 : 0;
    
    // Update the hidden input field
    const hiddenInput = this.element.find('input[name="system.summonedSpiritCount"]')[0] as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = newCount.toString();
    }
  }

  /**
   * Handle range improvement checkbox change
   * When checked, automatically improves the range: none -> disadvantage, disadvantage -> ok
   * When unchecked, automatically downgrades the range: ok -> disadvantage, disadvantage -> none
   */
  private _onRangeImprovementChange(event: Event): void {
    event.preventDefault();
    
    const checkbox = event.currentTarget as HTMLInputElement;
    const isChecked = checkbox.checked;
    
    // Find which range this checkbox is for
    const rangeRow = checkbox.closest('.range-row');
    if (!rangeRow) return;
    
    const select = rangeRow.querySelector('select') as HTMLSelectElement;
    if (!select) return;
    
    // Determine which range field we're dealing with
    const rangeLabel = rangeRow.querySelector('.range-label')?.textContent || '';
    let fieldName = '';
    if (rangeLabel.includes('Contact') || rangeLabel.includes('Melee') || rangeLabel.includes('Mêlée')) {
      fieldName = 'system.meleeRange';
    } else if (rangeLabel.includes('Courte') || rangeLabel.includes('Short')) {
      fieldName = 'system.shortRange';
    } else if (rangeLabel.includes('Moyenne') || rangeLabel.includes('Medium')) {
      fieldName = 'system.mediumRange';
    } else if (rangeLabel.includes('Longue') || rangeLabel.includes('Long')) {
      fieldName = 'system.longRange';
    }
    
    const currentValue = select.value;
    let newValue = currentValue;
    
    if (isChecked) {
      // Improve the range: none -> disadvantage, disadvantage -> ok
      if (currentValue === 'none') {
        newValue = 'disadvantage';
      } else if (currentValue === 'disadvantage') {
        newValue = 'ok';
      }
      // If already 'ok', keep it at 'ok'
    } else {
      // Downgrade the range: ok -> disadvantage, disadvantage -> none
      if (currentValue === 'ok') {
        newValue = 'disadvantage';
      } else if (currentValue === 'disadvantage') {
        newValue = 'none';
      }
      // If already 'none', keep it at 'none'
    }
    
    // Update the disabled select for visual display
    select.value = newValue;
    
    // Update the hidden input that holds the actual value
    const hiddenInput = this.element.find(`input[name="${fieldName}"]`)[0] as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = newValue;
    }
  }

  /**
   * Handle astral projection checkbox change
   * Automatically enable astral perception when projection is enabled
   */
  private async _onAstralProjectionChange(event: Event): Promise<void> {
    const checkbox = event.currentTarget as HTMLInputElement;
    const isProjectionEnabled = checkbox.checked;
    
    if (isProjectionEnabled) {
      // Automatically enable astral perception
      const astralPerceptionInput = this.element.find('input[name="system.astralPerception"]')[0] as HTMLInputElement;
      if (astralPerceptionInput) {
        astralPerceptionInput.checked = true;
      }
      
      // Update the item to set astralPerception to true
      await this.item.update({
        'system.astralPerception': true
      } as any);
      
      // Re-render to update the disabled state
      this.render(false);
    }
  }

  /**
   * Handle RR target search input
   */
  private rrTargetSearchTimeout: any = null;
  
  private async _onRRTargetSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const rrIndex = parseInt(input.dataset.rrIndex || '0');
    const resultsDiv = $(input).siblings('.rr-target-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this.rrTargetSearchTimeout) {
      clearTimeout(this.rrTargetSearchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.rrTargetSearchTimeout = setTimeout(async () => {
      await this._performRRTargetSearch(searchTerm, rrIndex, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual RR target search in actor items and compendiums
   */
  private async _performRRTargetSearch(searchTerm: string, rrIndex: number, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    const rrList = (this.item.system as any).rrList || [];
    const rrType = rrList[rrIndex]?.rrType;
    
    if (!rrType || rrType === 'attribute') {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Search in actor items if this feat is on an actor
    if (this.item.actor) {
      for (const item of this.item.actor.items as any) {
        if (item.type === rrType && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          results.push({
            name: item.name,
            uuid: item.uuid,
            source: game.i18n!.localize('SRA2.FEATS.FROM_ACTOR'),
            type: rrType
          });
        }
      }
    }
    
    // Search in world items
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === rrType && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          // Check if not already in results
          const exists = results.some(r => r.name === item.name);
          if (!exists) {
            results.push({
              name: item.name,
              uuid: item.uuid,
              source: game.i18n!.localize('SRA2.SKILLS.WORLD_ITEMS'),
              type: rrType
            });
          }
        }
      }
    }
    
    // Search in all compendiums
    for (const pack of game.packs as any) {
      // Only search in Item compendiums
      if (pack.documentName !== 'Item') continue;
      
      // Get all documents from the pack
      const documents = await pack.getDocuments();
      
      // Filter for items that match the search term and type
      for (const doc of documents) {
        if (doc.type === rrType && ItemSearch.normalizeSearchText(doc.name).includes(searchTerm)) {
          // Check if not already in results
          const exists = results.some(r => r.name === doc.name);
          if (!exists) {
            results.push({
              name: doc.name,
              uuid: doc.uuid,
              source: pack.title,
              type: rrType
            });
          }
        }
      }
    }
    
    // Display results
    this._displayRRTargetSearchResults(results, rrIndex, resultsDiv);
  }

  /**
   * Display RR target search results
   */
  private _displayRRTargetSearchResults(results: any[], rrIndex: number, resultsDiv: HTMLElement): void {
    let html = '';
    
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SKILLS.SEARCH_NO_RESULTS')}
          </div>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        const typeLabel = result.type === 'skill' 
          ? game.i18n!.localize('SRA2.FEATS.RR_TYPE.SKILL')
          : game.i18n!.localize('SRA2.FEATS.RR_TYPE.SPECIALIZATION');
        
        html += `
          <div class="search-result-item" data-result-name="${result.name}" data-rr-index="${rrIndex}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source} - ${typeLabel}</span>
            </div>
            <button class="add-rr-target-btn" data-target-name="${result.name}" data-rr-index="${rrIndex}">
              ${game.i18n!.localize('SRA2.FEATS.SELECT')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Attach click handlers to buttons
    $(resultsDiv).find('.add-rr-target-btn').on('click', this._onSelectRRTarget.bind(this));
    
    // Make entire result items clickable
    $(resultsDiv).find('.search-result-item:not(.no-results)').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.add-rr-target-btn').length > 0) return;
      
      // Find the button in this item and trigger its click
      const button = $(event.currentTarget).find('.add-rr-target-btn')[0] as HTMLButtonElement;
      if (button) {
        $(button).trigger('click');
      }
    });
  }

  /**
   * Handle selecting an RR target from search results
   */
  private async _onSelectRRTarget(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const targetName = button.dataset.targetName;
    const rrIndex = parseInt(button.dataset.rrIndex || '0');
    
    if (!targetName) return;
    
    const rrList = [...((this.item.system as any).rrList || [])];
    
    if (rrList[rrIndex]) {
      rrList[rrIndex] = { ...rrList[rrIndex], rrTarget: targetName };
    }
    
    await this.item.update({ 'system.rrList': rrList } as any);
    this.render(false);
    
    ui.notifications?.info(game.i18n!.format('SRA2.FEATS.LINKED_TO_TARGET', { name: targetName }));
  }

  /**
   * Handle RR target search focus
   */
  private _onRRTargetSearchFocus(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings('.rr-target-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
  }

  /**
   * Handle RR target search blur
   */
  private _onRRTargetSearchBlur(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = $(input).siblings('.rr-target-search-results')[0] as HTMLElement;
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
  }

  /**
   * Handle power skill search input
   */
  private async _onPowerSkillSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const fieldName = input.dataset.field || '';
    const resultsDiv = $(input).siblings('.power-skill-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this.powerSearchTimeout) {
      clearTimeout(this.powerSearchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.powerSearchTimeout = setTimeout(async () => {
      await this._performPowerSkillSearch(searchTerm, fieldName, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual power skill search
   */
  private async _performPowerSkillSearch(searchTerm: string, fieldName: string, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    
    // Search in actor items if this feat is on an actor
    if (this.item.actor) {
      for (const item of this.item.actor.items as any) {
        if (item.type === 'skill' && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          results.push({
            name: item.name,
            uuid: item.uuid,
            source: game.i18n!.localize('SRA2.FEATS.FROM_ACTOR'),
            type: 'skill'
          });
        }
      }
    }
    
    // Search in world items
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === 'skill' && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          // Check if not already in results
          const exists = results.some(r => r.name === item.name);
          if (!exists) {
            results.push({
              name: item.name,
              uuid: item.uuid,
              source: game.i18n!.localize('SRA2.SKILLS.WORLD_ITEMS'),
              type: 'skill'
            });
          }
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
        if (doc.type === 'skill' && ItemSearch.normalizeSearchText(doc.name).includes(searchTerm)) {
          // Check if not already in results
          const exists = results.some(r => r.name === doc.name);
          if (!exists) {
            results.push({
              name: doc.name,
              uuid: doc.uuid,
              source: pack.title,
              type: 'skill'
            });
          }
        }
      }
    }
    
    // Display results
    this._displayPowerSkillSearchResults(results, fieldName, resultsDiv);
  }

  /**
   * Display power skill search results
   */
  private _displayPowerSkillSearchResults(results: any[], fieldName: string, resultsDiv: HTMLElement): void {
    let html = '';
    
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SKILLS.SEARCH_NO_RESULTS')}
          </div>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        html += `
          <div class="search-result-item" data-result-name="${result.name}" data-field="${fieldName}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source}</span>
            </div>
            <button class="select-power-skill-btn" data-target-name="${result.name}" data-field="${fieldName}">
              ${game.i18n!.localize('SRA2.FEATS.SELECT')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Use mousedown instead of click to capture before blur event
    // This ensures handlers work even when results are replaced
    $(resultsDiv).off('mousedown', '.select-power-skill-btn');
    $(resultsDiv).off('mousedown', '.search-result-item');
    
    $(resultsDiv).on('mousedown', '.select-power-skill-btn', this._onSelectPowerSkill.bind(this));
    
    // Make entire result items clickable (except no-results)
    $(resultsDiv).on('mousedown', '.search-result-item:not(.no-results)', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.select-power-skill-btn').length > 0) return;
      
      // Find the button in this item and trigger its mousedown
      const button = $(event.currentTarget).find('.select-power-skill-btn')[0] as HTMLButtonElement;
      if (button) {
        $(button).trigger('mousedown');
      }
    });
  }

  /**
   * Handle selecting a power skill from search results
   */
  private async _onSelectPowerSkill(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // Prevent document click handler from firing
    
    const button = event.currentTarget as HTMLButtonElement;
    const targetName = button.dataset.targetName;
    const fieldName = button.dataset.field;
    
    if (!targetName || !fieldName) return;
    
    // Find the container and input field
    const container = $(button).closest('.power-skill-search-container');
    const input = container.find(`input[name="system.${fieldName}"]`)[0] as HTMLInputElement;
    
    if (input) {
      input.value = targetName;
      // Trigger change event to save
      $(input).trigger('change');
    }
    
    // Hide results immediately
    const resultsDiv = container.find('.power-skill-search-results')[0] as HTMLElement;
    if (resultsDiv) {
      resultsDiv.style.display = 'none';
    }
  }

  /**
   * Handle power skill search focus
   */
  private _onPowerSkillSearchFocus(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings('.power-skill-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
  }

  /**
   * Handle power skill search blur
   */
  private _onPowerSkillSearchBlur(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = $(input).siblings('.power-skill-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        // Check if the related target (where focus is going) is inside the results div
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          // Don't hide if focus is moving to an element within the results
          return;
        }
        
        // Also check if any element in the results is focused or being clicked
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          // Don't hide if an element in results is active
          return;
        }
        
        // Check if mouse is over the results div (user might be clicking)
        const mouseEvent = (event as any).originalEvent;
        if (mouseEvent && mouseEvent.relatedTarget && resultsDiv.contains(mouseEvent.relatedTarget as HTMLElement)) {
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, 300); // Increased delay to allow button clicks to register
  }

  /**
   * Handle power spec search input
   */
  private async _onPowerSpecSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const fieldName = input.dataset.field || '';
    const resultsDiv = $(input).siblings('.power-spec-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this.powerSearchTimeout) {
      clearTimeout(this.powerSearchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.powerSearchTimeout = setTimeout(async () => {
      await this._performPowerSpecSearch(searchTerm, fieldName, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual power spec search
   */
  private async _performPowerSpecSearch(searchTerm: string, fieldName: string, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    
    // Search in actor items if this feat is on an actor
    if (this.item.actor) {
      for (const item of this.item.actor.items as any) {
        if (item.type === 'specialization' && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          results.push({
            name: item.name,
            uuid: item.uuid,
            source: game.i18n!.localize('SRA2.FEATS.FROM_ACTOR'),
            type: 'specialization'
          });
        }
      }
    }
    
    // Search in world items
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === 'specialization' && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          // Check if not already in results
          const exists = results.some(r => r.name === item.name);
          if (!exists) {
            results.push({
              name: item.name,
              uuid: item.uuid,
              source: game.i18n!.localize('SRA2.SKILLS.WORLD_ITEMS'),
              type: 'specialization'
            });
          }
        }
      }
    }
    
    // Search in all compendiums
    for (const pack of game.packs as any) {
      // Only search in Item compendiums
      if (pack.documentName !== 'Item') continue;
      
      // Get all documents from the pack
      const documents = await pack.getDocuments();
      
      // Filter for specializations that match the search term
      for (const doc of documents) {
        if (doc.type === 'specialization' && ItemSearch.normalizeSearchText(doc.name).includes(searchTerm)) {
          // Check if not already in results
          const exists = results.some(r => r.name === doc.name);
          if (!exists) {
            results.push({
              name: doc.name,
              uuid: doc.uuid,
              source: pack.title,
              type: 'specialization'
            });
          }
        }
      }
    }
    
    // Display results
    this._displayPowerSpecSearchResults(results, fieldName, resultsDiv);
  }

  /**
   * Display power spec search results
   */
  private _displayPowerSpecSearchResults(results: any[], fieldName: string, resultsDiv: HTMLElement): void {
    let html = '';
    
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SKILLS.SEARCH_NO_RESULTS')}
          </div>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        html += `
          <div class="search-result-item" data-result-name="${result.name}" data-field="${fieldName}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source}</span>
            </div>
            <button class="select-power-spec-btn" data-target-name="${result.name}" data-field="${fieldName}">
              ${game.i18n!.localize('SRA2.FEATS.SELECT')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Use mousedown instead of click to capture before blur event
    // This ensures handlers work even when results are replaced
    $(resultsDiv).off('mousedown', '.select-power-spec-btn');
    $(resultsDiv).off('mousedown', '.search-result-item');
    
    $(resultsDiv).on('mousedown', '.select-power-spec-btn', this._onSelectPowerSpec.bind(this));
    
    // Make entire result items clickable (except no-results)
    $(resultsDiv).on('mousedown', '.search-result-item:not(.no-results)', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.select-power-spec-btn').length > 0) return;
      
      // Find the button in this item and trigger its mousedown
      const button = $(event.currentTarget).find('.select-power-spec-btn')[0] as HTMLButtonElement;
      if (button) {
        $(button).trigger('mousedown');
      }
    });
  }

  /**
   * Handle selecting a power spec from search results
   */
  private async _onSelectPowerSpec(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // Prevent document click handler from firing
    
    const button = event.currentTarget as HTMLButtonElement;
    const targetName = button.dataset.targetName;
    const fieldName = button.dataset.field;
    
    if (!targetName || !fieldName) return;
    
    // Find the container and input field
    const container = $(button).closest('.power-spec-search-container');
    const input = container.find(`input[name="system.${fieldName}"]`)[0] as HTMLInputElement;
    
    if (input) {
      input.value = targetName;
      // Trigger change event to save
      $(input).trigger('change');
    }
    
    // Hide results immediately
    const resultsDiv = container.find('.power-spec-search-results')[0] as HTMLElement;
    if (resultsDiv) {
      resultsDiv.style.display = 'none';
    }
  }

  /**
   * Handle power spec search focus
   */
  private _onPowerSpecSearchFocus(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings('.power-spec-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
  }

  /**
   * Handle power spec search blur
   */
  private _onPowerSpecSearchBlur(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = $(input).siblings('.power-spec-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        // Check if the related target (where focus is going) is inside the results div
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          // Don't hide if focus is moving to an element within the results
          return;
        }
        
        // Also check if any element in the results is focused or being clicked
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          // Don't hide if an element in results is active
          return;
        }
        
        // Check if mouse is over the results div (user might be clicking)
        const mouseEvent = (event as any).originalEvent;
        if (mouseEvent && mouseEvent.relatedTarget && resultsDiv.contains(mouseEvent.relatedTarget as HTMLElement)) {
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, 300); // Increased delay to allow button clicks to register
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    // Clean up document-level event listeners
    $(document).off('click.rr-target-search');
    $(document).off('click.power-search');
    return super.close(options);
  }

  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    const expandedData = foundry.utils.expandObject(formData) as any;
    
    // If astral projection is enabled, automatically enable astral perception
    if (expandedData.system?.astralProjection === true) {
      expandedData.system.astralPerception = true;
    }
    
    // Check if isFirstFeat is being set to true for a trait
    if (expandedData.system?.isFirstFeat === true && 
        expandedData.system?.featType === 'trait' && 
        this.item.actor) {
      
      // Find all other traits on the same actor that have isFirstFeat = true
      const otherFirstFeats = this.item.actor.items.filter((item: any) => 
        item.type === 'feat' &&
        item.id !== this.item.id &&
        item.system?.featType === 'trait' &&
        item.system?.isFirstFeat === true
      );
      
      // If there are other traits with isFirstFeat, uncheck them
      if (otherFirstFeats.length > 0) {
        for (const otherFeat of otherFirstFeats) {
          await otherFeat.update({
            'system.isFirstFeat': false
          } as any);
        }
        
        ui.notifications?.info(
          game.i18n!.localize('SRA2.FEATS.FIRST_FEAT_TRANSFERRED') || 
          'The "first trait" flag has been moved from the other trait(s) to this one.'
        );
      }
    }
    
    // Update the item first to recalculate recommendedLevel
    await this.item.update(expandedData);
    
    // Recalculate derived data to get the new recommendedLevel
    this.item.prepareData();
    
    // Sync rating with recommendedLevel
    const recommendedLevel = (this.item.system as any).recommendedLevel || 0;
    const currentRating = (this.item.system as any).rating || 0;
    
    // Only update rating if it's different from recommendedLevel
    if (currentRating !== recommendedLevel) {
      await this.item.update({
        'system.rating': recommendedLevel
      } as any);
    }
    
    return this.item;
  }
}


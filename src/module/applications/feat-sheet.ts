import { WEAPON_TYPES, VEHICLE_TYPES } from '../models/item-feat.js';
import * as ItemSearch from '../../../item-search.js';

/**
 * Feat Sheet Application
 */
export class FeatSheet extends ItemSheet {
  /** Track the currently active section */
  private _activeSection: string = 'general';
  
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
    
    // Calculate final vehicle stats
    context.finalVehicleStats = this._calculateFinalVehicleStats();
    
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
    
    // Weapon type selection
    html.find('[data-action="select-weapon-type"]').on('change', this._onWeaponTypeChange.bind(this));
    
    // Vehicle type selection
    html.find('[data-action="select-vehicle-type"]').on('change', this._onVehicleTypeChange.bind(this));
    
    // Damage value bonus checkboxes
    html.find('.damage-bonus-checkbox').on('change', this._onDamageValueBonusChange.bind(this));
    
    // Sustained spell checkboxes
    html.find('.sustained-spell-checkbox').on('change', this._onSustainedSpellChange.bind(this));
    
    // Summoned spirit checkbox
    html.find('.summoned-spirit-checkbox').on('change', this._onSummonedSpiritChange.bind(this));
    
    // Range improvement checkboxes
    html.find('.range-improvement-checkbox input[type="checkbox"]').on('change', this._onRangeImprovementChange.bind(this));
    
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
      isNegative: false
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
      return "selon toxine";
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
    
    await this.item.update({
      'system.weaponType': weaponType,
      'system.damageValue': damageValue,
      'system.meleeRange': weaponStats.melee,
      'system.shortRange': weaponStats.short,
      'system.mediumRange': weaponStats.medium,
      'system.longRange': weaponStats.long
    } as any);
    
    this.render(false);
  }

  /**
   * Handle vehicle type selection change
   */
  private async _onVehicleTypeChange(event: Event): Promise<void> {
    event.preventDefault();
    
    const vehicleType = (event.currentTarget as HTMLSelectElement).value;
    
    if (!vehicleType || !VEHICLE_TYPES[vehicleType as keyof typeof VEHICLE_TYPES]) {
      return;
    }
    
    const vehicleStats = VEHICLE_TYPES[vehicleType as keyof typeof VEHICLE_TYPES];
    
    await this.item.update({
      'system.vehicleType': vehicleType,
      'system.autopilot': vehicleStats.autopilot,
      'system.structure': vehicleStats.structure,
      'system.handling': vehicleStats.handling,
      'system.speed': vehicleStats.speed,
      'system.flyingSpeed': vehicleStats.flyingSpeed,
      'system.armor': vehicleStats.armor,
      'system.weaponMount': vehicleStats.weaponMount
    } as any);
    
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
   * Calculate the final vehicle stats taking into account bonuses
   */
  private _calculateFinalVehicleStats(): any {
    const baseAutopilot = (this.item.system as any).autopilot || 6;
    const baseStructure = (this.item.system as any).structure || 2;
    const baseHandling = (this.item.system as any).handling || 5;
    const baseSpeed = (this.item.system as any).speed || 3;
    const baseFlyingSpeed = (this.item.system as any).flyingSpeed || 0;
    const baseArmor = (this.item.system as any).armor || 0;
    
    const autopilotBonus = (this.item.system as any).autopilotBonus || 0;
    const speedBonus = (this.item.system as any).speedBonus || 0;
    const handlingBonus = (this.item.system as any).handlingBonus || 0;
    const armorBonus = (this.item.system as any).armorBonus || 0;
    const isFlying = (this.item.system as any).isFlying || false;
    const isFixed = (this.item.system as any).isFixed || false;
    
    // Calculate final values
    const finalAutopilot = Math.min(12, baseAutopilot + autopilotBonus);
    const finalHandling = baseHandling + handlingBonus;
    const finalSpeed = isFixed ? 0 : (baseSpeed + speedBonus);
    const finalFlyingSpeed = isFlying ? (baseFlyingSpeed > 0 ? baseFlyingSpeed : 1) : 0;
    const finalArmor = Math.min(baseStructure, baseArmor + armorBonus);
    
    return {
      autopilot: finalAutopilot,
      structure: baseStructure,
      handling: finalHandling,
      speed: finalSpeed,
      flyingSpeed: finalFlyingSpeed,
      armor: finalArmor
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

  override async close(options?: Application.CloseOptions): Promise<void> {
    // Clean up document-level event listeners
    $(document).off('click.rr-target-search');
    return super.close(options);
  }

  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    const expandedData = foundry.utils.expandObject(formData) as any;
    
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


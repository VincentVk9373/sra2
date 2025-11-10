import { WEAPON_TYPES } from '../models/item-feat.js';

/**
 * Feat Sheet Application
 */
export class FeatSheet extends ItemSheet {
  static override get defaultOptions(): DocumentSheet.Options<Item> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'item', 'feat'],
      template: 'systems/sra2/templates/item-feat-sheet.hbs',
      width: 520,
      height: 480,
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
    
    // Calculate final damage value
    context.finalDamageValue = this._calculateFinalDamageValue();
    
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
    
    // Damage value bonus checkboxes
    html.find('.damage-bonus-checkbox').on('change', this._onDamageValueBonusChange.bind(this));
    
    // Sustained spell checkboxes
    html.find('.sustained-spell-checkbox').on('change', this._onSustainedSpellChange.bind(this));
    
    // Summoned spirit checkbox
    html.find('.summoned-spirit-checkbox').on('change', this._onSummonedSpiritChange.bind(this));
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

  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    const expandedData = foundry.utils.expandObject(formData);
    return this.item.update(expandedData);
  }
}


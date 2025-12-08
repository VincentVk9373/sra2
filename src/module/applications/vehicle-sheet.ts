import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as CombatHelpers from '../helpers/combat-helpers.js';
import * as DiceRoller from '../helpers/dice-roller.js';
import { VEHICLE_TYPES, WEAPON_TYPES } from '../models/item-feat.js';

/**
 * Vehicle/Drone Sheet Application
 */
export class VehicleSheet extends ActorSheet {
  private _activeSection: string | null = null;

  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'vehicle'],
      template: 'systems/sra2/templates/actor-vehicle-sheet.hbs',
      width: 800,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: '.item', dropSelector: '.sheet-body' }
      ],
      submitOnChange: false,
    });
  }

  /**
   * Handle form submission to update actor data
   */
  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    // DEBUG: Log what we're about to update
    console.log('VehicleSheet._updateObject - DEBUG:', {
      'this.actor.id': this.actor.id,
      'this.actor.name': this.actor.name,
      'this.actor.type': this.actor.type,
      'this.actor.uuid': this.actor.uuid,
      'formData keys': Object.keys(formData),
      'formData sample': Object.fromEntries(Object.entries(formData).slice(0, 5))
    });
    
    const expandedData = SheetHelpers.handleSheetUpdate(this.actor, formData);
    
    // CRITICAL FIX: Exclude damage from form submission (same as character sheet)
    // Damage is handled exclusively by _onDamageChange handler to prevent form close reset
    // Don't process damage here - _onDamageChange handles it directly
    // Remove damage from expandedData if present to avoid conflicts and form close reset
    if (expandedData.system?.damage !== undefined) {
      delete expandedData.system.damage;
    }
    
    // DEBUG: Log what we're sending to update
    console.log('VehicleSheet._updateObject - About to update:', {
      'actor.id': this.actor.id,
      'expandedData keys': Object.keys(expandedData),
      'expandedData.system keys': expandedData.system ? Object.keys(expandedData.system) : 'no system',
      'damage excluded': !expandedData.system?.damage
    });
    
    return this.actor.update(expandedData);
  }

  override getData(): any {
    const context = super.getData() as any;

    // DEBUG: Verify which actor we're working with
    console.log('VehicleSheet.getData - DEBUG:', {
      'this.actor.id': this.actor.id,
      'this.actor.name': this.actor.name,
      'this.actor.type': this.actor.type,
      'context.actor.id': context.actor?.id,
      'context.actor.name': context.actor?.name
    });

    // Ensure system data is available
    context.system = this.actor.system;

    // DEBUG: Log damage data at vehicle sheet opening
    const actorSource = (this.actor as any)._source;
    const sourceDamage = actorSource?.system?.damage;
    const currentDamage = (this.actor.system as any).damage;
    console.log('VehicleSheet.getData - Damage data at opening:', {
      'actor.id': this.actor.id,
      'actor.name': this.actor.name,
      '_source.system.damage': sourceDamage,
      'this.actor.system.damage': currentDamage,
      'sourceDamage type': typeof sourceDamage,
      'currentDamage type': typeof currentDamage,
      'sourceDamage.light': sourceDamage?.light,
      'currentDamage.light': currentDamage?.light,
      'sourceDamage.light type': Array.isArray(sourceDamage?.light) ? 'array' : typeof sourceDamage?.light,
      'currentDamage.light type': Array.isArray(currentDamage?.light) ? 'array' : typeof currentDamage?.light
    });

    // Ensure damage arrays are properly initialized
    const systemData = context.system as any;
    if (!systemData.damage) {
      systemData.damage = {
        light: [false, false],
        severe: [false],
        incapacitating: false
      };
    } else {
      // Ensure arrays are properly sized
      if (!Array.isArray(systemData.damage.light)) {
        systemData.damage.light = [false, false];
      }
      while (systemData.damage.light.length < 2) {
        systemData.damage.light.push(false);
      }
      while (systemData.damage.light.length > 2) {
        systemData.damage.light.pop();
      }
      
      if (!Array.isArray(systemData.damage.severe)) {
        systemData.damage.severe = [false];
      }
      while (systemData.damage.severe.length < 1) {
        systemData.damage.severe.push(false);
      }
      while (systemData.damage.severe.length > 1) {
        systemData.damage.severe.pop();
      }
      
      if (typeof systemData.damage.incapacitating !== 'boolean') {
        systemData.damage.incapacitating = false;
      }
    }

    // Add vehicle types for selection
    context.vehicleTypes = VEHICLE_TYPES;

    // Get feats (weapons only for vehicles)
    const allFeats = this.actor.items.filter((item: any) => item.type === 'feat');
    
    // Get all active feats for RR calculation
    const activeFeats = allFeats.filter((feat: any) => feat.system.active === true);
    
    // Get vehicle's structure for damage value calculations (similar to strength for characters)
    const vehicleStructure = (this.actor.system as any).attributes?.structure || 0;
    
    // Helper function to calculate weapon stats
    const calculateWeaponStats = (item: any) => {
      const itemData = {
        ...item,
        _id: item.id || item._id,
        id: item.id || item._id
      };
      
      // For vehicles, weapons use Autopilot attribute when autonomous
      // Otherwise, they would use the pilot's skills (handled externally)
      const autopilot = (this.actor.system as any).attributes?.autopilot || 0;
      let totalDicePool = autopilot; // Base dice pool from autopilot
      let totalRR = 0;
      
      // Calculate RR from active feats
      activeFeats.forEach((feat: any) => {
        const rrList = feat.system.rrList || [];
        rrList.forEach((rrEntry: any) => {
          if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === 'autopilot') {
            totalRR += rrEntry.rrValue || 0;
          }
        });
      });
      
      itemData.totalDicePool = totalDicePool;
      itemData.totalRR = totalRR;
      
      // Calculate final damage value with bonus
      const damageValue = item.system.damageValue || '0';
      const damageValueBonus = item.system.damageValueBonus || 0;
      itemData.finalDamageValue = SheetHelpers.calculateFinalDamageValue(damageValue, damageValueBonus, vehicleStructure);
      
      return itemData;
    };
    
    // Filter and process weapons (only weapons allowed for vehicles)
    const rawWeapons = allFeats.filter((feat: any) => 
      feat.system.featType === 'weapon' || feat.system.featType === 'weapons-spells'
    );
    const weapons = rawWeapons.map((weapon: any) => calculateWeaponStats(weapon));
    
    context.weapons = weapons;

    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Restore active section if it was saved
    if (this._activeSection) {
      setTimeout(() => {
        const form = html.closest('form')[0];
        if (form) {
          const navButton = form.querySelector(`[data-section="${this._activeSection}"]`);
          if (navButton) {
            form.querySelectorAll('.section-nav .nav-item').forEach((item) => item.classList.remove('active'));
            navButton.classList.add('active');
            
            form.querySelectorAll('.content-section').forEach((section) => section.classList.remove('active'));
            const targetSection = form.querySelector(`[data-section-content="${this._activeSection}"]`);
            if (targetSection) {
              targetSection.classList.add('active');
            }
          }
        }
      }, 10);
    }

    // Section navigation
    html.find('.section-nav .nav-item').on('click', this._onSectionNavigation.bind(this));

    // Edit feat/weapon
    html.find('.feat-edit, .weapon-edit').on('click', (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete feat/weapon
    html.find('.feat-delete, .weapon-delete').on('click', async (event) => {
      event.preventDefault();
      // Save current active section before deletion
      const activeNavItem = html.find('.section-nav .nav-item.active');
      this._activeSection = activeNavItem.length > 0 ? activeNavItem.data('section') : null;
      
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name }),
          content: '',
          yes: () => true,
          no: () => false,
          defaultYes: false
        });
        if (confirmed) {
          await item.delete();
          // The sheet will auto-render, and activateListeners will restore the section
        }
      }
    });

    // Add world weapon (only weapons allowed)
    html.find('.add-world-weapon-button').on('click', async (event) => {
      event.preventDefault();
      // Save current active section before opening browser
      const activeNavItem = html.find('.section-nav .nav-item.active');
      this._activeSection = activeNavItem.length > 0 ? activeNavItem.data('section') : null;
      this._showItemBrowser('feat', true); // true = weapons only
    });

    // Roll weapon dice (using autopilot)
    html.find('.weapon-dice-pool').on('click', async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      
      const autopilot = (this.actor.system as any).attributes?.autopilot || 0;
      if (autopilot <= 0) {
        ui.notifications?.warn(game.i18n!.localize('SRA2.ATTRIBUTES.NO_DICE'));
        return;
      }
      
      // Prepare complete weapon roll request data using combat-helpers
      const rollRequestData = CombatHelpers.prepareVehicleWeaponRollRequest(
        this.actor,
        item,
        WEAPON_TYPES
      );
      
      // Call dice roller with prepared data
      DiceRoller.handleRollRequest(rollRequestData);
    });

    // Handle vehicle type change
    html.find('.vehicle-type-select').on('change', this._onVehicleTypeChange.bind(this));

    // Handle bonus changes - update attributes in real-time
    html.find('input[name="system.autopilotBonus"], input[name="system.speedBonus"], input[name="system.handlingBonus"], input[name="system.armorBonus"]').on('change', this._onBonusChange.bind(this));
    
    // Handle option changes - update attributes in real-time
    html.find('input[name="system.isFixed"], input[name="system.isFlying"], input[name="system.weaponMountImprovement"], input[name="system.autopilotUnlocked"], input[name="system.additionalDroneCount"]').on('change', this._onOptionChange.bind(this));

    // Add narrative effect
    html.find('.add-narrative-effect-button').on('click', async (event) => {
      event.preventDefault();
      const narrativeEffects = [...((this.actor.system as any).narrativeEffects || [])];
      narrativeEffects.push('');
      await this.actor.update({
        'system.narrativeEffects': narrativeEffects
      } as any);
    });

    // Remove narrative effect
    html.find('.remove-narrative-effect').on('click', async (event) => {
      event.preventDefault();
      const index = parseInt($(event.currentTarget).data('index') || '0');
      const narrativeEffects = [...((this.actor.system as any).narrativeEffects || [])];
      narrativeEffects.splice(index, 1);
      await this.actor.update({
        'system.narrativeEffects': narrativeEffects
      } as any);
    });

    // Handle damage checkbox changes (both in header and combat section)
    html.find('input[name^="system.damage."]').on('change', async (event) => {
      const input = event.currentTarget as HTMLInputElement;
      const name = input.name;
      const checked = input.checked;
      
      // DEBUG: Log which actor we're updating damage for
      console.log('VehicleSheet damage change - DEBUG:', {
        'this.actor.id': this.actor.id,
        'this.actor.name': this.actor.name,
        'this.actor.type': this.actor.type,
        'input.name': name,
        'checked': checked
      });
      
      // Save current active section before update
      const activeSection = SheetHelpers.getCurrentActiveSection(html);
      
      // Get current damage from actor data (read from _source for persisted values)
      const actorSource = (this.actor as any)._source;
      const currentDamage = actorSource?.system?.damage || (this.actor.system as any).damage || {
        light: [false, false],
        severe: [false],
        incapacitating: false
      };
      
      // Use helper to parse and update damage
      const updatedDamage = SheetHelpers.parseDamageCheckboxChange(name, checked, currentDamage);
      if (!updatedDamage) return;
      
      // Update the actor with the complete damage object
      await this.actor.update({
        'system.damage': updatedDamage
      } as any, { render: false });
      
      // Synchronize all checkboxes with the same name and update visual state
      html.find(`input[name="${name}"]`).each((_, checkbox) => {
        const $checkbox = $(checkbox);
        $checkbox.prop('checked', checked);
        $checkbox.closest('label.track-box').toggleClass('checked', checked);
      });
      
      // Restore active section after update
      const form = $(this.element).closest('form')[0] as HTMLElement;
      if (form && activeSection) {
        SheetHelpers.restoreActiveSection(form, activeSection);
      }
    });
  }

  /**
   * Handle section navigation
   */
  private _onSectionNavigation(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const form = button.closest('form') as HTMLElement;
    if (!form) return;
    
    const section = SheetHelpers.handleSectionNavigation(event, form);
    if (section) {
      this._activeSection = section;
    }
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
    
    // Update vehicle type - the prepareDerivedData will calculate the attributes
    await this.actor.update({
      'system.vehicleType': vehicleType
    } as any);
    
    this.render(false);
  }

  /**
   * Handle bonus changes - update actor and re-render to show updated attributes
   */
  private async _onBonusChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const name = input.name;
    const value = parseInt(input.value) || 0;
    
    // Save current active section before update
    const activeSection = SheetHelpers.getCurrentActiveSection($(this.element)) || 'attributes';
    
    // Update the actor - prepareDerivedData will recalculate attributes
    await this.actor.update({
      [name]: value
    } as any);
    
    // Re-render to show updated calculated attributes
    await this.render(false);
    
    // Restore active section after render
    const form = $(this.element).closest('form')[0] as HTMLElement;
    if (form) {
      SheetHelpers.restoreActiveSection(form, activeSection);
    }
  }

  /**
   * Handle option changes (isFixed, isFlying, weaponMountImprovement, etc.) - update actor and re-render
   */
  private async _onOptionChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const name = input.name;
    
    // Save current active section before update
    const activeSection = SheetHelpers.getCurrentActiveSection($(this.element)) || 'attributes';
    
    // Determine value based on input type
    let value: any;
    if (input.type === 'checkbox') {
      value = input.checked;
    } else if (input.type === 'number') {
      value = parseInt(input.value) || 0;
    } else {
      value = input.value;
    }
    
    // Update the actor - prepareDerivedData will recalculate attributes
    await this.actor.update({
      [name]: value
    } as any);
    
    // Re-render to show updated calculated attributes
    await this.render(false);
    
    // Restore active section after render
    const form = $(this.element).closest('form')[0] as HTMLElement;
    if (form) {
      SheetHelpers.restoreActiveSection(form, activeSection);
    }
  }

  /**
   * Show item browser dialog
   */
  private async _showItemBrowser(itemType: string, weaponsOnly: boolean = false): Promise<void> {
    let items = game.items!.filter((item: any) => item.type === itemType);
    
    // Filter to only weapons if requested
    if (weaponsOnly) {
      items = items.filter((item: any) => {
        const featType = item.system?.featType;
        return featType === 'weapon' || featType === 'weapons-spells';
      });
    }
    
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
                // The sheet will auto-render, and activateListeners will restore the section
                await this.actor.createEmbeddedDocuments('Item', [(item as any).toObject()]);
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

  /**
   * Handle dropping items onto the sheet
   */
  protected override async _onDrop(event: DragEvent): Promise<boolean | void> {
    // Save current active section before drop
    const activeNavItem = $(this.element).find('.section-nav .nav-item.active');
    this._activeSection = activeNavItem.length > 0 ? activeNavItem.data('section') : 'attributes';
    
    // Get the dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}');
    } catch (err) {
      return super._onDrop(event);
    }
    
    // Only allow weapons (feats of type weapon or weapons-spells)
    if (data.type === 'Item') {
      const item = await Item.fromDropData(data);
      if (item && item.type === 'feat') {
        const featType = (item.system as any).featType;
        if (featType === 'weapon' || featType === 'weapons-spells') {
          // Create the item on the actor
          // The sheet will auto-render, and activateListeners will restore the section
          await this.actor.createEmbeddedDocuments('Item', [(item as any).toObject()]);
          
          return false; // Prevent default behavior
        } else {
          ui.notifications?.warn(game.i18n!.localize('SRA2.VEHICLE.ONLY_WEAPONS_ALLOWED'));
          return false; // Prevent default behavior
        }
      }
    }
    
    // Fall back to default behavior for other item types
    return super._onDrop(event);
  }
}


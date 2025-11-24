import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as CombatHelpers from '../helpers/combat-helpers.js';
import * as DiceRoller from '../helpers/dice-roller.js';
import { VEHICLE_TYPES, WEAPON_TYPES } from '../models/item-feat.js';

/**
 * Vehicle/Drone Sheet Application
 */
export class VehicleSheet extends ActorSheet {
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
    const expandedData = SheetHelpers.handleSheetUpdate(this.actor, formData);
    return this.actor.update(expandedData);
  }

  override getData(): any {
    const context = super.getData() as any;

    // Ensure system data is available
    context.system = this.actor.system;

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
        }
      }
    });

    // Add world weapon (only weapons allowed)
    html.find('.add-world-weapon-button').on('click', async (event) => {
      event.preventDefault();
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
      
      // Save current active section before update
      const activeNavItem = html.find('.section-nav .nav-item.active');
      const activeSection = activeNavItem.length > 0 ? activeNavItem.data('section') : null;
      
      // Parse the name to get the path (e.g., "system.damage.light.0" -> ["damage", "light", "0"])
      const pathParts = name.split('.').slice(1); // Remove "system"
      
      if (pathParts.length >= 2 && pathParts[0] === 'damage') {
        const damageType = pathParts[1]; // "light", "severe", or "incapacitating"
        
        // Update data without triggering full render
        if (damageType === 'incapacitating') {
          // For incapacitating, it's a boolean, not an array
          await this.actor.updateSource({
            'system.damage.incapacitating': checked
          } as any);
        } else if (damageType === 'light' || damageType === 'severe') {
          // For light and severe, it's an array
          if (pathParts.length >= 3 && pathParts[2]) {
            const index = parseInt(pathParts[2]);
            const damage = (this.actor.system as any).damage || {};
            const damageArray = [...(damage[damageType] || [])];
            
            // Ensure array is long enough
            while (damageArray.length <= index) {
              damageArray.push(false);
            }
            
            damageArray[index] = checked;
            
            await this.actor.updateSource({
              [`system.damage.${damageType}`]: damageArray
            } as any);
          }
        }
        
        // Update the actor to persist changes, but don't re-render
        await this.actor.update({}, { render: false });
        
        // Synchronize all checkboxes with the same name
        html.find(`input[name="${name}"]`).prop('checked', checked);
        
        // Update visual state for track-boxes in header
        if (damageType === 'incapacitating') {
          html.find(`label.track-box input[name="system.damage.incapacitating"]`).prop('checked', checked);
          html.find(`label.track-box input[name="system.damage.incapacitating"]`).closest('label.track-box')
            .toggleClass('checked', checked);
        } else {
          html.find(`input[name="${name}"]`).each((_, checkbox) => {
            const $checkbox = $(checkbox);
            $checkbox.prop('checked', checked);
            $checkbox.closest('label.track-box').toggleClass('checked', checked);
          });
        }
        
        // Restore active section after update
        if (activeSection) {
          setTimeout(() => {
            const currentHtml = $(this.element);
            const form = currentHtml.closest('form')[0];
            if (form) {
              const navButton = form.querySelector(`[data-section="${activeSection}"]`);
              if (navButton) {
                // Manually set active section without triggering navigation
                form.querySelectorAll('.section-nav .nav-item').forEach((item) => item.classList.remove('active'));
                navButton.classList.add('active');
                
                form.querySelectorAll('.content-section').forEach((section) => section.classList.remove('active'));
                const targetSection = form.querySelector(`[data-section-content="${activeSection}"]`);
                if (targetSection) {
                  targetSection.classList.add('active');
                }
              }
            }
          }, 10);
        }
      }
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

    const form = button.closest('form');
    if (!form) return;

    form.querySelectorAll('.section-nav .nav-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');

    form.querySelectorAll('.content-section').forEach((section) => section.classList.remove('active'));
    const targetSection = form.querySelector(`[data-section-content="${section}"]`);
    if (targetSection) {
      targetSection.classList.add('active');
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
          await this.actor.createEmbeddedDocuments('Item', [(item as any).toObject()]);
          return false; // Prevent default behavior and refresh
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


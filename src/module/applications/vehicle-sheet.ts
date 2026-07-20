import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as CombatHelpers from '../helpers/combat-helpers.js';
import * as DiceRoller from '../helpers/dice-roller.js';
import * as ItemSearch from '../../../item-search.js';
import { VEHICLE_TYPES, WEAPON_TYPES } from '../models/item-feat.js';
import { NARRATIVE_SAVE_DEBOUNCE, DELAYS } from '../config/constants.js';

/**
 * Check if a compendium pack matches the active language
 */
function isPackForActiveLanguage(pack: any): boolean {
  const lang = game.i18n?.lang || 'en';
  const collection = pack.collection || '';
  if (collection.endsWith(`-${lang}`)) return true;
  return false;
}

/**
 * Get compendium packs filtered by active language, with fallback to all packs
 */
function getLanguagePacks(): any[] {
  const allPacks = [...(game.packs as any)].filter((p: any) => p.documentName === 'Item');
  const langPacks = allPacks.filter(isPackForActiveLanguage);
  return langPacks.length > 0 ? langPacks : allPacks;
}

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
    context.isGM = (game as any).user?.isGM ?? false;

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

    // Add vehicle types for selection with translated labels
    context.vehicleTypes = Object.keys(VEHICLE_TYPES).reduce((acc: Record<string, { data: any, label: string }>, key: string) => {
      const translationKey = `SRA2.VEHICLE.TYPES.${key}`;
      const label = game.i18n?.localize(translationKey) || key;
      acc[key] = {
        data: (VEHICLE_TYPES as any)[key],
        label: label
      };
      return acc;
    }, {});

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
      
      // Calculate RR from active weapon feats: autopilot-targeted entries always
      // apply; the rolled weapon's own untargeted (generic) entries apply too,
      // but another weapon's generic RR does not carry over
      activeFeats.forEach((feat: any) => {
        const rrList = feat.system.rrList || [];
        const isOwnWeapon = (feat.id || feat._id) === (item.id || item._id);
        rrList.forEach((rrEntry: any) => {
          const rrTarget = rrEntry.rrTarget || '';
          const targetsAutopilot = rrEntry.rrType === 'attribute' && rrTarget === 'autopilot';
          if (targetsAutopilot || (!rrTarget && isOwnWeapon)) {
            totalRR += rrEntry.rrValue || 0;
          }
        });
      });

      // Vehicle-level RR list: generic and autopilot-targeted entries apply to
      // the drone's own rolls
      const vehicleRRList = (this.actor.system as any).rrList || [];
      vehicleRRList.forEach((rrEntry: any) => {
        const rrTarget = rrEntry.rrTarget || '';
        const targetsAutopilot = rrEntry.rrType === 'attribute' && rrTarget === 'autopilot';
        if (targetsAutopilot || !rrTarget) {
          totalRR += rrEntry.rrValue || 0;
        }
      });
      
      itemData.totalDicePool = totalDicePool;
      itemData.totalRR = totalRR;
      
      // Calculate final damage value with bonus
      const damageValue = item.system.damageValue || '0';
      const damageValueBonus = item.system.damageValueBonus || 0;
      itemData.finalDamageValue = SheetHelpers.calculateFinalDamageValue(damageValue, damageValueBonus, vehicleStructure);
      
      return itemData;
    };
    
    // Filter and process weapons
    const rawWeapons = allFeats.filter((feat: any) =>
      feat.system.featType === 'weapon'
    );
    const weapons = rawWeapons.map((weapon: any) => calculateWeaponStats(weapon));

    context.weapons = weapons;

    // Build RR entries array from the vehicle's own rrList (RR tab editor)
    const slugCache = (globalThis as any).SRA2_SKILL_SLUG_CACHE || {};
    context.rrEntries = [];
    const vehicleRRList = (this.actor.system as any).rrList || [];
    for (let i = 0; i < vehicleRRList.length; i++) {
      const rrEntry = vehicleRRList[i];
      const rrType = rrEntry.rrType;
      const rrTarget = rrEntry.rrTarget || '';

      const entry: any = {
        index: i,
        rrType,
        rrValue: rrEntry.rrValue || 0,
        rrTarget,
        rrTargetName: rrTarget,
        rrLabel: rrEntry.rrLabel || ''
      };

      if (rrType === 'skill' || rrType === 'specialization') {
        entry.rrTargetType = rrType === 'skill'
          ? game.i18n!.localize('SRA2.FEATS.RR_TYPE.SKILL')
          : game.i18n!.localize('SRA2.FEATS.RR_TYPE.SPECIALIZATION');
        // Resolve slug to display name (targets live on the owner, not here)
        if (rrTarget && slugCache[rrTarget]) {
          entry.rrTargetName = slugCache[rrTarget];
        }
      }

      context.rrEntries.push(entry);
    }

    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Restore active section if it was saved
    if (this._activeSection) {
      setTimeout(() => {
        const el = html[0] as HTMLElement;
        const form = el.closest('form');
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

    const el = html[0] as HTMLElement;

    // Section navigation
    el.querySelectorAll<HTMLElement>('.section-nav .nav-item').forEach(elem => elem.addEventListener('click', this._onSectionNavigation.bind(this)));

    // Edit feat/weapon
    el.querySelectorAll<HTMLElement>('.feat-edit, .weapon-edit').forEach(elem => elem.addEventListener('click', (event) => {
      event.preventDefault();
      const itemId = (event.currentTarget as HTMLElement).dataset.itemId || '';
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    }));

    // Delete feat/weapon
    el.querySelectorAll<HTMLElement>('.feat-delete, .weapon-delete').forEach(elem => elem.addEventListener('click', async (event) => {
      event.preventDefault();
      // Save current active section before deletion
      const activeNavItem = el.querySelector('.section-nav .nav-item.active') as HTMLElement | null;
      this._activeSection = activeNavItem ? activeNavItem.dataset.section || null : null;

      const itemId = (event.currentTarget as HTMLElement).dataset.itemId || '';
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
    }));

    // Add world weapon (only weapons allowed)
    el.querySelectorAll<HTMLElement>('.add-world-weapon-button').forEach(elem => elem.addEventListener('click', async (event) => {
      event.preventDefault();
      // Save current active section before opening browser
      const activeNavItem = el.querySelector('.section-nav .nav-item.active') as HTMLElement | null;
      this._activeSection = activeNavItem ? activeNavItem.dataset.section || null : null;
      this._showItemBrowser('feat', true); // true = weapons only
    }));

    // RR list editor (add / remove / clear target / search target)
    el.querySelectorAll<HTMLElement>('[data-action="add-rr-entry"]').forEach(elem => elem.addEventListener('click', this._onAddRREntry.bind(this)));
    el.querySelectorAll<HTMLElement>('[data-action="remove-rr-entry"]').forEach(elem => elem.addEventListener('click', this._onRemoveRREntry.bind(this)));
    el.querySelectorAll<HTMLElement>('[data-action="clear-rr-target"]').forEach(elem => elem.addEventListener('click', this._onClearRRTarget.bind(this)));
    el.querySelectorAll<HTMLElement>('.rr-target-search-input').forEach(elem => {
      elem.addEventListener('input', this._onRRTargetSearch.bind(this));
      elem.addEventListener('blur', this._onRRTargetSearchBlur.bind(this));
    });
    // The sheet does not submit on change: persist RR field edits directly
    el.querySelectorAll<HTMLElement>('[name^="system.rrList."]').forEach(elem => elem.addEventListener('change', this._onRRFieldChange.bind(this)));

    // Roll weapon dice (using autopilot)
    el.querySelectorAll<HTMLElement>('.weapon-dice-pool').forEach(elem => elem.addEventListener('click', async (event) => {
      event.preventDefault();
      const itemId = (event.currentTarget as HTMLElement).dataset.itemId || '';
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
    }));

    // Handle vehicle type change
    el.querySelectorAll<HTMLElement>('.vehicle-type-select').forEach(elem => elem.addEventListener('change', this._onVehicleTypeChange.bind(this)));

    // Handle bonus changes - update attributes in real-time
    el.querySelectorAll<HTMLInputElement>('input[name="system.autopilotBonus"], input[name="system.speedBonus"], input[name="system.handlingBonus"], input[name="system.armorBonus"]').forEach(elem => elem.addEventListener('change', this._onBonusChange.bind(this)));

    // Handle option changes - update attributes in real-time
    el.querySelectorAll<HTMLInputElement>('input[name="system.isFixed"], input[name="system.isFlying"], input[name="system.weaponMountImprovement"], input[name="system.autopilotUnlocked"], input[name="system.additionalDroneCount"]').forEach(elem => elem.addEventListener('change', this._onOptionChange.bind(this)));

    // Add narrative effect
    el.querySelectorAll<HTMLElement>('[data-action="add-narrative-effect"]').forEach(elem => elem.addEventListener('click', async (event) => {
      event.preventDefault();

      // Read current narrative effects from form inputs to preserve unsaved changes
      const currentNarrativeEffects: any[] = [];

      // Extract all narrative effect values from form (preserve order and unsaved changes)
      const narrativeEffectTextareas = el.querySelectorAll<HTMLTextAreaElement>('textarea[name^="system.narrativeEffects."]');
      narrativeEffectTextareas.forEach((textareaElement) => {
        const nameMatch = textareaElement.name.match(/system\.narrativeEffects\.(\d+)\.text/);
        if (nameMatch) {
          const index = parseInt(nameMatch[1] ?? "0");
          const text = textareaElement.value || '';
          const valueInput = el.querySelector<HTMLSelectElement>(`select[name="system.narrativeEffects.${index}.value"]`);
          const value = valueInput ? parseInt(valueInput.value) || 0 : 0;
          
          // Determine isNegative based on value (for backward compatibility)
          const isNegative = value < 0;
          
          currentNarrativeEffects[index] = {
            text: text,
            isNegative: isNegative,
            value: value
          };
        }
      });
      
      // Fill gaps in array
      for (let i = 0; i < currentNarrativeEffects.length; i++) {
        if (!currentNarrativeEffects[i]) {
          currentNarrativeEffects[i] = { text: '', isNegative: false, value: 0 };
        }
      }
      
      // Add new empty effect
      currentNarrativeEffects.push({ text: '', isNegative: false, value: 0 });
      
      await this.actor.update({
        'system.narrativeEffects': currentNarrativeEffects
      } as any);
    }));

    // Remove narrative effect
    el.querySelectorAll<HTMLElement>('[data-action="remove-narrative-effect"]').forEach(elem => elem.addEventListener('click', async (event) => {
      event.preventDefault();
      const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');

      // Read current narrative effects from form inputs to preserve unsaved changes
      const currentNarrativeEffects: any[] = [];

      // Extract all narrative effect values from form (preserve order and unsaved changes)
      const narrativeEffectTextareas = el.querySelectorAll<HTMLTextAreaElement>('textarea[name^="system.narrativeEffects."]');
      narrativeEffectTextareas.forEach((textareaElement) => {
        const nameMatch = textareaElement.name.match(/system\.narrativeEffects\.(\d+)\.text/);
        if (nameMatch) {
          const effectIndex = parseInt(nameMatch[1] ?? "0");
          const text = textareaElement.value || '';
          const valueInput = el.querySelector<HTMLSelectElement>(`select[name="system.narrativeEffects.${effectIndex}.value"]`);
          const value = valueInput ? parseInt(valueInput.value) || 0 : 0;
          
          // Determine isNegative based on value (for backward compatibility)
          const isNegative = value < 0;
          
          currentNarrativeEffects[effectIndex] = {
            text: text,
            isNegative: isNegative,
            value: value
          };
        }
      });
      
      // Fill gaps in array
      for (let i = 0; i < currentNarrativeEffects.length; i++) {
        if (!currentNarrativeEffects[i]) {
          currentNarrativeEffects[i] = { text: '', isNegative: false, value: 0 };
        }
      }
      
      // Remove the effect at the specified index
      currentNarrativeEffects.splice(index, 1);
      
      await this.actor.update({
        'system.narrativeEffects': currentNarrativeEffects
      } as any);
    }));

    // Handle narrative effect changes (text or value) - auto-save to trigger character sheet re-render
    // Use debounce for textarea input to avoid too many saves while typing
    let narrativeEffectSaveTimeout: NodeJS.Timeout | null = null;
    
    const saveNarrativeEffects = async () => {
      // Remember which textarea had focus and cursor position before save
      const activeElement = document.activeElement as HTMLTextAreaElement | null;
      const activeFieldName = activeElement?.name || '';
      const cursorPos = activeElement?.selectionStart ?? 0;
      const cursorEnd = activeElement?.selectionEnd ?? cursorPos;

      // Read current narrative effects from form inputs to preserve unsaved changes
      const currentNarrativeEffects: any[] = [];

      // Extract all narrative effect values from form (preserve order and unsaved changes)
      const narrativeEffectTextareas = el.querySelectorAll<HTMLTextAreaElement>('textarea[name^="system.narrativeEffects."]');
      narrativeEffectTextareas.forEach((textareaElement) => {
        const nameMatch = textareaElement.name.match(/system\.narrativeEffects\.(\d+)\.text/);
        if (nameMatch) {
          const effectIndex = parseInt(nameMatch[1] ?? "0");
          const text = textareaElement.value || '';
          const valueInput = el.querySelector<HTMLSelectElement>(`select[name="system.narrativeEffects.${effectIndex}.value"]`);
          const value = valueInput ? parseInt(valueInput.value) || 0 : 0;

          // Determine isNegative based on value (for backward compatibility)
          const isNegative = value < 0;

          currentNarrativeEffects[effectIndex] = {
            text: text,
            isNegative: isNegative,
            value: value
          };
        }
      });

      // Fill gaps in array
      for (let i = 0; i < currentNarrativeEffects.length; i++) {
        if (!currentNarrativeEffects[i]) {
          currentNarrativeEffects[i] = { text: '', isNegative: false, value: 0 };
        }
      }

      // Update the actor - this will trigger the updateActor hook which re-renders character sheets
      await this.actor.update({
        'system.narrativeEffects': currentNarrativeEffects
      } as any);

      // Restore focus after re-render if the user was typing in a narrative effect textarea
      if (activeFieldName && activeFieldName.startsWith('system.narrativeEffects.')) {
        setTimeout(() => {
          const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
          const restored = sheetEl?.querySelector<HTMLTextAreaElement>(`textarea[name="${activeFieldName}"]`);
          if (restored) {
            restored.focus();
            restored.setSelectionRange(cursorPos, cursorEnd);
          }
        }, DELAYS.SHEET_RENDER);
      }
    };
    
    // Handle select changes (immediate save)
    el.querySelectorAll<HTMLSelectElement>('select[name^="system.narrativeEffects."]').forEach(elem => elem.addEventListener('change', async (event) => {
      event.preventDefault();
      if (narrativeEffectSaveTimeout) {
        clearTimeout(narrativeEffectSaveTimeout);
        narrativeEffectSaveTimeout = null;
      }
      await saveNarrativeEffects();
    }));

    // Handle textarea changes (debounced save for input, immediate for change/blur)
    el.querySelectorAll<HTMLTextAreaElement>('textarea[name^="system.narrativeEffects."]').forEach(elem => {
      elem.addEventListener('input', (_event) => {
        if (narrativeEffectSaveTimeout) {
          clearTimeout(narrativeEffectSaveTimeout);
        }
        // Debounce: save after NARRATIVE_SAVE_DEBOUNCE ms of no typing
        narrativeEffectSaveTimeout = setTimeout(async () => {
          await saveNarrativeEffects();
          narrativeEffectSaveTimeout = null;
        }, NARRATIVE_SAVE_DEBOUNCE);
      });

      elem.addEventListener('change', async (_event) => {
        if (narrativeEffectSaveTimeout) {
          clearTimeout(narrativeEffectSaveTimeout);
          narrativeEffectSaveTimeout = null;
        }
        await saveNarrativeEffects();
      });

      elem.addEventListener('blur', async (_event) => {
        if (narrativeEffectSaveTimeout) {
          clearTimeout(narrativeEffectSaveTimeout);
          narrativeEffectSaveTimeout = null;
        }
        await saveNarrativeEffects();
      });
    });

    // Handle damage checkbox changes (both in header and combat section)
    el.querySelectorAll<HTMLInputElement>('input[name^="system.damage."]').forEach(elem => elem.addEventListener('change', async (event) => {
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
      const activeNavItem = el.querySelector('.section-nav .nav-item.active') as HTMLElement | null;
      const activeSection = activeNavItem ? activeNavItem.dataset.section || null : null;

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
      el.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((checkbox) => {
        checkbox.checked = checked;
        const trackBox = checkbox.closest('label.track-box');
        if (trackBox) {
          trackBox.classList.toggle('checked', checked);
        }
      });

      // Restore active section after update
      const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
      const form = sheetEl?.closest('form') as HTMLElement;
      if (form && activeSection) {
        SheetHelpers.restoreActiveSection(form, activeSection);
      }
    }));
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
    const sheetEl1 = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const activeNavItem1 = sheetEl1?.querySelector('.section-nav .nav-item.active') as HTMLElement | null;
    const activeSection = (activeNavItem1?.dataset.section) || 'attributes';

    // Update the actor - prepareDerivedData will recalculate attributes
    await this.actor.update({
      [name]: value
    } as any);

    // Re-render to show updated calculated attributes
    await this.render(false);

    // Restore active section after render
    const sheetEl1b = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const form = sheetEl1b?.closest('form') as HTMLElement;
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
    const sheetEl2 = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const activeNavItem2 = sheetEl2?.querySelector('.section-nav .nav-item.active') as HTMLElement | null;
    const activeSection = (activeNavItem2?.dataset.section) || 'attributes';

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
    const sheetEl2b = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const form = sheetEl2b?.closest('form') as HTMLElement;
    if (form) {
      SheetHelpers.restoreActiveSection(form, activeSection);
    }
  }

  /** Timeout for RR target search debouncing */
  private rrTargetSearchTimeout: any = null;

  /** Remember the RR section as active before a re-render */
  private _saveRRSection(): void {
    this._activeSection = 'rr';
  }

  /**
   * Persist a change to one RR entry field (the sheet has submitOnChange: false)
   */
  private async _onRRFieldChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    const match = (input.name || '').match(/^system\.rrList\.(\d+)\.(rrType|rrValue|rrTarget|rrLabel)$/);
    if (!match) return;
    this._saveRRSection();

    const index = parseInt(match[1] || '0');
    const field = match[2] as 'rrType' | 'rrValue' | 'rrTarget' | 'rrLabel';
    const rrList = [...((this.actor.system as any).rrList || [])];
    if (!rrList[index]) return;

    let value: any = input.value;
    if (field === 'rrValue') value = parseInt(input.value) || 0;

    const entry: any = { ...rrList[index], [field]: value };
    // Changing the type invalidates the previous target
    if (field === 'rrType') entry.rrTarget = '';
    rrList[index] = entry;

    await (this.actor as any).update({ 'system.rrList': rrList });
    this.render(false);
  }

  private async _onAddRREntry(event: Event): Promise<void> {
    event.preventDefault();
    this._saveRRSection();

    const rrList = [...((this.actor.system as any).rrList || [])];
    rrList.push({ rrType: 'skill', rrValue: 1, rrTarget: '' });

    await (this.actor as any).update({ 'system.rrList': rrList });
    this.render(false);
  }

  private async _onRemoveRREntry(event: Event): Promise<void> {
    event.preventDefault();
    this._saveRRSection();

    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    const rrList = [...((this.actor.system as any).rrList || [])];
    rrList.splice(index, 1);

    await (this.actor as any).update({ 'system.rrList': rrList });
    this.render(false);
  }

  private async _onClearRRTarget(event: Event): Promise<void> {
    event.preventDefault();
    this._saveRRSection();

    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    const rrList = [...((this.actor.system as any).rrList || [])];
    if (rrList[index]) {
      rrList[index] = { ...rrList[index], rrTarget: '' };
    }

    await (this.actor as any).update({ 'system.rrList': rrList });
    this.render(false);
  }

  /**
   * Handle RR target search input (debounced)
   */
  private async _onRRTargetSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const rrIndex = parseInt(input.dataset.rrIndex || '0');
    const resultsDiv = input.parentElement?.querySelector<HTMLElement>('.rr-target-search-results');
    if (!resultsDiv) return;

    if (this.rrTargetSearchTimeout) {
      clearTimeout(this.rrTargetSearchTimeout);
    }

    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }

    this.rrTargetSearchTimeout = setTimeout(async () => {
      await this._performRRTargetSearch(searchTerm, rrIndex, resultsDiv);
    }, DELAYS.SEARCH_DEBOUNCE);
  }

  /**
   * Search skills/specializations in world items and compendiums
   * (the targets live on the owner's sheet, not on the vehicle)
   */
  private async _performRRTargetSearch(searchTerm: string, rrIndex: number, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    const rrList = (this.actor.system as any).rrList || [];
    const rrType = rrList[rrIndex]?.rrType;

    if (!rrType || rrType === 'attribute') {
      resultsDiv.style.display = 'none';
      return;
    }

    // Search in world items
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === rrType && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          results.push({
            name: item.name,
            slug: item.system?.slug || '',
            source: game.i18n!.localize('SRA2.SKILLS.WORLD_ITEMS'),
            type: rrType
          });
        }
      }
    }

    // Search in compendiums (active language first, fallback to all)
    for (const pack of getLanguagePacks()) {
      const documents = await pack.getDocuments();
      for (const doc of documents) {
        if (doc.type === rrType && ItemSearch.normalizeSearchText(doc.name).includes(searchTerm)) {
          const exists = results.some(r => r.name === doc.name);
          if (!exists) {
            results.push({
              name: doc.name,
              slug: doc.system?.slug || '',
              source: pack.title,
              type: rrType
            });
          }
        }
      }
    }

    this._displayRRTargetSearchResults(results, rrIndex, resultsDiv);
  }

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
            <button class="add-rr-target-btn" data-target-name="${result.name}" data-target-slug="${result.slug}" data-rr-index="${rrIndex}">
              ${game.i18n!.localize('SRA2.FEATS.SELECT')}
            </button>
          </div>
        `;
      }
    }

    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';

    resultsDiv.querySelectorAll<HTMLElement>('.add-rr-target-btn').forEach(elem => elem.addEventListener('click', this._onSelectRRTarget.bind(this)));
    resultsDiv.querySelectorAll<HTMLElement>('.search-result-item:not(.no-results)').forEach(elem => elem.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('.add-rr-target-btn')) return;
      const button = elem.querySelector<HTMLButtonElement>('.add-rr-target-btn');
      if (button) button.click();
    }));
  }

  private async _onSelectRRTarget(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this._saveRRSection();

    const button = event.currentTarget as HTMLButtonElement;
    const targetName = button.dataset.targetName;
    const targetSlug = button.dataset.targetSlug;
    const rrIndex = parseInt(button.dataset.rrIndex || '0');

    if (!targetName) return;

    const rrTarget = targetSlug || targetName;
    const rrList = [...((this.actor.system as any).rrList || [])];
    if (rrList[rrIndex]) {
      rrList[rrIndex] = { ...rrList[rrIndex], rrTarget };
    }

    await (this.actor as any).update({ 'system.rrList': rrList });
    this.render(false);

    ui.notifications?.info(game.i18n!.format('SRA2.FEATS.LINKED_TO_TARGET', { name: targetName }));
  }

  private _onRRTargetSearchBlur(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;

    setTimeout(() => {
      const resultsDiv = input.parentElement?.querySelector<HTMLElement>('.rr-target-search-results');
      if (resultsDiv) {
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) return;
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) return;
        resultsDiv.style.display = 'none';
      }
    }, DELAYS.SEARCH_HIDE);
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
        return featType === 'weapon';
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
            const dialogEl = html[0] as HTMLElement;
            const itemId = (dialogEl.querySelector('#item-select') as HTMLSelectElement)?.value || '';
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
    const sheetElDrop = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const activeNavItemDrop = sheetElDrop?.querySelector('.section-nav .nav-item.active') as HTMLElement | null;
    this._activeSection = activeNavItemDrop?.dataset.section || 'attributes';
    
    // Get the dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}');
    } catch (err) {
      return super._onDrop(event);
    }
    
    // Only allow weapons (feats of type weapon)
    if (data.type === 'Item') {
      const item = await Item.fromDropData(data);
      if (item && item.type === 'feat') {
        const featType = (item.system as any).featType;
        if (featType === 'weapon') {
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


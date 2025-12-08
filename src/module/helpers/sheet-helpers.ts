/**
 * Shared Sheet Helpers for SRA2
 * Common functions used by CharacterSheet
 */

import * as ItemSearch from '../../../item-search.js';

/**
 * Handle form submission with proper damage checkbox handling
 */
export function handleSheetUpdate(actor: any, formData: any): any {
  // DEBUG: Log which actor is being updated
  console.log('handleSheetUpdate - DEBUG:', {
    'actor.id': actor?.id,
    'actor.name': actor?.name,
    'actor.type': actor?.type,
    'actor.uuid': actor?.uuid
  });
  
  // Expand the form data first to handle nested properties properly
  const expandedData = foundry.utils.expandObject(formData) as any;
  
  // Only process damage if it's present in the formData (indicates damage fields were changed)
  if (expandedData.system && expandedData.system.damage !== undefined) {
    const currentDamage = (actor.system as any).damage || {};
    
    // Initialize damage object if not present
    if (!expandedData.system.damage || typeof expandedData.system.damage !== 'object') {
      expandedData.system.damage = {};
    }
    
    // Helper function to convert object with numeric keys to array
    const convertToArray = (obj: any, expectedLength: number): boolean[] => {
      if (Array.isArray(obj)) {
        // Already an array, ensure all indices are filled and convert to boolean
        const arr: boolean[] = [];
        for (let i = 0; i < expectedLength; i++) {
          if (obj[i] !== undefined) {
            arr[i] = obj[i] === true || obj[i] === 'true' || obj[i] === 'on';
          } else {
            arr[i] = false;
          }
        }
        return arr;
      }
      if (obj && typeof obj === 'object') {
        // Object with numeric keys (e.g., {"0": true, "1": false}), convert to array
        const arr: boolean[] = [];
        for (let i = 0; i < expectedLength; i++) {
          const key = i.toString();
          arr[i] = obj[key] === true || obj[key] === 'true' || obj[key] === 'on';
        }
        return arr;
      }
      // Not present or invalid, return array of false
      return Array(expectedLength).fill(false);
    };
    
    // Get expected lengths from current damage or defaults
    const currentLightLength = Array.isArray(currentDamage.light) ? currentDamage.light.length : 2;
    const currentSevereLength = Array.isArray(currentDamage.severe) ? currentDamage.severe.length : 1;
    
    // Handle light damage checkboxes - process if present in formData
    if (expandedData.system.damage.light !== undefined) {
      expandedData.system.damage.light = convertToArray(expandedData.system.damage.light, currentLightLength);
    }
    
    // Handle severe damage checkboxes - process if present in formData
    if (expandedData.system.damage.severe !== undefined) {
      expandedData.system.damage.severe = convertToArray(expandedData.system.damage.severe, currentSevereLength);
    }
    
    // Handle incapacitating - convert to boolean if present
    if (expandedData.system.damage.incapacitating !== undefined) {
      expandedData.system.damage.incapacitating = expandedData.system.damage.incapacitating === true || 
                                                  expandedData.system.damage.incapacitating === 'true' || 
                                                  expandedData.system.damage.incapacitating === 'on';
    }
  }
  
  return expandedData;
}

/**
 * Calculate final damage value for weapon/spell display
 */
export function calculateFinalDamageValue(damageValue: string, damageValueBonus: number, strength: number): string {
  if (damageValue === "FOR") {
    const total = strength + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (FOR+${damageValueBonus})` : `${total} (FOR)`;
  } else if (damageValue.startsWith("FOR+")) {
    const modifier = parseInt(damageValue.substring(4)) || 0;
    const total = strength + modifier + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (FOR+${modifier}+${damageValueBonus})` : `${total} (FOR+${modifier})`;
  } else if (damageValue === "toxin") {
    return "selon toxine";
  } else {
    const base = parseInt(damageValue) || 0;
    const total = base + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (${base}+${damageValueBonus})` : total.toString();
  }
}

/**
 * Organize specializations by linked skill
 */
export function organizeSpecializationsBySkill(
  allSpecializations: any[],
  actorItems: any[]
): { bySkill: Map<string, any[]>; unlinked: any[] } {
  const specializationsBySkill = new Map<string, any[]>();
  const unlinkedSpecializations: any[] = [];
  
  allSpecializations.forEach((spec: any) => {
    const linkedSkillName = spec.system.linkedSkill;
    if (linkedSkillName) {
      // linkedSkill is stored as a name, find the skill by name
      const linkedSkill = actorItems.find((i: any) => 
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
        // Linked skill doesn't exist, mark as unlinked
        unlinkedSpecializations.push(spec);
      }
    } else {
      // No linked skill specified
      unlinkedSpecializations.push(spec);
    }
  });
  
  return { bySkill: specializationsBySkill, unlinked: unlinkedSpecializations };
}

/**
 * Handle item drop on actor sheet (feats, skills, specializations, metatypes)
 */
export async function handleItemDrop(
  event: DragEvent,
  actor: any,
  allowedTypes: string[] = ['feat', 'skill', 'specialization', 'metatype']
): Promise<boolean> {
  const data = TextEditor.getDragEventData(event) as any;
  
  // Handle Item drops
  if (data && data.type === 'Item') {
    const item = await Item.implementation.fromDropData(data) as any;
    
    if (!item) return false;
    
    // Check if the item is from a compendium or another actor (not already on this actor)
    if (item.actor && item.actor.id === actor.id) {
      // Item already belongs to this actor, ignore
      return false;
    }
    
    // Check if type is allowed
    if (!allowedTypes.includes(item.type)) {
      return false;
    }
    
    // Handle metatype
    if (item.type === 'metatype') {
      const existingMetatype = actor.items.find((i: any) => i.type === 'metatype');
      if (existingMetatype) {
        ui.notifications?.warn(game.i18n!.localize('SRA2.METATYPES.ONLY_ONE_METATYPE'));
        return false;
      }
      await actor.createEmbeddedDocuments('Item', [item.toObject()]);
      return true;
    }
    
    // Handle feat
    if (item.type === 'feat') {
      const existingFeat = actor.items.find((i: any) => 
        i.type === 'feat' && i.name === item.name
      );
      if (existingFeat) {
        ui.notifications?.warn(game.i18n!.format('SRA2.FEATS.ALREADY_EXISTS', { name: item.name }));
        return false;
      }
      await actor.createEmbeddedDocuments('Item', [item.toObject()]);
      return true;
    }
    
    // Handle skill
    if (item.type === 'skill') {
      const existingSkill = actor.items.find((i: any) => 
        i.type === 'skill' && i.name === item.name
      );
      if (existingSkill) {
        ui.notifications?.warn(game.i18n!.format('SRA2.SKILLS.ALREADY_EXISTS', { name: item.name }));
        return false;
      }
      await actor.createEmbeddedDocuments('Item', [item.toObject()]);
      return true;
    }
    
    // Handle specialization
    if (item.type === 'specialization') {
      const existingSpec = actor.items.find((i: any) => 
        i.type === 'specialization' && i.name === item.name
      );
      if (existingSpec) {
        ui.notifications?.warn(game.i18n!.format('SRA2.SPECIALIZATIONS.ALREADY_EXISTS', { name: item.name }));
        return false;
      }
      await actor.createEmbeddedDocuments('Item', [item.toObject()]);
      return true;
    }
  }
  
  return false;
}

/**
 * Handle vehicle actor drop on character sheet
 * Adds the vehicle actor UUID to the character's linkedVehicles array
 */
export async function handleVehicleActorDrop(
  event: DragEvent,
  actor: any
): Promise<boolean> {
  const data = TextEditor.getDragEventData(event) as any;
  
  // Handle Actor drops (specifically vehicle actors)
  if (data && data.type === 'Actor') {
    try {
      const vehicleActor = await fromUuid(data.uuid) as any;
      
      if (!vehicleActor) return false;
      
      // Check if it's a vehicle actor
      if (vehicleActor.type !== 'vehicle') return false;
      
      // Get current linked vehicles
      const linkedVehicles = (actor.system as any).linkedVehicles || [];
      
      // Check if this vehicle is already linked
      if (linkedVehicles.includes(vehicleActor.uuid)) {
        ui.notifications?.warn(game.i18n!.format('SRA2.FEATS.VEHICLE_ALREADY_EXISTS', { name: vehicleActor.name }));
        return false;
      }
      
      // Add the vehicle UUID to the linked vehicles array
      const updatedLinkedVehicles = [...linkedVehicles, vehicleActor.uuid];
      await actor.update({ 'system.linkedVehicles': updatedLinkedVehicles });
      
      // Configure the vehicle's token prototype to be linked to the character actor
      const prototypeToken = vehicleActor.prototypeToken || {};
      const updateData: any = {
        'prototypeToken.actorLink': true
      };
      
      // If the vehicle doesn't have a prototype token yet, initialize it
      if (!vehicleActor.prototypeToken) {
        updateData['prototypeToken'] = foundry.utils.mergeObject(
          foundry.data.PrototypeToken.defaults,
          { actorLink: true }
        );
      }
      
      await vehicleActor.update(updateData);
      
      ui.notifications?.info(game.i18n!.format('SRA2.FEATS.VEHICLE_ADDED', { name: vehicleActor.name }));
      return true;
    } catch (error) {
      console.error('Error handling vehicle actor drop:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Get RR for a specific item type and name (wrapper for DiceRoller)
 */
export function getRRSources(actor: any, itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{featName: string, rrValue: number}> {
  const sources: Array<{featName: string, rrValue: number}> = [];
  
  const feats = actor.items.filter((item: any) => 
    item.type === 'feat' && 
    item.system.active === true
  );
  
  // Normalize the search name for comparison (case-insensitive, accent-insensitive)
  const normalizedItemName = ItemSearch.normalizeSearchText(itemName);
  
  for (const feat of feats) {
    const featSystem = feat.system as any;
    const rrList = featSystem.rrList || [];
    
    for (const rrEntry of rrList) {
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';
      
      // Normalize the RR target for comparison
      const normalizedRRTarget = ItemSearch.normalizeSearchText(rrTarget);
      
      // Compare normalized names for better matching (handles custom skills/specs with variations)
      if (rrType === itemType && normalizedRRTarget === normalizedItemName && rrValue > 0) {
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
 * Calculate Risk Reduction for a given skill, specialization, or attribute
 */
export function calculateRR(actor: any, itemType: 'skill' | 'specialization' | 'attribute', itemName: string): number {
  const sources = getRRSources(actor, itemType, itemName);
  return sources.reduce((total, source) => total + source.rrValue, 0);
}

/**
 * Generic handler to edit an item from an actor
 */
export async function handleEditItem(event: Event, actor: any): Promise<void> {
  event.preventDefault();
  const element = event.currentTarget as HTMLElement;
  const itemId = element.dataset.itemId || (element.closest('.metatype-item') as HTMLElement)?.getAttribute('data-item-id');
  
  if (!itemId) return;

  const item = actor.items.get(itemId);
  if (item) {
    item.sheet?.render(true);
  }
}

/**
 * Generic handler to delete an item from an actor
 */
export async function handleDeleteItem(event: Event, actor: any, sheetRender?: (refresh: boolean) => void): Promise<void> {
  event.preventDefault();
  const element = event.currentTarget as HTMLElement;
  const itemId = element.dataset.itemId || (element.closest('.metatype-item') as HTMLElement)?.getAttribute('data-item-id');
  
  if (!itemId) return;

  const item = actor.items.get(itemId);
  if (item) {
    await item.delete();
    if (sheetRender) {
      sheetRender(false);
    }
  }
}

// ============================================================================
// DAMAGE VALUE PARSING
// ============================================================================

/**
 * Result of parsing a damage value
 */
export interface DamageValueResult {
  /** Numeric damage value (resolved) */
  numericValue: number;
  /** Display string for UI (e.g., "5 (FOR+2)") */
  displayValue: string;
  /** Raw damage string to send in roll data (e.g., "FOR+2") */
  rawDamageString: string;
  /** Whether the damage is strength-based */
  isStrengthBased: boolean;
  /** Whether the damage is toxin-based */
  isToxin: boolean;
}

/**
 * Parse a damage value string and calculate the final numeric value
 * Handles: FOR, FOR+X, numeric values, and toxin
 * 
 * @param damageValueStr - The damage value string (e.g., "FOR", "FOR+2", "5", "toxin")
 * @param actorStrength - The actor's strength attribute value
 * @param damageValueBonus - Additional bonus from feats/items (default: 0)
 * @returns Parsed damage value result
 */
export function parseDamageValue(
  damageValueStr: string,
  actorStrength: number,
  damageValueBonus: number = 0
): DamageValueResult {
  const result: DamageValueResult = {
    numericValue: 0,
    displayValue: damageValueStr,
    rawDamageString: damageValueStr,
    isStrengthBased: false,
    isToxin: false
  };
  
  // Handle toxin damage
  if (damageValueStr === 'toxin') {
    result.isToxin = true;
    result.displayValue = 'selon toxine';
    return result;
  }
  
  // Handle FOR (strength-based)
  if (damageValueStr === 'FOR') {
    result.isStrengthBased = true;
    result.numericValue = actorStrength + damageValueBonus;
    if (damageValueBonus > 0) {
      result.displayValue = `${result.numericValue} (FOR+${damageValueBonus})`;
      result.rawDamageString = `FOR+${damageValueBonus}`;
    } else {
      result.displayValue = `${result.numericValue} (FOR)`;
      result.rawDamageString = 'FOR';
    }
    return result;
  }
  
  // Handle FOR+X (strength-based with modifier)
  if (damageValueStr.startsWith('FOR+')) {
    result.isStrengthBased = true;
    const modifier = parseInt(damageValueStr.substring(4)) || 0;
    result.numericValue = actorStrength + modifier + damageValueBonus;
    const totalModifier = modifier + damageValueBonus;
    if (damageValueBonus > 0) {
      result.displayValue = `${result.numericValue} (FOR+${modifier}+${damageValueBonus})`;
      result.rawDamageString = `FOR+${totalModifier}`;
    } else {
      result.displayValue = `${result.numericValue} (FOR+${modifier})`;
      result.rawDamageString = damageValueStr;
    }
    return result;
  }
  
  // Handle numeric damage
  const base = parseInt(damageValueStr) || 0;
  result.numericValue = base + damageValueBonus;
  if (damageValueBonus > 0) {
    result.displayValue = `${result.numericValue} (${base}+${damageValueBonus})`;
    result.rawDamageString = result.numericValue.toString();
  } else {
    result.displayValue = result.numericValue.toString();
    result.rawDamageString = damageValueStr;
  }
  
  return result;
}

/**
 * Calculate raw damage string with bonus applied (for roll data)
 * This returns the string to be used in roll requests (e.g., "FOR+3" or "7")
 */
export function calculateRawDamageString(
  baseDamageValue: string,
  damageValueBonus: number
): string {
  if (damageValueBonus <= 0 || baseDamageValue === '0' || baseDamageValue === 'toxin') {
    return baseDamageValue;
  }
  
  if (baseDamageValue === 'FOR') {
    return `FOR+${damageValueBonus}`;
  }
  
  if (baseDamageValue.startsWith('FOR+')) {
    const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
    return `FOR+${baseModifier + damageValueBonus}`;
  }
  
  // Numeric value
  const baseValue = parseInt(baseDamageValue) || 0;
  return (baseValue + damageValueBonus).toString();
}

// ============================================================================
// DAMAGE CHECKBOX HANDLING
// ============================================================================

/**
 * Result of parsing damage checkbox changes
 */
export interface DamageUpdateResult {
  light: boolean[];
  severe: boolean[];
  incapacitating: boolean;
}

/**
 * Parse a damage checkbox change and return the updated damage object
 * Works for both character damage and cyberdeck damage
 * 
 * @param inputName - The input name (e.g., "system.damage.light.0")
 * @param checked - Whether the checkbox is checked
 * @param currentDamage - Current damage object from actor/item
 * @returns Updated damage object, or null if the input name doesn't match
 */
export function parseDamageCheckboxChange(
  inputName: string,
  checked: boolean,
  currentDamage: any
): DamageUpdateResult | null {
  // Match patterns like:
  // - system.damage.light.0
  // - system.damage.severe.0
  // - system.damage.incapacitating
  // - items.{itemId}.system.cyberdeckDamage.light.0
  const match = inputName.match(/(?:damage|cyberdeckDamage)\.(light|severe|incapacitating)(?:\.(\d+))?$/);
  if (!match) return null;
  
  const damageType = match[1] as 'light' | 'severe' | 'incapacitating';
  const index = match[2] ? parseInt(match[2], 10) : null;
  
  // Create a copy of the damage object
  const updatedDamage: DamageUpdateResult = {
    light: Array.isArray(currentDamage?.light) ? [...currentDamage.light] : [false, false],
    severe: Array.isArray(currentDamage?.severe) ? [...currentDamage.severe] : [false],
    incapacitating: typeof currentDamage?.incapacitating === 'boolean' ? currentDamage.incapacitating : false
  };
  
  // Update the appropriate field
  if (damageType === 'incapacitating') {
    updatedDamage.incapacitating = checked;
  } else if (damageType === 'light' || damageType === 'severe') {
    if (index !== null) {
      // Ensure array is long enough
      while (updatedDamage[damageType].length <= index) {
        updatedDamage[damageType].push(false);
      }
      updatedDamage[damageType][index] = checked;
    }
  }
  
  return updatedDamage;
}

/**
 * Get the damage path prefix from an input name
 * Returns 'system.damage' for character damage, or 'system.cyberdeckDamage' for cyberdeck
 */
export function getDamagePathFromInputName(inputName: string): string {
  if (inputName.includes('cyberdeckDamage')) {
    // Extract the items.{itemId}.system.cyberdeckDamage part
    const match = inputName.match(/(items\.[^.]+\.system\.cyberdeckDamage)/);
    return match && match[1] ? match[1] : 'system.cyberdeckDamage';
  }
  return 'system.damage';
}

// ============================================================================
// SECTION NAVIGATION
// ============================================================================

/**
 * Handle section navigation click event
 * Updates the active section in both the nav and content areas
 * 
 * @param event - The click event
 * @param formElement - The form element (or its jQuery wrapper)
 * @returns The section name that was activated, or null if invalid
 */
export function handleSectionNavigation(
  event: Event,
  formElement: HTMLElement | JQuery
): string | null {
  event.preventDefault();
  const button = event.currentTarget as HTMLElement;
  const section = button.dataset.section;
  
  if (!section) return null;
  
  const form = formElement instanceof HTMLElement 
    ? formElement 
    : (formElement as JQuery).get(0);
  
  if (!form) return null;
  
  // Update nav items
  form.querySelectorAll('.section-nav .nav-item').forEach((item) => {
    item.classList.remove('active');
  });
  button.classList.add('active');
  
  // Update content sections
  form.querySelectorAll('.content-section').forEach((contentSection) => {
    contentSection.classList.remove('active');
  });
  const targetSection = form.querySelector(`[data-section-content="${section}"]`);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  return section;
}

/**
 * Restore the active section after a re-render
 * Call this in activateListeners or after any operation that triggers a re-render
 * 
 * @param formElement - The form element
 * @param activeSection - The section name to activate
 * @param delay - Optional delay in ms before restoring (default: 10)
 */
export function restoreActiveSection(
  formElement: HTMLElement,
  activeSection: string | null,
  delay: number = 10
): void {
  if (!activeSection) return;
  
  setTimeout(() => {
    const navButton = formElement.querySelector(`[data-section="${activeSection}"]`);
    if (navButton) {
      // Update nav items
      formElement.querySelectorAll('.section-nav .nav-item').forEach((item) => {
        item.classList.remove('active');
      });
      navButton.classList.add('active');
      
      // Update content sections
      formElement.querySelectorAll('.content-section').forEach((section) => {
        section.classList.remove('active');
      });
      const targetSection = formElement.querySelector(`[data-section-content="${activeSection}"]`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    }
  }, delay);
}

/**
 * Save the current active section from the sheet's HTML
 * Useful before operations that will cause a re-render
 * 
 * @param html - jQuery object of the sheet
 * @returns The current active section name, or null
 */
export function getCurrentActiveSection(html: JQuery): string | null {
  const activeNavItem = html.find('.section-nav .nav-item.active');
  return activeNavItem.length > 0 ? (activeNavItem.data('section') as string) : null;
}

// ============================================================================
// FEAT ENRICHMENT
// ============================================================================

/**
 * Enrich feats with RR entries and final damage values
 */
export function enrichFeats(feats: any[], actorStrength: number, calculateFinalDamageValueFn: (dv: string, bonus: number, str: number) => string, actor?: any): any[] {
  return feats.map((feat: any) => {
    // Add translated labels for attribute targets in RR entries
    feat.rrEntries = [];
    const itemRRList = feat.system.rrList || [];
    
    // For weapons and spells, also include RR from linked skills/specs/attributes
    let allRRList = [...itemRRList];
    
    if (actor && (feat.system.featType === 'weapon' || feat.system.featType === 'spell' || feat.system.featType === 'weapons-spells')) {
      const { normalizeSearchText } = ItemSearch;
      
      // Get linked skill and specialization from weapon
      const linkedAttackSkill = feat.system.linkedAttackSkill || '';
      const linkedAttackSpec = feat.system.linkedAttackSpecialization || '';
      
      let attackSpecName: string | undefined = undefined;
      let attackSkillName: string | undefined = undefined;
      let attackLinkedAttribute: string | undefined = undefined;
      
      // Try to find the linked attack specialization first
      if (linkedAttackSpec) {
        const foundSpec = actor.items.find((i: any) => 
          i.type === 'specialization' && 
          normalizeSearchText(i.name) === normalizeSearchText(linkedAttackSpec)
        );
        
        if (foundSpec) {
          const specSystem = foundSpec.system as any;
          attackSpecName = foundSpec.name;
          attackLinkedAttribute = specSystem.linkedAttribute || 'strength';
          
          // Get parent skill for specialization
          const linkedSkillName = specSystem.linkedSkill;
          if (linkedSkillName) {
            const parentSkill = actor.items.find((i: any) => 
              i.type === 'skill' && i.name === linkedSkillName
            );
            if (parentSkill) {
              attackSkillName = parentSkill.name;
            }
          }
        }
      }
      
      // If no specialization found, try to find the linked attack skill
      if (!attackSpecName && linkedAttackSkill) {
        const foundSkill = actor.items.find((i: any) => 
          i.type === 'skill' && 
          normalizeSearchText(i.name) === normalizeSearchText(linkedAttackSkill)
        );
        
        if (foundSkill) {
          attackSkillName = foundSkill.name;
          attackLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
        }
      }
      
      // Get RR sources from skill/specialization/attribute
      if (attackSpecName) {
        const specRRSources = getRRSources(actor, 'specialization', attackSpecName);
        allRRList = [...allRRList, ...specRRSources.map(rr => ({
          rrType: 'specialization',
          rrValue: rr.rrValue,
          rrTarget: attackSpecName
        }))];
      }
      if (attackSkillName) {
        const skillRRSources = getRRSources(actor, 'skill', attackSkillName);
        allRRList = [...allRRList, ...skillRRSources.map(rr => ({
          rrType: 'skill',
          rrValue: rr.rrValue,
          rrTarget: attackSkillName
        }))];
      }
      if (attackLinkedAttribute) {
        const attributeRRSources = getRRSources(actor, 'attribute', attackLinkedAttribute);
        allRRList = [...allRRList, ...attributeRRSources.map(rr => ({
          rrType: 'attribute',
          rrValue: rr.rrValue,
          rrTarget: attackLinkedAttribute
        }))];
      }
    }
    
    // Process all RR entries (item RR + skill/spec/attribute RR)
    for (let i = 0; i < allRRList.length; i++) {
      const rrEntry = allRRList[i];
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';
      
      if (rrValue > 0) {
      const entry: any = { rrType, rrValue, rrTarget };
      
      if (rrType === 'attribute' && rrTarget) {
        entry.rrTargetLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${rrTarget.toUpperCase()}`);
      }
      
      feat.rrEntries.push(entry);
      }
    }
    
    // Calculate final damage value for weapons and spells
    if (feat.system.featType === 'weapon' || feat.system.featType === 'spell' || feat.system.featType === 'weapons-spells') {
      const damageValue = feat.system.damageValue || '0';
      const damageValueBonus = feat.system.damageValueBonus || 0;
      
      feat.finalDamageValue = calculateFinalDamageValueFn(damageValue, damageValueBonus, actorStrength);
    }
    
    return feat;
  });
}

/**
 * Result from finding attack skill and specialization
 */
export interface AttackSkillSpecResult {
  skillName: string | undefined;
  skillLevel: number | undefined;
  specName: string | undefined;
  specLevel: number | undefined;
  linkedAttribute: string | undefined;
}

/**
 * Options for finding attack skill and specialization
 */
export interface FindAttackSkillSpecOptions {
  isSpell?: boolean;
  spellSpecType?: string;
  defaultAttribute?: string;
}

/**
 * Normalize text for comparison (remove spaces, accents, punctuation)
 */
export function normalizeForComparison(text: string): string {
  return ItemSearch.normalizeSearchText(text).replace(/\s+/g, '').replace(/:/g, '').replace(/'/g, '');
}

/**
 * Find attack skill and specialization in an actor's items
 * Unifies the logic used in getData() for enriching weapons and in _rollWeaponOrSpell()
 * 
 * @param actor - The actor to search in
 * @param targetSpec - The specialization name to search for
 * @param targetSkill - The skill name to search for (fallback if spec not found)
 * @param options - Additional options (isSpell, spellSpecType, defaultAttribute)
 * @returns AttackSkillSpecResult with found skill/spec info
 */
export function findAttackSkillAndSpec(
  actor: any,
  targetSpec: string,
  targetSkill: string,
  options: FindAttackSkillSpecOptions = {}
): AttackSkillSpecResult {
  const result: AttackSkillSpecResult = {
    skillName: undefined,
    skillLevel: undefined,
    specName: undefined,
    specLevel: undefined,
    linkedAttribute: undefined
  };

  const { isSpell = false, spellSpecType = 'combat', defaultAttribute = 'strength' } = options;

  // Try to find the linked attack specialization first
  if (targetSpec) {
    const normalizedTargetSpec = normalizeForComparison(targetSpec);
    
    const foundSpec = actor.items.find((i: any) => {
      if (i.type !== 'specialization') return false;
      const normalizedItemName = normalizeForComparison(i.name);
      return normalizedItemName === normalizedTargetSpec;
    });
    
    if (foundSpec) {
      _extractSpecAndSkillInfo(actor, foundSpec, result, defaultAttribute);
    } else if (isSpell) {
      // If exact match not found for spells, try keyword search
      _trySpellSpecKeywordSearch(actor, spellSpecType, result);
      
      // If still not found, search in game.items
      if (!result.specName && !result.skillLevel && game.items) {
        _searchGameItemsForSpellSpec(actor, targetSpec, spellSpecType, result);
      }
    }
  }
  
  // If no specialization found, try to find the linked attack skill
  if (!result.specName && !result.skillLevel && targetSkill) {
    const foundSkill = actor.items.find((i: any) => 
      i.type === 'skill' && 
      ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(targetSkill)
    );
    
    if (foundSkill) {
      const foundLinkedAttribute = (foundSkill.system as any).linkedAttribute || defaultAttribute;
      result.skillName = foundSkill.name;
      result.linkedAttribute = result.linkedAttribute || foundLinkedAttribute;
      const skillRating = (foundSkill.system as any).rating || 0;
      const attributeValue = (actor.system as any).attributes?.[foundLinkedAttribute] || 0;
      result.skillLevel = skillRating + attributeValue;
    } else if (isSpell && game.items) {
      // For spells, try to find Sorcellerie in game.items
      _searchGameItemsForSorcellerie(actor, result);
    } else if (!isSpell) {
      // Skill not found: use default attribute with skill rating of 0
      result.skillName = targetSkill;
      result.linkedAttribute = result.linkedAttribute || defaultAttribute;
      const attributeValue = (actor.system as any).attributes?.[defaultAttribute] || 0;
      result.skillLevel = 0 + attributeValue; // Skill rating is 0 when skill doesn't exist
    }
  }

  return result;
}

/**
 * Extract skill and spec info from a found specialization
 */
function _extractSpecAndSkillInfo(
  actor: any,
  foundSpec: any,
  result: AttackSkillSpecResult,
  defaultAttribute: string
): void {
  const specSystem = foundSpec.system as any;
  result.specName = foundSpec.name;
  result.linkedAttribute = specSystem.linkedAttribute || defaultAttribute;
  
  // Get parent skill for specialization
  const linkedSkillName = specSystem.linkedSkill;
  if (linkedSkillName) {
    const parentSkill = actor.items.find((i: any) => 
      i.type === 'skill' && i.name === linkedSkillName
    );
    if (parentSkill && result.linkedAttribute) {
      result.skillName = parentSkill.name;
      const skillRating = (parentSkill.system as any).rating || 0;
      const attributeValue = (actor.system as any).attributes?.[result.linkedAttribute] || 0;
      const skillLevel = skillRating + attributeValue;
      result.skillLevel = skillLevel;
      result.specLevel = skillLevel + 2; // Specialization adds +2
    }
  }
}

/**
 * Try to find spell specialization by keyword search in actor items
 */
function _trySpellSpecKeywordSearch(
  actor: any,
  spellSpecType: string,
  result: AttackSkillSpecResult
): void {
  const specKeywords: Record<string, string[]> = {
    'combat': ['combat'],
    'detection': ['détection', 'detection'],
    'health': ['santé', 'sante', 'health'],
    'illusion': ['illusion'],
    'manipulation': ['manipulation'],
    'counterspell': ['contresort', 'contre-sort']
  };
  
  const keywords = specKeywords[spellSpecType] || ['combat'];
  const normalizedKeywords = keywords.map(kw => ItemSearch.normalizeSearchText(kw));
  
  const foundSpecByKeyword = actor.items.find((i: any) => {
    if (i.type !== 'specialization') return false;
    const normalizedName = ItemSearch.normalizeSearchText(i.name);
    const linkedSkill = (i.system as any)?.linkedSkill;
    if (linkedSkill && ItemSearch.normalizeSearchText(linkedSkill) === 'sorcellerie') {
      return normalizedKeywords.some(normalizedKeyword => normalizedName.includes(normalizedKeyword));
    }
    return false;
  });
  
  if (foundSpecByKeyword) {
    _extractSpecAndSkillInfo(actor, foundSpecByKeyword, result, 'willpower');
  }
}

/**
 * Search in game.items for spell specialization
 */
function _searchGameItemsForSpellSpec(
  actor: any,
  targetSpec: string,
  spellSpecType: string,
  result: AttackSkillSpecResult
): void {
  const normalizedTargetSpec = normalizeForComparison(targetSpec);
  
  // Search in game.items for the specialization
  const specInGameItems = (game.items as any).find((i: any) => {
    if (i.type !== 'specialization') return false;
    const normalizedItemName = normalizeForComparison(i.name);
    return normalizedItemName === normalizedTargetSpec;
  });
  
  const specKeywords: Record<string, string[]> = {
    'combat': ['combat'],
    'detection': ['détection', 'detection'],
    'health': ['santé', 'sante', 'health'],
    'illusion': ['illusion'],
    'manipulation': ['manipulation'],
    'counterspell': ['contresort', 'contre-sort']
  };
  
  let specToUse = specInGameItems;
  
  // If still not found by exact match, try keyword search in game.items
  if (!specToUse) {
    const keywords = specKeywords[spellSpecType] || ['combat'];
    const normalizedKeywords = keywords.map(kw => ItemSearch.normalizeSearchText(kw));
    
    specToUse = (game.items as any).find((i: any) => {
      if (i.type !== 'specialization') return false;
      const normalizedName = ItemSearch.normalizeSearchText(i.name);
      const linkedSkill = (i.system as any)?.linkedSkill;
      if (linkedSkill && ItemSearch.normalizeSearchText(linkedSkill) === 'sorcellerie') {
        return normalizedKeywords.some(normalizedKeyword => normalizedName.includes(normalizedKeyword));
      }
      return false;
    });
  }
  
  if (specToUse) {
    const specSystem = specToUse.system as any;
    const linkedSkillName = specSystem.linkedSkill;
    
    if (linkedSkillName) {
      const parentSkill = actor.items.find((i: any) => 
        i.type === 'skill' && i.name === linkedSkillName
      );
      if (parentSkill) {
        const skillSystem = parentSkill.system as any;
        const linkedAttribute = skillSystem.linkedAttribute || 'willpower';
        result.skillName = parentSkill.name;
        result.linkedAttribute = linkedAttribute;
        const skillLevel = (skillSystem.rating || 0) + ((actor.system as any).attributes?.[linkedAttribute] || 0);
        result.skillLevel = skillLevel;
        // Note: specName stays undefined since spec is not in actor
      }
    }
  }
}

/**
 * Search in game.items for Sorcellerie skill
 */
function _searchGameItemsForSorcellerie(actor: any, result: AttackSkillSpecResult): void {
  const sorcerySkillInGame = (game.items as any).find((i: any) => 
    i.type === 'skill' && 
    ItemSearch.normalizeSearchText(i.name) === 'sorcellerie'
  );
  
  if (sorcerySkillInGame) {
    // Use default willpower attribute for Sorcellerie if skill not in actor
    result.skillName = 'Sorcellerie';
    result.linkedAttribute = 'willpower';
    const willpower = (actor.system as any).attributes?.willpower || 1;
    result.skillLevel = willpower; // Skill rating would be 0 if not in actor
  }
}

/**
 * RR Source entry structure
 */
export interface RRSourceEntry {
  featName: string;
  rrValue: number;
  rrType?: string;
  rrTarget?: string;
}

/**
 * Result from calculating attack pool with RR
 */
export interface AttackPoolResult {
  totalDicePool: number;
  totalRR: number;
  allRRSources: RRSourceEntry[];
}

/**
 * Calculate attack pool (dice pool and RR) from skill/spec result and item RR
 * Unifies the RR calculation logic used in getData() and _rollWeaponOrSpell()
 * 
 * @param actor - The actor
 * @param skillSpecResult - Result from findAttackSkillAndSpec()
 * @param itemRRList - The item's rrList (from weapon/spell)
 * @param itemName - The item name (for RR source attribution)
 * @returns AttackPoolResult with dice pool and RR
 */
export function calculateAttackPool(
  actor: any,
  skillSpecResult: AttackSkillSpecResult,
  itemRRList: any[] = [],
  itemName: string = ''
): AttackPoolResult {
  // Calculate dice pool: use spec level if available, otherwise skill level, otherwise 0
  const totalDicePool = skillSpecResult.specLevel || skillSpecResult.skillLevel || 0;
  
  // Get RR sources from skill/specialization/attribute
  let skillRRSources: Array<{featName: string, rrValue: number}> = [];
  let specRRSources: Array<{featName: string, rrValue: number}> = [];
  let attributeRRSources: Array<{featName: string, rrValue: number}> = [];
  
  if (skillSpecResult.specName) {
    specRRSources = getRRSources(actor, 'specialization', skillSpecResult.specName);
  }
  if (skillSpecResult.skillName) {
    skillRRSources = getRRSources(actor, 'skill', skillSpecResult.skillName);
  }
  if (skillSpecResult.linkedAttribute) {
    attributeRRSources = getRRSources(actor, 'attribute', skillSpecResult.linkedAttribute);
  }
  
  // Convert item RR list to same format as getRRSources (objects with rrValue)
  const itemRRSources = itemRRList.map((rrEntry: any) => ({
    featName: itemName,
    rrValue: rrEntry.rrValue || 0
  }));
  
  // Merge all RR sources (item RR + skill/spec/attribute RR)
  const allRRSources = [...itemRRSources, ...specRRSources, ...skillRRSources, ...attributeRRSources];
  
  // Calculate total RR (sum of all RR values, max 3)
  const totalRR = Math.min(3, allRRSources.reduce((sum: number, source: any) => {
    return sum + (source.rrValue || 0);
  }, 0));
  
  return {
    totalDicePool,
    totalRR,
    allRRSources
  };
}

// =============================================================================
// ITEM SEARCH HELPERS
// =============================================================================

/**
 * Find a skill by name in an actor's items (normalized comparison)
 * 
 * @param actor - The actor to search in
 * @param skillName - The skill name to find
 * @returns The found skill item or undefined
 */
export function findSkillByName(actor: any, skillName: string): any | undefined {
  if (!actor || !skillName) return undefined;
  
  const normalizedName = ItemSearch.normalizeSearchText(skillName);
  return actor.items.find((i: any) => 
    i.type === 'skill' && 
    ItemSearch.normalizeSearchText(i.name) === normalizedName
  );
}

/**
 * Find a specialization by name in an actor's items (normalized comparison)
 * 
 * @param actor - The actor to search in
 * @param specName - The specialization name to find
 * @returns The found specialization item or undefined
 */
export function findSpecByName(actor: any, specName: string): any | undefined {
  if (!actor || !specName) return undefined;
  
  const normalizedName = normalizeForComparison(specName);
  return actor.items.find((i: any) => 
    i.type === 'specialization' && 
    normalizeForComparison(i.name) === normalizedName
  );
}

/**
 * Find an item by type and name in game.items (normalized comparison)
 * 
 * @param itemType - The item type to find ('skill', 'specialization', etc.)
 * @param itemName - The item name to find
 * @returns The found item or undefined
 */
export function findItemInGame(itemType: string, itemName: string): any | undefined {
  if (!game.items || !itemName) return undefined;
  
  const normalizedName = normalizeForComparison(itemName);
  return (game.items as any).find((i: any) => 
    i.type === itemType && 
    normalizeForComparison(i.name) === normalizedName
  );
}

/**
 * Calculate skill dice pool (attribute + rating)
 * 
 * @param actor - The actor
 * @param skill - The skill item
 * @returns The total dice pool
 */
export function calculateSkillDicePool(actor: any, skill: any): number {
  if (!actor || !skill) return 0;
  
  const skillSystem = skill.system as any;
  const linkedAttribute = skillSystem.linkedAttribute || 'strength';
  const attributeValue = (actor.system as any).attributes?.[linkedAttribute] || 0;
  const skillRating = skillSystem.rating || 0;
  
  return attributeValue + skillRating;
}

/**
 * Calculate specialization dice pool (attribute + skill rating + 2)
 * 
 * @param actor - The actor
 * @param spec - The specialization item
 * @param parentSkill - Optional parent skill (if not provided, will be found)
 * @returns The total dice pool
 */
export function calculateSpecDicePool(actor: any, spec: any, parentSkill?: any): number {
  if (!actor || !spec) return 0;
  
  const specSystem = spec.system as any;
  const linkedSkillName = specSystem.linkedSkill;
  
  // Find parent skill if not provided
  const skill = parentSkill || findSkillByName(actor, linkedSkillName);
  if (!skill) return 0;
  
  const skillDicePool = calculateSkillDicePool(actor, skill);
  return skillDicePool + 2; // Specialization adds +2
}

/**
 * Get the linked attribute for a skill or specialization
 * 
 * @param item - The skill or specialization item
 * @param actor - Optional actor to search for parent skill (for specs)
 * @returns The linked attribute name
 */
export function getLinkedAttribute(item: any, actor?: any): string {
  if (!item) return 'strength';
  
  const itemSystem = item.system as any;
  
  // If skill, return its linked attribute
  if (item.type === 'skill') {
    return itemSystem.linkedAttribute || 'strength';
  }
  
  // If specialization, find the parent skill's linked attribute
  if (item.type === 'specialization' && actor) {
    const linkedSkillName = itemSystem.linkedSkill;
    const parentSkill = findSkillByName(actor, linkedSkillName);
    if (parentSkill) {
      return (parentSkill.system as any).linkedAttribute || 'strength';
    }
  }
  
  // Fallback
  return itemSystem.linkedAttribute || 'strength';
}

/**
 * Find default defense selection for an actor
 * Unified logic for finding the appropriate defense skill/spec
 * 
 * @param actor - The defending actor
 * @param linkedDefenseSpec - The target defense specialization name
 * @param linkedDefenseSkill - The target defense skill name (fallback)
 * @returns Object with defaultSelection string and found items
 */
export interface DefenseSearchResult {
  defaultSelection: string;
  linkedSpec: any | undefined;
  linkedSkill: any | undefined;
}

export function findDefenseSelection(
  actor: any,
  linkedDefenseSpec: string,
  linkedDefenseSkill?: string
): DefenseSearchResult {
  const result: DefenseSearchResult = {
    defaultSelection: '',
    linkedSpec: undefined,
    linkedSkill: undefined
  };
  
  const skills = actor.items.filter((i: any) => i.type === 'skill');
  
  // 1. Try to find the linked defense specialization
  if (linkedDefenseSpec) {
    result.linkedSpec = findSpecByName(actor, linkedDefenseSpec);
    
    if (result.linkedSpec) {
      result.defaultSelection = `spec-${result.linkedSpec.id}`;
      // Find the parent skill
      const linkedSkillName = result.linkedSpec.system.linkedSkill;
      result.linkedSkill = findSkillByName(actor, linkedSkillName);
      return result;
    }
  }
  
  // 2. Try to find the defense skill
  if (linkedDefenseSkill) {
    result.linkedSkill = findSkillByName(actor, linkedDefenseSkill);
    
    if (result.linkedSkill) {
      result.defaultSelection = `skill-${result.linkedSkill.id}`;
      return result;
    }
  }
  
  // 3. Fallback: Search in game.items for the spec template
  if (linkedDefenseSpec && game.items) {
    const specTemplate = findItemInGame('specialization', linkedDefenseSpec);
    
    if (specTemplate) {
      const linkedSkillName = specTemplate.system.linkedSkill;
      if (linkedSkillName) {
        result.linkedSkill = findSkillByName(actor, linkedSkillName);
        if (result.linkedSkill) {
          result.defaultSelection = `skill-${result.linkedSkill.id}`;
          return result;
        }
      }
    }
  }
  
  // 4. Default to first skill
  if (skills.length > 0) {
    result.linkedSkill = skills[0];
    result.defaultSelection = `skill-${result.linkedSkill.id}`;
  }
  
  return result;
}

/**
 * Get all specializations for a skill (by name, normalized comparison)
 * 
 * @param actor - The actor
 * @param skillName - The skill name to find specs for
 * @returns Array of specializations linked to this skill
 */
export function getSpecializationsForSkill(actor: any, skillName: string): any[] {
  if (!actor || !skillName) return [];
  
  const normalizedSkillName = ItemSearch.normalizeSearchText(skillName);
  
  return actor.items.filter((i: any) => {
    if (i.type !== 'specialization') return false;
    const linkedSkill = (i.system as any)?.linkedSkill;
    return linkedSkill && ItemSearch.normalizeSearchText(linkedSkill) === normalizedSkillName;
  });
}


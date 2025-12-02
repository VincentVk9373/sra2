/**
 * Shared Sheet Helpers for SRA2
 * Common functions used by CharacterSheet
 */

import * as ItemSearch from '../../../item-search.js';

/**
 * Handle form submission with proper damage checkbox handling
 */
export function handleSheetUpdate(actor: any, formData: any): any {
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


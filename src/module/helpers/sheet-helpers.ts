/**
 * Shared Sheet Helpers for SRA2
 * Common functions used by both CharacterSheet and NpcSheet
 */

import * as ItemSearch from './item-search.js';

/**
 * Handle form submission with proper damage checkbox handling
 */
export function handleSheetUpdate(actor: any, formData: any): any {
  // Expand the form data first to handle nested properties properly
  const expandedData = foundry.utils.expandObject(formData) as any;
  
  // Ensure damage structure exists and handle unchecked checkboxes
  if (expandedData.system) {
    const currentDamage = (actor.system as any).damage || {};
    
    // Initialize damage object if not present
    if (!expandedData.system.damage) {
      expandedData.system.damage = {};
    }
    
    // Handle light damage checkboxes - if array not in formData, it means all are unchecked
    if (currentDamage.light && !expandedData.system.damage.light) {
      expandedData.system.damage.light = currentDamage.light.map(() => false);
    } else if (expandedData.system.damage.light && currentDamage.light) {
      // Fill missing indices with false
      for (let i = 0; i < currentDamage.light.length; i++) {
        if (expandedData.system.damage.light[i] === undefined) {
          expandedData.system.damage.light[i] = false;
        }
      }
    }
    
    // Handle severe damage checkboxes
    if (currentDamage.severe && !expandedData.system.damage.severe) {
      expandedData.system.damage.severe = currentDamage.severe.map(() => false);
    } else if (expandedData.system.damage.severe && currentDamage.severe) {
      for (let i = 0; i < currentDamage.severe.length; i++) {
        if (expandedData.system.damage.severe[i] === undefined) {
          expandedData.system.damage.severe[i] = false;
        }
      }
    }
    
    // Handle incapacitating - if not in formData, set to false
    if (expandedData.system.damage.incapacitating === undefined) {
      expandedData.system.damage.incapacitating = false;
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


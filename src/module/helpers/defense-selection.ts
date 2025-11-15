/**
 * Defense Selection Utilities for SRA2
 * This module contains functions to select the appropriate defense skill or specialization
 */

import * as ItemSearch from './item-search.js';

/**
 * Defense selection result
 */
export interface DefenseSelection {
  defaultSelection: string; // Format: 'skill-{id}' or 'spec-{id}'
  linkedSpec: any | null;
  linkedSkill: any | null;
}

/**
 * Find the appropriate defense skill or specialization for a defender
 * 
 * Logic:
 * 1. Search for a specialization with the same name as linkedDefenseSpecialization
 * 2. If not found, search for the linked skill of that specialization (in game.items) 
 *    and check if the defender has that skill
 * 3. Otherwise, use the first available skill
 * 
 * All comparisons are done by normalized labels (case-insensitive, accent-insensitive)
 */
export function findDefaultDefenseSelection(
  defenderActor: any,
  linkedDefenseSpecName: string
): DefenseSelection {
  const skills = defenderActor.items.filter((i: any) => i.type === 'skill');
  const allSpecializations = defenderActor.items.filter((i: any) => i.type === 'specialization');
  
  let defaultSelection = '';
  let linkedSpec: any = null;
  let linkedSkill: any = null;
  
  // 1. Try to find the linked defense specialization by NAME
  if (linkedDefenseSpecName) {
    const normalizedDefenseSpecName = ItemSearch.normalizeSearchText(linkedDefenseSpecName);
    
    linkedSpec = allSpecializations.find((s: any) => 
      ItemSearch.normalizeSearchText(s.name) === normalizedDefenseSpecName
    );
    
    if (linkedSpec) {
      defaultSelection = `spec-${linkedSpec.id}`;
      // Find the parent skill for this specialization
      const linkedSkillName = linkedSpec.system.linkedSkill;
      linkedSkill = skills.find((s: any) => 
        ItemSearch.normalizeSearchText(s.name) === ItemSearch.normalizeSearchText(linkedSkillName)
      );
      
      return { defaultSelection, linkedSpec, linkedSkill };
    }
    
    // 2. If specialization not found on defender, try to find the skill that would be linked
    // Search for the specialization template in game.items to find its linked skill
    if (game.items) {
      const specTemplate = (game.items as any).find((item: any) => 
        item.type === 'specialization' && 
        ItemSearch.normalizeSearchText(item.name) === normalizedDefenseSpecName
      );
      
      if (specTemplate) {
        const linkedSkillName = specTemplate.system.linkedSkill;
        if (linkedSkillName) {
          // Check if defender has this skill
          linkedSkill = skills.find((s: any) => 
            ItemSearch.normalizeSearchText(s.name) === ItemSearch.normalizeSearchText(linkedSkillName)
          );
          
          if (linkedSkill) {
            defaultSelection = `skill-${linkedSkill.id}`;
            return { defaultSelection, linkedSpec: null, linkedSkill };
          }
        }
      }
    }
  }
  
  // 3. If no match found, use the first skill as default
  if (!defaultSelection && skills.length > 0) {
    linkedSkill = skills[0]; // Default to first skill
    defaultSelection = `skill-${linkedSkill.id}`;
  }
  
  return { defaultSelection, linkedSpec, linkedSkill };
}

/**
 * Convert an ID-based linkedDefenseSpecialization to a name-based one
 * This is a migration helper to convert old ID-based links to name-based links
 */
export function convertDefenseSpecIdToName(
  linkedDefenseSpecId: string,
  allSpecializations: any[]
): string {
  if (!linkedDefenseSpecId) return '';
  
  // Check if it's already a name (not a valid Foundry ID format)
  // Foundry IDs are typically 16 characters alphanumeric
  if (linkedDefenseSpecId.length !== 16 || !/^[a-zA-Z0-9]+$/.test(linkedDefenseSpecId)) {
    // Already a name
    return linkedDefenseSpecId;
  }
  
  // It's an ID, find the corresponding specialization
  const spec = allSpecializations.find((s: any) => s.id === linkedDefenseSpecId);
  return spec ? spec.name : '';
}

/**
 * Get the defense specialization name from an attacking weapon
 * Handles both ID-based (old) and name-based (new) formats
 */
export function getDefenseSpecNameFromWeapon(
  attackingWeapon: any,
  allAvailableSpecializations: any[]
): string {
  const linkedDefenseSpec = attackingWeapon?.system?.linkedDefenseSpecialization || '';
  
  if (!linkedDefenseSpec) return '';
  
  // Convert ID to name if needed (for backwards compatibility)
  return convertDefenseSpecIdToName(linkedDefenseSpec, allAvailableSpecializations);
}


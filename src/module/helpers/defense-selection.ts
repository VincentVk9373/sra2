/**
 * Defense Selection Utilities for SRA2
 * This module contains functions to select the appropriate defense skill or specialization
 */

import * as ItemSearch from './item-search.js';
import { WEAPON_TYPES } from '../models/item-feat.js';

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
 * 1. Search for the defense specialization by name
 * 2. If not found, search for the defense skill by name
 * 3. Otherwise, use the first available skill
 * 
 * All comparisons are done by normalized labels (case-insensitive, accent-insensitive)
 */
export function findDefaultDefenseSelection(
  defenderActor: any,
  linkedDefenseSpecName: string,
  linkedDefenseSkillName?: string
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
  }
  
  // 2. If specialization not found, try to find the defense skill by NAME
  if (!defaultSelection && linkedDefenseSkillName) {
    const normalizedDefenseSkillName = ItemSearch.normalizeSearchText(linkedDefenseSkillName);
    
    linkedSkill = skills.find((s: any) => 
      ItemSearch.normalizeSearchText(s.name) === normalizedDefenseSkillName
    );
    
    if (linkedSkill) {
      defaultSelection = `skill-${linkedSkill.id}`;
      return { defaultSelection, linkedSpec: null, linkedSkill };
    }
  }
  
  // 3. Fallback: Search for the specialization template in game.items to find its linked skill
  if (!defaultSelection && linkedDefenseSpecName && game.items) {
    const normalizedDefenseSpecName = ItemSearch.normalizeSearchText(linkedDefenseSpecName);
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
  
  // 4. If no match found, use the first skill as default
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
 * Get the defense skill and specialization names from an attacking weapon
 * Uses WEAPON_TYPES for predefined weapons or custom fields for custom weapons
 */
export function getDefenseInfoFromWeapon(
  attackingWeapon: any,
  allAvailableSpecializations: any[]
): { defenseSkillName: string; defenseSpecName: string } {
  if (!attackingWeapon) {
    return { defenseSkillName: '', defenseSpecName: '' };
  }
  
  const weaponType = attackingWeapon.system?.weaponType;
  
  // For predefined weapons, get from WEAPON_TYPES
  if (weaponType && weaponType !== 'custom-weapon') {
    const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
    if (weaponStats) {
      return {
        defenseSkillName: weaponStats.linkedDefenseSkill || '',
        defenseSpecName: weaponStats.linkedDefenseSpecialization || ''
      };
    }
  }
  
  // For custom weapons, get from system fields
  if (weaponType === 'custom-weapon') {
    return {
      defenseSkillName: attackingWeapon.system?.linkedDefenseSkill || '',
      defenseSpecName: attackingWeapon.system?.linkedDefenseSpecialization || ''
    };
  }
  
  // Fallback: try old system (ID-based) for backwards compatibility
  const linkedDefenseSpec = attackingWeapon.system?.linkedDefenseSpecialization || '';
  if (linkedDefenseSpec) {
    return {
      defenseSkillName: '',
      defenseSpecName: convertDefenseSpecIdToName(linkedDefenseSpec, allAvailableSpecializations)
    };
  }
  
  return { defenseSkillName: '', defenseSpecName: '' };
}

/**
 * Get the defense specialization name from an attacking weapon (backwards compatibility)
 * @deprecated Use getDefenseInfoFromWeapon instead
 */
export function getDefenseSpecNameFromWeapon(
  attackingWeapon: any,
  allAvailableSpecializations: any[]
): string {
  const { defenseSpecName } = getDefenseInfoFromWeapon(attackingWeapon, allAvailableSpecializations);
  return defenseSpecName;
}


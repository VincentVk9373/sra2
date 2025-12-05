/**
 * Defense Selection Utilities for SRA2
 * This module contains functions to select the appropriate defense skill or specialization
 */

import * as SheetHelpers from './sheet-helpers.js';
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
  // Use unified helper from SheetHelpers
  const result = SheetHelpers.findDefenseSelection(
    defenderActor,
    linkedDefenseSpecName,
    linkedDefenseSkillName
  );
  
  // Convert to expected format (null instead of undefined for backwards compatibility)
  return {
    defaultSelection: result.defaultSelection,
    linkedSpec: result.linkedSpec || null,
    linkedSkill: result.linkedSkill || null
  };
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


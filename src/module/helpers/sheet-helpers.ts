/**
 * Shared Sheet Helpers for SRA2
 * Common functions used by CharacterSheet
 */

import * as ItemSearch from '../../../item-search.js';
import { RR_MAX, SKILL_SLUGS } from '../config/constants.js';

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

  // Helper function to process damage data for a specific damage type
  // Handles the HTML checkbox bug: unchecked checkboxes are not sent in form data,
  // so when all boxes are unchecked the damage field is missing entirely.
  const processDamageData = (damageType: 'damage') => {
    const currentDamage = (actor.system as any)[damageType];
    if (!currentDamage) return; // Actor doesn't have this damage type

    if (!expandedData.system) expandedData.system = {};

    // Get expected lengths from current damage or defaults
    const currentLightLength = Array.isArray(currentDamage.light) ? currentDamage.light.length : 2;
    const currentSevereLength = Array.isArray(currentDamage.severe) ? currentDamage.severe.length : 1;

    // If damage type is missing from form data (all checkboxes unchecked), set all to false
    if (expandedData.system[damageType] === undefined) {
      expandedData.system[damageType] = {
        light: Array(currentLightLength).fill(false),
        severe: Array(currentSevereLength).fill(false),
        incapacitating: false
      };
      return;
    }

    // Initialize damage object if not proper
    if (!expandedData.system[damageType] || typeof expandedData.system[damageType] !== 'object') {
      expandedData.system[damageType] = {};
    }

    // Handle light damage checkboxes
    expandedData.system[damageType].light = convertToArray(
      expandedData.system[damageType].light, currentLightLength
    );

    // Handle severe damage checkboxes
    expandedData.system[damageType].severe = convertToArray(
      expandedData.system[damageType].severe, currentSevereLength
    );

    // Handle incapacitating - convert to boolean, default false if missing
    expandedData.system[damageType].incapacitating = expandedData.system[damageType].incapacitating === true ||
      expandedData.system[damageType].incapacitating === 'true' ||
      expandedData.system[damageType].incapacitating === 'on';
  };

  processDamageData('damage');

  return expandedData;
}

/**
 * Calculate final damage value for weapon/spell display
 */
export function calculateFinalDamageValue(
  damageValue: string, 
  damageValueBonus: number, 
  strength: number,
  allAttributes?: Record<string, number>
): string {
  const attributes = allAttributes || { strength };
  const actorStrength = attributes.strength || strength;
  
  if (damageValue === "FOR") {
    const total = actorStrength + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (FOR+${damageValueBonus})` : `${total} (FOR)`;
  } else if (damageValue.startsWith("FOR+")) {
    const modifier = parseInt(damageValue.substring(4)) || 0;
    const total = actorStrength + modifier + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (FOR+${modifier}+${damageValueBonus})` : `${total} (FOR+${modifier})`;
  } else if (damageValue === "toxin") {
    return game.i18n?.localize('SRA2.FEATS.WEAPON.TOXIN_DAMAGE') || 'according to toxin';
  } else if (damageValue.includes('+') && !damageValue.startsWith('FOR')) {
    // Handle attribute+bonus format (e.g., "agility+2")
    const parts = damageValue.split('+');
    const attributeName = (parts[0] ?? '').trim();
    const bonus = parseInt(parts[1] ?? '0') || 0;
    const attributeValue = attributes[attributeName] || 0;
    const total = attributeValue + bonus + damageValueBonus;
    const attributeLabel = game.i18n?.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`) || attributeName;
    
    if (damageValueBonus > 0) {
      return `${total} (${attributeLabel}+${bonus}+${damageValueBonus})`;
    } else {
      return `${total} (${attributeLabel}+${bonus})`;
    }
  } else {
    const base = parseInt(damageValue) || 0;
    const total = base + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (${base}+${damageValueBonus})` : total.toString();
  }
}

/**
 * Organize specializations by linked skill
 * Returns:
 * - bySkill: Map of skill ID -> specializations array (specs with existing linked skill)
 * - unlinked: specs with no linked skill specified
 * - orphan: specs with linked skill specified but skill doesn't exist on actor (marked isOrphan=true, missingSkillName set)
 */
export function organizeSpecializationsBySkill(
  allSpecializations: any[],
  actorItems: any[]
): { bySkill: Map<string, any[]>; unlinked: any[]; orphan: any[] } {
  const specializationsBySkill = new Map<string, any[]>();
  const unlinkedSpecializations: any[] = [];
  const orphanSpecializations: any[] = [];

  allSpecializations.forEach((spec: any) => {
    const linkedSkillName = spec.system.linkedSkill;
    if (linkedSkillName) {
      // linkedSkill may be stored as a name or a slug, find the skill by either
      const linkedSkill = actorItems.find((i: any) =>
        i.type === 'skill' && (i.name === linkedSkillName || i.system?.slug === linkedSkillName)
      );

      if (linkedSkill && linkedSkill.id) {
        // Valid linked skill found
        const skillId = linkedSkill.id;
        if (!specializationsBySkill.has(skillId)) {
          specializationsBySkill.set(skillId, []);
        }
        specializationsBySkill.get(skillId)!.push(spec);
      } else {
        // Linked skill specified but doesn't exist on actor - orphan specialization
        spec.isOrphan = true;
        spec.missingSkillName = linkedSkillName;
        orphanSpecializations.push(spec);
      }
    } else {
      // No linked skill specified
      unlinkedSpecializations.push(spec);
    }
  });

  return { bySkill: specializationsBySkill, unlinked: unlinkedSpecializations, orphan: orphanSpecializations };
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

    // Handle metatype - replace existing one if present
    if (item.type === 'metatype') {
      const existingMetatype = actor.items.find((i: any) => i.type === 'metatype');
      if (existingMetatype) {
        // Delete the old metatype before adding the new one
        await actor.deleteEmbeddedDocuments('Item', [existingMetatype.id]);
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
        i.type === 'skill' && (i.name === item.name || (item.system?.slug && i.system?.slug === item.system.slug))
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
        i.type === 'specialization' && (i.name === item.name || (item.system?.slug && i.system?.slug === item.system.slug))
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
 * Create a contact feat from a dropped actor
 */
async function createContactFromActor(sourceActor: any, targetActor: any): Promise<void> {
  const contactData = {
    name: sourceActor.name,
    type: 'feat',
    img: sourceActor.img || 'icons/svg/mystery-man.svg',
    system: {
      featType: 'contact',
      contactName: sourceActor.name,
      description: '',
    }
  };

  await targetActor.createEmbeddedDocuments('Item', [contactData]);
  ui.notifications?.info(
    game.i18n!.format('SRA2.FEATS.CONTACT.CREATED_FROM_ACTOR', { name: sourceActor.name })
  );
}

/**
 * Handle actor drop on character sheet
 * Vehicles are linked, other actors create a contact feat
 */
export async function handleVehicleActorDrop(
  event: DragEvent,
  actor: any
): Promise<boolean> {
  const data = TextEditor.getDragEventData(event) as any;

  // Handle Actor drops (specifically vehicle actors)
  if (data && data.type === 'Actor') {
    try {
      const sourceActor = await fromUuid(data.uuid) as any;

      if (!sourceActor) return false;

      // Check if it's a vehicle actor or another actor type
      if (sourceActor.type !== 'vehicle') {
        // Non-vehicle actor: create a contact feat from this actor
        await createContactFromActor(sourceActor, actor);
        return true;
      }

      // Create a copy of the vehicle instead of linking to the original
      const vehicleData = sourceActor.toObject();

      // Generate a unique name for the copy with a matricule (2 letters + 1 digit)
      const ownerName = actor.name || 'Character';
      const baseName = vehicleData.name;

      // Generate random matricule: 2 uppercase letters + 1 digit
      const generateMatricule = () => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letter1 = letters[Math.floor(Math.random() * letters.length)];
        const letter2 = letters[Math.floor(Math.random() * letters.length)];
        const digit = Math.floor(Math.random() * 10);
        return `${letter1}${letter2}${digit}`;
      };

      let matricule = generateMatricule();
      let newName = `${baseName} ${matricule} (${ownerName})`;

      // Check if a vehicle with this name already exists (regenerate matricule if needed)
      while (game.actors?.getName(newName)) {
        matricule = generateMatricule();
        newName = `${baseName} ${matricule} (${ownerName})`;
      }

      vehicleData.name = newName;

      // Configure the prototype token to be linked
      if (!vehicleData.prototypeToken) {
        vehicleData.prototypeToken = foundry.utils.mergeObject(
          (foundry.data.PrototypeToken as any).defaults,
          { actorLink: true }
        );
      } else {
        vehicleData.prototypeToken.actorLink = true;
      }

      // Create the new vehicle actor
      const newVehicle = await Actor.create(vehicleData) as any;

      if (!newVehicle) {
        ui.notifications?.error(game.i18n!.localize('SRA2.FEATS.VEHICLE_CREATION_ERROR'));
        return false;
      }

      // Get current linked vehicles
      const linkedVehicles = (actor.system as any).linkedVehicles || [];

      // Add the new vehicle's UUID to the linked vehicles array
      const updatedLinkedVehicles = [...linkedVehicles, newVehicle.uuid];
      await actor.update({ 'system.linkedVehicles': updatedLinkedVehicles });

      ui.notifications?.info(game.i18n!.format('SRA2.FEATS.VEHICLE_ADDED', { name: newVehicle.name }));
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
export function getRRSources(actor: any, itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{ featName: string, rrValue: number, rrLabel?: string }> {
  const sources: Array<{ featName: string, rrValue: number, rrLabel?: string }> = [];

  const feats = actor.items.filter((item: any) =>
    item.type === 'feat' &&
    item.system.active === true
  );

  // Normalize the search name for comparison (case-insensitive, accent-insensitive)
  const normalizedItemName = ItemSearch.normalizeSearchText(itemName);
  // Also find the item's slug for matching rrTargets stored as slugs
  let itemSlug = '';
  if (itemType === 'skill') {
    const skillItem = actor.items.find((i: any) => i.type === 'skill' && ItemSearch.normalizeSearchText(i.name) === normalizedItemName);
    itemSlug = skillItem?.system?.slug || '';
  } else if (itemType === 'specialization') {
    const specItem = actor.items.find((i: any) => i.type === 'specialization' && ItemSearch.normalizeSearchText(i.name) === normalizedItemName);
    itemSlug = specItem?.system?.slug || '';
  }

  for (const feat of feats) {
    const featSystem = feat.system as any;
    const rrList = featSystem.rrList || [];

    for (const rrEntry of rrList) {
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';

      if (rrType !== itemType || rrValue <= 0) continue;

      // Compare by normalized name or by slug
      const normalizedRRTarget = ItemSearch.normalizeSearchText(rrTarget);
      const matchByName = normalizedRRTarget === normalizedItemName;
      const matchBySlug = itemSlug && rrTarget === itemSlug;

      if (matchByName || matchBySlug) {
        sources.push({
          featName: feat.name,
          rrValue: rrValue,
          rrLabel: rrEntry.rrLabel || undefined
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
 * Find all RR entries that target skills/specializations not owned by the actor
 * These "phantom" RRs allow rolling at attribute level with the RR bonus
 */
export interface PhantomRR {
  name: string;
  type: 'skill' | 'specialization';
  linkedAttribute: string;
  linkedAttributeLabel: string;
  linkedSkillName?: string; // For phantom specs, the linked skill name
  linkedSkillOnActor?: boolean; // Whether the linked skill exists on the actor
  rr: number;
  totalDicePool: number;
  sources: Array<{ featName: string, rrValue: number }>;
}

export function getPhantomRRs(actor: any): PhantomRR[] {
  const phantomRRs: PhantomRR[] = [];
  const seenTargets = new Set<string>();

  // Get all existing skills and specializations on the actor (by normalized name AND slug)
  const existingSkills = new Set<string>();
  actor.items.filter((i: any) => i.type === 'skill').forEach((i: any) => {
    existingSkills.add(ItemSearch.normalizeSearchText(i.name));
    if (i.system?.slug) existingSkills.add(i.system.slug);
  });
  const existingSpecs = new Set<string>();
  actor.items.filter((i: any) => i.type === 'specialization').forEach((i: any) => {
    existingSpecs.add(ItemSearch.normalizeSearchText(i.name));
    if (i.system?.slug) existingSpecs.add(i.system.slug);
  });

  // Get all active feats with RR entries
  const feats = actor.items.filter((item: any) =>
    item.type === 'feat' &&
    item.system.active === true
  );

  for (const feat of feats) {
    const featSystem = feat.system as any;
    const rrList = featSystem.rrList || [];

    for (const rrEntry of rrList) {
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';

      if (rrValue <= 0 || !rrTarget) continue;

      const normalizedTarget = ItemSearch.normalizeSearchText(rrTarget);
      // Use rrTarget directly as key (it's a slug after migration)
      const targetKey = `${rrType}:${rrTarget}`;

      // Check if this is a skill/spec RR targeting something not on the actor
      // rrTarget is a slug after migration, but may still be a localized name on unmigrated data
      const isExistingSkill = existingSkills.has(normalizedTarget) || existingSkills.has(rrTarget);
      const isExistingSpec = existingSpecs.has(normalizedTarget) || existingSpecs.has(rrTarget);
      if (rrType === 'skill' && !isExistingSkill) {
        if (!seenTargets.has(targetKey)) {
          seenTargets.add(targetKey);
          phantomRRs.push({
            name: rrTarget,
            type: 'skill',
            linkedAttribute: 'strength', // Default, will be updated if found
            linkedAttributeLabel: '',
            rr: 0,
            totalDicePool: 0,
            sources: []
          });
        }
        // Add source to existing phantom
        const phantom = phantomRRs.find(p => p.type === 'skill' && (p.name === rrTarget || ItemSearch.normalizeSearchText(p.name) === normalizedTarget));
        if (phantom) {
          phantom.sources.push({ featName: feat.name, rrValue });
        }
      } else if (rrType === 'specialization' && !isExistingSpec) {
        if (!seenTargets.has(targetKey)) {
          seenTargets.add(targetKey);
          phantomRRs.push({
            name: rrTarget,
            type: 'specialization',
            linkedAttribute: 'strength', // Default, will be updated if found
            linkedAttributeLabel: '',
            rr: 0,
            totalDicePool: 0,
            sources: []
          });
        }
        // Add source to existing phantom
        const phantom = phantomRRs.find(p => p.type === 'specialization' && (p.name === rrTarget || ItemSearch.normalizeSearchText(p.name) === normalizedTarget));
        if (phantom) {
          phantom.sources.push({ featName: feat.name, rrValue });
        }
      }
    }
  }

  // Resolve slug names to display names from world items, compendium cache, or game items
  // Also keep track of original slugs for metadata lookup
  const slugCache = (globalThis as any).SRA2_SKILL_SLUG_CACHE || {};
  const metadataCache: Record<string, { linkedSkill?: string, linkedAttribute?: string }> = (globalThis as any).SRA2_SLUG_METADATA_CACHE || {};
  const phantomSlugs = new Map<PhantomRR, string>(); // Keep original slug for metadata lookup
  for (const phantom of phantomRRs) {
    phantomSlugs.set(phantom, phantom.name); // Store original slug/name before resolution
    // Try cache first (covers compendiums), then world items
    if (slugCache[phantom.name]) {
      phantom.name = slugCache[phantom.name];
    } else {
      const resolved = findItemInGame(phantom.type, phantom.name);
      if (resolved) {
        phantom.name = resolved.name;
      }
    }
  }

  // Skill slug -> attribute map for phantom skills
  const skillAttributeMap: Record<string, string> = {
    // Slugs (canonical)
    [SKILL_SLUGS.CLOSE_COMBAT]: 'strength',
    [SKILL_SLUGS.RANGED_WEAPONS]: 'agility',
    [SKILL_SLUGS.ATHLETICS]: 'strength',
    [SKILL_SLUGS.STEALTH]: 'agility',
    [SKILL_SLUGS.CRACKING]: 'logic',
    [SKILL_SLUGS.ENGINEERING]: 'logic',
    [SKILL_SLUGS.ELECTRONICS]: 'logic',
    [SKILL_SLUGS.PILOTING]: 'agility',
    [SKILL_SLUGS.SORCERY]: 'willpower',
    [SKILL_SLUGS.CONJURATION]: 'willpower',
    [SKILL_SLUGS.TECHNOMANCER]: 'logic',
    [SKILL_SLUGS.INFLUENCE]: 'charisma',
    [SKILL_SLUGS.PERCEPTION]: 'willpower',
    [SKILL_SLUGS.SURVIVAL]: 'willpower',
    [SKILL_SLUGS.NETWORKING]: 'charisma',
    [SKILL_SLUGS.ASTRAL_COMBAT]: 'willpower',
    // FR names (normalized, for backward compat)
    'athletisme': 'strength',
    'combat rapproche': 'strength',
    'armes a distance': 'agility',
    'furtivite': 'agility',
    'piratage': 'logic',
    'ingenierie': 'logic',
    'pilotage': 'agility',
    'sorcellerie': 'willpower',
    'technomancie': 'logic',
    'survie': 'willpower',
    'reseau': 'charisma',
    'combat astral': 'willpower',
  };

  // Helper to resolve linked skill and attribute for a specialization
  // Uses: 1) game.items template, 2) metadata cache (compendiums), 3) skillAttributeMap fallback
  function resolveSpecMetadata(originalSlug: string, displayName: string): { linkedSkill?: string, linkedAttribute?: string } {
    // 1. Try findItemInGame (world items)
    const specTemplate = findItemInGame('specialization', displayName);
    if (specTemplate) {
      return {
        linkedSkill: (specTemplate.system as any).linkedSkill,
        linkedAttribute: (specTemplate.system as any).linkedAttribute,
      };
    }

    // 2. Try metadata cache (built from compendiums at startup)
    if (metadataCache[originalSlug]) {
      return metadataCache[originalSlug];
    }

    return {};
  }

  // Calculate final RR values and determine linked attribute
  for (const phantom of phantomRRs) {
    phantom.rr = Math.min(RR_MAX, phantom.sources.reduce((total, s) => total + s.rrValue, 0));
    const originalSlug = phantomSlugs.get(phantom) || phantom.name;

    if (phantom.type === 'specialization') {
      // For phantom specs, resolve linked skill/attribute from templates or metadata cache
      const specMeta = resolveSpecMetadata(originalSlug, phantom.name);
      const linkedSkillSlug = specMeta.linkedSkill;
      const specLinkedAttribute = specMeta.linkedAttribute;

      if (linkedSkillSlug) {
        phantom.linkedSkillName = linkedSkillSlug;

        // Check if actor has this skill
        const actorSkill = actor.items.find((i: any) =>
          i.type === 'skill' && (ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(linkedSkillSlug) || i.system?.slug === linkedSkillSlug)
        );

        if (actorSkill) {
          phantom.linkedSkillOnActor = true;
          // Use the actor's skill linked attribute (takes priority)
          phantom.linkedAttribute = (actorSkill.system as any).linkedAttribute || specLinkedAttribute || 'strength';

          // Calculate dice pool: attribute + skill rating (no +2 since spec is phantom)
          const attributeValue = (actor.system as any).attributes?.[phantom.linkedAttribute] || 0;
          const skillRating = (actorSkill.system as any).rating || 0;
          phantom.totalDicePool = attributeValue + skillRating;
        } else {
          phantom.linkedSkillOnActor = false;
          // Use spec's linked attribute from template/cache, or resolve from skill slug map
          phantom.linkedAttribute = specLinkedAttribute || skillAttributeMap[linkedSkillSlug] || 'strength';
          const attributeValue = (actor.system as any).attributes?.[phantom.linkedAttribute] || 0;
          phantom.totalDicePool = attributeValue;
        }
      } else {
        // No linked skill found, use spec's linked attribute or default
        phantom.linkedAttribute = specLinkedAttribute || 'strength';
        const attributeValue = (actor.system as any).attributes?.[phantom.linkedAttribute] || 0;
        phantom.totalDicePool = attributeValue;
      }
    } else {
      // For phantom skills: use metadata cache, then skillAttributeMap, then default
      const skillMeta = metadataCache[originalSlug];
      const normalizedName = ItemSearch.normalizeSearchText(phantom.name);
      phantom.linkedAttribute = skillMeta?.linkedAttribute || skillAttributeMap[originalSlug] || skillAttributeMap[normalizedName] || 'strength';
      const attributeValue = (actor.system as any).attributes?.[phantom.linkedAttribute] || 0;
      phantom.totalDicePool = attributeValue;
    }

    phantom.linkedAttributeLabel = game.i18n?.localize(`SRA2.ATTRIBUTES.${phantom.linkedAttribute.toUpperCase()}`) || phantom.linkedAttribute;
  }

  return phantomRRs.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generic handler to edit an item from an actor
 */
export async function handleEditItem(event: Event, actor: any): Promise<void> {
  console.log('[SheetHelpers.handleEditItem] Called', { event, actor });
  event.preventDefault();
  const element = event.currentTarget as HTMLElement;
  console.log('[SheetHelpers.handleEditItem] Element:', element);
  console.log('[SheetHelpers.handleEditItem] Element dataset:', element.dataset);

  const itemId = element.dataset.itemId || (element.closest('.metatype-item') as HTMLElement)?.getAttribute('data-item-id');
  console.log('[SheetHelpers.handleEditItem] ItemId:', itemId);

  if (!itemId) {
    console.warn('[SheetHelpers.handleEditItem] No itemId found!');
    return;
  }

  const item = actor.items.get(itemId);
  console.log('[SheetHelpers.handleEditItem] Item:', item);
  if (item) {
    console.log('[SheetHelpers.handleEditItem] Opening item sheet...');
    item.sheet?.render(true);
  } else {
    console.warn('[SheetHelpers.handleEditItem] Item not found in actor!');
  }
}

/**
 * Generic handler to delete an item from an actor
 */
export async function handleDeleteItem(event: Event, actor: any, sheetRender?: (refresh: boolean) => void): Promise<void> {
  console.log('[SheetHelpers.handleDeleteItem] Called', { event, actor });
  event.preventDefault();
  const element = event.currentTarget as HTMLElement;
  console.log('[SheetHelpers.handleDeleteItem] Element:', element);
  console.log('[SheetHelpers.handleDeleteItem] Element dataset:', element.dataset);

  const itemId = element.dataset.itemId || (element.closest('.metatype-item') as HTMLElement)?.getAttribute('data-item-id');
  console.log('[SheetHelpers.handleDeleteItem] ItemId:', itemId);

  if (!itemId) {
    console.warn('[SheetHelpers.handleDeleteItem] No itemId found!');
    return;
  }

  const item = actor.items.get(itemId);
  console.log('[SheetHelpers.handleDeleteItem] Item:', item);
  if (item) {
    console.log('[SheetHelpers.handleDeleteItem] Deleting item...');
    await item.delete();
    if (sheetRender) {
      console.log('[SheetHelpers.handleDeleteItem] Re-rendering sheet...');
      sheetRender(false);
    }
  } else {
    console.warn('[SheetHelpers.handleDeleteItem] Item not found in actor!');
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
 * Handles: FOR, FOR+X, numeric values, attribute+bonus format, and toxin
 * 
 * @param damageValueStr - The damage value string (e.g., "FOR", "FOR+2", "5", "agility+2", "toxin")
 * @param actorAttributes - The actor's attributes object (or just strength for backward compatibility)
 * @param damageValueBonus - Additional bonus from feats/items (default: 0)
 * @returns Parsed damage value result
 */
export function parseDamageValue(
  damageValueStr: string,
  actorAttributes: number | Record<string, number>,
  damageValueBonus: number = 0
): DamageValueResult {
  const result: DamageValueResult = {
    numericValue: 0,
    displayValue: damageValueStr,
    rawDamageString: damageValueStr,
    isStrengthBased: false,
    isToxin: false
  };

  // Handle backward compatibility: if actorAttributes is a number, treat it as strength
  let attributes: Record<string, number>;
  if (typeof actorAttributes === 'number') {
    attributes = { strength: actorAttributes };
  } else {
    attributes = actorAttributes || {};
  }
  
  const actorStrength = attributes.strength || 0;

  // Handle toxin damage
  if (damageValueStr === 'toxin') {
    result.isToxin = true;
    result.displayValue = game.i18n?.localize('SRA2.FEATS.WEAPON.TOXIN_DAMAGE') || 'according to toxin';
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

  // Handle attribute+bonus format (e.g., "agility+2", "willpower+1")
  if (damageValueStr.includes('+') && !damageValueStr.startsWith('FOR')) {
    const parts = damageValueStr.split('+');
    const attributeName = parts[0]?.trim();
    
    // Validate attribute name exists
    if (!attributeName) {
      // Fallback to numeric parsing if attribute name is missing
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
    
    // Parse bonus safely
    const bonusStr = parts[1];
    const bonus = (bonusStr !== undefined && bonusStr !== null) ? (parseInt(bonusStr) || 0) : 0;
    
    // Get attribute value safely
    const attributeValue = (attributes[attributeName] !== undefined && attributes[attributeName] !== null) 
      ? attributes[attributeName] 
      : 0;
    
    // Calculate numeric value
    result.numericValue = attributeValue + bonus + damageValueBonus;
    
    // Ensure we have a valid number
    if (isNaN(result.numericValue)) {
      result.numericValue = 0;
    }
    
    const attributeLabel = game.i18n?.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`) || attributeName;
    
    if (damageValueBonus > 0) {
      result.displayValue = `${result.numericValue} (${attributeLabel}+${bonus}+${damageValueBonus})`;
      result.rawDamageString = `${attributeName}+${bonus + damageValueBonus}`;
    } else {
      result.displayValue = `${result.numericValue} (${attributeLabel}+${bonus})`;
      result.rawDamageString = damageValueStr;
    }
    
    // Mark as strength-based if it's strength
    if (attributeName === 'strength') {
      result.isStrengthBased = true;
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
 * This returns the string to be used in roll requests (e.g., "FOR+3", "agility+2", or "7")
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

  // Handle attribute+bonus format (e.g., "agility+2")
  if (baseDamageValue.includes('+') && !baseDamageValue.startsWith('FOR')) {
    const parts = baseDamageValue.split('+');
    const attributeName = (parts[0] ?? '').trim();
    const baseBonus = parseInt(parts[1] ?? '0') || 0;
    return `${attributeName}+${baseBonus + damageValueBonus}`;
  }

  // Numeric value
  const baseValue = parseInt(baseDamageValue) || 0;
  return (baseValue + damageValueBonus).toString();
}

/**
 * Calculate final numeric damage value from damage string and actor attributes
 * This returns the actual numeric value to use in roll data (e.g., 5 instead of "agility+2")
 * 
 * @param damageValueStr - The damage value string (e.g., "FOR", "FOR+2", "5", "agility+2")
 * @param actorAttributes - The actor's attributes object
 * @param damageValueBonus - Additional bonus from feats/items (default: 0)
 * @returns The final numeric damage value
 */
export function calculateFinalNumericDamageValue(
  damageValueStr: string,
  actorAttributes: Record<string, number>,
  damageValueBonus: number = 0
): number {
  const parsed = parseDamageValue(damageValueStr, actorAttributes, damageValueBonus);
  return parsed.numericValue;
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
 * Returns 'system.damage' for character damage,
 * or 'system.cyberdeckDamage' for cyberdeck
 */
export function getDamagePathFromInputName(inputName: string): string {
  if (inputName.includes('cyberdeckDamage')) {
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
export function enrichFeats(feats: any[], actorStrength: number, calculateFinalDamageValueFn: (dv: string, bonus: number, str: number, allAttributes?: Record<string, number>) => string, actor?: any): any[] {
  return feats.map((feat: any) => {
    // Add translated labels for attribute targets in RR entries
    feat.rrEntries = [];
    const itemRRList: any[] = [];

    // For weapons and spells, also include RR from linked skills/specs/attributes
    let allRRList = [...itemRRList];

    if (actor && (feat.system.featType === 'weapon' || feat.system.featType === 'spell')) {
      const { normalizeSearchText } = ItemSearch;

      // Get linked skill and specialization from weapon
      const linkedAttackSkill = feat.system.linkedAttackSkill || '';
      const linkedAttackSpec = feat.system.linkedAttackSpecialization || '';

      let attackSpecName: string | undefined = undefined;
      let attackSkillName: string | undefined = undefined;
      let attackLinkedAttribute: string | undefined = undefined;

      // Try to find the linked attack specialization first (match by slug or normalized name)
      if (linkedAttackSpec) {
        const foundSpec = actor.items.find((i: any) =>
          i.type === 'specialization' &&
          (i.system?.slug === linkedAttackSpec || normalizeSearchText(i.name) === normalizeSearchText(linkedAttackSpec))
        );

        if (foundSpec) {
          const specSystem = foundSpec.system as any;
          attackSpecName = foundSpec.name;
          attackLinkedAttribute = specSystem.linkedAttribute || 'strength';

          // Get parent skill for specialization
          const linkedSkillName = specSystem.linkedSkill;
          if (linkedSkillName) {
            const parentSkill = actor.items.find((i: any) =>
              i.type === 'skill' && (i.name === linkedSkillName || i.system?.slug === linkedSkillName)
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
          rrLabel: rr.rrLabel,
          rrTarget: attackSpecName
        }))];
      }
      if (attackSkillName) {
        const skillRRSources = getRRSources(actor, 'skill', attackSkillName);
        allRRList = [...allRRList, ...skillRRSources.map(rr => ({
          rrType: 'skill',
          rrValue: rr.rrValue,
          rrLabel: rr.rrLabel,
          rrTarget: attackSkillName
        }))];
      }
      if (attackLinkedAttribute) {
        const attributeRRSources = getRRSources(actor, 'attribute', attackLinkedAttribute);
        allRRList = [...allRRList, ...attributeRRSources.map(rr => ({
          rrType: 'attribute',
          rrValue: rr.rrValue,
          rrLabel: rr.rrLabel,
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

    // Calculate final damage value for weapons, spells, and adept power weapons
    const isWeapon = feat.system.featType === 'weapon';
    const isSpell = feat.system.featType === 'spell';
    const isAdeptPowerWeapon = feat.system.isAdeptPowerWeapon || false;

    if (isWeapon || isSpell || isAdeptPowerWeapon) {
      const damageValue = feat.system.damageValue || '0';
      let damageValueBonus = feat.system.damageValueBonus || 0;

      // Add bonus from active feats that match the weapon's type
      // This applies to all weapons, including adept power weapons
      if (actor) {
        const weaponType = feat.system.weaponType || '';
        const activeFeats = actor.items.filter((item: any) =>
          item.type === 'feat' &&
          item.system.active === true &&
          item.system.weaponDamageBonus > 0 &&
          item.system.weaponTypeBonus === weaponType
        );

        activeFeats.forEach((activeFeat: any) => {
          damageValueBonus += activeFeat.system.weaponDamageBonus || 0;
        });
      }

      // Limit total bonus to 2 maximum
      damageValueBonus = Math.min(damageValueBonus, 2);

      // Get all actor attributes for damage calculation
      const actorAttributes = actor ? ((actor.system as any)?.attributes || {}) : { strength: actorStrength };
      
      // Call with all attributes if available, otherwise just strength
      if (actor && actorAttributes) {
        feat.finalDamageValue = calculateFinalDamageValueFn(damageValue, damageValueBonus, actorStrength, actorAttributes);
      } else {
        feat.finalDamageValue = calculateFinalDamageValueFn(damageValue, damageValueBonus, actorStrength);
      }
    }

    // Add narrative effects tooltip
    feat.narrativeEffectsTooltip = formatNarrativeEffectsTooltip(
      feat.system.narrativeEffects || [],
      feat.system.description,
      feat.rrEntries || [],
      feat.system
    );

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
  /** When true, targetSkill is a slug (e.g. 'sorcery') and lookup uses system.slug */
  lookupBySlug?: boolean;
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

  const { isSpell = false, spellSpecType = 'combat', defaultAttribute = 'strength', lookupBySlug = false } = options;

  // Try to find the linked attack specialization first
  if (targetSpec) {
    const normalizedTargetSpec = normalizeForComparison(targetSpec);

    const foundSpec = actor.items.find((i: any) => {
      if (i.type !== 'specialization') return false;
      // Match by slug first, then by normalized name
      if (i.system?.slug === targetSpec) return true;
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
    const foundSkill = lookupBySlug
      ? actor.items.find((i: any) => i.type === 'skill' && i.system.slug === targetSkill)
      : actor.items.find((i: any) =>
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
      // If lookupBySlug, resolve the slug to a localized name from world items/compendiums
      result.skillName = lookupBySlug ? _resolveSkillNameFromSlug(targetSkill) : targetSkill;
      result.linkedAttribute = result.linkedAttribute || defaultAttribute;
      const attributeValue = (actor.system as any).attributes?.[defaultAttribute] || 0;
      result.skillLevel = 0 + attributeValue; // Skill rating is 0 when skill doesn't exist
    }
  }

  return result;
}

/**
 * Resolve a skill slug to its localized name.
 * Uses the global cache built at startup, falls back to world items search.
 */
function _resolveSkillNameFromSlug(slug: string): string {
  // 1. Use global cache (built from compendiums + world items at startup)
  const cache = (globalThis as any).SRA2_SKILL_SLUG_CACHE;
  if (cache && cache[slug]) return cache[slug];

  // 2. Fallback: search world items directly
  if (game.items) {
    const worldSkill = (game.items as any).find((i: any) =>
      i.type === 'skill' && i.system.slug === slug
    );
    if (worldSkill) return worldSkill.name;
  }

  return slug;
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

  // Get parent skill for specialization (linkedSkill is now a slug)
  const linkedSkillName = specSystem.linkedSkill;
  if (linkedSkillName) {
    const parentSkill = actor.items.find((i: any) =>
      i.type === 'skill' && (i.system.slug === linkedSkillName || i.name === linkedSkillName)
    );
    if (parentSkill) {
      result.skillName = parentSkill.name;
      const foundAttr = result.linkedAttribute || defaultAttribute;
      const skillRating = (parentSkill.system as any).rating || 0;
      const attributeValue = (actor.system as any).attributes?.[foundAttr] || 0;
      const skillLevel = skillRating + attributeValue;
      result.skillLevel = skillLevel;
      result.specLevel = skillLevel + 2; // Specialization adds +2
    } else {
      // Skill not on actor: resolve name from world items / compendiums for display
      result.skillName = _resolveSkillNameFromSlug(linkedSkillName);
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
    if (linkedSkill === SKILL_SLUGS.SORCERY || ItemSearch.normalizeSearchText(linkedSkill) === 'sorcellerie') {
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
      if (linkedSkill === SKILL_SLUGS.SORCERY || (linkedSkill && ItemSearch.normalizeSearchText(linkedSkill) === 'sorcellerie')) {
        return normalizedKeywords.some(normalizedKeyword => normalizedName.includes(normalizedKeyword));
      }
      return false;
    });
  }

  if (specToUse) {
    const specSystem = specToUse.system as any;
    const linkedSkillName = specSystem.linkedSkill;

    if (linkedSkillName) {
      // linkedSkill is now a slug, so look up by slug first, fallback to name
      const parentSkill = actor.items.find((i: any) =>
        i.type === 'skill' && (i.system.slug === linkedSkillName || i.name === linkedSkillName)
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
 * Search in game.items for Sorcery skill (by slug)
 */
function _searchGameItemsForSorcellerie(actor: any, result: AttackSkillSpecResult): void {
  const sorcerySkillInGame = (game.items as any).find((i: any) =>
    i.type === 'skill' && i.system.slug === SKILL_SLUGS.SORCERY
  );

  if (sorcerySkillInGame) {
    result.skillName = sorcerySkillInGame.name;
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
  // Only count RR if the skill/spec actually exists on the actor
  let skillRRSources: Array<{ featName: string, rrValue: number }> = [];
  let specRRSources: Array<{ featName: string, rrValue: number }> = [];
  let attributeRRSources: Array<{ featName: string, rrValue: number }> = [];

  // Normalize itemName for comparison (to exclude RR from the current item)
  const normalizedItemName = itemName ? ItemSearch.normalizeSearchText(itemName) : '';

  // Only count RR from specialization if it actually exists on the actor
  // Check by verifying that specLevel is defined (which means the spec was found)
  if (skillSpecResult.specName && skillSpecResult.specLevel !== undefined) {
    // Also verify the spec actually exists on the actor
    const specExists = actor.items.some((item: any) =>
      item.type === 'specialization' &&
      ItemSearch.normalizeSearchText(item.name) === ItemSearch.normalizeSearchText(skillSpecResult.specName!)
    );
    if (specExists) {
      specRRSources = getRRSources(actor, 'specialization', skillSpecResult.specName)
        .filter((source: any) => {
          // Exclude RR from the current item to avoid double counting
          // (the item's RR are already in itemRRList)
          return normalizedItemName === '' || ItemSearch.normalizeSearchText(source.featName) !== normalizedItemName;
        });
    }
  }
  // Only count RR from skill if it actually exists on the actor
  // Check by verifying that skillLevel is defined and the skill exists
  // Note: We can count both skill RR and spec RR if both exist (they stack)
  if (skillSpecResult.skillName && skillSpecResult.skillLevel !== undefined) {
    // Verify the skill actually exists on the actor (not just using attribute level)
    const skillExists = actor.items.some((item: any) =>
      item.type === 'skill' &&
      ItemSearch.normalizeSearchText(item.name) === ItemSearch.normalizeSearchText(skillSpecResult.skillName!)
    );
    if (skillExists) {
      skillRRSources = getRRSources(actor, 'skill', skillSpecResult.skillName)
        .filter((source: any) => {
          // Exclude RR from the current item to avoid double counting
          return normalizedItemName === '' || ItemSearch.normalizeSearchText(source.featName) !== normalizedItemName;
        });
    }
  }
  // Always count attribute RR if we have a linked attribute (even if skill/spec don't exist, we can roll at attribute level)
  if (skillSpecResult.linkedAttribute) {
    attributeRRSources = getRRSources(actor, 'attribute', skillSpecResult.linkedAttribute)
      .filter((source: any) => {
        // Exclude RR from the current item to avoid double counting
        return normalizedItemName === '' || ItemSearch.normalizeSearchText(source.featName) !== normalizedItemName;
      });
  }

  // Convert item RR list to same format as getRRSources (objects with rrValue)
  const itemRRSources = itemRRList.map((rrEntry: any) => ({
    featName: itemName,
    rrValue: rrEntry.rrValue || 0,
    rrLabel: rrEntry.rrLabel || undefined
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
    (ItemSearch.normalizeSearchText(i.name) === normalizedName || i.system?.slug === skillName)
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

  // Match by slug first, then by normalized name
  const bySlug = actor.items.find((i: any) =>
    i.type === 'specialization' && i.system?.slug === specName
  );
  if (bySlug) return bySlug;

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
    (normalizeForComparison(i.name) === normalizedName || i.system?.slug === itemName)
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

  // Also find the skill's slug for matching against linkedSkill (which is now stored as a slug)
  const skillItem = actor.items.find((i: any) => i.type === 'skill' && ItemSearch.normalizeSearchText(i.name) === normalizedSkillName);
  const skillSlug = skillItem?.system?.slug || '';

  return actor.items.filter((i: any) => {
    if (i.type !== 'specialization') return false;
    const linkedSkill = (i.system as any)?.linkedSkill;
    if (!linkedSkill) return false;
    return ItemSearch.normalizeSearchText(linkedSkill) === normalizedSkillName ||
      (skillSlug && linkedSkill === skillSlug);
  });
}

/**
 * Toggle the bookmark status of an item
 * 
 * @param actor - The actor that owns the item
 * @param itemId - The ID of the item to toggle
 * @param sheet - The sheet instance to re-render (optional)
 * @returns Promise that resolves when the toggle is complete
 */
export async function toggleItemBookmark(actor: any, itemId: string, sheet?: any): Promise<boolean> {
  if (!actor || !itemId) {
    console.error('toggleItemBookmark: missing actor or itemId');
    return false;
  }

  const item = actor.items.get(itemId);
  if (!item) {
    console.error('toggleItemBookmark: item not found', itemId);
    return false;
  }

  const currentBookmarkState = (item.system as any).bookmarked || false;

  try {
    await (item as any).update({ 'system.bookmarked': !currentBookmarkState });

    // Re-render the sheet if provided
    if (sheet && typeof sheet.render === 'function') {
      sheet.render(false);
    }

    return true;
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    ui.notifications?.error(game.i18n?.localize('SRA2.BOOKMARKS.ERROR') || 'Error updating bookmark');
    return false;
  }
}

/**
 * Remove HTML tags from a string
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';
  // Remove HTML tags
  const stripped = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = stripped;
  return textarea.value.trim();
}

/**
 * Format narrative effects into a tooltip string
 */
export function formatNarrativeEffectsTooltip(narrativeEffects: any[], description?: string, rrEntries?: any[], featSystem?: any): string {
  const sections: string[] = [];

  // Add RR section if there are any RR entries
  if (rrEntries && rrEntries.length > 0) {
    const rrText: string[] = [];
    rrEntries.forEach((rr: any) => {
      if (rr.rrValue > 0) {
        const rrLabel = rr.rrTargetLabel || rr.rrTarget || '';
        rrText.push(`RR ${rr.rrValue} (${rrLabel})`);
      }
    });
    if (rrText.length > 0) {
      sections.push(game.i18n?.localize("SRA2.TOOLTIP.RR") + '\n' + rrText.join('\n'));
    }
  }

  // Add bonus section if feat system data is provided
  if (featSystem) {
    const bonusText: string[] = [];

    // Damage thresholds
    if (featSystem.bonusPhysicalThreshold && featSystem.bonusPhysicalThreshold !== 0) {
      const sign = featSystem.bonusPhysicalThreshold > 0 ? '+' : '';
      bonusText.push(game.i18n?.localize("SRA2.TOOLTIP.PHYSICAL_THRESHOLD") + ` ${sign}${featSystem.bonusPhysicalThreshold}`);
    }
    if (featSystem.bonusMentalThreshold && featSystem.bonusMentalThreshold !== 0) {
      const sign = featSystem.bonusMentalThreshold > 0 ? '+' : '';
      bonusText.push(game.i18n?.localize("SRA2.TOOLTIP.MENTAL_THRESHOLD") + ` ${sign}${featSystem.bonusMentalThreshold}`);
    }

    // Damage boxes
    if (featSystem.bonusLightDamage && featSystem.bonusLightDamage > 0) {
      bonusText.push(`+${featSystem.bonusLightDamage} ` + game.i18n?.localize("SRA2.TOOLTIP.LIGHT_WOUNDS"));
    }
    if (featSystem.bonusSevereDamage && featSystem.bonusSevereDamage > 0) {
      bonusText.push(`+${featSystem.bonusSevereDamage} ` + game.i18n?.localize("SRA2.TOOLTIP.SEVERE_WOUNDS"));
    }

    // Weapon damage bonus
    if (featSystem.weaponDamageBonus && featSystem.weaponDamageBonus > 0 && featSystem.weaponTypeBonus) {
      bonusText.push(`+${featSystem.weaponDamageBonus} VD ` + game.i18n?.localize("SRA2.TOOLTIP.WEAPON_DAMAGE") + ` ${featSystem.weaponTypeBonus}`);
    }

    // Ranges for weapons
    if (featSystem.featType === 'weapon' && featSystem.ranges) {
      const rangeLabels: string[] = [];
      if (featSystem.ranges.melee && featSystem.ranges.melee !== 'none') rangeLabels.push(game.i18n?.localize("SRA2.TOOLTIP.RANGE_MELEE") || 'Melee');
      if (featSystem.ranges.short && featSystem.ranges.short !== 'none') rangeLabels.push(game.i18n?.localize("SRA2.TOOLTIP.RANGE_SHORT") || 'Short');
      if (featSystem.ranges.medium && featSystem.ranges.medium !== 'none') rangeLabels.push(game.i18n?.localize("SRA2.TOOLTIP.RANGE_MEDIUM") || 'Medium');
      if (featSystem.ranges.long && featSystem.ranges.long !== 'none') rangeLabels.push(game.i18n?.localize("SRA2.TOOLTIP.RANGE_LONG") || 'Long');
      if (rangeLabels.length > 0) {
        bonusText.push(game.i18n?.localize("SRA2.TOOLTIP.RANGES") + ' ' + rangeLabels.join(', '));
      }
    }

    // Narration
    if (featSystem.grantsNarration) {
      const actions = featSystem.narrationActions || 1;
      const actionLabel = actions > 1 ? game.i18n?.localize("SRA2.TOOLTIP.ACTIONS") : game.i18n?.localize("SRA2.TOOLTIP.ACTION");
      bonusText.push(game.i18n?.localize("SRA2.TOOLTIP.GRANTS_NARRATION") + ` (${actions} ${actionLabel})`);
    }

    // Anarchy bonus
    if (featSystem.bonusAnarchy && featSystem.bonusAnarchy > 0) {
      bonusText.push(`+${featSystem.bonusAnarchy} ` + game.i18n?.localize("SRA2.TOOLTIP.ANARCHY_POINTS"));
    }

    // Sustained spells
    if (featSystem.sustainedSpellCount && featSystem.sustainedSpellCount > 0) {
      bonusText.push(`+${featSystem.sustainedSpellCount} ` + game.i18n?.localize("SRA2.TOOLTIP.SUSTAINED_SPELLS"));
    }

    // Summoned spirits
    if (featSystem.summonedSpiritCount && featSystem.summonedSpiritCount > 0) {
      bonusText.push(`+${featSystem.summonedSpiritCount} ` + game.i18n?.localize("SRA2.TOOLTIP.SUMMONED_SPIRITS"));
    }

    if (bonusText.length > 0) {
      sections.push(game.i18n?.localize("SRA2.TOOLTIP.BONUS") + '\n' + bonusText.join('\n'));
    }
  }

  // Add narrative effects section
  if (narrativeEffects && narrativeEffects.length > 0) {
    const effectsText: string[] = [];
    narrativeEffects.forEach((effect: any) => {
      if (effect && effect.text && effect.text.trim() !== '') {
        const value = effect.value || 1;
        effectsText.push(`${value}: ${effect.text}`);
      }
    });
    if (effectsText.length > 0) {
      sections.push(game.i18n?.localize("SRA2.TOOLTIP.NARRATIVE_EFFECTS") + '\n' + effectsText.join('\n'));
    }
  }

  // Add description section
  if (description) {
    const cleanDescription = stripHtmlTags(description);
    if (cleanDescription) {
      sections.push(game.i18n?.localize("SRA2.TOOLTIP.DESCRIPTION") + '\n' + cleanDescription);
    }
  }

  // Return combined sections or default message
  if (sections.length > 0) {
    return sections.join('\n\n');
  }

  return game.i18n?.localize("SRA2.SKILLS.NO_NARRATIVE_EFFECTS") || '';
}


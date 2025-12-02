import * as DiceRoller from '../helpers/dice-roller.js';
import * as ItemSearch from '../../../item-search.js';
import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as CombatHelpers from '../helpers/combat-helpers.js';
import { WEAPON_TYPES } from '../models/item-feat.js';

/**
 * Character Sheet Application
 */
export class CharacterSheet extends ActorSheet {
  /** Active section for tabbed navigation */
  private _activeSection: string = 'identity';

  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'character'],
      template: 'systems/sra2/templates/actor-character-sheet.hbs',
      width: 900,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: '.metatype-item', dropSelector: null },
        { dragSelector: '.feat-item', dropSelector: null },
        { dragSelector: '.skill-item', dropSelector: null },
        { dragSelector: '.specialization-item', dropSelector: null }
      ],
      submitOnChange: true,
    });
  }

  override async getData(): Promise<any> {
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
      // Ensure arrays exist and have at least the minimum length
      if (!Array.isArray(systemData.damage.light)) {
        systemData.damage.light = [false, false];
      } else if (systemData.damage.light.length < 2) {
        while (systemData.damage.light.length < 2) {
          systemData.damage.light.push(false);
        }
      }
      
      if (!Array.isArray(systemData.damage.severe)) {
        systemData.damage.severe = [false];
      }
      
      if (typeof systemData.damage.incapacitating !== 'boolean') {
        systemData.damage.incapacitating = false;
      }
    }
    
    // Ensure anarchySpent array is properly initialized
    if (!Array.isArray(systemData.anarchySpent)) {
      systemData.anarchySpent = [false, false, false];
    } else if (systemData.anarchySpent.length < 3) {
      while (systemData.anarchySpent.length < 3) {
        systemData.anarchySpent.push(false);
      }
    }

    // Get metatype (there should be only one)
    const metatypes = this.actor.items.filter((item: any) => item.type === 'metatype');
    context.metatype = metatypes.length > 0 ? metatypes[0] : null;

    // Get actor's strength for damage value calculations
    const actorStrength = (this.actor.system as any).attributes?.strength || 0;
    
    // Get feats and enrich with RR target labels and calculated damage values
    const rawFeats = this.actor.items.filter((item: any) => item.type === 'feat');
    const allFeats = SheetHelpers.enrichFeats(rawFeats, actorStrength, SheetHelpers.calculateFinalDamageValue, this.actor);
    
    // Get linked vehicle actors
    const linkedVehicleUuids = (this.actor.system as any).linkedVehicles || [];
    const linkedVehicles: any[] = [];
    for (const uuid of linkedVehicleUuids) {
      try {
        const vehicleActor = await fromUuid(uuid) as any;
        if (vehicleActor && vehicleActor.type === 'vehicle') {
          // Get weapons from vehicle
          const vehicleWeapons: any[] = [];
          const vehicleItems = vehicleActor.items || [];
          for (const item of vehicleItems) {
            const itemSystem = item.system as any;
            if (item.type === 'feat' && (itemSystem.featType === 'weapon' || itemSystem.featType === 'weapons-spells')) {
              // Enrich weapon with character's stats for display
              const enrichedWeapon = SheetHelpers.enrichFeats([item], actorStrength, SheetHelpers.calculateFinalDamageValue, this.actor)[0];
              vehicleWeapons.push({
                _id: item.id,
                uuid: item.uuid,
                name: item.name,
                img: item.img,
                type: 'vehicle-weapon',
                vehicleUuid: uuid,
                vehicleName: vehicleActor.name,
                weaponId: item.id,
                system: {
                  ...itemSystem,
                  finalDamageValue: enrichedWeapon.finalDamageValue,
                  rrEntries: enrichedWeapon.rrEntries || [],
                  crr: itemSystem.crr || 0 // Include CRR for display
                }
              });
            }
          }
          
          // Format vehicle actor data to match feat structure for template compatibility
          linkedVehicles.push({
            _id: vehicleActor.id,
            uuid: vehicleActor.uuid,
            name: vehicleActor.name,
            img: vehicleActor.img,
            type: 'vehicle-actor',
            system: {
              featType: 'vehicle',
              autopilot: vehicleActor.system?.attributes?.autopilot || 0,
              structure: vehicleActor.system?.attributes?.structure || 0,
              handling: vehicleActor.system?.attributes?.handling || 0,
              speed: vehicleActor.system?.attributes?.speed || 0,
              armor: vehicleActor.system?.attributes?.armor || 0,
              weaponInfo: vehicleActor.system?.weaponInfo || '',
              calculatedCost: vehicleActor.system?.calculatedCost || 0,
              description: vehicleActor.system?.description || ''
            },
            weapons: vehicleWeapons // Add weapons array to vehicle
          });
        }
      } catch (error) {
        console.warn(`Failed to load vehicle actor ${uuid}:`, error);
      }
    }
    
    // Group feats by type (vehicle feats + linked vehicle actors)
    const vehicleFeats = allFeats.filter((feat: any) => feat.system.featType === 'vehicle');
    
    // Enrich cyberdecks with damage thresholds
    const cyberdeckFeats = allFeats.filter((feat: any) => feat.system.featType === 'cyberdeck');
    cyberdeckFeats.forEach((cyberdeck: any) => {
      const firewall = cyberdeck.system.firewall || 1;
      cyberdeck.cyberdeckDamageThresholds = {
        light: firewall,
        severe: firewall * 2,
        incapacitating: firewall * 3
      };
      // Ensure cyberdeckDamage exists
      if (!cyberdeck.system.cyberdeckDamage) {
        cyberdeck.system.cyberdeckDamage = {
          light: [false, false],
          severe: [false],
          incapacitating: false
        };
      } else {
        // Ensure arrays exist and have correct length
        if (!Array.isArray(cyberdeck.system.cyberdeckDamage.light)) {
          cyberdeck.system.cyberdeckDamage.light = [false, false];
        } else if (cyberdeck.system.cyberdeckDamage.light.length < 2) {
          while (cyberdeck.system.cyberdeckDamage.light.length < 2) {
            cyberdeck.system.cyberdeckDamage.light.push(false);
          }
        }
        if (!Array.isArray(cyberdeck.system.cyberdeckDamage.severe)) {
          cyberdeck.system.cyberdeckDamage.severe = [false];
        }
        if (typeof cyberdeck.system.cyberdeckDamage.incapacitating !== 'boolean') {
          cyberdeck.system.cyberdeckDamage.incapacitating = false;
        }
      }
    });
    
    context.featsByType = {
      trait: allFeats.filter((feat: any) => feat.system.featType === 'trait'),
      contact: allFeats.filter((feat: any) => feat.system.featType === 'contact'),
      awakened: allFeats.filter((feat: any) => feat.system.featType === 'awakened'),
      adeptPower: allFeats.filter((feat: any) => feat.system.featType === 'adept-power'),
      equipment: allFeats.filter((feat: any) => feat.system.featType === 'equipment'),
      cyberware: allFeats.filter((feat: any) => feat.system.featType === 'cyberware'),
      cyberdeck: cyberdeckFeats,
      vehicle: [...vehicleFeats, ...linkedVehicles], // Combine vehicle feats and linked vehicle actors
      weaponsSpells: allFeats.filter((feat: any) => feat.system.featType === 'weapons-spells'),
      weapon: allFeats.filter((feat: any) => feat.system.featType === 'weapon'),
      spell: allFeats.filter((feat: any) => feat.system.featType === 'spell')
    };
    
    // Enrich weapons with dice pool and RR calculations (for V2 template)
    context.featsByType.weapon = context.featsByType.weapon.map((weapon: any) => {
      const weaponSystem = weapon.system as any;
      const weaponType = weaponSystem.weaponType;
      
      // Get weapon type and linked skills (same logic as _rollWeaponOrSpell)
      let weaponLinkedSkill = '';
      let weaponLinkedSpecialization = '';
      
      if (weaponType && weaponType !== 'custom-weapon') {
        const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
        if (weaponStats) {
          weaponLinkedSkill = weaponStats.linkedSkill || '';
          weaponLinkedSpecialization = weaponStats.linkedSpecialization || '';
        }
      }
      
      // Get final linked skills (from weapon type or custom)
      let finalAttackSkill = weaponLinkedSkill || weaponSystem.linkedAttackSkill || '';
      let finalAttackSpec = weaponLinkedSpecialization || weaponSystem.linkedAttackSpecialization || '';
      
      // Find actor's skill and specialization based on weapon links (same logic as _rollWeaponOrSpell)
      let attackSkillName: string | undefined = undefined;
      let attackSkillLevel: number | undefined = undefined;
      let attackSpecName: string | undefined = undefined;
      let attackSpecLevel: number | undefined = undefined;
      let attackLinkedAttribute: string | undefined = undefined;
      
      // Try to find the linked attack specialization first
      if (finalAttackSpec) {
        const normalizeForComparison = (text: string): string => {
          return ItemSearch.normalizeSearchText(text).replace(/\s+/g, '').replace(/:/g, '').replace(/'/g, '');
        };
        
        const normalizedTargetSpec = normalizeForComparison(finalAttackSpec);
        
        const foundSpec = this.actor.items.find((i: any) => {
          if (i.type !== 'specialization') return false;
          const normalizedItemName = normalizeForComparison(i.name);
          return normalizedItemName === normalizedTargetSpec;
        });
        
        if (foundSpec) {
          const specSystem = foundSpec.system as any;
          attackSpecName = foundSpec.name;
          attackLinkedAttribute = specSystem.linkedAttribute || 'strength';
          
          const linkedSkillName = specSystem.linkedSkill;
          if (linkedSkillName) {
            const parentSkill = this.actor.items.find((i: any) => 
              i.type === 'skill' && i.name === linkedSkillName
            );
            if (parentSkill && attackLinkedAttribute) {
              attackSkillName = parentSkill.name;
              const skillLevel = ((parentSkill.system as any).rating + (this.actor.system as any).attributes?.[attackLinkedAttribute]) || 0;
              attackSkillLevel = skillLevel;
              attackSpecLevel = skillLevel + 2; // Specialization adds +2
            }
          }
        }
      }
      
      // If no specialization found, try to find the linked attack skill
      if (!attackSpecName && finalAttackSkill) {
        const foundSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && 
          ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(finalAttackSkill)
        );
        
        if (foundSkill) {
          attackSkillName = foundSkill.name;
          const foundLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
          attackLinkedAttribute = foundLinkedAttribute;
          attackSkillLevel = ((foundSkill.system as any).rating || 0) + ((this.actor.system as any).attributes?.[foundLinkedAttribute] || 0);
        }
      }
      
      // Calculate dice pool: use spec level if available, otherwise skill level, otherwise 0
      const totalDicePool = attackSpecLevel || attackSkillLevel || 0;
      
      // Calculate total RR: same logic as _rollWeaponOrSpell
      // Get RR sources from skill/specialization/attribute
      let skillRRSources: Array<{featName: string, rrValue: number}> = [];
      let specRRSources: Array<{featName: string, rrValue: number}> = [];
      let attributeRRSources: Array<{featName: string, rrValue: number}> = [];
      
      if (attackSpecName) {
        specRRSources = SheetHelpers.getRRSources(this.actor, 'specialization', attackSpecName);
      }
      if (attackSkillName) {
        skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', attackSkillName);
      }
      if (attackLinkedAttribute) {
        attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', attackLinkedAttribute);
      }
      
      // Get item RR (from weapon itself)
      const rawItemRRList = weaponSystem.rrList || [];
      
      // Convert item RR list to same format as getRRSources (objects with rrValue)
      const itemRRSources = rawItemRRList.map((rrEntry: any) => ({
        featName: weapon.name, // The weapon itself
        rrValue: rrEntry.rrValue || 0
      }));
      
      // Merge all RR sources (item RR + skill/spec/attribute RR)
      const allRRSources = [...itemRRSources, ...specRRSources, ...skillRRSources, ...attributeRRSources];
      
      // Calculate total RR (sum of all RR values, max 3)
      const totalRR = Math.min(3, allRRSources.reduce((sum: number, source: any) => {
        return sum + (source.rrValue || 0);
      }, 0));
      
      // Add dice pool and RR to weapon
      weapon.totalDicePool = totalDicePool;
      weapon.rr = totalRR;
      
      // Also store spec info for potential specialization display later
      if (attackSpecName) {
        weapon.attackSpecName = attackSpecName;
        weapon.attackSpecLevel = attackSpecLevel;
      }
      
      return weapon;
    });
    
    // Enrich spells with dice pool and RR calculations (for V2 template)
    context.featsByType.spell = context.featsByType.spell.map((spell: any) => {
      const spellSystem = spell.system as any;
      const spellType = spellSystem.spellType || 'indirect';
      
      // For spells, always use Sorcellerie as the attack skill
      const finalAttackSkill = 'Sorcellerie';
      
      // Get spell specialization type and map it to the specialization name
      const spellSpecType = spellSystem.spellSpecializationType || 'combat';
      const spellSpecMap: Record<string, string> = {
        'combat': 'Spé: Sorts de combat',
        'detection': 'Spé: Sorts de détection',
        'health': 'Spé: Sorts de santé',
        'illusion': 'Spé: Sorts d\'illusion',
        'manipulation': 'Spé: Sorts de manipulation',
        'counterspell': 'Spé: Contresort'
      };
      const finalAttackSpec = spellSpecMap[spellSpecType] || 'Spé: Sorts de combat';
      
      // Find actor's skill and specialization based on spell links
      let attackSkillName: string | undefined = undefined;
      let attackSkillLevel: number | undefined = undefined;
      let attackSpecName: string | undefined = undefined;
      let attackSpecLevel: number | undefined = undefined;
      let attackLinkedAttribute: string | undefined = undefined;
      
      // Try to find the linked attack specialization first
      if (finalAttackSpec) {
        const normalizeForComparison = (text: string): string => {
          return ItemSearch.normalizeSearchText(text).replace(/\s+/g, '').replace(/:/g, '').replace(/'/g, '');
        };
        
        const normalizedTargetSpec = normalizeForComparison(finalAttackSpec);
        
        const foundSpec = this.actor.items.find((i: any) => {
          if (i.type !== 'specialization') return false;
          const normalizedItemName = normalizeForComparison(i.name);
          return normalizedItemName === normalizedTargetSpec;
        });
        
        if (foundSpec) {
          const specSystem = foundSpec.system as any;
          attackSpecName = foundSpec.name;
          attackLinkedAttribute = specSystem.linkedAttribute || 'willpower';
          
          const linkedSkillName = specSystem.linkedSkill;
          if (linkedSkillName) {
            const parentSkill = this.actor.items.find((i: any) => 
              i.type === 'skill' && i.name === linkedSkillName
            );
            if (parentSkill && attackLinkedAttribute) {
              attackSkillName = parentSkill.name;
              const skillLevel = ((parentSkill.system as any).rating + (this.actor.system as any).attributes?.[attackLinkedAttribute]) || 0;
              attackSkillLevel = skillLevel;
              attackSpecLevel = skillLevel + 2; // Specialization adds +2
            }
          }
        } else {
          // If exact match not found, try to find by partial match for spells
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
          const foundSpecByKeyword = this.actor.items.find((i: any) => {
            if (i.type !== 'specialization') return false;
            const normalizedName = ItemSearch.normalizeSearchText(i.name);
            const linkedSkill = (i.system as any)?.linkedSkill;
            if (linkedSkill && ItemSearch.normalizeSearchText(linkedSkill) === 'sorcellerie') {
              return normalizedKeywords.some(normalizedKeyword => normalizedName.includes(normalizedKeyword));
            }
            return false;
          });
          
          if (foundSpecByKeyword) {
            const specSystem = foundSpecByKeyword.system as any;
            attackSpecName = foundSpecByKeyword.name;
            attackLinkedAttribute = specSystem.linkedAttribute || 'willpower';
            
            const linkedSkillName = specSystem.linkedSkill;
            if (linkedSkillName) {
              const parentSkill = this.actor.items.find((i: any) => 
                i.type === 'skill' && i.name === linkedSkillName
              );
              if (parentSkill && attackLinkedAttribute) {
                attackSkillName = parentSkill.name;
                const skillLevel = ((parentSkill.system as any).rating + (this.actor.system as any).attributes?.[attackLinkedAttribute]) || 0;
                attackSkillLevel = skillLevel;
                attackSpecLevel = skillLevel + 2;
              }
            }
          }
        }
      }
      
      // If no specialization found, try to find the linked attack skill
      if (!attackSpecName && finalAttackSkill) {
        const foundSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && 
          ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(finalAttackSkill)
        );
        
        if (foundSkill) {
          attackSkillName = foundSkill.name;
          const foundLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'willpower';
          attackLinkedAttribute = foundLinkedAttribute;
          attackSkillLevel = ((foundSkill.system as any).rating || 0) + ((this.actor.system as any).attributes?.[foundLinkedAttribute] || 0);
        }
      }
      
      // Calculate dice pool: use spec level if available, otherwise skill level, otherwise 0
      const totalDicePool = attackSpecLevel || attackSkillLevel || 0;
      
      // Calculate total RR: same logic as weapons
      // Get RR sources from skill/specialization/attribute
      let skillRRSources: Array<{featName: string, rrValue: number}> = [];
      let specRRSources: Array<{featName: string, rrValue: number}> = [];
      let attributeRRSources: Array<{featName: string, rrValue: number}> = [];
      
      if (attackSpecName) {
        specRRSources = SheetHelpers.getRRSources(this.actor, 'specialization', attackSpecName);
      }
      if (attackSkillName) {
        skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', attackSkillName);
      }
      if (attackLinkedAttribute) {
        attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', attackLinkedAttribute);
      }
      
      // Get item RR (from spell itself)
      const rawItemRRList = spellSystem.rrList || [];
      
      // Convert item RR list to same format as getRRSources (objects with rrValue)
      const itemRRSources = rawItemRRList.map((rrEntry: any) => ({
        featName: spell.name, // The spell itself
        rrValue: rrEntry.rrValue || 0
      }));
      
      // Merge all RR sources (item RR + skill/spec/attribute RR)
      const allRRSources = [...itemRRSources, ...specRRSources, ...skillRRSources, ...attributeRRSources];
      
      // Calculate total RR (sum of all RR values, max 3)
      const totalRR = Math.min(3, allRRSources.reduce((sum: number, source: any) => {
        return sum + (source.rrValue || 0);
      }, 0));
      
      // Add dice pool and RR to spell
      spell.totalDicePool = totalDicePool;
      spell.rr = totalRR;
      
      // Also store spec info for potential specialization display later
      if (attackSpecName) {
        spell.attackSpecName = attackSpecName;
        spell.attackSpecLevel = attackSpecLevel;
      }
      
      return spell;
    });
    
    // Keep the feats array for backwards compatibility
    context.feats = allFeats;
    
    // Get bookmarked items (skills, specializations, weapons, spells)
    const bookmarkedItems = this.actor.items.filter((item: any) => 
      (item.type === 'skill' || item.type === 'specialization' || item.type === 'feat') && 
      item.system.bookmarked === true
    );
    context.bookmarkedItems = bookmarkedItems;
    
    // Get skills (sorted alphabetically)
    const skills = this.actor.items
      .filter((item: any) => item.type === 'skill')
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Get all specializations (sorted alphabetically)
    const allSpecializations = this.actor.items
      .filter((item: any) => item.type === 'specialization')
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Organize specializations by linked skill using helper
    const { bySkill: specializationsBySkill, unlinked: unlinkedSpecializations } = 
      SheetHelpers.organizeSpecializationsBySkill(allSpecializations, this.actor.items.contents);
    
    // Calculate RR for attributes first (needed for skills and specializations)
    const attributesRR = {
      strength: Math.min(3, this.calculateRR('attribute', 'strength')),
      agility: Math.min(3, this.calculateRR('attribute', 'agility')),
      willpower: Math.min(3, this.calculateRR('attribute', 'willpower')),
      logic: Math.min(3, this.calculateRR('attribute', 'logic')),
      charisma: Math.min(3, this.calculateRR('attribute', 'charisma'))
    };
    
    // Add specializations to each skill and calculate RR
    context.skills = skills.map((skill: any) => {
      // Get linked attribute label for the skill
      const linkedAttribute = skill.system?.linkedAttribute || 'strength';
      skill.linkedAttributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
      
      // Calculate RR for this skill (skill RR + attribute RR, max 3)
      const skillRR = this.calculateRR('skill', skill.name);
      const attributeRR = (attributesRR as any)[linkedAttribute] || 0;
      skill.rr = Math.min(3, skillRR + attributeRR);
      
      // Calculate total dice pool (attribute + skill rating)
      const attributeValue = (this.actor.system as any).attributes[linkedAttribute] || 0;
      const skillRating = skill.system?.rating || 0;
      skill.totalDicePool = attributeValue + skillRating;
      
      // Get specializations for this skill and add calculated ratings (sorted alphabetically)
      const specs = (specializationsBySkill.get(skill.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      skill.specializations = specs.map((spec: any) => {
        const parentRating = skill.system?.rating || 0;
        // Add properties directly to the spec object instead of creating a new one
        spec.parentRating = parentRating;
        spec.effectiveRating = parentRating + 2;  // Specialization adds +2 to skill rating
        spec.parentSkillName = skill.name;
        
        // Get linked attribute label for the specialization
        const specLinkedAttribute = spec.system?.linkedAttribute || 'strength';
        spec.linkedAttributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${specLinkedAttribute.toUpperCase()}`);
        
        // Calculate RR for this specialization (attribute RR + skill RR + spec RR, max 3)
        const specRR = this.calculateRR('specialization', spec.name);
        const specAttributeRR = (attributesRR as any)[specLinkedAttribute] || 0;
        const parentSkillRR = skillRR; // RR of the parent skill
        spec.rr = Math.min(3, specAttributeRR + parentSkillRR + specRR);
        
        // Calculate total dice pool (attribute + effective rating)
        const specAttributeValue = (this.actor.system as any).attributes[specLinkedAttribute] || 0;
        spec.totalDicePool = specAttributeValue + spec.effectiveRating;
        
        return spec;
      });
      return skill;
    });
    
    // Add unlinked specializations with attribute labels and RR (sorted alphabetically)
    context.unlinkedSpecializations = unlinkedSpecializations
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((spec: any) => {
      const linkedAttribute = spec.system?.linkedAttribute || 'strength';
      spec.linkedAttributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
      
      // Calculate RR for this specialization (spec RR + attribute RR, max 3)
      // Note: unlinked specializations don't have a parent skill, so only attribute + spec RR
      const specRR = this.calculateRR('specialization', spec.name);
      const attributeRR = (attributesRR as any)[linkedAttribute] || 0;
      spec.rr = Math.min(3, specRR + attributeRR);
      
      // Calculate total dice pool (attribute only, since no skill linked)
      const attributeValue = (this.actor.system as any).attributes[linkedAttribute] || 0;
      spec.totalDicePool = attributeValue;
      
      return spec;
    });
    
    // Store attributesRR in context
    context.attributesRR = attributesRR;

    // Add active section for navigation
    context.activeSection = this._activeSection;

    return context;
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    // Clean up document-level event listeners
    $(document).off('click.skill-search');
    $(document).off('click.feat-search');
    return super.close(options);
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Section navigation
    html.find('.section-nav .nav-item').on('click', this._onSectionNavigation.bind(this));

    // Edit metatype
    html.find('[data-action="edit-metatype"]').on('click', this._onEditMetatype.bind(this));
    
    // Delete metatype
    html.find('[data-action="delete-metatype"]').on('click', this._onDeleteMetatype.bind(this));

    // Edit feat
    html.find('[data-action="edit-feat"]').on('click', this._onEditFeat.bind(this));

    // Delete feat
    html.find('[data-action="delete-feat"]').on('click', this._onDeleteFeat.bind(this));

    // Open vehicle sheet
    html.find('[data-action="open-vehicle"]').on('click', this._onOpenVehicle.bind(this));

    // Unlink vehicle
    html.find('[data-action="unlink-vehicle"]').on('click', this._onUnlinkVehicle.bind(this));

    // Edit skill
    html.find('[data-action="edit-skill"]').on('click', this._onEditSkill.bind(this));

    // Delete skill
    html.find('[data-action="delete-skill"]').on('click', this._onDeleteSkill.bind(this));

    // Edit specialization
    html.find('[data-action="edit-specialization"]').on('click', this._onEditSpecialization.bind(this));

    // Delete specialization
    html.find('[data-action="delete-specialization"]').on('click', this._onDeleteSpecialization.bind(this));

    // Roll attribute
    html.find('[data-action="roll-attribute"]').on('click', this._onRollAttribute.bind(this));

    // Roll skill
    html.find('[data-action="roll-skill"]').on('click', this._onRollSkill.bind(this));

    // Quick roll skill (from dice badge)
    html.find('[data-action="quick-roll-skill"]').on('click', this._onQuickRollSkill.bind(this));

    // Roll specialization
    html.find('[data-action="roll-specialization"]').on('click', this._onRollSpecialization.bind(this));

    // Quick roll specialization (from dice badge)
    html.find('[data-action="quick-roll-specialization"]').on('click', this._onQuickRollSpecialization.bind(this));

    // Send catchphrase to chat
    html.find('[data-action="send-catchphrase"]').on('click', this._onSendCatchphrase.bind(this));
    
    // Toggle bookmark - use event delegation to work with dynamically rendered items
    html.on('click', '[data-action="toggle-bookmark"]', this._onToggleBookmark.bind(this));
    
    // Click on bookmarked item in header
    html.find('.bookmark-item').on('click', this._onBookmarkItemClick.bind(this));
    
    // Handle damage tracker checkboxes - explicit handler to ensure data is saved
    html.find('input[name^="system.damage"]').on('change', this._onDamageChange.bind(this));
    html.find('input[name^="system.anarchySpent"]').on('change', this._onAnarchyChange.bind(this));
    
    // Handle cyberdeck damage tracker checkboxes
    html.find('input[name*=".cyberdeckDamage."]').on('change', this._onCyberdeckDamageChange.bind(this));

    // Roll weapon
    html.find('[data-action="roll-weapon"]').on('click', this._onRollWeapon.bind(this));

    // Roll spell
    html.find('[data-action="roll-spell"]').on('click', this._onRollSpell.bind(this));

    // Roll weapon/spell (old type)
    html.find('[data-action="roll-weapon-spell"]').on('click', this._onRollWeaponSpell.bind(this));

    // Roll vehicle weapon (mounted weapon using character skills)
    html.find('[data-action="roll-vehicle-weapon"]').on('click', this._onRollVehicleWeaponFromSheet.bind(this));

    // Handle rating changes
    html.find('.rating-input').on('change', this._onRatingChange.bind(this));

    // Skill search
    html.find('.skill-search-input').on('input', this._onSkillSearch.bind(this));
    html.find('.skill-search-input').on('focus', this._onSkillSearchFocus.bind(this));
    html.find('.skill-search-input').on('blur', this._onSkillSearchBlur.bind(this));
    
    // Close skill search results when clicking outside
    $(document).on('click.skill-search', (event) => {
      const target = event.target as unknown as HTMLElement;
      const skillSearchContainer = html.find('.skill-search-container')[0] as HTMLElement;
      if (skillSearchContainer && !skillSearchContainer.contains(target)) {
        html.find('.skill-search-results').hide();
      }
    });

    // Feat search
    html.find('.feat-search-input').on('input', this._onFeatSearch.bind(this));
    html.find('.feat-search-input').on('focus', this._onFeatSearchFocus.bind(this));
    html.find('.feat-search-input').on('blur', this._onFeatSearchBlur.bind(this));
    
    // Close feat search results when clicking outside
    $(document).on('click.feat-search', (event) => {
      const target = event.target as unknown as HTMLElement;
      const featSearchContainer = html.find('.feat-search-container')[0] as HTMLElement;
      if (featSearchContainer && !featSearchContainer.contains(target)) {
        html.find('.feat-search-results').hide();
      }
    });

    // Make feat items draggable
    html.find('.feat-item').each((_index, item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', this._onDragStart.bind(this));
    });

    // Make skill items draggable
    html.find('.skill-item').each((_index, item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', this._onDragStart.bind(this));
    });

    // Make specialization items draggable
    html.find('.specialization-item').each((_index, item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', this._onDragStart.bind(this));
    });

    // Make vehicle actor items draggable
    html.find('.vehicle-actor-item').each((_index, item) => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', this._onDragStart.bind(this));
    });
  }

  /**
   * Handle form submission to update actor data
   */
  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    // Expand form data (handles nested properties like "system.attribute.strength")
    const expandedData = foundry.utils.expandObject(formData) as any;
    // Don't process damage here - _onDamageChange handles it directly
    // Remove damage from expandedData if present to avoid conflicts
    if (expandedData.system?.damage !== undefined) {
      delete expandedData.system.damage;
    }
    return this.actor.update(expandedData);
  }

  /**
   * Handle section navigation
   */
  private _onSectionNavigation(event: Event): void {
    event.preventDefault();
    const button = event.currentTarget as HTMLElement;
    const section = button.dataset.section;
    
    if (!section) return;
    
    // Update active section
    this._activeSection = section;
    
    // Update UI
    const form = $(this.form);
    form.find('.section-nav .nav-item').removeClass('active');
    button.classList.add('active');
    
    form.find('.content-section').removeClass('active');
    form.find(`[data-section-content="${section}"]`).addClass('active');
  }

  // Generic item handlers using SheetHelpers
  private async _onEditMetatype(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteMetatype(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor, this.render.bind(this)); }
  private async _onEditFeat(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteFeat(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor); }
  private async _onEditSkill(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteSkill(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor); }
  private async _onEditSpecialization(event: Event): Promise<void> { return SheetHelpers.handleEditItem(event, this.actor); }
  private async _onDeleteSpecialization(event: Event): Promise<void> { return SheetHelpers.handleDeleteItem(event, this.actor); }

  /**
   * Handle opening a linked vehicle actor sheet
   */
  private async _onOpenVehicle(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const vehicleUuid = element.dataset.vehicleUuid;
    
    if (!vehicleUuid) return;
    
    try {
      const vehicleActor = await fromUuid(vehicleUuid) as any;
      if (vehicleActor && vehicleActor.sheet) {
        vehicleActor.sheet.render(true);
      }
    } catch (error) {
      console.error('Error opening vehicle sheet:', error);
      ui.notifications?.error('Erreur lors de l\'ouverture de la fiche du véhicule');
    }
  }

  /**
   * Handle unlinking a vehicle actor from the character
   */
  private async _onUnlinkVehicle(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const vehicleUuid = element.dataset.vehicleUuid;
    
    if (!vehicleUuid) return;
    
    const linkedVehicles = (this.actor.system as any).linkedVehicles || [];
    const updatedLinkedVehicles = linkedVehicles.filter((uuid: string) => uuid !== vehicleUuid);
    
    await this.actor.update({ 'system.linkedVehicles': updatedLinkedVehicles });
    
    // Optionally unlink the vehicle's token prototype (set actorLink to false)
    try {
      const vehicleActor = await fromUuid(vehicleUuid) as any;
      if (vehicleActor) {
        await vehicleActor.update({ 'prototypeToken.actorLink': false });
      }
    } catch (error) {
      console.warn('Could not update vehicle token prototype:', error);
      // Continue anyway - unlinking from character is more important
    }
    
    ui.notifications?.info(game.i18n!.localize('SRA2.FEATS.VEHICLE_UNLINKED'));
  }

  /**
   * Get detailed RR sources for a given skill, specialization, or attribute
   */
  private getRRSources(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{featName: string, rrValue: number}> {
    return SheetHelpers.getRRSources(this.actor, itemType, itemName);
  }

  /**
   * Calculate Risk Reduction (RR) from active feats for a given skill, specialization, or attribute
   */
  private calculateRR(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): number {
    return SheetHelpers.calculateRR(this.actor, itemType, itemName);
  }

  /**
   * Handle rating changes for items
   */
  private async _onRatingChange(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLInputElement;
    const itemId = element.dataset.itemId;
    const newRating = parseInt(element.value);
    
    if (!itemId || isNaN(newRating)) return;

    const item = this.actor.items.get(itemId);
    if (item) {
      await item.update({ system: { rating: newRating } } as any);
    }
  }

  /**
   * Handle rolling a specialization
   */
  private async _onRollSpecialization(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    const effectiveRating = parseInt(element.dataset.effectiveRating || '0');
    
    if (!itemId) return;

    const specialization = this.actor.items.get(itemId);
    if (!specialization || specialization.type !== 'specialization') return;

    const specSystem = specialization.system as any;
    const linkedAttribute = specSystem.linkedAttribute || 'strength';
    const linkedSkillName = specSystem.linkedSkill;
    const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
    
    // Get the linked skill to get its rating
    const linkedSkill = linkedSkillName ? this.actor.items.find((i: any) => i.type === 'skill' && i.name === linkedSkillName) : null;
    const skillRating = linkedSkill ? (linkedSkill.system as any).rating || 0 : 0;
    
    // Get RR sources
    const specRRSources = this.getRRSources('specialization', specialization.name);
    const attributeRRSources = this.getRRSources('attribute', linkedAttribute);
    const skillRRSources = linkedSkillName ? this.getRRSources('skill', linkedSkillName) : [];
    const allRRSources = [...specRRSources, ...skillRRSources, ...attributeRRSources];

    DiceRoller.handleRollRequest({
      itemType: 'specialization',
      itemName: specialization.name,
      itemId: specialization.id,
      specName: specialization.name,
      specLevel: attributeValue + effectiveRating,  // Total dice pool (attribute + effectiveRating)
      skillName: linkedSkillName,
      skillLevel: skillRating,  // Just the skill rating (without attribute)
      linkedAttribute: linkedAttribute,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: allRRSources
    });
  }

  /**
   * Handle quick rolling a skill (from dice badge click) - opens dialog
   */
  private async _onQuickRollSkill(event: Event): Promise<void> {
    // Simply call the regular roll skill function which opens the dialog
    return this._onRollSkill(event);
  }

  /**
   * Handle quick rolling a specialization (from dice badge click) - opens dialog
   */
  private async _onQuickRollSpecialization(event: Event): Promise<void> {
    // Simply call the regular roll specialization function which opens the dialog
    return this._onRollSpecialization(event);
  }


  /**
   * Handle rolling an attribute
   */
  private async _onRollAttribute(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const attributeName = element.dataset.attribute;
    
    if (!attributeName) return;

    const attributeValue = (this.actor.system as any).attributes?.[attributeName] || 0;
    const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`);

    // Get RR sources for this attribute
    const rrSources = this.getRRSources('attribute', attributeName);

    DiceRoller.handleRollRequest({
      itemType: 'attribute',
      itemName: attributeLabel,
      skillName: attributeLabel,
      skillLevel: attributeValue,
      linkedAttribute: attributeName,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: rrSources
    });
  }

  /**
   * Handle rolling a skill
   */
  private async _onRollSkill(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) return;

    const skill = this.actor.items.get(itemId);
    if (!skill || skill.type !== 'skill') return;

    const skillSystem = skill.system as any;
    const rating = skillSystem.rating || 0;
    const linkedAttribute = skillSystem.linkedAttribute || 'strength';
    const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;

    // Get RR sources for skill and attribute
    const skillRRSources = this.getRRSources('skill', skill.name);
    const attributeRRSources = this.getRRSources('attribute', linkedAttribute);
    const allRRSources = [...skillRRSources, ...attributeRRSources];

    DiceRoller.handleRollRequest({
      itemType: 'skill',
      itemName: skill.name,
      itemId: skill.id,
      itemRating: rating,
      skillName: skill.name,
      skillLevel: attributeValue + rating,  // Total dice pool (attribute + rating)
      linkedAttribute: linkedAttribute,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: allRRSources
    });
  }

  /**
   * Apply damage to a defender
   * Delegates to CombatHelpers.applyDamage
   */
  static async applyDamage(defenderUuid: string, damageValue: number, defenderName: string, damageType: 'physical' | 'mental' = 'physical'): Promise<void> {
    return CombatHelpers.applyDamage(defenderUuid, damageValue, defenderName, damageType);
  }

  /**
   * Handle drag start for feat items and vehicle actors
   * For vehicle actors, allow dragging them to the map
   */
  protected override _onDragStart(event: DragEvent): void {
    const itemId = (event.currentTarget as HTMLElement).dataset.itemId;
    const vehicleUuid = (event.currentTarget as HTMLElement).dataset.vehicleUuid;
    
    // Check if this is a linked vehicle actor
    if (vehicleUuid) {
      const dragData = {
        type: 'Actor',
        uuid: vehicleUuid,
      };
      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
      return;
    }
    
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Check if this is a vehicle feat that references a vehicle actor
    if (item.type === 'feat' && (item.system as any).featType === 'vehicle') {
      const vehicleActorUuid = (item.system as any).vehicleActorUuid;
      if (vehicleActorUuid) {
        // Allow dragging the vehicle actor to the map
        const dragData = {
          type: 'Actor',
          uuid: vehicleActorUuid,
        };
        event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
        return;
      }
    }

    // Default: drag the item itself
    const dragData = {
      type: 'Item',
      uuid: item.uuid,
    };

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  /**
   * Override to handle dropping feats, skills, and vehicle actors anywhere on the sheet
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    // First try to handle item drops (feats, skills, etc.)
    const handled = await SheetHelpers.handleItemDrop(event, this.actor);
    if (handled) return undefined;
    
    // Then try to handle vehicle actor drops
    const vehicleHandled = await SheetHelpers.handleVehicleActorDrop(event, this.actor);
    if (vehicleHandled) return undefined;
    
    return super._onDrop(event);
  }

  /**
   * Handle skill search input
   */
  private searchTimeout: any = null;
  
  private async _onSkillSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.searchTimeout = setTimeout(async () => {
      await this._performSkillSearch(searchTerm, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual skill search in compendiums and world items
   */
  private async _performSkillSearch(searchTerm: string, resultsDiv: HTMLElement): Promise<void> {
    // Store search term for potential creation
    this.lastSearchTerm = searchTerm;
    
    // Use the helper function to search everywhere
    const existingItemsCheck = (itemName: string) => 
      ItemSearch.itemExistsOnActor(this.actor, 'skill', itemName);
    
    const results = await ItemSearch.searchItemsEverywhere(
      'skill',
      searchTerm,
      undefined,
      existingItemsCheck
    );
    
    // Display results
    this._displaySkillSearchResults(results, resultsDiv);
  }

  /**
   * Display skill search results
   */
  private lastSearchTerm: string = '';
  
  private _displaySkillSearchResults(results: any[], resultsDiv: HTMLElement): void {
    // Check if exact match exists on the actor
    const formattedSearchTerm = this.lastSearchTerm
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const exactMatchOnActor = this.actor.items.find((i: any) => 
      i.type === 'skill' && ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(this.lastSearchTerm)
    );
    
    let html = '';
    
    // If no results at all, show only the create button with message
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SKILLS.SEARCH_NO_RESULTS')}
          </div>
          <button class="create-skill-btn" data-skill-name="${this.lastSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n!.localize('SRA2.SKILLS.CREATE_SKILL')}
          </button>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        const disabledClass = result.alreadyExists ? 'disabled' : '';
        const buttonText = result.alreadyExists ? '✓' : game.i18n!.localize('SRA2.SKILLS.ADD_SKILL');
        
        html += `
          <div class="search-result-item ${disabledClass}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source}</span>
            </div>
            <button class="add-skill-btn" data-uuid="${result.uuid}" ${result.alreadyExists ? 'disabled' : ''}>
              ${buttonText}
            </button>
          </div>
        `;
      }
      
      // Add create button if exact match doesn't exist on actor
      if (!exactMatchOnActor) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n!.localize('SRA2.SKILLS.CREATE_NEW')}</span>
            </div>
            <button class="create-skill-btn-inline" data-skill-name="${this.lastSearchTerm}">
              ${game.i18n!.localize('SRA2.SKILLS.CREATE')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Attach click handlers to buttons
    $(resultsDiv).find('.add-skill-btn').on('click', this._onAddSkillFromSearch.bind(this));
    $(resultsDiv).find('.create-skill-btn, .create-skill-btn-inline').on('click', this._onCreateNewSkill.bind(this));
    
    // Make entire result items clickable (except disabled ones and create button)
    $(resultsDiv).find('.search-result-item:not(.disabled):not(.no-results-create):not(.create-new-item)').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.add-skill-btn').length > 0) return;
      
      // Find the button in this item and trigger its click
      const button = $(event.currentTarget).find('.add-skill-btn')[0] as HTMLButtonElement;
      if (button && !button.disabled) {
        $(button).trigger('click');
      }
    });
    
    // Make create items clickable on the entire row
    $(resultsDiv).find('.search-result-item.create-new-item').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.create-skill-btn-inline').length > 0) return;
      
      // Find the button and trigger its click
      const button = $(event.currentTarget).find('.create-skill-btn-inline')[0];
      if (button) {
        $(button).trigger('click');
      }
    });
  }

  /**
   * Handle adding a skill from search results
   */
  private async _onAddSkillFromSearch(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const uuid = button.dataset.uuid;
    
    if (!uuid) return;
    
    // Get the skill from the compendium
    const skill = await fromUuid(uuid as any) as any;
    
    if (!skill) {
      ui.notifications?.error('Skill not found');
      return;
    }
    
    // Check if skill already exists
    const existingSkill = this.actor.items.find((i: any) => 
      i.type === 'skill' && i.name === skill.name
    );
    
    if (existingSkill) {
      ui.notifications?.warn(game.i18n!.format('SRA2.SKILLS.ALREADY_EXISTS', { name: skill.name }));
      return;
    }
    
    // Add the skill to the actor
    await this.actor.createEmbeddedDocuments('Item', [skill.toObject()]);
    
    // Mark button as added
    button.textContent = '✓';
    button.disabled = true;
    button.closest('.search-result-item')?.classList.add('disabled');
    
    ui.notifications?.info(`${skill.name} ${game.i18n!.localize('SRA2.SKILLS.ADD_SKILL')}`);
  }

  /**
   * Handle skill search focus
   */
  private _onSkillSearchFocus(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
    
    return Promise.resolve();
  }

  /**
   * Handle skill search blur
   */
  private _onSkillSearchBlur(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        // Check if the related target (where focus is going) is inside the results div
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          // Don't hide if focus is moving to an element within the results
          return;
        }
        
        // Also check if any element in the results is focused
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          // Don't hide if an element in results is active
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, 200);
    
    return Promise.resolve();
  }

  /**
   * Handle creating a new skill from search
   */
  private async _onCreateNewSkill(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const skillName = button.dataset.skillName;
    
    if (!skillName) return;
    
    // Capitalize first letter of each word
    const formattedName = skillName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Create the new skill with default values
    const skillData = {
      name: formattedName,
      type: 'skill',
      system: {
        rating: 1,
        linkedAttribute: 'strength',
        description: ''
      }
    } as any;
    
    // Add the skill to the actor
    const createdItems = await this.actor.createEmbeddedDocuments('Item', [skillData]) as any;
    
    if (createdItems && createdItems.length > 0) {
      const newSkill = createdItems[0] as any;
      
      // Clear the search input and hide results
      const searchInput = this.element.find('.skill-search-input')[0] as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }
      
      const resultsDiv = this.element.find('.skill-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        resultsDiv.style.display = 'none';
      }
      
      // Open the skill sheet for editing
      if (newSkill && newSkill.sheet) {
        setTimeout(() => {
          newSkill.sheet.render(true);
        }, 100);
      }
      
      ui.notifications?.info(game.i18n!.format('SRA2.SKILLS.SKILL_CREATED', { name: formattedName }));
    }
  }

  /**
   * FEAT SEARCH FUNCTIONS
   */
  
  private featSearchTimeout: any = null;
  private lastFeatSearchTerm: string = '';
  
  /**
   * Handle feat search input
   */
  private async _onFeatSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const resultsDiv = $(input).siblings('.feat-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this.featSearchTimeout) {
      clearTimeout(this.featSearchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.featSearchTimeout = setTimeout(async () => {
      await this._performFeatSearch(searchTerm, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual feat search in compendiums and world items
   */
  private async _performFeatSearch(searchTerm: string, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    
    // Store search term for potential creation
    this.lastFeatSearchTerm = searchTerm;
    
    // Search in world items first
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === 'feat' && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          // Check if feat already exists on actor
          const existingFeat = this.actor.items.find((i: any) => 
            i.type === 'feat' && i.name === item.name
          );
          
          results.push({
            name: item.name,
            uuid: item.uuid,
            pack: game.i18n!.localize('SRA2.FEATS.WORLD_ITEMS'),
            featType: item.system.featType,
            exists: !!existingFeat
          });
        }
      }
    }
    
    // Search in all compendiums
    for (const pack of game.packs as any) {
      // Only search in Item compendiums
      if (pack.documentName !== 'Item') continue;
      
      // Get all documents from the pack
      const documents = await pack.getDocuments();
      
      // Filter for feats that match the search term
      for (const doc of documents) {
        if (doc.type === 'feat' && ItemSearch.normalizeSearchText(doc.name).includes(searchTerm)) {
          // Check if feat already exists on actor
          const existingFeat = this.actor.items.find((i: any) => 
            i.type === 'feat' && i.name === doc.name
          );
          
          results.push({
            name: doc.name,
            uuid: doc.uuid,
            pack: pack.title,
            featType: doc.system.featType,
            exists: !!existingFeat
          });
        }
      }
    }
    
    // Display results
    this._displayFeatSearchResults(results, resultsDiv);
  }

  /**
   * Display feat search results
   */
  private _displayFeatSearchResults(results: any[], resultsDiv: HTMLElement): Promise<void> {
    // Check if exact match exists on the actor
    const formattedSearchTerm = this.lastFeatSearchTerm
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const exactMatchOnActor = this.actor.items.find((i: any) => 
      i.type === 'feat' && ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(this.lastFeatSearchTerm)
    );
    
    let html = '';
    
    // If no results at all, show only the create button with message and type selector
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.FEATS.SEARCH_NO_RESULTS')}
          </div>
          <select class="feat-type-selector">
            <option value="equipment">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.EQUIPMENT')}</option>
            <option value="trait">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.TRAIT')}</option>
            <option value="contact">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CONTACT')}</option>
            <option value="awakened">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.AWAKENED')}</option>
            <option value="adept-power">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.ADEPT_POWER')}</option>
            <option value="cyberware">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERWARE')}</option>
            <option value="cyberdeck">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERDECK')}</option>
            <option value="vehicle">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.VEHICLE')}</option>
            <option value="weapons-spells">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS')}</option>
            <option value="weapon">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPON')}</option>
            <option value="spell">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.SPELL')}</option>
          </select>
          <button class="create-feat-btn" data-feat-name="${this.lastFeatSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n!.localize('SRA2.FEATS.CREATE')}
          </button>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        const disabledClass = result.exists ? 'disabled' : '';
        const buttonText = result.exists ? '✓' : game.i18n!.localize('SRA2.FEATS.ADD_FEAT');
        const featTypeLabel = game.i18n!.localize(`SRA2.FEATS.FEAT_TYPE.${result.featType.toUpperCase().replace('-', '_')}`);
        
        html += `
          <div class="search-result-item ${disabledClass}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.pack} - ${featTypeLabel}</span>
            </div>
            <button class="add-feat-btn" data-uuid="${result.uuid}" ${result.exists ? 'disabled' : ''}>
              ${buttonText}
            </button>
          </div>
        `;
      }
      
      // Add create button if exact match doesn't exist on actor
      if (!exactMatchOnActor) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n!.localize('SRA2.FEATS.CREATE_NEW')}</span>
            </div>
            <select class="feat-type-selector-inline">
              <option value="equipment">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.EQUIPMENT')}</option>
              <option value="trait">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.TRAIT')}</option>
              <option value="contact">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CONTACT')}</option>
              <option value="awakened">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.AWAKENED')}</option>
              <option value="adept-power">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.ADEPT_POWER')}</option>
              <option value="cyberware">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERWARE')}</option>
              <option value="cyberdeck">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERDECK')}</option>
              <option value="vehicle">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.VEHICLE')}</option>
              <option value="weapons-spells">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS')}</option>
              <option value="weapon">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPON')}</option>
              <option value="spell">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.SPELL')}</option>
            </select>
            <button class="create-feat-btn-inline" data-feat-name="${this.lastFeatSearchTerm}">
              ${game.i18n!.localize('SRA2.FEATS.CREATE')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Attach click handlers
    $(resultsDiv).find('.add-feat-btn').on('click', this._onAddFeatFromSearch.bind(this));
    $(resultsDiv).find('.create-feat-btn, .create-feat-btn-inline').on('click', this._onCreateNewFeat.bind(this));
    
    // Make entire result items clickable (except disabled ones and create button)
    $(resultsDiv).find('.search-result-item:not(.disabled):not(.no-results-create):not(.create-new-item)').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.add-feat-btn').length > 0) return;
      
      // Find the button in this item and trigger its click
      const button = $(event.currentTarget).find('.add-feat-btn')[0] as HTMLButtonElement;
      if (button && !button.disabled) {
        $(button).trigger('click');
      }
    });
    
    // Make create items clickable on the entire row
    $(resultsDiv).find('.search-result-item.create-new-item').on('click', (event) => {
      // Don't trigger if clicking directly on the button or select
      if ($(event.target).closest('.create-feat-btn-inline, .feat-type-selector-inline').length > 0) return;
      
      // Find the button and trigger its click
      const button = $(event.currentTarget).find('.create-feat-btn-inline')[0];
      if (button) {
        $(button).trigger('click');
      }
    });
    
    return Promise.resolve();
  }

  /**
   * Handle adding a feat from search results
   */
  private async _onAddFeatFromSearch(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const uuid = button.dataset.uuid;
    
    if (!uuid) return;
    
    // Get the feat from the compendium
    const feat = await fromUuid(uuid as any) as any;
    
    if (!feat) {
      ui.notifications?.error('Feat not found');
      return;
    }
    
    // Check if feat already exists
    const existingFeat = this.actor.items.find((i: any) => 
      i.type === 'feat' && i.name === feat.name
    );
    
    if (existingFeat) {
      ui.notifications?.warn(game.i18n!.format('SRA2.FEATS.ALREADY_EXISTS', { name: feat.name }));
      return;
    }
    
    // Add the feat to the actor
    await this.actor.createEmbeddedDocuments('Item', [feat.toObject()]);
    
    // Mark button as added
    button.textContent = '✓';
    button.disabled = true;
    button.closest('.search-result-item')?.classList.add('disabled');
    
    ui.notifications?.info(`${feat.name} ${game.i18n!.localize('SRA2.FEATS.ADD_FEAT')}`);
  }

  /**
   * Handle feat search focus
   */
  private _onFeatSearchFocus(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings('.feat-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
    
    return Promise.resolve();
  }

  /**
   * Handle feat search blur
   */
  private _onFeatSearchBlur(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = $(input).siblings('.feat-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        // Check if the related target (where focus is going) is inside the results div
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          // Don't hide if focus is moving to an element within the results
          return;
        }
        
        // Also check if any select element in the results is focused
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          // Don't hide if a select or other element in results is active
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, 200);
    
    return Promise.resolve();
  }

  /**
   * Handle sending a catchphrase to chat
   */
  private async _onSendCatchphrase(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const catchphrase = element.dataset.catchphrase;
    
    if (!catchphrase) return;

    // Create the chat message
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="sra2-catchphrase">${catchphrase}</div>`
    };
    
    await ChatMessage.create(messageData as any);
  }
  
  /**
   * Handle damage tracker checkbox changes
   */
  private async _onDamageChange(event: Event): Promise<void> {
    event.stopPropagation(); // Prevent form auto-submit to avoid double update
    
    const input = event.currentTarget as HTMLInputElement;
    const name = input.name;
    const checked = input.checked;
    
    // Parse the name to extract the path
    // Expected format: system.damage.light.0, system.damage.severe.0, or system.damage.incapacitating
    const match = name.match(/^system\.damage\.(light|severe|incapacitating)(?:\.(\d+))?$/);
    if (!match) return;
    
    const damageType = match[1];
    const index = match[2] ? parseInt(match[2], 10) : null;
    
    // Get current damage from actor data
    // Read from _source to get persisted values, fallback to system if not available
    const actorSource = (this.actor as any)._source;
    const currentDamage = actorSource?.system?.damage || (this.actor.system as any).damage || {
      light: [false, false],
      severe: [false],
      incapacitating: false
    };
    
    // Create a copy of the damage object to update
    const updatedDamage: any = {
      light: Array.isArray(currentDamage.light) ? [...currentDamage.light] : [false, false],
      severe: Array.isArray(currentDamage.severe) ? [...currentDamage.severe] : [false],
      incapacitating: typeof currentDamage.incapacitating === 'boolean' ? currentDamage.incapacitating : false
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
    
    // Update the actor with the complete damage object
    // This ensures the data is persisted correctly
    await this.actor.update({
      'system.damage': updatedDamage
    } as any, { render: false });
    
    // Synchronize all checkboxes with the same name
    const html = $(this.element);
    html.find(`input[name="${name}"]`).prop('checked', checked);
  }
  
  /**
   * Handle cyberdeck damage tracker checkbox changes
   */
  private async _onCyberdeckDamageChange(event: Event): Promise<void> {
    event.stopPropagation(); // Prevent form auto-submit to avoid double update
    
    const input = event.currentTarget as HTMLInputElement;
    const name = input.name;
    const checked = input.checked;
    
    // Parse the name to extract item ID and damage path
    // Expected format: items.{itemId}.system.cyberdeckDamage.light.0, items.{itemId}.system.cyberdeckDamage.severe.0, or items.{itemId}.system.cyberdeckDamage.incapacitating
    const match = name.match(/^items\.([^.]+)\.system\.cyberdeckDamage\.(light|severe|incapacitating)(?:\.(\d+))?$/);
    if (!match) return;
    
    const itemId = match[1];
    const damageType = match[2];
    const index = match[3] ? parseInt(match[3], 10) : null;
    
    // Find the item
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    // Get current cyberdeckDamage from item data
    const itemSource = (item as any)._source;
    const currentDamage = itemSource?.system?.cyberdeckDamage || (item.system as any).cyberdeckDamage || {
      light: [false, false],
      severe: [false],
      incapacitating: false
    };
    
    // Create a copy of the damage object to update
    const updatedDamage: any = {
      light: Array.isArray(currentDamage.light) ? [...currentDamage.light] : [false, false],
      severe: Array.isArray(currentDamage.severe) ? [...currentDamage.severe] : [false],
      incapacitating: typeof currentDamage.incapacitating === 'boolean' ? currentDamage.incapacitating : false
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
    
    // Update the item with the complete cyberdeckDamage object
    await item.update({
      'system.cyberdeckDamage': updatedDamage
    } as any, { render: false });
    
    // Synchronize all checkboxes with the same name
    const html = $(this.element);
    html.find(`input[name="${name}"]`).prop('checked', checked);
  }

  /**
   * Handle anarchy tracker checkbox changes
   */
  private async _onAnarchyChange(event: Event): Promise<void> {
    event.stopPropagation(); // Prevent form auto-submit to avoid double update
    
    const input = event.currentTarget as HTMLInputElement;
    const name = input.name;
    const checked = input.checked;
    
    // Parse the name to extract the index
    // Expected format: system.anarchySpent.0, system.anarchySpent.1, etc.
    const match = name.match(/^system\.anarchySpent\.(\d+)$/);
    if (!match || !match[1]) return;
    
    const index = parseInt(match[1], 10);
    
    // Ensure anarchySpent array exists
    const currentAnarchySpent = (this.actor.system as any).anarchySpent || [false, false, false];
    const anarchySpent = [...currentAnarchySpent];
    
    // Ensure array has minimum length
    while (anarchySpent.length < 3) {
      anarchySpent.push(false);
    }
    
    // Update the appropriate index
    if (index >= 0 && index < anarchySpent.length) {
      anarchySpent[index] = checked;
      
      // Update the actor
      await (this.actor as any).update({ 'system.anarchySpent': anarchySpent });
    }
  }
  
  /**
   * Handle toggling bookmark on an item
   */
  private async _onToggleBookmark(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // With event delegation, find the closest element with data-action="toggle-bookmark"
    const target = event.target as HTMLElement;
    let element = target.closest('[data-action="toggle-bookmark"]') as HTMLElement;
    
    // If target is the icon itself, get the parent link
    if (!element && target.tagName === 'I' && target.parentElement) {
      element = target.parentElement as HTMLElement;
      if (!element.hasAttribute('data-action')) {
        element = element.closest('[data-action="toggle-bookmark"]') as HTMLElement;
      }
    }
    
    if (!element) return;
    
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    const currentBookmarkState = (item.system as any).bookmarked || false;
    
    try {
      await (item as any).update({ 'system.bookmarked': !currentBookmarkState });
      // Re-render to update UI
      this.render(false);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      ui.notifications?.error(game.i18n?.localize('SRA2.BOOKMARKS.ERROR') || 'Erreur lors de la mise à jour du bookmark');
    }
  }
  
  /**
   * Handle clicking on a bookmarked item in the header
   */
  private async _onBookmarkItemClick(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    const itemType = element.dataset.itemType;
    
    if (!itemId) return;
    
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    // Roll the item based on its type
    if (itemType === 'skill') {
      // Call _onRollSkill with a fake event containing the item ID
      const fakeEvent = { 
        preventDefault: () => {}, 
        currentTarget: { dataset: { itemId: itemId } } 
      } as any;
      await this._onRollSkill(fakeEvent);
    } else if (itemType === 'specialization') {
      // Find the effective rating for this specialization
      const specSystem = item.system as any;
      const linkedSkillName = specSystem.linkedSkill;
      const parentSkill = this.actor.items.find((i: any) => i.type === 'skill' && i.name === linkedSkillName);
      const effectiveRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
      
      const fakeEvent = { 
        preventDefault: () => {}, 
        currentTarget: { 
          dataset: { 
            itemId: itemId,
            effectiveRating: effectiveRating.toString()
          } 
        } 
      } as any;
      await this._onRollSpecialization(fakeEvent);
    } else if (itemType === 'feat') {
      const featType = (item.system as any).featType;
      if (featType === 'weapon') {
        const fakeEvent = { 
          preventDefault: () => {}, 
          currentTarget: { dataset: { itemId: itemId } } 
        } as any;
        await this._onRollWeapon(fakeEvent);
      } else if (featType === 'spell') {
        const fakeEvent = { 
          preventDefault: () => {}, 
          currentTarget: { dataset: { itemId: itemId } } 
        } as any;
        await this._onRollSpell(fakeEvent);
      } else if (featType === 'weapons-spells') {
        const fakeEvent = { 
          preventDefault: () => {}, 
          currentTarget: { dataset: { itemId: itemId } } 
        } as any;
        await this._onRollWeaponSpell(fakeEvent);
      }
    }
  }

  /**
   * Handle rolling a vehicle weapon from the character sheet
   */
  private async _onRollVehicleWeaponFromSheet(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const vehicleUuid = element.dataset.vehicleUuid;
    const weaponId = element.dataset.weaponId;
    
    if (!vehicleUuid || !weaponId) {
      console.error("SRA2 | Missing vehicle UUID or weapon ID");
      return;
    }
    
    await this._onRollVehicleWeapon(vehicleUuid, weaponId);
  }

  /**
   * Handle rolling a vehicle weapon (mounted weapon) using character stats
   */
  private async _onRollVehicleWeapon(vehicleUuid: string, weaponId: string): Promise<void> {
    try {
      // Get vehicle actor
      const vehicleActor = await fromUuid(vehicleUuid) as any;
      if (!vehicleActor || vehicleActor.type !== 'vehicle') {
        ui.notifications?.error(game.i18n!.localize('SRA2.VEHICLE.INVALID_VEHICLE'));
        return;
      }
      
      // Get weapon from vehicle
      const weapon = vehicleActor.items.get(weaponId);
      if (!weapon || (weapon.system as any).featType !== 'weapon') {
        ui.notifications?.error(game.i18n!.localize('SRA2.VEHICLE.INVALID_WEAPON'));
        return;
      }
      
      // Use _rollWeaponOrSpell logic but with character stats and CRR
      const itemSystem = weapon.system as any;
      const weaponType = itemSystem.weaponType;
      
      // Get CRR (Contrôle Récupération Réduction) for mounted weapons
      const crr = itemSystem.crr || 0;
      
      let weaponLinkedSkill = '';
      let weaponLinkedSpecialization = '';
      let weaponLinkedDefenseSkill = '';
      let weaponLinkedDefenseSpecialization = '';
      
      if (weaponType && weaponType !== 'custom-weapon') {
        const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
        if (weaponStats) {
          weaponLinkedSkill = weaponStats.linkedSkill || '';
          weaponLinkedSpecialization = weaponStats.linkedSpecialization || '';
          weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || '';
          weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || '';
        }
      }
      
      // Get item RR list
      const rawItemRRList = itemSystem.rrList || [];
      const itemRRList = rawItemRRList.map((rrEntry: any) => ({
        ...rrEntry,
        featName: weapon.name
      }));
      
      // Merge weapon type links with custom fields
      const finalAttackSkill = weaponLinkedSkill || itemSystem.linkedAttackSkill || '';
      const finalAttackSpec = weaponLinkedSpecialization || itemSystem.linkedAttackSpecialization || '';
      const finalDefenseSkill = weaponLinkedDefenseSkill || itemSystem.linkedDefenseSkill || '';
      const finalDefenseSpec = weaponLinkedDefenseSpecialization || itemSystem.linkedDefenseSpecialization || '';
      
      // Find character's skill and specialization based on weapon links
      let attackSkillName: string | undefined = undefined;
      let attackSkillLevel: number | undefined = undefined;
      let attackSpecName: string | undefined = undefined;
      let attackSpecLevel: number | undefined = undefined;
      let attackLinkedAttribute: string | undefined = undefined;
      
      // Try to find the linked attack specialization first
      if (finalAttackSpec) {
        const foundSpec = this.actor.items.find((i: any) => 
          i.type === 'specialization' && 
          ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(finalAttackSpec)
        );
        
        if (foundSpec) {
          const specSystem = foundSpec.system as any;
          attackSpecName = foundSpec.name;
          attackLinkedAttribute = specSystem.linkedAttribute || 'strength';
          
          const linkedSkillName = specSystem.linkedSkill;
          if (linkedSkillName) {
            const parentSkill = this.actor.items.find((i: any) => 
              i.type === 'skill' && i.name === linkedSkillName
            );
            if (parentSkill && attackLinkedAttribute) {
              attackSkillName = parentSkill.name;
              const skillLevel = ((parentSkill.system as any).rating || 0) + ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0);
              attackSkillLevel = skillLevel;
              attackSpecLevel = skillLevel + 2; // Specialization adds +2
            }
          }
        }
      }
      
      // If no specialization found, try to find the linked attack skill
      if (!attackSpecName && finalAttackSkill) {
        const foundSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && 
          ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(finalAttackSkill)
        );
        
        if (foundSkill) {
          attackSkillName = foundSkill.name;
          const foundLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
          attackLinkedAttribute = foundLinkedAttribute;
          attackSkillLevel = ((foundSkill.system as any).rating || 0) + ((this.actor.system as any).attributes?.[foundLinkedAttribute] || 0);
        }
      }
      
      // Find character's defense skill and specialization based on weapon links
      let defenseSkillName: string | undefined = undefined;
      let defenseSkillLevel: number | undefined = undefined;
      let defenseSpecName: string | undefined = undefined;
      let defenseSpecLevel: number | undefined = undefined;
      let defenseLinkedAttribute: string | undefined = undefined;
      
      // Try to find the linked defense specialization first
      if (finalDefenseSpec) {
        const foundDefenseSpec = this.actor.items.find((i: any) => 
          i.type === 'specialization' && 
          ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(finalDefenseSpec)
        );
        
        if (foundDefenseSpec) {
          const specSystem = foundDefenseSpec.system as any;
          defenseSpecName = foundDefenseSpec.name;
          defenseLinkedAttribute = specSystem.linkedAttribute || 'agility';
          
          const linkedSkillName = specSystem.linkedSkill;
          if (linkedSkillName) {
            const parentSkill = this.actor.items.find((i: any) => 
              i.type === 'skill' && i.name === linkedSkillName
            );
            if (parentSkill && defenseLinkedAttribute) {
              defenseSkillName = parentSkill.name;
              const skillLevel = ((parentSkill.system as any).rating || 0) + ((this.actor.system as any).attributes?.[defenseLinkedAttribute] || 0);
              defenseSkillLevel = skillLevel;
              defenseSpecLevel = skillLevel + 2; // Specialization adds +2
            }
          }
        }
      }
      
      // If no defense specialization found, try to find the linked defense skill
      if (!defenseSpecName && finalDefenseSkill) {
        const foundDefenseSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && 
          ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(finalDefenseSkill)
        );
        
        if (foundDefenseSkill) {
          defenseSkillName = foundDefenseSkill.name;
          const foundLinkedAttribute = (foundDefenseSkill.system as any).linkedAttribute || 'agility';
          defenseLinkedAttribute = foundLinkedAttribute;
          defenseSkillLevel = ((foundDefenseSkill.system as any).rating || 0) + ((this.actor.system as any).attributes?.[foundLinkedAttribute] || 0);
        }
      }
      
      // Calculate final damage value
      const baseDamageValue = itemSystem.damageValue || '0';
      const damageValueBonus = itemSystem.damageValueBonus || 0;
      
      let finalDamageValue = baseDamageValue;
      if (damageValueBonus > 0 && baseDamageValue !== '0') {
        if (baseDamageValue === 'FOR') {
          finalDamageValue = `FOR+${damageValueBonus}`;
        } else if (baseDamageValue.startsWith('FOR+')) {
          const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
          finalDamageValue = `FOR+${baseModifier + damageValueBonus}`;
        } else if (baseDamageValue !== 'toxin') {
          const baseValue = parseInt(baseDamageValue) || 0;
          finalDamageValue = (baseValue + damageValueBonus).toString();
        }
      }
      
      // Get RR sources from character's skills/specializations/attributes
      let skillRRSources: Array<{featName: string, rrValue: number}> = [];
      let specRRSources: Array<{featName: string, rrValue: number}> = [];
      let attributeRRSources: Array<{featName: string, rrValue: number}> = [];
      
      if (attackSpecName) {
        specRRSources = SheetHelpers.getRRSources(this.actor, 'specialization', attackSpecName);
      }
      if (attackSkillName) {
        skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', attackSkillName);
      }
      if (attackLinkedAttribute) {
        attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', attackLinkedAttribute);
      }
      
      // Merge all RR sources (item RR + skill/spec/attribute RR + CRR)
      const allRRSources = [...itemRRList, ...specRRSources, ...skillRRSources, ...attributeRRSources];
      
      // Add CRR as a special RR entry if > 0
      if (crr > 0) {
        allRRSources.push({
          rrType: 'attribute',
          rrValue: crr,
          rrTarget: 'CRR',
          featName: weapon.name
        });
      }
      
      DiceRoller.handleRollRequest({
        itemType: 'weapon',
        weaponType: weaponType,
        itemName: `${weapon.name} (${vehicleActor.name})`,
        itemId: weapon.id,
        itemRating: itemSystem.rating || 0,
        itemActive: itemSystem.active,
        
        // Merged linked skills (for fallback selection in dialog)
        linkedAttackSkill: finalAttackSkill,
        linkedAttackSpecialization: finalAttackSpec,
        linkedDefenseSkill: finalDefenseSkill,
        linkedDefenseSpecialization: finalDefenseSpec,
        linkedAttribute: attackLinkedAttribute,
        
        // Weapon properties
        isWeaponFocus: itemSystem.isWeaponFocus || false,
        damageValue: finalDamageValue,
        meleeRange: itemSystem.meleeRange,
        shortRange: itemSystem.shortRange,
        mediumRange: itemSystem.mediumRange,
        longRange: itemSystem.longRange,
        
        // Attack skill/spec from character (based on weapon links) - these are used for selection
        skillName: attackSkillName,
        skillLevel: attackSkillLevel,
        specName: attackSpecName,
        specLevel: attackSpecLevel,
        
        // Defense skill/spec from character (based on weapon links) - these are used for defense selection
        defenseSkillName: defenseSkillName,
        defenseSkillLevel: defenseSkillLevel,
        defenseSpecName: defenseSpecName,
        defenseSpecLevel: defenseSpecLevel,
        defenseLinkedAttribute: defenseLinkedAttribute,
        
        // Actor information (character, not vehicle)
        actorId: this.actor.id,
        actorUuid: this.actor.uuid,
        actorName: this.actor.name || '',
        
        // RR List (merged: item RR + skill/spec/attribute RR + CRR)
        rrList: allRRSources,
        
        // Mark as vehicle weapon
        isVehicleWeapon: true,
        vehicleUuid: vehicleUuid,
        vehicleName: vehicleActor.name
      });
    } catch (error) {
      console.error('Error rolling vehicle weapon:', error);
      ui.notifications?.error(game.i18n!.localize('SRA2.VEHICLE.ROLL_ERROR'));
    }
  }

  /**
   * Handle rolling a weapon
   */
  private async _onRollWeapon(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) {
      console.error("SRA2 | No weapon ID found");
      return;
    }

    const weapon = this.actor.items.get(itemId);
    if (!weapon || weapon.type !== 'feat') return;

    await this._rollWeaponOrSpell(weapon, 'weapon');
  }

  /**
   * Handle rolling a spell
   */
  private async _onRollSpell(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) {
      console.error("SRA2 | No spell ID found");
      return;
    }

    const spell = this.actor.items.get(itemId);
    if (!spell || spell.type !== 'feat') return;

    await this._rollWeaponOrSpell(spell, 'spell');
  }

  /**
   * Handle rolling a weapon/spell (old type)
   */
  private async _onRollWeaponSpell(event: Event): Promise<void> {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    
    if (!itemId) {
      console.error("SRA2 | No weapon/spell ID found");
      return;
    }

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== 'feat') return;

    await this._rollWeaponOrSpell(item, 'weapon-spell');
  }


  /**
   * Handle rolling a weapon or spell
   */
  private async _rollWeaponOrSpell(item: any, type: 'weapon' | 'spell' | 'weapon-spell'): Promise<void> {
    const itemSystem = item.system as any;
    
    // Check if this is a spell and get spell type
    const isSpell = type === 'spell';
    const spellType = isSpell ? (itemSystem.spellType || 'indirect') : null;
    
    // Get weapon type and linked skills
    const weaponType = itemSystem.weaponType;
    let weaponLinkedSkill = '';
    let weaponLinkedSpecialization = '';
    let weaponLinkedDefenseSkill = '';
    let weaponLinkedDefenseSpecialization = '';
    
    if (weaponType && weaponType !== 'custom-weapon') {
      // Pre-defined weapon: get from WEAPON_TYPES
      const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
      if (weaponStats) {
        weaponLinkedSkill = weaponStats.linkedSkill || '';
        weaponLinkedSpecialization = weaponStats.linkedSpecialization || '';
        weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || '';
        weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || '';
      }
    }

    // Get all RR sources for the item and enrich with featName
    const rawItemRRList = itemSystem.rrList || [];
    const itemRRList = rawItemRRList.map((rrEntry: any) => ({
      ...rrEntry,
      featName: item.name  // Add featName (the item name itself)
    }));

    // For spells, force specific skills
    let finalAttackSkill = weaponLinkedSkill || itemSystem.linkedAttackSkill || '';
    let finalAttackSpec = weaponLinkedSpecialization || itemSystem.linkedAttackSpecialization || '';
    let finalDefenseSkill = weaponLinkedDefenseSkill || itemSystem.linkedDefenseSkill || '';
    let finalDefenseSpec = weaponLinkedDefenseSpecialization || itemSystem.linkedDefenseSpecialization || '';
    
    if (isSpell) {
      // Force attack skill to Sorcellerie
      finalAttackSkill = 'Sorcellerie';
      
      // Get spell specialization type and map it to the specialization name
      const spellSpecType = itemSystem.spellSpecializationType || 'combat';
      const spellSpecMap: Record<string, string> = {
        'combat': 'Spé: Sorts de combat',
        'detection': 'Spé: Sorts de détection',
        'health': 'Spé: Sorts de santé',
        'illusion': 'Spé: Sorts d\'illusion',
        'manipulation': 'Spé: Sorts de manipulation',
        'counterspell': 'Spé: Contresort'
      };
      finalAttackSpec = spellSpecMap[spellSpecType] || 'Spé: Sorts de combat';
      
      if (spellType === 'direct') {
        // Direct spell: no defense
        finalDefenseSkill = '';
        finalDefenseSpec = '';
      } else {
        // Indirect spell: force defense to Athlétisme / Spé : Défense à distance
        finalDefenseSkill = 'Athlétisme';
        finalDefenseSpec = 'Spé : Défense à distance';
      }
    }

    // Find actor's skill and specialization based on weapon links
    let attackSkillName: string | undefined = undefined;
    let attackSkillLevel: number | undefined = undefined;
    let attackSpecName: string | undefined = undefined;
    let attackSpecLevel: number | undefined = undefined;
    let attackLinkedAttribute: string | undefined = undefined;
    
    // Try to find the linked attack specialization first
    if (finalAttackSpec) {
      // Normalize both names for comparison (remove spaces, accents, case differences)
      const normalizeForComparison = (text: string): string => {
        return ItemSearch.normalizeSearchText(text).replace(/\s+/g, '').replace(/:/g, '').replace(/'/g, '');
      };
      
      const normalizedTargetSpec = normalizeForComparison(finalAttackSpec);
      
      const foundSpec = this.actor.items.find((i: any) => {
        if (i.type !== 'specialization') return false;
        const normalizedItemName = normalizeForComparison(i.name);
        return normalizedItemName === normalizedTargetSpec;
      });
      
      if (foundSpec) {
        const specSystem = foundSpec.system as any;
        attackSpecName = foundSpec.name;
        attackLinkedAttribute = specSystem.linkedAttribute || 'strength';
        
        // Get parent skill for specialization
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find((i: any) => 
            i.type === 'skill' && i.name === linkedSkillName
          );
          if (parentSkill && attackLinkedAttribute) {
            attackSkillName = parentSkill.name;
            const skillLevel = ((parentSkill.system as any).rating + (this.actor.system as any).attributes?.[attackLinkedAttribute]) || 0;
            attackSkillLevel = skillLevel;
            attackSpecLevel = skillLevel + 2; // Specialization adds +2
          }
        }
      } else {
        // If exact match not found, try to find by partial match for spells
        // This handles cases where the specialization name might have slight variations
        if (isSpell) {
          const spellSpecType = itemSystem.spellSpecializationType || 'combat';
          const specKeywords: Record<string, string[]> = {
            'combat': ['combat'],
            'detection': ['détection', 'detection'],
            'health': ['santé', 'sante', 'health'],
            'illusion': ['illusion'],
            'manipulation': ['manipulation'],
            'counterspell': ['contresort', 'contre-sort']
          };
          
          const keywords = specKeywords[spellSpecType] || ['combat'];
          // Normalize keywords for comparison (remove accents)
          const normalizedKeywords = keywords.map(kw => ItemSearch.normalizeSearchText(kw));
          const foundSpecByKeyword = this.actor.items.find((i: any) => {
            if (i.type !== 'specialization') return false;
            const normalizedName = ItemSearch.normalizeSearchText(i.name);
            // Check if it's a Sorcellerie specialization and contains the keyword
            const linkedSkill = (i.system as any)?.linkedSkill;
            if (linkedSkill && ItemSearch.normalizeSearchText(linkedSkill) === 'sorcellerie') {
              return normalizedKeywords.some(normalizedKeyword => normalizedName.includes(normalizedKeyword));
            }
            return false;
          });
          if (foundSpecByKeyword) {
            const specSystem = foundSpecByKeyword.system as any;
            attackSpecName = foundSpecByKeyword.name;
            attackLinkedAttribute = specSystem.linkedAttribute || 'willpower';
            
            const linkedSkillName = specSystem.linkedSkill;
            if (linkedSkillName) {
              const parentSkill = this.actor.items.find((i: any) => 
                i.type === 'skill' && i.name === linkedSkillName
              );
              if (parentSkill && attackLinkedAttribute) {
                attackSkillName = parentSkill.name;
                const skillLevel = ((parentSkill.system as any).rating + (this.actor.system as any).attributes?.[attackLinkedAttribute]) || 0;
                attackSkillLevel = skillLevel;
                attackSpecLevel = skillLevel + 2;
              }
            }
          } else {
            // If specialization not found in actor, search in game.items to get the parent skill
            if (isSpell && game.items) {
              const normalizeForComparison = (text: string): string => {
                return ItemSearch.normalizeSearchText(text).replace(/\s+/g, '').replace(/:/g, '').replace(/'/g, '');
              };
              
              const normalizedTargetSpec = normalizeForComparison(finalAttackSpec);
              
              // Search in game.items for the specialization
              const specInGameItems = (game.items as any).find((i: any) => {
                if (i.type !== 'specialization') return false;
                const normalizedItemName = normalizeForComparison(i.name);
                return normalizedItemName === normalizedTargetSpec;
              });
              
              // If still not found, try keyword search in game.items
              if (!specInGameItems) {
                const keywords = specKeywords[spellSpecType] || ['combat'];
                const normalizedKeywords = keywords.map(kw => ItemSearch.normalizeSearchText(kw));
                
                const specInGameItemsByKeyword = (game.items as any).find((i: any) => {
                  if (i.type !== 'specialization') return false;
                  const normalizedName = ItemSearch.normalizeSearchText(i.name);
                  const linkedSkill = (i.system as any)?.linkedSkill;
                  if (linkedSkill && ItemSearch.normalizeSearchText(linkedSkill) === 'sorcellerie') {
                    return normalizedKeywords.some(normalizedKeyword => normalizedName.includes(normalizedKeyword));
                  }
                  return false;
                });
                
                if (specInGameItemsByKeyword) {
                  const specSystem = specInGameItemsByKeyword.system as any;
                  const linkedSkillName = specSystem.linkedSkill;
                  
                  // Now find the skill in the actor
                  if (linkedSkillName) {
                    const parentSkill = this.actor.items.find((i: any) => 
                      i.type === 'skill' && i.name === linkedSkillName
                    );
                    if (parentSkill) {
                      const skillSystem = parentSkill.system as any;
                      const linkedAttribute = skillSystem.linkedAttribute || 'willpower';
                      attackSkillName = parentSkill.name;
                      attackLinkedAttribute = linkedAttribute;
                      const skillLevel = (skillSystem.rating || 0) + ((this.actor.system as any).attributes?.[linkedAttribute] || 0);
                      attackSkillLevel = skillLevel;
                      // Note: attackSpecName stays undefined since spec is not in actor
                      // But linkedAttackSpecialization will be used by RollDialog for preselect
                    }
                  }
                }
              } else if (specInGameItems) {
                // Found spec in game.items, get parent skill
                const specSystem = specInGameItems.system as any;
                const linkedSkillName = specSystem.linkedSkill;
                
                if (linkedSkillName) {
                  const parentSkill = this.actor.items.find((i: any) => 
                    i.type === 'skill' && i.name === linkedSkillName
                  );
                  if (parentSkill) {
                    const skillSystem = parentSkill.system as any;
                    const linkedAttribute = skillSystem.linkedAttribute || 'willpower';
                    attackSkillName = parentSkill.name;
                    attackLinkedAttribute = linkedAttribute;
                    const skillLevel = (skillSystem.rating || 0) + ((this.actor.system as any).attributes?.[linkedAttribute] || 0);
                    attackSkillLevel = skillLevel;
                    // Note: attackSpecName stays undefined since spec is not in actor
                    // But linkedAttackSpecialization will be used by RollDialog for preselect
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // If no specialization found, try to find the linked attack skill
    if (!attackSpecName && finalAttackSkill) {
      const foundSkill = this.actor.items.find((i: any) => 
        i.type === 'skill' && 
        ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(finalAttackSkill)
      );
      
      if (foundSkill) {
        attackSkillName = foundSkill.name;
        const foundLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
        attackLinkedAttribute = foundLinkedAttribute;
        attackSkillLevel = ((foundSkill.system as any).rating || 0) + ((this.actor.system as any).attributes?.[foundLinkedAttribute] || 0);
      } else if (isSpell) {
        // For spells, if Sorcellerie skill not found in actor, try to find it in game.items
        // This shouldn't normally happen, but handle it gracefully
        if (game.items) {
          const sorcerySkillInGame = (game.items as any).find((i: any) => 
            i.type === 'skill' && 
            ItemSearch.normalizeSearchText(i.name) === 'sorcellerie'
          );
          
          if (sorcerySkillInGame) {
            // Use default willpower attribute for Sorcellerie if skill not in actor
            attackSkillName = 'Sorcellerie';
            attackLinkedAttribute = 'willpower';
            const willpower = (this.actor.system as any).attributes?.willpower || 1;
            attackSkillLevel = willpower; // Skill rating would be 0 if not in actor
          }
        }
      }
    }

    // Calculate final damage value (base + bonus)
    // For spells, damage value is calculated differently
    let finalDamageValue: string;
    
    if (isSpell) {
      if (spellType === 'direct') {
        // Direct spell: finalDamageValue is 0
        finalDamageValue = '0';
      } else {
        // Indirect spell: finalDamageValue is VOL (willpower)
        const willpower = (this.actor.system as any).attributes?.willpower || 1;
        finalDamageValue = willpower.toString();
      }
    } else {
      // Normal weapon calculation
      const baseDamageValue = itemSystem.damageValue || '0';
      const damageValueBonus = itemSystem.damageValueBonus || 0;
      
      finalDamageValue = baseDamageValue;
      if (damageValueBonus > 0 && baseDamageValue !== '0') {
        if (baseDamageValue === 'FOR') {
          finalDamageValue = `FOR+${damageValueBonus}`;
        } else if (baseDamageValue.startsWith('FOR+')) {
          const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
          finalDamageValue = `FOR+${baseModifier + damageValueBonus}`;
        } else if (baseDamageValue !== 'toxin') {
          const baseValue = parseInt(baseDamageValue) || 0;
          finalDamageValue = (baseValue + damageValueBonus).toString();
        }
      }
    }

    // Get RR sources from skill/specialization/attribute (same as NPCs)
    let skillRRSources: Array<{featName: string, rrValue: number}> = [];
    let specRRSources: Array<{featName: string, rrValue: number}> = [];
    let attributeRRSources: Array<{featName: string, rrValue: number}> = [];
    
    if (attackSpecName) {
      specRRSources = SheetHelpers.getRRSources(this.actor, 'specialization', attackSpecName);
    }
    if (attackSkillName) {
      skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', attackSkillName);
    }
    if (attackLinkedAttribute) {
      attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', attackLinkedAttribute);
    }
    
    // Merge all RR sources (item RR + skill/spec/attribute RR)
    const allRRSources = [...itemRRList, ...specRRSources, ...skillRRSources, ...attributeRRSources];

    DiceRoller.handleRollRequest({
      itemType: type,
      weaponType: weaponType,
      itemName: item.name,
      itemId: item.id,
      itemRating: itemSystem.rating || 0,
      itemActive: itemSystem.active,
      
      // Merged linked skills
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      
      // Weapon properties
      isWeaponFocus: itemSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,  // FINAL damage value (base + bonus, or VOL for indirect spells, or 0 for direct spells)
      // For spells, all ranges are "ok"
      meleeRange: isSpell ? 'ok' : (itemSystem.meleeRange || 'none'),
      shortRange: isSpell ? 'ok' : (itemSystem.shortRange || 'none'),
      mediumRange: isSpell ? 'ok' : (itemSystem.mediumRange || 'none'),
      longRange: isSpell ? 'ok' : (itemSystem.longRange || 'none'),
      
      // Attack skill/spec from actor (based on weapon links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      
      // Actor information
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name || '',
      
      // RR List (merged: item RR + skill/spec/attribute RR)
      rrList: allRRSources,
      
      // Spell-specific properties
      spellType: isSpell ? spellType : undefined,  // 'direct' or 'indirect' for spells
      isSpellDirect: isSpell && spellType === 'direct'  // Flag for direct spells (no defense)
    });
  }

  /**
   * REMOVED: Skill with weapon roll - dialog creation disabled
   */
  private async _rollSkillWithWeapon(skill: any, weaponName: string, _skillType: 'skill', weaponDamageValue?: string, weapon?: any): Promise<void> {
    console.log('Skill with weapon roll disabled', { skill: skill.name, weaponName });
  }

  /**
   * REMOVED: Specialization with weapon roll - dialog creation disabled
   */
  private async _rollSpecializationWithWeapon(specialization: any, weaponName: string, effectiveRating: number, weaponDamageValue?: string, weapon?: any): Promise<void> {
    console.log('Specialization with weapon roll disabled', { specialization: specialization.name, weaponName });
  }


  /**
   * Handle creating a new feat from search
   */
  private async _onCreateNewFeat(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const featName = button.dataset.featName;
    
    if (!featName) return;
    
    // Get the feat type from the selector
    const selector = $(button).siblings('.feat-type-selector, .feat-type-selector-inline')[0] as HTMLSelectElement;
    const featType = selector ? selector.value : 'equipment';
    
    // Capitalize first letter of each word
    const formattedName = featName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Create the new feat with default values
    const featData = {
      name: formattedName,
      type: 'feat',
      system: {
        description: '',
        rating: 0,
        cost: 'free-equipment',
        active: true,
        featType: featType,
        rrType: [],
        rrValue: [],
        rrTarget: [],
        bonusLightDamage: 0,
        bonusSevereDamage: 0,
        bonusPhysicalThreshold: 0,
        bonusMentalThreshold: 0,
        bonusAnarchy: 0,
        essenceCost: 0
      }
    } as any;
    
    // Add the feat to the actor
    const createdItems = await this.actor.createEmbeddedDocuments('Item', [featData]) as any;
    
    if (createdItems && createdItems.length > 0) {
      const newFeat = createdItems[0] as any;
      
      // Clear the search input and hide results
      const searchInput = this.element.find('.feat-search-input')[0] as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }
      
      const resultsDiv = this.element.find('.feat-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        resultsDiv.style.display = 'none';
      }
      
      // Open the feat sheet for editing
      if (newFeat && newFeat.sheet) {
        setTimeout(() => {
          newFeat.sheet.render(true);
        }, 100);
      }
      
      ui.notifications?.info(game.i18n!.format('SRA2.FEATS.FEAT_CREATED', { name: formattedName }));
    }
  }
}


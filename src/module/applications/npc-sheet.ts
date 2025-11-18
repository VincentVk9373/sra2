import * as DiceRoller from '../helpers/dice-roller.js';
import * as ItemSearch from '../helpers/item-search.js';
import * as DefenseSelection from '../helpers/defense-selection.js';
import * as SheetHelpers from '../helpers/sheet-helpers.js';
import { WEAPON_TYPES } from '../models/item-feat.js';

/**
 * NPC Sheet Application
 * NPCs don't roll dice - they use predefined thresholds
 * Threshold = round(dice pool / 3) + RR level + 1
 */
export class NpcSheet extends ActorSheet {
  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'npc'],
      template: 'systems/sra2/templates/actor-npc-sheet.hbs',
      width: 800,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: '.skill-item', dropSelector: null },
        { dragSelector: '.feat-item', dropSelector: null },
        { dragSelector: '.specialization-item', dropSelector: null }
      ],
      submitOnChange: true,
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

    // Get feats
    const allFeats = this.actor.items.filter((item: any) => item.type === 'feat');
    
    // Get all active feats for RR calculation
    const activeFeats = allFeats.filter((feat: any) => feat.system.active === true);
    
    // Get actor's strength for damage value calculations
    const actorStrength = (this.actor.system as any).attributes?.strength || 0;
    
    // Get all specializations early (needed for weapon/spell calculations)
    let allSpecializations = this.actor.items.filter((i: any) => i.type === 'specialization');
    
    // Helper function to calculate weapon/spell stats
    const calculateWeaponSpellStats = (item: any) => {
      const itemData = {
        ...item,
        _id: item.id || item._id,
        id: item.id || item._id
      };
      
      // Get linked skill name and specialization from WEAPON_TYPES or custom fields
      let linkedSkillName = '';
      let linkedSpecializationName = '';
      const weaponType = item.system.weaponType;
      
      if (weaponType && weaponType !== 'custom-weapon') {
        // Arme pré-définie : récupérer depuis WEAPON_TYPES
        const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
        if (weaponStats) {
          linkedSkillName = weaponStats.linkedSkill || '';
          linkedSpecializationName = weaponStats.linkedSpecialization || '';
        }
      } else if (weaponType === 'custom-weapon') {
        // Arme custom : récupérer depuis les champs du système
        linkedSkillName = item.system.linkedAttackSkill || '';
        // Pour les armes custom, pas de spécialisation par défaut
        linkedSpecializationName = '';
      }
      
      // Try to find the linked skill
      let totalDicePool = 0;
      let totalRR = 0;
      let linkedAttribute = '';
      
      if (linkedSkillName) {
        const linkedSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        
        if (linkedSkill) {
          const skillRating = (linkedSkill.system as any).rating || 0;
          
          // Check if there's a specialization for this weapon/spell
          let matchingSpec = null;
          
          if (linkedSpecializationName) {
            // Look for the specific specialization by name
            matchingSpec = allSpecializations.find((spec: any) => 
              spec.name === linkedSpecializationName && spec.system.linkedSkill === linkedSkillName
            );
          }
          
          if (matchingSpec) {
            // Use specialization: skill rating + spec's attribute + 2
            linkedAttribute = matchingSpec.system.linkedAttribute || (linkedSkill.system as any).linkedAttribute || 'strength';
            const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
            totalDicePool = skillRating + attributeValue + 2;
            
            // Calculate RR for specialization
            activeFeats.forEach((feat: any) => {
              const rrList = feat.system.rrList || [];
              rrList.forEach((rrEntry: any) => {
                if (rrEntry.rrType === 'skill' && rrEntry.rrTarget === linkedSkillName) {
                  totalRR += rrEntry.rrValue || 0;
                }
                if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === linkedAttribute) {
                  totalRR += rrEntry.rrValue || 0;
                }
                if (rrEntry.rrType === 'specialization' && rrEntry.rrTarget === matchingSpec.name) {
                  totalRR += rrEntry.rrValue || 0;
                }
              });
            });
          } else {
            // Use skill only
            linkedAttribute = (linkedSkill.system as any).linkedAttribute || 'strength';
            const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
            totalDicePool = attributeValue + skillRating;
            
            // Calculate RR
            activeFeats.forEach((feat: any) => {
              const rrList = feat.system.rrList || [];
              rrList.forEach((rrEntry: any) => {
                if (rrEntry.rrType === 'skill' && rrEntry.rrTarget === linkedSkillName) {
                  totalRR += rrEntry.rrValue || 0;
                }
                if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === linkedAttribute) {
                  totalRR += rrEntry.rrValue || 0;
                }
              });
            });
          }
        }
      }
      
      // If no linked skill found, use a default attribute (usually strength for weapons)
      if (totalDicePool === 0) {
        linkedAttribute = 'strength'; // Default for weapons/spells
        const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
        totalDicePool = attributeValue;
        
        // Calculate RR for attribute only
        activeFeats.forEach((feat: any) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry: any) => {
            if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === linkedAttribute) {
              totalRR += rrEntry.rrValue || 0;
            }
          });
        });
      }
      
      const npcThreshold = Math.round(totalDicePool / 3) + totalRR + 1;
      
      itemData.totalDicePool = totalDicePool;
      itemData.totalRR = totalRR;
      itemData.npcThreshold = npcThreshold;
      
      // Calculate final damage value with bonus
      const damageValue = item.system.damageValue || '0';
      const damageValueBonus = item.system.damageValueBonus || 0;
      itemData.finalDamageValue = SheetHelpers.calculateFinalDamageValue(damageValue, damageValueBonus, actorStrength);
      
      return itemData;
    };
    
    // Separate and process weapons, spells, and other feats
    const rawWeapons = allFeats.filter((feat: any) => 
      feat.system.featType === 'weapon' || feat.system.featType === 'weapons-spells'
    );
    const rawSpells = allFeats.filter((feat: any) => 
      feat.system.featType === 'spell'
    );
    const otherFeats = allFeats.filter((feat: any) => 
      feat.system.featType !== 'weapon' && 
      feat.system.featType !== 'spell' && 
      feat.system.featType !== 'weapons-spells'
    );
    
    // Calculate stats for weapons and spells using linked skills from WEAPON_TYPES
    const weapons = rawWeapons.map((weapon: any) => calculateWeaponSpellStats(weapon));
    const spells = rawSpells.map((spell: any) => calculateWeaponSpellStats(spell));
    
    context.weapons = weapons;
    context.spells = spells;
    context.feats = otherFeats;

    // Get skills with NPC threshold calculations (sorted alphabetically)
    const skills = this.actor.items
      .filter((item: any) => item.type === 'skill')
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Sort all specializations alphabetically (already defined above)
    allSpecializations = allSpecializations.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Organize specializations by linked skill
    const specializationsBySkill = new Map<string, any[]>();
    
    allSpecializations.forEach((spec: any) => {
      const linkedSkillName = spec.system.linkedSkill;
      if (linkedSkillName) {
        const linkedSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        
        if (linkedSkill && linkedSkill.id) {
          const skillId = linkedSkill.id;
          if (!specializationsBySkill.has(skillId)) {
            specializationsBySkill.set(skillId, []);
          }
          specializationsBySkill.get(skillId)!.push(spec);
        }
      }
    });

    // Calculate NPC thresholds for skills
    const skillsWithThresholds = skills.map((skill: any) => {
      const skillData = {
        ...skill,
        _id: skill.id || skill._id, // Ensure ID is present
        id: skill.id || skill._id
      };
      
      // Get attribute value
      const linkedAttribute = skill.system.linkedAttribute;
      let attributeValue = 0;
      if (linkedAttribute && this.actor.system.attributes) {
        attributeValue = this.actor.system.attributes[linkedAttribute] || 0;
      }
      
      // Calculate total dice pool (attribute + skill rating)
      const skillRating = skill.system.rating || 0;
      const totalDicePool = attributeValue + skillRating;
      
      // Calculate total RR for this skill
      let totalRR = 0;
      
      // Get all active feats
      const activeFeats = this.actor.items.filter((item: any) => 
        item.type === 'feat' && item.system.active === true
      );
      
      // Check each feat for RR that applies to this skill
      activeFeats.forEach((feat: any) => {
        const rrList = feat.system.rrList || [];
        rrList.forEach((rrEntry: any) => {
          if (rrEntry.rrType === 'skill' && rrEntry.rrTarget === skill.name) {
            totalRR += rrEntry.rrValue || 0;
          }
          // Also check for attribute RR
          if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === linkedAttribute) {
            totalRR += rrEntry.rrValue || 0;
          }
        });
      });
      
      // Calculate NPC threshold: round(dice pool / 3) + RR + 1
      const npcThreshold = Math.round(totalDicePool / 3) + totalRR + 1;
      
      skillData.totalDicePool = totalDicePool;
      skillData.totalRR = totalRR;
      skillData.npcThreshold = npcThreshold;
      
      // Attach specializations for this skill with their thresholds (sorted alphabetically)
      const specs = (specializationsBySkill.get(skill.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      skillData.specializations = specs.map((spec: any) => {
        const specData = {
          ...spec,
          _id: spec.id || spec._id, // Ensure ID is present
          id: spec.id || spec._id
        };
        
        // Get specialization's linked attribute (can be different from skill's attribute)
        const specLinkedAttribute = spec.system.linkedAttribute || linkedAttribute;
        const specAttributeValue = this.actor.system.attributes?.[specLinkedAttribute] || 0;
        
        // Specialization: skill rating + spec's attribute + 2
        const specDicePool = skillRating + specAttributeValue + 2;
        
        // Calculate total RR for specialization
        let specTotalRR = 0;
        
        // Check for skill RR
        activeFeats.forEach((feat: any) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry: any) => {
            if (rrEntry.rrType === 'skill' && rrEntry.rrTarget === skill.name) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
        
        // Check for attribute RR (using spec's attribute)
        activeFeats.forEach((feat: any) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry: any) => {
            if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === specLinkedAttribute) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
        
        // Check for specialization-specific RR
        activeFeats.forEach((feat: any) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry: any) => {
            if (rrEntry.rrType === 'specialization' && rrEntry.rrTarget === spec.name) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
        
        // Calculate specialization threshold
        const specThreshold = Math.round(specDicePool / 3) + specTotalRR + 1;
        
        specData.totalDicePool = specDicePool;
        specData.totalRR = specTotalRR;
        specData.npcThreshold = specThreshold;
        
        return specData;
      });
      
      return skillData;
    });

    context.skills = skillsWithThresholds;

    return context;
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    // Roll skill
    html.find('[data-action="roll-skill"]').on('click', this._onRollSkill.bind(this));

    // Roll specialization
    html.find('[data-action="roll-specialization"]').on('click', this._onRollSpecialization.bind(this));

    // Attack with threshold
    html.find('[data-action="attack-threshold"]').on('click', this._onAttackThreshold.bind(this));

    // Attack with threshold (weapon)
    html.find('[data-action="attack-threshold-weapon"]').on('click', this._onAttackThresholdWeapon.bind(this));

    // Attack with threshold (spell)
    html.find('[data-action="attack-threshold-spell"]').on('click', this._onAttackThresholdSpell.bind(this));

    // Roll NPC weapon with dice
    html.find('[data-action="roll-npc-weapon-dice"]').on('click', this._onRollNPCWeaponDice.bind(this));

    // Roll NPC spell with dice
    html.find('[data-action="roll-npc-spell-dice"]').on('click', this._onRollNPCSpellDice.bind(this));

    // Edit skill
    html.find('[data-action="edit-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete skill
    html.find('[data-action="delete-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.SKILLS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Edit specialization
    html.find('[data-action="edit-specialization"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete specialization
    html.find('[data-action="delete-specialization"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.SPECIALIZATIONS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Edit feat
    html.find('[data-action="edit-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete feat
    html.find('[data-action="delete-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.FEATS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Add world skill button
    html.find('[data-action="add-world-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      this._showItemBrowser('skill');
    });

    // Add world feat button
    html.find('[data-action="add-world-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      this._showItemBrowser('feat');
    });
  }

  /**
   * Handle rolling a skill (NPC)
   */
  private async _onRollSkill(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');

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
   * Handle rolling a specialization (NPC)
   */
  private async _onRollSpecialization(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    
    if (!itemId) return;

    const specialization = this.actor.items.get(itemId);
    if (!specialization || specialization.type !== 'specialization') return;

    const specSystem = specialization.system as any;
    const linkedAttribute = specSystem.linkedAttribute || 'strength';
    const linkedSkillName = specSystem.linkedSkill;
    const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
    
    // Get the linked skill to calculate effective rating
    const linkedSkill = this.actor.items.find((i: any) => i.type === 'skill' && i.name === linkedSkillName);
    const skillRating = linkedSkill ? (linkedSkill.system as any).rating || 0 : 0;
    const effectiveRating = skillRating + 2; // +2 from specialization
    
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
   * Handle attack with threshold (NPC skill/spec without weapon)
   */
  private async _onAttackThreshold(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    const threshold = element.data('threshold') || element.attr('data-threshold');
    const itemName = element.data('item-name') || element.attr('data-item-name');

    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    const itemSystem = item.system as any;
    const itemType = item.type;
    const linkedAttribute = itemSystem.linkedAttribute || 'strength';
    
    // Get RR sources
    const rrSources = this.getRRSources(itemType as any, item.name);

    DiceRoller.handleRollRequest({
      itemType: itemType,
      itemName: itemName || item.name,
      itemId: itemId,
      itemRating: itemSystem.rating || 0,
      skillName: itemType === 'skill' ? item.name : undefined,
      specName: itemType === 'specialization' ? item.name : undefined,
      linkedAttribute: linkedAttribute,
      threshold: threshold ? parseInt(threshold) : undefined,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: rrSources
    });
  }

  /**
   * REMOVED: Defense roll prompt for NPC attack
   */
  private async _promptDefenseRollForNPC(defenderActor: any, attackThreshold: number, attackName: string, defenderToken?: any): Promise<void> {
    console.log('NPC defense prompt disabled', { defenderActor: defenderActor.name, attackThreshold, attackName });
  }

  /**
   * REMOVED: Defense roll against NPC attack
   */
  private async _rollDefenseAgainstNPC(defenseItem: any, itemType: 'skill' | 'spec', attackName: string, attackThreshold: number, defenderActor: any, defenderToken?: any): Promise<void> {
    console.log('NPC defense roll disabled', { defenseItem: defenseItem.name, itemType, attackName, attackThreshold });
  }


  /**
   * REMOVED: NPC attack result display
   */
  private async _displayNPCAttackResult(attackName: string, attackThreshold: number, defenseResult: any | null, defenderActor: any, defenderToken?: any): Promise<void> {
    console.log('NPC attack result display disabled', { attackName, attackThreshold, defenderActor: defenderActor.name });
  }




  /**
   * Handle attacking with threshold (weapon)
   */
  private async _onAttackThresholdWeapon(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    const threshold = element.data('threshold') || element.attr('data-threshold');
    const itemName = element.data('item-name') || element.attr('data-item-name');
    const weaponVD = element.data('weapon-vd') || element.attr('data-weapon-vd') || '0';

    if (!itemId) return;

    const weapon = this.actor.items.get(itemId);
    if (!weapon || weapon.type !== 'feat') return;

    const weaponSystem = weapon.system as any;
    const weaponType = weaponSystem.weaponType;
    
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

    const itemRRList = weaponSystem.rrList || [];

    // Merge weapon type links with custom fields (weapon type has priority)
    const finalAttackSkill = weaponLinkedSkill || weaponSystem.linkedAttackSkill || '';
    const finalAttackSpec = weaponLinkedSpecialization || weaponSystem.linkedAttackSpecialization || '';
    const finalDefenseSkill = weaponLinkedDefenseSkill || weaponSystem.linkedDefenseSkill || '';
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || weaponSystem.linkedDefenseSpecialization || '';

    // Find actor's skill and specialization based on weapon links
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
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        
        // Get parent skill for specialization
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find((i: any) => 
            i.type === 'skill' && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = (parentSkill.system as any).rating || 0;
            attackSkillLevel = skillRating;  // Just the skill rating (without attribute)
            attackSpecLevel = attributeValue + skillRating + 2; // Total dice pool (attribute + rating + 2)
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
        attackLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        const skillRating = (foundSkill.system as any).rating || 0;
        attackSkillLevel = attributeValue + skillRating; // Total dice pool (attribute + rating)
      }
    }

    // Calculate final damage value (base + bonus)
    const baseDamageValue = weaponSystem.damageValue || '0';
    const damageValueBonus = weaponSystem.damageValueBonus || 0;
    
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

    DiceRoller.handleRollRequest({
      itemType: 'weapon',
      weaponType: weaponType,
      itemName: itemName || weapon.name,
      itemId: itemId,
      itemRating: weaponSystem.rating || 0,
      itemActive: weaponSystem.active,
      
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      
      isWeaponFocus: weaponSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,  // FINAL damage value (base + bonus)
      damageValueBonus: damageValueBonus,
      meleeRange: weaponSystem.meleeRange,
      shortRange: weaponSystem.shortRange,
      mediumRange: weaponSystem.mediumRange,
      longRange: weaponSystem.longRange,
      
      // Attack skill/spec from actor (based on weapon links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      
      threshold: threshold ? parseInt(threshold) : undefined,
      
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      
      rrList: itemRRList
    });
  }

  /**
   * Handle attacking with threshold (spell)
   */
  private async _onAttackThresholdSpell(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    const threshold = element.data('threshold') || element.attr('data-threshold');
    const itemName = element.data('item-name') || element.attr('data-item-name');
    const spellVD = element.data('spell-vd') || element.attr('data-spell-vd') || '0';

    if (!itemId) return;

    const spell = this.actor.items.get(itemId);
    if (!spell || spell.type !== 'feat') return;

    const spellSystem = spell.system as any;
    const weaponType = spellSystem.weaponType;
    
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

    const itemRRList = spellSystem.rrList || [];

    // Merge weapon type links with custom fields (weapon type has priority)
    const finalAttackSkill = weaponLinkedSkill || spellSystem.linkedAttackSkill || '';
    const finalAttackSpec = weaponLinkedSpecialization || spellSystem.linkedAttackSpecialization || '';
    const finalDefenseSkill = weaponLinkedDefenseSkill || spellSystem.linkedDefenseSkill || '';
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || spellSystem.linkedDefenseSpecialization || '';

    // Find actor's skill and specialization based on spell links
    let attackSkillName = '';
    let attackSkillLevel = 0;
    let attackSpecName = '';
    let attackSpecLevel = 0;
    let attackLinkedAttribute = '';
    
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
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        
        // Get parent skill for specialization
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find((i: any) => 
            i.type === 'skill' && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = (parentSkill.system as any).rating || 0;
            attackSkillLevel = skillRating;  // Just the skill rating (without attribute)
            attackSpecLevel = attributeValue + skillRating + 2; // Total dice pool (attribute + rating + 2)
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
        attackLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        const skillRating = (foundSkill.system as any).rating || 0;
        attackSkillLevel = attributeValue + skillRating; // Total dice pool (attribute + rating)
      }
    }

    // Calculate final damage value (base + bonus)
    const baseDamageValue = spellSystem.damageValue || '0';
    const damageValueBonus = spellSystem.damageValueBonus || 0;
    
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

    DiceRoller.handleRollRequest({
      itemType: 'spell',
      weaponType: weaponType,
      itemName: itemName || spell.name,
      itemId: itemId,
      itemRating: spellSystem.rating || 0,
      itemActive: spellSystem.active,
      
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      
      isWeaponFocus: spellSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,  // FINAL damage value (base + bonus)
      damageValueBonus: damageValueBonus,
      meleeRange: spellSystem.meleeRange,
      shortRange: spellSystem.shortRange,
      mediumRange: spellSystem.mediumRange,
      longRange: spellSystem.longRange,
      
      // Attack skill/spec from actor (based on spell links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      
      threshold: threshold ? parseInt(threshold) : undefined,
      
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      
      rrList: itemRRList
    });
  }

  /**
   * Handle rolling NPC weapon with dice
   */
  private async _onRollNPCWeaponDice(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    const weaponVD = element.data('weapon-vd') || element.attr('data-weapon-vd') || '0';

    if (!itemId) return;

    const weapon = this.actor.items.get(itemId);
    if (!weapon || weapon.type !== 'feat') return;

    const weaponSystem = weapon.system as any;
    const weaponType = weaponSystem.weaponType;
    
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

    const itemRRList = weaponSystem.rrList || [];

    // Merge weapon type links with custom fields (weapon type has priority)
    const finalAttackSkill = weaponLinkedSkill || weaponSystem.linkedAttackSkill || '';
    const finalAttackSpec = weaponLinkedSpecialization || weaponSystem.linkedAttackSpecialization || '';
    const finalDefenseSkill = weaponLinkedDefenseSkill || weaponSystem.linkedDefenseSkill || '';
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || weaponSystem.linkedDefenseSpecialization || '';

    // Find actor's skill and specialization based on weapon links
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
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        
        // Get parent skill for specialization
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find((i: any) => 
            i.type === 'skill' && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = (parentSkill.system as any).rating || 0;
            attackSkillLevel = skillRating;  // Just the skill rating (without attribute)
            attackSpecLevel = attributeValue + skillRating + 2; // Total dice pool (attribute + rating + 2)
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
        attackLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        const skillRating = (foundSkill.system as any).rating || 0;
        attackSkillLevel = attributeValue + skillRating; // Total dice pool (attribute + rating)
      }
    }

    // Calculate final damage value (base + bonus)
    const baseDamageValue = weaponSystem.damageValue || '0';
    const damageValueBonus = weaponSystem.damageValueBonus || 0;
    
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

    DiceRoller.handleRollRequest({
      itemType: 'weapon',
      weaponType: weaponType,
      itemName: weapon.name,
      itemId: itemId,
      itemRating: weaponSystem.rating || 0,
      itemActive: weaponSystem.active,
      
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      
      isWeaponFocus: weaponSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,  // FINAL damage value (base + bonus)
      damageValueBonus: damageValueBonus,
      meleeRange: weaponSystem.meleeRange,
      shortRange: weaponSystem.shortRange,
      mediumRange: weaponSystem.mediumRange,
      longRange: weaponSystem.longRange,
      
      // Attack skill/spec from actor (based on weapon links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      
      rrList: itemRRList
    });
  }

  /**
   * Handle rolling NPC spell with dice
   */
  private async _onRollNPCSpellDice(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data('item-id') || element.attr('data-item-id');
    const spellVD = element.data('spell-vd') || element.attr('data-spell-vd') || '0';

    if (!itemId) return;

    const spell = this.actor.items.get(itemId);
    if (!spell || spell.type !== 'feat') return;

    const spellSystem = spell.system as any;
    const weaponType = spellSystem.weaponType;
    
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

    const itemRRList = spellSystem.rrList || [];

    // Merge weapon type links with custom fields (weapon type has priority)
    const finalAttackSkill = weaponLinkedSkill || spellSystem.linkedAttackSkill || '';
    const finalAttackSpec = weaponLinkedSpecialization || spellSystem.linkedAttackSpecialization || '';
    const finalDefenseSkill = weaponLinkedDefenseSkill || spellSystem.linkedDefenseSkill || '';
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || spellSystem.linkedDefenseSpecialization || '';

    // Find actor's skill and specialization based on spell links
    let attackSkillName = '';
    let attackSkillLevel = 0;
    let attackSpecName = '';
    let attackSpecLevel = 0;
    let attackLinkedAttribute = '';
    
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
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        
        // Get parent skill for specialization
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find((i: any) => 
            i.type === 'skill' && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = (parentSkill.system as any).rating || 0;
            attackSkillLevel = skillRating;  // Just the skill rating (without attribute)
            attackSpecLevel = attributeValue + skillRating + 2; // Total dice pool (attribute + rating + 2)
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
        attackLinkedAttribute = (foundSkill.system as any).linkedAttribute || 'strength';
        const attributeValue = attackLinkedAttribute ? ((this.actor.system as any).attributes?.[attackLinkedAttribute] || 0) : 0;
        const skillRating = (foundSkill.system as any).rating || 0;
        attackSkillLevel = attributeValue + skillRating; // Total dice pool (attribute + rating)
      }
    }

    // Calculate final damage value (base + bonus)
    const baseDamageValue = spellSystem.damageValue || '0';
    const damageValueBonus = spellSystem.damageValueBonus || 0;
    
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

    DiceRoller.handleRollRequest({
      itemType: 'spell',
      weaponType: weaponType,
      itemName: spell.name,
      itemId: itemId,
      itemRating: spellSystem.rating || 0,
      itemActive: spellSystem.active,
      
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      
      isWeaponFocus: spellSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,  // FINAL damage value (base + bonus)
      damageValueBonus: damageValueBonus,
      meleeRange: spellSystem.meleeRange,
      shortRange: spellSystem.shortRange,
      mediumRange: spellSystem.mediumRange,
      longRange: spellSystem.longRange,
      
      // Attack skill/spec from actor (based on spell links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      
      rrList: itemRRList
    });
  }

  /**
   * REMOVED: NPC weapon/spell roll with dice
   */
  private async _rollNPCWeaponOrSpellWithDice(item: any, type: 'weapon' | 'spell', weaponVD: string): Promise<void> {
    console.log('NPC weapon/spell dice roll disabled', { item: item.name, type, weaponVD });
  }

  /**
   * REMOVED: Skill with weapon roll for NPC
   */
  private async _rollSkillWithWeapon(skill: any, weaponName: string, skillType: string, weaponDamageValue: string, weapon?: any): Promise<void> {
    console.log('NPC skill with weapon roll disabled', { skill: skill.name, weaponName, skillType });
  }

  /**
   * REMOVED: Attack with defense system for NPC
   */
  private async _rollAttackWithDefenseNPC(skillName: string, dicePool: number, riskDice: number = 0, riskReduction: number = 0, rollMode: string = 'normal', weaponDamageValue?: string, attackingWeapon?: any): Promise<void> {
    console.log('NPC attack with defense disabled', { skillName, dicePool, riskDice, riskReduction, rollMode });
  }

  /**
   * REMOVED: Display roll result with VD
   */
  private async _displayRollResultWithVD(skillName: string, rollResult: any, weaponDamageValue?: string, damageValueBonus?: number): Promise<void> {
    console.log('NPC roll result display disabled', { skillName, weaponDamageValue });
  }

  /**
   * REMOVED: Defense roll prompt with attack result
   */
  private async _promptDefenseRollWithAttackResult(defenderActor: any, attackResult: any, attackName: string, weaponDamageValue: string, attackingWeapon?: any, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    console.log('Defense roll prompt with attack result disabled', { defenderActor: defenderActor.name, attackName });
  }

  /**
   * REMOVED: Defense roll prompt with VD
   */
  private async _promptDefenseRollWithVD(defenderActor: any, attackThreshold: number, attackName: string, weaponDamageValue: string, attackingWeapon?: any, defenderToken?: any): Promise<void> {
    console.log('Defense roll prompt with VD disabled', { defenderActor: defenderActor.name, attackName, weaponDamageValue });
  }

  /**
   * REMOVED: Threshold defense against dice attack
   */
  private async _defendWithThresholdAgainstDiceAttack(defenseItem: any, threshold: number, attackName: string, attackResult: any, defenderActor: any, weaponDamageValue: string, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    console.log('Threshold defense against dice attack disabled', { defenseItem: defenseItem.name, threshold, attackName });
  }

  /**
   * REMOVED: Defense roll against NPC dice attack
   */
  private async _rollDefenseAgainstNPCDiceAttack(defenseItem: any, itemType: 'skill' | 'spec', attackName: string, attackResult: any, defenderActor: any, weaponDamageValue: string, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    console.log('Defense roll against NPC dice attack disabled', { defenseItem: defenseItem.name, itemType, attackName });
  }

  /**
   * REMOVED: NPC dice attack result display
   */
  private async _displayNPCDiceAttackResult(attackName: string, attackResult: any, defenseResult: any | null, defenderActor: any, weaponDamageValue: string, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    console.log('NPC dice attack result display disabled', { attackName, defenderActor: defenderActor.name, weaponDamageValue });
  }



  /**
   * REMOVED: Threshold defense against weapon attack
   */
  private async _defendWithThresholdAgainstWeapon(defenseItem: any, threshold: number, attackName: string, attackThreshold: number, defenderActor: any, weaponDamageValue: string, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    console.log('Threshold defense against weapon attack disabled', { defenseItem: defenseItem.name, threshold, attackName });
  }

  /**
   * REMOVED: Defense roll against NPC weapon attack
   */
  private async _rollDefenseAgainstNPCWeapon(defenseItem: any, itemType: 'skill' | 'spec', attackName: string, attackThreshold: number, defenderActor: any, weaponDamageValue: string, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    console.log('Defense roll against NPC weapon attack disabled', { defenseItem: defenseItem.name, itemType, attackName });
  }

  /**
   * REMOVED: NPC weapon attack result display
   */
  private async _displayNPCWeaponAttackResult(attackName: string, attackThreshold: number, defenseResult: any | null, defenderActor: any, weaponDamageValue: string, damageValueBonus?: number, defenderToken?: any): Promise<void> {
    console.log('NPC weapon attack result display disabled', { attackName, attackThreshold, defenderActor: defenderActor.name });
  }


  /**
   * Get RR sources from active feats
   */
  private getRRSources(itemType: 'skill' | 'specialization' | 'attribute', itemName: string): Array<{ featName: string, rrValue: number }> {
    return SheetHelpers.getRRSources(this.actor, itemType, itemName);
  }

  /**
   * REMOVED: Skill dice rolling logic
   */
  private async _rollSkillDice(skillName: string, dicePool: number, riskDice: number = 0, riskReduction: number = 0, rollMode: string = 'normal'): Promise<void> {
    console.log('NPC dice roll disabled', { skillName, dicePool, riskDice, riskReduction, rollMode });
  }


  /**
   * Show item browser dialog
   */
  private async _showItemBrowser(itemType: string): Promise<void> {
    const items = game.items!.filter((item: any) => item.type === itemType);
    
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
                await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
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

  protected override async _onDropItem(_event: DragEvent, data: ActorSheet.DropData.Item): Promise<unknown> {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;

    // Check if item already exists on the actor
    const existingItem = this.actor.items.find((i: any) => i.name === item.name && i.type === item.type);
    if (existingItem) {
      ui.notifications!.warn(game.i18n!.format('SRA2.ALREADY_EXISTS', { name: item.name }));
      return false;
    }

    // Create the item on the actor
    return await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
  }
}


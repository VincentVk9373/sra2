import { RollRequestData } from '../helpers/dice-roller.js';
import * as SheetHelpers from '../helpers/sheet-helpers.js';

/**
 * Roll Dialog Application
 * Displays roll information in a popup dialog
 */
export class RollDialog extends Application {
  private rollData: RollRequestData;
  private actor: any = null;
  private attackerToken: any = null;
  private targetToken: any = null;
  private rrEnabled: Map<string, boolean> = new Map(); // Track which RR sources are enabled
  private riskDiceCount: number = 2; // Number of risk dice selected (default: 2)
  private selectedRange: string | null = null; // Selected range: 'melee', 'short', 'medium', 'long'
  private rollMode: 'normal' | 'disadvantage' | 'advantage' = 'normal'; // Roll mode

  constructor(rollData: RollRequestData) {
    super();
    this.rollData = rollData;
    
    // Get actor from roll data
    if (rollData.actorUuid) {
      this.actor = (fromUuidSync as any)(rollData.actorUuid);
    } else if (rollData.actorId) {
      this.actor = game.actors?.get(rollData.actorId) || null;
    }
    
    // Get attacker token (priority: rollData.attackerTokenUuid > canvas search)
    if (rollData.attackerTokenUuid) {
      try {
        this.attackerToken = (foundry.utils as any)?.fromUuidSync?.(rollData.attackerTokenUuid) || null;
        console.log('RollDialog: Attacker token loaded from UUID:', rollData.attackerTokenUuid);
      } catch (e) {
        console.warn('RollDialog: Failed to load attacker token from UUID:', e);
      }
    }
    
    // If no attacker token from UUID, try to find it on canvas
    if (!this.attackerToken && this.actor) {
      this.attackerToken = canvas?.tokens?.placeables?.find((token: any) => {
        return token.actor?.id === this.actor.id || token.actor?.uuid === this.actor.uuid;
      }) || null;
      if (this.attackerToken) {
        console.log('RollDialog: Attacker token found on canvas');
      }
    }
    
    // Get target token (first targeted token)
    const targets = Array.from(game.user?.targets || []);
    if (targets.length > 0) {
      this.targetToken = targets[0] || null;
    }
    
    // Also try to get defender token from rollData.defenderTokenUuid if available
    // Priority: rollData.defenderTokenUuid > selected targets
    if (rollData.defenderTokenUuid) {
      try {
        const defenderTokenFromUuid = (foundry.utils as any)?.fromUuidSync?.(rollData.defenderTokenUuid) || null;
        if (defenderTokenFromUuid) {
          this.targetToken = defenderTokenFromUuid;
        console.log('RollDialog: Defender token loaded from UUID:', rollData.defenderTokenUuid);
        }
      } catch (e) {
        console.warn('RollDialog: Failed to load defender token from UUID:', e);
      }
    }
    
    // If still no target token, try to find it on canvas based on defender info
    if (!this.targetToken && rollData.defenderTokenUuid) {
      // Try to find on canvas as fallback
      this.targetToken = canvas?.tokens?.placeables?.find((token: any) => {
        return token.uuid === rollData.defenderTokenUuid || 
               token.document?.uuid === rollData.defenderTokenUuid;
      }) || null;
    }
  }

  static override get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'roll-dialog'],
      template: 'systems/sra2/templates/roll-dialog.hbs',
      width: 760,
      height: 575,
      resizable: true,
      minimizable: false,
      title: 'Jet de Dés'
    });
  }

  override getData(): any {
    const context: any = {
      rollData: this.rollData,
      actor: this.actor,
      targetToken: this.targetToken
    };

    // Calculate distance between protagonist and target
    let distance: number | null = null;
    let distanceText: string = '';
    
    if (this.actor && this.targetToken && canvas?.grid) {
      // Get protagonist token
      const protagonistToken = canvas?.tokens?.placeables?.find((token: any) => {
        return token.actor?.id === this.actor.id || token.actor?.uuid === this.actor.uuid;
      });
      
      if (protagonistToken && this.targetToken) {
        try {
          // Calculate distance using Foundry's grid measurement
          const grid = canvas.grid as any;
          const distancePixels = grid.measureDistance(
            { x: protagonistToken.x, y: protagonistToken.y },
            { x: this.targetToken.x, y: this.targetToken.y },
            { gridSpaces: true }
          );
          
          if (typeof distancePixels === 'number' && !isNaN(distancePixels)) {
            distance = Math.round(distancePixels * 10) / 10; // Round to 1 decimal
            
            // Get grid units from scene
            const scene = canvas?.scene;
            const gridUnits = (scene?.grid as any)?.units || 'm';
            distanceText = `${distance} ${gridUnits}`;
          }
        } catch (e) {
          // Fallback: calculate euclidean distance
          const dx = this.targetToken.x - protagonistToken.x;
          const dy = this.targetToken.y - protagonistToken.y;
          const pixelDistance = Math.sqrt(dx * dx + dy * dy);
          const gridSize = (canvas.grid as any)?.size || 1;
          const gridDistance = pixelDistance / gridSize;
          distance = Math.round(gridDistance * 10) / 10;
          
          const scene = canvas?.scene;
          const gridUnits = (scene?.grid as any)?.units || 'm';
          distanceText = `${distance} ${gridUnits}`;
        }
      }
    }
    
    context.distance = distance;
    context.distanceText = distanceText;

    // Calculate range based on distance for default selection (only if not already selected by user)
    let calculatedRange: string | null = null;
    
    // Calculate what range should be based on distance (for display purposes)
    if (distance !== null) {
      if (distance < 3) {
        calculatedRange = 'melee';
      } else if (distance >= 3 && distance <= 15) {
        calculatedRange = 'short';
      } else if (distance > 15 && distance <= 60) {
        calculatedRange = 'medium';
      } else if (distance > 60) {
        calculatedRange = 'long';
      }
    }
    
    // Only set default range if user hasn't selected one yet
    if (this.selectedRange === null) {
      // For counter-attacks, always default to melee range
      if (this.rollData.isCounterAttack) {
        this.selectedRange = 'melee';
      } else if (calculatedRange !== null) {
        // For other cases, use calculated range based on distance
        this.selectedRange = calculatedRange;
      }
    }
    // If selectedRange is already set, don't change it (user selection is preserved)

    // Get weapon range properties
    const meleeRange = this.rollData.meleeRange || 'none';
    const shortRange = this.rollData.shortRange || 'none';
    const mediumRange = this.rollData.mediumRange || 'none';
    const longRange = this.rollData.longRange || 'none';

    // Check if this is a weapon roll (has range properties)
    const isWeaponRoll = this.rollData.itemType === 'weapon' || 
                         this.rollData.weaponType !== undefined ||
                         (meleeRange !== 'none' || shortRange !== 'none' || mediumRange !== 'none' || longRange !== 'none');

    // Get range value for selected range
    let selectedRangeValue: string | null = null;
    if (this.selectedRange === 'melee') {
      selectedRangeValue = meleeRange;
    } else if (this.selectedRange === 'short') {
      selectedRangeValue = shortRange;
    } else if (this.selectedRange === 'medium') {
      selectedRangeValue = mediumRange;
    } else if (this.selectedRange === 'long') {
      selectedRangeValue = longRange;
    }

    // Determine roll mode based on range value (but allow user to override)
    if (selectedRangeValue === 'disadvantage') {
      this.rollMode = 'disadvantage';
    } else if (selectedRangeValue === 'ok') {
      this.rollMode = 'normal';
    }
    // Allow selection even if range is 'none' - user can still roll

    context.isWeaponRoll = isWeaponRoll;
    context.calculatedRange = calculatedRange;
    context.selectedRange = this.selectedRange;
    context.selectedRangeValue = selectedRangeValue;
    context.rollMode = this.rollMode;
    context.rangeOptions = {
      melee: { label: 'Mêlée (< 3m)', value: meleeRange },
      short: { label: 'Portée courte (3-15m)', value: shortRange },
      medium: { label: 'Portée moyenne (15-60m)', value: mediumRange },
      long: { label: 'Portée longue (> 60m)', value: longRange }
    };

    // Calculate dice pool
    let dicePool = 0;
    if (this.rollData.specLevel !== undefined) {
      dicePool = this.rollData.specLevel;
    } else if (this.rollData.skillLevel !== undefined) {
      dicePool = this.rollData.skillLevel;
    } else if (this.rollData.linkedAttribute) {
      const attributeValue = (this.actor?.system as any)?.attributes?.[this.rollData.linkedAttribute] || 0;
      dicePool = attributeValue;
    }
    context.dicePool = dicePool;

    let threshold = this.rollData.threshold;
    context.threshold = threshold;
    context.hasThreshold = threshold !== undefined;

    // Get skill/spec name
    context.skillDisplayName = this.rollData.specName || this.rollData.skillName || this.rollData.linkedAttackSkill || 'Aucune';

    // Calculate total RR and get RR sources
    // For defense rolls, always recalculate rrList from defender's skill/spec to ensure we use the correct actor
    // For attack rolls, use rollData.rrList as passed from character-sheet/npc-sheet (already merged: item RR + skill/spec/attribute RR)
    // rrList already contains RRSource objects with featName and rrValue (enriched before passing to handleRollRequest)
    
    // For defense rolls, always recalculate rrList from this.actor (the defender) to ensure correctness
    if (this.rollData.isDefend && this.actor) {
      const { getRRSources } = SheetHelpers;
      let defenseRRList: any[] = [];
      
      if (this.rollData.specName) {
        const rrSources = getRRSources(this.actor, 'specialization', this.rollData.specName);
        defenseRRList = rrSources.map((rr: any) => ({
          ...rr,
          featName: rr.featName
        }));
      } else if (this.rollData.skillName) {
        const rrSources = getRRSources(this.actor, 'skill', this.rollData.skillName);
        defenseRRList = rrSources.map((rr: any) => ({
          ...rr,
          featName: rr.featName
        }));
      }
      
      // Also add attribute RR if linkedAttribute is set
      if (this.rollData.linkedAttribute) {
        const attributeRRSources = getRRSources(this.actor, 'attribute', this.rollData.linkedAttribute);
        const attributeRRList = attributeRRSources.map((rr: any) => ({
          ...rr,
          featName: rr.featName
        }));
        defenseRRList = [...defenseRRList, ...attributeRRList];
      }
      
      // Always update rollData with correct rrList from defender
      this.rollData.rrList = defenseRRList;
    }
    // For attack rolls (not defense), use rollData.rrList as is (already merged in character-sheet.ts/npc-sheet.ts)
    // The rrList should already contain: item RR + skill/spec/attribute RR
    // No need to recalculate here, it's already correct from the sheet
    
    let totalRR = 0;
    const rrSources: any[] = [];
    if (this.rollData.rrList && Array.isArray(this.rollData.rrList)) {
      for (const rrSource of this.rollData.rrList) {
        if (rrSource && typeof rrSource === 'object') {
          const rrValue = rrSource.rrValue || 0;
          if (rrValue > 0) {
            // featName is now always present in rrList (enriched in character-sheet.ts and npc-sheet.ts)
            const featName = rrSource.featName || 'Inconnu';
            const rrId = `${featName}-${rrValue}`;
            
            // Initialize as enabled if not already set
            if (!this.rrEnabled.has(rrId)) {
              this.rrEnabled.set(rrId, true);
            }
            
            const isEnabled = this.rrEnabled.get(rrId) || false;
            
            rrSources.push({
              id: rrId,
              featName: featName,
              rrValue: rrValue,
              enabled: isEnabled
            });
            
            if (isEnabled) {
              totalRR += rrValue;
            }
          }
        }
      }
    }
    context.totalRR = Math.min(3, totalRR); // RR is capped at 3
    context.rrSources = rrSources;

    // Get VD (Valeur de Défense) - this would be from the target or weapon
    // For now, we'll show weapon VD if available
    context.vd = this.rollData.damageValue || 0;

    // Function to determine dice color based on RR and position
    const getDiceColor = (dicePosition: number, rr: number): string => {
      // dicePosition is 1-indexed (first die is position 1)
      if (rr === 0) {
        if (dicePosition === 1) return 'green';
        if (dicePosition >= 2 && dicePosition <= 3) return 'yellow';
        if (dicePosition >= 4 && dicePosition <= 5) return 'orange';
        return 'red';
      } else if (rr === 1) {
        if (dicePosition >= 1 && dicePosition <= 4) return 'green';
        if (dicePosition >= 5 && dicePosition <= 6) return 'yellow';
        if (dicePosition >= 7 && dicePosition <= 9) return 'orange';
        return 'red';
      } else if (rr === 2) {
        if (dicePosition >= 1 && dicePosition <= 7) return 'green';
        if (dicePosition >= 8 && dicePosition <= 9) return 'yellow';
        if (dicePosition >= 10 && dicePosition <= 12) return 'orange';
        return 'red';
      } else if (rr === 3) {
        if (dicePosition >= 1 && dicePosition <= 10) return 'green';
        if (dicePosition >= 11 && dicePosition <= 12) return 'yellow';
        if (dicePosition >= 13 && dicePosition <= 16) return 'orange';
        return 'red';
      }
      // Default to green if RR is invalid
      return 'green';
    };
    
    // Generate dice list for visual display with selection state and risk color
    context.diceList = [];
    const currentRR = Math.min(3, totalRR); // Use the calculated RR
    for (let i = 0; i < dicePool; i++) {
      const dicePosition = i + 1; // 1-indexed position
      const riskColor = getDiceColor(dicePosition, currentRR);
      context.diceList.push({ 
        index: i,
        isRiskDice: i < this.riskDiceCount,  // First N dice are risk dice
        riskColor: riskColor  // Color based on RR and position
      });
    }
    context.riskDiceCount = this.riskDiceCount;

    // Get all skills and specializations from actor, organized hierarchically
    if (this.actor) {
      const skills = this.actor.items
        .filter((item: any) => item.type === 'skill')
        .map((skill: any) => {
          const linkedAttribute = skill.system?.linkedAttribute || 'strength';
          const attributeValue = (this.actor?.system as any)?.attributes?.[linkedAttribute] || 0;
          const skillRating = skill.system?.rating || 0;
          return {
            id: skill.id,
            name: skill.name,
            rating: skillRating,
            linkedAttribute: linkedAttribute,
            dicePool: attributeValue + skillRating,
            type: 'skill',
            specializations: [] as any[]
          };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      // Get all specializations and group them under their parent skills
      const allSpecializations = this.actor.items
        .filter((item: any) => item.type === 'specialization')
        .map((spec: any) => {
          const linkedAttribute = spec.system?.linkedAttribute || 'strength';
          const linkedSkillName = spec.system?.linkedSkill;
          const attributeValue = (this.actor?.system as any)?.attributes?.[linkedAttribute] || 0;
          
          // Find parent skill
          const parentSkill = this.actor!.items.find((i: any) => 
            i.type === 'skill' && i.name === linkedSkillName
          );
          const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
          const effectiveRating = skillRating + 2; // +2 from specialization
          
          return {
            id: spec.id,
            name: spec.name,
            rating: effectiveRating,
            linkedAttribute: linkedAttribute,
            dicePool: attributeValue + effectiveRating,
            type: 'specialization',
            linkedSkillName: linkedSkillName
          };
        });

      // Group specializations under their parent skills
      for (const spec of allSpecializations) {
        const parentSkill = skills.find((s: any) => s.name === spec.linkedSkillName);
        if (parentSkill) {
          parentSkill.specializations.push(spec);
        }
      }

      // Sort specializations within each skill
      for (const skill of skills) {
        skill.specializations.sort((a: any, b: any) => a.name.localeCompare(b.name));
      }

      // Create flat list for dropdown (skill first, then its specializations)
      const dropdownOptions: any[] = [];
      for (const skill of skills) {
        // Add skill option
        const skillSelected = skill.name === this.rollData.skillName || 
                             (this.rollData.linkedAttackSkill && skill.name === this.rollData.linkedAttackSkill);
        dropdownOptions.push({
          value: `skill:${skill.id}`,
          label: `${skill.name} (${skill.dicePool} dés)`,
          type: 'skill',
          id: skill.id,
          name: skill.name,
          dicePool: skill.dicePool,
          linkedAttribute: skill.linkedAttribute,
          rating: skill.rating,
          isSelected: skillSelected && !this.rollData.specName
        });

        // Add specializations under this skill
        for (const spec of skill.specializations) {
          const specSelected = spec.name === this.rollData.specName ||
                              (this.rollData.linkedAttackSpecialization && spec.name === this.rollData.linkedAttackSpecialization);
          dropdownOptions.push({
            value: `spec:${spec.id}`,
            label: `  └ ${spec.name} (${spec.dicePool} dés)`,
            type: 'specialization',
            id: spec.id,
            name: spec.name,
            dicePool: spec.dicePool,
            linkedAttribute: spec.linkedAttribute,
            linkedSkillName: spec.linkedSkillName,
            rating: spec.rating,
            isSelected: specSelected
          });
        }
      }

      context.skillsWithSpecs = skills;
      context.dropdownOptions = dropdownOptions;
      
      // Determine selected value for dropdown
      if (this.rollData.specName) {
        const selectedSpec = dropdownOptions.find((opt: any) => opt.type === 'specialization' && opt.name === this.rollData.specName);
        context.selectedValue = selectedSpec ? selectedSpec.value : '';
      } else if (this.rollData.skillName) {
        const selectedSkill = dropdownOptions.find((opt: any) => opt.type === 'skill' && opt.name === this.rollData.skillName);
        context.selectedValue = selectedSkill ? selectedSkill.value : '';
      } else {
        context.selectedValue = '';
      }
    }

    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    
    // Close button
    html.find('.close-button').on('click', () => {
      this.close();
    });

    // Weapon selection for counter-attack
    html.find('.weapon-select').on('change', async (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      const weaponId = select.value;
      
      if (!weaponId || !this.rollData.availableWeapons || !this.actor) return;
      
      const selectedWeapon = this.rollData.availableWeapons.find((w: any) => w.id === weaponId);
      if (!selectedWeapon) return;

      // Get the actual weapon item to check its linkedAttackSkill and linkedAttackSpecialization
      const actualWeapon = this.actor.items.find((item: any) => item.id === weaponId);
      const weaponSystem = actualWeapon?.system as any;
      
      // Get linkedAttackSkill from weapon (this should be the base skill name)
      let baseSkillName = weaponSystem?.linkedAttackSkill || selectedWeapon.linkedAttackSkill;
      const weaponLinkedSpecialization = weaponSystem?.linkedAttackSpecialization;
      
      const damageValue = selectedWeapon.damageValue;
      const damageValueBonus = selectedWeapon.damageValueBonus || 0;

      // Default to "Combat rapproché" if no skill found
      if (!baseSkillName) {
        baseSkillName = 'Combat rapproché';
      }

      // Find the linked skill in actor's items
      const linkedSkillItem = this.actor.items.find((item: any) => 
        item.type === 'skill' && item.name === baseSkillName
      );

      // Find specializations for the linked skill
      const linkedSpecs = this.actor.items.filter((item: any) => 
        item.type === 'specialization' && 
        item.system.linkedSkill === baseSkillName
      );
      
      // Check if weapon has a specialization and if actor has that specialization
      let preferredSpecName: string | undefined = undefined;
      if (weaponLinkedSpecialization) {
        const specExists = linkedSpecs.find((spec: any) => 
          spec.name === weaponLinkedSpecialization
        );
        if (specExists) {
          preferredSpecName = weaponLinkedSpecialization;
        }
      }

      // Calculate skill level and linked attribute
      let skillLevel: number | undefined = undefined;
      let specLevel: number | undefined = undefined;
      let linkedAttribute: string | undefined = undefined;
      let skillName: string | undefined = baseSkillName;
      let specName: string | undefined = undefined;

      if (linkedSkillItem) {
        const skillSystem = linkedSkillItem.system as any;
        const skillRating = skillSystem.rating || 0;
        linkedAttribute = skillSystem.linkedAttribute || 'strength';
        const attributeValue = linkedAttribute ? ((this.actor.system as any)?.attributes?.[linkedAttribute] || 0) : 0;
        
        skillLevel = attributeValue + skillRating;
      }

      // Get RR sources
      const { getRRSources } = await import('../helpers/sheet-helpers.js');
      let rrList: any[] = [];
      
      // Simple logic: if weapon has a specialization and actor has it, use it
      // Otherwise, use the skill
      if (preferredSpecName) {
        // Weapon has a specialization and actor has it - use the specialization
        specName = preferredSpecName;
        const attributeValue = linkedAttribute ? ((this.actor.system as any)?.attributes?.[linkedAttribute] || 0) : 0;
        const parentSkill = linkedSkillItem;
        const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
        specLevel = attributeValue + skillRating + 2;
        
        const rrSources = getRRSources(this.actor, 'specialization', specName);
        rrList = rrSources.map((rr: any) => ({
          ...rr,
          featName: rr.featName
        }));
      } else {
        // Use skill (no specialization or actor doesn't have the specialization)
        if (skillName) {
          const rrSources = getRRSources(this.actor, 'skill', skillName);
          rrList = rrSources.map((rr: any) => ({
            ...rr,
            featName: rr.featName
          }));
        }
      }

      // Update roll data with weapon information
      this.rollData.skillName = skillName;
      this.rollData.specName = specName;
      this.rollData.linkedAttackSkill = baseSkillName;
      this.rollData.linkedAttribute = linkedAttribute;
      this.rollData.skillLevel = skillLevel;
      this.rollData.specLevel = specLevel;
      this.rollData.itemName = selectedWeapon.name;
      this.rollData.itemType = 'weapon';
      this.rollData.damageValue = damageValue;
      this.rollData.damageValueBonus = damageValueBonus;
      this.rollData.rrList = rrList;
      this.rollData.selectedWeaponId = weaponId; // Store selected weapon ID for template

      // Re-render to update the UI
      this.render();
    });

    // Skill/Spec selection dropdown (only if no threshold)
    html.find('.skill-dropdown').on('change', (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      
      // Don't allow changes if threshold is set
      if (this.rollData.threshold !== undefined) {
        return;
      }
      
      const value = select.value;
      
      if (!value || !this.actor) return;

      const [type, id] = value.split(':');
      if (!type || !id) return;

      const item = this.actor.items.get(id);
      if (!item) return;

      if (type === 'skill') {
        const skillSystem = item.system as any;
        const linkedAttribute = skillSystem.linkedAttribute || 'strength';
        const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
        const skillRating = skillSystem.rating || 0;
        const dicePool = attributeValue + skillRating;
        
        // Update roll data
        this.rollData.skillName = item.name;
        this.rollData.specName = undefined;
        this.rollData.skillLevel = dicePool;
        this.rollData.specLevel = undefined;
        this.rollData.linkedAttribute = linkedAttribute;
        
        // Recalculate RR and threshold (synchronously)
        this.updateRRForSkill(item.name, linkedAttribute, dicePool);
        
        // Re-render after RR is updated
        this.render();
      } else if (type === 'spec') {
        const specSystem = item.system as any;
        const linkedAttribute = specSystem.linkedAttribute || 'strength';
        const linkedSkillName = specSystem.linkedSkill;
        const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
        
        // Find parent skill
        const parentSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
        const effectiveRating = skillRating + 2;
        const dicePool = attributeValue + effectiveRating;
        
        // Update roll data
        this.rollData.specName = item.name;
        this.rollData.skillName = linkedSkillName;
        this.rollData.skillLevel = skillRating;
        this.rollData.specLevel = dicePool;
        this.rollData.linkedAttribute = linkedAttribute;
        
        // Recalculate RR and threshold (synchronously)
        this.updateRRForSpec(item.name, linkedSkillName, linkedAttribute, dicePool);
        
        // Re-render after RR is updated
        this.render();
      }
    });

    // RR checkbox toggles
    html.find('.rr-checkbox').on('change', (event) => {
      const checkbox = event.currentTarget as HTMLInputElement;
      const rrId = checkbox.dataset.rrId;
      const enabled = checkbox.checked;
      
      if (rrId) {
        this.rrEnabled.set(rrId, enabled);
        // Re-render to update total RR
        this.render();
      }
    });

    // Range selection
    html.find('.range-dropdown').on('change', (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      const rangeValue = select.value;
      
      this.selectedRange = rangeValue || null;
      
      // Update roll mode based on range value
      if (this.selectedRange) {
        const meleeRange = this.rollData.meleeRange || 'none';
        const shortRange = this.rollData.shortRange || 'none';
        const mediumRange = this.rollData.mediumRange || 'none';
        const longRange = this.rollData.longRange || 'none';
        
        let rangeValueForSelected: string = 'none';
        if (this.selectedRange === 'melee') {
          rangeValueForSelected = meleeRange;
        } else if (this.selectedRange === 'short') {
          rangeValueForSelected = shortRange;
        } else if (this.selectedRange === 'medium') {
          rangeValueForSelected = mediumRange;
        } else if (this.selectedRange === 'long') {
          rangeValueForSelected = longRange;
        }
        
        // Auto-set roll mode based on range value (can be overridden by user)
        if (rangeValueForSelected === 'disadvantage') {
          this.rollMode = 'disadvantage';
        } else if (rangeValueForSelected === 'ok') {
          this.rollMode = 'normal';
        }
      }
      
      // Re-render to update UI
      this.render();
    });

    // Roll mode selection
    html.find('input[name="roll-mode"]').on('change', (event) => {
      const radio = event.currentTarget as HTMLInputElement;
      const modeValue = radio.value;
      
      if (modeValue === 'normal' || modeValue === 'disadvantage' || modeValue === 'advantage') {
        this.rollMode = modeValue as 'normal' | 'disadvantage' | 'advantage';
      }
    });

    // Risk dice selection
    html.find('.dice-icon').on('click', (event) => {
      const diceIcon = $(event.currentTarget);
      const diceIndex = parseInt(diceIcon.data('dice-index') || '0');
      const isCurrentlySelected = diceIcon.hasClass('risk-dice');
      
      // If clicking on the last selected dice, deselect all
      if (isCurrentlySelected && diceIndex === this.riskDiceCount - 1) {
        this.riskDiceCount = 0;
      } else {
        // Otherwise, select all dice up to and including the clicked one
        this.riskDiceCount = diceIndex + 1;
      }
      
      // Re-render to update dice selection
      this.render();
    });

    // Roll Dice button
    html.find('.roll-dice-button').on('click', async () => {
      // Calculate final RR based on enabled checkboxes
      let finalRR = 0;
      if (this.rollData.rrList && Array.isArray(this.rollData.rrList)) {
        for (const rrSource of this.rollData.rrList) {
          if (rrSource && typeof rrSource === 'object') {
            const rrValue = rrSource.rrValue || 0;
            const featName = rrSource.featName || 'Inconnu';
            const rrId = `${featName}-${rrValue}`;
            
            if (this.rrEnabled.get(rrId)) {
              finalRR += rrValue;
            }
          }
        }
      }
      
      // Update roll data with final RR
      const finalRRList = this.rollData.rrList?.filter((rr: any) => {
        const rrId = `${rr.featName || 'Inconnu'}-${rr.rrValue || 0}`;
        return this.rrEnabled.get(rrId);
      }) || [];
      
      // Calculate dice pool
      let dicePool = 0;
      if (this.rollData.specLevel !== undefined) {
        dicePool = this.rollData.specLevel;
      } else if (this.rollData.skillLevel !== undefined) {
        dicePool = this.rollData.skillLevel;
      } else if (this.rollData.linkedAttribute) {
        const attributeValue = (this.actor?.system as any)?.attributes?.[this.rollData.linkedAttribute] || 0;
        dicePool = attributeValue;
      }
      
      // Block defense roll if no skill/spec is selected (unless using threshold for NPCs)
      if (this.rollData.isDefend && !this.rollData.threshold) {
        if (!this.rollData.skillName && !this.rollData.specName && dicePool === 0) {
          ui.notifications?.warn(game.i18n!.localize('SRA2.ROLL_DIALOG.NO_SKILL_SELECTED') || 'Veuillez sélectionner une compétence pour la défense');
          return;
        }
      }
      
      // Get attacker and defender
      const attacker = this.actor;
      const attackerToken = this.attackerToken || null;
      const defender = this.targetToken?.actor || null;
      const defenderToken = this.targetToken || null;
      
      // Get token UUIDs
      const attackerTokenUuid = attackerToken?.uuid || attackerToken?.document?.uuid || undefined;
      const defenderTokenUuid = defenderToken?.uuid || defenderToken?.document?.uuid || undefined;
      
      // Log token information
      console.log('=== ROLL DICE BUTTON ===');
      console.log('Attacker:', attacker?.name || 'Unknown');
      console.log('Attacker Token:', attackerToken ? 'Found' : 'Not found');
      console.log('Attacker Token UUID:', attackerTokenUuid || 'Unknown');
      if (attackerToken?.actor) {
        console.log('Attacker Token Actor UUID:', attackerToken.actor.uuid || 'Unknown');
      }
      console.log('Defender:', defender?.name || 'None');
      console.log('Defender Token:', defenderToken ? 'Found' : 'Not found');
      console.log('Defender Token UUID:', defenderTokenUuid || 'Unknown');
      if (defenderToken?.actor) {
        console.log('Defender Token Actor UUID:', defenderToken.actor.uuid || 'Unknown');
      }
      console.log('========================');
      
      // Prepare roll data
      const updatedRollData = {
        ...this.rollData,
        rrList: finalRRList,
        riskDiceCount: this.riskDiceCount,  // Add risk dice count to roll data
        selectedRange: this.selectedRange,  // Add selected range
        rollMode: this.rollMode,  // Add roll mode (normal/disadvantage/advantage)
        finalRR: Math.min(3, finalRR),  // Final RR (capped at 3)
        dicePool: dicePool,
        attackerTokenUuid: attackerTokenUuid,  // Add attacker token UUID
        defenderTokenUuid: defenderTokenUuid   // Add defender token UUID
      };
      
      // Import and execute roll
      const { executeRoll } = await import('../helpers/dice-roller.js');
      await executeRoll(attacker, defender, attackerToken, defenderToken, updatedRollData);
      
      // Close the dialog
      this.close();
    });
  }

  private updateRRForSkill(skillName: string, linkedAttribute: string, dicePool: number): void {
    // For defense, always use this.actor (the defender)
    // For other rolls, also use this.actor (the one making the roll)
    if (!this.actor) return;
    
    // Get RR sources synchronously (already imported at top)
    // Always use this.actor which is correctly set to the defender for defense rolls
    const skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', skillName);
    const attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', linkedAttribute);
    
    // For weapon rolls, preserve the weapon's rrList (from item) and merge with skill/attribute RR
    // For non-weapon rolls, use only skill/attribute RR
    let itemRRList: any[] = [];
    if (this.rollData.itemId && this.rollData.itemType === 'weapon') {
      // Get the weapon item to extract its rrList
      const weapon = this.actor.items.get(this.rollData.itemId);
      if (weapon) {
        const weaponSystem = weapon.system as any;
        const rawItemRRList = weaponSystem.rrList || [];
        itemRRList = rawItemRRList.map((rrEntry: any) => ({
          ...rrEntry,
          featName: weapon.name  // Add featName (the weapon name itself)
        }));
      }
    }
    
    // Merge item RR (if weapon) + skill RR + attribute RR
    this.rollData.rrList = [...itemRRList, ...skillRRSources, ...attributeRRSources];
    
    // Reset RR enabled state for new sources
    this.rrEnabled.clear();
    for (const rrSource of this.rollData.rrList) {
      if (rrSource && typeof rrSource === 'object') {
        const rrValue = rrSource.rrValue || 0;
        const featName = rrSource.featName || 'Inconnu';
        if (rrValue > 0) {
          const rrId = `${featName}-${rrValue}`;
          this.rrEnabled.set(rrId, true);
        }
      }
    }
    
    // Recalculate threshold if it was set
    if (this.rollData.threshold !== undefined) {
      const totalRR = Math.min(3, skillRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0) + 
                                attributeRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0));
      this.rollData.threshold = Math.round(dicePool / 3) + totalRR + 1;
    }
  }

  private updateRRForSpec(specName: string, skillName: string, linkedAttribute: string, dicePool: number): void {
    // For defense, always use this.actor (the defender)
    // For other rolls, also use this.actor (the one making the roll)
    if (!this.actor) return;
    
    // Get RR sources synchronously (already imported at top)
    // Always use this.actor which is correctly set to the defender for defense rolls
    const specRRSources = SheetHelpers.getRRSources(this.actor, 'specialization', specName);
    const skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', skillName);
    const attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', linkedAttribute);
    
    // For weapon rolls, preserve the weapon's rrList (from item) and merge with spec/skill/attribute RR
    // For non-weapon rolls, use only spec/skill/attribute RR
    let itemRRList: any[] = [];
    if (this.rollData.itemId && this.rollData.itemType === 'weapon') {
      // Get the weapon item to extract its rrList
      const weapon = this.actor.items.get(this.rollData.itemId);
      if (weapon) {
        const weaponSystem = weapon.system as any;
        const rawItemRRList = weaponSystem.rrList || [];
        itemRRList = rawItemRRList.map((rrEntry: any) => ({
          ...rrEntry,
          featName: weapon.name  // Add featName (the weapon name itself)
        }));
      }
    }
    
    // Merge item RR (if weapon) + spec RR + skill RR + attribute RR
    this.rollData.rrList = [...itemRRList, ...specRRSources, ...skillRRSources, ...attributeRRSources];
    
    // Reset RR enabled state for new sources
    this.rrEnabled.clear();
    for (const rrSource of this.rollData.rrList) {
      if (rrSource && typeof rrSource === 'object') {
        const rrValue = rrSource.rrValue || 0;
        const featName = rrSource.featName || 'Inconnu';
        if (rrValue > 0) {
          const rrId = `${featName}-${rrValue}`;
          this.rrEnabled.set(rrId, true);
        }
      }
    }
    
    // Recalculate threshold if it was set
    if (this.rollData.threshold !== undefined) {
      const totalRR = Math.min(3, specRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0) + 
                                skillRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0) + 
                                attributeRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0));
      this.rollData.threshold = Math.round(dicePool / 3) + totalRR + 1;
    }
  }
}


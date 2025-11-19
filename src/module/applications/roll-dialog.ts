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
    if (rollData.defenderTokenUuid && !this.targetToken) {
      try {
        this.targetToken = (foundry.utils as any)?.fromUuidSync?.(rollData.defenderTokenUuid) || null;
        console.log('RollDialog: Defender token loaded from UUID:', rollData.defenderTokenUuid);
      } catch (e) {
        console.warn('RollDialog: Failed to load defender token from UUID:', e);
      }
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

    // Calculate range based on distance and weapon range properties
    let calculatedRange: string | null = null;
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

    // Always update selected range based on calculated distance (if available)
    if (calculatedRange !== null) {
      this.selectedRange = calculatedRange;
    }

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
    let isRangeValid: boolean = false;
    if (this.selectedRange === 'melee') {
      selectedRangeValue = meleeRange;
      isRangeValid = meleeRange !== 'none';
    } else if (this.selectedRange === 'short') {
      selectedRangeValue = shortRange;
      isRangeValid = shortRange !== 'none';
    } else if (this.selectedRange === 'medium') {
      selectedRangeValue = mediumRange;
      isRangeValid = mediumRange !== 'none';
    } else if (this.selectedRange === 'long') {
      selectedRangeValue = longRange;
      isRangeValid = longRange !== 'none';
    }

    // Determine roll mode based on range value
    if (selectedRangeValue === 'disadvantage') {
      this.rollMode = 'disadvantage';
    } else if (selectedRangeValue === 'ok') {
      this.rollMode = 'normal';
    } else if (selectedRangeValue === 'none' || selectedRangeValue === null) {
      // Invalid range, keep current mode but disable roll
    }

    context.isWeaponRoll = isWeaponRoll;
    context.calculatedRange = calculatedRange;
    context.selectedRange = this.selectedRange;
    context.selectedRangeValue = selectedRangeValue;
    context.isRangeValid = isRangeValid;
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
    // rrList already contains RRSource objects with featName and rrValue (enriched before passing to handleRollRequest)
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
    if (!this.actor) return;
    
    // Get RR sources synchronously (already imported at top)
    const skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', skillName);
    const attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', linkedAttribute);
    this.rollData.rrList = [...skillRRSources, ...attributeRRSources];
    
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
    if (!this.actor) return;
    
    // Get RR sources synchronously (already imported at top)
    const specRRSources = SheetHelpers.getRRSources(this.actor, 'specialization', specName);
    const skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', skillName);
    const attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', linkedAttribute);
    this.rollData.rrList = [...specRRSources, ...skillRRSources, ...attributeRRSources];
    
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


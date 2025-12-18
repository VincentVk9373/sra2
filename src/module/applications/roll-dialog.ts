import { RollRequestData } from '../helpers/dice-roller.js';
import * as DiceRoller from '../helpers/dice-roller.js';
import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as ItemSearch from '../../../item-search.js';
import { WEAPON_TYPES } from '../models/item-feat.js';
import shadowAmpProbabilities from '../config/shadow-amp-probabilities.json';

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
  private riskDiceCount: number = 0; // Number of risk dice selected (will be auto-set based on RR)
  private riskDiceManuallySet: boolean = false; // Track if user has manually changed risk dice selection
  private lastAutoRR: number = -1; // Track last RR value used for auto-selection
  private selectedRange: string | null = null; // Selected range: 'melee', 'short', 'medium', 'long'
  private rollMode: 'normal' | 'disadvantage' | 'advantage' = 'normal'; // Roll mode
  private manualRRBonus: string = ''; // Manual RR bonus entered by user

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
    
    // For vehicle weapons, we should prioritize selected targets over vehicle UUID
    // The defender should be the target, not the vehicle/drone itself
    const isVehicleWeapon = rollData.isVehicleWeapon;
    
    // Also try to get defender token from rollData.defenderTokenUuid if available
    // Priority: selected targets > rollData.defenderTokenUuid (unless no targets selected)
    // For vehicle weapons, always prioritize selected targets to avoid using the drone as defender
    if (!this.targetToken && rollData.defenderTokenUuid) {
      try {
        const defenderTokenFromUuid = (foundry.utils as any)?.fromUuidSync?.(rollData.defenderTokenUuid) || null;
        if (defenderTokenFromUuid) {
          // For vehicle weapons, skip if this is the vehicle itself (we want the target, not the drone)
          if (isVehicleWeapon && rollData.vehicleUuid) {
            const tokenActorUuid = defenderTokenFromUuid?.actor?.uuid || defenderTokenFromUuid?.document?.actorLink ? defenderTokenFromUuid?.actor?.uuid : undefined;
            if (tokenActorUuid === rollData.vehicleUuid) {
              console.log('RollDialog: Skipping vehicle token as defender for vehicle weapon - need target instead');
            } else {
              this.targetToken = defenderTokenFromUuid;
              console.log('RollDialog: Defender token loaded from UUID:', rollData.defenderTokenUuid);
            }
          } else {
            this.targetToken = defenderTokenFromUuid;
            console.log('RollDialog: Defender token loaded from UUID:', rollData.defenderTokenUuid);
          }
        }
      } catch (e) {
        console.warn('RollDialog: Failed to load defender token from UUID:', e);
      }
    }
    
    // If still no target token, try to find it on canvas based on defender info
    if (!this.targetToken && rollData.defenderTokenUuid) {
      // Try to find on canvas as fallback
      const foundToken = canvas?.tokens?.placeables?.find((token: any) => {
        return token.uuid === rollData.defenderTokenUuid || 
               token.document?.uuid === rollData.defenderTokenUuid;
      }) || null;
      
      // For vehicle weapons, skip if this is the vehicle itself
      if (foundToken && isVehicleWeapon && rollData.vehicleUuid) {
        const tokenActorUuid = foundToken?.actor?.uuid || undefined;
        if (tokenActorUuid !== rollData.vehicleUuid) {
          this.targetToken = foundToken;
        }
      } else if (foundToken) {
        this.targetToken = foundToken;
      }
    }
    
    // Auto-select best weapon for counter-attack
    if (rollData.isCounterAttack && rollData.availableWeapons && rollData.availableWeapons.length > 0 && this.actor) {
      this.autoSelectWeaponForCounterAttack();
    }
  }

  /**
   * Auto-select the best weapon for counter-attack
   * Priority: 1) Weapon with highest damage value, 2) Combat rapproché skill
   */
  private autoSelectWeaponForCounterAttack(): void {
    if (!this.rollData.availableWeapons || !this.actor) return;
    
    // Find weapon with highest damage value
    let bestWeapon: any = null;
    let highestDamage = -1;
    
    for (const weapon of this.rollData.availableWeapons) {
      const damageValueStr = weapon.damageValue || '0';
      let damageValue = 0;
      
      // Parse damage value (handle FOR, FOR+X, or numeric)
      if (damageValueStr === 'FOR') {
        damageValue = (this.actor.system as any)?.attributes?.strength || 1;
      } else if (damageValueStr.startsWith('FOR+')) {
        const bonus = parseInt(damageValueStr.substring(4)) || 0;
        damageValue = ((this.actor.system as any)?.attributes?.strength || 1) + bonus;
      } else {
        damageValue = parseInt(damageValueStr, 10) || 0;
      }
      
      // Add bonus
      damageValue += weapon.damageValueBonus || 0;
      
      if (damageValue > highestDamage) {
        highestDamage = damageValue;
        bestWeapon = weapon;
      }
    }
    
    // If we found a weapon with damage, select it
    if (bestWeapon && highestDamage > 0) {
      this.selectWeaponForCounterAttack(bestWeapon.id);
    } else {
      // Otherwise, select "Combat rapproché" skill
      this.selectCombatRapprocheSkill();
    }
  }
  
  /**
   * Select a specific weapon for counter-attack
   */
  private selectWeaponForCounterAttack(weaponId: string): void {
    if (!this.rollData.availableWeapons || !this.actor) return;
    
    const selectedWeapon = this.rollData.availableWeapons.find((w: any) => w.id === weaponId);
    if (!selectedWeapon) return;
    
    // Get the actual weapon item
    const actualWeapon = this.actor.items.find((item: any) => item.id === weaponId);
    const weaponSystem = actualWeapon?.system as any;
    
    // Get weapon type data from WEAPON_TYPES if available
    const wepTypeName = weaponSystem?.weaponType;
    const wepTypeData = wepTypeName ? WEAPON_TYPES[wepTypeName as keyof typeof WEAPON_TYPES] : undefined;
    
    // Get linkedAttackSkill and linkedAttackSpecialization
    let baseSkillName = weaponSystem?.linkedAttackSkill || wepTypeData?.linkedSkill || selectedWeapon.linkedAttackSkill;
    const weaponLinkedSpecialization = weaponSystem?.linkedAttackSpecialization || wepTypeData?.linkedSpecialization;
    
    // Calculate damage value with bonus from active feats (including adept powers)
    const baseDamageValue = selectedWeapon.damageValue || weaponSystem?.damageValue || '0';
    let damageValueBonus = selectedWeapon.damageValueBonus || weaponSystem?.damageValueBonus || 0;
    
    // Add bonus from active feats that match the weapon's type (including adept powers)
    const weaponType = wepTypeName || '';
    if (weaponType && this.actor) {
      const activeFeats = this.actor.items.filter((item: any) => 
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
    
    // Calculate final damage value string
    const damageValue = SheetHelpers.calculateRawDamageString(baseDamageValue, damageValueBonus);
    
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
    let rrList: any[] = [];
    
    // Get RR from weapon itself
    const weaponRRList = weaponSystem?.rrList || [];
    const itemRRList = weaponRRList.map((rrEntry: any) => ({
      ...rrEntry,
      featName: selectedWeapon.name
    }));
    
    let skillSpecRRList: any[] = [];
    
    if (preferredSpecName) {
      // Use specialization
      specName = preferredSpecName;
      const attributeValue = linkedAttribute ? ((this.actor.system as any)?.attributes?.[linkedAttribute] || 0) : 0;
      const parentSkill = linkedSkillItem;
      const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
      specLevel = attributeValue + skillRating + 2;
      
      const specRRSources = SheetHelpers.getRRSources(this.actor, 'specialization', specName);
      const skillRRSources = linkedSkillItem ? SheetHelpers.getRRSources(this.actor, 'skill', baseSkillName) : [];
      const attributeRRSources = linkedAttribute ? SheetHelpers.getRRSources(this.actor, 'attribute', linkedAttribute) : [];
      
      skillSpecRRList = [...specRRSources, ...skillRRSources, ...attributeRRSources];
    } else {
      // Use skill
      if (skillName) {
        const skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', skillName);
        const attributeRRSources = linkedAttribute ? SheetHelpers.getRRSources(this.actor, 'attribute', linkedAttribute) : [];
        
        skillSpecRRList = [...skillRRSources, ...attributeRRSources];
      }
    }
    
    // Merge weapon RR with skill/spec/attribute RR
    rrList = [...itemRRList, ...skillSpecRRList];
    
    // Get weapon ranges
    const meleeRange = (selectedWeapon as any).meleeRange || weaponSystem?.meleeRange || wepTypeData?.melee || 'none';
    const shortRange = (selectedWeapon as any).shortRange || weaponSystem?.shortRange || wepTypeData?.short || 'none';
    const mediumRange = (selectedWeapon as any).mediumRange || weaponSystem?.mediumRange || wepTypeData?.medium || 'none';
    const longRange = (selectedWeapon as any).longRange || weaponSystem?.longRange || wepTypeData?.long || 'none';
    
    // Update roll data
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
    this.rollData.selectedWeaponId = weaponId;
    this.rollData.meleeRange = meleeRange;
    this.rollData.shortRange = shortRange;
    this.rollData.mediumRange = mediumRange;
    this.rollData.longRange = longRange;
    this.rollData.weaponType = wepTypeName;
  }
  
  /**
   * Select Combat rapproché skill for counter-attack
   */
  private selectCombatRapprocheSkill(): void {
    if (!this.actor) return;
    
    const combatRapprocheSkill = this.actor.items.find((item: any) => 
      item.type === 'skill' && item.name === 'Combat rapproché'
    );
    
    if (!combatRapprocheSkill) return;
    
    const skillSystem = combatRapprocheSkill.system as any;
    const skillRating = skillSystem.rating || 0;
    const linkedAttribute = skillSystem.linkedAttribute || 'strength';
    const attributeValue = (this.actor.system as any)?.attributes?.[linkedAttribute] || 0;
    const skillLevel = attributeValue + skillRating;
    
    // Get RR sources
    const skillRRSources = SheetHelpers.getRRSources(this.actor, 'skill', 'Combat rapproché');
    const attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', linkedAttribute);
    const rrList = [...skillRRSources, ...attributeRRSources];
    
    // Update roll data
    this.rollData.skillName = 'Combat rapproché';
    this.rollData.specName = undefined;
    this.rollData.linkedAttackSkill = 'Combat rapproché';
    this.rollData.linkedAttribute = linkedAttribute;
    this.rollData.skillLevel = skillLevel;
    this.rollData.specLevel = undefined;
    this.rollData.itemName = undefined;
    this.rollData.itemType = undefined;
    this.rollData.damageValue = 'FOR'; // Bare hands damage
    this.rollData.damageValueBonus = 0;
    this.rollData.rrList = rrList;
    this.rollData.selectedWeaponId = undefined;
  }

  static override get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'roll-dialog'],
      template: 'systems/sra2/templates/roll-dialog.hbs',
      width: 760,
      height: 630,
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

    // Check if actor has severe wound - force disadvantage mode
    let hasSevereWound = false;
    if (this.actor) {
      const actorSystem = this.actor.system as any;
      if (actorSystem.damage && actorSystem.damage.severe) {
        // Check if at least one severe wound is marked (true)
        hasSevereWound = Array.isArray(actorSystem.damage.severe) && 
                         actorSystem.damage.severe.some((wound: boolean) => wound === true);
      }
    }
    
    // Force disadvantage mode if actor has severe wound
    if (hasSevereWound) {
      this.rollMode = 'disadvantage';
    }

    context.isWeaponRoll = isWeaponRoll;
    // Check if this is a skill/spec/attribute roll (not a weapon roll and not a defense roll)
    context.isSkillSpecAttributeRoll = !isWeaponRoll && !this.rollData.isDefend && 
                                       (this.rollData.skillName || this.rollData.specName || this.rollData.linkedAttribute);
    context.calculatedRange = calculatedRange;
    context.selectedRange = this.selectedRange;
    context.selectedRangeValue = selectedRangeValue;
    context.rollMode = this.rollMode;
    context.hasSevereWound = hasSevereWound; // Pass to template to disable mode selection
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
    
    // Debug: Log dice pool calculation
    console.log('SRA2 | RollDialog - Dice pool calculation:', {
      specLevel: this.rollData.specLevel,
      skillLevel: this.rollData.skillLevel,
      linkedAttribute: this.rollData.linkedAttribute,
      itemRating: this.rollData.itemRating,
      calculatedDicePool: dicePool,
      skillName: this.rollData.skillName,
      specName: this.rollData.specName
    });
    
    context.dicePool = dicePool;

    let threshold = this.rollData.threshold;
    context.threshold = threshold;
    context.hasThreshold = threshold !== undefined;

    // Get skill/spec name
    context.skillDisplayName = this.rollData.specName || this.rollData.skillName || this.rollData.linkedAttackSkill || 'Aucune';

    // Calculate total RR and get RR sources
    // For defense rolls, always recalculate rrList from defender's skill/spec to ensure we use the correct actor
    // For attack rolls, use rollData.rrList as passed from character-sheet (already merged: item RR + skill/spec/attribute RR)
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
    // For attack rolls (not defense), use rollData.rrList as is (already merged in character-sheet.ts)
    // The rrList should already contain: item RR + skill/spec/attribute RR
    // No need to recalculate here, it's already correct from the sheet
    
    let totalRR = 0;
    const rrSources: any[] = [];
    if (this.rollData.rrList && Array.isArray(this.rollData.rrList)) {
      for (const rrSource of this.rollData.rrList) {
        if (rrSource && typeof rrSource === 'object') {
          const rrValue = rrSource.rrValue || 0;
          if (rrValue > 0) {
            // featName is now always present in rrList (enriched in character-sheet.ts)
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
    // Add manual RR bonus
    totalRR += this.manualRRBonus;
    context.totalRR = Math.min(3, totalRR); // RR is capped at 3
    context.rrSources = rrSources;
    context.manualRRBonus = this.manualRRBonus; // Pass to template

    // Auto-select risk dice count based on RR (mode normal: 2, 5, 8, 12 for RR 0, 1, 2, 3)
    // Only auto-update if:
    // 1. User hasn't manually set it, OR
    // 2. RR has changed since last auto-selection (reset manual flag)
    const autoRiskDiceCount = DiceRoller.getRiskDiceByRR(context.totalRR);
    const maxRiskDice = Math.min(autoRiskDiceCount, dicePool);
    
    // If RR changed, reset manual flag to allow auto-update
    if (context.totalRR !== this.lastAutoRR) {
      this.riskDiceManuallySet = false;
      this.lastAutoRR = context.totalRR;
    }
    
    // Auto-update only if not manually set
    if (!this.riskDiceManuallySet) {
      this.riskDiceCount = maxRiskDice;
    }

    // Get VD (Valeur de Défense) - this would be from the target or weapon
    // For now, we'll show weapon VD if available
    context.vd = this.rollData.damageValue || 0;

    // Calculate risk probabilities based on risk dice count and RR
    const getRiskProbabilities = (riskDice: number, rr: number): any => {
      // If no risk dice, return 100% all good
      if (riskDice <= 0) {
        return {
          allGood: 100.0,
          glitch: 0.0,
          criticalGlitch: 0.0,
          disaster: 0.0
        };
      }
      
      // Clamp values to valid ranges
      const clampedRiskDice = Math.max(1, Math.min(16, riskDice));
      const clampedRR = Math.max(0, Math.min(3, rr));
      
      // Get the condition data for the current RR level
      const probabilitiesData = (shadowAmpProbabilities as any)?.shadowAmpProbabilities || (shadowAmpProbabilities as any);
      const condition = probabilitiesData?.conditions?.find(
        (c: any) => c.id === clampedRR
      );
      
      if (!condition) {
        // Fallback to default values if condition not found
        return {
          allGood: 0,
          glitch: 0,
          criticalGlitch: 0,
          disaster: 0
        };
      }
      
      // Find the data entry for the current dice count
      const diceData = condition.data.find((d: any) => d.dice === clampedRiskDice);
      
      if (!diceData) {
        // If exact match not found, use the closest (shouldn't happen with our data)
        return {
          allGood: 0,
          glitch: 0,
          criticalGlitch: 0,
          disaster: 0
        };
      }
      
      return {
        allGood: diceData.allGood,
        glitch: diceData.glitch,
        criticalGlitch: diceData.criticalGlitch,
        disaster: diceData.disaster
      };
    };
    
    // Calculate probabilities (always calculate, even if no risk dice)
    const riskProbabilities = getRiskProbabilities(this.riskDiceCount, context.totalRR);
    
    // Determine risk level based on Critical Glitch and Disaster probabilities
    // Low to no risk: <2% Critical glitch & < 0.2% Disaster
    // Normal risk: <7.5% Critical glitch & <1% Disaster
    // High risk: <20% Critical glitch & <5% Disaster
    // Extreme risk: >20% Critical glitch or >5% Disaster
    const criticalGlitch = riskProbabilities.criticalGlitch;
    const disaster = riskProbabilities.disaster;
    
    // Same color for all 4 percentages based on the risk level
    let riskColorClass = 'probability-extreme'; // Default to extreme risk
    let riskLevelTextKey = 'SRA2.ROLL_DIALOG.RISK_LEVEL.EXTREME';
    if (criticalGlitch < 2 && disaster < 0.2) {
      riskColorClass = 'probability-low';
      riskLevelTextKey = 'SRA2.ROLL_DIALOG.RISK_LEVEL.LOW_TO_NO';
    } else if (criticalGlitch < 7.5 && disaster < 1) {
      riskColorClass = 'probability-normal';
      riskLevelTextKey = 'SRA2.ROLL_DIALOG.RISK_LEVEL.NORMAL';
    } else if (criticalGlitch < 20 && disaster < 5) {
      riskColorClass = 'probability-high';
      riskLevelTextKey = 'SRA2.ROLL_DIALOG.RISK_LEVEL.HIGH';
    } else {
      riskColorClass = 'probability-extreme';
      riskLevelTextKey = 'SRA2.ROLL_DIALOG.RISK_LEVEL.EXTREME';
    }
    const riskLevelText = game.i18n?.localize(riskLevelTextKey) || riskLevelTextKey;
    
    // Format probabilities with comma as decimal separator
    context.riskProbabilities = {
      allGood: riskProbabilities.allGood.toFixed(1).replace('.', ','),
      allGoodColorClass: riskColorClass,
      glitch: riskProbabilities.glitch.toFixed(1).replace('.', ','),
      glitchColorClass: riskColorClass,
      criticalGlitch: riskProbabilities.criticalGlitch.toFixed(1).replace('.', ','),
      criticalGlitchColorClass: riskColorClass,
      disaster: riskProbabilities.disaster.toFixed(1).replace('.', ','),
      disasterColorClass: riskColorClass
    };

    // Generate dice list with risk color based on risk level
    // Map risk color class to dice color name
    const getDiceColorFromRiskClass = (riskClass: string): string => {
      switch (riskClass) {
        case 'probability-low':
          return 'green';
        case 'probability-normal':
          return 'blue';
        case 'probability-high':
          return 'yellow';
        case 'probability-extreme':
          return 'red';
        default:
          return 'green';
      }
    };
    
    const diceColor = getDiceColorFromRiskClass(riskColorClass);
    context.diceList = [];
    context.riskDiceCount = this.riskDiceCount;
    context.riskLevelText = riskLevelText;
    context.riskColorClass = riskColorClass;
    
    for (let i = 0; i < dicePool; i++) {
      context.diceList.push({ 
        index: i,
        isRiskDice: i < this.riskDiceCount,  // First N dice are risk dice
        riskColor: diceColor  // Color based on risk level
      });
    }

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

      // Group specializations under their parent skills and track orphans
      const orphanSpecializations: any[] = [];
      for (const spec of allSpecializations) {
        const parentSkill = skills.find((s: any) => s.name === spec.linkedSkillName);
        if (parentSkill) {
          parentSkill.specializations.push(spec);
        } else {
          // Orphan specialization (no matching skill on actor)
          orphanSpecializations.push(spec);
        }
      }

      // Sort specializations within each skill
      for (const skill of skills) {
        skill.specializations.sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
      
      // Sort orphan specializations
      orphanSpecializations.sort((a: any, b: any) => a.name.localeCompare(b.name));

      // Create flat list for dropdown (skill first, then its specializations)
      const dropdownOptions: any[] = [];
      for (const skill of skills) {
        // Add skill option
        // Use normalized comparison for linkedAttackSkill to handle case/space differences
        const skillSelected = skill.name === this.rollData.skillName || 
                             (this.rollData.linkedAttackSkill && 
                              ItemSearch.normalizeSearchText(skill.name) === ItemSearch.normalizeSearchText(this.rollData.linkedAttackSkill));
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
          // Use normalized comparison for linkedAttackSpecialization to handle case/space differences
          const specSelected = spec.name === this.rollData.specName ||
                              (this.rollData.linkedAttackSpecialization && 
                               ItemSearch.normalizeSearchText(spec.name) === ItemSearch.normalizeSearchText(this.rollData.linkedAttackSpecialization));
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
      
      // Add orphan specializations at the end (specs without linked skill on actor)
      if (orphanSpecializations.length > 0) {
        // Add separator
        dropdownOptions.push({
          value: '',
          label: '─── Spé. sans compétence ───',
          type: 'separator',
          disabled: true
        });
        
        for (const spec of orphanSpecializations) {
          const linkedAttribute = spec.linkedAttribute || 'strength';
          const attributeValue = (this.actor?.system as any)?.attributes?.[linkedAttribute] || 0;
          // Orphan specs don't get the +2 bonus, just attribute dice
          const specSelected = spec.name === this.rollData.specName;
          dropdownOptions.push({
            value: `orphan-spec:${spec.id}`,
            label: `⚠ ${spec.name} (${attributeValue} dés - sans +2)`,
            type: 'orphan-specialization',
            id: spec.id,
            name: spec.name,
            dicePool: attributeValue, // Only attribute, no skill bonus
            linkedAttribute: linkedAttribute,
            linkedSkillName: spec.linkedSkillName || '',
            rating: 0, // No effective rating without parent skill
            isSelected: specSelected,
            isOrphan: true
          });
        }
      }
      
      // Add phantom skills/specs (have RR but not owned by actor)
      const phantomRRs = SheetHelpers.getPhantomRRs(this.actor);
      if (phantomRRs.length > 0) {
        // Add separator
        dropdownOptions.push({
          value: '',
          label: '─── RR sans compétence ───',
          type: 'separator',
          disabled: true
        });
        
        for (const phantom of phantomRRs) {
          const attributeValue = (this.actor?.system as any)?.attributes?.[phantom.linkedAttribute] || 0;
          const phantomSelected = phantom.name === this.rollData.skillName || phantom.name === this.rollData.specName;
          const phantomType = phantom.type === 'skill' ? 'phantom-skill' : 'phantom-spec';
          const typeIcon = phantom.type === 'skill' ? '👻' : '👻└';
          
          dropdownOptions.push({
            value: `${phantomType}:${phantom.name}`,
            label: `${typeIcon} ${phantom.name} (${attributeValue} dés + RR${phantom.rr})`,
            type: phantomType,
            id: phantom.name, // Use name as ID since phantom items don't exist
            name: phantom.name,
            dicePool: attributeValue,
            linkedAttribute: phantom.linkedAttribute,
            rating: 0,
            rr: phantom.rr,
            isSelected: phantomSelected,
            isPhantom: true
          });
        }
      }

      context.skillsWithSpecs = skills;
      context.dropdownOptions = dropdownOptions;
      
      // Determine selected value for dropdown
      // Priority: specName > skillName > linkedAttackSpecialization > linkedAttackSkill
      // This ensures that if skillName is set but spec is not found, we still select the skill
      if (this.rollData.specName) {
        // Try to find in regular specs, orphan specs, or phantom specs
        let selectedSpec = dropdownOptions.find((opt: any) => opt.type === 'specialization' && opt.name === this.rollData.specName);
        if (!selectedSpec) {
          selectedSpec = dropdownOptions.find((opt: any) => opt.type === 'orphan-specialization' && opt.name === this.rollData.specName);
        }
        if (!selectedSpec) {
          selectedSpec = dropdownOptions.find((opt: any) => opt.type === 'phantom-spec' && opt.name === this.rollData.specName);
        }
        context.selectedValue = selectedSpec ? selectedSpec.value : '';
      } else if (this.rollData.skillName) {
        // Try to find in regular skills or phantom skills
        let selectedSkill = dropdownOptions.find((opt: any) => opt.type === 'skill' && opt.name === this.rollData.skillName);
        if (!selectedSkill) {
          selectedSkill = dropdownOptions.find((opt: any) => opt.type === 'phantom-skill' && opt.name === this.rollData.skillName);
        }
        context.selectedValue = selectedSkill ? selectedSkill.value : '';
      } else if (this.rollData.linkedAttackSpecialization) {
        // Fallback: try to find by linkedAttackSpecialization using normalized comparison
        const normalizedLinkedSpec = ItemSearch.normalizeSearchText(this.rollData.linkedAttackSpecialization);
        const selectedSpec = dropdownOptions.find((opt: any) => 
          (opt.type === 'specialization' || opt.type === 'orphan-specialization' || opt.type === 'phantom-spec') && 
          ItemSearch.normalizeSearchText(opt.name) === normalizedLinkedSpec
        );
        context.selectedValue = selectedSpec ? selectedSpec.value : '';
      } else if (this.rollData.linkedAttackSkill) {
        // Fallback: try to find by linkedAttackSkill using normalized comparison
        const normalizedLinkedSkill = ItemSearch.normalizeSearchText(this.rollData.linkedAttackSkill);
        const selectedSkill = dropdownOptions.find((opt: any) => 
          (opt.type === 'skill' || opt.type === 'phantom-skill') && 
          ItemSearch.normalizeSearchText(opt.name) === normalizedLinkedSkill
        );
        context.selectedValue = selectedSkill ? selectedSkill.value : '';
      } else {
        context.selectedValue = '';
      }
    }

    // Generate attribute options for attribute dropdown
    const attributeOptions: any[] = [];
    if (this.actor) {
      const actorSystem = this.actor.system as any;
      const attributes = actorSystem?.attributes || {};
      
      const attributeNames = ['strength', 'agility', 'willpower', 'logic', 'charisma'];
      const attributeLabels: Record<string, string> = {
        strength: game.i18n?.localize('SRA2.ATTRIBUTES.STRENGTH') || 'Force',
        agility: game.i18n?.localize('SRA2.ATTRIBUTES.AGILITY') || 'Agilité',
        willpower: game.i18n?.localize('SRA2.ATTRIBUTES.WILLPOWER') || 'Volonté',
        logic: game.i18n?.localize('SRA2.ATTRIBUTES.LOGIC') || 'Logique',
        charisma: game.i18n?.localize('SRA2.ATTRIBUTES.CHARISMA') || 'Charisme'
      };
      
      for (const attrName of attributeNames) {
        const attrValue = attributes[attrName] || 0;
        attributeOptions.push({
          value: attrName,
          label: attributeLabels[attrName] || attrName,
          diceValue: attrValue
        });
      }
    }
    
    context.attributeOptions = attributeOptions;
    
    // Determine selected attribute: use linkedAttribute from rollData if set,
    // otherwise try to get it from the selected skill/spec, otherwise default based on skill presence
    let selectedAttribute = this.rollData.linkedAttribute;
    let hasSkillRating = false;
    
    if (!selectedAttribute && this.actor) {
      // Try to get from selected spec
      if (this.rollData.specName) {
        const specItem = this.actor.items.find((i: any) => 
          i.type === 'specialization' && i.name === this.rollData.specName
        );
        if (specItem) {
          selectedAttribute = (specItem.system as any)?.linkedAttribute;
          // Check if spec has a rating > 0 (parent skill rating)
          const parentSkillName = (specItem.system as any)?.linkedSkill;
          if (parentSkillName) {
            const parentSkillItem = this.actor.items.find((i: any) => 
              i.type === 'skill' && i.name === parentSkillName
            );
            if (parentSkillItem) {
              const skillRating = (parentSkillItem.system as any)?.rating || 0;
              hasSkillRating = skillRating > 0;
            }
          }
        }
      }
      // Try to get from selected skill
      if (!selectedAttribute && this.rollData.skillName) {
        const skillItem = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === this.rollData.skillName
        );
        if (skillItem) {
          selectedAttribute = (skillItem.system as any)?.linkedAttribute;
          // Check if skill has a rating > 0
          const skillRating = (skillItem.system as any)?.rating || 0;
          hasSkillRating = skillRating > 0;
        } else {
          // Skill not found - person doesn't have the skill
          hasSkillRating = false;
        }
      } else if (!this.rollData.skillName && !this.rollData.specName) {
        // No skill or spec selected - person doesn't have the skill
        hasSkillRating = false;
      }
      
      // If still not set and person doesn't have the skill rating, use default attribute logic
      if (!selectedAttribute && !hasSkillRating) {
        // Person doesn't have the skill - use default attribute based on skill type
        const linkedAttackSkill = this.rollData.linkedAttackSkill || this.rollData.skillName;
        
        // If skill is "Combat rapproché", default to Strength
        // Otherwise default to Agility
        if (linkedAttackSkill && ItemSearch.normalizeSearchText(linkedAttackSkill) === ItemSearch.normalizeSearchText('Combat rapproché')) {
          selectedAttribute = 'strength';
        } else {
          selectedAttribute = 'agility';
        }
      } else if (!selectedAttribute && attributeOptions.length > 0) {
        // Has skill but no linked attribute found, default to first attribute
        selectedAttribute = attributeOptions[0].value;
      }
    }
    
    context.selectedAttribute = selectedAttribute || '';

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
      
      // Get weapon type data from WEAPON_TYPES if available
      const wepTypeName = weaponSystem?.weaponType;
      const wepTypeData = wepTypeName ? WEAPON_TYPES[wepTypeName as keyof typeof WEAPON_TYPES] : undefined;
      
      // Get linkedAttackSkill and linkedAttackSpecialization from weapon, fallback to weapon type
      let baseSkillName = weaponSystem?.linkedAttackSkill || wepTypeData?.linkedSkill || selectedWeapon.linkedAttackSkill;
      const weaponLinkedSpecialization = weaponSystem?.linkedAttackSpecialization || wepTypeData?.linkedSpecialization;
      
      // Calculate damage value with bonus from active feats (including adept powers)
      const baseDamageValue = selectedWeapon.damageValue || weaponSystem?.damageValue || '0';
      let damageValueBonus = selectedWeapon.damageValueBonus || weaponSystem?.damageValueBonus || 0;
      
      // Add bonus from active feats that match the weapon's type (including adept powers)
      const weaponType = wepTypeName || '';
      if (weaponType && this.actor) {
        const activeFeats = this.actor.items.filter((item: any) => 
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
      
      // Calculate final damage value string
      const damageValue = SheetHelpers.calculateRawDamageString(baseDamageValue, damageValueBonus);

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

      // Get RR sources (weapon RR + skill/spec/attribute RR)
      const { getRRSources } = await import('../helpers/sheet-helpers.js');
      
      // Get RR from weapon itself
      const weaponRRList = weaponSystem?.rrList || [];
      const itemRRList = weaponRRList.map((rrEntry: any) => ({
        ...rrEntry,
        featName: selectedWeapon.name
      }));
      
      let skillSpecRRList: any[] = [];
      
      // Simple logic: if weapon has a specialization and actor has it, use it
      // Otherwise, use the skill
      if (preferredSpecName) {
        // Weapon has a specialization and actor has it - use the specialization
        specName = preferredSpecName;
        const attributeValue = linkedAttribute ? ((this.actor.system as any)?.attributes?.[linkedAttribute] || 0) : 0;
        const parentSkill = linkedSkillItem;
        const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
        specLevel = attributeValue + skillRating + 2;
        
        const specRRSources = getRRSources(this.actor, 'specialization', specName);
        const skillRRSources = linkedSkillItem ? getRRSources(this.actor, 'skill', baseSkillName) : [];
        const attributeRRSources = linkedAttribute ? getRRSources(this.actor, 'attribute', linkedAttribute) : [];
        
        skillSpecRRList = [...specRRSources, ...skillRRSources, ...attributeRRSources];
      } else {
        // Use skill (no specialization or actor doesn't have the specialization)
        if (skillName) {
          const skillRRSources = getRRSources(this.actor, 'skill', skillName);
          const attributeRRSources = linkedAttribute ? getRRSources(this.actor, 'attribute', linkedAttribute) : [];
          
          skillSpecRRList = [...skillRRSources, ...attributeRRSources];
        }
      }
      
      // Merge weapon RR with skill/spec/attribute RR
      const rrList = [...itemRRList, ...skillSpecRRList];

      // Get weapon ranges from selected weapon or weapon type
      // Use the same wepTypeName and wepTypeData from above
      const meleeRange = (selectedWeapon as any).meleeRange || weaponSystem?.meleeRange || wepTypeData?.melee || 'none';
      const shortRange = (selectedWeapon as any).shortRange || weaponSystem?.shortRange || wepTypeData?.short || 'none';
      const mediumRange = (selectedWeapon as any).mediumRange || weaponSystem?.mediumRange || wepTypeData?.medium || 'none';
      const longRange = (selectedWeapon as any).longRange || weaponSystem?.longRange || wepTypeData?.long || 'none';
      
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
      
      // Update weapon ranges
      this.rollData.meleeRange = meleeRange;
      this.rollData.shortRange = shortRange;
      this.rollData.mediumRange = mediumRange;
      this.rollData.longRange = longRange;
      this.rollData.weaponType = wepTypeName;

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
        // Use selected attribute if available, otherwise use skill's linked attribute
        const selectedAttribute = this.rollData.linkedAttribute || skillSystem.linkedAttribute || 'strength';
        const attributeValue = (this.actor.system as any).attributes?.[selectedAttribute] || 0;
        const skillRating = skillSystem.rating || 0;
        const dicePool = attributeValue + skillRating;
        
        // Update roll data
        this.rollData.skillName = item.name;
        this.rollData.specName = undefined;
        this.rollData.skillLevel = dicePool;
        this.rollData.specLevel = undefined;
        this.rollData.linkedAttribute = selectedAttribute;
        
        // Recalculate RR and threshold (synchronously)
        this.updateRRForSkill(item.name, selectedAttribute, dicePool);
        
        // Re-render after RR is updated
        this.render();
      } else if (type === 'spec') {
        const specSystem = item.system as any;
        // Use selected attribute if available, otherwise use spec's linked attribute
        const selectedAttribute = this.rollData.linkedAttribute || specSystem.linkedAttribute || 'strength';
        const linkedSkillName = specSystem.linkedSkill;
        const attributeValue = (this.actor.system as any).attributes?.[selectedAttribute] || 0;
        
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
        this.rollData.linkedAttribute = selectedAttribute;
        
        // Recalculate RR and threshold (synchronously)
        this.updateRRForSpec(item.name, linkedSkillName, selectedAttribute, dicePool);
        
        // Re-render after RR is updated
        this.render();
      } else if (type === 'orphan-spec') {
        // Orphan specialization (no linked skill on actor)
        // Only attribute dice, no +2 bonus from skill
        const specSystem = item.system as any;
        const selectedAttribute = this.rollData.linkedAttribute || specSystem.linkedAttribute || 'strength';
        const attributeValue = (this.actor.system as any).attributes?.[selectedAttribute] || 0;
        
        // No skill rating, no +2 bonus - just attribute
        const dicePool = attributeValue;
        
        // Update roll data
        this.rollData.specName = item.name;
        this.rollData.skillName = specSystem.linkedSkill || undefined; // Keep the name for display
        this.rollData.skillLevel = 0; // No skill
        this.rollData.specLevel = dicePool; // Just attribute
        this.rollData.linkedAttribute = selectedAttribute;
        
        // Get RR for this orphan spec (spec RR + attribute RR)
        const { getRRSources } = SheetHelpers;
        const specRRSources = getRRSources(this.actor, 'specialization', item.name);
        const attributeRRSources = getRRSources(this.actor, 'attribute', selectedAttribute);
        const rrList = [...specRRSources, ...attributeRRSources];
        
        // Calculate total RR
        const totalRR = Math.min(3, rrList.reduce((sum, rr) => sum + rr.rrValue, 0));
        this.rollData.rrList = rrList;
        
        // Re-render after RR is updated
        this.render();
      } else if (type === 'phantom-skill' || type === 'phantom-spec') {
        // Phantom skill/spec (has RR but not owned by actor)
        // Only attribute dice, but includes the RR
        const phantomName = id; // For phantom items, id is the name
        const phantomRRs = SheetHelpers.getPhantomRRs(this.actor);
        const phantom = phantomRRs.find(p => p.name === phantomName);
        
        if (!phantom) return;
        
        const selectedAttribute = this.rollData.linkedAttribute || phantom.linkedAttribute || 'strength';
        const attributeValue = (this.actor.system as any).attributes?.[selectedAttribute] || 0;
        
        // Update roll data
        if (type === 'phantom-skill') {
          this.rollData.skillName = phantomName;
          this.rollData.specName = undefined;
          this.rollData.skillLevel = attributeValue; // Just attribute
        } else {
          this.rollData.specName = phantomName;
          this.rollData.skillName = undefined;
          this.rollData.specLevel = attributeValue; // Just attribute
        }
        this.rollData.linkedAttribute = selectedAttribute;
        
        // Get RR for this phantom (from the sources)
        this.rollData.rrList = phantom.sources;
        
        // Re-render after RR is updated
        this.render();
      }
    });

    // Attribute selection dropdown
    html.find('.attribute-dropdown').on('change', (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      const selectedAttribute = select.value;
      
      if (!selectedAttribute || !this.actor) return;
      
      // Update linked attribute
      this.rollData.linkedAttribute = selectedAttribute;
      
      // Recalculate dice pool based on current skill/spec and new attribute
      if (this.rollData.specName && this.rollData.skillName) {
        // Update spec level with new attribute
        const attributeValue = (this.actor.system as any).attributes?.[selectedAttribute] || 0;
        const linkedSkillName = this.rollData.skillName;
        const parentSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
        const effectiveRating = skillRating + 2;
        const dicePool = attributeValue + effectiveRating;
        
        this.rollData.specLevel = dicePool;
        this.rollData.skillLevel = skillRating;
        
        // Recalculate RR
        this.updateRRForSpec(this.rollData.specName, linkedSkillName, selectedAttribute, dicePool);
      } else if (this.rollData.skillName) {
        // Update skill level with new attribute
        const attributeValue = (this.actor.system as any).attributes?.[selectedAttribute] || 0;
        const skillItem = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === this.rollData.skillName
        );
        const skillRating = skillItem ? (skillItem.system as any).rating || 0 : 0;
        const dicePool = attributeValue + skillRating;
        
        this.rollData.skillLevel = dicePool;
        this.rollData.specLevel = undefined;
        
        // Recalculate RR
        this.updateRRForSkill(this.rollData.skillName, selectedAttribute, dicePool);
      } else {
        // Pure attribute roll (no skill/spec)
        this.rollData.skillLevel = undefined;
        this.rollData.specLevel = undefined;
        
        // Recalculate RR for attribute only
        const attributeRRSources = SheetHelpers.getRRSources(this.actor, 'attribute', selectedAttribute);
        this.rollData.rrList = attributeRRSources;
        
        // Reset RR enabled state
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
      }
      
      // Re-render to update UI
      this.render();
    });

    // RR checkbox toggles
    html.find('.rr-checkbox').on('change', (event) => {
      const checkbox = event.currentTarget as HTMLInputElement;
      const rrId = checkbox.dataset.rrId;
      const enabled = checkbox.checked;
      
      if (rrId) {
        this.rrEnabled.set(rrId, enabled);
        
        // Calculate new total RR
        let newTotalRR = 0;
        if (this.rollData.rrList && Array.isArray(this.rollData.rrList)) {
          for (const rrSource of this.rollData.rrList) {
            if (rrSource && typeof rrSource === 'object') {
              const rrValue = rrSource.rrValue || 0;
              const featName = rrSource.featName || 'Inconnu';
              const sourceId = `${featName}-${rrValue}`;
              
              if (this.rrEnabled.get(sourceId)) {
                newTotalRR += rrValue;
              }
            }
          }
        }
        // Add manual RR bonus
        newTotalRR += this.manualRRBonus;
        newTotalRR = Math.min(3, newTotalRR); // RR is capped at 3
        
        // Update risk dice count based on new RR (mode normal)
        // Only auto-update if user hasn't manually changed it
        if (!this.riskDiceManuallySet) {
          const autoRiskDiceCount = DiceRoller.getRiskDiceByRR(newTotalRR);
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
          // Don't exceed dice pool
          this.riskDiceCount = Math.min(autoRiskDiceCount, dicePool);
          this.lastAutoRR = newTotalRR;
        }
        
        // Re-render to update total RR and risk dice selection
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
        
        // Check if actor has severe wound - if so, always force disadvantage
        let hasSevereWound = false;
        if (this.actor) {
          const actorSystem = this.actor.system as any;
          if (actorSystem.damage && actorSystem.damage.severe) {
            hasSevereWound = Array.isArray(actorSystem.damage.severe) && 
                             actorSystem.damage.severe.some((wound: boolean) => wound === true);
          }
        }
        
        // Auto-set roll mode based on range value (can be overridden by user)
        // But if actor has severe wound, always force disadvantage
        if (hasSevereWound) {
          this.rollMode = 'disadvantage';
        } else {
          if (rangeValueForSelected === 'disadvantage') {
            this.rollMode = 'disadvantage';
          } else if (rangeValueForSelected === 'ok') {
            this.rollMode = 'normal';
          }
        }
      }
      
      // Re-render to update UI
      this.render();
    });

    // Roll mode selection
    html.find('input[name="roll-mode"]').on('change', (event) => {
      // Check if actor has severe wound - prevent changing mode
      let hasSevereWound = false;
      if (this.actor) {
        const actorSystem = this.actor.system as any;
        if (actorSystem.damage && actorSystem.damage.severe) {
          hasSevereWound = Array.isArray(actorSystem.damage.severe) && 
                           actorSystem.damage.severe.some((wound: boolean) => wound === true);
        }
      }
      
      // If actor has severe wound, force disadvantage and prevent change
      if (hasSevereWound) {
        this.rollMode = 'disadvantage';
        // Re-render to reset the selection
        this.render();
        return;
      }
      
      const radio = event.currentTarget as HTMLInputElement;
      const modeValue = radio.value;
      
      if (modeValue === 'normal' || modeValue === 'disadvantage' || modeValue === 'advantage') {
        this.rollMode = modeValue as 'normal' | 'disadvantage' | 'advantage';
      }
    });

    // Manual RR bonus input
    html.find('.manual-rr-bonus-input').on('input', (event) => {
      const input = event.currentTarget as HTMLInputElement;
      const inputValue = input.value;
      this.manualRRBonus = inputValue;
      let manualRRBonus = 0;
      if (inputValue !== '' && !isNaN(Number(inputValue))) {
        manualRRBonus = parseInt(inputValue);
      }
      
      // Calculate new total RR
      let newTotalRR = 0;
      if (this.rollData.rrList && Array.isArray(this.rollData.rrList)) {
        for (const rrSource of this.rollData.rrList) {
          if (rrSource && typeof rrSource === 'object') {
            const rrValue = rrSource.rrValue || 0;
            const featName = rrSource.featName || 'Inconnu';
            const sourceId = `${featName}-${rrValue}`;
            
            if (this.rrEnabled.get(sourceId)) {
              newTotalRR += rrValue;
            }
          }
        }
      }
      // Add manual RR bonus
      newTotalRR += manualRRBonus;
      newTotalRR = Math.min(3, newTotalRR); // RR is capped at 3
      
      // Update risk dice count based on new RR (mode normal)
      // Only auto-update if user hasn't manually changed it
      if (!this.riskDiceManuallySet) {
        const autoRiskDiceCount = DiceRoller.getRiskDiceByRR(newTotalRR);
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
        // Don't exceed dice pool
        this.riskDiceCount = Math.min(autoRiskDiceCount, dicePool);
        this.lastAutoRR = newTotalRR;
      }
      
      // Re-render to update total RR and risk dice selection
      if (manualRRBonus !== 0) {
        this.render();
      }
    });

    // Risk dice selection
    html.find('.dice-icon').on('click', (event) => {
      const diceIcon = $(event.currentTarget);
      const diceIndex = parseInt(diceIcon.data('dice-index') || '0');
      const isCurrentlySelected = diceIcon.hasClass('risk-dice');
      
      // Mark as manually set when user clicks
      this.riskDiceManuallySet = true;
      
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
      // Add manual RR bonus
      finalRR += this.manualRRBonus;
      
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
      
      // Block counter-attack roll if no weapon or skill is selected
      if (this.rollData.isCounterAttack && !this.rollData.threshold) {
        if (!this.rollData.selectedWeaponId && !this.rollData.skillName && !this.rollData.specName) {
          ui.notifications?.warn(game.i18n!.localize('SRA2.COMBAT.COUNTER_ATTACK.NO_WEAPON_SELECTED') || 'Veuillez sélectionner une arme pour la contre-attaque');
          return;
        }
        if (dicePool === 0) {
          ui.notifications?.warn(game.i18n!.localize('SRA2.COMBAT.COUNTER_ATTACK.NO_DICE_POOL') || 'La réserve de dés pour la contre-attaque est de 0. Veuillez sélectionner une arme valide.');
          return;
        }
      }
      
      // Block roll if selected range is "none" (for weapon rolls, not defense)
      if (this.rollData.itemType === 'weapon' || this.rollData.itemType === 'spell' || this.rollData.itemType === 'weapons-spells') {
        if (!this.rollData.isDefend && this.selectedRange) {
          // Get the current range value
          let selectedRangeValue: string | null = null;
          const meleeRange = this.rollData.meleeRange || 'none';
          const shortRange = this.rollData.shortRange || 'none';
          const mediumRange = this.rollData.mediumRange || 'none';
          const longRange = this.rollData.longRange || 'none';
          
          if (this.selectedRange === 'melee') {
            selectedRangeValue = meleeRange;
          } else if (this.selectedRange === 'short') {
            selectedRangeValue = shortRange;
          } else if (this.selectedRange === 'medium') {
            selectedRangeValue = mediumRange;
          } else if (this.selectedRange === 'long') {
            selectedRangeValue = longRange;
          }
          
          // Block if range value is "none"
          if (selectedRangeValue === 'none') {
            ui.notifications?.warn(game.i18n!.localize('SRA2.ROLL_DIALOG.INVALID_RANGE') || 'La portée sélectionnée n\'est pas disponible pour cette arme. Veuillez sélectionner une portée valide.');
            return;
          }
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


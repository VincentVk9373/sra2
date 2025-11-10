/**
 * Weapon types configuration with their stats
 */
export const WEAPON_TYPES = {
  "bare-hands": { vd: "FOR", melee: "ok", short: "none", medium: "none", long: "none" },
  "short-weapons": { vd: "FOR+1", melee: "ok", short: "none", medium: "none", long: "none" },
  "long-weapons": { vd: "FOR+2", melee: "ok", short: "none", medium: "none", long: "none" },
  "advanced-melee": { vd: 5, melee: "ok", short: "none", medium: "none", long: "none" },
  "throwing": { vd: "FOR+1", melee: "ok", short: "ok", medium: "dice", long: "none" },
  "bows": { vd: "FOR+1", melee: "ok", short: "ok", medium: "ok", long: "none" },
  "crossbows": { vd: 4, melee: "ok", short: "ok", medium: "ok", long: "none" },
  "tasers": { vd: 5, melee: "ok", short: "ok", medium: "none", long: "none" },
  "pocket-pistols": { vd: 3, melee: "ok", short: "ok", medium: "dice", long: "none" },
  "light-pistols": { vd: 4, melee: "ok", short: "ok", medium: "dice", long: "none" },
  "automatic-pistols": { vd: 4, melee: "ok", short: "ok", medium: "dice", long: "none" },
  "heavy-pistols": { vd: 5, melee: "ok", short: "ok", medium: "dice", long: "none" },
  "smgs": { vd: 5, melee: "dice", short: "ok", medium: "ok", long: "none" },
  "assault-rifles": { vd: 7, melee: "dice", short: "ok", medium: "ok", long: "dice" },
  "shotguns": { vd: 8, melee: "dice", short: "ok", medium: "dice", long: "none" },
  "sniper-rifles": { vd: 10, melee: "none", short: "dice", medium: "dice", long: "ok" },
  "machine-guns": { vd: 9, melee: "none", short: "ok", medium: "ok", long: "ok" },
  "grenades": { vd: 7, melee: "ok", short: "ok", medium: "dice", long: "none" },
  "gas-grenades": { vd: "toxin", melee: "ok", short: "ok", medium: "dice", long: "none" },
  "grenade-launchers": { vd: 7, melee: "none", short: "dice", medium: "ok", long: "ok" },
  "rocket-launchers": { vd: 12, melee: "none", short: "none", medium: "dice", long: "ok" }
} as const;

/**
 * Data model for Feat items
 */
export class FeatDataModel extends foundry.abstract.TypeDataModel<any, Item> {
  static override defineSchema(): any {
    const fields = foundry.data.fields;
    
    return {
      description: new fields.HTMLField({
        required: true,
        initial: ""
      }),
      rating: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.RATING"
      }),
      cost: new fields.StringField({
        required: true,
        initial: "free-equipment",
        choices: {
          "free-equipment": "SRA2.FEATS.COST.FREE_EQUIPMENT",
          "equipment": "SRA2.FEATS.COST.EQUIPMENT",
          "specialized-equipment": "SRA2.FEATS.COST.SPECIALIZED_EQUIPMENT",
          "feat": "SRA2.FEATS.COST.FEAT"
        },
        label: "SRA2.FEATS.COST.LABEL"
      }),
      active: new fields.BooleanField({
        required: true,
        initial: true,
        label: "SRA2.FEATS.ACTIVE"
      }),
      rrList: new fields.ArrayField(new fields.SchemaField({
        rrType: new fields.StringField({
          required: true,
          initial: "skill",
          choices: {
            "attribute": "SRA2.FEATS.RR_TYPE.ATTRIBUTE",
            "skill": "SRA2.FEATS.RR_TYPE.SKILL",
            "specialization": "SRA2.FEATS.RR_TYPE.SPECIALIZATION"
          },
          label: "SRA2.FEATS.RR_TYPE.LABEL"
        }),
        rrValue: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          max: 3,
          integer: true,
          label: "SRA2.FEATS.RR_VALUE"
        }),
        rrTarget: new fields.StringField({
          required: false,
          initial: "",
          nullable: false,
          label: "SRA2.FEATS.RR_TARGET"
        })
      }), {
        initial: [],
        label: "SRA2.FEATS.RR_LIST"
      }),
      bonusLightDamage: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.BONUS_LIGHT_DAMAGE"
      }),
      bonusSevereDamage: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.BONUS_SEVERE_DAMAGE"
      }),
      bonusPhysicalThreshold: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "SRA2.FEATS.BONUS_PHYSICAL_THRESHOLD"
      }),
      bonusMentalThreshold: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "SRA2.FEATS.BONUS_MENTAL_THRESHOLD"
      }),
      bonusAnarchy: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.BONUS_ANARCHY"
      }),
      essenceCost: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.ESSENCE_COST"
      }),
      featType: new fields.StringField({
        required: true,
        initial: "equipment",
        choices: {
          "trait": "SRA2.FEATS.FEAT_TYPE.TRAIT",
          "contact": "SRA2.FEATS.FEAT_TYPE.CONTACT",
          "awakened": "SRA2.FEATS.FEAT_TYPE.AWAKENED",
          "adept-power": "SRA2.FEATS.FEAT_TYPE.ADEPT_POWER",
          "equipment": "SRA2.FEATS.FEAT_TYPE.EQUIPMENT",
          "cyberware": "SRA2.FEATS.FEAT_TYPE.CYBERWARE",
          "cyberdeck": "SRA2.FEATS.FEAT_TYPE.CYBERDECK",
          "vehicle": "SRA2.FEATS.FEAT_TYPE.VEHICLE",
          "weapons-spells": "SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS",
          "weapon": "SRA2.FEATS.FEAT_TYPE.WEAPON",
          "spell": "SRA2.FEATS.FEAT_TYPE.SPELL"
        },
        label: "SRA2.FEATS.FEAT_TYPE.LABEL"
      }),
      weaponType: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.WEAPON.WEAPON_TYPE"
      }),
      // Weapon/Spell specific fields
      damageValue: new fields.StringField({
        required: true,
        initial: "0",
        label: "SRA2.FEATS.WEAPON.DAMAGE_VALUE"
      }),
      damageValueBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 2,
        integer: true,
        label: "SRA2.FEATS.WEAPON.DAMAGE_VALUE_BONUS"
      }),
      meleeRange: new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.WEAPON.RANGE_NONE",
          "ok": "SRA2.FEATS.WEAPON.RANGE_OK",
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE"
        },
        label: "SRA2.FEATS.WEAPON.MELEE_RANGE"
      }),
      shortRange: new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.WEAPON.RANGE_NONE",
          "ok": "SRA2.FEATS.WEAPON.RANGE_OK",
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE"
        },
        label: "SRA2.FEATS.WEAPON.SHORT_RANGE"
      }),
      mediumRange: new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.WEAPON.RANGE_NONE",
          "ok": "SRA2.FEATS.WEAPON.RANGE_OK",
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE"
        },
        label: "SRA2.FEATS.WEAPON.MEDIUM_RANGE"
      }),
      longRange: new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.WEAPON.RANGE_NONE",
          "ok": "SRA2.FEATS.WEAPON.RANGE_OK",
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE"
        },
        label: "SRA2.FEATS.WEAPON.LONG_RANGE"
      }),
      // Vehicle/Drone specific fields
      autopilot: new fields.NumberField({
        required: true,
        initial: 6,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.AUTOPILOT"
      }),
      structure: new fields.NumberField({
        required: true,
        initial: 2,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.STRUCTURE"
      }),
      handling: new fields.NumberField({
        required: true,
        initial: 5,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.HANDLING"
      }),
      speed: new fields.NumberField({
        required: true,
        initial: 3,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.SPEED"
      }),
      armor: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.ARMOR"
      }),
      weaponInfo: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.VEHICLE.WEAPON_INFO"
      }),
      // Cyberdeck specific fields
      firewall: new fields.NumberField({
        required: true,
        initial: 1,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.CYBERDECK.FIREWALL"
      }),
      attack: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.CYBERDECK.ATTACK"
      }),
      // Contact specific fields
      contactName: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.CONTACT.NAME"
      }),
      // Awakened specific fields
      astralPerception: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.AWAKENED.ASTRAL_PERCEPTION"
      }),
      astralProjection: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.AWAKENED.ASTRAL_PROJECTION"
      }),
      sorcery: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.AWAKENED.SORCERY"
      }),
      conjuration: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.AWAKENED.CONJURATION"
      }),
      adept: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.AWAKENED.ADEPT"
      }),
      // Additional fields for recommended level calculation
      riggerConsoleCount: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.RIGGER_CONSOLE_COUNT"
      }),
      hasVehicleControlWiring: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.HAS_VEHICLE_CONTROL_WIRING"
      }),
      isWeaponFocus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_WEAPON_FOCUS"
      }),
      // Narrative effects
      narrativeEffects: new fields.ArrayField(new fields.SchemaField({
        text: new fields.StringField({
          required: false,
          initial: ""
        }),
        isNegative: new fields.BooleanField({
          required: true,
          initial: false
        })
      }), {
        initial: [],
        label: "SRA2.FEATS.NARRATIVE_EFFECTS"
      }),
      // Grants narration
      grantsNarration: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.GRANTS_NARRATION"
      }),
      narrationActions: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 2,
        integer: true,
        label: "SRA2.FEATS.NARRATION_ACTIONS"
      }),
      // Additional sustained spells and summoned spirits
      sustainedSpellCount: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 2,
        integer: true,
        label: "SRA2.FEATS.SUSTAINED_SPELL_COUNT"
      }),
      summonedSpiritCount: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 1,
        integer: true,
        label: "SRA2.FEATS.SUMMONED_SPIRIT_COUNT"
      })
    };
  }

  override prepareDerivedData(): void {
    // Calculate cost based on cost type and rating
    const rating = (this as any).rating || 0;
    const costType = (this as any).cost || 'free-equipment';
    
    let calculatedCost = 0;
    switch (costType) {
      case 'free-equipment':
        calculatedCost = 0 + rating * 5000;
        break;
      case 'equipment':
        calculatedCost = 2500 + rating * 5000;
        break;
      case 'specialized-equipment':
        calculatedCost = 5000 + rating * 5000;
        break;
      case 'feat':
        calculatedCost = rating * 5000;
        break;
      default:
        calculatedCost = 0;
    }
    
    (this as any).calculatedCost = calculatedCost;

    // Calculate recommended attribute level
    let recommendedLevel = 0;
    const recommendedLevelBreakdown: Array<{ labelKey: string; labelParams?: string; value: number }> = [];
    
    const featType = (this as any).featType || 'equipment';
    const bonusLightDamage = (this as any).bonusLightDamage || 0;
    const bonusSevereDamage = (this as any).bonusSevereDamage || 0;
    const bonusPhysicalThreshold = (this as any).bonusPhysicalThreshold || 0;
    const bonusMentalThreshold = (this as any).bonusMentalThreshold || 0;
    const firewall = (this as any).firewall || 0;
    const attack = (this as any).attack || 0;
    const riggerConsoleCount = (this as any).riggerConsoleCount || 0;
    const hasVehicleControlWiring = (this as any).hasVehicleControlWiring || false;
    const isWeaponFocus = (this as any).isWeaponFocus || false;
    const bonusAnarchy = (this as any).bonusAnarchy || 0;
    const grantsNarration = (this as any).grantsNarration || false;
    const narrativeEffects = (this as any).narrativeEffects || [];
    const rrList = (this as any).rrList || [];
    
    // Cyberware/bioware: 1 level
    if (featType === 'cyberware') {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CYBERWARE', value: 1 });
    }
    
    // Light wounds: +3 per wound
    if (bonusLightDamage > 0) {
      const value = bonusLightDamage * 3;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.LIGHT_WOUNDS', labelParams: `(${bonusLightDamage})`, value });
    }
    
    // Heavy wounds: +6 per wound
    if (bonusSevereDamage > 0) {
      const value = bonusSevereDamage * 6;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SEVERE_WOUNDS', labelParams: `(${bonusSevereDamage})`, value });
    }
    
    // Physical threshold bonus: +1 per point (positive or negative)
    if (bonusPhysicalThreshold !== 0) {
      const value = Math.abs(bonusPhysicalThreshold);
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.PHYSICAL_THRESHOLD', labelParams: `(${bonusPhysicalThreshold > 0 ? '+' : ''}${bonusPhysicalThreshold})`, value });
    }
    
    // Mental threshold bonus: +1 per point (positive or negative)
    if (bonusMentalThreshold !== 0) {
      const value = Math.abs(bonusMentalThreshold);
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.MENTAL_THRESHOLD', labelParams: `(${bonusMentalThreshold > 0 ? '+' : ''}${bonusMentalThreshold})`, value });
    }
    
    // Cyberdeck firewall: starts at 1, each level is +1
    if (featType === 'cyberdeck' && firewall > 0) {
      recommendedLevel += firewall;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.FIREWALL', labelParams: `(${firewall})`, value: firewall });
    }
    
    // Attack: starts at 0, each level is +1
    if (attack > 0) {
      recommendedLevel += attack;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ATTACK', labelParams: `(${attack})`, value: attack });
    }
    
    // Rigger console: +1 per drone controller
    if (riggerConsoleCount > 0) {
      recommendedLevel += riggerConsoleCount;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RIGGER_CONSOLE', labelParams: `(${riggerConsoleCount})`, value: riggerConsoleCount });
    }
    
    // Vehicle control wiring: +2
    if (hasVehicleControlWiring) {
      recommendedLevel += 2;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.VEHICLE_WIRING', value: 2 });
    }
    
    // Weapon focus: +1
    if (isWeaponFocus) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.WEAPON_FOCUS', value: 1 });
    }
    
    // Damage value bonus: +1 per bonus
    const damageValueBonus = (this as any).damageValueBonus || 0;
    if (damageValueBonus > 0) {
      recommendedLevel += damageValueBonus;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.DAMAGE_VALUE_BONUS', labelParams: `(+${damageValueBonus})`, value: damageValueBonus });
    }
    
    // Resource Reduction (RR) entries
    for (const rr of rrList) {
      const rrType = rr.rrType;
      const rrValue = rr.rrValue || 0;
      
      if (rrValue > 0) {
        if (rrType === 'specialization') {
          // RR specialization: +2 levels per value
          const value = rrValue * 2;
          recommendedLevel += value;
          recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RR_SPECIALIZATION', labelParams: `(${rrValue})`, value });
        } else if (rrType === 'skill') {
          // RR skill: +5 levels per value
          const value = rrValue * 5;
          recommendedLevel += value;
          recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RR_SKILL', labelParams: `(${rrValue})`, value });
        } else if (rrType === 'attribute') {
          // RR attribute: +10 levels per value
          const value = rrValue * 10;
          recommendedLevel += value;
          recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RR_ATTRIBUTE', labelParams: `(${rrValue})`, value });
        }
      }
    }
    
    // Anarchy bonus: +2 per anarchy point
    if (bonusAnarchy > 0) {
      const value = bonusAnarchy * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ANARCHY_BONUS', labelParams: `(${bonusAnarchy})`, value });
    }
    
    // Grants narration: +3 levels
    if (grantsNarration) {
      recommendedLevel += 3;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.GRANTS_NARRATION', value: 3 });
    }
    
    // Narrative effects: +1 level per positive effect, -1 per negative effect (count non-empty strings)
    const positiveEffectsCount = narrativeEffects.filter((effect: any) => effect?.text && effect.text.trim() !== '' && !effect.isNegative).length;
    const negativeEffectsCount = narrativeEffects.filter((effect: any) => effect?.text && effect.text.trim() !== '' && effect.isNegative).length;
    
    if (positiveEffectsCount > 0) {
      recommendedLevel += positiveEffectsCount;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_POSITIVE', labelParams: `(${positiveEffectsCount})`, value: positiveEffectsCount });
    }
    
    if (negativeEffectsCount > 0) {
      recommendedLevel -= negativeEffectsCount;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_NEGATIVE', labelParams: `(${negativeEffectsCount})`, value: -negativeEffectsCount });
    }
    
    // Additional sustained spells: +2 per spell (max 2)
    const sustainedSpellCount = (this as any).sustainedSpellCount || 0;
    if (sustainedSpellCount > 0) {
      const value = sustainedSpellCount * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SUSTAINED_SPELLS', labelParams: `(${sustainedSpellCount})`, value });
    }
    
    // Additional summoned spirit: +3 (max 1)
    const summonedSpiritCount = (this as any).summonedSpiritCount || 0;
    if (summonedSpiritCount > 0) {
      const value = summonedSpiritCount * 3;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SUMMONED_SPIRITS', labelParams: `(${summonedSpiritCount})`, value });
    }
    
    (this as any).recommendedLevel = recommendedLevel;
    (this as any).recommendedLevelBreakdown = recommendedLevelBreakdown;
  }
}


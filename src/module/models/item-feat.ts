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
          "weapons-spells": "SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS"
        },
        label: "SRA2.FEATS.FEAT_TYPE.LABEL"
      }),
      // Weapon/Spell specific fields
      damageValue: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.WEAPON.DAMAGE_VALUE"
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
      hasArmorBonus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.HAS_ARMOR_BONUS"
      }),
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
    
    const featType = (this as any).featType || 'equipment';
    const bonusLightDamage = (this as any).bonusLightDamage || 0;
    const bonusSevereDamage = (this as any).bonusSevereDamage || 0;
    const hasArmorBonus = (this as any).hasArmorBonus || false;
    const firewall = (this as any).firewall || 0;
    const attack = (this as any).attack || 0;
    const riggerConsoleCount = (this as any).riggerConsoleCount || 0;
    const hasVehicleControlWiring = (this as any).hasVehicleControlWiring || false;
    const rrList = (this as any).rrList || [];
    
    // Cyberware/bioware: 1 level
    if (featType === 'cyberware') {
      recommendedLevel += 1;
    }
    
    // Light wounds: +3 per wound
    recommendedLevel += bonusLightDamage * 3;
    
    // Heavy wounds: +6 per wound
    recommendedLevel += bonusSevereDamage * 6;
    
    // Armor bonus: +1 if checked
    if (hasArmorBonus) {
      recommendedLevel += 1;
    }
    
    // Cyberdeck firewall: starts at 1, each level is +1
    if (featType === 'cyberdeck' && firewall > 0) {
      recommendedLevel += firewall;
    }
    
    // Attack: starts at 0, each level is +1
    if (attack > 0) {
      recommendedLevel += attack;
    }
    
    // Rigger console: +1 per drone controller
    recommendedLevel += riggerConsoleCount;
    
    // Vehicle control wiring: +2
    if (hasVehicleControlWiring) {
      recommendedLevel += 2;
    }
    
    // Resource Reduction (RR) entries
    for (const rr of rrList) {
      const rrType = rr.rrType;
      const rrValue = rr.rrValue || 0;
      
      if (rrType === 'specialization') {
        // RR specialization: +2 levels per value
        recommendedLevel += rrValue * 2;
      } else if (rrType === 'skill') {
        // RR skill: +5 levels per value
        recommendedLevel += rrValue * 5;
      } else if (rrType === 'attribute') {
        // RR attribute: +10 levels per value
        recommendedLevel += rrValue * 10;
      }
    }
    
    (this as any).recommendedLevel = recommendedLevel;
  }
}


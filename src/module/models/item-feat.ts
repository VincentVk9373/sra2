/**
 * Weapon types configuration with their stats
 * Includes recommended skill and specialization for attack AND defense
 * Specializations are prefixed with "Spé : " to easily find them in game.items
 */
export const WEAPON_TYPES = {
  "custom-weapon": { 
    vd: "0", melee: "none", short: "none", medium: "none", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Combat rapproché - Mains nues
  "bare-hands": { 
    vd: "FOR", melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "Combat rapproché", linkedSpecialization: "Spé : Mains nues",
    linkedDefenseSkill: "Combat rapproché", linkedDefenseSpecialization: "Spé : Défense"
  },
  // Combat rapproché - Lames
  "short-weapons": { 
    vd: "FOR+1", melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "Combat rapproché", linkedSpecialization: "Spé : Lames",
    linkedDefenseSkill: "Combat rapproché", linkedDefenseSpecialization: "Spé : Défense"
  },
  "long-weapons": { 
    vd: "FOR+2", melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "Combat rapproché", linkedSpecialization: "Spé : Lames",
    linkedDefenseSkill: "Combat rapproché", linkedDefenseSpecialization: "Spé : Défense"
  },
  // Combat rapproché - Armes contondantes
  "advanced-melee": { 
    vd: 5, melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "Combat rapproché", linkedSpecialization: "Spé : Armes contondantes",
    linkedDefenseSkill: "Combat rapproché", linkedDefenseSpecialization: "Spé : Défense"
  },
  "tasers": { 
    vd: 5, melee: "ok", short: "ok", medium: "none", long: "none",
    linkedSkill: "Combat rapproché", linkedSpecialization: "Spé : Armes contondantes",
    linkedDefenseSkill: "Combat rapproché", linkedDefenseSpecialization: "Spé : Défense"
  },
  // Armes à distance - Armes de jet
  "throwing": { 
    vd: "FOR+1", melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Armes de jet",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "grenades": { 
    vd: 7, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Armes de jet",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "gas-grenades": { 
    vd: "toxin", melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Armes de jet",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Armes de trait
  "bows": { 
    vd: "FOR+1", melee: "ok", short: "ok", medium: "ok", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Armes de trait",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "crossbows": { 
    vd: 4, melee: "ok", short: "ok", medium: "ok", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Armes de trait",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Pistolets
  "pocket-pistols": { 
    vd: 3, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "light-pistols": { 
    vd: 4, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "automatic-pistols": { 
    vd: 4, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "heavy-pistols": { 
    vd: 5, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Mitraillettes
  "smgs": { 
    vd: 5, melee: "disadvantage", short: "ok", medium: "ok", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Mitraillettes",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Fusils
  "assault-rifles": { 
    vd: 7, melee: "disadvantage", short: "ok", medium: "ok", long: "disadvantage",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Fusils",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "shotguns": { 
    vd: 8, melee: "disadvantage", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Fusils",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "sniper-rifles": { 
    vd: 10, melee: "none", short: "disadvantage", medium: "disadvantage", long: "ok",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Fusils",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Lance-grenades
  "grenade-launchers": { 
    vd: 7, melee: "none", short: "disadvantage", medium: "ok", long: "disadvantage",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Lance-grenades",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Armes lourdes
  "machine-guns": { 
    vd: 9, melee: "none", short: "ok", medium: "ok", long: "ok",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Armes lourdes",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "rocket-launchers": { 
    vd: 12, melee: "none", short: "none", medium: "disadvantage", long: "ok",
    linkedSkill: "Armes à distance", linkedSpecialization: "Spé : Armes lourdes",
    linkedDefenseSkill: "Athlétisme", linkedDefenseSpecialization: "Spé : Défense à distance"
  }
} as const;

/**
 * Vehicle/Drone types configuration with their stats
 */
export const VEHICLE_TYPES = {
  "microdrone": { autopilot: 6, structure: 0, handling: 10, speed: 0, flyingSpeed: 1, armor: 0, weaponMount: "none" },
  "small-drone": { autopilot: 6, structure: 1, handling: 9, speed: 2, flyingSpeed: 4, armor: 0, weaponMount: "smg" },
  "medium-drone": { autopilot: 6, structure: 2, handling: 7, speed: 3, flyingSpeed: 6, armor: 0, weaponMount: "rifle" },
  "large-drone": { autopilot: 6, structure: 4, handling: 4, speed: 4, flyingSpeed: 8, armor: 0, weaponMount: "rifle" },
  "racing-motorcycle": { autopilot: 6, structure: 4, handling: 2, speed: 6, flyingSpeed: 0, armor: 0, weaponMount: "rifle" },
  "offroad-motorcycle": { autopilot: 6, structure: 4, handling: 3, speed: 5, flyingSpeed: 0, armor: 0, weaponMount: "rifle" },
  "chopper": { autopilot: 6, structure: 5, handling: 2, speed: 5, flyingSpeed: 0, armor: 0, weaponMount: "rifle" },
  "sports-car": { autopilot: 6, structure: 5, handling: 2, speed: 5, flyingSpeed: 0, armor: 0, weaponMount: "none" },
  "sedan": { autopilot: 6, structure: 6, handling: 2, speed: 4, flyingSpeed: 0, armor: 0, weaponMount: "none" },
  "suv-pickup": { autopilot: 6, structure: 7, handling: 1, speed: 4, flyingSpeed: 0, armor: 0, weaponMount: "none" },
  "van": { autopilot: 6, structure: 8, handling: 1, speed: 3, flyingSpeed: 0, armor: 0, weaponMount: "none" },
  "bus-truck": { autopilot: 6, structure: 10, handling: 0, speed: 2, flyingSpeed: 0, armor: 0, weaponMount: "none" }
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
      bookmarked: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.BOOKMARKS.TOGGLE"
      }),
      rating: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "SRA2.FEATS.RATING"
      }),
      cost: new fields.StringField({
        required: true,
        initial: "free-equipment",
        choices: {
          "free-equipment": "SRA2.FEATS.COST.FREE_EQUIPMENT",
          "equipment": "SRA2.FEATS.COST.EQUIPMENT",
          "advanced-equipment": "SRA2.FEATS.COST.ADVANCED_EQUIPMENT",
          // Legacy values kept for migration compatibility (not shown in UI)
          "specialized-equipment": "SRA2.FEATS.COST.ADVANCED_EQUIPMENT",
          "feat": "SRA2.FEATS.COST.FREE_EQUIPMENT"
        },
        label: "SRA2.FEATS.COST.LABEL"
      }),
      active: new fields.BooleanField({
        required: true,
        initial: true,
        label: "SRA2.FEATS.ACTIVE"
      }),
      bookmarked: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.BOOKMARKED"
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
          initial: 1,
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
      vehicleType: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.VEHICLE.VEHICLE_TYPE"
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
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE",
          "disadvantage": "SRA2.FEATS.WEAPON.RANGE_DISADVANTAGE"
        },
        label: "SRA2.FEATS.WEAPON.MELEE_RANGE"
      }),
      shortRange: new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.WEAPON.RANGE_NONE",
          "ok": "SRA2.FEATS.WEAPON.RANGE_OK",
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE",
          "disadvantage": "SRA2.FEATS.WEAPON.RANGE_DISADVANTAGE"
        },
        label: "SRA2.FEATS.WEAPON.SHORT_RANGE"
      }),
      mediumRange: new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.WEAPON.RANGE_NONE",
          "ok": "SRA2.FEATS.WEAPON.RANGE_OK",
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE",
          "disadvantage": "SRA2.FEATS.WEAPON.RANGE_DISADVANTAGE"
        },
        label: "SRA2.FEATS.WEAPON.MEDIUM_RANGE"
      }),
      longRange: new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.WEAPON.RANGE_NONE",
          "ok": "SRA2.FEATS.WEAPON.RANGE_OK",
          "dice": "SRA2.FEATS.WEAPON.RANGE_DICE",
          "disadvantage": "SRA2.FEATS.WEAPON.RANGE_DISADVANTAGE"
        },
        label: "SRA2.FEATS.WEAPON.LONG_RANGE"
      }),
      rangeImprovements: new fields.SchemaField({
        melee: new fields.BooleanField({
          required: true,
          initial: false
        }),
        short: new fields.BooleanField({
          required: true,
          initial: false
        }),
        medium: new fields.BooleanField({
          required: true,
          initial: false
        }),
        long: new fields.BooleanField({
          required: true,
          initial: false
        })
      }, {
        required: true,
        label: "SRA2.FEATS.WEAPON.RANGE_IMPROVEMENTS"
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
      flyingSpeed: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.FLYING_SPEED"
      }),
      armor: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.ARMOR"
      }),
      weaponMount: new fields.StringField({
        required: true,
        initial: "none",
        label: "SRA2.FEATS.VEHICLE.WEAPON_MOUNT"
      }),
      weaponInfo: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.VEHICLE.WEAPON_INFO"
      }),
      // Vehicle bonuses
      autopilotBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 6,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.AUTOPILOT_BONUS"
      }),
      speedBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 3,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.SPEED_BONUS"
      }),
      handlingBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 3,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.HANDLING_BONUS"
      }),
      armorBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.ARMOR_BONUS"
      }),
      isFixed: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.VEHICLE.IS_FIXED"
      }),
      isFlying: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.VEHICLE.IS_FLYING"
      }),
      weaponMountImprovement: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.VEHICLE.WEAPON_MOUNT_IMPROVEMENT"
      }),
      autopilotUnlocked: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.VEHICLE.AUTOPILOT_UNLOCKED"
      }),
      additionalDroneCount: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 3,
        integer: true,
        label: "SRA2.FEATS.VEHICLE.ADDITIONAL_DRONE_COUNT"
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
        }),
        value: new fields.NumberField({
          required: true,
          initial: -1,
          min: -5,
          max: -1,
          integer: true
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
      }),
      // First feat flag
      isFirstFeat: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_FIRST_FEAT"
      }),
      // Shamanic mask (for awakened feats)
      shamanicMask: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.AWAKENED.SHAMANIC_MASK"
      }),
      // Spell type (direct or indirect)
      spellType: new fields.StringField({
        required: true,
        initial: "direct",
        choices: {
          "direct": "SRA2.FEATS.SPELL.TYPE_DIRECT",
          "indirect": "SRA2.FEATS.SPELL.TYPE_INDIRECT"
        },
        label: "SRA2.FEATS.SPELL.TYPE"
      }),
      // Linked skills and specializations for weapons (for custom weapons)
      linkedAttackSkill: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.WEAPON.LINKED_ATTACK_SKILL"
      }),
      linkedAttackSpecialization: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.WEAPON.LINKED_ATTACK_SPECIALIZATION"
      }),
      linkedDefenseSkill: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.WEAPON.LINKED_DEFENSE_SKILL"
      }),
      linkedDefenseSpecialization: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.FEATS.WEAPON.LINKED_DEFENSE_SPECIALIZATION"
      })
    };
  }

  override prepareDerivedData(): void {
    // Get common properties
    const costType = (this as any).cost || 'free-equipment';
    const featType = (this as any).featType || 'equipment';
    const rating = (this as any).rating || 0;
    
    // Calculate cost based on cost type (for equipment and weapons)
    let calculatedCost = 0;
    
    // Apply cost calculations for equipment, weapon, and weapons-spells types
    if (featType === 'equipment' || featType === 'weapon' || featType === 'weapons-spells') {
      switch (costType) {
        case 'free-equipment':
          calculatedCost = 0;
          break;
        case 'equipment':
          calculatedCost = 2500;
          break;
        case 'advanced-equipment':
          calculatedCost = 5000;
          break;
        // Legacy values (kept for migration compatibility)
        case 'specialized-equipment':
          calculatedCost = 5000;
          break;
        case 'feat':
          calculatedCost = 0;
          break;
        default:
          calculatedCost = 0;
      }
    }

    calculatedCost += rating * 5000;
    
    (this as any).calculatedCost = calculatedCost;

    // Calculate recommended attribute level
    let recommendedLevel = 0;
    const recommendedLevelBreakdown: Array<{ labelKey: string; labelParams?: string; value: number }> = [];
    
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
    const isFirstFeat = (this as any).isFirstFeat || false;
    
    // Base cost for trait (not first feat): +3 levels
    if (featType === 'trait' && !isFirstFeat) {
      recommendedLevel += 3;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.BASE_FEAT_COST', value: 3 });
    }
    
    // Cyberware/bioware: 1 level
    if (featType === 'cyberware') {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CYBERWARE', value: 1 });
    }
    
    // Adept power: 1 level
    if (featType === 'adept-power') {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ADEPT_POWER', value: 1 });
    }
    
    // Spell: 1 level
    if (featType === 'spell') {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SPELL', value: 1 });
    }
    
    // Vehicle/Drone: 1 level
    if (featType === 'vehicle') {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.VEHICLE', value: 1 });
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
    
    // Range improvements: +2 per improved range
    const rangeImprovements = (this as any).rangeImprovements || {};
    let rangeImprovementCount = 0;
    if (rangeImprovements.melee) rangeImprovementCount++;
    if (rangeImprovements.short) rangeImprovementCount++;
    if (rangeImprovements.medium) rangeImprovementCount++;
    if (rangeImprovements.long) rangeImprovementCount++;
    if (rangeImprovementCount > 0) {
      const value = rangeImprovementCount * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RANGE_IMPROVEMENTS', labelParams: `(${rangeImprovementCount})`, value });
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
    
    // Narrative effects: +1 level per positive effect, value per negative effect (count non-empty strings)
    const positiveEffectsCount = narrativeEffects.filter((effect: any) => effect?.text && effect.text.trim() !== '' && !effect.isNegative).length;
    const negativeEffects = narrativeEffects.filter((effect: any) => effect?.text && effect.text.trim() !== '' && effect.isNegative);
    
    if (positiveEffectsCount > 0) {
      recommendedLevel += positiveEffectsCount;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_POSITIVE', labelParams: `(${positiveEffectsCount})`, value: positiveEffectsCount });
    }
    
    if (negativeEffects.length > 0) {
      const negativeEffectValue = negativeEffects.reduce((sum: number, effect: any) => sum + (effect.value || -1), 0);
      recommendedLevel += negativeEffectValue; // Adding because value is already negative
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_NEGATIVE', labelParams: `(${negativeEffects.length})`, value: negativeEffectValue });
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
    
    // Awakened abilities
    const astralPerception = (this as any).astralPerception || false;
    const astralProjection = (this as any).astralProjection || false;
    const sorcery = (this as any).sorcery || false;
    const conjuration = (this as any).conjuration || false;
    const adept = (this as any).adept || false;
    
    // Astral perception AND projection: +2
    if (astralPerception && astralProjection) {
      recommendedLevel += 2;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ASTRAL_PERCEPTION_PROJECTION', value: 2 });
    }
    
    // Sorcery: +1
    if (sorcery) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SORCERY', value: 1 });
    }
    
    // Conjuration: +2
    if (conjuration) {
      recommendedLevel += 2;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CONJURATION', value: 2 });
    }
    
    // Adept: +1
    if (adept) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ADEPT', value: 1 });
    }
    
    // Vehicle/Drone bonuses
    const autopilotBonus = (this as any).autopilotBonus || 0;
    const speedBonus = (this as any).speedBonus || 0;
    const handlingBonus = (this as any).handlingBonus || 0;
    const armorBonus = (this as any).armorBonus || 0;
    const isFixed = (this as any).isFixed || false;
    const isFlying = (this as any).isFlying || false;
    const weaponMountImprovement = (this as any).weaponMountImprovement || false;
    const autopilotUnlocked = (this as any).autopilotUnlocked || false;
    const additionalDroneCount = (this as any).additionalDroneCount || 0;
    
    // Autopilot bonus: +1 per level
    if (autopilotBonus > 0) {
      recommendedLevel += autopilotBonus;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.AUTOPILOT_BONUS', labelParams: `(+${autopilotBonus})`, value: autopilotBonus });
    }
    
    // Speed bonus: +1 per level
    if (speedBonus > 0) {
      recommendedLevel += speedBonus;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SPEED_BONUS', labelParams: `(+${speedBonus})`, value: speedBonus });
    }
    
    // Handling bonus: +1 per level
    if (handlingBonus > 0) {
      recommendedLevel += handlingBonus;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.HANDLING_BONUS', labelParams: `(+${handlingBonus})`, value: handlingBonus });
    }
    
    // Armor bonus: +1 per level
    if (armorBonus > 0) {
      recommendedLevel += armorBonus;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ARMOR_BONUS', labelParams: `(+${armorBonus})`, value: armorBonus });
    }
    
    // Fixed (unable to move): -1
    if (isFixed) {
      recommendedLevel -= 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.IS_FIXED', value: -1 });
    }
    
    // Flying: +1
    if (isFlying) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.IS_FLYING', value: 1 });
    }
    
    // Weapon mount improvement: +1
    if (weaponMountImprovement) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.WEAPON_MOUNT_IMPROVEMENT', value: 1 });
    }
    
    // Autopilot unlocked: +3
    if (autopilotUnlocked) {
      recommendedLevel += 3;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.AUTOPILOT_UNLOCKED', value: 3 });
    }
    
    // Additional drones: +2 per drone
    if (additionalDroneCount > 0) {
      const value = additionalDroneCount * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ADDITIONAL_DRONES', labelParams: `(${additionalDroneCount})`, value });
    }
    
    // Shamanic mask: -1 level (for awakened feats only)
    const shamanicMask = (this as any).shamanicMask || false;
    if (shamanicMask && featType === 'awakened') {
      recommendedLevel -= 1;
      recommendedLevelBreakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SHAMANIC_MASK', value: -1 });
    }
    
    (this as any).recommendedLevel = recommendedLevel;
    (this as any).recommendedLevelBreakdown = recommendedLevelBreakdown;
  }
}


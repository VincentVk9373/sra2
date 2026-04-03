import { SKILL_SLUGS } from '../config/constants.js';

/**
 * Weapon types configuration with their stats
 * Includes recommended skill and specialization for attack AND defense
 * Specializations use canonical slugs (e.g. "spec_pistols") to match items by slug
 */
export const WEAPON_TYPES = {
  "custom-weapon": { 
    vd: "0", melee: "none", short: "none", medium: "none", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  // Combat rapproché - Mains nues
  "bare-hands": { 
    vd: "FOR", melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "close-combat", linkedSpecialization: "spec_unarmed",
    linkedDefenseSkill: "close-combat", linkedDefenseSpecialization: "spec_defense"
  },
  // Combat rapproché - Lames
  "short-weapons": { 
    vd: "FOR+1", melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "close-combat", linkedSpecialization: "spec_blades",
    linkedDefenseSkill: "close-combat", linkedDefenseSpecialization: "spec_defense"
  },
  "long-weapons": { 
    vd: "FOR+2", melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "close-combat", linkedSpecialization: "spec_blades",
    linkedDefenseSkill: "close-combat", linkedDefenseSpecialization: "spec_defense"
  },
  // Combat rapproché - Armes contondantes
  "advanced-melee": { 
    vd: 5, melee: "ok", short: "none", medium: "none", long: "none",
    linkedSkill: "close-combat", linkedSpecialization: "spec_blunt-weapons",
    linkedDefenseSkill: "close-combat", linkedDefenseSpecialization: "spec_defense"
  },
  "tasers": { 
    vd: 5, melee: "ok", short: "ok", medium: "none", long: "none",
    linkedSkill: "close-combat", linkedSpecialization: "spec_blunt-weapons",
    linkedDefenseSkill: "close-combat", linkedDefenseSpecialization: "spec_defense"
  },
  // Armes à distance - Armes de jet
  "throwing": { 
    vd: "FOR+1", melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_thrown-weapons",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "grenades": { 
    vd: 7, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_thrown-weapons",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "gas-grenades": { 
    vd: "toxin", melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_thrown-weapons",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  // Armes à distance - Armes de trait
  "bows": { 
    vd: "FOR+1", melee: "ok", short: "ok", medium: "ok", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_thrown-weapons",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "crossbows": { 
    vd: 4, melee: "ok", short: "ok", medium: "ok", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_thrown-weapons",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  // Armes à distance - Pistolets
  "pocket-pistols": { 
    vd: 3, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_pistols",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "light-pistols": { 
    vd: 4, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_pistols",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "automatic-pistols": { 
    vd: 4, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_pistols",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "heavy-pistols": { 
    vd: 5, melee: "ok", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_pistols",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  // Armes à distance - Mitraillettes
  "smgs": { 
    vd: 5, melee: "disadvantage", short: "ok", medium: "ok", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_smgs",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  // Armes à distance - Fusils
  "assault-rifles": { 
    vd: 7, melee: "disadvantage", short: "ok", medium: "ok", long: "disadvantage",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_rifles",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "shotguns": { 
    vd: 8, melee: "disadvantage", short: "ok", medium: "disadvantage", long: "none",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_rifles",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "sniper-rifles": { 
    vd: 10, melee: "none", short: "disadvantage", medium: "disadvantage", long: "ok",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_rifles",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  // Armes à distance - Lance-grenades
  "grenade-launchers": { 
    vd: 7, melee: "none", short: "disadvantage", medium: "ok", long: "disadvantage",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_grenade-launchers",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  // Armes à distance - Armes lourdes
  "machine-guns": { 
    vd: 9, melee: "none", short: "ok", medium: "ok", long: "ok",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_heavy-weapons",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  },
  "rocket-launchers": { 
    vd: 12, melee: "none", short: "none", medium: "disadvantage", long: "ok",
    linkedSkill: "ranged-weapons", linkedSpecialization: "spec_heavy-weapons",
    linkedDefenseSkill: "athletics", linkedDefenseSpecialization: "spec_ranged-defense"
  }
} as const;

/**
 * Vehicle/Drone types configuration with their stats
 * Imported from JSON file
 */
import vehicleTypesData from '../config/vehicle-types.json';

export type VehicleType = keyof typeof vehicleTypesData;
export type VehicleStats = {
  autopilot: number;
  structure: number;
  handling: number;
  speed: number;
  flyingSpeed: number;
  armor: number;
  weaponMount: string;
};

export const VEHICLE_TYPES: Record<VehicleType, VehicleStats> = vehicleTypesData as Record<VehicleType, VehicleStats>;

/**
 * Data model for Feat items
 */
export class FeatDataModel extends foundry.abstract.TypeDataModel<any, Item> {
  static override migrateData(source: any): any {
    if (source.featType === 'vehicle') {
      source.featType = 'equipment';
    }
    return super.migrateData(source);
  }

  static override defineSchema(): any {
    const fields = foundry.data.fields;
    
    return {
      description: new fields.HTMLField({
        required: true,
        initial: ""
      }),
      gmDescription: new fields.HTMLField({
        required: false,
        initial: "",
        label: "SRA2.GM_DESCRIPTION"
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
        }),
        rrLabel: new fields.StringField({
          required: false,
          initial: "",
          nullable: false,
          label: "SRA2.FEATS.RR_LABEL"
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
      bonusMatrixThreshold: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "SRA2.FEATS.BONUS_MATRIX_THRESHOLD"
      }),
      armorValue: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 5,
        integer: true,
        label: "SRA2.FEATS.ARMOR_VALUE"
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
        label: "SRA2.FEATS.ESSENCE_COST"
      }),
      isBioware: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_BIOWARE"
      }),
      // Choice system fields for token drop configuration
      isOptional: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_OPTIONAL"
      }),
      isAChoice: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_A_CHOICE"
      }),
      numberOfChoice: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        integer: true,
        label: "SRA2.FEATS.NUMBER_OF_CHOICE"
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
          "armor": "SRA2.FEATS.FEAT_TYPE.ARMOR",
          "cyberware": "SRA2.FEATS.FEAT_TYPE.CYBERWARE",
          "cyberdeck": "SRA2.FEATS.FEAT_TYPE.CYBERDECK",
          "weapon": "SRA2.FEATS.FEAT_TYPE.WEAPON",
          "spell": "SRA2.FEATS.FEAT_TYPE.SPELL",
          "emerged": "SRA2.FEATS.FEAT_TYPE.EMERGED",
          "complex-form": "SRA2.FEATS.FEAT_TYPE.COMPLEX_FORM",
          "connaissance": "SRA2.FEATS.FEAT_TYPE.KNOWLEDGE",
          "power": "SRA2.FEATS.FEAT_TYPE.POWER"
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
      }), // Legacy: kept for migration compatibility
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
      // VD mode for custom weapons: "custom" or "attribute"
      vdMode: new fields.StringField({
        required: true,
        initial: "custom",
        choices: {
          "custom": "SRA2.FEATS.WEAPON.VD_MODE.CUSTOM",
          "attribute": "SRA2.FEATS.WEAPON.VD_MODE.ATTRIBUTE"
        },
        label: "SRA2.FEATS.WEAPON.VD_MODE.LABEL"
      }),
      // Custom VD value (for vdMode = "custom")
      vdCustomValue: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.WEAPON.VD_CUSTOM_VALUE"
      }),
      // Attribute for VD calculation (for vdMode = "attribute")
      vdAttribute: new fields.StringField({
        required: true,
        initial: "strength",
        choices: {
          strength: "SRA2.ATTRIBUTES.STRENGTH",
          agility: "SRA2.ATTRIBUTES.AGILITY",
          willpower: "SRA2.ATTRIBUTES.WILLPOWER",
          logic: "SRA2.ATTRIBUTES.LOGIC",
          charisma: "SRA2.ATTRIBUTES.CHARISMA"
        },
        label: "SRA2.FEATS.WEAPON.VD_ATTRIBUTE"
      }),
      // Bonus for VD calculation (for vdMode = "attribute")
      vdBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.WEAPON.VD_BONUS"
      }),
      damageType: new fields.StringField({
        required: true,
        initial: "physical",
        choices: {
          "physical": "SRA2.FEATS.WEAPON.DAMAGE_TYPE_PHYSICAL",
          "mental": "SRA2.FEATS.WEAPON.DAMAGE_TYPE_MAGIC",
          "matrix": "SRA2.FEATS.WEAPON.DAMAGE_TYPE_MATRIX"
        },
        label: "SRA2.FEATS.WEAPON.DAMAGE_TYPE"
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
      // Reference to vehicle actor when feat is created from dragging a vehicle actor
      vehicleActorUuid: new fields.StringField({
        required: false,
        initial: "",
        nullable: true,
        label: "SRA2.FEATS.VEHICLE.ACTOR_UUID"
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
      firewallMalus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.CYBERDECK.FIREWALL_MALUS"
      }),
      attackMalus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.CYBERDECK.ATTACK_MALUS"
      }),
      connectionLocked: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.CYBERDECK.CONNECTION_LOCKED"
      }),
      cyberdeckDamage: new fields.SchemaField({
        light: new fields.ArrayField(new fields.BooleanField({
          required: true,
          initial: false
        }), {
          required: true,
          initial: [false, false]
        }),
        severe: new fields.ArrayField(new fields.BooleanField({
          required: true,
          initial: false
        }), {
          required: true,
          initial: [false]
        }),
        incapacitating: new fields.BooleanField({
          required: true,
          initial: false
        })
      }, {
        required: true,
        label: "SRA2.FEATS.CYBERDECK.DAMAGE"
      }),
      // Cyberdeck connection mode (RA, cold-sim VR, hot-sim VR)
      connectionMode: new fields.StringField({
        required: true,
        initial: "ar",
        choices: {
          "disconnected": "SRA2.FEATS.CYBERDECK.CONNECTION_MODE.DISCONNECTED",
          "offline": "SRA2.FEATS.CYBERDECK.CONNECTION_MODE.OFFLINE",
          "ar": "SRA2.FEATS.CYBERDECK.CONNECTION_MODE.AR",
          "cold-sim": "SRA2.FEATS.CYBERDECK.CONNECTION_MODE.COLD_SIM",
          "hot-sim": "SRA2.FEATS.CYBERDECK.CONNECTION_MODE.HOT_SIM"
        },
        label: "SRA2.FEATS.CYBERDECK.CONNECTION_MODE.LABEL"
      }),
      // Cyberdeck bonus light damage (+1 light damage box for cyberdeck, +1 to recommended level)
      cyberdeckBonusLightDamage: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.CYBERDECK.BONUS_LIGHT_DAMAGE"
      }),
      // Cyberdeck programs
      cyberdeckBiofeedback: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.CYBERDECK.BIOFEEDBACK"
      }),
      cyberdeckBiofeedbackFilter: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.CYBERDECK.BIOFEEDBACK_FILTER"
      }),
      cyberdeckConnectionLock: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.CYBERDECK.CONNECTION_LOCK"
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
      isAdeptPowerWeapon: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_ADEPT_POWER_WEAPON"
      }),
      isSpell: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_SPELL"
      }),
      isMagic: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.IS_MAGIC"
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
          initial: 0,
          min: -5,
          max: 5
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
        initial: 0,
        min: 0,
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
      // Emerged (technomancer) specific fields
      matrixAccess: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.EMERGED.MATRIX_ACCESS"
      }),
      complexFormWeaving: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.EMERGED.COMPLEX_FORM_WEAVING"
      }),
      spriteCompilation: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.EMERGED.SPRITE_COMPILATION"
      }),
      biofeedback: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.FEATS.EMERGED.BIOFEEDBACK"
      }),
      compiledSpriteCount: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 1,
        integer: true,
        label: "SRA2.FEATS.EMERGED.COMPILED_SPRITE_COUNT"
      }),
      sustainedComplexFormCount: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 2,
        integer: true,
        label: "SRA2.FEATS.EMERGED.SUSTAINED_COMPLEX_FORM_COUNT"
      }),
      // Complex form specialization type
      complexFormSpecializationType: new fields.StringField({
        required: true,
        initial: "formes-complexes",
        choices: {
          "formes-complexes": "SRA2.FEATS.COMPLEX_FORM.SPECIALIZATION.COMPLEX_FORMS",
          "compilation": "SRA2.FEATS.COMPLEX_FORM.SPECIALIZATION.COMPILATION",
          "decompilation": "SRA2.FEATS.COMPLEX_FORM.SPECIALIZATION.DECOMPILATION"
        },
        label: "SRA2.FEATS.COMPLEX_FORM.SPECIALIZATION.TYPE"
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
      // Weapon damage bonus by weapon type
      weaponDamageBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "SRA2.FEATS.WEAPON_DAMAGE_BONUS"
      }),
      weaponTypeBonus: new fields.StringField({
        required: true,
        initial: "custom-weapon",
        choices: (() => {
          const choices: Record<string, string> = {};
          Object.keys(WEAPON_TYPES).forEach((key) => {
            choices[key] = key;
          });
          return choices;
        })(),
        label: "SRA2.FEATS.WEAPON_TYPE_BONUS"
      }),
      // Spell specialization type (determines which specialization to use)
      spellSpecializationType: new fields.StringField({
        required: true,
        initial: "combat",
        choices: {
          "combat": "SRA2.FEATS.SPELL.SPECIALIZATION.COMBAT",
          "detection": "SRA2.FEATS.SPELL.SPECIALIZATION.DETECTION",
          "health": "SRA2.FEATS.SPELL.SPECIALIZATION.HEALTH",
          "illusion": "SRA2.FEATS.SPELL.SPECIALIZATION.ILLUSION",
          "manipulation": "SRA2.FEATS.SPELL.SPECIALIZATION.MANIPULATION",
          "counterspell": "SRA2.FEATS.SPELL.SPECIALIZATION.COUNTERSPELL"
        },
        label: "SRA2.FEATS.SPELL.SPECIALIZATION.TYPE"
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
      }),
      reference: new fields.StringField({
        required: false,
        initial: "",
        label: "SRA2.REFERENCE"
      })
    };
  }

  override prepareDerivedData(): void {
    const featType = (this as any).featType || 'equipment';

    // If astral projection is enabled, automatically enable astral perception
    if ((this as any).astralProjection) (this as any).astralPerception = true;

    this._applySpellSkillLinks(featType);
    this._applyCustomWeaponDamage(featType);
    this._calculateCost(featType);
    this._calculateRecommendedLevel(featType);
  }

  private _applySpellSkillLinks(featType: string): void {
    if (featType === 'spell') {
      (this as any).linkedAttackSkill = SKILL_SLUGS.SORCERY;
      const spellSpecMap: Record<string, string> = {
        'combat': 'spec_combat-spells',
        'detection': 'spec_detection-spells',
        'health': 'spec_health-spells',
        'illusion': 'spec_illusion-spells',
        'manipulation': 'spec_manipulation-spells',
        'counterspell': 'spec_counterspelling'
      };
      const spellSpecType = (this as any).spellSpecializationType || 'combat';
      (this as any).linkedAttackSpecialization = spellSpecMap[spellSpecType] || 'spec_combat-spells';
    } else if (featType === 'complex-form') {
      (this as any).linkedAttackSkill = SKILL_SLUGS.TECHNOMANCER;
      const cfSpecMap: Record<string, string> = {
        'formes-complexes': 'spec_complex-forms',
        'compilation': 'spec_compilation',
        'decompilation': 'spec_decompilation'
      };
      const cfSpecType = (this as any).complexFormSpecializationType || 'formes-complexes';
      (this as any).linkedAttackSpecialization = cfSpecMap[cfSpecType] || 'spec_complex-forms';
    }
  }

  private _applyCustomWeaponDamage(featType: string): void {
    const weaponType = (this as any).weaponType || '';
    if (weaponType !== 'custom-weapon' || featType !== 'weapon') return;
    const vdMode = (this as any).vdMode || 'custom';
    if (vdMode === 'custom') {
      (this as any).damageValue = ((this as any).vdCustomValue ?? 0).toString();
    } else {
      const vdAttribute = (this as any).vdAttribute || 'strength';
      const vdBonus = (this as any).vdBonus ?? 0;
      if (vdAttribute === 'strength') {
        (this as any).damageValue = vdBonus === 0 ? 'FOR' : `FOR+${vdBonus}`;
      } else {
        (this as any).damageValue = `${vdAttribute}+${vdBonus}`;
      }
    }
  }

  private _calculateCost(featType: string): void {
    (this as any).calculatedCost = computeFeatCost(featType, this as any);
  }

  private _calculateRecommendedLevel(featType: string): void {
    const { level, breakdown } = computeFeatLevel(featType, this as any);
    (this as any).recommendedLevel = level;
    (this as any).recommendedLevelBreakdown = breakdown;
  }
}

// ═══════════════════════════════════════════════════════════════
// Shared feat level computation — used by FeatDataModel and NPC generator
// ═══════════════════════════════════════════════════════════════

export interface FeatLevelBreakdownEntry {
  labelKey: string;
  labelParams?: string;
  value: number;
}

/**
 * Compute the recommended level of a feat based on its properties.
 * Pure function: reads from `data`, writes nothing.
 */
export function computeFeatLevel(
  featType: string,
  data: Record<string, any>,
): { level: number; breakdown: FeatLevelBreakdownEntry[] } {
  let level = 0;
  const breakdown: FeatLevelBreakdownEntry[] = [];

  const bonusLightDamage = data.bonusLightDamage || 0;
  const bonusSevereDamage = data.bonusSevereDamage || 0;
  const bonusPhysicalThreshold = data.bonusPhysicalThreshold || 0;
  const bonusMentalThreshold = data.bonusMentalThreshold || 0;
  const bonusMatrixThreshold = data.bonusMatrixThreshold || 0;
  const firewall = data.firewall || 0;
  const attack = data.attack || 0;
  const riggerConsoleCount = data.riggerConsoleCount || 0;
  const hasVehicleControlWiring = data.hasVehicleControlWiring || false;
  const isWeaponFocus = data.isWeaponFocus || false;
  const isAdeptPowerWeapon = data.isAdeptPowerWeapon || false;
  const isBioware = data.isBioware || false;
  const bonusAnarchy = data.bonusAnarchy || 0;
  const narrativeEffects = data.narrativeEffects || [];
  const rrList = data.rrList || [];
  const isFirstFeat = data.isFirstFeat || false;

  // Base cost for trait (not first feat): +3 levels
  if (featType === 'trait' && !isFirstFeat) {
    level += 3;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.BASE_FEAT_COST', value: 3 });
  }

  // Cyberware/bioware: 1 level (base), +1 additional if bioware
  if (featType === 'cyberware') {
    level += 1;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CYBERWARE', value: 1 });
    if (isBioware) {
      level += 1;
      breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.BIOWARE', value: 1 });
    }
  }

  if (featType === 'adept-power') {
    level += 1;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ADEPT_POWER', value: 1 });
  }

  if (featType === 'spell') {
    level += 1;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SPELL', value: 1 });
  }

  if (featType === 'complex-form') {
    level += 1;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.COMPLEX_FORM', value: 1 });
  }

  if (bonusLightDamage > 0) {
    const v = bonusLightDamage * 3;
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.LIGHT_WOUNDS', labelParams: `(${bonusLightDamage})`, value: v });
  }

  if (bonusSevereDamage > 0) {
    const v = bonusSevereDamage * 6;
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SEVERE_WOUNDS', labelParams: `(${bonusSevereDamage})`, value: v });
  }

  if (bonusPhysicalThreshold !== 0) {
    const v = Math.abs(bonusPhysicalThreshold);
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.PHYSICAL_THRESHOLD', labelParams: `(${bonusPhysicalThreshold > 0 ? '+' : ''}${bonusPhysicalThreshold})`, value: v });
  }

  if (bonusMentalThreshold !== 0) {
    const v = Math.abs(bonusMentalThreshold);
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.MENTAL_THRESHOLD', labelParams: `(${bonusMentalThreshold > 0 ? '+' : ''}${bonusMentalThreshold})`, value: v });
  }

  if (bonusMatrixThreshold !== 0) {
    const v = Math.abs(bonusMatrixThreshold);
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.MATRIX_THRESHOLD', labelParams: `(${bonusMatrixThreshold > 0 ? '+' : ''}${bonusMatrixThreshold})`, value: v });
  }

  if (featType === 'cyberdeck' && firewall > 0) {
    level += firewall;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.FIREWALL', labelParams: `(${firewall})`, value: firewall });
  }

  const cyberdeckBonusLightDamage = data.cyberdeckBonusLightDamage || false;
  if (featType === 'cyberdeck' && cyberdeckBonusLightDamage) {
    level += 3;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CYBERDECK_BONUS_LIGHT_DAMAGE', value: 3 });
  }

  if (featType === 'cyberdeck') {
    if (data.cyberdeckBiofeedback) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CYBERDECK_BIOFEEDBACK', value: 1 }); }
    if (data.cyberdeckBiofeedbackFilter) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CYBERDECK_BIOFEEDBACK_FILTER', value: 1 }); }
    if (data.cyberdeckConnectionLock) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CYBERDECK_CONNECTION_LOCK', value: 1 }); }
  }

  if (attack > 0) {
    level += attack;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ATTACK', labelParams: `(${attack})`, value: attack });
  }

  if (riggerConsoleCount > 0) {
    level += riggerConsoleCount;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RIGGER_CONSOLE', labelParams: `(${riggerConsoleCount})`, value: riggerConsoleCount });
  }

  if (hasVehicleControlWiring) {
    level += 2;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.VEHICLE_WIRING', value: 2 });
  }

  if (isWeaponFocus) {
    level += 1;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.WEAPON_FOCUS', value: 1 });
  }

  if (isAdeptPowerWeapon) {
    level += 1;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ADEPT_POWER_WEAPON', value: 1 });
  }

  const damageValueBonus = data.damageValueBonus || 0;
  if (damageValueBonus > 0) {
    level += damageValueBonus;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.DAMAGE_VALUE_BONUS', labelParams: `(+${damageValueBonus})`, value: damageValueBonus });
  }

  const weaponDamageBonus = data.weaponDamageBonus || 0;
  if (weaponDamageBonus > 0) {
    level += weaponDamageBonus;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.WEAPON_DAMAGE_BONUS', labelParams: `(+${weaponDamageBonus})`, value: weaponDamageBonus });
  }

  const rangeImprovements = data.rangeImprovements || {};
  let rangeImprovementCount = 0;
  if (rangeImprovements.melee) rangeImprovementCount++;
  if (rangeImprovements.short) rangeImprovementCount++;
  if (rangeImprovements.medium) rangeImprovementCount++;
  if (rangeImprovements.long) rangeImprovementCount++;
  if (rangeImprovementCount > 0) {
    const v = rangeImprovementCount * 2;
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RANGE_IMPROVEMENTS', labelParams: `(${rangeImprovementCount})`, value: v });
  }

  for (const rr of rrList) {
    const rrValue = rr.rrValue || 0;
    if (rrValue > 0) {
      if (rr.rrType === 'specialization') {
        const v = rrValue * 2;
        level += v;
        breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RR_SPECIALIZATION', labelParams: `(${rrValue})`, value: v });
      } else if (rr.rrType === 'skill') {
        const v = rrValue * 5;
        level += v;
        breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RR_SKILL', labelParams: `(${rrValue})`, value: v });
      } else if (rr.rrType === 'attribute') {
        const v = rrValue * 10;
        level += v;
        breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.RR_ATTRIBUTE', labelParams: `(${rrValue})`, value: v });
      }
    }
  }

  if (bonusAnarchy > 0) {
    const v = bonusAnarchy * 2;
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ANARCHY_BONUS', labelParams: `(${bonusAnarchy})`, value: v });
  }

  const narrationActions = data.narrationActions || 0;
  if (narrationActions > 0) {
    const v = narrationActions * 3;
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.GRANTS_NARRATION', labelParams: ` (${narrationActions})`, value: v });
  }

  const positiveEffects = narrativeEffects.filter((e: any) => e?.text && e.text.trim() !== '' && !e.isNegative && e.value !== 0 && e.value !== null && e.value !== undefined);
  const negativeEffects = narrativeEffects.filter((e: any) => e?.text && e.text.trim() !== '' && e.isNegative && e.value !== 0 && e.value !== null && e.value !== undefined);
  if (positiveEffects.length > 0) {
    const v = positiveEffects.reduce((s: number, e: any) => s + (e.value || 1), 0);
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_POSITIVE', labelParams: `(${positiveEffects.length})`, value: v });
  }
  if (negativeEffects.length > 0) {
    const v = negativeEffects.reduce((s: number, e: any) => s + (e.value || -1), 0);
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_NEGATIVE', labelParams: `(${negativeEffects.length})`, value: v });
  }

  const sustainedSpellCount = data.sustainedSpellCount || 0;
  if (sustainedSpellCount > 0) {
    const v = sustainedSpellCount * 2;
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SUSTAINED_SPELLS', labelParams: `(${sustainedSpellCount})`, value: v });
  }

  const summonedSpiritCount = data.summonedSpiritCount || 0;
  if (summonedSpiritCount > 0) {
    const v = summonedSpiritCount * 3;
    level += v;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SUMMONED_SPIRITS', labelParams: `(${summonedSpiritCount})`, value: v });
  }

  // Awakened abilities
  const astralPerception = data.astralPerception || false;
  const astralProjection = data.astralProjection || false;
  const sorcery = data.sorcery || false;
  const conjuration = data.conjuration || false;
  const adept = data.adept || false;

  if (astralPerception && !astralProjection) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ASTRAL_PERCEPTION', value: 1 }); }
  if (astralPerception && astralProjection) { level += 2; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ASTRAL_PERCEPTION_PROJECTION', value: 2 }); }
  if (sorcery) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SORCERY', value: 1 }); }
  if (conjuration) { level += 2; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.CONJURATION', value: 2 }); }
  if (adept) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ADEPT', value: 1 }); }

  // Emerged abilities
  const matrixAccess = data.matrixAccess || false;
  const complexFormWeaving = data.complexFormWeaving || false;
  const spriteCompilation = data.spriteCompilation || false;
  const biofeedbackFlag = data.biofeedback || false;

  if (matrixAccess) { level += 7; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.MATRIX_ACCESS', value: 7 }); }
  if (complexFormWeaving) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.COMPLEX_FORM_WEAVING', value: 1 }); }
  if (spriteCompilation) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SPRITE_COMPILATION', value: 1 }); }
  if (biofeedbackFlag) { level -= 2; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.BIOFEEDBACK', value: -2 }); }

  const compiledSpriteCount = data.compiledSpriteCount || 0;
  if (compiledSpriteCount > 0) { const v = compiledSpriteCount * 3; level += v; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.COMPILED_SPRITES', labelParams: ` (${compiledSpriteCount})`, value: v }); }

  const sustainedComplexFormCount = data.sustainedComplexFormCount || 0;
  if (sustainedComplexFormCount > 0) { const v = sustainedComplexFormCount * 2; level += v; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SUSTAINED_COMPLEX_FORMS', labelParams: ` (${sustainedComplexFormCount})`, value: v }); }

  // Vehicle/Drone bonuses
  const autopilotBonus = data.autopilotBonus || 0;
  const speedBonus = data.speedBonus || 0;
  const handlingBonus = data.handlingBonus || 0;
  const armorBonus = data.armorBonus || 0;
  const isFixed = data.isFixed || false;
  const isFlying = data.isFlying || false;
  const weaponMountImprovement = data.weaponMountImprovement || false;
  const autopilotUnlocked = data.autopilotUnlocked || false;
  const additionalDroneCount = data.additionalDroneCount || 0;

  if (autopilotBonus > 0) { level += autopilotBonus; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.AUTOPILOT_BONUS', labelParams: `(+${autopilotBonus})`, value: autopilotBonus }); }
  if (speedBonus > 0) { level += speedBonus; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SPEED_BONUS', labelParams: `(+${speedBonus})`, value: speedBonus }); }
  if (handlingBonus > 0) { level += handlingBonus; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.HANDLING_BONUS', labelParams: `(+${handlingBonus})`, value: handlingBonus }); }
  if (armorBonus > 0) { level += armorBonus; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ARMOR_BONUS', labelParams: `(+${armorBonus})`, value: armorBonus }); }
  if (isFixed) { level -= 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.IS_FIXED', value: -1 }); }
  if (isFlying) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.IS_FLYING', value: 1 }); }
  if (weaponMountImprovement) { level += 1; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.WEAPON_MOUNT_IMPROVEMENT', value: 1 }); }
  if (autopilotUnlocked) { level += 3; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.AUTOPILOT_UNLOCKED', value: 3 }); }
  if (additionalDroneCount > 0) { const v = additionalDroneCount * 2; level += v; breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.ADDITIONAL_DRONES', labelParams: `(${additionalDroneCount})`, value: v }); }

  const shamanicMask = data.shamanicMask || false;
  if (shamanicMask && featType === 'awakened') {
    level -= 1;
    breakdown.push({ labelKey: 'SRA2.FEATS.BREAKDOWN.SHAMANIC_MASK', value: -1 });
  }

  return { level, breakdown };
}

/**
 * Compute the nuyen cost of a feat based on its type, cost category, and rating.
 * Pure function: mirrors FeatDataModel._calculateCost.
 */
export function computeFeatCost(featType: string, data: Record<string, any>): number {
  const costType = data.cost || 'free-equipment';
  const rating = data.rating || 0;

  let calculatedCost = 0;

  // Base cost for equipment and weapon types
  if (featType === 'equipment' || featType === 'weapon') {
    switch (costType) {
      case 'equipment': calculatedCost = 2500; break;
      case 'advanced-equipment': case 'specialized-equipment': calculatedCost = 5000; break;
      case 'free-equipment': case 'feat': default: calculatedCost = 0; break;
    }
  }

  // Connaissance: base cost of 2500
  if (featType === 'connaissance') {
    calculatedCost = 2500;
  }

  // Complex form: fixed cost of 5000 (no rating cost)
  if (featType === 'complex-form') {
    return 5000;
  }

  // Armor: 2500 per armor value (not rating)
  if (featType === 'armor') {
    calculatedCost += (data.armorValue || 0) * 2500;
  }

  calculatedCost += rating * 5000;
  return calculatedCost;
}


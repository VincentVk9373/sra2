const SYSTEM_ID = "sra2";
const SYSTEM$1 = {
  id: SYSTEM_ID,
  LOG: {
    HEAD: `${SYSTEM_ID} | `
  },
  SOCKET: `system.${SYSTEM_ID}`,
  PATH: {
    ROOT: `systems/${SYSTEM_ID}`,
    STYLE: `systems/${SYSTEM_ID}/style`,
    TEMPLATES: `systems/${SYSTEM_ID}/templates`,
    ASSETS: `systems/${SYSTEM_ID}/assets`
  }
};
class CharacterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      attributes: new fields.SchemaField({
        strength: new fields.NumberField({
          required: true,
          initial: 1,
          min: 1,
          integer: true
        }),
        agility: new fields.NumberField({
          required: true,
          initial: 1,
          min: 1,
          integer: true
        }),
        willpower: new fields.NumberField({
          required: true,
          initial: 1,
          min: 1,
          integer: true
        }),
        logic: new fields.NumberField({
          required: true,
          initial: 1,
          min: 1,
          integer: true
        }),
        charisma: new fields.NumberField({
          required: true,
          initial: 1,
          min: 1,
          integer: true
        })
      }),
      resources: new fields.SchemaField({
        yens: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          integer: true
        }),
        anarchy: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          integer: true
        })
      }),
      maxEssence: new fields.NumberField({
        required: true,
        initial: 6,
        min: 0,
        integer: true
      }),
      armorLevel: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 5,
        integer: true
      }),
      damage: new fields.SchemaField({
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
      }),
      anarchySpent: new fields.ArrayField(new fields.BooleanField({
        required: true,
        initial: false
      }), {
        required: true,
        initial: [false, false, false]
      }),
      bio: new fields.SchemaField({
        background: new fields.HTMLField({
          required: true,
          initial: ""
        }),
        notes: new fields.HTMLField({
          required: true,
          initial: ""
        })
      }),
      keywords: new fields.SchemaField({
        keyword1: new fields.StringField({
          required: true,
          initial: ""
        }),
        keyword2: new fields.StringField({
          required: true,
          initial: ""
        }),
        keyword3: new fields.StringField({
          required: true,
          initial: ""
        }),
        keyword4: new fields.StringField({
          required: true,
          initial: ""
        }),
        keyword5: new fields.StringField({
          required: true,
          initial: ""
        })
      }),
      behaviors: new fields.SchemaField({
        behavior1: new fields.StringField({
          required: true,
          initial: ""
        }),
        behavior2: new fields.StringField({
          required: true,
          initial: ""
        }),
        behavior3: new fields.StringField({
          required: true,
          initial: ""
        }),
        behavior4: new fields.StringField({
          required: true,
          initial: ""
        })
      }),
      catchphrases: new fields.SchemaField({
        catchphrase1: new fields.StringField({
          required: true,
          initial: ""
        }),
        catchphrase2: new fields.StringField({
          required: true,
          initial: ""
        }),
        catchphrase3: new fields.StringField({
          required: true,
          initial: ""
        }),
        catchphrase4: new fields.StringField({
          required: true,
          initial: ""
        })
      })
    };
  }
  /**
   * Calculate the cost of an attribute based on its level
   * Each level costs 10000, except the last level (maximum) which costs 20000
   */
  calculateAttributeCost(level, maxLevel) {
    let cost = 0;
    for (let i = 1; i <= level; i++) {
      if (i === maxLevel) {
        cost += 2e4;
      } else {
        cost += 1e4;
      }
    }
    return cost;
  }
  prepareDerivedData() {
    const parent = this.parent;
    let attributeMaxes = {
      strength: 99,
      agility: 99,
      willpower: 99,
      logic: 99,
      charisma: 99
    };
    let anarchyBonus = 0;
    if (parent && parent.items) {
      const metatype = parent.items.find((item) => item.type === "metatype");
      if (metatype && metatype.system) {
        attributeMaxes = {
          strength: metatype.system.maxStrength || 99,
          agility: metatype.system.maxAgility || 99,
          willpower: metatype.system.maxWillpower || 99,
          logic: metatype.system.maxLogic || 99,
          charisma: metatype.system.maxCharisma || 99
        };
        anarchyBonus = metatype.system.anarchyBonus || 0;
      }
    }
    this.attributeMaxes = attributeMaxes;
    let bonusLightDamage = 0;
    let bonusSevereDamage = 0;
    let bonusPhysicalThreshold = 0;
    let bonusMentalThreshold = 0;
    let bonusAnarchy = 0;
    let totalEssenceCost = 0;
    let totalNarrations = 0;
    const narrationsDetails = [];
    if (parent && parent.items) {
      const activeFeats = parent.items.filter(
        (item) => item.type === "feat" && item.system.active === true
      );
      activeFeats.forEach((feat) => {
        bonusLightDamage += feat.system.bonusLightDamage || 0;
        bonusSevereDamage += feat.system.bonusSevereDamage || 0;
        bonusPhysicalThreshold += feat.system.bonusPhysicalThreshold || 0;
        bonusMentalThreshold += feat.system.bonusMentalThreshold || 0;
        bonusAnarchy += feat.system.bonusAnarchy || 0;
        totalEssenceCost += feat.system.essenceCost || 0;
        if (feat.system.grantsNarration) {
          totalNarrations++;
          narrationsDetails.push({
            name: feat.name,
            actions: feat.system.narrationActions || 1
          });
        }
      });
    }
    this.totalAnarchy = 3 + anarchyBonus + bonusAnarchy;
    this.anarchyBonus = anarchyBonus;
    this.featsAnarchyBonus = bonusAnarchy;
    this.totalNarrations = 1 + totalNarrations;
    this.bonusNarrations = totalNarrations;
    this.narrationsDetails = narrationsDetails;
    const totalLightBoxes = 2 + bonusLightDamage;
    const totalSevereBoxes = 1 + bonusSevereDamage;
    const damage = this.damage || {};
    if (!Array.isArray(damage.light)) {
      damage.light = [false, false];
    }
    while (damage.light.length < totalLightBoxes) {
      damage.light.push(false);
    }
    while (damage.light.length > totalLightBoxes) {
      damage.light.pop();
    }
    if (!Array.isArray(damage.severe)) {
      damage.severe = [false];
    }
    while (damage.severe.length < totalSevereBoxes) {
      damage.severe.push(false);
    }
    while (damage.severe.length > totalSevereBoxes) {
      damage.severe.pop();
    }
    this.totalLightBoxes = totalLightBoxes;
    this.totalSevereBoxes = totalSevereBoxes;
    const totalAnarchy = 3 + anarchyBonus + bonusAnarchy;
    const anarchySpent = this.anarchySpent || [];
    if (!Array.isArray(anarchySpent)) {
      this.anarchySpent = [];
    }
    while (this.anarchySpent.length < totalAnarchy) {
      this.anarchySpent.push(false);
    }
    while (this.anarchySpent.length > totalAnarchy) {
      this.anarchySpent.pop();
    }
    const armorLevel = this.armorLevel || 0;
    this.armorCost = armorLevel * 2500;
    const strength = this.attributes?.strength || 1;
    const willpower = this.attributes?.willpower || 1;
    this.damageThresholds = {
      withoutArmor: {
        light: strength + bonusPhysicalThreshold,
        moderate: strength + bonusPhysicalThreshold + 3,
        severe: strength + bonusPhysicalThreshold + 6
      },
      withArmor: {
        light: strength + armorLevel + bonusPhysicalThreshold,
        moderate: strength + armorLevel + bonusPhysicalThreshold + 3,
        severe: strength + armorLevel + bonusPhysicalThreshold + 6
      },
      mental: {
        light: willpower + bonusMentalThreshold,
        moderate: willpower + bonusMentalThreshold + 3,
        severe: willpower + bonusMentalThreshold + 6
      }
    };
    const maxEssence = this.maxEssence || 6;
    this.currentEssence = Math.max(0, maxEssence - totalEssenceCost);
    const attributes = this.attributes;
    if (attributes) {
      attributes.strength = Math.min(attributes.strength || 1, attributeMaxes.strength);
      attributes.agility = Math.min(attributes.agility || 1, attributeMaxes.agility);
      attributes.willpower = Math.min(attributes.willpower || 1, attributeMaxes.willpower);
      attributes.logic = Math.min(attributes.logic || 1, attributeMaxes.logic);
      attributes.charisma = Math.min(attributes.charisma || 1, attributeMaxes.charisma);
      this.attributeCosts = {
        strength: this.calculateAttributeCost(attributes.strength || 1, attributeMaxes.strength),
        agility: this.calculateAttributeCost(attributes.agility || 1, attributeMaxes.agility),
        willpower: this.calculateAttributeCost(attributes.willpower || 1, attributeMaxes.willpower),
        logic: this.calculateAttributeCost(attributes.logic || 1, attributeMaxes.logic),
        charisma: this.calculateAttributeCost(attributes.charisma || 1, attributeMaxes.charisma)
      };
      const attributeCosts = this.attributeCosts;
      let totalCost = Object.values(attributeCosts).reduce((sum, cost) => sum + cost, 0);
      totalCost += this.armorCost || 0;
      if (parent && parent.items) {
        parent.items.forEach((item) => {
          if (item.system && item.system.calculatedCost !== void 0) {
            totalCost += item.system.calculatedCost;
          }
        });
      }
      this.totalCost = totalCost;
    }
  }
}
class SkillDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      rating: new fields.NumberField({
        required: true,
        initial: 1,
        min: 0,
        max: 8,
        integer: true,
        label: "SRA2.SKILLS.RATING"
      }),
      linkedAttribute: new fields.StringField({
        required: true,
        initial: "strength",
        choices: {
          strength: "SRA2.ATTRIBUTES.STRENGTH",
          agility: "SRA2.ATTRIBUTES.AGILITY",
          willpower: "SRA2.ATTRIBUTES.WILLPOWER",
          logic: "SRA2.ATTRIBUTES.LOGIC",
          charisma: "SRA2.ATTRIBUTES.CHARISMA"
        },
        label: "SRA2.SKILLS.LINKED_ATTRIBUTE"
      }),
      description: new fields.HTMLField({
        required: true,
        initial: ""
      }),
      bookmarked: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.SKILLS.BOOKMARKED"
      })
    };
  }
  prepareDerivedData() {
    const rating = this.rating || 0;
    let calculatedCost = 0;
    if (rating <= 5) {
      calculatedCost = rating * 2500;
    } else {
      calculatedCost = 5 * 2500 + (rating - 5) * 5e3;
    }
    this.calculatedCost = calculatedCost;
  }
}
const WEAPON_TYPES = {
  "custom-weapon": {
    vd: "0",
    melee: "none",
    short: "none",
    medium: "none",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Combat rapproché - Mains nues
  "bare-hands": {
    vd: "FOR",
    melee: "ok",
    short: "none",
    medium: "none",
    long: "none",
    linkedSkill: "Combat rapproché",
    linkedSpecialization: "Spé : Mains nues",
    linkedDefenseSkill: "Combat rapproché",
    linkedDefenseSpecialization: "Spé : Défense"
  },
  // Combat rapproché - Lames
  "short-weapons": {
    vd: "FOR+1",
    melee: "ok",
    short: "none",
    medium: "none",
    long: "none",
    linkedSkill: "Combat rapproché",
    linkedSpecialization: "Spé : Lames",
    linkedDefenseSkill: "Combat rapproché",
    linkedDefenseSpecialization: "Spé : Défense"
  },
  "long-weapons": {
    vd: "FOR+2",
    melee: "ok",
    short: "none",
    medium: "none",
    long: "none",
    linkedSkill: "Combat rapproché",
    linkedSpecialization: "Spé : Lames",
    linkedDefenseSkill: "Combat rapproché",
    linkedDefenseSpecialization: "Spé : Défense"
  },
  // Combat rapproché - Armes contondantes
  "advanced-melee": {
    vd: 5,
    melee: "ok",
    short: "none",
    medium: "none",
    long: "none",
    linkedSkill: "Combat rapproché",
    linkedSpecialization: "Spé : Armes contondantes",
    linkedDefenseSkill: "Combat rapproché",
    linkedDefenseSpecialization: "Spé : Défense"
  },
  "tasers": {
    vd: 5,
    melee: "ok",
    short: "ok",
    medium: "none",
    long: "none",
    linkedSkill: "Combat rapproché",
    linkedSpecialization: "Spé : Armes contondantes",
    linkedDefenseSkill: "Combat rapproché",
    linkedDefenseSpecialization: "Spé : Défense"
  },
  // Armes à distance - Armes de jet
  "throwing": {
    vd: "FOR+1",
    melee: "ok",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Armes de jet",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "grenades": {
    vd: 7,
    melee: "ok",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Armes de jet",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "gas-grenades": {
    vd: "toxin",
    melee: "ok",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Armes de jet",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Armes de trait
  "bows": {
    vd: "FOR+1",
    melee: "ok",
    short: "ok",
    medium: "ok",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Armes de trait",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "crossbows": {
    vd: 4,
    melee: "ok",
    short: "ok",
    medium: "ok",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Armes de trait",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Pistolets
  "pocket-pistols": {
    vd: 3,
    melee: "ok",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "light-pistols": {
    vd: 4,
    melee: "ok",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "automatic-pistols": {
    vd: 4,
    melee: "ok",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "heavy-pistols": {
    vd: 5,
    melee: "ok",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Pistolets",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Mitraillettes
  "smgs": {
    vd: 5,
    melee: "disadvantage",
    short: "ok",
    medium: "ok",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Mitraillettes",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Fusils
  "assault-rifles": {
    vd: 7,
    melee: "disadvantage",
    short: "ok",
    medium: "ok",
    long: "disadvantage",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Fusils",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "shotguns": {
    vd: 8,
    melee: "disadvantage",
    short: "ok",
    medium: "disadvantage",
    long: "none",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Fusils",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "sniper-rifles": {
    vd: 10,
    melee: "none",
    short: "disadvantage",
    medium: "disadvantage",
    long: "ok",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Fusils",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Lance-grenades
  "grenade-launchers": {
    vd: 7,
    melee: "none",
    short: "disadvantage",
    medium: "ok",
    long: "disadvantage",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Lance-grenades",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  // Armes à distance - Armes lourdes
  "machine-guns": {
    vd: 9,
    melee: "none",
    short: "ok",
    medium: "ok",
    long: "ok",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Armes lourdes",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  },
  "rocket-launchers": {
    vd: 12,
    melee: "none",
    short: "none",
    medium: "disadvantage",
    long: "ok",
    linkedSkill: "Armes à distance",
    linkedSpecialization: "Spé : Armes lourdes",
    linkedDefenseSkill: "Athlétisme",
    linkedDefenseSpecialization: "Spé : Défense à distance"
  }
};
const VEHICLE_TYPES = {
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
};
class FeatDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.HTMLField({
        required: true,
        initial: ""
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
  prepareDerivedData() {
    const costType = this.cost || "free-equipment";
    const featType = this.featType || "equipment";
    const rating = this.rating || 0;
    let calculatedCost = 0;
    if (featType === "equipment" || featType === "weapon" || featType === "weapons-spells") {
      switch (costType) {
        case "free-equipment":
          calculatedCost = 0;
          break;
        case "equipment":
          calculatedCost = 2500;
          break;
        case "advanced-equipment":
          calculatedCost = 5e3;
          break;
        // Legacy values (kept for migration compatibility)
        case "specialized-equipment":
          calculatedCost = 5e3;
          break;
        case "feat":
          calculatedCost = 0;
          break;
        default:
          calculatedCost = 0;
      }
    }
    calculatedCost += rating * 5e3;
    this.calculatedCost = calculatedCost;
    let recommendedLevel = 0;
    const recommendedLevelBreakdown = [];
    const bonusLightDamage = this.bonusLightDamage || 0;
    const bonusSevereDamage = this.bonusSevereDamage || 0;
    const bonusPhysicalThreshold = this.bonusPhysicalThreshold || 0;
    const bonusMentalThreshold = this.bonusMentalThreshold || 0;
    const firewall = this.firewall || 0;
    const attack = this.attack || 0;
    const riggerConsoleCount = this.riggerConsoleCount || 0;
    const hasVehicleControlWiring = this.hasVehicleControlWiring || false;
    const isWeaponFocus = this.isWeaponFocus || false;
    const bonusAnarchy = this.bonusAnarchy || 0;
    const grantsNarration = this.grantsNarration || false;
    const narrativeEffects = this.narrativeEffects || [];
    const rrList = this.rrList || [];
    const isFirstFeat = this.isFirstFeat || false;
    if (featType === "trait" && !isFirstFeat) {
      recommendedLevel += 3;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.BASE_FEAT_COST", value: 3 });
    }
    if (featType === "cyberware") {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.CYBERWARE", value: 1 });
    }
    if (featType === "adept-power") {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.ADEPT_POWER", value: 1 });
    }
    if (featType === "spell") {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.SPELL", value: 1 });
    }
    if (featType === "vehicle") {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.VEHICLE", value: 1 });
    }
    if (bonusLightDamage > 0) {
      const value = bonusLightDamage * 3;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.LIGHT_WOUNDS", labelParams: `(${bonusLightDamage})`, value });
    }
    if (bonusSevereDamage > 0) {
      const value = bonusSevereDamage * 6;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.SEVERE_WOUNDS", labelParams: `(${bonusSevereDamage})`, value });
    }
    if (bonusPhysicalThreshold !== 0) {
      const value = Math.abs(bonusPhysicalThreshold);
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.PHYSICAL_THRESHOLD", labelParams: `(${bonusPhysicalThreshold > 0 ? "+" : ""}${bonusPhysicalThreshold})`, value });
    }
    if (bonusMentalThreshold !== 0) {
      const value = Math.abs(bonusMentalThreshold);
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.MENTAL_THRESHOLD", labelParams: `(${bonusMentalThreshold > 0 ? "+" : ""}${bonusMentalThreshold})`, value });
    }
    if (featType === "cyberdeck" && firewall > 0) {
      recommendedLevel += firewall;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.FIREWALL", labelParams: `(${firewall})`, value: firewall });
    }
    if (attack > 0) {
      recommendedLevel += attack;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.ATTACK", labelParams: `(${attack})`, value: attack });
    }
    if (riggerConsoleCount > 0) {
      recommendedLevel += riggerConsoleCount;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.RIGGER_CONSOLE", labelParams: `(${riggerConsoleCount})`, value: riggerConsoleCount });
    }
    if (hasVehicleControlWiring) {
      recommendedLevel += 2;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.VEHICLE_WIRING", value: 2 });
    }
    if (isWeaponFocus) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.WEAPON_FOCUS", value: 1 });
    }
    const damageValueBonus = this.damageValueBonus || 0;
    if (damageValueBonus > 0) {
      recommendedLevel += damageValueBonus;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.DAMAGE_VALUE_BONUS", labelParams: `(+${damageValueBonus})`, value: damageValueBonus });
    }
    const rangeImprovements = this.rangeImprovements || {};
    let rangeImprovementCount = 0;
    if (rangeImprovements.melee) rangeImprovementCount++;
    if (rangeImprovements.short) rangeImprovementCount++;
    if (rangeImprovements.medium) rangeImprovementCount++;
    if (rangeImprovements.long) rangeImprovementCount++;
    if (rangeImprovementCount > 0) {
      const value = rangeImprovementCount * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.RANGE_IMPROVEMENTS", labelParams: `(${rangeImprovementCount})`, value });
    }
    for (const rr of rrList) {
      const rrType = rr.rrType;
      const rrValue = rr.rrValue || 0;
      if (rrValue > 0) {
        if (rrType === "specialization") {
          const value = rrValue * 2;
          recommendedLevel += value;
          recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.RR_SPECIALIZATION", labelParams: `(${rrValue})`, value });
        } else if (rrType === "skill") {
          const value = rrValue * 5;
          recommendedLevel += value;
          recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.RR_SKILL", labelParams: `(${rrValue})`, value });
        } else if (rrType === "attribute") {
          const value = rrValue * 10;
          recommendedLevel += value;
          recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.RR_ATTRIBUTE", labelParams: `(${rrValue})`, value });
        }
      }
    }
    if (bonusAnarchy > 0) {
      const value = bonusAnarchy * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.ANARCHY_BONUS", labelParams: `(${bonusAnarchy})`, value });
    }
    if (grantsNarration) {
      recommendedLevel += 3;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.GRANTS_NARRATION", value: 3 });
    }
    const positiveEffectsCount = narrativeEffects.filter((effect) => effect?.text && effect.text.trim() !== "" && !effect.isNegative).length;
    const negativeEffects = narrativeEffects.filter((effect) => effect?.text && effect.text.trim() !== "" && effect.isNegative);
    if (positiveEffectsCount > 0) {
      recommendedLevel += positiveEffectsCount;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_POSITIVE", labelParams: `(${positiveEffectsCount})`, value: positiveEffectsCount });
    }
    if (negativeEffects.length > 0) {
      const negativeEffectValue = negativeEffects.reduce((sum, effect) => sum + (effect.value || -1), 0);
      recommendedLevel += negativeEffectValue;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.NARRATIVE_EFFECTS_NEGATIVE", labelParams: `(${negativeEffects.length})`, value: negativeEffectValue });
    }
    const sustainedSpellCount = this.sustainedSpellCount || 0;
    if (sustainedSpellCount > 0) {
      const value = sustainedSpellCount * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.SUSTAINED_SPELLS", labelParams: `(${sustainedSpellCount})`, value });
    }
    const summonedSpiritCount = this.summonedSpiritCount || 0;
    if (summonedSpiritCount > 0) {
      const value = summonedSpiritCount * 3;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.SUMMONED_SPIRITS", labelParams: `(${summonedSpiritCount})`, value });
    }
    const astralPerception = this.astralPerception || false;
    const astralProjection = this.astralProjection || false;
    const sorcery = this.sorcery || false;
    const conjuration = this.conjuration || false;
    const adept = this.adept || false;
    if (astralPerception && astralProjection) {
      recommendedLevel += 2;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.ASTRAL_PERCEPTION_PROJECTION", value: 2 });
    }
    if (sorcery) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.SORCERY", value: 1 });
    }
    if (conjuration) {
      recommendedLevel += 2;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.CONJURATION", value: 2 });
    }
    if (adept) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.ADEPT", value: 1 });
    }
    const autopilotBonus = this.autopilotBonus || 0;
    const speedBonus = this.speedBonus || 0;
    const handlingBonus = this.handlingBonus || 0;
    const armorBonus = this.armorBonus || 0;
    const isFixed = this.isFixed || false;
    const isFlying = this.isFlying || false;
    const weaponMountImprovement = this.weaponMountImprovement || false;
    const autopilotUnlocked = this.autopilotUnlocked || false;
    const additionalDroneCount = this.additionalDroneCount || 0;
    if (autopilotBonus > 0) {
      recommendedLevel += autopilotBonus;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.AUTOPILOT_BONUS", labelParams: `(+${autopilotBonus})`, value: autopilotBonus });
    }
    if (speedBonus > 0) {
      recommendedLevel += speedBonus;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.SPEED_BONUS", labelParams: `(+${speedBonus})`, value: speedBonus });
    }
    if (handlingBonus > 0) {
      recommendedLevel += handlingBonus;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.HANDLING_BONUS", labelParams: `(+${handlingBonus})`, value: handlingBonus });
    }
    if (armorBonus > 0) {
      recommendedLevel += armorBonus;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.ARMOR_BONUS", labelParams: `(+${armorBonus})`, value: armorBonus });
    }
    if (isFixed) {
      recommendedLevel -= 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.IS_FIXED", value: -1 });
    }
    if (isFlying) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.IS_FLYING", value: 1 });
    }
    if (weaponMountImprovement) {
      recommendedLevel += 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.WEAPON_MOUNT_IMPROVEMENT", value: 1 });
    }
    if (autopilotUnlocked) {
      recommendedLevel += 3;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.AUTOPILOT_UNLOCKED", value: 3 });
    }
    if (additionalDroneCount > 0) {
      const value = additionalDroneCount * 2;
      recommendedLevel += value;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.ADDITIONAL_DRONES", labelParams: `(${additionalDroneCount})`, value });
    }
    const shamanicMask = this.shamanicMask || false;
    if (shamanicMask && featType === "awakened") {
      recommendedLevel -= 1;
      recommendedLevelBreakdown.push({ labelKey: "SRA2.FEATS.BREAKDOWN.SHAMANIC_MASK", value: -1 });
    }
    this.recommendedLevel = recommendedLevel;
    this.recommendedLevelBreakdown = recommendedLevelBreakdown;
  }
}
class SpecializationDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      linkedSkill: new fields.StringField({
        required: true,
        initial: "",
        label: "SRA2.SPECIALIZATIONS.LINKED_SKILL"
      }),
      linkedAttribute: new fields.StringField({
        required: true,
        initial: "strength",
        choices: {
          strength: "SRA2.ATTRIBUTES.STRENGTH",
          agility: "SRA2.ATTRIBUTES.AGILITY",
          willpower: "SRA2.ATTRIBUTES.WILLPOWER",
          logic: "SRA2.ATTRIBUTES.LOGIC",
          charisma: "SRA2.ATTRIBUTES.CHARISMA"
        },
        label: "SRA2.SPECIALIZATIONS.LINKED_ATTRIBUTE"
      }),
      description: new fields.HTMLField({
        required: true,
        initial: ""
      })
    };
  }
  prepareDerivedData() {
    this.calculatedCost = 2500;
  }
}
class MetatypeDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.HTMLField({
        required: true,
        initial: ""
      }),
      maxStrength: new fields.NumberField({
        required: true,
        initial: 4,
        min: 1,
        max: 10,
        integer: true,
        label: "SRA2.METATYPES.MAX_STRENGTH"
      }),
      maxAgility: new fields.NumberField({
        required: true,
        initial: 4,
        min: 1,
        max: 10,
        integer: true,
        label: "SRA2.METATYPES.MAX_AGILITY"
      }),
      maxWillpower: new fields.NumberField({
        required: true,
        initial: 4,
        min: 1,
        max: 10,
        integer: true,
        label: "SRA2.METATYPES.MAX_WILLPOWER"
      }),
      maxLogic: new fields.NumberField({
        required: true,
        initial: 4,
        min: 1,
        max: 10,
        integer: true,
        label: "SRA2.METATYPES.MAX_LOGIC"
      }),
      maxCharisma: new fields.NumberField({
        required: true,
        initial: 4,
        min: 1,
        max: 10,
        integer: true,
        label: "SRA2.METATYPES.MAX_CHARISMA"
      }),
      anarchyBonus: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 10,
        integer: true,
        label: "SRA2.METATYPES.ANARCHY_BONUS"
      })
    };
  }
  prepareDerivedData() {
  }
}
const models = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CharacterDataModel,
  FeatDataModel,
  MetatypeDataModel,
  SkillDataModel,
  SpecializationDataModel
}, Symbol.toStringTag, { value: "Module" }));
class SRA2Actor extends Actor {
  get feats() {
    return this.items.filter((item) => item.type === "feat");
  }
}
const documents = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SRA2Actor
}, Symbol.toStringTag, { value: "Module" }));
function handleRollRequest(data) {
  console.log("=== ROLL REQUEST ===", {
    itemType: data.itemType,
    weaponType: data.weaponType,
    linkedAttackSkill: data.linkedAttackSkill,
    linkedAttackSpecialization: data.linkedAttackSpecialization,
    linkedDefenseSkill: data.linkedDefenseSkill,
    linkedDefenseSpecialization: data.linkedDefenseSpecialization,
    linkedAttribute: data.linkedAttribute,
    isWeaponFocus: data.isWeaponFocus,
    damageValue: data.damageValue,
    damageValueBonus: data.damageValueBonus,
    meleeRange: data.meleeRange,
    shortRange: data.shortRange,
    mediumRange: data.mediumRange,
    longRange: data.longRange,
    skillName: data.skillName,
    specName: data.specName,
    itemName: data.itemName,
    itemId: data.itemId,
    threshold: data.threshold,
    actorId: data.actorId,
    actorUuid: data.actorUuid,
    actorName: data.actorName,
    specLevel: data.specLevel,
    skillLevel: data.skillLevel,
    itemRating: data.itemRating,
    itemActive: data.itemActive,
    rrList: data.rrList
  });
}
function normalizeSearchText(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function searchItemsInWorld(itemType, searchTerm, existingItemsCheck) {
  const results = [];
  if (!game.items) return results;
  for (const item of game.items) {
    if (item.type === itemType && normalizeSearchText(item.name).includes(searchTerm)) {
      const alreadyExists = existingItemsCheck ? existingItemsCheck(item.name) : false;
      results.push({
        name: item.name,
        uuid: item.uuid,
        id: item.id,
        source: game.i18n.localize("SRA2.SKILLS.WORLD_ITEMS"),
        type: itemType,
        alreadyExists
      });
    }
  }
  return results;
}
async function searchItemsInCompendiums(itemType, searchTerm, existingItemsCheck) {
  const results = [];
  const seenNames = /* @__PURE__ */ new Set();
  for (const pack of game.packs) {
    if (pack.documentName !== "Item") continue;
    const documents2 = await pack.getDocuments();
    for (const doc of documents2) {
      if (doc.type === itemType && normalizeSearchText(doc.name).includes(searchTerm)) {
        if (seenNames.has(doc.name)) continue;
        seenNames.add(doc.name);
        const alreadyExists = existingItemsCheck ? existingItemsCheck(doc.name) : false;
        results.push({
          name: doc.name,
          uuid: doc.uuid,
          source: pack.title,
          type: itemType,
          alreadyExists
        });
      }
    }
  }
  return results;
}
async function searchItemsEverywhere(itemType, searchTerm, actor, existingItemsCheck) {
  const results = [];
  const seenNames = /* @__PURE__ */ new Set();
  const worldResults = searchItemsInWorld(itemType, searchTerm, existingItemsCheck);
  worldResults.forEach((result) => {
    if (!seenNames.has(result.name)) {
      results.push(result);
      seenNames.add(result.name);
    }
  });
  const compendiumResults = await searchItemsInCompendiums(itemType, searchTerm, existingItemsCheck);
  compendiumResults.forEach((result) => {
    if (!seenNames.has(result.name)) {
      results.push(result);
      seenNames.add(result.name);
    }
  });
  return results;
}
function itemExistsOnActor(actor, itemType, itemName) {
  if (!actor) return false;
  return actor.items.some(
    (item) => item.type === itemType && item.name === itemName
  );
}
function handleSheetUpdate(actor, formData) {
  const expandedData = foundry.utils.expandObject(formData);
  if (expandedData.system) {
    const currentDamage = actor.system.damage || {};
    if (!expandedData.system.damage) {
      expandedData.system.damage = {};
    }
    if (currentDamage.light && !expandedData.system.damage.light) {
      expandedData.system.damage.light = currentDamage.light.map(() => false);
    } else if (expandedData.system.damage.light && currentDamage.light) {
      for (let i = 0; i < currentDamage.light.length; i++) {
        if (expandedData.system.damage.light[i] === void 0) {
          expandedData.system.damage.light[i] = false;
        }
      }
    }
    if (currentDamage.severe && !expandedData.system.damage.severe) {
      expandedData.system.damage.severe = currentDamage.severe.map(() => false);
    } else if (expandedData.system.damage.severe && currentDamage.severe) {
      for (let i = 0; i < currentDamage.severe.length; i++) {
        if (expandedData.system.damage.severe[i] === void 0) {
          expandedData.system.damage.severe[i] = false;
        }
      }
    }
    if (expandedData.system.damage.incapacitating === void 0) {
      expandedData.system.damage.incapacitating = false;
    }
  }
  return expandedData;
}
function calculateFinalDamageValue(damageValue, damageValueBonus, strength) {
  if (damageValue === "FOR") {
    const total = strength + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (FOR+${damageValueBonus})` : `${total} (FOR)`;
  } else if (damageValue.startsWith("FOR+")) {
    const modifier = parseInt(damageValue.substring(4)) || 0;
    const total = strength + modifier + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (FOR+${modifier}+${damageValueBonus})` : `${total} (FOR+${modifier})`;
  } else if (damageValue === "toxin") {
    return "selon toxine";
  } else {
    const base = parseInt(damageValue) || 0;
    const total = base + damageValueBonus;
    return damageValueBonus > 0 ? `${total} (${base}+${damageValueBonus})` : total.toString();
  }
}
function organizeSpecializationsBySkill(allSpecializations, actorItems) {
  const specializationsBySkill = /* @__PURE__ */ new Map();
  const unlinkedSpecializations = [];
  allSpecializations.forEach((spec) => {
    const linkedSkillName = spec.system.linkedSkill;
    if (linkedSkillName) {
      const linkedSkill = actorItems.find(
        (i) => i.type === "skill" && i.name === linkedSkillName
      );
      if (linkedSkill && linkedSkill.id) {
        const skillId = linkedSkill.id;
        if (!specializationsBySkill.has(skillId)) {
          specializationsBySkill.set(skillId, []);
        }
        specializationsBySkill.get(skillId).push(spec);
      } else {
        unlinkedSpecializations.push(spec);
      }
    } else {
      unlinkedSpecializations.push(spec);
    }
  });
  return { bySkill: specializationsBySkill, unlinked: unlinkedSpecializations };
}
async function handleItemDrop(event, actor, allowedTypes = ["feat", "skill", "specialization", "metatype"]) {
  const data = TextEditor.getDragEventData(event);
  if (data && data.type === "Item") {
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;
    if (item.actor && item.actor.id === actor.id) {
      return false;
    }
    if (!allowedTypes.includes(item.type)) {
      return false;
    }
    if (item.type === "metatype") {
      const existingMetatype = actor.items.find((i) => i.type === "metatype");
      if (existingMetatype) {
        ui.notifications?.warn(game.i18n.localize("SRA2.METATYPES.ONLY_ONE_METATYPE"));
        return false;
      }
      await actor.createEmbeddedDocuments("Item", [item.toObject()]);
      return true;
    }
    if (item.type === "feat") {
      const existingFeat = actor.items.find(
        (i) => i.type === "feat" && i.name === item.name
      );
      if (existingFeat) {
        ui.notifications?.warn(game.i18n.format("SRA2.FEATS.ALREADY_EXISTS", { name: item.name }));
        return false;
      }
      await actor.createEmbeddedDocuments("Item", [item.toObject()]);
      return true;
    }
    if (item.type === "skill") {
      const existingSkill = actor.items.find(
        (i) => i.type === "skill" && i.name === item.name
      );
      if (existingSkill) {
        ui.notifications?.warn(game.i18n.format("SRA2.SKILLS.ALREADY_EXISTS", { name: item.name }));
        return false;
      }
      await actor.createEmbeddedDocuments("Item", [item.toObject()]);
      return true;
    }
    if (item.type === "specialization") {
      const existingSpec = actor.items.find(
        (i) => i.type === "specialization" && i.name === item.name
      );
      if (existingSpec) {
        ui.notifications?.warn(game.i18n.format("SRA2.SPECIALIZATIONS.ALREADY_EXISTS", { name: item.name }));
        return false;
      }
      await actor.createEmbeddedDocuments("Item", [item.toObject()]);
      return true;
    }
  }
  return false;
}
function getRRSources(actor, itemType, itemName) {
  const sources = [];
  const feats = actor.items.filter(
    (item) => item.type === "feat" && item.system.active === true
  );
  for (const feat of feats) {
    const featSystem = feat.system;
    const rrList = featSystem.rrList || [];
    for (const rrEntry of rrList) {
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || "";
      if (rrType === itemType && rrTarget === itemName && rrValue > 0) {
        sources.push({
          featName: feat.name,
          rrValue
        });
      }
    }
  }
  return sources;
}
function calculateRR(actor, itemType, itemName) {
  const sources = getRRSources(actor, itemType, itemName);
  return sources.reduce((total, source) => total + source.rrValue, 0);
}
async function handleEditItem(event, actor) {
  event.preventDefault();
  const element = event.currentTarget;
  const itemId = element.dataset.itemId || element.closest(".metatype-item")?.getAttribute("data-item-id");
  if (!itemId) return;
  const item = actor.items.get(itemId);
  if (item) {
    item.sheet?.render(true);
  }
}
async function handleDeleteItem(event, actor, sheetRender) {
  event.preventDefault();
  const element = event.currentTarget;
  const itemId = element.dataset.itemId || element.closest(".metatype-item")?.getAttribute("data-item-id");
  if (!itemId) return;
  const item = actor.items.get(itemId);
  if (item) {
    await item.delete();
    if (sheetRender) {
      sheetRender(false);
    }
  }
}
function enrichFeats(feats, actorStrength, calculateFinalDamageValueFn) {
  return feats.map((feat) => {
    feat.rrEntries = [];
    const rrList = feat.system.rrList || [];
    for (let i = 0; i < rrList.length; i++) {
      const rrEntry = rrList[i];
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || "";
      const entry = { rrType, rrValue, rrTarget };
      if (rrType === "attribute" && rrTarget) {
        entry.rrTargetLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${rrTarget.toUpperCase()}`);
      }
      feat.rrEntries.push(entry);
    }
    if (feat.system.featType === "weapon" || feat.system.featType === "spell" || feat.system.featType === "weapons-spells") {
      const damageValue = feat.system.damageValue || "0";
      const damageValueBonus = feat.system.damageValueBonus || 0;
      feat.finalDamageValue = calculateFinalDamageValueFn(damageValue, damageValueBonus, actorStrength);
    }
    return feat;
  });
}
class CharacterSheet extends ActorSheet {
  /** Active section for tabbed navigation */
  _activeSection = "identity";
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "actor", "character"],
      template: "systems/sra2/templates/actor-character-sheet.hbs",
      width: 900,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: ".metatype-item", dropSelector: null },
        { dragSelector: ".feat-item", dropSelector: null },
        { dragSelector: ".skill-item", dropSelector: null },
        { dragSelector: ".specialization-item", dropSelector: null }
      ],
      submitOnChange: true
    });
  }
  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    const metatypes = this.actor.items.filter((item) => item.type === "metatype");
    context.metatype = metatypes.length > 0 ? metatypes[0] : null;
    const actorStrength = this.actor.system.attributes?.strength || 0;
    const rawFeats = this.actor.items.filter((item) => item.type === "feat");
    const allFeats = enrichFeats(rawFeats, actorStrength, calculateFinalDamageValue);
    context.featsByType = {
      trait: allFeats.filter((feat) => feat.system.featType === "trait"),
      contact: allFeats.filter((feat) => feat.system.featType === "contact"),
      awakened: allFeats.filter((feat) => feat.system.featType === "awakened"),
      adeptPower: allFeats.filter((feat) => feat.system.featType === "adept-power"),
      equipment: allFeats.filter((feat) => feat.system.featType === "equipment"),
      cyberware: allFeats.filter((feat) => feat.system.featType === "cyberware"),
      cyberdeck: allFeats.filter((feat) => feat.system.featType === "cyberdeck"),
      vehicle: allFeats.filter((feat) => feat.system.featType === "vehicle"),
      weaponsSpells: allFeats.filter((feat) => feat.system.featType === "weapons-spells"),
      weapon: allFeats.filter((feat) => feat.system.featType === "weapon"),
      spell: allFeats.filter((feat) => feat.system.featType === "spell")
    };
    context.feats = allFeats;
    const skills = this.actor.items.filter((item) => item.type === "skill").sort((a, b) => a.name.localeCompare(b.name));
    const allSpecializations = this.actor.items.filter((item) => item.type === "specialization").sort((a, b) => a.name.localeCompare(b.name));
    const { bySkill: specializationsBySkill, unlinked: unlinkedSpecializations } = organizeSpecializationsBySkill(allSpecializations, this.actor.items.contents);
    const attributesRR = {
      strength: Math.min(3, this.calculateRR("attribute", "strength")),
      agility: Math.min(3, this.calculateRR("attribute", "agility")),
      willpower: Math.min(3, this.calculateRR("attribute", "willpower")),
      logic: Math.min(3, this.calculateRR("attribute", "logic")),
      charisma: Math.min(3, this.calculateRR("attribute", "charisma"))
    };
    context.skills = skills.map((skill) => {
      const linkedAttribute = skill.system?.linkedAttribute || "strength";
      skill.linkedAttributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
      const skillRR = this.calculateRR("skill", skill.name);
      const attributeRR = attributesRR[linkedAttribute] || 0;
      skill.rr = Math.min(3, skillRR + attributeRR);
      const attributeValue = this.actor.system.attributes[linkedAttribute] || 0;
      const skillRating = skill.system?.rating || 0;
      skill.totalDicePool = attributeValue + skillRating;
      const specs = (specializationsBySkill.get(skill.id) || []).sort((a, b) => a.name.localeCompare(b.name));
      skill.specializations = specs.map((spec) => {
        const parentRating = skill.system?.rating || 0;
        spec.parentRating = parentRating;
        spec.effectiveRating = parentRating + 2;
        spec.parentSkillName = skill.name;
        const specLinkedAttribute = spec.system?.linkedAttribute || "strength";
        spec.linkedAttributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${specLinkedAttribute.toUpperCase()}`);
        const specRR = this.calculateRR("specialization", spec.name);
        const specAttributeRR = attributesRR[specLinkedAttribute] || 0;
        const parentSkillRR = skillRR;
        spec.rr = Math.min(3, specAttributeRR + parentSkillRR + specRR);
        const specAttributeValue = this.actor.system.attributes[specLinkedAttribute] || 0;
        spec.totalDicePool = specAttributeValue + spec.effectiveRating;
        return spec;
      });
      return skill;
    });
    context.unlinkedSpecializations = unlinkedSpecializations.sort((a, b) => a.name.localeCompare(b.name)).map((spec) => {
      const linkedAttribute = spec.system?.linkedAttribute || "strength";
      spec.linkedAttributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
      const specRR = this.calculateRR("specialization", spec.name);
      const attributeRR = attributesRR[linkedAttribute] || 0;
      spec.rr = Math.min(3, specRR + attributeRR);
      const attributeValue = this.actor.system.attributes[linkedAttribute] || 0;
      spec.totalDicePool = attributeValue;
      return spec;
    });
    context.attributesRR = attributesRR;
    context.activeSection = this._activeSection;
    return context;
  }
  async close(options) {
    $(document).off("click.skill-search");
    $(document).off("click.feat-search");
    return super.close(options);
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".section-nav .nav-item").on("click", this._onSectionNavigation.bind(this));
    html.find('[data-action="edit-metatype"]').on("click", this._onEditMetatype.bind(this));
    html.find('[data-action="delete-metatype"]').on("click", this._onDeleteMetatype.bind(this));
    html.find('[data-action="edit-feat"]').on("click", this._onEditFeat.bind(this));
    html.find('[data-action="delete-feat"]').on("click", this._onDeleteFeat.bind(this));
    html.find('[data-action="edit-skill"]').on("click", this._onEditSkill.bind(this));
    html.find('[data-action="delete-skill"]').on("click", this._onDeleteSkill.bind(this));
    html.find('[data-action="edit-specialization"]').on("click", this._onEditSpecialization.bind(this));
    html.find('[data-action="delete-specialization"]').on("click", this._onDeleteSpecialization.bind(this));
    html.find('[data-action="roll-attribute"]').on("click", this._onRollAttribute.bind(this));
    html.find('[data-action="roll-skill"]').on("click", this._onRollSkill.bind(this));
    html.find('[data-action="quick-roll-skill"]').on("click", this._onQuickRollSkill.bind(this));
    html.find('[data-action="roll-specialization"]').on("click", this._onRollSpecialization.bind(this));
    html.find('[data-action="quick-roll-specialization"]').on("click", this._onQuickRollSpecialization.bind(this));
    html.find('[data-action="send-catchphrase"]').on("click", this._onSendCatchphrase.bind(this));
    html.find('[data-action="roll-weapon"]').on("click", this._onRollWeapon.bind(this));
    html.find('[data-action="roll-spell"]').on("click", this._onRollSpell.bind(this));
    html.find('[data-action="roll-weapon-spell"]').on("click", this._onRollWeaponSpell.bind(this));
    html.find(".rating-input").on("change", this._onRatingChange.bind(this));
    html.find(".skill-search-input").on("input", this._onSkillSearch.bind(this));
    html.find(".skill-search-input").on("focus", this._onSkillSearchFocus.bind(this));
    html.find(".skill-search-input").on("blur", this._onSkillSearchBlur.bind(this));
    $(document).on("click.skill-search", (event) => {
      const target = event.target;
      const skillSearchContainer = html.find(".skill-search-container")[0];
      if (skillSearchContainer && !skillSearchContainer.contains(target)) {
        html.find(".skill-search-results").hide();
      }
    });
    html.find(".feat-search-input").on("input", this._onFeatSearch.bind(this));
    html.find(".feat-search-input").on("focus", this._onFeatSearchFocus.bind(this));
    html.find(".feat-search-input").on("blur", this._onFeatSearchBlur.bind(this));
    $(document).on("click.feat-search", (event) => {
      const target = event.target;
      const featSearchContainer = html.find(".feat-search-container")[0];
      if (featSearchContainer && !featSearchContainer.contains(target)) {
        html.find(".feat-search-results").hide();
      }
    });
    html.find(".feat-item").each((_index, item) => {
      item.setAttribute("draggable", "true");
      item.addEventListener("dragstart", this._onDragStart.bind(this));
    });
    html.find(".skill-item").each((_index, item) => {
      item.setAttribute("draggable", "true");
      item.addEventListener("dragstart", this._onDragStart.bind(this));
    });
    html.find(".specialization-item").each((_index, item) => {
      item.setAttribute("draggable", "true");
      item.addEventListener("dragstart", this._onDragStart.bind(this));
    });
  }
  /**
   * Handle form submission to update actor data
   */
  async _updateObject(_event, formData) {
    const expandedData = handleSheetUpdate(this.actor, formData);
    return this.actor.update(expandedData);
  }
  /**
   * Handle section navigation
   */
  _onSectionNavigation(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const section = button.dataset.section;
    if (!section) return;
    this._activeSection = section;
    const form = $(this.form);
    form.find(".section-nav .nav-item").removeClass("active");
    button.classList.add("active");
    form.find(".content-section").removeClass("active");
    form.find(`[data-section-content="${section}"]`).addClass("active");
  }
  // Generic item handlers using SheetHelpers
  async _onEditMetatype(event) {
    return handleEditItem(event, this.actor);
  }
  async _onDeleteMetatype(event) {
    return handleDeleteItem(event, this.actor, this.render.bind(this));
  }
  async _onEditFeat(event) {
    return handleEditItem(event, this.actor);
  }
  async _onDeleteFeat(event) {
    return handleDeleteItem(event, this.actor);
  }
  async _onEditSkill(event) {
    return handleEditItem(event, this.actor);
  }
  async _onDeleteSkill(event) {
    return handleDeleteItem(event, this.actor);
  }
  async _onEditSpecialization(event) {
    return handleEditItem(event, this.actor);
  }
  async _onDeleteSpecialization(event) {
    return handleDeleteItem(event, this.actor);
  }
  /**
   * Get detailed RR sources for a given skill, specialization, or attribute
   */
  getRRSources(itemType, itemName) {
    return getRRSources(this.actor, itemType, itemName);
  }
  /**
   * Calculate Risk Reduction (RR) from active feats for a given skill, specialization, or attribute
   */
  calculateRR(itemType, itemName) {
    return calculateRR(this.actor, itemType, itemName);
  }
  /**
   * Handle rating changes for items
   */
  async _onRatingChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    const newRating = parseInt(element.value);
    if (!itemId || isNaN(newRating)) return;
    const item = this.actor.items.get(itemId);
    if (item) {
      await item.update({ system: { rating: newRating } });
    }
  }
  /**
   * Handle rolling a specialization
   */
  async _onRollSpecialization(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    const effectiveRating = parseInt(element.dataset.effectiveRating || "0");
    if (!itemId) return;
    const specialization = this.actor.items.get(itemId);
    if (!specialization || specialization.type !== "specialization") return;
    const specSystem = specialization.system;
    const linkedAttribute = specSystem.linkedAttribute || "strength";
    const linkedSkillName = specSystem.linkedSkill;
    const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
    const linkedSkill = linkedSkillName ? this.actor.items.find((i) => i.type === "skill" && i.name === linkedSkillName) : null;
    const skillRating = linkedSkill ? linkedSkill.system.rating || 0 : 0;
    const specRRSources = this.getRRSources("specialization", specialization.name);
    const attributeRRSources = this.getRRSources("attribute", linkedAttribute);
    const skillRRSources = linkedSkillName ? this.getRRSources("skill", linkedSkillName) : [];
    const allRRSources = [...specRRSources, ...skillRRSources, ...attributeRRSources];
    handleRollRequest({
      itemType: "specialization",
      itemName: specialization.name,
      itemId: specialization.id,
      specName: specialization.name,
      specLevel: attributeValue + effectiveRating,
      // Total dice pool (attribute + effectiveRating)
      skillName: linkedSkillName,
      skillLevel: skillRating,
      // Just the skill rating (without attribute)
      linkedAttribute,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: allRRSources
    });
  }
  /**
   * Handle quick rolling a skill (from dice badge click) - opens dialog
   */
  async _onQuickRollSkill(event) {
    return this._onRollSkill(event);
  }
  /**
   * Handle quick rolling a specialization (from dice badge click) - opens dialog
   */
  async _onQuickRollSpecialization(event) {
    return this._onRollSpecialization(event);
  }
  /**
   * Handle rolling an attribute
   */
  async _onRollAttribute(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const attributeName = element.dataset.attribute;
    if (!attributeName) return;
    const attributeValue = this.actor.system.attributes?.[attributeName] || 0;
    const attributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`);
    const rrSources = this.getRRSources("attribute", attributeName);
    handleRollRequest({
      itemType: "attribute",
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
  async _onRollSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    const skill = this.actor.items.get(itemId);
    if (!skill || skill.type !== "skill") return;
    const skillSystem = skill.system;
    const rating = skillSystem.rating || 0;
    const linkedAttribute = skillSystem.linkedAttribute || "strength";
    const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
    const skillRRSources = this.getRRSources("skill", skill.name);
    const attributeRRSources = this.getRRSources("attribute", linkedAttribute);
    const allRRSources = [...skillRRSources, ...attributeRRSources];
    handleRollRequest({
      itemType: "skill",
      itemName: skill.name,
      itemId: skill.id,
      itemRating: rating,
      skillName: skill.name,
      skillLevel: attributeValue + rating,
      // Total dice pool (attribute + rating)
      linkedAttribute,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: allRRSources
    });
  }
  /**
   * REMOVED: Dice rolling logic
   */
  async _rollSkillDice(skillName, dicePool, riskDice = 0, riskReduction = 0, rollMode = "normal", weaponDamageValue, damageValueBonus) {
    console.log("Dice rolling disabled", { skillName, dicePool, riskDice, riskReduction, rollMode });
  }
  /**
   * REMOVED: Attack with defense system logic
   */
  async _rollAttackWithDefense(skillName, dicePool, riskDice = 0, riskReduction = 0, rollMode = "normal", weaponDamageValue, attackingWeapon, damageValueBonus) {
    console.log("Attack rolling disabled", { skillName, dicePool, riskDice, riskReduction, rollMode });
  }
  /**
   * REMOVED: Defense roll prompt logic
   */
  async _promptDefenseRoll(defenderActor, attackResult, attackName, weaponDamageValue, attackingWeapon, damageValueBonus, defenderToken) {
    console.log("Defense roll prompt disabled", { defenderActor: defenderActor.name, attackName });
  }
  /**
   * REMOVED: Defense roll and damage calculation
   */
  async _rollDefenseAndCalculateDamage(defenseItem, itemType, attackName, attackResult, weaponDamageValue, defenderActor, damageValueBonus, defenderToken) {
    console.log("Defense roll disabled", { defenseItem: defenseItem.name, itemType, attackName });
  }
  /**
   * REMOVED: Threshold defense logic
   */
  async _defendWithThreshold(defenseItem, _itemType, threshold, attackName, attackResult, weaponDamageValue, defenderActor, damageValueBonus, defenderToken) {
    console.log("Threshold defense disabled", { defenseItem: defenseItem.name, threshold, attackName });
  }
  /**
   * REMOVED: Dice roll execution
   */
  async _performDiceRoll(dicePool, riskDice, riskReduction, rollMode) {
    console.log("Dice roll disabled", { dicePool, riskDice, riskReduction, rollMode });
    return {};
  }
  /**
   * REMOVED: Attack result display
   */
  async _displayAttackResult(attackName, attackResult, defenseResult, weaponDamageValue, defenderName, defenderActor, damageValueBonus, defenderToken) {
    console.log("Attack result display disabled", { attackName, defenderName });
  }
  /**
   * Apply damage to a defender
   */
  static async applyDamage(defenderUuid, damageValue, defenderName) {
    const defender = await fromUuid(defenderUuid);
    if (!defender) {
      ui.notifications?.error(`Cannot find defender: ${defenderName}`);
      return;
    }
    const defenderActor = defender.actor || defender;
    const defenderSystem = defenderActor.system;
    const damageThresholds = defenderSystem.damageThresholds?.withArmor || {
      light: 1,
      moderate: 4,
      severe: 7
    };
    let damage = {
      light: [...defenderSystem.damage?.light || []],
      severe: [...defenderSystem.damage?.severe || []],
      incapacitating: defenderSystem.damage?.incapacitating || false
    };
    let damageType = "";
    let overflow = false;
    if (damageValue >= damageThresholds.severe) {
      damageType = game.i18n.localize("SRA2.COMBAT.DAMAGE_INCAPACITATING");
      damage.incapacitating = true;
    } else if (damageValue >= damageThresholds.moderate) {
      damageType = game.i18n.localize("SRA2.COMBAT.DAMAGE_SEVERE");
      let applied = false;
      for (let i = 0; i < damage.severe.length; i++) {
        if (!damage.severe[i]) {
          damage.severe[i] = true;
          applied = true;
          break;
        }
      }
      if (!applied) {
        ui.notifications?.info(game.i18n.localize("SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE"));
        damage.incapacitating = true;
        overflow = true;
      }
    } else if (damageValue >= damageThresholds.light) {
      damageType = game.i18n.localize("SRA2.COMBAT.DAMAGE_LIGHT");
      let applied = false;
      for (let i = 0; i < damage.light.length; i++) {
        if (!damage.light[i]) {
          damage.light[i] = true;
          applied = true;
          break;
        }
      }
      if (!applied) {
        ui.notifications?.info(game.i18n.localize("SRA2.COMBAT.DAMAGE_OVERFLOW_LIGHT"));
        let severeApplied = false;
        for (let i = 0; i < damage.severe.length; i++) {
          if (!damage.severe[i]) {
            damage.severe[i] = true;
            severeApplied = true;
            break;
          }
        }
        if (!severeApplied) {
          ui.notifications?.info(game.i18n.localize("SRA2.COMBAT.DAMAGE_OVERFLOW_SEVERE"));
          damage.incapacitating = true;
        }
        overflow = true;
      }
    } else {
      ui.notifications?.info(game.i18n.format("SRA2.COMBAT.DAMAGE_APPLIED", {
        damage: `${damageValue} (en dessous du seuil)`,
        target: defenderName
      }));
      return;
    }
    await defenderActor.update({ "system.damage": damage });
    if (damage.incapacitating === true) {
      ui.notifications?.error(game.i18n.format("SRA2.COMBAT.NOW_INCAPACITATED", { target: defenderName }));
    } else {
      ui.notifications?.info(game.i18n.format("SRA2.COMBAT.DAMAGE_APPLIED", {
        damage: overflow ? `${damageType} (débordement)` : damageType,
        target: defenderName
      }));
    }
  }
  /**
   * REMOVED: Simple roll result display
   */
  async _displayRollResult(skillName, rollResult, weaponDamageValue, damageValueBonus) {
    console.log("Roll result display disabled", { skillName });
  }
  /**
   * Handle drag start for feat items
   */
  _onDragStart(event) {
    const itemId = event.currentTarget.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const dragData = {
      type: "Item",
      uuid: item.uuid
    };
    event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
  }
  /**
   * Override to handle dropping feats and skills anywhere on the sheet
   */
  async _onDrop(event) {
    const handled = await handleItemDrop(event, this.actor);
    return handled ? void 0 : super._onDrop(event);
  }
  /**
   * Handle skill search input
   */
  searchTimeout = null;
  async _onSkillSearch(event) {
    const input = event.currentTarget;
    const searchTerm = normalizeSearchText(input.value.trim());
    const resultsDiv = $(input).siblings(".skill-search-results")[0];
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (searchTerm.length === 0) {
      resultsDiv.style.display = "none";
      return;
    }
    this.searchTimeout = setTimeout(async () => {
      await this._performSkillSearch(searchTerm, resultsDiv);
    }, 300);
  }
  /**
   * Perform the actual skill search in compendiums and world items
   */
  async _performSkillSearch(searchTerm, resultsDiv) {
    this.lastSearchTerm = searchTerm;
    const existingItemsCheck = (itemName) => itemExistsOnActor(this.actor, "skill", itemName);
    const results = await searchItemsEverywhere(
      "skill",
      searchTerm,
      void 0,
      existingItemsCheck
    );
    this._displaySkillSearchResults(results, resultsDiv);
  }
  /**
   * Display skill search results
   */
  lastSearchTerm = "";
  _displaySkillSearchResults(results, resultsDiv) {
    const formattedSearchTerm = this.lastSearchTerm.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    const exactMatchOnActor = this.actor.items.find(
      (i) => i.type === "skill" && normalizeSearchText(i.name) === normalizeSearchText(this.lastSearchTerm)
    );
    let html = "";
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n.localize("SRA2.SKILLS.SEARCH_NO_RESULTS")}
          </div>
          <button class="create-skill-btn" data-skill-name="${this.lastSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n.localize("SRA2.SKILLS.CREATE_SKILL")}
          </button>
        </div>
      `;
    } else {
      for (const result of results) {
        const disabledClass = result.alreadyExists ? "disabled" : "";
        const buttonText = result.alreadyExists ? "✓" : game.i18n.localize("SRA2.SKILLS.ADD_SKILL");
        html += `
          <div class="search-result-item ${disabledClass}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source}</span>
            </div>
            <button class="add-skill-btn" data-uuid="${result.uuid}" ${result.alreadyExists ? "disabled" : ""}>
              ${buttonText}
            </button>
          </div>
        `;
      }
      if (!exactMatchOnActor) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n.localize("SRA2.SKILLS.CREATE_NEW")}</span>
            </div>
            <button class="create-skill-btn-inline" data-skill-name="${this.lastSearchTerm}">
              ${game.i18n.localize("SRA2.SKILLS.CREATE")}
            </button>
          </div>
        `;
      }
    }
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = "block";
    $(resultsDiv).find(".add-skill-btn").on("click", this._onAddSkillFromSearch.bind(this));
    $(resultsDiv).find(".create-skill-btn, .create-skill-btn-inline").on("click", this._onCreateNewSkill.bind(this));
    $(resultsDiv).find(".search-result-item:not(.disabled):not(.no-results-create):not(.create-new-item)").on("click", (event) => {
      if ($(event.target).closest(".add-skill-btn").length > 0) return;
      const button = $(event.currentTarget).find(".add-skill-btn")[0];
      if (button && !button.disabled) {
        $(button).trigger("click");
      }
    });
    $(resultsDiv).find(".search-result-item.create-new-item").on("click", (event) => {
      if ($(event.target).closest(".create-skill-btn-inline").length > 0) return;
      const button = $(event.currentTarget).find(".create-skill-btn-inline")[0];
      if (button) {
        $(button).trigger("click");
      }
    });
  }
  /**
   * Handle adding a skill from search results
   */
  async _onAddSkillFromSearch(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const uuid = button.dataset.uuid;
    if (!uuid) return;
    const skill = await fromUuid(uuid);
    if (!skill) {
      ui.notifications?.error("Skill not found");
      return;
    }
    const existingSkill = this.actor.items.find(
      (i) => i.type === "skill" && i.name === skill.name
    );
    if (existingSkill) {
      ui.notifications?.warn(game.i18n.format("SRA2.SKILLS.ALREADY_EXISTS", { name: skill.name }));
      return;
    }
    await this.actor.createEmbeddedDocuments("Item", [skill.toObject()]);
    button.textContent = "✓";
    button.disabled = true;
    button.closest(".search-result-item")?.classList.add("disabled");
    ui.notifications?.info(`${skill.name} ${game.i18n.localize("SRA2.SKILLS.ADD_SKILL")}`);
  }
  /**
   * Handle skill search focus
   */
  _onSkillSearchFocus(event) {
    const input = event.currentTarget;
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings(".skill-search-results")[0];
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = "block";
      }
    }
    return Promise.resolve();
  }
  /**
   * Handle skill search blur
   */
  _onSkillSearchBlur(event) {
    const input = event.currentTarget;
    const blurEvent = event;
    setTimeout(() => {
      const resultsDiv = $(input).siblings(".skill-search-results")[0];
      if (resultsDiv) {
        const relatedTarget = blurEvent.relatedTarget;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          return;
        }
        const activeElement = document.activeElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          return;
        }
        resultsDiv.style.display = "none";
      }
    }, 200);
    return Promise.resolve();
  }
  /**
   * Handle creating a new skill from search
   */
  async _onCreateNewSkill(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const skillName = button.dataset.skillName;
    if (!skillName) return;
    const formattedName = skillName.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    const skillData = {
      name: formattedName,
      type: "skill",
      system: {
        rating: 1,
        linkedAttribute: "strength",
        description: ""
      }
    };
    const createdItems = await this.actor.createEmbeddedDocuments("Item", [skillData]);
    if (createdItems && createdItems.length > 0) {
      const newSkill = createdItems[0];
      const searchInput = this.element.find(".skill-search-input")[0];
      if (searchInput) {
        searchInput.value = "";
      }
      const resultsDiv = this.element.find(".skill-search-results")[0];
      if (resultsDiv) {
        resultsDiv.style.display = "none";
      }
      if (newSkill && newSkill.sheet) {
        setTimeout(() => {
          newSkill.sheet.render(true);
        }, 100);
      }
      ui.notifications?.info(game.i18n.format("SRA2.SKILLS.SKILL_CREATED", { name: formattedName }));
    }
  }
  /**
   * FEAT SEARCH FUNCTIONS
   */
  featSearchTimeout = null;
  lastFeatSearchTerm = "";
  /**
   * Handle feat search input
   */
  async _onFeatSearch(event) {
    const input = event.currentTarget;
    const searchTerm = normalizeSearchText(input.value.trim());
    const resultsDiv = $(input).siblings(".feat-search-results")[0];
    if (this.featSearchTimeout) {
      clearTimeout(this.featSearchTimeout);
    }
    if (searchTerm.length === 0) {
      resultsDiv.style.display = "none";
      return;
    }
    this.featSearchTimeout = setTimeout(async () => {
      await this._performFeatSearch(searchTerm, resultsDiv);
    }, 300);
  }
  /**
   * Perform the actual feat search in compendiums and world items
   */
  async _performFeatSearch(searchTerm, resultsDiv) {
    const results = [];
    this.lastFeatSearchTerm = searchTerm;
    if (game.items) {
      for (const item of game.items) {
        if (item.type === "feat" && normalizeSearchText(item.name).includes(searchTerm)) {
          const existingFeat = this.actor.items.find(
            (i) => i.type === "feat" && i.name === item.name
          );
          results.push({
            name: item.name,
            uuid: item.uuid,
            pack: game.i18n.localize("SRA2.FEATS.WORLD_ITEMS"),
            featType: item.system.featType,
            exists: !!existingFeat
          });
        }
      }
    }
    for (const pack of game.packs) {
      if (pack.documentName !== "Item") continue;
      const documents2 = await pack.getDocuments();
      for (const doc of documents2) {
        if (doc.type === "feat" && normalizeSearchText(doc.name).includes(searchTerm)) {
          const existingFeat = this.actor.items.find(
            (i) => i.type === "feat" && i.name === doc.name
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
    this._displayFeatSearchResults(results, resultsDiv);
  }
  /**
   * Display feat search results
   */
  _displayFeatSearchResults(results, resultsDiv) {
    const formattedSearchTerm = this.lastFeatSearchTerm.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    const exactMatchOnActor = this.actor.items.find(
      (i) => i.type === "feat" && normalizeSearchText(i.name) === normalizeSearchText(this.lastFeatSearchTerm)
    );
    let html = "";
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n.localize("SRA2.FEATS.SEARCH_NO_RESULTS")}
          </div>
          <select class="feat-type-selector">
            <option value="equipment">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.EQUIPMENT")}</option>
            <option value="trait">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.TRAIT")}</option>
            <option value="contact">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.CONTACT")}</option>
            <option value="awakened">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.AWAKENED")}</option>
            <option value="adept-power">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.ADEPT_POWER")}</option>
            <option value="cyberware">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.CYBERWARE")}</option>
            <option value="cyberdeck">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.CYBERDECK")}</option>
            <option value="vehicle">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.VEHICLE")}</option>
            <option value="weapons-spells">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS")}</option>
            <option value="weapon">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.WEAPON")}</option>
            <option value="spell">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.SPELL")}</option>
          </select>
          <button class="create-feat-btn" data-feat-name="${this.lastFeatSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n.localize("SRA2.FEATS.CREATE")}
          </button>
        </div>
      `;
    } else {
      for (const result of results) {
        const disabledClass = result.exists ? "disabled" : "";
        const buttonText = result.exists ? "✓" : game.i18n.localize("SRA2.FEATS.ADD_FEAT");
        const featTypeLabel = game.i18n.localize(`SRA2.FEATS.FEAT_TYPE.${result.featType.toUpperCase().replace("-", "_")}`);
        html += `
          <div class="search-result-item ${disabledClass}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.pack} - ${featTypeLabel}</span>
            </div>
            <button class="add-feat-btn" data-uuid="${result.uuid}" ${result.exists ? "disabled" : ""}>
              ${buttonText}
            </button>
          </div>
        `;
      }
      if (!exactMatchOnActor) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n.localize("SRA2.FEATS.CREATE_NEW")}</span>
            </div>
            <select class="feat-type-selector-inline">
              <option value="equipment">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.EQUIPMENT")}</option>
              <option value="trait">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.TRAIT")}</option>
              <option value="contact">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.CONTACT")}</option>
              <option value="awakened">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.AWAKENED")}</option>
              <option value="adept-power">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.ADEPT_POWER")}</option>
              <option value="cyberware">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.CYBERWARE")}</option>
              <option value="cyberdeck">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.CYBERDECK")}</option>
              <option value="vehicle">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.VEHICLE")}</option>
              <option value="weapons-spells">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.WEAPONS_SPELLS")}</option>
              <option value="weapon">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.WEAPON")}</option>
              <option value="spell">${game.i18n.localize("SRA2.FEATS.FEAT_TYPE.SPELL")}</option>
            </select>
            <button class="create-feat-btn-inline" data-feat-name="${this.lastFeatSearchTerm}">
              ${game.i18n.localize("SRA2.FEATS.CREATE")}
            </button>
          </div>
        `;
      }
    }
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = "block";
    $(resultsDiv).find(".add-feat-btn").on("click", this._onAddFeatFromSearch.bind(this));
    $(resultsDiv).find(".create-feat-btn, .create-feat-btn-inline").on("click", this._onCreateNewFeat.bind(this));
    $(resultsDiv).find(".search-result-item:not(.disabled):not(.no-results-create):not(.create-new-item)").on("click", (event) => {
      if ($(event.target).closest(".add-feat-btn").length > 0) return;
      const button = $(event.currentTarget).find(".add-feat-btn")[0];
      if (button && !button.disabled) {
        $(button).trigger("click");
      }
    });
    $(resultsDiv).find(".search-result-item.create-new-item").on("click", (event) => {
      if ($(event.target).closest(".create-feat-btn-inline, .feat-type-selector-inline").length > 0) return;
      const button = $(event.currentTarget).find(".create-feat-btn-inline")[0];
      if (button) {
        $(button).trigger("click");
      }
    });
    return Promise.resolve();
  }
  /**
   * Handle adding a feat from search results
   */
  async _onAddFeatFromSearch(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const uuid = button.dataset.uuid;
    if (!uuid) return;
    const feat = await fromUuid(uuid);
    if (!feat) {
      ui.notifications?.error("Feat not found");
      return;
    }
    const existingFeat = this.actor.items.find(
      (i) => i.type === "feat" && i.name === feat.name
    );
    if (existingFeat) {
      ui.notifications?.warn(game.i18n.format("SRA2.FEATS.ALREADY_EXISTS", { name: feat.name }));
      return;
    }
    await this.actor.createEmbeddedDocuments("Item", [feat.toObject()]);
    button.textContent = "✓";
    button.disabled = true;
    button.closest(".search-result-item")?.classList.add("disabled");
    ui.notifications?.info(`${feat.name} ${game.i18n.localize("SRA2.FEATS.ADD_FEAT")}`);
  }
  /**
   * Handle feat search focus
   */
  _onFeatSearchFocus(event) {
    const input = event.currentTarget;
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings(".feat-search-results")[0];
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = "block";
      }
    }
    return Promise.resolve();
  }
  /**
   * Handle feat search blur
   */
  _onFeatSearchBlur(event) {
    const input = event.currentTarget;
    const blurEvent = event;
    setTimeout(() => {
      const resultsDiv = $(input).siblings(".feat-search-results")[0];
      if (resultsDiv) {
        const relatedTarget = blurEvent.relatedTarget;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          return;
        }
        const activeElement = document.activeElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          return;
        }
        resultsDiv.style.display = "none";
      }
    }, 200);
    return Promise.resolve();
  }
  /**
   * Handle sending a catchphrase to chat
   */
  async _onSendCatchphrase(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const catchphrase = element.dataset.catchphrase;
    if (!catchphrase) return;
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="sra2-catchphrase">${catchphrase}</div>`
    };
    await ChatMessage.create(messageData);
  }
  /**
   * Handle rolling a weapon
   */
  async _onRollWeapon(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) {
      console.error("SRA2 | No weapon ID found");
      return;
    }
    const weapon = this.actor.items.get(itemId);
    if (!weapon || weapon.type !== "feat") return;
    await this._rollWeaponOrSpell(weapon, "weapon");
  }
  /**
   * Handle rolling a spell
   */
  async _onRollSpell(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) {
      console.error("SRA2 | No spell ID found");
      return;
    }
    const spell = this.actor.items.get(itemId);
    if (!spell || spell.type !== "feat") return;
    await this._rollWeaponOrSpell(spell, "spell");
  }
  /**
   * Handle rolling a weapon/spell (old type)
   */
  async _onRollWeaponSpell(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) {
      console.error("SRA2 | No weapon/spell ID found");
      return;
    }
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "feat") return;
    await this._rollWeaponOrSpell(item, "weapon-spell");
  }
  /**
   * Handle rolling a weapon or spell
   */
  async _rollWeaponOrSpell(item, type) {
    const itemSystem = item.system;
    const weaponType = itemSystem.weaponType;
    let weaponLinkedSkill = "";
    let weaponLinkedSpecialization = "";
    let weaponLinkedDefenseSkill = "";
    let weaponLinkedDefenseSpecialization = "";
    if (weaponType && weaponType !== "custom-weapon") {
      const weaponStats = WEAPON_TYPES[weaponType];
      if (weaponStats) {
        weaponLinkedSkill = weaponStats.linkedSkill || "";
        weaponLinkedSpecialization = weaponStats.linkedSpecialization || "";
        weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || "";
        weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || "";
      }
    }
    const itemRRList = itemSystem.rrList || [];
    const finalAttackSkill = weaponLinkedSkill || itemSystem.linkedAttackSkill || "";
    const finalAttackSpec = weaponLinkedSpecialization || itemSystem.linkedAttackSpecialization || "";
    const finalDefenseSkill = weaponLinkedDefenseSkill || itemSystem.linkedDefenseSkill || "";
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || itemSystem.linkedDefenseSpecialization || "";
    let attackSkillName = void 0;
    let attackSkillLevel = void 0;
    let attackSpecName = void 0;
    let attackSpecLevel = void 0;
    let attackLinkedAttribute = void 0;
    if (finalAttackSpec) {
      const foundSpec = this.actor.items.find(
        (i) => i.type === "specialization" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSpec)
      );
      if (foundSpec) {
        const specSystem = foundSpec.system;
        attackSpecName = foundSpec.name;
        attackLinkedAttribute = specSystem.linkedAttribute || "strength";
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find(
            (i) => i.type === "skill" && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            attackSkillLevel = parentSkill.system.rating || 0;
            attackSpecLevel = attackSkillLevel + 2;
          }
        }
      }
    }
    if (!attackSpecName && finalAttackSkill) {
      const foundSkill = this.actor.items.find(
        (i) => i.type === "skill" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSkill)
      );
      if (foundSkill) {
        attackSkillName = foundSkill.name;
        attackSkillLevel = foundSkill.system.rating || 0;
        attackLinkedAttribute = foundSkill.system.linkedAttribute || "strength";
      }
    }
    const baseDamageValue = itemSystem.damageValue || "0";
    const damageValueBonus = itemSystem.damageValueBonus || 0;
    this.actor.system.attributes?.strength || 0;
    let finalDamageValue = baseDamageValue;
    if (damageValueBonus > 0 && baseDamageValue !== "0") {
      if (baseDamageValue === "FOR") {
        finalDamageValue = `FOR+${damageValueBonus}`;
      } else if (baseDamageValue.startsWith("FOR+")) {
        const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
        finalDamageValue = `FOR+${baseModifier + damageValueBonus}`;
      } else if (baseDamageValue !== "toxin") {
        const baseValue = parseInt(baseDamageValue) || 0;
        finalDamageValue = (baseValue + damageValueBonus).toString();
      }
    }
    handleRollRequest({
      itemType: type,
      weaponType,
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
      damageValue: finalDamageValue,
      // FINAL damage value (base + bonus)
      damageValueBonus,
      meleeRange: itemSystem.meleeRange,
      shortRange: itemSystem.shortRange,
      mediumRange: itemSystem.mediumRange,
      longRange: itemSystem.longRange,
      // Attack skill/spec from actor (based on weapon links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      // Actor information
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      // RR List
      rrList: itemRRList
    });
  }
  /**
   * REMOVED: Skill with weapon roll - dialog creation disabled
   */
  async _rollSkillWithWeapon(skill, weaponName, _skillType, weaponDamageValue, weapon) {
    console.log("Skill with weapon roll disabled", { skill: skill.name, weaponName });
  }
  /**
   * REMOVED: Specialization with weapon roll - dialog creation disabled
   */
  async _rollSpecializationWithWeapon(specialization, weaponName, effectiveRating, weaponDamageValue, weapon) {
    console.log("Specialization with weapon roll disabled", { specialization: specialization.name, weaponName });
  }
  /**
   * Handle creating a new feat from search
   */
  async _onCreateNewFeat(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const featName = button.dataset.featName;
    if (!featName) return;
    const selector = $(button).siblings(".feat-type-selector, .feat-type-selector-inline")[0];
    const featType = selector ? selector.value : "equipment";
    const formattedName = featName.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    const featData = {
      name: formattedName,
      type: "feat",
      system: {
        description: "",
        rating: 0,
        cost: "free-equipment",
        active: true,
        featType,
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
    };
    const createdItems = await this.actor.createEmbeddedDocuments("Item", [featData]);
    if (createdItems && createdItems.length > 0) {
      const newFeat = createdItems[0];
      const searchInput = this.element.find(".feat-search-input")[0];
      if (searchInput) {
        searchInput.value = "";
      }
      const resultsDiv = this.element.find(".feat-search-results")[0];
      if (resultsDiv) {
        resultsDiv.style.display = "none";
      }
      if (newFeat && newFeat.sheet) {
        setTimeout(() => {
          newFeat.sheet.render(true);
        }, 100);
      }
      ui.notifications?.info(game.i18n.format("SRA2.FEATS.FEAT_CREATED", { name: formattedName }));
    }
  }
}
class NpcSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "actor", "npc"],
      template: "systems/sra2/templates/actor-npc-sheet.hbs",
      width: 800,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: ".skill-item", dropSelector: null },
        { dragSelector: ".feat-item", dropSelector: null },
        { dragSelector: ".specialization-item", dropSelector: null }
      ],
      submitOnChange: true
    });
  }
  /**
   * Handle form submission to update actor data
   */
  async _updateObject(_event, formData) {
    const expandedData = handleSheetUpdate(this.actor, formData);
    return this.actor.update(expandedData);
  }
  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    const allFeats = this.actor.items.filter((item) => item.type === "feat");
    const activeFeats = allFeats.filter((feat) => feat.system.active === true);
    const actorStrength = this.actor.system.attributes?.strength || 0;
    let allSpecializations = this.actor.items.filter((i) => i.type === "specialization");
    const calculateWeaponSpellStats = (item) => {
      const itemData = {
        ...item,
        _id: item.id || item._id,
        id: item.id || item._id
      };
      let linkedSkillName = "";
      let linkedSpecializationName = "";
      const weaponType = item.system.weaponType;
      if (weaponType && weaponType !== "custom-weapon") {
        const weaponStats = WEAPON_TYPES[weaponType];
        if (weaponStats) {
          linkedSkillName = weaponStats.linkedSkill || "";
          linkedSpecializationName = weaponStats.linkedSpecialization || "";
        }
      } else if (weaponType === "custom-weapon") {
        linkedSkillName = item.system.linkedAttackSkill || "";
        linkedSpecializationName = "";
      }
      let totalDicePool = 0;
      let totalRR = 0;
      let linkedAttribute = "";
      if (linkedSkillName) {
        const linkedSkill = this.actor.items.find(
          (i) => i.type === "skill" && i.name === linkedSkillName
        );
        if (linkedSkill) {
          const skillRating = linkedSkill.system.rating || 0;
          let matchingSpec = null;
          if (linkedSpecializationName) {
            matchingSpec = allSpecializations.find(
              (spec) => spec.name === linkedSpecializationName && spec.system.linkedSkill === linkedSkillName
            );
          }
          if (matchingSpec) {
            linkedAttribute = matchingSpec.system.linkedAttribute || linkedSkill.system.linkedAttribute || "strength";
            const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
            totalDicePool = skillRating + attributeValue + 2;
            activeFeats.forEach((feat) => {
              const rrList = feat.system.rrList || [];
              rrList.forEach((rrEntry) => {
                if (rrEntry.rrType === "skill" && rrEntry.rrTarget === linkedSkillName) {
                  totalRR += rrEntry.rrValue || 0;
                }
                if (rrEntry.rrType === "attribute" && rrEntry.rrTarget === linkedAttribute) {
                  totalRR += rrEntry.rrValue || 0;
                }
                if (rrEntry.rrType === "specialization" && rrEntry.rrTarget === matchingSpec.name) {
                  totalRR += rrEntry.rrValue || 0;
                }
              });
            });
          } else {
            linkedAttribute = linkedSkill.system.linkedAttribute || "strength";
            const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
            totalDicePool = attributeValue + skillRating;
            activeFeats.forEach((feat) => {
              const rrList = feat.system.rrList || [];
              rrList.forEach((rrEntry) => {
                if (rrEntry.rrType === "skill" && rrEntry.rrTarget === linkedSkillName) {
                  totalRR += rrEntry.rrValue || 0;
                }
                if (rrEntry.rrType === "attribute" && rrEntry.rrTarget === linkedAttribute) {
                  totalRR += rrEntry.rrValue || 0;
                }
              });
            });
          }
        }
      }
      if (totalDicePool === 0) {
        linkedAttribute = "strength";
        const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
        totalDicePool = attributeValue;
        activeFeats.forEach((feat) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry) => {
            if (rrEntry.rrType === "attribute" && rrEntry.rrTarget === linkedAttribute) {
              totalRR += rrEntry.rrValue || 0;
            }
          });
        });
      }
      const npcThreshold = Math.round(totalDicePool / 3) + totalRR + 1;
      itemData.totalDicePool = totalDicePool;
      itemData.totalRR = totalRR;
      itemData.npcThreshold = npcThreshold;
      const damageValue = item.system.damageValue || "0";
      const damageValueBonus = item.system.damageValueBonus || 0;
      itemData.finalDamageValue = calculateFinalDamageValue(damageValue, damageValueBonus, actorStrength);
      return itemData;
    };
    const rawWeapons = allFeats.filter(
      (feat) => feat.system.featType === "weapon" || feat.system.featType === "weapons-spells"
    );
    const rawSpells = allFeats.filter(
      (feat) => feat.system.featType === "spell"
    );
    const otherFeats = allFeats.filter(
      (feat) => feat.system.featType !== "weapon" && feat.system.featType !== "spell" && feat.system.featType !== "weapons-spells"
    );
    const weapons = rawWeapons.map((weapon) => calculateWeaponSpellStats(weapon));
    const spells = rawSpells.map((spell) => calculateWeaponSpellStats(spell));
    context.weapons = weapons;
    context.spells = spells;
    context.feats = otherFeats;
    const skills = this.actor.items.filter((item) => item.type === "skill").sort((a, b) => a.name.localeCompare(b.name));
    allSpecializations = allSpecializations.sort((a, b) => a.name.localeCompare(b.name));
    const specializationsBySkill = /* @__PURE__ */ new Map();
    allSpecializations.forEach((spec) => {
      const linkedSkillName = spec.system.linkedSkill;
      if (linkedSkillName) {
        const linkedSkill = this.actor.items.find(
          (i) => i.type === "skill" && i.name === linkedSkillName
        );
        if (linkedSkill && linkedSkill.id) {
          const skillId = linkedSkill.id;
          if (!specializationsBySkill.has(skillId)) {
            specializationsBySkill.set(skillId, []);
          }
          specializationsBySkill.get(skillId).push(spec);
        }
      }
    });
    const skillsWithThresholds = skills.map((skill) => {
      const skillData = {
        ...skill,
        _id: skill.id || skill._id,
        // Ensure ID is present
        id: skill.id || skill._id
      };
      const linkedAttribute = skill.system.linkedAttribute;
      let attributeValue = 0;
      if (linkedAttribute && this.actor.system.attributes) {
        attributeValue = this.actor.system.attributes[linkedAttribute] || 0;
      }
      const skillRating = skill.system.rating || 0;
      const totalDicePool = attributeValue + skillRating;
      let totalRR = 0;
      const activeFeats2 = this.actor.items.filter(
        (item) => item.type === "feat" && item.system.active === true
      );
      activeFeats2.forEach((feat) => {
        const rrList = feat.system.rrList || [];
        rrList.forEach((rrEntry) => {
          if (rrEntry.rrType === "skill" && rrEntry.rrTarget === skill.name) {
            totalRR += rrEntry.rrValue || 0;
          }
          if (rrEntry.rrType === "attribute" && rrEntry.rrTarget === linkedAttribute) {
            totalRR += rrEntry.rrValue || 0;
          }
        });
      });
      const npcThreshold = Math.round(totalDicePool / 3) + totalRR + 1;
      skillData.totalDicePool = totalDicePool;
      skillData.totalRR = totalRR;
      skillData.npcThreshold = npcThreshold;
      const specs = (specializationsBySkill.get(skill.id) || []).sort((a, b) => a.name.localeCompare(b.name));
      skillData.specializations = specs.map((spec) => {
        const specData = {
          ...spec,
          _id: spec.id || spec._id,
          // Ensure ID is present
          id: spec.id || spec._id
        };
        const specLinkedAttribute = spec.system.linkedAttribute || linkedAttribute;
        const specAttributeValue = this.actor.system.attributes?.[specLinkedAttribute] || 0;
        const specDicePool = skillRating + specAttributeValue + 2;
        let specTotalRR = 0;
        activeFeats2.forEach((feat) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry) => {
            if (rrEntry.rrType === "skill" && rrEntry.rrTarget === skill.name) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
        activeFeats2.forEach((feat) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry) => {
            if (rrEntry.rrType === "attribute" && rrEntry.rrTarget === specLinkedAttribute) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
        activeFeats2.forEach((feat) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry) => {
            if (rrEntry.rrType === "specialization" && rrEntry.rrTarget === spec.name) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
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
  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="roll-skill"]').on("click", this._onRollSkill.bind(this));
    html.find('[data-action="roll-specialization"]').on("click", this._onRollSpecialization.bind(this));
    html.find('[data-action="attack-threshold"]').on("click", this._onAttackThreshold.bind(this));
    html.find('[data-action="attack-threshold-weapon"]').on("click", this._onAttackThresholdWeapon.bind(this));
    html.find('[data-action="attack-threshold-spell"]').on("click", this._onAttackThresholdSpell.bind(this));
    html.find('[data-action="roll-npc-weapon-dice"]').on("click", this._onRollNPCWeaponDice.bind(this));
    html.find('[data-action="roll-npc-spell-dice"]').on("click", this._onRollNPCSpellDice.bind(this));
    html.find('[data-action="edit-skill"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });
    html.find('[data-action="delete-skill"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n.localize("SRA2.SKILLS.DELETE"),
          content: `<p>${game.i18n.format("SRA2.CONFIRM_DELETE", { name: item.name })}</p>`
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });
    html.find('[data-action="edit-specialization"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });
    html.find('[data-action="delete-specialization"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n.localize("SRA2.SPECIALIZATIONS.DELETE"),
          content: `<p>${game.i18n.format("SRA2.CONFIRM_DELETE", { name: item.name })}</p>`
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });
    html.find('[data-action="edit-feat"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });
    html.find('[data-action="delete-feat"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n.localize("SRA2.FEATS.DELETE"),
          content: `<p>${game.i18n.format("SRA2.CONFIRM_DELETE", { name: item.name })}</p>`
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });
    html.find('[data-action="add-world-skill"]').on("click", async (event) => {
      event.preventDefault();
      this._showItemBrowser("skill");
    });
    html.find('[data-action="add-world-feat"]').on("click", async (event) => {
      event.preventDefault();
      this._showItemBrowser("feat");
    });
  }
  /**
   * Handle rolling a skill (NPC)
   */
  async _onRollSkill(event) {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data("item-id") || element.attr("data-item-id");
    if (!itemId) return;
    const skill = this.actor.items.get(itemId);
    if (!skill || skill.type !== "skill") return;
    const skillSystem = skill.system;
    const rating = skillSystem.rating || 0;
    const linkedAttribute = skillSystem.linkedAttribute || "strength";
    const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
    const skillRRSources = this.getRRSources("skill", skill.name);
    const attributeRRSources = this.getRRSources("attribute", linkedAttribute);
    const allRRSources = [...skillRRSources, ...attributeRRSources];
    handleRollRequest({
      itemType: "skill",
      itemName: skill.name,
      itemId: skill.id,
      itemRating: rating,
      skillName: skill.name,
      skillLevel: attributeValue + rating,
      // Total dice pool (attribute + rating)
      linkedAttribute,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: allRRSources
    });
  }
  /**
   * Handle rolling a specialization (NPC)
   */
  async _onRollSpecialization(event) {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data("item-id") || element.attr("data-item-id");
    if (!itemId) return;
    const specialization = this.actor.items.get(itemId);
    if (!specialization || specialization.type !== "specialization") return;
    const specSystem = specialization.system;
    const linkedAttribute = specSystem.linkedAttribute || "strength";
    const linkedSkillName = specSystem.linkedSkill;
    const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
    const linkedSkill = this.actor.items.find((i) => i.type === "skill" && i.name === linkedSkillName);
    const skillRating = linkedSkill ? linkedSkill.system.rating || 0 : 0;
    const effectiveRating = skillRating + 2;
    const specRRSources = this.getRRSources("specialization", specialization.name);
    const attributeRRSources = this.getRRSources("attribute", linkedAttribute);
    const skillRRSources = linkedSkillName ? this.getRRSources("skill", linkedSkillName) : [];
    const allRRSources = [...specRRSources, ...skillRRSources, ...attributeRRSources];
    handleRollRequest({
      itemType: "specialization",
      itemName: specialization.name,
      itemId: specialization.id,
      specName: specialization.name,
      specLevel: attributeValue + effectiveRating,
      // Total dice pool (attribute + effectiveRating)
      skillName: linkedSkillName,
      skillLevel: skillRating,
      // Just the skill rating (without attribute)
      linkedAttribute,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: allRRSources
    });
  }
  /**
   * Handle attack with threshold (NPC skill/spec without weapon)
   */
  async _onAttackThreshold(event) {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data("item-id") || element.attr("data-item-id");
    const threshold = element.data("threshold") || element.attr("data-threshold");
    const itemName = element.data("item-name") || element.attr("data-item-name");
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const itemSystem = item.system;
    const itemType = item.type;
    const linkedAttribute = itemSystem.linkedAttribute || "strength";
    const rrSources = this.getRRSources(itemType, item.name);
    handleRollRequest({
      itemType,
      itemName: itemName || item.name,
      itemId,
      itemRating: itemSystem.rating || 0,
      skillName: itemType === "skill" ? item.name : void 0,
      specName: itemType === "specialization" ? item.name : void 0,
      linkedAttribute,
      threshold: threshold ? parseInt(threshold) : void 0,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: rrSources
    });
  }
  /**
   * REMOVED: Defense roll prompt for NPC attack
   */
  async _promptDefenseRollForNPC(defenderActor, attackThreshold, attackName, defenderToken) {
    console.log("NPC defense prompt disabled", { defenderActor: defenderActor.name, attackThreshold, attackName });
  }
  /**
   * REMOVED: Defense roll against NPC attack
   */
  async _rollDefenseAgainstNPC(defenseItem, itemType, attackName, attackThreshold, defenderActor, defenderToken) {
    console.log("NPC defense roll disabled", { defenseItem: defenseItem.name, itemType, attackName, attackThreshold });
  }
  /**
   * REMOVED: NPC attack result display
   */
  async _displayNPCAttackResult(attackName, attackThreshold, defenseResult, defenderActor, defenderToken) {
    console.log("NPC attack result display disabled", { attackName, attackThreshold, defenderActor: defenderActor.name });
  }
  /**
   * Handle attacking with threshold (weapon)
   */
  async _onAttackThresholdWeapon(event) {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data("item-id") || element.attr("data-item-id");
    const threshold = element.data("threshold") || element.attr("data-threshold");
    const itemName = element.data("item-name") || element.attr("data-item-name");
    element.data("weapon-vd") || element.attr("data-weapon-vd") || "0";
    if (!itemId) return;
    const weapon = this.actor.items.get(itemId);
    if (!weapon || weapon.type !== "feat") return;
    const weaponSystem = weapon.system;
    const weaponType = weaponSystem.weaponType;
    let weaponLinkedSkill = "";
    let weaponLinkedSpecialization = "";
    let weaponLinkedDefenseSkill = "";
    let weaponLinkedDefenseSpecialization = "";
    if (weaponType && weaponType !== "custom-weapon") {
      const weaponStats = WEAPON_TYPES[weaponType];
      if (weaponStats) {
        weaponLinkedSkill = weaponStats.linkedSkill || "";
        weaponLinkedSpecialization = weaponStats.linkedSpecialization || "";
        weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || "";
        weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || "";
      }
    }
    const itemRRList = weaponSystem.rrList || [];
    const finalAttackSkill = weaponLinkedSkill || weaponSystem.linkedAttackSkill || "";
    const finalAttackSpec = weaponLinkedSpecialization || weaponSystem.linkedAttackSpecialization || "";
    const finalDefenseSkill = weaponLinkedDefenseSkill || weaponSystem.linkedDefenseSkill || "";
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || weaponSystem.linkedDefenseSpecialization || "";
    let attackSkillName = void 0;
    let attackSkillLevel = void 0;
    let attackSpecName = void 0;
    let attackSpecLevel = void 0;
    let attackLinkedAttribute = void 0;
    if (finalAttackSpec) {
      const foundSpec = this.actor.items.find(
        (i) => i.type === "specialization" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSpec)
      );
      if (foundSpec) {
        const specSystem = foundSpec.system;
        attackSpecName = foundSpec.name;
        attackLinkedAttribute = specSystem.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find(
            (i) => i.type === "skill" && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = parentSkill.system.rating || 0;
            attackSkillLevel = skillRating;
            attackSpecLevel = attributeValue + skillRating + 2;
          }
        }
      }
    }
    if (!attackSpecName && finalAttackSkill) {
      const foundSkill = this.actor.items.find(
        (i) => i.type === "skill" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSkill)
      );
      if (foundSkill) {
        attackSkillName = foundSkill.name;
        attackLinkedAttribute = foundSkill.system.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const skillRating = foundSkill.system.rating || 0;
        attackSkillLevel = attributeValue + skillRating;
      }
    }
    const baseDamageValue = weaponSystem.damageValue || "0";
    const damageValueBonus = weaponSystem.damageValueBonus || 0;
    let finalDamageValue = baseDamageValue;
    if (damageValueBonus > 0 && baseDamageValue !== "0") {
      if (baseDamageValue === "FOR") {
        finalDamageValue = `FOR+${damageValueBonus}`;
      } else if (baseDamageValue.startsWith("FOR+")) {
        const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
        finalDamageValue = `FOR+${baseModifier + damageValueBonus}`;
      } else if (baseDamageValue !== "toxin") {
        const baseValue = parseInt(baseDamageValue) || 0;
        finalDamageValue = (baseValue + damageValueBonus).toString();
      }
    }
    handleRollRequest({
      itemType: "weapon",
      weaponType,
      itemName: itemName || weapon.name,
      itemId,
      itemRating: weaponSystem.rating || 0,
      itemActive: weaponSystem.active,
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      isWeaponFocus: weaponSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,
      // FINAL damage value (base + bonus)
      damageValueBonus,
      meleeRange: weaponSystem.meleeRange,
      shortRange: weaponSystem.shortRange,
      mediumRange: weaponSystem.mediumRange,
      longRange: weaponSystem.longRange,
      // Attack skill/spec from actor (based on weapon links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      threshold: threshold ? parseInt(threshold) : void 0,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: itemRRList
    });
  }
  /**
   * Handle attacking with threshold (spell)
   */
  async _onAttackThresholdSpell(event) {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data("item-id") || element.attr("data-item-id");
    const threshold = element.data("threshold") || element.attr("data-threshold");
    const itemName = element.data("item-name") || element.attr("data-item-name");
    element.data("spell-vd") || element.attr("data-spell-vd") || "0";
    if (!itemId) return;
    const spell = this.actor.items.get(itemId);
    if (!spell || spell.type !== "feat") return;
    const spellSystem = spell.system;
    const weaponType = spellSystem.weaponType;
    let weaponLinkedSkill = "";
    let weaponLinkedSpecialization = "";
    let weaponLinkedDefenseSkill = "";
    let weaponLinkedDefenseSpecialization = "";
    if (weaponType && weaponType !== "custom-weapon") {
      const weaponStats = WEAPON_TYPES[weaponType];
      if (weaponStats) {
        weaponLinkedSkill = weaponStats.linkedSkill || "";
        weaponLinkedSpecialization = weaponStats.linkedSpecialization || "";
        weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || "";
        weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || "";
      }
    }
    const itemRRList = spellSystem.rrList || [];
    const finalAttackSkill = weaponLinkedSkill || spellSystem.linkedAttackSkill || "";
    const finalAttackSpec = weaponLinkedSpecialization || spellSystem.linkedAttackSpecialization || "";
    const finalDefenseSkill = weaponLinkedDefenseSkill || spellSystem.linkedDefenseSkill || "";
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || spellSystem.linkedDefenseSpecialization || "";
    let attackSkillName = "";
    let attackSkillLevel = 0;
    let attackSpecName = "";
    let attackSpecLevel = 0;
    let attackLinkedAttribute = "";
    if (finalAttackSpec) {
      const foundSpec = this.actor.items.find(
        (i) => i.type === "specialization" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSpec)
      );
      if (foundSpec) {
        const specSystem = foundSpec.system;
        attackSpecName = foundSpec.name;
        attackLinkedAttribute = specSystem.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find(
            (i) => i.type === "skill" && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = parentSkill.system.rating || 0;
            attackSkillLevel = skillRating;
            attackSpecLevel = attributeValue + skillRating + 2;
          }
        }
      }
    }
    if (!attackSpecName && finalAttackSkill) {
      const foundSkill = this.actor.items.find(
        (i) => i.type === "skill" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSkill)
      );
      if (foundSkill) {
        attackSkillName = foundSkill.name;
        attackLinkedAttribute = foundSkill.system.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const skillRating = foundSkill.system.rating || 0;
        attackSkillLevel = attributeValue + skillRating;
      }
    }
    const baseDamageValue = spellSystem.damageValue || "0";
    const damageValueBonus = spellSystem.damageValueBonus || 0;
    let finalDamageValue = baseDamageValue;
    if (damageValueBonus > 0 && baseDamageValue !== "0") {
      if (baseDamageValue === "FOR") {
        finalDamageValue = `FOR+${damageValueBonus}`;
      } else if (baseDamageValue.startsWith("FOR+")) {
        const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
        finalDamageValue = `FOR+${baseModifier + damageValueBonus}`;
      } else if (baseDamageValue !== "toxin") {
        const baseValue = parseInt(baseDamageValue) || 0;
        finalDamageValue = (baseValue + damageValueBonus).toString();
      }
    }
    handleRollRequest({
      itemType: "spell",
      weaponType,
      itemName: itemName || spell.name,
      itemId,
      itemRating: spellSystem.rating || 0,
      itemActive: spellSystem.active,
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      isWeaponFocus: spellSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,
      // FINAL damage value (base + bonus)
      damageValueBonus,
      meleeRange: spellSystem.meleeRange,
      shortRange: spellSystem.shortRange,
      mediumRange: spellSystem.mediumRange,
      longRange: spellSystem.longRange,
      // Attack skill/spec from actor (based on spell links)
      skillName: attackSkillName,
      skillLevel: attackSkillLevel,
      specName: attackSpecName,
      specLevel: attackSpecLevel,
      threshold: threshold ? parseInt(threshold) : void 0,
      actorId: this.actor.id,
      actorUuid: this.actor.uuid,
      actorName: this.actor.name,
      rrList: itemRRList
    });
  }
  /**
   * Handle rolling NPC weapon with dice
   */
  async _onRollNPCWeaponDice(event) {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data("item-id") || element.attr("data-item-id");
    element.data("weapon-vd") || element.attr("data-weapon-vd") || "0";
    if (!itemId) return;
    const weapon = this.actor.items.get(itemId);
    if (!weapon || weapon.type !== "feat") return;
    const weaponSystem = weapon.system;
    const weaponType = weaponSystem.weaponType;
    let weaponLinkedSkill = "";
    let weaponLinkedSpecialization = "";
    let weaponLinkedDefenseSkill = "";
    let weaponLinkedDefenseSpecialization = "";
    if (weaponType && weaponType !== "custom-weapon") {
      const weaponStats = WEAPON_TYPES[weaponType];
      if (weaponStats) {
        weaponLinkedSkill = weaponStats.linkedSkill || "";
        weaponLinkedSpecialization = weaponStats.linkedSpecialization || "";
        weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || "";
        weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || "";
      }
    }
    const itemRRList = weaponSystem.rrList || [];
    const finalAttackSkill = weaponLinkedSkill || weaponSystem.linkedAttackSkill || "";
    const finalAttackSpec = weaponLinkedSpecialization || weaponSystem.linkedAttackSpecialization || "";
    const finalDefenseSkill = weaponLinkedDefenseSkill || weaponSystem.linkedDefenseSkill || "";
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || weaponSystem.linkedDefenseSpecialization || "";
    let attackSkillName = void 0;
    let attackSkillLevel = void 0;
    let attackSpecName = void 0;
    let attackSpecLevel = void 0;
    let attackLinkedAttribute = void 0;
    if (finalAttackSpec) {
      const foundSpec = this.actor.items.find(
        (i) => i.type === "specialization" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSpec)
      );
      if (foundSpec) {
        const specSystem = foundSpec.system;
        attackSpecName = foundSpec.name;
        attackLinkedAttribute = specSystem.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find(
            (i) => i.type === "skill" && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = parentSkill.system.rating || 0;
            attackSkillLevel = skillRating;
            attackSpecLevel = attributeValue + skillRating + 2;
          }
        }
      }
    }
    if (!attackSpecName && finalAttackSkill) {
      const foundSkill = this.actor.items.find(
        (i) => i.type === "skill" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSkill)
      );
      if (foundSkill) {
        attackSkillName = foundSkill.name;
        attackLinkedAttribute = foundSkill.system.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const skillRating = foundSkill.system.rating || 0;
        attackSkillLevel = attributeValue + skillRating;
      }
    }
    const baseDamageValue = weaponSystem.damageValue || "0";
    const damageValueBonus = weaponSystem.damageValueBonus || 0;
    let finalDamageValue = baseDamageValue;
    if (damageValueBonus > 0 && baseDamageValue !== "0") {
      if (baseDamageValue === "FOR") {
        finalDamageValue = `FOR+${damageValueBonus}`;
      } else if (baseDamageValue.startsWith("FOR+")) {
        const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
        finalDamageValue = `FOR+${baseModifier + damageValueBonus}`;
      } else if (baseDamageValue !== "toxin") {
        const baseValue = parseInt(baseDamageValue) || 0;
        finalDamageValue = (baseValue + damageValueBonus).toString();
      }
    }
    handleRollRequest({
      itemType: "weapon",
      weaponType,
      itemName: weapon.name,
      itemId,
      itemRating: weaponSystem.rating || 0,
      itemActive: weaponSystem.active,
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      isWeaponFocus: weaponSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,
      // FINAL damage value (base + bonus)
      damageValueBonus,
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
  async _onRollNPCSpellDice(event) {
    event.preventDefault();
    const element = $(event.currentTarget);
    const itemId = element.data("item-id") || element.attr("data-item-id");
    element.data("spell-vd") || element.attr("data-spell-vd") || "0";
    if (!itemId) return;
    const spell = this.actor.items.get(itemId);
    if (!spell || spell.type !== "feat") return;
    const spellSystem = spell.system;
    const weaponType = spellSystem.weaponType;
    let weaponLinkedSkill = "";
    let weaponLinkedSpecialization = "";
    let weaponLinkedDefenseSkill = "";
    let weaponLinkedDefenseSpecialization = "";
    if (weaponType && weaponType !== "custom-weapon") {
      const weaponStats = WEAPON_TYPES[weaponType];
      if (weaponStats) {
        weaponLinkedSkill = weaponStats.linkedSkill || "";
        weaponLinkedSpecialization = weaponStats.linkedSpecialization || "";
        weaponLinkedDefenseSkill = weaponStats.linkedDefenseSkill || "";
        weaponLinkedDefenseSpecialization = weaponStats.linkedDefenseSpecialization || "";
      }
    }
    const itemRRList = spellSystem.rrList || [];
    const finalAttackSkill = weaponLinkedSkill || spellSystem.linkedAttackSkill || "";
    const finalAttackSpec = weaponLinkedSpecialization || spellSystem.linkedAttackSpecialization || "";
    const finalDefenseSkill = weaponLinkedDefenseSkill || spellSystem.linkedDefenseSkill || "";
    const finalDefenseSpec = weaponLinkedDefenseSpecialization || spellSystem.linkedDefenseSpecialization || "";
    let attackSkillName = "";
    let attackSkillLevel = 0;
    let attackSpecName = "";
    let attackSpecLevel = 0;
    let attackLinkedAttribute = "";
    if (finalAttackSpec) {
      const foundSpec = this.actor.items.find(
        (i) => i.type === "specialization" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSpec)
      );
      if (foundSpec) {
        const specSystem = foundSpec.system;
        attackSpecName = foundSpec.name;
        attackLinkedAttribute = specSystem.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const linkedSkillName = specSystem.linkedSkill;
        if (linkedSkillName) {
          const parentSkill = this.actor.items.find(
            (i) => i.type === "skill" && i.name === linkedSkillName
          );
          if (parentSkill) {
            attackSkillName = parentSkill.name;
            const skillRating = parentSkill.system.rating || 0;
            attackSkillLevel = skillRating;
            attackSpecLevel = attributeValue + skillRating + 2;
          }
        }
      }
    }
    if (!attackSpecName && finalAttackSkill) {
      const foundSkill = this.actor.items.find(
        (i) => i.type === "skill" && normalizeSearchText(i.name) === normalizeSearchText(finalAttackSkill)
      );
      if (foundSkill) {
        attackSkillName = foundSkill.name;
        attackLinkedAttribute = foundSkill.system.linkedAttribute || "strength";
        const attributeValue = attackLinkedAttribute ? this.actor.system.attributes?.[attackLinkedAttribute] || 0 : 0;
        const skillRating = foundSkill.system.rating || 0;
        attackSkillLevel = attributeValue + skillRating;
      }
    }
    const baseDamageValue = spellSystem.damageValue || "0";
    const damageValueBonus = spellSystem.damageValueBonus || 0;
    let finalDamageValue = baseDamageValue;
    if (damageValueBonus > 0 && baseDamageValue !== "0") {
      if (baseDamageValue === "FOR") {
        finalDamageValue = `FOR+${damageValueBonus}`;
      } else if (baseDamageValue.startsWith("FOR+")) {
        const baseModifier = parseInt(baseDamageValue.substring(4)) || 0;
        finalDamageValue = `FOR+${baseModifier + damageValueBonus}`;
      } else if (baseDamageValue !== "toxin") {
        const baseValue = parseInt(baseDamageValue) || 0;
        finalDamageValue = (baseValue + damageValueBonus).toString();
      }
    }
    handleRollRequest({
      itemType: "spell",
      weaponType,
      itemName: spell.name,
      itemId,
      itemRating: spellSystem.rating || 0,
      itemActive: spellSystem.active,
      linkedAttackSkill: finalAttackSkill,
      linkedAttackSpecialization: finalAttackSpec,
      linkedDefenseSkill: finalDefenseSkill,
      linkedDefenseSpecialization: finalDefenseSpec,
      linkedAttribute: attackLinkedAttribute,
      isWeaponFocus: spellSystem.isWeaponFocus || false,
      damageValue: finalDamageValue,
      // FINAL damage value (base + bonus)
      damageValueBonus,
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
  async _rollNPCWeaponOrSpellWithDice(item, type, weaponVD) {
    console.log("NPC weapon/spell dice roll disabled", { item: item.name, type, weaponVD });
  }
  /**
   * REMOVED: Skill with weapon roll for NPC
   */
  async _rollSkillWithWeapon(skill, weaponName, skillType, weaponDamageValue, weapon) {
    console.log("NPC skill with weapon roll disabled", { skill: skill.name, weaponName, skillType });
  }
  /**
   * REMOVED: Attack with defense system for NPC
   */
  async _rollAttackWithDefenseNPC(skillName, dicePool, riskDice = 0, riskReduction = 0, rollMode = "normal", weaponDamageValue, attackingWeapon) {
    console.log("NPC attack with defense disabled", { skillName, dicePool, riskDice, riskReduction, rollMode });
  }
  /**
   * REMOVED: Display roll result with VD
   */
  async _displayRollResultWithVD(skillName, rollResult, weaponDamageValue, damageValueBonus) {
    console.log("NPC roll result display disabled", { skillName, weaponDamageValue });
  }
  /**
   * REMOVED: Defense roll prompt with attack result
   */
  async _promptDefenseRollWithAttackResult(defenderActor, attackResult, attackName, weaponDamageValue, attackingWeapon, damageValueBonus, defenderToken) {
    console.log("Defense roll prompt with attack result disabled", { defenderActor: defenderActor.name, attackName });
  }
  /**
   * REMOVED: Defense roll prompt with VD
   */
  async _promptDefenseRollWithVD(defenderActor, attackThreshold, attackName, weaponDamageValue, attackingWeapon, defenderToken) {
    console.log("Defense roll prompt with VD disabled", { defenderActor: defenderActor.name, attackName, weaponDamageValue });
  }
  /**
   * REMOVED: Threshold defense against dice attack
   */
  async _defendWithThresholdAgainstDiceAttack(defenseItem, threshold, attackName, attackResult, defenderActor, weaponDamageValue, damageValueBonus, defenderToken) {
    console.log("Threshold defense against dice attack disabled", { defenseItem: defenseItem.name, threshold, attackName });
  }
  /**
   * REMOVED: Defense roll against NPC dice attack
   */
  async _rollDefenseAgainstNPCDiceAttack(defenseItem, itemType, attackName, attackResult, defenderActor, weaponDamageValue, damageValueBonus, defenderToken) {
    console.log("Defense roll against NPC dice attack disabled", { defenseItem: defenseItem.name, itemType, attackName });
  }
  /**
   * REMOVED: NPC dice attack result display
   */
  async _displayNPCDiceAttackResult(attackName, attackResult, defenseResult, defenderActor, weaponDamageValue, damageValueBonus, defenderToken) {
    console.log("NPC dice attack result display disabled", { attackName, defenderActor: defenderActor.name, weaponDamageValue });
  }
  /**
   * REMOVED: Threshold defense against weapon attack
   */
  async _defendWithThresholdAgainstWeapon(defenseItem, threshold, attackName, attackThreshold, defenderActor, weaponDamageValue, damageValueBonus, defenderToken) {
    console.log("Threshold defense against weapon attack disabled", { defenseItem: defenseItem.name, threshold, attackName });
  }
  /**
   * REMOVED: Defense roll against NPC weapon attack
   */
  async _rollDefenseAgainstNPCWeapon(defenseItem, itemType, attackName, attackThreshold, defenderActor, weaponDamageValue, damageValueBonus, defenderToken) {
    console.log("Defense roll against NPC weapon attack disabled", { defenseItem: defenseItem.name, itemType, attackName });
  }
  /**
   * REMOVED: NPC weapon attack result display
   */
  async _displayNPCWeaponAttackResult(attackName, attackThreshold, defenseResult, defenderActor, weaponDamageValue, damageValueBonus, defenderToken) {
    console.log("NPC weapon attack result display disabled", { attackName, attackThreshold, defenderActor: defenderActor.name });
  }
  /**
   * Get RR sources from active feats
   */
  getRRSources(itemType, itemName) {
    return getRRSources(this.actor, itemType, itemName);
  }
  /**
   * REMOVED: Skill dice rolling logic
   */
  async _rollSkillDice(skillName, dicePool, riskDice = 0, riskReduction = 0, rollMode = "normal") {
    console.log("NPC dice roll disabled", { skillName, dicePool, riskDice, riskReduction, rollMode });
  }
  /**
   * Show item browser dialog
   */
  async _showItemBrowser(itemType) {
    const items = game.items.filter((item) => item.type === itemType);
    const itemOptions = items.map((item) => {
      return `<option value="${item.id}">${item.name}</option>`;
    }).join("");
    const content = `
      <div class="form-group">
        <label>${game.i18n.localize(`SRA2.${itemType.toUpperCase()}S.WORLD_ITEMS`)}</label>
        <select id="item-select" style="width: 100%;">
          <option value="">${game.i18n.localize(`SRA2.${itemType.toUpperCase()}S.SEARCH_PLACEHOLDER`)}</option>
          ${itemOptions}
        </select>
      </div>
    `;
    new Dialog({
      title: game.i18n.localize(`SRA2.${itemType.toUpperCase()}S.ADD_${itemType.toUpperCase()}`),
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: game.i18n.localize(`SRA2.${itemType.toUpperCase()}S.ADD_${itemType.toUpperCase()}`),
          callback: async (html) => {
            const itemId = html.find("#item-select").val();
            if (itemId) {
              const item = game.items.get(itemId);
              if (item) {
                await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
              }
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      },
      default: "add"
    }).render(true);
  }
  async _onDropItem(_event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;
    const existingItem = this.actor.items.find((i) => i.name === item.name && i.type === item.type);
    if (existingItem) {
      ui.notifications.warn(game.i18n.format("SRA2.ALREADY_EXISTS", { name: item.name }));
      return false;
    }
    return await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }
}
class FeatSheet extends ItemSheet {
  /** Track the currently active section */
  _activeSection = "general";
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "item", "feat"],
      template: "systems/sra2/templates/item-feat-sheet.hbs",
      width: 720,
      height: 680,
      tabs: [],
      dragDrop: [
        { dropSelector: ".rr-target-drop-zone" }
      ],
      submitOnChange: true
    });
  }
  getData() {
    const context = super.getData();
    this.item.prepareData();
    context.system = this.item.system;
    context.activeSection = this._activeSection;
    context.finalDamageValue = this._calculateFinalDamageValue();
    context.finalVehicleStats = this._calculateFinalVehicleStats();
    context.rrEntries = [];
    const rrList = context.system.rrList || [];
    for (let i = 0; i < rrList.length; i++) {
      const rrEntry = rrList[i];
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || "";
      const entry = {
        index: i,
        rrType,
        rrValue,
        rrTarget,
        rrTargetName: rrTarget
      };
      if (rrType === "skill" || rrType === "specialization") {
        entry.rrTargetType = rrType === "skill" ? game.i18n.localize("SRA2.FEATS.RR_TYPE.SKILL") : game.i18n.localize("SRA2.FEATS.RR_TYPE.SPECIALIZATION");
        if (this.item.actor && rrTarget) {
          const targetItem = this.item.actor.items.find(
            (i2) => i2.type === rrType && i2.name === rrTarget
          );
          if (!targetItem) {
            entry.rrTargetNotFound = true;
          }
        }
      }
      context.rrEntries.push(entry);
    }
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="add-rr-entry"]').on("click", this._onAddRREntry.bind(this));
    html.find('[data-action="remove-rr-entry"]').on("click", this._onRemoveRREntry.bind(this));
    html.find('[data-action="clear-rr-target"]').on("click", this._onClearRRTarget.bind(this));
    html.find('[data-action="add-narrative-effect"]').on("click", this._onAddNarrativeEffect.bind(this));
    html.find('[data-action="remove-narrative-effect"]').on("click", this._onRemoveNarrativeEffect.bind(this));
    html.find('[data-action="select-weapon-type"]').on("change", this._onWeaponTypeChange.bind(this));
    html.find('[data-action="select-vehicle-type"]').on("change", this._onVehicleTypeChange.bind(this));
    html.find(".damage-bonus-checkbox").on("change", this._onDamageValueBonusChange.bind(this));
    html.find(".sustained-spell-checkbox").on("change", this._onSustainedSpellChange.bind(this));
    html.find(".summoned-spirit-checkbox").on("change", this._onSummonedSpiritChange.bind(this));
    html.find('.range-improvement-checkbox input[type="checkbox"]').on("change", this._onRangeImprovementChange.bind(this));
    html.find(".section-nav .nav-item").on("click", this._onSectionNavigation.bind(this));
    html.find(".rr-target-search-input").on("input", this._onRRTargetSearch.bind(this));
    html.find(".rr-target-search-input").on("focus", this._onRRTargetSearchFocus.bind(this));
    html.find(".rr-target-search-input").on("blur", this._onRRTargetSearchBlur.bind(this));
    $(document).on("click.rr-target-search", (event) => {
      const target = event.target;
      const searchContainers = html.find(".rr-target-search-container");
      searchContainers.each((_, container) => {
        if (!container.contains(target)) {
          $(container).find(".rr-target-search-results").hide();
        }
      });
    });
  }
  /**
   * Handle section navigation
   */
  _onSectionNavigation(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const section = button.dataset.section;
    if (!section) return;
    this._activeSection = section;
    if (!this.form) return;
    const form = $(this.form);
    form.find(".section-nav .nav-item").removeClass("active");
    button.classList.add("active");
    form.find(".content-section").removeClass("active");
    form.find(`[data-section-content="${section}"]`).addClass("active");
  }
  /**
   * Handle adding a new RR entry
   */
  async _onAddRREntry(event) {
    event.preventDefault();
    const rrList = [...this.item.system.rrList || []];
    rrList.push({
      rrType: "skill",
      rrValue: 0,
      rrTarget: ""
    });
    await this.item.update({
      "system.rrList": rrList
    });
    this.render(false);
  }
  /**
   * Handle removing an RR entry
   */
  async _onRemoveRREntry(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index || "0");
    const rrList = [...this.item.system.rrList || []];
    rrList.splice(index, 1);
    await this.item.update({
      "system.rrList": rrList
    });
    this.render(false);
  }
  /**
   * Handle clearing the RR target for a specific entry
   */
  async _onClearRRTarget(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index || "0");
    const rrList = [...this.item.system.rrList || []];
    if (rrList[index]) {
      rrList[index] = { ...rrList[index], rrTarget: "" };
    }
    await this.item.update({ "system.rrList": rrList });
    this.render(false);
  }
  /**
   * Handle dropping a skill or specialization onto the RR target field
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data && data.type === "Item") {
      const item = await Item.implementation.fromDropData(data);
      if (!item) return super._onDrop(event);
      const dropZone = event.target.closest("[data-rr-index]");
      if (!dropZone) return super._onDrop(event);
      const index = parseInt(dropZone.dataset.rrIndex || "0");
      const rrList = [...this.item.system.rrList || []];
      const rrType = rrList[index]?.rrType;
      if (item.type === "skill" && rrType === "skill") {
        rrList[index] = { ...rrList[index], rrTarget: item.name };
        await this.item.update({ "system.rrList": rrList });
        this.render(false);
        ui.notifications?.info(game.i18n.format("SRA2.FEATS.LINKED_TO_TARGET", { name: item.name }));
        return;
      } else if (item.type === "specialization" && rrType === "specialization") {
        rrList[index] = { ...rrList[index], rrTarget: item.name };
        await this.item.update({ "system.rrList": rrList });
        this.render(false);
        ui.notifications?.info(game.i18n.format("SRA2.FEATS.LINKED_TO_TARGET", { name: item.name }));
        return;
      } else if (rrType === "skill" || rrType === "specialization") {
        ui.notifications?.warn(game.i18n.localize("SRA2.FEATS.WRONG_TARGET_TYPE"));
        return;
      }
    }
    return super._onDrop(event);
  }
  /**
   * Handle adding a new narrative effect
   */
  async _onAddNarrativeEffect(event) {
    event.preventDefault();
    const narrativeEffects = [...this.item.system.narrativeEffects || []];
    narrativeEffects.push({
      text: "",
      isNegative: false
    });
    await this.item.update({
      "system.narrativeEffects": narrativeEffects
    });
    this.render(false);
  }
  /**
   * Handle removing a narrative effect
   */
  async _onRemoveNarrativeEffect(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index || "0");
    const narrativeEffects = [...this.item.system.narrativeEffects || []];
    narrativeEffects.splice(index, 1);
    await this.item.update({
      "system.narrativeEffects": narrativeEffects
    });
    this.render(false);
  }
  /**
   * Calculate the final damage value taking into account STRENGTH attribute
   */
  _calculateFinalDamageValue() {
    const damageValue = this.item.system.damageValue || "0";
    const damageValueBonus = this.item.system.damageValueBonus || 0;
    const strength = this.item.actor ? this.item.actor.system?.attributes?.strength || 0 : 0;
    if (damageValue === "FOR") {
      const total = strength + damageValueBonus;
      if (!this.item.actor) {
        return damageValueBonus > 0 ? `FOR+${damageValueBonus}` : "FOR";
      }
      return `${total} (FOR${damageValueBonus > 0 ? `+${damageValueBonus}` : ""})`;
    } else if (damageValue.startsWith("FOR+")) {
      const modifier = parseInt(damageValue.substring(4)) || 0;
      const total = strength + modifier + damageValueBonus;
      if (!this.item.actor) {
        return damageValueBonus > 0 ? `FOR+${modifier}+${damageValueBonus}` : `FOR+${modifier}`;
      }
      return `${total} (FOR+${modifier}${damageValueBonus > 0 ? `+${damageValueBonus}` : ""})`;
    } else if (damageValue === "toxin") {
      return "selon toxine";
    } else {
      const base = parseInt(damageValue) || 0;
      const total = base + damageValueBonus;
      if (damageValueBonus > 0) {
        return `${total} (${base}+${damageValueBonus})`;
      }
      return total.toString();
    }
  }
  /**
   * Handle weapon type selection change
   */
  async _onWeaponTypeChange(event) {
    event.preventDefault();
    const weaponType = event.currentTarget.value;
    if (!weaponType || !WEAPON_TYPES[weaponType]) {
      return;
    }
    const weaponStats = WEAPON_TYPES[weaponType];
    const damageValue = typeof weaponStats.vd === "number" ? weaponStats.vd.toString() : weaponStats.vd;
    await this.item.update({
      "system.weaponType": weaponType,
      "system.damageValue": damageValue,
      "system.meleeRange": weaponStats.melee,
      "system.shortRange": weaponStats.short,
      "system.mediumRange": weaponStats.medium,
      "system.longRange": weaponStats.long
    });
    this.render(false);
  }
  /**
   * Handle vehicle type selection change
   */
  async _onVehicleTypeChange(event) {
    event.preventDefault();
    const vehicleType = event.currentTarget.value;
    if (!vehicleType || !VEHICLE_TYPES[vehicleType]) {
      return;
    }
    const vehicleStats = VEHICLE_TYPES[vehicleType];
    await this.item.update({
      "system.vehicleType": vehicleType,
      "system.autopilot": vehicleStats.autopilot,
      "system.structure": vehicleStats.structure,
      "system.handling": vehicleStats.handling,
      "system.speed": vehicleStats.speed,
      "system.flyingSpeed": vehicleStats.flyingSpeed,
      "system.armor": vehicleStats.armor,
      "system.weaponMount": vehicleStats.weaponMount
    });
    this.render(false);
  }
  /**
   * Calculate the final vehicle stats taking into account bonuses
   */
  _calculateFinalVehicleStats() {
    const baseAutopilot = this.item.system.autopilot || 6;
    const baseStructure = this.item.system.structure || 2;
    const baseHandling = this.item.system.handling || 5;
    const baseSpeed = this.item.system.speed || 3;
    const baseFlyingSpeed = this.item.system.flyingSpeed || 0;
    const baseArmor = this.item.system.armor || 0;
    const autopilotBonus = this.item.system.autopilotBonus || 0;
    const speedBonus = this.item.system.speedBonus || 0;
    const handlingBonus = this.item.system.handlingBonus || 0;
    const armorBonus = this.item.system.armorBonus || 0;
    const isFlying = this.item.system.isFlying || false;
    const isFixed = this.item.system.isFixed || false;
    const finalAutopilot = Math.min(12, baseAutopilot + autopilotBonus);
    const finalHandling = baseHandling + handlingBonus;
    const finalSpeed = isFixed ? 0 : baseSpeed + speedBonus;
    const finalFlyingSpeed = isFlying ? baseFlyingSpeed > 0 ? baseFlyingSpeed : 1 : 0;
    const finalArmor = Math.min(baseStructure, baseArmor + armorBonus);
    return {
      autopilot: finalAutopilot,
      structure: baseStructure,
      handling: finalHandling,
      speed: finalSpeed,
      flyingSpeed: finalFlyingSpeed,
      armor: finalArmor
    };
  }
  /**
   * Handle damage value bonus checkbox changes
   */
  _onDamageValueBonusChange(event) {
    event.preventDefault();
    const checkbox = event.currentTarget;
    const value = parseInt(checkbox.dataset.bonusValue || "0");
    const currentBonus = this.item.system.damageValueBonus || 0;
    let newBonus;
    if (checkbox.checked) {
      newBonus = value;
    } else {
      if (value === 2 && currentBonus === 2) {
        newBonus = 1;
      } else if (value === 1 && currentBonus >= 1) {
        newBonus = 0;
      } else {
        newBonus = currentBonus;
      }
    }
    const hiddenInput = this.element.find('input[name="system.damageValueBonus"]')[0];
    if (hiddenInput) {
      hiddenInput.value = newBonus.toString();
    }
    const checkboxes = this.element.find(".damage-bonus-checkbox");
    checkboxes.each((_, cb) => {
      const cbElement = cb;
      const cbValue = parseInt(cbElement.dataset.bonusValue || "0");
      if (cbValue === 1) {
        cbElement.checked = newBonus >= 1;
      } else if (cbValue === 2) {
        cbElement.checked = newBonus === 2;
      }
    });
  }
  /**
   * Handle sustained spell checkbox changes
   */
  _onSustainedSpellChange(event) {
    event.preventDefault();
    const checkbox = event.currentTarget;
    const value = parseInt(checkbox.dataset.spellValue || "0");
    const currentCount = this.item.system.sustainedSpellCount || 0;
    let newCount;
    if (checkbox.checked) {
      newCount = value;
    } else {
      if (value === 2 && currentCount === 2) {
        newCount = 1;
      } else if (value === 1 && currentCount >= 1) {
        newCount = 0;
      } else {
        newCount = currentCount;
      }
    }
    const hiddenInput = this.element.find('input[name="system.sustainedSpellCount"]')[0];
    if (hiddenInput) {
      hiddenInput.value = newCount.toString();
    }
    const checkboxes = this.element.find(".sustained-spell-checkbox");
    checkboxes.each((_, cb) => {
      const cbElement = cb;
      const cbValue = parseInt(cbElement.dataset.spellValue || "0");
      if (cbValue === 1) {
        cbElement.checked = newCount >= 1;
      } else if (cbValue === 2) {
        cbElement.checked = newCount === 2;
      }
    });
  }
  /**
   * Handle summoned spirit checkbox change
   */
  _onSummonedSpiritChange(event) {
    event.preventDefault();
    const checkbox = event.currentTarget;
    const newCount = checkbox.checked ? 1 : 0;
    const hiddenInput = this.element.find('input[name="system.summonedSpiritCount"]')[0];
    if (hiddenInput) {
      hiddenInput.value = newCount.toString();
    }
  }
  /**
   * Handle range improvement checkbox change
   * When checked, automatically improves the range: none -> disadvantage, disadvantage -> ok
   * When unchecked, automatically downgrades the range: ok -> disadvantage, disadvantage -> none
   */
  _onRangeImprovementChange(event) {
    event.preventDefault();
    const checkbox = event.currentTarget;
    const isChecked = checkbox.checked;
    const rangeRow = checkbox.closest(".range-row");
    if (!rangeRow) return;
    const select = rangeRow.querySelector("select");
    if (!select) return;
    const rangeLabel = rangeRow.querySelector(".range-label")?.textContent || "";
    let fieldName = "";
    if (rangeLabel.includes("Contact") || rangeLabel.includes("Melee") || rangeLabel.includes("Mêlée")) {
      fieldName = "system.meleeRange";
    } else if (rangeLabel.includes("Courte") || rangeLabel.includes("Short")) {
      fieldName = "system.shortRange";
    } else if (rangeLabel.includes("Moyenne") || rangeLabel.includes("Medium")) {
      fieldName = "system.mediumRange";
    } else if (rangeLabel.includes("Longue") || rangeLabel.includes("Long")) {
      fieldName = "system.longRange";
    }
    const currentValue = select.value;
    let newValue = currentValue;
    if (isChecked) {
      if (currentValue === "none") {
        newValue = "disadvantage";
      } else if (currentValue === "disadvantage") {
        newValue = "ok";
      }
    } else {
      if (currentValue === "ok") {
        newValue = "disadvantage";
      } else if (currentValue === "disadvantage") {
        newValue = "none";
      }
    }
    select.value = newValue;
    const hiddenInput = this.element.find(`input[name="${fieldName}"]`)[0];
    if (hiddenInput) {
      hiddenInput.value = newValue;
    }
  }
  /**
   * Handle RR target search input
   */
  rrTargetSearchTimeout = null;
  async _onRRTargetSearch(event) {
    const input = event.currentTarget;
    const searchTerm = normalizeSearchText(input.value.trim());
    const rrIndex = parseInt(input.dataset.rrIndex || "0");
    const resultsDiv = $(input).siblings(".rr-target-search-results")[0];
    if (this.rrTargetSearchTimeout) {
      clearTimeout(this.rrTargetSearchTimeout);
    }
    if (searchTerm.length === 0) {
      resultsDiv.style.display = "none";
      return;
    }
    this.rrTargetSearchTimeout = setTimeout(async () => {
      await this._performRRTargetSearch(searchTerm, rrIndex, resultsDiv);
    }, 300);
  }
  /**
   * Perform the actual RR target search in actor items and compendiums
   */
  async _performRRTargetSearch(searchTerm, rrIndex, resultsDiv) {
    const results = [];
    const rrList = this.item.system.rrList || [];
    const rrType = rrList[rrIndex]?.rrType;
    if (!rrType || rrType === "attribute") {
      resultsDiv.style.display = "none";
      return;
    }
    if (this.item.actor) {
      for (const item of this.item.actor.items) {
        if (item.type === rrType && normalizeSearchText(item.name).includes(searchTerm)) {
          results.push({
            name: item.name,
            uuid: item.uuid,
            source: game.i18n.localize("SRA2.FEATS.FROM_ACTOR"),
            type: rrType
          });
        }
      }
    }
    if (game.items) {
      for (const item of game.items) {
        if (item.type === rrType && normalizeSearchText(item.name).includes(searchTerm)) {
          const exists = results.some((r) => r.name === item.name);
          if (!exists) {
            results.push({
              name: item.name,
              uuid: item.uuid,
              source: game.i18n.localize("SRA2.SKILLS.WORLD_ITEMS"),
              type: rrType
            });
          }
        }
      }
    }
    for (const pack of game.packs) {
      if (pack.documentName !== "Item") continue;
      const documents2 = await pack.getDocuments();
      for (const doc of documents2) {
        if (doc.type === rrType && normalizeSearchText(doc.name).includes(searchTerm)) {
          const exists = results.some((r) => r.name === doc.name);
          if (!exists) {
            results.push({
              name: doc.name,
              uuid: doc.uuid,
              source: pack.title,
              type: rrType
            });
          }
        }
      }
    }
    this._displayRRTargetSearchResults(results, rrIndex, resultsDiv);
  }
  /**
   * Display RR target search results
   */
  _displayRRTargetSearchResults(results, rrIndex, resultsDiv) {
    let html = "";
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results">
          <div class="no-results-text">
            ${game.i18n.localize("SRA2.SKILLS.SEARCH_NO_RESULTS")}
          </div>
        </div>
      `;
    } else {
      for (const result of results) {
        const typeLabel = result.type === "skill" ? game.i18n.localize("SRA2.FEATS.RR_TYPE.SKILL") : game.i18n.localize("SRA2.FEATS.RR_TYPE.SPECIALIZATION");
        html += `
          <div class="search-result-item" data-result-name="${result.name}" data-rr-index="${rrIndex}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source} - ${typeLabel}</span>
            </div>
            <button class="add-rr-target-btn" data-target-name="${result.name}" data-rr-index="${rrIndex}">
              ${game.i18n.localize("SRA2.FEATS.SELECT")}
            </button>
          </div>
        `;
      }
    }
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = "block";
    $(resultsDiv).find(".add-rr-target-btn").on("click", this._onSelectRRTarget.bind(this));
    $(resultsDiv).find(".search-result-item:not(.no-results)").on("click", (event) => {
      if ($(event.target).closest(".add-rr-target-btn").length > 0) return;
      const button = $(event.currentTarget).find(".add-rr-target-btn")[0];
      if (button) {
        $(button).trigger("click");
      }
    });
  }
  /**
   * Handle selecting an RR target from search results
   */
  async _onSelectRRTarget(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const targetName = button.dataset.targetName;
    const rrIndex = parseInt(button.dataset.rrIndex || "0");
    if (!targetName) return;
    const rrList = [...this.item.system.rrList || []];
    if (rrList[rrIndex]) {
      rrList[rrIndex] = { ...rrList[rrIndex], rrTarget: targetName };
    }
    await this.item.update({ "system.rrList": rrList });
    this.render(false);
    ui.notifications?.info(game.i18n.format("SRA2.FEATS.LINKED_TO_TARGET", { name: targetName }));
  }
  /**
   * Handle RR target search focus
   */
  _onRRTargetSearchFocus(event) {
    const input = event.currentTarget;
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings(".rr-target-search-results")[0];
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = "block";
      }
    }
  }
  /**
   * Handle RR target search blur
   */
  _onRRTargetSearchBlur(event) {
    const input = event.currentTarget;
    const blurEvent = event;
    setTimeout(() => {
      const resultsDiv = $(input).siblings(".rr-target-search-results")[0];
      if (resultsDiv) {
        const relatedTarget = blurEvent.relatedTarget;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          return;
        }
        const activeElement = document.activeElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          return;
        }
        resultsDiv.style.display = "none";
      }
    }, 200);
  }
  async close(options) {
    $(document).off("click.rr-target-search");
    return super.close(options);
  }
  async _updateObject(_event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    if (expandedData.system?.isFirstFeat === true && expandedData.system?.featType === "trait" && this.item.actor) {
      const otherFirstFeats = this.item.actor.items.filter(
        (item) => item.type === "feat" && item.id !== this.item.id && item.system?.featType === "trait" && item.system?.isFirstFeat === true
      );
      if (otherFirstFeats.length > 0) {
        for (const otherFeat of otherFirstFeats) {
          await otherFeat.update({
            "system.isFirstFeat": false
          });
        }
        ui.notifications?.info(
          game.i18n.localize("SRA2.FEATS.FIRST_FEAT_TRANSFERRED") || 'The "first trait" flag has been moved from the other trait(s) to this one.'
        );
      }
    }
    await this.item.update(expandedData);
    this.item.prepareData();
    const recommendedLevel = this.item.system.recommendedLevel || 0;
    const currentRating = this.item.system.rating || 0;
    if (currentRating !== recommendedLevel) {
      await this.item.update({
        "system.rating": recommendedLevel
      });
    }
    return this.item;
  }
}
class SkillSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "item", "skill"],
      template: "systems/sra2/templates/item-skill-sheet.hbs",
      width: 520,
      height: 480,
      tabs: [],
      submitOnChange: true
    });
  }
  getData() {
    const context = super.getData();
    context.system = this.item.system;
    return context;
  }
  async _updateObject(_event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    return this.item.update(expandedData);
  }
}
class SpecializationSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "item", "specialization"],
      template: "systems/sra2/templates/item-specialization-sheet.hbs",
      width: 520,
      height: 480,
      tabs: [],
      dragDrop: [
        { dropSelector: ".linked-skill-drop-zone" }
      ],
      submitOnChange: true
    });
  }
  getData() {
    const context = super.getData();
    context.system = this.item.system;
    if (context.system.linkedSkill) {
      context.linkedSkillName = context.system.linkedSkill;
      if (this.item.actor) {
        const linkedSkill = this.item.actor.items.find(
          (i) => i.type === "skill" && i.name === context.system.linkedSkill
        );
        if (!linkedSkill) {
          context.linkedSkillNotFound = true;
        }
      }
    }
    if (this.item.actor) {
      const skills = this.item.actor.items.filter((i) => i.type === "skill");
      context.skills = skills.map((s) => ({
        name: s.name
      }));
    } else {
      context.skills = [];
    }
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="clear-linked-skill"]').on("click", this._onClearLinkedSkill.bind(this));
    html.find(".skill-search-input").on("input", this._onSkillSearch.bind(this));
    html.find(".skill-search-input").on("focus", this._onSkillSearchFocus.bind(this));
    html.find(".skill-search-input").on("blur", this._onSkillSearchBlur.bind(this));
    $(document).on("click.skill-search-spec", (event) => {
      const target = event.target;
      const skillSearchContainer = html.find(".skill-search-container")[0];
      if (skillSearchContainer && !skillSearchContainer.contains(target)) {
        html.find(".skill-search-results").hide();
      }
    });
  }
  async close(options) {
    $(document).off("click.skill-search-spec");
    return super.close(options);
  }
  /**
   * Handle clearing the linked skill
   */
  async _onClearLinkedSkill(event) {
    event.preventDefault();
    await this.item.update({ "system.linkedSkill": "" });
    this.render(false);
  }
  /**
   * Handle dropping a skill onto the linked skill field
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data && data.type === "Item") {
      const item = await Item.implementation.fromDropData(data);
      if (!item) return super._onDrop(event);
      if (item.type === "skill") {
        await this.item.update({ "system.linkedSkill": item.name });
        this.render(false);
        ui.notifications?.info(game.i18n.format("SRA2.SPECIALIZATIONS.LINKED_TO_SKILL", { name: item.name }));
        return;
      } else {
        ui.notifications?.warn(game.i18n.localize("SRA2.SPECIALIZATIONS.ONLY_SKILLS_CAN_BE_LINKED"));
        return;
      }
    }
    return super._onDrop(event);
  }
  async _updateObject(_event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    return this.item.update(expandedData);
  }
  /**
   * SKILL SEARCH FUNCTIONS
   */
  skillSearchTimeout = null;
  lastSkillSearchTerm = "";
  /**
   * Handle skill search input
   */
  async _onSkillSearch(event) {
    const input = event.currentTarget;
    const searchTerm = normalizeSearchText(input.value.trim());
    const resultsDiv = $(input).siblings(".skill-search-results")[0];
    if (this.skillSearchTimeout) {
      clearTimeout(this.skillSearchTimeout);
    }
    if (searchTerm.length === 0) {
      resultsDiv.style.display = "none";
      return;
    }
    this.skillSearchTimeout = setTimeout(async () => {
      await this._performSkillSearch(searchTerm, resultsDiv);
    }, 300);
  }
  /**
   * Perform the actual skill search in compendiums and world items
   */
  async _performSkillSearch(searchTerm, resultsDiv) {
    const results = [];
    this.lastSkillSearchTerm = searchTerm;
    if (game.items) {
      for (const item of game.items) {
        if (item.type === "skill" && normalizeSearchText(item.name).includes(searchTerm)) {
          results.push({
            name: item.name,
            uuid: item.uuid,
            pack: game.i18n.localize("SRA2.SPECIALIZATIONS.WORLD_ITEMS"),
            linkedAttribute: item.system.linkedAttribute,
            isWorldItem: true
          });
        }
      }
    }
    for (const pack of game.packs) {
      if (pack.documentName !== "Item") continue;
      const documents2 = await pack.getDocuments();
      for (const doc of documents2) {
        if (doc.type === "skill" && normalizeSearchText(doc.name).includes(searchTerm)) {
          results.push({
            name: doc.name,
            uuid: doc.uuid,
            pack: pack.title,
            linkedAttribute: doc.system.linkedAttribute,
            isWorldItem: false
          });
        }
      }
    }
    this._displaySkillSearchResults(results, resultsDiv);
  }
  /**
   * Display skill search results
   */
  _displaySkillSearchResults(results, resultsDiv) {
    const formattedSearchTerm = this.lastSkillSearchTerm.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    const exactMatch = results.find(
      (r) => normalizeSearchText(r.name) === normalizeSearchText(this.lastSkillSearchTerm)
    );
    let html = "";
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n.localize("SRA2.SPECIALIZATIONS.SEARCH_NO_RESULTS")}
          </div>
          <button class="create-skill-btn" data-skill-name="${this.lastSkillSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n.localize("SRA2.SPECIALIZATIONS.CREATE_SKILL")}
          </button>
        </div>
      `;
    } else {
      for (const result of results) {
        const attributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${result.linkedAttribute.toUpperCase()}`);
        html += `
          <div class="search-result-item">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.pack} - ${attributeLabel}</span>
            </div>
            <button class="link-skill-btn" data-skill-name="${result.name}">
              ${game.i18n.localize("SRA2.SPECIALIZATIONS.LINK_SKILL")}
            </button>
          </div>
        `;
      }
      if (!exactMatch) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n.localize("SRA2.SPECIALIZATIONS.CREATE_NEW_SKILL")}</span>
            </div>
            <button class="create-skill-btn-inline" data-skill-name="${this.lastSkillSearchTerm}">
              ${game.i18n.localize("SRA2.SPECIALIZATIONS.CREATE_SKILL")}
            </button>
          </div>
        `;
      }
    }
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = "block";
    $(resultsDiv).find(".link-skill-btn").on("click", this._onLinkSkillFromSearch.bind(this));
    $(resultsDiv).find(".create-skill-btn, .create-skill-btn-inline").on("click", this._onCreateNewSkill.bind(this));
    $(resultsDiv).find(".search-result-item:not(.no-results-create):not(.create-new-item)").on("click", (event) => {
      if ($(event.target).closest(".link-skill-btn").length > 0) return;
      const button = $(event.currentTarget).find(".link-skill-btn")[0];
      if (button) {
        $(button).trigger("click");
      }
    });
    $(resultsDiv).find(".search-result-item.create-new-item").on("click", (event) => {
      if ($(event.target).closest(".create-skill-btn-inline").length > 0) return;
      const button = $(event.currentTarget).find(".create-skill-btn-inline")[0];
      if (button) {
        $(button).trigger("click");
      }
    });
    return Promise.resolve();
  }
  /**
   * Handle linking a skill from search results
   */
  async _onLinkSkillFromSearch(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const skillName = button.dataset.skillName;
    if (!skillName) return;
    await this.item.update({ "system.linkedSkill": skillName });
    const searchInput = this.element.find(".skill-search-input")[0];
    if (searchInput) {
      searchInput.value = "";
    }
    const resultsDiv = this.element.find(".skill-search-results")[0];
    if (resultsDiv) {
      resultsDiv.style.display = "none";
    }
    this.render(false);
    ui.notifications?.info(game.i18n.format("SRA2.SPECIALIZATIONS.SKILL_LINKED", { name: skillName }));
  }
  /**
   * Handle skill search focus
   */
  _onSkillSearchFocus(event) {
    const input = event.currentTarget;
    if (input.value.trim().length > 0) {
      const resultsDiv = $(input).siblings(".skill-search-results")[0];
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = "block";
      }
    }
    return Promise.resolve();
  }
  /**
   * Handle skill search blur
   */
  _onSkillSearchBlur(event) {
    const input = event.currentTarget;
    const blurEvent = event;
    setTimeout(() => {
      const resultsDiv = $(input).siblings(".skill-search-results")[0];
      if (resultsDiv) {
        const relatedTarget = blurEvent.relatedTarget;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          return;
        }
        const activeElement = document.activeElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          return;
        }
        resultsDiv.style.display = "none";
      }
    }, 200);
    return Promise.resolve();
  }
  /**
   * Handle creating a new skill from search and linking it
   */
  async _onCreateNewSkill(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const skillName = button.dataset.skillName;
    if (!skillName) return;
    const formattedName = skillName.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    const skillData = {
      name: formattedName,
      type: "skill",
      system: {
        rating: 1,
        linkedAttribute: "strength",
        description: ""
      }
    };
    const createdItems = await Item.create(skillData);
    if (createdItems) {
      await this.item.update({ "system.linkedSkill": formattedName });
      const searchInput = this.element.find(".skill-search-input")[0];
      if (searchInput) {
        searchInput.value = "";
      }
      const resultsDiv = this.element.find(".skill-search-results")[0];
      if (resultsDiv) {
        resultsDiv.style.display = "none";
      }
      this.render(false);
      setTimeout(() => {
        if (createdItems.sheet) {
          createdItems.sheet.render(true);
        }
      }, 100);
      ui.notifications?.info(game.i18n.format("SRA2.SPECIALIZATIONS.SKILL_CREATED_AND_LINKED", { name: formattedName }));
    }
  }
}
class MetatypeSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "item", "metatype"],
      template: "systems/sra2/templates/item-metatype-sheet.hbs",
      width: 520,
      height: 580,
      tabs: [],
      submitOnChange: true
    });
  }
  getData() {
    const context = super.getData();
    context.system = this.item.system;
    return context;
  }
  async _updateObject(_event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    return this.item.update(expandedData);
  }
}
const applications = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CharacterSheet,
  FeatSheet,
  MetatypeSheet,
  NpcSheet,
  SkillSheet,
  SpecializationSheet
}, Symbol.toStringTag, { value: "Module" }));
const HOOKS = {
  MIGRATIONS: "sra2-declareMigration"
};
const CURRENT_SYSTEM_VERSION = "currentSystemVersion";
class Migration {
  get code() {
    return "sample";
  }
  get version() {
    return "0.0.0";
  }
  async migrate() {
    return () => {
    };
  }
  async applyItemsUpdates(computeUpdates = (items) => []) {
    await game.actors.forEach(async (actor) => {
      const actorItemUpdates = computeUpdates(actor.items);
      if (actorItemUpdates.length > 0) {
        const message = game.i18n.format("SRA2.MIGRATION.APPLYING_ACTOR_ITEMS", { name: actor.name });
        console.log(SYSTEM.LOG.HEAD, this.code, message, actorItemUpdates);
        await actor.updateEmbeddedDocuments("Item", actorItemUpdates);
      }
    });
    const itemUpdates = computeUpdates(game.items);
    if (itemUpdates.length > 0) {
      const message = game.i18n.localize("SRA2.MIGRATION.APPLYING_ITEMS");
      console.log(SYSTEM.LOG.HEAD, this.code, message, itemUpdates);
      await Item.updateDocuments(itemUpdates);
    }
  }
}
class Migrations {
  constructor() {
    game.settings.register(SYSTEM.id, CURRENT_SYSTEM_VERSION, {
      name: "SRA2.MIGRATION.SETTING_NAME",
      scope: "world",
      config: false,
      type: String,
      default: "0.0.0"
    });
  }
  migrate() {
    const currentVersion = game.settings.get(SYSTEM.id, CURRENT_SYSTEM_VERSION);
    if (foundry.utils.isNewerVersion(game.system.version, currentVersion)) {
      let migrations = [];
      Hooks.callAll(
        HOOKS.MIGRATIONS,
        (...list) => migrations = migrations.concat(list.filter((m) => foundry.utils.isNewerVersion(m.version, currentVersion)))
      );
      Hooks.off(HOOKS.MIGRATIONS, () => {
      });
      if (migrations.length > 0) {
        migrations.sort((a, b) => foundry.utils.isNewerVersion(a.version, b.version) ? 1 : foundry.utils.isNewerVersion(b.version, a.version) ? -1 : 0);
        migrations.forEach(async (m) => {
          const message2 = game.i18n.format("SRA2.MIGRATION.EXECUTING", { code: m.code, currentVersion, targetVersion: m.version });
          this.$notify(message2);
          await m.migrate();
        });
        const message = game.i18n.format("SRA2.MIGRATION.DONE", { version: game.system.version });
        this.$notify(message);
      } else {
        const message = game.i18n.format("SRA2.MIGRATION.NOT_NEEDED", { version: game.system.version });
        console.log(SYSTEM.LOG.HEAD + message);
      }
      game.settings.set(SYSTEM.id, CURRENT_SYSTEM_VERSION, game.system.version);
    } else {
      const message = game.i18n.localize("SRA2.MIGRATION.VERSION_UNCHANGED");
      console.log(SYSTEM.LOG.HEAD + message);
    }
  }
  $notify(message) {
    ui.notifications.info(message);
    console.log(SYSTEM.LOG.HEAD + message);
  }
}
class Migration_13_0_3 extends Migration {
  get code() {
    return "migration-13.0.3";
  }
  get version() {
    return "13.0.3";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.3: Converting rrType/rrValue/rrTarget to rrList");
    let totalMigrated = 0;
    let totalSkipped = 0;
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        item.system;
        const hasOldFormat = sourceSystem.rrType !== void 0 && Array.isArray(sourceSystem.rrType) || sourceSystem.rrValue !== void 0 && Array.isArray(sourceSystem.rrValue) || sourceSystem.rrTarget !== void 0 && Array.isArray(sourceSystem.rrTarget);
        const hasNewFormatInSource = sourceSystem.rrList !== void 0 && Array.isArray(sourceSystem.rrList);
        if (hasNewFormatInSource && !hasOldFormat) {
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Skipping "${item.name}" - already has rrList in source (${sourceSystem.rrList.length} entries), no old data`);
          totalSkipped++;
          continue;
        }
        if (!hasOldFormat) {
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Skipping "${item.name}" - no old format fields found`);
          totalSkipped++;
          continue;
        }
        const rrType = Array.isArray(sourceSystem.rrType) ? sourceSystem.rrType : [];
        const rrValue = Array.isArray(sourceSystem.rrValue) ? sourceSystem.rrValue : [];
        const rrTarget = Array.isArray(sourceSystem.rrTarget) ? sourceSystem.rrTarget : [];
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Found "${item.name}" with old format:`, {
          rrType,
          rrValue,
          rrTarget
        });
        const rrList = [];
        const maxLength = Math.max(rrType.length, rrValue.length, rrTarget.length);
        for (let i = 0; i < maxLength; i++) {
          const type = rrType[i];
          if (type && type !== "none") {
            rrList.push({
              rrType: type,
              rrValue: rrValue[i] !== void 0 ? rrValue[i] : 0,
              rrTarget: rrTarget[i] !== void 0 ? rrTarget[i] : ""
            });
          }
        }
        const update = {
          _id: item.id,
          "system.rrList": rrList,
          // Store backup of old data before deletion
          "system._rrTypeBackup": rrType,
          "system._rrValueBackup": rrValue,
          "system._rrTargetBackup": rrTarget,
          // Remove old fields by setting them to null (Foundry will delete them)
          "system.rrType": null,
          "system.rrValue": null,
          "system.rrTarget": null
        };
        updates.push(update);
        totalMigrated++;
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Converting feat "${item.name}":`);
        console.log(SYSTEM.LOG.HEAD + `  Old data (will be deleted, backed up as _rrTypeBackup/_rrValueBackup/_rrTargetBackup):`, { rrType, rrValue, rrTarget });
        console.log(SYSTEM.LOG.HEAD + `  New rrList (${rrList.length} entries):`, rrList);
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.3 completed - Migrated: ${totalMigrated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (totalMigrated > 0) {
      const userMessage = game.i18n ? game.i18n.localize("SRA2.MIGRATION.13_0_3_INFO") : "Migration 13.0.3: Risk Reduction data converted. Check console for details.";
      ui.notifications?.info(userMessage, { permanent: false });
    }
  }
}
class Migration_13_0_4 extends Migration {
  get code() {
    return "migration-13.0.4";
  }
  get version() {
    return "13.0.4";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.4: Cleaning up old RR fields and backups");
    let totalCleaned = 0;
    let totalSkipped = 0;
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        const hasOldFields = sourceSystem.rrType !== void 0 || sourceSystem.rrValue !== void 0 || sourceSystem.rrTarget !== void 0;
        const hasBackups = sourceSystem._rrTypeBackup !== void 0 || sourceSystem._rrValueBackup !== void 0 || sourceSystem._rrTargetBackup !== void 0;
        if (!hasOldFields && !hasBackups) {
          totalSkipped++;
          continue;
        }
        const hasRrList = sourceSystem.rrList !== void 0 && Array.isArray(sourceSystem.rrList);
        if (!hasRrList) {
          console.warn(SYSTEM.LOG.HEAD + `Migration 13.0.4: Skipping "${item.name}" - no rrList found! This item may need manual review.`);
          totalSkipped++;
          continue;
        }
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.4: Cleaning up feat "${item.name}":`);
        if (hasOldFields) {
          console.log(SYSTEM.LOG.HEAD + `  Removing old fields: rrType, rrValue, rrTarget`);
        }
        if (hasBackups) {
          console.log(SYSTEM.LOG.HEAD + `  Removing backups: _rrTypeBackup, _rrValueBackup, _rrTargetBackup`);
        }
        console.log(SYSTEM.LOG.HEAD + `  Keeping rrList with ${sourceSystem.rrList.length} entries`);
        const update = {
          _id: item.id,
          // Remove old fields
          "system.rrType": null,
          "system.rrValue": null,
          "system.rrTarget": null,
          // Remove backup fields
          "system._rrTypeBackup": null,
          "system._rrValueBackup": null,
          "system._rrTargetBackup": null
        };
        updates.push(update);
        totalCleaned++;
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.4 completed - Cleaned: ${totalCleaned}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (totalCleaned > 0) {
      const userMessage = game.i18n ? game.i18n.localize("SRA2.MIGRATION.13_0_4_INFO") : "Migration 13.0.4: Old RR fields cleaned up. Data migration complete.";
      ui.notifications?.info(userMessage, { permanent: false });
    }
  }
}
class Migration_13_0_5 extends Migration {
  get code() {
    return "migration-13.0.5";
  }
  get version() {
    return "13.0.5";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.5: Separating weapons and spells feat types");
    let totalConverted = 0;
    let totalSkipped = 0;
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        if (sourceSystem.featType !== "weapons-spells") {
          totalSkipped++;
          continue;
        }
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.5: Converting feat "${item.name}" from "weapons-spells" to "weapon"`);
        const update = {
          _id: item.id,
          "system.featType": "weapon"
        };
        updates.push(update);
        totalConverted++;
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.5 completed - Converted: ${totalConverted} weapons-spells to weapon, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (totalConverted > 0) {
      const userMessage = game.i18n ? game.i18n.localize("SRA2.MIGRATION.13_0_5_INFO") : `Migration 13.0.5: Converted ${totalConverted} "weapons-spells" feats to "weapon" type. You can manually change specific items to "spell" type if needed.`;
      ui.notifications?.info(userMessage, { permanent: false });
    }
  }
}
class Migration_13_0_6 extends Migration {
  get code() {
    return "migration-13.0.6";
  }
  get version() {
    return "13.0.6";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Migration 13.0.6: Rollback - keeping old weapons-spells type valid");
    console.log(SYSTEM.LOG.HEAD + "No conversion needed. weapons-spells, weapon, and spell types are all valid.");
    const message = "Migration 13.0.6: All feat types (weapons-spells, weapon, spell) are now valid. No data conversion performed.";
    console.log(SYSTEM.LOG.HEAD + message);
    if (ui.notifications) {
      ui.notifications.info(message, { permanent: false });
    }
  }
}
class Migration_13_0_7 extends Migration {
  get code() {
    return "migration-13.0.7";
  }
  get version() {
    return "13.0.7";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.7: Converting weapons-spells to weapon (with backup)");
    let totalConverted = 0;
    let totalSkipped = 0;
    let conversionDetails = [];
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        if (sourceSystem.featType !== "weapons-spells") {
          totalSkipped++;
          continue;
        }
        const itemInfo = {
          name: item.name,
          id: item.id,
          oldType: "weapons-spells",
          newType: "weapon",
          hasWeaponFocus: sourceSystem.isWeaponFocus || false,
          hasDamageValue: (sourceSystem.damageValue || 0) > 0,
          hasRanges: sourceSystem.meleeRange !== "none" || sourceSystem.shortRange !== "none" || sourceSystem.mediumRange !== "none" || sourceSystem.longRange !== "none"
        };
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.7: Converting "${item.name}" (ID: ${item.id})`);
        console.log(SYSTEM.LOG.HEAD + `  - Old type: weapons-spells`);
        console.log(SYSTEM.LOG.HEAD + `  - New type: weapon`);
        console.log(SYSTEM.LOG.HEAD + `  - Has weapon focus: ${itemInfo.hasWeaponFocus}`);
        console.log(SYSTEM.LOG.HEAD + `  - Has damage value: ${itemInfo.hasDamageValue}`);
        console.log(SYSTEM.LOG.HEAD + `  - Has ranges: ${itemInfo.hasRanges}`);
        conversionDetails.push(itemInfo);
        const update = {
          _id: item.id,
          // Change the type
          "system.featType": "weapon",
          // Create a backup of the old type for safety
          "system._oldFeatTypeBackup": "weapons-spells",
          // Add a migration timestamp
          "system._migratedAt": (/* @__PURE__ */ new Date()).toISOString(),
          "system._migrationVersion": "13.0.7"
        };
        updates.push(update);
        totalConverted++;
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.7 completed - Converted: ${totalConverted}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (conversionDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== CONVERSION DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items converted: ${conversionDetails.length}`);
      const withWeaponFocus = conversionDetails.filter((d) => d.hasWeaponFocus).length;
      const withDamage = conversionDetails.filter((d) => d.hasDamageValue).length;
      const withRanges = conversionDetails.filter((d) => d.hasRanges).length;
      console.log(SYSTEM.LOG.HEAD + `  - Items with weapon focus: ${withWeaponFocus}`);
      console.log(SYSTEM.LOG.HEAD + `  - Items with damage value: ${withDamage}`);
      console.log(SYSTEM.LOG.HEAD + `  - Items with ranges: ${withRanges}`);
      console.log(SYSTEM.LOG.HEAD + "=========================");
      console.log(SYSTEM.LOG.HEAD + "Converted items:");
      conversionDetails.forEach((detail, index) => {
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (ID: ${detail.id})`);
      });
    }
    if (totalConverted > 0) {
      const userMessage = game.i18n ? game.i18n.format("SRA2.MIGRATION.13_0_7_INFO", { count: totalConverted }) : `Migration 13.0.7: Converted ${totalConverted} "weapons-spells" items to "weapon" type. All data preserved with backup.`;
      ui.notifications?.info(userMessage, { permanent: false });
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete. All items have been backed up.");
      console.log(SYSTEM.LOG.HEAD + "✓ Old type saved in system._oldFeatTypeBackup");
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the conversion");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to convert - all items already migrated or are other types");
    }
  }
}
class Migration_13_0_8 extends Migration {
  get code() {
    return "migration-13.0.8";
  }
  get version() {
    return "13.0.8";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.8: Converting narrativeEffects to new format and fixing damageValueBonus");
    let totalConverted = 0;
    let totalSkipped = 0;
    let totalFixed = 0;
    let conversionDetails = [];
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        let needsUpdate = false;
        const update = {
          _id: item.id
        };
        if (sourceSystem.narrativeEffects && sourceSystem.narrativeEffects.length > 0) {
          const firstEffect = sourceSystem.narrativeEffects[0];
          if (!(typeof firstEffect === "object" && firstEffect !== null && "text" in firstEffect)) {
            const convertedEffects = sourceSystem.narrativeEffects.map((effect) => {
              if (typeof effect === "string") {
                return {
                  text: effect,
                  isNegative: false
                };
              }
              return {
                text: effect?.text || effect?.toString() || "",
                isNegative: effect?.isNegative || false
              };
            });
            update["system.narrativeEffects"] = convertedEffects;
            update["system._migratedNarrativeEffectsAt"] = (/* @__PURE__ */ new Date()).toISOString();
            update["system._narrativeEffectsMigrationVersion"] = "13.0.8";
            needsUpdate = true;
            console.log(SYSTEM.LOG.HEAD + `Migration 13.0.8: Converting narrativeEffects for "${item.name}" (ID: ${item.id})`);
            console.log(SYSTEM.LOG.HEAD + `  - Effect count: ${sourceSystem.narrativeEffects.length}`);
            conversionDetails.push({
              name: item.name,
              id: item.id,
              effectCount: sourceSystem.narrativeEffects.length
            });
            totalConverted++;
          }
        }
        if (sourceSystem.damageValueBonus === null || sourceSystem.damageValueBonus === void 0 || typeof sourceSystem.damageValueBonus !== "number" || !Number.isInteger(sourceSystem.damageValueBonus)) {
          update["system.damageValueBonus"] = 0;
          needsUpdate = true;
          totalFixed++;
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.8: Fixing damageValueBonus for "${item.name}" (ID: ${item.id})`);
        }
        if (needsUpdate) {
          updates.push(update);
        } else {
          totalSkipped++;
        }
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.8 completed - NarrativeEffects converted: ${totalConverted}, DamageValueBonus fixed: ${totalFixed}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (conversionDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== CONVERSION DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items converted: ${conversionDetails.length}`);
      const totalEffects = conversionDetails.reduce((sum, d) => sum + d.effectCount, 0);
      console.log(SYSTEM.LOG.HEAD + `  - Total narrative effects migrated: ${totalEffects}`);
      console.log(SYSTEM.LOG.HEAD + "=========================");
      console.log(SYSTEM.LOG.HEAD + "Converted items:");
      conversionDetails.forEach((detail, index) => {
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (ID: ${detail.id}) - ${detail.effectCount} effect(s)`);
      });
    }
    if (totalFixed > 0) {
      console.log(SYSTEM.LOG.HEAD + `Fixed damageValueBonus on ${totalFixed} item(s)`);
    }
    if (totalConverted > 0 || totalFixed > 0) {
      let userMessage = "";
      if (totalConverted > 0 && totalFixed > 0) {
        userMessage = game.i18n ? game.i18n.format("SRA2.MIGRATION.13_0_8_INFO", { count: totalConverted, fixed: totalFixed }) : `Migration 13.0.8: Converted narrative effects on ${totalConverted} feat(s) and fixed damageValueBonus on ${totalFixed} feat(s).`;
      } else if (totalConverted > 0) {
        userMessage = game.i18n ? game.i18n.format("SRA2.MIGRATION.13_0_8_INFO", { count: totalConverted }) : `Migration 13.0.8: Converted narrative effects on ${totalConverted} feat(s) to new format.`;
      } else if (totalFixed > 0) {
        userMessage = `Migration 13.0.8: Fixed damageValueBonus on ${totalFixed} feat(s).`;
      }
      ui.notifications?.info(userMessage, { permanent: false });
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      if (totalConverted > 0) {
        console.log(SYSTEM.LOG.HEAD + "✓ All narrative effects converted to new format.");
        console.log(SYSTEM.LOG.HEAD + "✓ All effects default to positive (isNegative: false)");
      }
      if (totalFixed > 0) {
        console.log(SYSTEM.LOG.HEAD + "✓ All damageValueBonus fields set to valid integer values.");
      }
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the conversion");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}
class Migration_13_0_9 extends Migration {
  get code() {
    return "migration-13.0.9";
  }
  get version() {
    return "13.0.9";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.9: Adding value field to narrativeEffects and isFirstFeat field");
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFirstFeatAdded = 0;
    let updateDetails = [];
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        let needsUpdate = false;
        const update = {
          _id: item.id
        };
        if (sourceSystem.narrativeEffects && sourceSystem.narrativeEffects.length > 0) {
          const updatedEffects = sourceSystem.narrativeEffects.map((effect) => {
            if (typeof effect === "object" && effect !== null && !("value" in effect)) {
              needsUpdate = true;
              return {
                ...effect,
                value: -1
                // Default value for all effects
              };
            }
            return effect;
          });
          if (needsUpdate) {
            update["system.narrativeEffects"] = updatedEffects;
            update["system._migratedNarrativeEffectsValueAt"] = (/* @__PURE__ */ new Date()).toISOString();
            console.log(SYSTEM.LOG.HEAD + `Migration 13.0.9: Adding value field to narrativeEffects for "${item.name}" (ID: ${item.id})`);
            console.log(SYSTEM.LOG.HEAD + `  - Effect count: ${updatedEffects.length}`);
            updateDetails.push({
              name: item.name,
              id: item.id,
              effectCount: updatedEffects.length,
              hasFirstFeat: false
            });
          }
        }
        if (sourceSystem.isFirstFeat === void 0 || sourceSystem.isFirstFeat === null) {
          update["system.isFirstFeat"] = false;
          needsUpdate = true;
          totalFirstFeatAdded++;
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.9: Adding isFirstFeat field to "${item.name}" (ID: ${item.id})`);
          const existingDetail = updateDetails.find((d) => d.id === item.id);
          if (existingDetail) {
            existingDetail.hasFirstFeat = true;
          } else {
            updateDetails.push({
              name: item.name,
              id: item.id,
              effectCount: 0,
              hasFirstFeat: true
            });
          }
        }
        if (needsUpdate) {
          update["system._narrativeEffectsValueMigrationVersion"] = "13.0.9";
          updates.push(update);
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.9 completed - Items updated: ${totalUpdated}, isFirstFeat added: ${totalFirstFeatAdded}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (updateDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== UPDATE DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items updated: ${updateDetails.length}`);
      const totalEffects = updateDetails.reduce((sum, d) => sum + d.effectCount, 0);
      const totalWithFirstFeat = updateDetails.filter((d) => d.hasFirstFeat).length;
      console.log(SYSTEM.LOG.HEAD + `  - Total narrative effects updated: ${totalEffects}`);
      console.log(SYSTEM.LOG.HEAD + `  - Total items with isFirstFeat added: ${totalWithFirstFeat}`);
      console.log(SYSTEM.LOG.HEAD + "======================");
      console.log(SYSTEM.LOG.HEAD + "Updated items:");
      updateDetails.forEach((detail, index) => {
        const updates = [];
        if (detail.effectCount > 0) updates.push(`${detail.effectCount} effect(s)`);
        if (detail.hasFirstFeat) updates.push("isFirstFeat added");
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (ID: ${detail.id}) - ${updates.join(", ")}`);
      });
    }
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? game.i18n.format("SRA2.MIGRATION.13_0_9_INFO", { count: totalUpdated, firstFeatCount: totalFirstFeatAdded }) : `Migration 13.0.9: Updated ${totalUpdated} feat(s) - added value field to narrative effects and isFirstFeat field to ${totalFirstFeatAdded} feat(s).`;
      ui.notifications?.info(userMessage, { permanent: false });
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ All narrative effects now have a value field (default: -1)");
      console.log(SYSTEM.LOG.HEAD + "✓ All feats now have isFirstFeat field (default: false)");
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the migration");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}
class Migration_13_0_10 extends Migration {
  get code() {
    return "migration-13.0.10";
  }
  get version() {
    return "13.0.10";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.10: Updating cost field values");
    let totalUpdated = 0;
    let totalSkipped = 0;
    let updateDetails = [];
    await this.applyItemsUpdates((items) => {
      const updates = [];
      const featItems = items.filter((item) => item.type === "feat");
      console.log(SYSTEM.LOG.HEAD + `Found ${featItems.length} feat items to check`);
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        if (sourceSystem._costMigrationVersion === "13.0.10") {
          totalSkipped++;
          continue;
        }
        let needsUpdate = false;
        const update = {
          _id: item.id
        };
        const currentCost = sourceSystem.cost || "free-equipment";
        const featType = sourceSystem.featType || "equipment";
        let newCost = currentCost;
        let reason = "";
        console.log(SYSTEM.LOG.HEAD + `Checking "${item.name}" - cost: "${currentCost}", type: "${featType}"`);
        if (currentCost === "specialized-equipment") {
          newCost = "advanced-equipment";
          needsUpdate = true;
          reason = "specialized-equipment → advanced-equipment";
        } else if (currentCost === "feat") {
          newCost = "free-equipment";
          needsUpdate = true;
          reason = "feat → free-equipment (cost = 0 for non-equipment types)";
        } else if (!["free-equipment", "equipment", "advanced-equipment"].includes(currentCost)) {
          newCost = "free-equipment";
          needsUpdate = true;
          reason = `invalid or missing cost (${currentCost}) → free-equipment`;
        }
        if (needsUpdate) {
          update["system.cost"] = newCost;
          update["system._costMigrationVersion"] = "13.0.10";
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.10: Updating cost for "${item.name}" (ID: ${item.id})`);
          console.log(SYSTEM.LOG.HEAD + `  - Type: ${featType}`);
          console.log(SYSTEM.LOG.HEAD + `  - Old cost: ${currentCost}`);
          console.log(SYSTEM.LOG.HEAD + `  - New cost: ${newCost}`);
          console.log(SYSTEM.LOG.HEAD + `  - Reason: ${reason}`);
          updateDetails.push({
            name: item.name,
            id: item.id,
            featType,
            oldCost: currentCost,
            newCost,
            reason
          });
          updates.push(update);
          totalUpdated++;
        }
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.10 completed - Items updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (updateDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== UPDATE DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items updated: ${updateDetails.length}`);
      const specializedToAdvanced = updateDetails.filter((d) => d.oldCost === "specialized-equipment").length;
      const featToFree = updateDetails.filter((d) => d.oldCost === "feat").length;
      console.log(SYSTEM.LOG.HEAD + `  - specialized-equipment → advanced-equipment: ${specializedToAdvanced}`);
      console.log(SYSTEM.LOG.HEAD + `  - feat → free-equipment: ${featToFree}`);
      console.log(SYSTEM.LOG.HEAD + "======================");
      console.log(SYSTEM.LOG.HEAD + "Updated items:");
      updateDetails.forEach((detail, index) => {
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (${detail.featType}): ${detail.oldCost} → ${detail.newCost}`);
      });
    }
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? game.i18n.format("SRA2.MIGRATION.13_0_10_INFO", {
        count: totalUpdated,
        specializedCount: updateDetails.filter((d) => d.oldCost === "specialized-equipment").length,
        featCount: updateDetails.filter((d) => d.oldCost === "feat").length
      }) : `Migration 13.0.10: Updated ${totalUpdated} feat(s) cost values.`;
      ui.notifications?.info(userMessage, { permanent: false });
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ Cost system simplified: free (0¥), equipment (2500¥), advanced (5000¥)");
      console.log(SYSTEM.LOG.HEAD + "✓ Cost now only applies to equipment and weapon types");
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the migration");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}
class Migration_13_0_11 extends Migration {
  get code() {
    return "migration-13.0.11";
  }
  get version() {
    return "13.0.11";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.11: Adding linked specializations fields to weapons");
    let totalUpdated = 0;
    let totalSkipped = 0;
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        const featType = sourceSystem.featType || "equipment";
        if (featType !== "weapon" && featType !== "weapons-spells") {
          continue;
        }
        if (sourceSystem._specializationLinkMigrationVersion === "13.0.11") {
          totalSkipped++;
          continue;
        }
        const hasAttackSpec = sourceSystem.hasOwnProperty("linkedAttackSpecialization");
        const hasDefenseSpec = sourceSystem.hasOwnProperty("linkedDefenseSpecialization");
        if (hasAttackSpec && hasDefenseSpec) {
          const update2 = {
            _id: item.id,
            "system._specializationLinkMigrationVersion": "13.0.11"
          };
          updates.push(update2);
          totalSkipped++;
          continue;
        }
        const update = {
          _id: item.id,
          "system.linkedAttackSpecialization": sourceSystem.linkedAttackSpecialization || "",
          "system.linkedDefenseSpecialization": sourceSystem.linkedDefenseSpecialization || "",
          "system._specializationLinkMigrationVersion": "13.0.11"
        };
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.11: Adding specialization link fields to weapon "${item.name}" (ID: ${item.id})`);
        updates.push(update);
        totalUpdated++;
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.11 completed - Weapons updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? game.i18n.format("SRA2.MIGRATION.13_0_11_INFO", { count: totalUpdated }) : `Migration 13.0.11: Added specialization link fields to ${totalUpdated} weapon(s).`;
      ui.notifications?.info(userMessage, { permanent: false });
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ Weapons can now be linked to attack and defense specializations");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}
class Migration_13_0_12 extends Migration {
  get code() {
    return "migration-13.0.12";
  }
  get version() {
    return "13.0.12";
  }
  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.12: Converting 'dice' to 'disadvantage' in weapon ranges");
    let totalUpdated = 0;
    let totalSkipped = 0;
    await this.applyItemsUpdates((items) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "feat") {
          continue;
        }
        const sourceSystem = item._source?.system || item.system;
        if (sourceSystem._rangeDiceToDisadvantageMigrationVersion === "13.0.12") {
          totalSkipped++;
          continue;
        }
        const hasDiceValue = sourceSystem.meleeRange === "dice" || sourceSystem.shortRange === "dice" || sourceSystem.mediumRange === "dice" || sourceSystem.longRange === "dice";
        if (!hasDiceValue) {
          totalSkipped++;
          continue;
        }
        const update = {
          _id: item.id,
          "system._rangeDiceToDisadvantageMigrationVersion": "13.0.12"
        };
        if (sourceSystem.meleeRange === "dice") {
          update["system.meleeRange"] = "disadvantage";
        }
        if (sourceSystem.shortRange === "dice") {
          update["system.shortRange"] = "disadvantage";
        }
        if (sourceSystem.mediumRange === "dice") {
          update["system.mediumRange"] = "disadvantage";
        }
        if (sourceSystem.longRange === "dice") {
          update["system.longRange"] = "disadvantage";
        }
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.12: Converting ranges for "${item.name}" (ID: ${item.id})`);
        updates.push(update);
        totalUpdated++;
      }
      return updates;
    });
    const summaryMessage = `Migration 13.0.12 completed - Items updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? game.i18n.format("SRA2.MIGRATION.13_0_12_INFO", { count: totalUpdated }) : `Migration 13.0.12: Converted weapon ranges from "dice" to "disadvantage" for ${totalUpdated} item(s).`;
      ui.notifications?.info(userMessage, { permanent: false });
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ All weapon ranges now use 'disadvantage' instead of 'dice'");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}
globalThis.SYSTEM = SYSTEM$1;
class SRA2System {
  static start() {
    new SRA2System();
  }
  constructor() {
    if (game.system) {
      game.system.sra2 = this;
    }
    Hooks.once("init", () => this.onInit());
  }
  onInit() {
    console.log(SYSTEM$1.LOG.HEAD + "SRA2System.onInit");
    if (game.system) {
      game.system.api = {
        applications,
        models,
        documents
      };
    }
    new Migrations();
    Hooks.on(HOOKS.MIGRATIONS, (declareMigration) => {
      declareMigration(new Migration_13_0_3());
      declareMigration(new Migration_13_0_4());
      declareMigration(new Migration_13_0_5());
      declareMigration(new Migration_13_0_6());
      declareMigration(new Migration_13_0_7());
      declareMigration(new Migration_13_0_8());
      declareMigration(new Migration_13_0_9());
      declareMigration(new Migration_13_0_10());
      declareMigration(new Migration_13_0_11());
      declareMigration(new Migration_13_0_12());
    });
    CONFIG.Actor.documentClass = SRA2Actor;
    CONFIG.Actor.dataModels = {
      character: CharacterDataModel
    };
    CONFIG.Item.dataModels = {
      skill: SkillDataModel,
      feat: FeatDataModel,
      specialization: SpecializationDataModel,
      metatype: MetatypeDataModel
    };
    DocumentSheetConfig.registerSheet(Actor, "sra2", CharacterSheet, {
      types: ["character"],
      makeDefault: true,
      label: "SRA2.SHEET.CHARACTER"
    });
    DocumentSheetConfig.registerSheet(Actor, "sra2", NpcSheet, {
      types: ["character"],
      makeDefault: false,
      label: "SRA2.SHEET.NPC"
    });
    DocumentSheetConfig.registerSheet(Item, "sra2", FeatSheet, {
      types: ["feat"],
      makeDefault: true,
      label: "SRA2.SHEET.FEAT"
    });
    DocumentSheetConfig.registerSheet(Item, "sra2", SkillSheet, {
      types: ["skill"],
      makeDefault: true,
      label: "SRA2.SHEET.SKILL"
    });
    DocumentSheetConfig.registerSheet(Item, "sra2", SpecializationSheet, {
      types: ["specialization"],
      makeDefault: true,
      label: "SRA2.SHEET.SPECIALIZATION"
    });
    DocumentSheetConfig.registerSheet(Item, "sra2", MetatypeSheet, {
      types: ["metatype"],
      makeDefault: true,
      label: "SRA2.SHEET.METATYPE"
    });
    Handlebars.registerHelper("add", function(a, b) {
      return a + b;
    });
    Handlebars.registerHelper("eq", function(a, b) {
      return a === b;
    });
    Handlebars.registerHelper("gt", function(a, b) {
      return a > b;
    });
    Handlebars.registerHelper("gte", function(a, b) {
      return a >= b;
    });
    Handlebars.registerHelper("concat", function(...args) {
      const values = args.slice(0, -1);
      return values.join("");
    });
    Handlebars.registerHelper("uppercase", function(str) {
      return str ? str.toUpperCase() : "";
    });
    Hooks.on("renderChatMessage", (message, html) => {
      html.find(".apply-damage-btn").on("click", async (event) => {
        event.preventDefault();
        const button = $(event.currentTarget);
        const defenderUuid = button.data("defender-uuid");
        const damage = parseInt(button.data("damage"));
        const defenderName = button.data("defender-name");
        await CharacterSheet.applyDamage(defenderUuid, damage, defenderName);
      });
    });
    Hooks.on("getTokenHUDOptions", (hud, buttons, token) => {
      const actor = token.actor;
      if (!actor) return;
      const bookmarkedItems = actor.items.filter(
        (i) => (i.type === "skill" || i.type === "feat") && i.system.bookmarked
      );
      if (bookmarkedItems.length > 0) {
        buttons.unshift({
          name: "SRA2_BOOKMARKS",
          title: game.i18n.localize("SRA2.BOOKMARKS.TITLE"),
          icon: "fa-solid fa-star",
          button: true,
          onclick: () => {
            this.showBookmarksDialog(actor);
          }
        });
      }
    });
    Hooks.once("ready", () => this.onReady());
  }
  /**
   * Show bookmarks/favorites dialog for quick actions
   */
  showBookmarksDialog(actor) {
    const bookmarkedSkills = actor.items.filter((i) => i.type === "skill" && i.system.bookmarked);
    const bookmarkedFeats = actor.items.filter((i) => i.type === "feat" && i.system.bookmarked);
    let content = '<div class="sra2-bookmark-menu">';
    if (bookmarkedSkills.length > 0) {
      content += "<h3>" + game.i18n.localize("SRA2.SKILLS.LABEL") + "</h3>";
      content += '<div class="bookmark-list">';
      bookmarkedSkills.forEach((skill) => {
        content += `<button class="bookmark-item" data-item-id="${skill.id}" data-item-type="skill">
          <i class="fas fa-dice-d6"></i> ${skill.name}
        </button>`;
      });
      content += "</div>";
    }
    if (bookmarkedFeats.length > 0) {
      content += "<h3>" + game.i18n.localize("SRA2.FEATS.LABEL") + "</h3>";
      content += '<div class="bookmark-list">';
      bookmarkedFeats.forEach((feat) => {
        content += `<button class="bookmark-item" data-item-id="${feat.id}" data-item-type="feat">
          <i class="fas fa-scroll"></i> ${feat.name}
        </button>`;
      });
      content += "</div>";
    }
    content += "</div>";
    new Dialog({
      title: game.i18n.localize("SRA2.BOOKMARKS.TITLE") + " - " + actor.name,
      content,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Close")
        }
      },
      render: (html) => {
        html.find(".bookmark-item").on("click", async (event) => {
          const itemId = $(event.currentTarget).data("item-id");
          const item = actor.items.get(itemId);
          if (!item) return;
          item.sheet?.render(true);
        });
      }
    }, { width: 350 }).render(true);
  }
  async onReady() {
    console.log(SYSTEM$1.LOG.HEAD + "SRA2System.onReady");
    const migrations = new Migrations();
    migrations.migrate();
    await this.migrateFeatsToArrayFormat();
    await this.migrateAnarchyNimbusToSpent();
  }
  /**
   * Migrate old feat data (single rrType/rrValue/rrTarget) to new array format
   */
  async migrateFeatsToArrayFormat() {
    const featsToUpdate = [];
    for (const item of game.items) {
      if (item.type === "feat") {
        const system = item.system;
        let needsUpdate = false;
        const updates = { _id: item.id };
        if (system.rrType !== void 0 && !Array.isArray(system.rrType)) {
          needsUpdate = true;
          if (system.rrType !== "none") {
            updates["system.rrType"] = [system.rrType];
            updates["system.rrValue"] = [system.rrValue || 0];
            updates["system.rrTarget"] = [system.rrTarget || ""];
          } else {
            updates["system.rrType"] = [];
            updates["system.rrValue"] = [];
            updates["system.rrTarget"] = [];
          }
        }
        if (needsUpdate) {
          featsToUpdate.push(updates);
        }
      }
    }
    for (const actor of game.actors) {
      const actorUpdates = [];
      for (const item of actor.items) {
        if (item.type === "feat") {
          const system = item.system;
          let needsUpdate = false;
          const updates = { _id: item.id };
          if (system.rrType !== void 0 && !Array.isArray(system.rrType)) {
            needsUpdate = true;
            if (system.rrType !== "none") {
              updates["system.rrType"] = [system.rrType];
              updates["system.rrValue"] = [system.rrValue || 0];
              updates["system.rrTarget"] = [system.rrTarget || ""];
            } else {
              updates["system.rrType"] = [];
              updates["system.rrValue"] = [];
              updates["system.rrTarget"] = [];
            }
          }
          if (needsUpdate) {
            actorUpdates.push(updates);
          }
        }
      }
      if (actorUpdates.length > 0) {
        console.log(`${SYSTEM$1.LOG.HEAD} Migrating ${actorUpdates.length} feats on actor ${actor.name}`);
        await actor.updateEmbeddedDocuments("Item", actorUpdates);
      }
    }
    if (featsToUpdate.length > 0) {
      console.log(`${SYSTEM$1.LOG.HEAD} Migrating ${featsToUpdate.length} world feats`);
      await Item.updateDocuments(featsToUpdate);
    }
    if (featsToUpdate.length > 0 || game.actors.some((a) => a.items.some((i) => i.type === "feat"))) {
      console.log(`${SYSTEM$1.LOG.HEAD} Feat migration to array format complete`);
    }
  }
  /**
   * Migrate anarchyNimbus to anarchySpent
   */
  async migrateAnarchyNimbusToSpent() {
    const actorsToUpdate = [];
    for (const actor of game.actors) {
      if (actor.type === "character") {
        const system = actor.system;
        if (system.anarchyNimbus !== void 0 && system.anarchySpent === void 0) {
          actorsToUpdate.push({
            _id: actor.id,
            "system.anarchySpent": system.anarchyNimbus
          });
        }
      }
    }
    if (actorsToUpdate.length > 0) {
      console.log(`${SYSTEM$1.LOG.HEAD} Migrating anarchyNimbus to anarchySpent for ${actorsToUpdate.length} actors`);
      await Actor.updateDocuments(actorsToUpdate);
      console.log(`${SYSTEM$1.LOG.HEAD} anarchyNimbus to anarchySpent migration complete`);
    }
  }
}
SRA2System.start();
//# sourceMappingURL=index.mjs.map

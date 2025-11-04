const SYSTEM_ID = "sra2";
const SYSTEM = {
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
      anarchyNimbus: new fields.ArrayField(new fields.BooleanField({
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
    this.totalAnarchy = 3 + anarchyBonus;
    this.anarchyBonus = anarchyBonus;
    let bonusLightDamage = 0;
    let bonusSevereDamage = 0;
    let totalEssenceCost = 0;
    if (parent && parent.items) {
      const activeFeats = parent.items.filter(
        (item) => item.type === "feat" && item.system.active === true
      );
      activeFeats.forEach((feat) => {
        bonusLightDamage += feat.system.bonusLightDamage || 0;
        bonusSevereDamage += feat.system.bonusSevereDamage || 0;
        totalEssenceCost += feat.system.essenceCost || 0;
      });
    }
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
    const totalAnarchy = 3 + anarchyBonus;
    const anarchyNimbus = this.anarchyNimbus || [];
    if (!Array.isArray(anarchyNimbus)) {
      this.anarchyNimbus = [];
    }
    while (this.anarchyNimbus.length < totalAnarchy) {
      this.anarchyNimbus.push(false);
    }
    while (this.anarchyNimbus.length > totalAnarchy) {
      this.anarchyNimbus.pop();
    }
    const armorLevel = this.armorLevel || 0;
    this.armorCost = armorLevel * 2500;
    const strength = this.attributes?.strength || 1;
    const willpower = this.attributes?.willpower || 1;
    this.damageThresholds = {
      withoutArmor: {
        light: strength,
        moderate: strength + 3,
        severe: strength + 6
      },
      withArmor: {
        light: strength + armorLevel,
        moderate: strength + armorLevel + 3,
        severe: strength + armorLevel + 6
      },
      mental: {
        light: willpower,
        moderate: willpower + 3,
        severe: willpower + 6
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
class NpcDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      state: new fields.SchemaField({
        health: new fields.NumberField({
          required: true,
          initial: 10,
          min: 0,
          integer: true
        }),
        maxHealth: new fields.NumberField({
          required: true,
          initial: 10,
          min: 1,
          integer: true
        }),
        armor: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          integer: true
        })
      }),
      difficulty: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 6,
        integer: true,
        label: "SRA2.NPC.DIFFICULTY"
      }),
      description: new fields.HTMLField({
        required: true,
        initial: ""
      })
    };
  }
  prepareDerivedData() {
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
      rrType: new fields.ArrayField(new fields.StringField({
        required: true,
        initial: "none",
        choices: {
          "none": "SRA2.FEATS.RR_TYPE.NONE",
          "attribute": "SRA2.FEATS.RR_TYPE.ATTRIBUTE",
          "skill": "SRA2.FEATS.RR_TYPE.SKILL",
          "specialization": "SRA2.FEATS.RR_TYPE.SPECIALIZATION"
        }
      }), {
        initial: [],
        label: "SRA2.FEATS.RR_TYPE.LABEL"
      }),
      rrValue: new fields.ArrayField(new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 3,
        integer: true
      }), {
        initial: [],
        label: "SRA2.FEATS.RR_VALUE"
      }),
      rrTarget: new fields.ArrayField(new fields.StringField({
        required: false,
        initial: "",
        nullable: false
      }), {
        initial: [],
        label: "SRA2.FEATS.RR_TARGET"
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
      })
    };
  }
  prepareDerivedData() {
    const rating = this.rating || 0;
    const costType = this.cost || "free-equipment";
    let calculatedCost = 0;
    switch (costType) {
      case "free-equipment":
        calculatedCost = 0 + rating * 5e3;
        break;
      case "equipment":
        calculatedCost = 2500 + rating * 5e3;
        break;
      case "specialized-equipment":
        calculatedCost = 5e3 + rating * 5e3;
        break;
      case "feat":
        calculatedCost = rating * 5e3;
        break;
      default:
        calculatedCost = 0;
    }
    this.calculatedCost = calculatedCost;
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
  NpcDataModel,
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
class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "actor", "character"],
      template: "systems/sra2/templates/actor-character-sheet.hbs",
      width: 900,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: ".metatype-item", dropSelector: ".metatype-drop-zone" },
        { dragSelector: ".feat-item", dropSelector: ".feats-list" },
        { dragSelector: ".skill-item", dropSelector: ".skills-list" },
        { dragSelector: ".specialization-item", dropSelector: ".skills-list" }
      ],
      submitOnChange: true
    });
  }
  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    const metatypes = this.actor.items.filter((item) => item.type === "metatype");
    context.metatype = metatypes.length > 0 ? metatypes[0] : null;
    const allFeats = this.actor.items.filter((item) => item.type === "feat").map((feat) => {
      feat.rrEntries = [];
      const rrTypes = feat.system.rrType || [];
      const rrValues = feat.system.rrValue || [];
      const rrTargets = feat.system.rrTarget || [];
      for (let i = 0; i < rrTypes.length; i++) {
        const rrType = rrTypes[i];
        const rrValue = rrValues[i] || 0;
        const rrTarget = rrTargets[i] || "";
        if (rrType === "none") continue;
        const entry = { rrType, rrValue, rrTarget };
        if (rrType === "attribute" && rrTarget) {
          entry.rrTargetLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${rrTarget.toUpperCase()}`);
        }
        feat.rrEntries.push(entry);
      }
      return feat;
    });
    context.featsByType = {
      equipment: allFeats.filter((feat) => feat.system.featType === "equipment"),
      cyberware: allFeats.filter((feat) => feat.system.featType === "cyberware"),
      cyberdeck: allFeats.filter((feat) => feat.system.featType === "cyberdeck"),
      vehicle: allFeats.filter((feat) => feat.system.featType === "vehicle"),
      weaponsSpells: allFeats.filter((feat) => feat.system.featType === "weapons-spells")
    };
    context.feats = allFeats;
    const skills = this.actor.items.filter((item) => item.type === "skill");
    const allSpecializations = this.actor.items.filter((item) => item.type === "specialization");
    const specializationsBySkill = /* @__PURE__ */ new Map();
    const unlinkedSpecializations = [];
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
        } else {
          unlinkedSpecializations.push(spec);
        }
      } else {
        unlinkedSpecializations.push(spec);
      }
    });
    const attributesRR = {
      strength: this.calculateRR("attribute", "strength"),
      agility: this.calculateRR("attribute", "agility"),
      willpower: this.calculateRR("attribute", "willpower"),
      logic: this.calculateRR("attribute", "logic"),
      charisma: this.calculateRR("attribute", "charisma")
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
      const specs = specializationsBySkill.get(skill.id) || [];
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
    context.unlinkedSpecializations = unlinkedSpecializations.map((spec) => {
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
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
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
    html.find(".rating-input").on("change", this._onRatingChange.bind(this));
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
    const actorData = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!key.startsWith("items.")) {
        actorData[key] = value;
      }
    }
    const expandedData = foundry.utils.expandObject(actorData);
    return this.actor.update(expandedData);
  }
  /**
   * Handle editing a metatype
   */
  async _onEditMetatype(event) {
    event.preventDefault();
    const metatypeId = event.currentTarget.closest(".metatype-item")?.getAttribute("data-item-id");
    if (metatypeId) {
      const metatype = this.actor.items.get(metatypeId);
      if (metatype) {
        metatype.sheet?.render(true);
      }
    }
  }
  /**
   * Handle deleting a metatype
   */
  async _onDeleteMetatype(event) {
    event.preventDefault();
    const metatypeId = event.currentTarget.closest(".metatype-item")?.getAttribute("data-item-id");
    if (metatypeId) {
      const metatype = this.actor.items.get(metatypeId);
      if (metatype) {
        await metatype.delete();
        this.render(false);
      }
    }
  }
  /**
   * Handle editing a feat
   */
  async _onEditFeat(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    const feat = this.actor.items.get(itemId);
    if (feat) {
      feat.sheet?.render(true);
    }
  }
  /**
   * Handle deleting a feat
   */
  async _onDeleteFeat(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (item) {
      await item.delete();
    }
  }
  /**
   * Handle editing a skill
   */
  async _onEditSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    const skill = this.actor.items.get(itemId);
    if (skill) {
      skill.sheet?.render(true);
    }
  }
  /**
   * Handle deleting a skill
   */
  async _onDeleteSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (item) {
      await item.delete();
    }
  }
  /**
   * Handle editing a specialization
   */
  async _onEditSpecialization(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    const specialization = this.actor.items.get(itemId);
    if (specialization) {
      specialization.sheet?.render(true);
    }
  }
  /**
   * Handle deleting a specialization
   */
  async _onDeleteSpecialization(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (item) {
      await item.delete();
    }
  }
  /**
   * Calculate Risk Reduction (RR) from active feats for a given skill, specialization, or attribute
   */
  calculateRR(itemType, itemName) {
    let totalRR = 0;
    const feats = this.actor.items.filter(
      (item) => item.type === "feat" && item.system.active === true
    );
    for (const feat of feats) {
      const featSystem = feat.system;
      const rrTypes = featSystem.rrType || [];
      const rrValues = featSystem.rrValue || [];
      const rrTargets = featSystem.rrTarget || [];
      for (let i = 0; i < rrTypes.length; i++) {
        const rrType = rrTypes[i];
        const rrValue = rrValues[i] || 0;
        const rrTarget = rrTargets[i] || "";
        if (rrType === itemType && rrTarget === itemName) {
          totalRR += rrValue;
        }
      }
    }
    return Math.min(3, totalRR);
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
    console.log("SRA2 | Roll specialization clicked!");
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    const effectiveRating = parseInt(element.dataset.effectiveRating || "0");
    if (!itemId) {
      console.error("SRA2 | No specialization ID found");
      return;
    }
    const specialization = this.actor.items.get(itemId);
    if (!specialization || specialization.type !== "specialization") return;
    const specSystem = specialization.system;
    const linkedAttribute = specSystem.linkedAttribute || "strength";
    const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
    const basePool = effectiveRating + attributeValue;
    if (basePool <= 0) {
      ui.notifications?.warn(game.i18n.localize("SRA2.SPECIALIZATIONS.NO_DICE"));
      return;
    }
    const attributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    const specializationRR = this.calculateRR("specialization", specialization.name);
    const attributeRR = this.calculateRR("attribute", linkedAttribute);
    const linkedSkillName = specSystem.linkedSkill;
    const skillRR = linkedSkillName ? this.calculateRR("skill", linkedSkillName) : 0;
    const autoRR = Math.min(3, specializationRR + attributeRR + skillRR);
    new Dialog({
      title: game.i18n.format("SRA2.SPECIALIZATIONS.ROLL_TITLE", { name: specialization.name }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.BASE_POOL")}: <strong>${basePool}</strong></label>
            <p class="notes">(${game.i18n.localize("SRA2.SPECIALIZATIONS.BONUS")}: ${effectiveRating} + ${attributeLabel}: ${attributeValue})</p>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.MODIFIER")}:</label>
            <input type="number" name="modifier" value="0" min="-10" max="10" />
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.ROLL_MODE")}:</label>
            <select name="rollMode">
              <option value="normal" selected>${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_NORMAL")}</option>
              <option value="advantage">${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_ADVANTAGE")}</option>
              <option value="disadvantage">${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_DISADVANTAGE")}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.RISK_DICE")} (max ${basePool}):</label>
            <input type="number" name="riskDice" value="0" min="0" max="${basePool}" />
            <p class="notes">${game.i18n.localize("SRA2.SKILLS.RISK_DICE_HINT")}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.RISK_REDUCTION")} </label>
            <input type="number" name="riskReduction" value="${autoRR}" min="0" max="3" />
            <p class="notes">${game.i18n.localize("SRA2.SKILLS.RISK_REDUCTION_HINT")}${autoRR > 0 ? " <strong>(Auto: " + autoRR + ")</strong>" : ""}</p>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n.localize("SRA2.SKILLS.ROLL"),
          callback: (html) => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const totalPool = Math.max(1, basePool + modifier);
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            const riskReduction = Math.max(0, Math.min(3, parseInt(html.find('[name="riskReduction"]').val()) || 0));
            const rollMode = html.find('[name="rollMode"]').val() || "normal";
            this._rollSkillDice(specialization.name, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      },
      default: "roll"
    }).render(true);
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
    if (attributeValue <= 0) {
      ui.notifications?.warn(game.i18n.localize("SRA2.ATTRIBUTES.NO_DICE"));
      return;
    }
    const autoRR = this.calculateRR("attribute", attributeName);
    const attributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${attributeName.toUpperCase()}`);
    new Dialog({
      title: game.i18n.format("SRA2.ATTRIBUTES.ROLL_TITLE", { name: attributeLabel }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.ATTRIBUTES.BASE_POOL")}: <strong>${attributeValue}</strong></label>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.MODIFIER")}:</label>
            <input type="number" name="modifier" value="0" min="-10" max="10" />
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.ROLL_MODE")}:</label>
            <select name="rollMode">
              <option value="normal" selected>${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_NORMAL")}</option>
              <option value="advantage">${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_ADVANTAGE")}</option>
              <option value="disadvantage">${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_DISADVANTAGE")}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.RISK_DICE")} (max ${attributeValue}):</label>
            <input type="number" name="riskDice" value="0" min="0" max="${attributeValue}" />
            <p class="notes">${game.i18n.localize("SRA2.SKILLS.RISK_DICE_HINT")}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.RISK_REDUCTION")} (max 3):</label>
            <input type="number" name="riskReduction" value="${autoRR}" min="0" max="3" />
            <p class="notes">${game.i18n.localize("SRA2.SKILLS.RISK_REDUCTION_HINT")}${autoRR > 0 ? " <strong>(Auto: " + autoRR + ")</strong>" : ""}</p>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n.localize("SRA2.SKILLS.ROLL"),
          callback: (html) => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const totalPool = Math.max(1, attributeValue + modifier);
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            const riskReduction = Math.max(0, Math.min(3, parseInt(html.find('[name="riskReduction"]').val()) || 0));
            const rollMode = html.find('[name="rollMode"]').val() || "normal";
            this._rollSkillDice(attributeLabel, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      },
      default: "roll"
    }).render(true);
  }
  /**
   * Handle rolling a skill
   */
  async _onRollSkill(event) {
    event.preventDefault();
    console.log("SRA2 | Roll skill clicked!");
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    if (!itemId) {
      console.error("SRA2 | No item ID found");
      return;
    }
    const skill = this.actor.items.get(itemId);
    if (!skill || skill.type !== "skill") return;
    const skillSystem = skill.system;
    const rating = skillSystem.rating || 0;
    const linkedAttribute = skillSystem.linkedAttribute || "strength";
    const attributeValue = this.actor.system.attributes?.[linkedAttribute] || 0;
    const basePool = rating + attributeValue;
    if (basePool <= 0) {
      ui.notifications?.warn(game.i18n.localize("SRA2.SKILLS.NO_DICE"));
      return;
    }
    const attributeLabel = game.i18n.localize(`SRA2.ATTRIBUTES.${linkedAttribute.toUpperCase()}`);
    const skillRR = this.calculateRR("skill", skill.name);
    const attributeRR = this.calculateRR("attribute", linkedAttribute);
    const autoRR = Math.min(3, skillRR + attributeRR);
    new Dialog({
      title: game.i18n.format("SRA2.SKILLS.ROLL_TITLE", { name: skill.name }),
      content: `
        <form class="sra2-roll-dialog">
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.BASE_POOL")}: <strong>${basePool}</strong></label>
            <p class="notes">(${game.i18n.localize("SRA2.SKILLS.RATING")}: ${rating} + ${attributeLabel}: ${attributeValue})</p>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.MODIFIER")}:</label>
            <input type="number" name="modifier" value="0" min="-10" max="10" />
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.ROLL_MODE")}:</label>
            <select name="rollMode">
              <option value="normal" selected>${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_NORMAL")}</option>
              <option value="advantage">${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_ADVANTAGE")}</option>
              <option value="disadvantage">${game.i18n.localize("SRA2.SKILLS.ROLL_MODE_DISADVANTAGE")}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.RISK_DICE")} (max ${basePool}):</label>
            <input type="number" name="riskDice" value="0" min="0" max="${basePool}" />
            <p class="notes">${game.i18n.localize("SRA2.SKILLS.RISK_DICE_HINT")}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SRA2.SKILLS.RISK_REDUCTION")}:</label>
            <input type="number" name="riskReduction" value="${autoRR}" min="0" max="3" />
            <p class="notes">${game.i18n.localize("SRA2.SKILLS.RISK_REDUCTION_HINT")}${autoRR > 0 ? " <strong>(Auto: " + autoRR + ")</strong>" : ""}</p>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n.localize("SRA2.SKILLS.ROLL"),
          callback: (html) => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const totalPool = Math.max(1, basePool + modifier);
            const riskDice = Math.min(totalPool, parseInt(html.find('[name="riskDice"]').val()) || 0);
            const normalDice = totalPool - riskDice;
            const riskReduction = Math.max(0, Math.min(3, parseInt(html.find('[name="riskReduction"]').val()) || 0));
            const rollMode = html.find('[name="rollMode"]').val() || "normal";
            this._rollSkillDice(skill.name, normalDice, riskDice, riskReduction, rollMode);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      },
      default: "roll"
    }).render(true);
  }
  /**
   * Roll skill dice and display results with Dice So Nice
   */
  async _rollSkillDice(skillName, dicePool, riskDice = 0, riskReduction = 0, rollMode = "normal") {
    let normalSuccesses = 0;
    let riskSuccesses = 0;
    let criticalFailures = 0;
    let normalDiceResults = "";
    let riskDiceResults = "";
    const getSuccessThreshold = (mode) => {
      switch (mode) {
        case "advantage":
          return 4;
        // 4, 5, 6 = success
        case "disadvantage":
          return 6;
        // only 6 = success
        default:
          return 5;
      }
    };
    const successThreshold = getSuccessThreshold(rollMode);
    let normalRoll = null;
    if (dicePool > 0) {
      normalRoll = new Roll(`${dicePool}d6`);
      await normalRoll.evaluate();
      const normalResults = normalRoll.dice[0]?.results || [];
      normalSuccesses = normalResults.filter((r) => r.result >= successThreshold).length;
      normalDiceResults = normalResults.map((r) => {
        const isSuccess = r.result >= successThreshold;
        return `<span class="die normal ${isSuccess ? "success" : "failure"}">${r.result}</span>`;
      }).join(" ");
    }
    let riskRoll = null;
    if (riskDice > 0) {
      riskRoll = new Roll(`${riskDice}d6`);
      await riskRoll.evaluate();
      const riskResults = riskRoll.dice[0]?.results || [];
      riskResults.forEach((r) => {
        if (r.result >= successThreshold) {
          riskSuccesses += 2;
        } else if (r.result === 1) {
          criticalFailures++;
        }
      });
      riskDiceResults = riskResults.map((r) => {
        let cssClass = "die risk ";
        if (r.result >= successThreshold) {
          cssClass += "success";
        } else if (r.result === 1) {
          cssClass += "critical";
        } else {
          cssClass += "failure";
        }
        return `<span class="${cssClass}">${r.result}</span>`;
      }).join(" ");
    }
    if (game.dice3d) {
      const dice3d = game.dice3d;
      const promises = [];
      if (normalRoll) {
        promises.push(
          dice3d.showForRoll(normalRoll, game.user, true, null, false, null, null, {
            colorset: "grey"
            // Grey color for normal dice
          }).catch(() => {
          })
        );
      }
      if (riskRoll) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        promises.push(
          dice3d.showForRoll(riskRoll, game.user, true, null, false, null, null, {
            colorset: "black"
            // Black color for risk dice
          }).catch(() => {
          })
        );
      }
      await Promise.all(promises);
    }
    const rawCriticalFailures = criticalFailures;
    criticalFailures = Math.max(0, criticalFailures - riskReduction);
    const totalSuccesses = normalSuccesses + riskSuccesses;
    let resultsHtml = '<div class="sra2-skill-roll">';
    const totalPool = dicePool + riskDice;
    resultsHtml += '<div class="dice-pool">';
    resultsHtml += `<strong>${game.i18n.localize("SRA2.SKILLS.DICE_POOL")}:</strong> `;
    resultsHtml += `${totalPool}d6`;
    if (riskDice > 0) {
      resultsHtml += ` (${dicePool} ${game.i18n.localize("SRA2.SKILLS.NORMAL")} + <span class="risk-label">${riskDice} ${game.i18n.localize("SRA2.SKILLS.RISK")}</span>`;
      if (riskReduction > 0) {
        resultsHtml += ` | <span class="rr-label">RR ${riskReduction}</span>`;
      }
      resultsHtml += `)`;
    } else if (riskReduction > 0) {
      resultsHtml += ` | <span class="rr-label">RR ${riskReduction}</span>`;
    }
    if (rollMode !== "normal") {
      const modeKey = rollMode === "advantage" ? "ROLL_MODE_ADVANTAGE" : "ROLL_MODE_DISADVANTAGE";
      resultsHtml += ` | <span class="mode-label">${game.i18n.localize(`SRA2.SKILLS.${modeKey}`)}</span>`;
    }
    resultsHtml += "</div>";
    if (normalDiceResults) {
      resultsHtml += '<div class="dice-results">';
      resultsHtml += `<strong>${game.i18n.localize("SRA2.SKILLS.NORMAL_DICE")}:</strong> ${normalDiceResults}`;
      resultsHtml += `<span class="mini-success"> (${normalSuccesses} ${game.i18n.localize("SRA2.SKILLS.SUCCESSES_SHORT")})</span>`;
      resultsHtml += "</div>";
    }
    if (riskDiceResults) {
      resultsHtml += '<div class="dice-results risk">';
      resultsHtml += `<strong>${game.i18n.localize("SRA2.SKILLS.RISK_DICE")}:</strong> ${riskDiceResults}`;
      resultsHtml += `<span class="mini-success"> (${riskSuccesses} ${game.i18n.localize("SRA2.SKILLS.SUCCESSES_SHORT")})</span>`;
      resultsHtml += "</div>";
    }
    resultsHtml += `<div class="successes ${totalSuccesses > 0 ? "has-success" : "no-success"}">`;
    resultsHtml += `<strong>${game.i18n.localize("SRA2.SKILLS.TOTAL_SUCCESSES")}:</strong> ${totalSuccesses}`;
    resultsHtml += "</div>";
    if (rawCriticalFailures > 0 || riskReduction > 0) {
      resultsHtml += `<div class="critical-failures ${criticalFailures === 0 ? "reduced-to-zero" : ""}">`;
      resultsHtml += `<strong>${game.i18n.localize("SRA2.SKILLS.CRITICAL_FAILURES")}:</strong> `;
      if (riskReduction > 0) {
        resultsHtml += `<span class="calculation">${rawCriticalFailures} - ${riskReduction} RR = </span>`;
      }
      resultsHtml += `<span class="final-value">${criticalFailures}</span>`;
      resultsHtml += "</div>";
    }
    resultsHtml += "</div>";
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n.format("SRA2.SKILLS.ROLL_FLAVOR", { name: skillName }),
      content: resultsHtml,
      sound: CONFIG.sounds?.dice
    };
    await ChatMessage.create(messageData);
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
   * Override to handle dropping feats and skills
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const dropTarget = event.target.closest("[data-drop-zone]");
    if (data && data.type === "Item") {
      const item = await Item.implementation.fromDropData(data);
      if (!item) return super._onDrop(event);
      if (dropTarget && dropTarget.dataset.dropZone === "metatype") {
        if (item.type === "metatype") {
          if (!item.actor || item.actor.id !== this.actor.id) {
            const existingMetatype = this.actor.items.find((i) => i.type === "metatype");
            if (existingMetatype) {
              const message = game.i18n.localize("SRA2.METATYPES.ONLY_ONE_METATYPE");
              ui.notifications?.warn(message);
              return;
            }
            await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            return;
          }
        } else {
          ui.notifications?.warn(game.i18n.localize("SRA2.METATYPES.ONLY_METATYPES"));
          return;
        }
      }
      if (dropTarget && dropTarget.dataset.dropZone === "feat") {
        if (item.type === "feat") {
          if (!item.actor || item.actor.id !== this.actor.id) {
            const existingFeat = this.actor.items.find(
              (i) => i.type === "feat" && i.name === item.name
            );
            if (existingFeat) {
              const message = game.i18n.format("SRA2.FEATS.ALREADY_EXISTS", { name: item.name });
              ui.notifications?.warn(message);
              return;
            }
            await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            return;
          }
        } else {
          ui.notifications?.warn(game.i18n.localize("SRA2.FEATS.ONLY_FEATS"));
          return;
        }
      }
      if (dropTarget && dropTarget.dataset.dropZone === "skill") {
        if (item.type === "skill" || item.type === "specialization") {
          if (!item.actor || item.actor.id !== this.actor.id) {
            const existingItem = this.actor.items.find(
              (i) => i.type === item.type && i.name === item.name
            );
            if (existingItem) {
              const messageKey = item.type === "skill" ? "SRA2.SKILLS.ALREADY_EXISTS" : "SRA2.SPECIALIZATIONS.ALREADY_EXISTS";
              const message = game.i18n.format(messageKey, { name: item.name });
              ui.notifications?.warn(message);
              return;
            }
            await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
            return;
          }
        } else {
          ui.notifications?.warn(game.i18n.localize("SRA2.SKILLS.ONLY_SKILLS"));
          return;
        }
      }
    }
    return super._onDrop(event);
  }
}
class FeatSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sra2", "sheet", "item", "feat"],
      template: "systems/sra2/templates/item-feat-sheet.hbs",
      width: 520,
      height: 480,
      tabs: [],
      dragDrop: [
        { dropSelector: ".rr-target-drop-zone" }
      ],
      submitOnChange: true
    });
  }
  getData() {
    const context = super.getData();
    context.system = this.item.system;
    context.rrEntries = [];
    const rrTypes = context.system.rrType || [];
    const rrValues = context.system.rrValue || [];
    const rrTargets = context.system.rrTarget || [];
    for (let i = 0; i < rrTypes.length; i++) {
      const rrType = rrTypes[i];
      const rrValue = rrValues[i] || 0;
      const rrTarget = rrTargets[i] || "";
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
  }
  /**
   * Handle adding a new RR entry
   */
  async _onAddRREntry(event) {
    event.preventDefault();
    const rrTypes = [...this.item.system.rrType || []];
    const rrValues = [...this.item.system.rrValue || []];
    const rrTargets = [...this.item.system.rrTarget || []];
    rrTypes.push("skill");
    rrValues.push(0);
    rrTargets.push("");
    await this.item.update({
      "system.rrType": rrTypes,
      "system.rrValue": rrValues,
      "system.rrTarget": rrTargets
    });
    this.render(false);
  }
  /**
   * Handle removing an RR entry
   */
  async _onRemoveRREntry(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index || "0");
    const rrTypes = [...this.item.system.rrType || []];
    const rrValues = [...this.item.system.rrValue || []];
    const rrTargets = [...this.item.system.rrTarget || []];
    rrTypes.splice(index, 1);
    rrValues.splice(index, 1);
    rrTargets.splice(index, 1);
    await this.item.update({
      "system.rrType": rrTypes,
      "system.rrValue": rrValues,
      "system.rrTarget": rrTargets
    });
    this.render(false);
  }
  /**
   * Handle clearing the RR target for a specific entry
   */
  async _onClearRRTarget(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index || "0");
    const rrTargets = [...this.item.system.rrTarget || []];
    rrTargets[index] = "";
    await this.item.update({ "system.rrTarget": rrTargets });
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
      const rrTypes = [...this.item.system.rrType || []];
      const rrType = rrTypes[index];
      if (item.type === "skill" && rrType === "skill") {
        const rrTargets = [...this.item.system.rrTarget || []];
        rrTargets[index] = item.name;
        await this.item.update({ "system.rrTarget": rrTargets });
        this.render(false);
        ui.notifications?.info(game.i18n.format("SRA2.FEATS.LINKED_TO_TARGET", { name: item.name }));
        return;
      } else if (item.type === "specialization" && rrType === "specialization") {
        const rrTargets = [...this.item.system.rrTarget || []];
        rrTargets[index] = item.name;
        await this.item.update({ "system.rrTarget": rrTargets });
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
  async _updateObject(_event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    return this.item.update(expandedData);
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
  SkillSheet,
  SpecializationSheet
}, Symbol.toStringTag, { value: "Module" }));
globalThis.SYSTEM = SYSTEM;
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
    console.log(SYSTEM.LOG.HEAD + "SRA2System.onInit");
    if (game.system) {
      game.system.api = {
        applications,
        models,
        documents
      };
    }
    CONFIG.Actor.documentClass = SRA2Actor;
    CONFIG.Actor.dataModels = {
      character: CharacterDataModel,
      npc: NpcDataModel
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
    Hooks.once("ready", () => this.onReady());
  }
  async onReady() {
    console.log(SYSTEM.LOG.HEAD + "SRA2System.onReady");
    await this.migrateFeatsToArrayFormat();
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
        console.log(`${SYSTEM.LOG.HEAD} Migrating ${actorUpdates.length} feats on actor ${actor.name}`);
        await actor.updateEmbeddedDocuments("Item", actorUpdates);
      }
    }
    if (featsToUpdate.length > 0) {
      console.log(`${SYSTEM.LOG.HEAD} Migrating ${featsToUpdate.length} world feats`);
      await Item.updateDocuments(featsToUpdate);
    }
    if (featsToUpdate.length > 0 || game.actors.some((a) => a.items.some((i) => i.type === "feat"))) {
      console.log(`${SYSTEM.LOG.HEAD} Feat migration to array format complete`);
    }
  }
}
SRA2System.start();
//# sourceMappingURL=index.mjs.map

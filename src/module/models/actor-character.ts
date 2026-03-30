import { DAMAGE_STEP, DAMAGE_BOX_DEFAULTS } from '../config/constants.js';

/**
 * Data model for Character actors
 */
export class CharacterDataModel extends foundry.abstract.TypeDataModel<any, Actor> {
  static override defineSchema(): any {
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
        min: 0
      }),
      armorLevel: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 5,
        integer: true
      }),
      connectionMode: new fields.StringField({
        required: true,
        initial: 'ar',
        choices: ['disconnected', 'offline', 'ar', 'cold-sim', 'hot-sim'],
        label: "SRA2.FEATS.CYBERDECK.CONNECTION_MODE.LABEL"
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
      tempAnarchy: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true
      }),
      tempAnarchySpent: new fields.ArrayField(new fields.BooleanField({
        required: true,
        initial: false
      }), {
        required: true,
        initial: []
      }),
      bio: new fields.SchemaField({
        background: new fields.HTMLField({
          required: true,
          initial: ""
        }),
        notes: new fields.HTMLField({
          required: true,
          initial: ""
        }),
        gmDescription: new fields.HTMLField({
          required: false,
          initial: "",
          label: "SRA2.GM_DESCRIPTION"
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
      }),
      // Linked vehicle actors (UUIDs)
      linkedVehicles: new fields.ArrayField(new fields.StringField({
        required: true,
        initial: ""
      }), {
        required: true,
        initial: [],
        label: "SRA2.CHARACTER.LINKED_VEHICLES"
      }),
      reference: new fields.StringField({
        required: false,
        initial: "",
        label: "SRA2.REFERENCE"
      }),
      damageGaugeType: new fields.StringField({
        required: false,
        initial: "physical",
        label: "SRA2.DAMAGE.GAUGE_TYPE"
      })
    };
  }

  /**
   * Calculate the cost of an attribute based on its level
   * Each level costs 10000, except the last level (maximum) which costs 20000
   */
  private calculateAttributeCost(level: number, maxLevel: number): number {
    let cost = 0;
    for (let i = 1; i <= level; i++) {
      if (i === maxLevel) {
        cost += 20000;
      } else {
        cost += 10000;
      }
    }
    return cost;
  }

  override prepareDerivedData(): void {
    const parent = (this as any).parent;

    const { attributeMaxes, anarchyBonus } = this._collectMetatypeData(parent);
    (this as any).attributeMaxes = attributeMaxes;

    const featBonuses = this._collectFeatBonuses(parent, anarchyBonus);
    this._applyDamageArrays(featBonuses, anarchyBonus, parent);
    this._applyArmorAndThresholds(featBonuses, parent);
    this._applyTotalCost(attributeMaxes, parent);
  }

  private _collectMetatypeData(parent: any): { attributeMaxes: { strength: number; agility: number; willpower: number; logic: number; charisma: number }; anarchyBonus: number } {
    let attributeMaxes = { strength: 99, agility: 99, willpower: 99, logic: 99, charisma: 99 };
    let anarchyBonus = 0;
    if (parent?.items) {
      const metatype = parent.items.find((item: any) => item.type === 'metatype');
      if (metatype?.system) {
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
    return { attributeMaxes, anarchyBonus };
  }

  private _collectFeatBonuses(parent: any, anarchyBonus: number): {
    bonusLightDamage: number; bonusSevereDamage: number;
    bonusPhysicalThreshold: number; bonusMentalThreshold: number; bonusMatrixThreshold: number;
    bonusAnarchy: number; totalEssenceCost: number;
  } {
    let bonusLightDamage = 0, bonusSevereDamage = 0;
    let bonusPhysicalThreshold = 0, bonusMentalThreshold = 0, bonusMatrixThreshold = 0;
    let bonusAnarchy = 0, totalEssenceCost = 0;
    let totalNarrations = 0;
    const narrationsDetails: Array<{ name: string; actions: number }> = [];

    if (parent?.items) {
      const activeFeats = parent.items.filter((item: any) =>
        item.type === 'feat' && item.system.active === true
      );
      activeFeats.forEach((feat: any) => {
        bonusLightDamage += feat.system.bonusLightDamage || 0;
        bonusSevereDamage += feat.system.bonusSevereDamage || 0;
        bonusPhysicalThreshold += feat.system.bonusPhysicalThreshold || 0;
        bonusMentalThreshold += feat.system.bonusMentalThreshold || 0;
        bonusMatrixThreshold += feat.system.bonusMatrixThreshold || 0;
        bonusAnarchy += feat.system.bonusAnarchy || 0;
        totalEssenceCost += feat.system.essenceCost || 0;
        if (feat.system.grantsNarration) {
          totalNarrations++;
          narrationsDetails.push({ name: feat.name, actions: feat.system.narrationActions || 1 });
        }
      });
    }

    (this as any).totalAnarchy = 3 + anarchyBonus + bonusAnarchy;
    (this as any).anarchyBonus = anarchyBonus;
    (this as any).featsAnarchyBonus = bonusAnarchy;
    (this as any).totalNarrations = 1 + totalNarrations;
    (this as any).bonusNarrations = totalNarrations;
    (this as any).narrationsDetails = narrationsDetails;

    return { bonusLightDamage, bonusSevereDamage, bonusPhysicalThreshold, bonusMentalThreshold, bonusMatrixThreshold, bonusAnarchy, totalEssenceCost };
  }

  private _applyDamageArrays(
    featBonuses: { bonusLightDamage: number; bonusSevereDamage: number; bonusAnarchy: number },
    anarchyBonus: number,
    parent: any
  ): void {
    const totalLightBoxes = DAMAGE_BOX_DEFAULTS.LIGHT + featBonuses.bonusLightDamage;
    const totalSevereBoxes = DAMAGE_BOX_DEFAULTS.SEVERE + featBonuses.bonusSevereDamage;

    // Resize a damage object's light/severe arrays, preserving existing values
    const ensureDamageArraySize = (sourceDamage: any, defaultLight: boolean[], defaultSevere: boolean[]) => {
      const damage: any = {
        light: Array.isArray(sourceDamage?.light) ? [...sourceDamage.light] : [...defaultLight],
        severe: Array.isArray(sourceDamage?.severe) ? [...sourceDamage.severe] : [...defaultSevere],
        incapacitating: typeof sourceDamage?.incapacitating === 'boolean' ? sourceDamage.incapacitating : false
      };
      while (damage.light.length < totalLightBoxes) damage.light.push(false);
      while (damage.light.length > totalLightBoxes) damage.light.pop();
      while (damage.severe.length < totalSevereBoxes) damage.severe.push(false);
      while (damage.severe.length > totalSevereBoxes) damage.severe.pop();
      return damage;
    };

    // Read from _source to preserve persisted values (Foundry v13)
    const sourceSystem = parent?._source?.system || {};
    (this as any).damage = ensureDamageArraySize(sourceSystem.damage || (this as any).damage || {}, [false, false], [false]);
    (this as any).totalLightBoxes = totalLightBoxes;
    (this as any).totalSevereBoxes = totalSevereBoxes;

    // Resize anarchySpent array to match total anarchy
    const totalAnarchy = 3 + anarchyBonus + featBonuses.bonusAnarchy;
    if (!Array.isArray((this as any).anarchySpent)) (this as any).anarchySpent = [];
    while ((this as any).anarchySpent.length < totalAnarchy) (this as any).anarchySpent.push(false);
    while ((this as any).anarchySpent.length > totalAnarchy) (this as any).anarchySpent.pop();
  }

  private _applyArmorAndThresholds(
    featBonuses: { bonusPhysicalThreshold: number; bonusMentalThreshold: number; bonusMatrixThreshold: number; totalEssenceCost: number },
    parent: any
  ): void {
    // Armor level: sum of active armor feats, capped at 5
    let totalArmorLevel = 0;
    if (parent?.items) {
      const activeArmorFeats = parent.items.filter((item: any) =>
        item.type === 'feat' && item.system.featType === 'armor' &&
        item.system.active === true && (item.system.armorValue || 0) > 0
      );
      totalArmorLevel = Math.min(
        activeArmorFeats.reduce((sum: number, item: any) => sum + (item.system.armorValue || 0), 0),
        5
      );
    }
    (this as any).armorLevel = totalArmorLevel;
    (this as any).armorCost = totalArmorLevel * 2500;

    const strength = (this as any).attributes?.strength || 1;
    const willpower = (this as any).attributes?.willpower || 1;
    const { bonusPhysicalThreshold, bonusMentalThreshold, bonusMatrixThreshold, totalEssenceCost } = featBonuses;

    // Active cyberdeck firewall for matrix thresholds
    let firewall = 0;
    let isEmerged = false;
    if (parent?.items) {
      const activeCyberdeck = parent.items.find((item: any) =>
        item.type === 'feat' && item.system.featType === 'cyberdeck' && item.system.active === true
      );
      if (activeCyberdeck?.system) {
        const baseFirewall = activeCyberdeck.system.firewall || 1;
        const firewallMalus = activeCyberdeck.system.firewallMalus || 0;
        firewall = Math.max(0, baseFirewall - firewallMalus);
      }

      // Check for active emerged feat (technomancer virtual persona)
      const activeEmerged = parent.items.find((item: any) =>
        item.type === 'feat' && item.system.featType === 'emerged' && item.system.active === true
      );
      if (activeEmerged) {
        isEmerged = true;
        const virtualFirewall = willpower;
        const charisma = (this as any).attributes?.charisma || 1;
        (this as any).virtualPersona = { firewall: virtualFirewall, attack: charisma };
        // If no cyberdeck, use virtual persona firewall
        if (!activeCyberdeck) {
          firewall = virtualFirewall;
        }
      }
    }
    (this as any).isEmerged = isEmerged;

    (this as any).damageThresholds = {
      withoutArmor: {
        light: strength + bonusPhysicalThreshold,
        severe: strength + bonusPhysicalThreshold + DAMAGE_STEP,
        incapacitating: strength + bonusPhysicalThreshold + DAMAGE_STEP * 2
      },
      withArmor: {
        light: strength + totalArmorLevel + bonusPhysicalThreshold,
        severe: strength + totalArmorLevel + bonusPhysicalThreshold + DAMAGE_STEP,
        incapacitating: strength + totalArmorLevel + bonusPhysicalThreshold + DAMAGE_STEP * 2
      },
      mental: {
        light: willpower + bonusMentalThreshold,
        severe: willpower + bonusMentalThreshold + DAMAGE_STEP,
        incapacitating: willpower + bonusMentalThreshold + DAMAGE_STEP * 2
      },
      matrix: {
        light: firewall,
        severe: firewall * 2,
        incapacitating: firewall * 3
      }
    };

    const maxEssence = (this as any).maxEssence || 6;
    (this as any).currentEssence = Math.max(0, maxEssence - totalEssenceCost);
  }

  private _applyTotalCost(attributeMaxes: { strength: number; agility: number; willpower: number; logic: number; charisma: number }, parent: any): void {
    const attributes = (this as any).attributes;
    if (!attributes) return;

    // Clamp attributes to metatype maximums
    attributes.strength = Math.min(attributes.strength || 1, attributeMaxes.strength);
    attributes.agility = Math.min(attributes.agility || 1, attributeMaxes.agility);
    attributes.willpower = Math.min(attributes.willpower || 1, attributeMaxes.willpower);
    attributes.logic = Math.min(attributes.logic || 1, attributeMaxes.logic);
    attributes.charisma = Math.min(attributes.charisma || 1, attributeMaxes.charisma);

    (this as any).attributeCosts = {
      strength: this.calculateAttributeCost(attributes.strength || 1, attributeMaxes.strength),
      agility: this.calculateAttributeCost(attributes.agility || 1, attributeMaxes.agility),
      willpower: this.calculateAttributeCost(attributes.willpower || 1, attributeMaxes.willpower),
      logic: this.calculateAttributeCost(attributes.logic || 1, attributeMaxes.logic),
      charisma: this.calculateAttributeCost(attributes.charisma || 1, attributeMaxes.charisma)
    };

    let totalCost = Object.values((this as any).attributeCosts).reduce((sum: number, cost: any) => sum + cost, 0);

    // Add active items cost
    if (parent?.items) {
      parent.items.forEach((item: any) => {
        if (item.system?.calculatedCost !== undefined) {
          if (item.type === 'feat' && item.system.active === false) return;
          totalCost += item.system.calculatedCost;
        }
      });
    }

    // Add linked vehicles cost
    const linkedVehicles = (this as any).linkedVehicles || [];
    for (const vehicleUuid of linkedVehicles) {
      try {
        let vehicleActor: any = null;
        if ((foundry.utils as any)?.fromUuidSync) {
          try { vehicleActor = (foundry.utils as any).fromUuidSync(vehicleUuid); } catch (_e) { /* fallback */ }
        }
        if (!vehicleActor && game.actors) {
          vehicleActor = (game.actors as any).find((a: any) => a.uuid === vehicleUuid);
          if (!vehicleActor) {
            const parts = vehicleUuid.split('.');
            if (parts.length >= 3) vehicleActor = (game.actors as any).get(parts[parts.length - 1]);
          }
        }
        if (vehicleActor?.type === 'vehicle') totalCost += vehicleActor.system?.calculatedCost || 0;
      } catch (error) {
        console.warn(`Failed to load linked vehicle ${vehicleUuid} for cost calculation:`, error);
      }
    }

    (this as any).totalCost = totalCost;
  }
}


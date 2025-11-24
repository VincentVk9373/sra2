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
      }),
      // Linked vehicle actors (UUIDs)
      linkedVehicles: new fields.ArrayField(new fields.StringField({
        required: true,
        initial: ""
      }), {
        required: true,
        initial: [],
        label: "SRA2.CHARACTER.LINKED_VEHICLES"
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
    // Get metatype to determine attribute maximums and anarchy bonus
    const parent = (this as any).parent;
    let attributeMaxes = {
      strength: 99,
      agility: 99,
      willpower: 99,
      logic: 99,
      charisma: 99
    };
    let anarchyBonus = 0;
    
    if (parent && parent.items) {
      const metatype = parent.items.find((item: any) => item.type === 'metatype');
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
    
    (this as any).attributeMaxes = attributeMaxes;
    
    // Calculate damage boxes, thresholds bonuses, essence cost, anarchy bonus, and narrations from active feats
    let bonusLightDamage = 0;
    let bonusSevereDamage = 0;
    let bonusPhysicalThreshold = 0;
    let bonusMentalThreshold = 0;
    let bonusAnarchy = 0;
    let totalEssenceCost = 0;
    let totalNarrations = 0;
    const narrationsDetails: Array<{ name: string; actions: number }> = [];
    
    if (parent && parent.items) {
      const activeFeats = parent.items.filter((item: any) => 
        item.type === 'feat' && item.system.active === true
      );
      
      activeFeats.forEach((feat: any) => {
        bonusLightDamage += feat.system.bonusLightDamage || 0;
        bonusSevereDamage += feat.system.bonusSevereDamage || 0;
        bonusPhysicalThreshold += feat.system.bonusPhysicalThreshold || 0;
        bonusMentalThreshold += feat.system.bonusMentalThreshold || 0;
        bonusAnarchy += feat.system.bonusAnarchy || 0;
        totalEssenceCost += feat.system.essenceCost || 0;
        
        // Count narrations
        if (feat.system.grantsNarration) {
          totalNarrations++;
          narrationsDetails.push({
            name: feat.name,
            actions: feat.system.narrationActions || 1
          });
        }
      });
    }
    
    // Calculate total anarchy (base 3 + metatype bonus + feats bonus)
    (this as any).totalAnarchy = 3 + anarchyBonus + bonusAnarchy;
    (this as any).anarchyBonus = anarchyBonus;
    (this as any).featsAnarchyBonus = bonusAnarchy;
    
    // Store narrations information (base 1 + feats bonus)
    (this as any).totalNarrations = 1 + totalNarrations;
    (this as any).bonusNarrations = totalNarrations;
    (this as any).narrationsDetails = narrationsDetails;
    
    // Base: 2 light, 1 severe, 1 incapacitating
    const totalLightBoxes = 2 + bonusLightDamage;
    const totalSevereBoxes = 1 + bonusSevereDamage;
    
    // Ensure damage arrays match the required size
    const damage = (this as any).damage || {};
    
    // Adjust light damage array
    if (!Array.isArray(damage.light)) {
      damage.light = [false, false];
    }
    while (damage.light.length < totalLightBoxes) {
      damage.light.push(false);
    }
    while (damage.light.length > totalLightBoxes) {
      damage.light.pop();
    }
    
    // Adjust severe damage array
    if (!Array.isArray(damage.severe)) {
      damage.severe = [false];
    }
    while (damage.severe.length < totalSevereBoxes) {
      damage.severe.push(false);
    }
    while (damage.severe.length > totalSevereBoxes) {
      damage.severe.pop();
    }
    
    (this as any).totalLightBoxes = totalLightBoxes;
    (this as any).totalSevereBoxes = totalSevereBoxes;
    
    // Adjust anarchy spent array to match total anarchy
    const totalAnarchy = 3 + anarchyBonus + bonusAnarchy;
    const anarchySpent = (this as any).anarchySpent || [];
    
    if (!Array.isArray(anarchySpent)) {
      (this as any).anarchySpent = [];
    }
    while ((this as any).anarchySpent.length < totalAnarchy) {
      (this as any).anarchySpent.push(false);
    }
    while ((this as any).anarchySpent.length > totalAnarchy) {
      (this as any).anarchySpent.pop();
    }
    
    // Calculate armor cost (2500 per level)
    const armorLevel = (this as any).armorLevel || 0;
    (this as any).armorCost = armorLevel * 2500;
    
    // Calculate damage thresholds (with bonuses from feats)
    const strength = (this as any).attributes?.strength || 1;
    const willpower = (this as any).attributes?.willpower || 1;
    
    (this as any).damageThresholds = {
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
    
    // Calculate current essence
    const maxEssence = (this as any).maxEssence || 6;
    (this as any).currentEssence = Math.max(0, maxEssence - totalEssenceCost);
    
    // Calculate costs for each attribute
    const attributes = (this as any).attributes;
    if (attributes) {
      // Clamp attributes to their maximums
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
      
      // Calculate total cost of attributes
      const attributeCosts = (this as any).attributeCosts;
      let totalCost = Object.values(attributeCosts).reduce((sum: number, cost: any) => sum + cost, 0);
      
      // Add armor cost
      totalCost += (this as any).armorCost || 0;
      
      // Add items cost (skills and feats)
      if (parent && parent.items) {
        parent.items.forEach((item: any) => {
          if (item.system && item.system.calculatedCost !== undefined) {
            totalCost += item.system.calculatedCost;
          }
        });
      }
      
      (this as any).totalCost = totalCost;
    }
  }
}


/**
 * Data model for Vehicle/Drone actors
 */
import { VEHICLE_TYPES, VehicleType } from './item-feat.js';

export class VehicleDataModel extends foundry.abstract.TypeDataModel<any, Actor> {
  static override defineSchema(): any {
    const fields = foundry.data.fields;
    
    // Build vehicle type choices from VEHICLE_TYPES
    const vehicleTypeChoices: Record<string, string> = {};
    Object.keys(VEHICLE_TYPES).forEach((key) => {
      vehicleTypeChoices[key] = key;
    });
    
    return {
      vehicleType: new fields.StringField({
        required: false,
        nullable: true,
        choices: vehicleTypeChoices,
        label: "SRA2.VEHICLE.VEHICLE_TYPE"
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
        label: "SRA2.VEHICLE.NARRATIVE_EFFECTS"
      }),
      reference: new fields.StringField({
        required: false,
        initial: "",
        label: "SRA2.REFERENCE"
      }),
      description: new fields.HTMLField({
        required: false,
        initial: "",
        label: "SRA2.VEHICLE.DESCRIPTION"
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
      })
    };
  }

  override prepareDerivedData(): void {
    const vehicleType = (this as any).vehicleType || "";
    const vehicleStats = vehicleType && VEHICLE_TYPES[vehicleType as VehicleType] 
      ? VEHICLE_TYPES[vehicleType as VehicleType] 
      : null;
    
    // Get base stats from vehicle type or defaults
    const baseAutopilot = vehicleStats?.autopilot || 0;
    const baseStructure = vehicleStats?.structure || 0;
    const baseHandling = vehicleStats?.handling || 0;
    const baseSpeed = vehicleStats?.speed || 0;
    const baseFlyingSpeed = vehicleStats?.flyingSpeed || 0;
    const baseArmor = vehicleStats?.armor || 0;
    const baseWeaponMount = vehicleStats?.weaponMount || "none";
    
    // Get bonuses
    const autopilotBonus = (this as any).autopilotBonus || 0;
    const speedBonus = (this as any).speedBonus || 0;
    const handlingBonus = (this as any).handlingBonus || 0;
    const armorBonus = (this as any).armorBonus || 0;
    const isFlying = (this as any).isFlying || false;
    const isFixed = (this as any).isFixed || false;
    const weaponMountImprovement = (this as any).weaponMountImprovement || false;
    const autopilotUnlocked = (this as any).autopilotUnlocked || false;
    const additionalDroneCount = (this as any).additionalDroneCount || 0;
    
    // Calculate final values (same logic as feat-sheet.ts)
    const finalAutopilot = Math.min(12, baseAutopilot + autopilotBonus);
    const finalHandling = baseHandling + handlingBonus;
    const finalSpeed = isFixed ? 0 : (baseSpeed + speedBonus);
    const finalFlyingSpeed = isFlying ? (baseFlyingSpeed > 0 ? baseFlyingSpeed : 1) : 0;
    const finalArmor = Math.min(baseStructure, baseArmor + armorBonus);
    
    // Calculate weapon mount (improved if option is checked)
    let finalWeaponMount = baseWeaponMount;
    if (weaponMountImprovement) {
      if (baseWeaponMount === "none") {
        finalWeaponMount = "smg";
      } else if (baseWeaponMount === "smg") {
        finalWeaponMount = "rifle";
      }
    }
    
    // Store calculated attributes (read-only in UI)
    (this as any).attributes = {
      autopilot: finalAutopilot,
      structure: baseStructure,
      handling: finalHandling,
      speed: finalSpeed,
      flyingSpeed: finalFlyingSpeed,
      armor: finalArmor
    };
    
    // Store base stats for reference
    (this as any).baseAttributes = {
      autopilot: baseAutopilot,
      structure: baseStructure,
      handling: baseHandling,
      speed: baseSpeed,
      flyingSpeed: baseFlyingSpeed,
      armor: baseArmor
    };
    
    // Store weapon mount info
    (this as any).weaponMount = finalWeaponMount;
    
    // Calculate damage thresholds for vehicles
    // Based on the formulas:
    // - If VD > (3 × Structure) + Armor, incapacitating damage
    // - If VD > (2 × Structure) + Armor, severe damage
    // - If VD > Structure + Armor, light damage
    // - If VD ≤ Structure + Armor, no damage
    
    (this as any).damageThresholds = {
      light: baseStructure + finalArmor,
      severe: (2 * baseStructure) + finalArmor,
      incapacitating: (3 * baseStructure) + finalArmor
    };
    
    // Ensure damage arrays are properly sized (preserve existing values)
    // CRITICAL: Read from source data first to preserve persisted values
    // In Foundry v13, when prepareDerivedData() is called, (this as any).damage
    // should already contain the persisted values from _source, but we need to
    // ensure we're working with a copy to avoid mutating the source
    const parent = (this as any).parent;
    const sourceDamage = parent?._source?.system?.damage || (this as any).damage || {};
    
    // Base: 2 light, 1 severe, 1 incapacitating
    const totalLightBoxes = 2;
    const totalSevereBoxes = 1;
    
    // Create a copy from source to preserve persisted values
    const damage: any = {
      light: Array.isArray(sourceDamage.light) ? [...sourceDamage.light] : [false, false],
      severe: Array.isArray(sourceDamage.severe) ? [...sourceDamage.severe] : [false],
      incapacitating: typeof sourceDamage.incapacitating === 'boolean' ? sourceDamage.incapacitating : false
    };
    
    // Adjust light damage array size (preserve existing values, only pad or trim from end)
    while (damage.light.length < totalLightBoxes) {
      damage.light.push(false);
    }
    while (damage.light.length > totalLightBoxes) {
      damage.light.pop();
    }
    
    // Adjust severe damage array size (preserve existing values, only pad or trim from end)
    while (damage.severe.length < totalSevereBoxes) {
      damage.severe.push(false);
    }
    while (damage.severe.length > totalSevereBoxes) {
      damage.severe.pop();
    }
    
    // Assign the damage object (this updates derived data, source data remains unchanged)
    (this as any).damage = damage;
    
    (this as any).totalLightBoxes = totalLightBoxes;
    (this as any).totalSevereBoxes = totalSevereBoxes;
    
    // Calculate cost (same rules as vehicle feats: base 5000 + bonuses * 5000)
    let calculatedCost = 5000; // Base cost for vehicle/drone
    
    // Add cost for bonuses (each bonus point costs 5000)
    calculatedCost += autopilotBonus * 5000;
    calculatedCost += speedBonus * 5000;
    calculatedCost += handlingBonus * 5000;
    calculatedCost += armorBonus * 5000;
    
    // Add cost for options
    if (isFlying) {
      calculatedCost += 5000; // +1 level = +5000
    }
    if (weaponMountImprovement) {
      calculatedCost += 5000; // +1 level = +5000
    }
    if (autopilotUnlocked) {
      calculatedCost += 15000; // +3 levels = +15000
    }
    if (additionalDroneCount > 0) {
      calculatedCost += additionalDroneCount * 10000; // +2 levels per drone = +10000 per drone
    }
    if (isFixed) {
      calculatedCost -= 5000; // -1 level = -5000
    }
    
    // Add cost for narrative effects based on their values (5000 per point of value)
    // Positive values add to cost, negative values reduce cost
    const narrativeEffects = (this as any).narrativeEffects || [];
    let narrativeEffectsCost = 0;
    
    narrativeEffects.forEach((effect: any) => {
      // Handle both old format (strings) and new format (objects)
      if (typeof effect === 'string') {
        // Old format: each string effect counts as +1 (5000 yens)
        if (effect && effect.trim() !== '') {
          narrativeEffectsCost += 5000;
        }
      } else if (effect && typeof effect === 'object') {
        // New format: use the value of the effect
        // Each point of absolute value = 5000 yens (positive adds, negative subtracts)
        const value = effect.value !== undefined && effect.value !== null ? effect.value : 0;
        
        if (value !== 0) {
          // Each point of value = 5000 yens per palier (positive adds, negative subtracts)
          narrativeEffectsCost += value * 5000;
        }
      }
    });
    
    calculatedCost += narrativeEffectsCost;
    
    // Add cost for weapons (get from actor items)
    const actor = (this as any).parent;
    if (actor && actor.items) {
      const weapons = actor.items.filter((item: any) => {
        const featType = item.system?.featType;
        return featType === 'weapon' || featType === 'weapons-spells';
      });
      
      weapons.forEach((weapon: any) => {
        const weaponCost = weapon.system?.calculatedCost || 0;
        calculatedCost += weaponCost;
      });
    }
    
    (this as any).calculatedCost = calculatedCost;
  }
}



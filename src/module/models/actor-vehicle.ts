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
      narrativeEffects: new fields.ArrayField(new fields.StringField({
        required: false,
        initial: ""
      }), {
        initial: [],
        label: "SRA2.VEHICLE.NARRATIVE_EFFECTS"
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
    const baseAutopilot = vehicleStats?.autopilot || 6;
    const baseStructure = vehicleStats?.structure || 2;
    const baseHandling = vehicleStats?.handling || 5;
    const baseSpeed = vehicleStats?.speed || 3;
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
    const existingDamage = (this as any).damage || {};
    
    // Base: 2 light, 1 severe, 1 incapacitating
    const totalLightBoxes = 2;
    const totalSevereBoxes = 1;
    
    // Create a copy of damage to avoid mutating the original
    const damage: any = {
      light: Array.isArray(existingDamage.light) ? [...existingDamage.light] : [false, false],
      severe: Array.isArray(existingDamage.severe) ? [...existingDamage.severe] : [false],
      incapacitating: typeof existingDamage.incapacitating === 'boolean' ? existingDamage.incapacitating : false
    };
    
    // Adjust light damage array (preserve existing values, only pad or trim)
    while (damage.light.length < totalLightBoxes) {
      damage.light.push(false);
    }
    while (damage.light.length > totalLightBoxes) {
      damage.light.pop();
    }
    
    // Adjust severe damage array (preserve existing values, only pad or trim)
    while (damage.severe.length < totalSevereBoxes) {
      damage.severe.push(false);
    }
    while (damage.severe.length > totalSevereBoxes) {
      damage.severe.pop();
    }
    
    // Reassign the damage object to ensure it's properly stored
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
    
    // Add cost for narrative effects (5000 per effect)
    const narrativeEffects = (this as any).narrativeEffects || [];
    const narrativeEffectsCount = narrativeEffects.filter((effect: string) => effect && effect.trim() !== '').length;
    calculatedCost += narrativeEffectsCount * 5000;
    
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



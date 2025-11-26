import { SYSTEM } from "./config/system.ts";
import { setSidebarIcons, setControlIcons, setCompendiumBanners } from "./config/ui-config.ts";

// Expose the SYSTEM object to the global scope
globalThis.SYSTEM = SYSTEM;

import * as models from "./models/_module.ts";
import * as documents from "./documents/_module.ts";
import * as applications from "./applications/_module.ts";
import * as CombatHelpers from "./helpers/combat-helpers.ts";
// @ts-ignore - JavaScript module without type declarations
import { Migrations } from "./migration/migration.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_3 } from "./migration/migration-13.0.3.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_4 } from "./migration/migration-13.0.4.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_5 } from "./migration/migration-13.0.5.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_6 } from "./migration/migration-13.0.6.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_7 } from "./migration/migration-13.0.7.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_8 } from "./migration/migration-13.0.8.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_9 } from "./migration/migration-13.0.9.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_10 } from "./migration/migration-13.0.10.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_11 } from "./migration/migration-13.0.11.mjs";
// @ts-ignore - JavaScript module without type declarations
import { Migration_13_0_12 } from "./migration/migration-13.0.12.mjs";
// @ts-ignore - JavaScript module without type declarations
import { HOOKS } from "./hooks.mjs";

export class SRA2System {
  static start(): void {
    new SRA2System();
  }

  constructor() {
    if (game.system) {
      game.system.sra2 = this;
    }
    Hooks.once('init', () => this.onInit());
  }
  
  onInit(): void {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onInit');
    if (game.system) {
      game.system.api = {
        applications,
        models,
        documents,
      };
    }
    
    // Register theme setting
    this.registerThemeSetting();
    
    // Configure UI elements (icons, banners)
    setSidebarIcons();
    setControlIcons();
    setCompendiumBanners();
    
    // Register migrations
    new Migrations();
    Hooks.on(HOOKS.MIGRATIONS, (declareMigration: any) => {
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
    
    // Register custom Actor document class
    CONFIG.Actor.documentClass = documents.SRA2Actor;
    
    // Register Actor data models
    CONFIG.Actor.dataModels = {
      character: models.CharacterDataModel,
      vehicle: models.VehicleDataModel,
      ice: models.IceDataModel,
    };
    
    // Register Item data models
    CONFIG.Item.dataModels = {
      skill: models.SkillDataModel,
      feat: models.FeatDataModel,
      specialization: models.SpecializationDataModel,
      metatype: models.MetatypeDataModel,
    };
    
    // Register character sheet (PC view - default)
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.CharacterSheet, {
      types: ["character"],
      makeDefault: true,
      label: "SRA2.SHEET.CHARACTER"
    });
    
    // Register NPC sheet (simplified view for same character type)
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.NpcSheet, {
      types: ["character"],
      makeDefault: false,
      label: "SRA2.SHEET.NPC"
    });
    
    // Register vehicle sheet
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.VehicleSheet, {
      types: ["vehicle"],
      makeDefault: true,
      label: "SRA2.SHEET.VEHICLE"
    });
    
    // Register ICE sheet
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.IceSheet, {
      types: ["ice"],
      makeDefault: true,
      label: "SRA2.SHEET.ICE"
    });
    
    // Hook to ensure all vehicle actors are available in game.actors before cost calculations
    // This runs after all actors are loaded to ensure vehicles are accessible synchronously
    Hooks.on('ready', () => {
      if (!game.actors) return;
      
      // Find all character actors and ensure their linked vehicles have calculatedCost
      const characterActors = (game.actors as any).filter((actor: any) => actor.type === 'character');
      
      for (const charActor of characterActors) {
        const linkedVehicles = (charActor.system as any)?.linkedVehicles || [];
        
        // Ensure all linked vehicles have their costs calculated
        for (const vehicleUuid of linkedVehicles) {
          try {
            // Find vehicle in game.actors (should be available at 'ready' hook)
            let vehicleActor = (game.actors as any).find((actor: any) => actor.uuid === vehicleUuid);
            
            // If not found by UUID, try by ID
            if (!vehicleActor) {
              const uuidParts = vehicleUuid.split('.');
              if (uuidParts.length >= 3) {
                const actorId = uuidParts[uuidParts.length - 1];
                vehicleActor = (game.actors as any).get(actorId);
              }
            }
            
            // If vehicle found and it's a vehicle type, ensure its cost is calculated
            if (vehicleActor && vehicleActor.type === 'vehicle') {
              // Trigger prepareDerivedData on vehicle if not already calculated
              if (vehicleActor.system && (vehicleActor.system as any).prepareDerivedData) {
                (vehicleActor.system as any).prepareDerivedData();
              }
            }
          } catch (error) {
            console.debug(`Vehicle ${vehicleUuid} not found in game.actors (may be in compendium)`);
          }
        }
        
        // Now trigger prepareDerivedData on character to recalculate cost with vehicles
        try {
          if (charActor.system && (charActor.system as any).prepareDerivedData) {
            (charActor.system as any).prepareDerivedData();
          }
        } catch (error) {
          console.debug(`Failed to recalculate cost for character ${charActor.name}:`, error);
        }
      }
    });
    
    // Hook to update character sheets when linked vehicles are updated
    Hooks.on('updateActor', (actor: any, updateData: any, options: any, userId: string) => {
      // Only process vehicle actors
      if (actor.type !== 'vehicle') return;
      
      // Find all character actors that have this vehicle linked
      if (game.actors) {
        const vehicleUuid = actor.uuid;
        const characterActors = (game.actors as any).filter((char: any) => {
          if (char.type !== 'character') return false;
          const linkedVehicles = (char.system as any)?.linkedVehicles || [];
          return linkedVehicles.includes(vehicleUuid);
        });
        
        // Re-render character sheets that have this vehicle linked
        // Use a small delay to ensure derived data is recalculated
        setTimeout(() => {
          characterActors.forEach((char: any) => {
            if (char.sheet && char.sheet.rendered) {
              char.sheet.render(false);
            }
          });
        }, 100);
      }
    });

    // Hook to update character sheets when items are created/deleted on linked vehicles
    // This ensures the cost is recalculated when weapons are added/removed
    Hooks.on('createItem', (item: any, options: any, userId: string) => {
      const actor = item.parent;
      if (!actor || actor.type !== 'vehicle') return;

      // Check if this is a weapon item
      const featType = item.system?.featType;
      if (featType !== 'weapon' && featType !== 'weapons-spells') return;

      // Force vehicle to recalculate its cost first
      if (actor.system) {
        (actor.system as any).prepareDerivedData();
      }

      // Find all character actors that have this vehicle linked
      if (game.actors) {
        const vehicleUuid = actor.uuid;
        const characterActors = (game.actors as any).filter((char: any) => {
          if (char.type !== 'character') return false;
          const linkedVehicles = (char.system as any)?.linkedVehicles || [];
          return linkedVehicles.includes(vehicleUuid);
        });

        // Force recalculation of derived data and re-render character sheets
        characterActors.forEach((char: any) => {
          // Force prepareDerivedData to recalculate
          if (char.system) {
            (char.system as any).prepareDerivedData();
          }
          if (char.sheet && char.sheet.rendered) {
            setTimeout(() => {
              char.sheet.render(false);
            }, 100);
          }
        });
      }
    });

    Hooks.on('deleteItem', (item: any, options: any, userId: string) => {
      const actor = item.parent;
      if (!actor || actor.type !== 'vehicle') return;

      // Check if this was a weapon item
      const featType = item.system?.featType;
      if (featType !== 'weapon' && featType !== 'weapons-spells') return;

      // Force vehicle to recalculate its cost first
      if (actor.system) {
        (actor.system as any).prepareDerivedData();
      }

      // Find all character actors that have this vehicle linked
      if (game.actors) {
        const vehicleUuid = actor.uuid;
        const characterActors = (game.actors as any).filter((char: any) => {
          if (char.type !== 'character') return false;
          const linkedVehicles = (char.system as any)?.linkedVehicles || [];
          return linkedVehicles.includes(vehicleUuid);
        });

        // Force recalculation of derived data and re-render character sheets
        characterActors.forEach((char: any) => {
          // Force prepareDerivedData to recalculate
          if (char.system) {
            (char.system as any).prepareDerivedData();
          }
          if (char.sheet && char.sheet.rendered) {
            setTimeout(() => {
              char.sheet.render(false);
            }, 100);
          }
        });
      }
    });
    
    // Also handle when vehicle is deleted
    Hooks.on('deleteActor', (actor: any, options: any, userId: string) => {
      // Only process vehicle actors
      if (actor.type !== 'vehicle') return;
      
      // Find all character actors that have this vehicle linked and remove it
      if (game.actors) {
        const vehicleUuid = actor.uuid;
        const characterActors = (game.actors as any).filter((char: any) => {
          if (char.type !== 'character') return false;
          const linkedVehicles = (char.system as any)?.linkedVehicles || [];
          return linkedVehicles.includes(vehicleUuid);
        });
        
        // Remove the vehicle from linked vehicles and re-render
        characterActors.forEach(async (char: any) => {
          const linkedVehicles = (char.system as any)?.linkedVehicles || [];
          const updatedLinkedVehicles = linkedVehicles.filter((uuid: string) => uuid !== vehicleUuid);
          await char.update({ 'system.linkedVehicles': updatedLinkedVehicles });
          
          if (char.sheet && char.sheet.rendered) {
            char.sheet.render(false);
          }
        });
      }
    });
    
    // Register feat sheet
    DocumentSheetConfig.registerSheet(Item, "sra2", applications.FeatSheet, {
      types: ["feat"],
      makeDefault: true,
      label: "SRA2.SHEET.FEAT"
    });
    
    // Register skill sheet
    DocumentSheetConfig.registerSheet(Item, "sra2", applications.SkillSheet, {
      types: ["skill"],
      makeDefault: true,
      label: "SRA2.SHEET.SKILL"
    });
    
    // Register specialization sheet
    DocumentSheetConfig.registerSheet(Item, "sra2", applications.SpecializationSheet, {
      types: ["specialization"],
      makeDefault: true,
      label: "SRA2.SHEET.SPECIALIZATION"
    });
    
    // Register metatype sheet
    DocumentSheetConfig.registerSheet(Item, "sra2", applications.MetatypeSheet, {
      types: ["metatype"],
      makeDefault: true,
      label: "SRA2.SHEET.METATYPE"
    });
    
    // Register Handlebars helpers
    Handlebars.registerHelper('add', function(a: number, b: number) {
      return a + b;
    });
    
    Handlebars.registerHelper('eq', function(a: any, b: any) {
      return a === b;
    });
    
    Handlebars.registerHelper('gt', function(a: any, b: any) {
      return a > b;
    });
    
    Handlebars.registerHelper('gte', function(a: any, b: any) {
      return a >= b;
    });
    
    Handlebars.registerHelper('concat', function(...args: any[]) {
      // Remove the last argument which is the Handlebars options object
      const values = args.slice(0, -1);
      return values.join('');
    });
    
    Handlebars.registerHelper('uppercase', function(str: string) {
      return str ? str.toUpperCase() : '';
    });
    
    // Helper to check if a dice result is a success based on roll mode
    Handlebars.registerHelper('isSuccess', function(result: number, rollMode: string) {
      if (rollMode === 'advantage') {
        return result >= 4;
      } else if (rollMode === 'disadvantage') {
        return result === 6;
      } else {
        return result >= 5;
      }
    });
    
    // Helper to multiply two numbers
    Handlebars.registerHelper('multiply', function(a: number, b: number) {
      return a * b;
    });
    
    // Helper to check if two values are not equal
    Handlebars.registerHelper('ne', function(a: any, b: any) {
      return a !== b;
    });
    
    // Helper to stringify JSON
    Handlebars.registerHelper('json', function(context: any) {
      return JSON.stringify(context);
    });
    
    // Register chat message hook for apply damage buttons
    Hooks.on('renderChatMessage', (message: any, html: any) => {
      // Remove existing handlers first to prevent duplicates
      html.find('.apply-damage-button').off('click');
      
      html.find('.apply-damage-button').on('click', async (event: any) => {
        event.preventDefault();
        event.stopImmediatePropagation(); // Prevent other handlers from executing
        
        const button = $(event.currentTarget);
        
        // Check if button is already disabled to prevent double-clicks
        if (button.prop('disabled')) {
          return;
        }
        
        // Template uses data-target-uuid, not data-defender-uuid
        const targetUuid = button.data('target-uuid') || button.data('defender-uuid');
        const damage = parseInt(button.data('damage')) || 0;
        const targetName = button.data('target-name') || button.data('defender-name');
        const damageType = (button.data('damage-type') || 'physical') as 'physical' | 'mental';
        
        if (!targetUuid) {
          console.error('Apply damage button: No target UUID found in button data attributes');
          ui.notifications?.error('Impossible de trouver la cible pour appliquer les dégâts');
          return;
        }
        
        if (damage <= 0) {
          ui.notifications?.info('Aucun dégât à appliquer');
          return;
        }
        
        // Disable button to prevent double-click
        button.prop('disabled', true);
        
        console.log('Apply damage button clicked:', { targetUuid, targetName, damage, damageType });
        
        try {
          await CombatHelpers.applyDamage(targetUuid, damage, targetName, damageType);
        } catch (error) {
          console.error('Error applying damage:', error);
          ui.notifications?.error('Erreur lors de l\'application des dégâts');
        } finally {
          // Re-enable button after a short delay
          setTimeout(() => button.prop('disabled', false), 1000);
        }
      });

      // Defense button handler - remove existing handlers first to prevent duplicates
      html.find('.defend-button').off('click');
      
      html.find('.defend-button').on('click', async (event: any) => {
        event.preventDefault();
        
        // Get data from message flags (more reliable)
        const messageFlags = message.flags?.sra2;
        if (!messageFlags) {
          console.error('Missing message flags');
          return;
        }

        const rollResult = messageFlags.rollResult;
        const rollData = messageFlags.rollData;
        
        if (!rollResult || !rollData) {
          console.error('Missing roll data in message flags');
          return;
        }

        // Get tokens from flags (priority: token UUID > actor UUID > actor ID)
        let attackerToken: any = null;
        let defenderToken: any = null;
        let attacker: any = null;
        let defender: any = null;
        
        // Log all flags for debugging
        console.log('=== DEFENSE BUTTON - MESSAGE FLAGS ===');
        console.log('attackerUuid flag:', messageFlags.attackerUuid || 'Not set');
        console.log('attackerTokenUuid flag:', messageFlags.attackerTokenUuid || 'Not set');
        console.log('attackerId flag:', messageFlags.attackerId || 'Not set');
        console.log('defenderUuid flag:', messageFlags.defenderUuid || 'Not set');
        console.log('defenderTokenUuid flag:', messageFlags.defenderTokenUuid || 'Not set');
        console.log('defenderId flag:', messageFlags.defenderId || 'Not set');
        console.log('======================================');
        
        // Use attacker UUID directly from flags (already correctly calculated)
        // Priority: 1) attackerUuid from flags (already calculated correctly), 2) attackerTokenUuid from flags
        if (messageFlags.attackerUuid) {
          try {
            attacker = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerUuid) || null;
            if (attacker) {
              console.log('Defense button: Attacker loaded directly from attackerUuid flag:', messageFlags.attackerUuid);
            }
          } catch (e) {
            console.warn('Defense button: Failed to load attacker from attackerUuid flag:', e);
          }
        }
        
        // Get attacker token from UUID if available (priority: flag > canvas search)
        if (messageFlags.attackerTokenUuid) {
          try {
            attackerToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerTokenUuid) || null;
            if (attackerToken?.actor && !attacker) {
              // Use token's actor if attacker not loaded yet
              attacker = attackerToken.actor;
              console.log('Defense button: Attacker loaded from attackerTokenUuid flag, using token actor');
            }
          } catch (e) {
            console.warn('Defense button: Failed to load attacker token from attackerTokenUuid flag:', e);
          }
        }
        
        // Fallback: try to get actor and find token on canvas (only if flags didn't work)
        if (!attacker) {
          if (messageFlags.attackerId) {
            attacker = game.actors?.get(messageFlags.attackerId) || null;
          }
          
          if (attacker && !attackerToken) {
            attackerToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === attacker.id || token.actor?.uuid === attacker.uuid;
            }) || null;
          }
        }
        
        // Use defender UUID directly from flags (already correctly calculated)
        // Priority: 1) defenderUuid from flags (already calculated correctly), 2) defenderTokenUuid from flags
        if (messageFlags.defenderUuid) {
          try {
            defender = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderUuid) || null;
            if (defender) {
              console.log('Defense button: Defender loaded directly from defenderUuid flag');
            }
          } catch (e) {
            console.warn('Defense button: Failed to load defender from defenderUuid flag:', e);
          }
        }
        
        // Get defender token from UUID if available (priority: flag > canvas search)
        if (messageFlags.defenderTokenUuid) {
          try {
            defenderToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderTokenUuid) || null;
            if (defenderToken?.actor && !defender) {
              // Use token's actor if defender not loaded yet
              defender = defenderToken.actor;
              console.log('Defense button: Defender loaded from defenderTokenUuid flag, using token actor');
            }
          } catch (e) {
            console.warn('Defense button: Failed to load defender token from defenderTokenUuid flag:', e);
          }
        }
        
        // Fallback: try to get actor and find token on canvas (only if flags didn't work)
        if (!defender) {
          if (messageFlags.defenderId) {
            defender = game.actors?.get(messageFlags.defenderId) || null;
          }
          
          if (defender && !defenderToken) {
            defenderToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === defender.id || token.actor?.uuid === defender.uuid;
            }) || null;
          }
        }

        // Extract information - use UUIDs directly from flags as they are already correctly calculated
        const success = rollResult.totalSuccesses || 0;
        const damage = rollData.damageValue || 0;
        const attackerName = attacker?.name || 'Unknown';
        const attackerId = attacker?.id || messageFlags.attackerId || 'Unknown';
        const attackerUuid = messageFlags.attackerUuid || attacker?.uuid || 'Unknown'; // Use flag UUID first (already calculated correctly)
        const defenderName = defender?.name || 'Unknown';
        const defenderId = defender?.id || messageFlags.defenderId || 'Unknown';
        const defenderUuid = messageFlags.defenderUuid || defender?.uuid || 'Unknown'; // Use flag UUID first (already calculated correctly)
        
        // Log the UUIDs that will be used
        console.log('--- UUIDs being used from flags ---');
        console.log('attackerUuid (from flag):', messageFlags.attackerUuid || 'Not in flag, using:', attacker?.uuid || 'Unknown');
        console.log('defenderUuid (from flag):', messageFlags.defenderUuid || 'Not in flag, using:', defender?.uuid || 'Unknown');
        console.log('attackerTokenUuid (from flag):', messageFlags.attackerTokenUuid || 'Not in flag');
        console.log('defenderTokenUuid (from flag):', messageFlags.defenderTokenUuid || 'Not in flag');
        console.log('attacker loaded:', attacker ? `${attacker.name} (${attacker.uuid})` : 'Not loaded');
        console.log('defender loaded:', defender ? `${defender.name} (${defender.uuid})` : 'Not loaded');
        console.log('attackerToken loaded:', attackerToken ? `Found (${attackerToken.uuid || attackerToken.document?.uuid})` : 'Not loaded');
        console.log('defenderToken loaded:', defenderToken ? `Found (${defenderToken.uuid || defenderToken.document?.uuid})` : 'Not loaded');
        const defenseSkill = rollData.linkedDefenseSkill || null;
        const defenseSpec = rollData.linkedDefenseSpecialization || null;
        const attackSkill = rollData.linkedAttackSkill || rollData.skillName || null;
        const attackSpec = rollData.linkedAttackSpecialization || rollData.specName || null;

        // Console log all information
        console.log('=== DEFENSE CLICK ===');
        console.log('Success:', success);
        console.log('Damage:', damage);
        console.log('Attacker:', attackerName);
        console.log('Attacker ID:', attackerId);
        console.log('Attacker UUID:', attackerUuid);
        console.log('Attacker Token UUID:', attackerToken?.uuid || attackerToken?.document?.uuid || 'Unknown');
        console.log('Defender:', defenderName);
        console.log('Defender ID:', defenderId);
        console.log('Defender UUID:', defenderUuid);
        console.log('Defender Token UUID:', defenderToken?.uuid || defenderToken?.document?.uuid || 'Unknown');
        console.log('Skill de defense:', defenseSkill);
        console.log('Spe de defense:', defenseSpec);
        console.log('Skill d\'attaque:', attackSkill);
        console.log('Spe d\'attaque:', attackSpec);
        console.log('===================');

        // Check if defender is a vehicle (vehicles use autopilot instead of defense skill)
        const isVehicleDefender = defender?.type === 'vehicle';
        
        // Open defense roll dialog
        if (!defender) {
          console.error('Missing defender');
          return;
        }

        // Get defender token from UUID (for NPCs, we need the token instance)
        // For NPCs, the actor is linked to the token, so we need to use the token's actor
        let defenderTokenForRoll: any = null;
        let defenderActorForRoll: any = defender; // Default to defender actor
        
        const defenderTokenUuidFromFlags = messageFlags.defenderTokenUuid;
        if (defenderTokenUuidFromFlags) {
          try {
            defenderTokenForRoll = (foundry.utils as any)?.fromUuidSync?.(defenderTokenUuidFromFlags) || null;
            // For NPCs, use the token's actor (which may be different from the base actor)
            if (defenderTokenForRoll?.actor) {
              defenderActorForRoll = defenderTokenForRoll.actor;
            }
          } catch (e) {
            // Fallback to finding token on canvas
            defenderTokenForRoll = defenderToken;
            if (defenderToken?.actor) {
              defenderActorForRoll = defenderToken.actor;
            }
          }
        } else {
          defenderTokenForRoll = defenderToken;
          if (defenderToken?.actor) {
            defenderActorForRoll = defenderToken.actor;
          }
        }

        // Check if this is an ICE attack
        const isIceAttack = messageFlags.rollType === 'ice-attack' || rollData.itemType === 'ice-attack';
        
        // Determine which skill/spec to use for defense
        // Priority: 1) attack spec from weapon (if using weapon for defense), 2) defenseSpec if found, 3) defenseSkill if found, 4) fallback based on attack type
        let finalDefenseSkill: string | null = null;
        let finalDefenseSpec: string | null = null;
        
        // For ICE attacks, always use Piratage (cybercombat)
        if (isIceAttack) {
          finalDefenseSkill = 'Piratage';
          // Try to find cybercombat specialization
          const cybercombatSpec = defenderActorForRoll.items.find((item: any) => {
            if (item.type !== 'specialization') return false;
            const specSystem = item.system as any;
            return item.name === 'Cybercombat' && specSystem.linkedSkill === 'Piratage';
          });
          if (cybercombatSpec) {
            finalDefenseSpec = 'Cybercombat';
          }
        }
        
        // First, try to use the attack specialization from the weapon (if defending with a weapon)
        // This allows using "Lames" specialization when defending with a short weapon
        // Priority: use attack spec over defense spec when defending with a weapon
        if (!isIceAttack && attackSpec) {
          // Check if this attack spec exists in the defender's items and is linked to "Combat rapproché"
          const spec = defenderActorForRoll.items.find((item: any) => {
            if (item.type !== 'specialization') return false;
            const specSystem = item.system as any;
            return item.name === attackSpec && specSystem.linkedSkill === 'Combat rapproché';
          });
          if (spec) {
            finalDefenseSpec = spec.name;
            const specSystem = spec.system as any;
            finalDefenseSkill = specSystem.linkedSkill;
          }
        }
        
        // Try to find the defense spec (from weapon's linkedDefenseSpecialization)
        if (!finalDefenseSpec && defenseSpec) {
          const spec = defenderActorForRoll.items.find((item: any) => 
            item.type === 'specialization' && item.name === defenseSpec
          );
          if (spec) {
            finalDefenseSpec = defenseSpec;
            const specSystem = spec.system as any;
            const linkedSkillName = specSystem.linkedSkill;
            finalDefenseSkill = linkedSkillName;
          }
        }
        
        // If spec not found, try to find the defense skill
        if (!finalDefenseSpec && defenseSkill) {
          const skill = defenderActorForRoll.items.find((item: any) => 
            item.type === 'skill' && item.name === defenseSkill
          );
          if (skill) {
            finalDefenseSkill = defenseSkill;
          }
        }
        
        // Calculate skill/spec levels for defender (use token's actor for NPCs)
        let defenseSkillLevel: number | undefined = undefined;
        let defenseSpecLevel: number | undefined = undefined;
        let defenseLinkedAttribute: string | undefined = undefined;

        // For vehicles, use autopilot instead of defense skill
        if (isVehicleDefender) {
          // Vehicles use autopilot for defense
          const autopilot = (defenderActorForRoll.system as any)?.attributes?.autopilot || 0;
          finalDefenseSkill = 'Autopilot'; // Special skill name for vehicles
          defenseSkillLevel = autopilot;
          defenseLinkedAttribute = undefined; // Vehicles don't use attributes
        } else {
          // Fallback: determine based on attack type (melee or ranged)
          if (!finalDefenseSkill) {
            // Check if it's a melee attack (check meleeRange in rollData)
            const isMeleeAttack = rollData.meleeRange && rollData.meleeRange !== 'none';
            if (isMeleeAttack) {
              finalDefenseSkill = 'Combat rapproché';
            } else {
              finalDefenseSkill = 'Athlétisme';
            }
          }

          // Calculate skill/spec levels for defender
          if (finalDefenseSpec) {
            const spec = defenderActorForRoll.items.find((item: any) => 
              item.type === 'specialization' && item.name === finalDefenseSpec
            );
            if (spec) {
              const specSystem = spec.system as any;
              const linkedSkillName = specSystem.linkedSkill;
              const linkedSkill = defenderActorForRoll.items.find((item: any) => 
                item.type === 'skill' && item.name === linkedSkillName
              );
              if (linkedSkill) {
                const skillRating = (linkedSkill.system as any).rating || 0;
                const specRating = specSystem.rating || 0;
                defenseLinkedAttribute = specSystem.linkedAttribute || (linkedSkill.system as any).linkedAttribute || 'strength';
                const attributeValue = defenseLinkedAttribute ? ((defenderActorForRoll.system as any)?.attributes?.[defenseLinkedAttribute] || 0) : 0;
                
                defenseSkillLevel = attributeValue + skillRating;
                defenseSpecLevel = defenseSkillLevel + specRating;
              }
            }
          } else if (finalDefenseSkill) {
            const skill = defenderActorForRoll.items.find((item: any) => 
              item.type === 'skill' && item.name === finalDefenseSkill
            );
            if (skill) {
              const skillSystem = skill.system as any;
              const skillRating = skillSystem.rating || 0;
              defenseLinkedAttribute = skillSystem.linkedAttribute || 'strength';
              const attributeValue = defenseLinkedAttribute ? ((defenderActorForRoll.system as any)?.attributes?.[defenseLinkedAttribute] || 0) : 0;
              
              defenseSkillLevel = attributeValue + skillRating;
            }
          }
        }

        // Final check: ensure we have a defense skill (or autopilot for vehicles)
        if (!finalDefenseSkill && !isVehicleDefender) {
          console.error('Could not determine defense skill for non-vehicle defender');
          return;
        }

        // Get RR sources for defense skill/spec (use token's actor for NPCs)
        // Note: Vehicles don't have RR sources for autopilot
        const { getRRSources } = await import('./helpers/sheet-helpers.js');
        let defenseRRList: any[] = [];
        if (!isVehicleDefender) {
          // Only get RR sources for non-vehicles
          if (finalDefenseSpec) {
            const rrSources = getRRSources(defenderActorForRoll, 'specialization', finalDefenseSpec);
            defenseRRList = rrSources.map((rr: any) => ({
              ...rr,
              featName: rr.featName
            }));
          } else if (finalDefenseSkill) {
            const rrSources = getRRSources(defenderActorForRoll, 'skill', finalDefenseSkill);
            defenseRRList = rrSources.map((rr: any) => ({
              ...rr,
              featName: rr.featName
            }));
          }
        }

        // Get token UUIDs
        // For defense: attacker = defender (one defending), defender = original attacker
        const originalAttackerTokenUuid = attackerToken?.uuid || attackerToken?.document?.uuid || messageFlags.attackerTokenUuid || undefined;
        const defenderTokenUuid = defenderTokenForRoll?.uuid || defenderTokenForRoll?.document?.uuid || defenderToken?.uuid || defenderToken?.document?.uuid || messageFlags.defenderTokenUuid || undefined;
        
        // Prepare defense roll data
        // In defense context:
        // - attacker = defender (one defending) -> attackerTokenUuid should be defender's token
        // - defender = original attacker -> defenderTokenUuid should be original attacker's token
        const defenseRollData: any = {
          // Use final defense skill/spec (with fallback)
          skillName: finalDefenseSkill,
          specName: finalDefenseSpec,
          linkedAttribute: defenseLinkedAttribute,
          skillLevel: defenseSkillLevel,
          specLevel: defenseSpecLevel,
          
          // Actor is the defender - use UUID directly from flags (already correctly calculated)
          actorId: defenderActorForRoll.id,
          actorUuid: messageFlags.defenderUuid || defenderActorForRoll.uuid, // Use flag UUID first
          
          // Token UUIDs - for defense, attackerToken is the defender's token, defenderToken is the original attacker's token
          attackerTokenUuid: defenderTokenUuid, // Defender's token (one defending) - this is what will be attacker in RollDialog
          defenderTokenUuid: originalAttackerTokenUuid, // Original attacker's token (target) - this is what will be target/defender in RollDialog
          
          // RR List
          rrList: defenseRRList,
          
          // Defense flags
          isDefend: true,
          isCounterAttack: false,
          
          // Store original attack roll data for comparison
          attackRollResult: rollResult,
          attackRollData: rollData
        };

        // Import and open RollDialog
        const { RollDialog } = await import('./applications/roll-dialog.js');
        const dialog = new RollDialog(defenseRollData);
        
        // Set target token to original attacker's token (in defense context, target = original attacker)
        if (attackerToken) {
          (dialog as any).targetToken = attackerToken;
        }
        
        dialog.render(true);
      });

      // Counter-attack button handler - remove existing handlers first to prevent duplicates
      html.find('.counter-attack-button').off('click');
      
      html.find('.counter-attack-button').on('click', async (event: any) => {
        event.preventDefault();
        
        // Get data from message flags (more reliable)
        const messageFlags = message.flags?.sra2;
        if (!messageFlags) {
          console.error('Missing message flags');
          return;
        }

        const rollResult = messageFlags.rollResult;
        const rollData = messageFlags.rollData;
        
        if (!rollResult || !rollData) {
          console.error('Missing roll data in message flags');
          return;
        }

        // Get tokens from flags (priority: token UUID > actor UUID > actor ID)
        let attackerToken: any = null;
        let defenderToken: any = null;
        let attacker: any = null;
        let defender: any = null;
        
        // Log all flags for debugging
        console.log('=== COUNTER-ATTACK BUTTON - MESSAGE FLAGS ===');
        console.log('attackerUuid flag:', messageFlags.attackerUuid || 'Not set');
        console.log('attackerTokenUuid flag:', messageFlags.attackerTokenUuid || 'Not set');
        console.log('attackerId flag:', messageFlags.attackerId || 'Not set');
        console.log('defenderUuid flag:', messageFlags.defenderUuid || 'Not set');
        console.log('defenderTokenUuid flag:', messageFlags.defenderTokenUuid || 'Not set');
        console.log('defenderId flag:', messageFlags.defenderId || 'Not set');
        console.log('==============================================');
        
        // Use attacker UUID directly from flags (already correctly calculated)
        // Priority: 1) attackerUuid from flags (already calculated correctly), 2) attackerTokenUuid from flags
        if (messageFlags.attackerUuid) {
          try {
            attacker = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerUuid) || null;
            if (attacker) {
              console.log('Counter-attack button: Attacker loaded directly from attackerUuid flag');
            }
          } catch (e) {
            console.warn('Counter-attack button: Failed to load attacker from attackerUuid flag:', e);
          }
        }
        
        // Get attacker token from UUID if available (priority: flag > canvas search)
        if (messageFlags.attackerTokenUuid) {
          try {
            attackerToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerTokenUuid) || null;
            if (attackerToken?.actor && !attacker) {
              // Use token's actor if attacker not loaded yet
              attacker = attackerToken.actor;
              console.log('Counter-attack button: Attacker loaded from attackerTokenUuid flag, using token actor');
            }
          } catch (e) {
            console.warn('Counter-attack button: Failed to load attacker token from attackerTokenUuid flag:', e);
          }
        }
        
        // Fallback: try to get actor and find token on canvas (only if flags didn't work)
        if (!attacker) {
          if (messageFlags.attackerId) {
            attacker = game.actors?.get(messageFlags.attackerId) || null;
          }
          
          if (attacker && !attackerToken) {
            attackerToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === attacker.id || token.actor?.uuid === attacker.uuid;
            }) || null;
          }
        }
        
        // Use defender UUID directly from flags (already correctly calculated)
        // Priority: 1) defenderUuid from flags (already calculated correctly), 2) defenderTokenUuid from flags
        if (messageFlags.defenderUuid) {
          try {
            defender = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderUuid) || null;
            if (defender) {
              console.log('Counter-attack button: Defender loaded directly from defenderUuid flag');
            }
          } catch (e) {
            console.warn('Counter-attack button: Failed to load defender from defenderUuid flag:', e);
          }
        }
        
        // Get defender token from UUID if available (priority: flag > canvas search)
        if (messageFlags.defenderTokenUuid) {
          try {
            defenderToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderTokenUuid) || null;
            if (defenderToken?.actor && !defender) {
              // Use token's actor if defender not loaded yet
              defender = defenderToken.actor;
              console.log('Counter-attack button: Defender loaded from defenderTokenUuid flag, using token actor');
            }
          } catch (e) {
            console.warn('Counter-attack button: Failed to load defender token from defenderTokenUuid flag:', e);
          }
        }
        
        // Fallback: try to get actor and find token on canvas (only if flags didn't work)
        if (!defender) {
          if (messageFlags.defenderId) {
            defender = game.actors?.get(messageFlags.defenderId) || null;
          }
          
          if (defender && !defenderToken) {
            defenderToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === defender.id || token.actor?.uuid === defender.uuid;
            }) || null;
          }
        }

        // Log the UUIDs that will be used
        console.log('--- UUIDs being used from flags (counter-attack) ---');
        console.log('attackerUuid (from flag):', messageFlags.attackerUuid || 'Not in flag, using:', attacker?.uuid || 'Unknown');
        console.log('defenderUuid (from flag):', messageFlags.defenderUuid || 'Not in flag, using:', defender?.uuid || 'Unknown');
        console.log('attackerTokenUuid (from flag):', messageFlags.attackerTokenUuid || 'Not in flag');
        console.log('defenderTokenUuid (from flag):', messageFlags.defenderTokenUuid || 'Not in flag');
        console.log('attacker loaded:', attacker ? `${attacker.name} (${attacker.uuid})` : 'Not loaded');
        console.log('defender loaded:', defender ? `${defender.name} (${defender.uuid})` : 'Not loaded');
        console.log('attackerToken loaded:', attackerToken ? `Found (${attackerToken.uuid || attackerToken.document?.uuid})` : 'Not loaded');
        console.log('defenderToken loaded:', defenderToken ? `Found (${defenderToken.uuid || defenderToken.document?.uuid})` : 'Not loaded');
        
        // Open counter-attack roll dialog
        if (!defender) {
          console.error('Missing defender');
          return;
        }

        // Get defender token from UUID (for NPCs, we need the token instance)
        // For NPCs, the actor is linked to the token, so we need to use the token's actor
        // Use defenderTokenUuid directly from flags (already correctly calculated)
        let defenderTokenForRoll: any = null;
        let defenderActorForRoll: any = defender; // Default to defender actor
        
        const defenderTokenUuidForCounter = messageFlags.defenderTokenUuid || defenderToken?.uuid || defenderToken?.document?.uuid || undefined;
        if (defenderTokenUuidForCounter) {
          try {
            defenderTokenForRoll = (foundry.utils as any)?.fromUuidSync?.(defenderTokenUuidForCounter) || null;
            // For NPCs, use the token's actor (which may be different from the base actor)
            if (defenderTokenForRoll?.actor) {
              defenderActorForRoll = defenderTokenForRoll.actor;
            }
          } catch (e) {
            // Fallback to finding token on canvas
            defenderTokenForRoll = defenderToken;
            if (defenderToken?.actor) {
              defenderActorForRoll = defenderToken.actor;
            }
          }
        } else {
          defenderTokenForRoll = defenderToken;
          if (defenderToken?.actor) {
            defenderActorForRoll = defenderToken.actor;
          }
        }

        // Get all weapons from defender's items for counter-attack
        // Get all items of type 'feat' with featType 'weapon' or 'weapons-spells'
        const allWeapons = defenderActorForRoll.items.filter((item: any) => {
          const isFeat = item.type === 'feat';
          const isWeapon = item.system?.featType === 'weapon' || item.system?.featType === 'weapons-spells';
          return isFeat && isWeapon;
        });

        // Import WEAPON_TYPES to check melee capability
        const { WEAPON_TYPES } = await import('./models/item-feat.js');
        
        // Filter weapons that:
        // 1. Have melee "ok" or "disadvantage"
        // 2. Are linked to "Combat rapproché" skill or a specialization of "Combat rapproché"
        const defenderWeapons = allWeapons.filter((weapon: any) => {
          const weaponSystem = weapon.system as any;
          const weaponType = weaponSystem.weaponType;
          
          // Check meleeRange in weapon system
          const meleeRange = weaponSystem.meleeRange || 'none';
          const hasMeleeInSystem = meleeRange === 'ok' || meleeRange === 'disadvantage';
          
          // Check melee in weapon type
          let hasMeleeInType = false;
          if (weaponType && weaponType !== 'custom-weapon') {
            const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
            if (weaponStats && weaponStats.melee) {
              hasMeleeInType = weaponStats.melee === 'ok' || weaponStats.melee === 'disadvantage';
            }
          }
          
          // Must have melee capability
          if (!hasMeleeInSystem && !hasMeleeInType) {
            return false;
          }
          
          // Get linked attack skill
          let linkedAttackSkill = weaponSystem.linkedAttackSkill;

          // If no linkedAttackSkill, try to get it from weapon type
          if (!linkedAttackSkill && weaponType && weaponType !== 'custom-weapon') {
            const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
            if (weaponStats) {
              linkedAttackSkill = weaponStats.linkedSkill;
            }
          }
          
          // Must be linked to "Combat rapproché" skill
          if (linkedAttackSkill === 'Combat rapproché') {
            return true;
          }
          
          // Check if weapon has a specialization linked to "Combat rapproché"
          // Look for specializations linked to "Combat rapproché" in the actor's items
          const combatRapprocheSpecs = defenderActorForRoll.items.filter((item: any) => 
            item.type === 'specialization' && 
            item.system.linkedSkill === 'Combat rapproché'
          );
          
          // Check if weapon's linkedAttackSkill matches any specialization name
          if (linkedAttackSkill && combatRapprocheSpecs.length > 0) {
            const hasCombatRapprocheSpec = combatRapprocheSpecs.some((spec: any) => 
              spec.name === linkedAttackSkill
            );
            if (hasCombatRapprocheSpec) {
              return true;
            }
          }
          
          // Also check weapon's linkedAttackSpecialization
          const linkedAttackSpecialization = weaponSystem.linkedAttackSpecialization;
          if (linkedAttackSpecialization) {
            const hasCombatRapprocheSpec = combatRapprocheSpecs.some((spec: any) => 
              spec.name === linkedAttackSpecialization
            );
            if (hasCombatRapprocheSpec) {
              return true;
            }
          }
          
          return false;
        });

        console.log('Counter-attack: Filtered weapons with melee capability:', defenderWeapons.length, defenderWeapons.map((w: any) => ({
          name: w.name,
          meleeRange: w.system?.meleeRange,
          weaponType: w.system?.weaponType,
          meleeInType: w.system?.weaponType ? WEAPON_TYPES[w.system.weaponType as keyof typeof WEAPON_TYPES]?.melee : null
        })));

        if (defenderWeapons.length === 0) {
          console.error('Counter-attack: No weapons with melee capability. All items:', defenderActorForRoll.items.map((i: any) => ({
            name: i.name,
            type: i.type,
            featType: i.system?.featType,
            meleeRange: i.system?.meleeRange,
            weaponType: i.system?.weaponType
          })));
          ui.notifications?.warn(game.i18n!.localize('SRA2.COMBAT.COUNTER_ATTACK.NO_WEAPONS') || 'Aucune arme disponible pour la contre-attaque');
          return;
        }

        // Prepare available weapons data for RollDialog
        const availableWeapons = defenderWeapons.map((weapon: any) => {
          const weaponSystem = weapon.system as any;
          const weaponType = weaponSystem.weaponType;
          let linkedAttackSkill = weaponSystem.linkedAttackSkill;
          
          // If no linkedAttackSkill, try to get it from weapon type
          if (!linkedAttackSkill && weaponType && weaponType !== 'custom-weapon') {
            const weaponStats = WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES];
            if (weaponStats) {
              linkedAttackSkill = weaponStats.linkedSkill;
            }
        }

          // Check if linkedAttackSkill is a specialization of "Combat rapproché"
          const combatRapprocheSpecs = defenderActorForRoll.items.filter((item: any) => 
            item.type === 'specialization' && 
            item.system.linkedSkill === 'Combat rapproché'
          );
          
          if (linkedAttackSkill && combatRapprocheSpecs.length > 0) {
            const isCombatRapprocheSpec = combatRapprocheSpecs.some((spec: any) => 
              spec.name === linkedAttackSkill
            );
            if (isCombatRapprocheSpec) {
              // Keep the specialization name, but the skill is "Combat rapproché"
              // We'll use this in the weapon selection to show both
            } else if (linkedAttackSkill !== 'Combat rapproché') {
              // Not a specialization of Combat rapproché, use "Combat rapproché" as base skill
              linkedAttackSkill = 'Combat rapproché';
            }
          } else {
            // Default to "Combat rapproché" if still no skill
            linkedAttackSkill = 'Combat rapproché';
          }
          
          // Get weapon stats from WEAPON_TYPES if weapon type exists
          const weaponStats = weaponType && weaponType !== 'custom-weapon' 
            ? WEAPON_TYPES[weaponType as keyof typeof WEAPON_TYPES] 
            : undefined;
          
          return {
            id: weapon.id,
            name: weapon.name,
            linkedAttackSkill: linkedAttackSkill,
            damageValue: weaponSystem.damageValue || '0',
            damageValueBonus: weaponSystem.damageValueBonus || 0,
            weaponType: weaponType,
            meleeRange: weaponSystem.meleeRange || weaponStats?.melee || 'none',
            shortRange: weaponSystem.shortRange || weaponStats?.short || 'none',
            mediumRange: weaponSystem.mediumRange || weaponStats?.medium || 'none',
            longRange: weaponSystem.longRange || weaponStats?.long || 'none'
          };
        });

        // Get token UUIDs
        const counterAttackerTokenUuid = defenderTokenForRoll?.uuid || defenderTokenForRoll?.document?.uuid || defenderToken?.uuid || defenderToken?.document?.uuid || undefined;
        const originalAttackerTokenUuid = attackerToken?.uuid || attackerToken?.document?.uuid || undefined;
        
        // Prepare counter-attack roll data with available weapons
        // Use UUIDs directly from flags (already correctly calculated)
        const counterAttackRollData: any = {
          // Actor is the defender - use UUID directly from flags (already correctly calculated)
          actorId: defenderActorForRoll.id,
          actorUuid: messageFlags.defenderUuid || defenderActorForRoll.uuid, // Use flag UUID first
          
          // Token UUIDs - for counter-attack, the defender becomes the attacker
          // Use UUIDs directly from flags (already correctly calculated)
          attackerTokenUuid: messageFlags.defenderTokenUuid || counterAttackerTokenUuid, // Token of the defender (who is counter-attacking)
          defenderTokenUuid: messageFlags.attackerTokenUuid || originalAttackerTokenUuid, // Token of the original attacker
          
          // Available weapons for selection
          availableWeapons: availableWeapons,
          
          // Counter-attack flags
          isDefend: false,
          isCounterAttack: true,
          
          // Store original attack roll data for comparison
          attackRollResult: rollResult,
          attackRollData: rollData
        };

        // Import and open RollDialog
        const { RollDialog } = await import('./applications/roll-dialog.js');
        const dialog = new RollDialog(counterAttackRollData);
        
        // Note: targetToken should already be loaded from defenderTokenUuid in RollDialog constructor
        // Only set it manually if it wasn't loaded from UUID (fallback)
        if (attackerToken && !(dialog as any).targetToken) {
          (dialog as any).targetToken = attackerToken;
        }
        
        dialog.render(true);
      });
    });
    
    // Register token context menu hook for bookmarks/favorites
    (Hooks as any).on('getTokenHUDOptions', (_hud: any, buttons: any[], token: any) => {
      const actor = token.actor;
      if (!actor) return;
      
      // Get bookmarked items
      const bookmarkedItems = actor.items.filter((i: any) => 
        (i.type === 'skill' || i.type === 'feat') && i.system.bookmarked
      );
      
      if (bookmarkedItems.length > 0) {
        buttons.unshift({
          name: 'SRA2_BOOKMARKS',
          title: game.i18n!.localize('SRA2.BOOKMARKS.TITLE'),
          icon: 'fa-solid fa-star',
          button: true,
          onclick: () => {
            // Show bookmarks dialog
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
  showBookmarksDialog(actor: any): void {
    const bookmarkedSkills = actor.items.filter((i: any) => i.type === 'skill' && i.system.bookmarked);
    const bookmarkedFeats = actor.items.filter((i: any) => i.type === 'feat' && i.system.bookmarked);
    
    let content = '<div class="sra2-bookmark-menu">';
    
    if (bookmarkedSkills.length > 0) {
      content += '<h3>' + game.i18n!.localize('SRA2.SKILLS.LABEL') + '</h3>';
      content += '<div class="bookmark-list">';
      bookmarkedSkills.forEach((skill: any) => {
        content += `<button class="bookmark-item" data-item-id="${skill.id}" data-item-type="skill">
          <i class="fas fa-dice-d6"></i> ${skill.name}
        </button>`;
      });
      content += '</div>';
    }
    
    if (bookmarkedFeats.length > 0) {
      content += '<h3>' + game.i18n!.localize('SRA2.FEATS.LABEL') + '</h3>';
      content += '<div class="bookmark-list">';
      bookmarkedFeats.forEach((feat: any) => {
        content += `<button class="bookmark-item" data-item-id="${feat.id}" data-item-type="feat">
          <i class="fas fa-scroll"></i> ${feat.name}
        </button>`;
      });
      content += '</div>';
    }
    
    content += '</div>';
    
    new Dialog({
      title: game.i18n!.localize('SRA2.BOOKMARKS.TITLE') + ' - ' + actor.name,
      content,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Close')
        }
      },
      render: (html: any) => {
        html.find('.bookmark-item').on('click', async (event: any) => {
          const itemId = $(event.currentTarget).data('item-id');
          const item = actor.items.get(itemId);
          if (!item) return;
          
          // Open item sheet
          item.sheet?.render(true);
        });
      }
    }, { width: 350 }).render(true);
  }

  /**
   * Register the UI theme setting
   */
  registerThemeSetting(): void {
    game.settings.register(SYSTEM.id, 'uiTheme', {
      name: 'SRA2.SETTINGS.THEME.TITLE',
      hint: 'SRA2.SETTINGS.THEME.DESC',
      scope: 'client',
      config: true,
      type: String,
      choices: () => {
        return {
          'sra2': game.i18n.localize('SRA2.SETTINGS.THEME.SRA2'),
        };
      },
      default: 'sra2',
      onChange: (value: string) => {
        this.applyTheme(value);
      }
    });
  }

  /**
   * Apply the selected theme to the body element
   */
  applyTheme(theme?: string): void {
    if (!document.body) {
      console.warn(SYSTEM.LOG.HEAD + 'Cannot apply theme: document.body is not available');
      return;
    }

    // Get theme from setting if not provided
    if (!theme) {
      theme = game.settings.get(SYSTEM.id, 'uiTheme') as string || 'sra2';
    }

    // List of all possible theme classes
    const themeClasses = ['sr-theme-sra2', 'sr-theme-sr6', 'sr-theme-sr5'];

    // Remove all theme classes
    document.body.classList.remove(...themeClasses);

    // Add the selected theme class
    const themeClass = `sr-theme-${theme}`;
    document.body.classList.add(themeClass);

    console.log(SYSTEM.LOG.HEAD + `Applied theme: ${themeClass}`);
  }

  async onReady(): Promise<void> {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onReady');
    
    // Apply theme from setting
    this.applyTheme();
    
    // Run migrations
    const migrations = new Migrations();
    migrations.migrate();
    
    // Migrate old feat data to new array format (deprecated, keeping for older versions)
    await this.migrateFeatsToArrayFormat();
    
    // Migrate anarchyNimbus to anarchySpent
    await this.migrateAnarchyNimbusToSpent();
  }
  
  /**
   * Migrate old feat data (single rrType/rrValue/rrTarget) to new array format
   */
  async migrateFeatsToArrayFormat(): Promise<void> {
    const featsToUpdate: any[] = [];
    
    // Check all feats in the world
    for (const item of game.items! as any) {
      if ((item as any).type === 'feat') {
        const system = (item as any).system as any;
        let needsUpdate = false;
        const updates: any = { _id: (item as any).id };
        
        // Check if rrType is not an array (old format)
        if (system.rrType !== undefined && !Array.isArray(system.rrType)) {
          needsUpdate = true;
          // Convert single value to array (only if not "none")
          if (system.rrType !== 'none') {
            updates['system.rrType'] = [system.rrType];
            updates['system.rrValue'] = [system.rrValue || 0];
            updates['system.rrTarget'] = [system.rrTarget || ''];
          } else {
            updates['system.rrType'] = [];
            updates['system.rrValue'] = [];
            updates['system.rrTarget'] = [];
          }
        }
        
        if (needsUpdate) {
          featsToUpdate.push(updates);
        }
      }
    }
    
    // Check all feats on actors
    for (const actor of game.actors! as any) {
      const actorUpdates: any[] = [];
      
      for (const item of (actor as any).items) {
        if ((item as any).type === 'feat') {
          const system = (item as any).system as any;
          let needsUpdate = false;
          const updates: any = { _id: (item as any).id };
          
          // Check if rrType is not an array (old format)
          if (system.rrType !== undefined && !Array.isArray(system.rrType)) {
            needsUpdate = true;
            // Convert single value to array (only if not "none")
            if (system.rrType !== 'none') {
              updates['system.rrType'] = [system.rrType];
              updates['system.rrValue'] = [system.rrValue || 0];
              updates['system.rrTarget'] = [system.rrTarget || ''];
            } else {
              updates['system.rrType'] = [];
              updates['system.rrValue'] = [];
              updates['system.rrTarget'] = [];
            }
          }
          
          if (needsUpdate) {
            actorUpdates.push(updates);
          }
        }
      }
      
      if (actorUpdates.length > 0) {
        console.log(`${SYSTEM.LOG.HEAD} Migrating ${actorUpdates.length} feats on actor ${(actor as any).name}`);
        await (actor as any).updateEmbeddedDocuments('Item', actorUpdates);
      }
    }
    
    if (featsToUpdate.length > 0) {
      console.log(`${SYSTEM.LOG.HEAD} Migrating ${featsToUpdate.length} world feats`);
      await Item.updateDocuments(featsToUpdate);
    }
    
    if (featsToUpdate.length > 0 || (game.actors! as any).some((a: any) => a.items.some((i: any) => i.type === 'feat'))) {
      console.log(`${SYSTEM.LOG.HEAD} Feat migration to array format complete`);
    }
  }
  
  /**
   * Migrate anarchyNimbus to anarchySpent
   */
  async migrateAnarchyNimbusToSpent(): Promise<void> {
    const actorsToUpdate: any[] = [];
    
    // Check all character actors in the world
    for (const actor of game.actors! as any) {
      if ((actor as any).type === 'character') {
        const system = (actor as any).system as any;
        
        // Check if the old anarchyNimbus field exists
        if (system.anarchyNimbus !== undefined && system.anarchySpent === undefined) {
          actorsToUpdate.push({
            _id: (actor as any).id,
            'system.anarchySpent': system.anarchyNimbus
          });
        }
      }
    }
    
    if (actorsToUpdate.length > 0) {
      console.log(`${SYSTEM.LOG.HEAD} Migrating anarchyNimbus to anarchySpent for ${actorsToUpdate.length} actors`);
      await Actor.updateDocuments(actorsToUpdate);
      console.log(`${SYSTEM.LOG.HEAD} anarchyNimbus to anarchySpent migration complete`);
    }
  }
}


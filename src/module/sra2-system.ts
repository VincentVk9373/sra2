import { SYSTEM } from "./config/system.ts";
import { setSidebarIcons, setControlIcons, setCompendiumBanners } from "./config/ui-config.ts";

// Expose the SYSTEM object to the global scope
globalThis.SYSTEM = SYSTEM;

// Declare global Foundry objects
declare const Roll: any;
declare const renderTemplate: any;
declare const ChatMessage: any;

import * as models from "./models/_module.ts";
import * as documents from "./documents/_module.ts";
import * as applications from "./applications/_module.ts";
import * as CombatHelpers from "./helpers/combat-helpers.ts";
import * as SheetHelpers from "./helpers/sheet-helpers.ts";
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
  // Set to track skills being created to avoid duplicate creation
  static skillsBeingCreated: Set<string> = new Set();
  
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
    
    // Register group anarchy setting
    this.registerGroupAnarchySetting();
    
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
    
    // Register character sheet (detailed view)
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.CharacterSheet, {
      types: ["character"],
      makeDefault: false,
      label: "SRA2.SHEET.CHARACTER"
    });
    
    // Register character sheet V2 (in-run view - default)
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.CharacterSheetV2, {
      types: ["character"],
      makeDefault: true,
      label: "SRA2.SHEET.CHARACTER_V2"
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
      // DEBUG: Log all actor updates
      console.log('Hook updateActor - DEBUG:', {
        'actor.id': actor?.id,
        'actor.name': actor?.name,
        'actor.type': actor?.type,
        'updateData keys': updateData ? Object.keys(updateData) : 'no updateData',
        'updateData.system keys': updateData?.system ? Object.keys(updateData.system) : 'no system'
      });
      
      // Only process vehicle actors
      if (actor.type !== 'vehicle') return;
      
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
        
        // DEBUG: Log which character sheets will be re-rendered
        if (characterActors.length > 0) {
          console.log('Hook updateActor - Re-rendering character sheets:', {
            'vehicle.id': actor.id,
            'vehicle.name': actor.name,
            'characterCount': characterActors.length,
            'characters': characterActors.map((c: any) => ({ id: c.id, name: c.name }))
          });
        }
        
        // Re-render character sheets that have this vehicle linked
        // Use a small delay to ensure derived data is recalculated
        setTimeout(() => {
          characterActors.forEach((char: any) => {
            // Force recalculation of derived data (including cost) before re-rendering
            if (char.system) {
              (char.system as any).prepareDerivedData();
            }
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

    // Hook to automatically add linked skill when a specialization is created
    Hooks.on('createItem', async (item: any, options: any, userId: string) => {
      // Only process specializations on character actors
      if (item.type !== 'specialization') return;
      
      const actor = item.parent;
      if (!actor || actor.type !== 'character') return;

      // Get the linked skill name from the specialization
      const linkedSkillName = item.system?.linkedSkill;
      if (!linkedSkillName) return;

      // Create a unique key for this actor + skill combination
      const skillKey = `${actor.id}:${linkedSkillName}`;

      // Check if this skill is already being created for this actor
      if (SRA2System.skillsBeingCreated.has(skillKey)) {
        // Skill creation already in progress, skip
        return;
      }

      // Check if the skill already exists on the actor
      const existingSkill = SheetHelpers.findSkillByName(actor, linkedSkillName);
      if (existingSkill) {
        // Skill already exists, nothing to do
        return;
      }

      // Mark this skill as being created
      SRA2System.skillsBeingCreated.add(skillKey);

      try {
        // Try to find the skill in game.items
        const skillTemplate = SheetHelpers.findItemInGame('skill', linkedSkillName);
        
        if (skillTemplate) {
          // Skill found in game.items, create it on the actor
          try {
            await actor.createEmbeddedDocuments('Item', [skillTemplate.toObject()]);
            console.log(SYSTEM.LOG.HEAD + `Auto-added linked skill "${linkedSkillName}" for specialization "${item.name}"`);
          } catch (error) {
            console.error(SYSTEM.LOG.HEAD + `Error auto-adding skill "${linkedSkillName}":`, error);
          }
        } else {
          // Skill not found in game.items, create a new one with default values
          // Use the linkedAttribute from the specialization
          const linkedAttribute = item.system?.linkedAttribute || 'strength';
          const skillData = {
            name: linkedSkillName,
            type: 'skill',
            system: {
              rating: 0,
              linkedAttribute: linkedAttribute,
              description: '',
              bookmarked: false
            }
          };
          
          try {
            await actor.createEmbeddedDocuments('Item', [skillData]);
            console.log(SYSTEM.LOG.HEAD + `Auto-created linked skill "${linkedSkillName}" for specialization "${item.name}"`);
          } catch (error) {
            console.error(SYSTEM.LOG.HEAD + `Error auto-creating skill "${linkedSkillName}":`, error);
          }
        }
      } finally {
        // Remove from the set after creation (or error)
        SRA2System.skillsBeingCreated.delete(skillKey);
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
    
    // Hook to duplicate linked vehicles when duplicating a character actor
    // This ensures the duplicated character has its own copies of vehicles
    Hooks.on('createActor', async (actor: any, options: any, userId: string) => {
      // Only process if this is from the current user
      if (game.user?.id !== userId) return;
      
      // Skip if this is a vehicle being created as part of duplication (to avoid infinite loop)
      if (options.sra2VehicleDuplication) return;
      
      // Only process character actors
      if (actor.type !== 'character') return;
      
      // Get linked vehicles
      const linkedVehicles = (actor.system as any)?.linkedVehicles || [];
      if (linkedVehicles.length === 0) return;
      
      // Check if any of these vehicles belong to another actor (meaning this is a duplicate)
      // If the vehicle's UUID points to an existing vehicle that's also linked to another character,
      // we need to duplicate the vehicles
      const existingCharacters = (game.actors as any).filter((a: any) => 
        a.type === 'character' && a.id !== actor.id
      );
      
      let needsDuplication = false;
      for (const vehicleUuid of linkedVehicles) {
        for (const otherChar of existingCharacters) {
          const otherLinkedVehicles = (otherChar.system as any)?.linkedVehicles || [];
          if (otherLinkedVehicles.includes(vehicleUuid)) {
            needsDuplication = true;
            break;
          }
        }
        if (needsDuplication) break;
      }
      
      if (!needsDuplication) return;
      
      console.log(SYSTEM.LOG.HEAD + `Duplicating linked vehicles for actor ${actor.name}`);
      
      // Duplicate each linked vehicle and update references
      const newVehicleUuids: string[] = [];
      
      for (const vehicleUuid of linkedVehicles) {
        try {
          // Get the original vehicle
          const originalVehicle = await fromUuid(vehicleUuid) as any;
          if (!originalVehicle || originalVehicle.type !== 'vehicle') {
            console.warn(SYSTEM.LOG.HEAD + `Could not find vehicle ${vehicleUuid} for duplication`);
            continue;
          }
          
          // Create a duplicate of the vehicle
          const vehicleData = originalVehicle.toObject();
          delete vehicleData._id;
          vehicleData.name = `${originalVehicle.name} (${actor.name})`;
          
          const [newVehicle] = await Actor.createDocuments([vehicleData], { sra2VehicleDuplication: true } as any);
          
          if (newVehicle) {
            newVehicleUuids.push(newVehicle.uuid);
            console.log(SYSTEM.LOG.HEAD + `Duplicated vehicle ${originalVehicle.name} -> ${newVehicle.name}`);
          }
        } catch (error) {
          console.error(SYSTEM.LOG.HEAD + `Error duplicating vehicle ${vehicleUuid}:`, error);
        }
      }
      
      // Update the actor's linkedVehicles with the new UUIDs
      if (newVehicleUuids.length > 0) {
        await actor.update({ 'system.linkedVehicles': newVehicleUuids });
        console.log(SYSTEM.LOG.HEAD + `Updated ${actor.name} with ${newVehicleUuids.length} duplicated vehicles`);
      }
    });
    
    // Hook to handle feat choice configuration when dropping a token
    // This displays a dialog for optional/choice feats before creating the token
    Hooks.on('preCreateToken', (tokenDoc: any, _data: any, options: any, userId: string) => {
      // Only process if this is from the current user
      if (game.user?.id !== userId) return true;
      
      // Skip if this is a token being created after the dialog (to avoid infinite loop)
      if (options.sra2SkipFeatChoice) return true;
      
      // Get the source actor
      const actor = tokenDoc.actor;
      if (!actor) return true;
      
      // Only process character actors
      if (actor.type !== 'character') return true;
      
      // Get feats with isOptional or isAChoice set
      const allFeats = actor.items.filter((item: any) => item.type === 'feat');
      const optionalFeats = allFeats.filter((feat: any) => (feat.system as any).isOptional === true);
      const choiceFeats = allFeats.filter((feat: any) => (feat.system as any).isAChoice === true);
      
      // Calculate the total numberOfChoice from all feats that have it
      // Each feat with isAChoice contributes its own numberOfChoice
      let totalNumberOfChoice = 0;
      for (const feat of allFeats) {
        const featSystem = feat.system as any;
        if (featSystem.numberOfChoice && featSystem.numberOfChoice > 0) {
          // take the first feat with numberOfChoice
          totalNumberOfChoice = featSystem.numberOfChoice;
          break;
        }
      }
      
      // If no optional or choice feats, continue normally
      if (optionalFeats.length === 0 && choiceFeats.length === 0) {
        return true;
      }
      
      // Prevent default token creation - we'll handle it after dialog
      // Store data for later token creation
      const tokenData = tokenDoc.toObject();
      const sceneId = tokenDoc.parent?.id;
      
      // Show dialog asynchronously and handle token creation
      (async () => {
        // Import and show the dialog
        const { FeatChoiceDialog } = await import('./applications/feat-choice-dialog.js');
        
        const selections = await FeatChoiceDialog.show(
          actor, 
          optionalFeats.map((f: any) => f.toObject()), 
          choiceFeats.map((f: any) => f.toObject()), 
          totalNumberOfChoice || choiceFeats.length
        );
        
        // If dialog was cancelled, don't create the token
        if (!selections) {
          return;
        }
        
        // Prepare item updates for the synthetic actor
        const itemUpdates: any[] = [];
        
        // Process optional feats - activate selected, deactivate others
        for (const feat of optionalFeats) {
          const isSelected = selections.optional.includes(feat.id);
          itemUpdates.push({
            _id: feat.id,
            'system.active': isSelected
          });
        }
        
        // Process choice feats - activate only selected ones, deactivate others
        for (const feat of choiceFeats) {
          const isSelected = selections.choices.includes(feat.id);
          itemUpdates.push({
            _id: feat.id,
            'system.active': isSelected
          });
        }
        
        // Create the token manually after dialog with skip flag to avoid re-triggering
        const scene = sceneId ? game.scenes?.get(sceneId) : null;
        if (scene) {
          const createOptions = { ...options, sra2SkipFeatChoice: true };
          const [createdToken] = await (scene as any).createEmbeddedDocuments('Token', [tokenData], createOptions);
          
          // Apply feat updates to the synthetic actor
          if (createdToken && itemUpdates.length > 0) {
            const syntheticActor = createdToken.actor;
            if (syntheticActor) {
              await syntheticActor.updateEmbeddedDocuments('Item', itemUpdates);
              console.log(SYSTEM.LOG.HEAD + `Applied feat configuration to token ${createdToken.name}`);
            }
          }
        }
      })();
      
      // Cancel the original token creation - we'll create it manually after dialog
      return false;
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
          ui.notifications?.error(game.i18n!.localize('SRA2.COMBAT.CANNOT_FIND_TARGET'));
          return;
        }
        
        if (damage <= 0) {
          ui.notifications?.info(game.i18n!.localize('SRA2.COMBAT.NO_DAMAGE_TO_APPLY'));
          return;
        }
        
        // Disable button to prevent double-click
        button.prop('disabled', true);
        
        console.log('Apply damage button clicked:', { targetUuid, targetName, damage, damageType });
        
        try {
          await CombatHelpers.applyDamage(targetUuid, damage, targetName, damageType);
        } catch (error) {
          console.error('Error applying damage:', error);
          ui.notifications?.error(game.i18n!.localize('SRA2.COMBAT.DAMAGE_APPLY_ERROR'));
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
        
        // Check if this is a vehicle weapon attack
        const isVehicleWeapon = rollData.isVehicleWeapon;
        const vehicleUuid = rollData.vehicleUuid;
        
        // For vehicle weapons, prioritize selected targets over flags to avoid using the drone as defender
        // The defender should be the target, not the vehicle/drone itself
        const selectedTargets = Array.from(game.user?.targets || []);
        if (isVehicleWeapon && selectedTargets.length > 0) {
          // Use the first selected target as defender (not the drone)
          defenderToken = selectedTargets[0];
          if (defenderToken?.actor) {
            defender = defenderToken.actor;
            console.log('Defense button: For vehicle weapon, using selected target as defender:', defender?.name);
          }
        }
        
        // Use defender UUID directly from flags (already correctly calculated)
        // Priority: 1) defenderUuid from flags (already calculated correctly), 2) defenderTokenUuid from flags
        // Skip if we already have a defender from selected targets for vehicle weapons
        if (!defender && messageFlags.defenderUuid) {
          try {
            const defenderFromUuid = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderUuid) || null;
            // For vehicle weapons, skip if this is the vehicle itself
            if (defenderFromUuid) {
              if (isVehicleWeapon && vehicleUuid && defenderFromUuid.uuid === vehicleUuid) {
                console.log('Defense button: Skipping vehicle as defender for vehicle weapon - need target instead');
              } else {
                defender = defenderFromUuid;
                console.log('Defense button: Defender loaded directly from defenderUuid flag');
              }
            }
          } catch (e) {
            console.warn('Defense button: Failed to load defender from defenderUuid flag:', e);
          }
        }
        
        // Get defender token from UUID if available (priority: flag > canvas search)
        // Skip if we already have a defender from selected targets for vehicle weapons
        if (!defenderToken && messageFlags.defenderTokenUuid) {
          try {
            const defenderTokenFromUuid = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderTokenUuid) || null;
            // For vehicle weapons, skip if this is the vehicle itself
            if (defenderTokenFromUuid) {
              if (isVehicleWeapon && vehicleUuid) {
                const tokenActorUuid = defenderTokenFromUuid?.actor?.uuid || undefined;
                if (tokenActorUuid === vehicleUuid) {
                  console.log('Defense button: Skipping vehicle token as defender for vehicle weapon - need target instead');
                } else {
                  defenderToken = defenderTokenFromUuid;
                  if (defenderToken?.actor && !defender) {
                    defender = defenderToken.actor;
                    console.log('Defense button: Defender loaded from defenderTokenUuid flag, using token actor');
                  }
                }
              } else {
                defenderToken = defenderTokenFromUuid;
                if (defenderToken?.actor && !defender) {
                  defender = defenderToken.actor;
                  console.log('Defense button: Defender loaded from defenderTokenUuid flag, using token actor');
                }
              }
            }
          } catch (e) {
            console.warn('Defense button: Failed to load defender token from defenderTokenUuid flag:', e);
          }
        }
        
        // Fallback: try to get actor and find token on canvas (only if flags didn't work)
        if (!defender) {
          if (messageFlags.defenderId) {
            const defenderFromId = game.actors?.get(messageFlags.defenderId) || null;
            // For vehicle weapons, skip if this is the vehicle itself
            if (defenderFromId) {
              if (isVehicleWeapon && vehicleUuid && defenderFromId.uuid === vehicleUuid) {
                console.log('Defense button: Skipping vehicle as defender for vehicle weapon - need target instead');
              } else {
                defender = defenderFromId;
              }
            }
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
        // For vehicle weapons, use the actual defender (target), not the vehicle/drone
        // If we have a defender from selected targets, use it; otherwise use flag UUID
        let defenderUuid = defender?.uuid || 'Unknown';
        if (!defender || (isVehicleWeapon && vehicleUuid && defender.uuid === vehicleUuid)) {
          // Fallback to flag UUID only if we don't have a valid defender
          defenderUuid = messageFlags.defenderUuid || defender?.uuid || 'Unknown';
        }
        
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
        
        // For vehicle weapons, use the defender we already found (which should be the target, not the drone)
        if (isVehicleWeapon && defenderToken) {
          defenderTokenForRoll = defenderToken;
          if (defenderToken?.actor) {
            defenderActorForRoll = defenderToken.actor;
          }
        } else {
          const defenderTokenUuidFromFlags = messageFlags.defenderTokenUuid;
          if (defenderTokenUuidFromFlags) {
            try {
              const defenderTokenFromUuid = (foundry.utils as any)?.fromUuidSync?.(defenderTokenUuidFromFlags) || null;
              // For vehicle weapons, skip if this is the vehicle itself
              if (defenderTokenFromUuid) {
                if (isVehicleWeapon && vehicleUuid) {
                  const tokenActorUuid = defenderTokenFromUuid?.actor?.uuid || undefined;
                  if (tokenActorUuid === vehicleUuid) {
                    console.log('Defense: Skipping vehicle token as defender for vehicle weapon - using target instead');
                    defenderTokenForRoll = defenderToken;
                    if (defenderToken?.actor) {
                      defenderActorForRoll = defenderToken.actor;
                    }
                  } else {
                    defenderTokenForRoll = defenderTokenFromUuid;
                    if (defenderTokenForRoll?.actor) {
                      defenderActorForRoll = defenderTokenForRoll.actor;
                    }
                  }
                } else {
                  defenderTokenForRoll = defenderTokenFromUuid;
                  if (defenderTokenForRoll?.actor) {
                    defenderActorForRoll = defenderTokenForRoll.actor;
                  }
                }
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
          
          // Actor is the defender - for vehicle weapons, use the actual defender (target) UUID, not the vehicle
          actorId: defenderActorForRoll.id,
          actorUuid: defenderActorForRoll.uuid, // Use the actual defender actor UUID (target, not drone)
          
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
        // For vehicle weapons, this should be the character's token (the one who attacked), not the drone
        if (attackerToken) {
          (dialog as any).targetToken = attackerToken;
        }
        
        // For vehicle weapons, make sure we don't use the vehicle as target
        // The target should be the character who attacked with the drone weapon
        if (isVehicleWeapon && vehicleUuid) {
          // Ensure targetToken is not the vehicle
          if ((dialog as any).targetToken?.actor?.uuid === vehicleUuid) {
            console.log('Defense: Target token is the vehicle, should be the character instead');
            // Find the character's token (the original attacker)
            const characterToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === attacker?.id || token.actor?.uuid === attacker?.uuid;
            }) || null;
            if (characterToken) {
              (dialog as any).targetToken = characterToken;
            }
          }
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
    
    // Function to add roll dice button to chat
    const addRollDiceButton = () => {
      // Find the chat message input form in the DOM
      const chatForm = $('.chat-form');
      if (chatForm.length === 0) {
        return false;
      }
      
      // Check if button already exists to avoid duplicates
      if (chatForm.find('.sra2-roll-dice-container').length > 0) {
        return true;
      }
      
      // Create the roll dice container with inputs and radio
      const rollDiceContainer = $(`
        <div class="sra2-roll-dice-container">
          <div class="sra2-roll-dice-inputs">
            <input type="text" value="3" class="sra2-dice-count-input" placeholder="${game.i18n!.localize('SRA2.CHAT.DICE_COUNT')}" title="${game.i18n!.localize('SRA2.CHAT.DICE_COUNT')}">
            <input type="text" value="0" class="sra2-risk-dice-input" placeholder="${game.i18n!.localize('SRA2.CHAT.RISK_DICE')}" title="${game.i18n!.localize('SRA2.CHAT.RISK_DICE')}">
            <input type="text" value="" class="sra2-rr-input" placeholder="${game.i18n!.localize('SRA2.CHAT.RR')} 0" title="${game.i18n!.localize('SRA2.CHAT.RR')}">
            <div class="sra2-roll-mode-radio">
              <label class="sra2-radio-advantage" title="${game.i18n!.localize('SRA2.CHAT.ADVANTAGE')}">
                <input type="radio" name="sra2-roll-mode" value="advantage">
                <span>A</span>
              </label>
              <label class="sra2-radio-normal" title="${game.i18n!.localize('SRA2.CHAT.NORMAL')}">
                <input type="radio" name="sra2-roll-mode" value="normal" checked>
                <span>N</span>
              </label>
              <label class="sra2-radio-disadvantage" title="${game.i18n!.localize('SRA2.CHAT.DISADVANTAGE')}">
                <input type="radio" name="sra2-roll-mode" value="disadvantage">
                <span>D</span>
              </label>
            </div>
          </div>
          <button type="button" class="sra2-roll-dice-button" title="${game.i18n!.localize('SRA2.CHAT.ROLL_DICE')}">
            <i class="fas fa-dice-d6"></i> ${game.i18n!.localize('SRA2.CHAT.ROLL_DICE')}
          </button>
        </div>
      `);
      
      // Insert container as first element in .chat-form
      chatForm.prepend(rollDiceContainer);
      
      // Add click handler to button
      const rollDiceButton = rollDiceContainer.find('.sra2-roll-dice-button');
      rollDiceButton.on('click', async (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Get controlled actor (first controlled token's actor, or first owned actor)
        let actor: any = null;
        const controlledTokens = canvas?.tokens?.controlled || [];
        
        if (controlledTokens.length > 0) {
          actor = controlledTokens[0].actor;
        } else {
          // Fallback: get first owned actor
          const ownedActors = (game.actors as any).filter((a: any) => a.isOwner);
          if (ownedActors.length > 0) {
            actor = ownedActors[0];
          }
        }
        
        if (!actor) {
          ui.notifications?.warn(game.i18n!.localize('SRA2.CHAT.NO_ACTOR') || 'Aucun personnage contrôlé');
          return;
        }
        
        // Get values from inputs and radio
        const diceCount = parseInt(rollDiceContainer.find('.sra2-dice-count-input').val() as string) || 0;
        const riskDiceCount = parseInt(rollDiceContainer.find('.sra2-risk-dice-input').val() as string) || 0;
        const rr = parseInt(rollDiceContainer.find('.sra2-rr-input').val() as string) || 0;
        const rollMode = rollDiceContainer.find('input[name="sra2-roll-mode"]:checked').val() as string || 'normal';
        
        if (diceCount <= 0) {
          ui.notifications?.warn(game.i18n!.localize('SRA2.CHAT.INVALID_DICE_COUNT'));
          return;
        }
        
        // Import dice roller functions
        const DiceRoller = await import('./helpers/dice-roller.js');
        const { getSuccessThreshold } = DiceRoller;
        
        // Use manual risk dice count, ensure it doesn't exceed total dice count
        const finalRiskDiceCount = Math.min(riskDiceCount, diceCount);
        const normalDiceCount = Math.max(0, diceCount - finalRiskDiceCount);
        const finalRR = Math.min(3, Math.max(0, rr));
        
        // Roll dice
        let normalRoll: any = null;
        let riskRoll: any = null;
        
        if (normalDiceCount > 0) {
          normalRoll = new Roll(`${normalDiceCount}d6`);
          await normalRoll.evaluate();
          
          if ((game as any).dice3d && normalRoll) {
            (game as any).dice3d.showForRoll(normalRoll, game.user, true, null, false);
          }
        }
        
        if (finalRiskDiceCount > 0) {
          riskRoll = new Roll(`${finalRiskDiceCount}d6`);
          await riskRoll.evaluate();
          
          if ((game as any).dice3d && riskRoll) {
            const dice3dConfig = {
              colorset: 'purple',
              theme: 'default'
            };
            (game as any).dice3d.showForRoll(riskRoll, game.user, true, dice3dConfig, false);
          }
        }
        
        // Calculate results
        const normalResults: number[] = normalRoll ? (normalRoll.dice[0]?.results?.map((r: any) => r.result) || []) : [];
        const riskResults: number[] = riskRoll ? (riskRoll.dice[0]?.results?.map((r: any) => r.result) || []) : [];
        
        const successThreshold = getSuccessThreshold(rollMode);
        
        // Calculate successes for normal dice
        let normalSuccesses = 0;
        for (const result of normalResults) {
          if (result >= successThreshold) {
            normalSuccesses++;
          }
        }
        
        // Calculate successes and critical failures for risk dice
        let riskSuccesses = 0;
        let criticalFailures = 0;
        for (const result of riskResults) {
          if (result === 1) {
            criticalFailures++;
          } else if (result >= successThreshold) {
            riskSuccesses++;
          }
        }
        
        // Risk dice successes count double
        const totalRiskSuccesses = riskSuccesses * 2;
        const totalSuccesses = normalSuccesses + totalRiskSuccesses;
        
        // Calculate complications
        const remainingFailures = Math.max(0, criticalFailures - finalRR);
        
        let complication: 'none' | 'minor' | 'critical' | 'disaster' = 'none';
        if (remainingFailures === 1) {
          complication = 'minor';
        } else if (remainingFailures === 2) {
          complication = 'critical';
        } else if (remainingFailures >= 3) {
          complication = 'disaster';
        }
        
        const rollResult = {
          normalDice: normalResults,
          riskDice: riskResults,
          normalSuccesses: normalSuccesses,
          riskSuccesses: riskSuccesses,
          totalSuccesses: totalSuccesses,
          criticalFailures: criticalFailures,
          finalRR: finalRR,
          remainingFailures: remainingFailures,
          complication: complication
        };
        
        // Get actor token if available
        const actorTokens = canvas?.tokens?.controlled || [];
        const actorToken = actorTokens.length > 0 ? actorTokens[0] : null;
        
        // Create roll data for template
        const rollData: any = {
          dicePool: diceCount,
          riskDiceCount: finalRiskDiceCount,
          rollMode: rollMode,
          finalRR: finalRR,
          actorId: actor.id,
          actorUuid: actor.uuid,
          actorName: actor.name
        };
        
        // Prepare template data
        const templateData: any = {
          attacker: actor,
          defender: null,
          rollData: rollData,
          rollResult: rollResult,
          isAttack: false,
          isDefend: false,
          isCounterAttack: false,
          skillName: 'Jet de dés',
          itemName: null,
          damageValue: null,
          defenseResult: null,
          attackerUuid: actor.uuid,
          defenderUuid: null,
          attackerTokenUuid: (actorToken as any)?.uuid || (actorToken as any)?.document?.uuid,
          defenderTokenUuid: null
        };
        
        // Render template
        const html = await renderTemplate('systems/sra2/templates/roll-result.hbs', templateData);
        
        // Create chat message
        const messageData: any = {
          user: game.user?.id,
          speaker: {
            actor: actor.id,
            alias: actor.name
          },
          content: html,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          flags: {
            sra2: {
              rollType: 'skill',
              attackerId: actor.id,
              attackerUuid: actor.uuid,
              attackerTokenUuid: (actorToken as any)?.uuid || (actorToken as any)?.document?.uuid,
              rollResult: rollResult,
              rollData: rollData
            }
          }
        };
        
        await ChatMessage.create(messageData);
      });
      
      return true;
    };
    
    // Register chat log hook to add roll dice button
    // Using a more generic approach that works with Foundry's hook system
    Hooks.on('renderChatLog' as any, (app: any, html: any, data: any) => {
      // Use setTimeout to ensure the chat form is fully rendered
      setTimeout(() => {
        if (!addRollDiceButton()) {
          // If button wasn't added, try again after a longer delay
          setTimeout(addRollDiceButton, 500);
        }
      }, 100);
    });
    
    // Also register for chat popout
    Hooks.on('renderChatPopout' as any, (app: any, html: any, data: any) => {
      setTimeout(() => {
        if (!addRollDiceButton()) {
          setTimeout(addRollDiceButton, 500);
        }
      }, 100);
    });
    
    // Use MutationObserver to watch for chat form appearance (more robust)
    Hooks.once('ready', () => {
      // Try immediately
      addRollDiceButton();
      
      // Also set up a MutationObserver to watch for chat form
      const observer = new MutationObserver(() => {
        addRollDiceButton();
      });
      
      // Observe the document body for changes
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
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
   * Register the Group Anarchy setting
   */
  registerGroupAnarchySetting(): void {
    game.settings.register(SYSTEM.id, 'groupAnarchy', {
      name: 'SRA2.ANARCHY_COUNTER.SETTING_NAME',
      hint: 'SRA2.ANARCHY_COUNTER.SETTING_HINT',
      scope: 'world',
      config: false, // Hidden from settings menu, controlled via popup
      type: Number,
      default: 0,
      onChange: (newValue: number) => {
        // Get old value for animation direction
        const oldValue = applications.AnarchyCounter.getGroupAnarchy();
        // Refresh all clients' counter displays
        applications.AnarchyCounter.refresh(newValue, oldValue);
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
    
    // Initialize the Group Anarchy Counter (visible to all)
    applications.AnarchyCounter.instance.render(true);
    
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


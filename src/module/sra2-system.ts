import { SYSTEM } from "./config/system.ts";
import { setSidebarIcons, setControlIcons, setCompendiumBanners } from "./config/ui-config.ts";
import { DELAYS } from "./config/constants.ts";

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
import { loadCombatantFromFlags, resolveDefenderForDefend, resolveDefenseSkillData } from "./helpers/actor-uuid-resolver.ts";
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

/**
 * Return the list of melee weapons from an actor that can be used for a counter-attack.
 * A weapon qualifies if it has melee capability AND is linked to "Combat rapproché"
 * (directly or via a specialisation).
 */
function getMeleeWeaponsForCounterAttack(actor: any, WEAPON_TYPES: Record<string, any>): any[] {
  const combatSpecs = new Set<string>(
    actor.items
      .filter((i: any) => i.type === 'specialization' && i.system.linkedSkill === 'Combat rapproché')
      .map((i: any) => i.name as string)
  );

  function getStats(sys: any) {
    return sys.weaponType && sys.weaponType !== 'custom-weapon' ? WEAPON_TYPES[sys.weaponType] : null;
  }
  function hasMeleeCap(item: any): boolean {
    const sys = item.system;
    if (sys.meleeRange === 'ok' || sys.meleeRange === 'disadvantage') return true;
    const stats = getStats(sys);
    return stats?.melee === 'ok' || stats?.melee === 'disadvantage';
  }
  function isMeleeLinked(item: any): boolean {
    const sys   = item.system;
    const stats = getStats(sys);
    return (
      sys.linkedAttackSkill === 'Combat rapproché' ||
      combatSpecs.has(sys.linkedAttackSkill) ||
      combatSpecs.has(sys.linkedAttackSpecialization) ||
      stats?.linkedSkill === 'Combat rapproché' ||
      combatSpecs.has(stats?.linkedSkill)
    );
  }
  function resolvedLinkedSkill(item: any): string {
    const sys = item.system;
    if (sys.linkedAttackSkill === 'Combat rapproché' || combatSpecs.has(sys.linkedAttackSkill)) {
      return sys.linkedAttackSkill || 'Combat rapproché';
    }
    const stats = getStats(sys);
    const fromType = stats?.linkedSkill;
    if (fromType === 'Combat rapproché' || combatSpecs.has(fromType)) return fromType;
    return 'Combat rapproché';
  }

  return actor.items
    .filter((item: any) => {
      if (item.type !== 'feat') return false;
      const ft = item.system?.featType;
      if (ft !== 'weapon' && ft !== 'weapons-spells') return false;
      return hasMeleeCap(item) && isMeleeLinked(item);
    })
    .map((weapon: any) => {
      const sys   = weapon.system;
      const stats = getStats(sys);
      return {
        id:               weapon.id,
        name:             weapon.name,
        linkedAttackSkill: resolvedLinkedSkill(weapon),
        damageValue:      sys.damageValue || '0',
        damageValueBonus: sys.damageValueBonus || 0,
        weaponType:       sys.weaponType,
        meleeRange:  sys.meleeRange  || stats?.melee  || 'none',
        shortRange:  sys.shortRange  || stats?.short  || 'none',
        mediumRange: sys.mediumRange || stats?.medium || 'none',
        longRange:   sys.longRange   || stats?.long   || 'none',
      };
    });
}

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

    // Initialize Babele translations if module is available (after setup, before init)
    // Hooks.once('setup', () => this.initializeBabele()); // Deactivated
    
    Hooks.once('init', () => this.onInit());
  }

  onInit(): void {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onInit');
    if (game.system) {
      game.system.api = { applications, models, documents };
    }

    this.registerThemeSetting();
    this.registerGroupAnarchySetting();

    setSidebarIcons();
    setControlIcons();
    setCompendiumBanners();

    this.registerMigrations();
    this.registerDataModels();
    this.registerActorSheets();
    this.setupVehicleHooks();
    this.setupSkillCreationHooks();
    this.setupActorLifecycleHooks();
    this.setupTokenHooks();
    this.registerItemSheets();
    this.registerHandlebarsHelpers();
    this.setupChatHandlers();

    Hooks.once("ready", () => this.onReady());
  }

  private registerMigrations(): void {
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
  }

  private registerDataModels(): void {
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
  }

  private registerActorSheets(): void {
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.CharacterSheetV2, {
      types: ["character"],
      makeDefault: true,
      label: "SRA2.SHEET.CHARACTER_V2"
    });
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.VehicleSheet, {
      types: ["vehicle"],
      makeDefault: true,
      label: "SRA2.SHEET.VEHICLE"
    });
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.IceSheet, {
      types: ["ice"],
      makeDefault: true,
      label: "SRA2.SHEET.ICE"
    });
  }

  private setupVehicleHooks(): void {
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
    Hooks.on('updateActor', (actor: any, updateData: any, _options: any, _userId: string) => {
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
        }, DELAYS.SHEET_RENDER);
      }
    });

    // Hook to update character sheets when items are created/deleted on linked vehicles
    // This ensures the cost is recalculated when weapons are added/removed
    Hooks.on('createItem', (item: any, _options: any, _userId: string) => {
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
            }, DELAYS.SHEET_RENDER);
          }
        });
      }
    });

    Hooks.on('deleteItem', (item: any, _options: any, _userId: string) => {
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
            }, DELAYS.SHEET_RENDER);
          }
        });
      }
    });

  }

  private setupSkillCreationHooks(): void {
    // Hook to automatically add linked skill when a specialization is created
    Hooks.on('createItem', async (item: any, _options: any, _userId: string) => {
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
  }

  private setupActorLifecycleHooks(): void {
    // Handle when vehicle is deleted
    Hooks.on('deleteActor', (actor: any, _options: any, _userId: string) => {
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
  }

  private setupTokenHooks(): void {
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

      // Process both character and NPC actors (but not vehicles or ICE)
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
        if (featSystem.isAChoice && featSystem.numberOfChoice && featSystem.numberOfChoice > 0) {
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
  }

  private registerItemSheets(): void {
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
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('add', function (a: number, b: number) {
      return a + b;
    });

    Handlebars.registerHelper('eq', function (a: any, b: any) {
      return a === b;
    });

    Handlebars.registerHelper('gt', function (a: any, b: any) {
      return a > b;
    });

    Handlebars.registerHelper('gte', function (a: any, b: any) {
      return a >= b;
    });

    Handlebars.registerHelper('concat', function (...args: any[]) {
      // Remove the last argument which is the Handlebars options object
      const values = args.slice(0, -1);
      return values.join('');
    });

    Handlebars.registerHelper('uppercase', function (str: string) {
      return str ? str.toUpperCase() : '';
    });

    // Helper to check if a dice result is a success based on roll mode
    Handlebars.registerHelper('isSuccess', function (result: number, rollMode: string) {
      if (rollMode === 'advantage') {
        return result >= 4;
      } else if (rollMode === 'disadvantage') {
        return result === 6;
      } else {
        return result >= 5;
      }
    });

    // Helper to multiply two numbers
    Handlebars.registerHelper('multiply', function (a: number, b: number) {
      return a * b;
    });

    // Helper to check if two values are not equal
    Handlebars.registerHelper('ne', function (a: any, b: any) {
      return a !== b;
    });

    // Helper to stringify JSON
    Handlebars.registerHelper('json', function (context: any) {
      return JSON.stringify(context);
    });
  }

  private setupChatHandlers(): void {
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

        // Get damage type from button's data attribute (set from weapon's damageType in template)
        const damageType = (button.data('damage-type') || 'physical') as 'physical' | 'mental' | 'matrix';

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
          setTimeout(() => button.prop('disabled', false), DELAYS.BUTTON_REENABLE);
        }
      });

      // Spell success distribution handlers
      html.find('.spell-dist-btn').off('click');
      html.find('.spell-dist-btn').on('click', (event: any) => {
        event.preventDefault();
        const btn = $(event.currentTarget);
        const target = btn.data('target') as 'damage' | 'zone';
        const dist = btn.closest('.spell-distribution');
        const total = parseInt(dist.data('total-successes') as string) || 0;
        let dmg = parseInt(dist.data('damage-successes') as string) || 0;
        let zone = parseInt(dist.data('zone-successes') as string) || 0;

        if (btn.hasClass('spell-dist-plus')) {
          if (target === 'damage' && dmg < total) { dmg++; zone--; }
          else if (target === 'zone' && zone < total) { zone++; dmg--; }
        } else {
          if (target === 'damage' && dmg > 0) { dmg--; zone++; }
          else if (target === 'zone' && zone > 0) { zone--; dmg++; }
        }

        dist.data('damage-successes', dmg);
        dist.data('zone-successes', zone);
        dist.find('.spell-damage-count').text(dmg);
        dist.find('.spell-zone-count').text(zone);
        dist.find('.spell-zone-meters').text(zone * 3);

        // For direct spells: also update the displayed final damage and apply button
        const directContainer = dist.closest('.spell-direct-damage');
        if (directContainer.length) {
          dist.find('.spell-damage-bonus').text(dmg);
          directContainer.find('.spell-final-damage').text(dmg);
          directContainer.find('.apply-damage-button').data('damage', dmg);
          // Reflect on the damage attribute so the click handler reads the updated value
          directContainer.find('.apply-damage-button').attr('data-damage', dmg.toString());
        } else {
          // Indirect spell: update damage successes display
          dist.find('.spell-damage-bonus').text(dmg);
        }
      });

      // Hover ping: when hovering a defend/counter-attack button, ping the target on canvas
      html.off('mouseenter', '.defend-button, .counter-attack-button');
      html.on('mouseenter', '.defend-button, .counter-attack-button', (event: any) => {
        const tokenUuid = $(event.currentTarget).data('defender-token-uuid') as string | undefined
          ?? $(event.currentTarget).closest('.attack-actions').data('defender-token-uuid') as string | undefined;
        if (!tokenUuid) return;
        try {
          const token = (foundry.utils as any)?.fromUuidSync?.(tokenUuid);
          const center = token?.center ?? token?.object?.center;
          if (center) (canvas as any).ping?.(center, { duration: 600 });
        } catch (_e) { /* canvas not ready */ }
      });

      // Defense button handler
      html.find('.defend-button').off('click');
      html.find('.defend-button').on('click', async (event: any) => {
        event.preventDefault();

        const messageFlags = message.flags?.sra2;
        if (!messageFlags) { console.error('SRA2 | Defend: missing message flags'); return; }

        const rollResult = messageFlags.rollResult;
        const rollData   = messageFlags.rollData;
        if (!rollResult || !rollData) { console.error('SRA2 | Defend: missing roll data in flags'); return; }

        const isVehicleWeapon = rollData.isVehicleWeapon as boolean;
        const vehicleUuid     = rollData.vehicleUuid as string | undefined;

        const { actor: _attacker, token: attackerToken } = loadCombatantFromFlags(
          { actorUuid: messageFlags.attackerUuid, tokenUuid: messageFlags.attackerTokenUuid, actorId: messageFlags.attackerId },
          'Defense Attacker'
        );

        // Read defender info from the button's parent .attack-actions div (multi-target support).
        // Falls back to global message flags for backward compat.
        const actionsDiv = $(event.currentTarget).closest('.attack-actions');
        const buttonDefenderUuid      = actionsDiv.data('defender-uuid')       as string | undefined;
        const buttonDefenderTokenUuid = actionsDiv.data('defender-token-uuid') as string | undefined;
        const buttonDefenderId        = actionsDiv.data('defender-id')         as string | undefined;

        const { actor: defender, token: defenderToken } = resolveDefenderForDefend(
          {
            defenderUuid:      buttonDefenderUuid      ?? messageFlags.defenderUuid,
            defenderTokenUuid: buttonDefenderTokenUuid ?? messageFlags.defenderTokenUuid,
            defenderId:        buttonDefenderId        ?? messageFlags.defenderId,
          },
          isVehicleWeapon, vehicleUuid
        );

        if (!defender) {
          ui.notifications?.error(game.i18n!.localize('SRA2.COMBAT.CANNOT_FIND_TARGET'));
          return;
        }

        const defenderActorForRoll = defenderToken?.actor ?? defender;
        const isVehicleDefender    = defenderActorForRoll.type === 'vehicle';

        const skillData = resolveDefenseSkillData(defenderActorForRoll, rollData, isVehicleDefender);
        if (!skillData.skill) {
          console.error('SRA2 | Defend: could not determine defense skill');
          return;
        }

        const { getRRSources } = await import('./helpers/sheet-helpers.js');
        let rrList: any[] = [];
        if (!isVehicleDefender) {
          const rrTarget   = skillData.spec ?? skillData.skill!;
          const rrItemType = skillData.spec ? 'specialization' : 'skill';
          rrList = getRRSources(defenderActorForRoll, rrItemType, rrTarget);
        }

        // In defense context the rolling actor's token is the "attacker" slot,
        // and the original attacker becomes the "target" slot.
        const defenderTokenUuid         = defenderToken?.uuid ?? defenderToken?.document?.uuid ?? messageFlags.defenderTokenUuid;
        const originalAttackerTokenUuid = attackerToken?.uuid ?? attackerToken?.document?.uuid  ?? messageFlags.attackerTokenUuid;

        const defenseRollData: any = {
          skillName:       skillData.skill,
          specName:        skillData.spec,
          linkedAttribute: skillData.linkedAttribute,
          skillLevel:      skillData.skillLevel,
          specLevel:       skillData.specLevel,
          actorId:         defenderActorForRoll.id,
          actorUuid:       defenderActorForRoll.uuid,
          attackerTokenUuid: defenderTokenUuid,          // defender's token = the one rolling
          defenderTokenUuid: originalAttackerTokenUuid,  // original attacker = the "target"
          rrList,
          isDefend:        true,
          isCounterAttack: false,
          attackRollResult: rollResult,
          // For indirect spells: pass the player-allocated damage successes so buildDefenseResult uses them
          attackRollData: (() => {
            const spellDist = $(event.currentTarget).closest('.sra2-roll-result').find('.spell-distribution');
            const allocatedDamage = spellDist.length
              ? (parseInt(spellDist.data('damage-successes') as string) || undefined)
              : undefined;
            return allocatedDamage !== undefined
              ? { ...rollData, damageSuccesses: allocatedDamage }
              : rollData;
          })(),
        };

        const { RollDialog } = await import('./applications/roll-dialog.js');
        const dialog = new RollDialog(defenseRollData);
        // Override any stale canvas target with the known original attacker token
        if (attackerToken) (dialog as any).targetToken = attackerToken;
        dialog.render(true);
      });

      // Counter-attack button handler
      html.find('.counter-attack-button').off('click');
      html.find('.counter-attack-button').on('click', async (event: any) => {
        event.preventDefault();

        const messageFlags = message.flags?.sra2;
        if (!messageFlags) { console.error('SRA2 | Counter-attack: missing message flags'); return; }

        const rollResult = messageFlags.rollResult;
        const rollData   = messageFlags.rollData;
        if (!rollResult || !rollData) { console.error('SRA2 | Counter-attack: missing roll data in flags'); return; }

        const { actor: _attacker, token: attackerToken } = loadCombatantFromFlags(
          { actorUuid: messageFlags.attackerUuid, tokenUuid: messageFlags.attackerTokenUuid, actorId: messageFlags.attackerId },
          'Counter-attack Attacker'
        );

        // Read defender info from button's parent .attack-actions div (multi-target support)
        const caActionsDiv = $(event.currentTarget).closest('.attack-actions');
        const caDefenderUuid      = caActionsDiv.data('defender-uuid')       as string | undefined;
        const caDefenderTokenUuid = caActionsDiv.data('defender-token-uuid') as string | undefined;
        const caDefenderId        = caActionsDiv.data('defender-id')         as string | undefined;

        const { actor: defender, token: defenderToken } = loadCombatantFromFlags(
          {
            actorUuid: caDefenderUuid      ?? messageFlags.defenderUuid,
            tokenUuid: caDefenderTokenUuid ?? messageFlags.defenderTokenUuid,
            actorId:   caDefenderId        ?? messageFlags.defenderId,
          },
          'Counter-attack Defender'
        );

        if (!defender) {
          ui.notifications?.error(game.i18n!.localize('SRA2.COMBAT.CANNOT_FIND_TARGET'));
          return;
        }

        const defenderActorForRoll = defenderToken?.actor ?? defender;

        const { WEAPON_TYPES } = await import('./models/item-feat.js');
        const availableWeapons = getMeleeWeaponsForCounterAttack(defenderActorForRoll, WEAPON_TYPES);
        if (availableWeapons.length === 0) {
          ui.notifications?.warn(game.i18n!.localize('SRA2.COMBAT.COUNTER_ATTACK.NO_WEAPONS'));
          return;
        }

        const counterAttackerTokenUuid  = defenderToken?.uuid ?? defenderToken?.document?.uuid ?? messageFlags.defenderTokenUuid;
        const originalAttackerTokenUuid = attackerToken?.uuid ?? attackerToken?.document?.uuid  ?? messageFlags.attackerTokenUuid;

        const counterAttackRollData: any = {
          actorId:   defenderActorForRoll.id,
          actorUuid: messageFlags.defenderUuid ?? defenderActorForRoll.uuid,
          attackerTokenUuid: messageFlags.defenderTokenUuid ?? counterAttackerTokenUuid,  // defender becomes the "attacker"
          defenderTokenUuid: messageFlags.attackerTokenUuid ?? originalAttackerTokenUuid, // original attacker = the "target"
          availableWeapons,
          isDefend:        false,
          isCounterAttack: true,
          attackRollResult: rollResult,
          attackRollData:   rollData,
        };

        const { RollDialog } = await import('./applications/roll-dialog.js');
        const dialog = new RollDialog(counterAttackRollData);
        // Always override with the known original attacker token (constructor may have captured stale targets)
        if (attackerToken) (dialog as any).targetToken = attackerToken;
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
          actor = controlledTokens[0]?.actor;
        } else {
          // Fallback: get first owned actor
          const ownedActors = (game.actors as any).filter((a: any) => a.isOwner);
          if (ownedActors.length > 0) {
            actor = ownedActors[0];
          }
        }

        if (!actor) {
          ui.notifications?.warn(game.i18n!.localize('SRA2.CHAT.NO_ACTOR') || 'No controlled character');
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
          skillName: game.i18n!.localize('SRA2.ROLL_DIALOG.TITLE'),
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
    Hooks.on('renderChatLog' as any, (_app: any, _html: any, _data: any) => {
      // Use setTimeout to ensure the chat form is fully rendered
      setTimeout(() => {
        if (!addRollDiceButton()) {
          // If button wasn't added, try again after a longer delay
          setTimeout(addRollDiceButton, DELAYS.UI_RETRY);
        }
      }, DELAYS.SHEET_RENDER);
    });

    // Also register for chat popout
    Hooks.on('renderChatPopout' as any, (_app: any, _html: any, _data: any) => {
      setTimeout(() => {
        if (!addRollDiceButton()) {
          setTimeout(addRollDiceButton, DELAYS.UI_RETRY);
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
    (game.settings as any)!.register(SYSTEM.id, 'uiTheme', {
      name: 'SRA2.SETTINGS.THEME.TITLE',
      hint: 'SRA2.SETTINGS.THEME.DESC',
      scope: 'client',
      config: true,
      type: String,
      choices: () => {
        return {
          'sra2': game.i18n!.localize('SRA2.SETTINGS.THEME.SRA2'),
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
  /**
   * Initialize Babele translations if the module is available
   */
  initializeBabele(): void {
    const g = game as any;
    if (
      g.babele &&
      g.babele.modules.every((module: any) => module.module !== (game.settings as any)?.get((CONFIG as any).l5r5e?.namespace, "custom-compendium-name"))
    ) {
      g.babele.setSystemTranslationsDir("lang"); // Since Babele v2.0.7
    }
  }

  registerGroupAnarchySetting(): void {
    (game.settings as any)!.register(SYSTEM.id, 'groupAnarchy', {
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
      theme = (game.settings as any)!.get(SYSTEM.id, 'uiTheme') as string || 'sra2';
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


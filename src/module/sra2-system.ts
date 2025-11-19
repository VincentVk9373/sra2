import { SYSTEM } from "./config/system.ts";

// Expose the SYSTEM object to the global scope
globalThis.SYSTEM = SYSTEM;

import * as models from "./models/_module.ts";
import * as documents from "./documents/_module.ts";
import * as applications from "./applications/_module.ts";
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
      html.find('.apply-damage-btn').on('click', async (event: any) => {
        event.preventDefault();
        const button = $(event.currentTarget);
        const defenderUuid = button.data('defender-uuid');
        const damage = parseInt(button.data('damage'));
        const defenderName = button.data('defender-name');
        
        await applications.CharacterSheet.applyDamage(defenderUuid, damage, defenderName);
      });

      // Defense button handler
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
        
        // Get attacker token from UUID if available
        if (messageFlags.attackerTokenUuid) {
          try {
            attackerToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerTokenUuid) || null;
            if (attackerToken?.actor) {
              attacker = attackerToken.actor;
              console.log('Defense button: Attacker token loaded from UUID, using token actor');
            }
          } catch (e) {
            console.warn('Defense button: Failed to load attacker token from UUID:', e);
          }
        }
        
        // If no attacker token, try to get actor and find token on canvas
        if (!attacker) {
          if (messageFlags.attackerId) {
            attacker = game.actors?.get(messageFlags.attackerId) || null;
          } else if (messageFlags.attackerUuid) {
            attacker = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerUuid) || null;
          }
          
          if (attacker && !attackerToken) {
            attackerToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === attacker.id || token.actor?.uuid === attacker.uuid;
            }) || null;
          }
        }
        
        // Get defender token from UUID if available
        if (messageFlags.defenderTokenUuid) {
          try {
            defenderToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderTokenUuid) || null;
            if (defenderToken?.actor) {
              defender = defenderToken.actor;
              console.log('Defense button: Defender token loaded from UUID, using token actor');
            }
          } catch (e) {
            console.warn('Defense button: Failed to load defender token from UUID:', e);
          }
        }
        
        // If no defender token, try to get actor and find token on canvas
        if (!defender) {
          if (messageFlags.defenderId) {
            defender = game.actors?.get(messageFlags.defenderId) || null;
          } else if (messageFlags.defenderUuid) {
            defender = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderUuid) || null;
          }
          
          if (defender && !defenderToken) {
            defenderToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === defender.id || token.actor?.uuid === defender.uuid;
            }) || null;
          }
        }

        // Extract information
        const success = rollResult.totalSuccesses || 0;
        const damage = rollData.damageValue || 0;
        const attackerName = attacker?.name || 'Unknown';
        const attackerId = attacker?.id || messageFlags.attackerId || 'Unknown';
        const attackerUuid = attacker?.uuid || messageFlags.attackerUuid || 'Unknown';
        const defenderName = defender?.name || 'Unknown';
        const defenderId = defender?.id || messageFlags.defenderId || 'Unknown';
        const defenderUuid = defender?.uuid || messageFlags.defenderUuid || 'Unknown';
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

        // Open defense roll dialog
        if (!defender || !defenseSkill) {
          console.error('Missing defender or defense skill');
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

        // Determine which skill/spec to use for defense
        // Priority: 1) defenseSpec if found, 2) defenseSkill if found, 3) fallback based on attack type
        let finalDefenseSkill: string | null = null;
        let finalDefenseSpec: string | null = null;
        
        // Try to find the defense spec first
        if (defenseSpec) {
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

        // Calculate skill/spec levels for defender (use token's actor for NPCs)
        let defenseSkillLevel: number | undefined = undefined;
        let defenseSpecLevel: number | undefined = undefined;
        let defenseLinkedAttribute: string | undefined = undefined;

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

        // Get RR sources for defense skill/spec (use token's actor for NPCs)
        const { getRRSources } = await import('./helpers/sheet-helpers.js');
        let defenseRRList: any[] = [];
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

        // Get token UUIDs
        const attackerTokenUuid = attackerToken?.uuid || attackerToken?.document?.uuid || undefined;
        const defenderTokenUuid = defenderTokenForRoll?.uuid || defenderTokenForRoll?.document?.uuid || defenderToken?.uuid || defenderToken?.document?.uuid || undefined;
        
        // Prepare defense roll data
        const defenseRollData: any = {
          // Use final defense skill/spec (with fallback)
          skillName: finalDefenseSkill,
          specName: finalDefenseSpec,
          linkedAttribute: defenseLinkedAttribute,
          skillLevel: defenseSkillLevel,
          specLevel: defenseSpecLevel,
          
          // Actor is the defender (use token's actor UUID for NPCs)
          actorId: defenderActorForRoll.id,
          actorUuid: defenderActorForRoll.uuid,
          
          // Token UUIDs
          attackerTokenUuid: attackerTokenUuid,
          defenderTokenUuid: defenderTokenUuid,
          
          // Target is the attacker
          // We'll set targetToken in RollDialog constructor
          
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
        
        // Set target token to attacker's token
        if (attackerToken) {
          (dialog as any).targetToken = attackerToken;
        }
        
        dialog.render(true);
      });

      // Counter-attack button handler
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
        
        // Get attacker token from UUID if available
        if (messageFlags.attackerTokenUuid) {
          try {
            attackerToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerTokenUuid) || null;
            if (attackerToken?.actor) {
              attacker = attackerToken.actor;
              console.log('Counter-attack button: Attacker token loaded from UUID, using token actor');
            }
          } catch (e) {
            console.warn('Counter-attack button: Failed to load attacker token from UUID:', e);
          }
        }
        
        // If no attacker token, try to get actor and find token on canvas
        if (!attacker) {
          if (messageFlags.attackerId) {
            attacker = game.actors?.get(messageFlags.attackerId) || null;
          } else if (messageFlags.attackerUuid) {
            attacker = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerUuid) || null;
          }
          
          if (attacker && !attackerToken) {
            attackerToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === attacker.id || token.actor?.uuid === attacker.uuid;
            }) || null;
          }
        }
        
        // Get defender token from UUID if available
        if (messageFlags.defenderTokenUuid) {
          try {
            defenderToken = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderTokenUuid) || null;
            if (defenderToken?.actor) {
              defender = defenderToken.actor;
              console.log('Counter-attack button: Defender token loaded from UUID, using token actor');
            }
          } catch (e) {
            console.warn('Counter-attack button: Failed to load defender token from UUID:', e);
          }
        }
        
        // If no defender token, try to get actor and find token on canvas
        if (!defender) {
          if (messageFlags.defenderId) {
            defender = game.actors?.get(messageFlags.defenderId) || null;
          } else if (messageFlags.defenderUuid) {
            defender = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderUuid) || null;
          }
          
          if (defender && !defenderToken) {
            defenderToken = canvas?.tokens?.placeables?.find((token: any) => {
              return token.actor?.id === defender.id || token.actor?.uuid === defender.uuid;
            }) || null;
          }
        }

        // Open counter-attack roll dialog
        if (!defender) {
          console.error('Missing defender');
          return;
        }

        // Get defender token from UUID (for NPCs, we need the token instance)
        // For NPCs, the actor is linked to the token, so we need to use the token's actor
        let defenderTokenForRoll: any = null;
        let defenderActorForRoll: any = defender; // Default to defender actor
        
        const defenderTokenUuidForCounter = defenderToken?.uuid || defenderToken?.document?.uuid || messageFlags.defenderTokenUuid || 'Unknown';
        if (defenderTokenUuidForCounter && defenderTokenUuidForCounter !== 'Unknown') {
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
          
          return {
            id: weapon.id,
            name: weapon.name,
            linkedAttackSkill: linkedAttackSkill,
            damageValue: weaponSystem.damageValue || '0',
            damageValueBonus: weaponSystem.damageValueBonus || 0,
            weaponType: weaponType,
            meleeRange: weaponSystem.meleeRange || 'none'
          };
        });

        // Get token UUIDs
        const counterAttackerTokenUuid = defenderTokenForRoll?.uuid || defenderTokenForRoll?.document?.uuid || defenderToken?.uuid || defenderToken?.document?.uuid || undefined;
        const originalAttackerTokenUuid = attackerToken?.uuid || attackerToken?.document?.uuid || undefined;
        
        // Prepare counter-attack roll data with available weapons
        const counterAttackRollData: any = {
          // Actor is the defender (use token's actor UUID for NPCs)
          actorId: defenderActorForRoll.id,
          actorUuid: defenderActorForRoll.uuid,
          
          // Token UUIDs - for counter-attack, the defender becomes the attacker
          attackerTokenUuid: counterAttackerTokenUuid, // Token of the defender (who is counter-attacking)
          defenderTokenUuid: originalAttackerTokenUuid, // Token of the original attacker
          
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
        if (attackerToken && !dialog.targetToken) {
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

  async onReady(): Promise<void> {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onReady');
    
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


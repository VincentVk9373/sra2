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
        const button = $(event.currentTarget);
        const actionsDiv = button.closest('.attack-actions');
        
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

        // Get actors from flags
        let attacker: any = null;
        let defender: any = null;
        
        if (messageFlags.attackerId) {
          attacker = game.actors?.get(messageFlags.attackerId) || null;
        } else if (messageFlags.attackerUuid) {
          attacker = (foundry.utils as any)?.fromUuidSync?.(messageFlags.attackerUuid) || null;
        }
        
        if (messageFlags.defenderId) {
          defender = game.actors?.get(messageFlags.defenderId) || null;
        } else if (messageFlags.defenderUuid) {
          defender = (foundry.utils as any)?.fromUuidSync?.(messageFlags.defenderUuid) || null;
        }

        // Get tokens from canvas
        let attackerToken: any = null;
        let defenderToken: any = null;
        
        if (attacker) {
          attackerToken = canvas?.tokens?.placeables?.find((token: any) => {
            return token.actor?.id === attacker.id || token.actor?.uuid === attacker.uuid;
          }) || null;
        }
        
        if (defender) {
          defenderToken = canvas?.tokens?.placeables?.find((token: any) => {
            return token.actor?.id === defender.id || token.actor?.uuid === defender.uuid;
          }) || null;
        }

        // Extract information
        const success = rollResult.totalSuccesses || 0;
        const damage = rollData.damageValue || 0;
        const attackerName = attacker?.name || 'Unknown';
        const attackerId = attacker?.id || messageFlags.attackerId || 'Unknown';
        const attackerUuid = attacker?.uuid || messageFlags.attackerUuid || 'Unknown';
        const attackerTokenUuid = attackerToken?.uuid || attackerToken?.document?.uuid || 'Unknown';
        const defenderName = defender?.name || 'Unknown';
        const defenderId = defender?.id || messageFlags.defenderId || 'Unknown';
        const defenderUuid = defender?.uuid || messageFlags.defenderUuid || 'Unknown';
        const defenderTokenUuid = defenderToken?.uuid || defenderToken?.document?.uuid || 'Unknown';
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
        console.log('Attacker Token UUID:', attackerTokenUuid);
        console.log('Defender:', defenderName);
        console.log('Defender ID:', defenderId);
        console.log('Defender UUID:', defenderUuid);
        console.log('Defender Token UUID:', defenderTokenUuid);
        console.log('Skill de defense:', defenseSkill);
        console.log('Spe de defense:', defenseSpec);
        console.log('Skill d\'attaque:', attackSkill);
        console.log('Spe d\'attaque:', attackSpec);
        console.log('===================');
      });
    });
    
    // Register token context menu hook for bookmarks/favorites
    Hooks.on('getTokenHUDOptions', (hud: any, buttons: any[], token: any) => {
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


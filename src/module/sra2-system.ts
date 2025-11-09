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
    });
    
    // Register custom Actor document class
    CONFIG.Actor.documentClass = documents.SRA2Actor;
    
    // Register Actor data models
    CONFIG.Actor.dataModels = {
      character: models.CharacterDataModel,
      npc: models.NpcDataModel,
    };
    
    // Register Item data models
    CONFIG.Item.dataModels = {
      skill: models.SkillDataModel,
      feat: models.FeatDataModel,
      specialization: models.SpecializationDataModel,
      metatype: models.MetatypeDataModel,
    };
    
    // Register character sheet
    DocumentSheetConfig.registerSheet(Actor, "sra2", applications.CharacterSheet, {
      types: ["character"],
      makeDefault: true,
      label: "SRA2.SHEET.CHARACTER"
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
    
    Hooks.once("ready", () => this.onReady());
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


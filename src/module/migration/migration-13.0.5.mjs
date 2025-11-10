import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.5: Separate weapons and spells feat types
 * This migration converts "weapons-spells" feat type to separate "weapon" and "spell" types
 * By default, all "weapons-spells" are converted to "weapon" type
 */
export class Migration_13_0_5 extends Migration {
  get code() { 
    return "migration-13.0.5"; 
  }

  get version() { 
    return "13.0.5"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.5: Separating weapons and spells feat types");
    
    let totalConverted = 0;
    let totalSkipped = 0;
    
    await this.applyItemsUpdates((items) => {
      const updates = [];
      
      for (const item of items) {
        // Only process feat items
        if (item.type !== 'feat') {
          continue;
        }
        
        // Access the system data
        const sourceSystem = item._source?.system || item.system;
        
        // Check if this is a "weapons-spells" feat type
        if (sourceSystem.featType !== 'weapons-spells') {
          totalSkipped++;
          continue;
        }
        
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.5: Converting feat "${item.name}" from "weapons-spells" to "weapon"`);
        
        // Convert to "weapon" type by default
        // Users can manually change specific items to "spell" if needed
        const update = {
          _id: item.id,
          'system.featType': 'weapon'
        };
        
        updates.push(update);
        totalConverted++;
      }
      
      return updates;
    });
    
    const summaryMessage = `Migration 13.0.5 completed - Converted: ${totalConverted} weapons-spells to weapon, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Show user-friendly notification
    if (totalConverted > 0) {
      const userMessage = game.i18n ? 
        game.i18n.localize('SRA2.MIGRATION.13_0_5_INFO') :
        `Migration 13.0.5: Converted ${totalConverted} "weapons-spells" feats to "weapon" type. You can manually change specific items to "spell" type if needed.`;
      ui.notifications?.info(userMessage, {permanent: false});
    }
  }
}


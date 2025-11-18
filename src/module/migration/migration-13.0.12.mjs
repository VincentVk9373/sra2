import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.12: Convert "dice" to "disadvantage" in weapon ranges
 * This migration updates all weapon/spell range values from "dice" to "disadvantage"
 * for meleeRange, shortRange, mediumRange, and longRange fields
 */
export class Migration_13_0_12 extends Migration {
  get code() { 
    return "migration-13.0.12"; 
  }

  get version() { 
    return "13.0.12"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.12: Converting 'dice' to 'disadvantage' in weapon ranges");
    
    let totalUpdated = 0;
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
        
        // Skip if already migrated
        if (sourceSystem._rangeDiceToDisadvantageMigrationVersion === '13.0.12') {
          totalSkipped++;
          continue;
        }
        
        // Check if any range has "dice" value
        const hasDiceValue = 
          sourceSystem.meleeRange === 'dice' ||
          sourceSystem.shortRange === 'dice' ||
          sourceSystem.mediumRange === 'dice' ||
          sourceSystem.longRange === 'dice';
        
        if (!hasDiceValue) {
          // No "dice" values found, skip (don't mark as migrated to allow re-running)
          totalSkipped++;
          continue;
        }
        
        // Build update object with converted values
        const update = {
          _id: item.id,
          'system._rangeDiceToDisadvantageMigrationVersion': '13.0.12'
        };
        
        if (sourceSystem.meleeRange === 'dice') {
          update['system.meleeRange'] = 'disadvantage';
        }
        if (sourceSystem.shortRange === 'dice') {
          update['system.shortRange'] = 'disadvantage';
        }
        if (sourceSystem.mediumRange === 'dice') {
          update['system.mediumRange'] = 'disadvantage';
        }
        if (sourceSystem.longRange === 'dice') {
          update['system.longRange'] = 'disadvantage';
        }
        
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.12: Converting ranges for "${item.name}" (ID: ${item.id})`);
        
        updates.push(update);
        totalUpdated++;
      }
      
      return updates;
    });
    
    // Summary message
    const summaryMessage = `Migration 13.0.12 completed - Items updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Show user-friendly notification
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? 
        game.i18n.format('SRA2.MIGRATION.13_0_12_INFO', { count: totalUpdated }) :
        `Migration 13.0.12: Converted weapon ranges from "dice" to "disadvantage" for ${totalUpdated} item(s).`;
      
      ui.notifications?.info(userMessage, {permanent: false});
      
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ All weapon ranges now use 'disadvantage' instead of 'dice'");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}


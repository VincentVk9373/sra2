import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.4: Clean up old RR fields and backups
 * This migration removes the old rrType/rrValue/rrTarget fields and their backups
 * after confirming that rrList is working properly
 */
export class Migration_13_0_4 extends Migration {
  get code() { 
    return "migration-13.0.4"; 
  }

  get version() { 
    return "13.0.4"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.4: Cleaning up old RR fields and backups");
    
    let totalCleaned = 0;
    let totalSkipped = 0;
    
    await this.applyItemsUpdates((items) => {
      const updates = [];
      
      for (const item of items) {
        // Only process feat items
        if (item.type !== 'feat') {
          continue;
        }
        
        // Access the raw source data
        const sourceSystem = item._source?.system || item.system;
        
        // Check if there are any old fields or backups to clean
        const hasOldFields = (
          sourceSystem.rrType !== undefined ||
          sourceSystem.rrValue !== undefined ||
          sourceSystem.rrTarget !== undefined
        );
        
        const hasBackups = (
          sourceSystem._rrTypeBackup !== undefined ||
          sourceSystem._rrValueBackup !== undefined ||
          sourceSystem._rrTargetBackup !== undefined
        );
        
        // Skip if nothing to clean
        if (!hasOldFields && !hasBackups) {
          totalSkipped++;
          continue;
        }
        
        // Check that rrList exists (safety check)
        const hasRrList = sourceSystem.rrList !== undefined && Array.isArray(sourceSystem.rrList);
        
        if (!hasRrList) {
          console.warn(SYSTEM.LOG.HEAD + `Migration 13.0.4: Skipping "${item.name}" - no rrList found! This item may need manual review.`);
          totalSkipped++;
          continue;
        }
        
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.4: Cleaning up feat "${item.name}":`);
        if (hasOldFields) {
          console.log(SYSTEM.LOG.HEAD + `  Removing old fields: rrType, rrValue, rrTarget`);
        }
        if (hasBackups) {
          console.log(SYSTEM.LOG.HEAD + `  Removing backups: _rrTypeBackup, _rrValueBackup, _rrTargetBackup`);
        }
        console.log(SYSTEM.LOG.HEAD + `  Keeping rrList with ${sourceSystem.rrList.length} entries`);
        
        // Create the update object to remove all old fields
        const update = {
          _id: item.id,
          // Remove old fields
          'system.rrType': null,
          'system.rrValue': null,
          'system.rrTarget': null,
          // Remove backup fields
          'system._rrTypeBackup': null,
          'system._rrValueBackup': null,
          'system._rrTargetBackup': null
        };
        
        updates.push(update);
        totalCleaned++;
      }
      
      return updates;
    });
    
    const summaryMessage = `Migration 13.0.4 completed - Cleaned: ${totalCleaned}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Show user-friendly notification
    if (totalCleaned > 0) {
      const userMessage = game.i18n ? 
        game.i18n.localize('SRA2.MIGRATION.13_0_4_INFO') :
        'Migration 13.0.4: Old RR fields cleaned up. Data migration complete.';
      ui.notifications?.info(userMessage, {permanent: false});
    }
  }
}


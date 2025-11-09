import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.3: Convert rrType, rrValue, rrTarget arrays to rrList
 * This migration transforms the three separate arrays into a single array of objects
 * where each object contains {rrType, rrValue, rrTarget}
 */
export class Migration_13_0_3 extends Migration {
  get code() { 
    return "migration-13.0.3"; 
  }

  get version() { 
    return "13.0.3"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.3: Converting rrType/rrValue/rrTarget to rrList");
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    
    await this.applyItemsUpdates((items) => {
      const updates = [];
      
      for (const item of items) {
        // Only process feat items
        if (item.type !== 'feat') {
          continue;
        }
        
        // Access the raw source data which contains fields even if they're not in the schema
        const sourceSystem = item._source?.system || item.system;
        const system = item.system;
        
        // Check for old format in the source data (raw data from database)
        const hasOldFormat = (
          (sourceSystem.rrType !== undefined && Array.isArray(sourceSystem.rrType)) ||
          (sourceSystem.rrValue !== undefined && Array.isArray(sourceSystem.rrValue)) ||
          (sourceSystem.rrTarget !== undefined && Array.isArray(sourceSystem.rrTarget))
        );
        
        // Check if rrList already exists with content in source
        const hasNewFormatInSource = (
          sourceSystem.rrList !== undefined && 
          Array.isArray(sourceSystem.rrList)
        );
        
        // Skip if already migrated (has new format in source AND no old format)
        if (hasNewFormatInSource && !hasOldFormat) {
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Skipping "${item.name}" - already has rrList in source (${sourceSystem.rrList.length} entries), no old data`);
          totalSkipped++;
          continue;
        }
        
        // Skip if no old format to migrate
        if (!hasOldFormat) {
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Skipping "${item.name}" - no old format fields found`);
          totalSkipped++;
          continue;
        }
        
        // Get the arrays from source data
        const rrType = Array.isArray(sourceSystem.rrType) ? sourceSystem.rrType : [];
        const rrValue = Array.isArray(sourceSystem.rrValue) ? sourceSystem.rrValue : [];
        const rrTarget = Array.isArray(sourceSystem.rrTarget) ? sourceSystem.rrTarget : [];
        
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Found "${item.name}" with old format:`, {
          rrType: rrType,
          rrValue: rrValue,
          rrTarget: rrTarget
        });
        
        // Convert the three arrays into a single rrList array
        const rrList = [];
        const maxLength = Math.max(rrType.length, rrValue.length, rrTarget.length);
        
        for (let i = 0; i < maxLength; i++) {
          // Only add entries where rrType exists and is not "none"
          const type = rrType[i];
          if (type && type !== 'none') {
            rrList.push({
              rrType: type,
              rrValue: rrValue[i] !== undefined ? rrValue[i] : 0,
              rrTarget: rrTarget[i] !== undefined ? rrTarget[i] : ''
            });
          }
        }
        
        // Create the update object
        const update = {
          _id: item.id,
          'system.rrList': rrList,
          // Store backup of old data before deletion
          'system._rrTypeBackup': rrType,
          'system._rrValueBackup': rrValue,
          'system._rrTargetBackup': rrTarget,
          // Remove old fields by setting them to null (Foundry will delete them)
          'system.rrType': null,
          'system.rrValue': null,
          'system.rrTarget': null
        };
        
        updates.push(update);
        totalMigrated++;
        
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.3: Converting feat "${item.name}":`);
        console.log(SYSTEM.LOG.HEAD + `  Old data (will be deleted, backed up as _rrTypeBackup/_rrValueBackup/_rrTargetBackup):`, { rrType, rrValue, rrTarget });
        console.log(SYSTEM.LOG.HEAD + `  New rrList (${rrList.length} entries):`, rrList);
      }
      
      return updates;
    });
    
    const summaryMessage = `Migration 13.0.3 completed - Migrated: ${totalMigrated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Show user-friendly notification
    if (totalMigrated > 0) {
      const userMessage = game.i18n ? 
        game.i18n.localize('SRA2.MIGRATION.13_0_3_INFO') :
        'Migration 13.0.3: Risk Reduction data converted. Check console for details.';
      ui.notifications?.info(userMessage, {permanent: false});
    }
  }
}


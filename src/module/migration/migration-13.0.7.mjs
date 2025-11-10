import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.7: Convert weapons-spells to weapon (with backup)
 * This migration safely converts all "weapons-spells" feat types to "weapon"
 * Creates a backup of the old value before conversion
 */
export class Migration_13_0_7 extends Migration {
  get code() { 
    return "migration-13.0.7"; 
  }

  get version() { 
    return "13.0.7"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.7: Converting weapons-spells to weapon (with backup)");
    
    let totalConverted = 0;
    let totalSkipped = 0;
    let conversionDetails = [];
    
    await this.applyItemsUpdates((items) => {
      const updates = [];
      
      for (const item of items) {
        // Only process feat items
        if (item.type !== 'feat') {
          continue;
        }
        
        // Access the system data
        const sourceSystem = item._source?.system || item.system;
        
        // Skip if not weapons-spells type
        if (sourceSystem.featType !== 'weapons-spells') {
          totalSkipped++;
          continue;
        }
        
        // Log what we're converting
        const itemInfo = {
          name: item.name,
          id: item.id,
          oldType: 'weapons-spells',
          newType: 'weapon',
          hasWeaponFocus: sourceSystem.isWeaponFocus || false,
          hasDamageValue: (sourceSystem.damageValue || 0) > 0,
          hasRanges: (
            sourceSystem.meleeRange !== 'none' ||
            sourceSystem.shortRange !== 'none' ||
            sourceSystem.mediumRange !== 'none' ||
            sourceSystem.longRange !== 'none'
          )
        };
        
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.7: Converting "${item.name}" (ID: ${item.id})`);
        console.log(SYSTEM.LOG.HEAD + `  - Old type: weapons-spells`);
        console.log(SYSTEM.LOG.HEAD + `  - New type: weapon`);
        console.log(SYSTEM.LOG.HEAD + `  - Has weapon focus: ${itemInfo.hasWeaponFocus}`);
        console.log(SYSTEM.LOG.HEAD + `  - Has damage value: ${itemInfo.hasDamageValue}`);
        console.log(SYSTEM.LOG.HEAD + `  - Has ranges: ${itemInfo.hasRanges}`);
        
        conversionDetails.push(itemInfo);
        
        // Create the update object
        const update = {
          _id: item.id,
          // Change the type
          'system.featType': 'weapon',
          // Create a backup of the old type for safety
          'system._oldFeatTypeBackup': 'weapons-spells',
          // Add a migration timestamp
          'system._migratedAt': new Date().toISOString(),
          'system._migrationVersion': '13.0.7'
        };
        
        updates.push(update);
        totalConverted++;
      }
      
      return updates;
    });
    
    // Summary message
    const summaryMessage = `Migration 13.0.7 completed - Converted: ${totalConverted}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Detailed summary
    if (conversionDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== CONVERSION DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items converted: ${conversionDetails.length}`);
      
      const withWeaponFocus = conversionDetails.filter(d => d.hasWeaponFocus).length;
      const withDamage = conversionDetails.filter(d => d.hasDamageValue).length;
      const withRanges = conversionDetails.filter(d => d.hasRanges).length;
      
      console.log(SYSTEM.LOG.HEAD + `  - Items with weapon focus: ${withWeaponFocus}`);
      console.log(SYSTEM.LOG.HEAD + `  - Items with damage value: ${withDamage}`);
      console.log(SYSTEM.LOG.HEAD + `  - Items with ranges: ${withRanges}`);
      console.log(SYSTEM.LOG.HEAD + "=========================");
      
      // List all converted items
      console.log(SYSTEM.LOG.HEAD + "Converted items:");
      conversionDetails.forEach((detail, index) => {
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (ID: ${detail.id})`);
      });
    }
    
    // Show user-friendly notification
    if (totalConverted > 0) {
      const userMessage = game.i18n ? 
        game.i18n.format('SRA2.MIGRATION.13_0_7_INFO', { count: totalConverted }) :
        `Migration 13.0.7: Converted ${totalConverted} "weapons-spells" items to "weapon" type. All data preserved with backup.`;
      
      ui.notifications?.info(userMessage, {permanent: false});
      
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete. All items have been backed up.");
      console.log(SYSTEM.LOG.HEAD + "✓ Old type saved in system._oldFeatTypeBackup");
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the conversion");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to convert - all items already migrated or are other types");
    }
  }
}


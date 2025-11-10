import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.10: Update cost field values
 * This migration updates the cost field to use the new simplified system:
 * - 'specialized-equipment' -> 'advanced-equipment'
 * - 'feat' -> removed (defaults to 0 cost for non-equipment items)
 * - Cost field only applies to equipment and weapon types
 */
export class Migration_13_0_10 extends Migration {
  get code() { 
    return "migration-13.0.10"; 
  }

  get version() { 
    return "13.0.10"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.10: Updating cost field values");
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    let updateDetails = [];
    
    await this.applyItemsUpdates((items) => {
      const updates = [];
      
      for (const item of items) {
        // Only process feat items
        if (item.type !== 'feat') {
          continue;
        }
        
        // Access the system data
        const sourceSystem = item._source?.system || item.system;
        
        let needsUpdate = false;
        const update = {
          _id: item.id
        };
        
        const currentCost = sourceSystem.cost;
        const featType = sourceSystem.featType || 'equipment';
        let newCost = currentCost;
        let reason = '';
        
        // Convert specialized-equipment to advanced-equipment
        if (currentCost === 'specialized-equipment') {
          newCost = 'advanced-equipment';
          needsUpdate = true;
          reason = 'specialized-equipment → advanced-equipment';
        }
        
        // Convert old 'feat' cost type to appropriate value
        if (currentCost === 'feat') {
          // For equipment and weapons, set to free-equipment (0 cost)
          // For other types, the cost doesn't apply anyway but we set it to free-equipment for consistency
          newCost = 'free-equipment';
          needsUpdate = true;
          reason = 'feat → free-equipment (cost = 0 for non-equipment types)';
        }
        
        if (needsUpdate) {
          update['system.cost'] = newCost;
          update['system._costMigrationVersion'] = '13.0.10';
          
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.10: Updating cost for "${item.name}" (ID: ${item.id})`);
          console.log(SYSTEM.LOG.HEAD + `  - Type: ${featType}`);
          console.log(SYSTEM.LOG.HEAD + `  - Old cost: ${currentCost}`);
          console.log(SYSTEM.LOG.HEAD + `  - New cost: ${newCost}`);
          console.log(SYSTEM.LOG.HEAD + `  - Reason: ${reason}`);
          
          updateDetails.push({
            name: item.name,
            id: item.id,
            featType: featType,
            oldCost: currentCost,
            newCost: newCost,
            reason: reason
          });
          
          updates.push(update);
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
      
      return updates;
    });
    
    // Summary message
    const summaryMessage = `Migration 13.0.10 completed - Items updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Detailed summary
    if (updateDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== UPDATE DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items updated: ${updateDetails.length}`);
      
      const specializedToAdvanced = updateDetails.filter(d => d.oldCost === 'specialized-equipment').length;
      const featToFree = updateDetails.filter(d => d.oldCost === 'feat').length;
      
      console.log(SYSTEM.LOG.HEAD + `  - specialized-equipment → advanced-equipment: ${specializedToAdvanced}`);
      console.log(SYSTEM.LOG.HEAD + `  - feat → free-equipment: ${featToFree}`);
      console.log(SYSTEM.LOG.HEAD + "======================");
      
      // List all updated items
      console.log(SYSTEM.LOG.HEAD + "Updated items:");
      updateDetails.forEach((detail, index) => {
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (${detail.featType}): ${detail.oldCost} → ${detail.newCost}`);
      });
    }
    
    // Show user-friendly notification
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? 
        game.i18n.format('SRA2.MIGRATION.13_0_10_INFO', { 
          count: totalUpdated,
          specializedCount: updateDetails.filter(d => d.oldCost === 'specialized-equipment').length,
          featCount: updateDetails.filter(d => d.oldCost === 'feat').length
        }) :
        `Migration 13.0.10: Updated ${totalUpdated} feat(s) cost values.`;
      
      ui.notifications?.info(userMessage, {permanent: false});
      
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ Cost system simplified: free (0¥), equipment (2500¥), advanced (5000¥)");
      console.log(SYSTEM.LOG.HEAD + "✓ Cost now only applies to equipment and weapon types");
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the migration");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}


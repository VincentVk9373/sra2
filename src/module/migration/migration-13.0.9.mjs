import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.9: Add value field to narrativeEffects and isFirstFeat field
 * This migration adds a 'value' field to all narrative effects
 * with a default of -1 for consistency with the new schema,
 * and adds an 'isFirstFeat' boolean field with default false
 */
export class Migration_13_0_9 extends Migration {
  get code() { 
    return "migration-13.0.9"; 
  }

  get version() { 
    return "13.0.9"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.9: Adding value field to narrativeEffects and isFirstFeat field");
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFirstFeatAdded = 0;
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
        
        // Check if item has narrativeEffects that need updating
        if (sourceSystem.narrativeEffects && sourceSystem.narrativeEffects.length > 0) {
          const updatedEffects = sourceSystem.narrativeEffects.map(effect => {
            // Check if effect already has a value field
            if (typeof effect === 'object' && effect !== null && !('value' in effect)) {
              needsUpdate = true;
              return {
                ...effect,
                value: -1  // Default value for all effects
              };
            }
            return effect;
          });
          
          if (needsUpdate) {
            update['system.narrativeEffects'] = updatedEffects;
            update['system._migratedNarrativeEffectsValueAt'] = new Date().toISOString();
            
            // Log what we're converting
            console.log(SYSTEM.LOG.HEAD + `Migration 13.0.9: Adding value field to narrativeEffects for "${item.name}" (ID: ${item.id})`);
            console.log(SYSTEM.LOG.HEAD + `  - Effect count: ${updatedEffects.length}`);
            
            updateDetails.push({
              name: item.name,
              id: item.id,
              effectCount: updatedEffects.length,
              hasFirstFeat: false
            });
          }
        }
        
        // Check if item needs isFirstFeat field (add to all feats that don't have it)
        if (sourceSystem.isFirstFeat === undefined || sourceSystem.isFirstFeat === null) {
          update['system.isFirstFeat'] = false;
          needsUpdate = true;
          totalFirstFeatAdded++;
          
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.9: Adding isFirstFeat field to "${item.name}" (ID: ${item.id})`);
          
          // Update details if not already added
          const existingDetail = updateDetails.find(d => d.id === item.id);
          if (existingDetail) {
            existingDetail.hasFirstFeat = true;
          } else {
            updateDetails.push({
              name: item.name,
              id: item.id,
              effectCount: 0,
              hasFirstFeat: true
            });
          }
        }
        
        if (needsUpdate) {
          update['system._narrativeEffectsValueMigrationVersion'] = '13.0.9';
          updates.push(update);
          totalUpdated++;
        } else {
          totalSkipped++;
        }
      }
      
      return updates;
    });
    
    // Summary message
    const summaryMessage = `Migration 13.0.9 completed - Items updated: ${totalUpdated}, isFirstFeat added: ${totalFirstFeatAdded}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Detailed summary
    if (updateDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== UPDATE DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items updated: ${updateDetails.length}`);
      
      const totalEffects = updateDetails.reduce((sum, d) => sum + d.effectCount, 0);
      const totalWithFirstFeat = updateDetails.filter(d => d.hasFirstFeat).length;
      
      console.log(SYSTEM.LOG.HEAD + `  - Total narrative effects updated: ${totalEffects}`);
      console.log(SYSTEM.LOG.HEAD + `  - Total items with isFirstFeat added: ${totalWithFirstFeat}`);
      console.log(SYSTEM.LOG.HEAD + "======================");
      
      // List all updated items
      console.log(SYSTEM.LOG.HEAD + "Updated items:");
      updateDetails.forEach((detail, index) => {
        const updates = [];
        if (detail.effectCount > 0) updates.push(`${detail.effectCount} effect(s)`);
        if (detail.hasFirstFeat) updates.push('isFirstFeat added');
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (ID: ${detail.id}) - ${updates.join(', ')}`);
      });
    }
    
    // Show user-friendly notification
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? 
        game.i18n.format('SRA2.MIGRATION.13_0_9_INFO', { count: totalUpdated, firstFeatCount: totalFirstFeatAdded }) :
        `Migration 13.0.9: Updated ${totalUpdated} feat(s) - added value field to narrative effects and isFirstFeat field to ${totalFirstFeatAdded} feat(s).`;
      
      ui.notifications?.info(userMessage, {permanent: false});
      
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ All narrative effects now have a value field (default: -1)");
      console.log(SYSTEM.LOG.HEAD + "✓ All feats now have isFirstFeat field (default: false)");
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the migration");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}


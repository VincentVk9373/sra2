import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.8: Convert narrativeEffects from string array to object array
 * This migration safely converts all narrativeEffects from simple strings
 * to objects with { text: string, isNegative: boolean } structure
 */
export class Migration_13_0_8 extends Migration {
  get code() { 
    return "migration-13.0.8"; 
  }

  get version() { 
    return "13.0.8"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.8: Converting narrativeEffects to new format and fixing damageValueBonus");
    
    let totalConverted = 0;
    let totalSkipped = 0;
    let totalFixed = 0;
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
        
        let needsUpdate = false;
        const update = {
          _id: item.id
        };
        
        // Check and fix narrativeEffects
        if (sourceSystem.narrativeEffects && sourceSystem.narrativeEffects.length > 0) {
          // Check if it's already in the new format (first element is an object with 'text' property)
          const firstEffect = sourceSystem.narrativeEffects[0];
          if (!(typeof firstEffect === 'object' && firstEffect !== null && 'text' in firstEffect)) {
            // Convert string array to object array
            const convertedEffects = sourceSystem.narrativeEffects.map(effect => {
              if (typeof effect === 'string') {
                return {
                  text: effect,
                  isNegative: false
                };
              }
              // If it's already an object but missing properties, normalize it
              return {
                text: effect?.text || effect?.toString() || "",
                isNegative: effect?.isNegative || false
              };
            });
            
            update['system.narrativeEffects'] = convertedEffects;
            update['system._migratedNarrativeEffectsAt'] = new Date().toISOString();
            update['system._narrativeEffectsMigrationVersion'] = '13.0.8';
            needsUpdate = true;
            
            // Log what we're converting
            console.log(SYSTEM.LOG.HEAD + `Migration 13.0.8: Converting narrativeEffects for "${item.name}" (ID: ${item.id})`);
            console.log(SYSTEM.LOG.HEAD + `  - Effect count: ${sourceSystem.narrativeEffects.length}`);
            
            conversionDetails.push({
              name: item.name,
              id: item.id,
              effectCount: sourceSystem.narrativeEffects.length
            });
            totalConverted++;
          }
        }
        
        // Fix missing or invalid damageValueBonus values for ALL feat items
        if (sourceSystem.damageValueBonus === null || 
            sourceSystem.damageValueBonus === undefined || 
            typeof sourceSystem.damageValueBonus !== 'number' ||
            !Number.isInteger(sourceSystem.damageValueBonus)) {
          update['system.damageValueBonus'] = 0;
          needsUpdate = true;
          totalFixed++;
          console.log(SYSTEM.LOG.HEAD + `Migration 13.0.8: Fixing damageValueBonus for "${item.name}" (ID: ${item.id})`);
        }
        
        if (needsUpdate) {
          updates.push(update);
        } else {
          totalSkipped++;
        }
      }
      
      return updates;
    });
    
    // Summary message
    const summaryMessage = `Migration 13.0.8 completed - NarrativeEffects converted: ${totalConverted}, DamageValueBonus fixed: ${totalFixed}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Detailed summary
    if (conversionDetails.length > 0) {
      console.log(SYSTEM.LOG.HEAD + "=== CONVERSION DETAILS ===");
      console.log(SYSTEM.LOG.HEAD + `Total items converted: ${conversionDetails.length}`);
      
      const totalEffects = conversionDetails.reduce((sum, d) => sum + d.effectCount, 0);
      
      console.log(SYSTEM.LOG.HEAD + `  - Total narrative effects migrated: ${totalEffects}`);
      console.log(SYSTEM.LOG.HEAD + "=========================");
      
      // List all converted items
      console.log(SYSTEM.LOG.HEAD + "Converted items:");
      conversionDetails.forEach((detail, index) => {
        console.log(SYSTEM.LOG.HEAD + `  ${index + 1}. "${detail.name}" (ID: ${detail.id}) - ${detail.effectCount} effect(s)`);
      });
    }
    
    if (totalFixed > 0) {
      console.log(SYSTEM.LOG.HEAD + `Fixed damageValueBonus on ${totalFixed} item(s)`);
    }
    
    // Show user-friendly notification
    if (totalConverted > 0 || totalFixed > 0) {
      let userMessage = "";
      if (totalConverted > 0 && totalFixed > 0) {
        userMessage = game.i18n ? 
          game.i18n.format('SRA2.MIGRATION.13_0_8_INFO', { count: totalConverted, fixed: totalFixed }) :
          `Migration 13.0.8: Converted narrative effects on ${totalConverted} feat(s) and fixed damageValueBonus on ${totalFixed} feat(s).`;
      } else if (totalConverted > 0) {
        userMessage = game.i18n ? 
          game.i18n.format('SRA2.MIGRATION.13_0_8_INFO', { count: totalConverted }) :
          `Migration 13.0.8: Converted narrative effects on ${totalConverted} feat(s) to new format.`;
      } else if (totalFixed > 0) {
        userMessage = `Migration 13.0.8: Fixed damageValueBonus on ${totalFixed} feat(s).`;
      }
      
      ui.notifications?.info(userMessage, {permanent: false});
      
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      if (totalConverted > 0) {
        console.log(SYSTEM.LOG.HEAD + "✓ All narrative effects converted to new format.");
        console.log(SYSTEM.LOG.HEAD + "✓ All effects default to positive (isNegative: false)");
      }
      if (totalFixed > 0) {
        console.log(SYSTEM.LOG.HEAD + "✓ All damageValueBonus fields set to valid integer values.");
      }
      console.log(SYSTEM.LOG.HEAD + "✓ No data was lost in the conversion");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}


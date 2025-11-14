import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.11: Add linked specializations fields to weapons
 * This migration adds the new linkedAttackSpecialization and linkedDefenseSpecialization fields
 * to all weapon and weapons-spells type feats
 */
export class Migration_13_0_11 extends Migration {
  get code() { 
    return "migration-13.0.11"; 
  }

  get version() { 
    return "13.0.11"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.11: Adding linked specializations fields to weapons");
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    await this.applyItemsUpdates((items) => {
      const updates = [];
      
      for (const item of items) {
        // Only process feat items of type weapon or weapons-spells
        if (item.type !== 'feat') {
          continue;
        }
        
        // Access the system data
        const sourceSystem = item._source?.system || item.system;
        const featType = sourceSystem.featType || 'equipment';
        
        // Only process weapon and weapons-spells types
        if (featType !== 'weapon' && featType !== 'weapons-spells') {
          continue;
        }
        
        // Skip if already migrated
        if (sourceSystem._specializationLinkMigrationVersion === '13.0.11') {
          totalSkipped++;
          continue;
        }
        
        // Check if the fields already exist
        const hasAttackSpec = sourceSystem.hasOwnProperty('linkedAttackSpecialization');
        const hasDefenseSpec = sourceSystem.hasOwnProperty('linkedDefenseSpecialization');
        
        if (hasAttackSpec && hasDefenseSpec) {
          // Fields already exist, just mark as migrated
          const update = {
            _id: item.id,
            'system._specializationLinkMigrationVersion': '13.0.11'
          };
          updates.push(update);
          totalSkipped++;
          continue;
        }
        
        // Add the new fields
        const update = {
          _id: item.id,
          'system.linkedAttackSpecialization': sourceSystem.linkedAttackSpecialization || '',
          'system.linkedDefenseSpecialization': sourceSystem.linkedDefenseSpecialization || '',
          'system._specializationLinkMigrationVersion': '13.0.11'
        };
        
        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.11: Adding specialization link fields to weapon "${item.name}" (ID: ${item.id})`);
        
        updates.push(update);
        totalUpdated++;
      }
      
      return updates;
    });
    
    // Summary message
    const summaryMessage = `Migration 13.0.11 completed - Weapons updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    
    // Show user-friendly notification
    if (totalUpdated > 0) {
      const userMessage = game.i18n ? 
        game.i18n.format('SRA2.MIGRATION.13_0_11_INFO', { count: totalUpdated }) :
        `Migration 13.0.11: Added specialization link fields to ${totalUpdated} weapon(s).`;
      
      ui.notifications?.info(userMessage, {permanent: false});
      
      console.log(SYSTEM.LOG.HEAD + "✓ Migration complete.");
      console.log(SYSTEM.LOG.HEAD + "✓ Weapons can now be linked to attack and defense specializations");
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}


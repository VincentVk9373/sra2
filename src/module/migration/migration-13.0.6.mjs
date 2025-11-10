import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.6: Rollback migration 13.0.5
 * This migration does NOT convert anything - keeps weapons-spells as valid type
 * Only marks that this version has been applied
 */
export class Migration_13_0_6 extends Migration {
  get code() { 
    return "migration-13.0.6"; 
  }

  get version() { 
    return "13.0.6"; 
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Migration 13.0.6: Rollback - keeping old weapons-spells type valid");
    console.log(SYSTEM.LOG.HEAD + "No conversion needed. weapons-spells, weapon, and spell types are all valid.");
    
    // This migration does nothing, just marks the version as applied
    // Old items with "weapons-spells" will continue to work
    // New items can use "weapon" or "spell" as separate types
    
    const message = "Migration 13.0.6: All feat types (weapons-spells, weapon, spell) are now valid. No data conversion performed.";
    console.log(SYSTEM.LOG.HEAD + message);
    
    if (ui.notifications) {
      ui.notifications.info(message, {permanent: false});
    }
  }
}


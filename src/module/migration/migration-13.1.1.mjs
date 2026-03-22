import { Migration } from "./migration.mjs";

/**
 * Migration 13.1.1: Remove vehicle feat type items
 * The "vehicle" feat type is redundant with vehicle/drone actor types
 * and was buggy. This migration deletes all feat items with featType "vehicle".
 */
export class Migration_13_1_1 extends Migration {
  get code() {
    return "migration-13.1.1";
  }

  get version() {
    return "13.1.1";
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.1.1: Removing vehicle feat type items");

    let totalDeleted = 0;

    // Delete vehicle feats from all actors
    for (const actor of game.actors) {
      const vehicleFeats = actor.items.filter(item =>
        item.type === 'feat' && item._source?.system?.featType === 'vehicle'
      );

      if (vehicleFeats.length > 0) {
        const ids = vehicleFeats.map(f => f.id);
        console.log(SYSTEM.LOG.HEAD + `Migration 13.1.1: Deleting ${ids.length} vehicle feat(s) from actor "${actor.name}" (IDs: ${ids.join(', ')})`);
        await actor.deleteEmbeddedDocuments('Item', ids);
        totalDeleted += ids.length;
      }
    }

    // Delete vehicle feats from world items (unowned)
    const worldVehicleFeats = game.items.filter(item =>
      item.type === 'feat' && item._source?.system?.featType === 'vehicle'
    );

    if (worldVehicleFeats.length > 0) {
      const ids = worldVehicleFeats.map(f => f.id);
      console.log(SYSTEM.LOG.HEAD + `Migration 13.1.1: Deleting ${ids.length} unowned vehicle feat(s) from world items`);
      await Item.deleteDocuments(ids);
      totalDeleted += ids.length;
    }

    const summaryMessage = `Migration 13.1.1 completed - Vehicle feats deleted: ${totalDeleted}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);

    if (totalDeleted > 0) {
      ui.notifications?.info(
        `Migration 13.1.1: Deleted ${totalDeleted} vehicle feat(s). Use vehicle/drone actors instead.`,
        { permanent: false }
      );
    } else {
      console.log(SYSTEM.LOG.HEAD + "No vehicle feats found to delete");
    }
  }
}

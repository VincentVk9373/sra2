import { Migration } from "./migration.mjs";

/**
 * Migration 13.1.3: Delete all items with featType "weapons-spells"
 * The "weapons-spells" feat type has been fully removed from the system.
 * This migration deletes any remaining weapons-spells items from actors
 * and from the world item collection.
 */
export class Migration_13_1_3 extends Migration {
  get code() {
    return "migration-13.1.3";
  }

  get version() {
    return "13.1.3";
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.1.3: Deleting all weapons-spells items");

    let totalDeleted = 0;

    // Delete from actors
    for (const actor of game.actors) {
      const toDelete = actor.items
        .filter(item => item.type === 'feat' && (item._source?.system?.featType === 'weapons-spells' || item.system?.featType === 'weapons-spells'))
        .map(item => item.id);

      if (toDelete.length > 0) {
        console.log(SYSTEM.LOG.HEAD + `Migration 13.1.3: Deleting ${toDelete.length} weapons-spells item(s) from actor "${actor.name}"`);
        await actor.deleteEmbeddedDocuments('Item', toDelete);
        totalDeleted += toDelete.length;
      }
    }

    // Delete from world items
    const worldItemIds = game.items
      .filter(item => item.type === 'feat' && (item._source?.system?.featType === 'weapons-spells' || item.system?.featType === 'weapons-spells'))
      .map(item => item.id);

    if (worldItemIds.length > 0) {
      console.log(SYSTEM.LOG.HEAD + `Migration 13.1.3: Deleting ${worldItemIds.length} weapons-spells item(s) from world items`);
      await Item.deleteDocuments(worldItemIds);
      totalDeleted += worldItemIds.length;
    }

    const summaryMessage = `Migration 13.1.3 completed - Deleted ${totalDeleted} weapons-spells item(s)`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);

    if (totalDeleted > 0) {
      ui.notifications?.info(
        `Migration 13.1.3: Deleted ${totalDeleted} obsolete "weapons-spells" item(s).`,
        { permanent: false }
      );
    }
  }
}

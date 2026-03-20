import { Migration } from "./migration.mjs";

/**
 * Migration 13.0.28: Reset grantsNarration to false on all feat items
 * The grantsNarration checkbox was removed from the UI; narration count
 * is now driven exclusively by narrationActions (0 = no narration).
 */
export class Migration_13_0_28 extends Migration {
  get code() {
    return "migration-13.0.28";
  }

  get version() {
    return "13.0.28";
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.0.28: Resetting grantsNarration to false");

    let totalUpdated = 0;
    let totalSkipped = 0;

    await this.applyItemsUpdates((items) => {
      const updates = [];

      for (const item of items) {
        if (item.type !== 'feat') {
          continue;
        }

        const sourceSystem = item._source?.system || item.system;

        // Skip if already migrated
        if (sourceSystem._grantsNarrationResetVersion === '13.0.28') {
          totalSkipped++;
          continue;
        }

        // Only update items that still have grantsNarration set to true
        if (!sourceSystem.grantsNarration) {
          totalSkipped++;
          continue;
        }

        console.log(SYSTEM.LOG.HEAD + `Migration 13.0.28: Resetting grantsNarration for "${item.name}" (ID: ${item.id})`);

        updates.push({
          _id: item.id,
          'system.grantsNarration': false,
          'system._grantsNarrationResetVersion': '13.0.28',
        });

        totalUpdated++;
      }

      return updates;
    });

    const summaryMessage = `Migration 13.0.28 completed - Items updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);

    if (totalUpdated > 0) {
      ui.notifications?.info(
        `Migration 13.0.28: Reset grantsNarration on ${totalUpdated} feat(s).`,
        { permanent: false }
      );
    } else {
      console.log(SYSTEM.LOG.HEAD + "No items to migrate - all items already up to date");
    }
  }
}

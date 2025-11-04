import { HOOKS } from "../hooks.mjs"

const CURRENT_SYSTEM_VERSION = "currentSystemVersion";

export class Migration {
  get code() { return "sample"; }

  get version() { return "0.0.0"; }

  async migrate() { return () => { } };

  async applyItemsUpdates(computeUpdates = (items) => []) {
    await game.actors.forEach(async (actor) => {
      const actorItemUpdates = computeUpdates(actor.items);
      if (actorItemUpdates.length > 0) {
        const message = game.i18n.format('SRA2.MIGRATION.APPLYING_ACTOR_ITEMS', { name: actor.name });
        console.log(SYSTEM.LOG.HEAD, this.code, message, actorItemUpdates);
        await actor.updateEmbeddedDocuments('Item', actorItemUpdates);
      }
    })

    const itemUpdates = computeUpdates(game.items);
    if (itemUpdates.length > 0) {
      const message = game.i18n.localize('SRA2.MIGRATION.APPLYING_ITEMS');
      console.log(SYSTEM.LOG.HEAD, this.code, message, itemUpdates);
      await Item.updateDocuments(itemUpdates);
    }
  }
}

export class Migrations {
  constructor() {
    // Hooks.once(HOOKS.MIGRATIONS, declareMigrations => declareMigrations(
    //   /* add system migrations here, can declared anywhere */
    // ))

    game.settings.register(SYSTEM.id, CURRENT_SYSTEM_VERSION, {
      name: "SRA2.MIGRATION.SETTING_NAME",
      scope: "world",
      config: false,
      type: String,
      default: "0.0.0"
    })
  }

  migrate() {
    const currentVersion = game.settings.get(SYSTEM.id, CURRENT_SYSTEM_VERSION)
    if (foundry.utils.isNewerVersion(game.system.version, currentVersion)) {
      //if (true) {
      let migrations = []
      Hooks.callAll(HOOKS.MIGRATIONS, (...list) =>
        migrations = migrations.concat(list.filter(m => foundry.utils.isNewerVersion(m.version, currentVersion)))
      )
      Hooks.off(HOOKS.MIGRATIONS, () => { })

      if (migrations.length > 0) {
        migrations.sort((a, b) => foundry.utils.isNewerVersion(a.version, b.version) ? 1 : foundry.utils.isNewerVersion(b.version, a.version) ? -1 : 0)
        migrations.forEach(async m => {
          const message = game.i18n.format('SRA2.MIGRATION.EXECUTING', { code: m.code, currentVersion: currentVersion, targetVersion: m.version });
          this.$notify(message);
          await m.migrate()
        })
        const message = game.i18n.format('SRA2.MIGRATION.DONE', { version: game.system.version });
        this.$notify(message)
      }
      else {
        const message = game.i18n.format('SRA2.MIGRATION.NOT_NEEDED', { version: game.system.version });
        console.log(SYSTEM.LOG.HEAD + message)
      }
      game.settings.set(SYSTEM.id, CURRENT_SYSTEM_VERSION, game.system.version)
    }
    else {
      const message = game.i18n.localize('SRA2.MIGRATION.VERSION_UNCHANGED');
      console.log(SYSTEM.LOG.HEAD + message)
    }
  }


  $notify(message) {
    ui.notifications.info(message);
    console.log(SYSTEM.LOG.HEAD + message);
  }
}

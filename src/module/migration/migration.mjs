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
        console.log(SYSTEM.LOG.HEAD, this.code, `Applying updates on actor ${actor.name} items`, actorItemUpdates);
        await actor.updateEmbeddedDocuments('Item', actorItemUpdates);
      }
    })

    const itemUpdates = computeUpdates(game.items);
    if (itemUpdates.length > 0) {
      console.log(SYSTEM.LOG.HEAD, this.code, 'Applying updates on items', itemUpdates);
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
      name: "Current System Version",
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
          this.$notify(`Executing migration ${m.code}: version ${currentVersion} is lower than ${m.version}`);
          await m.migrate()
        })
        this.$notify(`Migrations done, system version will change to ${game.system.version}`)
      }
      else {
        console.log(SYSTEM.LOG.HEAD + `No migration needeed, system version will change to ${game.system.version}`)
      }
      game.settings.set(SYSTEM.id, CURRENT_SYSTEM_VERSION, game.system.version)
    }
    else {
      console.log(SYSTEM.LOG.HEAD + `System version not changed`)
    }
  }


  $notify(message) {
    ui.notifications.info(message);
    console.log(SYSTEM.LOG.HEAD + message);
  }
}

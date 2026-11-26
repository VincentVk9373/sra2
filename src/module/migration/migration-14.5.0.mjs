import { Migration } from "./migration.mjs";

// Feat names (all languages, normalized) that carry an astral ability
const DUAL_NATURE_NAMES = ['Nature duale', 'Dual Nature', 'Duale Natur', 'Двойственная природа'];
const ASTRAL_BEING_NAMES = [
  'Matérialisation', 'Materialization', 'Materialisierung', 'Материализация',
  'Forme astrale', 'Astral Form', 'Astralgestalt', 'Астральная форма',
];

// Feat types that can carry these abilities
const FEAT_TYPES = ['trait', 'power'];

/**
 * Migration 14.5.0: astral abilities of existing creatures.
 *
 * The astral plane (14.5.0) reads two new checkboxes on feats: "dual nature"
 * (present on both planes, always perceives the astral) and "astral being"
 * (spirit or elemental: materialised or in astral form). Creatures already
 * in a world have these abilities as plain traits or powers, recognised here
 * by their name:
 * - a trait/power named "Dual Nature" gets the dual nature checkbox;
 * - a trait/power named "Materialization" (spirits) or "Astral Form"
 *   (watchers) gets the astral being checkbox.
 * World actors, unlinked tokens placed on scenes, world items and world
 * compendiums are updated. System and module compendiums are not touched.
 */
export class Migration_14_5_0 extends Migration {
  get code() {
    return "migration-14.5.0";
  }

  get version() {
    return "14.5.0";
  }

  _normalize(text) {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  _matches(name, names) {
    const normalized = this._normalize(name);
    return names.some(n => this._normalize(n) === normalized);
  }

  /** Feat updates: check the astral ability matching the feat's name */
  _computeFeatUpdates(items) {
    const updates = [];
    for (const item of items) {
      if (item.type !== 'feat' || !FEAT_TYPES.includes(item.system?.featType)) continue;
      const update = {};
      if (!item.system.dualNature && this._matches(item.name, DUAL_NATURE_NAMES)) update['system.dualNature'] = true;
      if (!item.system.astralBeing && this._matches(item.name, ASTRAL_BEING_NAMES)) update['system.astralBeing'] = true;
      if (Object.keys(update).length > 0) updates.push({ _id: item.id, ...update });
    }
    return updates;
  }

  async _migrateEmbedded(owner, label) {
    const updates = this._computeFeatUpdates(owner.items);
    if (updates.length > 0) {
      await owner.updateEmbeddedDocuments('Item', updates);
      console.log(`SRA2 | Migration 14.5.0: ${updates.length} feat(s) flagged on ${label}`);
    }
    return updates.length;
  }

  async migrate() {
    console.log("SRA2 | Starting migration 14.5.0: astral abilities of dual-natured and astral beings");
    let total = 0;

    // World actors
    for (const actor of game.actors) {
      total += await this._migrateEmbedded(actor, `actor "${actor.name}"`);
    }

    // Unlinked tokens placed on scenes: the feats their token overrides are
    // their own copies (the others follow the actor migrated above)
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        if (token.actorLink) continue;
        try {
          if (token.actor) total += await this._migrateEmbedded(token.actor, `token "${token.name}" (scene "${scene.name}")`);
        } catch (e) {
          console.warn(`SRA2 | Migration 14.5.0: failed on token "${token.name}" (scene "${scene.name}")`, e);
        }
      }
    }

    // World items
    const worldUpdates = this._computeFeatUpdates(game.items);
    if (worldUpdates.length > 0) await Item.updateDocuments(worldUpdates);
    total += worldUpdates.length;

    // World compendiums (system and module compendiums are left to their package)
    for (const pack of game.packs) {
      if (pack.metadata?.packageType !== 'world') continue;
      if (pack.documentName !== 'Item' && pack.documentName !== 'Actor') continue;
      const wasLocked = pack.locked;
      if (wasLocked) await pack.configure({ locked: false });
      try {
        const documents = await pack.getDocuments();
        if (pack.documentName === 'Actor') {
          for (const actor of documents) {
            total += await this._migrateEmbedded(actor, `compendium actor "${actor.name}"`);
          }
        } else {
          const packUpdates = this._computeFeatUpdates(documents);
          if (packUpdates.length > 0) await Item.updateDocuments(packUpdates, { pack: pack.collection });
          total += packUpdates.length;
        }
      } catch (e) {
        console.warn(`SRA2 | Migration 14.5.0: failed on pack "${pack.title}"`, e);
      } finally {
        if (wasLocked) await pack.configure({ locked: true });
      }
    }

    console.log(`SRA2 | Migration 14.5.0 complete — ${total} feat(s) flagged`);
  }
}

import { Migration } from "./migration.mjs";

/**
 * Migration 13.4.5: Convert remaining rrTarget display names to slugs.
 *
 * Migration 13.4.4 used hardcoded name maps. This migration dynamically
 * builds the name→slug map from compendium data, catching any entries
 * that were missed or created after 13.4.4 ran.
 */
export class Migration_13_4_5 extends Migration {
  get code() {
    return "migration-13.4.5";
  }

  get version() {
    return "13.4.5";
  }

  /**
   * Normalize text: lowercase, remove accents, trim
   */
  _normalize(text) {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  /**
   * Build name→slug maps dynamically from compendium packs (all languages).
   */
  async _buildNameToSlugMaps() {
    const skillNameToSlug = {};
    const specNameToSlug = {};

    // From world items
    if (game.items) {
      for (const item of game.items) {
        if (!item.system?.slug) continue;
        const normalized = this._normalize(item.name);
        if (item.type === 'skill') {
          skillNameToSlug[normalized] = item.system.slug;
        } else if (item.type === 'specialization') {
          specNameToSlug[normalized] = item.system.slug;
        }
      }
    }

    // From ALL compendium packs (covers EN + FR + any other language)
    for (const pack of game.packs) {
      if (pack.documentName !== 'Item') continue;
      try {
        const index = await pack.getIndex({ fields: ['system.slug'] });
        for (const entry of index) {
          if (!entry.system?.slug) continue;
          const normalized = this._normalize(entry.name);
          if (entry.type === 'skill') {
            skillNameToSlug[normalized] = entry.system.slug;
          } else if (entry.type === 'specialization') {
            specNameToSlug[normalized] = entry.system.slug;
          }
        }
      } catch (e) {
        // Skip packs that fail to load
      }
    }

    return { skillNameToSlug, specNameToSlug };
  }

  /**
   * Check if a value is already a valid slug
   */
  _isSlug(value, type) {
    if (!value) return true;
    if (type === 'specialization') return value.startsWith('spec_');
    // Skill slugs: lowercase, no accents, only [a-z0-9-]
    return /^[a-z0-9-]+$/.test(value);
  }

  /**
   * Compute updates for feat items
   */
  _computeUpdates(items, skillNameToSlug, specNameToSlug) {
    const updates = [];
    for (const item of items) {
      if (item.type !== 'feat') continue;
      const rrList = item.system?.rrList || [];
      if (rrList.length === 0) continue;

      let rrChanged = false;
      const newRRList = rrList.map(rr => {
        const newRR = { ...rr };
        if (!rr.rrTarget) return newRR;

        if (rr.rrType === 'specialization' && !this._isSlug(rr.rrTarget, 'specialization')) {
          const normalized = this._normalize(rr.rrTarget);
          const slug = specNameToSlug[normalized];
          if (slug) {
            newRR.rrTarget = slug;
            rrChanged = true;
          }
        } else if (rr.rrType === 'skill' && !this._isSlug(rr.rrTarget, 'skill')) {
          const normalized = this._normalize(rr.rrTarget);
          const slug = skillNameToSlug[normalized];
          if (slug) {
            newRR.rrTarget = slug;
            rrChanged = true;
          }
        }
        return newRR;
      });

      if (rrChanged) {
        updates.push({
          _id: item.id,
          'system.rrList': newRRList
        });
      }
    }
    return updates;
  }

  async migrate() {
    const SYSTEM_LOG = "SRA2 | ";
    console.log(SYSTEM_LOG + "Starting migration 13.4.5: Convert remaining rrTarget display names to slugs (dynamic)");

    const { skillNameToSlug, specNameToSlug } = await this._buildNameToSlugMaps();
    console.log(SYSTEM_LOG + `Migration 13.4.5: Built maps — ${Object.keys(skillNameToSlug).length} skill names, ${Object.keys(specNameToSlug).length} spec names`);

    let totalFixed = 0;

    // Fix actors
    for (const actor of game.actors) {
      const updates = this._computeUpdates(actor.items, skillNameToSlug, specNameToSlug);
      if (updates.length > 0) {
        console.log(SYSTEM_LOG + `Migration 13.4.5: Updating ${updates.length} feat(s) on actor "${actor.name}"`);
        await actor.updateEmbeddedDocuments('Item', updates);
        totalFixed += updates.length;
      }
    }

    // Fix world items
    const worldUpdates = this._computeUpdates(game.items, skillNameToSlug, specNameToSlug);
    if (worldUpdates.length > 0) {
      console.log(SYSTEM_LOG + `Migration 13.4.5: Updating ${worldUpdates.length} world item(s)`);
      await Item.updateDocuments(worldUpdates);
      totalFixed += worldUpdates.length;
    }

    // Fix compendium packs
    for (const pack of game.packs) {
      const wasLocked = pack.locked;
      if (wasLocked) await pack.configure({ locked: false });
      try {
        if (pack.documentName === 'Item') {
          const documents = await pack.getDocuments();
          const updates = this._computeUpdates(documents, skillNameToSlug, specNameToSlug);
          if (updates.length > 0) {
            console.log(SYSTEM_LOG + `Migration 13.4.5: Updating ${updates.length} item(s) in pack "${pack.title}"`);
            for (const u of updates) {
              const doc = documents.find(d => d.id === u._id);
              if (doc) await doc.update(u);
            }
            totalFixed += updates.length;
          }
        } else if (pack.documentName === 'Actor') {
          const actors = await pack.getDocuments();
          for (const actor of actors) {
            const updates = this._computeUpdates(actor.items, skillNameToSlug, specNameToSlug);
            if (updates.length > 0) {
              console.log(SYSTEM_LOG + `Migration 13.4.5: Updating ${updates.length} feat(s) on compendium actor "${actor.name}"`);
              await actor.updateEmbeddedDocuments('Item', updates);
              totalFixed += updates.length;
            }
          }
        }
      } finally {
        if (wasLocked) await pack.configure({ locked: true });
      }
    }

    console.log(SYSTEM_LOG + `Migration 13.4.5 complete — fixed ${totalFixed} feat(s)`);
  }
}

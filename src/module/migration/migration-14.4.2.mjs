import { Migration } from "./migration.mjs";

const SHOTGUNS_SLUG = 'spec_shotguns';
const RIFLES_SLUG = 'spec_rifles';

// Display names the Shotguns specialization had (all languages), normalized
const SHOTGUNS_NAMES = ['spe : shotguns', 'spe: shotguns', 'spec : shotguns', 'spec: shotguns', 'spez: schrotflinten', 'spez : schrotflinten'];

// Fallback Rifles names if the compendium can't be read
const RIFLES_NAMES = { fr: 'Spé : Fusils', en: 'Spec: Rifles', de: 'Spez: Gewehre' };

/**
 * Migration 14.4.2: remove the "Shotguns" specialization.
 *
 * It does not exist in the rules: shotguns fall under the Rifles
 * specialization. The compendium entry is gone and the shotguns weapon type
 * now links to spec_rifles. For existing data:
 * - an actor owning Shotguns but not Rifles gets its Shotguns item turned into
 *   Rifles (same item, nothing lost); if it already has Rifles, the duplicate
 *   Shotguns item is deleted. Same rule for world items.
 * - RR entries and weapon/defense specialization links targeting Shotguns
 *   (by slug or by name) now target Rifles.
 * System compendiums are rebuilt at release and are not touched.
 */
export class Migration_14_4_2 extends Migration {
  get code() {
    return "migration-14.4.2";
  }

  get version() {
    return "14.4.2";
  }

  _normalize(text) {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  _isShotgunsRef(value) {
    if (!value) return false;
    return value === SHOTGUNS_SLUG || SHOTGUNS_NAMES.includes(this._normalize(value));
  }

  _isShotgunsSpec(item) {
    return item.type === 'specialization' && (item.system?.slug === SHOTGUNS_SLUG || this._isShotgunsRef(item.name));
  }

  _isRiflesSpec(item) {
    return item.type === 'specialization' && item.system?.slug === RIFLES_SLUG;
  }

  /** Rifles specialization data in the active language, from the system compendium */
  async _getRiflesData() {
    const lang = game.i18n?.lang || 'en';
    const packs = [...game.packs].filter(p => p.documentName === 'Item' && p.metadata?.packageType === 'system');
    packs.sort((a, b) => (b.collection.endsWith(`-${lang}`) ? 1 : 0) - (a.collection.endsWith(`-${lang}`) ? 1 : 0));
    for (const pack of packs) {
      try {
        const index = await pack.getIndex({ fields: ['system.slug'] });
        const entry = index.find(e => e.type === 'specialization' && e.system?.slug === RIFLES_SLUG);
        if (!entry) continue;
        const doc = await pack.getDocument(entry._id);
        if (doc) {
          return {
            name: doc.name,
            'system.slug': RIFLES_SLUG,
            'system.linkedSkill': doc.system.linkedSkill || 'ranged-weapons',
            'system.linkedAttribute': doc.system.linkedAttribute || 'agility',
            'system.description': doc.system.description || '',
            'system.reference': doc.system.reference || '',
          };
        }
      } catch (e) {
        // Try the next pack
      }
    }
    return {
      name: RIFLES_NAMES[lang] || RIFLES_NAMES.en,
      'system.slug': RIFLES_SLUG,
      'system.linkedSkill': 'ranged-weapons',
      'system.linkedAttribute': 'agility',
    };
  }

  /** Feat updates: RR targets and weapon/defense specialization links */
  _computeFeatUpdates(items) {
    const updates = [];
    for (const item of items) {
      if (item.type !== 'feat') continue;
      const update = {};

      const rrList = item.system?.rrList || [];
      if (rrList.some(rr => rr.rrType === 'specialization' && this._isShotgunsRef(rr.rrTarget))) {
        update['system.rrList'] = rrList.map(rr =>
          rr.rrType === 'specialization' && this._isShotgunsRef(rr.rrTarget) ? { ...rr, rrTarget: RIFLES_SLUG } : rr
        );
      }
      for (const field of ['linkedAttackSpecialization', 'linkedDefenseSpecialization']) {
        if (this._isShotgunsRef(item.system?.[field])) update[`system.${field}`] = RIFLES_SLUG;
      }

      if (Object.keys(update).length > 0) updates.push({ _id: item.id, ...update });
    }
    return updates;
  }

  /**
   * Specialization items: convert Shotguns to Rifles, or delete it when a
   * Rifles specialization is already present in the same collection.
   */
  _computeSpecChanges(items, riflesData) {
    const shotguns = items.filter(i => this._isShotgunsSpec(i));
    if (shotguns.length === 0) return { updates: [], deletions: [] };

    const hasRifles = items.some(i => this._isRiflesSpec(i));
    if (hasRifles) return { updates: [], deletions: shotguns.map(i => i.id) };

    // Keep the first one as Rifles, drop any extra Shotguns duplicates
    const [keep, ...extra] = shotguns;
    return { updates: [{ _id: keep.id, ...riflesData }], deletions: extra.map(i => i.id) };
  }

  async _migrateEmbedded(owner, riflesData, label) {
    const featUpdates = this._computeFeatUpdates(owner.items);
    const { updates: specUpdates, deletions } = this._computeSpecChanges([...owner.items], riflesData);
    const updates = [...featUpdates, ...specUpdates];
    if (updates.length > 0) await owner.updateEmbeddedDocuments('Item', updates);
    if (deletions.length > 0) await owner.deleteEmbeddedDocuments('Item', deletions);
    const count = updates.length + deletions.length;
    if (count > 0) console.log(`SRA2 | Migration 14.4.2: ${count} item(s) fixed on ${label}`);
    return count;
  }

  async migrate() {
    console.log("SRA2 | Starting migration 14.4.2: Shotguns specialization merged into Rifles");
    const riflesData = await this._getRiflesData();
    let total = 0;

    // World actors
    for (const actor of game.actors) {
      total += await this._migrateEmbedded(actor, riflesData, `actor "${actor.name}"`);
    }

    // World items
    const featUpdates = this._computeFeatUpdates(game.items);
    const { updates: specUpdates, deletions } = this._computeSpecChanges([...game.items], riflesData);
    const worldUpdates = [...featUpdates, ...specUpdates];
    if (worldUpdates.length > 0) await Item.updateDocuments(worldUpdates);
    if (deletions.length > 0) await Item.deleteDocuments(deletions);
    total += worldUpdates.length + deletions.length;

    // World compendiums (system compendiums are rebuilt at release)
    for (const pack of game.packs) {
      if (pack.metadata?.packageType !== 'world') continue;
      if (pack.documentName !== 'Item' && pack.documentName !== 'Actor') continue;
      const wasLocked = pack.locked;
      if (wasLocked) await pack.configure({ locked: false });
      try {
        const documents = await pack.getDocuments();
        if (pack.documentName === 'Actor') {
          for (const actor of documents) {
            total += await this._migrateEmbedded(actor, riflesData, `compendium actor "${actor.name}"`);
          }
        } else {
          const packFeatUpdates = this._computeFeatUpdates(documents);
          const changes = this._computeSpecChanges(documents, riflesData);
          const packUpdates = [...packFeatUpdates, ...changes.updates];
          if (packUpdates.length > 0) await Item.updateDocuments(packUpdates, { pack: pack.collection });
          if (changes.deletions.length > 0) await Item.deleteDocuments(changes.deletions, { pack: pack.collection });
          total += packUpdates.length + changes.deletions.length;
        }
      } catch (e) {
        console.warn(`SRA2 | Migration 14.4.2: failed on pack "${pack.title}"`, e);
      } finally {
        if (wasLocked) await pack.configure({ locked: true });
      }
    }

    console.log(`SRA2 | Migration 14.4.2 complete — ${total} item(s) fixed`);
  }
}

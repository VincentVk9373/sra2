import { Migration } from "./migration.mjs";

/**
 * Migration 13.2.4: Add slugs to skills and convert linkedSkill to slugs
 *
 * This migration:
 * 1. Sets the `slug` field on all existing skill items based on their name
 * 2. Converts `linkedSkill` on specializations from localized names to slugs
 * 3. Fixes previously incorrect linkedSkill values (Corps à corps, Arme à distance, Hacking)
 */
export class Migration_13_2_4 extends Migration {
  get code() {
    return "migration-13.2.4";
  }

  get version() {
    return "13.2.4";
  }

  /**
   * Map of normalized specialization names (FR, EN) to canonical slugs (spec_xxx based on EN name)
   */
  get _specNameToSlug() {
    return {
      // EN
      'spec: academic': 'spec_academic',
      'spec: air spirits': 'spec_air-spirits',
      'spec: animal training': 'spec_animal-training',
      'spec: aquatic drones': 'spec_aquatic-drones',
      'spec: aquatic vehicles': 'spec_aquatic-vehicles',
      'spec: astral combat': 'spec_astral-combat',
      'spec: astral perception': 'spec_astral-perception',
      'spec: astral stealth': 'spec_astral-stealth',
      'spec: backdoor': 'spec_backdoor',
      'spec: banishing': 'spec_banishing',
      'spec: beast spirits': 'spec_beast-spirits',
      'spec: bikes': 'spec_bikes',
      'spec: blades': 'spec_blades',
      'spec: bluff': 'spec_bluff',
      'spec: blunt weapons': 'spec_blunt-weapons',
      'spec: brute force': 'spec_brute-force',
      'spec: cars': 'spec_cars',
      'spec: climbing': 'spec_climbing',
      'spec: combat spells': 'spec_combat-spells',
      'spec: compilation': 'spec_compilation',
      'spec: complex forms': 'spec_complex-forms',
      'spec: composure': 'spec_composure',
      'spec: corporate': 'spec_corporate',
      'spec: counterspelling': 'spec_counterspelling',
      'spec: c&r drones': 'spec_cr-drones',
      'spec: criminal': 'spec_criminal',
      'spec: c&r mechanical devices': 'spec_cr-mechanical-devices',
      'spec: c&r vehicles': 'spec_cr-vehicles',
      'spec: cybercombat': 'spec_cybercombat',
      'spec: cybernetics': 'spec_cybernetics',
      'spec: decompilation': 'spec_decompilation',
      'spec: defense': 'spec_defense',
      'spec: detection spells': 'spec_detection-spells',
      'spec: earth spirits': 'spec_earth-spirits',
      'spec: electronic warfare': 'spec_electronic-warfare',
      'spec: engineering': 'spec_engineering',
      'spec: etiquette': 'spec_etiquette',
      'spec: explosives': 'spec_explosives',
      'spec: fangs': 'spec_fangs',
      'spec: fire spirits': 'spec_fire-spirits',
      'spec: first aid': 'spec_first-aid',
      'spec: flying drones': 'spec_flying-drones',
      'spec: flying vehicles': 'spec_flying-vehicles',
      'spec: government': 'spec_government',
      'spec: grenade launchers': 'spec_grenade-launchers',
      'spec: ground drones': 'spec_ground-drones',
      'spec: health spells': 'spec_health-spells',
      'spec: heavy weapons': 'spec_heavy-weapons',
      'spec: illusion spells': 'spec_illusion-spells',
      'spec: impersonation': 'spec_impersonation',
      'spec: intimidation': 'spec_intimidation',
      'spec: kin spirits': 'spec_kin-spirits',
      'spec: la rue': 'spec_la-rue',
      'spec: lockpicking': 'spec_lockpicking',
      'spec: magic': 'spec_magic',
      'spec: manipulation spells': 'spec_manipulation-spells',
      'spec: matrix': 'spec_matrix',
      'spec: matrix perception': 'spec_matrix-perception',
      'spec: matrix protection': 'spec_matrix-protection',
      'spec: matrix search': 'spec_matrix-search',
      'spec: matrix stealth': 'spec_matrix-stealth',
      'spec: media': 'spec_media',
      'spec: medical': 'spec_medical',
      'spec: monofilament': 'spec_monofilament',
      'spec: mounted weapons': 'spec_mounted-weapons',
      'spec: navigation': 'spec_navigation',
      'spec: negotiation': 'spec_negotiation',
      'spec: parkour': 'spec_parkour',
      'spec: personal devices': 'spec_personal-devices',
      'spec: personal electronics': 'spec_personal-electronics',
      'spec: physical': 'spec_physical',
      'spec: physical perception': 'spec_physical-perception',
      'spec: physical stealth': 'spec_physical-stealth',
      'spec: pistols': 'spec_pistols',
      'spec: plant spirits': 'spec_plant-spirits',
      'spec: ranged defense': 'spec_ranged-defense',
      'spec: remote controlled weapons': 'spec_remote-controlled-weapons',
      'spec: rifles': 'spec_rifles',
      'spec: running': 'spec_running',
      'spec: shotguns': 'spec_shotguns',
      'spec: smgs': 'spec_smgs',
      'spec: social perception': 'spec_social-perception',
      'spec: stealth': 'spec_stealth',
      'spec: swimming': 'spec_swimming',
      'spec: thrown weapons': 'spec_thrown-weapons',
      'spec: trucks': 'spec_trucks',
      'spec: unarmed': 'spec_unarmed',
      'spec: water spirits': 'spec_water-spirits',
      'spec: wilderness survival': 'spec_wilderness-survival',
      // FR
      'spe : appareils personnels': 'spec_personal-devices',
      'spe : armes contondantes': 'spec_blunt-weapons',
      'spe : armes controlees a distance': 'spec_remote-controlled-weapons',
      'spe : armes de jet': 'spec_thrown-weapons',
      'spe : armes de trait': 'spec_heavy-weapons',
      'spe : armes lourdes': 'spec_heavy-weapons',
      'spe : armes montees': 'spec_mounted-weapons',
      'spe : backdoor': 'spec_backdoor',
      'spe : bannissement': 'spec_banishing',
      'spe : bluff': 'spec_bluff',
      'spe : camions': 'spec_trucks',
      'spe : combat astral': 'spec_astral-combat',
      'spe : compilation': 'spec_compilation',
      'spe : contresort': 'spec_counterspelling',
      'spe : corporatiste': 'spec_corporate',
      'spe : course': 'spec_running',
      'spe : c&r appareils electroniques': 'spec_personal-electronics',
      'spe : c&r drones': 'spec_cr-drones',
      'spe : c&r engins mecaniques': 'spec_cr-mechanical-devices',
      'spe : c&r implants cybernetiques': 'spec_cybernetics',
      'spe : c&r vehicules': 'spec_cr-vehicles',
      'spe : criminel': 'spec_criminal',
      'spe : crochetage': 'spec_lockpicking',
      'spe : crocs': 'spec_fangs',
      'spe : cybercombat': 'spec_cybercombat',
      'spe : decompilation': 'spec_decompilation',
      'spe : defense': 'spec_defense',
      'spe : defense a distance': 'spec_ranged-defense',
      'spe : discretion astrale': 'spec_astral-stealth',
      'spe : discretion matricielle': 'spec_matrix-stealth',
      'spe : discretion physique': 'spec_physical-stealth',
      'spe : dressage': 'spec_animal-training',
      'spe : drones aquatiques': 'spec_aquatic-drones',
      'spe : drones terrestres': 'spec_ground-drones',
      'spe : drones volants': 'spec_flying-drones',
      'spe : escalade': 'spec_climbing',
      'spe : escamotage': 'spec_stealth',
      'spe : esprit des aines': 'spec_kin-spirits',
      'spe : esprits de l\'air': 'spec_air-spirits',
      'spe : esprits de la terre': 'spec_earth-spirits',
      'spe : esprits de l\'eau': 'spec_water-spirits',
      'spe : esprits des betes': 'spec_beast-spirits',
      'spe : esprits des plantes': 'spec_plant-spirits',
      'spe : esprits du feu': 'spec_fire-spirits',
      'spe : etiquette': 'spec_etiquette',
      'spe : explosifs': 'spec_explosives',
      'spe : force brute': 'spec_brute-force',
      'spe : formes complexes': 'spec_complex-forms',
      'spe : fusils': 'spec_rifles',
      'spe : gouvernemental': 'spec_government',
      'spe : guerre electronique': 'spec_electronic-warfare',
      'spe : imposture': 'spec_impersonation',
      'spe : ingenierie': 'spec_engineering',
      'spe : intimidation': 'spec_intimidation',
      'spe : la rue': 'spec_la-rue',
      'spe : lames': 'spec_blades',
      'spe : lance-grenades': 'spec_grenade-launchers',
      'spe : magique': 'spec_magic',
      'spe : mains nues': 'spec_unarmed',
      'spe : matriciel': 'spec_matrix',
      'spe : matricielle': 'spec_matrix',
      'spe : mediatique': 'spec_media',
      'spe : medical': 'spec_medical',
      'spe : mitraillettes': 'spec_smgs',
      'spe : monofilament': 'spec_monofilament',
      'spe : motos': 'spec_bikes',
      'spe : natation': 'spec_swimming',
      'spe : negociation': 'spec_negotiation',
      'spe : orientation': 'spec_navigation',
      'spe : parkour': 'spec_parkour',
      'spe : perception astrale': 'spec_astral-perception',
      'spe : perception matricielle': 'spec_matrix-perception',
      'spe : perception physique': 'spec_physical-perception',
      'spe : perception sociale': 'spec_social-perception',
      'spe : physique': 'spec_physical',
      'spe : pistolets': 'spec_pistols',
      'spe : premiers soins': 'spec_first-aid',
      'spe : protection matricielle': 'spec_matrix-protection',
      'spe : recherche matricielle': 'spec_matrix-search',
      'spe : sang-froid': 'spec_composure',
      'spe : shotguns': 'spec_shotguns',
      'spe : sorts de combat': 'spec_combat-spells',
      'spe : sorts de detection': 'spec_detection-spells',
      'spe : sorts de manipulation': 'spec_manipulation-spells',
      'spe : sorts de sante': 'spec_health-spells',
      'spe : sorts d\'illusion': 'spec_illusion-spells',
      'spe : survie en milieu naturel': 'spec_wilderness-survival',
      'spe : universitaire': 'spec_academic',
      'spe : vehicules aquatiques': 'spec_aquatic-vehicles',
      'spe : vehicules volants': 'spec_flying-vehicles',
      'spe : voitures': 'spec_cars',
    };
  }

  /**
   * Normalize text: lowercase, remove accents
   */
  _normalize(text) {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Map of normalized skill names (FR, EN, and old wrong names) to canonical slugs
   */
  get _nameToSlug() {
    return {
      // FR
      'combat rapproche': 'close-combat',
      'armes a distance': 'ranged-weapons',
      'athletisme': 'athletics',
      'furtivite': 'stealth',
      'piratage': 'cracking',
      'ingenierie': 'engineering',
      'electronique': 'electronics',
      'pilotage': 'piloting',
      'sorcellerie': 'sorcery',
      'conjuration': 'conjuration',
      'technomancie': 'technomancer',
      'influence': 'influence',
      'perception': 'perception',
      'survie': 'survival',
      'reseau': 'networking',
      'combat astral': 'astral-combat',
      // EN
      'close combat': 'close-combat',
      'ranged weapons': 'ranged-weapons',
      'athletics': 'athletics',
      'stealth': 'stealth',
      'cracking': 'cracking',
      'engineering': 'engineering',
      'electronics': 'electronics',
      'piloting': 'piloting',
      'sorcery': 'sorcery',
      'technomancer': 'technomancer',
      'survival': 'survival',
      'networking': 'networking',
      'astral combat': 'astral-combat',
      // Old wrong names
      'corps a corps': 'close-combat',
      'arme a distance': 'ranged-weapons',
      'hacking': 'cracking',
    };
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.2.4: Add slugs to skills and convert linkedSkill to slugs");

    const nameToSlug = this._nameToSlug;
    let totalSkills = 0;
    let totalSpecs = 0;
    let totalNarrationFixes = 0;

    // Fix actors
    for (const actor of game.actors) {
      const updates = this._computeUpdates(actor.items, nameToSlug);
      if (updates.length > 0) {
        console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Updating ${updates.length} item(s) on actor "${actor.name}"`);
        await actor.updateEmbeddedDocuments('Item', updates);
        for (const u of updates) {
          if (u['system.slug']) totalSkills++;
          if (u['system.linkedSkill']) totalSpecs++;
        }
      }
    }

    // Fix world items
    const worldUpdates = this._computeUpdates(game.items, nameToSlug);
    if (worldUpdates.length > 0) {
      console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Updating ${worldUpdates.length} item(s) in world items`);
      await Item.updateDocuments(worldUpdates);
      for (const u of worldUpdates) {
        if (u['system.slug']) totalSkills++;
        if (u['system.linkedSkill']) totalSpecs++;
      }
    }

    // Fix compendium packs
    for (const pack of game.packs) {
      const wasLocked = pack.locked;
      if (wasLocked) await pack.configure({ locked: false });
      try {
        if (pack.documentName === 'Item') {
          const documents = await pack.getDocuments();
          const updates = this._computeUpdates(documents, nameToSlug);
          if (updates.length > 0) {
            console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Updating ${updates.length} item(s) in pack "${pack.title}"`);
            for (const u of updates) {
              const doc = documents.find(d => d.id === u._id);
              if (doc) await doc.update(u);
              if (u['system.slug']) totalSkills++;
              if (u['system.linkedSkill']) totalSpecs++;
            }
          }
          // Also fix narrationActions in item compendiums
          const narrationUpdates = this._computeNarrationFixes(documents);
          if (narrationUpdates.length > 0) {
            console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Fixing ${narrationUpdates.length} narrationActions in pack "${pack.title}"`);
            for (const u of narrationUpdates) {
              const doc = documents.find(d => d.id === u._id);
              if (doc) await doc.update(u);
            }
            totalNarrationFixes += narrationUpdates.length;
          }
        } else if (pack.documentName === 'Actor') {
          const actors = await pack.getDocuments();
          for (const actor of actors) {
            const updates = this._computeUpdates(actor.items, nameToSlug);
            if (updates.length > 0) {
              console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Updating ${updates.length} item(s) on compendium actor "${actor.name}"`);
              await actor.updateEmbeddedDocuments('Item', updates);
              for (const u of updates) {
                if (u['system.slug']) totalSkills++;
                if (u['system.linkedSkill']) totalSpecs++;
              }
            }
            // Also fix narrationActions on compendium actors
            const narrationUpdates = this._computeNarrationFixes(actor.items);
            if (narrationUpdates.length > 0) {
              console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Fixing ${narrationUpdates.length} narrationActions on compendium actor "${actor.name}"`);
              await actor.updateEmbeddedDocuments('Item', narrationUpdates);
              totalNarrationFixes += narrationUpdates.length;
            }
          }
        }
      } finally {
        if (wasLocked) await pack.configure({ locked: true });
      }
    }

    // Fix narrationActions: reset to 0 on feats that inherited the old initial: 1 default
    // but never intentionally enabled narration (grantsNarration is false)
    for (const actor of game.actors) {
      const narrationUpdates = this._computeNarrationFixes(actor.items);
      if (narrationUpdates.length > 0) {
        console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Fixing ${narrationUpdates.length} narrationActions on actor "${actor.name}"`);
        await actor.updateEmbeddedDocuments('Item', narrationUpdates);
        totalNarrationFixes += narrationUpdates.length;
      }
    }

    const worldNarrationUpdates = this._computeNarrationFixes(game.items);
    if (worldNarrationUpdates.length > 0) {
      console.log(SYSTEM.LOG.HEAD + `Migration 13.2.4: Fixing ${worldNarrationUpdates.length} narrationActions in world items`);
      await Item.updateDocuments(worldNarrationUpdates);
      totalNarrationFixes += worldNarrationUpdates.length;
    }

    const summaryMessage = `Migration 13.2.4 completed — ${totalSkills} slug(s), ${totalSpecs} linkedSkill(s), ${totalNarrationFixes} narrationActions fix(es)`;
    console.log(SYSTEM.LOG.HEAD + summaryMessage);
    ui.notifications?.info(summaryMessage, { permanent: false });
  }

  /**
   * Fix feats that have narrationActions > 0 but grantsNarration is false.
   * These inherited the old initial: 1 default and were never intentionally configured.
   */
  _computeNarrationFixes(items) {
    const updates = [];

    for (const item of items) {
      if (item.type !== 'feat') continue;

      const src = item._source?.system ?? item.system;
      const narrationActions = src?.narrationActions ?? 0;
      const grantsNarration = src?.grantsNarration ?? false;

      // Only fix if narrationActions > 0 but grantsNarration was never enabled
      if (narrationActions > 0 && !grantsNarration) {
        updates.push({
          _id: item.id,
          'system.narrationActions': 0
        });
        console.log(SYSTEM.LOG.HEAD + `  feat "${item.name}": narrationActions ${narrationActions} → 0 (grantsNarration was false)`);
      }
    }

    return updates;
  }

  /**
   * Compute updates for a collection of items
   */
  _computeUpdates(items, nameToSlug) {
    const updates = [];

    for (const item of items) {
      const update = { _id: item.id };
      let needsUpdate = false;

      if (item.type === 'skill') {
        const currentSlug = item._source?.system?.slug ?? item.system?.slug;
        if (!currentSlug) {
          const normalized = this._normalize(item.name);
          const slug = nameToSlug[normalized];
          if (slug) {
            update['system.slug'] = slug;
            needsUpdate = true;
            console.log(SYSTEM.LOG.HEAD + `  skill "${item.name}" → slug "${slug}"`);
          } else {
            console.log(SYSTEM.LOG.HEAD + `  WARNING: No slug mapping for skill "${item.name}"`);
          }
        }
      }

      if (item.type === 'specialization') {
        const currentLinkedSkill = item._source?.system?.linkedSkill ?? item.system?.linkedSkill;
        if (currentLinkedSkill) {
          // Check if linkedSkill is already a slug (all lowercase, contains hyphen or is a known slug)
          const isAlreadySlug = Object.values(nameToSlug).includes(currentLinkedSkill);
          if (!isAlreadySlug) {
            const normalized = this._normalize(currentLinkedSkill);
            const slug = nameToSlug[normalized];
            if (slug) {
              update['system.linkedSkill'] = slug;
              needsUpdate = true;
              console.log(SYSTEM.LOG.HEAD + `  spec "${item.name}": linkedSkill "${currentLinkedSkill}" → "${slug}"`);
            } else {
              console.log(SYSTEM.LOG.HEAD + `  WARNING: No slug mapping for linkedSkill "${currentLinkedSkill}" on "${item.name}"`);
            }
          }
        }

        // Add slug to specialization if missing
        const currentSpecSlug = item._source?.system?.slug ?? item.system?.slug;
        if (!currentSpecSlug) {
          const specNormalized = this._normalize(item.name);
          const specSlug = this._specNameToSlug[specNormalized];
          if (specSlug) {
            update['system.slug'] = specSlug;
            needsUpdate = true;
            console.log(SYSTEM.LOG.HEAD + `  spec "${item.name}" → slug "${specSlug}"`);
          } else {
            console.log(SYSTEM.LOG.HEAD + `  WARNING: No slug mapping for spec "${item.name}"`);
          }
        }
      }

      // Migrate rrTarget in feat rrList entries (name → slug)
      if (item.type === 'feat') {
        const rrList = item._source?.system?.rrList ?? item.system?.rrList;
        if (Array.isArray(rrList) && rrList.length > 0) {
          let rrChanged = false;
          const newRRList = rrList.map(rr => {
            const rrTarget = rr.rrTarget;
            if (!rrTarget) return rr;

            let targetSlug = null;
            if (rr.rrType === 'skill') {
              // Check if already a slug
              if (Object.values(nameToSlug).includes(rrTarget)) return rr;
              const normalized = this._normalize(rrTarget);
              targetSlug = nameToSlug[normalized];
            } else if (rr.rrType === 'specialization') {
              // Check if already a slug
              if (Object.values(this._specNameToSlug).includes(rrTarget)) return rr;
              const normalized = this._normalize(rrTarget);
              targetSlug = this._specNameToSlug[normalized];
            }
            // attributes stay as-is (strength, agility, etc.)

            if (targetSlug) {
              rrChanged = true;
              console.log(SYSTEM.LOG.HEAD + `  feat "${item.name}": rrTarget "${rrTarget}" → "${targetSlug}"`);
              return { ...rr, rrTarget: targetSlug };
            }
            return rr;
          });

          if (rrChanged) {
            update['system.rrList'] = newRRList;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        updates.push(update);
      }
    }

    return updates;
  }
}

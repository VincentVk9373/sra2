import { Migration } from "./migration.mjs";

/**
 * Migration 13.4.0: Re-run spec slug conversion + fix rrList labels: Convert linkedAttackSpecialization and linkedDefenseSpecialization
 * from localized display names (e.g. "Spé : Pistolets") to canonical slugs (e.g. "spec_pistols").
 *
 * This ensures weapon/spell/power spec links work regardless of the active language.
 */
export class Migration_13_4_0 extends Migration {
  get code() {
    return "migration-13.4.0";
  }

  get version() {
    return "13.4.0";
  }

  /**
   * Normalize text: lowercase, remove accents, trim
   */
  _normalize(text) {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  /**
   * Map of normalized spec names (FR and EN) to canonical slugs.
   * Covers both "Spé : xxx" (FR) and "Spec: xxx" (EN) patterns,
   * as well as the variant "Spé: xxx" (without space after colon).
   */
  get _specNameToSlug() {
    return {
      // FR — "Spé : xxx" and "Spé: xxx" variants (normalized: "spe : xxx" / "spe: xxx")
      'spe : mains nues': 'spec_unarmed', 'spe: mains nues': 'spec_unarmed',
      'spe : lames': 'spec_blades', 'spe: lames': 'spec_blades',
      'spe : armes contondantes': 'spec_blunt-weapons', 'spe: armes contondantes': 'spec_blunt-weapons',
      'spe : monofilament': 'spec_monofilament', 'spe: monofilament': 'spec_monofilament',
      'spe : crocs': 'spec_fangs', 'spe: crocs': 'spec_fangs',
      'spe : defense': 'spec_defense', 'spe: defense': 'spec_defense',
      'spe : pistolets': 'spec_pistols', 'spe: pistolets': 'spec_pistols',
      'spe : fusils': 'spec_rifles', 'spe: fusils': 'spec_rifles',
      'spe : shotguns': 'spec_shotguns', 'spe: shotguns': 'spec_shotguns',
      'spe : mitraillettes': 'spec_smgs', 'spe: mitraillettes': 'spec_smgs',
      'spe : armes lourdes': 'spec_heavy-weapons', 'spe: armes lourdes': 'spec_heavy-weapons',
      'spe : armes de jet': 'spec_thrown-weapons', 'spe: armes de jet': 'spec_thrown-weapons',
      'spe : armes de trait': 'spec_thrown-weapons', 'spe: armes de trait': 'spec_thrown-weapons',
      'spe : armes montees': 'spec_mounted-weapons', 'spe: armes montees': 'spec_mounted-weapons',
      'spe : armes controlees a distance': 'spec_remote-controlled-weapons', 'spe: armes controlees a distance': 'spec_remote-controlled-weapons',
      'spe : lance-grenades': 'spec_grenade-launchers', 'spe: lance-grenades': 'spec_grenade-launchers',
      'spe : defense a distance': 'spec_ranged-defense', 'spe: defense a distance': 'spec_ranged-defense',
      'spe : course': 'spec_running', 'spe: course': 'spec_running',
      'spe : escalade': 'spec_climbing', 'spe: escalade': 'spec_climbing',
      'spe : natation': 'spec_swimming', 'spe: natation': 'spec_swimming',
      'spe : parkour': 'spec_parkour', 'spe: parkour': 'spec_parkour',
      'spe : discretion physique': 'spec_physical-stealth', 'spe: discretion physique': 'spec_physical-stealth',
      'spe : discretion matricielle': 'spec_matrix-stealth', 'spe: discretion matricielle': 'spec_matrix-stealth',
      'spe : discretion astrale': 'spec_astral-stealth', 'spe: discretion astrale': 'spec_astral-stealth',
      'spe : crochetage': 'spec_lockpicking', 'spe: crochetage': 'spec_lockpicking',
      'spe : escamotage': 'spec_stealth', 'spe: escamotage': 'spec_stealth',
      'spe : backdoor': 'spec_backdoor', 'spe: backdoor': 'spec_backdoor',
      'spe : force brute': 'spec_brute-force', 'spe: force brute': 'spec_brute-force',
      'spe : cybercombat': 'spec_cybercombat', 'spe: cybercombat': 'spec_cybercombat',
      'spe : guerre electronique': 'spec_electronic-warfare', 'spe: guerre electronique': 'spec_electronic-warfare',
      'spe : c/r implants cybernetiques': 'spec_cybernetics', 'spe: c/r implants cybernetiques': 'spec_cybernetics',
      'spe : c/r drones': 'spec_cr-drones', 'spe: c/r drones': 'spec_cr-drones',
      'spe : c/r vehicules': 'spec_cr-vehicles', 'spe: c/r vehicules': 'spec_cr-vehicles',
      'spe : c/r engins mecaniques': 'spec_cr-mechanical-devices', 'spe: c/r engins mecaniques': 'spec_cr-mechanical-devices',
      'spe : explosifs': 'spec_explosives', 'spe: explosifs': 'spec_explosives',
      'spe : ingenierie': 'spec_engineering', 'spe: ingenierie': 'spec_engineering',
      'spe : appareils personnels': 'spec_personal-devices', 'spe: appareils personnels': 'spec_personal-devices',
      'spe : c/r appareils electroniques': 'spec_personal-electronics',
      'spe : recherche matricielle': 'spec_matrix-search', 'spe: recherche matricielle': 'spec_matrix-search',
      'spe : perception matricielle': 'spec_matrix-perception', 'spe: perception matricielle': 'spec_matrix-perception',
      'spe : protection matricielle': 'spec_matrix-protection', 'spe: protection matricielle': 'spec_matrix-protection',
      'spe : medical': 'spec_medical', 'spe: medical': 'spec_medical',
      'spe : premiers soins': 'spec_first-aid', 'spe: premiers soins': 'spec_first-aid',
      'spe : voitures': 'spec_cars', 'spe: voitures': 'spec_cars',
      'spe : motos': 'spec_bikes', 'spe: motos': 'spec_bikes',
      'spe : camions': 'spec_trucks', 'spe: camions': 'spec_trucks',
      'spe : drones terrestres': 'spec_ground-drones', 'spe: drones terrestres': 'spec_ground-drones',
      'spe : drones volants': 'spec_flying-drones', 'spe: drones volants': 'spec_flying-drones',
      'spe : drones aquatiques': 'spec_aquatic-drones', 'spe: drones aquatiques': 'spec_aquatic-drones',
      'spe : vehicules aquatiques': 'spec_aquatic-vehicles', 'spe: vehicules aquatiques': 'spec_aquatic-vehicles',
      'spe : vehicules volants': 'spec_flying-vehicles', 'spe: vehicules volants': 'spec_flying-vehicles',
      'spe : sorts de combat': 'spec_combat-spells', 'spe: sorts de combat': 'spec_combat-spells',
      'spe : sorts de detection': 'spec_detection-spells', 'spe: sorts de detection': 'spec_detection-spells',
      'spe : sorts de sante': 'spec_health-spells', 'spe: sorts de sante': 'spec_health-spells',
      'spe : sorts d\'illusion': 'spec_illusion-spells', 'spe: sorts d\'illusion': 'spec_illusion-spells',
      'spe : sorts de manipulation': 'spec_manipulation-spells', 'spe: sorts de manipulation': 'spec_manipulation-spells',
      'spe : contresort': 'spec_counterspelling', 'spe: contresort': 'spec_counterspelling',
      'spe : bannissement': 'spec_banishing', 'spe: bannissement': 'spec_banishing',
      'spe : esprits de l\'air': 'spec_air-spirits', 'spe: esprits de l\'air': 'spec_air-spirits',
      'spe : esprits de la terre': 'spec_earth-spirits', 'spe: esprits de la terre': 'spec_earth-spirits',
      'spe : esprits de l\'eau': 'spec_water-spirits', 'spe: esprits de l\'eau': 'spec_water-spirits',
      'spe : esprits du feu': 'spec_fire-spirits', 'spe: esprits du feu': 'spec_fire-spirits',
      'spe : esprits des betes': 'spec_beast-spirits', 'spe: esprits des betes': 'spec_beast-spirits',
      'spe : esprits des plantes': 'spec_plant-spirits', 'spe: esprits des plantes': 'spec_plant-spirits',
      'spe : esprit des aines': 'spec_kin-spirits', 'spe: esprit des aines': 'spec_kin-spirits',
      'spe : compilation': 'spec_compilation', 'spe: compilation': 'spec_compilation',
      'spe : decompilation': 'spec_decompilation', 'spe: decompilation': 'spec_decompilation',
      'spe : formes complexes': 'spec_complex-forms', 'spe: formes complexes': 'spec_complex-forms',
      'spe : bluff': 'spec_bluff', 'spe: bluff': 'spec_bluff',
      'spe : intimidation': 'spec_intimidation', 'spe: intimidation': 'spec_intimidation',
      'spe : negociation': 'spec_negotiation', 'spe: negociation': 'spec_negotiation',
      'spe : imposture': 'spec_impersonation', 'spe: imposture': 'spec_impersonation',
      'spe : etiquette': 'spec_etiquette', 'spe: etiquette': 'spec_etiquette',
      'spe : perception physique': 'spec_physical-perception', 'spe: perception physique': 'spec_physical-perception',
      'spe : perception sociale': 'spec_social-perception', 'spe: perception sociale': 'spec_social-perception',
      'spe : perception astrale': 'spec_astral-perception', 'spe: perception astrale': 'spec_astral-perception',
      'spe : sang-froid': 'spec_composure', 'spe: sang-froid': 'spec_composure',
      'spe : survie en milieu naturel': 'spec_wilderness-survival', 'spe: survie en milieu naturel': 'spec_wilderness-survival',
      'spe : orientation': 'spec_navigation', 'spe: orientation': 'spec_navigation',
      'spe : dressage': 'spec_animal-training', 'spe: dressage': 'spec_animal-training',
      'spe : corporatiste': 'spec_corporate', 'spe: corporatiste': 'spec_corporate',
      'spe : criminel': 'spec_criminal', 'spe: criminel': 'spec_criminal',
      'spe : la rue': 'spec_la-rue', 'spe: la rue': 'spec_la-rue',
      'spe : gouvernemental': 'spec_government', 'spe: gouvernemental': 'spec_government',
      'spe : mediatique': 'spec_media', 'spe: mediatique': 'spec_media',
      'spe : universitaire': 'spec_academic', 'spe: universitaire': 'spec_academic',
      'spe : magique': 'spec_magic', 'spe: magique': 'spec_magic',
      'spe : matriciel': 'spec_matrix', 'spe: matriciel': 'spec_matrix',
      'spe : combat astral': 'spec_astral-combat', 'spe: combat astral': 'spec_astral-combat',
      // EN — "Spec: xxx" variants
      'spec: unarmed': 'spec_unarmed', 'spec: blades': 'spec_blades',
      'spec: blunt weapons': 'spec_blunt-weapons', 'spec: monofilament': 'spec_monofilament',
      'spec: fangs': 'spec_fangs', 'spec: defense': 'spec_defense',
      'spec: pistols': 'spec_pistols', 'spec: rifles': 'spec_rifles',
      'spec: shotguns': 'spec_shotguns', 'spec: smgs': 'spec_smgs',
      'spec: heavy weapons': 'spec_heavy-weapons', 'spec: thrown weapons': 'spec_thrown-weapons',
      'spec: mounted weapons': 'spec_mounted-weapons',
      'spec: remote controlled weapons': 'spec_remote-controlled-weapons',
      'spec: grenade launchers': 'spec_grenade-launchers',
      'spec: ranged defense': 'spec_ranged-defense', 'spec: running': 'spec_running',
      'spec: climbing': 'spec_climbing', 'spec: swimming': 'spec_swimming',
      'spec: physical stealth': 'spec_physical-stealth',
      'spec: matrix stealth': 'spec_matrix-stealth',
      'spec: astral stealth': 'spec_astral-stealth', 'spec: lockpicking': 'spec_lockpicking',
      'spec: backdoor': 'spec_backdoor', 'spec: brute force': 'spec_brute-force',
      'spec: cybercombat': 'spec_cybercombat', 'spec: electronic warfare': 'spec_electronic-warfare',
      'spec: combat spells': 'spec_combat-spells', 'spec: detection spells': 'spec_detection-spells',
      'spec: health spells': 'spec_health-spells', 'spec: illusion spells': 'spec_illusion-spells',
      'spec: manipulation spells': 'spec_manipulation-spells', 'spec: counterspelling': 'spec_counterspelling',
      'spec: banishing': 'spec_banishing', 'spec: compilation': 'spec_compilation',
      'spec: decompilation': 'spec_decompilation', 'spec: complex forms': 'spec_complex-forms',
      'spec: bluff': 'spec_bluff', 'spec: intimidation': 'spec_intimidation',
      'spec: negotiation': 'spec_negotiation', 'spec: impersonation': 'spec_impersonation',
      'spec: etiquette': 'spec_etiquette', 'spec: physical perception': 'spec_physical-perception',
      'spec: social perception': 'spec_social-perception', 'spec: astral perception': 'spec_astral-perception',
      'spec: composure': 'spec_composure',
    };
  }

  /**
   * Convert a spec name to a slug. Returns the original value if already a slug or unknown.
   */
  _toSlug(name) {
    if (!name || name.startsWith('spec_')) return name; // Already a slug
    const normalized = this._normalize(name);
    return this._specNameToSlug[normalized] || name;
  }

  /**
   * Compute updates for feat items:
   * 1. Convert linkedAttackSpecialization/linkedDefenseSpecialization from names to slugs
   * 2. Convert rrList entries: rrTarget from names to slugs
   */
  _computeUpdates(items) {
    const updates = [];
    for (const item of items) {
      if (item.type !== 'feat') continue;
      const sys = item.system;
      const update = { _id: item.id };
      let needsUpdate = false;

      // Fix linkedAttackSpecialization
      const attackSpec = sys.linkedAttackSpecialization || '';
      if (attackSpec && !attackSpec.startsWith('spec_')) {
        const slug = this._toSlug(attackSpec);
        if (slug !== attackSpec) {
          update['system.linkedAttackSpecialization'] = slug;
          needsUpdate = true;
        }
      }

      // Fix linkedDefenseSpecialization
      const defenseSpec = sys.linkedDefenseSpecialization || '';
      if (defenseSpec && !defenseSpec.startsWith('spec_')) {
        const slug = this._toSlug(defenseSpec);
        if (slug !== defenseSpec) {
          update['system.linkedDefenseSpecialization'] = slug;
          needsUpdate = true;
        }
      }

      // Fix rrList entries: convert rrTarget from names to slugs
      const rrList = sys.rrList || [];
      if (rrList.length > 0) {
        let rrChanged = false;
        const newRRList = rrList.map(rr => {
          const newRR = { ...rr };
          // Fix rrTarget if it's a name instead of a slug
          if (rr.rrType === 'specialization' && rr.rrTarget && !rr.rrTarget.startsWith('spec_')) {
            const slug = this._toSlug(rr.rrTarget);
            if (slug !== rr.rrTarget) {
              newRR.rrTarget = slug;
              rrChanged = true;
            }
          }
          // Fix rrLabel if it's a name instead of a slug (for display, keep as-is if already good)
          return newRR;
        });
        if (rrChanged) {
          update['system.rrList'] = newRRList;
          needsUpdate = true;
        }
      }

      if (needsUpdate) updates.push(update);
    }
    return updates;
  }

  async migrate() {
    console.log(SYSTEM.LOG.HEAD + "Starting migration 13.3.2: Convert linked spec names to slugs");

    let totalFixed = 0;

    // Fix actors
    for (const actor of game.actors) {
      const updates = this._computeUpdates(actor.items);
      if (updates.length > 0) {
        console.log(SYSTEM.LOG.HEAD + `Migration 13.4.0: Re-run spec slug conversion + fix rrList labels: Updating ${updates.length} feat(s) on actor "${actor.name}"`);
        await actor.updateEmbeddedDocuments('Item', updates);
        totalFixed += updates.length;
      }
    }

    // Fix world items
    const worldUpdates = this._computeUpdates(game.items);
    if (worldUpdates.length > 0) {
      console.log(SYSTEM.LOG.HEAD + `Migration 13.4.0: Re-run spec slug conversion + fix rrList labels: Updating ${worldUpdates.length} world item(s)`);
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
          const updates = this._computeUpdates(documents);
          if (updates.length > 0) {
            console.log(SYSTEM.LOG.HEAD + `Migration 13.4.0: Re-run spec slug conversion + fix rrList labels: Updating ${updates.length} item(s) in pack "${pack.title}"`);
            for (const u of updates) {
              const doc = documents.find(d => d.id === u._id);
              if (doc) await doc.update(u);
            }
            totalFixed += updates.length;
          }
        } else if (pack.documentName === 'Actor') {
          const actors = await pack.getDocuments();
          for (const actor of actors) {
            const updates = this._computeUpdates(actor.items);
            if (updates.length > 0) {
              console.log(SYSTEM.LOG.HEAD + `Migration 13.4.0: Re-run spec slug conversion + fix rrList labels: Updating ${updates.length} feat(s) on compendium actor "${actor.name}"`);
              await actor.updateEmbeddedDocuments('Item', updates);
              totalFixed += updates.length;
            }
          }
        }
      } finally {
        if (wasLocked) await pack.configure({ locked: true });
      }
    }

    console.log(SYSTEM.LOG.HEAD + `Migration 13.4.0: Re-run spec slug conversion + fix rrList labels complete: fixed ${totalFixed} feat(s)`);
  }
}

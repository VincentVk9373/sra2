import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// FR -> EN translation dictionary (same as generateBabeleTranslation.mjs)
const translations = {
  // Skills
  'Athlétisme': 'Athletics',
  'Conjuration': 'Conjuration',
  'Ingénierie': 'Engineering',
  'Réseau': 'Networking',
  'Perception': 'Perception',
  'Pilotage': 'Piloting',
  'Survie': 'Survival',
  'Armes à distance': 'Ranged Weapons',
  'Étiquette': 'Etiquette',
  'Combat rapproché': 'Close Combat',
  'Furtivité': 'Stealth',
  'Influence': 'Influence',
  'Piratage': 'Hacking',
  'Électronique': 'Electronics',
  'Sorcellerie': 'Sorcery',
  'Technomancie': 'Technomancy',

  // Specializations
  'Spé: Formes complexes': 'Spec: Complex Forms',
  'Spé: Compilation': 'Spec: Compilation',
  'Spé: Décompilation': 'Spec: Decompilation',
  'Spé : De la rue': 'Spec: Street',
  'Spé : Escamotage': 'Spec: Stealth',
  'Spé : Appareils personnels': 'Spec: Personal Devices',
  'Spé : Armes contondantes': 'Spec: Blunt Weapons',
  'Spé : Armes lourdes': 'Spec: Heavy Weapons',
  'Spé : Backdoor': 'Spec: Backdoor',
  'Spé : Bannissement': 'Spec: Banishing',
  'Spé : Criminel': 'Spec: Criminal',
  'Spé : Drones terrestres': 'Spec: Ground Drones',
  'Spé : Esprits de la terre': 'Spec: Earth Spirits',
  'Spé : Esprits des bêtes': 'Spec: Beast Spirits',
  'Spé : Esprits des plantes': 'Spec: Plant Spirits',
  'Spé : Lames': 'Spec: Blades',
  'Spé : Matriciel': 'Spec: Matrix',
  'Spé : Motos': 'Spec: Motorcycles',
  'Spé : Physique': 'Spec: Physical',
  'Spé : pistolets': 'Spec: Pistols',
  'Spé : Armes montées': 'Spec: Mounted Weapons',
  'Spé : Camions': 'Spec: Trucks',
  'Spé : Combat astral': 'Spec: Astral Combat',
  'Spé : Contresort': 'Spec: Counterspelling',
  'Spé : Défense à distance': 'Spec: Ranged Defense',
  'Spé : Discrétion Physique': 'Spec: Physical Stealth',
  'Spé : Discrétion astrale': 'Spec: Astral Stealth',
  'Spé : Discrétion matricielle': 'Spec: Matrix Stealth',
  'Spé : Drones volants': 'Spec: Flying Drones',
  'Spé : Esprit des années': 'Spec: Years Spirit',
  'Spé : Esprits de l\'air': 'Spec: Air Spirits',
  'Spé : Médiatique': 'Spec: Media',
  'Spé : Natation': 'Spec: Swimming',
  'Spé : Recherche matricielle': 'Spec: Matrix Search',
  'Spé : Sorts d\'illusion': 'Spec: Illusion Spells',
  'Spé : Sorts de combat': 'Spec: Combat Spells',
  'Spé : Véhicules aquatiques': 'Spec: Aquatic Vehicles',
  'Spé : attaque élémentaire': 'Spec: Elemental Attack',
  'Spé : Armes contrôlées à distance': 'Spec: Remote Controlled Weapons',
  'Spé : Armes de trait': 'Spec: Thrown Weapons',
  'Spé : C-R appareils électroniques': 'Spec: C&R Electronic Devices',
  'Spé : C-R engins mécaniques': 'Spec: C-R Mechanical Devices',
  'Spé : C-R implants cybernétiques': 'Spec: C-R Cybernetic Implants',
  'Spé : C-R véhicules': 'Spec: C-R Vehicles',
  'Spé : Escalade': 'Spec: Climbing',
  'Spé : Esprits du feu': 'Spec: Fire Spirits',
  'Spé : Guerre électronique': 'Spec: Electronic Warfare',
  'Spé : Ingénierie': 'Spec: Engineering',
  'Spé : Lance grenades': 'Spec: Grenade Launchers',
  'Spé : Matricielle': 'Spec: Matrix',
  'Spé : Perception astrale': 'Spec: Astral Perception',
  'Spé : Protection matricielle': 'Spec: Matrix Protection',
  'Spé : Reseau de la rue': 'Spec: Street Network',
  'Spé : Sorts de détection': 'Spec: Detection Spells',
  'Spé : Véhicules volants': 'Spec: Flying Vehicles',
  'Spé : parkour': 'Spec: Parkour',
  'Spé : Bluff': 'Spec: Bluff',
  'Spé : Course': 'Spec: Running',
  'Spé : Crochetage': 'Spec: Lockpicking',
  'Spé : Drones aquatiques': 'Spec: Aquatic Drones',
  'Spé : Explosifs': 'Spec: Explosives',
  'Spé : Force brute': 'Spec: Brute Force',
  'Spé : Fusils': 'Spec: Rifles',
  'Spé : Gouvernemental': 'Spec: Government',
  'Spé : Imposture': 'Spec: Impersonation',
  'Spé : Intimidation': 'Spec: Intimidation',
  'Spé : Médical': 'Spec: Medical',
  'Spé : Magique': 'Spec: Magic',
  'Spé : Mains nues': 'Spec: Unarmed',
  'Spé : Mitraillettes': 'Spec: SMGs',
  'Spé : Négociation': 'Spec: Negotiation',
  'Spé : Orientation': 'Spec: Navigation',
  'Spé : Sorts de manipulation': 'Spec: Manipulation Spells',
  'Spé : Sorts de santé': 'Spec: Health Spells',
  'Spé : Étiquette': 'Spec: Etiquette',
  'Spé : Armes de jet': 'Spec: Thrown Weapons',
  'Spé : C-R drones': 'Spec: C-R Drones',
  'Spé : Corporatiste': 'Spec: Corporate',
  'Spé : Cybercombat': 'Spec: Cybercombat',
  'Spé : Défense': 'Spec: Defense',
  'Spé : Dressage': 'Spec: Animal Training',
  'Spé : Perception physique': 'Spec: Physical Perception',
  'Spé : Premiers soins': 'Spec: First Aid',
  'Spé : Sang froid': 'Spec: Cool Under Pressure',
  'Spé : Survie en milieu naturel': 'Spec: Wilderness Survival',
  'Spé : Voitures': 'Spec: Cars',
  
  // Weapons
  'Fusil d\'assaut': 'Assault Rifle',
  'Fusil de précision': 'Sniper Rifle',
  'Fusil de sport': 'Sport Rifle',
  'Pistolet léger': 'Light Pistol',
  'Pistolet lourd': 'Heavy Pistol',
  'Pistolet automatique': 'Automatic Pistol',
  'Pistolet de poche': 'Holdout Pistol',
  'Mitraillette': 'SMG',
  'Mitrailleuse': 'Machine Gun',
  'Shotgun': 'Shotgun',
  'Taser': 'Taser',
  'Arme courte': 'Melee Weapon (Short)',
  'Arme longue': 'Melee Weapon (Long)',
  'Lance grenade': 'Grenade Launcher',
  'Canne fusil': 'Cane Rifle',
  
  // Other terms
  'Tir automatique': 'Automatic Fire',
  'Armure': 'Armor',
  'Explosifs': 'Explosives',
  'Munitions': 'Ammunition',
  'Grenades': 'Grenades',
  'Drones': 'Drones',
  'Véhicules': 'Vehicles',
  'Magie': 'Magic',
  'Focus': 'Focus',
  'Médikit': 'Medkit',
  'Contrat': 'Contract',
};

// Translate text
function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Look for exact translation
  if (translations[text]) {
    return translations[text];
  }
  
  // Translate common terms in names
  let translated = text;
  
  // Replace common terms
  for (const [fr, en] of Object.entries(translations)) {
    translated = translated.replace(new RegExp(fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), en);
  }
  
  // Basic translations for prefixes/suffixes
  translated = translated
    .replace(/Arme à distance/gi, 'Ranged Weapons')
    .replace(/Arme à feu/gi, 'Firearms')
    .replace(/Fusil d'assaut/gi, 'Assault Rifle')
    .replace(/Fusil de précision/gi, 'Sniper Rifle')
    .replace(/Fusil de sport/gi, 'Sport Rifle')
    .replace(/Pistolet léger/gi, 'Light Pistol')
    .replace(/Pistolet lourd/gi, 'Heavy Pistol')
    .replace(/Pistolet automatique/gi, 'Automatic Pistol')
    .replace(/Pistolet de poche/gi, 'Holdout Pistol')
    .replace(/Mitraillette/gi, 'SMG')
    .replace(/Mitrailleuse/gi, 'Machine Gun')
    .replace(/Lance grenade/gi, 'Grenade Launcher')
    .replace(/Canne fusil/gi, 'Cane Rifle')
    .replace(/Arme courte/gi, 'Melee Weapon (Short)')
    .replace(/Arme longue/gi, 'Melee Weapon (Long)')
    .replace(/Armure/gi, 'Armor')
    .replace(/Explosifs/gi, 'Explosives')
    .replace(/Munitions/gi, 'Ammunition')
    .replace(/Grenades/gi, 'Grenades')
    .replace(/Drones/gi, 'Drones')
    .replace(/Véhicules/gi, 'Vehicles')
    .replace(/Magie/gi, 'Magic')
    .replace(/Focus/gi, 'Focus')
    .replace(/Médikit/gi, 'Medkit')
    .replace(/Contrat/gi, 'Contract')
    .replace(/Spé :/gi, 'Spec:')
    .replace(/Spécialisation/gi, 'Specialization')
    .replace(/De la rue/gi, 'Street')
    .replace(/Escamotage/gi, 'Stealth')
    .replace(/C-R/gi, 'C&R')
    .replace(/C&R appareils électroniques/gi, 'C&R Electronic Devices')
    .replace(/C&R engins mécaniques/gi, 'C-R Mechanical Devices')
    .replace(/C&R implants cybernétiques/gi, 'C&R Cybernetic Implants')
    .replace(/C&R véhicules/gi, 'C&R Vehicles')
    .replace(/C&R drones/gi, 'C&R Drones')
    .replace(/appareils électroniques/gi, 'Electronic Devices')
    .replace(/engins mécaniques/gi, 'Mechanical Devices')
    .replace(/implants cybernétiques/gi, 'Cybernetic Implants');
  
  return translated;
}

// Translate HTML description
function translateDescription(description) {
  if (!description || typeof description !== 'string') return '';
  
  // For HTML descriptions, translate the content
  if (description.includes('<p>')) {
    return description.replace(/<p>(.*?)<\/p>/gi, (match, content) => {
      return `<p>${translateText(content)}</p>`;
    });
  }
  
  return translateText(description);
}

/**
 * Converts a pack to the sra2.sra2-skills.json format
 */
async function convertPackToSkillsFormat(packName, sourcePackDir, outputFile, lang = 'en') {
  try {
    console.log(`\n🔄 Converting pack to skills format: ${packName}`);
    console.log('='.repeat(50));
    console.log(`Source: ${sourcePackDir}`);
    console.log(`Output: ${outputFile}`);
    console.log(`Language: ${lang}`);
    
    // List all JSON files (excluding folders)
    const files = await fs.readdir(sourcePackDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('folders_'));
    
    console.log(`\n📄 ${jsonFiles.length} file(s) to process...\n`);
    
    const entries = [];
    let processedCount = 0;
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(sourcePackDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const item = JSON.parse(content);
        
        // Skip if no name
        if (!item.name) {
          continue;
        }
        
        // Get French name as ID
        const frenchName = item.name;
        
        // Translate name to English
        const englishName = translateText(frenchName);
        
        // Translate description
        const description = item.system?.description 
          ? translateDescription(item.system.description)
          : '';
        
        // Create entry in the skills format
        entries.push({
          id: frenchName,
          name: englishName,
          description: description
        });
        
        processedCount++;
        if (processedCount % 50 === 0) {
          process.stdout.write(`   ${processedCount}/${jsonFiles.length}...\r`);
        }
      } catch (error) {
        console.error(`\n⚠️  Error processing ${file}: ${error.message}`);
      }
    }
    
    // Sort entries by French name (id)
    entries.sort((a, b) => a.id.localeCompare(b.id, 'fr'));
    
    // Create output object in sra2.sra2-skills.json format
    const output = {
      label: packName,
      mapping: {
        description: 'system.description'
      },
      entries: entries
    };
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save file
    await fs.writeFile(
      outputFile,
      JSON.stringify(output, null, 4),
      'utf-8'
    );
    
    console.log(`\n✅ Conversion complete!`);
    console.log(`   ${entries.length} entry(ies) converted`);
    console.log(`   File: ${outputFile}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error during conversion:', error.message);
    throw error;
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node convertPackToSkillsFormat.mjs <packName> [sourceDir] [outputFile] [lang]');
    console.log('\nExamples:');
    console.log('  node convertPackToSkillsFormat.mjs anarchy-objets');
    console.log('  node convertPackToSkillsFormat.mjs anarchy-objets src/packs public/lang/en/sra2.sra2-objets.json en');
    console.log('\nDefaults:');
    console.log('  sourceDir: src/packs');
    console.log('  outputFile: public/lang/{lang}/sra2.{packName}.json');
    console.log('  lang: en');
    process.exit(1);
  }
  
  const packName = args[0];
  const sourceDir = args[1] || 'src/packs';
  const lang = args[3] || 'en';
  
  // Determine output file
  let outputFile = args[2];
  if (!outputFile) {
    outputFile = path.join(ROOT_DIR, 'public', 'lang', lang, `sra2.${packName}.json`);
  }
  
  const sourcePackDir = path.join(ROOT_DIR, sourceDir, packName);
  
  // Check that source pack exists
  try {
    await fs.access(sourcePackDir);
  } catch (error) {
    console.error(`❌ Source pack does not exist: ${sourcePackDir}`);
    process.exit(1);
  }
  
  await convertPackToSkillsFormat(packName, sourcePackDir, outputFile, lang);
  
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Translation file created in: ${outputFile}`);
  console.log(`   2. File format matches sra2.sra2-skills.json structure`);
  console.log(`   3. Entries are sorted alphabetically by French name (id)`);
  console.log('');
}

main();


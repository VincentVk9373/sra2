import { compilePack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const SRC_DIR = 'src/packs';
const DIST_DIR = 'public/packs';
const SYSTEM_JSON_PATH = path.join(ROOT_DIR, 'public', 'system.json');

/**
 * Detects pack type by reading first JSON file in pack directory
 * @param {string} packPath - Path to pack directory
 * @returns {Promise<{type: string, label: string}>}
 */
async function detectPackType(packPath) {
  const files = await fs.readdir(packPath);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    console.log(`   ⚠️  No JSON files found, defaulting to Item`);
    return { type: 'Item', docType: null };
  }
  
  // Read first JSON file to detect type
  const firstFile = path.join(packPath, jsonFiles[0]);
  const content = JSON.parse(await fs.readFile(firstFile, 'utf-8'));
  
  // Detect based on _key field
  if (content._key) {
    const keyType = content._key.split('!')[1];
    if (keyType === 'actors') return { type: 'Actor', docType: content.type };
    if (keyType === 'items') return { type: 'Item', docType: content.type };
    if (keyType === 'journal') return { type: 'JournalEntry', docType: null };
    if (keyType === 'tables') return { type: 'RollTable', docType: null };
    if (keyType === 'scenes') return { type: 'Scene', docType: null };
    if (keyType === 'macros') return { type: 'Macro', docType: null };
    if (keyType === 'playlists') return { type: 'Playlist', docType: null };
    if (keyType === 'cards') return { type: 'Cards', docType: null };
    if (keyType === 'folders') {
      // For folders, try to find a non-folder file
      for (const file of jsonFiles) {
        if (!file.startsWith('folders_')) {
          const otherContent = JSON.parse(await fs.readFile(path.join(packPath, file), 'utf-8'));
          if (otherContent._key) {
            const otherType = otherContent._key.split('!')[1];
            if (otherType === 'actors') return { type: 'Actor', docType: otherContent.type };
            if (otherType === 'items') return { type: 'Item', docType: otherContent.type };
            if (otherType === 'journal') return { type: 'JournalEntry', docType: null };
          }
        }
      }
    }
  }
  
  // Fallback detection based on filename prefix
  const fileName = jsonFiles[0].toLowerCase();
  if (fileName.startsWith('vehicle_') || fileName.startsWith('character_') || fileName.startsWith('npc_') || fileName.startsWith('ice_')) {
    return { type: 'Actor', docType: null };
  }
  if (fileName.startsWith('journal_') || fileName.startsWith('pages_')) {
    return { type: 'JournalEntry', docType: null };
  }
  
  return { type: 'Item', docType: null };
}

/**
 * Generates a human-readable label from pack name
 * @param {string} packName 
 * @returns {string}
 */
function generateLabel(packName) {
  return packName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Packs all compendiums from src to public and updates system.json
 */
async function packCompendiumsToPublic() {
  console.log('\n📦 Packing compendiums to public/packs...\n');
  console.log('=' .repeat(60));
  
  // Read system.json
  const systemJson = JSON.parse(await fs.readFile(SYSTEM_JSON_PATH, 'utf-8'));
  if (!systemJson.packs) {
    systemJson.packs = [];
  }
  
  // Get existing pack names for quick lookup
  const existingPacks = new Set(systemJson.packs.map(p => p.name));
  
  // Read all packs from src directory
  const srcPath = path.join(ROOT_DIR, SRC_DIR);
  const packs = await fs.readdir(srcPath);
  
  let packedCount = 0;
  let addedToSystem = 0;
  
  for (const packName of packs) {
    // Skip non-directories and hidden files
    if (packName.startsWith('.') || packName === '.gitattributes') continue;
    
    const packSrcPath = path.join(srcPath, packName);
    const stats = await fs.stat(packSrcPath);
    if (!stats.isDirectory()) continue;
    
    // Check if pack has content
    const files = await fs.readdir(packSrcPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
      console.log(`⏭️  Skipping ${packName} (empty pack)`);
      continue;
    }
    
    console.log(`\n📁 Processing: ${packName}`);
    
    // Detect pack type
    const { type: packType } = await detectPackType(packSrcPath);
    console.log(`   Type: ${packType}`);
    
    // Compile pack to LevelDB
    const packDistPath = path.join(ROOT_DIR, DIST_DIR, packName);
    
    try {
      // Remove existing pack directory if exists (clean build)
      try {
        await fs.rm(packDistPath, { recursive: true, force: true });
      } catch (e) {
        // Ignore if doesn't exist
      }
      
      await compilePack(packSrcPath, packDistPath, { yaml: false });
      console.log(`   ✅ Compiled to ${DIST_DIR}/${packName}`);
      packedCount++;
    } catch (error) {
      console.error(`   ❌ Error compiling: ${error.message}`);
      continue;
    }
    
    // Check if pack exists in system.json
    if (!existingPacks.has(packName)) {
      const newPack = {
        name: packName,
        label: generateLabel(packName),
        type: packType,
        system: 'sra2',
        ownership: {
          PLAYER: 'OBSERVER',
          ASSISTANT: 'OWNER'
        }
      };
      
      systemJson.packs.push(newPack);
      existingPacks.add(packName);
      addedToSystem++;
      console.log(`   ➕ Added to system.json: "${newPack.label}" (${packType})`);
    } else {
      console.log(`   ✓ Already in system.json`);
    }
    
    // Small delay to let LevelDB close properly
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Sort packs alphabetically
  systemJson.packs.sort((a, b) => a.name.localeCompare(b.name));
  
  // Save updated system.json
  await fs.writeFile(
    SYSTEM_JSON_PATH,
    JSON.stringify(systemJson, null, 2) + '\n',
    'utf-8'
  );
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n✨ Done!`);
  console.log(`   📦 ${packedCount} pack(s) compiled`);
  console.log(`   ➕ ${addedToSystem} pack(s) added to system.json`);
  console.log(`   📄 system.json updated\n`);
}

// Run
packCompendiumsToPublic().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


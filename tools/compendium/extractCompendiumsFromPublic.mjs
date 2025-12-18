import { extractPack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const SRC_DIR = 'src/packs';
const PUBLIC_DIR = 'public/packs';

/**
 * Generates a filename prefixed with document type
 * @param {object} doc - The document data
 * @returns {string}
 */
function transformName(doc) {
  const safeFileName = doc.name.replace(/[^a-zA-Z0-9А-я]/g, "_");
  const type = doc._key.split("!")[1];
  const prefix = ["actors", "items"].includes(type) ? doc.type : type;
  return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.json`;
}

/**
 * Extracts all compendiums from public/packs to src/packs as JSON files
 */
async function extractCompendiumsFromPublic() {
  console.log('\n📦 Extracting compendiums from public/packs to src/packs...\n');
  console.log('=' .repeat(60));
  
  const publicPath = path.join(ROOT_DIR, PUBLIC_DIR);
  const srcPath = path.join(ROOT_DIR, SRC_DIR);
  
  // Read all packs from public directory
  const packs = await fs.readdir(publicPath);
  
  let extractedCount = 0;
  let errorCount = 0;
  
  for (const packName of packs) {
    // Skip non-directories and hidden files
    if (packName.startsWith('.') || packName === '.gitattributes') continue;
    
    const packPublicPath = path.join(publicPath, packName);
    const stats = await fs.stat(packPublicPath);
    if (!stats.isDirectory()) continue;
    
    console.log(`\n📁 Unpacking: ${packName}`);
    
    const packSrcPath = path.join(srcPath, packName);
    
    // Clean destination directory
    try {
      await fs.mkdir(packSrcPath, { recursive: true });
      const existingFiles = await fs.readdir(packSrcPath);
      for (const file of existingFiles) {
        await fs.unlink(path.join(packSrcPath, file));
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.log(`   ⚠️  Could not clean directory: ${error.message}`);
      }
    }
    
    // Extract pack
    try {
      await extractPack(packPublicPath, packSrcPath, {
        yaml: false,
        transformName: transformName,
      });
      
      // Count extracted files
      const files = await fs.readdir(packSrcPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      console.log(`   ✅ Extracted ${jsonFiles.length} file(s)`);
      extractedCount++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
    
    // Small delay to let LevelDB close properly before next pack
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n✨ Done!`);
  console.log(`   ✅ ${extractedCount} pack(s) extracted`);
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} pack(s) failed`);
  }
  console.log('');
}

// Run
extractCompendiumsFromPublic().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

/**
 * Script pour vérifier les valeurs BRUTES dans la base de données
 * À exécuter dans la console F12 de Foundry
 */

async function checkRawData() {
  console.log('=== Vérification des données brutes ===\n');
  
  let diceInSystem = 0;
  let diceInSource = 0;
  
  // Vérifier les items du monde
  console.log('Items du monde:');
  for (const item of game.items) {
    if (item.type !== 'feat') continue;
    
    const system = item.system;
    const source = item._source?.system || {};
    
    // Vérifier dans system (après validation du modèle)
    const hasDiceSystem = 
      system.meleeRange === 'dice' ||
      system.shortRange === 'dice' ||
      system.mediumRange === 'dice' ||
      system.longRange === 'dice';
    
    // Vérifier dans _source (données brutes)
    const hasDiceSource = 
      source.meleeRange === 'dice' ||
      source.shortRange === 'dice' ||
      source.mediumRange === 'dice' ||
      source.longRange === 'dice';
    
    if (hasDiceSystem) {
      console.log(`SYSTEM avec "dice": ${item.name}`);
      diceInSystem++;
    }
    if (hasDiceSource) {
      console.log(`SOURCE avec "dice": ${item.name}`, {
        melee: source.meleeRange,
        short: source.shortRange,
        medium: source.mediumRange,
        long: source.longRange
      });
      diceInSource++;
    }
    
    // Montrer la différence si les valeurs diffèrent
    if (hasDiceSource && !hasDiceSystem) {
      console.warn(`⚠️ DIFFÉRENCE pour ${item.name}:`);
      console.log('  _source:', {
        melee: source.meleeRange,
        short: source.shortRange,
        medium: source.mediumRange,
        long: source.longRange
      });
      console.log('  system:', {
        melee: system.meleeRange,
        short: system.shortRange,
        medium: system.mediumRange,
        long: system.longRange
      });
    }
  }
  
  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`Items avec "dice" dans system: ${diceInSystem}`);
  console.log(`Items avec "dice" dans _source: ${diceInSource}`);
  
  if (diceInSource > diceInSystem) {
    console.warn(`\n⚠️ ATTENTION: ${diceInSource - diceInSystem} items ont "dice" dans _source mais pas dans system`);
    console.warn('Cela signifie que Foundry convertit "dice" en une autre valeur au chargement!');
  }
}

checkRawData();


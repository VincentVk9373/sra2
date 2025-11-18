/**
 * Script manuel pour convertir "dice" en "disadvantage" dans tous les items
 * À exécuter dans la console F12 de Foundry
 */

async function fixDiceToDisadvantage() {
  console.log('=== Début de la conversion "dice" → "disadvantage" ===');
  
  let totalFixed = 0;
  const updates = [];
  
  // 1. Migrer les items du monde
  console.log('Vérification des items du monde...');
  for (const item of game.items) {
    if (item.type !== 'feat') continue;
    
    const s = item.system;
    const hasDice = 
      s.meleeRange === 'dice' ||
      s.shortRange === 'dice' ||
      s.mediumRange === 'dice' ||
      s.longRange === 'dice';
    
    if (hasDice) {
      const update = { _id: item.id };
      
      if (s.meleeRange === 'dice') update['system.meleeRange'] = 'disadvantage';
      if (s.shortRange === 'dice') update['system.shortRange'] = 'disadvantage';
      if (s.mediumRange === 'dice') update['system.mediumRange'] = 'disadvantage';
      if (s.longRange === 'dice') update['system.longRange'] = 'disadvantage';
      
      updates.push(update);
      console.log(`✓ Correction de l'item monde: ${item.name}`);
      totalFixed++;
    }
  }
  
  if (updates.length > 0) {
    await Item.updateDocuments(updates);
    console.log(`✓ ${updates.length} items du monde corrigés`);
  }
  
  // 2. Migrer les items de tous les acteurs
  console.log('Vérification des items des acteurs...');
  for (const actor of game.actors) {
    const actorUpdates = [];
    
    for (const item of actor.items) {
      if (item.type !== 'feat') continue;
      
      const s = item.system;
      const hasDice = 
        s.meleeRange === 'dice' ||
        s.shortRange === 'dice' ||
        s.mediumRange === 'dice' ||
        s.longRange === 'dice';
      
      if (hasDice) {
        const update = { _id: item.id };
        
        if (s.meleeRange === 'dice') update['system.meleeRange'] = 'disadvantage';
        if (s.shortRange === 'dice') update['system.shortRange'] = 'disadvantage';
        if (s.mediumRange === 'dice') update['system.mediumRange'] = 'disadvantage';
        if (s.longRange === 'dice') update['system.longRange'] = 'disadvantage';
        
        actorUpdates.push(update);
        console.log(`✓ Correction de l'item: ${item.name} (Actor: ${actor.name})`);
        totalFixed++;
      }
    }
    
    if (actorUpdates.length > 0) {
      await actor.updateEmbeddedDocuments('Item', actorUpdates);
      console.log(`✓ ${actorUpdates.length} items corrigés pour ${actor.name}`);
    }
  }
  
  console.log(`\n=== TERMINÉ ===`);
  console.log(`Total d'items corrigés: ${totalFixed}`);
  ui.notifications.info(`Correction terminée: ${totalFixed} item(s) converti(s) de "dice" vers "disadvantage"`);
}

// Exécuter la fonction
fixDiceToDisadvantage();


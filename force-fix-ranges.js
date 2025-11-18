/**
 * Script pour forcer la correction "dice" → "disadvantage"
 * Ce script supprime d'abord le flag de migration puis convertit les valeurs
 * À exécuter dans la console F12 de Foundry
 */

async function forceFix() {
  console.log('=== Correction forcée "dice" → "disadvantage" ===');
  
  let totalFixed = 0;
  
  // 1. Items du monde
  console.log('\n1. Correction des items du monde...');
  const worldUpdates = [];
  
  for (const item of game.items) {
    if (item.type !== 'feat') continue;
    
    const s = item.system;
    const update = { _id: item.id };
    let needsUpdate = false;
    
    // Convertir les valeurs "dice" en "disadvantage"
    if (s.meleeRange === 'dice') {
      update['system.meleeRange'] = 'disadvantage';
      needsUpdate = true;
    }
    if (s.shortRange === 'dice') {
      update['system.shortRange'] = 'disadvantage';
      needsUpdate = true;
    }
    if (s.mediumRange === 'dice') {
      update['system.mediumRange'] = 'disadvantage';
      needsUpdate = true;
    }
    if (s.longRange === 'dice') {
      update['system.longRange'] = 'disadvantage';
      needsUpdate = true;
    }
    
    // Supprimer le flag de migration si présent
    if (s._rangeDiceToDisadvantageMigrationVersion) {
      update['system.-=_rangeDiceToDisadvantageMigrationVersion'] = null;
    }
    
    if (needsUpdate) {
      worldUpdates.push(update);
      console.log(`  ✓ ${item.name}: melee=${s.meleeRange}, short=${s.shortRange}, medium=${s.mediumRange}, long=${s.longRange}`);
      totalFixed++;
    }
  }
  
  if (worldUpdates.length > 0) {
    console.log(`\nMise à jour de ${worldUpdates.length} items du monde...`);
    await Item.updateDocuments(worldUpdates);
    console.log('✓ Items du monde corrigés');
  }
  
  // 2. Items des acteurs
  console.log('\n2. Correction des items des acteurs...');
  
  for (const actor of game.actors) {
    const actorUpdates = [];
    
    for (const item of actor.items) {
      if (item.type !== 'feat') continue;
      
      const s = item.system;
      const update = { _id: item.id };
      let needsUpdate = false;
      
      // Convertir les valeurs "dice" en "disadvantage"
      if (s.meleeRange === 'dice') {
        update['system.meleeRange'] = 'disadvantage';
        needsUpdate = true;
      }
      if (s.shortRange === 'dice') {
        update['system.shortRange'] = 'disadvantage';
        needsUpdate = true;
      }
      if (s.mediumRange === 'dice') {
        update['system.mediumRange'] = 'disadvantage';
        needsUpdate = true;
      }
      if (s.longRange === 'dice') {
        update['system.longRange'] = 'disadvantage';
        needsUpdate = true;
      }
      
      // Supprimer le flag de migration si présent
      if (s._rangeDiceToDisadvantageMigrationVersion) {
        update['system.-=_rangeDiceToDisadvantageMigrationVersion'] = null;
      }
      
      if (needsUpdate) {
        actorUpdates.push(update);
        console.log(`  ✓ ${item.name} (${actor.name})`);
        totalFixed++;
      }
    }
    
    if (actorUpdates.length > 0) {
      await actor.updateEmbeddedDocuments('Item', actorUpdates);
    }
  }
  
  console.log(`\n=== TERMINÉ ===`);
  console.log(`Total d'items corrigés: ${totalFixed}`);
  
  if (totalFixed > 0) {
    ui.notifications.info(`✓ Correction terminée: ${totalFixed} item(s) converti(s) de "dice" vers "disadvantage"`, {permanent: true});
  } else {
    ui.notifications.info('Aucun item avec "dice" trouvé. Tout est déjà correct!');
  }
}

// Exécuter
forceFix();
```

## Instructions :

**Dans Foundry (F12 Console), exécutez :**

Copiez-collez tout le contenu du fichier `/home/half/repository/sra2/force-fix-ranges.js` dans la console et appuyez sur Entrée.

Cela va :
1. ✅ Supprimer le flag de migration de tous les items
2. ✅ Convertir toutes les valeurs "dice" → "disadvantage"
3. ✅ Afficher la liste des items corrigés
4. ✅ Mettre à jour à la fois les **items du monde** ET les **items des acteurs**

Le script affichera quelque chose comme :
```
✓ Correction terminée: X item(s) converti(s) de "dice" vers "disadvantage"
```

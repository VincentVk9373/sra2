# Fonctionnalité d'Attaque des NPC

## Description

Cette nouvelle fonctionnalité permet aux NPC d'attaquer en cliquant directement sur leur seuil (threshold) de compétence ou spécialisation.

## Comment Utiliser

### 1. Cibler un Token
Avant d'attaquer, vous devez sélectionner une ou plusieurs cibles en cliquant sur leur token avec la touche "T" ou en double-cliquant pour les cibler.

### 2. Cliquer sur le Seuil
Dans la fiche de NPC, les seuils (thresholds) des compétences et spécialisations sont maintenant cliquables. Ils apparaissent avec :
- Une couleur verte distinctive
- Un effet de survol (hover) qui les met en valeur
- Un curseur de type "pointer" pour indiquer qu'ils sont cliquables

### 3. Popup de Défense
Lorsque vous cliquez sur un seuil, une popup s'ouvre automatiquement pour permettre à la cible de se défendre :
- La popup affiche les informations de l'attaque (nom de la compétence et seuil du NPC)
- La cible peut choisir une compétence ou spécialisation pour se défendre
- Le système de jet complet est disponible avec :
  - Sélection du mode de jet (avantage/normal/désavantage)
  - Gestion des dés de risque
  - Gestion de la Réduction de Risque (RR)
  - Animation des dés si Dice So Nice est activé
- La cible peut aussi choisir "Aucune défense" pour encaisser l'attaque sans se défendre

### 4. Résultat du Combat
Après le jet de défense (ou si aucune défense n'est choisie), un message de résultat est posté dans le chat :
- Section Attaque : NPC attaquant, compétence utilisée, et seuil de l'attaque
- Section Défense : Défenseur, compétence utilisée, résultats des dés, succès obtenus, échecs critiques
- Comparaison : Le système compare automatiquement le seuil d'attaque aux succès de défense
  - Si Défense ≥ Attaque : "Défense réussie" avec la marge de succès
  - Si Attaque > Défense : "Attaque réussie" avec la marge de dommages

### 5. Pas de Cible Sélectionnée
Si aucune cible n'est sélectionnée, un message d'avertissement apparaîtra vous invitant à cibler un token avant d'attaquer.

## Calcul du Seuil

Le seuil (threshold) des NPC est calculé selon la formule :
```
Seuil = floor(Réserve de Dés / 3) + RR + 1
```

Où :
- **Réserve de Dés** = Attribut + Compétence (+ 2 pour les spécialisations)
- **RR** = Réduction de Risque totale (provenant des atouts actifs)

## Caractéristiques Visuelles

### Seuils Cliquables
- Background dégradé vert (#27ae60 → #229954)
- Ombre portée subtile
- Effet de survol avec translation et ombre agrandie
- Valeur du seuil en blanc, en gras, plus grande

### Message de Combat dans le Chat
Le système utilise **exactement les mêmes classes CSS et la même structure HTML** que les attaques des personnages joueurs :
- Classe principale : `sra2-combat-roll`
- En-tête avec résultat : `combat-outcome-header` (attack-success ou attack-failed)
- Section attaque : `attack-section`
- Section défense : `defense-section`
- Résultat final : `combat-result`
- Design parfaitement cohérent avec le système de combat existant

## Fichiers Modifiés

1. **Templates Handlebars** :
   - `public/templates/actor-npc-sheet.hbs`
   - `dist/templates/actor-npc-sheet.hbs`

2. **TypeScript** :
   - `src/module/applications/npc-sheet.ts` :
     - Ajout de `_onAttackThreshold()` - Gère le clic sur le seuil
     - Ajout de `_createAttackMessage()` - Crée le message de chat

3. **Styles SCSS** :
   - `src/styles/npc-sheet.scss` :
     - Styles pour `.skill-threshold.clickable`
     - Styles pour `.sra2-npc-attack`

4. **Traductions** :
   - `public/lang/fr.json` et `dist/lang/fr.json`
   - `public/lang/en.json` et `dist/lang/en.json`
   - Ajout de :
     - `SRA2.NPC.ATTACK_WITH_THRESHOLD`
     - `SRA2.NPC.NO_TARGET_SELECTED`
     - `SRA2.NPC.ATTACK_AGAINST`
     - `SRA2.NPC.TARGET_ARMOR_THRESHOLDS`
     - `SRA2.NPC.ATTACK_FLAVOR`

## Notes Techniques

- La fonctionnalité détecte automatiquement si c'est une compétence ou une spécialisation
- Supporte les attaques multiples (plusieurs cibles sélectionnées)
- **CSS Mutualisé** : Utilise exactement les mêmes classes CSS que les attaques des personnages joueurs
- Les méthodes `_buildDiceResultsHtml` et `_buildNPCAttackHtml` suivent la même structure
- Compatible avec Dice So Nice pour les animations de dés de la défense
- Structure HTML identique pour une cohérence parfaite

## Exemple d'Utilisation

1. Ouvrir la fiche d'un NPC
2. Cibler un personnage joueur (token)
3. Cliquer sur le seuil de la compétence "Combat" (par exemple : seuil 5)
4. Une popup s'ouvre pour le défenseur :
   - Le joueur choisit "Agilité + Esquive" pour se défendre
   - Il configure ses dés de risque et sa RR
   - Il lance les dés et obtient 6 succès
5. Un message de résultat apparaît dans le chat :
   - Attaque : Gobelin attaque avec Combat (Seuil : 5)
   - Défense : Héros se défend avec Esquive (6 succès)
   - Résultat : "Défense réussie ! La défense bat l'attaque de 1."

---

**Version** : 13.0.10+
**Date** : Novembre 2025


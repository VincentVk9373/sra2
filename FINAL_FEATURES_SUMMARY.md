# Résumé des Nouvelles Fonctionnalités de Combat

## Vue d'Ensemble

Ce document résume toutes les nouvelles fonctionnalités de combat implémentées pour le système SRA2.

## 1. Attaques des NPCs avec Seuils

### Fonctionnalité
Les NPCs peuvent attaquer en cliquant sur leur seuil de compétence/spécialisation.

### Utilisation
1. Cibler un token
2. Cliquer sur le seuil (vert) d'une compétence dans la fiche NPC
3. Popup de défense automatique pour la cible
4. Résultat de combat affiché dans le chat

### Caractéristiques
- Seuils cliquables avec effet visuel vert
- Support des compétences et spécialisations
- Attaques multiples si plusieurs cibles
- Calcul automatique : `floor(Dés / 3) + RR + 1`

## 2. Défense avec Choix : Seuil ou Dés

### Fonctionnalité
Tous les acteurs peuvent choisir entre utiliser leur seuil (rapide) ou lancer les dés (variabilité).

### Utilisation
Dans la popup de défense :
1. Sélectionner une compétence/spécialisation
2. **Choisir la méthode** :
   - ⚪ **Utiliser le seuil (rapide)** : Valeur fixe, pas de dés
   - ⚪ **Lancer les dés** : Jet complet avec RR, dés de risque, etc.
3. Cliquer sur "Se défendre"

### Caractéristiques
- Affichage double : `Combat (Seuil: 5 / 8 dés)`
- Choix disponible pour PCs ET NPCs
- Décision tactique à chaque défense
- **Seuil = Rapidité**, **Dés = Suspense**

## 3. Armes et Sorts Cliquables

### Fonctionnalité
Les noms des armes et sorts sont directement cliquables pour lancer des attaques.

### Utilisation
1. Dans la fiche de personnage, cliquer sur le **nom** d'une arme ou d'un sort
2. Sélectionner la compétence à utiliser
3. Configurer le jet (mode, dés de risque, RR)
4. Lancer l'attaque avec la VD de l'arme/sort

### Caractéristiques
- **Armes** : Effet rouge au survol
- **Sorts** : Effet violet au survol
- Zone cliquable plus grande que le bouton de dés
- Compatible avec toutes les armes (VD fixe, FOR, FOR+X, toxin)

## 4. Complications Stylisées

### Fonctionnalité
Les échecs critiques sont affichés avec des boîtes de complication visuellement distinctives.

### Niveaux de Complication
- **0 échecs** (après RR) : Vert - "Aucune complication" ✅
- **1 échec** : Orange - "Complication mineure" ⚠
- **2 échecs** : Rouge - "Complication critique" ⚠⚠
- **3+ échecs** : Noir/Rouge animé - "Désastre" 💀

### Caractéristiques
- Bordures colorées et ombrées
- Animations pour les complications graves
- Affichage du calcul RR si applicable
- Classes CSS : `minor-complication`, `critical-complication`, `disaster`, `reduced-to-zero`

## 5. Bouton Appliquer les Dégâts

### Fonctionnalité
Un bouton dans le chat permet d'appliquer automatiquement les dégâts au défenseur.

### Utilisation
1. Après un combat réussi, un bouton bleu apparaît
2. Texte : "❤️‍🩹 Appliquer les dégâts"
3. Cliquer sur le bouton
4. Les dégâts sont automatiquement appliqués aux bonnes cases de blessure

### Système d'Application
Le système applique intelligemment les dégâts selon les seuils d'armure :
- **Dégâts ≥ Seuil Sévère** → Blessure incapacitante
- **Dégâts ≥ Seuil Modéré** → Blessure grave (avec overflow vers incapacitante si pleine)
- **Dégâts ≥ Seuil Léger** → Blessure légère (avec overflow vers grave si pleine)
- **Dégâts < Seuil Léger** → Aucune blessure

### Notes
- Fonctionne pour PCs et NPCs (attaquants ou défenseurs)
- Gère automatiquement les overflows
- Notifications visuelles pour les blessures appliquées
- Méthode `CharacterSheet.applyDamage()` appelée via hook global

## Structure des Messages de Combat

Tous les messages de combat utilisent la **même structure HTML** :

```html
<div class="sra2-combat-roll">
  <!-- Header avec résultat (Attaque Réussie / Ratée) -->
  <div class="combat-outcome-header attack-success|attack-failed">
    <div class="outcome-icon">...</div>
    <div class="outcome-text">...</div>
  </div>
  
  <!-- Section Attaque -->
  <div class="attack-section">
    <h3>Attaque: ...</h3>
    <!-- Dés / Seuil -->
    <!-- Succès totaux -->
  </div>
  
  <!-- Section Défense -->
  <div class="defense-section">
    <h3>Défense: ...</h3>
    <!-- Dés / Seuil -->
    <!-- Succès totaux -->
    <!-- Complications (si échecs critiques) -->
  </div>
  
  <!-- Résultat Final -->
  <div class="combat-result">
    <div class="final-damage-value">
      <div class="damage-label">Dégâts : X</div>
      <div class="calculation">Calcul...</div>
      <button class="apply-damage-btn">...</button>
    </div>
  </div>
</div>
```

## Compatibilité Complète

| Attaquant | Défenseur | Méthode Attaque | Méthode Défense | Support |
|-----------|-----------|-----------------|-----------------|---------|
| PC | PC | Dés | Seuil ou Dés | ✅ |
| PC | NPC | Dés | Seuil ou Dés | ✅ |
| NPC | PC | Seuil | Seuil ou Dés | ✅ |
| NPC | NPC | Seuil | Seuil ou Dés | ✅ |

## Fichiers Modifiés - Récapitulatif

### TypeScript
- `src/module/applications/character-sheet.ts` :
  - `_promptDefenseRoll()` : Choix seuil/dés
  - `_calculateNPCThreshold()` : Calcul seuils
  - `_defendWithThreshold()` : Défense par seuil
  - `_buildDiceResultsHtml()` : Complications stylisées
- `src/module/applications/npc-sheet.ts` :
  - `_onAttackThreshold()` : Attaques NPC
  - `_promptDefenseRollForNPC()` : Défense depuis NPC
  - `_rollDefenseAgainstNPC()` : Jet de défense
  - `_performDefenseRoll()` : Exécution du jet
  - `_displayNPCAttackResult()` : Affichage avec bouton dégâts
  - `_buildNPCAttackHtml()` : Affichage seuil
  - `_buildDiceResultsHtml()` : Complications stylisées
- `src/module/sra2-system.ts` :
  - Hook `renderChatMessage` : Gestion du bouton appliquer dégâts

### Templates
- `public/templates/actor-character-sheet.hbs` :
  - Armes/sorts cliquables (classes `weapon-name-clickable`, `spell-name-clickable`)
- `public/templates/actor-npc-sheet.hbs` :
  - Seuils cliquables (classe `clickable`, data-action)

### Styles
- `src/styles/character-sheet.scss` :
  - Styles pour armes/sorts cliquables
- `src/styles/npc-sheet.scss` :
  - Styles pour seuils cliquables
  - Style threshold-badge
- `src/styles/global.scss` :
  - Complications (minor-complication, critical-complication, disaster, reduced-to-zero)
  - Déjà existant, réutilisé

### Traductions
- `public/lang/fr.json` et `public/lang/en.json` :
  - NPC.ATTACK_WITH_THRESHOLD
  - NPC.NO_TARGET_SELECTED
  - COMBAT.DEFENSE_METHOD
  - COMBAT.USE_THRESHOLD
  - COMBAT.ROLL_DICE
  - COMBAT.COMPLICATION
  - COMBAT.DEFENSE_SUCCESS
  - COMBAT.COMBAT_RESULT
  - COMBAT.NO_DEFENSE_ROLLED
  - WEAPON.CLICK_TO_ROLL
  - SPELL.CLICK_TO_ROLL
  - ... et beaucoup d'autres

## Améliorations UX

1. **Zones Cliquables Agrandies**
   - Noms d'armes/sorts : Toute la zone du nom
   - Seuils NPCs : Badge vert entier
   - Meilleure accessibilité

2. **Feedback Visuel**
   - Survol : Changement de couleur, ombre, translation
   - Clic : Animation de pression
   - Curseur pointer pour indiquer l'interactivité

3. **Cohérence Visuelle**
   - Mêmes classes CSS partout
   - Mêmes couleurs (vert = seuil, rouge = arme, violet = sort)
   - Structure HTML identique pour tous les combats

4. **Automatisation**
   - Calcul automatique des dégâts
   - Application des dégâts en un clic
   - Gestion intelligente des overflows de blessures

## Cas d'Usage Typiques

### Combat Rapide (NPC mineur)
1. NPC attaque : Clic sur seuil
2. PC défend : Choix "Utiliser le seuil"
3. Résultat instantané
4. Application des dégâts en un clic
⏱ **~10 secondes**

### Combat Important (Boss)
1. PC attaque : Clic sur arme
2. Configuration complète (RR, risque, mode)
3. NPC défend : Choix "Lancer les dés"
4. Suspense avec animations
5. Complications potentielles
⏱ **~1 minute** mais beaucoup plus immersif

### Combat Mixte
- Combats mineurs : Seuils
- Moments cruciaux : Dés
- Flexibilité totale selon le contexte

## Avantages du Système

1. **Rapidité** : Seuils pour aller vite
2. **Profondeur** : Dés pour les moments importants
3. **Équité** : Même système pour tous
4. **Clarté** : Visuels distinctifs et cohérents
5. **Automatisation** : Calculs et applications automatiques
6. **Flexibilité** : Choix à chaque jet

---

**Version** : 13.0.10+
**Date** : Novembre 2025
**Développé par** : Half



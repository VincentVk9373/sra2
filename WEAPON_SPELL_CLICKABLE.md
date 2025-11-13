# Armes et Sorts Cliquables

## Description

Les noms des armes et sorts dans la fiche de personnage sont maintenant **directement cliquables** pour lancer des attaques rapides. Cette fonctionnalité facilite l'utilisation des armes et sorts en permettant de cliquer directement sur leur nom au lieu d'utiliser uniquement le petit bouton de dés.

## Fonctionnement

### 1. Armes Cliquables
Dans les sections "Armes" de la fiche de personnage :
- Le **nom de l'arme** est maintenant cliquable
- Au survol, le nom se colore en **rouge** avec un effet de glissement
- Un clic sur le nom déclenche immédiatement le processus d'attaque

### 2. Sorts Cliquables
Dans les sections "Sorts" de la fiche de personnage :
- Le **nom du sort** est maintenant cliquable
- Au survol, le nom se colore en **violet** avec un effet de glissement
- Un clic sur le nom déclenche immédiatement le processus de lancement

### 3. Processus d'Attaque/Lancement
Quand vous cliquez sur un nom d'arme ou de sort :
1. **Popup de sélection de compétence** :
   - Choisissez quelle compétence/spécialisation utiliser
   - Affiche le pool de dés de chaque option
2. **Popup de configuration du jet** :
   - Mode de jet (avantage/normal/désavantage)
   - Sélection des dés de risque
   - Gestion de la Réduction de Risque (RR)
3. **Jet d'attaque avec défense** :
   - Le système lance automatiquement une attaque
   - Si une cible est sélectionnée, popup de défense automatique
   - Calcul des dégâts avec la VD de l'arme/sort

## Sections Concernées

### Armes (type "weapon")
- Section "Armes" de la fiche de personnage
- Noms d'armes avec classe `weapon-name-clickable`
- Couleur de survol : Rouge (#e74c3c)

### Sorts (type "spell")
- Section "Sorts" de la fiche de personnage
- Noms de sorts avec classe `spell-name-clickable`
- Couleur de survol : Violet (#9b59b6)

### Armes & Sorts (type "weapons-spells" - ancien type)
- Section "Armes & Sorts" (ancien système)
- Même fonctionnalité que les armes
- Couleur de survol : Rouge (#e74c3c)

## Caractéristiques Visuelles

### Effet de Survol
```css
- Cursor: pointer
- Background: Dégradé rouge/violet selon le type
- Transform: translateX(3px) - glisse vers la droite
- Box-shadow: Ombre colorée pour effet de profondeur
- Color: Texte blanc
- Badges (RR, bonus): Texte semi-transparent blanc
```

### Bouton de Dés (existant)
- Le petit bouton de dés (`<i class="fas fa-dice-d6"></i>`) reste fonctionnel
- Les deux méthodes (clic sur nom ou clic sur bouton) déclenchent la même action
- Flexibilité maximale pour l'utilisateur

## Avantages

1. **Accessibilité** : Zone cliquable beaucoup plus grande
2. **Rapidité** : Pas besoin de viser le petit bouton de dés
3. **Intuitivité** : Le nom de l'arme/sort invite naturellement au clic
4. **Feedback visuel** : Effet de survol clair et attractif
5. **Compatibilité** : Le bouton de dés existant reste fonctionnel

## Valeur de Dégâts (VD)

Les armes et sorts peuvent avoir différents types de VD :
- **Numérique** : `3`, `5`, `7`, etc.
- **Basé sur FOR** : `FOR`, `FOR+1`, `FOR+2`
- **Toxine** : `toxin` (pour grenades à gaz, etc.)

Le système gère automatiquement :
- Le calcul de la FOR du personnage
- L'ajout des modificateurs
- L'affichage dans le résultat de combat
- Le calcul final des dégâts (VD + succès nets)

## Exemples d'Utilisation

### Exemple 1 : Arme de mêlée
1. Cliquer sur "Katana" (FOR+2)
2. Sélectionner "Combat rapproché"
3. Configurer les dés de risque
4. Lancer l'attaque
5. Le système affiche VD: FOR+2 (8 si FOR=6)
6. Si 4 succès nets → Dégâts totaux = 8 + 4 = 12

### Exemple 2 : Sort de combat
1. Cliquer sur "Boule de feu" (VD: 6)
2. Sélectionner "Sorcellerie"
3. Lancer le sort
4. Si 3 succès nets → Dégâts totaux = 6 + 3 = 9

### Exemple 3 : Arme à feu
1. Cliquer sur "Ares Predator" (VD: 5)
2. Sélectionner "Armes à feu"
3. Lancer l'attaque
4. Popup de défense pour la cible
5. Calcul automatique des dégâts finaux

## Fichiers Modifiés

1. **Templates Handlebars** :
   - `public/templates/actor-character-sheet.hbs`
   - `dist/templates/actor-character-sheet.hbs`
   - Ajout de classes `weapon-name-clickable` et `spell-name-clickable`
   - Ajout d'attributs `data-action` sur les noms

2. **Styles SCSS** :
   - `src/styles/character-sheet.scss`
   - Styles pour `.weapon-name-clickable` et `.spell-name-clickable`
   - Effets de survol rouge pour armes, violet pour sorts

3. **Traductions** :
   - `public/lang/fr.json` et `dist/lang/fr.json`
   - `public/lang/en.json` et `dist/lang/en.json`
   - Ajout de `SRA2.FEATS.WEAPON.CLICK_TO_ROLL`
   - Ajout de `SRA2.FEATS.SPELL.CLICK_TO_ROLL`

## Notes Techniques

- Les gestionnaires d'événements existants sont réutilisés :
  - `_onRollWeapon()` pour les armes
  - `_onRollSpell()` pour les sorts
  - `_onRollWeaponSpell()` pour les armes/sorts (ancien type)
- Le système d'attaque complet `_rollAttackWithDefense()` est déclenché
- Compatible avec tout le système de combat existant
- Pas de duplication de code, juste ajout de zones cliquables

## Compatibilité

- ✅ Fonctionne avec toutes les armes (mêlée, distance)
- ✅ Fonctionne avec tous les sorts
- ✅ Compatible avec le système de défense (seuil ou dés)
- ✅ Compatible avec les NPCs et PCs
- ✅ Support de Dice So Nice
- ✅ Calcul automatique des dégâts avec VD

---

**Version** : 13.0.10+
**Date** : Novembre 2025


# Armes et Sorts pour NPCs

## Description

Les NPCs peuvent maintenant avoir une section dédiée **Armes et Sorts** en haut de leur fiche, permettant de lancer des attaques avec des Valeurs de Dégâts (VD) exactement comme les personnages joueurs.

## Fonctionnement

### 1. Section Armes et Sorts
Une nouvelle section apparaît en haut de la fiche NPC (juste après le header) si le NPC possède des armes ou des sorts :
- **Fond beige/orange** avec bordure dorée
- Divisée en deux sous-sections :
  - 🗡 **Armes** : Toutes les armes du NPC
  - 🪄 **Sorts** : Tous les sorts du NPC

### 2. Affichage des Armes/Sorts (Format Grille)
Les armes et sorts utilisent **exactement le même format** que les compétences :

**En-tête de colonnes** :
- Nom | VD | Dés | RR | Seuil | Actions

**Chaque ligne affiche** :
- **Image + Nom** : Icône (28x28px) et nom de l'arme/sort
- **VD** : Valeur de dégât en rouge (FOR, FOR+X, numérique, toxin)
- **Dés** : Pool de dés cliquable avec icône 🎲
- **RR** : Réduction de risque totale
- **Seuil** : Seuil cliquable (badge vert)
- **Actions** : Boutons éditer/supprimer

### 3. Deux Méthodes d'Attaque

**A. Cliquer sur le Seuil (Rapide)**
1. Cibler une ou plusieurs cibles
2. Cliquer sur le **seuil** (badge vert)
3. Popup de défense immédiate pour la cible
4. Calcul automatique : **VD + (Seuil - Défense)**

**B. Cliquer sur les Dés (Jet complet)**
1. Cibler une ou plusieurs cibles
2. Cliquer sur le **pool de dés** (icône 🎲)
3. Popup de sélection de compétence
4. Popup de configuration du jet (RR, dés de risque, mode)
5. Lance les dés avec Dice So Nice
6. Popup de défense pour la cible
7. Calcul automatique : **VD + (Succès - Défense)**

## Calcul des Dégâts

### Formule Complète
```
Dégâts Finaux = VD + (Succès Attaque - Succès Défense)
```

### Exemple
- NPC Orc attaque avec "Hache de guerre" (VD: FOR+2)
- FOR de l'Orc = 5 → VD = 7
- Compétence "Combat" : Seuil = 6
- Défense : 3 succès
- **Dégâts Finaux** = 7 (VD) + (6 - 3) = **10**

### Support des VD Spéciaux
Le système gère automatiquement :
- **FOR** : Utilise la Force du NPC
- **FOR+1**, **FOR+2** : Force + modificateur
- **Numérique** : 3, 5, 7, 10, etc.
- **toxin** : Indique "selon toxine" (VD non calculé)

## Affichage dans le Chat

### Message de Combat Complet
Le résultat affiché inclut :

**Section Attaque** :
- Nom de l'arme/sort et compétence utilisée
- Seuil : Badge vert
- Succès totaux : Valeur du seuil
- **VD : Valeur affichée** (ex: "FOR+2 (7)")

**Section Défense** :
- Compétence de défense
- Soit seuil (badge vert) soit dés affichés
- Succès totaux
- Complications si échecs critiques

**Résultat Final** :
- **ATTAQUE RÉUSSIE** ou **ATTAQUE RATÉE** (header)
- Dégâts finaux = VD + succès nets
- Calcul détaillé : "7 VD + 6 succès attaque - 3 succès défense"
- **Bouton "Appliquer les dégâts"** pour application automatique

## Caractéristiques Visuelles

### Section Armes et Sorts
- Background dégradé beige/orange (#fff9e6 → #fff3cc)
- Bordure orange (#f39c12)
- En-tête orange foncé (#d35400) pour se distinguer des compétences (bleu)
- Format grille avec 6 colonnes : `1fr 60px 80px 60px 80px 60px`

### Colonnes Cliquables
- **Pool de Dés** : Icône 🎲, effet de survol, lance un jet complet
- **Seuil** : Badge vert, effet de survol, attaque immédiate

### VD Affiché
- Couleur rouge (#e74c3c)
- Taille 0.9rem
- Police en gras
- Aligné au centre dans sa colonne

## Filtrage des Atouts

Les atouts sont maintenant séparés intelligemment :
- **Armes** : `featType === 'weapon'` ou `'weapons-spells'`
- **Sorts** : `featType === 'spell'`
- **Autres Atouts** : Tous les autres types (affichés en bas)

Cette séparation évite la duplication et met en avant les capacités offensives du NPC.

## Fichiers Modifiés

### TypeScript
- `src/module/applications/npc-sheet.ts` :
  - `getData()` : Séparation des weapons, spells, et autres feats
  - `_onRollNPCWeapon()` : Gestionnaire de clic sur arme
  - `_onRollNPCSpell()` : Gestionnaire de clic sur sort
  - `_rollNPCWeaponOrSpell()` : Popup de sélection de compétence
  - `_attackWithNPCWeapon()` : Lancement de l'attaque
  - `_promptDefenseRollWithVD()` : Popup de défense avec VD
  - `_defendWithThresholdAgainstWeapon()` : Défense par seuil contre arme
  - `_rollDefenseAgainstNPCWeapon()` : Défense par dés contre arme
  - `_displayNPCWeaponAttackResult()` : Affichage résultat avec VD et bouton dégâts
  - `_buildNPCAttackHtmlWithVD()` : Construction HTML avec VD

### Templates
- `public/templates/actor-npc-sheet.hbs` :
  - Nouvelle section `weapons-spells-section`
  - Itération sur `{{weapons}}` et `{{spells}}`
  - Boutons cliquables avec data-action

### Styles
- `src/styles/npc-sheet.scss` :
  - `.weapons-spells-section` : Conteneur principal
  - `.weapon-item`, `.spell-item` : Cartes individuelles
  - `.weapon-header`, `.spell-header` : Zones cliquables
  - `.weapon-vd`, `.spell-vd` : Affichage VD
  - Effets de survol rouge/violet

### Traductions
- FR : `ATTACK_WITH_WEAPON`, `CAST_SPELL`, `ATTACK`, `SECTION.WEAPONS_SPELLS`
- EN : `ATTACK_WITH_WEAPON`, `CAST_SPELL`, `ATTACK`, `SECTION.WEAPONS_SPELLS`

## Avantages

1. **Visibilité** : Armes et sorts en haut, facilement accessibles
2. **Organisation** : Séparation claire entre capacités offensives et autres atouts
3. **Cohérence** : Même système de VD que les PCs
4. **Automatisation** : Calcul automatique VD + succès nets
5. **Application** : Bouton pour appliquer les dégâts en un clic

## Cas d'Usage

### NPC Guerrier
- Armes : "Épée longue" (FOR+2), "Arc" (FOR+1)
- Section visible en haut
- Un clic → Sélection compétence → Attaque avec VD

### NPC Mage
- Sorts : "Boule de feu" (VD: 6), "Éclair" (VD: 5)
- Section visible en haut
- Couleur violette au survol
- Un clic → Sélection "Sorcellerie" → Attaque magique

### NPC Hybride
- Armes ET Sorts dans la même section
- Sous-sections séparées pour clarté
- Toutes cliquables avec leurs VD respectives

## Compatibilité

✅ Compatible avec tous les types de VD (FOR, FOR+X, numérique, toxin)
✅ Compatible avec le système de défense (seuil ou dés)
✅ Compatible avec les complications (affichage stylisé)
✅ Compatible avec le bouton "Appliquer les dégâts"
✅ Compatible avec Dice So Nice (pour les défenses par dés)

## Notes Techniques

- Les armes de type `weapons-spells` (ancien type) sont incluses dans la section armes
- Le filtre exclut ces armes/sorts de la section "Autres Atouts" en bas
- La VD du NPC (Force) est utilisée pour les calculs FOR/FOR+X
- Structure HTML identique au character-sheet pour cohérence
- Classes CSS mutualisées avec le reste du système

---

**Version** : 13.0.10+
**Date** : Novembre 2025


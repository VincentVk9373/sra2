# Deux vues pour les Personnages SRA2

## Vue d'ensemble

Les acteurs de type **"Personnage"** (character) peuvent maintenant être affichés avec **deux feuilles différentes** :

1. **Feuille PC (Personnage Joueur)** - Vue complète avec tous les détails
2. **Feuille NPC** - Vue simplifiée pour les PNJ

**Important** : Il n'y a qu'un seul type d'acteur. Les deux feuilles utilisent exactement les mêmes données, seul l'affichage change.

## Comment basculer entre les deux vues ?

### Dans FoundryVTT

1. Ouvrez la fiche d'un personnage
2. En haut à gauche de la fenêtre, cliquez sur l'icône de la feuille 📄
3. Sélectionnez la vue souhaitée :
   - **"Feuille de Personnage SRA2"** → Vue PC complète
   - **"Feuille de PNJ SRA2"** → Vue NPC simplifiée

Vous pouvez basculer à tout moment entre les deux vues sans perdre aucune donnée !

## Différences entre les deux vues

### 🎭 Feuille PC (Personnage Joueur)
**Vue complète pour les joueurs**

- ✅ Identité (Métatype, Mots-clés, Comportements, Répliques)
- ✅ Attributs détaillés avec coûts
- ✅ Ressources (Yens, Anarchy, Essence, Narrations)
- ✅ Combat (Armure, Dégâts, Seuils)
- ✅ Compétences avec lancers de dés
- ✅ Atouts complets avec toutes les options

### 🎯 Feuille NPC (Vue simplifiée)
**Vue épurée pour les PNJ**

Affichage dans l'ordre :
1. **Attributs** (Force, Agilité, Volonté, Logique, Charisme)
2. **Combat** (Santé, Armure)
3. **Compétences** (avec seuils calculés automatiquement)
4. **Atouts** (liste simplifiée)

#### Calcul des seuils NPC

Les PNJ ne lancent pas de dés. Ils ont des **seuils prédéfinis** calculés automatiquement :

```
Seuil = floor(Nombre de dés / 3) + Niveau de RR + 1
```

Où :
- **Nombre de dés** = Attribut + Compétence (+2 pour spécialisations)
- **Niveau de RR** = Réduction de Risque totale des atouts actifs

## Cas d'usage recommandés

### Utiliser la Feuille PC pour :
- Les personnages des joueurs
- Les PNJ récurrents importants
- Les adversaires avec historique détaillé
- La création de personnages

### Utiliser la Feuille NPC pour :
- Les PNJ de passage
- Les adversaires de combat rapide
- Les figurants
- La gestion de masse (plusieurs PNJ)
- Le jeu au MJ (référence rapide)

## Exemples de seuils NPC

### Garde de sécurité
- Force 3, Combat à mains nues 2, RR 1
- **Seuil** : floor((3+2)/3) + 1 + 1 = **3**

### Samouraï de rue
- Agilité 4, Armes blanches 3, RR 2
- **Seuil** : floor((4+3)/3) + 2 + 1 = **5**

### Decker expert
- Logique 5, Piratage 3, Spé "Systèmes corps" (+2), RR 1
- **Seuil** : floor((5+3+2)/3) + 1 + 1 = **5**

## Notes techniques

- **Aucune donnée n'est perdue** lors du changement de vue
- Les deux feuilles lisent et écrivent dans le même modèle de données (CharacterDataModel)
- Vous pouvez créer un personnage en vue PC et le visualiser en vue NPC
- Les seuils NPC sont recalculés dynamiquement à chaque ouverture de la feuille
- La vue par défaut est la Feuille PC

## Conversion PC ↔ NPC

**Il n'y a pas de "conversion" à proprement parler.** C'est simplement un changement de présentation visuelle.

Tous les champs sont conservés même en vue NPC :
- Les mots-clés, comportements et répliques restent dans les données
- L'anarchy et les narrations sont toujours calculées
- Les ressources (yens, essence) sont préservées
- Seul l'affichage est simplifié

Vous pouvez donc :
1. Créer un PNJ en vue NPC (rapide)
2. Le basculer en vue PC pour ajouter plus de détails
3. Revenir en vue NPC pour le jeu

## Architecture

### Fichiers impliqués
- Template PC : `templates/actor-character-sheet.hbs`
- Template NPC : `templates/actor-npc-sheet.hbs`
- Logique PC : `src/module/applications/character-sheet.ts`
- Logique NPC : `src/module/applications/npc-sheet.ts`
- Modèle commun : `src/module/models/actor-character.ts`

Les deux feuilles partagent le même `CharacterDataModel`.

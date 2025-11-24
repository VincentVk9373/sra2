# Choix de Défense : Seuil ou Dés

## Description

Tous les acteurs (PCs et NPCs) peuvent maintenant choisir leur méthode de défense :
- **Utiliser le seuil** : Valeur fixe et rapide (pas de jet de dés)
- **Lancer les dés** : Jet normal avec tous les paramètres (RR, dés de risque, modes)

La popup de défense affiche **toujours** les deux valeurs (seuil ET pool de dés) pour chaque compétence, permettant au joueur ou MJ de choisir la méthode en fonction de la situation.

## Comment Utiliser

### 1. Attaquer un NPC avec un PC
- Un PC lance une attaque (depuis sa fiche de personnage)
- Le PC cible un NPC (avec un token NPC)
- L'attaque est lancée normalement avec les dés

### 2. Popup de Défense
Après l'attaque, une popup s'ouvre automatiquement pour la défense :
- La popup affiche **TOUTES** les compétences avec **à la fois** leur seuil ET leur pool de dés
- Format : `Nom de compétence (Seuil: X / Y dés)`
- Exemple : `Combat rapproché (Seuil: 5 / 8 dés)`, `Esquive (Seuil: 6 / 10 dés)`

### 3. Choix de la Méthode de Défense
Le MJ (ou le joueur) doit faire **DEUX choix** :

**A. Sélectionner une compétence/spécialisation**
- Liste déroulante avec toutes les compétences disponibles
- Chaque option affiche le seuil ET le pool de dés

**B. Choisir la méthode de défense**
- **"Utiliser le seuil (rapide)"** : Utilise la valeur de seuil fixe (pas de dés)
- **"Lancer les dés"** : Lance le pool de dés normalement avec tous les paramètres (RR, dés de risque, mode de jet)

Cette flexibilité permet :
- Vitesse : Utiliser le seuil pour accélérer le jeu
- Variabilité : Lancer les dés pour plus d'incertitude et de suspense
- Choix tactique : Décider au cas par cas selon la situation

### 4. Résultat du Combat
Le système affiche un message de combat complet :
- Section Attaque : PC attaquant, dés lancés, succès obtenus
- Section Défense : Défenseur, compétence, **soit seuil soit résultat des dés** selon le choix
  - Si seuil choisi : Badge vert avec la valeur du seuil, pas de dés affichés
  - Si dés choisis : Dés affichés normalement avec succès et échecs critiques
- Comparaison automatique et calcul des dégâts

## Calcul du Seuil de Défense

Le seuil de défense d'un NPC est calculé exactement comme pour une attaque :

```
Seuil = floor(Réserve de Dés / 3) + RR + 1
```

Où :
- **Réserve de Dés** = Attribut + Compétence (+ 2 pour les spécialisations)
- **RR** = Réduction de Risque totale (provenant des atouts actifs)
  - RR de compétence
  - RR d'attribut
  - RR de spécialisation (si applicable)
  - RR héritée du skill parent (pour les spécialisations)

### Exemple de Calcul

NPC Gobelin avec :
- Agilité: 3
- Esquive: 2
- Atout "Réflexes rapides" donnant +1 RR sur Agilité

Calcul :
1. Pool de dés = 3 (Agilité) + 2 (Esquive) = 5 dés
2. RR = 1 (de l'atout)
3. Seuil = floor(5/3) + 1 + 1 = 1 + 1 + 1 = **3**

## Flexibilité Universelle

Le système affiche **TOUJOURS** les deux options (seuil ET dés) pour **TOUS** les acteurs :
- **PC** : Peut choisir d'utiliser son seuil calculé OU lancer ses dés
- **NPC** : Peut choisir d'utiliser son seuil calculé OU lancer ses dés
- Le joueur/MJ décide à chaque défense quelle méthode utiliser

Cette approche offre :
- **Rapidité** : Seuils pour les combats rapides
- **Excitation** : Dés pour les moments cruciaux
- **Équité** : Même système pour PCs et NPCs

## Affichage dans le Chat

### Pour un NPC qui se défend
La section défense affiche :
- Nom du NPC et compétence utilisée
- **Seuil**: Badge vert avec la valeur (au lieu de dés)
- **Succès totaux**: Égal au seuil
- Pas de dés affichés, pas d'échecs critiques

### Structure HTML Identique
Le système utilise les mêmes classes CSS que les défenses normales :
- Classe principale : `sra2-combat-roll`
- Badge de seuil : `threshold-badge`
- Le reste de la structure est identique aux combats PC vs PC

## Fichiers Modifiés

1. **TypeScript** :
   - `src/module/applications/character-sheet.ts` :
     - `_promptDefenseRoll()` : Détection du type de défenseur et construction des options
     - `_calculateNPCThreshold()` : Calcul du seuil pour un NPC
     - `_defendWithThreshold()` : Gestion de la défense basée sur seuil
     - `_buildDiceResultsHtml()` : Affichage adapté pour les seuils

2. **Styles** :
   - Utilise les styles existants (`threshold-badge` déjà défini dans `npc-sheet.scss`)

## Caractéristiques Techniques

### Détection du Type d'Acteur
```typescript
const isNPC = defenderActor.sheet?.constructor?.name === 'NpcSheet';
```

### Objet de Résultat de Défense
Pour une défense basée sur seuil, un objet "fake" est créé :
```typescript
{
  skillName: 'Nom de la compétence',
  totalSuccesses: threshold, // Le seuil comme succès
  isThreshold: true, // Flag spécial
  normalDiceResults: '',
  riskDiceResults: '',
  // ... autres propriétés à 0
}
```

### Héritage de RR pour Spécialisations
Les spécialisations héritent du RR de leur compétence parente et de l'attribut lié, en plus de leur propre RR.

## Cas d'Usage

### Cas 1 : PC attaque NPC - Seuil utilisé
- PC obtient 6 succès
- NPC Gobelin choisit Esquive (Seuil: 3 / 8 dés)
- MJ choisit **"Utiliser le seuil"**
- Résultat : Attaque réussie, 3 dégâts nets (6 - 3)

### Cas 2 : PC attaque NPC - Dés lancés
- PC obtient 4 succès
- NPC Troll choisit Constitution (Seuil: 7 / 12 dés)
- MJ choisit **"Lancer les dés"** (pour plus de suspense)
- Troll lance 12 dés, obtient 5 succès
- Résultat : Attaque réussie, 0 dégât net (4 - 5 = 0, mais attaque passe quand même)

### Cas 3 : PC attaque PC - Choix du seuil
- PC1 obtient 8 succès
- PC2 choisit Esquive (Seuil: 6 / 9 dés)
- Joueur choisit **"Utiliser le seuil"** (pas envie de risquer)
- Résultat : Attaque réussie, 2 dégâts nets (8 - 6)

### Cas 4 : PC attaque PC - Jet de dés
- PC1 obtient 8 succès
- PC2 choisit Esquive (Seuil: 6 / 9 dés)
- Joueur choisit **"Lancer les dés"** (sentiment qu'il peut faire mieux)
- PC2 lance 9 dés, obtient 9 succès !
- Résultat : Défense réussie !

## Avantages

1. **Flexibilité Maximum** : Choix entre rapidité (seuil) et suspense (dés)
2. **Équité** : Même système pour tous les acteurs (PC et NPC)
3. **Choix Tactique** : Décision au cas par cas selon l'importance du moment
4. **Cohérence** : Même formule pour attaque et défense
5. **Compatible** : Fonctionne avec tous les combos PC/NPC
6. **Mutualisé** : Utilise les mêmes classes CSS et structure HTML

## Notes

- **Seuil** : Pas d'échecs critiques, pas de variabilité, prévisible
- **Dés** : Échecs critiques possibles, variabilité, suspense
- Le choix peut être différent à chaque défense
- Le MJ peut toujours choisir "Aucune défense"
- Compatible avec toutes les armes et tous les types d'attaque
- Les joueurs de PCs peuvent utiliser les seuils pour accélérer les combats mineurs
- Les MJs de NPCs peuvent lancer les dés pour les boss importants

---

**Version** : 13.0.10+
**Date** : Novembre 2025


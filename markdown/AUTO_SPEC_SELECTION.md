# Présélection automatique des spécialisations dans les jets d'attaque et de défense

## Vue d'ensemble

Cette fonctionnalité améliore l'expérience utilisateur en présélectionnant automatiquement la spécialisation ou compétence appropriée lors des jets d'attaque et de défense avec une arme.

## Modifications apportées

### 1. Jets d'attaque avec une arme

**Fichier modifié :** `src/module/applications/character-sheet.ts`

**Méthode modifiée :** `_rollWeaponOrSpell`

Lors du jet d'attaque avec une arme, le système :
1. Vérifie si l'arme a un champ `linkedAttackSpecialization` défini
2. Si oui, recherche cette spécialisation parmi celles du personnage
3. Présélectionne cette spécialisation dans le dialogue de sélection
4. Si aucune spécialisation n'est liée, présélectionne la première compétence disponible

```typescript
// Extrait du code
const linkedAttackSpecId = itemSystem.linkedAttackSpecialization || '';
let defaultSelection = '';

// Try to find the linked specialization
if (linkedAttackSpecId) {
  linkedSpec = allSpecializations.find((s: any) => s.id === linkedAttackSpecId);
  if (linkedSpec) {
    defaultSelection = `spec-${linkedSpec.id}`;
  }
}

// If no specialization found, use first skill as default
if (!defaultSelection && skills.length > 0) {
  defaultSelection = `skill-${skills[0].id}`;
}
```

### 2. Jets de défense contre une attaque

**Méthodes modifiées :**
- `_rollAttackWithDefense` : Ajout du paramètre `attackingWeapon`
- `_promptDefenseRoll` : Ajout du paramètre `attackingWeapon` et logique de présélection
- `_rollSkillWithWeapon` : Ajout du paramètre `weapon` et propagation
- `_rollSpecializationWithWeapon` : Ajout du paramètre `weapon` et propagation

Lors du jet de défense, le système :
1. Récupère l'arme utilisée par l'attaquant via les paramètres de méthode
2. Vérifie si l'arme a un champ `linkedDefenseSpecialization` défini
3. Si oui, recherche cette spécialisation parmi celles du défenseur
4. Présélectionne cette spécialisation dans le dialogue de défense
5. Si aucune spécialisation n'est liée, présélectionne la première compétence disponible

```typescript
// Extrait du code dans _promptDefenseRoll
const linkedDefenseSpecId = attackingWeapon?.system?.linkedDefenseSpecialization || '';
let defaultSelection = '';

// Try to find the linked defense specialization
if (linkedDefenseSpecId) {
  linkedSpec = allSpecializations.find((s: any) => s.id === linkedDefenseSpecId);
  if (linkedSpec) {
    defaultSelection = `spec-${linkedSpec.id}`;
  }
}

// If no specialization found, use first skill as default
if (!defaultSelection && skills.length > 0) {
  defaultSelection = `skill-${skills[0].id}`;
}
```

### 3. Propagation de l'information d'arme

Pour que le système de défense puisse accéder aux informations de l'arme attaquante :

**Chaîne d'appels modifiée :**
```
_rollWeaponOrSpell (item)
  → callback du dialogue
    → _rollSkillWithWeapon (weapon)
      → _rollAttackWithDefense (weapon)
        → _promptDefenseRoll (attackingWeapon)
```

Chaque méthode de la chaîne a été modifiée pour accepter et transmettre l'objet `weapon`/`attackingWeapon`.

## Comportement utilisateur

### Lors d'une attaque :

1. Le joueur clique sur "Attaquer" avec une arme
2. Le dialogue de sélection de compétence s'ouvre
3. **Si l'arme a une spécialisation d'attaque liée** : Cette spécialisation est automatiquement sélectionnée
4. **Sinon** : La première compétence de la liste est présélectionnée
5. Le joueur peut changer la sélection s'il le souhaite
6. Le joueur valide et le jet est effectué

### Lors d'une défense :

1. L'attaquant effectue son jet d'attaque avec une arme
2. Le dialogue de défense s'ouvre pour le défenseur
3. **Si l'arme attaquante a une spécialisation de défense liée ET que le défenseur possède cette spécialisation** : Cette spécialisation est automatiquement sélectionnée
4. **Sinon** : La première compétence de défense de la liste est présélectionnée
5. Le défenseur peut changer la sélection s'il le souhaite
6. Le défenseur valide et effectue son jet de défense

## Avantages

✅ **Gain de temps** : Moins de clics pour les joueurs  
✅ **Intuitivité** : Le système présélectionne la compétence/spécialisation la plus logique  
✅ **Flexibilité** : Les joueurs peuvent toujours changer la sélection  
✅ **Cohérence** : Utilise les informations de liaison déjà définies sur les armes  
✅ **Pas d'impact sur les anciennes armes** : Si aucune spécialisation n'est liée, le comportement par défaut s'applique  

## Cas d'usage

### Exemple 1 : Sniper avec arme de précision

- **Arme** : Fusil de sniper
- **Spécialisation d'attaque liée** : "Tir de précision"
- **Spécialisation de défense liée** : "Esquive"

Quand le sniper attaque :
- Le dialogue s'ouvre avec "Tir de précision" déjà sélectionnée
- Le joueur peut valider directement ou changer de compétence

Quand quelqu'un se défend contre le sniper :
- Le dialogue de défense s'ouvre avec "Esquive" présélectionnée (si le défenseur l'a)
- Le défenseur peut valider directement ou choisir une autre défense

### Exemple 2 : Combat au corps à corps

- **Arme** : Katana
- **Spécialisation d'attaque liée** : "Arts martiaux"
- **Spécialisation de défense liée** : "Parade"

Les deux personnages bénéficient de la présélection automatique pendant le combat.

## Limitations connues

⚠️ **Spécialisation non trouvée** : Si la spécialisation liée n'existe pas sur le personnage, le système revient au comportement par défaut (première compétence)

⚠️ **ID vs Nom** : Le système utilise les ID des spécialisations pour les lier. Si une spécialisation est supprimée puis recréée avec le même nom, il faudra re-lier l'arme

## Compatibilité

- **Version système** : 13.0.11+
- **Rétrocompatibilité** : Oui (les armes sans liaison fonctionnent normalement)
- **Fonctionne avec** : Personnages et PNJ

## Fichiers modifiés

1. `src/module/applications/character-sheet.ts` :
   - `_rollWeaponOrSpell` : Présélection d'attaque
   - `_promptDefenseRoll` : Présélection de défense
   - `_rollAttackWithDefense` : Propagation de l'arme
   - `_rollSkillWithWeapon` : Propagation de l'arme
   - `_rollSpecializationWithWeapon` : Propagation de l'arme

## Tests recommandés

1. ✅ Créer une arme avec une spécialisation d'attaque liée
2. ✅ Effectuer un jet d'attaque et vérifier la présélection
3. ✅ Créer une arme avec une spécialisation de défense liée
4. ✅ Effectuer un jet d'attaque et vérifier la présélection de défense
5. ✅ Tester avec une arme sans liaison (comportement par défaut)
6. ✅ Tester avec une spécialisation qui n'existe pas sur le personnage
7. ✅ Vérifier que le joueur peut changer la sélection manuellement

## Prochaines améliorations possibles

- Ajouter un indicateur visuel sur les options présélectionnées (icône ou couleur)
- Permettre de lier une compétence par défaut (en plus de la spécialisation)
- Mémoriser les préférences du joueur par arme
- Ajouter un raccourci clavier pour valider directement avec la présélection



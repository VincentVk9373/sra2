# Liaison de Spécialisations aux Armes

## Vue d'ensemble

Cette fonctionnalité permet de lier une spécialisation d'attaque et une spécialisation de défense à chaque arme du système SRA2. Cela permet aux joueurs de spécifier quelles spécialisations doivent être utilisées lors des jets d'attaque et de défense avec une arme particulière.

## Modifications apportées

### 1. Modèle de données (Data Model)

**Fichier modifié :** `src/module/models/item-feat.ts`

Ajout de deux nouveaux champs au modèle `FeatDataModel` :

```typescript
linkedAttackSpecialization: new fields.StringField({
  required: true,
  initial: "",
  label: "SRA2.FEATS.WEAPON.LINKED_ATTACK_SPECIALIZATION"
}),
linkedDefenseSpecialization: new fields.StringField({
  required: true,
  initial: "",
  label: "SRA2.FEATS.WEAPON.LINKED_DEFENSE_SPECIALIZATION"
})
```

Ces champs stockent l'ID de la spécialisation liée (ou une chaîne vide si aucune spécialisation n'est liée).

### 2. Template de la fiche d'arme

**Fichier modifié :** `public/templates/item-feat-sheet.hbs`

Ajout de deux sélecteurs de spécialisation dans la section "Weapon" de la fiche :

- **Spécialisation d'Attaque** : Utilisée lors des jets d'attaque avec cette arme
- **Spécialisation de Défense** : Utilisée lors des jets de défense contre cette arme

Les sélecteurs affichent toutes les spécialisations disponibles sur le personnage qui possède l'arme.

### 3. Application de la fiche d'arme

**Fichier modifié :** `src/module/applications/feat-sheet.ts`

Ajout de la méthode `_getAvailableSpecializations()` qui :
- Récupère toutes les spécialisations du personnage (priorité 1)
- Récupère toutes les spécialisations des items du monde (priorité 2)
- Élimine les doublons basés sur le nom
- Ajoute une indication de source ('actor' ou 'world') pour chaque spécialisation

Cette méthode est appelée dans `getData()` pour fournir la liste complète des spécialisations disponibles au template.

### 4. Traductions

**Fichier modifié :** `public/lang/fr.json`

Ajout des clés de traduction suivantes dans la section `WEAPON` :

```json
"LINKED_ATTACK_SPECIALIZATION": "Spécialisation d'Attaque",
"LINKED_ATTACK_SPECIALIZATION_HINT": "Spécialisation utilisée lors des jets d'attaque avec cette arme",
"LINKED_DEFENSE_SPECIALIZATION": "Spécialisation de Défense",
"LINKED_DEFENSE_SPECIALIZATION_HINT": "Spécialisation utilisée lors des jets de défense contre cette arme",
"NO_SPECIALIZATION": "Aucune spécialisation"
```

### 5. Migration de données

**Fichier créé :** `src/module/migration/migration-13.0.11.mjs`

Création d'une migration pour ajouter les nouveaux champs aux armes existantes :
- Parcourt tous les items de type `feat` avec `featType` égal à `weapon` ou `weapons-spells`
- Initialise les champs `linkedAttackSpecialization` et `linkedDefenseSpecialization` à une chaîne vide
- Marque les items comme migrés pour éviter les doublons

**Fichiers modifiés :**
- `src/module/sra2-system.ts` : Enregistrement de la migration
- `public/lang/fr.json` : Ajout du message de migration `13_0_11_INFO`

### 6. Version du système

**Fichier modifié :** `public/system.json`

Mise à jour de la version du système de `13.0.10` à `13.0.11`.

## Utilisation

### Pour les joueurs/MJs

1. **Créer une arme** : Créez ou modifiez un atout de type "Arme"
2. **Lier les spécialisations** :
   - Ouvrez la fiche de l'arme
   - Allez dans l'onglet "Arme"
   - Sélectionnez une spécialisation dans le menu déroulant "Spécialisation d'Attaque"
   - Sélectionnez une spécialisation dans le menu déroulant "Spécialisation de Défense"
   - Les modifications sont automatiquement sauvegardées

3. **Notes importantes** :
   - Les spécialisations peuvent provenir du personnage ou des items du monde
   - Les spécialisations du personnage apparaissent en premier dans la liste
   - Les spécialisations des items du monde sont marquées avec "(Items du monde)"
   - Si aucune spécialisation n'est sélectionnée, le champ reste vide (comportement par défaut)
   - Les doublons (même nom) sont automatiquement éliminés, avec priorité aux spécialisations du personnage

## Prochaines étapes possibles

Cette fonctionnalité pose les bases pour :
- Utiliser automatiquement la spécialisation liée lors des jets d'attaque
- Appliquer la spécialisation de défense lors des jets de défense
- Afficher les spécialisations liées dans l'interface du joueur
- Ajouter des bonus/malus basés sur les spécialisations

## Fichiers concernés

### Modifiés
1. `src/module/models/item-feat.ts`
2. `src/module/applications/feat-sheet.ts`
3. `src/module/sra2-system.ts`
4. `public/templates/item-feat-sheet.hbs`
5. `public/lang/fr.json`
6. `public/system.json`

### Créés
1. `src/module/migration/migration-13.0.11.mjs`

## Tests recommandés

1. ✅ Créer une nouvelle arme et vérifier que les champs de spécialisation sont présents
2. ✅ Lier une spécialisation d'attaque et vérifier que la sélection est sauvegardée
3. ✅ Lier une spécialisation de défense et vérifier que la sélection est sauvegardée
4. ✅ Vérifier que les armes existantes reçoivent les nouveaux champs lors de la migration
5. ✅ Vérifier que les sélecteurs n'affichent que les spécialisations du personnage
6. ⚠️ Vérifier que la désélection (remise à "Aucune spécialisation") fonctionne correctement

## Compatibilité

- **Version Foundry VTT** : 13+
- **Version système SRA2** : 13.0.11+
- **Rétrocompatibilité** : Oui (migration automatique des armes existantes)


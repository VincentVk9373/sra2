# Normalisation des Recherches

## Résumé des modifications

Toutes les recherches dans l'application ont été modifiées pour utiliser une normalisation qui :
1. Convertit le texte en minuscules (lowercase)
2. Supprime les accents et caractères diacritiques

Cela signifie que maintenant, une recherche comme "arme a feux" correspondra à "Arme à feux", "ARME À FEUX", etc.

## Fonction de normalisation

Une fonction utilitaire `normalizeSearchText()` a été créée :

```typescript
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}
```

Cette fonction :
- Convertit le texte en minuscules avec `.toLowerCase()`
- Décompose les caractères Unicode en forme normalisée (NFD) avec `.normalize('NFD')`
- Supprime les marques diacritiques (accents) avec `.replace(/[\u0300-\u036f]/g, '')`

## Fichiers modifiés

### 1. character-sheet.ts

**Recherche de compétences (skills)** :
- `_onSkillSearch()` : normalisation du terme de recherche
- `_performSkillSearch()` : normalisation des noms dans les world items et compendiums
- `_displaySkillSearchResults()` : normalisation pour vérifier les correspondances exactes

**Recherche de traits (feats)** :
- `_onFeatSearch()` : normalisation du terme de recherche
- `_performFeatSearch()` : normalisation des noms dans les world items et compendiums
- `_displayFeatSearchResults()` : normalisation pour vérifier les correspondances exactes

### 2. feat-sheet.ts

**Recherche de cibles RR (RR targets)** :
- `_onRRTargetSearch()` : normalisation du terme de recherche
- `_performRRTargetSearch()` : normalisation des noms dans les items de l'acteur, world items et compendiums

### 3. specialization-sheet.ts

**Recherche de compétences liées (linked skills)** :
- `_onSkillSearch()` : normalisation du terme de recherche
- `_performSkillSearch()` : normalisation des noms dans les world items et compendiums
- `_displaySkillSearchResults()` : normalisation pour vérifier les correspondances exactes

## Exemples d'utilisation

Maintenant, les recherches suivantes fonctionneront :

| Recherche | Correspondra à |
|-----------|----------------|
| "arme a feux" | "Arme à feux", "ARME À FEUX", "Arme À Feux" |
| "epee" | "Épée", "épée", "ÉPÉE" |
| "tir a l'arc" | "Tir à l'arc", "TIR À L'ARC" |
| "magie" | "Magie", "MAGIE" |

## Notes techniques

- La normalisation est appliquée de manière cohérente sur tous les types de recherche
- Les accents français (é, è, ê, à, ç, etc.) sont correctement gérés
- Les espaces et la ponctuation sont conservés (seuls les accents sont supprimés)
- La normalisation n'affecte pas le stockage des données, seulement la recherche


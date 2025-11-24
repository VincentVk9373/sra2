# Système de Settings de Thème UI

## ✅ Implémentation complète

Un système de settings a été créé pour gérer le thème de l'interface utilisateur, inspiré du système SR6.

## Fonctionnalités

### 1. Setting configurable

Un setting "Thème de l'Interface" est maintenant disponible dans les paramètres du système Foundry VTT, accessible via :
- **Menu** : Configuration → Paramètres du système → Shadowrun Anarchy 2
- **Option** : "Thème de l'Interface"

### 2. Thèmes disponibles

Trois thèmes sont disponibles (même si seul SRA2 est complètement implémenté pour l'instant) :

- **sra2** : Shadowrun Anarchy 2 (par défaut)
- **sr6** : Shadowrun 6
- **sr5** : Shadowrun 5

### 3. Application automatique

Le thème sélectionné est automatiquement :
- Appliqué au chargement du système
- Changé immédiatement lors de la modification du setting (pas besoin de recharger)
- Sauvegardé par client (chaque joueur peut avoir son propre thème)

## Code implémenté

### Méthodes ajoutées

**Dans `src/module/sra2-system.ts`** :

#### `registerThemeSetting()`
Enregistre le setting de thème dans Foundry VTT.

```typescript
registerThemeSetting(): void {
  game.settings.register(SYSTEM.id, 'uiTheme', {
    name: 'SRA2.SETTINGS.THEME.TITLE',
    hint: 'SRA2.SETTINGS.THEME.DESC',
    scope: 'client',
    config: true,
    type: String,
    choices: () => {
      return {
        'sra2': game.i18n.localize('SRA2.SETTINGS.THEME.SRA2'),
        'sr6': game.i18n.localize('SRA2.SETTINGS.THEME.SR6'),
        'sr5': game.i18n.localize('SRA2.SETTINGS.THEME.SR5'),
      };
    },
    default: 'sra2',
    onChange: (value: string) => {
      this.applyTheme(value);
    }
  });
}
```

#### `applyTheme(theme?: string)`
Applique le thème sélectionné au body element.

```typescript
applyTheme(theme?: string): void {
  if (!document.body) {
    console.warn(SYSTEM.LOG.HEAD + 'Cannot apply theme: document.body is not available');
    return;
  }

  // Get theme from setting if not provided
  if (!theme) {
    theme = game.settings.get(SYSTEM.id, 'uiTheme') as string || 'sra2';
  }

  // List of all possible theme classes
  const themeClasses = ['sr-theme-sra2', 'sr-theme-sr6', 'sr-theme-sr5'];

  // Remove all theme classes
  document.body.classList.remove(...themeClasses);

  // Add the selected theme class
  const themeClass = `sr-theme-${theme}`;
  document.body.classList.add(themeClass);

  console.log(SYSTEM.LOG.HEAD + `Applied theme: ${themeClass}`);
}
```

### Traductions ajoutées

**Dans `public/lang/fr.json` et `public/lang/en.json`** :

```json
"SETTINGS": {
    "THEME": {
        "TITLE": "Thème de l'Interface",
        "DESC": "Choisissez le thème visuel pour l'interface utilisateur du système.",
        "SRA2": "Shadowrun Anarchy 2",
        "SR6": "Shadowrun 6",
        "SR5": "Shadowrun 5"
    }
}
```

## Flux d'exécution

```
1. Système chargé
   ↓
2. onInit() appelé
   ↓
3. registerThemeSetting() enregistre le setting
   ↓
4. onReady() appelé
   ↓
5. applyTheme() applique le thème par défaut (sra2)
   ↓
6. Body obtient la classe "sr-theme-sra2"
   ↓
7. Les styles Less s'activent automatiquement
```

### Changement de thème

```
1. Utilisateur change le setting dans l'interface
   ↓
2. onChange() appelé avec la nouvelle valeur
   ↓
3. applyTheme(value) appelé
   ↓
4. Anciennes classes supprimées
   ↓
5. Nouvelle classe ajoutée
   ↓
6. Styles Less se mettent à jour instantanément
```

## Utilisation

### Pour l'utilisateur

1. Aller dans **Configuration** → **Paramètres du système** → **Shadowrun Anarchy 2**
2. Trouver l'option **"Thème de l'Interface"**
3. Sélectionner le thème désiré
4. Le changement s'applique immédiatement (pas besoin de recharger)

### Pour le développeur

Pour appliquer manuellement un thème :

```typescript
// Dans le code
const system = game.system.sra2 as SRA2System;
system.applyTheme('sra2');  // ou 'sr6', 'sr5'
```

Pour obtenir le thème actuel :

```typescript
const currentTheme = game.settings.get('sra2', 'uiTheme');
```

## Structure du body

Après application, le body aura la structure suivante :

```html
<body class="sr-theme-sra2 theme-dark">
  <!-- ou theme-light selon le thème Foundry -->
</body>
```

Les styles Less dans `base.less` utilisent le sélecteur :

```less
body[class^="sr-theme-"] {
  // Tous les styles s'appliquent ici
}
```

## Notes importantes

1. **Scope 'client'** : Chaque joueur peut avoir son propre thème préféré
2. **Pas de rechargement** : Le changement de thème est instantané grâce à `onChange`
3. **Par défaut** : Le thème par défaut est `sra2`
4. **Classes CSS** : Les classes suivantes peuvent être appliquées :
   - `sr-theme-sra2`
   - `sr-theme-sr6`
   - `sr-theme-sr5`

## Extension future

Pour ajouter un nouveau thème :

1. Créer le fichier de thème dans `src/less/themes/nouveau-theme.less`
2. L'importer dans `src/less/index.less` (optionnel)
3. Ajouter la traduction dans les fichiers de langue :
   ```json
   "SETTINGS": {
       "THEME": {
           "NOUVEAU": "Nouveau Thème"
       }
   }
   ```
4. Ajouter le choix dans `registerThemeSetting()` :
   ```typescript
   choices: () => {
     return {
       'sra2': game.i18n.localize('SRA2.SETTINGS.THEME.SRA2'),
       'nouveau': game.i18n.localize('SRA2.SETTINGS.THEME.NOUVEAU'),
       // ...
     };
   }
   ```
5. Ajouter la classe dans `applyTheme()` :
   ```typescript
   const themeClasses = ['sr-theme-sra2', 'sr-theme-nouveau', /* ... */];
   ```

## Dépannage

### Le thème ne s'applique pas

1. Vérifier dans la console : `[SRA2] Applied theme: sr-theme-sra2`
2. Vérifier que le body a bien la classe : `document.body.className`
3. Vérifier que le CSS Less est compilé et chargé
4. Recharger la page (F5)

### Le setting n'apparaît pas

1. Vérifier que le code a été compilé : `npm run build:public`
2. Vérifier que le système est bien chargé
3. Vérifier la console pour les erreurs

### Le changement ne s'applique pas immédiatement

1. Vérifier que `onChange` est bien défini dans le setting
2. Vérifier que `applyTheme()` est bien appelé dans `onChange`
3. Vérifier la console pour les erreurs


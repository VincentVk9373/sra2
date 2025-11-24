# Ajout de la classe `sr-theme-sra2` au body de Foundry VTT

## Ce qui a été fait

La classe `sr-theme-sra2` est maintenant **ajoutée automatiquement** à l'élément `<body>` de Foundry VTT lorsque le système sra2 est chargé.

## Implémentation

### Fichier modifié

**`src/module/sra2-system.ts`** - Méthode `onReady()`

```typescript
async onReady(): Promise<void> {
  console.log(SYSTEM.LOG.HEAD + 'SRA2System.onReady');
  
  // Add theme class to body element
  if (document.body) {
    document.body.classList.add('sr-theme-sra2');
    console.log(SYSTEM.LOG.HEAD + 'Added sr-theme-sra2 class to body element');
  }
  
  // ... reste du code
}
```

### Quand la classe est ajoutée

La classe est ajoutée lors du **hook `ready`** de Foundry VTT, qui est déclenché lorsque :
- Le DOM est complètement chargé
- Foundry VTT est initialisé
- Le système est prêt à être utilisé

C'est le moment idéal car :
- ✅ Le body est garanti d'exister
- ✅ Le système est complètement initialisé
- ✅ Les autres modules peuvent s'exécuter après

## Résultat

Après le chargement du système, le body aura la structure suivante :

```html
<body class="sr-theme-sra2 theme-dark">
  <!-- ... contenu Foundry VTT ... -->
</body>
```

Ou :

```html
<body class="sr-theme-sra2 theme-light">
  <!-- ... contenu Foundry VTT ... -->
</body>
```

## Activation des styles Less

Une fois la classe ajoutée, **tous les styles Less** définis dans `base.less` s'activent automatiquement :

```less
body[class^="sr-theme-"],
body[class*=" sr-theme-"] {
  // Tous les styles du thème SRA2 s'appliquent ici
  font-family: var(--sr-font-body);
  
  // ... tous les composants ...
}
```

Les styles sont appliqués parce que le sélecteur CSS `body[class^="sr-theme-"]` correspond à `body.sr-theme-sra2`.

## Vérification

Pour vérifier que la classe est bien ajoutée :

1. **Ouvrez la console du navigateur** (F12)
2. **Recherchez le message** : `[SRA2] Added sr-theme-sra2 class to body element`
3. **Inspectez le body** dans les outils de développement :
   ```javascript
   document.body.className  // Devrait contenir "sr-theme-sra2"
   ```

Ou utilisez le sélecteur CSS :
```css
body.sr-theme-sra2 {
  /* Les styles s'appliquent */
}
```

## Compatibilité

### Avec d'autres thèmes Foundry

La classe `sr-theme-sra2` est **ajoutée** à la liste des classes existantes, elle ne remplace pas les autres classes comme `theme-dark` ou `theme-light`.

### Si plusieurs systèmes sont chargés

Si d'autres systèmes ajoutent aussi des classes au body, elles coexistent sans problème :

```html
<body class="sr-theme-sra2 theme-dark other-system-class">
```

## Désactiver temporairement

Si vous voulez désactiver l'ajout de la classe (pour debug), commentez le code :

```typescript
// Add theme class to body element
// if (document.body) {
//   document.body.classList.add('sr-theme-sra2');
//   console.log(SYSTEM.LOG.HEAD + 'Added sr-theme-sra2 class to body element');
// }
```

## Alternative : Ajout plus tôt

Si vous avez besoin d'ajouter la classe **plus tôt** dans le cycle de vie (par exemple, avant le rendu de l'interface), vous pouvez l'ajouter dans `onInit()` :

```typescript
onInit(): void {
  console.log(SYSTEM.LOG.HEAD + 'SRA2System.onInit');
  
  // Add theme class early
  if (document.body) {
    document.body.classList.add('sr-theme-sra2');
  } else {
    // Si le body n'existe pas encore, attendre qu'il soit créé
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        document.body.classList.add('sr-theme-sra2');
      }
    });
  }
  
  // ... reste du code
}
```

**Note** : L'implémentation actuelle dans `onReady()` est recommandée car elle garantit que le body existe toujours.

## Après modification

Après avoir modifié le fichier, n'oubliez pas de :

1. **Compiler le projet** :
   ```bash
   npm run build:public
   ```

2. **Recharger Foundry VTT** (ou utiliser F5 dans le navigateur)

3. **Vérifier que la classe est présente** dans les outils de développement

## Dépannage

### La classe n'apparaît pas

1. Vérifiez la console pour les erreurs JavaScript
2. Vérifiez que le système sra2 est bien chargé
3. Vérifiez que `document.body` existe au moment de l'exécution
4. Recompilez le projet après modification

### Les styles ne s'appliquent pas

1. Vérifiez que la classe `sr-theme-sra2` est bien présente sur le body
2. Vérifiez que le CSS Less est bien compilé dans `public/style/sra2.css`
3. Vérifiez dans les outils de développement si les styles CSS sont bien chargés
4. Vérifiez que les variables CSS du thème sont définies (`--sr-ui-color`, etc.)


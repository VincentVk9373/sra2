# Guide d'utilisation de `base.less`

## Vue d'ensemble

Le fichier `base.less` est le **point central pour tous les styles d'interface utilisateur** du système. Il organise et charge tous les composants et mixins nécessaires pour le thème Shadowrun.

## Structure du fichier

### 1. Section 1 : Imports des mixins communs (lignes 1-6)

```less
@import "commons/button-mixin.less";
@import "commons/select-mixin.less";
@import "commons/input-mixin.less";
@import "commons/checkbox-mixin.less";
@import "commons/layout-mixin.less";
@import "commons/typography-mixin.less";
```

**Rôle** : Charge tous les **mixins réutilisables** qui définissent les styles de base pour :
- Les boutons (`.sr-button-base()`, `.sr-button-hover()`, etc.)
- Les sélecteurs (dropdowns, etc.)
- Les champs de saisie (inputs)
- Les cases à cocher (checkboxes)
- Les layouts (`.sr-block-boxed()`, `.sr-block-window()`, etc.)
- La typographie (titres, textes, etc.)

**Utilisation** : Ces mixins peuvent être utilisés dans les composants pour avoir un style cohérent.

### 2. Section 2 : Sélecteur global (lignes 8-13)

```less
body[class^="sr-theme-"],
body[class*=" sr-theme-"] {
  * {
    scrollbar-color: var(--sr-ui-scrollbar-thumb) var(--sr-ui-scrollbar-track);
  }
  font-family: var(--sr-font-body);
```

**Rôle** : Applique les styles globaux à **toute l'application** lorsque le body a une classe qui commence par `sr-theme-` ou contient ` sr-theme-`.

**Explications** :
- `body[class^="sr-theme-"]` : sélectionne les body dont la classe commence par `sr-theme-` (ex: `sr-theme-sra2`)
- `body[class*=" sr-theme-"]` : sélectionne les body dont la classe contient ` sr-theme-` (avec espace)
- `* { scrollbar-color: ... }` : applique les couleurs des scrollbars à tous les éléments
- `font-family: var(--sr-font-body)` : définit la police par défaut

**Exemple d'utilisation dans le HTML** :
```html
<body class="sr-theme-sra2 theme-dark">
  <!-- Tous les styles de base.less s'appliquent ici -->
</body>
```

### 3. Section 3 : Imports des composants (lignes 15-29)

```less
  @import "components/controls.less";
  @import "components/typography.less";
  @import "components/context-menu.less";
  @import "components/hotbar.less";
  @import "components/players.less";
  @import "components/scene-navigation.less";
  @import "components/chat-message.less";
  @import "components/sidebar.less";
  @import "components/roll-table.less";
  @import "components/card-deck.less";
  @import "components/prose-mirror.less";
  @import "components/pause.less";
  @import "components/journal.less";
  @import "components/tooltype.less";
  @import "components/window.less";
```

**Rôle** : Charge tous les styles spécifiques aux **composants de l'interface Foundry VTT**.

**Chaque composant** :
- `controls.less` : Boutons, inputs, sélecteurs (utilise les mixins de la section 1)
- `window.less` : Fenêtres et headers de fenêtres
- `sidebar.less` : Barre latérale Foundry
- `chat-message.less` : Messages de chat
- `journal.less` : Journal/notes
- `hotbar.less` : Barre d'actions
- etc.

**Important** : Ces imports sont **imbriqués dans le sélecteur body**, donc ils héritent du contexte.

### 4. Section 4 : Zone de commentaire (lignes 31-34)

```less
 /* === WINDOW BACKGROUND === */
```

**Rôle** : Section réservée pour ajouter des styles personnalisés si nécessaire.

## Comment utiliser ce fichier

### Utilisation normale (recommandée)

**Vous ne modifiez PAS directement `base.less`** sauf pour :
1. Ajouter un nouvel import de composant
2. Modifier les styles globaux (scrollbar, font-family)
3. Ajouter des imports de mixins communs

### Modifier un composant existant

Si vous voulez modifier les styles d'un composant spécifique, éditez le fichier correspondant dans `components/` :

```less
// Pour modifier les boutons
src/less/components/controls.less

// Pour modifier les fenêtres
src/less/components/window.less

// Pour modifier la sidebar
src/less/components/sidebar.less
```

### Ajouter un nouveau composant

1. Créez un nouveau fichier dans `src/less/components/votre-composant.less`
2. Ajoutez l'import dans `base.less` :

```less
// Dans base.less, après la ligne 29
@import "components/votre-composant.less";
```

### Créer un nouveau mixin

1. Créez un fichier dans `src/less/commons/votre-mixin.less`
2. Ajoutez l'import au début de `base.less` :

```less
// Dans base.less, après la ligne 6
@import "commons/votre-mixin.less";
```

3. Utilisez le mixin dans vos composants :

```less
// Dans un fichier component
.mon-element {
  .votre-mixin();
}
```

## Ordre d'exécution

L'ordre est important dans `base.less` :

1. **D'abord les mixins** (lignes 1-6) : ils doivent être disponibles avant d'être utilisés
2. **Ensuite le contexte global** (lignes 8-13) : définit les styles de base
3. **Puis les composants** (lignes 15-29) : utilisent les mixins et les variables CSS

## Exemple pratique

### Utiliser un mixin dans un composant

```less
// src/less/components/mon-composant.less

.mon-bouton {
  .sr-button-base();  // Utilise le mixin de button-mixin.less
  
  &:hover {
    .sr-button-hover();  // Utilise le mixin hover
  }
}

.ma-fenetre {
  .sr-block-window();  // Utilise le mixin de layout-mixin.less
}
```

### Utiliser les variables CSS du thème

```less
// src/less/components/mon-composant.less

.mon-element {
  background-color: var(--sr-ui-bg-color);  // Variable définie dans le thème
  color: var(--sr-ui-color);                // Variable définie dans le thème
  border: 1px solid var(--sr-ui-border-color);
  font-family: var(--sr-font-body);         // Police du thème
}
```

## Relation avec les autres fichiers

```
index.less
  └─ @layer system-shadowrun-ui
      └─ base.less (ce fichier)
          ├─ commons/* (mixins)
          └─ components/* (styles de composants)
```

- `index.less` : Point d'entrée principal
- `themes/sra2.less` : Définit les variables CSS (`--sr-ui-color`, etc.)
- `base.less` : Utilise ces variables pour créer les styles

## Notes importantes

1. **Variables CSS** : Tous les styles utilisent des variables CSS définies dans le thème (`--sr-ui-color`, `--sr-font-body`, etc.). Cela permet de changer de thème facilement.

2. **Scoping** : Tous les composants sont imbriqués dans le sélecteur `body[class^="sr-theme-"]`, donc ils ne s'appliquent que lorsque le thème Shadowrun est actif.

3. **Cascade** : Les mixins définissent des styles de base, et les composants peuvent les surcharger ou les étendre.

4. **Modularité** : Chaque composant a son propre fichier, ce qui facilite la maintenance et la collaboration.


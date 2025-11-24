# Utilisation du CSS Less dans le projet

## Configuration actuelle

Le projet utilise Less pour gérer les styles du thème. Voici comment cela fonctionne :

### Structure des fichiers

- **Fichiers Less source** : `src/less/`
  - `index.less` : Point d'entrée principal
  - `themes/sra2.less` : Thème SRA2 (actif)
  - `themes/sr6.less` : Thème SR6 (désactivé)
  - `base.less` : Styles de base
  - `theme-mixins.less` : Mixins de thème
  - `commons/` : Mixins communs (boutons, inputs, etc.)
  - `components/` : Styles des composants

- **Fichier CSS compilé** : `public/style/sra2.css`
  - Ce fichier est généré automatiquement lors du build
  - Il est référencé dans `public/system.json` (ligne 45)

## Comment compiler le Less en CSS

### 1. En mode développement (avec watch)

```bash
npm run dev
```

Cette commande :
- Compile le Less et le SCSS en CSS
- Place le résultat dans `public/style/sra2.css`
- Surveille les changements et recompile automatiquement
- Ne vide pas le dossier `public/` (préserve les autres fichiers)

### 2. Build pour production

```bash
npm run build:public
```

Cette commande :
- Compile tout le code (TypeScript, Less, SCSS)
- Génère le CSS dans `public/style/sra2.css`
- Place le JavaScript dans `public/index.mjs`
- Ne vide pas le dossier `public/` (préserve les autres fichiers)

### 3. Build complet (vers `dist/`)

```bash
npm run build
```

Cette commande :
- Compile tout dans le dossier `dist/`
- Utile pour créer une version de distribution
- Vide le dossier `dist/` avant de construire

## Comment ça fonctionne

1. **Import dans le code source** :
   - Le fichier `src/start.ts` importe `./less/index.less`
   - Vite détecte automatiquement cet import

2. **Compilation** :
   - Vite utilise le plugin Less pour compiler les fichiers `.less`
   - Les imports Less (`@import`) sont résolus automatiquement
   - Le CSS compilé est fusionné avec le SCSS dans un seul fichier

3. **Sortie** :
   - Le CSS final est placé dans `public/style/sra2.css`
   - Ce fichier est référencé dans `public/system.json` :
     ```json
     "styles": ["style/sra2.css"]
     ```

## Modifier le thème

### Activer un autre thème

Dans `src/less/index.less`, modifiez les imports :

```less
@layer system-shadowrun-vars {
  //@import "themes/sr6.less";      // Désactivé
  //@import "themes/sr5.less";      // Désactivé
  @import "themes/sra2.less";       // Actif
}
```

### Créer un nouveau thème

1. Créez `src/less/themes/votre-theme.less`
2. Copiez la structure de `sra2.less`
3. Modifiez les couleurs, polices, etc.
4. Importez-le dans `index.less`

## Workflow recommandé

1. **Modifier les fichiers Less** dans `src/less/`
2. **Lancer `npm run dev`** pour compiler automatiquement
3. **Tester dans Foundry VTT** (avec le serveur de dev Vite si configuré)
4. **Recompiler avec `npm run build:public`** pour tester la version finale

## Notes importantes

- Le thème SRA2 est maintenant le thème par défaut (SR6 est désactivé)
- Les chemins des polices et images utilisent des chemins absolus (`/systems/sra2/...`)
- Les variables CSS sont générées automatiquement via les mixins Less
- Le CSS final combine Less + SCSS dans un seul fichier


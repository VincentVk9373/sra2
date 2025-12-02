import { CharacterSheet } from './character-sheet.js';

/**
 * Character Sheet Application V2
 * Nouvelle version de la fiche de personnage avec un template et des styles différents
 * Réutilise toute la logique TypeScript de CharacterSheet
 */
export class CharacterSheetV2 extends CharacterSheet {
  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'character', 'character-v2'],
      template: 'systems/sra2/templates/actor-character-sheet-v2.hbs',
      // Vous pouvez aussi changer width/height si nécessaire
      // width: 1000,
      // height: 800,
    });
  }

  // Toute la logique TypeScript est héritée de CharacterSheet
  // Vous pouvez surcharger des méthodes spécifiques si nécessaire, par exemple:
  
  // override async getData(): Promise<any> {
  //   const context = await super.getData();
  //   // Ajouter des données spécifiques à la version 2 si nécessaire
  //   return context;
  // }
}





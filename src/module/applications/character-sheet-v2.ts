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

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Context menu handler
    html.find('[data-action="show-context-menu"]').on('click', this._onShowContextMenu.bind(this));

    // Close context menu when clicking outside
    const namespace = `context-menu-v2-${this.id}`;
    $(document).on(`click.${namespace}`, (event: JQuery.ClickEvent) => {
      const target = event.target as HTMLElement;
      if (!$(target).closest('.context-menu, [data-action="show-context-menu"]').length) {
        this.element.find('.context-menu.active').removeClass('active');
      }
    });

    // Handle context menu item clicks - close menu after action
    html.find('.context-menu-item').on('click', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      const menu = $(event.currentTarget).closest('.context-menu');
      menu.removeClass('active');
    });
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    // Clean up document event listener
    $(document).off(`click.context-menu-v2-${this.id}`);
    return super.close(options);
  }

  private _onShowContextMenu(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    if (!itemId) return;

    // Close all other context menus
    this.element.find('.context-menu.active').removeClass('active');

    // Find and show the context menu for this item
    const menu = this.element.find(`.context-menu[data-item-id="${itemId}"]`);
    if (menu.length) {
      menu.addClass('active');
    }
  }
}















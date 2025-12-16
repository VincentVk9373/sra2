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
      const target = event.currentTarget as HTMLElement;
      const menu = $(target).closest('.context-menu');
      
      // For bookmark actions, delay menu close to let the handler execute first
      if (target.dataset.action === 'toggle-bookmark') {
        setTimeout(() => {
          menu.removeClass('active');
        }, 100);
      } else {
        menu.removeClass('active');
      }
    });

    // Handle toggle active for feats
    html.find('[data-action="toggle-active"]').on('click', this._onToggleActive.bind(this));
    
    // Handle toggle bookmark (inherited from CharacterSheet, but needs explicit binding for context menu)
    html.find('[data-action="toggle-bookmark"]').on('click', (event: JQuery.ClickEvent) => {
      // Call the parent method which uses the shared helper
      (this as any)._onToggleBookmark(event);
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
    const vehicleUuid = element.dataset.vehicleUuid;

    // Close all other context menus
    this.element.find('.context-menu.active').removeClass('active');

    // Find and show the context menu closest to the clicked element
    // This prevents opening multiple menus when the same item appears in multiple sections
    let menu: JQuery;
    if (itemId) {
      // Find the menu closest to the clicked element (in the same row)
      const $clickedElement = $(element);
      const $row = $clickedElement.closest('.row');
      menu = $row.find(`.context-menu[data-item-id="${itemId}"]`);
      
      // Fallback: if not found in the same row, find the first one
      if (menu.length === 0) {
        menu = this.element.find(`.context-menu[data-item-id="${itemId}"]`).first();
      }
    } else if (vehicleUuid) {
      // For vehicles, find the menu closest to the clicked element
      const $clickedElement = $(element);
      const $row = $clickedElement.closest('.row');
      menu = $row.find(`.context-menu[data-vehicle-uuid="${vehicleUuid}"]`);
      
      // Fallback: if not found in the same row, find the first one
      if (menu.length === 0) {
        menu = this.element.find(`.context-menu[data-vehicle-uuid="${vehicleUuid}"]`).first();
      }
    } else {
      return;
    }

    if (menu.length) {
      menu.addClass('active');
    }
  }

  /**
   * Toggle active state of a feat
   */
  private async _onToggleActive(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;

    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== 'feat') return;

    const currentActive = (item.system as any).active ?? true;
    await item.update({ 'system.active': !currentActive } as any);
    
    // Re-render the sheet to update the visual state
    this.render(false);
  }
}















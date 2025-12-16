import { CharacterSheet } from './character-sheet.js';

/**
 * Character Sheet Application V2
 * Nouvelle version de la fiche de personnage avec un template et des styles différents
 * Réutilise toute la logique TypeScript de CharacterSheet
 */
export class CharacterSheetV2 extends CharacterSheet {
  /** Track advanced mode state */
  private _advancedMode: boolean = false;

  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'character', 'character-v2'],
      template: 'systems/sra2/templates/actor-character-sheet-v2.hbs',
      // Vous pouvez aussi changer width/height si nécessaire
      // width: 1000,
      // height: 800,
    });
  }

  override async getData(): Promise<any> {
    const context = await super.getData();
    
    // Add advanced mode flag to context
    context.advancedMode = this._advancedMode;
    
    return context;
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

    // Handle toggle advanced mode
    html.find('[data-action="toggle-advanced-mode"]').on('click', this._onToggleAdvancedMode.bind(this));
    
    // Handle skill rating changes in advanced mode
    html.find('.skill-rating-input').on('change', this._onUpdateSkillRating.bind(this));
    
    // Handle attribute value changes in advanced mode
    html.find('.attribute-input').on('change', this._onUpdateAttribute.bind(this));
    
    // Prevent click propagation on attribute inputs to avoid triggering roll when clicking to edit
    html.find('.attribute-input').on('click', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
    });
  }

  /**
   * Toggle advanced mode
   */
  private _onToggleAdvancedMode(event: JQuery.ClickEvent): void {
    event.preventDefault();
    this._advancedMode = !this._advancedMode;
    this.render(false);
  }

  /**
   * Update skill rating in advanced mode
   */
  private async _onUpdateSkillRating(event: JQuery.ChangeEvent): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const itemId = input.dataset.itemId;
    const value = parseInt(input.value);

    if (itemId && !isNaN(value)) {
      const item = this.actor.items.get(itemId);
      if (item && item.type === 'skill') {
        await item.update({ 'system.rating': value });
        // Re-render to update calculated values (dice pool, cost, etc.)
        this.render(false);
      }
    }
  }

  /**
   * Update attribute value in advanced mode
   */
  private async _onUpdateAttribute(event: JQuery.ChangeEvent): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const attribute = input.name.split('.').pop(); // Extract attribute name from "system.attributes.strength"
    const value = parseInt(input.value);

    if (attribute && !isNaN(value)) {
      await this.actor.update({ [`system.attributes.${attribute}`]: value });
      // Re-render to update calculated values (dice pools, etc.)
      this.render(false);
    }
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















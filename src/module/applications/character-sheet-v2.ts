import { CharacterSheet } from './character-sheet.js';
import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as ItemSearch from '../../../item-search.js';

/**
 * Character Sheet Application V2
 * Nouvelle version de la fiche de personnage avec un template et des styles différents
 * Réutilise toute la logique TypeScript de CharacterSheet
 */
export class CharacterSheetV2 extends CharacterSheet {
  /** Track advanced mode state */
  private _advancedMode: boolean = false;
  
  /** Current search type */
  private _currentSearchType: 'skill' | 'specialization' | 'feat' = 'skill';
  
  /** Search timeout for debouncing */
  private _itemSearchTimeout: any = null;
  
  /** Last search term */
  private _lastSearchTerm: string = '';

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

    // Keyboard shortcut: CTRL+E to toggle advanced mode
    const keydownNamespace = `keydown-v2-${this.id}`;
    $(document).off(`.${keydownNamespace}`);
    $(document).on(`keydown.${keydownNamespace}`, (event: JQuery.KeyDownEvent) => {
      // Check if CTRL+E is pressed and this sheet is active
      if (event.ctrlKey && event.key.toLowerCase() === 'e') {
        // Check if this sheet element is visible/focused
        if (this.element && this.element.is(':visible')) {
          event.preventDefault();
          this._onToggleAdvancedMode(event as any);
        }
      }
    });

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
    
    // Select all content on click for attribute inputs
    html.find('.attribute-input').on('click', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      const input = event.currentTarget as HTMLInputElement;
      input.select();
    });
    
    // Select all content on click for skill rating inputs
    html.find('.skill-rating-input').on('click', (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      const input = event.currentTarget as HTMLInputElement;
      input.select();
    });
    
    // Handle metatype actions in advanced mode
    const editMetatypeElements = html.find('[data-action="edit-metatype"]');
    const deleteMetatypeElements = html.find('[data-action="delete-metatype"]');
    
    console.log('[CharacterSheetV2] Edit metatype elements found:', editMetatypeElements.length);
    console.log('[CharacterSheetV2] Delete metatype elements found:', deleteMetatypeElements.length);
    
    // Use mousedown instead of click to avoid conflicts
    editMetatypeElements.on('mousedown', this._onEditMetatypeV2.bind(this));
    deleteMetatypeElements.on('mousedown', this._onDeleteMetatypeV2.bind(this));

    // Item search functionality
    html.find('.search-tab').on('click', this._onSearchTabClick.bind(this));
    html.find('.item-search-input').on('input', this._onItemSearchInput.bind(this));
    (html.find('.item-search-input') as any).on('focus', this._onItemSearchFocus.bind(this));
    (html.find('.item-search-input') as any).on('blur', this._onItemSearchBlur.bind(this));
  }

  /**
   * Edit metatype (V2 specific handler)
   */
  private async _onEditMetatypeV2(event: Event): Promise<void> {
    console.log('[CharacterSheetV2] Edit metatype clicked');
    event.preventDefault();
    event.stopPropagation();
    return SheetHelpers.handleEditItem(event, this.actor);
  }

  /**
   * Delete metatype (V2 specific handler)
   */
  private async _onDeleteMetatypeV2(event: Event): Promise<void> {
    console.log('[CharacterSheetV2] Delete metatype clicked');
    event.preventDefault();
    event.stopPropagation();
    return SheetHelpers.handleDeleteItem(event, this.actor, this.render.bind(this));
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
        await item.update({ 'system.rating': value } as any);
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
    // Clean up document event listeners
    $(document).off(`click.context-menu-v2-${this.id}`);
    $(document).off(`keydown.keydown-v2-${this.id}`);
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

  /**
   * Handle search tab click
   */
  private _onSearchTabClick(event: JQuery.ClickEvent): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const searchType = target.dataset.searchType as 'skill' | 'specialization' | 'feat';
    
    if (!searchType) return;
    
    this._currentSearchType = searchType;
    
    // Update tab styles
    this.element.find('.search-tab').removeClass('active');
    $(target).addClass('active');
    
    // Update input placeholder and data attribute
    const input = this.element.find('.item-search-input')[0] as HTMLInputElement;
    if (input) {
      input.dataset.searchType = searchType;
      const placeholderKey = `SRA2.SEARCH.PLACEHOLDER_${searchType.toUpperCase()}`;
      input.placeholder = game.i18n!.localize(placeholderKey) || game.i18n!.localize('SRA2.SEARCH.PLACEHOLDER');
      input.value = '';
    }
    
    // Hide results
    const resultsDiv = this.element.find('.item-search-results')[0] as HTMLElement;
    if (resultsDiv) {
      resultsDiv.style.display = 'none';
    }
  }

  /**
   * Handle item search input
   */
  private async _onItemSearchInput(event: JQuery.TriggeredEvent): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const resultsDiv = this.element.find('.item-search-results')[0] as HTMLElement;
    
    // Clear previous timeout
    if (this._itemSearchTimeout) {
      clearTimeout(this._itemSearchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this._itemSearchTimeout = setTimeout(async () => {
      await this._performItemSearch(searchTerm, resultsDiv);
    }, 300);
  }

  /**
   * Perform the actual item search
   */
  private async _performItemSearch(searchTerm: string, resultsDiv: HTMLElement): Promise<void> {
    this._lastSearchTerm = searchTerm;
    const searchType = this._currentSearchType;
    
    // Check if item exists on actor
    const existingItemsCheck = (itemName: string) => 
      ItemSearch.itemExistsOnActor(this.actor, searchType, itemName);
    
    // Search everywhere
    const results = await ItemSearch.searchItemsEverywhere(
      searchType,
      searchTerm,
      undefined,
      existingItemsCheck
    );
    
    // Display results
    this._displayItemSearchResults(results, resultsDiv);
  }

  /**
   * Display item search results
   */
  private async _displayItemSearchResults(results: ItemSearch.SearchResult[], resultsDiv: HTMLElement): Promise<void> {
    const searchType = this._currentSearchType;
    const formattedSearchTerm = this._lastSearchTerm
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Check if exact match exists on actor
    const exactMatchOnActor = this.actor.items.find((i: any) => 
      i.type === searchType && 
      ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(this._lastSearchTerm)
    );
    
    let html = '';
    
    if (results.length === 0) {
      // No results - show create option
      html = `
        <div class="search-result-item no-results">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SEARCH.NO_RESULTS')}
          </div>
          ${this._getCreateItemHtml(searchType, formattedSearchTerm)}
        </div>
      `;
    } else {
      // Display results
      for (const result of results) {
        const disabledClass = result.alreadyExists ? 'disabled' : '';
        const buttonText = result.alreadyExists 
          ? '<i class="fas fa-check"></i>' 
          : game.i18n!.localize('SRA2.SEARCH.ADD');
        
        html += `
          <div class="search-result-item ${disabledClass}" data-uuid="${result.uuid}">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.source}</span>
            </div>
            ${result.alreadyExists 
              ? `<span class="already-exists-label">${game.i18n!.localize('SRA2.SEARCH.ALREADY_ON_SHEET')}</span>`
              : `<button type="button" class="add-item-btn" data-uuid="${result.uuid}">${buttonText}</button>`
            }
          </div>
        `;
      }
      
      // Add create option at the end if no exact match on actor
      if (!exactMatchOnActor) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n!.localize('SRA2.SEARCH.CREATE_NEW')}</span>
            </div>
            ${this._getCreateItemHtml(searchType, formattedSearchTerm, true)}
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Attach event handlers
    $(resultsDiv).find('.add-item-btn').on('click', this._onAddItemFromSearch.bind(this));
    $(resultsDiv).find('.create-item-btn').on('click', this._onCreateNewItem.bind(this));
    
    // Make result items clickable
    $(resultsDiv).find('.search-result-item:not(.disabled):not(.no-results):not(.create-new-item)').on('click', (event) => {
      if ($(event.target).closest('.add-item-btn').length > 0) return;
      const button = $(event.currentTarget).find('.add-item-btn')[0] as HTMLButtonElement;
      if (button && !button.disabled) {
        $(button).trigger('click');
      }
    });
  }

  /**
   * Get HTML for create item button
   */
  private _getCreateItemHtml(searchType: string, itemName: string, inline: boolean = false): string {
    const buttonClass = inline ? 'create-item-btn' : 'create-item-btn';
    
    if (searchType === 'feat') {
      // For feats, include type selector
      return `
        <select class="feat-type-selector">
          <option value="equipment">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.EQUIPMENT')}</option>
          <option value="trait">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.TRAIT')}</option>
          <option value="contact">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CONTACT')}</option>
          <option value="weapon">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.WEAPON')}</option>
          <option value="spell">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.SPELL')}</option>
          <option value="cyberware">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.CYBERWARE')}</option>
          <option value="armor">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.ARMOR')}</option>
          <option value="connaissance">${game.i18n!.localize('SRA2.FEATS.FEAT_TYPE.KNOWLEDGE')}</option>
        </select>
        <button type="button" class="${buttonClass}" data-item-name="${itemName}" data-item-type="${searchType}">
          <i class="fas fa-plus"></i> ${game.i18n!.localize('SRA2.SEARCH.CREATE')}
        </button>
      `;
    }
    
    return `
      <button type="button" class="${buttonClass}" data-item-name="${itemName}" data-item-type="${searchType}">
        <i class="fas fa-plus"></i> ${game.i18n!.localize('SRA2.SEARCH.CREATE')}
      </button>
    `;
  }

  /**
   * Handle adding item from search results
   */
  private async _onAddItemFromSearch(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const uuid = button.dataset.uuid;
    
    if (!uuid) return;
    
    const success = await ItemSearch.addItemToActorFromUuid(this.actor, uuid);
    
    if (success) {
      // Mark as added
      button.innerHTML = '<i class="fas fa-check"></i>';
      button.disabled = true;
      button.closest('.search-result-item')?.classList.add('disabled');
      
      // Re-render the sheet
      this.render(false);
    }
  }

  /**
   * Handle creating a new item
   */
  private async _onCreateNewItem(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const itemName = button.dataset.itemName;
    const itemType = button.dataset.itemType as 'skill' | 'specialization' | 'feat';
    
    if (!itemName || !itemType) return;
    
    // Capitalize first letter of each word
    const formattedName = itemName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    let itemData: any;
    
    if (itemType === 'skill') {
      itemData = {
        name: formattedName,
        type: 'skill',
        system: {
          rating: 1,
          linkedAttribute: 'strength',
          description: ''
        }
      };
    } else if (itemType === 'specialization') {
      itemData = {
        name: formattedName,
        type: 'specialization',
        system: {
          rating: 1,
          linkedSkill: '',
          description: ''
        }
      };
    } else if (itemType === 'feat') {
      // Get feat type from selector
      const selector = $(button).siblings('.feat-type-selector')[0] as HTMLSelectElement;
      const featType = selector?.value || 'equipment';
      
      itemData = {
        name: formattedName,
        type: 'feat',
        system: {
          featType: featType,
          rating: 1,
          description: ''
        }
      };
    }
    
    if (!itemData) return;
    
    // Create the item
    const createdItems = await this.actor.createEmbeddedDocuments('Item', [itemData]) as any;
    
    if (createdItems && createdItems.length > 0) {
      const newItem = createdItems[0] as any;
      
      // Clear search
      const searchInput = this.element.find('.item-search-input')[0] as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }
      
      const resultsDiv = this.element.find('.item-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        resultsDiv.style.display = 'none';
      }
      
      // Open the item sheet for editing
      if (newItem && newItem.sheet) {
        setTimeout(() => {
          newItem.sheet.render(true);
        }, 100);
      }
      
      ui.notifications?.info(game.i18n!.format('SRA2.SEARCH.ITEM_CREATED', { name: formattedName }));
      
      // Re-render
      this.render(false);
    }
  }

  /**
   * Handle search input focus
   */
  private _onItemSearchFocus(event: JQuery.FocusEvent): void {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's content, show results
    if (input.value.trim().length > 0) {
      const resultsDiv = this.element.find('.item-search-results')[0] as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
  }

  /**
   * Handle search input blur
   */
  private _onItemSearchBlur(event: JQuery.FocusEvent): void {
    const blurEvent = event.originalEvent as FocusEvent;
    
    // Delay hiding to allow clicking on results
    setTimeout(() => {
      const resultsDiv = this.element.find('.item-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        // Check if focus moved to element in results
        const relatedTarget = blurEvent?.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          return;
        }
        
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, 200);
  }
}















import { CharacterSheet } from './character-sheet.js';
import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as ItemSearch from '../../../item-search.js';
import { DELAYS } from '../config/constants.js';
import { debounceSearchInput, handleSearchFocus, handleSearchBlur } from '../helpers/search-utils.js';

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

  /** AbortController for document-level event listeners */
  private _v2AbortController: AbortController | null = null;

  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'character', 'character-v2'],
      template: 'systems/sra2/templates/actor-character-sheet-v2.hbs',
    });
  }

  override render(force?: boolean, options?: any): this {
    if ((this as any)._blockRender) return this;
    return super.render(force, options);
  }

  override async getData(): Promise<any> {
    const context = await super.getData();

    // Add advanced mode flag to context
    context.advancedMode = this._advancedMode;

    // Check if Gemini portrait generation is available
    try {
      const { isGeminiConfigured } = await import('../helpers/gemini-image.js');
      context.geminiAvailable = isGeminiConfigured();
    } catch {
      context.geminiAvailable = false;
    }

    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    const el = html[0] as HTMLElement;

    // Clean up previous document-level listeners
    this._v2AbortController?.abort();
    this._v2AbortController = new AbortController();
    const signal = this._v2AbortController.signal;

    // Keyboard shortcut: CTRL+E to toggle advanced mode
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'e') {
        const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0];
        if (sheetEl && sheetEl.offsetParent !== null) {
          event.preventDefault();
          this._onToggleAdvancedMode(event);
        }
      }
    }, { signal });

    // Gemini portrait generation button
    el.querySelectorAll<HTMLElement>('[data-action="generate-gemini-portrait"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const originalHtml = btn.innerHTML;
        (btn as HTMLButtonElement).disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating portrait...';
        (this as any)._blockRender = true;
        try {
          const { generateActorImage } = await import('../helpers/gemini-image.js');
          await generateActorImage(this.actor, (status: string) => {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${status}`;
          });
          (this as any)._blockRender = false;
          this.render(false);
        } catch {
          (this as any)._blockRender = false;
          (btn as HTMLButtonElement).disabled = false;
          btn.innerHTML = originalHtml;
        }
      });
    });

    // Context menu handler
    el.querySelectorAll<HTMLElement>('[data-action="show-context-menu"]').forEach(elem => {
      elem.addEventListener('click', this._onShowContextMenu.bind(this));
    });

    // Close context menu when clicking outside
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu, [data-action="show-context-menu"]')) {
        const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
        if (sheetEl) {
          sheetEl.querySelectorAll('.context-menu.active').forEach((m: Element) => m.classList.remove('active'));
        }
      }
    }, { signal });

    // Handle context menu item clicks - close menu after action
    el.querySelectorAll<HTMLElement>('.context-menu-item').forEach(item => {
      item.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        const target = event.currentTarget as HTMLElement;
        const menu = target.closest('.context-menu');

        if (target.dataset.action === 'toggle-bookmark') {
          setTimeout(() => {
            menu?.classList.remove('active');
          }, DELAYS.SHEET_RENDER);
        } else {
          menu?.classList.remove('active');
        }
      });
    });

    // Handle toggle active for feats
    el.querySelectorAll<HTMLElement>('[data-action="toggle-active"]').forEach(elem => {
      elem.addEventListener('click', this._onToggleActive.bind(this));
    });

    // Handle toggle bookmark
    el.querySelectorAll<HTMLElement>('[data-action="toggle-bookmark"]').forEach(elem => {
      elem.addEventListener('click', (event: Event) => {
        (this as any)._onToggleBookmark(event);
      });
    });

    // Handle toggle advanced mode
    el.querySelectorAll<HTMLElement>('[data-action="toggle-advanced-mode"]').forEach(elem => {
      elem.addEventListener('click', this._onToggleAdvancedMode.bind(this));
    });

    // Handle skill rating changes in advanced mode
    el.querySelectorAll<HTMLElement>('.skill-rating-input').forEach(elem => {
      elem.addEventListener('change', this._onUpdateSkillRating.bind(this));
    });

    // Handle attribute value changes in advanced mode
    el.querySelectorAll<HTMLInputElement>('.attribute-input').forEach(elem => {
      elem.addEventListener('change', this._onUpdateAttribute.bind(this));
      elem.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        (event.currentTarget as HTMLInputElement).select();
      });
    });

    // Select all content on click for skill rating inputs
    el.querySelectorAll<HTMLInputElement>('.skill-rating-input').forEach(elem => {
      elem.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        (event.currentTarget as HTMLInputElement).select();
      });
    });

    // Handle metatype actions in advanced mode
    const editMetatypeElements = el.querySelectorAll<HTMLElement>('[data-action="edit-metatype"]');
    const deleteMetatypeElements = el.querySelectorAll<HTMLElement>('[data-action="delete-metatype"]');

    console.log('[CharacterSheetV2] Edit metatype elements found:', editMetatypeElements.length);
    console.log('[CharacterSheetV2] Delete metatype elements found:', deleteMetatypeElements.length);

    editMetatypeElements.forEach(elem => {
      elem.addEventListener('mousedown', this._onEditMetatypeV2.bind(this));
    });
    deleteMetatypeElements.forEach(elem => {
      elem.addEventListener('mousedown', this._onDeleteMetatypeV2.bind(this));
    });

    // Item search functionality
    el.querySelectorAll<HTMLElement>('.search-tab').forEach(elem => {
      elem.addEventListener('click', this._onSearchTabClick.bind(this));
    });
    el.querySelectorAll<HTMLElement>('.item-search-input').forEach(elem => {
      elem.addEventListener('input', this._onItemSearchInput.bind(this));
      elem.addEventListener('focus', this._onItemSearchFocus.bind(this));
      elem.addEventListener('blur', this._onItemSearchBlur.bind(this));
    });

    // Bio tabs
    el.querySelectorAll<HTMLElement>('.bio-tab').forEach(tab => {
      tab.addEventListener('click', (event: MouseEvent) => {
        const tabName = (event.currentTarget as HTMLElement).dataset.tab!;
        el.querySelectorAll('.bio-tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.bio-tab-content').forEach(t => t.classList.remove('active'));
        el.querySelector(`.bio-tab[data-tab="${tabName}"]`)?.classList.add('active');
        el.querySelector(`.bio-tab-content[data-tab="${tabName}"]`)?.classList.add('active');
      });
    });
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
  private _onToggleAdvancedMode(event: Event): void {
    event.preventDefault();
    this._advancedMode = !this._advancedMode;
    this.render(false);
  }

  /**
   * Update skill rating in advanced mode
   */
  private async _onUpdateSkillRating(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const itemId = input.dataset.itemId;
    const value = parseInt(input.value);

    if (itemId && !isNaN(value)) {
      const item = this.actor.items.get(itemId);
      if (item && item.type === 'skill') {
        await item.update({ 'system.rating': value } as any);
        this.render(false);
      }
    }
  }

  /**
   * Update attribute value in advanced mode
   */
  private async _onUpdateAttribute(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const attribute = input.name.split('.').pop();
    const value = parseInt(input.value);

    if (attribute && !isNaN(value)) {
      await this.actor.update({ [`system.attributes.${attribute}`]: value });
      this.render(false);
    }
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    this._v2AbortController?.abort();
    this._v2AbortController = null;
    return super.close(options);
  }

  private _onShowContextMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;
    const vehicleUuid = element.dataset.vehicleUuid;

    const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    if (!sheetEl) return;

    // Close all other context menus
    sheetEl.querySelectorAll('.context-menu.active').forEach(m => m.classList.remove('active'));

    let menu: HTMLElement | null = null;
    if (itemId) {
      const row = (element as HTMLElement).closest('.row');
      menu = row?.querySelector(`.context-menu[data-item-id="${itemId}"]`) as HTMLElement | null;
      if (!menu) {
        menu = sheetEl.querySelector(`.context-menu[data-item-id="${itemId}"]`) as HTMLElement | null;
      }
    } else if (vehicleUuid) {
      const row = (element as HTMLElement).closest('.row');
      menu = row?.querySelector(`.context-menu[data-vehicle-uuid="${vehicleUuid}"]`) as HTMLElement | null;
      if (!menu) {
        menu = sheetEl.querySelector(`.context-menu[data-vehicle-uuid="${vehicleUuid}"]`) as HTMLElement | null;
      }
    } else {
      return;
    }

    if (menu) {
      menu.classList.add('active');
    }
  }

  /**
   * Toggle active state of a feat
   */
  private async _onToggleActive(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget as HTMLElement;
    const itemId = element.dataset.itemId;

    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== 'feat') return;

    const currentActive = (item.system as any).active ?? true;
    await item.update({ 'system.active': !currentActive } as any);

    this.render(false);
  }

  /**
   * Handle search tab click
   */
  private _onSearchTabClick(event: Event): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const searchType = target.dataset.searchType as 'skill' | 'specialization' | 'feat';

    if (!searchType) return;

    this._currentSearchType = searchType;

    const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    if (!sheetEl) return;

    // Update tab styles
    sheetEl.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
    target.classList.add('active');

    // Update input placeholder and data attribute
    const input = sheetEl.querySelector('.item-search-input') as HTMLInputElement;
    if (input) {
      input.dataset.searchType = searchType;
      const placeholderKey = `SRA2.SEARCH.PLACEHOLDER_${searchType.toUpperCase()}`;
      input.placeholder = game.i18n!.localize(placeholderKey) || game.i18n!.localize('SRA2.SEARCH.PLACEHOLDER');
      input.value = '';
    }

    // Hide results
    const resultsDiv = sheetEl.querySelector('.item-search-results') as HTMLElement;
    if (resultsDiv) {
      resultsDiv.style.display = 'none';
    }
  }

  /**
   * Handle item search input
   */
  private async _onItemSearchInput(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const resultsDiv = sheetEl?.querySelector('.item-search-results') as HTMLElement;
    this._itemSearchTimeout = debounceSearchInput(this._itemSearchTimeout, searchTerm, resultsDiv, DELAYS.SEARCH_DEBOUNCE,
      async () => this._performItemSearch(searchTerm, resultsDiv));
  }

  /**
   * Perform the actual item search
   */
  private async _performItemSearch(searchTerm: string, resultsDiv: HTMLElement): Promise<void> {
    this._lastSearchTerm = searchTerm;
    const searchType = this._currentSearchType;

    const existingItemsCheck = (itemName: string) =>
      ItemSearch.itemExistsOnActor(this.actor, searchType, itemName);

    const results = await ItemSearch.searchItemsEverywhere(
      searchType,
      searchTerm,
      undefined,
      existingItemsCheck
    );

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

    const exactMatchOnActor = this.actor.items.find((i: any) =>
      i.type === searchType &&
      ItemSearch.normalizeSearchText(i.name) === ItemSearch.normalizeSearchText(this._lastSearchTerm)
    );

    let html = '';

    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SEARCH.NO_RESULTS')}
          </div>
          ${this._getCreateItemHtml(searchType, formattedSearchTerm)}
        </div>
      `;
    } else {
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

    // Attach event handlers using native DOM
    resultsDiv.querySelectorAll<HTMLElement>('.add-item-btn').forEach(btn => {
      btn.addEventListener('click', this._onAddItemFromSearch.bind(this));
    });
    resultsDiv.querySelectorAll<HTMLElement>('.create-item-btn').forEach(btn => {
      btn.addEventListener('click', this._onCreateNewItem.bind(this));
    });

    // Make result items clickable
    resultsDiv.querySelectorAll<HTMLElement>('.search-result-item:not(.disabled):not(.no-results):not(.create-new-item)').forEach(item => {
      item.addEventListener('click', (event: MouseEvent) => {
        if ((event.target as HTMLElement).closest('.add-item-btn')) return;
        const button = item.querySelector('.add-item-btn') as HTMLButtonElement;
        if (button && !button.disabled) {
          button.click();
        }
      });
    });
  }

  /**
   * Get HTML for create item button
   */
  private _getCreateItemHtml(searchType: string, itemName: string, inline: boolean = false): string {
    const buttonClass = inline ? 'create-item-btn' : 'create-item-btn';

    if (searchType === 'feat') {
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
  private async _onAddItemFromSearch(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLButtonElement;
    const uuid = button.dataset.uuid;

    if (!uuid) return;

    const success = await ItemSearch.addItemToActorFromUuid(this.actor, uuid);

    if (success) {
      button.innerHTML = '<i class="fas fa-check"></i>';
      button.disabled = true;
      button.closest('.search-result-item')?.classList.add('disabled');
      this.render(false);
    }
  }

  /**
   * Handle creating a new item
   */
  private async _onCreateNewItem(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLButtonElement;
    const itemName = button.dataset.itemName;
    const itemType = button.dataset.itemType as 'skill' | 'specialization' | 'feat';

    if (!itemName || !itemType) return;

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
      // Get feat type from selector - use native DOM
      const selector = button.parentElement?.querySelector('.feat-type-selector') as HTMLSelectElement;
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

    const createdItems = await this.actor.createEmbeddedDocuments('Item', [itemData]) as any;

    if (createdItems && createdItems.length > 0) {
      const newItem = createdItems[0] as any;

      // Clear search
      const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
      if (sheetEl) {
        const searchInput = sheetEl.querySelector('.item-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = '';
        }

        const resultsDiv = sheetEl.querySelector('.item-search-results') as HTMLElement;
        if (resultsDiv) {
          resultsDiv.style.display = 'none';
        }
      }

      if (newItem && newItem.sheet) {
        setTimeout(() => {
          newItem.sheet.render(true);
        }, DELAYS.SHEET_RENDER);
      }

      ui.notifications?.info(game.i18n!.format('SRA2.SEARCH.ITEM_CREATED', { name: formattedName }));
      this.render(false);
    }
  }

  /**
   * Handle search input focus
   */
  private _onItemSearchFocus(event: Event): void {
    const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    handleSearchFocus(event.currentTarget as HTMLInputElement, sheetEl?.querySelector('.item-search-results') as HTMLElement);
  }

  /**
   * Handle search input blur
   */
  private _onItemSearchBlur(event: Event): void {
    const focusEvent = event as FocusEvent;
    const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const resultsDiv = sheetEl?.querySelector('.item-search-results') as HTMLElement;
    handleSearchBlur(focusEvent?.relatedTarget as HTMLElement | null, resultsDiv, DELAYS.SEARCH_HIDE);
  }
}

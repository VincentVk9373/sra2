import * as ItemSearch from '../../../item-search.js';
import { DELAYS } from '../config/constants.js';

/**
 * Get compendium packs filtered by active language, with fallback to all packs
 */
function getLanguagePacks(): any[] {
  const allPacks = [...(game.packs as any)].filter((p: any) => p.documentName === 'Item');
  const lang = game.i18n?.lang || 'en';
  const langPacks = allPacks.filter((p: any) => (p.collection || '').endsWith(`-${lang}`));
  return langPacks.length > 0 ? langPacks : allPacks;
}

/**
 * Specialization Sheet Application
 */
export class SpecializationSheet extends ItemSheet {
  static override get defaultOptions(): DocumentSheet.Options<Item> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'item', 'specialization'],
      template: 'systems/sra2/templates/item-specialization-sheet.hbs',
      width: 520,
      height: 480,
      tabs: [],
      dragDrop: [
        { dropSelector: '.linked-skill-drop-zone' }
      ],
      submitOnChange: true,
    });
  }

  override getData(): any {
    const context = super.getData() as any;
    context.system = this.item.system;
    context.isGM = (game as any).user?.isGM ?? false;

    // Get linked skill info if exists (linkedSkill is now a slug)
    if (context.system.linkedSkill) {
      const linkedSkillSlug = context.system.linkedSkill;

      if (this.item.actor) {
        // On an actor: look in actor's items first
        const linkedSkill = this.item.actor.items.find((i: any) =>
          i.type === 'skill' && (i.system.slug === linkedSkillSlug || i.name === linkedSkillSlug)
        );
        if (linkedSkill) {
          context.linkedSkillName = linkedSkill.name;
        } else {
          // Not on actor → fallback to world items / compendiums
          context.linkedSkillName = this._resolveSkillNameFromSlug(linkedSkillSlug);
          context.linkedSkillNotFound = true;
        }
      } else {
        // Not on an actor: resolve name from world items or compendiums
        context.linkedSkillName = this._resolveSkillNameFromSlug(linkedSkillSlug);
      }
    }

    // Get list of skills from the actor if this item is owned (for dropdown)
    if (this.item.actor) {
      const skills = this.item.actor.items.filter((i: any) => i.type === 'skill');
      context.skills = skills.map((s: any) => ({
        name: s.name,
        slug: s.system.slug || ''
      }));
    } else {
      context.skills = [];
    }
    
    return context;
  }

  /**
   * Resolve a skill slug to its localized name.
   * Uses the global cache built at startup, falls back to world items search.
   */
  private _resolveSkillNameFromSlug(slug: string): string {
    // 1. Use global cache (built from compendiums + world items at startup)
    const cache = (globalThis as any).SRA2_SKILL_SLUG_CACHE;
    if (cache && cache[slug]) return cache[slug];

    // 2. Fallback: search world items directly
    if (game.items) {
      const worldSkill = (game.items as any).find((i: any) =>
        i.type === 'skill' && (i.system.slug === slug || i.name === slug)
      );
      if (worldSkill) return worldSkill.name;
    }

    return slug;
  }

  private _abortController: AbortController | null = null;

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const el = html[0] as HTMLElement;

    // Clear linked skill button
    el.querySelectorAll<HTMLElement>('[data-action="clear-linked-skill"]').forEach(elem => elem.addEventListener('click', this._onClearLinkedSkill.bind(this)));

    // Skill search
    el.querySelectorAll<HTMLElement>('.skill-search-input').forEach(elem => {
      elem.addEventListener('input', this._onSkillSearch.bind(this));
      elem.addEventListener('focus', this._onSkillSearchFocus.bind(this));
      elem.addEventListener('blur', this._onSkillSearchBlur.bind(this));
    });

    // Close skill search results when clicking outside
    this._abortController?.abort();
    this._abortController = new AbortController();
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const skillSearchContainer = el.querySelector('.skill-search-container') as HTMLElement;
      if (skillSearchContainer && !skillSearchContainer.contains(target)) {
        const resultsEl = el.querySelector('.skill-search-results') as HTMLElement;
        if (resultsEl) resultsEl.style.display = 'none';
      }
    }, { signal: this._abortController.signal });
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    // Clean up document-level event listeners
    this._abortController?.abort();
    this._abortController = null;
    return super.close(options);
  }

  /**
   * Handle clearing the linked skill
   */
  private async _onClearLinkedSkill(event: Event): Promise<void> {
    event.preventDefault();
    await this.item.update({ 'system.linkedSkill': '' } as any);
    this.render(false);
  }

  /**
   * Handle dropping a skill onto the linked skill field
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    const data = TextEditor.getDragEventData(event) as any;
    
    // Handle Item drops
    if (data && data.type === 'Item') {
      const item = await Item.implementation.fromDropData(data) as any;
      
      if (!item) return super._onDrop(event);
      
      // Check if it's a skill
      if (item.type === 'skill') {
        // Store the skill slug (language-independent identifier)
        const slug = item.system?.slug || item.name;
        await this.item.update({ 'system.linkedSkill': slug } as any);
        this.render(false);
        ui.notifications?.info(game.i18n!.format('SRA2.SPECIALIZATIONS.LINKED_TO_SKILL', { name: item.name }));
        return;
      } else {
        ui.notifications?.warn(game.i18n!.localize('SRA2.SPECIALIZATIONS.ONLY_SKILLS_CAN_BE_LINKED'));
        return;
      }
    }

    return super._onDrop(event);
  }

  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    const expandedData = foundry.utils.expandObject(formData);
    return this.item.update(expandedData);
  }

  /**
   * SKILL SEARCH FUNCTIONS
   */
  
  private skillSearchTimeout: any = null;
  private lastSkillSearchTerm: string = '';
  
  /**
   * Handle skill search input
   */
  private async _onSkillSearch(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const searchTerm = ItemSearch.normalizeSearchText(input.value.trim());
    const resultsDiv = input.parentElement?.querySelector('.skill-search-results') as HTMLElement;
    
    // Clear previous timeout
    if (this.skillSearchTimeout) {
      clearTimeout(this.skillSearchTimeout);
    }
    
    // If search term is empty, hide results
    if (searchTerm.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    // Debounce search
    this.skillSearchTimeout = setTimeout(async () => {
      await this._performSkillSearch(searchTerm, resultsDiv);
    }, DELAYS.SEARCH_DEBOUNCE);
  }

  /**
   * Perform the actual skill search in compendiums and world items
   */
  private async _performSkillSearch(searchTerm: string, resultsDiv: HTMLElement): Promise<void> {
    const results: any[] = [];
    
    // Store search term for potential creation
    this.lastSkillSearchTerm = searchTerm;
    
    // Search in world items first
    if (game.items) {
      for (const item of game.items as any) {
        if (item.type === 'skill' && ItemSearch.normalizeSearchText(item.name).includes(searchTerm)) {
          results.push({
            name: item.name,
            slug: item.system?.slug || '',
            uuid: item.uuid,
            pack: game.i18n!.localize('SRA2.SPECIALIZATIONS.WORLD_ITEMS'),
            linkedAttribute: item.system.linkedAttribute,
            isWorldItem: true
          });
        }
      }
    }

    // Search in all compendiums
    for (const pack of getLanguagePacks()) {
      const documents = await pack.getDocuments();

      // Filter for skills that match the search term
      for (const doc of documents) {
        if (doc.type === 'skill' && ItemSearch.normalizeSearchText(doc.name).includes(searchTerm)) {
          results.push({
            name: doc.name,
            slug: doc.system?.slug || '',
            uuid: doc.uuid,
            pack: pack.title,
            linkedAttribute: doc.system.linkedAttribute,
            isWorldItem: false
          });
        }
      }
    }
    
    // Display results
    this._displaySkillSearchResults(results, resultsDiv);
  }

  /**
   * Display skill search results
   */
  private _displaySkillSearchResults(results: any[], resultsDiv: HTMLElement): Promise<void> {
    // Check if exact match exists
    const formattedSearchTerm = this.lastSkillSearchTerm
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const exactMatch = results.find((r: any) => 
      ItemSearch.normalizeSearchText(r.name) === ItemSearch.normalizeSearchText(this.lastSkillSearchTerm)
    );
    
    let html = '';
    
    // If no results at all, show only the create button with message
    if (results.length === 0) {
      html = `
        <div class="search-result-item no-results-create">
          <div class="no-results-text">
            ${game.i18n!.localize('SRA2.SPECIALIZATIONS.SEARCH_NO_RESULTS')}
          </div>
          <button class="create-skill-btn" data-skill-name="${this.lastSkillSearchTerm}">
            <i class="fas fa-plus"></i> ${game.i18n!.localize('SRA2.SPECIALIZATIONS.CREATE_SKILL')}
          </button>
        </div>
      `;
    } else {
      // Display search results
      for (const result of results) {
        const attributeLabel = game.i18n!.localize(`SRA2.ATTRIBUTES.${result.linkedAttribute.toUpperCase()}`);
        
        html += `
          <div class="search-result-item">
            <div class="result-info">
              <span class="result-name">${result.name}</span>
              <span class="result-pack">${result.pack} - ${attributeLabel}</span>
            </div>
            <button class="link-skill-btn" data-skill-name="${result.name}" data-skill-slug="${result.slug}">
              ${game.i18n!.localize('SRA2.SPECIALIZATIONS.LINK_SKILL')}
            </button>
          </div>
        `;
      }
      
      // Add create button if exact match doesn't exist
      if (!exactMatch) {
        html += `
          <div class="search-result-item create-new-item">
            <div class="result-info">
              <span class="result-name"><i class="fas fa-plus-circle"></i> ${formattedSearchTerm}</span>
              <span class="result-pack">${game.i18n!.localize('SRA2.SPECIALIZATIONS.CREATE_NEW_SKILL')}</span>
            </div>
            <button class="create-skill-btn-inline" data-skill-name="${this.lastSkillSearchTerm}">
              ${game.i18n!.localize('SRA2.SPECIALIZATIONS.CREATE_SKILL')}
            </button>
          </div>
        `;
      }
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Attach click handlers
    resultsDiv.querySelectorAll<HTMLElement>('.link-skill-btn').forEach(elem => elem.addEventListener('click', this._onLinkSkillFromSearch.bind(this)));
    resultsDiv.querySelectorAll<HTMLElement>('.create-skill-btn, .create-skill-btn-inline').forEach(elem => elem.addEventListener('click', this._onCreateNewSkill.bind(this)));

    // Make entire result items clickable (except create button)
    resultsDiv.querySelectorAll<HTMLElement>('.search-result-item:not(.no-results-create):not(.create-new-item)').forEach(elem => elem.addEventListener('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ((event.target as HTMLElement).closest('.link-skill-btn')) return;

      // Find the button in this item and trigger its click
      const button = (event.currentTarget as HTMLElement).querySelector('.link-skill-btn') as HTMLElement | null;
      if (button) {
        button.click();
      }
    }));

    // Make create items clickable on the entire row
    resultsDiv.querySelectorAll<HTMLElement>('.search-result-item.create-new-item').forEach(elem => elem.addEventListener('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ((event.target as HTMLElement).closest('.create-skill-btn-inline')) return;

      // Find the button and trigger its click
      const button = (event.currentTarget as HTMLElement).querySelector('.create-skill-btn-inline') as HTMLElement | null;
      if (button) {
        button.click();
      }
    }));
    
    return Promise.resolve();
  }

  /**
   * Handle linking a skill from search results
   */
  private async _onLinkSkillFromSearch(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLButtonElement;
    const skillName = button.dataset.skillName;
    const skillSlug = button.dataset.skillSlug;

    if (!skillName) return;

    // Store slug if available, otherwise fall back to name
    await this.item.update({ 'system.linkedSkill': skillSlug || skillName } as any);
    
    // Clear the search input and hide results
    const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
    const searchInput = sheetEl?.querySelector('.skill-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }

    const resultsDiv2 = sheetEl?.querySelector('.skill-search-results') as HTMLElement;
    if (resultsDiv2) {
      resultsDiv2.style.display = 'none';
    }

    this.render(false);
    ui.notifications?.info(game.i18n!.format('SRA2.SPECIALIZATIONS.SKILL_LINKED', { name: skillName }));
  }

  /**
   * Handle skill search focus
   */
  private _onSkillSearchFocus(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    
    // If there's already content and results, show them
    if (input.value.trim().length > 0) {
      const resultsDiv = input.parentElement?.querySelector('.skill-search-results') as HTMLElement;
      if (resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
        resultsDiv.style.display = 'block';
      }
    }
    
    return Promise.resolve();
  }

  /**
   * Handle skill search blur
   */
  private _onSkillSearchBlur(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const blurEvent = event as FocusEvent;
    
    // Check if the new focus target is within the results div
    setTimeout(() => {
      const resultsDiv = input.parentElement?.querySelector('.skill-search-results') as HTMLElement;
      if (resultsDiv) {
        // Check if the related target (where focus is going) is inside the results div
        const relatedTarget = blurEvent.relatedTarget as HTMLElement;
        if (relatedTarget && resultsDiv.contains(relatedTarget)) {
          // Don't hide if focus is moving to an element within the results
          return;
        }
        
        // Also check if any element in the results is focused
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && resultsDiv.contains(activeElement)) {
          // Don't hide if an element in results is active
          return;
        }
        
        resultsDiv.style.display = 'none';
      }
    }, DELAYS.SEARCH_HIDE);

    return Promise.resolve();
  }

  /**
   * Handle creating a new skill from search and linking it
   */
  private async _onCreateNewSkill(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget as HTMLButtonElement;
    const skillName = button.dataset.skillName;
    
    if (!skillName) return;
    
    // Capitalize first letter of each word
    const formattedName = skillName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Create the new skill as a world item with default values
    const skillData = {
      name: formattedName,
      type: 'skill',
      system: {
        rating: 1,
        linkedAttribute: 'strength',
        description: ''
      }
    } as any;
    
    // Create as a world item
    const createdItems = await Item.create(skillData) as any;
    
    if (createdItems) {
      // Link the skill to the specialization using slug if available
      const createdSlug = createdItems.system?.slug || formattedName;
      await this.item.update({ 'system.linkedSkill': createdSlug } as any);
      
      // Clear the search input and hide results
      const sheetEl = this.element instanceof HTMLElement ? this.element : (this.element as any)?.[0] as HTMLElement;
      const searchInput = sheetEl?.querySelector('.skill-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }

      const resultsDiv2 = sheetEl?.querySelector('.skill-search-results') as HTMLElement;
      if (resultsDiv2) {
        resultsDiv2.style.display = 'none';
      }
      
      this.render(false);
      
      // Open the skill sheet for editing
      setTimeout(() => {
        if (createdItems.sheet) {
          createdItems.sheet.render(true);
        }
      }, DELAYS.SHEET_RENDER);
      
      ui.notifications?.info(game.i18n!.format('SRA2.SPECIALIZATIONS.SKILL_CREATED_AND_LINKED', { name: formattedName }));
    }
  }
}


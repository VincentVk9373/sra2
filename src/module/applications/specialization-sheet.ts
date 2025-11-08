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
    
    // Get linked skill info if exists
    if (context.system.linkedSkill) {
      // linkedSkill is stored as a name, so we display it directly
      context.linkedSkillName = context.system.linkedSkill;
      
      // If the specialization is on an actor, check if the skill exists
      if (this.item.actor) {
        const linkedSkill = this.item.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === context.system.linkedSkill
        );
        
        if (!linkedSkill) {
          // Mark as warning if skill doesn't exist on this actor
          context.linkedSkillNotFound = true;
        }
      }
    }
    
    // Get list of skills from the actor if this item is owned (for dropdown)
    if (this.item.actor) {
      const skills = this.item.actor.items.filter((i: any) => i.type === 'skill');
      context.skills = skills.map((s: any) => ({
        name: s.name
      }));
    } else {
      context.skills = [];
    }
    
    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    
    // Clear linked skill button
    html.find('[data-action="clear-linked-skill"]').on('click', this._onClearLinkedSkill.bind(this));
    
    // Skill search
    html.find('.skill-search-input').on('input', this._onSkillSearch.bind(this));
    html.find('.skill-search-input').on('focus', this._onSkillSearchFocus.bind(this));
    html.find('.skill-search-input').on('blur', this._onSkillSearchBlur.bind(this));
    
    // Close skill search results when clicking outside
    $(document).on('click.skill-search-spec', (event) => {
      const target = event.target as unknown as HTMLElement;
      const skillSearchContainer = html.find('.skill-search-container')[0] as HTMLElement;
      if (skillSearchContainer && !skillSearchContainer.contains(target)) {
        html.find('.skill-search-results').hide();
      }
    });
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    // Clean up document-level event listeners
    $(document).off('click.skill-search-spec');
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
        // Store the skill name (not ID) so the specialization can be prepared in advance
        await this.item.update({ 'system.linkedSkill': item.name } as any);
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
    const searchTerm = input.value.trim().toLowerCase();
    const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
    
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
    }, 300);
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
        if (item.type === 'skill' && item.name.toLowerCase().includes(searchTerm)) {
          results.push({
            name: item.name,
            uuid: item.uuid,
            pack: game.i18n!.localize('SRA2.SPECIALIZATIONS.WORLD_ITEMS'),
            linkedAttribute: item.system.linkedAttribute,
            isWorldItem: true
          });
        }
      }
    }
    
    // Search in all compendiums
    for (const pack of game.packs as any) {
      // Only search in Item compendiums
      if (pack.documentName !== 'Item') continue;
      
      // Get all documents from the pack
      const documents = await pack.getDocuments();
      
      // Filter for skills that match the search term
      for (const doc of documents) {
        if (doc.type === 'skill' && doc.name.toLowerCase().includes(searchTerm)) {
          results.push({
            name: doc.name,
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
      r.name.toLowerCase() === this.lastSkillSearchTerm.toLowerCase()
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
            <button class="link-skill-btn" data-skill-name="${result.name}">
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
    $(resultsDiv).find('.link-skill-btn').on('click', this._onLinkSkillFromSearch.bind(this));
    $(resultsDiv).find('.create-skill-btn, .create-skill-btn-inline').on('click', this._onCreateNewSkill.bind(this));
    
    // Make entire result items clickable (except create button)
    $(resultsDiv).find('.search-result-item:not(.no-results-create):not(.create-new-item)').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.link-skill-btn').length > 0) return;
      
      // Find the button in this item and trigger its click
      const button = $(event.currentTarget).find('.link-skill-btn')[0];
      if (button) {
        $(button).trigger('click');
      }
    });
    
    // Make create items clickable on the entire row
    $(resultsDiv).find('.search-result-item.create-new-item').on('click', (event) => {
      // Don't trigger if clicking directly on the button
      if ($(event.target).closest('.create-skill-btn-inline').length > 0) return;
      
      // Find the button and trigger its click
      const button = $(event.currentTarget).find('.create-skill-btn-inline')[0];
      if (button) {
        $(button).trigger('click');
      }
    });
    
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
    
    if (!skillName) return;
    
    // Link the skill to the specialization
    await this.item.update({ 'system.linkedSkill': skillName } as any);
    
    // Clear the search input and hide results
    const searchInput = this.element.find('.skill-search-input')[0] as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    
    const resultsDiv = this.element.find('.skill-search-results')[0] as HTMLElement;
    if (resultsDiv) {
      resultsDiv.style.display = 'none';
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
      const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
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
      const resultsDiv = $(input).siblings('.skill-search-results')[0] as HTMLElement;
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
    }, 200);
    
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
      // Link the skill to the specialization
      await this.item.update({ 'system.linkedSkill': formattedName } as any);
      
      // Clear the search input and hide results
      const searchInput = this.element.find('.skill-search-input')[0] as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
      }
      
      const resultsDiv = this.element.find('.skill-search-results')[0] as HTMLElement;
      if (resultsDiv) {
        resultsDiv.style.display = 'none';
      }
      
      this.render(false);
      
      // Open the skill sheet for editing
      setTimeout(() => {
        if (createdItems.sheet) {
          createdItems.sheet.render(true);
        }
      }, 100);
      
      ui.notifications?.info(game.i18n!.format('SRA2.SPECIALIZATIONS.SKILL_CREATED_AND_LINKED', { name: formattedName }));
    }
  }
}


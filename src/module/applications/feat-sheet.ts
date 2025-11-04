/**
 * Feat Sheet Application
 */
export class FeatSheet extends ItemSheet {
  static override get defaultOptions(): DocumentSheet.Options<Item> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'item', 'feat'],
      template: 'systems/sra2/templates/item-feat-sheet.hbs',
      width: 520,
      height: 480,
      tabs: [],
      dragDrop: [
        { dropSelector: '.rr-target-drop-zone' }
      ],
      submitOnChange: true,
    });
  }

  override getData(): any {
    const context = super.getData() as any;
    context.system = this.item.system;
    
    // Build RR entries array from rrType, rrValue, and rrTarget arrays
    context.rrEntries = [];
    const rrTypes = context.system.rrType || [];
    const rrValues = context.system.rrValue || [];
    const rrTargets = context.system.rrTarget || [];
    
    for (let i = 0; i < rrTypes.length; i++) {
      const rrType = rrTypes[i];
      const rrValue = rrValues[i] || 0;
      const rrTarget = rrTargets[i] || '';
      
      const entry: any = {
        index: i,
        rrType,
        rrValue,
        rrTarget,
        rrTargetName: rrTarget
      };
      
      if (rrType === 'skill' || rrType === 'specialization') {
        entry.rrTargetType = rrType === 'skill' 
          ? game.i18n!.localize('SRA2.FEATS.RR_TYPE.SKILL')
          : game.i18n!.localize('SRA2.FEATS.RR_TYPE.SPECIALIZATION');
        
        // If the feat is on an actor, check if the target exists
        if (this.item.actor && rrTarget) {
          const targetItem = this.item.actor.items.find((i: any) => 
            i.type === rrType && i.name === rrTarget
          );
          
          if (!targetItem) {
            entry.rrTargetNotFound = true;
          }
        }
      }
      
      context.rrEntries.push(entry);
    }
    
    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    
    // Add RR entry button
    html.find('[data-action="add-rr-entry"]').on('click', this._onAddRREntry.bind(this));
    
    // Remove RR entry button
    html.find('[data-action="remove-rr-entry"]').on('click', this._onRemoveRREntry.bind(this));
    
    // Clear RR target button
    html.find('[data-action="clear-rr-target"]').on('click', this._onClearRRTarget.bind(this));
  }

  /**
   * Handle adding a new RR entry
   */
  private async _onAddRREntry(event: Event): Promise<void> {
    event.preventDefault();
    
    const rrTypes = [...((this.item.system as any).rrType || [])];
    const rrValues = [...((this.item.system as any).rrValue || [])];
    const rrTargets = [...((this.item.system as any).rrTarget || [])];
    
    rrTypes.push('skill');
    rrValues.push(0);
    rrTargets.push('');
    
    await this.item.update({
      'system.rrType': rrTypes,
      'system.rrValue': rrValues,
      'system.rrTarget': rrTargets
    } as any);
    
    this.render(false);
  }

  /**
   * Handle removing an RR entry
   */
  private async _onRemoveRREntry(event: Event): Promise<void> {
    event.preventDefault();
    
    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    
    const rrTypes = [...((this.item.system as any).rrType || [])];
    const rrValues = [...((this.item.system as any).rrValue || [])];
    const rrTargets = [...((this.item.system as any).rrTarget || [])];
    
    rrTypes.splice(index, 1);
    rrValues.splice(index, 1);
    rrTargets.splice(index, 1);
    
    await this.item.update({
      'system.rrType': rrTypes,
      'system.rrValue': rrValues,
      'system.rrTarget': rrTargets
    } as any);
    
    this.render(false);
  }

  /**
   * Handle clearing the RR target for a specific entry
   */
  private async _onClearRRTarget(event: Event): Promise<void> {
    event.preventDefault();
    
    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    const rrTargets = [...((this.item.system as any).rrTarget || [])];
    
    rrTargets[index] = '';
    
    await this.item.update({ 'system.rrTarget': rrTargets } as any);
    this.render(false);
  }

  /**
   * Handle dropping a skill or specialization onto the RR target field
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    const data = TextEditor.getDragEventData(event) as any;
    
    // Handle Item drops
    if (data && data.type === 'Item') {
      const item = await Item.implementation.fromDropData(data) as any;
      
      if (!item) return super._onDrop(event);
      
      // Find the drop zone and get the index
      const dropZone = (event.target as HTMLElement).closest('[data-rr-index]');
      if (!dropZone) return super._onDrop(event);
      
      const index = parseInt((dropZone as HTMLElement).dataset.rrIndex || '0');
      const rrTypes = [...((this.item.system as any).rrType || [])];
      const rrType = rrTypes[index];
      
      // Check if it's a skill or specialization matching the RR type
      if (item.type === 'skill' && rrType === 'skill') {
        // Store the skill name (not ID) so the feat can be prepared in advance
        const rrTargets = [...((this.item.system as any).rrTarget || [])];
        rrTargets[index] = item.name;
        await this.item.update({ 'system.rrTarget': rrTargets } as any);
        this.render(false);
        ui.notifications?.info(game.i18n!.format('SRA2.FEATS.LINKED_TO_TARGET', { name: item.name }));
        return;
      } else if (item.type === 'specialization' && rrType === 'specialization') {
        // Store the specialization name (not ID) so the feat can be prepared in advance
        const rrTargets = [...((this.item.system as any).rrTarget || [])];
        rrTargets[index] = item.name;
        await this.item.update({ 'system.rrTarget': rrTargets } as any);
        this.render(false);
        ui.notifications?.info(game.i18n!.format('SRA2.FEATS.LINKED_TO_TARGET', { name: item.name }));
        return;
      } else if (rrType === 'skill' || rrType === 'specialization') {
        // Wrong type of item
        ui.notifications?.warn(game.i18n!.localize('SRA2.FEATS.WRONG_TARGET_TYPE'));
        return;
      }
    }

    return super._onDrop(event);
  }

  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    const expandedData = foundry.utils.expandObject(formData);
    return this.item.update(expandedData);
  }
}


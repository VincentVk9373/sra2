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
    
    // Build RR entries array from rrList
    context.rrEntries = [];
    const rrList = context.system.rrList || [];
    
    for (let i = 0; i < rrList.length; i++) {
      const rrEntry = rrList[i];
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';
      
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
    
    const rrList = [...((this.item.system as any).rrList || [])];
    
    rrList.push({
      rrType: 'skill',
      rrValue: 0,
      rrTarget: ''
    });
    
    await this.item.update({
      'system.rrList': rrList
    } as any);
    
    this.render(false);
  }

  /**
   * Handle removing an RR entry
   */
  private async _onRemoveRREntry(event: Event): Promise<void> {
    event.preventDefault();
    
    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    
    const rrList = [...((this.item.system as any).rrList || [])];
    
    rrList.splice(index, 1);
    
    await this.item.update({
      'system.rrList': rrList
    } as any);
    
    this.render(false);
  }

  /**
   * Handle clearing the RR target for a specific entry
   */
  private async _onClearRRTarget(event: Event): Promise<void> {
    event.preventDefault();
    
    const index = parseInt((event.currentTarget as HTMLElement).dataset.index || '0');
    const rrList = [...((this.item.system as any).rrList || [])];
    
    if (rrList[index]) {
      rrList[index] = { ...rrList[index], rrTarget: '' };
    }
    
    await this.item.update({ 'system.rrList': rrList } as any);
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
      const rrList = [...((this.item.system as any).rrList || [])];
      const rrType = rrList[index]?.rrType;
      
      // Check if it's a skill or specialization matching the RR type
      if (item.type === 'skill' && rrType === 'skill') {
        // Store the skill name (not ID) so the feat can be prepared in advance
        rrList[index] = { ...rrList[index], rrTarget: item.name };
        await this.item.update({ 'system.rrList': rrList } as any);
        this.render(false);
        ui.notifications?.info(game.i18n!.format('SRA2.FEATS.LINKED_TO_TARGET', { name: item.name }));
        return;
      } else if (item.type === 'specialization' && rrType === 'specialization') {
        // Store the specialization name (not ID) so the feat can be prepared in advance
        rrList[index] = { ...rrList[index], rrTarget: item.name };
        await this.item.update({ 'system.rrList': rrList } as any);
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


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
}


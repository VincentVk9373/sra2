/**
 * NPC Sheet Application
 * NPCs don't roll dice - they use predefined thresholds
 * Threshold = floor(dice pool / 3) + RR level + 1
 */
export class NpcSheet extends ActorSheet {
  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'npc'],
      template: 'systems/sra2/templates/actor-npc-sheet.hbs',
      width: 800,
      height: 700,
      tabs: [],
      dragDrop: [
        { dragSelector: '.skill-item', dropSelector: '.skills-list' },
        { dragSelector: '.feat-item', dropSelector: '.feats-list' },
        { dragSelector: '.specialization-item', dropSelector: '.skills-list' }
      ],
      submitOnChange: true,
    });
  }

  override getData(): any {
    const context = super.getData() as any;

    // Ensure system data is available
    context.system = this.actor.system;

    // Get feats
    const allFeats = this.actor.items.filter((item: any) => item.type === 'feat');
    context.feats = allFeats;

    // Get skills with NPC threshold calculations
    const skills = this.actor.items.filter((item: any) => item.type === 'skill');
    
    // Get all specializations
    const allSpecializations = this.actor.items.filter((item: any) => item.type === 'specialization');
    
    // Organize specializations by linked skill
    const specializationsBySkill = new Map<string, any[]>();
    
    allSpecializations.forEach((spec: any) => {
      const linkedSkillName = spec.system.linkedSkill;
      if (linkedSkillName) {
        const linkedSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        
        if (linkedSkill && linkedSkill.id) {
          const skillId = linkedSkill.id;
          if (!specializationsBySkill.has(skillId)) {
            specializationsBySkill.set(skillId, []);
          }
          specializationsBySkill.get(skillId)!.push(spec);
        }
      }
    });

    // Calculate NPC thresholds for skills
    const skillsWithThresholds = skills.map((skill: any) => {
      const skillData = { ...skill };
      
      // Get attribute value
      const linkedAttribute = skill.system.linkedAttribute;
      let attributeValue = 0;
      if (linkedAttribute && this.actor.system.attributes) {
        attributeValue = this.actor.system.attributes[linkedAttribute] || 0;
      }
      
      // Calculate total dice pool (attribute + skill rating)
      const skillRating = skill.system.rating || 0;
      const totalDicePool = attributeValue + skillRating;
      
      // Calculate total RR for this skill
      let totalRR = 0;
      
      // Get all active feats
      const activeFeats = this.actor.items.filter((item: any) => 
        item.type === 'feat' && item.system.active === true
      );
      
      // Check each feat for RR that applies to this skill
      activeFeats.forEach((feat: any) => {
        const rrList = feat.system.rrList || [];
        rrList.forEach((rrEntry: any) => {
          if (rrEntry.rrType === 'skill' && rrEntry.rrTarget === skill.name) {
            totalRR += rrEntry.rrValue || 0;
          }
          // Also check for attribute RR
          if (rrEntry.rrType === 'attribute' && rrEntry.rrTarget === linkedAttribute) {
            totalRR += rrEntry.rrValue || 0;
          }
        });
      });
      
      // Calculate NPC threshold: floor(dice pool / 3) + RR + 1
      const npcThreshold = Math.floor(totalDicePool / 3) + totalRR + 1;
      
      skillData.totalDicePool = totalDicePool;
      skillData.totalRR = totalRR;
      skillData.npcThreshold = npcThreshold;
      
      // Attach specializations for this skill with their thresholds
      const specs = specializationsBySkill.get(skill.id) || [];
      skillData.specializations = specs.map((spec: any) => {
        const specData = { ...spec };
        
        // Specialization adds +2 dice to the pool
        const specDicePool = totalDicePool + 2;
        
        // Calculate total RR for specialization
        let specTotalRR = totalRR; // Inherits skill's RR
        
        // Check for specialization-specific RR
        activeFeats.forEach((feat: any) => {
          const rrList = feat.system.rrList || [];
          rrList.forEach((rrEntry: any) => {
            if (rrEntry.rrType === 'specialization' && rrEntry.rrTarget === spec.name) {
              specTotalRR += rrEntry.rrValue || 0;
            }
          });
        });
        
        // Calculate specialization threshold
        const specThreshold = Math.floor(specDicePool / 3) + specTotalRR + 1;
        
        specData.totalDicePool = specDicePool;
        specData.totalRR = specTotalRR;
        specData.npcThreshold = specThreshold;
        
        return specData;
      });
      
      return skillData;
    });

    context.skills = skillsWithThresholds;

    return context;
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    // Edit skill
    html.find('[data-action="edit-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete skill
    html.find('[data-action="delete-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.SKILLS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Edit specialization
    html.find('[data-action="edit-specialization"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete specialization
    html.find('[data-action="delete-specialization"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.SPECIALIZATIONS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Edit feat
    html.find('[data-action="edit-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet?.render(true);
      }
    });

    // Delete feat
    html.find('[data-action="delete-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const itemId = $(event.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (item) {
        const confirmed = await Dialog.confirm({
          title: game.i18n!.localize('SRA2.FEATS.DELETE'),
          content: `<p>${game.i18n!.format('SRA2.CONFIRM_DELETE', { name: item.name })}</p>`,
        });
        if (confirmed) {
          await item.delete();
        }
      }
    });

    // Add world skill button
    html.find('[data-action="add-world-skill"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      this._showItemBrowser('skill');
    });

    // Add world feat button
    html.find('[data-action="add-world-feat"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();
      this._showItemBrowser('feat');
    });
  }

  /**
   * Show item browser dialog
   */
  private async _showItemBrowser(itemType: string): Promise<void> {
    const items = game.items!.filter((item: any) => item.type === itemType);
    
    const itemOptions = items.map((item: any) => {
      return `<option value="${item.id}">${item.name}</option>`;
    }).join('');

    const content = `
      <div class="form-group">
        <label>${game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.WORLD_ITEMS`)}</label>
        <select id="item-select" style="width: 100%;">
          <option value="">${game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.SEARCH_PLACEHOLDER`)}</option>
          ${itemOptions}
        </select>
      </div>
    `;

    new Dialog({
      title: game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.ADD_${itemType.toUpperCase()}`),
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: game.i18n!.localize(`SRA2.${itemType.toUpperCase()}S.ADD_${itemType.toUpperCase()}`),
          callback: async (html: JQuery) => {
            const itemId = html.find('#item-select').val() as string;
            if (itemId) {
              const item = game.items!.get(itemId);
              if (item) {
                await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
              }
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('Cancel')
        }
      },
      default: 'add'
    }).render(true);
  }

  protected override async _onDropItem(event: DragEvent, data: ActorSheet.DropData.Item): Promise<unknown> {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;

    // Check if item already exists on the actor
    const existingItem = this.actor.items.find((i: any) => i.name === item.name && i.type === item.type);
    if (existingItem) {
      ui.notifications!.warn(game.i18n!.format('SRA2.ALREADY_EXISTS', { name: item.name }));
      return false;
    }

    // Create the item on the actor
    return await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
  }
}


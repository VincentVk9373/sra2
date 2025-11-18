import { RollRequestData } from '../helpers/dice-roller.js';

/**
 * Roll Dialog Application
 * Displays roll information in a popup dialog
 */
export class RollDialog extends Application {
  private rollData: RollRequestData;
  private actor: any = null;
  private targetToken: any = null;

  constructor(rollData: RollRequestData) {
    super();
    this.rollData = rollData;
    
    // Get actor from roll data
    if (rollData.actorUuid) {
      this.actor = fromUuidSync(rollData.actorUuid);
    } else if (rollData.actorId) {
      this.actor = game.actors?.get(rollData.actorId) || null;
    }
    
    // Get target token (first targeted token)
    const targets = Array.from(game.user?.targets || []);
    if (targets.length > 0) {
      this.targetToken = targets[0] || null;
    }
  }

  static override get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'roll-dialog'],
      template: 'systems/sra2/templates/roll-dialog.hbs',
      width: 450,
      height: 450,
      resizable: true,
      minimizable: false,
      title: 'Jet de Dés'
    });
  }

  override getData(): any {
    const context: any = {
      rollData: this.rollData,
      actor: this.actor,
      targetToken: this.targetToken
    };

    // Calculate dice pool
    let dicePool = 0;
    if (this.rollData.specLevel !== undefined) {
      dicePool = this.rollData.specLevel;
    } else if (this.rollData.skillLevel !== undefined) {
      dicePool = this.rollData.skillLevel;
    } else if (this.rollData.linkedAttribute) {
      const attributeValue = (this.actor?.system as any)?.attributes?.[this.rollData.linkedAttribute] || 0;
      dicePool = attributeValue;
    }
    context.dicePool = dicePool;

    let threshold = this.rollData.threshold;
    context.threshold = threshold;
    context.hasThreshold = threshold !== undefined;

    // Get skill/spec name
    context.skillDisplayName = this.rollData.specName || this.rollData.skillName || this.rollData.linkedAttackSkill || 'Aucune';

    // Calculate total RR and get RR sources
    // rrList already contains RRSource objects with featName and rrValue
    let totalRR = 0;
    const rrSources: any[] = [];
    if (this.rollData.rrList && Array.isArray(this.rollData.rrList)) {
      for (const rrSource of this.rollData.rrList) {
        if (rrSource && typeof rrSource === 'object') {
          const rrValue = rrSource.rrValue || 0;
          if (rrValue > 0) {
            rrSources.push({
              featName: rrSource.featName || 'Inconnu',
              rrValue: rrValue
            });
            totalRR += rrValue;
          }
        }
      }
    }
    context.totalRR = Math.min(3, totalRR); // RR is capped at 3
    context.rrSources = rrSources;

    // Get VD (Valeur de Défense) - this would be from the target or weapon
    // For now, we'll show weapon VD if available
    context.vd = this.rollData.damageValue || 0;

    // Get all skills and specializations from actor, organized hierarchically
    if (this.actor) {
      const skills = this.actor.items
        .filter((item: any) => item.type === 'skill')
        .map((skill: any) => {
          const linkedAttribute = skill.system?.linkedAttribute || 'strength';
          const attributeValue = (this.actor?.system as any)?.attributes?.[linkedAttribute] || 0;
          const skillRating = skill.system?.rating || 0;
          return {
            id: skill.id,
            name: skill.name,
            rating: skillRating,
            linkedAttribute: linkedAttribute,
            dicePool: attributeValue + skillRating,
            type: 'skill',
            specializations: [] as any[]
          };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      // Get all specializations and group them under their parent skills
      const allSpecializations = this.actor.items
        .filter((item: any) => item.type === 'specialization')
        .map((spec: any) => {
          const linkedAttribute = spec.system?.linkedAttribute || 'strength';
          const linkedSkillName = spec.system?.linkedSkill;
          const attributeValue = (this.actor?.system as any)?.attributes?.[linkedAttribute] || 0;
          
          // Find parent skill
          const parentSkill = this.actor!.items.find((i: any) => 
            i.type === 'skill' && i.name === linkedSkillName
          );
          const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
          const effectiveRating = skillRating + 2; // +2 from specialization
          
          return {
            id: spec.id,
            name: spec.name,
            rating: effectiveRating,
            linkedAttribute: linkedAttribute,
            dicePool: attributeValue + effectiveRating,
            type: 'specialization',
            linkedSkillName: linkedSkillName
          };
        });

      // Group specializations under their parent skills
      for (const spec of allSpecializations) {
        const parentSkill = skills.find((s: any) => s.name === spec.linkedSkillName);
        if (parentSkill) {
          parentSkill.specializations.push(spec);
        }
      }

      // Sort specializations within each skill
      for (const skill of skills) {
        skill.specializations.sort((a: any, b: any) => a.name.localeCompare(b.name));
      }

      // Create flat list for dropdown (skill first, then its specializations)
      const dropdownOptions: any[] = [];
      for (const skill of skills) {
        // Add skill option
        const skillSelected = skill.name === this.rollData.skillName || 
                             (this.rollData.linkedAttackSkill && skill.name === this.rollData.linkedAttackSkill);
        dropdownOptions.push({
          value: `skill:${skill.id}`,
          label: `${skill.name} (${skill.dicePool} dés)`,
          type: 'skill',
          id: skill.id,
          name: skill.name,
          dicePool: skill.dicePool,
          linkedAttribute: skill.linkedAttribute,
          rating: skill.rating,
          isSelected: skillSelected && !this.rollData.specName
        });

        // Add specializations under this skill
        for (const spec of skill.specializations) {
          const specSelected = spec.name === this.rollData.specName ||
                              (this.rollData.linkedAttackSpecialization && spec.name === this.rollData.linkedAttackSpecialization);
          dropdownOptions.push({
            value: `spec:${spec.id}`,
            label: `  └ ${spec.name} (${spec.dicePool} dés)`,
            type: 'specialization',
            id: spec.id,
            name: spec.name,
            dicePool: spec.dicePool,
            linkedAttribute: spec.linkedAttribute,
            linkedSkillName: spec.linkedSkillName,
            rating: spec.rating,
            isSelected: specSelected
          });
        }
      }

      context.skillsWithSpecs = skills;
      context.dropdownOptions = dropdownOptions;
      
      // Determine selected value for dropdown
      if (this.rollData.specName) {
        const selectedSpec = dropdownOptions.find((opt: any) => opt.type === 'specialization' && opt.name === this.rollData.specName);
        context.selectedValue = selectedSpec ? selectedSpec.value : '';
      } else if (this.rollData.skillName) {
        const selectedSkill = dropdownOptions.find((opt: any) => opt.type === 'skill' && opt.name === this.rollData.skillName);
        context.selectedValue = selectedSkill ? selectedSkill.value : '';
      } else {
        context.selectedValue = '';
      }
    }

    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    
    // Close button
    html.find('.close-button').on('click', () => {
      this.close();
    });

    // Skill/Spec selection dropdown (only if no threshold)
    html.find('.skill-dropdown').on('change', (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      
      // Don't allow changes if threshold is set
      if (this.rollData.threshold !== undefined) {
        return;
      }
      
      const value = select.value;
      
      if (!value || !this.actor) return;

      const [type, id] = value.split(':');
      if (!type || !id) return;

      const item = this.actor.items.get(id);
      if (!item) return;

      if (type === 'skill') {
        const skillSystem = item.system as any;
        const linkedAttribute = skillSystem.linkedAttribute || 'strength';
        const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
        const skillRating = skillSystem.rating || 0;
        const dicePool = attributeValue + skillRating;
        
        // Update roll data
        this.rollData.skillName = item.name;
        this.rollData.specName = undefined;
        this.rollData.skillLevel = dicePool;
        this.rollData.specLevel = undefined;
        this.rollData.linkedAttribute = linkedAttribute;
        
        // Recalculate RR and threshold
        this.updateRRForSkill(item.name, linkedAttribute, dicePool);
      } else if (type === 'spec') {
        const specSystem = item.system as any;
        const linkedAttribute = specSystem.linkedAttribute || 'strength';
        const linkedSkillName = specSystem.linkedSkill;
        const attributeValue = (this.actor.system as any).attributes?.[linkedAttribute] || 0;
        
        // Find parent skill
        const parentSkill = this.actor.items.find((i: any) => 
          i.type === 'skill' && i.name === linkedSkillName
        );
        const skillRating = parentSkill ? (parentSkill.system as any).rating || 0 : 0;
        const effectiveRating = skillRating + 2;
        const dicePool = attributeValue + effectiveRating;
        
        // Update roll data
        this.rollData.specName = item.name;
        this.rollData.skillName = linkedSkillName;
        this.rollData.skillLevel = skillRating;
        this.rollData.specLevel = dicePool;
        this.rollData.linkedAttribute = linkedAttribute;
        
        // Recalculate RR and threshold
        this.updateRRForSpec(item.name, linkedSkillName, linkedAttribute, dicePool);
      }
      
      // Re-render
      this.render();
    });
  }

  private updateRRForSkill(skillName: string, linkedAttribute: string, dicePool: number): void {
    if (!this.actor) return;
    
    // Import helper function
    import('../helpers/sheet-helpers.js').then((module) => {
      const skillRRSources = module.getRRSources(this.actor!, 'skill', skillName);
      const attributeRRSources = module.getRRSources(this.actor!, 'attribute', linkedAttribute);
      this.rollData.rrList = [...skillRRSources, ...attributeRRSources];
      
      // Recalculate threshold if it was set
      if (this.rollData.threshold !== undefined) {
        const totalRR = Math.min(3, skillRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0) + 
                                  attributeRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0));
        this.rollData.threshold = Math.round(dicePool / 3) + totalRR + 1;
      }
      
      this.render();
    });
  }

  private updateRRForSpec(specName: string, skillName: string, linkedAttribute: string, dicePool: number): void {
    if (!this.actor) return;
    
    // Import helper function
    import('../helpers/sheet-helpers.js').then((module) => {
      const specRRSources = module.getRRSources(this.actor!, 'specialization', specName);
      const skillRRSources = module.getRRSources(this.actor!, 'skill', skillName);
      const attributeRRSources = module.getRRSources(this.actor!, 'attribute', linkedAttribute);
      this.rollData.rrList = [...specRRSources, ...skillRRSources, ...attributeRRSources];
      
      // Recalculate threshold if it was set
      if (this.rollData.threshold !== undefined) {
        const totalRR = Math.min(3, specRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0) + 
                                  skillRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0) + 
                                  attributeRRSources.reduce((sum: number, r: any) => sum + (r.rrValue || 0), 0));
        this.rollData.threshold = Math.round(dicePool / 3) + totalRR + 1;
      }
      
      this.render();
    });
  }
}


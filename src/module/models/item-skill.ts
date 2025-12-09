/**
 * Data model for Skill items
 */
export class SkillDataModel extends foundry.abstract.TypeDataModel<any, Item> {
  static override defineSchema(): any {
    const fields = foundry.data.fields;
    
    return {
      rating: new fields.NumberField({
        required: true,
        initial: 1,
        min: 0,
        max: 8,
        integer: true,
        label: "SRA2.SKILLS.RATING"
      }),
      linkedAttribute: new fields.StringField({
        required: true,
        initial: "strength",
        choices: {
          strength: "SRA2.ATTRIBUTES.STRENGTH",
          agility: "SRA2.ATTRIBUTES.AGILITY",
          willpower: "SRA2.ATTRIBUTES.WILLPOWER",
          logic: "SRA2.ATTRIBUTES.LOGIC",
          charisma: "SRA2.ATTRIBUTES.CHARISMA"
        },
        label: "SRA2.SKILLS.LINKED_ATTRIBUTE"
      }),
      description: new fields.HTMLField({
        required: true,
        initial: ""
      }),
      bookmarked: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.SKILLS.BOOKMARKED"
      }),
      reference: new fields.StringField({
        required: false,
        initial: "",
        label: "SRA2.REFERENCE"
      })
    };
  }

  override prepareDerivedData(): void {
    // Calculate cost based on rating
    // 2500 per rating up to 5, then 5000 per rating above 5
    const rating = (this as any).rating || 0;
    
    let calculatedCost = 0;
    if (rating <= 5) {
      calculatedCost = rating * 2500;
    } else {
      // First 5 levels at 2500 each, remaining levels at 5000 each
      calculatedCost = 5 * 2500 + (rating - 5) * 5000;
    }
    
    (this as any).calculatedCost = calculatedCost;
  }
}


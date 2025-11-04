/**
 * Data model for NPC actors
 */
export class NpcDataModel extends foundry.abstract.TypeDataModel<any, Actor> {
  static override defineSchema(): any {
    const fields = foundry.data.fields;
    
    return {
      state: new fields.SchemaField({
        health: new fields.NumberField({
          required: true,
          initial: 10,
          min: 0,
          integer: true
        }),
        maxHealth: new fields.NumberField({
          required: true,
          initial: 10,
          min: 1,
          integer: true
        }),
        armor: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          integer: true
        })
      }),
      difficulty: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 6,
        integer: true,
        label: "SRA2.NPC.DIFFICULTY"
      }),
      description: new fields.HTMLField({
        required: true,
        initial: ""
      })
    };
  }

  override prepareDerivedData(): void {
    // Add any derived data calculations here
  }
}


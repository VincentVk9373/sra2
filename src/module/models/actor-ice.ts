/**
 * Data model for ICE actors
 */
export const ICE_TYPES = {
  patrol: 'Patrouilleuse',
  acid: 'Acide',
  blaster: 'Blaster',
  blocker: 'Bloqueuse',
  black: 'Noire',
  glue: 'Pot de colle',
  tracker: 'Traqueuse',
  killer: 'Tueuse'
} as const;

export type IceType = keyof typeof ICE_TYPES;

export class IceDataModel extends foundry.abstract.TypeDataModel<any, Actor> {
  static override defineSchema(): any {
    const fields = foundry.data.fields;
    
    // Build ICE type choices from ICE_TYPES
    const iceTypeChoices: Record<string, string> = {};
    Object.entries(ICE_TYPES).forEach(([key, value]) => {
      iceTypeChoices[key] = value;
    });
    
    return {
      iceType: new fields.StringField({
        required: false,
        nullable: true,
        choices: iceTypeChoices,
        label: "SRA2.ICE.ICE_TYPE"
      }),
      serverIndex: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 12,
        integer: true,
        label: "SRA2.ICE.SERVER_INDEX"
      }),
      damage: new fields.SchemaField({
        light: new fields.ArrayField(new fields.BooleanField({
          required: true,
          initial: false
        }), {
          required: true,
          initial: [false, false]
        }),
        severe: new fields.ArrayField(new fields.BooleanField({
          required: true,
          initial: false
        }), {
          required: true,
          initial: [false]
        }),
        incapacitating: new fields.BooleanField({
          required: true,
          initial: false
        })
      })
    };
  }

  override prepareDerivedData(): void {
    const serverIndex = (this as any).serverIndex || 1;
    
    // Firewall is always 1 for ICEs
    const firewall = 1;
    (this as any).attributes = {
      firewall: firewall
    };
    
    // Threshold equals server index (number of successes)
    (this as any).threshold = serverIndex;
    
    // Calculate damage thresholds based on FW = 1
    // Light: 1, Severe: 2, Incapacitating: 3
    (this as any).damageThresholds = {
      light: 1,
      severe: 2,
      incapacitating: 3
    };
    
    // Calculate damage value based on ICE type and server index
    const iceType = (this as any).iceType || '';
    let damageValue = 0;
    
    if (iceType === 'blaster' || iceType === 'black') {
      // VD = Indice du serveur/2 (arrondi au supérieur)
      damageValue = Math.ceil(serverIndex / 2);
    } else if (iceType === 'killer') {
      // VD = Indice du serveur
      damageValue = serverIndex;
    }
    // Other ICE types don't deal damage
    
    (this as any).damageValue = damageValue;
  }
}


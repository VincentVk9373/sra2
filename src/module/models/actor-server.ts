/**
 * Data model for Server actors
 */

export const SERVER_LEVELS = {
  bricole: { index: 2, label: 'SRA2.SERVER.LEVEL.BRICOLE' },
  basDeGamme: { index: 3, label: 'SRA2.SERVER.LEVEL.BAS_DE_GAMME' },
  moyen: { index: 4, label: 'SRA2.SERVER.LEVEL.MOYEN' },
  securise: { index: 5, label: 'SRA2.SERVER.LEVEL.SECURISE' },
  hauteSecurite: { index: 6, label: 'SRA2.SERVER.LEVEL.HAUTE_SECURITE' },
  extreme: { index: 7, label: 'SRA2.SERVER.LEVEL.EXTREME' },
} as const;

export type ServerLevel = keyof typeof SERVER_LEVELS;

export class ServerDataModel extends foundry.abstract.TypeDataModel<any, Actor> {
  static override defineSchema(): any {
    const fields = foundry.data.fields;

    return {
      serverIndex: new fields.NumberField({
        required: true,
        initial: 4,
        min: 2,
        max: 12,
        integer: true,
        label: "SRA2.SERVER.INDEX"
      }),
      physicalSecurity: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SRA2.SERVER.PHYSICAL_SECURITY"
      }),
      linkedICE: new fields.ArrayField(new fields.StringField({
        required: true,
        initial: ""
      }), {
        required: true,
        initial: [],
        label: "SRA2.SERVER.ICE_ROSTER"
      }),
      description: new fields.HTMLField({
        required: false,
        initial: "",
        label: "SRA2.SERVER.DESCRIPTION"
      })
    };
  }

  override prepareDerivedData(): void {
    const serverIndex = (this as any).serverIndex || 4;
    const physicalSecurity = (this as any).physicalSecurity || false;

    const effectiveIndex = serverIndex + (physicalSecurity ? 1 : 0);
    (this as any).effectiveIndex = effectiveIndex;
    (this as any).firewall = effectiveIndex;
  }
}

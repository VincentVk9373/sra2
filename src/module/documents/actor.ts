/**
 * Custom Actor document for SRA2
 */
export class SRA2Actor<SubType extends Actor.SubType = Actor.SubType> extends Actor<SubType> {
  /**
   * Migrate legacy embedded item types before validation.
   * Runs before the document schema is validated, so invalid types can be fixed.
   */
  static override migrateData(source: any): any {
    if (source.items?.length) {
      for (const item of source.items) {
        // Legacy "race" type → "metatype"
        if (item.type === 'race') {
          item.type = 'metatype';
        }
      }
    }
    return super.migrateData(source);
  }

  get feats(): Item[] {
    return this.items.filter((item: Item) => item.type === 'feat');
  }
}
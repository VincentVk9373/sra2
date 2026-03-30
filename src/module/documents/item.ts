/**
 * Custom Item document for SRA2
 */
export class SRA2Item extends Item {
  /**
   * Migrate legacy item types before validation.
   * Runs before the document schema is validated, so invalid types can be fixed.
   */
  static override migrateData(source: any): any {
    // Legacy "race" type → "metatype"
    if (source.type === 'race') {
      source.type = 'metatype';
    }
    return super.migrateData(source);
  }
}

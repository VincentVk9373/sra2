/**
 * Custom Actor document for SRA2
 */
export class SRA2Actor<SubType extends Actor.SubType = Actor.SubType> extends Actor<SubType> {
  get feats(): Item[] {
    return this.items.filter((item: Item) => item.type === 'feat');
  }
}
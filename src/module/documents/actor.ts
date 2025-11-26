/**
 * Custom Actor document for SRA2
 */
export class SRA2Actor<SubType extends Actor.SubType = Actor.SubType> extends Actor<SubType> {
  get feats(): Item[] {
    return this.items.filter((item: Item) => item.type === 'feat');
  }

  protected override _preCreate(data: any, options: any, user: any): void {
    super._preCreate(data, options, user);
    
    // Set default image for ICE actors
    if (data.type === 'ice') {
      if (!data.img || data.img === 'icons/svg/mystery-man.svg' || data.img === '') {
        foundry.utils.mergeObject(data, { img: 'systems/sra2/icons/items/powersprite.svg' });
      }
    }
  }
}
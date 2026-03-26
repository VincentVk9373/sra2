import * as SheetHelpers from '../helpers/sheet-helpers.js';
import * as CombatHelpers from '../helpers/combat-helpers.js';
import { ICE_TYPES } from '../models/actor-ice.js';

/**
 * ICE Sheet Application
 */
export class IceSheet extends ActorSheet {
  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'ice'],
      template: 'systems/sra2/templates/actor-ice-sheet.hbs',
      width: 600,
      height: 840,
      tabs: [],
      dragDrop: [],
      submitOnChange: false,
    });
  }

  /**
   * Handle form submission to update actor data
   */
  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    const expandedData = SheetHelpers.handleSheetUpdate(this.actor, formData);
    return this.actor.update(expandedData);
  }

  override getData(): any {
    const context = super.getData() as any;

    // Ensure system data is available
    context.system = this.actor.system;

    // Add ICE types for selection
    context.iceTypes = ICE_TYPES;

    // Get ICE type description
    const iceType = (this.actor.system as any).iceType || '';
    context.iceTypeDescription = this._getIceTypeDescription(iceType);

    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Submit on damage checkbox change so the visual state updates
    html.find('.damage-track input[type="checkbox"]').on('change', () => this.submit());

    // Handle ICE type change
    html.find('.ice-type-select').on('change', this._onIceTypeChange.bind(this));

    // Handle server index change
    html.find('input[name="system.serverIndex"]').on('change', this._onServerIndexChange.bind(this));

    // Handle ICE attack button
    html.find('.ice-attack-button').on('click', this._onIceAttack.bind(this));
  }

  /**
   * Handle ICE type selection change
   */
  private async _onIceTypeChange(event: Event): Promise<void> {
    event.preventDefault();

    // Submit the full form first to preserve name/img changes
    await this.submit();
  }

  /**
   * Handle server index change - update actor and re-render
   */
  private async _onServerIndexChange(event: Event): Promise<void> {
    // Submit the full form first to preserve name/img changes
    await this.submit();
  }

  /**
   * Get description for ICE type
   */
  private _getIceTypeDescription(iceType: string): string {
    const descriptions: Record<string, string> = {
      patrol: 'SRA2.ICE.DESCRIPTION.PATROL',
      acid: 'SRA2.ICE.DESCRIPTION.ACID',
      blaster: 'SRA2.ICE.DESCRIPTION.BLASTER',
      blocker: 'SRA2.ICE.DESCRIPTION.BLOCKER',
      black: 'SRA2.ICE.DESCRIPTION.BLACK',
      glue: 'SRA2.ICE.DESCRIPTION.GLUE',
      tracker: 'SRA2.ICE.DESCRIPTION.TRACKER',
      killer: 'SRA2.ICE.DESCRIPTION.KILLER'
    };
    
    return descriptions[iceType] || '';
  }

  /**
   * Handle ICE attack button click
   */
  private async _onIceAttack(event: Event): Promise<void> {
    event.preventDefault();
    
    // Get selected token (defender)
    const controlledTokens = canvas?.tokens?.controlled || [];
    if (controlledTokens.length === 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.ICE.ATTACK.NO_TARGET'));
      return;
    }
    
    const defenderToken = controlledTokens[0];
    const defender = defenderToken?.actor;

    if (!defender) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.ICE.ATTACK.NO_TARGET'));
      return;
    }
    
    // Get ICE token (if on canvas) or use actor
    let iceToken = null;
    if (this.actor.isToken) {
      iceToken = this.actor.token;
    } else {
      // Try to find token on canvas
      const tokens = canvas?.tokens?.placeables || [];
      iceToken = tokens.find((token: any) => token.actor?.id === this.actor.id) || null;
    }
    
    // Create attack message
    await CombatHelpers.createIceAttackMessage(this.actor, iceToken, defender, defenderToken);
  }
}


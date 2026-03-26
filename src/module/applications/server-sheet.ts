import * as SheetHelpers from '../helpers/sheet-helpers.js';
import { ICE_TYPES } from '../models/actor-ice.js';

/**
 * Server Sheet Application
 */
export class ServerSheet extends ActorSheet {
  /** Track open server sheets for token hooks */
  static openSheets: Map<string, ServerSheet> = new Map();

  static override get defaultOptions(): DocumentSheet.Options<Actor> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sra2', 'sheet', 'actor', 'server'],
      template: 'systems/sra2/templates/actor-server-sheet.hbs',
      width: 700,
      height: 800,
      tabs: [],
      dragDrop: [{ dragSelector: '.ice-row', dropSelector: '.sheet-content' }],
      submitOnChange: false,
    });
  }

  override async _renderOuter(...args: any[]): Promise<JQuery> {
    const html = await super._renderOuter(...args);
    ServerSheet.openSheets.set(this.actor.id!, this);
    return html;
  }

  override async close(options?: any): Promise<void> {
    ServerSheet.openSheets.delete(this.actor.id!);
    return super.close(options);
  }

  /**
   * Handle form submission
   */
  protected override async _updateObject(_event: Event, formData: any): Promise<any> {
    const expandedData = SheetHelpers.handleSheetUpdate(this.actor, formData);
    await this.actor.update(expandedData);
  }

  override async getData(): Promise<any> {
    const context = super.getData() as any;
    context.system = this.actor.system;

    // Load linked ICE data
    const linkedICEData = await this._loadLinkedICE();
    context.linkedICEData = linkedICEData;

    // Split into deployed and queued
    context.deployedICE = linkedICEData.filter((ice: any) => ice.isDeployed);
    context.queuedICE = linkedICEData.filter((ice: any) => !ice.isDeployed);

    // Check for patrol ICE
    const hasPatrol = linkedICEData.some((ice: any) => ice.iceType === 'patrol');
    context.hasNoPatrol = linkedICEData.length > 0 && !hasPatrol;

    return context;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Server index change triggers form submit
    html.find('input[name="system.serverIndex"]').on('change', () => this.submit());
    html.find('input[name="system.physicalSecurity"]').on('change', () => this.submit());

    // ICE actions
    html.find('.open-ice').on('click', this._onOpenICE.bind(this));
    html.find('.remove-ice').on('click', this._onRemoveICE.bind(this));
    html.find('[data-action="deploy-ice"]').on('click', this._onDeployICE.bind(this));
    html.find('[data-action="refresh"]').on('click', () => this.render(false));
  }

  /**
   * Load all linked ICE actors with deployment status
   */
  private async _loadLinkedICE(): Promise<any[]> {
    const linkedICEUuids = (this.actor.system as any).linkedICE || [];
    const result: any[] = [];

    for (const uuid of linkedICEUuids) {
      try {
        const iceActor = await fromUuid(uuid) as any;
        if (!iceActor || iceActor.type !== 'ice') continue;

        // Check if this ICE has a token on the active scene
        const token = this._findICEToken(iceActor);
        const isDeployed = !!token;

        const iceType = iceActor.system?.iceType || '';
        const iceTypeKey = (ICE_TYPES as any)[iceType] || '';
        const iceTypeName = iceTypeKey ? game.i18n!.localize(iceTypeKey) : iceType;

        result.push({
          uuid: iceActor.uuid,
          id: iceActor.id,
          name: iceActor.name,
          img: iceActor.img,
          iceType,
          iceTypeName,
          isDeployed,
          tokenId: token?.id || null,
          damage: iceActor.system?.damage || {},
        });
      } catch (error) {
        console.warn(`Failed to load ICE actor ${uuid}:`, error);
      }
    }
    return result;
  }

  /**
   * Find the token for an ICE actor on the active scene
   */
  private _findICEToken(iceActor: any): any | null {
    const scene = canvas?.scene;
    if (!scene) return null;
    const tokens = scene.tokens?.contents || [];
    return tokens.find((t: any) => t.actorId === iceActor.id) || null;
  }

  /**
   * Handle drop of an ICE actor onto the server sheet — links the existing actor
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    const data = TextEditor.getDragEventData(event) as any;
    if (!data || data.type !== 'Actor') return super._onDrop(event);

    try {
      const sourceActor = await fromUuid(data.uuid) as any;
      if (!sourceActor || sourceActor.type !== 'ice') return;

      const serverSystem = this.actor.system as any;
      const linkedICE = serverSystem.linkedICE || [];

      // Don't add if already linked
      if (linkedICE.includes(sourceActor.uuid)) return;

      // Add to linked ICE
      await this.actor.update({ 'system.linkedICE': [...linkedICE, sourceActor.uuid] } as any);

      ui.notifications?.info(game.i18n!.format('SRA2.SERVER.ICE_ADDED', { name: sourceActor.name }));
    } catch (error) {
      console.error('Error handling ICE drop on server:', error);
    }
  }

  /**
   * Open an ICE token's sheet (only works for deployed ICE)
   */
  private async _onOpenICE(event: Event): Promise<void> {
    event.preventDefault();
    const tokenId = (event.currentTarget as HTMLElement).dataset.tokenId;
    if (!tokenId) return;

    const scene = canvas?.scene;
    if (!scene) return;

    const tokenDoc = scene.tokens?.get(tokenId);
    if (tokenDoc?.actor?.sheet) {
      tokenDoc.actor.sheet.render(true);
    }
  }

  /**
   * Remove an ICE from the server's roster
   */
  private async _onRemoveICE(event: Event): Promise<void> {
    event.preventDefault();
    const uuid = (event.currentTarget as HTMLElement).dataset.iceUuid;
    if (!uuid) return;

    const linkedICE = (this.actor.system as any).linkedICE || [];
    const updatedLinkedICE = linkedICE.filter((u: string) => u !== uuid);
    await this.actor.update({ 'system.linkedICE': updatedLinkedICE } as any);

    ui.notifications?.info(game.i18n!.localize('SRA2.SERVER.ICE_REMOVED'));
  }

  /**
   * Deploy a random non-deployed ICE onto the scene next to the server token.
   * Sets the token's serverIndex to the server's effective index.
   */
  private async _onDeployICE(event: Event): Promise<void> {
    event.preventDefault();

    const scene = canvas?.scene;
    if (!scene) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SERVER.NO_SERVER_TOKEN'));
      return;
    }

    // Find the server token on the scene
    const serverToken = scene.tokens?.contents?.find(
      (t: any) => t.actorId === this.actor.id
    );
    if (!serverToken) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SERVER.NO_SERVER_TOKEN'));
      return;
    }

    // Get non-deployed ICE
    const linkedICEData = await this._loadLinkedICE();
    const queuedICE = linkedICEData.filter((ice: any) => !ice.isDeployed);

    if (queuedICE.length === 0) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SERVER.NO_ICE_TO_DEPLOY'));
      return;
    }

    // Pick a random one
    const randomIndex = Math.floor(Math.random() * queuedICE.length);
    const iceToDeploy = queuedICE[randomIndex];

    // Find an available slot around the server token (8 positions: N, NE, E, SE, S, SW, W, NW)
    const gs = scene.grid?.size || 100;
    const offsets = [
      { x: 0, y: -gs },    // N
      { x: gs, y: -gs },   // NE
      { x: gs, y: 0 },     // E
      { x: gs, y: gs },    // SE
      { x: 0, y: gs },     // S
      { x: -gs, y: gs },   // SW
      { x: -gs, y: 0 },    // W
      { x: -gs, y: -gs },  // NW
    ];

    const existingTokenPositions = scene.tokens?.contents?.map((t: any) => ({
      x: t.x, y: t.y
    })) || [];

    let targetPos: { x: number; y: number } | null = null;
    for (const offset of offsets) {
      const pos = {
        x: (serverToken as any).x + offset.x,
        y: (serverToken as any).y + offset.y
      };
      const occupied = existingTokenPositions.some(
        (tp: any) => Math.abs(tp.x - pos.x) < gs * 0.5 && Math.abs(tp.y - pos.y) < gs * 0.5
      );
      if (!occupied) {
        targetPos = pos;
        break;
      }
    }

    if (!targetPos) {
      ui.notifications?.warn(game.i18n!.localize('SRA2.SERVER.ALL_SLOTS_TAKEN'));
      return;
    }

    // Create the token on the scene
    try {
      const iceActor = await fromUuid(iceToDeploy.uuid) as any;
      if (!iceActor) return;

      const tokenData = await iceActor.getTokenDocument({
        x: targetPos.x,
        y: targetPos.y,
      });

      // Set the serverIndex in the token data before creating
      const effectiveIndex = (this.actor.system as any).effectiveIndex;
      const tokenObj = tokenData.toObject();
      if (!tokenObj.delta) tokenObj.delta = {};
      if (!tokenObj.delta.system) tokenObj.delta.system = {};
      tokenObj.delta.system.serverIndex = effectiveIndex;

      await scene.createEmbeddedDocuments('Token', [tokenObj]);

      this.render(false);
    } catch (error) {
      console.error('Error deploying ICE token:', error);
    }
  }

  /**
   * Handle drag start for ICE rows (to allow dragging to scene)
   */
  override _onDragStart(event: DragEvent): void {
    const element = event.currentTarget as HTMLElement;
    const uuid = element?.dataset?.iceUuid;
    if (!uuid) return super._onDragStart(event);

    event.dataTransfer?.setData('text/plain', JSON.stringify({
      type: 'Actor',
      uuid: uuid
    }));
  }
}

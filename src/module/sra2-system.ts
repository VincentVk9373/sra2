import { SYSTEM } from "./config/system.ts";

// Expose the SYSTEM object to the global scope
globalThis.SYSTEM = SYSTEM;

import * as models from "./models/_module.ts";
import * as documents from "./documents/_module.ts";
import * as applications from "./applications/_module.ts";

export class SRA2System {
  static start(): void {
    new SRA2System();
  }

  constructor() {
    if (game.system) {
      game.system.sra2 = this;
    }
    Hooks.once('init', () => this.onInit());
  }
  
  onInit(): void {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onInit');
    if (game.system) {
      game.system.api = {
        applications,
        models,
        documents,
      };
    }
    
    // @ts-expect-error - Setting to undefined is intentional for system initialization
    CONFIG.Actor.documentClass = undefined;
    CONFIG.Actor.dataModels = {};
    
    // @ts-expect-error - Setting to undefined is intentional for system initialization
    CONFIG.Item.documentClass = undefined;
    CONFIG.Item.dataModels = {};
    
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);
    
    Hooks.once("ready", () => this.onReady());
  }

  onReady(): void {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onReady');
  }
}


import { SYSTEM } from "./config/system.mjs"

globalThis.SYSTEM = SYSTEM // Expose the SYSTEM object to the global scope

import * as models from "./models/_module.mjs"
import * as documents from "./documents/_module.mjs"
import * as applications from "./applications/_module.mjs"

export class SRA2System {
  static start() {
    new SRA2System()
  }

  constructor() {
    game.system.sra2 = this
    Hooks.once('init', () => this.onInit())
  }
  
  onInit() {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onInit')
    game.system.api = {
      applications,
      models,
      documents,
    }
    
    CONFIG.Actor.documentClass = undefined
    CONFIG.Actor.dataModels = {
    }
    
    CONFIG.Item.documentClass = undefined
    CONFIG.Item.dataModels = {
    }
    Actors.unregisterSheet("core", ActorSheet)
    Items.unregisterSheet("core", ItemSheet)
    
    Hooks.once("ready", () => this.onReady())
  }

  onReady() {
    console.log(SYSTEM.LOG.HEAD + 'SRA2System.onReady')
  }
}
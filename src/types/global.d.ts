import type { SystemConfig } from "../module/config/system.ts";
import type { SRA2System } from "../module/sra2-system.ts";
import type * as models from "../module/models/_module.ts";
import type * as documents from "../module/documents/_module.ts";
import type * as applications from "../module/applications/_module.ts";

declare global {
  var SYSTEM: SystemConfig;
  
  interface System {
    sra2?: SRA2System;
    api?: {
      applications: typeof applications;
      models: typeof models;
      documents: typeof documents;
    };
  }
}


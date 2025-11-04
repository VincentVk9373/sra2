const SYSTEM_ID = 'sra2';

export interface SystemConfig {
  id: string;
  LOG: {
    HEAD: string;
  };
  SOCKET: string;
  PATH: {
    ROOT: string;
    STYLE: string;
    TEMPLATES: string;
    ASSETS: string;
  };
}

export const SYSTEM: SystemConfig = {
  id: SYSTEM_ID,
  LOG: {
    HEAD: `${SYSTEM_ID} | `
  },
  SOCKET: `system.${SYSTEM_ID}`,
  PATH: {
    ROOT: `systems/${SYSTEM_ID}`,
    STYLE: `systems/${SYSTEM_ID}/style`,
    TEMPLATES: `systems/${SYSTEM_ID}/templates`,
    ASSETS: `systems/${SYSTEM_ID}/assets`,
  }
};


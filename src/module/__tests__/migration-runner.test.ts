import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Regression tests for the migration runner sequencing.
 *
 * Two defects these guard against:
 *  - `migrations.forEach(async m => await m.migrate())` started every migration
 *    at once, so sorting them by version had no effect on execution order
 *  - CURRENT_SYSTEM_VERSION was written before any migration had finished, so a
 *    world interrupted mid-migration was marked up to date for good
 */

/** Ordered log of everything the runner does, shared by the doubles below */
let journal: string[];
let currentVersion: string;

/** Migration double logging its start and end, slow in proportion to `steps` */
function makeMigration(version: string, steps: number) {
  return {
    code: `migration-${version}`,
    version,
    migrate: async () => {
      journal.push(`${version}:start`);
      for (let i = 0; i < steps; i++) await Promise.resolve();
      journal.push(`${version}:end`);
    },
  };
}

/** Install a Hooks double serving these migrations to the runner */
function serve(...migrations: any[]) {
  (globalThis as any).Hooks = {
    callAll: (_event: string, declare: (...list: any[]) => void) => declare(...migrations),
    off: () => {},
  };
}

/** Load the runner. migration.mjs is plain JS, it ships no declaration file. */
async function loadRunner(): Promise<any> {
  // @ts-ignore - untyped .mjs module, same as its imports in sra2-system.ts
  const mod = await import('../migration/migration.mjs');
  return mod.Migrations;
}

beforeEach(() => {
  journal = [];
  currentVersion = '13.0.0';
  (globalThis as any).SYSTEM = { id: 'sra2', LOG: { HEAD: '' } };
  (globalThis as any).ui = { notifications: { info: () => {} } };
  (globalThis as any).foundry = {
    utils: {
      isNewerVersion: (a: string, b: string) => {
        const pa = String(a).split('.').map(Number);
        const pb = String(b).split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
          if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
        }
        return false;
      },
    },
  };
  (globalThis as any).game = {
    system: { version: '14.4.0' },
    i18n: { format: (k: string) => k, localize: (k: string) => k },
    settings: {
      register: () => {},
      get: () => currentVersion,
      set: (_id: string, _key: string, value: string) => {
        currentVersion = value;
        journal.push('version:stamped');
      },
    },
  };
});

afterEach(() => {
  for (const k of ['SYSTEM', 'ui', 'foundry', 'game', 'Hooks']) delete (globalThis as any)[k];
});

describe('Migrations.migrate', () => {
  it('runs migrations one after another, in version order', async () => {
    // the older migration is the slow one: were they to overlap, the newer would finish first
    serve(makeMigration('13.4.0', 1), makeMigration('13.2.4', 8));

    const Migrations = await loadRunner();
    await new Migrations().migrate();

    expect(journal).toEqual([
      '13.2.4:start', '13.2.4:end',
      '13.4.0:start', '13.4.0:end',
      'version:stamped',
    ]);
  });

  it('stamps the system version only once every migration has finished', async () => {
    serve(makeMigration('13.2.4', 8), makeMigration('13.4.0', 1));

    const Migrations = await loadRunner();
    await new Migrations().migrate();

    expect(journal.at(-1)).toBe('version:stamped');
    expect(journal.indexOf('version:stamped')).toBe(journal.length - 1);
    expect(currentVersion).toBe('14.4.0');
  });

  it('leaves the version untouched when a migration throws, so it runs again next load', async () => {
    serve({ code: 'boom', version: '13.5.0', migrate: async () => { throw new Error('boom'); } });

    const Migrations = await loadRunner();
    await expect(new Migrations().migrate()).rejects.toThrow('boom');

    expect(journal).not.toContain('version:stamped');
    expect(currentVersion).toBe('13.0.0');
  });
});

import { describe, it, expect } from 'vitest';

// @ts-ignore - untyped .mjs module, same as its imports in sra2-system.ts
const { Migration_14_5_0 } = await import('../migration/migration-14.5.0.mjs');

const m = new Migration_14_5_0();
const feat = (id: string, name: string, featType: string, system: any = {}) => ({ id, type: 'feat', name, system: { featType, ...system } });

describe('Migration 14.5.0 — astral abilities of existing creatures', () => {
  it('checks dual nature on a trait or power named after it, in any language', () => {
    const updates = m._computeFeatUpdates([
      feat('fr', 'Nature Duale', 'trait'),
      feat('en', 'Dual Nature', 'power'),
      feat('de', 'duale natur', 'trait'),
      feat('ru', 'Двойственная природа', 'trait'),
    ]);
    expect(updates).toEqual(['fr', 'en', 'de', 'ru'].map(_id => ({ _id, 'system.dualNature': true })));
  });

  it('checks astral being on the materialization power of spirits, with or without accent', () => {
    const updates = m._computeFeatUpdates([
      feat('a', 'Materialisation', 'power'),
      feat('b', 'Matérialisation', 'power'),
      feat('c', 'Materialization', 'power'),
      feat('d', 'Материализация', 'power'),
      feat('e', 'Forme astrale', 'power'),
    ]);
    expect(updates).toEqual(['a', 'b', 'c', 'd', 'e'].map(_id => ({ _id, 'system.astralBeing': true })));
  });

  it('leaves feats that are already flagged, of another type, or merely look alike', () => {
    expect(m._computeFeatUpdates([
      feat('a', 'Nature Duale', 'trait', { dualNature: true }),
      feat('b', 'Materialisation', 'power', { astralBeing: true }),
      feat('c', 'Barrière duale', 'spell'),
      feat('d', 'Nature Duale', 'spell'),
      feat('e', 'Esprit mentor Ours', 'trait'),
      { id: 'f', type: 'skill', name: 'Dual Nature', system: {} },
    ])).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';

// @ts-ignore - untyped .mjs module, same as its imports in sra2-system.ts
const { Migration_14_4_2 } = await import('../migration/migration-14.4.2.mjs');

const RIFLES = { name: 'Spé : Fusils', 'system.slug': 'spec_rifles', 'system.linkedSkill': 'ranged-weapons', 'system.linkedAttribute': 'agility' };
const m = new Migration_14_4_2();

const spec = (id: string, name: string, slug: string) => ({ id, type: 'specialization', name, system: { slug } });

describe('Migration 14.4.2 — Shotguns specialization merged into Rifles', () => {
  it('turns an owned Shotguns spec into Rifles when Rifles is not owned', () => {
    const res = m._computeSpecChanges([spec('a', 'Spé : Shotguns', 'spec_shotguns')], RIFLES);
    expect(res.deletions).toEqual([]);
    expect(res.updates).toEqual([{ _id: 'a', ...RIFLES }]);
  });

  it('deletes the Shotguns spec when Rifles is already owned', () => {
    const res = m._computeSpecChanges([spec('a', 'Spé : Shotguns', 'spec_shotguns'), spec('b', 'Spé : Fusils', 'spec_rifles')], RIFLES);
    expect(res.updates).toEqual([]);
    expect(res.deletions).toEqual(['a']);
  });

  it('recognises an unmigrated Shotguns spec by its name', () => {
    const res = m._computeSpecChanges([spec('a', 'Spec: Shotguns', '')], RIFLES);
    expect(res.updates).toHaveLength(1);
  });

  it('leaves actors without Shotguns untouched', () => {
    const res = m._computeSpecChanges([spec('b', 'Spé : Fusils', 'spec_rifles')], RIFLES);
    expect(res).toEqual({ updates: [], deletions: [] });
  });

  it('retargets RR entries and weapon spec links from Shotguns to Rifles', () => {
    const feat = {
      id: 'f', type: 'feat',
      system: {
        rrList: [
          { rrType: 'specialization', rrTarget: 'spec_shotguns', rrValue: 1 },
          { rrType: 'specialization', rrTarget: 'Spé : Shotguns', rrValue: 1 },
          { rrType: 'skill', rrTarget: 'ranged-weapons', rrValue: 1 },
        ],
        linkedAttackSpecialization: 'spec_shotguns',
        linkedDefenseSpecialization: 'spec_ranged-defense',
      },
    };
    const [u] = m._computeFeatUpdates([feat]);
    expect(u._id).toBe('f');
    expect(u['system.rrList'].map((r: any) => r.rrTarget)).toEqual(['spec_rifles', 'spec_rifles', 'ranged-weapons']);
    expect(u['system.linkedAttackSpecialization']).toBe('spec_rifles');
    expect(u['system.linkedDefenseSpecialization']).toBeUndefined();
  });

  it('does not touch feats unrelated to Shotguns', () => {
    const feat = { id: 'f', type: 'feat', system: { rrList: [{ rrType: 'specialization', rrTarget: 'spec_rifles', rrValue: 1 }] } };
    expect(m._computeFeatUpdates([feat])).toEqual([]);
  });
});

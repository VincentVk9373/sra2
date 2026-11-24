import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../item-search.js', () => ({
  normalizeSearchText: (t: string) => (t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(),
}));

const { getPhantomRRs } = await import('../helpers/sheet-helpers.js');

beforeEach(() => {
  (globalThis as any).game = {
    items: { find: () => undefined, filter: () => [] },
    actors: { get: () => undefined },
    i18n: { localize: (k: string) => k },
  };
  (globalThis as any).SRA2_SKILL_SLUG_CACHE = { 'spec_media': 'Spec: Media', 'networking': 'Networking' };
  (globalThis as any).SRA2_SLUG_METADATA_CACHE = {
    'spec_media': { linkedSkill: 'networking', linkedAttribute: 'charisma' },
    'networking': { linkedAttribute: 'charisma' },
  };
  (globalThis as any).SRA2_NAME_TO_SLUG_CACHE = { 'spec: media': 'spec_media', 'spe : mediatique': 'spec_media' };
});
afterEach(() => {
  delete (globalThis as any).game;
  delete (globalThis as any).SRA2_SKILL_SLUG_CACHE;
  delete (globalThis as any).SRA2_SLUG_METADATA_CACHE;
  delete (globalThis as any).SRA2_NAME_TO_SLUG_CACHE;
});

function actorWithContact(rrTarget: string) {
  const items: any[] = [
    { type: 'skill', name: 'Networking', system: { slug: 'networking', linkedAttribute: 'charisma', rating: 3 } },
    { type: 'feat', name: 'Media contact', system: { active: true, featType: 'contact', rrList: [{ rrType: 'specialization', rrTarget, rrValue: 1 }] } },
  ];
  return { items, system: { attributes: { strength: 5, charisma: 2 } } };
}

describe('getPhantomRRs — RR on a specialization the actor does not have', () => {
  for (const rrTarget of ['spec_media', 'Spec: Media', 'Spé : Médiatique']) {
    it(`uses the linked skill and its attribute (rrTarget "${rrTarget}")`, () => {
      const [phantom] = getPhantomRRs(actorWithContact(rrTarget));
      expect(phantom!.linkedSkillOnActor).toBe(true);
      expect(phantom!.linkedAttribute).toBe('charisma'); // not the strength default
      expect(phantom!.totalDicePool).toBe(2 + 3); // charisma + Networking rating
      expect(phantom!.rr).toBe(1);
    });
  }
});

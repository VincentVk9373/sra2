import { describe, it, expect, vi } from 'vitest';

// Mock ItemSearch since it has no Foundry dependencies but uses a .js extension
vi.mock('../../../item-search.js', () => ({
  normalizeSearchText: (text: string) => text?.toLowerCase() ?? '',
}));

// dice-roller uses global Roll, ChatMessage, renderTemplate — mock them
const { getSuccessThreshold, getRiskDiceByRR, getRRSources, buildRRSourcesHtml } =
  await import('../helpers/dice-roller.js');

// ─────────────────────────────────────────────────────────
// getSuccessThreshold
// ─────────────────────────────────────────────────────────
describe('getSuccessThreshold', () => {
  it('returns 5 for normal mode (5,6 = success)', () => {
    expect(getSuccessThreshold('normal')).toBe(5);
  });

  it('returns 4 for advantage mode (4,5,6 = success)', () => {
    expect(getSuccessThreshold('advantage')).toBe(4);
  });

  it('returns 6 for disadvantage mode (only 6 = success)', () => {
    expect(getSuccessThreshold('disadvantage')).toBe(6);
  });

  it('returns normal threshold (5) for unknown mode', () => {
    expect(getSuccessThreshold('unknown')).toBe(5);
    expect(getSuccessThreshold('')).toBe(5);
  });

  it('advantage threshold is lower than normal (easier to succeed)', () => {
    expect(getSuccessThreshold('advantage')).toBeLessThan(getSuccessThreshold('normal'));
  });

  it('disadvantage threshold is higher than normal (harder to succeed)', () => {
    expect(getSuccessThreshold('disadvantage')).toBeGreaterThan(getSuccessThreshold('normal'));
  });

  it('all thresholds are valid d6 values (1-6)', () => {
    for (const mode of ['advantage', 'normal', 'disadvantage']) {
      const t = getSuccessThreshold(mode);
      expect(t).toBeGreaterThanOrEqual(1);
      expect(t).toBeLessThanOrEqual(6);
    }
  });
});

// ─────────────────────────────────────────────────────────
// getRiskDiceByRR
// ─────────────────────────────────────────────────────────
describe('getRiskDiceByRR', () => {
  it('RR 0 → 2 risk dice', () => {
    expect(getRiskDiceByRR(0)).toBe(2);
  });

  it('RR 1 → 5 risk dice', () => {
    expect(getRiskDiceByRR(1)).toBe(5);
  });

  it('RR 2 → 8 risk dice', () => {
    expect(getRiskDiceByRR(2)).toBe(8);
  });

  it('RR 3 (max) → 12 risk dice', () => {
    expect(getRiskDiceByRR(3)).toBe(12);
  });

  it('RR above 3 is capped at RR 3 (→ 12 dice)', () => {
    expect(getRiskDiceByRR(4)).toBe(12);
    expect(getRiskDiceByRR(99)).toBe(12);
  });

  it('negative RR is clamped to 0 (→ 2 dice)', () => {
    expect(getRiskDiceByRR(-1)).toBe(2);
    expect(getRiskDiceByRR(-99)).toBe(2);
  });

  it('dice count increases monotonically with RR', () => {
    const counts = [0, 1, 2, 3].map(getRiskDiceByRR);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]!).toBeGreaterThan(counts[i - 1]!);
    }
  });
});

// ─────────────────────────────────────────────────────────
// getRRSources (requires mock actor)
// ─────────────────────────────────────────────────────────
describe('getRRSources', () => {
  function makeActor(feats: Array<{ name: string; active: boolean; rrList: Array<{ rrType: string; rrValue: number; rrTarget: string }> }>) {
    return {
      items: feats.map((f) => ({
        type: 'feat',
        name: f.name,
        system: {
          active: f.active,
          rrList: f.rrList,
        },
      })),
    };
  }

  it('returns empty array when actor has no feats', () => {
    const actor = makeActor([]);
    expect(getRRSources(actor, 'skill', 'athlétisme')).toEqual([]);
  });

  it('returns empty array when no feat targets the given item', () => {
    const actor = makeActor([{
      name: 'Feat A', active: true,
      rrList: [{ rrType: 'skill', rrValue: 1, rrTarget: 'pilotage' }],
    }]);
    expect(getRRSources(actor, 'skill', 'athlétisme')).toEqual([]);
  });

  it('returns matching RR source when feat targets the given skill', () => {
    const actor = makeActor([{
      name: 'Expert athlète', active: true,
      rrList: [{ rrType: 'skill', rrValue: 2, rrTarget: 'athlétisme' }],
    }]);
    const sources = getRRSources(actor, 'skill', 'athlétisme');
    expect(sources).toHaveLength(1);
    expect(sources[0]).toEqual({ featName: 'Expert athlète', rrValue: 2 });
  });

  it('ignores inactive feats', () => {
    const actor = makeActor([{
      name: 'Feat inactif', active: false,
      rrList: [{ rrType: 'skill', rrValue: 2, rrTarget: 'athlétisme' }],
    }]);
    expect(getRRSources(actor, 'skill', 'athlétisme')).toEqual([]);
  });

  it('ignores RR entries with rrValue = 0', () => {
    const actor = makeActor([{
      name: 'Feat zéro', active: true,
      rrList: [{ rrType: 'skill', rrValue: 0, rrTarget: 'athlétisme' }],
    }]);
    expect(getRRSources(actor, 'skill', 'athlétisme')).toEqual([]);
  });

  it('accumulates sources from multiple feats', () => {
    const actor = makeActor([
      { name: 'Feat A', active: true, rrList: [{ rrType: 'skill', rrValue: 1, rrTarget: 'athlétisme' }] },
      { name: 'Feat B', active: true, rrList: [{ rrType: 'skill', rrValue: 2, rrTarget: 'athlétisme' }] },
    ]);
    const sources = getRRSources(actor, 'skill', 'athlétisme');
    expect(sources).toHaveLength(2);
    expect(sources.map((s) => s.rrValue)).toEqual([1, 2]);
  });

  it('distinguishes between itemType skill vs attribute', () => {
    const actor = makeActor([{
      name: 'Feat attr', active: true,
      rrList: [
        { rrType: 'skill', rrValue: 1, rrTarget: 'athlétisme' },
        { rrType: 'attribute', rrValue: 1, rrTarget: 'strength' },
      ],
    }]);
    expect(getRRSources(actor, 'skill', 'athlétisme')).toHaveLength(1);
    expect(getRRSources(actor, 'attribute', 'strength')).toHaveLength(1);
    expect(getRRSources(actor, 'specialization', 'athlétisme')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────
// buildRRSourcesHtml
// ─────────────────────────────────────────────────────────
describe('buildRRSourcesHtml', () => {
  it('returns empty string for no sources', () => {
    expect(buildRRSourcesHtml([])).toBe('');
  });

  it('generates HTML containing the feat name', () => {
    const html = buildRRSourcesHtml([{ featName: 'Expert athlète', rrValue: 2 }]);
    expect(html).toContain('Expert athlète');
    expect(html).toContain('+2');
  });

  it('generates a checkbox for each source', () => {
    const html = buildRRSourcesHtml([
      { featName: 'A', rrValue: 1 },
      { featName: 'B', rrValue: 2 },
    ]);
    const checkboxCount = (html.match(/type="checkbox"/g) || []).length;
    expect(checkboxCount).toBe(2);
  });

  it('marks checkboxes as checked by default', () => {
    const html = buildRRSourcesHtml([{ featName: 'A', rrValue: 1 }]);
    expect(html).toContain('checked');
  });

  it('includes the rrValue as data attribute', () => {
    const html = buildRRSourcesHtml([{ featName: 'A', rrValue: 3 }]);
    expect(html).toContain('data-rr-value="3"');
  });
});

import { describe, expect, it } from 'vitest';
import { assignOne, assignSharedTags } from './assign';
import { computeParams } from './sizing';

const HAND = {
  participantIds: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  rankings: {
    P1: ['T1', 'T2', 'T3'],
    P2: ['T1', 'T2', 'T4'],
    P3: ['T1', 'T3', 'T2'],
    P4: ['T2', 'T1', 'T3'],
    P5: ['T3', 'T1', 'T2'],
    P6: ['T4', 'T3', 'T1'],
  } as Record<string, string[]>,
  candidateIds: ['T1', 'T2', 'T3', 'T4'],
  minSize: 2,
  maxSize: 4,
};

describe('assignSharedTags', () => {
  it('matches the hand-verified example', () => {
    const { held, activeIds, shortIds } = assignSharedTags(HAND);
    expect(activeIds).toEqual(['T1', 'T2', 'T3']);
    expect(shortIds).toEqual([]);
    const sorted = (ids: string[]) => [...ids].sort();
    expect(sorted(held.P1)).toEqual(['T1', 'T2']);
    expect(sorted(held.P2)).toEqual(['T1', 'T2']);
    expect(sorted(held.P3)).toEqual(['T1', 'T3']);
    expect(sorted(held.P4)).toEqual(['T2', 'T3']);
    expect(sorted(held.P5)).toEqual(['T2', 'T3']);
    expect(sorted(held.P6)).toEqual(['T1', 'T3']);
    // 各タグ4人ずつ
    const counts = new Map<string, number>();
    for (const pid of HAND.participantIds) {
      for (const t of held[pid]) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    expect([...counts.values()].sort()).toEqual([4, 4, 4]);
  });

  it.each([10, 40, 200])('keeps minSize over 50 seeded trials (n=%i)', (n) => {
    const params = computeParams(n);
    const candidateIds = Array.from({ length: params.candidateCount }, (_, i) => `T${i + 1}`);
    let seed = 12345 + n;
    const rand = (): number => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let trial = 0; trial < 50; trial += 1) {
      const participantIds = Array.from({ length: n }, (_, i) => `P${i + 1}`);
      const rankings: Record<string, string[]> = {};
      for (const pid of participantIds) {
        const shuffled = [...candidateIds];
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          const j = Math.floor(rand() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        rankings[pid] = shuffled;
      }
      const { held, activeIds, shortIds } = assignSharedTags({
        participantIds,
        rankings,
        candidateIds,
        minSize: params.minSize,
        maxSize: params.maxSize,
      });
      // 採用タグはすべて下限以上
      const counts = new Map<string, number>();
      for (const pid of participantIds) {
        const tags = held[pid] ?? [];
        // 1人が同じタグを2つ持たない
        expect(new Set(tags).size).toBe(tags.length);
        for (const t of tags) {
          expect(activeIds).toContain(t);
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
      for (const id of activeIds) {
        expect(counts.get(id) ?? 0).toBeGreaterThanOrEqual(params.minSize);
      }
      // shortIds は2つ持てなかった人とだけ一致する
      const expectedShort = participantIds.filter((pid) => (held[pid] ?? []).length < 2);
      expect([...shortIds].sort()).toEqual([...expectedShort].sort());
    }
  });
});

describe('assignOne', () => {
  it('picks the top two active tags from the ranking', () => {
    expect(assignOne({ ranking: ['T3', 'T1', 'T5'], activeIds: ['T1', 'T2', 'T3'], counts: {} })).toEqual({
      sharedTagIds: ['T3', 'T1'],
      usedFallback: false,
    });
  });

  it('fills with the least crowded tags when the ranking is short', () => {
    const counts = { T1: 4, T2: 2, T3: 3 };
    expect(assignOne({ ranking: ['T9'], activeIds: ['T1', 'T2', 'T3'], counts })).toEqual({
      sharedTagIds: ['T2', 'T3'],
      usedFallback: true,
    });
    expect(assignOne({ ranking: ['T2'], activeIds: ['T1', 'T2', 'T3'], counts })).toEqual({
      sharedTagIds: ['T2', 'T3'],
      usedFallback: true,
    });
  });

  it('returns one tag when only one is active', () => {
    expect(assignOne({ ranking: ['T9'], activeIds: ['T1'], counts: { T1: 4 } })).toEqual({
      sharedTagIds: ['T1'],
      usedFallback: true,
    });
  });

  it('treats missing counts as zero', () => {
    expect(assignOne({ ranking: [], activeIds: ['T1', 'T2', 'T3'], counts: { T1: 4, T3: 3 } })).toEqual({
      sharedTagIds: ['T2', 'T3'],
      usedFallback: true,
    });
  });
});

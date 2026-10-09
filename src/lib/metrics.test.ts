import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics';
import type { Assignment } from './types';

function assignment(participantId: string, sharedTagIds: string[]): Assignment {
  return { participantId, personalTag: '', sharedTagIds, edited: false, flags: [] };
}

describe('computeMetrics', () => {
  it('computes mates, encounter rate and tag sizes', () => {
    const m = computeMetrics({
      A: assignment('A', ['T1', 'T2']),
      B: assignment('B', ['T1', 'T3']),
      C: assignment('C', ['T3', 'T4']),
      D: assignment('D', ['T5', 'T6']),
    });
    expect(m.participants).toBe(4);
    expect(m.sharedTagCount).toBe(6);
    expect(m.matesMin).toBe(0);
    expect(m.matesMedian).toBe(1);
    expect(m.matesMax).toBe(2);
    expect(m.encounterRate).toBeCloseTo(2 / 6, 10);
    expect(m.sizeMin).toBe(1);
    expect(m.sizeMax).toBe(2);
    expect(m.needsReview).toBe(0);
  });

  it('counts people with flags as needsReview', () => {
    const withFlag = assignment('A', ['T1']);
    withFlag.flags = ['no_answer'];
    const m = computeMetrics({ A: withFlag, B: assignment('B', ['T1']) });
    expect(m.needsReview).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { computeParams } from './sizing';

describe('computeParams', () => {
  it.each([
    [10, { targetSize: 3, minSize: 2, maxSize: 6, candidateCount: 10 }],
    [40, { targetSize: 8, minSize: 4, maxSize: 16, candidateCount: 15 }],
    [200, { targetSize: 12, minSize: 6, maxSize: 24, candidateCount: 40 }],
  ])('n=%i gives expected sizes', (n, expected) => {
    const p = computeParams(n);
    expect(p.n).toBe(n);
    expect(p.targetSize).toBe(expected.targetSize);
    expect(p.minSize).toBe(expected.minSize);
    expect(p.maxSize).toBe(expected.maxSize);
    expect(p.candidateCount).toBe(expected.candidateCount);
    expect(p.rankLength).toBe(5);
  });
});

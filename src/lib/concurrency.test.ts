import { describe, expect, it } from 'vitest';
import { mapLimit } from './concurrency';

describe('mapLimit', () => {
  it('limits concurrency and returns results in input order', async () => {
    let running = 0;
    let maxRunning = 0;
    const items = [5, 4, 3, 2, 1];
    const results = await mapLimit(items, 2, async (v) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, v * 10));
      running -= 1;
      return v * 2;
    });
    expect(results).toEqual([10, 8, 6, 4, 2]);
    expect(maxRunning).toBe(2);
  });

  it('handles empty input', async () => {
    await expect(mapLimit([], 3, async (v: number) => v)).resolves.toEqual([]);
  });
});

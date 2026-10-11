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

  it('stops new batches after failure and waits for in-flight work before rejecting', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const called: number[] = [];
    let settled = false;
    const job = mapLimit([0, 1, 2, 3, 4], 2, async n => {
      called.push(n);
      if (n === 0) throw Error('failed');
      await gate;
      return n;
    });
    const checked = expect(job).rejects.toThrow('failed').then(() => { settled = true; });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await checked;
    expect(called).toEqual([0, 1]);
  });
});

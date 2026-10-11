import { describe, expect, it } from 'vitest';
import { LlmLimiter } from './limiter';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}

describe('server-wide LLM queue', () => {
  it('limits concurrent users and retains FIFO order', async () => {
    const limiter = new LlmLimiter(2);
    const gate = deferred();
    let active = 0;
    let max = 0;
    const order: number[] = [];
    const calls = Array.from({ length: 6 }, (_, i) => limiter.run(async () => {
      order.push(i); max = Math.max(max, ++active);
      await gate.promise; active--;
      return `user${i}`;
    }));
    await Promise.resolve();
    expect(order).toEqual([0, 1]);
    gate.resolve();
    expect(await Promise.all(calls)).toEqual(['user0', 'user1', 'user2', 'user3', 'user4', 'user5']);
    expect(max).toBe(2);
    expect(order).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('removes aborted waiters and still serves the next user', async () => {
    const limiter = new LlmLimiter(1);
    const gate = deferred();
    const first = limiter.run(() => gate.promise);
    const controller = new AbortController();
    let called = false;
    const cancelled = limiter.run(async () => { called = true; }, controller.signal);
    const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    const next = limiter.run(async () => 'next');
    controller.abort();
    await rejected;
    gate.resolve();
    await first;
    expect(await next).toBe('next');
    expect(called).toBe(false);
  });

  it('rejects a full queue, times out waiters and releases failed calls', async () => {
    const limiter = new LlmLimiter(1, 1, 10);
    const gate = deferred();
    const first = limiter.run(() => gate.promise);
    const waiting = limiter.run(async () => 'queued');
    const rejected = expect(waiting).rejects.toThrow('混み合っています');
    await expect(limiter.run(async () => 'overflow')).rejects.toThrow('混み合っています');
    await rejected;
    gate.resolve();
    await first;
    await expect(limiter.run(async () => { throw Error('failed'); })).rejects.toThrow('failed');
    expect(await limiter.run(async () => 'recovered')).toBe('recovered');
  });
});

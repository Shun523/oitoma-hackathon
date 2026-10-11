// src/lib/concurrency.ts
// mapLimit（並列数を絞って実行）。結果は入力と同じ順で返す。
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  let failure: unknown;
  const workerCount = Math.min(Math.max(limit, 1), items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (!failed && next < items.length) {
      const i = next;
      next += 1;
      try {
        results[i] = await fn(items[i], i);
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
  });
  await Promise.all(workers);
  if (failed) throw failure;
  return results;
}

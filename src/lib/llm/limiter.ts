// 1つのNode.jsサーバー全体で共有するFIFO。回答や結果は保存しない。
export class LlmQueueFullError extends Error {
  constructor() {
    super('おいとまが混み合っています。しばらく待ってやり直してください');
  }
}

interface Waiter {
  resolve: (release: () => void) => void;
  reject: (error: unknown) => void;
  cleanup: () => void;
}

export class LlmLimiter {
  private active = 0;
  private queue: Waiter[] = [];

  constructor(private limit = 3, private maxQueue = 60, private timeoutMs = 120000) {}

  private release = (): void => {
    const next = this.queue.shift();
    if (next) {
      next.cleanup();
      next.resolve(this.release);
    } else this.active--;
  };

  private acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(new DOMException('中止しました', 'AbortError'));
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve(this.release);
    }
    if (this.queue.length >= this.maxQueue) return Promise.reject(new LlmQueueFullError());
    return new Promise((resolve, reject) => {
      const remove = (error: unknown): void => {
        const index = this.queue.indexOf(waiter);
        if (index < 0) return;
        this.queue.splice(index, 1);
        waiter.cleanup();
        reject(error);
      };
      const abort = (): void => remove(new DOMException('中止しました', 'AbortError'));
      const timer = setTimeout(() => remove(new LlmQueueFullError()), this.timeoutMs);
      const waiter: Waiter = { resolve, reject, cleanup: () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); } };
      this.queue.push(waiter);
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  async run<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const release = await this.acquire(signal);
    try {
      signal?.throwIfAborted();
      return await fn();
    } finally { release(); }
  }
}

const shared = globalThis as typeof globalThis & { __oitomaLlmLimiter?: LlmLimiter };
const positive = (value: string | undefined, fallback: number, max: number): number => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};

export function getLlmLimiter(): LlmLimiter {
  return shared.__oitomaLlmLimiter ??= new LlmLimiter(
    positive(process.env.OITOMA_MAX_CONCURRENT, 3, 10),
    positive(process.env.OITOMA_QUEUE_LIMIT, 60, 300),
    positive(process.env.OITOMA_QUEUE_TIMEOUT_MS, 120000, 600000),
  );
}

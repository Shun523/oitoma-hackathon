// src/lib/llm/client.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { __resetLlmClientForTest, AUTH_ERROR_MESSAGE, chatJson } from './client';
import { LlmLimiter } from './limiter';

const schema = z.object({ x: z.number() });

function jsonResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

function statusResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => '',
  } as Response;
}

const prevEnv = { ...process.env };

beforeEach(() => {
  (globalThis as typeof globalThis & { __oitomaLlmLimiter?: LlmLimiter }).__oitomaLlmLimiter = new LlmLimiter();
  __resetLlmClientForTest();
  process.env.LLM_MODE = 'live';
  process.env.OITOMA_BASE_URL = 'https://example.test/ai/v1';
  process.env.OITOMA_API_KEY = 'test-key';
  process.env.OITOMA_MODEL = 'test-model';
  process.env.OITOMA_JSON_MODE = 'json_object';
  process.env.OITOMA_EXTRA_BODY = '{"chat_template_kwargs":{"enable_thinking":false}}';
  process.env.OITOMA_TIMEOUT_MS = '5000';
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env)) {
    if (!(key in prevEnv)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(prevEnv)) {
    process.env[key] = value;
  }
});

describe('request isolation and cancellation', () => {
  const options = { task: 'extract' as const, system: 'sys', schema, temperature: 0, maxTokens: 200 };

  it('keeps elapsed time nonnegative when the system clock moves backwards', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(10000);
    vi.stubGlobal('fetch', vi.fn(async () => {
      vi.mocked(Date.now).mockReturnValue(5000);
      return jsonResponse('{"x":1}');
    }));
    const result = await chatJson({ ...options, user: 'user' });
    expect(result.value.x).toBe(1);
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  it('limits live calls across users and returns each user their own response', async () => {
    let active = 0;
    let peak = 0;
    const releases: (() => void)[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const value = Number(body.messages[1].content);
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>(resolve => releases.push(resolve));
      active--;
      return jsonResponse(JSON.stringify({ x: value }));
    }));
    const calls = Array.from({ length: 6 }, (_, i) => chatJson({ ...options, user: String(i) }));
    await vi.waitFor(() => expect(releases).toHaveLength(3));
    releases.splice(0).forEach(release => release());
    await vi.waitFor(() => expect(releases).toHaveLength(3));
    releases.splice(0).forEach(release => release());
    expect((await Promise.all(calls)).map(call => call.value.x)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(peak).toBe(3);
  });

  it('cancels an in-flight fetch without retrying', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const result = chatJson({ ...options, user: 'user', signal: controller.signal });
    const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    controller.abort();
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the timeout active until the response body is read', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls++;
      if (calls > 1) return jsonResponse('{"x":9}');
      return {
        ok: true, status: 200,
        json: () => new Promise((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
        }),
      } as Response;
    }));
    const result = chatJson({ ...options, user: 'user' });
    await vi.advanceTimersByTimeAsync(7001);
    expect((await result).value.x).toBe(9);
    expect(calls).toBe(2);
  });
});

describe('chatJson extraction', () => {
  it('reads fenced JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse('```json\n{"x":1}\n```')));
    const { value } = await chatJson({
      task: 'extract',
      system: 'sys',
      user: 'user',
      schema,
      temperature: 0,
      maxTokens: 200,
    });
    expect(value).toEqual({ x: 1 });
  });

  it('reads JSON after a think block', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse('<think>考え中</think>\n{"x":2}')));
    const { value } = await chatJson({
      task: 'extract',
      system: 'sys',
      user: 'user',
      schema,
      temperature: 0,
      maxTokens: 200,
    });
    expect(value).toEqual({ x: 2 });
  });

  it('reads JSON with surrounding text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse('はい、どうぞ {"x":3} 以上です')));
    const { value } = await chatJson({
      task: 'extract',
      system: 'sys',
      user: 'user',
      schema,
      temperature: 0,
      maxTokens: 200,
    });
    expect(value).toEqual({ x: 3 });
  });

  it('fails on truncated JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse('{"x":')));
    await expect(
      chatJson({ task: 'extract', system: 'sys', user: 'user', schema, temperature: 0, maxTokens: 200 }),
    ).rejects.toThrow();
  });
});

describe('chatJson 400 fallback', () => {
  it('drops the extra body then response_format and returns the third success', async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      if (bodies.length <= 2) return statusResponse(400);
      return jsonResponse('{"x":5}');
    });
    vi.stubGlobal('fetch', fetchMock);
    const { value } = await chatJson({
      task: 'extract',
      system: 'sys',
      user: 'user',
      schema,
      temperature: 0,
      maxTokens: 200,
    });
    expect(value).toEqual({ x: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(bodies[0]).toHaveProperty('chat_template_kwargs');
    expect(bodies[0]).toHaveProperty('response_format');
    expect(bodies[1]).not.toHaveProperty('chat_template_kwargs');
    expect(bodies[1]).toHaveProperty('response_format');
    expect(bodies[2]).not.toHaveProperty('chat_template_kwargs');
    expect(bodies[2]).not.toHaveProperty('response_format');
  });

  it('does not retry on 403', async () => {
    const fetchMock = vi.fn(async () => statusResponse(403));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      chatJson({ task: 'extract', system: 'sys', user: 'user', schema, temperature: 0, maxTokens: 200 }),
    ).rejects.toThrow(AUTH_ERROR_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

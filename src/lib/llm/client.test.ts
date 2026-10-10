// src/lib/llm/client.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { __resetLlmClientForTest, AUTH_ERROR_MESSAGE, chatJson } from './client';

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
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env)) {
    if (!(key in prevEnv)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(prevEnv)) {
    process.env[key] = value;
  }
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

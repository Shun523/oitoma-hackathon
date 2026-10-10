// src/lib/pipeline/llm-api.ts
// ブラウザからAPIルートを呼ぶ LlmApi 実装。502なら例外を投げ、画面にサーバーの message を出す。
// ブラウザ側ではやり直さない（サーバーがやり直し済み）。
import type { LlmApi } from '../types';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = '生成に失敗しました';
    try {
      const data = (await res.json()) as { message?: unknown };
      if (typeof data?.message === 'string' && data.message !== '') message = data.message;
    } catch {
      // JSONとして読めなければ既定の文言のまま
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const httpLlmApi: LlmApi = {
  async extract(people) {
    return post('/api/llm/extract', { people });
  },
  async catalog(people, params) {
    return post('/api/llm/catalog', { people, params });
  },
  async rank(tags, people, rankLength) {
    return post('/api/llm/rank', { tags, people, rankLength });
  },
  async summary(tags) {
    return post('/api/llm/summary', { tags });
  },
  async regenerate(person, avoid) {
    return post('/api/llm/regenerate', { person, avoid });
  },
};

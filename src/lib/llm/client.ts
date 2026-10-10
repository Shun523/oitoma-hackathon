// src/lib/llm/client.ts
// おいとま呼び出しの共通部（サーバー専用）。JSONの取り出し、検証、やり直し。
import { z } from 'zod';
import type { LlmCallLog } from '../types';

export type LlmMode = 'mock' | 'live';

export function resolveMode(): LlmMode {
  const m = process.env.LLM_MODE;
  if (m === 'mock' || m === 'live') return m;
  return process.env.OITOMA_BASE_URL ? 'live' : 'mock';
}

export function getApiKey(): string {
  return process.env.OITOMA_API_KEY || process.env.OKAYAMA_API_KEY || '';
}

export function getLlmModel(): string {
  return process.env.OITOMA_MODEL || '';
}

export function getBaseUrl(): string {
  return (process.env.OITOMA_BASE_URL || '').replace(/\/+$/, '');
}

export function getTimeoutMs(): number {
  const v = Number(process.env.OITOMA_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 90000;
}

export function getJsonMode(): string {
  return process.env.OITOMA_JSON_MODE ?? 'json_object';
}

const DEFAULT_EXTRA_BODY = '{"chat_template_kwargs":{"enable_thinking":false}}';

export function getExtraBodyRaw(): string {
  return process.env.OITOMA_EXTRA_BODY ?? DEFAULT_EXTRA_BODY;
}

function parseExtraBody(raw: string): Record<string, unknown> | undefined {
  if (raw.trim() === '') return undefined;
  return JSON.parse(raw) as Record<string, unknown>;
}

export class LlmError extends Error {
  status?: number;
  constructor(message: string, opts?: { status?: number }) {
    super(message);
    this.name = 'LlmError';
    this.status = opts?.status;
  }
}

export const CONNECTION_ERROR_MESSAGE =
  'おいとまに接続できません。学内ネットワークかOU-VPNにつないでいるか確認してください';
export const AUTH_ERROR_MESSAGE =
  'おいとまのキーが無効です。おいとまの『APIキー発行』（/keys）で再発行してください';

// `<think>…</think>` を消す（閉じタグだけある場合は、その手前を消す）
// → ```json などのコードブロック記号を消す → 最初の `{` から最後の `}` までを切り出す
export function extractJsonText(raw: string): string {
  let s = raw;
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const closeIdx = s.indexOf('</think>');
  if (closeIdx >= 0) {
    s = s.slice(closeIdx + '</think>'.length);
  }
  s = s.replace(/<think[^>]*>/gi, '');
  s = s.replace(/```json/gi, '').replace(/```/g, '');
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first < 0 || last < 0 || last < first) {
    throw new Error('JSONが見つかりませんでした');
  }
  return s.slice(first, last + 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 400のときに外して送り直す組み合わせ（試行回数に数えない）。
// 0: そのまま / 1: 追加パラメータなし / 2: 追加パラメータ・response_formatなし
type BodyLevel = 0 | 1 | 2;
let cachedBodyLevel: BodyLevel | undefined;
let warnedBodyLevel = false;

export function __resetLlmClientForTest(): void {
  cachedBodyLevel = undefined;
  warnedBodyLevel = false;
}

function warnBodyLevelOnce(level: BodyLevel): void {
  if (warnedBodyLevel || level === 0) return;
  warnedBodyLevel = true;
  if (level === 1) {
    console.warn(
      '[llm] OITOMA_EXTRA_BODY を外すと通りました。.env.local では OITOMA_EXTRA_BODY= （空）をお試しください',
    );
  } else {
    console.warn(
      '[llm] response_format と OITOMA_EXTRA_BODY を外すと通りました。.env.local では OITOMA_JSON_MODE= と OITOMA_EXTRA_BODY= （空）をお試しください',
    );
  }
}

interface ChatMessage {
  role: string;
  content: string;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function chatJson<T>(opts: {
  task: LlmCallLog['task'];
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature: number;
  maxTokens: number;
  validate?: (value: T) => string | null;
}): Promise<{ value: T; attempts: number; ms: number }> {
  const started = Date.now();
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const model = getLlmModel();
  const timeoutMs = getTimeoutMs();
  const jsonMode = getJsonMode();
  const extraRaw = getExtraBodyRaw();

  if (!baseUrl) {
    throw new LlmError('おいとまの接続先が設定されていません。OITOMA_BASE_URL を .env.local に設定してください', {
      status: 500,
    });
  }
  if (!apiKey) {
    throw new LlmError('おいとまのキーが設定されていません。OITOMA_API_KEY を .env.local に設定してください', {
      status: 401,
    });
  }
  if (!model) {
    throw new LlmError('おいとまのモデル名が設定されていません。OITOMA_MODEL を .env.local に設定してください', {
      status: 500,
    });
  }

  let extraBody: Record<string, unknown> | undefined;
  try {
    extraBody = parseExtraBody(extraRaw);
  } catch {
    throw new LlmError('OITOMA_EXTRA_BODY がJSONとして読めません。.env.local を確認してください', { status: 500 });
  }

  const url = `${baseUrl}/chat/completions`;
  let level: BodyLevel = cachedBodyLevel ?? 0;
  let messages: ChatMessage[] = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.user },
  ];
  let maxTokens = opts.maxTokens;
  let attempts = 0;

  for (;;) {
    attempts += 1;
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: opts.temperature,
      max_tokens: maxTokens,
      stream: false,
    };
    if (level <= 1 && jsonMode === 'json_object') {
      body.response_format = { type: 'json_object' };
    }
    if (level === 0 && extraBody !== undefined) {
      Object.assign(body, extraBody);
    }

    let res: Response;
    try {
      res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
        },
        timeoutMs,
      );
    } catch {
      // 通信エラー、タイムアウト：2秒、5秒と待ってやり直す。
      if (attempts >= 3) {
        const ms = Date.now() - started;
        console.log(`[llm] task=${opts.task} ms=${ms} attempts=${attempts} ok=false`);
        throw new LlmError(CONNECTION_ERROR_MESSAGE, { status: 502 });
      }
      await sleep(attempts === 1 ? 2000 : 5000);
      continue;
    }

    // 400（パラメータを受け付けない）：追加パラメータ、response_format の順に外す（試行回数に数えない）。
    if (res.status === 400 && level < 2) {
      level = ((level + 1) as BodyLevel);
      attempts -= 1;
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      const ms = Date.now() - started;
      console.log(`[llm] task=${opts.task} ms=${ms} attempts=${attempts} ok=false`);
      throw new LlmError(AUTH_ERROR_MESSAGE, { status: res.status });
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempts >= 3) {
        const ms = Date.now() - started;
        console.log(`[llm] task=${opts.task} ms=${ms} attempts=${attempts} ok=false`);
        throw new LlmError('おいとまが混み合っています。しばらく待ってやり直してください', { status: res.status });
      }
      await sleep(attempts === 1 ? 2000 : 5000);
      continue;
    }
    if (!res.ok) {
      const ms = Date.now() - started;
      console.log(`[llm] task=${opts.task} ms=${ms} attempts=${attempts} ok=false`);
      throw new LlmError(`おいとまの呼び出しに失敗しました（${res.status}）。`, { status: res.status });
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const content = (data as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message
      ?.content;
    const contentStr = typeof content === 'string' ? content : '';

    // 応答が空なら失敗として扱い、次の試行では max_tokens を3倍にする。
    if (!contentStr.trim()) {
      maxTokens *= 3;
      if (attempts >= 3) {
        const ms = Date.now() - started;
        console.log(`[llm] task=${opts.task} ms=${ms} attempts=${attempts} ok=false`);
        throw new LlmError('おいとまの応答を読み取れませんでした：応答が空でした', { status: 502 });
      }
      messages = [
        ...messages,
        { role: 'assistant', content: '' },
        {
          role: 'user',
          content: '前の出力は条件を満たしていません：応答が空でした。条件を守り、指定のJSONだけを返してください。',
        },
      ];
      continue;
    }

    try {
      const text = extractJsonText(contentStr);
      const parsed: unknown = JSON.parse(text);
      const r = opts.schema.safeParse(parsed);
      if (!r.success) {
        const reason = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 500);
        throw new Error(`JSONの形式が条件を満たしていません：${reason}`);
      }
      if (opts.validate) {
        const reason = opts.validate(r.data);
        if (reason) throw new Error(reason);
      }
      cachedBodyLevel = level;
      warnBodyLevelOnce(level);
      const ms = Date.now() - started;
      console.log(`[llm] task=${opts.task} ms=${ms} attempts=${attempts} ok=true`);
      return { value: r.data, attempts, ms };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      if (attempts >= 3) {
        const ms = Date.now() - started;
        console.log(`[llm] task=${opts.task} ms=${ms} attempts=${attempts} ok=false`);
        throw new LlmError(`おいとまの応答を読み取れませんでした：${reason}`, { status: 502 });
      }
      messages = [
        ...messages,
        { role: 'assistant', content: contentStr.slice(0, 2000) },
        {
          role: 'user',
          content: `前の出力は条件を満たしていません：${reason}。条件を守り、指定のJSONだけを返してください。`,
        },
      ];
    }
  }
}

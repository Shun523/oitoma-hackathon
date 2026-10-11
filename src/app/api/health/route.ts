import { elapsedMs } from '@/lib/time';
import { NextResponse } from 'next/server';
import { isAdminEnabled } from '@/lib/admin';
import { getLlmLimiter, LlmQueueFullError } from '@/lib/llm/limiter';
import {
  CONNECTION_ERROR_MESSAGE,
  getApiKey,
  getBaseUrl,
  getLlmModel,
  getTimeoutMs,
  resolveMode,
} from '@/lib/llm/client';

export const maxDuration = 120;

export async function GET(req: Request): Promise<Response> {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const mode = resolveMode();
  const model = getLlmModel() || 'qwen3.8-27b-it';
  const url = new URL(req.url);
  if (url.searchParams.get('ping') !== '1') {
    return NextResponse.json({ mode, model });
  }
  if (mode === 'mock') {
    return NextResponse.json({ mode, model, ok: true });
  }
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  if (!baseUrl) {
    return NextResponse.json({ mode, model, ok: false, error: 'OITOMA_BASE_URL が設定されていません' });
  }
  if (!apiKey) {
    return NextResponse.json({ mode, model, ok: false, error: 'おいとまのキーが設定されていません' });
  }
  if (!getLlmModel()) {
    return NextResponse.json({ mode, model, ok: false, error: 'おいとまのモデル名が設定されていません' });
  }
  const started = performance.now();
  try {
    return await getLlmLimiter().run(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), getTimeoutMs());
      try {
        const res = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.any([req.signal, controller.signal]),
        });
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json({
            mode,
            model,
            ok: false,
            error: 'おいとまのキーが無効です。おいとまの『APIキー発行』（/keys）で再発行してください',
          });
        }
        if (!res.ok) {
          return NextResponse.json({ mode, model, ok: false, error: `おいとまの応答が異常です（${res.status}）` });
        }
        return NextResponse.json({ mode, model, ok: true, ms: elapsedMs(started) });
      } finally {
        clearTimeout(timer);
      }
    }, req.signal);
  } catch (error) {
    if (error instanceof LlmQueueFullError) return NextResponse.json({ mode, model, ok: false, error: error.message });
    return NextResponse.json({ mode, model, ok: false, error: CONNECTION_ERROR_MESSAGE });
  }
}

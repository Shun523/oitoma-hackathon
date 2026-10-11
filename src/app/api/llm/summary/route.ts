import { NextResponse } from 'next/server';
import { isAdminEnabled } from '@/lib/admin';
import { LlmError } from '@/lib/llm/client';
import { summaryApiSchema } from '@/lib/llm/schemas';
import { createDirectLlmApi } from '@/lib/llm/tasks';

export const maxDuration = 120;

export async function POST(req: Request): Promise<Response> {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'JSONとして読めませんでした' }, { status: 400 });
  }
  const parsed = summaryApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', message: '入力が正しくありません' }, { status: 400 });
  }
  try {
    const { text, meta } = await createDirectLlmApi(req.signal).summary(parsed.data.tags);
    console.log(`[api] task=summary ms=${meta.ms} attempts=${meta.attempts} ok=true`);
    return NextResponse.json({ text, meta });
  } catch (e) {
    console.log('[api] task=summary ok=false');
    if (e instanceof LlmError) {
      return NextResponse.json({ error: 'llm_failed', message: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'llm_failed', message: '生成に失敗しました' }, { status: 502 });
  }
}

import { NextResponse } from 'next/server';
import { isAdminEnabled } from '@/lib/admin';
import { LlmError } from '@/lib/llm/client';
import { catalogApiSchema } from '@/lib/llm/schemas';
import { directLlmApi } from '@/lib/llm/tasks';

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
  const parsed = catalogApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', message: '入力が正しくありません' }, { status: 400 });
  }
  try {
    const { tags, meta } = await directLlmApi.catalog(parsed.data.people, parsed.data.params);
    console.log(`[api] task=catalog ms=${meta.ms} attempts=${meta.attempts} ok=true`);
    return NextResponse.json({ tags, meta });
  } catch (e) {
    console.log('[api] task=catalog ok=false');
    if (e instanceof LlmError) {
      return NextResponse.json({ error: 'llm_failed', message: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'llm_failed', message: '生成に失敗しました' }, { status: 502 });
  }
}

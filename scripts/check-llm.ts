// scripts/check-llm.ts
// おいとまの接続確認（人が学内で実行）。`LLM_MODE` に関係なく本物のおいとまを呼ぶ。
process.env.LLM_MODE = 'live';

import { extractJsonText } from '../src/lib/llm/client';
import { directLlmApi } from '../src/lib/llm/tasks';

const BASE_URL = (process.env.OITOMA_BASE_URL || '').replace(/\/+$/, '');
const API_KEY = process.env.OITOMA_API_KEY || process.env.OKAYAMA_API_KEY || '';
const MODEL = process.env.OITOMA_MODEL || '';
const JSON_MODE = process.env.OITOMA_JSON_MODE ?? 'json_object';
const EXTRA_RAW = process.env.OITOMA_EXTRA_BODY ?? '{"chat_template_kwargs":{"enable_thinking":false}}';
const TIMEOUT_MS = Number(process.env.OITOMA_TIMEOUT_MS) || 90000;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '(不正なURL)';
  }
}

function extraKeys(): string {
  if (EXTRA_RAW.trim() === '') return '(なし)';
  try {
    return Object.keys(JSON.parse(EXTRA_RAW)).join(', ') || '(空オブジェクト)';
  } catch {
    return '(読めません)';
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type Combo = 'full' | 'noExtra' | 'minimal';

async function tryChat(
  model: string,
  combo: Combo,
): Promise<{ ok: boolean; ms: number; readable: boolean; status: number; snippet: string }> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: '出力はJSONだけにする。前置き、説明、コードブロックの記号は書かない。' },
      { role: 'user', content: '{"ok":true} とだけ返してください' },
    ],
    temperature: 0,
    max_tokens: 200,
    stream: false,
  };
  if (combo === 'full' && JSON_MODE === 'json_object') {
    body.response_format = { type: 'json_object' };
  }
  if (combo === 'full' && EXTRA_RAW.trim() !== '') {
    try {
      Object.assign(body, JSON.parse(EXTRA_RAW));
    } catch {
      // 呼び出し側で失敗として扱う
    }
  }
  const started = Date.now();
  const res = await fetchWithTimeout(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - started;
  const text = await res.text();
  let readable = false;
  if (res.ok) {
    try {
      const content = (JSON.parse(text) as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
        ?.message?.content;
      if (typeof content === 'string' && content.trim() !== '') {
        JSON.parse(extractJsonText(content));
        readable = true;
      }
    } catch {
      readable = false;
    }
  }
  return { ok: res.ok, ms, readable, status: res.status, snippet: text.slice(0, 200) };
}

async function main(): Promise<number> {
  let failed = false;

  console.log(`URLのホスト: ${BASE_URL ? hostOf(BASE_URL) : '(未設定)'}`);
  console.log(`モデル名: ${MODEL || '(未設定)'}`);
  console.log(`JSONモード: ${JSON_MODE}`);
  console.log(`追加パラメータのキー名: ${extraKeys()}`);
  console.log(`キー: ${API_KEY ? '設定あり' : 'なし'}`);

  if (!BASE_URL) {
    console.log('OITOMA_BASE_URL が設定されていません。.env.local を確認してください');
    return 1;
  }
  if (!API_KEY) {
    console.log('おいとまのキーが設定されていません。OITOMA_API_KEY を .env.local に設定してください');
    return 1;
  }

  // モデル一覧
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) {
      console.log(`モデル一覧の取得に失敗しました（${res.status}）`);
      failed = true;
    } else {
      const data = (await res.json()) as { data?: { id?: string }[] };
      const ids = (data.data ?? []).map((m) => m.id).filter(Boolean);
      console.log(`モデル一覧: ${ids.join(', ') || '(空)'}`);
    }
  } catch {
    console.log('おいとまに接続できません。学内ネットワークかOU-VPNにつないでください');
    return 1;
  }

  // 2つのモデルで疎通
  const workingCombo: Partial<Record<string, Combo>> = {};
  for (const model of ['qwen3.8-27b-it', 'qwen3.6-35b-a3b-it']) {
    let combo: Combo = 'full';
    let last = await tryChat(model, combo);
    if (!last.ok && last.status === 400) {
      combo = 'noExtra';
      last = await tryChat(model, combo);
    }
    if (!last.ok && last.status === 400) {
      combo = 'minimal';
      last = await tryChat(model, combo);
    }
    workingCombo[model] = combo;
    console.log(
      `${model}: ${last.ok ? `応答あり（${last.ms}ms、JSONとして${last.readable ? '読めた' : '読めなかった'}、組み合わせ=${combo}）` : `失敗（${last.status}）`}`,
    );
    if (!last.ok || !last.readable) failed = true;
  }

  // OITOMA_MODEL でダミー3人の extract
  if (MODEL) {
    try {
      const started = Date.now();
      const { results, missing } = await directLlmApi.extract([
        { id: 'P001', affiliation: '工学部', category: '学生', intro: 'ラーメン屋巡りが好きです', hobby: 'カフェ巡り' },
        { id: 'P002', affiliation: '農学部', category: '教員', intro: '発酵食品を研究しています', hobby: '登山' },
        { id: 'P003', affiliation: '入試課', category: '職員', intro: '', hobby: '' },
      ]);
      console.log(`extract（${MODEL}）: ${Date.now() - started}ms、${results.length}人分、missing=${missing.join(',') || 'なし'}`);
      for (const r of results) {
        console.log(`  ${r.id}: topics=[${r.topics.join(', ')}] personal=[${r.personal.join(', ')}]`);
      }
      if (missing.length > 0) failed = true;
    } catch (e) {
      console.log(`extract（${MODEL}）: 失敗（${e instanceof Error ? e.message : String(e)}）`);
      failed = true;
    }
  } else {
    console.log('OITOMA_MODEL が未設定のため、extract の確認を省略しました');
    failed = true;
  }

  console.log('--- .env.local に書くとよい値 ---');
  console.log(`OITOMA_JSON_MODE=${workingCombo[MODEL] === 'minimal' ? '' : JSON_MODE}`);
  console.log(`OITOMA_EXTRA_BODY=${workingCombo[MODEL] === 'full' ? EXTRA_RAW : ''}`);
  console.log(`OITOMA_MODEL=${MODEL}`);
  return failed ? 1 : 0;
}

const code = await main();
process.exit(code);

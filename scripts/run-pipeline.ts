// scripts/run-pipeline.ts
// コマンドラインで生成を通す（プロンプト調整と、初期の公開データづくりに使う）。
// npm run pipeline -- --file public/samples/sample-40.xlsx [--mock] [--out private/result.json] [--publish src/data/published.json] [--no-mask]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_PRINT_OPTIONS } from '../src/config/event';
import { guessColumns, readSheet, toParticipants } from '../src/lib/import/forms';
import { computeMetrics } from '../src/lib/metrics';
import { emptySnapshot, runGeneration } from '../src/lib/pipeline/run';
import { buildPublishedData } from '../src/lib/publish';
import type { AppState, LlmCallLog } from '../src/lib/types';

interface Args {
  file: string;
  mock: boolean;
  out?: string;
  publish?: string;
  noMask: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { file: '', mock: false, noMask: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') args.file = argv[i + 1] ?? '';
    else if (a === '--mock') args.mock = true;
    else if (a === '--out') args.out = argv[i + 1] ?? '';
    else if (a === '--publish') args.publish = argv[i + 1] ?? '';
    else if (a === '--no-mask') args.noMask = true;
    if (a === '--file' || a === '--out' || a === '--publish') i += 1;
  }
  return args;
}

function phaseSeconds(startedAt?: number, finishedAt?: number): string {
  if (startedAt === undefined || finishedAt === undefined) return '-';
  return `${((finishedAt - startedAt) / 1000).toFixed(1)}秒`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('使い方: npm run pipeline -- --file <xlsx> [--mock] [--out <json>] [--publish <json>] [--no-mask]');
    process.exit(1);
  }
  // タスクを読み込む前に mock を決める
  if (args.mock) process.env.LLM_MODE = 'mock';
  const { directLlmApi } = await import('../src/lib/llm/tasks');

  const buf = readFileSync(args.file);
  const sheet = readSheet(new Uint8Array(buf));
  const { participants } = toParticipants(sheet, guessColumns(sheet.headers));
  console.log(`対象: ${participants.length}人 (${args.file})`);

  const llmLog: LlmCallLog[] = [];
  const started = Date.now();
  const snap = await runGeneration({
    participants,
    start: emptySnapshot(),
    api: directLlmApi,
    onUpdate: (_s, log) => {
      if (log) llmLog.push(log);
    },
  });
  console.log(`合計: ${((Date.now() - started) / 1000).toFixed(1)}秒`);
  for (const p of snap.progress) {
    console.log(`  ${p.key}: ${phaseSeconds(p.startedAt, p.finishedAt)} (${p.status})`);
  }

  console.log(`共有タグ候補（${snap.candidates.length}個）: ${snap.candidates.map((c) => c.label).join('／')}`);
  const counts = new Map<string, number>();
  for (const p of participants) {
    for (const tid of snap.assignments[p.id]?.sharedTagIds ?? []) {
      counts.set(tid, (counts.get(tid) ?? 0) + 1);
    }
  }
  const labelById = new Map(snap.candidates.map((c) => [c.id, c.label]));
  console.log(
    `採用タグ（${snap.activeTagIds.length}個）: ${snap.activeTagIds.map((tid) => `${labelById.get(tid)}（${counts.get(tid) ?? 0}人）`).join('／')}`,
  );

  const metrics = computeMetrics(snap.assignments);
  console.log(
    `指標: 参加者${metrics.participants}人、共有タグ${metrics.sharedTagCount}個、共通タグ仲間${metrics.matesMin}/${metrics.matesMedian}/${metrics.matesMax}人（最小/中央値/最大）、遭遇率${(metrics.encounterRate * 100).toFixed(0)}%、要確認${metrics.needsReview}人`,
  );

  console.log('例（5人）:');
  for (const p of participants.slice(0, 5)) {
    const a = snap.assignments[p.id];
    const shared = (a?.sharedTagIds ?? []).map((tid) => labelById.get(tid) ?? tid).join('／');
    console.log(`  ${p.hobby || '（一言なし）'} → ${a?.personalTag}＋${shared}`);
  }

  const now = new Date().toISOString();
  if (args.out) {
    const state: AppState = {
      version: 1,
      participants,
      importedAt: now,
      params: snap.params,
      extractions: snap.extractions,
      candidates: snap.candidates,
      rankings: snap.rankings,
      activeTagIds: snap.activeTagIds,
      assignments: snap.assignments,
      summary: snap.summary,
      progress: snap.progress,
      llmLog: llmLog.slice(-200),
      generatedAt: now,
      printOptions: DEFAULT_PRINT_OPTIONS,
    };
    const outPath = path.resolve(args.out);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(state, null, 2)}\n`);
    console.log(`状態を書き出しました: ${outPath}`);
  }

  if (args.publish) {
    const published = buildPublishedData({
      participants,
      assignments: snap.assignments,
      candidates: snap.candidates,
      activeTagIds: snap.activeTagIds,
      summary: snap.summary,
      maskNames: !args.noMask,
      generatedAt: now,
    });
    const publishPath = path.resolve(args.publish);
    mkdirSync(path.dirname(publishPath), { recursive: true });
    writeFileSync(publishPath, `${JSON.stringify(published, null, 2)}\n`);
    console.log(`公開用データを書き出しました: ${publishPath}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

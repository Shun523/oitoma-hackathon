// src/app/admin/generate/page.tsx
// タグの一括生成と進捗、生成の様子の再生。
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GenerationReplay } from '@/components/GenerationReplay';
import { EVENT } from '@/config/event';
import { httpLlmApi } from '@/lib/pipeline/llm-api';
import { emptySnapshot, runGeneration, type GenerationSnapshot } from '@/lib/pipeline/run';
import { computeParams } from '@/lib/sizing';
import { appStateSchema, useHydrated, useStore } from '@/lib/store';
import type { GenerationParams, LlmCallLog, PhaseProgress } from '@/lib/types';

const PHASE_META: { key: PhaseProgress['key']; name: string; owner: string }[] = [
  { key: 'extract', name: '話題の読み取り', owner: 'おいとま' },
  { key: 'catalog', name: '共有タグの候補づくり', owner: 'おいとま' },
  { key: 'rank', name: 'タグの当てはまり順', owner: 'おいとま' },
  { key: 'assign', name: '割り当てと検証', owner: 'プログラム' },
  { key: 'summary', name: '会場の傾向まとめ', owner: 'おいとま' },
];

const STATUS_ICON: Record<PhaseProgress['status'], string> = {
  pending: '○',
  running: '…',
  done: '●',
  error: '×',
  skipped: '―',
};

function elapsedSec(p: PhaseProgress, now: number): string {
  if (p.startedAt === undefined) return '';
  const end = p.finishedAt ?? now;
  return `${((end - p.startedAt) / 1000).toFixed(1)}秒`;
}

function isComplete(progress: PhaseProgress[]): boolean {
  const done = new Set(
    progress.filter((p) => p.key !== 'summary' && p.status === 'done').map((p) => p.key),
  );
  return done.has('extract') && done.has('catalog') && done.has('rank') && done.has('assign');
}

export default function GeneratePage(): React.JSX.Element {
  const hydrated = useHydrated();
  const participants = useStore((s) => s.participants);
  const params = useStore((s) => s.params);
  const extractions = useStore((s) => s.extractions);
  const candidates = useStore((s) => s.candidates);
  const rankings = useStore((s) => s.rankings);
  const activeTagIds = useStore((s) => s.activeTagIds);
  const assignments = useStore((s) => s.assignments);
  const summary = useStore((s) => s.summary);
  const progress = useStore((s) => s.progress);
  const llmLog = useStore((s) => s.llmLog);
  const patchGeneration = useStore((s) => s.patchGeneration);
  const markGenerated = useStore((s) => s.markGenerated);
  const appendLlmLog = useStore((s) => s.appendLlmLog);
  const resetGeneration = useStore((s) => s.resetGeneration);
  const replaceAll = useStore((s) => s.replaceAll);

  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showDetails, setShowDetails] = useState(false);
  const [override, setOverride] = useState<Partial<Pick<GenerationParams, 'targetSize' | 'minSize' | 'maxSize' | 'candidateCount'>>>({});
  const [health, setHealth] = useState<{ mode?: string; model?: string; ok?: boolean; ms?: number; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [running]);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  if (participants.length === 0) {
    return (
      <div className="space-y-3 py-6">
        <h1 className="text-xl font-bold">2 生成</h1>
        <p>まだ回答を取り込んでいません。</p>
        <Link href="/admin/import" className="inline-block rounded border px-3 py-2 text-sm">
          取り込みへ
        </Link>
      </div>
    );
  }

  const guide = computeParams(participants.length);
  const shown = params ?? guide;
  const customParams = (n: number): GenerationParams => {
    const base = computeParams(n);
    const targetSize = override.targetSize ?? base.targetSize;
    const minSize = override.minSize ?? Math.max(2, Math.ceil(targetSize / 2));
    const maxSize = override.maxSize ?? targetSize * 2;
    return {
      ...base,
      targetSize,
      minSize: Math.min(minSize, maxSize),
      maxSize: Math.max(minSize, maxSize),
      candidateCount: override.candidateCount ?? base.candidateCount,
    };
  };
  const complete = isComplete(progress);
  const hasPartial = params !== null && !complete;
  const edited = Object.values(assignments).some((a) => a.edited);
  const counts = new Map<string, number>();
  for (const id of Object.keys(assignments)) {
    for (const tid of assignments[id]?.sharedTagIds ?? []) counts.set(tid, (counts.get(tid) ?? 0) + 1);
  }
  const labelById = new Map(candidates.map((c) => [c.id, c.label]));
  const totalCalls = llmLog.length;
  const avgMs = totalCalls > 0 ? Math.round(llmLog.reduce((a, l) => a + l.ms, 0) / totalCalls) : 0;
  const retries = llmLog.reduce((a, l) => a + Math.max(0, l.attempts - 1), 0);

  const checkConnection = async (): Promise<void> => {
    setChecking(true);
    try {
      const res = await fetch('/api/health?ping=1');
      setHealth(res.ok ? await res.json() : { error: `確認に失敗しました（${res.status}）` });
    } catch {
      setHealth({ error: 'おいとまに接続できません。学内ネットワークかOU-VPNにつないでください' });
    } finally {
      setChecking(false);
    }
  };

  const startRun = (fresh: boolean): void => {
    if (running) return;
    if ((complete || edited) && !window.confirm('手で編集した結果や生成結果を上書きします。続けますか？')) return;
    if (fresh) resetGeneration('all');
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    const base: GenerationSnapshot = fresh
      ? { ...emptySnapshot(), params: customParams(participants.length) }
      : {
          params: params ?? computeParams(participants.length),
          extractions: { ...extractions },
          candidates: [...candidates],
          rankings: { ...rankings },
          activeTagIds: [...activeTagIds],
          assignments: { ...assignments },
          summary,
          progress: [],
        };
    runGeneration({
      participants,
      start: base,
      api: httpLlmApi,
      signal: controller.signal,
      onUpdate: (snap: GenerationSnapshot, log?: LlmCallLog) => {
        patchGeneration(snap);
        if (log) appendLlmLog(log);
      },
    })
      .then(() => markGenerated())
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === '中止しました') return;
        // 段階の error は progress に残り、「続きから生成」で再開できる
      })
      .finally(() => {
        setRunning(false);
        abortRef.current = null;
      });
  };

  const onLoadJson = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const parsed = appStateSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        window.alert('状態のJSONとして読めませんでした');
        return;
      }
      if (!window.confirm('いまの内容を上書きします。続けますか？')) return;
      replaceAll(parsed.data);
    } catch {
      window.alert('状態のJSONとして読めませんでした');
    }
  };

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold">2 生成</h1>

      <p className="text-sm">
        対象{participants.length}人：1タグあたり約{shown.targetSize}人（{shown.minSize}〜{shown.maxSize}人）、
        候補{shown.candidateCount}個
      </p>
      <div className="text-sm">
        <button type="button" onClick={() => setShowDetails((v) => !v)} className="underline">
          {showDetails ? '詳細設定を閉じる' : '詳細設定（目安・下限・上限・候補数を上書き）'}
        </button>
        {showDetails && (
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {(
              [
                ['targetSize', '目安（1タグあたりの人数）'],
                ['minSize', '下限'],
                ['maxSize', '上限'],
                ['candidateCount', '候補数'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <span className="w-48 shrink-0">{label}</span>
                <input
                  type="number"
                  min={1}
                  value={override[key] ?? guide[key]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setOverride((o) => ({ ...o, [key]: Number.isNaN(v) ? undefined : Math.max(1, Math.floor(v)) }));
                  }}
                  className="w-24 rounded border border-gray-300 px-2 py-1"
                />
              </label>
            ))}
            <p className="text-xs text-gray-500 md:col-span-2">
              最初から作り直すときに使います。続きからの生成は保存中の値を使います。
            </p>
          </div>
        )}
      </div>

      <section className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => void checkConnection()}
          disabled={checking}
          className="rounded border px-3 py-2"
        >
          接続確認
        </button>
        {health?.ok === true && (
          <span>
            接続OK（{health.model}、{health.ms}ms）
          </span>
        )}
        {health?.error && <span className="text-red-700">{health.error}</span>}
      </section>

      <section className="flex flex-wrap gap-2">
        {!complete && !hasPartial && (
          <button
            type="button"
            onClick={() => startRun(true)}
            disabled={running}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            タグを一括生成
          </button>
        )}
        {hasPartial && (
          <>
            <button
              type="button"
              onClick={() => startRun(false)}
              disabled={running}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              続きから生成
            </button>
            <button
              type="button"
              onClick={() => startRun(true)}
              disabled={running}
              className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            >
              最初から作り直す
            </button>
          </>
        )}
        {complete && (
          <button
            type="button"
            onClick={() => startRun(true)}
            disabled={running}
            className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          >
            最初から作り直す
          </button>
        )}
        {running && (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded border border-red-500 px-4 py-2 text-sm text-red-700"
          >
            中止
          </button>
        )}
        <label className="cursor-pointer rounded border px-3 py-2 text-sm">
          生成済みの結果を読み込む（JSON）
          <input type="file" accept=".json" className="hidden" onChange={(e) => void onLoadJson(e.target.files?.[0])} />
        </label>
      </section>

      {progress.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">進捗</h2>
          <ol className="space-y-2">
            {PHASE_META.map((meta) => {
              const p = progress.find((q) => q.key === meta.key);
              if (!p) return null;
              return (
                <li key={meta.key} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="w-40 font-bold">{meta.name}</span>
                  <span className="text-xs text-gray-500">{meta.owner}</span>
                  <span aria-label={p.status}>{STATUS_ICON[p.status]}</span>
                  <span>
                    {p.done}/{p.total}件
                  </span>
                  <span className="text-xs text-gray-500">{elapsedSec(p, now)}</span>
                  {p.message && <span className="text-red-700">{p.message}</span>}
                </li>
              );
            })}
          </ol>
          {progress.some((p) => p.status === 'error') && !running && (
            <p className="mt-2 text-sm">失敗した段階があります。「続きから生成」で再開できます。</p>
          )}
        </section>
      )}

      {candidates.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">候補タグ</h2>
          <div className="flex flex-wrap gap-1">
            {candidates.map((c) => (
              <span key={c.id} className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                #{c.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {activeTagIds.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">採用タグ</h2>
          <div className="flex flex-wrap gap-1">
            {activeTagIds.map((tid) => (
              <span key={tid} className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold">
                #{labelById.get(tid)}（{counts.get(tid) ?? 0}人）
              </span>
            ))}
          </div>
        </section>
      )}

      {totalCalls > 0 && (
        <p className="text-xs text-gray-500">
          おいとまの呼び出し{totalCalls}回、平均応答時間{avgMs}ms、やり直し{retries}回
        </p>
      )}

      {complete && !running && (
        <section className="flex flex-wrap items-center gap-3">
          <Link href="/admin/review" className="rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white">
            確認へ進む
          </Link>
          <button
            type="button"
            onClick={() => setReplaying((v) => !v)}
            className="rounded border px-4 py-2 text-sm"
          >
            {replaying ? '再生を閉じる' : '生成の様子を再生'}
          </button>
        </section>
      )}

      {replaying && complete && (
        <GenerationReplay
          data={{
            participants: participants.map((p) => ({ id: p.id, hobby: p.hobby })),
            extractions,
            candidates,
            assignments,
            activeTagIds,
            summary,
            progress,
            llmCallCount: totalCalls,
          }}
        />
      )}

      <p className="text-xs text-gray-500">{EVENT.publicNote}</p>
    </div>
  );
}

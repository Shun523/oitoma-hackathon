// src/app/admin/generate/page.tsx
// タグの一括生成と進み具合、生成の様子の再生。
'use client';

import { useEffect, useRef, useState } from 'react';
import { GenerationReplay, formatTotal } from '@/components/GenerationReplay';
import { GuideCard } from '@/components/GuideCard';
import { toOitomaNotice } from '@/components/oitoma-error';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Notice } from '@/components/ui/Notice';
import { TagChip } from '@/components/ui/TagChip';
import { IconCheck, IconPlay } from '@/components/ui/icons';
import { PageFooter } from '@/components/PageFooter';
import { PageHeader } from '@/components/PageHeader';
import { httpLlmApi } from '@/lib/pipeline/llm-api';
import { emptySnapshot, runGeneration, type GenerationSnapshot } from '@/lib/pipeline/run';
import { computeParams } from '@/lib/sizing';
import { useHydrated, useStore } from '@/lib/store';
import type { GenerationParams, LlmCallLog, PhaseProgress } from '@/lib/types';

const PHASE_META: { key: PhaseProgress['key']; name: string; owner: 'oitoma' | 'program' }[] = [
  { key: 'extract', name: '話題の読み取り', owner: 'oitoma' },
  { key: 'catalog', name: '共有タグの候補づくり', owner: 'oitoma' },
  { key: 'rank', name: 'タグの当てはまり順', owner: 'oitoma' },
  { key: 'assign', name: '割り当てと検証', owner: 'program' },
  { key: 'summary', name: '会場の傾向まとめ', owner: 'oitoma' },
];

const OWNER_LABEL = { oitoma: 'おいとま', program: 'プログラム' } as const;

const STATUS_WORD: Record<PhaseProgress['status'], string> = {
  pending: '待機中',
  running: '実行中',
  done: '完了',
  error: 'エラー',
  skipped: 'スキップ',
};

function PhaseCircle({ status, index }: { status: PhaseProgress['status']; index: number }): React.JSX.Element {
  const base = 'flex size-8 items-center justify-center rounded-full text-adm-sm font-bold';
  switch (status) {
    case 'running':
      return <span className={`${base} bg-adm-primary text-white`}>{index + 1}</span>;
    case 'done':
      return (
        <span className={`${base} bg-adm-done text-white`}>
          <IconCheck size={16} />
        </span>
      );
    case 'error':
      return <span className={`${base} bg-adm-danger text-white`}>!</span>;
    case 'skipped':
      return <span className={`${base} bg-adm-field text-adm-sub`}>{index + 1}</span>;
    default:
      return <span className={`${base} border-[1.5px] border-adm-line-strong text-adm-sub`}>{index + 1}</span>;
  }
}

function elapsedSec(p: PhaseProgress, now: number): string {
  if (p.startedAt === undefined) return '';
  const end = p.finishedAt ?? now;
  return `${Math.max(0, Math.round((end - p.startedAt) / 1000))}秒`;
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
  const activeTagIds = useStore((s) => s.activeTagIds);
  const assignments = useStore((s) => s.assignments);
  const summary = useStore((s) => s.summary);
  const progress = useStore((s) => s.progress);
  const llmLog = useStore((s) => s.llmLog);

  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [override, setOverride] = useState<Partial<Pick<GenerationParams, 'targetSize' | 'minSize' | 'maxSize' | 'candidateCount'>>>({});
  const [health, setHealth] = useState<{ mode?: string; model?: string; ok?: boolean; ms?: number; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<'mock' | 'live' | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [pendingRemake, setPendingRemake] = useState<'all' | 'shared' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mode?: 'mock' | 'live' } | null) => {
        if (!cancelled && (data?.mode === 'mock' || data?.mode === 'live')) setMode(data.mode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  if (participants.length === 0) {
    return (
      <div className="space-y-3 py-6">
        <PageHeader
          step={2}
          title="タグを作る"
          description="おいとまが全員の回答を読み、共有タグと個性タグを作ります。人数によっては数分かかります。"
        />
        <GuideCard
          title="まだ回答を読み込んでいません"
          description="参加登録フォームの回答を先に読み込みます。"
          next={{ href: '/admin/import', label: '1 回答を読み込むへ' }}
        />
        <PageFooter next={{ href: '/admin/review', label: '確認・修正', disabled: true }} />
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
  const editedCount = Object.values(assignments).filter((a) => a.edited).length;
  const statusOf = (key: PhaseProgress['key']): PhaseProgress['status'] =>
    progress.find((p) => p.key === key)?.status ?? 'pending';
  const sharedCounts = new Map<string, number>();
  for (const id of Object.keys(assignments)) {
    for (const tid of assignments[id]?.sharedTagIds ?? []) sharedCounts.set(tid, (sharedCounts.get(tid) ?? 0) + 1);
  }
  const labelById = new Map(candidates.map((c) => [c.id, c.label]));
  const adoptedSorted = [...activeTagIds].sort((a, b) => (sharedCounts.get(b) ?? 0) - (sharedCounts.get(a) ?? 0));
  const totalCalls = llmLog.length;
  const avgMs = totalCalls > 0 ? Math.round(llmLog.reduce((a, l) => a + l.ms, 0) / totalCalls) : 0;
  const retries = llmLog.reduce((a, l) => a + Math.max(0, l.attempts - 1), 0);
  const errorPhase = PHASE_META.map((meta, index) => ({ ...meta, index, p: progress.find((q) => q.key === meta.key) })).find(
    (x) => x.p?.status === 'error',
  );
  const failureMapped = errorPhase?.p !== undefined ? toOitomaNotice(errorPhase.p.message ?? '') : null;

  const checkConnection = async (): Promise<void> => {
    setChecking(true);
    try {
      const res = await fetch('/api/health?ping=1');
      setHealth(res.ok ? await res.json() : { error: `確認に失敗しました（${res.status}）` });
    } catch {
      setHealth({ error: 'おいとまに接続できません' });
    } finally {
      setChecking(false);
    }
  };

  const startRun = (fresh: boolean): void => {
    if (running) return;
    const store = useStore.getState();
    if (fresh) store.resetGeneration('all');
    const cur = useStore.getState();
    const parts = cur.participants;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    const base: GenerationSnapshot = fresh
      ? { ...emptySnapshot(), params: customParams(parts.length) }
      : {
          params: cur.params ?? computeParams(parts.length),
          extractions: { ...cur.extractions },
          candidates: [...cur.candidates],
          rankings: { ...cur.rankings },
          activeTagIds: [...cur.activeTagIds],
          assignments: { ...cur.assignments },
          summary: cur.summary,
          progress: [],
        };
    runGeneration({
      participants: parts,
      start: base,
      api: httpLlmApi,
      signal: controller.signal,
      onUpdate: (snap: GenerationSnapshot, log?: LlmCallLog) => {
        cur.patchGeneration(snap);
        if (log) cur.appendLlmLog(log);
      },
    })
      .then(() => cur.markGenerated())
      .catch(() => {
        // 段階の error は progress に残り、「続きから作る」で再開できる
      })
      .finally(() => {
        setRunning(false);
        abortRef.current = null;
      });
  };

  const askRemake = (scope: 'all' | 'shared'): void => {
    if (editedCount > 0) setPendingRemake(scope);
    else doRemake(scope);
  };

  const doRemake = (scope: 'all' | 'shared'): void => {
    if (scope === 'shared') useStore.getState().resetGeneration('shared');
    startRun(scope === 'all');
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        step={2}
        title="タグを作る"
        description="おいとまが全員の回答を読み、共有タグと個性タグを作ります。人数によっては数分かかります。"
      />

      <Card className="flex flex-col gap-4 p-5">
        <p>
          {participants.length}人分の回答から作ります。1つの共有タグを約{shown.targetSize}人（{shown.minSize}
          〜{shown.maxSize}人）で共有します。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'live' ? (
            <Badge tone="oitoma">おいとまに接続中</Badge>
          ) : mode === 'mock' ? (
            <Badge tone="neutral">練習モード</Badge>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void checkConnection()} disabled={checking}>
            接続を確かめる
          </Button>
          {health?.ok === true ? (
            <span className="text-adm-sm text-adm-done">
              つながりました（{health.model}、{health.ms}ミリ秒）
            </span>
          ) : (
            health !== null && (
              <span className="text-adm-sm text-adm-danger">
                おいとまに接続できません。学内ネットワークかOU-VPNにつないでください。
              </span>
            )
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {running ? (
            <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
              中止する
            </Button>
          ) : !complete && !hasPartial ? (
            <Button variant="primary" onClick={() => startRun(true)}>
              タグをまとめて作る
            </Button>
          ) : !complete && hasPartial ? (
            <>
              <Button variant="primary" onClick={() => startRun(false)}>
                続きから作る
              </Button>
              <Button variant="secondary" onClick={() => askRemake('all')}>
                最初から作り直す
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => askRemake('all')}>
                最初から作り直す
              </Button>
              <Button variant="secondary" onClick={() => askRemake('shared')}>
                共有タグだけ作り直す
              </Button>
            </>
          )}
        </div>
      </Card>

      {replaying && complete && (
        <Notice
          tone="info"
          title="デモ用の再生中です"
          action={
            <Button variant="secondary" size="sm" onClick={() => setSkipCount((c) => c + 1)}>
              スキップ
            </Button>
          }
        >
          実際の生成：合計{formatTotal(progress)}、おいとまの呼び出し{totalCalls}回
        </Notice>
      )}

      {replaying && complete && (
        <GenerationReplay
          skipRequest={skipCount}
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

      {complete && !running && (
        <Notice
          tone="success"
          title="タグができました"
          action={
            <Button variant="secondary" size="sm" icon={<IconPlay size={16} />} onClick={() => setReplaying((v) => !v)}>
              {replaying ? '再生を閉じる' : '生成の流れを見る（デモ用）'}
            </Button>
          }
        >
          {participants.length}人に、{activeTagIds.length}個の共有タグを割り当てました。
        </Notice>
      )}

      {errorPhase?.p !== undefined && failureMapped !== null && !running && (
        <Notice
          tone="danger"
          title={`${errorPhase.name}で止まりました`}
          action={
            <Button variant="primary" size="sm" onClick={() => startRun(false)}>
              続きから作る
            </Button>
          }
        >
          {failureMapped.body}
        </Notice>
      )}

      <Card className="p-5">
        <CardTitle>進み具合</CardTitle>
        <ol className="mt-2 flex flex-col">
          {PHASE_META.map((meta, index) => {
            const p: PhaseProgress = progress.find((q) => q.key === meta.key) ?? {
              key: meta.key,
              status: 'pending',
              done: 0,
              total: 0,
            };
            const pct = p.total > 0 ? Math.min(100, (p.done / p.total) * 100) : 0;
            const elapsed = elapsedSec(p, now);
            return (
              <li
                key={meta.key}
                className="grid grid-cols-[32px_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-adm-divider py-3 last:border-b-0"
              >
                <PhaseCircle status={p.status} index={index} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-bold">
                    <span>{meta.name}</span>
                    <Badge tone={meta.owner === 'oitoma' ? 'oitoma' : 'neutral'}>{OWNER_LABEL[meta.owner]}</Badge>
                  </div>
                  {p.status !== 'pending' && p.total > 0 && (
                    <div className="mt-1 h-2 rounded-full bg-adm-field">
                      <div className="h-2 rounded-full bg-adm-primary" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <div className="text-right text-adm-sm text-adm-sub tabular-nums">
                  <div>{STATUS_WORD[p.status]}</div>
                  {p.total > 0 && (
                    <div>
                      {p.done} / {p.total}
                    </div>
                  )}
                  {elapsed !== '' && <div>{elapsed}</div>}
                </div>
              </li>
            );
          })}
        </ol>

        {(statusOf('catalog') === 'done' || statusOf('assign') === 'done') && (
          <div className="mt-4 flex flex-col gap-3">
            {statusOf('catalog') === 'done' && candidates.length > 0 && (
              <div>
                <div className="text-adm-sm font-bold text-adm-ink2">候補のタグ（{candidates.length}個）</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {candidates.map((c) => (
                    <TagChip key={c.id} kind="shared" label={c.label} />
                  ))}
                </div>
              </div>
            )}
            {statusOf('assign') === 'done' && activeTagIds.length > 0 && (
              <div>
                <div className="text-adm-sm font-bold text-adm-ink2">採用した共有タグ（{activeTagIds.length}個）</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {adoptedSorted.map((tid) => (
                    <span key={tid} className="inline-flex items-center gap-1">
                      <TagChip kind="shared" label={labelById.get(tid) ?? tid} />
                      <span className="text-adm-xs text-adm-sub">{sharedCounts.get(tid) ?? 0}人</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-adm-sm text-adm-ink2">
            詳細（呼び出しの記録、作り方の設定）
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            {totalCalls > 0 && (
              <p className="text-adm-sm text-adm-ink2">
                おいとまの呼び出し {totalCalls}回・平均 {(avgMs / 1000).toFixed(1)}秒・やり直し {retries}回
              </p>
            )}
            <div className="grid gap-2 md:grid-cols-2">
              {(
                [
                  ['targetSize', '目安（1タグあたりの人数）'],
                  ['minSize', '下限'],
                  ['maxSize', '上限'],
                  ['candidateCount', '候補数'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-adm-sm">
                  <span className="w-48 shrink-0">{label}</span>
                  <input
                    type="number"
                    min={1}
                    value={override[key] ?? guide[key]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setOverride((o) => ({ ...o, [key]: Number.isNaN(v) ? undefined : Math.max(1, Math.floor(v)) }));
                    }}
                    className="min-h-10 w-24 rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
                  />
                </label>
              ))}
            </div>
            <p className="text-adm-xs text-adm-sub">
              最初から作り直すときに使います。続きからの生成は保存中の値を使います。
            </p>
          </div>
        </details>
      </Card>

      <ConfirmDialog
        open={pendingRemake !== null}
        title="作り直しますか？"
        body={`手で直した${editedCount}人分のタグも作り直しになります。`}
        confirmLabel="作り直す"
        tone="danger"
        onConfirm={() => {
          const scope = pendingRemake;
          setPendingRemake(null);
          if (scope !== null) doRemake(scope);
        }}
        onCancel={() => setPendingRemake(null)}
      />

      <PageFooter next={{ href: '/admin/review', label: '確認・修正', disabled: !complete }} />
    </div>
  );
}

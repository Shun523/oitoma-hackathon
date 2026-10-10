// src/components/GenerationReplay.tsx
// 生成の様子の再生。発表で、おいとまを呼ばずに生成の流れを見せる。
// 保存済みの状態だけを使い、状態は変えない。約10秒で5段階を進める。
'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeMetrics } from '../lib/metrics';
import type { Assignment, Extraction, PhaseProgress, SharedTag } from '../lib/types';

const DURATIONS = [2500, 2000, 2000, 2500, 1000]; // ①〜⑤の秒配分（合計10秒）
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0);
const PHASE_NAMES = ['① 話題の読み取り', '② 共有タグの候補づくり', '③ タグの当てはまり順', '④ 割り当てと検証', '⑤ 会場の傾向まとめ'];

interface ReplayData {
  participants: { id: string; hobby: string }[];
  extractions: Record<string, Extraction>;
  candidates: SharedTag[];
  assignments: Record<string, Assignment>;
  activeTagIds: string[];
  summary: string;
  progress: PhaseProgress[];
  llmCallCount: number;
}

function actualSec(progress: PhaseProgress[], key: PhaseProgress['key']): string {
  const p = progress.find((q) => q.key === key);
  if (!p?.startedAt || !p?.finishedAt) return '';
  return `${((p.finishedAt - p.startedAt) / 1000).toFixed(1)}秒`;
}

function formatTotal(progress: PhaseProgress[]): string {
  const starts = progress.map((p) => p.startedAt).filter((v): v is number => v !== undefined);
  const ends = progress.map((p) => p.finishedAt).filter((v): v is number => v !== undefined);
  if (starts.length === 0 || ends.length === 0) return '';
  const sec = Math.max(0, Math.round((Math.max(...ends) - Math.min(...starts)) / 1000));
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

export function GenerationReplay({ data }: { data: ReplayData }): React.JSX.Element {
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const [elapsed, setElapsed] = useState(() => (reduced ? TOTAL : 0));

  const finished = elapsed >= TOTAL;
  useEffect(() => {
    if (reduced || finished) return;
    const timer = setInterval(() => {
      setElapsed((e) => Math.min(TOTAL, e + 100));
    }, 100);
    return () => clearInterval(timer);
  }, [reduced, finished]);

  const n = data.participants.length;
  const boundaries = useMemo(() => {
    const b = [0];
    for (const d of DURATIONS) b.push(b[b.length - 1] + d);
    return b;
  }, []);

  const f = (i: number): number => {
    if (elapsed >= boundaries[i + 1]) return 1;
    if (elapsed <= boundaries[i]) return 0;
    return (elapsed - boundaries[i]) / DURATIONS[i];
  };

  const extractCount = Math.min(n, Math.floor(n * f(0)));
  const samples = data.participants.filter((p) => p.hobby.trim() !== '').slice(0, 3);
  const catalogShown = Math.ceil(data.candidates.length * f(1));
  const rankCount = Math.min(n, Math.floor(n * f(2)));

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of Object.keys(data.assignments)) {
      for (const tid of data.assignments[id]?.sharedTagIds ?? []) m.set(tid, (m.get(tid) ?? 0) + 1);
    }
    return m;
  }, [data.assignments]);
  const metrics = useMemo(() => computeMetrics(data.assignments), [data.assignments]);
  const af = f(3);

  return (
    <div className="rounded border border-gray-200 p-4">
      <div className="mb-2 flex items-center gap-3">
        <h3 className="font-bold">生成の様子（早送り再生）</h3>
        {!finished && !reduced && (
          <button type="button" onClick={() => setElapsed(TOTAL)} className="rounded border px-2 py-1 text-sm">
            スキップ
          </button>
        )}
      </div>
      <ol className="space-y-3">
        <li>
          <div className="text-sm font-bold">
            {PHASE_NAMES[0]} <span className="font-normal text-gray-500">{actualSec(data.progress, 'extract')}</span>
          </div>
          <div className="text-sm">
            {extractCount}/{n}件
          </div>
          <ul className="mt-1 space-y-1 text-sm text-gray-700">
              {samples.slice(0, Math.min(samples.length, 1 + Math.floor(f(0) * 3))).map((p) => (
                <li key={p.id}>
                  {p.hobby} → {(data.extractions[p.id]?.topics ?? []).join('、')}
                </li>
              ))}
            </ul>
        </li>
        <li>
          <div className="text-sm font-bold">
            {PHASE_NAMES[1]} <span className="font-normal text-gray-500">{actualSec(data.progress, 'catalog')}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {data.candidates.slice(0, catalogShown).map((c) => (
              <span key={c.id} className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                #{c.label}
              </span>
            ))}
          </div>
        </li>
        <li>
          <div className="text-sm font-bold">
            {PHASE_NAMES[2]} <span className="font-normal text-gray-500">{actualSec(data.progress, 'rank')}</span>
          </div>
          <div className="text-sm">
            {rankCount}/{n}件
          </div>
        </li>
        <li>
          <div className="text-sm font-bold">
            {PHASE_NAMES[3]} <span className="font-normal text-gray-500">{actualSec(data.progress, 'assign')}</span>
          </div>
          {elapsed >= boundaries[3] && (
            <>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.candidates.map((c) => {
                  const adopted = data.activeTagIds.includes(c.id);
                  return (
                    <span
                      key={c.id}
                      className={`rounded-full px-2 py-1 text-xs ${adopted ? 'bg-orange-100 font-bold' : 'bg-gray-50 text-gray-300'}`}
                    >
                      #{c.label}
                      {adopted && `（${counts.get(c.id) ?? 0}人）`}
                    </span>
                  );
                })}
              </div>
              <div className="mt-1 text-sm">
                共通タグ仲間（中央値）{Math.round(metrics.matesMedian * af)}人、遭遇率
                {Math.round(metrics.encounterRate * 100 * af)}%
              </div>
            </>
          )}
        </li>
        <li>
          <div className="text-sm font-bold">
            {PHASE_NAMES[4]} <span className="font-normal text-gray-500">{actualSec(data.progress, 'summary')}</span>
          </div>
          {elapsed >= boundaries[4] && <p className="mt-1 text-sm">{data.summary}</p>}
        </li>
      </ol>
      {finished && (
        <p className="mt-3 text-sm font-bold">
          実際の生成：合計{formatTotal(data.progress)}、おいとま呼び出し{data.llmCallCount}回
        </p>
      )}
    </div>
  );
}

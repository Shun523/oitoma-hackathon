// src/components/GenerationReplay.tsx
// 生成の様子の再生。発表で、おいとまを呼ばずに生成の流れを見せる。
// 保存済みの状態だけを使い、状態は変えない。約10秒で5段階を進める。
'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeMetrics } from '../lib/metrics';
import type { Assignment, Extraction, PhaseProgress, SharedTag } from '../lib/types';
import { Button } from './ui/Button';
import { Card, CardTitle } from './ui/Card';
import { TagChip } from './ui/TagChip';

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
  return `実際 ${Math.max(0, Math.round((p.finishedAt - p.startedAt) / 1000))}秒`;
}

export function formatTotal(progress: PhaseProgress[]): string {
  const starts = progress.map((p) => p.startedAt).filter((v): v is number => v !== undefined);
  const ends = progress.map((p) => p.finishedAt).filter((v): v is number => v !== undefined);
  if (starts.length === 0 || ends.length === 0) return '';
  const sec = Math.max(0, Math.round((Math.max(...ends) - Math.min(...starts)) / 1000));
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

export function GenerationReplay({ data, skipRequest = 0 }: { data: ReplayData; skipRequest?: number }): React.JSX.Element {
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

  useEffect(() => {
    if (skipRequest <= 0) return;
    const timer = setTimeout(() => setElapsed(TOTAL), 0);
    return () => clearTimeout(timer);
  }, [skipRequest]);

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
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <CardTitle>生成の様子（早送り再生）</CardTitle>
        {!finished && !reduced && (
          <Button variant="secondary" size="sm" onClick={() => setElapsed(TOTAL)}>
            スキップ
          </Button>
        )}
      </div>
      <ol className="flex flex-col gap-3">
        <li>
          <div className="text-adm-table font-bold">
            {PHASE_NAMES[0]} <span className="font-normal text-adm-sub">{actualSec(data.progress, 'extract')}</span>
          </div>
          <div className="text-adm-table">
            {extractCount}/{n}件
          </div>
          <ul className="mt-1 flex flex-col gap-1 text-adm-table text-adm-ink2">
              {samples.slice(0, Math.min(samples.length, 1 + Math.floor(f(0) * 3))).map((p) => (
                <li key={p.id}>
                  {p.hobby} → {(data.extractions[p.id]?.topics ?? []).join('、')}
                </li>
              ))}
            </ul>
        </li>
        <li>
          <div className="text-adm-table font-bold">
            {PHASE_NAMES[1]} <span className="font-normal text-adm-sub">{actualSec(data.progress, 'catalog')}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {data.candidates.slice(0, catalogShown).map((c) => (
              <TagChip key={c.id} kind="shared" label={c.label} />
            ))}
          </div>
        </li>
        <li>
          <div className="text-adm-table font-bold">
            {PHASE_NAMES[2]} <span className="font-normal text-adm-sub">{actualSec(data.progress, 'rank')}</span>
          </div>
          <div className="text-adm-table">
            {rankCount}/{n}件
          </div>
        </li>
        <li>
          <div className="text-adm-table font-bold">
            {PHASE_NAMES[3]} <span className="font-normal text-adm-sub">{actualSec(data.progress, 'assign')}</span>
          </div>
          {elapsed >= boundaries[3] && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {data.candidates.map((c) => {
                  const adopted = data.activeTagIds.includes(c.id);
                  return adopted ? (
                    <span key={c.id} className="inline-flex items-center gap-1">
                      <TagChip kind="shared" label={c.label} />
                      <span className="text-adm-xs text-adm-sub">（{counts.get(c.id) ?? 0}人）</span>
                    </span>
                  ) : (
                    <span key={c.id} className="text-adm-xs text-adm-sub">
                      #{c.label}
                    </span>
                  );
                })}
              </div>
              <div className="mt-1 text-adm-table">
                共通タグ仲間（中央値）{Math.round(metrics.matesMedian * af)}人、遭遇率
                {Math.round(metrics.encounterRate * 100 * af)}%
              </div>
            </>
          )}
        </li>
        <li>
          <div className="text-adm-table font-bold">
            {PHASE_NAMES[4]} <span className="font-normal text-adm-sub">{actualSec(data.progress, 'summary')}</span>
          </div>
          {elapsed >= boundaries[4] && <p className="mt-1 text-adm-table">{data.summary}</p>}
        </li>
      </ol>
      {finished && (
        <p className="mt-3 text-adm-table font-bold">
          実際の生成：合計{formatTotal(data.progress)}、おいとま呼び出し{data.llmCallCount}回
        </p>
      )}
    </Card>
  );
}

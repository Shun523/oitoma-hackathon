// src/app/admin/print/page.tsx
// 話題シールのプレビューと印刷。ブラウザの印刷機能を使う。
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FitToWidth } from '@/components/FitToWidth';
import { SHEET_WIDTH_PX, StickerSheet } from '@/components/StickerSheet';
import { SHEET_PRESETS } from '@/config/event';
import { useHydrated, useStore } from '@/lib/store';
import type { SheetPresetKey } from '@/lib/types';

function clampNum(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export default function PrintPage(): React.JSX.Element {
  const hydrated = useHydrated();
  const participants = useStore((s) => s.participants);
  const assignments = useStore((s) => s.assignments);
  const candidates = useStore((s) => s.candidates);
  const printOptions = useStore((s) => s.printOptions);
  const setPrintOptions = useStore((s) => s.setPrintOptions);

  const [testMode, setTestMode] = useState(false);
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    if (!queued) return;
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) {
        window.print();
        setQueued(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [queued]);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  if (participants.length === 0) {
    return (
      <div className="space-y-3 py-6">
        <h1 className="text-xl font-bold">4 印刷</h1>
        <p>まだ回答を取り込んでいません。</p>
        <Link href="/admin/import" className="inline-block rounded border px-3 py-2 text-sm">
          取り込みへ
        </Link>
      </div>
    );
  }

  if (Object.keys(assignments).length === 0) {
    return (
      <div className="space-y-3 py-6">
        <h1 className="text-xl font-bold">4 印刷</h1>
        <p>まだタグを生成していません。</p>
        <Link href="/admin/generate" className="inline-block rounded border px-3 py-2 text-sm">
          生成へ
        </Link>
      </div>
    );
  }

  const labelById = new Map(candidates.map((c) => [c.id, c.label]));
  const sharedCounts: Record<string, number> = {};
  for (const id of Object.keys(assignments)) {
    for (const tid of assignments[id]?.sharedTagIds ?? []) {
      const label = labelById.get(tid) ?? tid;
      sharedCounts[label] = (sharedCounts[label] ?? 0) + 1;
    }
  }
  const people = participants.map((p) => ({
    name: p.name,
    personalTag: assignments[p.id]?.personalTag ?? '',
    sharedTags: (assignments[p.id]?.sharedTagIds ?? []).map((tid) => labelById.get(tid) ?? tid),
  }));
  const sheetCount = Math.ceil(people.length / SHEET_PRESETS[printOptions.preset].rows);

  const numField = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
  ): React.JSX.Element => (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clampNum(Number(e.target.value), min, max))}
        className="w-24 rounded border border-gray-300 px-2 py-1"
      />
      <span className="text-xs text-gray-500">mm</span>
    </label>
  );

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold">4 印刷</h1>

      <section className="no-print space-y-2">
        <h2 className="font-bold">設定</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0">用紙</span>
          <select
            value={printOptions.preset}
            onChange={(e) => setPrintOptions({ preset: e.target.value as SheetPresetKey })}
            className="rounded border border-gray-300 px-2 py-1"
          >
            {(Object.keys(SHEET_PRESETS) as SheetPresetKey[]).map((key) => (
              <option key={key} value={key}>
                {SHEET_PRESETS[key].label}
              </option>
            ))}
          </select>
        </label>
        {numField('位置の調整X', printOptions.offsetXmm, -10, 10, 0.5, (v) => setPrintOptions({ offsetXmm: v }))}
        {numField('位置の調整Y', printOptions.offsetYmm, -10, 10, 0.5, (v) => setPrintOptions({ offsetYmm: v }))}
        {numField('すき間X', printOptions.gapXmm, 0, 10, 0.5, (v) => setPrintOptions({ gapXmm: v }))}
        {numField('すき間Y', printOptions.gapYmm, 0, 10, 0.5, (v) => setPrintOptions({ gapYmm: v }))}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={printOptions.showCount}
            onChange={(e) => setPrintOptions({ showCount: e.target.checked })}
          />
          共有タグに人数を添える
        </label>
        <p className="text-sm text-gray-600">
          A4 {sheetCount}枚に、1行に1人分（個性タグ、共有タグ2つ）が並びます。
        </p>
      </section>

      <section className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setTestMode(false);
            setQueued(true);
          }}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white"
        >
          印刷する
        </button>
        <button
          type="button"
          onClick={() => {
            setTestMode(true);
            setQueued(true);
          }}
          className="rounded border px-4 py-2 text-sm"
        >
          位置合わせ用の試し刷り
        </button>
      </section>

      <section className="no-print rounded border border-gray-200 p-3 text-sm">
        <h2 className="mb-1 font-bold">案内</h2>
        <p>Chromeで「送信先：プリンタ（またはPDFに保存）／用紙：A4／余白：なし／倍率：100%／背景のグラフィック：オン」にしてください。</p>
        <p className="mt-1">行ごとに切って、左のシールの名前を見て渡してください。</p>
      </section>

      <section className="space-y-4">
        <h2 className="no-print font-bold">プレビュー</h2>
        <FitToWidth designWidthPx={SHEET_WIDTH_PX}>
          <StickerSheet
            preset={printOptions.preset}
            people={people}
            offsetXmm={printOptions.offsetXmm}
            offsetYmm={printOptions.offsetYmm}
            gapXmm={printOptions.gapXmm}
            gapYmm={printOptions.gapYmm}
            showCount={printOptions.showCount}
            sharedCounts={sharedCounts}
            testMode={testMode}
          />
        </FitToWidth>
      </section>
    </div>
  );
}

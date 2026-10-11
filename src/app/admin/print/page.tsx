// src/app/admin/print/page.tsx
// 話題シールのプレビューと印刷。ブラウザの印刷機能を使う。
'use client';

import { useEffect, useState } from 'react';
import { FitToWidth } from '@/components/FitToWidth';
import { GuideCard } from '@/components/GuideCard';
import { SHEET_WIDTH_PX, StickerSheet } from '@/components/StickerSheet';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { IconPrinter } from '@/components/ui/icons';
import { PageFooter } from '@/components/PageFooter';
import { PageHeader } from '@/components/PageHeader';
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
        <PageHeader
          step={4}
          title="シールを印刷"
          description="1人分のシール3枚が横1行に並びます。印刷したら行ごとに切って、受付で渡します。"
        />
        <GuideCard
          title="まだ回答を読み込んでいません"
          description="参加登録フォームの回答を先に読み込みます。"
          next={{ href: '/admin/import', label: '1 回答を読み込むへ' }}
        />
        <PageFooter />
      </div>
    );
  }

  if (Object.keys(assignments).length === 0) {
    return (
      <div className="space-y-3 py-6">
        <PageHeader
          step={4}
          title="シールを印刷"
          description="1人分のシール3枚が横1行に並びます。印刷したら行ごとに切って、受付で渡します。"
        />
        <GuideCard
          title="まだタグを作っていません"
          description="タグを作ってから印刷します。"
          next={{ href: '/admin/generate', label: '2 タグを作るへ' }}
        />
        <PageFooter />
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
  // 21面は廃止のため、保存済みが21面でも24面として扱う（型と保存形式は互換のため残す）
  const effectivePreset: SheetPresetKey = 'label24';
  const rowsPerSheet = SHEET_PRESETS[effectivePreset].rows;
  const chunks: typeof people[] = [];
  for (let i = 0; i < people.length; i += rowsPerSheet) {
    chunks.push(people.slice(i, i + rowsPerSheet));
  }

  const stepField = (
    axis: 'X' | 'Y',
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (v: number) => void,
  ): React.JSX.Element => (
    <div className="flex items-center gap-1">
      <span className="w-6 shrink-0 text-adm-sm">{axis}</span>
      <Button
        variant="secondary"
        size="sm"
        aria-label={`${label}を 0.5mm 小さく`}
        onClick={() => onChange(clampNum(value - 0.5, min, max))}
      >
        −
      </Button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={0.5}
        aria-label={label}
        onChange={(e) => onChange(clampNum(Number(e.target.value), min, max))}
        className="w-20 min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-center text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
      />
      <Button
        variant="secondary"
        size="sm"
        aria-label={`${label}を 0.5mm 大きく`}
        onClick={() => onChange(clampNum(value + 0.5, min, max))}
      >
        ＋
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        step={4}
        title="シールを印刷"
        description="1人分のシール3枚が横1行に並びます。印刷したら行ごとに切って、受付で渡します。"
      />

      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex flex-[1_1_300px] flex-col gap-4 p-5 print:hidden">
          <div className="flex flex-col gap-2">
            <span className="text-adm-sm font-bold text-adm-ink2">用紙</span>
            {(['label24'] as const).map((key) => {
              const preset = SHEET_PRESETS[key];
              const checked = effectivePreset === key;
              return (
                <label
                  key={key}
                  className={`flex items-start gap-3 rounded-lg p-3 ${
                    checked ? 'border-2 border-adm-primary bg-adm-primary-soft' : 'border border-adm-line-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="sheet-preset"
                    checked={checked}
                    onChange={() => setPrintOptions({ preset: key as SheetPresetKey })}
                    className="mt-1 size-4 accent-adm-primary focus-visible:outline-2 focus-visible:outline-adm-primary"
                  />
                  <span>
                    <span className="block font-bold">A4 24面ラベル</span>
                    <span className="block text-adm-xs text-adm-sub">
                      {preset.wMm.toFixed(1)}×{preset.hMm}mm・1枚で{preset.rows}人分
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-adm-sm font-bold text-adm-ink2">位置の調整（mm）</span>
            {stepField('X', '横の位置', printOptions.offsetXmm, -10, 10, (v) => setPrintOptions({ offsetXmm: v }))}
            {stepField('Y', '縦の位置', printOptions.offsetYmm, -10, 10, (v) => setPrintOptions({ offsetYmm: v }))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-adm-sm font-bold text-adm-ink2">すき間（mm）</span>
            {stepField('X', '横のすき間', printOptions.gapXmm, 0, 10, (v) => setPrintOptions({ gapXmm: v }))}
            {stepField('Y', '縦のすき間', printOptions.gapYmm, 0, 10, (v) => setPrintOptions({ gapYmm: v }))}
          </div>

          <label className="flex items-center gap-2 text-adm-table">
            <input
              type="checkbox"
              checked={printOptions.showCount}
              onChange={(e) => setPrintOptions({ showCount: e.target.checked })}
              className="size-4 accent-adm-primary"
            />
            共有タグに会場の人数を出す
          </label>

          <Button
            variant="secondary"
            size="md"
            icon={<IconPrinter size={16} />}
            onClick={() => {
              setTestMode(true);
              setQueued(true);
            }}
          >
            位置合わせ用の試し刷り
          </Button>
          <Button
            variant="primary"
            size="lg"
            icon={<IconPrinter size={16} />}
            onClick={() => {
              setTestMode(false);
              setQueued(true);
            }}
            className="w-full"
          >
            印刷する
          </Button>

          <div>
            <div className="text-adm-sm font-bold">印刷のしかた</div>
            <ol className="list-decimal pl-5 text-adm-sm text-adm-ink2">
              <li>Chromeの印刷画面で用紙を「A4」にする</li>
              <li>余白を「なし」にする</li>
              <li>倍率を「100%」にする</li>
              <li>「背景のグラフィック」をオンにする</li>
            </ol>
          </div>
          <Notice tone="info" title="刷ったら行ごとに切り、左のシールの名前を見て本人に渡します。" />
        </Card>

        <Card className="min-w-0 flex-[999_1_480px] p-5 print:border-0 print:p-0">
          <div className="print:hidden">
            <CardTitle>
              A4 {chunks.length}枚（{people.length}人）
            </CardTitle>
          </div>
          <div className="mt-4 flex flex-col gap-4 print:mt-0 print:gap-0">
            {chunks.map((rows, i) => (
              <div key={`${effectivePreset}-${i}`}>
                <div className="mb-1 text-adm-xs text-adm-sub print:hidden">用紙 {i + 1}</div>
                <div className="rounded border border-adm-line bg-white print:border-0">
                  <FitToWidth designWidthPx={SHEET_WIDTH_PX}>
                    <StickerSheet
                      preset={effectivePreset}
                      people={rows}
                      offsetXmm={printOptions.offsetXmm}
                      offsetYmm={printOptions.offsetYmm}
                      gapXmm={printOptions.gapXmm}
                      gapYmm={printOptions.gapYmm}
                      showCount={printOptions.showCount}
                      sharedCounts={sharedCounts}
                      testMode={testMode}
                    />
                  </FitToWidth>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <PageFooter />
    </div>
  );
}

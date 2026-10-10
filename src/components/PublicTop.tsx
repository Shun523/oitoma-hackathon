// src/components/PublicTop.tsx
// 公開トップの対話部分（絞り込み、もっと見る）。スマホ最優先。
'use client';

import { useState } from 'react';
import { EVENT } from '../config/event';
import type { PublishedData } from '../lib/types';
import { FitToWidth } from './FitToWidth';
import { StickerSet } from './StickerSet';

const INITIAL_COUNT = 6;

export function PublicTop({ data }: { data: PublishedData }): React.JSX.Element {
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const visible = data.stickers.filter((s) => !filter || s.sharedTags.includes(filter));
  const shown = expanded ? visible : visible.slice(0, INITIAL_COUNT);

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-8 px-4 py-8">
      <section>
        <p className="text-xl font-bold">{EVENT.appName}</p>
        <h1 className="mt-2 text-2xl font-bold">名札に“話題”を足して、肩書き以外の話から始めよう</h1>
        <p className="mt-2 text-sm text-gray-600">
          登録時の自己紹介から、おいとまが会場全体を見比べて“話しかけたくなるタグ”を作ります
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-bold">話題シール</h2>
        {shown.map((s) => (
          <div key={s.id}>
            <p className="mb-1 text-sm font-bold">
              {s.name}（{s.affiliation}）
            </p>
            <FitToWidth designWidthPx={760}>
              <StickerSet preset="label24" personalTag={s.personalTag} sharedTags={s.sharedTags} />
            </FitToWidth>
          </div>
        ))}
        {!expanded && visible.length > INITIAL_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded border px-4 py-2 text-sm"
          >
            もっと見る（あと{visible.length - INITIAL_COUNT}人）
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">この会場の共有タグ</h2>
        <div className="flex flex-wrap gap-1">
          {data.sharedTags.map((t) => {
            const active = filter === t.label;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  setFilter(active ? null : t.label);
                  setExpanded(false);
                }}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-sm ${active ? 'bg-gray-900 font-bold text-white' : 'bg-gray-100'}`}
              >
                #{t.label}（{t.count}人）
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">数字</h2>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded border border-gray-200 p-3">
            <dt className="text-xs text-gray-600">参加者数</dt>
            <dd className="text-xl font-bold">{data.metrics.participants}人</dd>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <dt className="text-xs text-gray-600">共有タグの数</dt>
            <dd className="text-xl font-bold">{data.metrics.sharedTagCount}個</dd>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <dt className="text-xs text-gray-600">共通タグ仲間（最小・中央値）</dt>
            <dd className="text-xl font-bold">
              {data.metrics.matesMin}・{data.metrics.matesMedian}人
            </dd>
            <dd className="mt-1 text-xs text-gray-600">タグがかぶる相手の人数</dd>
          </div>
          <div className="rounded border border-gray-200 p-3">
            <dt className="text-xs text-gray-600">遭遇率</dt>
            <dd className="text-xl font-bold">{Math.round(data.metrics.encounterRate * 100)}%</dd>
            <dd className="mt-1 text-xs text-gray-600">ランダムに2人選んだとき、共通のタグがある確率</dd>
          </div>
        </dl>
      </section>

      {data.summary !== '' && (
        <section className="space-y-2">
          <h2 className="font-bold">会場の傾向</h2>
          <p className="text-sm">{data.summary}</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-bold">しくみ</h2>
        <p className="text-sm">
          ① 参加登録で自己紹介と一言を答える ② おいとまが全員の回答を見比べ、かぶる話題を共有タグに、その人らしさを個性タグにする
          ③ プログラムが人数を検証して話題シールに印刷する。受付で受け取ったら、名札の左右からはみ出すように貼るだけ
        </p>
      </section>

      <footer className="border-t border-gray-200 pt-4 text-xs text-gray-600">
        <p>{EVENT.publicNote}</p>
        <p className="mt-1">岡大おいとまハッカソン2026</p>
      </footer>
    </div>
  );
}

// src/components/PublicTop.tsx
// 公開トップの対話部分（絞り込み、もっと見る）。スマホ最優先。管理画面と同じ雰囲気。
'use client';

import { useState } from 'react';
import { adminFont } from '@/app/admin/fonts';
import { EVENT } from '../config/event';
import type { PublishedData } from '../lib/types';
import { FitToWidth } from './FitToWidth';
import { StickerSet } from './StickerSet';
import { Button } from './ui/Button';
import { Card, CardTitle } from './ui/Card';
import { StatCard } from './ui/StatCard';

const INITIAL_COUNT = 6;

export function PublicTop({ data }: { data: PublishedData }): React.JSX.Element {
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const visible = data.stickers.filter((s) => !filter || s.sharedTags.includes(filter));
  const shown = expanded ? visible : visible.slice(0, INITIAL_COUNT);

  return (
    <div className={`${adminFont.className} min-h-screen bg-adm-bg text-adm-body leading-[1.6] text-adm-ink`}>
      <div className="mx-auto w-full max-w-[720px] space-y-5 px-4 py-8">
        <section>
          <p className="text-[19px] font-bold">{EVENT.appName}</p>
          <h1 className="mb-1 mt-0.5 text-adm-h1 font-bold leading-snug">
            名札に“話題”を足して、肩書き以外の話から始めよう
          </h1>
          <p className="text-adm-ink2">
            登録時の自己紹介から、おいとまが会場全体を見比べて“話しかけたくなるタグ”を作ります
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-adm-lead font-bold">話題シール</h2>
          {shown.map((s) => (
            <Card key={s.id} className="p-5">
              <p className="mb-2 text-adm-table font-bold">
                {s.name}（{s.affiliation}）
              </p>
              <FitToWidth designWidthPx={760}>
                <StickerSet preset="label24" personalTag={s.personalTag} sharedTags={s.sharedTags} />
              </FitToWidth>
            </Card>
          ))}
          {!expanded && visible.length > INITIAL_COUNT && (
            <Button
              variant="secondary"
              onClick={() => setExpanded(true)}
            >
              もっと見る（あと{visible.length - INITIAL_COUNT}人）
            </Button>
          )}
        </section>

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle>この会場の共有タグ</CardTitle>
          <div className="flex flex-wrap gap-1.5">
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
                  className={`inline-block whitespace-nowrap rounded-full border-[1.5px] border-tag-shared px-2.5 py-px text-adm-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary ${
                    active ? 'bg-adm-primary-soft text-adm-ink ring-2 ring-adm-primary' : 'bg-adm-surface text-adm-ink'
                  }`}
                >
                  #{t.label}（{t.count}人）
                </button>
              );
            })}
          </div>
        </Card>

        <section className="space-y-3">
          <h2 className="text-adm-lead font-bold">数字</h2>
          <div className="flex flex-wrap gap-3">
            <StatCard label="参加者数" value={data.metrics.participants} unit="人" />
            <StatCard label="共有タグの数" value={data.metrics.sharedTagCount} unit="個" />
            <StatCard
              label="共通タグ仲間"
              value={`${data.metrics.matesMin}・${data.metrics.matesMedian}`}
              unit="人"
              note="タグがかぶる相手の人数"
            />
            <StatCard
              label="遭遇率"
              value={Math.round(data.metrics.encounterRate * 100)}
              unit="%"
              note="ランダムに2人選んだとき、共通のタグがある確率"
            />
          </div>
        </section>

        {data.summary !== '' && (
          <Card className="flex flex-col gap-2 p-5">
            <CardTitle>会場の傾向</CardTitle>
            <p className="text-adm-table">{data.summary}</p>
          </Card>
        )}

        <Card className="flex flex-col gap-2 p-5">
          <CardTitle>しくみ</CardTitle>
          <p className="text-adm-table">
            ① 参加登録で自己紹介と一言を答える ② おいとまが全員の回答を見比べ、かぶる話題を共有タグに、その人らしさを個性タグにする
            ③ プログラムが人数を検証して話題シールに印刷する。受付で受け取ったら、名札の左右からはみ出すように貼るだけ
          </p>
        </Card>

        <footer className="text-adm-xs text-adm-sub">
          <p>{EVENT.publicNote}</p>
          <p className="mt-1">岡大おいとまハッカソン2026</p>
        </footer>
      </div>
    </div>
  );
}

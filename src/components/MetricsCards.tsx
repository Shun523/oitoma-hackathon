// src/components/MetricsCards.tsx
// 指標カード：参加者、共有タグ数、共通タグ仲間（最小／中央値）、遭遇率、要確認の人数。
import type { Metrics } from '../lib/types';

export function MetricsCards({ metrics }: { metrics: Metrics }): React.JSX.Element {
  const cards: { value: string; note: string }[] = [
    { value: String(metrics.participants), note: '参加者数' },
    { value: String(metrics.sharedTagCount), note: '共有タグの数' },
    {
      value: `${metrics.matesMin}〜${metrics.matesMax}人（中央値${metrics.matesMedian}人）`,
      note: '共通タグ仲間（タグがかぶる相手の人数）',
    },
    {
      value: `${Math.round(metrics.encounterRate * 100)}%`,
      note: '遭遇率（ランダムに2人選んだとき、共通のタグがある確率）',
    },
    { value: String(metrics.needsReview), note: '要確認の人数' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {cards.map((card) => (
        <div key={card.note} className="rounded border border-gray-200 p-3">
          <div className="text-xl font-bold">{card.value}</div>
          <div className="mt-1 text-xs text-gray-600">{card.note}</div>
        </div>
      ))}
    </div>
  );
}

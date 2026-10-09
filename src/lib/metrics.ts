// src/lib/metrics.ts
// 共通タグ仲間、遭遇率。computeMetrics で毎回計算する（保存しない）。
import type { Assignment, Metrics } from './types';

export function computeMetrics(assignments: Record<string, Assignment>): Metrics {
  const ids = Object.keys(assignments).sort();
  const tagsOf = (pid: string): string[] => assignments[pid]?.sharedTagIds ?? [];

  // 共通タグ仲間：本人以外で、共有タグが1つ以上かぶる人の数。
  const mates = ids.map((pid) => {
    const mine = new Set(tagsOf(pid));
    if (mine.size === 0) return 0;
    return ids.filter((other) => other !== pid && tagsOf(other).some((t) => mine.has(t))).length;
  });
  const sorted = [...mates].sort((a, b) => a - b);
  const matesMin = sorted.length > 0 ? sorted[0] : 0;
  const matesMax = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
  // 中央値は人数が偶数なら真ん中2つの平均。
  let matesMedian = 0;
  if (sorted.length > 0) {
    const mid = Math.floor(sorted.length / 2);
    matesMedian = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // 遭遇率：共有タグが1つ以上かぶる2人組の数 ÷ すべての2人組の数。
  let shared = 0;
  let pairs = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const mine = new Set(tagsOf(ids[i]));
    for (let j = i + 1; j < ids.length; j += 1) {
      pairs += 1;
      if ([...mine].some((t) => tagsOf(ids[j]).includes(t))) shared += 1;
    }
  }
  const encounterRate = pairs > 0 ? shared / pairs : 0;

  // 共有タグごとの人数。
  const sizes = new Map<string, number>();
  for (const pid of ids) {
    for (const t of new Set(tagsOf(pid))) sizes.set(t, (sizes.get(t) ?? 0) + 1);
  }
  const counts = [...sizes.values()];
  const sharedTagCount = counts.length; // 1人以上が持つ共有タグの数
  const sizeMin = counts.length > 0 ? Math.min(...counts) : 0;
  const sizeMax = counts.length > 0 ? Math.max(...counts) : 0;

  const needsReview = ids.filter((pid) => (assignments[pid]?.flags ?? []).length > 0).length;

  return {
    participants: ids.length,
    sharedTagCount,
    matesMin,
    matesMedian,
    matesMax,
    encounterRate,
    sizeMin,
    sizeMax,
    needsReview,
  };
}

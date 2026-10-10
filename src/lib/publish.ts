// src/lib/publish.ts
// 公開用データの作成。学外に出るのは名前を伏せた公開用データだけ。
import { EVENT } from '../config/event';
import { computeMetrics } from './metrics';
import type { Assignment, Participant, PublishedData, SharedTag } from './types';

export function buildPublishedData(args: {
  participants: Participant[];
  assignments: Record<string, Assignment>;
  candidates: SharedTag[];
  activeTagIds: string[];
  summary: string;
  maskNames?: boolean; // 既定 true。ダミーだけで作るときは false でよい
  generatedAt?: string;
}): PublishedData {
  const { participants, assignments, candidates, activeTagIds, summary } = args;
  const maskNames = args.maskNames ?? true;
  const labelById = new Map(candidates.map((c) => [c.id, c.label]));

  const counts = new Map<string, number>();
  for (const p of participants) {
    for (const tid of assignments[p.id]?.sharedTagIds ?? []) {
      counts.set(tid, (counts.get(tid) ?? 0) + 1);
    }
  }
  const sharedTags = activeTagIds
    .map((tid) => ({ label: labelById.get(tid) ?? tid, count: counts.get(tid) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    version: 1,
    eventName: EVENT.eventName,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    stickers: participants.map((p, i) => ({
      id: p.id,
      name: maskNames ? `参加者${String(i + 1).padStart(2, '0')}` : p.name,
      affiliation: maskNames ? p.category : p.affiliation,
      personalTag: assignments[p.id]?.personalTag ?? '',
      sharedTags: (assignments[p.id]?.sharedTagIds ?? []).map((tid) => labelById.get(tid) ?? tid),
    })),
    sharedTags,
    metrics: computeMetrics(assignments),
    summary,
  };
}

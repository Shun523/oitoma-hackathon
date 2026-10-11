// src/lib/pipeline/add-one.ts
// タグを作った後に1人だけ追加する生成。話題の読み取りと共有タグ選びはおいとま、
// 割り当てはプログラム。他の人の値と採用タグは変えない。ストアには触らない。
import { PIPELINE } from '../../config/event';
import { assignOne } from '../assign';
import type { Assignment, Extraction, LlmApi, LlmCallLog, Participant, SharedTag } from '../types';
import { buildAssignment } from './sticker';
import { fallbackExtraction, toExtractInput } from './run';

export type AddStepKey = 'extract' | 'rank' | 'assign';

function makeLog(task: LlmCallLog['task'], meta: { attempts: number; ms: number }): LlmCallLog {
  return { task, ms: meta.ms, ok: true, attempts: meta.attempts, at: new Date().toISOString() };
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
}

export async function generateForOne(args: {
  person: Participant; // まだストアに入れていない人
  candidates: SharedTag[];
  activeTagIds: string[];
  assignments: Record<string, Assignment>; // 今いる人の割り当て（人数を数えるためだけに使う）
  api: LlmApi;
  onStep: (key: AddStepKey, status: 'running' | 'done', ms?: number) => void;
  onLog: (log: LlmCallLog) => void;
  signal?: AbortSignal;
}): Promise<{ extraction: Extraction; ranking: string[]; assignment: Assignment }> {
  const { person, candidates, activeTagIds, assignments, api, onStep, onLog, signal } = args;

  // 1. 話題の読み取り
  checkAborted(signal);
  onStep('extract', 'running');
  const extractStarted = Date.now();
  let extraction: Extraction;
  try {
    const { results, meta } = await api.extract([toExtractInput(person)]);
    extraction = results[0] !== undefined
      ? {
          participantId: person.id,
          topics: results[0].topics.slice(0, 5),
          personalCandidates: results[0].personal.slice(0, 3),
          source: 'llm',
        }
      : fallbackExtraction(person);
    onLog(makeLog('extract', meta));
  } catch (e) {
    checkAborted(signal);
    throw e;
  }
  onStep('extract', 'done', Date.now() - extractStarted);

  // 2. 共有タグを選ぶ（採用タグ2個未満なら rank を呼ばない）
  checkAborted(signal);
  onStep('rank', 'running');
  const rankStarted = Date.now();
  let ranking: string[] = [];
  if (activeTagIds.length >= 2) {
    const activeTags = candidates.filter((c) => activeTagIds.includes(c.id));
    try {
      const { results, meta } = await api.rank(
        activeTags,
        [{ id: person.id, category: person.category, topics: extraction.topics, hobby: person.hobby }],
        PIPELINE.rankLength,
      );
      ranking = results[0]?.ranked ?? [];
      onLog(makeLog('rank', meta));
    } catch (e) {
      checkAborted(signal);
      throw e;
    }
  }
  onStep('rank', 'done', Date.now() - rankStarted);

  // 3. 割り当て
  checkAborted(signal);
  onStep('assign', 'running');
  const assignStarted = Date.now();
  const counts: Record<string, number> = {};
  for (const tid of activeTagIds) counts[tid] = 0;
  for (const id of Object.keys(assignments)) {
    for (const tid of assignments[id]?.sharedTagIds ?? []) {
      if (activeTagIds.includes(tid)) counts[tid] = (counts[tid] ?? 0) + 1;
    }
  }
  const { sharedTagIds, usedFallback } = assignOne({ ranking, activeIds: activeTagIds, counts });
  const assignment = buildAssignment(person, extraction, sharedTagIds, usedFallback, candidates);
  onStep('assign', 'done', Date.now() - assignStarted);

  return { extraction, ranking, assignment };
}

// src/lib/pipeline/run.ts
// 生成の指揮（LlmApiを受け取る）。ブラウザ・スクリプト・テスト共用。
// 1回のおいとま呼び出しが終わるたびに onUpdate を呼び、画面とlocalStorageに反映する。
import { EVENT, PIPELINE } from '../../config/event';
import { assignSharedTags } from '../assign';
import { mapLimit } from '../concurrency';
import { computeParams } from '../sizing';
import { hasNgWord } from '../text';
import type {
  Assignment,
  CatalogInput,
  ExtractInput,
  Extraction,
  GenerationParams,
  LlmApi,
  LlmCallLog,
  Participant,
  PhaseProgress,
  RankInput,
  SharedTag,
} from '../types';

export interface GenerationSnapshot {
  params: GenerationParams;
  extractions: Record<string, Extraction>;
  candidates: SharedTag[];
  rankings: Record<string, string[]>;
  activeTagIds: string[];
  assignments: Record<string, Assignment>;
  summary: string;
  progress: PhaseProgress[];
}

export function emptySnapshot(): GenerationSnapshot {
  return {
    params: computeParams(0),
    extractions: {},
    candidates: [],
    rankings: {},
    activeTagIds: [],
    assignments: {},
    summary: '',
    progress: [],
  };
}

function initialProgress(n: number): PhaseProgress[] {
  return [
    { key: 'extract', status: 'pending', done: 0, total: n },
    { key: 'catalog', status: 'pending', done: 0, total: 1 },
    { key: 'rank', status: 'pending', done: 0, total: n },
    { key: 'assign', status: 'pending', done: 0, total: 1 },
    { key: 'summary', status: 'pending', done: 0, total: 1 },
  ];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function fallbackTopics(p: Participant): string[] {
  if (p.hobby.trim() !== '') return [p.hobby.trim().slice(0, 15)];
  return [p.category];
}

function makeLog(task: LlmCallLog['task'], meta: { attempts: number; ms: number }): LlmCallLog {
  return { task, ms: meta.ms, ok: true, attempts: meta.attempts, at: new Date().toISOString() };
}

export async function runGeneration(args: {
  participants: Participant[];
  start: GenerationSnapshot; // 最初からなら空の結果、続きからなら途中の結果
  api: LlmApi; // ブラウザは fetch 版、スクリプトとテストは直接呼ぶ版
  onUpdate: (snap: GenerationSnapshot, log?: LlmCallLog) => void;
  signal?: AbortSignal;
}): Promise<GenerationSnapshot> {
  const { participants, start, api, onUpdate, signal } = args;
  const n = participants.length;
  if (n < PIPELINE.minParticipants) {
    throw new Error(
      `対象が${PIPELINE.minParticipants}人未満です（${n}人）。回答が${PIPELINE.minParticipants}人以上ある状態で生成してください`,
    );
  }

  const checkAborted = (): void => {
    if (signal?.aborted) throw new Error('中止しました');
  };

  const params = start.params?.n === n ? start.params : computeParams(n);
  const snap: GenerationSnapshot = {
    params,
    extractions: { ...start.extractions },
    candidates: [...start.candidates],
    rankings: { ...start.rankings },
    activeTagIds: [...start.activeTagIds],
    assignments: { ...start.assignments },
    summary: start.summary,
    progress: initialProgress(n),
  };
  snap.progress[0].done = participants.filter((p) => snap.extractions[p.id]).length;
  snap.progress[1].done = snap.candidates.length > 0 ? 1 : 0;
  snap.progress[2].done = participants.filter((p) => snap.rankings[p.id]).length;

  const emit = (log?: LlmCallLog): void => {
    onUpdate(
      {
        ...snap,
        extractions: { ...snap.extractions },
        candidates: [...snap.candidates],
        rankings: { ...snap.rankings },
        activeTagIds: [...snap.activeTagIds],
        assignments: { ...snap.assignments },
        progress: snap.progress.map((p) => ({ ...p })),
      },
      log,
    );
  };

  const setPhase = (
    key: PhaseProgress['key'],
    status: PhaseProgress['status'],
    patch?: Partial<PhaseProgress>,
  ): void => {
    const phase = snap.progress.find((p) => p.key === key);
    if (!phase) return;
    phase.status = status;
    if (patch) Object.assign(phase, patch);
  };

  // 段階1：話題の読み取り（extractions にない人だけ）
  setPhase('extract', 'running', { startedAt: Date.now() });
  const missingExtract = participants.filter((p) => !snap.extractions[p.id]);
  await mapLimit(chunk(missingExtract, PIPELINE.extractBatchSize), PIPELINE.concurrency, async (batch) => {
    checkAborted();
    const inputs: ExtractInput[] = batch.map((p) => ({
      id: p.id,
      affiliation: p.affiliation,
      category: p.category,
      intro: p.intro,
      hobby: p.hobby,
    }));
    const { results, missing, meta } = await api.extract(inputs);
    for (const r of results) {
      snap.extractions[r.id] = {
        participantId: r.id,
        topics: r.topics.slice(0, 5),
        personalCandidates: r.personal.slice(0, 3),
        source: 'llm',
      };
    }
    for (const id of missing) {
      const p = batch.find((b) => b.id === id);
      if (!p) continue;
      snap.extractions[id] = { participantId: id, topics: fallbackTopics(p), personalCandidates: [], source: 'fallback' };
    }
    const phase = snap.progress.find((p) => p.key === 'extract');
    if (phase) phase.done = participants.filter((p) => snap.extractions[p.id]).length;
    emit(makeLog('extract', meta));
  });
  setPhase('extract', 'done', { finishedAt: Date.now() });
  emit();

  // 段階2：共有タグの候補づくり（candidates が空のときだけ）
  setPhase('catalog', 'running', { startedAt: Date.now() });
  if (snap.candidates.length === 0) {
    const inputs: CatalogInput[] = participants.map((p) => ({
      id: p.id,
      category: p.category,
      topics: snap.extractions[p.id]?.topics ?? [],
    }));
    try {
      const { tags, meta } = await api.catalog(inputs, params);
      snap.candidates = tags.map((t, i) => ({
        id: `T${String(i + 1).padStart(2, '0')}`,
        label: t.label,
        covers: t.covers,
      }));
      setPhase('catalog', 'done', { done: 1, finishedAt: Date.now() });
      emit(makeLog('catalog', meta));
    } catch (e) {
      setPhase('catalog', 'error', { message: e instanceof Error ? e.message : String(e) });
      emit();
      throw e;
    }
  } else {
    setPhase('catalog', 'done', { done: 1, finishedAt: Date.now() });
  }
  emit();

  // 段階3：タグの当てはまり順（rankings にない人だけ）
  setPhase('rank', 'running', { startedAt: Date.now() });
  const missingRank = participants.filter((p) => !snap.rankings[p.id]);
  await mapLimit(chunk(missingRank, PIPELINE.rankBatchSize), PIPELINE.concurrency, async (batch) => {
    checkAborted();
    const inputs: RankInput[] = batch.map((p) => ({
      id: p.id,
      category: p.category,
      topics: snap.extractions[p.id]?.topics ?? [],
      hobby: p.hobby,
    }));
    const { results, missing, meta } = await api.rank(snap.candidates, inputs, params.rankLength);
    for (const r of results) {
      snap.rankings[r.id] = r.ranked;
    }
    for (const id of missing) {
      snap.rankings[id] = [];
    }
    const phase = snap.progress.find((p) => p.key === 'rank');
    if (phase) phase.done = participants.filter((p) => snap.rankings[p.id]).length;
    emit(makeLog('rank', meta));
  });
  setPhase('rank', 'done', { finishedAt: Date.now() });
  emit();

  // 段階4：割り当てと検証（毎回やり直す。計算だけで速い）
  setPhase('assign', 'running', { startedAt: Date.now() });
  checkAborted();
  const participantIds = participants.map((p) => p.id);
  const byId = new Map(participants.map((p) => [p.id, p]));
  const candidateIds = snap.candidates.map((c) => c.id);
  const labelById = new Map(snap.candidates.map((c) => [c.id, c.label]));
  const { held, activeIds, shortIds } = assignSharedTags({
    participantIds,
    rankings: snap.rankings,
    candidateIds,
    minSize: params.minSize,
    maxSize: params.maxSize,
  });
  const heldTags: Record<string, string[]> = { ...held };
  // 当てはまり順ではなく人数合わせで足した人は fallback_shared を付ける
  const programFilled = new Set<string>();

  // 足りない人の補充：shortIds の人だけ、候補を activeIds に絞ってもう一度 rank を呼ぶ
  if (shortIds.length > 0) {
    const activeTags = snap.candidates.filter((c) => activeIds.includes(c.id));
    const shorts = shortIds.map((id) => byId.get(id)!).filter(Boolean);
    const extraRank: Record<string, string[]> = {};
    await mapLimit(chunk(shorts, PIPELINE.rankBatchSize), PIPELINE.concurrency, async (batch) => {
      checkAborted();
      const inputs: RankInput[] = batch.map((p) => ({
        id: p.id,
        category: p.category,
        topics: snap.extractions[p.id]?.topics ?? [],
        hobby: p.hobby,
      }));
      const { results, meta } = await api.rank(activeTags, inputs, params.rankLength);
      for (const r of results) {
        extraRank[r.id] = r.ranked.filter((tid) => activeIds.includes(tid));
      }
      emit(makeLog('rank', meta));
    });
    for (const pid of shortIds) {
      const have = [...(heldTags[pid] ?? [])];
      for (const tid of extraRank[pid] ?? []) {
        if (have.length >= 2) break;
        if (!have.includes(tid)) have.push(tid);
      }
      heldTags[pid] = have;
    }
    // それでも足りなければ、まだ持っていない採用タグのうち一番人数の少ないものを足す
    const counts = new Map<string, number>();
    for (const tid of activeIds) counts.set(tid, 0);
    for (const pid of participantIds) {
      for (const tid of heldTags[pid] ?? []) counts.set(tid, (counts.get(tid) ?? 0) + 1);
    }
    for (const pid of shortIds) {
      const have = heldTags[pid] ?? [];
      if (have.length < 2) {
        const rest = activeIds
          .filter((tid) => !have.includes(tid))
          .sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
        for (const tid of rest) {
          if ((heldTags[pid] ?? []).length >= 2) break;
          heldTags[pid] = [...(heldTags[pid] ?? []), tid];
          counts.set(tid, (counts.get(tid) ?? 0) + 1);
          programFilled.add(pid);
        }
      }
    }
  }

  snap.activeTagIds = activeIds;
  const assignments: Record<string, Assignment> = {};
  for (const p of participants) {
    const extraction = snap.extractions[p.id];
    const candidates = extraction?.personalCandidates ?? [];
    const personalTag = candidates.length > 0 ? candidates[0] : EVENT.fallbackPersonalTag;
    const sharedTagIds = (heldTags[p.id] ?? []).slice(0, 2);
    const flags: Assignment['flags'] = [];
    if (p.intro === '' && p.hobby === '') flags.push('no_answer');
    if (!p.consent) flags.push('no_consent');
    const sharedLabels = sharedTagIds.map((tid) => labelById.get(tid) ?? '');
    if (hasNgWord(personalTag) || sharedLabels.some((label) => hasNgWord(label))) flags.push('ng_word');
    if (candidates.length === 0) flags.push('fallback_personal');
    if (programFilled.has(p.id) || sharedTagIds.length < 2) flags.push('fallback_shared');
    assignments[p.id] = { participantId: p.id, personalTag, sharedTagIds, edited: false, flags };
  }
  snap.assignments = assignments;
  setPhase('assign', 'done', { done: 1, finishedAt: Date.now() });
  emit();

  // 段階5：会場の傾向まとめ（summary が空のときだけ。失敗は skipped）
  setPhase('summary', 'running', { startedAt: Date.now() });
  if (!snap.summary) {
    const counts = new Map<string, number>();
    for (const tid of activeIds) counts.set(tid, 0);
    for (const pid of participantIds) {
      for (const tid of heldTags[pid] ?? []) counts.set(tid, (counts.get(tid) ?? 0) + 1);
    }
    const top = activeIds
      .map((tid) => ({ label: labelById.get(tid) ?? tid, count: counts.get(tid) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    try {
      const { text, meta } = await api.summary(top);
      snap.summary = text;
      setPhase('summary', 'done', { done: 1, finishedAt: Date.now() });
      emit(makeLog('summary', meta));
    } catch (e) {
      setPhase('summary', 'skipped', {
        finishedAt: Date.now(),
        message: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    setPhase('summary', 'done', { done: 1, finishedAt: Date.now() });
  }
  emit();

  return snap;
}

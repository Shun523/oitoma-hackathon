import { z } from 'zod';
import { generationParamsSchema, MAX_CATALOG_TAGS } from './generation-params';
import { displayLength, sanitizeTag } from './text';

const id = z.string().min(1).max(30);
const date = z.iso.datetime();
const tag = z.string().refine(s => s === sanitizeTag(s) && displayLength(s) >= 1 && displayLength(s) <= 12, 'タグは全角換算で1〜12文字にしてください');
const participant = z.object({
  id, name: z.string().trim().min(1).max(30), affiliation: z.string().max(40),
  category: z.enum(['学生', '教員', '職員', '企業', '自治体', 'その他']),
  intro: z.string().max(400), hobby: z.string().max(100), consent: z.boolean(),
  source: z.enum(['forms', 'manual']).optional(), addedAt: date.optional(),
}).refine(p => p.consent || (p.intro === '' && p.hobby === ''), '同意なしの回答を含む作業データは読み込めません');

export const appStateSchema = z.object({
  version: z.literal(1),
  participants: z.array(participant).max(300), importedAt: date.nullable(),
  params: generationParamsSchema.nullable(),
  extractions: z.record(id, z.object({
    participantId: id,
    topics: z.array(z.string().min(1).refine(s => Array.from(s).length <= 15)).min(1).max(5),
    personalCandidates: z.array(tag).max(6), source: z.enum(['llm', 'fallback']),
  })),
  candidates: z.array(z.object({ id, label: tag, covers: z.string().max(30) })).max(MAX_CATALOG_TAGS),
  rankings: z.record(id, z.array(id).max(10)), activeTagIds: z.array(id).max(MAX_CATALOG_TAGS),
  assignments: z.record(id, z.object({
    participantId: id, personalTag: tag, sharedTagIds: z.array(id).max(2), edited: z.boolean(),
    flags: z.array(z.enum(['no_answer', 'no_consent', 'ng_word', 'fallback_personal', 'fallback_shared'])).max(5),
  })),
  summary: z.string().max(200),
  progress: z.array(z.object({
    key: z.enum(['extract', 'catalog', 'rank', 'assign', 'summary']),
    status: z.enum(['pending', 'running', 'done', 'error', 'skipped']),
    done: z.number().int().min(0).max(300), total: z.number().int().min(0).max(300),
    startedAt: z.number().min(0).optional(), finishedAt: z.number().min(0).optional(), message: z.string().optional(),
  })).max(5),
  llmLog: z.array(z.object({
    task: z.enum(['extract', 'catalog', 'rank', 'summary', 'regenerate']),
    // 旧版は日時の差で計測していたため、時計補正で負になった履歴も復元する。
    ms: z.number().transform(ms => Math.max(0, ms)), ok: z.boolean(), attempts: z.number().int().min(1), at: date,
  })).max(200),
  generatedAt: date.nullable(),
  printOptions: z.object({
    preset: z.enum(['label24', 'label21']), showCount: z.boolean(),
    offsetXmm: z.number().min(-10).max(10), offsetYmm: z.number().min(-10).max(10),
    gapXmm: z.number().min(0).max(10), gapYmm: z.number().min(0).max(10),
  }),
}).superRefine((s, ctx) => {
  const problem = (message: string, path: (string | number)[]): void => { ctx.addIssue({ code: 'custom', message, path }); };
  const unique = (values: string[], path: (string | number)[]): void => {
    if (new Set(values).size !== values.length) problem('IDや値が重複しています', path);
  };
  unique(s.participants.map(p => p.id), ['participants']);
  unique(s.candidates.map(t => t.id), ['candidates']);
  unique(s.activeTagIds, ['activeTagIds']);
  unique(s.progress.map(p => p.key), ['progress']);
  const people = new Set(s.participants.map(p => p.id));
  const tags = new Set(s.candidates.map(t => t.id));
  const active = new Set(s.activeTagIds);
  s.activeTagIds.forEach((tid, i) => { if (!tags.has(tid)) problem('存在しない共有タグです', ['activeTagIds', i]); });
  for (const [key, extraction] of Object.entries(s.extractions)) {
    if (!people.has(key) || extraction.participantId !== key) problem('参加者の参照が正しくありません', ['extractions', key]);
  }
  for (const [key, ranked] of Object.entries(s.rankings)) {
    if (!people.has(key)) problem('存在しない参加者です', ['rankings', key]);
    unique(ranked, ['rankings', key]);
    if (ranked.some(tid => !tags.has(tid))) problem('存在しない候補タグです', ['rankings', key]);
  }
  for (const [key, assignment] of Object.entries(s.assignments)) {
    if (!people.has(key) || assignment.participantId !== key) problem('参加者の参照が正しくありません', ['assignments', key]);
    unique(assignment.sharedTagIds, ['assignments', key, 'sharedTagIds']);
    unique(assignment.flags, ['assignments', key, 'flags']);
    if (assignment.sharedTagIds.some(tid => !active.has(tid))) problem('採用されていない共有タグです', ['assignments', key, 'sharedTagIds']);
  }
  if (s.generatedAt !== null && s.participants.some(p => !s.assignments[p.id])) problem('生成済みなのに割り当てのない参加者がいます', ['assignments']);
  s.progress.forEach((p, i) => { if (p.done > p.total) problem('進捗が合計を超えています', ['progress', i]); });
});

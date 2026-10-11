// src/lib/llm/tasks.ts
// 5つのタスクの本体と directLlmApi（mock/live切り替え）（サーバー専用）。
import { displayLength, sanitizeTag } from '../text';
import { MAX_CATALOG_TAGS } from '../generation-params';
import type {
  CatalogInput,
  ExtractInput,
  ExtractResult,
  GenerationParams,
  LlmApi,
  RankInput,
  RankResult,
  SharedTag,
} from '../types';
import { resolveMode } from './client';
import { getLlmLimiter, LlmQueueFullError } from './limiter';
import { chatJson, LlmError } from './client';
import { mockLlmApi } from './mock';
import { catalogPrompt, extractPrompt, rankPrompt, regeneratePrompt, summaryPrompt } from './prompts';
import {
  catalogOutputSchema,
  extractOutputSchema,
  rankOutputSchema,
  regenerateOutputSchema,
  summaryOutputSchema,
} from './schemas';

function dedupeKeepOrder(items: string[]): string[] {
  return items.filter((s, i) => arrIndexOf(items, s) === i);
}

function arrIndexOf(items: string[], s: string): number {
  return items.indexOf(s);
}

function cleanTopic(s: string): string | null {
  const t = s.replace(/[#＃]/g, '').trim();
  if (t === '') return null;
  if (Array.from(t).length > 15) return null;
  return t;
}

function cleanPersonalTag(s: string): string | null {
  const t = sanitizeTag(s);
  if (t === '') return null;
  const d = displayLength(t);
  if (d < 1 || d > 12) return null;
  return t;
}

function fallbackTopics(p: ExtractInput): string[] {
  if (p.hobby.trim() !== '') return [p.hobby.trim().slice(0, 15)];
  return [p.category];
}

async function liveExtract(
  people: ExtractInput[],
  signal?: AbortSignal,
): Promise<{ results: ExtractResult[]; missing: string[]; meta: { attempts: number; ms: number } }> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const clean = (
    raw: { id: string; topics: string[]; personal: string[] }[],
  ): Map<string, ExtractResult> => {
    const out = new Map<string, ExtractResult>();
    for (const r of raw) {
      const p = byId.get(r.id);
      if (!p) continue;
      if (out.has(r.id)) continue;
      let topics = dedupeKeepOrder(
        (r.topics ?? []).map((t) => cleanTopic(String(t))).filter((t): t is string => t !== null),
      ).slice(0, 5);
      if (topics.length === 0) topics = fallbackTopics(p);
      const personal = dedupeKeepOrder(
        (r.personal ?? []).map((t) => cleanPersonalTag(String(t))).filter((t): t is string => t !== null),
      ).slice(0, 3);
      out.set(r.id, { id: r.id, topics, personal });
    }
    return out;
  };

  const firstPrompt = extractPrompt(people);
  const first = await chatJson({
    task: 'extract',
    system: firstPrompt.system,
    user: firstPrompt.user,
    schema: extractOutputSchema,
    signal,
    temperature: 0.7,
    maxTokens: 2000,
  });
  const merged = clean(first.value.results);
  let attempts = first.attempts;
  let ms = first.ms;

  const missingOnce = people.map((p) => p.id).filter((id) => !merged.has(id));
  if (missingOnce.length > 0) {
    const retryPrompt = extractPrompt(people.filter((p) => missingOnce.includes(p.id)));
    const second = await chatJson({
      task: 'extract',
      system: retryPrompt.system,
      user: retryPrompt.user,
      schema: extractOutputSchema,
      signal,
      temperature: 0.7,
      maxTokens: 2000,
    });
    attempts += second.attempts;
    ms += second.ms;
    for (const [id, v] of clean(second.value.results)) {
      if (!merged.has(id)) merged.set(id, v);
    }
  }

  const missing = people.map((p) => p.id).filter((id) => !merged.has(id));
  const results = [...merged.values()].filter((r) => !missing.includes(r.id));
  return { results, missing, meta: { attempts, ms } };
}

async function liveCatalog(
  people: CatalogInput[],
  params: GenerationParams,
  signal?: AbortSignal,
): Promise<{ tags: { label: string; covers: string }[]; meta: { attempts: number; ms: number } }> {
  const lines = people.map((p) => `${p.id}: ${p.category} / ${p.topics.join(', ')}`);
  const prompt = catalogPrompt(lines, {
    n: params.n,
    targetSize: params.targetSize,
    minSize: params.minSize,
    maxSize: params.maxSize,
    candidateCount: params.candidateCount,
  });
  const minTags = Math.max(4, Math.floor(params.candidateCount * 0.6));
  const maxTags = Math.min(MAX_CATALOG_TAGS, Math.floor(params.candidateCount * 1.2));
  const { value, attempts, ms } = await chatJson({
    task: 'catalog',
    system: prompt.system,
    user: prompt.user,
    schema: catalogOutputSchema,
    signal,
    temperature: 0.4,
    maxTokens: 3000,
    validate: (v) => {
      const cleaned = cleanCatalogTags(v.tags);
      if (cleaned.length < minTags) {
        return `候補が${cleaned.length}個しかありません。${params.candidateCount}個作ってください`;
      }
      return null;
    },
  });
  return { tags: cleanCatalogTags(value.tags).slice(0, maxTags), meta: { attempts, ms } };
}

function cleanCatalogTags(tags: { label: string; covers: string }[]): { label: string; covers: string }[] {
  const out: { label: string; covers: string }[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const label = cleanPersonalTag(String(t.label ?? ''));
    if (label === null || seen.has(label)) continue;
    seen.add(label);
    out.push({ label, covers: String(t.covers ?? '').trim().slice(0, 30) });
  }
  return out;
}

async function liveRank(
  tags: SharedTag[],
  people: RankInput[],
  rankLength: number,
  signal?: AbortSignal,
): Promise<{ results: RankResult[]; missing: string[]; meta: { attempts: number; ms: number } }> {
  const validIds = new Set(tags.map((t) => t.id));
  const clean = (raw: { id: string; ranked: string[] }[], ids: Set<string>): Map<string, RankResult> => {
    const out = new Map<string, RankResult>();
    for (const r of raw) {
      if (!ids.has(r.id) || out.has(r.id)) continue;
      const ranked = dedupeKeepOrder(
        (r.ranked ?? []).map(String).filter((id) => validIds.has(id)),
      ).slice(0, rankLength);
      if (ranked.length < 2) continue;
      out.set(r.id, { id: r.id, ranked });
    }
    return out;
  };

  const byId = new Map(people.map((p) => [p.id, p]));
  const buildPrompt = (targets: RankInput[]) => {
    const tagLines = tags.map((t) => `${t.id} ${t.label}：${t.covers}`);
    const personLines = targets.map((p) => `${p.id}: ${p.category} / ${p.topics.join(', ')} / ${p.hobby}`);
    return rankPrompt(tagLines, personLines, rankLength);
  };

  const firstPrompt = buildPrompt(people);
  const first = await chatJson({
    task: 'rank',
    system: firstPrompt.system,
    user: firstPrompt.user,
    schema: rankOutputSchema,
    signal,
    temperature: 0.2,
    maxTokens: 2000,
  });
  const merged = clean(first.value.results, new Set(people.map((p) => p.id)));
  let attempts = first.attempts;
  let ms = first.ms;

  const missingOnce = people.map((p) => p.id).filter((id) => !merged.has(id));
  if (missingOnce.length > 0) {
    const targets = missingOnce.map((id) => byId.get(id)!).filter(Boolean);
    const retryPrompt = buildPrompt(targets);
    const second = await chatJson({
      task: 'rank',
      system: retryPrompt.system,
      user: retryPrompt.user,
      schema: rankOutputSchema,
      signal,
      temperature: 0.2,
      maxTokens: 2000,
    });
    attempts += second.attempts;
    ms += second.ms;
    for (const [id, v] of clean(second.value.results, new Set(missingOnce))) {
      if (!merged.has(id)) merged.set(id, v);
    }
  }

  const missing = people.map((p) => p.id).filter((id) => !merged.has(id));
  return { results: [...merged.values()], missing, meta: { attempts, ms } };
}

async function liveSummary(
  tags: { label: string; count: number }[],
  signal?: AbortSignal,
): Promise<{ text: string; meta: { attempts: number; ms: number } }> {
  const lines = tags.map((t) => `${t.label}（${t.count}人）`);
  const prompt = summaryPrompt(lines);
  const { value, attempts, ms } = await chatJson({
    task: 'summary',
    system: prompt.system,
    user: prompt.user,
    schema: summaryOutputSchema,
    signal,
    temperature: 0.7,
    maxTokens: 600,
    validate: (v) => (v.text.trim() === '' ? 'まとめの文が空です。2〜3文で書いてください' : null),
  });
  return { text: value.text.trim().slice(0, 200), meta: { attempts, ms } };
}

async function liveRegenerate(
  person: ExtractInput & { topics: string[] },
  avoid: string[],
  signal?: AbortSignal,
): Promise<{ personal: string[]; meta: { attempts: number; ms: number } }> {
  const prompt = regeneratePrompt(person, avoid);
  const { value, attempts, ms } = await chatJson({
    task: 'regenerate',
    system: prompt.system,
    user: prompt.user,
    schema: regenerateOutputSchema,
    signal,
    temperature: 0.9,
    maxTokens: 400,
    validate: (v) => {
      const cleaned = dedupeKeepOrder(
        (v.personal ?? []).map((t) => cleanPersonalTag(String(t))).filter((t): t is string => t !== null),
      ).filter((t) => !avoid.includes(t));
      if (cleaned.length === 0) return '使える個性タグがありません。別の切り口で3個作ってください';
      return null;
    },
  });
  const personal = dedupeKeepOrder(
    (value.personal ?? []).map((t) => cleanPersonalTag(String(t))).filter((t): t is string => t !== null),
  )
    .filter((t) => !avoid.includes(t))
    .slice(0, 3);
  return { personal, meta: { attempts, ms } };
}

export function createDirectLlmApi(signal?: AbortSignal): LlmApi {
  const mockRun = async <T>(fn: () => Promise<T>): Promise<T> => {
    try { return await getLlmLimiter().run(fn, signal); }
    catch (error) {
      if (error instanceof LlmQueueFullError) throw new LlmError(error.message, { status: 503 });
      throw error;
    }
  };
  return {
    async extract(people) {
      if (resolveMode() === 'mock') return mockRun(() => mockLlmApi.extract(people));
      return liveExtract(people, signal);
    },
    async catalog(people, params) {
      if (resolveMode() === 'mock') return mockRun(() => mockLlmApi.catalog(people, params));
      return liveCatalog(people, params, signal);
    },
    async rank(tags, people, rankLength) {
      if (resolveMode() === 'mock') return mockRun(() => mockLlmApi.rank(tags, people, rankLength));
      return liveRank(tags, people, rankLength, signal);
    },
    async summary(tags) {
      if (resolveMode() === 'mock') return mockRun(() => mockLlmApi.summary(tags));
      return liveSummary(tags, signal);
    },
    async regenerate(person, avoid) {
      if (resolveMode() === 'mock') return mockRun(() => mockLlmApi.regenerate(person, avoid));
      return liveRegenerate(person, avoid, signal);
    },
  };
}

export const directLlmApi = createDirectLlmApi();

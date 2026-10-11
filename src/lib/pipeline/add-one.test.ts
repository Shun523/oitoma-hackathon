// src/lib/pipeline/add-one.test.ts
// モックで1人追加の生成を確かめる。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guessColumns, readSheet, toParticipants } from '../import/forms';
import { makeManualParticipant } from '../import/manual';
import { directLlmApi } from '../llm/tasks';
import { displayLength } from '../text';
import type { Assignment, LlmApi, Participant } from '../types';
import { generateForOne, type AddStepKey } from './add-one';
import { emptySnapshot, runGeneration } from './run';

const prevEnv = { ...process.env };

beforeEach(() => {
  process.env.LLM_MODE = 'mock';
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in prevEnv)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(prevEnv)) {
    process.env[key] = value;
  }
});

async function generatedState(): Promise<{
  participants: Participant[];
  candidates: { id: string; label: string; covers: string }[];
  activeTagIds: string[];
  assignments: Record<string, Assignment>;
}> {
  const file = path.join(process.cwd(), 'public', 'samples', 'sample-40.xlsx');
  const sheet = readSheet(new Uint8Array(readFileSync(file)));
  const participants = toParticipants(sheet, guessColumns(sheet.headers)).participants;
  const snap = await runGeneration({
    participants,
    start: { ...emptySnapshot(), params: { n: 40, targetSize: 8, minSize: 4, maxSize: 16, candidateCount: 15, rankLength: 5 } },
    api: directLlmApi,
    onUpdate: () => {},
  });
  return {
    participants,
    candidates: snap.candidates,
    activeTagIds: snap.activeTagIds,
    assignments: snap.assignments,
  };
}

function newcomer(existing: Participant[]): Participant {
  return makeManualParticipant(
    {
      name: '審査 太郎',
      affiliation: '審査員',
      category: 'その他',
      intro: '',
      hobby: '岡山のラーメン屋めぐり',
      consent: true,
    },
    existing,
  );
}

describe('generateForOne with mock', () => {
  it('adds two different active shared tags and a short personal tag without the name', async () => {
    const { participants, candidates, activeTagIds, assignments } = await generatedState();
    const person = newcomer(participants);
    const seen: { task: string; body: unknown }[] = [];
    const api: LlmApi = {
      ...directLlmApi,
      extract: async (people) => {
        seen.push({ task: 'extract', body: people });
        return directLlmApi.extract(people);
      },
      rank: async (tags, people, rankLength) => {
        seen.push({ task: 'rank', body: people });
        return directLlmApi.rank(tags, people, rankLength);
      },
    };
    const before = JSON.parse(JSON.stringify(assignments)) as Record<string, Assignment>;
    const steps: string[] = [];
    const result = await generateForOne({
      person,
      candidates,
      activeTagIds,
      assignments,
      api,
      onStep: (key: AddStepKey, status: string) => {
        steps.push(`${key}:${status}`);
      },
      onLog: () => {},
    });
    const shared = result.assignment.sharedTagIds;
    expect(shared.length).toBe(2);
    expect(new Set(shared).size).toBe(2);
    for (const tid of shared) expect(activeTagIds).toContain(tid);
    const personal = result.assignment.personalTag;
    expect(displayLength(personal)).toBeGreaterThanOrEqual(1);
    expect(displayLength(personal)).toBeLessThanOrEqual(12);
    expect(steps).toEqual([
      'extract:running',
      'extract:done',
      'rank:running',
      'rank:done',
      'assign:running',
      'assign:done',
    ]);
    // 名前は送らない
    for (const s of seen) {
      expect(s.body).not.toHaveProperty('name');
    }
    expect(JSON.stringify(seen)).not.toContain('審査 太郎');
    // 渡した割り当ては変えない
    expect(assignments).toEqual(before);
  });

  it('skips rank and flags fallback when only one tag is active', async () => {
    const { participants, candidates, activeTagIds, assignments } = await generatedState();
    let rankCalled = false;
    const api: LlmApi = {
      ...directLlmApi,
      rank: async (...args: Parameters<LlmApi['rank']>) => {
        rankCalled = true;
        return directLlmApi.rank(...args);
      },
    };
    const result = await generateForOne({
      person: newcomer(participants),
      candidates,
      activeTagIds: activeTagIds.slice(0, 1),
      assignments,
      api,
      onStep: () => {},
      onLog: () => {},
    });
    expect(rankCalled).toBe(false);
    expect(result.assignment.sharedTagIds.length).toBe(1);
    expect(result.assignment.flags).toContain('fallback_shared');
  });

  it('rethrows api errors', async () => {
    const { participants, candidates, activeTagIds, assignments } = await generatedState();
    const api: LlmApi = {
      ...directLlmApi,
      extract: async () => {
        throw new Error('boom');
      },
    };
    await expect(
      generateForOne({
        person: newcomer(participants),
        candidates,
        activeTagIds,
        assignments,
        api,
        onStep: () => {},
        onLog: () => {},
      }),
    ).rejects.toThrow('boom');
  });

  it('throws AbortError for an aborted signal', async () => {
    const { participants, candidates, activeTagIds, assignments } = await generatedState();
    const controller = new AbortController();
    controller.abort();
    const error = await generateForOne({
      person: newcomer(participants),
      candidates,
      activeTagIds,
      assignments,
      api: directLlmApi,
      onStep: () => {},
      onLog: () => {},
      signal: controller.signal,
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe('AbortError');
  });
});

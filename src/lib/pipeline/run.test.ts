// src/lib/pipeline/run.test.ts
// モックの directLlmApi で sample-40.xlsx を通す。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guessColumns, readSheet, toParticipants } from '../import/forms';
import { directLlmApi } from '../llm/tasks';
import { computeMetrics } from '../metrics';
import { displayLength } from '../text';
import type { ExtractInput, LlmApi, Participant } from '../types';
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

function loadParticipants(): Participant[] {
  const file = path.join(process.cwd(), 'public', 'samples', 'sample-40.xlsx');
  const sheet = readSheet(new Uint8Array(readFileSync(file)));
  return toParticipants(sheet, guessColumns(sheet.headers)).participants;
}

function toExtractInput(p: Participant): ExtractInput {
  return { id: p.id, affiliation: p.affiliation, category: p.category, intro: p.intro, hobby: p.hobby };
}

describe('runGeneration with mock', () => {
  it('assigns a personal tag and two different shared tags to everyone', async () => {
    const participants = loadParticipants();
    const snap = await runGeneration({
      participants,
      start: emptySnapshot(),
      api: directLlmApi,
      onUpdate: () => {},
    });

    for (const p of participants) {
      const a = snap.assignments[p.id];
      expect(a).toBeDefined();
      const d = displayLength(a.personalTag);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(12);
      if (a.sharedTagIds.length < 2) {
        expect(a.flags).toContain('fallback_shared');
      } else {
        expect(a.sharedTagIds.length).toBe(2);
        expect(new Set(a.sharedTagIds).size).toBe(2);
      }
    }

    // 採用タグはすべて下限以上
    const counts = new Map<string, number>();
    for (const p of participants) {
      for (const tid of snap.assignments[p.id].sharedTagIds) {
        counts.set(tid, (counts.get(tid) ?? 0) + 1);
      }
    }
    for (const tid of snap.activeTagIds) {
      expect(counts.get(tid) ?? 0).toBeGreaterThanOrEqual(snap.params.minSize);
    }

    // 共通タグ仲間の最小は「下限−1」以上
    const m = computeMetrics(snap.assignments);
    expect(m.matesMin).toBeGreaterThanOrEqual(snap.params.minSize - 1);
    expect(snap.summary).not.toBe('');
  }, 60000);

  it('resume calls extract only for the missing people', async () => {
    const participants = loadParticipants();
    const first20 = await directLlmApi.extract(participants.slice(0, 20).map(toExtractInput));
    const start = emptySnapshot();
    for (const r of first20.results) {
      start.extractions[r.id] = {
        participantId: r.id,
        topics: r.topics,
        personalCandidates: r.personal,
        source: 'llm',
      };
    }

    let extractedPeople = 0;
    const countingApi: LlmApi = {
      ...directLlmApi,
      extract: async (people: ExtractInput[]) => {
        extractedPeople += people.length;
        return directLlmApi.extract(people);
      },
    };
    await runGeneration({ participants, start, api: countingApi, onUpdate: () => {} });
    expect(extractedPeople).toBe(20);
  }, 60000);
});

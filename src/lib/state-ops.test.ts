// src/lib/state-ops.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT_OPTIONS } from '../config/event';
import { appStateSchema } from './store';
import { applyAddLatecomer, applyAddParticipant, applyRemoveManual, isGenerated } from './state-ops';
import type { AppState, Assignment, Extraction, Participant } from './types';

function participant(id: string, source?: 'forms' | 'manual'): Participant {
  return {
    id,
    name: `名前${id}`,
    affiliation: '',
    category: 'その他',
    intro: '自己紹介',
    hobby: '一言',
    consent: true,
    ...(source === undefined ? {} : { source, addedAt: '2026-10-11T00:00:00.000Z' }),
  };
}

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    participants: [],
    importedAt: null,
    params: null,
    extractions: {},
    candidates: [],
    rankings: {},
    activeTagIds: [],
    assignments: {},
    summary: '',
    progress: [],
    llmLog: [],
    generatedAt: null,
    printOptions: { ...DEFAULT_PRINT_OPTIONS },
    ...overrides,
  };
}

const GENERATED = {
  generatedAt: '2026-10-11T00:00:00.000Z',
  activeTagIds: ['T01'],
  assignments: {
    P001: { participantId: 'P001', personalTag: '個性', sharedTagIds: ['T01'], edited: false, flags: [] },
  } as Record<string, Assignment>,
};

describe('isGenerated', () => {
  it('is false when generatedAt is null', () => {
    expect(isGenerated({ generatedAt: null, activeTagIds: [] })).toBe(false);
  });

  it('is true when generated', () => {
    expect(isGenerated({ generatedAt: 'x', activeTagIds: ['T01'] })).toBe(true);
  });
});

describe('applyAddLatecomer', () => {
  it('adds one person without touching others', () => {
    const state = baseState({ participants: [participant('P001')], ...GENERATED });
    const extraction: Extraction = { participantId: 'P002', topics: ['話題'], personalCandidates: ['個性'], source: 'llm' };
    const assignment: Assignment = {
      participantId: 'P002',
      personalTag: '個性',
      sharedTagIds: ['T01'],
      edited: false,
      flags: [],
    };
    const next = applyAddLatecomer(state, {
      participant: participant('P002', 'manual'),
      extraction,
      ranking: ['T01'],
      assignment,
    });
    expect(next.participants.length).toBe(2);
    expect(next.assignments['P001']).toEqual(state.assignments['P001']);
    expect(next.extractions['P001']).toEqual(state.extractions['P001']);
    expect(next.rankings['P001']).toEqual(state.rankings['P001']);
    expect(next.activeTagIds).toEqual(['T01']);
    expect(next.candidates).toEqual([]);
    expect(next.generatedAt).toBe(state.generatedAt);
    expect(next.assignments['P002']).toEqual(assignment);
  });

  it('does nothing for the same id or before generation', () => {
    const state = baseState({ participants: [participant('P001')], ...GENERATED });
    const added = {
      participant: participant('P001', 'manual'),
      extraction: { participantId: 'P001', topics: [], personalCandidates: [], source: 'llm' } as Extraction,
      ranking: [] as string[],
      assignment: state.assignments['P001']!,
    };
    expect(applyAddLatecomer(state, added)).toBe(state);
    const fresh = baseState();
    expect(applyAddLatecomer(fresh, { ...added, participant: participant('P002', 'manual') })).toBe(fresh);
  });
});

describe('applyAddParticipant', () => {
  it('keeps partial generation results before generation', () => {
    const extractions = { P001: { participantId: 'P001', topics: ['話題'], personalCandidates: [], source: 'llm' } as Extraction };
    const state = baseState({ participants: [participant('P001')], extractions });
    const next = applyAddParticipant(state, participant('P002'));
    expect(next.participants.length).toBe(2);
    expect(next.extractions).toEqual(extractions);
  });

  it('does nothing after generation', () => {
    const state = baseState({ participants: [participant('P001')], ...GENERATED });
    expect(applyAddParticipant(state, participant('P002'))).toBe(state);
  });
});

describe('applyRemoveManual', () => {
  it('removes only manual people', () => {
    const state = baseState({
      ...GENERATED,
      participants: [participant('P001'), participant('P002', 'manual')],
      extractions: { P002: { participantId: 'P002', topics: [], personalCandidates: [], source: 'llm' } as Extraction },
      rankings: { P002: [] as string[] },
      assignments: {
        P001: { participantId: 'P001', personalTag: '個性', sharedTagIds: ['T01'], edited: false, flags: [] },
        P002: { participantId: 'P002', personalTag: 'x', sharedTagIds: [], edited: false, flags: [] },
      },
    });
    const next = applyRemoveManual(state, 'P002');
    expect(next.participants.map((p) => p.id)).toEqual(['P001']);
    expect(next.extractions['P002']).toBeUndefined();
    expect(next.rankings['P002']).toBeUndefined();
    expect(next.assignments['P002']).toBeUndefined();
    expect(applyRemoveManual(state, 'P001')).toBe(state);
    expect(applyRemoveManual(state, 'P999')).toBe(state);
  });
});

describe('old saved data', () => {
  it('passes appStateSchema without source and addedAt', () => {
    const parsed = appStateSchema.safeParse(baseState({ participants: [participant('P001')] }));
    expect(parsed.success).toBe(true);
  });
});

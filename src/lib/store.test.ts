import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStateSchema, useStore } from './store';
import { generationOperation } from './pipeline/operation';
import type { AppState, Participant } from './types';

const people: Participant[] = Array.from({ length: 6 }, (_, i) => ({
  id: `P00${i + 1}`, name: `架空${i}`, affiliation: '', category: '学生', intro: '自己紹介', hobby: '趣味', consent: true,
}));

function snapshot(): AppState { return JSON.parse(JSON.stringify(useStore.getState())); }

beforeEach(() => {
  useStore.getState().clearAll();
  useStore.getState().setParticipants(people);
  useStore.getState().patchGeneration({
    candidates: [{ id: 'T01', label: '料理仲間', covers: '料理' }, { id: 'T02', label: '運動仲間', covers: '運動' }],
    activeTagIds: ['T01', 'T02'],
    assignments: Object.fromEntries(people.map(p => [p.id, {
      participantId: p.id, personalTag: '自炊が好き', sharedTagIds: ['T01', 'T02'], edited: false, flags: [],
    }])),
  });
  useStore.getState().markGenerated();
});
afterEach(() => { useStore.getState().clearAll(); vi.unstubAllGlobals(); });

describe('editing flags', () => {
  it('updates NG flags for personal editing, shared renaming and replacement', () => {
    const s = useStore.getState();
    s.updateAssignment('P001', { personalTag: '恋人募集中' });
    expect(useStore.getState().assignments.P001.flags).toContain('ng_word');
    s.updateAssignment('P001', { personalTag: '料理が好き' });
    expect(useStore.getState().assignments.P001.flags).not.toContain('ng_word');
    s.renameSharedTag('T01', '恋人募集中');
    expect(Object.values(useStore.getState().assignments).every(a => a.flags.includes('ng_word'))).toBe(true);
    s.updateAssignment('P001', { sharedTagIds: ['T02'] });
    expect(useStore.getState().assignments.P001.flags).not.toContain('ng_word');
    expect(useStore.getState().assignments.P001.flags).toContain('fallback_shared');
    s.renameSharedTag('T01', '料理仲間');
    expect(Object.values(useStore.getState().assignments).every(a => !a.flags.includes('ng_word'))).toBe(true);
    s.updateAssignment('P001', { sharedTagIds: ['T01', 'T02'] });
    expect(useStore.getState().assignments.P001.flags).not.toContain('fallback_shared');
  });
});

describe('backups', () => {
  it('accepts older participant data and partial generation', () => {
    expect(appStateSchema.safeParse(snapshot()).success).toBe(true);
    const partial = snapshot();
    partial.generatedAt = null;
    partial.assignments = {};
    partial.activeTagIds = [];
    partial.extractions = { P001: { participantId: 'P001', topics: ['料理'], personalCandidates: ['自炊が好き'], source: 'llm' } };
    expect(appStateSchema.safeParse(partial).success).toBe(true);
  });

  it.each(['duplicate-person', 'missing-tag', 'duplicate-tag', 'offset', 'no-consent', 'missing-assignment', 'bad-participant-ref'])('rejects %s without replacing the state', kind => {
    const before = snapshot();
    const broken = snapshot();
    if (kind === 'duplicate-person') broken.participants.push({ ...broken.participants[0] });
    if (kind === 'missing-tag') broken.activeTagIds.push('T99');
    if (kind === 'duplicate-tag') broken.assignments.P001.sharedTagIds = ['T01', 'T01'];
    if (kind === 'offset') broken.printOptions.gapYmm = -999;
    if (kind === 'no-consent') broken.participants[0].consent = false;
    if (kind === 'missing-assignment') delete broken.assignments.P001;
    if (kind === 'bad-participant-ref') broken.assignments.P001.participantId = 'P999';
    expect(appStateSchema.safeParse(broken).success).toBe(false);
    expect(() => useStore.getState().replaceAll(broken)).toThrow();
    expect(snapshot()).toEqual(before);
  });

  it('shows a restoration error for broken persisted state', () => {
    const current = useStore.getState();
    const merge = useStore.persist.getOptions().merge!;
    expect(merge(undefined, current)).toBe(current);
    expect(merge({}, current).restoreError).toContain('読み込めません');
  });

  it('refreshes stale warning flags when opening an older backup', () => {
    const old = snapshot();
    old.assignments.P001.personalTag = '恋人募集中';
    useStore.getState().replaceAll(old);
    expect(useStore.getState().assignments.P001.flags).toContain('ng_word');
  });

  it('restores older clock-adjusted timing logs without rejecting participants', () => {
    const old = snapshot();
    old.llmLog = [{ task: 'extract', ms: -2028, attempts: 1, ok: true, at: new Date().toISOString() }];
    useStore.getState().replaceAll(old);
    expect(useStore.getState().participants).toHaveLength(6);
    expect(useStore.getState().llmLog[0].ms).toBe(0);
  });

  it('finishes hydration with a notice when stored JSON is malformed', async () => {
    const storage = new Map([['nametag-app-v1', '{broken']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    await useStore.persist.rehydrate();
    expect(useStore.persist.hasHydrated()).toBe(true);
    expect(useStore.getState().restoreError).toContain('壊れています');
  });
});

describe('operation isolation', () => {
  it('serializes operations and protects a new operation from an old completion', () => {
    const s = useStore.getState();
    const first = s.beginOperation()!;
    expect(s.beginOperation()).toBeNull();
    expect(useStore.getState().running).toBe(true);
    s.clearAll();
    expect(first.signal.aborted).toBe(true);
    expect(generationOperation.isCurrent(first)).toBe(false);
    const second = s.beginOperation()!;
    s.finishOperation(first);
    expect(useStore.getState().running).toBe(true);
    expect(generationOperation.isCurrent(second)).toBe(true);
    s.finishOperation(second);
    expect(useStore.getState().running).toBe(false);
  });
});

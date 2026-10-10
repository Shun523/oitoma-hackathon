// src/lib/store.ts
// Zustand（persist）で AppState 全体を localStorage に保存する（name: 'nametag-app-v1'、version: 1）。
// 指標は保存せず computeMetrics で毎回計算し、生成中フラグは保存しない。
'use client';

import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PRINT_OPTIONS } from '../config/event';
import type { GenerationSnapshot } from './pipeline/run';
import type {
  AppState,
  Assignment,
  Category,
  LlmCallLog,
  Participant,
  PhaseProgress,
  PrintOptions,
} from './types';

const categorySchema = z.enum(['学生', '教員', '職員', '企業', '自治体', 'その他']);

const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  affiliation: z.string(),
  category: categorySchema,
  intro: z.string(),
  hobby: z.string(),
  consent: z.boolean(),
});

// JSONの読み込み時に検証する
export const appStateSchema = z.object({
  version: z.literal(1),
  participants: z.array(participantSchema),
  importedAt: z.string().nullable(),
  params: z
    .object({
      n: z.number(),
      targetSize: z.number(),
      minSize: z.number(),
      maxSize: z.number(),
      candidateCount: z.number(),
      rankLength: z.number(),
    })
    .nullable(),
  extractions: z.record(
    z.string(),
    z.object({
      participantId: z.string(),
      topics: z.array(z.string()),
      personalCandidates: z.array(z.string()),
      source: z.enum(['llm', 'fallback']),
    }),
  ),
  candidates: z.array(z.object({ id: z.string(), label: z.string(), covers: z.string() })),
  rankings: z.record(z.string(), z.array(z.string())),
  activeTagIds: z.array(z.string()),
  assignments: z.record(
    z.string(),
    z.object({
      participantId: z.string(),
      personalTag: z.string(),
      sharedTagIds: z.array(z.string()),
      edited: z.boolean(),
      flags: z.array(z.enum(['no_answer', 'no_consent', 'ng_word', 'fallback_personal', 'fallback_shared'])),
    }),
  ),
  summary: z.string(),
  progress: z.array(
    z.object({
      key: z.enum(['extract', 'catalog', 'rank', 'assign', 'summary']),
      status: z.enum(['pending', 'running', 'done', 'error', 'skipped']),
      done: z.number(),
      total: z.number(),
      startedAt: z.number().optional(),
      finishedAt: z.number().optional(),
      message: z.string().optional(),
    }),
  ),
  llmLog: z.array(
    z.object({
      task: z.enum(['extract', 'catalog', 'rank', 'summary', 'regenerate']),
      ms: z.number(),
      ok: z.boolean(),
      attempts: z.number(),
      at: z.string(),
    }),
  ),
  generatedAt: z.string().nullable(),
  printOptions: z.object({
    preset: z.enum(['label24', 'label21']),
    showCount: z.boolean(),
    offsetXmm: z.number(),
    offsetYmm: z.number(),
    gapXmm: z.number(),
    gapYmm: z.number(),
  }),
});

function initialAppState(): AppState {
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
  };
}

function emptyGeneration(): Pick<
  AppState,
  'params' | 'extractions' | 'candidates' | 'rankings' | 'activeTagIds' | 'assignments' | 'summary' | 'progress' | 'llmLog' | 'generatedAt'
> {
  return {
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
  };
}

interface StoreActions {
  setParticipants: (participants: Participant[]) => void;
  patchGeneration: (snap: Partial<GenerationSnapshot>) => void;
  markGenerated: () => void;
  appendLlmLog: (log: LlmCallLog) => void;
  updateAssignment: (participantId: string, patch: Partial<Assignment>) => void;
  addPersonalCandidates: (participantId: string, candidates: string[]) => void;
  renameSharedTag: (tagId: string, label: string) => void;
  setPrintOptions: (patch: Partial<PrintOptions>) => void;
  replaceAll: (state: AppState) => void;
  resetGeneration: (scope: 'all' | 'shared') => void;
  clearAll: () => void;
}

type StoreState = AppState & { saveError: boolean } & StoreActions;

// 保存に失敗したら saveError を立てる（saveError 自体は保存しない）
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // 通知は一度だけ（setStateがpersistの書き込みを再誘発して循環しないようguardする）
      if (!useStore.getState().saveError) useStore.setState({ saveError: true });
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // 消せなくても何もしない
    }
  },
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...initialAppState(),
      saveError: false,

      // 取り込んだら生成結果は空に戻す
      setParticipants: (participants: Participant[]) =>
        set(() => ({ ...emptyGeneration(), participants, importedAt: new Date().toISOString() })),

      patchGeneration: (snap: Partial<GenerationSnapshot>) =>
        set(() => {
          const next: Partial<StoreState> = {};
          if (snap.params !== undefined) next.params = snap.params;
          if (snap.extractions !== undefined) next.extractions = snap.extractions;
          if (snap.candidates !== undefined) next.candidates = snap.candidates;
          if (snap.rankings !== undefined) next.rankings = snap.rankings;
          if (snap.activeTagIds !== undefined) next.activeTagIds = snap.activeTagIds;
          if (snap.assignments !== undefined) next.assignments = snap.assignments;
          if (snap.summary !== undefined) next.summary = snap.summary;
          if (snap.progress !== undefined) next.progress = snap.progress;
          return next;
        }),

      markGenerated: () => set(() => ({ generatedAt: new Date().toISOString() })),

      // 200件を超えたら古いものから捨てる
      appendLlmLog: (log: LlmCallLog) => set((s) => ({ llmLog: [...s.llmLog, log].slice(-200) })),

      updateAssignment: (participantId: string, patch: Partial<Assignment>) =>
        set((s) => {
          const current = s.assignments[participantId];
          if (!current) return {};
          return { assignments: { ...s.assignments, [participantId]: { ...current, ...patch, edited: true } } };
        }),

      addPersonalCandidates: (participantId: string, candidates: string[]) =>
        set((s) => {
          const current = s.extractions[participantId];
          if (!current) return {};
          const merged = [...current.personalCandidates];
          for (const c of candidates) {
            if (!merged.includes(c)) merged.push(c);
          }
          return { extractions: { ...s.extractions, [participantId]: { ...current, personalCandidates: merged.slice(0, 6) } } };
        }),

      renameSharedTag: (tagId: string, label: string) =>
        set((s) => ({ candidates: s.candidates.map((c) => (c.id === tagId ? { ...c, label } : c)) })),

      setPrintOptions: (patch: Partial<PrintOptions>) =>
        set((s) => ({ printOptions: { ...s.printOptions, ...patch } })),

      replaceAll: (state: AppState) => set(() => ({ ...state })),

      resetGeneration: (scope: 'all' | 'shared') =>
        set((s) => {
          if (scope === 'all') return { ...emptyGeneration() };
          return {
            params: null,
            candidates: [],
            rankings: {},
            activeTagIds: [],
            assignments: {},
            summary: '',
            progress: [],
            generatedAt: null,
            extractions: s.extractions,
            llmLog: s.llmLog,
          };
        }),

      clearAll: () => set(() => ({ ...initialAppState(), saveError: false })),
    }),
    {
      name: 'nametag-app-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        version: s.version,
        participants: s.participants,
        importedAt: s.importedAt,
        params: s.params,
        extractions: s.extractions,
        candidates: s.candidates,
        rankings: s.rankings,
        activeTagIds: s.activeTagIds,
        assignments: s.assignments,
        summary: s.summary,
        progress: s.progress,
        llmLog: s.llmLog,
        generatedAt: s.generatedAt,
        printOptions: s.printOptions,
      }),
    },
  ),
);

// 復元を待つためのフック
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

export type { Category, Participant, PhaseProgress };

// src/lib/store.ts
// Zustand（persist）で AppState 全体を localStorage に保存する（name: 'nametag-app-v1'、version: 1）。
// 指標は保存せず computeMetrics で毎回計算し、生成中フラグは保存しない。
'use client';

import { useSyncExternalStore } from 'react';
import { appStateSchema } from './state-schema';
import { generationOperation } from './pipeline/operation';
import { refreshAssignmentFlags } from './pipeline/sticker';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PRINT_OPTIONS } from '../config/event';
import { applyAddLatecomer, applyAddParticipant, applyRemoveManual } from './state-ops';
import type { GenerationSnapshot } from './pipeline/run';
import type {
  AppState,
  Assignment,
  Category,
  Extraction,
  LlmCallLog,
  Participant,
  PhaseProgress,
  PrintOptions,
} from './types';

export { appStateSchema } from './state-schema';

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
  addParticipant: (p: Participant) => void;
  addLatecomer: (added: { participant: Participant; extraction: Extraction; ranking: string[]; assignment: Assignment }) => void;
  removeManualParticipant: (id: string) => void;
  setRunning: (v: boolean) => void;
  beginOperation: () => AbortController | null;
  finishOperation: (controller: AbortController) => void;
  cancelOperation: () => void;
}

type StoreState = AppState & { saveError: boolean; running: boolean; restoreError: string | null } & StoreActions;

function refreshedState(state: AppState): AppState {
  const assignments = { ...state.assignments };
  for (const p of state.participants) {
    if (assignments[p.id]) assignments[p.id] = refreshAssignmentFlags(assignments[p.id], p, state.candidates);
  }
  return { ...state, assignments };
}

let storageReadError: string | null = null;

// 保存に失敗したら saveError を立てる（saveError 自体は保存しない）
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { JSON.parse(raw); }
        catch {
          storageReadError = '保存中の作業データが壊れています。正常なバックアップを開いてください。';
          return null;
        }
      }
      return raw;
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
    (set, get) => ({
      ...initialAppState(),
      saveError: false,
      running: false,
      restoreError: null,

      // 取り込んだら生成結果は空に戻す
      setParticipants: (participants: Participant[]) =>
        set(() => { generationOperation.cancel(); return { ...emptyGeneration(), participants, importedAt: new Date().toISOString(), running: false }; }),

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
          const participant = s.participants.find(p => p.id === participantId);
          if (!participant) return {};
          const assignment = refreshAssignmentFlags({ ...current, ...patch, participantId, edited: true }, participant, s.candidates, {
            personal: patch.personalTag !== undefined, shared: patch.sharedTagIds !== undefined,
          });
          return { assignments: { ...s.assignments, [participantId]: assignment } };
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
        set((s) => {
          const candidates = s.candidates.map(c => c.id === tagId ? { ...c, label } : c);
          const assignments = { ...s.assignments };
          for (const p of s.participants) {
            if (assignments[p.id]) assignments[p.id] = refreshAssignmentFlags(assignments[p.id], p, candidates);
          }
          return { candidates, assignments };
        }),

      setPrintOptions: (patch: Partial<PrintOptions>) =>
        set((s) => ({ printOptions: { ...s.printOptions, ...patch } })),

      replaceAll: (state: AppState) => {
        const parsed = appStateSchema.parse(state);
        generationOperation.cancel();
        storageReadError = null;
        set(() => ({ ...refreshedState(parsed), running: false, restoreError: null }));
      },

      resetGeneration: (scope: 'all' | 'shared') =>
        set((s) => {
          generationOperation.cancel();
          if (scope === 'all') return { ...emptyGeneration(), running: false };
          return {
            running: false,
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

      clearAll: () => { generationOperation.cancel(); storageReadError = null; set(() => ({ ...initialAppState(), saveError: false, running: false, restoreError: null })); },

      addParticipant: (p) => set((s) => s.running ? {} : applyAddParticipant(s, p)),

      addLatecomer: (added) => set((s) => applyAddLatecomer(s, added)),

      removeManualParticipant: (id) => set((s) => s.running ? {} : applyRemoveManual(s, id)),

      setRunning: (v) => { if (!v) generationOperation.cancel(); set(() => ({ running: v })); },
      beginOperation: () => {
        if (get().running) return null;
        const controller = generationOperation.begin();
        if (controller) set({ running: true });
        return controller;
      },
      finishOperation: (controller) => { if (generationOperation.finish(controller)) set({ running: false }); },
      cancelOperation: () => { generationOperation.cancel(); set({ running: false }); },
    }),
    {
      name: 'nametag-app-v1',
      version: 1,
      migrate: () => {
        storageReadError = '保存データのバージョンに対応していません。正常なバックアップを開いてください。';
        return initialAppState();
      },
      merge: (persisted, current) => {
        if (persisted === undefined || persisted === null) return storageReadError ? { ...current, restoreError: storageReadError } : current;
        const parsed = appStateSchema.safeParse(persisted);
        return parsed.success
          ? { ...current, ...refreshedState(parsed.data), restoreError: storageReadError }
          : { ...current, restoreError: '保存中の作業データを読み込めませんでした。正常なバックアップを開いてください。' };
      },
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

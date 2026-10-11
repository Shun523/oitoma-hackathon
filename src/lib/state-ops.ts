// src/lib/state-ops.ts
// 追加・取り消しの状態変更（純粋関数）。ストアからは set((s) => applyXxx(s, ...)) で呼ぶ。
import type { AppState, Assignment, Extraction, Participant } from './types';

type GenState = Pick<AppState, 'generatedAt' | 'activeTagIds'>;

export function isGenerated(state: GenState): boolean {
  return state.generatedAt !== null && state.activeTagIds.length > 0;
}

function isFull(participants: Participant[]): boolean {
  return participants.length >= 300;
}

function hasSameId(participants: Participant[], id: string): boolean {
  return participants.some((p) => p.id === id);
}

export function applyAddParticipant(state: AppState, p: Participant): AppState {
  if (isGenerated(state)) return state;
  if (hasSameId(state.participants, p.id)) return state;
  if (isFull(state.participants)) return state;
  return { ...state, participants: [...state.participants, p] };
}

export function applyAddLatecomer(
  state: AppState,
  added: { participant: Participant; extraction: Extraction; ranking: string[]; assignment: Assignment },
): AppState {
  if (!isGenerated(state)) return state;
  if (hasSameId(state.participants, added.participant.id)) return state;
  if (isFull(state.participants)) return state;
  const id = added.participant.id;
  return {
    ...state,
    participants: [...state.participants, added.participant],
    extractions: { ...state.extractions, [id]: added.extraction },
    rankings: { ...state.rankings, [id]: added.ranking },
    assignments: { ...state.assignments, [id]: added.assignment },
  };
}

export function applyRemoveManual(state: AppState, id: string): AppState {
  const target = state.participants.find((p) => p.id === id);
  if (!target || target.source !== 'manual') return state;
  const extractions = { ...state.extractions };
  const rankings = { ...state.rankings };
  const assignments = { ...state.assignments };
  delete extractions[id];
  delete rankings[id];
  delete assignments[id];
  return {
    ...state,
    participants: state.participants.filter((p) => p.id !== id),
    extractions,
    rankings,
    assignments,
  };
}

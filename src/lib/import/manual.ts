// src/lib/import/manual.ts
// 1人分の手入力から参加者を作る。値の整え方は forms.ts と同じ（normalize.ts）。
import type { Category, Participant } from '../types';
import { normalizeAffiliation, normalizeHobby, normalizeIntro, normalizeName } from './normalize';

export interface ManualInput {
  name: string;
  affiliation: string;
  category: Category;
  intro: string;
  hobby: string;
  consent: boolean;
}

export function nextParticipantId(existing: Participant[]): string {
  let max = 0;
  for (const p of existing) {
    const m = p.id.match(/(\d+)(?!.*\d)/);
    if (m?.[1] !== undefined) max = Math.max(max, Number(m[1]));
  }
  return `P${String(max + 1).padStart(3, '0')}`;
}

export function makeManualParticipant(input: ManualInput, existing: Participant[], now?: Date): Participant {
  const name = normalizeName(input.name);
  if (name === '') throw new Error('名前を入れてください');
  let intro = normalizeIntro(input.intro);
  let hobby = normalizeHobby(input.hobby);
  if (!input.consent) {
    intro = '';
    hobby = '';
  }
  return {
    id: nextParticipantId(existing),
    name,
    affiliation: normalizeAffiliation(input.affiliation),
    category: input.category,
    intro,
    hobby,
    consent: input.consent,
    source: 'manual',
    addedAt: (now ?? new Date()).toISOString(),
  };
}

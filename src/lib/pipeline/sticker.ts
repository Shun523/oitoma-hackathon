// src/lib/pipeline/sticker.ts
// 1人分の割り当て（個性タグ・共有タグ・フラグ）を作る。run.ts と add-one.ts で共用。
import { EVENT } from '../../config/event';
import { hasNgWord } from '../text';
import type { Assignment, Extraction, Participant, SharedTag } from '../types';

export function buildAssignment(
  participant: Participant,
  extraction: Extraction | undefined,
  sharedTagIds: string[],
  usedFallback: boolean,
  candidates: SharedTag[],
): Assignment {
  const personalCandidates = extraction?.personalCandidates ?? [];
  const personalTag = personalCandidates.length > 0 ? personalCandidates[0] : EVENT.fallbackPersonalTag;
  const labelById = new Map(candidates.map((c) => [c.id, c.label]));
  const flags: Assignment['flags'] = [];
  if (participant.intro === '' && participant.hobby === '') flags.push('no_answer');
  if (!participant.consent) flags.push('no_consent');
  const sharedLabels = sharedTagIds.map((tid) => labelById.get(tid) ?? '');
  if (hasNgWord(personalTag) || sharedLabels.some((label) => hasNgWord(label))) flags.push('ng_word');
  if (personalCandidates.length === 0) flags.push('fallback_personal');
  if (usedFallback || sharedTagIds.length < 2) flags.push('fallback_shared');
  return {
    participantId: participant.id,
    personalTag,
    sharedTagIds: sharedTagIds.slice(0, 2),
    edited: false,
    flags,
  };
}

export function refreshAssignmentFlags(
  assignment: Assignment, participant: Participant, candidates: SharedTag[],
  edited: { personal?: boolean; shared?: boolean } = {},
): Assignment {
  const flags: Assignment['flags'] = [];
  if (participant.intro === '' && participant.hobby === '') flags.push('no_answer');
  if (!participant.consent) flags.push('no_consent');
  const labels = new Map(candidates.map(t => [t.id, t.label]));
  if (hasNgWord(assignment.personalTag) || assignment.sharedTagIds.some(id => hasNgWord(labels.get(id) ?? ''))) flags.push('ng_word');
  if (!edited.personal && assignment.flags.includes('fallback_personal')) flags.push('fallback_personal');
  if (assignment.sharedTagIds.length < 2 || (!edited.shared && assignment.flags.includes('fallback_shared'))) flags.push('fallback_shared');
  return { ...assignment, flags };
}

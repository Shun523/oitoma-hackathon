// src/lib/import/manual.test.ts
import { describe, expect, it } from 'vitest';
import type { Participant } from '../types';
import { makeManualParticipant, nextParticipantId, type ManualInput } from './manual';

function participant(id: string): Participant {
  return { id, name: `名前${id}`, affiliation: '', category: 'その他', intro: '', hobby: '', consent: true };
}

const BASE_INPUT: ManualInput = {
  name: '審査 太郎',
  affiliation: '工学部',
  category: '学生',
  intro: '発酵食品の成分を分析しています。',
  hobby: '岡山のラーメン屋めぐり',
  consent: true,
};

describe('nextParticipantId', () => {
  it('returns P041 after P001-P040', () => {
    const existing = Array.from({ length: 40 }, (_, i) => participant(`P${String(i + 1).padStart(3, '0')}`));
    expect(nextParticipantId(existing)).toBe('P041');
  });

  it('uses max plus one for gaps', () => {
    expect(nextParticipantId([participant('P001'), participant('P003')])).toBe('P004');
  });

  it('returns P001 when empty', () => {
    expect(nextParticipantId([])).toBe('P001');
  });
});

describe('makeManualParticipant', () => {
  it('trims whitespace and cuts a 31-char name to 30', () => {
    const p = makeManualParticipant(
      { ...BASE_INPUT, name: `  \n${'あ'.repeat(31)}  ` },
      [],
      new Date('2026-10-11T09:00:00+09:00'),
    );
    expect(p.name).toBe('あ'.repeat(30));
    expect(p.id).toBe('P001');
    expect(p.source).toBe('manual');
    expect(p.addedAt).toBe('2026-10-11T00:00:00.000Z');
    expect(p.category).toBe('学生');
  });

  it('empties intro and hobby when consent is false', () => {
    const p = makeManualParticipant({ ...BASE_INPUT, consent: false }, [participant('P001')]);
    expect(p.intro).toBe('');
    expect(p.hobby).toBe('');
    expect(p.consent).toBe(false);
    expect(p.id).toBe('P002');
  });

  it('throws for a blank-only name', () => {
    expect(() => makeManualParticipant({ ...BASE_INPUT, name: ' 　\n ' }, [])).toThrow('名前を入れてください');
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { guessColumns, readSheet, toParticipants, type SheetData } from './forms';

function loadSample40(): SheetData {
  const file = path.join(process.cwd(), 'public', 'samples', 'sample-40.xlsx');
  return readSheet(new Uint8Array(readFileSync(file)));
}

describe('forms sample-40', () => {
  it('guesses the question name column and imports 40 people with 2 without consent', () => {
    const sheet = loadSample40();
    const map = guessColumns(sheet.headers);
    // 自動の「名前」ではなく質問の「お名前」
    expect(sheet.headers[map.name ?? -1]).toBe('お名前');
    expect(map.name).toBe(sheet.headers.indexOf('お名前'));

    const { participants, skippedEmptyName, warnings } = toParticipants(sheet, map);
    expect(participants.length).toBe(40);
    expect(skippedEmptyName).toBe(0);
    expect(warnings).toEqual([]);
    expect(participants[0].id).toBe('P001');
    expect(participants[39].id).toBe('P040');

    const withoutConsent = participants.filter((p) => !p.consent);
    expect(withoutConsent.length).toBe(2);
    for (const p of withoutConsent) {
      expect(p.intro).toBe('');
      expect(p.hobby).toBe('');
    }
  });

  it('maps raw category words', () => {
    const sheet = loadSample40();
    const map = guessColumns(sheet.headers);
    const { participants } = toParticipants(sheet, map);
    const byName = new Map(participants.map((p) => [p.name, p]));
    expect(byName.get('鈴木みずき')?.category).toBe('教員'); // 教授
    expect(byName.get('高橋れん')?.category).toBe('企業'); // 会社員
    expect(byName.get('渡辺かりん')?.category).toBe('自治体'); // 自治体関係者
    expect(byName.get('伊藤ゆうと')?.category).toBe('職員'); // 大学職員
    expect(byName.get('山田さくら')?.category).toBe('学生'); // 学部生
  });
});

describe('forms consent', () => {
  it('warns once when the consent column is missing', () => {
    const sheet: SheetData = {
      headers: ['お名前', '所属', '区分', '自己紹介（任意）', '最近ハマっていること（任意）'],
      rows: Array.from({ length: 6 }, (_, i) => [`名前${i + 1}`, '所属', '学生', '紹介', '一言']),
    };
    const map = guessColumns(sheet.headers);
    expect(map.consent).toBeUndefined();
    const { participants, warnings } = toParticipants(sheet, map);
    expect(participants.length).toBe(6);
    expect(warnings.length).toBe(1);
    expect(participants.every((p) => p.consent)).toBe(true);
  });
});

describe('forms limits', () => {
  it('throws when fewer than 6 people', () => {
    const sheet: SheetData = {
      headers: ['お名前'],
      rows: [['a'], ['b'], ['c'], ['d'], ['e']],
    };
    expect(() => toParticipants(sheet, guessColumns(sheet.headers))).toThrow();
  });
});

describe('forms sample-15', () => {
  it('imports 15 people all with intro, hobby and consent', () => {
    const file = path.join(process.cwd(), 'public', 'samples', 'sample-15.xlsx');
    const sheet = readSheet(new Uint8Array(readFileSync(file)));
    const { participants, warnings } = toParticipants(sheet, guessColumns(sheet.headers));
    expect(participants.length).toBe(15);
    expect(warnings).toEqual([]);
    expect(participants.filter((p) => !p.consent).length).toBe(0);
    for (const p of participants) {
      expect(p.intro).not.toBe('');
      expect(p.hobby).not.toBe('');
    }
    const categories = new Set(participants.map((p) => p.category));
    for (const c of ['学生', '教員', '職員', '企業'] as const) {
      expect(categories.has(c)).toBe(true);
    }
  });
});

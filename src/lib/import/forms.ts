// src/lib/import/forms.ts
// Excel → Participant[]。ブラウザ内で解析し、ファイルはサーバーに送らない。
// ブラウザとスクリプトの両方から使う純粋関数。
import * as XLSX from 'xlsx';
import type { Category, Participant } from '../types';
import { normalizeAffiliation, normalizeHobby, normalizeIntro, normalizeName } from './normalize';

export type FieldKey = 'name' | 'affiliation' | 'category' | 'intro' | 'hobby' | 'consent';
export interface SheetData {
  headers: string[];
  rows: string[][];
}
export type ColumnMap = Partial<Record<FieldKey, number>>; // 見出しの列番号

export function readSheet(data: ArrayBuffer | Uint8Array): SheetData {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][];
  const all = aoa.map((row) => row.map((cell) => String(cell)));
  const headers = (all[0] ?? []).map((h) => h.trim());
  // すべて空の行は捨てる。
  const rows = all.slice(1).filter((row) => row.some((cell) => cell.trim() !== ''));
  return { headers, rows };
}

// 見出しは前後の空白を除き、比較には NFKC で正規化した小文字を使う。
function normHeader(s: string): string {
  return s.trim().normalize('NFKC').toLowerCase();
}

function findFirst(headers: string[], words: string[], exclude?: number): number | undefined {
  const norms = headers.map(normHeader);
  const keys = words.map((w) => w.normalize('NFKC').toLowerCase());
  const idx = norms.findIndex((h, i) => i !== exclude && keys.some((k) => h.includes(k)));
  return idx >= 0 ? idx : undefined;
}

function findLast(headers: string[], words: string[]): number | undefined {
  const norms = headers.map(normHeader);
  const keys = words.map((w) => w.normalize('NFKC').toLowerCase());
  for (let i = norms.length - 1; i >= 0; i -= 1) {
    if (keys.some((k) => norms[i].includes(k))) return i;
  }
  return undefined;
}

export function guessColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  // 名前は最後に一致した列（質問の「お名前」を、自動の「名前」より優先するため）。
  const name = findLast(headers, ['お名前', '氏名', '名前', 'name']);
  if (name !== undefined) map.name = name;
  const affiliation = findFirst(headers, ['所属']);
  if (affiliation !== undefined) map.affiliation = affiliation;
  const category = findFirst(headers, ['区分']);
  if (category !== undefined) map.category = category;
  const intro = findFirst(headers, ['自己紹介']);
  if (intro !== undefined) map.intro = intro;
  // 最近ハマっていることは、自己紹介に使った列を除いて最初に一致した列。
  const hobby = findFirst(headers, ['ハマ', 'はま', '最近'], intro);
  if (hobby !== undefined) map.hobby = hobby;
  const consent = findFirst(headers, ['同意']);
  if (consent !== undefined) map.consent = consent;
  return map;
}

function mapCategory(value: string): Category {
  if (value.includes('学生')) return '学生';
  if (['教員', '教授', '准教授', '講師', '助教'].some((k) => value.includes(k))) return '教員';
  if (value.includes('職員')) return '職員';
  if (['企業', '会社'].some((k) => value.includes(k))) return '企業';
  if (['自治体', '行政', '官公庁'].some((k) => value.includes(k))) return '自治体';
  return 'その他';
}

const CONSENT_NEGATIVES = ['しない', 'いいえ', '不可', 'no'];

export function previewParticipants(
  sheet: SheetData,
  map: ColumnMap,
): { participants: Participant[]; skippedEmptyName: number; warnings: string[]; validationError: string | null } {
  const warnings: string[] = [];
  const cell = (row: string[], key: FieldKey): string => {
    const col = map[key];
    return col === undefined ? '' : (row[col] ?? '');
  };
  if (map.consent === undefined) {
    warnings.push('同意の列がないため、全員を同意として扱います（デモ用）');
  }

  const participants: Participant[] = [];
  let skippedEmptyName = 0;
  for (const row of sheet.rows) {
    // 名前・所属：改行を空白に、連続する空白を1つに、前後の空白を除く。
    const name = normalizeName(cell(row, 'name'));
    if (name === '') {
      skippedEmptyName += 1;
      continue;
    }
    const affiliation = normalizeAffiliation(cell(row, 'affiliation'));
    const category = map.category === undefined ? 'その他' : mapCategory(cell(row, 'category'));
    const hasConsentColumn = map.consent !== undefined;
    const consentValue = cell(row, 'consent').trim();
    const consent = hasConsentColumn
      ? consentValue !== '' && !CONSENT_NEGATIVES.some((w) => consentValue.includes(w))
      : true;
    let intro = normalizeIntro(cell(row, 'intro'));
    let hobby = normalizeHobby(cell(row, 'hobby'));
    // 同意なしの人は、自己紹介と一言を空にしてから保存する。
    if (!consent) {
      intro = '';
      hobby = '';
    }
    participants.push({
      id: `P${String(participants.length + 1).padStart(3, '0')}`,
      name,
      affiliation,
      category,
      intro,
      hobby,
      consent,
    });
  }

  let validationError: string | null = null;
  if (map.name === undefined) validationError = '名前の列を選んでください。名前がないと受付で渡せません';
  else if (participants.length < 6) validationError = `取り込む参加者が6人未満です（${participants.length}人）。回答が6人以上あるExcelを選んでください`;
  else if (participants.length > 300) validationError = `取り込む参加者が300人を超えています（${participants.length}人）。300人以下に絞ってください`;
  return { participants, skippedEmptyName, warnings, validationError };
}

export function toParticipants(sheet: SheetData, map: ColumnMap): {
  participants: Participant[]; skippedEmptyName: number; warnings: string[];
} {
  const { validationError, ...preview } = previewParticipants(sheet, map);
  if (validationError) throw new Error(validationError);
  return preview;
}

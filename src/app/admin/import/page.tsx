// src/app/admin/import/page.tsx
// 回答の取り込み。ファイルはサーバーに送らない。
'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  guessColumns,
  readSheet,
  toParticipants,
  type ColumnMap,
  type FieldKey,
  type SheetData,
} from '@/lib/import/forms';
import { useHydrated, useStore } from '@/lib/store';
import type { Participant } from '@/lib/types';

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'name', label: '名前（必須）' },
  { key: 'affiliation', label: '所属' },
  { key: 'category', label: '区分' },
  { key: 'intro', label: '自己紹介' },
  { key: 'hobby', label: '最近ハマっていること' },
  { key: 'consent', label: '同意' },
];

interface Parsed {
  sheet: SheetData;
  map: ColumnMap;
  participants: Participant[];
  skippedEmptyName: number;
  warnings: string[];
}

function parseBuffer(buf: ArrayBuffer): Parsed {
  const sheet = readSheet(buf);
  if (sheet.headers.length === 0 || sheet.headers.every((h) => h === '')) {
    throw new Error('見出し行が見つかりません。Formsの「Excelで開く」で落としたxlsxを選んでください');
  }
  const map = guessColumns(sheet.headers);
  const { participants, skippedEmptyName, warnings } = toParticipants(sheet, map);
  return { sheet, map, participants, skippedEmptyName, warnings };
}

export default function ImportPage(): React.JSX.Element {
  const hydrated = useHydrated();
  const setParticipants = useStore((s) => s.setParticipants);
  const hasGeneration = useStore((s) => s.params !== null || Object.keys(s.assignments).length > 0);
  const importedCount = useStore((s) => s.participants.length);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  const loadBuffer = (buf: ArrayBuffer, name: string): void => {
    setError(null);
    setDone(false);
    if (!name.toLowerCase().endsWith('.xlsx')) {
      setParsed(null);
      setError('xlsxファイルを選んでください。Formsの「Excelで開く」で落としたファイルを使います');
      return;
    }
    try {
      setParsed(parseBuffer(buf));
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    loadBuffer(await file.arrayBuffer(), file.name);
  };

  const onSample = async (kind: 'sample-40' | 'sample-200'): Promise<void> => {
    try {
      const res = await fetch(`/samples/${kind}.xlsx`);
      if (!res.ok) throw new Error('サンプルを読み込めませんでした');
      loadBuffer(await res.arrayBuffer(), `${kind}.xlsx`);
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const changeColumn = (key: FieldKey, index: number | undefined): void => {
    if (!parsed) return;
    const map = { ...parsed.map };
    if (index === undefined) delete map[key];
    else map[key] = index;
    try {
      const { participants, skippedEmptyName, warnings } = toParticipants(parsed.sheet, map);
      setParsed({ ...parsed, map, participants, skippedEmptyName, warnings });
      setError(null);
    } catch (e) {
      setParsed({ ...parsed, map, participants: [], skippedEmptyName: 0, warnings: [] });
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const cellOf = (row: string[], key: FieldKey): string => {
    const col = parsed?.map[key];
    return col === undefined ? '' : (row[col] ?? '');
  };

  const withIntroOrHobby =
    parsed?.participants.filter((p) => p.intro !== '' || p.hobby !== '').length ?? 0;
  const withoutConsent = parsed?.participants.filter((p) => !p.consent).length ?? 0;

  const doImport = (): void => {
    if (!parsed || parsed.participants.length === 0) return;
    if (parsed.map.name === undefined) {
      setError('名前の列を選んでください。名前がないと受付で渡せません');
      return;
    }
    if (hasGeneration && !window.confirm('生成結果は消えます。取り込みますか？')) return;
    setParticipants(parsed.participants);
    setDone(true);
  };

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold">1 取り込み</h1>
      {importedCount > 0 && <p className="text-sm text-gray-600">取り込み済み：{importedCount}人</p>}

      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded border px-3 py-2 text-sm">
          Excelファイルを選ぶ（.xlsx）
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        <button type="button" onClick={() => void onSample('sample-40')} className="rounded border px-3 py-2 text-sm">
          サンプル40人
        </button>
        <button type="button" onClick={() => void onSample('sample-200')} className="rounded border px-3 py-2 text-sm">
          サンプル200人
        </button>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {parsed && parsed.participants.length > 0 && (
        <>
          <section>
            <h2 className="mb-2 font-bold">列の割り当て</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {FIELDS.map((field) => (
                <label key={field.key} className="flex items-center gap-2 text-sm">
                  <span className="w-40 shrink-0">{field.label}</span>
                  <select
                    value={parsed.map[field.key] ?? ''}
                    onChange={(e) => changeColumn(field.key, e.target.value === '' ? undefined : Number(e.target.value))}
                    className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1"
                  >
                    <option value="">（使わない）</option>
                    {parsed.sheet.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `（空の見出し${i + 1}）`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {parsed.warnings.map((w) => (
              <p key={w} className="mt-2 text-sm text-yellow-700">
                {w}
              </p>
            ))}
          </section>

          <section>
            <h2 className="mb-2 font-bold">プレビュー（先頭10行）</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1 text-left">名前</th>
                    <th className="border px-2 py-1 text-left">所属</th>
                    <th className="border px-2 py-1 text-left">区分</th>
                    <th className="border px-2 py-1 text-left">自己紹介（先頭30文字）</th>
                    <th className="border px-2 py-1 text-left">一言</th>
                    <th className="border px-2 py-1 text-left">同意</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.sheet.rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{cellOf(row, 'name')}</td>
                      <td className="border px-2 py-1">{cellOf(row, 'affiliation')}</td>
                      <td className="border px-2 py-1">{cellOf(row, 'category')}</td>
                      <td className="border px-2 py-1">{cellOf(row, 'intro').slice(0, 30)}</td>
                      <td className="border px-2 py-1">{cellOf(row, 'hobby')}</td>
                      <td className="border px-2 py-1">{cellOf(row, 'consent')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-bold">集計</h2>
            <ul className="list-inside list-disc text-sm">
              <li>取り込む人数：{parsed.participants.length}人</li>
              <li>自己紹介か一言がある人数：{withIntroOrHobby}人</li>
              <li>同意なしの人数：{withoutConsent}人</li>
              <li>名前が空で除外した行数：{parsed.skippedEmptyName}行</li>
            </ul>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={doImport}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white"
            >
              この内容で取り込む
            </button>
            {done && (
              <Link href="/admin/generate" className="text-sm font-bold underline">
                生成へ進む
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// src/app/admin/import/page.tsx
// 回答の読み込み。ファイルはサーバーに送らない。
'use client';

import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Notice } from '@/components/ui/Notice';
import { StatCard } from '@/components/ui/StatCard';
import { IconUpload } from '@/components/ui/icons';
import { PageFooter } from '@/components/PageFooter';
import { PageHeader } from '@/components/PageHeader';
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
  { key: 'name', label: '名前' },
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

interface ImportError {
  title: string;
  body?: string;
}

function countOf(message: string): string {
  const m = message.match(/（(\d+)人）/);
  return m?.[1] ?? '';
}

function toImportError(e: unknown): ImportError {
  if (typeof e === 'object' && e !== null && 'title' in e && typeof (e as { title: unknown }).title === 'string') {
    const { title, body } = e as { title: string; body?: unknown };
    return typeof body === 'string' ? { title, body } : { title };
  }
  const message = e instanceof Error ? e.message : String(e);
  if (message.includes('6人未満')) {
    return { title: `人数が少なすぎます（${countOf(message)}人）`, body: '共有タグを作るには6人以上必要です。' };
  }
  if (message.includes('300人を超え')) {
    return { title: `人数が多すぎます（${countOf(message)}人）`, body: '300人までにしてください。' };
  }
  return { title: message };
}

function parseBuffer(buf: ArrayBuffer): Parsed {
  const sheet = readSheet(buf);
  if (sheet.headers.length === 0 || sheet.headers.every((h) => h === '')) {
    throw { title: '表の見出しが見つかりません', body: '1行目に質問の見出しがあるか確かめてください。' };
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
  const [error, setError] = useState<ImportError | null>(null);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingImport, setPendingImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  const loadBuffer = (buf: ArrayBuffer, name: string): void => {
    setError(null);
    setDone(false);
    if (!name.toLowerCase().endsWith('.xlsx')) {
      setParsed(null);
      setError({
        title: 'Excelファイル（.xlsx）を選んでください',
        body: 'Formsの「回答」タブにある「Excelで開く」で保存したファイルを使います。',
      });
      return;
    }
    try {
      setParsed(parseBuffer(buf));
    } catch (e) {
      setParsed(null);
      setError(toImportError(e));
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
      setError(toImportError(e));
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
      setError(toImportError(e));
    }
  };

  const firstRowValue = (key: FieldKey): string => {
    const col = parsed?.map[key];
    if (col === undefined) return '';
    return (parsed?.sheet.rows[0]?.[col] ?? '');
  };

  const withIntroOrHobby =
    parsed?.participants.filter((p) => p.intro !== '' || p.hobby !== '').length ?? 0;
  const withoutConsent = parsed?.participants.filter((p) => !p.consent).length ?? 0;

  const commitImport = (): void => {
    if (!parsed || parsed.participants.length === 0) return;
    setParticipants(parsed.participants);
    setDone(true);
  };

  const doImport = (): void => {
    if (!parsed || parsed.participants.length === 0) return;
    if (parsed.map.name === undefined) {
      setError({ title: '名前の列を選んでください。名前がないと受付で渡せません' });
      return;
    }
    if (hasGeneration) {
      setPendingImport(true);
      return;
    }
    commitImport();
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        step={1}
        title="回答を読み込む"
        description="参加登録フォーム（Microsoft Forms）の回答をExcelで書き出し、ここで読み込みます。"
      />

      {done ? (
        <Notice tone="success" title={`${importedCount}人分を読み込みました`} />
      ) : (
        importedCount > 0 && (
          <Notice tone="info" title={`${importedCount}人分を読み込み済みです`}>
            別のファイルを読み込むと、今の回答とタグは置き換わります。
          </Notice>
        )
      )}

      {error !== null && <Notice tone="danger" title={error.title}>{error.body}</Notice>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void onFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center ${
          dragging ? 'border-adm-primary bg-adm-primary-soft' : 'border-adm-line-strong bg-adm-surface'
        }`}
      >
        <span className="text-adm-sub">
          <IconUpload size={32} />
        </span>
        <Button variant="primary" size="md" onClick={() => fileRef.current?.click()}>
          Excelファイルを選ぶ
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <p className="text-adm-sm text-adm-sub">ここにファイルをドラッグしても読み込めます（.xlsx）</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-adm-sm text-adm-sub">
        <span>まず試してみるとき：</span>
        <Button variant="secondary" size="sm" onClick={() => void onSample('sample-40')}>
          サンプル（40人）で試す
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void onSample('sample-200')}>
          サンプル（200人）で試す
        </Button>
      </div>

      {parsed !== null && parsed.participants.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3">
            <StatCard label="読み込む人数" value={parsed.participants.length} unit="人" />
            <StatCard label="回答あり" value={withIntroOrHobby} unit="人" />
            <StatCard
              label="同意なし"
              value={withoutConsent}
              unit="人"
              note={withoutConsent > 0 ? 'この人たちの回答は使いません' : undefined}
            />
            <StatCard label="名前が空で除外" value={parsed.skippedEmptyName} unit="行" />
          </div>

          {parsed.warnings.length > 0 && (
            <Notice tone="warn" title="注意">
              <ul className="list-inside list-disc">
                {parsed.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Notice>
          )}

          <div className="flex flex-wrap items-start gap-5">
            <Card className="min-w-0 flex-[1_1_360px] p-5">
              <CardTitle>列の割り当て</CardTitle>
              <p className="mt-1 text-adm-sm text-adm-sub">自動で選んだ列が違うときだけ直してください。</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-adm-table">
                  <thead>
                    <tr className="bg-adm-head text-left text-adm-ink2">
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">項目</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">Excelの列</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">1行目の値</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELDS.map((field) => (
                      <tr key={field.key}>
                        <td className="whitespace-nowrap border-b border-adm-divider px-4 py-3 align-top">
                          <span className="inline-flex items-center gap-1.5">
                            {field.label}
                            {field.key === 'name' && <Badge tone="danger">必須</Badge>}
                          </span>
                        </td>
                        <td className="border-b border-adm-divider px-4 py-3 align-top">
                          <select
                            value={parsed.map[field.key] ?? ''}
                            onChange={(e) => changeColumn(field.key, e.target.value === '' ? undefined : Number(e.target.value))}
                            className="min-h-10 w-full rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
                          >
                            <option value="">（使わない）</option>
                            {parsed.sheet.headers.map((h, i) => (
                              <option key={i} value={i}>
                                {h || `（空の見出し${i + 1}）`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b border-adm-divider px-4 py-3 align-top text-adm-ink2">
                          {firstRowValue(field.key)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="min-w-0 flex-[999_1_480px] p-5">
              <CardTitle>先頭10行のプレビュー</CardTitle>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-adm-table">
                  <thead>
                    <tr className="bg-adm-head text-left text-adm-ink2">
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">名前</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">所属</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">区分</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">自己紹介</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">一言</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">同意</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.participants.slice(0, 10).map((p) => (
                      <tr key={p.id}>
                        <td className="border-b border-adm-divider px-4 py-3 align-top font-bold">{p.name}</td>
                        <td className="border-b border-adm-divider px-4 py-3 align-top text-adm-ink2">{p.affiliation}</td>
                        <td className="border-b border-adm-divider px-4 py-3 align-top text-adm-ink2">{p.category}</td>
                        <td className="border-b border-adm-divider px-4 py-3 align-top">{p.intro.slice(0, 30)}…</td>
                        <td className="border-b border-adm-divider px-4 py-3 align-top">{p.hobby}</td>
                        <td className="border-b border-adm-divider px-4 py-3 align-top">
                          {p.consent ? 'あり' : <Badge tone="warn">なし</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingImport}
        title="読み込み直しますか？"
        body="今のタグと手で直した内容は消えます。先に作業データを保存しておくと戻せます。"
        confirmLabel="読み込む"
        tone="danger"
        onConfirm={() => {
          setPendingImport(false);
          commitImport();
        }}
        onCancel={() => setPendingImport(false)}
      />

      <PageFooter
        left={
          parsed !== null && parsed.participants.length > 0 ? (
            <Button variant="primary" size="lg" onClick={doImport} disabled={parsed.participants.length === 0}>
              この内容で読み込む（{parsed.participants.length}人）
            </Button>
          ) : undefined
        }
        next={{ href: '/admin/generate', label: 'タグを作る', disabled: !done && importedCount === 0 }}
      />
    </div>
  );
}

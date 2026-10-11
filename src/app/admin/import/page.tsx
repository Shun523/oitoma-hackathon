// src/app/admin/import/page.tsx
// 回答の読み込み。ファイルはサーバーに送らない。
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FitToWidth } from '@/components/FitToWidth';
import { StickerSet } from '@/components/StickerSet';
import { toOitomaNotice } from '@/components/oitoma-error';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardTitle, CardToolbar } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Notice } from '@/components/ui/Notice';
import { Segmented } from '@/components/ui/Segmented';
import { StatCard } from '@/components/ui/StatCard';
import { TagChip } from '@/components/ui/TagChip';
import { showToast } from '@/components/ui/Toast';
import { IconCheck, IconPrinter, IconSparkle, IconTrash, IconUpload, IconUserPlus } from '@/components/ui/icons';
import { PageFooter } from '@/components/PageFooter';
import { PageHeader } from '@/components/PageHeader';
import {
  guessColumns,
  readSheet,
  previewParticipants,
  type ColumnMap,
  type FieldKey,
  type SheetData,
} from '@/lib/import/forms';
import { makeManualParticipant } from '@/lib/import/manual';
import { createHttpLlmApi } from '@/lib/pipeline/llm-api';
import { generationOperation } from '@/lib/pipeline/operation';
import { generateForOne, type AddStepKey } from '@/lib/pipeline/add-one';
import { isGenerated } from '@/lib/state-ops';
import { useHydrated, useStore } from '@/lib/store';
import type { Assignment, Category, Extraction, Participant } from '@/lib/types';

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
  validationError: string | null;
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
  return { sheet, map, ...previewParticipants(sheet, map) };
}

type LateStep = { status: 'pending' | 'running' | 'done' | 'error'; ms?: number };

type LateState =
  | { phase: 'idle' }
  | { phase: 'working'; person: Participant; steps: Record<AddStepKey, LateStep>; startedAt: number }
  | {
      phase: 'done';
      person: Participant;
      steps: Record<AddStepKey, LateStep>;
      result: { extraction: Extraction; ranking: string[]; assignment: Assignment };
      elapsedSec: number;
    }
  | { phase: 'error'; person: Participant; steps: Record<AddStepKey, LateStep>; message: string };

const INPUT_CLS =
  'min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary';

const LATE_STATUS_WORD: Record<LateStep['status'], string> = {
  pending: '待機中',
  running: '実行中',
  done: '完了',
  error: 'エラー',
};

const LATE_STEPS: { key: AddStepKey; name: string; owner: 'oitoma' | 'program' }[] = [
  { key: 'extract', name: '話題の読み取り', owner: 'oitoma' },
  { key: 'rank', name: '共有タグを選ぶ', owner: 'oitoma' },
  { key: 'assign', name: '割り当て', owner: 'program' },
];

function formatAddedAt(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ImportPage(): React.JSX.Element {
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const setParticipants = useStore((s) => s.setParticipants);
  const hasGeneration = useStore((s) => s.params !== null || Object.keys(s.assignments).length > 0);
  const importedCount = useStore((s) => s.participants.length);
  const participants = useStore((s) => s.participants);
  const candidates = useStore((s) => s.candidates);
  const activeTagIds = useStore((s) => s.activeTagIds);
  const assignments = useStore((s) => s.assignments);
  const generatedAt = useStore((s) => s.generatedAt);
  const generatingAll = useStore((s) => s.running);
  const printPreset = useStore((s) => s.printOptions.preset);
  const addParticipant = useStore((s) => s.addParticipant);
  const removeManualParticipant = useStore((s) => s.removeManualParticipant);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingImport, setPendingImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'excel' | 'manual'>('excel');
  const [mName, setMName] = useState('');
  const [mAffiliation, setMAffiliation] = useState('');
  const [mCategory, setMCategory] = useState<Category>('その他');
  const [mIntro, setMIntro] = useState('');
  const [mHobby, setMHobby] = useState('');
  const [mConsent, setMConsent] = useState(true);
  const [late, setLate] = useState<LateState>({ phase: 'idle' });
  const nameRef = useRef<HTMLInputElement>(null);
  const lateController = useRef<AbortController | null>(null);

  // 初回だけURLを見てタブを合わせる（SSRと合わせるため描画後に変える）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get('tab') === 'manual') setTab('manual');
  }, []);

  useEffect(() => () => {
    const controller = lateController.current;
    if (controller) {
      controller.abort();
      useStore.getState().finishOperation(controller);
    }
  }, []);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  const afterGen = isGenerated({ generatedAt, activeTagIds });

  const switchTab = (next: 'excel' | 'manual'): void => {
    setTab(next);
    router.replace(next === 'manual' ? `${pathname}?tab=manual` : `${pathname}?tab=excel`);
  };

  const resetManualForm = (focus: boolean): void => {
    setMName('');
    setMAffiliation('');
    setMCategory('その他');
    setMIntro('');
    setMHobby('');
    setMConsent(true);
    if (focus) nameRef.current?.focus();
  };

  const manualInput = (): { name: string; affiliation: string; category: Category; intro: string; hobby: string; consent: boolean } => ({
    name: mName,
    affiliation: mAffiliation,
    category: mCategory,
    intro: mIntro,
    hobby: mHobby,
    consent: mConsent,
  });

  const startLate = (): void => {
    const cur = useStore.getState();
    if (cur.running || cur.participants.length >= 300 || mName.trim() === '') return;
    const person = makeManualParticipant(manualInput(), participants);
    const controller = cur.beginOperation();
    if (!controller) return;
    lateController.current = controller;
    const startedAt = Date.now();
    setLate({
      phase: 'working',
      person,
      steps: { extract: { status: 'pending' }, rank: { status: 'pending' }, assign: { status: 'pending' } },
      startedAt,
    });
    generateForOne({
      person,
      candidates: cur.candidates,
      activeTagIds: cur.activeTagIds,
      assignments: cur.assignments,
      api: createHttpLlmApi(controller.signal),
      onStep: (key, status, ms) => {
        if (!generationOperation.isCurrent(controller)) return;
        setLate((prev) =>
          prev.phase === 'working' ? { ...prev, steps: { ...prev.steps, [key]: { status, ms } } } : prev,
        );
      },
      onLog: (log) => { if (generationOperation.isCurrent(controller)) cur.appendLlmLog(log); },
      signal: controller.signal,
    })
      .then(({ extraction, ranking, assignment }) => {
        if (!generationOperation.isCurrent(controller)) return;
        cur.finishOperation(controller);
        useStore.getState().addLatecomer({ participant: person, extraction, ranking, assignment });
        resetManualForm(false);
        const elapsedSec = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
        setLate((prev) =>
          prev.phase === 'working'
            ? { phase: 'done', person: prev.person, steps: prev.steps, result: { extraction, ranking, assignment }, elapsedSec }
            : prev,
        );
      })
      .catch((e: unknown) => {
        if (lateController.current !== controller) return;
        if (controller.signal.aborted) {
          setLate({ phase: 'idle' });
          return;
        }
        const message = e instanceof Error ? e.message : String(e);
        setLate((prev) => {
          if (prev.phase !== 'working') return prev;
          const steps = { ...prev.steps };
          const failed = (Object.keys(steps) as AddStepKey[]).find((k) => steps[k].status !== 'done');
          if (failed) steps[failed] = { status: 'error' };
          return { phase: 'error', person: prev.person, steps, message };
        });
      })
      .finally(() => {
        cur.finishOperation(controller);
        if (lateController.current === controller) lateController.current = null;
      });
  };

  const submitBefore = (): void => {
    if (useStore.getState().running || mName.trim() === '') return;
    const person = makeManualParticipant(manualInput(), participants);
    addParticipant(person);
    showToast(`${person.name}さんを追加しました`);
    resetManualForm(true);
  };

  const nameBlank = mName.trim() === '';
  const lateActive = late.phase === 'working' || late.phase === 'done';
  const full = participants.length >= 300;
  const submitDisabled = nameBlank || lateActive || generatingAll || full;
  const disableReason = full
    ? '300人までです。'
    : generatingAll
      ? 'タグを作っている途中です。終わってから追加してください。'
      : null;
  const sameName = mName.trim() !== '' && participants.some((p) => p.name.trim() === mName.trim());
  const manualPeople = participants.filter((p) => p.source === 'manual');
  const candidateLabelById = new Map(candidates.map((c) => [c.id, c.label]));
  const lateError = late.phase === 'error' ? toOitomaNotice(late.message) : null;
  const lateErrorBody =
    late.phase === 'error' && late.message.includes('混み合っています')
      ? '数分待ってから「もう一度試す」を押してください。'
      : (lateError?.body ?? '');

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
      const next = parseBuffer(buf);
      setParsed(next);
      if (next.validationError) setError(toImportError(new Error(next.validationError)));
    } catch (e) {
      setParsed(null);
      setError(toImportError(e));
    }
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    loadBuffer(await file.arrayBuffer(), file.name);
  };

  const onSample = async (kind: 'sample-15' | 'sample-40' | 'sample-200'): Promise<void> => {
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
    const next = { ...parsed, map, ...previewParticipants(parsed.sheet, map) };
    setParsed(next);
    setError(next.validationError ? toImportError(new Error(next.validationError)) : null);
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
    if (!parsed || parsed.validationError) return;
    setParticipants(parsed.participants);
    setDone(true);
  };

  const doImport = (): void => {
    if (!parsed || parsed.validationError) return;
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

      <Segmented
        disabled={late.phase === 'working'}
        items={[
          { key: 'excel', label: 'Excelから読み込む', pressed: tab === 'excel', onClick: () => switchTab('excel') },
          { key: 'manual', label: '1人分を手入力で追加', pressed: tab === 'manual', onClick: () => switchTab('manual') },
        ]}
      />

      {tab === 'excel' && (
        <>
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
        <Button variant="secondary" size="sm" onClick={() => void onSample('sample-15')}>
          サンプル（15人）で試す
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void onSample('sample-40')}>
          サンプル（40人）で試す
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void onSample('sample-200')}>
          サンプル（200人）で試す
        </Button>
      </div>

      {parsed !== null && (
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

        </>
      )}

      {tab === 'manual' && (
        <>
          <Card className="flex flex-col gap-4 p-5">
            <CardTitle>1人分を手入力で追加</CardTitle>
            <p className="text-adm-sm text-adm-ink2">
              当日の飛び入り参加や、その場で試してもらうときに使います。名前はおいとまに送りません。
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (submitDisabled) return;
                if (afterGen) startLate();
                else submitBefore();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-adm-xs text-adm-sub">
                  <span className="inline-flex items-center gap-1">
                    お名前 <Badge tone="danger">必須</Badge>
                  </span>
                  <input
                    ref={nameRef}
                    type="text"
                    value={mName}
                    maxLength={30}
                    placeholder="例：岡山 花子"
                    disabled={lateActive}
                    onChange={(e) => setMName(e.target.value)}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-adm-xs text-adm-sub">
                  <span>所属</span>
                  <input
                    type="text"
                    value={mAffiliation}
                    maxLength={40}
                    placeholder="例：工学部 情報系"
                    disabled={lateActive}
                    onChange={(e) => setMAffiliation(e.target.value)}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-adm-xs text-adm-sub">
                  <span>区分</span>
                  <select
                    value={mCategory}
                    disabled={lateActive}
                    onChange={(e) => setMCategory(e.target.value as Category)}
                    className={INPUT_CLS}
                  >
                    {(['学生', '教員', '職員', '企業', '自治体', 'その他'] as const).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <span />
                <label className="flex flex-col gap-1 text-adm-xs text-adm-sub sm:col-span-2">
                  <span className="flex items-center justify-between gap-2">
                    <span>自己紹介（任意）</span>
                    <span>{mIntro.length}/400</span>
                  </span>
                  <textarea
                    rows={3}
                    value={mIntro}
                    maxLength={400}
                    placeholder="例：発酵食品の成分を分析しています。休日はパンを焼きます。"
                    disabled={lateActive}
                    onChange={(e) => setMIntro(e.target.value)}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-adm-xs text-adm-sub sm:col-span-2">
                  <span className="flex items-center justify-between gap-2">
                    <span>最近ハマっていること（任意）</span>
                    <span>{mHobby.length}/100</span>
                  </span>
                  <input
                    type="text"
                    value={mHobby}
                    maxLength={100}
                    placeholder="例：岡山のパン屋めぐり"
                    disabled={lateActive}
                    onChange={(e) => setMHobby(e.target.value)}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="flex items-center gap-2 text-adm-table sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={mConsent}
                    disabled={lateActive}
                    onChange={(e) => setMConsent(e.target.checked)}
                    className="size-4 accent-adm-primary"
                  />
                  名札への掲載に同意しています
                </label>
                {!mConsent && (
                  <p className="text-adm-xs text-adm-warn-ink sm:col-span-2">
                    同意がないと、自己紹介と一言は使わず、所属と区分からタグを作ります。
                  </p>
                )}
              </div>
              {sameName && (
                <div className="mt-4">
                  <Notice tone="warn" title="同じ名前の人がいます">
                    このまま追加できます。シールで見分けられるよう、所属も入れてください。
                  </Notice>
                </div>
              )}
              {afterGen && (
                <div className="mt-4">
                  <Notice tone="info" title="タグはもう作ってあります">
                    この人の分だけおいとまでタグを作ります。ほかの人のタグは変わりません。
                  </Notice>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                {disableReason !== null && <span className="text-adm-sm text-adm-sub">{disableReason}</span>}
                {afterGen ? (
                  <Button
                    variant="primary"
                    size="md"
                    icon={<IconSparkle size={16} />}
                    disabled={submitDisabled}
                    onClick={startLate}
                  >
                    追加してタグを作る
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    icon={<IconUserPlus size={16} />}
                    disabled={submitDisabled}
                    onClick={submitBefore}
                  >
                    追加する
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {late.phase !== 'idle' && (
            <Card className="flex flex-col gap-4 p-5">
              <CardTitle>
                {late.phase === 'done'
                  ? `${late.person.name}さんのシール`
                  : `${late.person.name}さんのタグを作っています`}
              </CardTitle>
              <ol className="flex flex-col">
                {LATE_STEPS.map((s, i) => {
                  const st = late.steps[s.key];
                  const circle =
                    st.status === 'done' ? (
                      <span className="flex size-8 items-center justify-center rounded-full bg-adm-done text-white">
                        <IconCheck size={16} />
                      </span>
                    ) : st.status === 'running' ? (
                      <span className="flex size-8 items-center justify-center rounded-full bg-adm-primary text-adm-sm font-bold text-white">
                        {i + 1}
                      </span>
                    ) : st.status === 'error' ? (
                      <span className="flex size-8 items-center justify-center rounded-full bg-adm-danger text-adm-sm font-bold text-white">
                        !
                      </span>
                    ) : (
                      <span className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-adm-line-strong text-adm-sm font-bold text-adm-sub">
                        {i + 1}
                      </span>
                    );
                  return (
                    <li
                      key={s.key}
                      className="grid grid-cols-[32px_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-adm-divider py-3 last:border-b-0"
                    >
                      {circle}
                      <div className="flex flex-wrap items-center gap-2 font-bold">
                        <span>{s.name}</span>
                        <Badge tone={s.owner === 'oitoma' ? 'oitoma' : 'neutral'}>
                          {s.owner === 'oitoma' ? 'おいとま' : 'プログラム'}
                        </Badge>
                      </div>
                      <div className="text-right text-adm-sm text-adm-sub tabular-nums">
                        <span>{LATE_STATUS_WORD[st.status]}</span>
                        {st.ms !== undefined && <span> {Math.max(1, Math.round(st.ms / 1000))}秒</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {late.phase === 'done' && (
                <>
                  <Notice tone="success" title={`シールができました（${late.elapsedSec}秒）`}>
                    ほかの人のタグは変わっていません。
                  </Notice>
                  <FitToWidth designWidthPx={760}>
                    <StickerSet
                      preset={printPreset}
                      personalTag={late.result.assignment.personalTag}
                      sharedTags={late.result.assignment.sharedTagIds.map(id => candidateLabelById.get(id) ?? '')}
                      name={late.person.name}
                    />
                  </FitToWidth>
                  <div>
                    <div className="text-adm-sm font-bold text-adm-ink2">同じタグの人</div>
                    <div className="mt-1 flex flex-col gap-2">
                      {late.result.assignment.sharedTagIds.map((tid) => {
                        const holders = participants.filter((p) =>
                          assignments[p.id]?.sharedTagIds.includes(tid),
                        );
                        const others = holders.filter((p) => p.id !== late.person.id).slice(0, 6);
                        const rest = holders.length - 1 - others.length;
                        return (
                          <div key={tid} className="flex flex-wrap items-center gap-2">
                            <TagChip kind="shared" label={candidateLabelById.get(tid) ?? tid} />
                            <span className="text-adm-sm text-adm-sub">会場に{holders.length}人</span>
                            {others.map((m) => (
                              <span key={m.id} className="rounded-full bg-adm-field px-2 py-0.5 text-adm-sm">
                                {m.name}
                              </span>
                            ))}
                            {rest > 0 && <span className="text-adm-sm text-adm-sub">ほか{rest}人</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/review?id=${late.person.id}`} className={buttonClass('secondary', 'md')}>
                      確認・修正で見る
                    </Link>
                    <Link href="/admin/print?only=manual" className={buttonClass('secondary', 'md')}>
                      <IconPrinter size={16} />
                      手入力で追加した人のシールを印刷
                    </Link>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        setLate({ phase: 'idle' });
                        nameRef.current?.focus();
                      }}
                    >
                      続けてもう1人追加
                    </Button>
                  </div>
                </>
              )}
              {late.phase === 'error' && lateError !== null && (
                <Notice
                  tone="danger"
                  title={lateError.title}
                  action={
                    <Button variant="primary" size="sm" onClick={startLate} disabled={generatingAll}>
                      もう一度試す
                    </Button>
                  }
                >
                  {lateErrorBody}
                </Notice>
              )}
            </Card>
          )}

          {manualPeople.length > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardToolbar>
                <CardTitle>手入力で追加した人（{manualPeople.length}人）</CardTitle>
              </CardToolbar>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-adm-table">
                  <thead>
                    <tr className="bg-adm-head text-left text-adm-ink2">
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">名前</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">追加した時刻</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">個性タグ</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">共有タグ</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualPeople.map((p) => {
                      const a = assignments[p.id];
                      return (
                        <tr key={p.id}>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            <span className="block font-bold">{p.name}</span>
                            <span className="block text-adm-xs text-adm-sub">
                              {p.id}・{p.category}
                            </span>
                          </td>
                          <td className="whitespace-nowrap border-b border-adm-divider px-4 py-3 align-top tabular-nums">
                            {formatAddedAt(p.addedAt)}
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            {a !== undefined ? (
                              <TagChip kind="personal" label={a.personalTag} />
                            ) : (
                              <span className="text-adm-sub">—</span>
                            )}
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            {a !== undefined && a.sharedTagIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {a.sharedTagIds.map((tid) => (
                                  <TagChip key={tid} kind="shared" label={candidateLabelById.get(tid) ?? tid} />
                                ))}
                              </div>
                            ) : (
                              <span className="text-adm-sm text-adm-sub">タグを作るときに一緒に作ります</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap border-b border-adm-divider px-4 py-3 align-top">
                            <Button variant="secondary" size="sm" icon={<IconTrash size={16} />} onClick={() => setPendingRemove(p.id)} disabled={generatingAll}>
                              取り消す
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
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

      <ConfirmDialog
        open={pendingRemove !== null}
        title={`${pendingRemove !== null ? (participants.find((p) => p.id === pendingRemove)?.name ?? '') : ''}さんを取り消しますか？`}
        body="この人の回答とタグを消します。ほかの人のタグは変わりません。"
        confirmLabel="取り消す"
        tone="danger"
        onConfirm={() => {
          const id = pendingRemove;
          setPendingRemove(null);
          if (id !== null) {
            const target = participants.find((p) => p.id === id);
            removeManualParticipant(id);
            if (target) showToast(`${target.name}さんを取り消しました`);
          }
        }}
        onCancel={() => setPendingRemove(null)}
      />

      <PageFooter
        left={
          tab === 'excel' && parsed !== null ? (
            <Button variant="primary" size="lg" onClick={doImport} disabled={parsed.validationError !== null || generatingAll}>
              この内容で読み込む（{parsed.participants.length}人）
            </Button>
          ) : undefined
        }
        next={{ href: '/admin/generate', label: 'タグを作る', disabled: !done && importedCount === 0 }}
      />
    </div>
  );
}

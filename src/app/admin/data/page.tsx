// src/app/admin/data/page.tsx
// 状態の書き出し・読み込み、公開用データの書き出し、消去。
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buildPublishedData } from '@/lib/publish';
import { appStateSchema, useHydrated, useStore } from '@/lib/store';
import type { AppState } from '@/lib/types';

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stamp(date: Date): string {
  const pad = (v: number): string => String(v).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export default function DataPage(): React.JSX.Element {
  const hydrated = useHydrated();
  const state = useStore((s) => s);
  const replaceAll = useStore((s) => s.replaceAll);
  const clearAll = useStore((s) => s.clearAll);
  const [maskNames, setMaskNames] = useState(true);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  const snapshot = (): AppState => ({
    version: 1,
    participants: state.participants,
    importedAt: state.importedAt,
    params: state.params,
    extractions: state.extractions,
    candidates: state.candidates,
    rankings: state.rankings,
    activeTagIds: state.activeTagIds,
    assignments: state.assignments,
    summary: state.summary,
    progress: state.progress,
    llmLog: state.llmLog,
    generatedAt: state.generatedAt,
    printOptions: state.printOptions,
  });
  const sizeKb = (new Blob([JSON.stringify(snapshot())]).size / 1024).toFixed(1);

  const onExport = (): void => {
    download(`nametag-state-${stamp(new Date())}.json`, `${JSON.stringify(snapshot(), null, 2)}\n`);
  };

  const onImport = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const parsed = appStateSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        window.alert('状態のJSONとして読めませんでした');
        return;
      }
      if (!window.confirm('いまの内容を上書きします。続けますか？')) return;
      replaceAll(parsed.data);
    } catch {
      window.alert('状態のJSONとして読めませんでした');
    }
  };

  const onPublish = (): void => {
    const published = buildPublishedData({
      participants: state.participants,
      assignments: state.assignments,
      candidates: state.candidates,
      activeTagIds: state.activeTagIds,
      summary: state.summary,
      maskNames,
    });
    download('published.json', `${JSON.stringify(published, null, 2)}\n`);
  };

  const onClear = (): void => {
    if (!window.confirm('保存中のデータをすべて消去します。よろしいですか？')) return;
    clearAll();
  };

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold">データ</h1>
      <p className="text-sm text-gray-600">保存中のデータ量：約{sizeKb}KB</p>

      <section className="space-y-2">
        <h2 className="font-bold">状態の書き出し・読み込み</h2>
        <p className="text-sm text-gray-600">発表では生成済みの状態を書き出し、発表用PCで読み込んで使います。</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onExport} className="rounded border px-4 py-2 text-sm">
            状態を書き出す
          </button>
          <label className="cursor-pointer rounded border px-4 py-2 text-sm">
            状態を読み込む
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => void onImport(e.target.files?.[0])}
            />
          </label>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">公開用データの書き出し</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={maskNames} onChange={(e) => setMaskNames(e.target.checked)} />
          名前を伏せる
        </label>
        <div>
          <button type="button" onClick={onPublish} className="rounded border px-4 py-2 text-sm">
            公開用データを書き出す
          </button>
        </div>
        <p className="text-sm text-gray-600">
          `src/data/published.json` を置き換えてpushすると、Vercelの公開トップに反映されます
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">消去</h2>
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-red-500 px-4 py-2 text-sm text-red-700"
        >
          すべて消去
        </button>
      </section>

      <p className="text-sm">
        <Link href="/admin/import" className="underline">
          取り込みへ戻る
        </Link>
      </p>
    </div>
  );
}

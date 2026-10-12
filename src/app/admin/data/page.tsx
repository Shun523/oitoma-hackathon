// src/app/admin/data/page.tsx
// 作業データの保存・読み込み、公開ページ用のファイルの書き出し、このPCのデータの消去。
'use client';

import { useRef, useState } from 'react';
import { buildPublishedData } from '@/lib/publish';
import { appStateSchema, useHydrated, useStore } from '@/lib/store';
import type { AppState } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Notice } from '@/components/ui/Notice';
import { IconSave, IconTrash } from '@/components/ui/icons';
import { showToast } from '@/components/ui/Toast';
import { PageFooter } from '@/components/PageFooter';
import { PageHeader } from '@/components/PageHeader';

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    showToast('作業データを保存しました');
  };

  const onPickFile = (file: File | undefined): void => {
    if (!file) return;
    setPendingFile(file);
  };

  const onImport = async (file: File): Promise<void> => {
    setImportError(null);
    try {
      const parsed = appStateSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        setImportError('作業データの内容や参照が正しくありません。正常なバックアップを選んでください。');
        return;
      }
      replaceAll(parsed.data);
      showToast('作業データを開きました');
    } catch {
      setImportError('作業データを読み込めませんでした。このアプリで保存したファイルを選んでください。');
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
    showToast('公開ページ用のファイルを書き出しました');
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="保存・バックアップ"
        description="作業データをファイルに保存したり、公開ページ用のファイルを書き出したりします。"
      />
      {importError && <Notice tone="danger" title="作業データを開けませんでした">{importError}</Notice>}

      <Card className="flex flex-col gap-3 p-5">
        <CardTitle>作業データ</CardTitle>
        <p className="text-adm-sm text-adm-ink2">
          発表や別のPCで続きをするときに使います。回答とタグをすべて含むので、許可された運用担当者だけに渡してください。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={<IconSave size={16} />} onClick={onExport}>
            作業データを保存
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            保存した作業データを開く
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              onPickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="text-adm-xs text-adm-sub">このPCに保存中のデータ：約{sizeKb}KB</p>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <CardTitle>公開ページ用のファイル</CardTitle>
        <p className="text-adm-sm text-adm-ink2">
          QRで開く公開ページに載せるデータです。自己紹介と一言は入りません。
        </p>
        <label className="flex items-center gap-2 text-adm-table">
          <input
            type="checkbox"
            checked={maskNames}
            onChange={(e) => setMaskNames(e.target.checked)}
            className="size-4 accent-adm-primary"
          />
          名前を伏せる（おすすめ）
        </label>
        <div>
          <Button variant="secondary" onClick={onPublish}>
            公開ページ用のファイルを書き出す
          </Button>
        </div>
        <Notice
          tone="info"
          title="公開ページ用のファイルは、運用担当者に渡してください。"
        >
          ngrokで公開する場合は、担当者がファイルを差し替えてアプリを再起動します。
        </Notice>
      </Card>

      <section className="flex flex-col gap-3 rounded-xl border border-adm-danger-line bg-adm-danger-bg p-5">
        <CardTitle>このPCからデータを消す</CardTitle>
        <p className="text-adm-sm text-adm-ink2">イベントが終わったら消してください。消すと元に戻せません。</p>
        <div>
          <Button variant="danger" icon={<IconTrash size={16} />} onClick={() => setConfirmClear(true)}>
            このPCからデータを消す
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={pendingFile !== null}
        title="保存した作業データを開きますか？"
        body="今のデータは置き換わります。"
        confirmLabel="開く"
        onConfirm={() => {
          const file = pendingFile;
          setPendingFile(null);
          if (file) void onImport(file);
        }}
        onCancel={() => setPendingFile(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="すべてのデータを消しますか？"
        body="回答、タグ、手で直した内容がこのPCから消えます。元には戻せません。"
        confirmLabel="消す"
        tone="danger"
        onConfirm={() => {
          setConfirmClear(false);
          clearAll();
        }}
        onCancel={() => setConfirmClear(false)}
      />

      <PageFooter />
    </div>
  );
}

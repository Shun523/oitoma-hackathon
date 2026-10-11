// src/components/AdminShell.tsx
// 管理画面の骨組み：左の紺のメニュー＋右の本体。手順の✓とモード表示を持つ。
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { adminFont } from '@/app/admin/fonts';
import { EVENT } from '@/config/event';
import { useHydrated, useStore } from '@/lib/store';
import type { AppState } from '@/lib/types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Notice } from './ui/Notice';
import { ToastHost, showToast } from './ui/Toast';
import { IconCheck, IconSave } from './ui/icons';

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

const STEPS = [
  { href: '/admin/import', label: '回答を読み込む' },
  { href: '/admin/generate', label: 'タグを作る' },
  { href: '/admin/review', label: '確認・修正' },
  { href: '/admin/print', label: 'シールを印刷' },
] as const;

const STEP_ROW =
  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-white';
const STEP_CIRCLE = 'flex size-[26px] flex-none items-center justify-center rounded-full';

export function AdminShell({ children }: { children: ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const participantCount = useStore((s) => s.participants.length);
  const generated = useStore((s) => s.generatedAt !== null);
  const saveError = useStore((s) => s.saveError);
  const [mode, setMode] = useState<'mock' | 'live' | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mode?: 'mock' | 'live' } | null) => {
        if (!cancelled && (data?.mode === 'mock' || data?.mode === 'live')) setMode(data.mode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const doneList = [participantCount > 0, generated, false, false];
  const dataActive = pathname.startsWith('/admin/data');

  const saveWork = (): void => {
    const s = useStore.getState();
    const snapshot: AppState = {
      version: 1,
      participants: s.participants,
      importedAt: s.importedAt,
      params: s.params,
      extractions: s.extractions,
      candidates: s.candidates,
      rankings: s.rankings,
      activeTagIds: s.activeTagIds,
      assignments: s.assignments,
      summary: s.summary,
      progress: s.progress,
      llmLog: s.llmLog,
      generatedAt: s.generatedAt,
      printOptions: s.printOptions,
    };
    download(`nametag-state-${stamp(new Date())}.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
    showToast('作業データを保存しました');
  };

  return (
    <div
      className={`${adminFont.className} flex min-h-screen flex-wrap bg-adm-bg text-adm-body leading-[1.6] text-adm-ink`}
    >
      <nav aria-label="作業の手順" className="flex flex-[1_1_240px] flex-col gap-7 bg-adm-nav px-4 py-6 text-white print:hidden">
        <div className="px-2">
          <div className="text-[19px] font-bold">{EVENT.appName}</div>
          <div className="mt-1.5 text-adm-xs text-adm-nav-dim">{EVENT.eventName}</div>
        </div>
        <ol className="flex flex-col gap-1">
          {STEPS.map((step, i) => {
            const current = pathname.startsWith(step.href);
            const done = doneList[i] === true && !current;
            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  aria-current={current ? 'step' : undefined}
                  className={
                    current
                      ? `${STEP_ROW} bg-adm-surface font-bold text-adm-nav`
                      : done
                        ? `${STEP_ROW} text-adm-nav-ink hover:bg-adm-nav-soft`
                        : `${STEP_ROW} text-adm-nav-dim hover:bg-adm-nav-soft`
                  }
                >
                  {done ? (
                    <span className={`${STEP_CIRCLE} bg-adm-done text-white`}>
                      <IconCheck size={14} />
                    </span>
                  ) : current ? (
                    <span className={`${STEP_CIRCLE} bg-adm-nav text-adm-sm text-white`}>{i + 1}</span>
                  ) : (
                    <span className={`${STEP_CIRCLE} border-[1.5px] border-adm-nav-dim text-adm-sm`}>
                      {i + 1}
                    </span>
                  )}
                  {step.label}
                </Link>
              </li>
            );
          })}
        </ol>
        <div className="border-t border-adm-nav-line pt-4">
          <Link
            href="/admin/data"
            aria-current={dataActive ? 'page' : undefined}
            className={
              dataActive
                ? `${STEP_ROW} bg-adm-surface font-bold text-adm-nav`
                : `${STEP_ROW} text-adm-nav-ink hover:bg-adm-nav-soft`
            }
          >
            <IconSave size={18} />
            保存・バックアップ
          </Link>
        </div>
        <div className="mt-auto rounded-lg bg-adm-nav-soft px-3.5 py-3 text-adm-xs text-adm-nav-ink">
          <div className="text-adm-sm font-bold text-white">
            {mode === 'mock' ? '練習モード' : mode === 'live' ? 'おいとまに接続中' : 'モードを確認中'}
          </div>
          {mode === 'mock' && <div>おいとまを使わずに試しています</div>}
          {mode === 'live' && <div>学内のおいとまでタグを作ります</div>}
        </div>
      </nav>
      <main className="min-w-0 flex-[999_1_560px] px-8 pb-10 pt-7 print:p-0">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
          {saveError && (
            <Notice
              tone="warn"
              title="このPCのブラウザに保存できませんでした"
              action={
                <Button variant="secondary" size="sm" onClick={saveWork}>
                  作業データを保存
                </Button>
              }
            >
              念のため、作業データをファイルに保存してください。
            </Notice>
          )}
          {!hydrated && (
            <Card className="p-5">
              <p className="py-12 text-center text-adm-sub">読み込み中…</p>
            </Card>
          )}
          {/* 復元前も子を描く（隠すだけ）。描かないとinstant検証がpageを未描画と判定する */}
          <div className={hydrated ? undefined : 'hidden'}>{children}</div>
        </div>
      </main>
      <ToastHost />
    </div>
  );
}

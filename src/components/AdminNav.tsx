// src/components/AdminNav.tsx
// 管理画面の共通部分：アプリ名、ステップナビ、モード表示、保存失敗の警告。
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EVENT } from '../config/event';
import { useHydrated, useStore } from '../lib/store';

const STEPS = [
  { href: '/admin/import', label: '1 取り込み' },
  { href: '/admin/generate', label: '2 生成' },
  { href: '/admin/review', label: '3 確認' },
  { href: '/admin/print', label: '4 印刷' },
  { href: '/admin/data', label: 'データ' },
];

export function AdminNav(): React.JSX.Element {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const saveError = useStore((s) => s.saveError);
  const [mode, setMode] = useState<'mock' | 'live' | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mode?: 'mock' | 'live' } | null) => {
        if (!cancelled && data?.mode) setMode(data.mode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="text-lg font-bold">{EVENT.appName}</span>
        <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {STEPS.map((step) => {
            const active = pathname === step.href || (step.href !== '/admin/data' && pathname.startsWith(step.href));
            return (
              <Link
                key={step.href}
                href={step.href}
                className={active ? 'font-bold underline' : 'text-gray-600 hover:underline'}
              >
                {step.label}
              </Link>
            );
          })}
        </nav>
        <span className="ml-auto text-xs">
          {mode === 'mock' && <span className="rounded bg-gray-200 px-2 py-1 text-gray-700">MOCK</span>}
          {mode === 'live' && <span className="rounded bg-green-200 px-2 py-1 text-green-900">LIVE</span>}
          {mode === null && <span className="text-gray-400">確認中…</span>}
        </span>
      </div>
      {hydrated && saveError && (
        <p className="bg-yellow-100 px-4 py-2 text-sm text-yellow-900">
          ブラウザに保存できませんでした。データ画面から状態を書き出してください
        </p>
      )}
    </header>
  );
}

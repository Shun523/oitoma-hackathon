import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { isAdminEnabled } from '@/lib/admin';
import { AdminNav } from '@/components/AdminNav';

// 管理画面は要求時に描く（実行時の環境変数で判定し、localStorageを使うため）
export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // 実行時の環境変数で判定されるように、要求時に評価する
  await connection();
  if (!isAdminEnabled()) {
    notFound();
  }
  return (
    <div className="min-h-full bg-white text-gray-900">
      <div className="no-print">
        <AdminNav />
      </div>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 print:m-0 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}

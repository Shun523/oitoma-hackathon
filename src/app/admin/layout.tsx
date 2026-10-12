import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { isAdminEnabled } from '@/lib/admin';
import { AdminShell } from '@/components/AdminShell';

// 管理画面は要求時に描く（実行時の環境変数で判定し、localStorageを使うため）
export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // 実行時の環境変数で判定されるように、要求時に評価する
  await connection();
  if (!isAdminEnabled()) {
    notFound();
  }
  return <AdminShell>{children}</AdminShell>;
}

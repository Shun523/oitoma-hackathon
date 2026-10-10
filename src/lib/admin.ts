// src/lib/admin.ts
// 管理画面とAPIの有効判定（サーバー専用。クライアントから import しない）。
export function isAdminEnabled(): boolean {
  return process.env.VERCEL !== '1';
}

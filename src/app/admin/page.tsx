// src/app/admin/page.tsx
// /admin/import へ送る。
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage(): React.JSX.Element {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/import');
  }, [router]);
  return <p>読み込み中…</p>;
}

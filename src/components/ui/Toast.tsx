'use client';

import { useEffect, useState } from 'react';
import { IconCheck } from './icons';

export function showToast(message: string): void {
  window.dispatchEvent(new CustomEvent('adm-toast', { detail: message }));
}

export function ToastHost(): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onToast = (e: Event): void => {
      setMessage((e as CustomEvent<string>).detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 3000);
    };
    window.addEventListener('adm-toast', onToast);
    return () => {
      window.removeEventListener('adm-toast', onToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return <></>;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-lg bg-adm-done px-4 py-3 text-adm-table font-bold text-white"
    >
      <IconCheck />
      {message}
    </div>
  );
}

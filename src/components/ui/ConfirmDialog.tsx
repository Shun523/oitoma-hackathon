'use client';

import { useEffect, useRef } from 'react';
import { Button } from './Button';
import { IconClose } from './icons';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog(props: ConfirmDialogProps): React.JSX.Element {
  const { open, title, body, confirmLabel, tone = 'primary', onConfirm, onCancel } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open ]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="w-[min(440px,calc(100%-32px))] rounded-xl border border-adm-line bg-adm-surface p-0 text-adm-ink backdrop:bg-adm-ink/40"
    >
      <div className="px-5 pt-5 text-adm-lead font-bold">{title}</div>
      <div className="px-5 pt-2 text-adm-body text-adm-ink2">{body}</div>
      <div className="flex justify-end gap-2 px-5 pb-5 pt-4">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-adm-line-strong bg-adm-surface px-4 font-bold text-adm-table text-adm-ink hover:bg-adm-head focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary"
        >
          やめる
        </button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="ダイアログを閉じる"
        className="absolute right-3 top-3 rounded-lg p-1 text-adm-sub hover:text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
      >
        <IconClose />
      </button>
    </dialog>
  );
}

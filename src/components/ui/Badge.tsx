import type { ReactNode } from 'react';

type BadgeProps = {
  tone: 'warn' | 'danger' | 'neutral' | 'oitoma' | 'done';
  children: ReactNode;
};

const TONES: Record<BadgeProps['tone'], string> = {
  warn: 'bg-adm-warn-badge text-adm-warn-ink',
  danger: 'bg-adm-danger-bg text-adm-danger',
  neutral: 'bg-adm-field text-adm-ink2',
  oitoma: 'bg-adm-primary-soft text-adm-primary',
  done: 'bg-adm-done text-white',
};

export function Badge({ tone, children }: BadgeProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-adm-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

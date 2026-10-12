import type { ReactNode } from 'react';
import { IconCheck, IconHelp, IconWarning } from './icons';

type NoticeProps = {
  tone: 'info' | 'warn' | 'danger' | 'success';
  title: string;
  children?: ReactNode;
  action?: ReactNode;
};

const TONES: Record<NoticeProps['tone'], { frame: string; icon: ReactNode }> = {
  info: { frame: 'border-adm-line bg-adm-head text-adm-ink2', icon: <IconHelp /> },
  warn: { frame: 'border-adm-warn-line bg-adm-warn-bg text-adm-warn-ink', icon: <IconWarning /> },
  danger: { frame: 'border-adm-danger-line bg-adm-danger-bg text-adm-danger', icon: <IconWarning /> },
  success: { frame: 'border-adm-done/40 bg-adm-done/10 text-adm-ink', icon: <span className="text-adm-done"><IconCheck /></span> },
};

export function Notice(props: NoticeProps): React.JSX.Element {
  const { tone, title, children, action } = props;
  const { frame, icon } = TONES[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${frame}`}>
      <span className="mt-0.5 flex-none">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        {children && <div className="mt-1 text-adm-sm">{children}</div>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}

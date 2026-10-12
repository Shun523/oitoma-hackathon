import type { ReactNode } from 'react';

export function PageHeader(props: {
  step?: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  actions?: ReactNode;
}): React.JSX.Element {
  const { step, title, description, actions } = props;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div>
        {step && <div className="text-adm-sm text-adm-sub">ステップ {step} / 4</div>}
        <h1 className="mb-1 mt-0.5 text-adm-h1 font-bold leading-snug">{title}</h1>
        <p className="text-adm-ink2">この画面でやること：{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

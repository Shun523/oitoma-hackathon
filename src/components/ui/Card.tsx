import type { ReactNode } from 'react';

export function Card(
  props: { children: ReactNode; className?: string },
): React.JSX.Element {
  const { children, className } = props;
  return (
    <section className={`rounded-xl border border-adm-line bg-adm-surface${className ? ` ${className}` : ''}`}>
      {children}
    </section>
  );
}

export function CardToolbar(props: { children: ReactNode }): React.JSX.Element {
  return <div className="flex flex-wrap items-center gap-3 border-b border-adm-divider px-4 py-3">{props.children}</div>;
}

export function CardTitle(props: { children: ReactNode }): React.JSX.Element {
  return <h2 className="text-adm-lead font-bold">{props.children}</h2>;
}

'use client';

import type { ReactNode } from 'react';

type SegmentedItem = {
  key: string;
  label: ReactNode;
  pressed: boolean;
  onClick: () => void;
};

export function Segmented(props: { items: SegmentedItem[]; disabled?: boolean }): React.JSX.Element {
  const { items, disabled = false } = props;
  return (
    <div className="flex gap-1 rounded-[10px] bg-adm-field p-1">
      {items.map((item) =>
        item.pressed ? (
          <button
            key={item.key}
            type="button"
            aria-pressed="true"
            onClick={item.onClick}
            disabled={disabled}
            className="min-h-10 rounded-lg bg-adm-surface px-3.5 text-adm-table font-bold text-adm-ink ring-1 ring-adm-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ) : (
          <button
            key={item.key}
            type="button"
            aria-pressed="false"
            onClick={item.onClick}
            disabled={disabled}
            className="min-h-10 rounded-lg px-3.5 text-adm-table text-adm-ink2 hover:text-adm-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}

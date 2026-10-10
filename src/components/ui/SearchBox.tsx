'use client';

import { IconSearch } from './icons';

export function SearchBox(props: { value: string; onChange: (value: string) => void }): React.JSX.Element {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-adm-line px-3 text-adm-table text-adm-sub focus-within:outline-2 focus-within:outline-adm-primary">
      <IconSearch />
      <input
        type="search"
        aria-label="名前で検索"
        placeholder="名前で検索"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-[130px] bg-transparent text-adm-ink outline-none"
      />
    </label>
  );
}

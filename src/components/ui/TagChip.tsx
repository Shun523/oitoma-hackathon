type TagChipProps = {
  kind: 'personal' | 'shared';
  label: string; // '#' なし。表示で '#' を付ける
  size?: 'sm' | 'md';
};

export function TagChip({ kind, label, size = 'sm' }: TagChipProps): React.JSX.Element {
  if (kind === 'personal') {
    return (
      <span
        className={`inline-block whitespace-nowrap rounded-full bg-tag-personal font-bold text-white ${
          size === 'md' ? 'px-3 py-0.5 text-adm-body' : 'px-2.5 py-0.5 text-adm-sm'
        }`}
      >
        #{label}
      </span>
    );
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border-[1.5px] border-tag-shared bg-adm-surface font-bold text-adm-ink ${
        size === 'md' ? 'px-3 py-px text-adm-body' : 'px-2.5 py-px text-adm-sm'
      }`}
    >
      #{label}
    </span>
  );
}

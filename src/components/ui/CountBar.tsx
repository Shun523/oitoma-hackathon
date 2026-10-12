export function CountBar(props: { count: number; min: number; max: number }): React.JSX.Element {
  const { count, min, max } = props;
  const scale = Math.max(max, count);
  const pct = (count / scale) * 100;
  const minPct = (min / scale) * 100;
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-2.5 flex-1 rounded-full bg-adm-field"
        role="img"
        aria-label={`${count}人（目安 ${min}〜${max}人）`}
      >
        <div className={`h-2.5 rounded-full ${count < min ? 'bg-adm-danger' : 'bg-adm-primary'}`} style={{ width: `${pct}%` }} />
        <div className="absolute -top-1 h-[18px] w-0.5 bg-adm-ink opacity-40" style={{ left: `${minPct}%` }} />
      </div>
      <span className="w-12 text-right text-adm-table font-bold">{count}人</span>
    </div>
  );
}

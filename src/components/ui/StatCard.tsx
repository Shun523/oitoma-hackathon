import { HelpTip } from './HelpTip';

type StatCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  prefix?: string;
  note?: string;
  tone?: 'normal' | 'warn';
  help?: string;
};

export function StatCard(props: StatCardProps): React.JSX.Element {
  const { label, value, unit, prefix, note, tone = 'normal', help } = props;
  const frame =
    tone === 'warn'
      ? 'border-adm-warn-line bg-adm-warn-bg'
      : 'border-adm-line bg-adm-surface';
  const labelTone = tone === 'warn' ? 'text-adm-warn-ink' : 'text-adm-sub';
  const valueTone = tone === 'warn' ? 'text-adm-warn-ink' : '';
  const noteTone = tone === 'warn' ? 'text-adm-warn-ink' : 'text-adm-sub';
  return (
    <div className={`min-w-0 flex-1 basis-[170px] rounded-xl border px-[18px] py-3.5 ${frame}`}>
      <div className={`flex items-center gap-1 text-adm-sm ${labelTone}`}>
        <span>{label}</span>
        {help && <HelpTip text={help} />}
      </div>
      <div className={`text-adm-num font-bold leading-tight ${valueTone}`}>
        {prefix && <span className="text-adm-body">{prefix}</span>}
        {value}
        {unit && <span className="text-adm-body">{unit}</span>}
      </div>
      {note && <div className={`text-adm-xs ${noteTone}`}>{note}</div>}
    </div>
  );
}

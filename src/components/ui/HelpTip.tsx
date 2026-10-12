import { IconHelp } from './icons';

export function HelpTip(props: { text: string }): React.JSX.Element {
  return (
    <details className="relative inline-block align-middle">
      <summary className="cursor-pointer list-none text-adm-sub [&::-webkit-details-marker]:hidden" aria-label="説明を見る">
        <IconHelp size={15} />
      </summary>
      <div className="absolute left-0 z-10 mt-1 w-64 rounded-lg border border-adm-line bg-adm-surface p-3 text-adm-sm text-adm-ink2">
        {props.text}
      </div>
    </details>
  );
}

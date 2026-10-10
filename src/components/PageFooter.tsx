import Link from 'next/link';
import { buttonClass } from './ui/Button';
import { IconArrowRight } from './ui/icons';

export function PageFooter(props: {
  next?: { href: string; label: string; disabled?: boolean };
}): React.JSX.Element {
  const { next } = props;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden">
      <p className="text-adm-xs text-adm-sub">入力内容はこのPCのブラウザに自動で保存されます。</p>
      {next &&
        (next.disabled ? (
          <span className={`${buttonClass('primary', 'lg')} pointer-events-none opacity-50`}>
            次へ：{next.label}
          </span>
        ) : (
          <Link href={next.href} className={buttonClass('primary', 'lg')}>
            次へ：{next.label}
            <IconArrowRight size={18} />
          </Link>
        ))}
    </div>
  );
}

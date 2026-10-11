import Link from 'next/link';
import { buttonClass } from './ui/Button';
import { Card, CardTitle } from './ui/Card';

export function GuideCard(props: {
  title: string;
  description: string;
  next: { href: string; label: string };
}): React.JSX.Element {
  const { title, description, next } = props;
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <CardTitle>{title}</CardTitle>
      <p className="text-adm-ink2">{description}</p>
      <Link href={next.href} className={buttonClass('primary', 'md')}>
        {next.label}
      </Link>
    </Card>
  );
}

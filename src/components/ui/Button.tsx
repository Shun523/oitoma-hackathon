import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'warn' | 'danger' | 'dashed';
type Size = 'sm' | 'md' | 'lg';

const COMMON =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold text-adm-table transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary';

const SIZES: Record<Size, string> = {
  sm: 'min-h-10 px-3.5',
  md: 'min-h-11 px-4',
  lg: 'min-h-12 px-6 text-adm-body',
};

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-adm-primary text-white hover:bg-adm-primary-hover',
  secondary: 'border border-adm-line-strong bg-adm-surface text-adm-ink hover:bg-adm-head',
  warn: 'border border-adm-warn-line bg-adm-warn-bg text-adm-warn-ink hover:bg-adm-warn-badge',
  danger: 'bg-adm-danger text-white hover:opacity-90',
  dashed: 'border border-dashed border-adm-primary bg-adm-surface text-adm-primary hover:bg-adm-primary-soft',
};

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md'): string {
  return `${COMMON} ${SIZES[size]} ${VARIANTS[variant]}`;
}

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode },
): React.JSX.Element {
  const { variant = 'secondary', size = 'md', icon, className, children, ...rest } = props;
  return (
    <button type="button" className={`${buttonClass(variant, size)}${className ? ` ${className}` : ''}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

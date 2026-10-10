// src/components/ui/icons.tsx
// 自作SVGアイコン。色は親の文字色（currentColor）に従う。飾りなので読み上げからは隠す。
import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Svg({ size = 16, className, strokeWidth = 2, children }: IconProps & { children: ReactNode }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: IconProps): React.JSX.Element => (
  <Svg strokeWidth={3} {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
);

export const IconSave = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M8 4v5h7" />
    <path d="M8 20v-6h8v6" />
  </Svg>
);

export const IconWarning = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M12 3l9.5 17h-19z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconSearch = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);

export const IconSparkle = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  </Svg>
);

export const IconArrowRight = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Svg>
);

export const IconArrowDown = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </Svg>
);

export const IconUpload = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v4h16v-4" />
  </Svg>
);

export const IconPrinter = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M7 9V3h10v6" />
    <path d="M7 17H4v-7h16v7h-3" />
    <path d="M7 14h10v7H7z" />
  </Svg>
);

export const IconTrash = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Svg>
);

export const IconHelp = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Svg>
);

export const IconClose = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconPlay = (p: IconProps): React.JSX.Element => (
  <Svg {...p}>
    <path d="M7 5l12 7-12 7z" />
  </Svg>
);

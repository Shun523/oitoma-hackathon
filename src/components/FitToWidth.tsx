// src/components/FitToWidth.tsx
// 画面幅に合わせて縮小表示する（ResizeObserver）。印刷時は実寸に戻す。
'use client';

import { useEffect, useRef, useState } from 'react';

interface FitToWidthProps {
  designWidthPx: number; // 本来の幅（px）
  children: React.ReactNode;
}

export function FitToWidth({ designWidthPx, children }: FitToWidthProps): React.JSX.Element {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = (): void => {
      const w = outer.clientWidth;
      const s = w > 0 ? Math.min(1, w / designWidthPx) : 1;
      setScale(s);
      setHeight(inner.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [designWidthPx]);

  return (
    <div ref={outerRef} className="fit-to-width-outer w-full overflow-hidden" style={{ height: height ?? undefined }}>
      <div
        ref={innerRef}
        className="fit-to-width-inner origin-top-left"
        style={{ width: designWidthPx, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

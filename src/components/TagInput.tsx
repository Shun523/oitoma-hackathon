// src/components/TagInput.tsx
// 文字数カウンタ付きのタグ入力。IME変換を妨げないよう、入力中は制限せず超過を赤で示す。
'use client';

import { displayLength } from '../lib/text';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number; // 既定12（全角換算）
  ariaLabel?: string;
}

export function TagInput({ value, onChange, max = 12, ariaLabel }: TagInputProps): React.JSX.Element {
  const len = displayLength(value);
  const over = len > max;
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="text"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border px-2 py-1 text-sm ${over ? 'border-red-500 text-red-700' : 'border-gray-300'}`}
      />
      <span className={`text-xs ${over ? 'font-bold text-red-600' : 'text-gray-500'}`}>
        {Number.isInteger(len) ? len : len.toFixed(1)}/{max}
      </span>
    </span>
  );
}

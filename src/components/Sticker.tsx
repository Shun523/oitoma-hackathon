// src/components/Sticker.tsx
// 話題シール1枚（タグ1つ。印刷と画面で共用、mm/pt指定）。
import { EVENT, SHEET_PRESETS } from '../config/event';
import { displayLength } from '../lib/text';
import type { SheetPresetKey } from '../lib/types';

interface StickerProps {
  preset: SheetPresetKey;
  kind: 'personal' | 'shared';
  label: string; // '#'なし
  caption?: string; // 下の小さい字
}

export function stickerFontPt(preset: SheetPresetKey, label: string): number {
  const sheet = SHEET_PRESETS[preset];
  const innerWmm = sheet.wMm - sheet.padMm * 2;
  const pt = Math.floor((innerWmm - 4) / ((displayLength(label) + 0.6) * 0.3528));
  return Math.min(sheet.maxPt, Math.max(sheet.minPt, pt));
}

export function Sticker({ preset, kind, label, caption }: StickerProps): React.JSX.Element {
  const sheet = SHEET_PRESETS[preset];
  const pt = stickerFontPt(preset, label);
  const personal = kind === 'personal';
  return (
    <div
      className="sticker relative flex flex-col items-center justify-center overflow-hidden bg-white"
      style={{
        width: `${sheet.wMm}mm`,
        height: `${sheet.hMm}mm`,
        padding: `${sheet.padMm}mm`,
        border: personal ? 'none' : `0.5mm solid ${EVENT.accentColor}`,
        borderRadius: '3mm',
        backgroundColor: personal ? '#222' : '#fff',
      }}
    >
      <span
        className="leading-none font-bold whitespace-nowrap"
        style={{ fontSize: `${pt}pt`, color: personal ? '#fff' : '#222', marginTop: caption ? '-2mm' : 0 }}
      >
        #{label}
      </span>
      {caption !== undefined && caption !== '' && (
        <span
          className="absolute right-0 bottom-0 left-0 truncate text-center"
          style={{ fontSize: '6.5pt', color: personal ? '#ccc' : '#666', padding: `0 ${sheet.padMm}mm 1mm` }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}

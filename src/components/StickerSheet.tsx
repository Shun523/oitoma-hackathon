// 用紙の段数を基準に配置し、試し刷りと本番で同じ座標を使う。
import { SHEET_PRESETS, STICKER_GAP_MM } from '../config/event';
import { layoutRows } from '../lib/sheet-layout';
import type { SheetPresetKey } from '../lib/types';
import { StickerSet } from './StickerSet';

export interface SheetPerson {
  name: string;
  personalTag: string;
  sharedTags: string[];
}

export const SHEET_WIDTH_PX = (210 * 96) / 25.4;

interface StickerSheetProps {
  preset: SheetPresetKey;
  people: SheetPerson[];
  offsetXmm: number;
  offsetYmm: number;
  gapXmm: number;
  gapYmm: number;
  showCount?: boolean;
  sharedCounts?: Record<string, number>;
  testMode?: boolean;
  startRow?: number;
}

export function StickerSheet({
  preset, people, offsetXmm, offsetYmm, gapXmm, gapYmm,
  showCount, sharedCounts, testMode, startRow = 1,
}: StickerSheetProps): React.JSX.Element {
  const sheet = SHEET_PRESETS[preset];
  // 既存の本番の先頭位置と2mm間隔を維持し、設定値を追加の間隔補正にする。
  const left = (210 - 3 * sheet.wMm - 2 * gapXmm) / 2 + offsetXmm;
  const top = (297 - sheet.rows * sheet.hMm - (sheet.rows - 1) * gapYmm) / 2 + offsetYmm;
  const gap = STICKER_GAP_MM + gapXmm;
  const pages = testMode
    ? [Array.from({ length: sheet.rows }, (_, i) => i)]
    : layoutRows(people.length, sheet.rows, startRow);

  return (
    <>
      {pages.map((slots, pageIndex) => (
        <div key={pageIndex} className="sheet relative mx-auto bg-white" style={{ width: '210mm', height: '297mm' }}>
          {slots.map((personIndex, rowIndex) => {
            if (personIndex === null) return null;
            const person = people[personIndex];
            return (
              <div key={rowIndex} className="absolute flex" style={{ left: left + 'mm', top: (top + rowIndex * (sheet.hMm + gapYmm)) + 'mm', gap: gap + 'mm' }}>
                {testMode ? (
                  [0, 1, 2].map((column) => (
                    <div key={column} style={{ width: sheet.wMm + 'mm', height: sheet.hMm + 'mm', border: '0.2mm solid #000' }} />
                  ))
                ) : (
                  <StickerSet preset={preset} personalTag={person.personalTag} sharedTags={person.sharedTags}
                    name={person.name} sharedCounts={sharedCounts} showCount={showCount} direction="row" gapMm={gap} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

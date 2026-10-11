// src/components/StickerSheet.tsx
// A4ラベル用紙1枚分（1行＝1人分）。入りきらない分は次の用紙へ。並びは取り込み順。
import { SHEET_PRESETS } from '../config/event';
import type { SheetPresetKey } from '../lib/types';
import { StickerSet } from './StickerSet';

export interface SheetPerson {
  name: string;
  personalTag: string;
  sharedTags: string[]; // 0〜2個
}

// 画面プレビュー用：A4幅のpx換算（96dpi）
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
  testMode?: boolean; // trueなら中身を描かず外枠だけを0.2mmの線で描く
  startRow?: number; // 使いかけ用紙の刷り始める段（1始まり）。2以上だけ使い、1（既定）は今までどおり
}

export function StickerSheet({
  preset,
  people,
  offsetXmm,
  offsetYmm,
  gapXmm,
  gapYmm,
  showCount,
  sharedCounts,
  testMode,
  startRow,
}: StickerSheetProps): React.JSX.Element {
  const sheet = SHEET_PRESETS[preset];
  const sheets: SheetPerson[][] = [];
  for (let i = 0; i < people.length; i += sheet.rows) {
    sheets.push(people.slice(i, i + sheet.rows));
  }

  const left = (210 - 3 * sheet.wMm - 2 * gapXmm) / 2 + offsetXmm;
  const topOf = (rowsInSheet: number): number =>
    (297 - rowsInSheet * sheet.hMm - (rowsInSheet - 1) * gapYmm) / 2 + offsetYmm;

  const start = startRow ?? 1;
  if (start >= 2) {
    // 使いかけ用紙：絶対の段に置く（呼び出し側が容量以内で渡す）。試し刷りの枠も同じ段に出す。
    const top = topOf(sheet.rows);
    return (
      <div
        className="sheet relative mx-auto bg-white"
        style={{ width: '210mm', height: '297mm' }}
      >
        {people.map((person, j) => (
          <div
            key={person.name + j}
            className="absolute flex"
            style={{
              left: `${left}mm`,
              top: `${top + (start - 1 + j) * (sheet.hMm + gapYmm)}mm`,
              gap: `${gapXmm}mm`,
            }}
          >
            {testMode ? (
              [0, 1, 2].map((k) => (
                <div
                  key={k}
                  style={{ width: `${sheet.wMm}mm`, height: `${sheet.hMm}mm`, border: '0.2mm solid #000' }}
                />
              ))
            ) : (
              <StickerSet
                preset={preset}
                personalTag={person.personalTag}
                sharedTags={person.sharedTags}
                name={person.name}
                sharedCounts={sharedCounts}
                showCount={showCount}
                direction="row"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {sheets.map((rows, si) => (
        <div
          key={si}
          className="sheet relative mx-auto bg-white"
          style={{ width: '210mm', height: '297mm' }}
        >
          {rows.map((person, i) => (
            <div
              key={person.name + i}
              className="absolute flex"
              style={{
                left: `${left}mm`,
                top: `${topOf(rows.length) + i * (sheet.hMm + gapYmm)}mm`,
                gap: `${gapXmm}mm`,
              }}
            >
              {testMode ? (
                [0, 1, 2].map((k) => (
                  <div
                    key={k}
                    style={{ width: `${sheet.wMm}mm`, height: `${sheet.hMm}mm`, border: '0.2mm solid #000' }}
                  />
                ))
              ) : (
                <StickerSet
                  preset={preset}
                  personalTag={person.personalTag}
                  sharedTags={person.sharedTags}
                  name={person.name}
                  sharedCounts={sharedCounts}
                  showCount={showCount}
                  direction="row"
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

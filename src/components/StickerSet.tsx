// src/components/StickerSet.tsx
// 1人分（タグ1つずつのシール3枚：個性タグ、共有タグ1、共有タグ2）。
// 幅600px未満では3枚を縦に、それ以上では横1行に並べる。
import { SHEET_PRESETS, STICKER_GAP_MM } from '../config/event';
import type { SheetPresetKey } from '../lib/types';
import { Sticker } from './Sticker';

interface StickerSetProps {
  preset: SheetPresetKey;
  personalTag: string;
  sharedTags: string[]; // 0〜2個
  name?: string; // 左のシールの下の小さい字（受付で本人に渡すため）
  sharedCounts?: Record<string, number>; // showCount がオンのときの人数
  showCount?: boolean;
  direction?: 'responsive' | 'row'; // 用紙の行では常に横1行
  gapMm?: number;
}

export function StickerSet({
  preset,
  personalTag,
  sharedTags,
  name,
  sharedCounts,
  showCount,
  direction = 'responsive',
  gapMm = STICKER_GAP_MM,
}: StickerSetProps): React.JSX.Element {
  const sheet = SHEET_PRESETS[preset];
  const captionFor = (label: string): string => {
    if (showCount && sharedCounts) {
      const count = sharedCounts[label];
      if (count !== undefined) return `会場に${count}人`;
    }
    return '同じタグの人を探そう';
  };
  return (
    <div className={direction === 'row' ? 'flex flex-row' : 'flex flex-col gap-2 min-[600px]:flex-row'} style={{ gap: `${gapMm}mm` }}>
      <Sticker preset={preset} kind="personal" label={personalTag} caption={name} />
      {[0, 1].map((i) => {
        const label = sharedTags[i];
        if (!label) {
          return <div key={i} style={{ width: `${sheet.wMm}mm`, height: `${sheet.hMm}mm` }} />;
        }
        return <Sticker key={i} preset={preset} kind="shared" label={label} caption={captionFor(label)} />;
      })}
    </div>
  );
}

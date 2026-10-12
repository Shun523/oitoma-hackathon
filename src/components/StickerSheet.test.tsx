import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_PRINT_OPTIONS } from '../config/event';
import { StickerSheet } from './StickerSheet';

const person = { name: 'ダミー', personalTag: '自炊が好き', sharedTags: ['料理仲間', 'コーヒー好き'] };
const render = (count: number, extra = {}) => renderToStaticMarkup(
  <StickerSheet {...DEFAULT_PRINT_OPTIONS} people={Array(count).fill(person)} {...extra} />,
);
const tops = (html: string) => [...html.matchAll(/(?:;|")top:([\d.-]+)mm/g)].map(m => Number(m[1]));

describe('label sheet printing', () => {
  it('keeps the calibrated normal layout and matches test printing', () => {
    for (const gapXmm of [0, 0.5, 2]) {
      const normal = render(8, { gapXmm });
      const test = render(8, { gapXmm, testMode: true });
      expect(normal).toContain(`gap:${2 + gapXmm}mm`);
      expect(test).toContain(`gap:${2 + gapXmm}mm`);
      expect(tops(normal)).toEqual(tops(test));
      expect(normal).toContain(`left:${6 - gapXmm}mm`);
      expect(test).toContain(`left:${6 - gapXmm}mm`);
    }
    expect(tops(render(8))[0]).toBeCloseTo(14.9);
  });

  it.each([1, 7, 8, 9, 40, 41])('fixes every page to the label rows for %i people', count => {
    const top = tops(render(count));
    for (let i = 0; i < count; i++) expect(top[i]).toBeCloseTo(14.9 + (i % 8) * 33.9);
    expect((render(count).match(/class="sheet /g) ?? []).length).toBe(Math.ceil(count / 8));
  });

  it('starts at row 5 and continues from row 1 of the next page', () => {
    const top = tops(render(10, { startRow: 5 }));
    expect(top[0]).toBeCloseTo(14.9 + 4 * 33.9);
    expect(top[4]).toBeCloseTo(14.9);
  });

  it('prints a single complete calibration sheet regardless of selection', () => {
    const html = render(41, { testMode: true, startRow: 5 });
    expect(tops(html)).toHaveLength(8);
    expect((html.match(/border:0.2mm/g) ?? []).length).toBe(24);
    expect((html.match(/class="sheet /g) ?? []).length).toBe(1);
  });
});

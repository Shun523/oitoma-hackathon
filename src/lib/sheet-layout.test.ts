// src/lib/sheet-layout.test.ts
import { describe, expect, it } from 'vitest';
import { layoutRows } from './sheet-layout';

describe('layoutRows', () => {
  it('places 3 people from the 5th row of 8', () => {
    expect(layoutRows(3, 8, 5)).toEqual([[null, null, null, null, 0, 1, 2, null]]);
  });

  it('continues onto a second sheet', () => {
    expect(layoutRows(10, 8, 5)).toEqual([
      [null, null, null, null, 0, 1, 2, 3],
      [4, 5, 6, 7, 8, 9, null, null],
    ]);
  });

  it('matches the old order from the first row', () => {
    expect(layoutRows(10, 8, 1)).toEqual([
      [0, 1, 2, 3, 4, 5, 6, 7],
      [8, 9, null, null, null, null, null, null],
    ]);
  });

  it('returns [] for nobody', () => {
    expect(layoutRows(0, 8, 5)).toEqual([]);
  });
});

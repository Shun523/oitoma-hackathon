import { describe, expect, it } from 'vitest';
import { displayLength, hasNgWord, sanitizeTag } from './text';

describe('displayLength', () => {
  it('counts full-width as 1 and ASCII as 0.5', () => {
    expect(displayLength('ランニング3か月目')).toBe(8.5);
    expect(displayLength('AI')).toBe(1);
  });
});

describe('sanitizeTag', () => {
  it('removes #, spaces, brackets, emoji and trailing punctuation', () => {
    expect(sanitizeTag('#ごはん屋 開拓勢！')).toBe('ごはん屋開拓勢');
    expect(sanitizeTag('「夜型」🌙')).toBe('夜型');
  });
});

describe('hasNgWord', () => {
  it('detects listed words', () => {
    expect(hasNgWord('恋人募集中')).toBe(true);
    expect(hasNgWord('ランニング3か月目')).toBe(false);
  });
});

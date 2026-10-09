// src/lib/text.ts
// 文字数の数え方、タグの整形、NG語の判定
import { NG_WORDS } from '../config/ng-words';

// コードポイントごとに、ASCII（U+0020〜U+007E）と半角カナ（U+FF61〜U+FF9F）は0.5、それ以外は1として足す。
export function displayLength(s: string): number {
  let len = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0x0020 && cp <= 0x007e) || (cp >= 0xff61 && cp <= 0xff9f)) {
      len += 0.5;
    } else {
      len += 1;
    }
  }
  return len;
}

export function sanitizeTag(s: string): string {
  let out = s.trim();
  out = out.replace(/[#＃]/g, '');
  out = out.replace(/[\s\u3000]/g, '');
  out = out.replace(/[「」『』""“”‘’()（）]/g, '');
  out = out.replace(/\p{Extended_Pictographic}/gu, '');
  out = out.replace(/[。、！!？?]+$/u, '');
  return out;
}

// src/config/ng-words.ts の語を1つでも含むか。疑いを知らせるだけで、自動では消さない。
export function hasNgWord(s: string): boolean {
  return NG_WORDS.some((w) => s.includes(w));
}

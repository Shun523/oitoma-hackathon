// src/lib/import/normalize.ts
// 回答の値の整え方（Excel取り込みと手入力で共用）。forms.ts の出力を変えない。
function collapseSpaces(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/[ \t\u3000]+/g, ' ').trim();
}

export function normalizeName(s: string): string {
  return collapseSpaces(s).slice(0, 30);
}

export function normalizeAffiliation(s: string): string {
  return collapseSpaces(s).slice(0, 40);
}

export function normalizeIntro(s: string): string {
  return s.replace(/\r\n|\r|\n/g, ' ').slice(0, 400);
}

export function normalizeHobby(s: string): string {
  return s.replace(/\r\n|\r|\n/g, ' ').slice(0, 100);
}

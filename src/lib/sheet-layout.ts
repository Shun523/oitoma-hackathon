// src/lib/sheet-layout.ts
// 使いかけのラベル用紙に刷るときの段の並び。用紙ごとに段の配列を返す。
// 数字は印刷する人の0始まりの番号、nullは空ける段。各用紙の配列は常に段数の長さ。
export function layoutRows(count: number, rows: number, startRow: number): (number | null)[][] {
  if (count <= 0 || rows <= 0) return [];
  const start = Math.min(Math.max(1, startRow), rows) - 1; // 0始まりに直す
  const out: (number | null)[][] = [];
  let i = 0;
  let first = true;
  while (i < count) {
    const sheet: (number | null)[] = new Array<(number | null)>(rows).fill(null);
    const from = first ? start : 0;
    for (let r = from; r < rows && i < count; r += 1, i += 1) {
      sheet[r] = i;
    }
    out.push(sheet);
    first = false;
  }
  return out;
}

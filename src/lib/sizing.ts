// src/lib/sizing.ts
// 人数から目安の人数を決める
import { PIPELINE } from '../config/event';
import type { GenerationParams } from './types';

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function computeParams(n: number): GenerationParams {
  const targetSize = clamp(Math.round(n / 5), 3, 12); // 1タグあたりの目安
  const minSize = Math.max(2, Math.ceil(targetSize / 2)); // 下限（必ず守る）
  const maxSize = targetSize * 2; // 上限（できるだけ守る）
  const candidateCount = clamp(Math.ceil(((2 * n) / targetSize) * 1.5), 4, 40);
  return { n, targetSize, minSize, maxSize, candidateCount, rankLength: PIPELINE.rankLength };
}

import { z } from 'zod';
import { computeParams } from './sizing';
import type { GenerationParams } from './types';

export const MAX_CATALOG_TAGS = 40;
export const generationParamsSchema = z.object({
  n: z.number().int().min(0).max(300),
  targetSize: z.number().int().min(1).max(300),
  minSize: z.number().int().min(2).max(300),
  maxSize: z.number().int().min(2).max(600),
  candidateCount: z.number().int().min(4).max(MAX_CATALOG_TAGS),
  rankLength: z.number().int().min(1).max(10),
}).refine(p => p.minSize <= p.maxSize && (p.n === 0 || p.minSize <= p.n), '人数の下限・上限が正しくありません');

export function normalizeGenerationParams(n: number, override: Partial<GenerationParams> = {}): GenerationParams {
  const base = computeParams(n);
  const bounded = (v: number | undefined, fallback: number, min: number, max: number): number =>
    Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v!))) : fallback;
  const targetSize = bounded(override.targetSize, base.targetSize, 1, Math.max(1, n));
  const minSize = bounded(override.minSize, Math.max(2, Math.ceil(targetSize / 2)), 2, Math.max(2, n));
  return {
    n, targetSize, minSize,
    maxSize: bounded(override.maxSize, Math.max(minSize, targetSize * 2), minSize, Math.max(minSize, 2 * n)),
    candidateCount: bounded(override.candidateCount, base.candidateCount, 4, MAX_CATALOG_TAGS),
    rankLength: bounded(override.rankLength, base.rankLength, 1, 10),
  };
}

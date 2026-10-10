// src/lib/llm/schemas.ts
// おいとまの出力とAPI入力の検証（zod）。
import { z } from 'zod';

export const extractOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      topics: z.array(z.string()),
      personal: z.array(z.string()),
    }),
  ),
});

export const catalogOutputSchema = z.object({
  tags: z.array(
    z.object({
      label: z.string(),
      covers: z.string(),
    }),
  ),
});

export const rankOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      ranked: z.array(z.string()),
    }),
  ),
});

export const summaryOutputSchema = z.object({
  text: z.string(),
});

export const regenerateOutputSchema = z.object({
  personal: z.array(z.string()),
});

export const categorySchema = z.enum(['学生', '教員', '職員', '企業', '自治体', 'その他']);

export const extractInputSchema = z.object({
  id: z.string().min(1),
  affiliation: z.string(),
  category: categorySchema,
  intro: z.string(),
  hobby: z.string(),
});

export const catalogInputSchema = z.object({
  id: z.string().min(1),
  category: categorySchema,
  topics: z.array(z.string()),
});

export const rankInputSchema = z.object({
  id: z.string().min(1),
  category: categorySchema,
  topics: z.array(z.string()),
  hobby: z.string(),
});

export const sharedTagInputSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  covers: z.string(),
});

export const generationParamsSchema = z.object({
  n: z.number(),
  targetSize: z.number(),
  minSize: z.number(),
  maxSize: z.number(),
  candidateCount: z.number(),
  rankLength: z.number(),
});

export const extractApiSchema = z.object({
  people: z.array(extractInputSchema).min(1).max(10),
});

export const catalogApiSchema = z.object({
  people: z.array(catalogInputSchema).min(6).max(300),
  params: generationParamsSchema,
});

export const rankApiSchema = z.object({
  tags: z.array(sharedTagInputSchema).min(2).max(40),
  people: z.array(rankInputSchema).min(1).max(20),
  rankLength: z.number().int().min(1).max(10),
});

export const summaryApiSchema = z.object({
  tags: z.array(z.object({ label: z.string().min(1), count: z.number() })).min(1).max(20),
});

export const regenerateApiSchema = z.object({
  person: extractInputSchema.extend({ topics: z.array(z.string()) }),
  avoid: z.array(z.string()),
});

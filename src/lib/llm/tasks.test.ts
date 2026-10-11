import { afterEach, describe, expect, it, vi } from 'vitest';
import { directLlmApi } from './tasks';
import { computeParams } from '../sizing';
import { rankApiSchema } from './schemas';
import { normalizeGenerationParams } from '../generation-params';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('catalog and rank boundaries', () => {
  it.each([40, 41, 48])('caps %i live candidates at the rank API limit', async count => {
    vi.stubEnv('LLM_MODE', 'live');
    vi.stubEnv('OITOMA_BASE_URL', 'https://example.test/v1');
    vi.stubEnv('OITOMA_API_KEY', 'synthetic-key');
    vi.stubEnv('OITOMA_MODEL', 'synthetic-model');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ tags: Array.from({ length: count }, (_, i) => ({ label: `話題${i}`, covers: '架空の話題' })) }) } }] })));
    const { tags } = await directLlmApi.catalog([], computeParams(200));
    expect(tags).toHaveLength(40);
    expect(rankApiSchema.safeParse({ tags: tags.map((t, i) => ({ ...t, id: `T${i}` })), people: [{ id: 'P001', category: '学生', topics: ['趣味'], hobby: '' }], rankLength: 5 }).success).toBe(true);
  });

  it('bounds overrides before generation', () => {
    expect(normalizeGenerationParams(6, { candidateCount: 999, minSize: 999, maxSize: 1, targetSize: NaN })).toMatchObject({ candidateCount: 40, minSize: 6, maxSize: 6, targetSize: 3 });
  });
});

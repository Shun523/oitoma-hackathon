// src/lib/admin.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { isAdminEnabled } from './admin';

const prev = process.env.VERCEL;

afterEach(() => {
  if (prev === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prev;
});

describe('isAdminEnabled', () => {
  it('returns false on Vercel', () => {
    process.env.VERCEL = '1';
    expect(isAdminEnabled()).toBe(false);
  });

  it('returns true without VERCEL', () => {
    delete process.env.VERCEL;
    expect(isAdminEnabled()).toBe(true);
  });
});

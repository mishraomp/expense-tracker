import { describe, expect, it } from 'vitest';
import * as storeIndex from '@/stores';

describe('stores index exports', () => {
  it('exports expected members', () => {
    expect(typeof storeIndex.useAuthStore).toBe('function');
    expect(typeof storeIndex.useAuth).toBe('function');
    expect(typeof storeIndex.useAuthInit).toBe('function');
  });
});

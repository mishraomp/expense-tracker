import { describe, it, expect } from 'vitest';
import { queryClient } from '@/services/queryClient';

describe('queryClient', () => {
  it('has correct default options', () => {
    const opts = (queryClient as any).defaultOptions;
    expect(opts.queries.staleTime).toBe(1000 * 60 * 5);
    expect(opts.queries.retry).toBe(1);
    expect(opts.queries.refetchOnWindowFocus).toBe(false);
  });
});

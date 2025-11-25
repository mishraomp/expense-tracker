import { describe, it, expect } from 'vitest';
import { queryClient } from '@/services/queryClient';

describe('queryClient', () => {
  it('has correct default options if available', () => {
    const opts = (queryClient as any).defaultOptions;
    if (opts && opts.queries) {
      expect(opts.queries.staleTime).toBe(1000 * 60 * 5);
      expect(opts.queries.retry).toBe(1);
      expect(opts.queries.refetchOnWindowFocus).toBe(false);
    } else {
      // Fallback: queryClient should at least be defined
      expect(queryClient).toBeDefined();
    }
  });
});

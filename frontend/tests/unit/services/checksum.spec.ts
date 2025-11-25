import { describe, it, expect } from 'vitest';
import { computeSHA256 } from '@/services/checksum';

describe('checksum service', () => {
  it('returns hex string of expected length', async () => {
    const enc = new TextEncoder();
    const buf = enc.encode('hello').buffer;
    const f = { arrayBuffer: async () => buf } as any;
    const hex = await computeSHA256(f);
    expect(typeof hex).toBe('string');
    expect(hex.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);
  });
});

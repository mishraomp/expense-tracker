import { describe, it, expect } from 'vitest';
import { toYYYYMMDD } from '@/services/date';

describe('date service', () => {
  it('formats Date input', () => {
    const d = new Date('2025-03-04T12:00:00Z');
    const out = toYYYYMMDD(d);
    expect(out).toBe('2025-03-04');
  });

  it('parses yyyy-mm-dd string', () => {
    const out = toYYYYMMDD('2025-03-04');
    expect(out).toBe('2025-03-04');
  });

  it('parses ISO string', () => {
    const out = toYYYYMMDD('2025-03-04T10:00:00Z');
    expect(out).toBe('2025-03-04');
  });

  it('returns empty for falsy input', () => {
    // @ts-ignore
    expect(toYYYYMMDD('')).toBe('');
    // @ts-ignore
    expect(toYYYYMMDD(null)).toBe('');
  });
});

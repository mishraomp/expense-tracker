import { describe, it, expect } from 'vitest';
import { sha256Hex } from '../../src/common/utils/checksum';

describe('sha256Hex', () => {
  it('computes correct sha256 hash for string', () => {
    const input = 'hello';
    const expected = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    expect(sha256Hex(input)).toBe(expected);
  });

  it('computes correct sha256 hash for buffer', () => {
    const input = Buffer.from('abc');
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(sha256Hex(input)).toBe(expected);
  });
});

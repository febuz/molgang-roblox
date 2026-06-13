/**
 * Unit tests for keccak.ts — pure TypeScript Keccak-256.
 * Verified against canonical Ethereum vectors.
 */

import { keccak256, keccak256Hex, functionSelector, eventTopic } from '../../src/integrations/chain/keccak';

describe('keccak256', () => {
  it('matches the canonical empty-string vector (Ethereum empty-code hash)', () => {
    expect(keccak256Hex('')).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    );
  });

  it('matches the canonical "abc" vector', () => {
    expect(keccak256Hex('abc')).toBe(
      '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
    );
  });

  it('matches the canonical "testing" vector', () => {
    // keccak256("testing") — widely used in Ethereum tutorials
    expect(keccak256Hex('testing')).toBe(
      '5f16f4c7f149ac4f9510d9cf8cf384038ad348b3bcdc01915f95de12df9d1b02',
    );
  });

  it('returns a 32-byte Buffer', () => {
    expect(keccak256('anything').length).toBe(32);
  });

  it('accepts Buffer input identically to string input', () => {
    expect(keccak256Hex(Buffer.from('abc', 'utf8'))).toBe(keccak256Hex('abc'));
  });

  it('hashes multi-block input (> 136 bytes rate) without error', () => {
    const big = 'x'.repeat(500);
    expect(keccak256Hex(big)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('exactly rate-sized input (136 bytes) triggers an extra padding block', () => {
    const exact = 'a'.repeat(136);
    expect(keccak256Hex(exact)).toMatch(/^[0-9a-f]{64}$/);
    expect(keccak256Hex(exact)).not.toBe(keccak256Hex('a'.repeat(135)));
  });

  it('is deterministic', () => {
    expect(keccak256Hex('determinism')).toBe(keccak256Hex('determinism'));
  });
});

describe('functionSelector', () => {
  it('matches the famous ERC-20 transfer selector 0xa9059cbb', () => {
    expect(functionSelector('transfer(address,uint256)')).toBe('0xa9059cbb');
  });

  it('matches the ERC-20 balanceOf selector 0x70a08231', () => {
    expect(functionSelector('balanceOf(address)')).toBe('0x70a08231');
  });

  it('produces a 4-byte (10-char with 0x) selector for anchor(bytes32)', () => {
    const sel = functionSelector('anchor(bytes32)');
    expect(sel).toMatch(/^0x[0-9a-f]{8}$/);
  });
});

describe('eventTopic', () => {
  it('matches the famous ERC-20 Transfer topic0', () => {
    expect(eventTopic('Transfer(address,address,uint256)')).toBe(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    );
  });

  it('produces a 32-byte topic for Anchored event', () => {
    expect(eventTopic('Anchored(bytes32,uint256,address)')).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readFileTail } from '../../src/utils/readFileTail';

function tmpFile(content: string): string {
  const p = path.join(os.tmpdir(), `rft-${process.pid}-${Math.random().toString(36).slice(2)}.log`);
  fs.writeFileSync(p, content);
  return p;
}

describe('readFileTail', () => {
  it('returns the whole file when smaller than maxBytes', () => {
    const p = tmpFile('line1\nline2\n');
    try { expect(readFileTail(p)).toBe('line1\nline2\n'); } finally { fs.unlinkSync(p); }
  });

  it('returns only the last maxBytes of a larger file', () => {
    const big = 'X'.repeat(200_000) + 'TAIL';
    const p = tmpFile(big);
    try {
      const out = readFileTail(p, 1024);
      expect(out.length).toBe(1024);
      expect(out.endsWith('TAIL')).toBe(true);   // tail preserved
    } finally { fs.unlinkSync(p); }
  });

  it('preserves the last N lines of an unbounded-style log', () => {
    const lines = Array.from({ length: 10000 }, (_, i) => `2026-06-22 line ${i}`).join('\n');
    const p = tmpFile(lines + '\n');
    try {
      const tail = readFileTail(p, 4096).trim().split('\n');
      expect(tail[tail.length - 1]).toBe('2026-06-22 line 9999');
    } finally { fs.unlinkSync(p); }
  });

  it('handles an empty file', () => {
    const p = tmpFile('');
    try { expect(readFileTail(p)).toBe(''); } finally { fs.unlinkSync(p); }
  });
});

/**
 * readFileTail — read only the last `maxBytes` of a file (default 64 KiB).
 *
 * Some endpoints (e.g. /api/gpu/symbiosis) only need the tail of an append-only daemon log that
 * grows unbounded. Reading the whole file synchronously on every poll blocks the event loop and
 * wastes I/O. This reads just the trailing window. A leading partial line is expected — callers
 * use the last N lines / scan backward for a pattern, so a clipped first line is harmless.
 */
import * as fs from 'fs';

export function readFileTail(filePath: string, maxBytes = 64 * 1024): string {
  const fd = fs.openSync(filePath, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, Math.max(0, maxBytes));
    if (len === 0) return '';
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

export default readFileTail;

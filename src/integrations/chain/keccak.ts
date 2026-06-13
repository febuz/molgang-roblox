/**
 * Keccak-256 — pure TypeScript, zero dependencies.
 *
 * Node's crypto module ships SHA-3 (FIPS 202, padding 0x06) but NOT the
 * original Keccak (padding 0x01) that Ethereum uses, so we implement the
 * permutation directly. Used for Solidity ABI selectors and event topics.
 *
 * Verified against the canonical vectors:
 *   keccak256("")    = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
 *     (the well-known Ethereum empty-code hash)
 *   keccak256("abc") = 4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45
 *   selector("transfer(address,uint256)") = 0xa9059cbb
 */

const ROUNDS = 24;

// Round constants as [high32, low32] pairs (64-bit lanes split for JS bitwise ops)
const RC: Array<[number, number]> = [
  [0x00000000, 0x00000001], [0x00000000, 0x00008082],
  [0x80000000, 0x0000808a], [0x80000000, 0x80008000],
  [0x00000000, 0x0000808b], [0x00000000, 0x80000001],
  [0x80000000, 0x80008081], [0x80000000, 0x00008009],
  [0x00000000, 0x0000008a], [0x00000000, 0x00000088],
  [0x00000000, 0x80008009], [0x00000000, 0x8000000a],
  [0x00000000, 0x8000808b], [0x80000000, 0x0000008b],
  [0x80000000, 0x00008089], [0x80000000, 0x00008003],
  [0x80000000, 0x00008002], [0x80000000, 0x00000080],
  [0x00000000, 0x0000800a], [0x80000000, 0x8000000a],
  [0x80000000, 0x80008081], [0x80000000, 0x00008080],
  [0x00000000, 0x80000001], [0x80000000, 0x80008008],
];

// Rotation offsets per lane (x + 5y indexing)
const R = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

/**
 * The keccak-f[1600] permutation over a state of 25 64-bit lanes,
 * each stored as two 32-bit halves: hi[i], lo[i].
 */
function keccakF(hi: Uint32Array, lo: Uint32Array): void {
  const bH = new Uint32Array(25);
  const bL = new Uint32Array(25);
  const cH = new Uint32Array(5);
  const cL = new Uint32Array(5);
  const dH = new Uint32Array(5);
  const dL = new Uint32Array(5);

  for (let round = 0; round < ROUNDS; round++) {
    // θ — column parity
    for (let x = 0; x < 5; x++) {
      cH[x] = hi[x] ^ hi[x + 5] ^ hi[x + 10] ^ hi[x + 15] ^ hi[x + 20];
      cL[x] = lo[x] ^ lo[x + 5] ^ lo[x + 10] ^ lo[x + 15] ^ lo[x + 20];
    }
    for (let x = 0; x < 5; x++) {
      // D[x] = C[x-1] xor rot(C[x+1], 1)
      const x1 = (x + 4) % 5;
      const x2 = (x + 1) % 5;
      const rotH = ((cH[x2] << 1) | (cL[x2] >>> 31)) >>> 0;
      const rotL = ((cL[x2] << 1) | (cH[x2] >>> 31)) >>> 0;
      dH[x] = (cH[x1] ^ rotH) >>> 0;
      dL[x] = (cL[x1] ^ rotL) >>> 0;
    }
    for (let i = 0; i < 25; i++) {
      hi[i] = (hi[i] ^ dH[i % 5]) >>> 0;
      lo[i] = (lo[i] ^ dL[i % 5]) >>> 0;
    }

    // ρ and π — rotate lanes and permute positions
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const i = x + 5 * y;
        const j = y + 5 * ((2 * x + 3 * y) % 5);
        const r = R[i];
        let h: number, l: number;
        if (r === 0) {
          h = hi[i]; l = lo[i];
        } else if (r < 32) {
          h = ((hi[i] << r) | (lo[i] >>> (32 - r))) >>> 0;
          l = ((lo[i] << r) | (hi[i] >>> (32 - r))) >>> 0;
        } else {
          const s = r - 32;
          h = s === 0 ? lo[i] : ((lo[i] << s) | (hi[i] >>> (32 - s))) >>> 0;
          l = s === 0 ? hi[i] : ((hi[i] << s) | (lo[i] >>> (32 - s))) >>> 0;
        }
        bH[j] = h;
        bL[j] = l;
      }
    }

    // χ — nonlinear mix within rows
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const i = x + 5 * y;
        const i1 = ((x + 1) % 5) + 5 * y;
        const i2 = ((x + 2) % 5) + 5 * y;
        hi[i] = (bH[i] ^ (~bH[i1] & bH[i2])) >>> 0;
        lo[i] = (bL[i] ^ (~bL[i1] & bL[i2])) >>> 0;
      }
    }

    // ι — round constant
    hi[0] = (hi[0] ^ RC[round][0]) >>> 0;
    lo[0] = (lo[0] ^ RC[round][1]) >>> 0;
  }
}

/**
 * Keccak-256 of a buffer or UTF-8 string. Returns a 32-byte Buffer.
 * Rate = 1088 bits (136 bytes), capacity = 512 bits, padding = 0x01…0x80.
 */
export function keccak256(input: Buffer | string): Buffer {
  const data = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  const rate = 136; // bytes

  // Pad: append 0x01, zero-fill, set MSB of final byte (multi-rate padding)
  const padLen = rate - (data.length % rate);
  const padded = Buffer.concat([data, Buffer.alloc(padLen)]);
  padded[data.length] |= 0x01;
  padded[padded.length - 1] |= 0x80;

  const hi = new Uint32Array(25);
  const lo = new Uint32Array(25);

  // Absorb — XOR each 136-byte block into the state (little-endian lanes)
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate / 8; i++) {
      lo[i] = (lo[i] ^ padded.readUInt32LE(offset + i * 8)) >>> 0;
      hi[i] = (hi[i] ^ padded.readUInt32LE(offset + i * 8 + 4)) >>> 0;
    }
    keccakF(hi, lo);
  }

  // Squeeze — first 32 bytes of the state
  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    out.writeUInt32LE(lo[i], i * 8);
    out.writeUInt32LE(hi[i], i * 8 + 4);
  }
  return out;
}

/** Keccak-256 as a lowercase hex string (no 0x prefix). */
export function keccak256Hex(input: Buffer | string): string {
  return keccak256(input).toString('hex');
}

/**
 * Solidity function selector: first 4 bytes of keccak256(signature).
 * e.g. functionSelector('anchor(bytes32)') → '0x…8 hex chars'
 */
export function functionSelector(signature: string): string {
  return '0x' + keccak256(signature).subarray(0, 4).toString('hex');
}

/**
 * Solidity event topic0: full keccak256 hash of the event signature.
 * e.g. eventTopic('Anchored(bytes32,uint256,address)')
 */
export function eventTopic(signature: string): string {
  return '0x' + keccak256Hex(signature);
}

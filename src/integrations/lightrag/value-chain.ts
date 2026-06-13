/**
 * Value Chain — capped-supply token ledger over sovereign identities
 *
 * The economic layer that makes attention and contribution WORTH something
 * (Tron BTT lesson: pay for bandwidth; here: pay for validated knowledge).
 * Design rules, learned from Bitcoin / account-model chains:
 *
 *  - EXACT ARITHMETIC (BigInt fixed-point): amounts are integers of the
 *    smallest unit, 1 token = 10⁸ units (satoshi-style). IEEE-754 doubles
 *    are NOT acceptable for money: the cap in units (8.889×10¹⁶) exceeds
 *    Number.MAX_SAFE_INTEGER (9.007×10¹⁵), and float addition is not even
 *    associative — conservation (Σ balances = minted) would silently drift.
 *    With BigInt the conservation invariant holds bit-exactly forever.
 *
 *  - CANONICAL AMOUNT ENCODING: amounts travel as decimal strings matching
 *    ^[1-9][0-9]*$ — no leading zeros, no sign, no decimal point. A
 *    non-canonical encoding of the same number ("007" vs "7") would change
 *    the signed bytes and open a signature-malleability hole.
 *
 *  - HARD SUPPLY CAP: 888 888 888 tokens (mirrors the sparse-matrix
 *    dimension cap). Scarcity is the precondition for market value.
 *
 *  - HALVING ERAS (Bitcoin): the reward is the base amount RIGHT-SHIFTED by
 *    the era (exactly Bitcoin's `subsidy >>= halvings`) — era boundaries at
 *    cap/2, 3cap/4, 7cap/8, … Like Bitcoin's 21M, the cap is approached
 *    asymptotically: once base >> era underflows to 0, emission has ended.
 *
 *  - SELF-CERTIFYING TRANSFERS: a transfer is signed by the sender's
 *    identity key, and the sender DID must derive from that key
 *    (did = sha256(publicKey)). The signature IS the authorization.
 *
 *  - NONCE REPLAY PROTECTION (Ethereum account model): a transfer is valid
 *    only at exactly account.nonce + 1 — the same signed transfer can
 *    never be applied twice.
 *
 *  - SETTLEMENT BLOCKS: applied transfers batch into hash-chained blocks
 *    with a Merkle root over transfer hashes — anchor-ready. Note on
 *    CVE-2012-2459 (Bitcoin's duplicate-leaf Merkle ambiguity): the
 *    odd-leaf-duplication scheme makes [a,b,c] and [a,b,c,c] collide; we
 *    are immune in this usage because tx ids are unique map keys AND the
 *    block hash additionally commits to the full txIds array.
 *
 * REST (registerValueRoutes):
 *   GET  /api/value/supply           — minted / cap / era (all exact strings)
 *   GET  /api/value/balance/:did     — balance (units + tokens) + nonce
 *   POST /api/value/transfer         — node-held sender: sign + apply
 *   POST /api/value/transfer/submit  — externally signed transfer
 *   GET  /api/value/transfers/:did   — transfer history of one account
 *   POST /api/value/blocks/seal      — seal pending transfers into a block
 *   GET  /api/value/blocks           — the block chain + verification
 */

import { verify as edVerify, createPublicKey } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import type { SovereignIdentityService } from './identity';
import { didFromPublicKey } from './identity';
import { canonicalize, sha256, buildMerkleRoot } from './graph-state-root';
import { constantTimeEqual } from './constant-time';
import { SparseMerkleTree, smtKey, type SMTProof } from './sparse-merkle';
import { verifyHbsSignature, type HbsSignature } from './pq-crypto';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Units & supply economics — all BigInt, all exact
// ──────────────────────────────────────────────────────────────────────────────

export const DECIMALS = 8;
export const UNITS_PER_TOKEN = 10n ** BigInt(DECIMALS);

/** Hard cap in whole tokens — mirrors MAX_DIMENSIONS of the semantic space. */
export const SUPPLY_CAP_TOKENS = 888_888_888;

/** Hard cap in smallest units: 8.889×10¹⁶ — beyond double precision. */
export const SUPPLY_CAP_UNITS = BigInt(SUPPLY_CAP_TOKENS) * UNITS_PER_TOKEN;

/** Coinbase pseudo-DID: the only "account" allowed to create new tokens. */
export const COINBASE = 'did:vpc:coinbase';

/** Blocks chain from this constant. */
export const BLOCK_GENESIS = sha256('value-chain-genesis');

/** Memo length cap (DoS bound on signed payload size). */
export const MAX_MEMO_LENGTH = 256;

/**
 * Convert a token amount (number, ≤ 8 decimals) to exact units. Goes through
 * toFixed-string decomposition, NOT `tokens * 1e8`, because the float product
 * is inexact (0.1 * 1e8 === 10000000.000000002 in IEEE-754).
 */
export function tokensToUnits(tokens: number): bigint {
  if (!Number.isFinite(tokens) || tokens <= 0) {
    throw new Error(`token amount must be a positive finite number, got ${tokens}`);
  }
  const [whole, frac = ''] = tokens.toFixed(DECIMALS).split('.');
  return BigInt(whole) * UNITS_PER_TOKEN + BigInt(frac.padEnd(DECIMALS, '0'));
}

/** Human-readable token string for a unit amount (exact, trailing zeros trimmed). */
export function unitsToTokenString(units: bigint): string {
  const whole = units / UNITS_PER_TOKEN;
  const frac = units % UNITS_PER_TOKEN;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(DECIMALS, '0').replace(/0+$/, '')}`;
}

/**
 * Canonical unit-amount string: positive decimal integer, no leading zeros.
 * Canonicality matters for signatures — see the malleability note above.
 */
export function isCanonicalUnits(s: unknown): s is string {
  return typeof s === 'string' && /^[1-9][0-9]{0,19}$/.test(s);
}

/**
 * Halving era at a given minted total. Era k spans
 * [cap·(1−2⁻ᵏ), cap·(1−2⁻⁽ᵏ⁺¹⁾)) — integer arithmetic throughout.
 */
export function eraOf(mintedUnits: bigint): number {
  let era = 0;
  let slice = SUPPLY_CAP_UNITS / 2n;
  let boundary = slice;
  while (slice > 0n && mintedUnits >= boundary && era < 64) {
    era++;
    slice /= 2n;
    boundary += slice;
  }
  return era;
}

/**
 * Era-scaled reward: base >> era (Bitcoin's `subsidy >>= halvings`).
 * Returns 0n once the shift exhausts the base — emission has ended; like
 * Bitcoin's 21M, the final dust below the cap is never minted.
 */
export function scaledReward(baseUnits: bigint, mintedUnits: bigint): bigint {
  return baseUnits >> BigInt(eraOf(mintedUnits));
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface Transfer {
  id: string;
  from: string;                 // sender DID (or COINBASE for minting)
  to: string;                   // recipient DID
  amount: string;               // UNITS as canonical decimal string (signed bytes)
  nonce: number;                // sender's account nonce + 1 (replay protection)
  memo: string;
  ts: string;                   // ISO wall clock (informational, NOT signed)
  publicKeyPem: string;         // sender's key — must derive the sender DID
  signature: string;            // base64 Ed25519 over transferPayload
  /**
   * HYBRID PQ CO-SIGNATURE (POST-QUANTUM-WALLET.md §6, phase 2). Optional
   * hash-based co-signature over the SAME transferPayload bytes. When present
   * BOTH signatures must verify — an attacker must break Ed25519 AND the
   * hash-based scheme. Old transfers without it remain valid.
   */
  pqRoot?: string;              // hex W-OTS+/Merkle public key
  pqSignature?: HbsSignature;   // hash-based signature over transferPayload
}

/** Phase-2 enforcement levels for PQ co-signatures (rollout: optional → require-enrolled). */
export type PqTransferPolicy = 'optional' | 'require-enrolled';

export interface Account {
  did: string;
  balance: bigint;              // exact units
  nonce: number;                // last applied nonce
}

export interface Block {
  height: number;
  prevHash: string;
  txRoot: string;               // Merkle root over transfer hashes
  stateRoot: string;            // SMT root over ALL account states after this block
  txIds: string[];
  sealedAt: string;
  hash: string;
}

/**
 * The exact leaf value an account occupies in the state SMT. Light clients
 * reconstruct this string from a claimed (balance, nonce) pair and verify the
 * SMT proof against an anchored stateRoot — no chain replay needed.
 */
export function accountLeafValue(acc: Pick<Account, 'balance' | 'nonce'>): string {
  return canonicalize({ balance: acc.balance.toString(), nonce: acc.nonce });
}

// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The exact bytes a transfer signature covers. `ts` is EXCLUDED (wall clocks
 * differ between signer and verifier); the nonce already pins uniqueness.
 * `amount` is the canonical unit string — exact and unambiguous.
 */
export function transferPayload(t: Pick<Transfer, 'id' | 'from' | 'to' | 'amount' | 'nonce' | 'memo'>): string {
  return canonicalize({
    id: t.id,
    from: t.from,
    to: t.to,
    amount: t.amount,
    nonce: t.nonce,
    memo: t.memo,
  });
}

export function transferHash(t: Transfer): string {
  return sha256(transferPayload(t));
}

/** Structural + cryptographic validity (stateless — no balance/nonce check). */
export function verifyTransfer(t: Transfer): { valid: boolean; reason?: string } {
  if (!t.from || !t.to || t.from === t.to) return { valid: false, reason: 'from/to invalid' };
  if (!isCanonicalUnits(t.amount)) return { valid: false, reason: 'amount must be a canonical positive unit string' };
  if (BigInt(t.amount) > SUPPLY_CAP_UNITS) return { valid: false, reason: 'amount exceeds the supply cap' };
  if (!Number.isInteger(t.nonce) || t.nonce < 1) return { valid: false, reason: 'nonce must be a positive integer' };
  if (typeof t.memo !== 'string' || t.memo.length > MAX_MEMO_LENGTH) {
    return { valid: false, reason: `memo must be a string of at most ${MAX_MEMO_LENGTH} chars` };
  }
  if (t.from === COINBASE) return { valid: true }; // coinbase txs are minted internally, never accepted from outside
  if (didFromPublicKey(t.publicKeyPem ?? '') !== t.from) {
    return { valid: false, reason: 'sender did does not derive from the signing key' };
  }
  // Hybrid PQ co-signature: when carried, it must verify under the carried
  // root — partial PQ data (one field without the other) is malformed.
  if (t.pqSignature !== undefined || t.pqRoot !== undefined) {
    if (!t.pqSignature || !t.pqRoot) {
      return { valid: false, reason: 'pqRoot and pqSignature must both be present' };
    }
    if (!verifyHbsSignature(transferPayload(t), t.pqSignature, t.pqRoot)) {
      return { valid: false, reason: 'post-quantum co-signature invalid' };
    }
  }
  try {
    const key = createPublicKey(t.publicKeyPem);
    const ok = edVerify(null, Buffer.from(transferPayload(t), 'utf8'), key, Buffer.from(t.signature, 'base64'));
    return ok ? { valid: true } : { valid: false, reason: 'signature mismatch' };
  } catch (e: any) {
    return { valid: false, reason: e.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export class ValueChainService {
  private lightrag: LightRAGClient;
  private identity?: SovereignIdentityService;
  private accounts = new Map<string, Account>();
  private transfers = new Map<string, Transfer>();      // id → transfer (applied)
  private pendingTxIds: string[] = [];                  // applied, not yet sealed
  private blocks: Block[] = [];
  private totalMintedUnits = 0n;
  private coinbaseNonce = 0;
  private maxTransfers: number;
  /** SMT over account states — root committed in every sealed block. */
  private stateTree = new SparseMerkleTree();

  /** Fires for every applied transfer (mint or signed) — consensus + persistence hook. */
  private onTransfer?: (tx: Transfer) => void;
  /** Resolves a DID's enrolled PQ root (wired to PqWalletService). */
  private pqRootResolver?: (did: string) => string | undefined;
  private pqPolicy: PqTransferPolicy;
  /** True while restoreState replays the log — binding checks are skipped. */
  private restoring = false;

  constructor(
    lightrag: LightRAGClient,
    opts: {
      identity?: SovereignIdentityService;
      maxTransfers?: number;
      onTransfer?: (tx: Transfer) => void;
      pqPolicy?: PqTransferPolicy;
    } = {},
  ) {
    this.lightrag = lightrag;
    this.identity = opts.identity;
    this.onTransfer = opts.onTransfer;
    this.pqPolicy = opts.pqPolicy ?? 'optional';
    // DoS bound: the in-memory tx log is capped; past the cap the ledger
    // refuses new transfers until history is archived externally.
    this.maxTransfers = opts.maxTransfers ?? 1_000_000;
  }

  /** Late binding for the transfer hook (services are constructed in dependency order). */
  setOnTransfer(hook: (tx: Transfer) => void): void {
    this.onTransfer = hook;
  }

  /**
   * Late binding for the PQ root resolver (phase 2 hybrid transfers). When
   * wired, a transfer's carried pqRoot must match the sender's enrolled root,
   * and under 'require-enrolled' policy an enrolled sender may no longer
   * submit classical-only transfers.
   */
  setPqRootResolver(resolver: (did: string) => string | undefined): void {
    this.pqRootResolver = resolver;
  }

  setPqPolicy(policy: PqTransferPolicy): void {
    this.pqPolicy = policy;
  }

  getPqPolicy(): PqTransferPolicy {
    return this.pqPolicy;
  }

  // ── Accounts ────────────────────────────────────────────────────────────────

  /** Defensive copy — internal account state must not alias caller objects. */
  getAccount(did: string): Account {
    const acc = this.accounts.get(did);
    return acc ? { ...acc } : { did, balance: 0n, nonce: 0 };
  }

  private creditAccount(did: string, units: bigint): void {
    const acc = this.accounts.get(did) ?? { did, balance: 0n, nonce: 0 };
    acc.balance += units;
    this.accounts.set(did, acc);
    this.stateTree.set(smtKey(did), accountLeafValue(acc));
  }

  // ── State proofs (light clients) ────────────────────────────────────────────

  /** SMT root over all account states — the anchor-able state commitment. */
  getStateRoot(): string {
    return this.stateTree.root;
  }

  // ── Lightning channel escrow — called only by LightningService ──────────────

  /**
   * Lock units in a payment channel escrow (debit, no on-chain Transfer object
   * needed since the channel open is the audit event). Balance and SMT are
   * updated immediately so the locked funds cannot be double-spent.
   */
  channelLock(did: string, units: bigint, channelId: string): { locked: boolean; reason?: string } {
    if (units <= 0n) return { locked: false, reason: 'lock amount must be positive' };
    const acc = this.accounts.get(did) ?? { did, balance: 0n, nonce: 0 };
    if (acc.balance < units) {
      return { locked: false, reason: `insufficient balance: have ${acc.balance} units, need ${units}` };
    }
    acc.balance -= units;
    this.accounts.set(did, acc);
    this.stateTree.set(smtKey(did), accountLeafValue(acc));
    logger.info(`⚡ channel-lock ${channelId}: ${did} locked ${units} units`);
    return { locked: true };
  }

  /**
   * Release units from a settled channel back to the final recipients.
   * Called on both cooperative and force-close settlement. The sum of
   * distributions must equal the original locked amounts (conservation
   * invariant — the caller is responsible for computing correct balances).
   */
  channelSettle(channelId: string, distributions: Array<{ did: string; units: bigint }>): void {
    for (const { did, units } of distributions) {
      if (units > 0n) {
        this.creditAccount(did, units);
        logger.info(`⚡ channel-settle ${channelId}: ${did} received ${units} units`);
      }
    }
  }

  /**
   * O(log n) proof that `did` has exactly its current (balance, nonce) — or a
   * non-inclusion proof when the account has never been touched. The proof
   * verifies against `getStateRoot()` (or the stateRoot in any later block
   * sealed before further mutations) without replaying the chain.
   */
  proveAccount(did: string): { account: ReturnType<ValueChainService['getAccount']>; proof: SMTProof; stateRoot: string } {
    const acc = this.getAccount(did);
    const proof = this.stateTree.proveWithValue(smtKey(did), accountLeafValue(acc));
    return { account: acc, proof, stateRoot: this.stateTree.root };
  }

  /**
   * Conservation invariant: Σ balances ≡ totalMinted, bit-exactly.
   * Transfers move value, minting creates it — nothing else may. Exposed so
   * tests and monitors can assert the ledger never leaks or fabricates value.
   */
  checkConservation(): { holds: boolean; sumBalances: string; minted: string } {
    let sum = 0n;
    for (const acc of this.accounts.values()) sum += acc.balance;
    return {
      holds: sum === this.totalMintedUnits,
      sumBalances: sum.toString(),
      minted: this.totalMintedUnits.toString(),
    };
  }

  // ── Minting (coinbase) ──────────────────────────────────────────────────────

  /**
   * Mint new tokens to a DID at the current era's reward rate
   * (base >> era), clamped to the remaining supply. Returns null when the
   * recipient is not a registered identity (sybil gate), the era shift
   * exhausts the base (emission ended), or the tx log is full.
   */
  mintReward(toDid: string, baseTokens: number, memo = 'reward'): Transfer | null {
    if (!Number.isFinite(baseTokens) || baseTokens <= 0) return null;
    // Sybil resistance: only registered sovereign identities earn rewards
    if (this.identity && !this.identity.resolve(toDid)) return null;
    if (this.transfers.size >= this.maxTransfers) return null;

    const remaining = SUPPLY_CAP_UNITS - this.totalMintedUnits;
    if (remaining <= 0n) return null;
    let units = scaledReward(tokensToUnits(baseTokens), this.totalMintedUnits);
    if (units > remaining) units = remaining;
    if (units <= 0n) return null;

    this.coinbaseNonce++;
    const tx: Transfer = {
      id: `tx_${uuid()}`,
      from: COINBASE,
      to: toDid,
      amount: units.toString(),
      nonce: this.coinbaseNonce,
      memo,
      ts: new Date().toISOString(),
      publicKeyPem: '',
      signature: '',
    };
    this.totalMintedUnits += units;
    this.creditAccount(toDid, units);
    this.applyToLog(tx);
    return tx;
  }

  /** Attention-mining hook: contribution kind weight → era-scaled mint. */
  rewardAttention(toDid: string, kind: string, weight: number): Transfer | null {
    return this.mintReward(toDid, weight, `attention:${kind}`);
  }

  // ── Transfers ───────────────────────────────────────────────────────────────

  /**
   * Create + sign + apply a transfer from a node-held identity.
   * `amountUnits` is exact units (bigint or canonical string).
   */
  transfer(
    fromDid: string,
    toDid: string,
    amountUnits: bigint | string,
    memo = '',
    opts: {
      /** Phase-2 hybrid: co-sign the payload with a hash-based key. */
      pqCoSign?: (payload: string) => { pqRoot: string; pqSignature: HbsSignature };
    } = {},
  ): Transfer {
    if (!this.identity) throw new Error('no identity service wired — use submitTransfer with a signed transfer');
    const amount = typeof amountUnits === 'bigint' ? amountUnits.toString() : amountUnits;
    const acc = this.getAccount(fromDid);
    const unsigned = {
      id: `tx_${uuid()}`,
      from: fromDid,
      to: toDid,
      amount,
      nonce: acc.nonce + 1,
      memo,
    };
    const payload = transferPayload(unsigned);
    const { signature, publicKeyPem } = this.identity.signAs(fromDid, payload);
    const pq = opts.pqCoSign ? opts.pqCoSign(payload) : undefined;
    const tx: Transfer = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature, ...(pq ?? {}) };
    const result = this.submitTransfer(tx);
    if (!result.applied) throw new Error(result.reason);
    return tx;
  }

  /**
   * Apply an externally signed transfer: stateless verification, then the
   * stateful checks — exact next nonce (replay/double-spend protection) and
   * sufficient balance. All amount math in BigInt.
   */
  submitTransfer(tx: Transfer): { applied: boolean; reason?: string } {
    if (this.transfers.has(tx.id)) return { applied: false, reason: 'duplicate transfer id' };
    if (this.transfers.size >= this.maxTransfers) return { applied: false, reason: 'transfer log full' };
    if (tx.from === COINBASE) return { applied: false, reason: 'coinbase transfers cannot be submitted' };
    const check = verifyTransfer(tx);
    if (!check.valid) return { applied: false, reason: check.reason };

    // Phase-2 PQ binding: a carried root must be THE root enrolled for the
    // sender — a valid signature under an attacker's own key proves nothing.
    // Skipped during snapshot replay: enrollment is admission-time state that
    // does not survive a restart; the stateless verify above still ran.
    if (this.pqRootResolver && !this.restoring) {
      const enrolledRoot = this.pqRootResolver(tx.from);
      if (tx.pqRoot && enrolledRoot && tx.pqRoot !== enrolledRoot) {
        return { applied: false, reason: 'pqRoot does not match the sender\'s enrolled PQ key' };
      }
      if (tx.pqRoot && !enrolledRoot) {
        return { applied: false, reason: 'sender has no enrolled PQ key for the carried pqRoot' };
      }
      if (this.pqPolicy === 'require-enrolled' && enrolledRoot && !tx.pqSignature) {
        return { applied: false, reason: 'PQ-enrolled sender must co-sign transfers (policy: require-enrolled)' };
      }
    }

    const amount = BigInt(tx.amount);
    const sender = this.accounts.get(tx.from) ?? { did: tx.from, balance: 0n, nonce: 0 };
    if (tx.nonce !== sender.nonce + 1) {
      return { applied: false, reason: `bad nonce: expected ${sender.nonce + 1}, got ${tx.nonce}` };
    }
    if (sender.balance < amount) {
      return { applied: false, reason: `insufficient balance: ${sender.balance} < ${amount}` };
    }

    sender.balance -= amount;
    sender.nonce = tx.nonce;
    this.accounts.set(tx.from, sender);
    this.stateTree.set(smtKey(tx.from), accountLeafValue(sender));
    this.creditAccount(tx.to, amount);
    this.applyToLog(tx);
    return { applied: true };
  }

  /** Deep copies — internal transfer objects must never leak by reference. */
  transfersOf(did: string, limit = 50): Transfer[] {
    return Array.from(this.transfers.values())
      .filter(t => t.from === did || t.to === did)
      .slice(-limit)
      .map(t => ({ ...t }));
  }

  // ── Blocks ──────────────────────────────────────────────────────────────────

  /**
   * Seal all pending (applied, unsealed) transfers into a block. The block's
   * txRoot is a Merkle root over transfer hashes — anchor-ready. Tx ids are
   * unique (map keys), so the CVE-2012-2459 duplicate-leaf ambiguity cannot
   * arise; the block hash additionally commits to the exact txIds array.
   */
  sealBlock(): Block | null {
    if (this.pendingTxIds.length === 0) return null;
    const txIds = [...this.pendingTxIds];
    this.pendingTxIds = [];
    const leaves = txIds.map(id => transferHash(this.transfers.get(id)!));
    const prevHash = this.blocks.length > 0 ? this.blocks[this.blocks.length - 1].hash : BLOCK_GENESIS;

    const unsigned = {
      height: this.blocks.length,
      prevHash,
      txRoot: buildMerkleRoot(leaves),
      stateRoot: this.stateTree.root,   // commitment to ALL account states
      txIds,
      sealedAt: new Date().toISOString(),
    };
    const block: Block = { ...unsigned, hash: sha256(canonicalize(unsigned)) };
    this.blocks.push(block);
    void this.persistBlock(block);
    logger.info(`🧱 Block #${block.height} sealed: ${txIds.length} tx, root ${block.txRoot.substring(0, 12)}…`);
    return block;
  }

  /** Verify the whole chain: prev pointers, recomputed hashes, tx roots. */
  verifyChain(): { valid: boolean; reason?: string } {
    let prev = BLOCK_GENESIS;
    for (const b of this.blocks) {
      if (!constantTimeEqual(b.prevHash, prev)) return { valid: false, reason: `block ${b.height}: broken prev pointer` };
      const leaves = b.txIds.map(id => {
        const t = this.transfers.get(id);
        return t ? transferHash(t) : sha256(`missing:${id}`);
      });
      if (!constantTimeEqual(buildMerkleRoot(leaves), b.txRoot)) {
        return { valid: false, reason: `block ${b.height}: tx root mismatch` };
      }
      const { hash, ...body } = b;
      if (!constantTimeEqual(sha256(canonicalize(body)), hash)) {
        return { valid: false, reason: `block ${b.height}: bad hash` };
      }
      prev = b.hash;
    }
    return { valid: true };
  }

  getBlocks(limit = 20): Block[] {
    return this.blocks.slice(-limit).map(b => ({ ...b, txIds: [...b.txIds] }));
  }

  // ── Persistence (export / restore) ──────────────────────────────────────────

  /**
   * Serializable chain state: the ordered transfer log plus sealed blocks.
   * Accounts, supply and the state tree are NOT exported — they are derived
   * state, rebuilt deterministically by replaying the log on restore.
   */
  exportState(): { transfers: Transfer[]; blocks: Block[] } {
    return {
      transfers: Array.from(this.transfers.values()).map(t => ({ ...t })),
      blocks: this.blocks.map(b => ({ ...b, txIds: [...b.txIds] })),
    };
  }

  /**
   * Rebuild the ledger from an exported state by replaying every transfer in
   * log order. Signed transfers are re-verified cryptographically; coinbase
   * entries are re-applied through the internal mint path (the identity-
   * registration gate is skipped — the recipient was registered when the
   * mint originally happened). Throws if the replayed chain fails to verify.
   */
  restoreState(state: { transfers: Transfer[]; blocks: Block[] }): void {
    if (this.transfers.size > 0) throw new Error('restoreState requires an empty ledger');
    this.restoring = true;
    try {
      this.restoreStateInner(state);
    } finally {
      this.restoring = false;
    }
  }

  private restoreStateInner(state: { transfers: Transfer[]; blocks: Block[] }): void {
    for (const tx of state.transfers) {
      if (tx.from === COINBASE) {
        const units = BigInt(tx.amount);
        this.totalMintedUnits += units;
        if (this.totalMintedUnits > SUPPLY_CAP_UNITS) throw new Error('restore: supply cap exceeded');
        this.coinbaseNonce = Math.max(this.coinbaseNonce, tx.nonce);
        this.creditAccount(tx.to, units);
        this.transfers.set(tx.id, { ...tx });
        this.pendingTxIds.push(tx.id);
      } else {
        const result = this.submitTransfer({ ...tx });
        if (!result.applied) throw new Error(`restore: transfer ${tx.id} rejected: ${result.reason}`);
      }
    }
    // Re-adopt the sealed blocks; whatever they cover leaves pending
    const sealed = new Set<string>();
    for (const b of state.blocks) {
      this.blocks.push({ ...b, txIds: [...b.txIds] });
      for (const id of b.txIds) sealed.add(id);
    }
    this.pendingTxIds = this.pendingTxIds.filter(id => !sealed.has(id));
    const check = this.verifyChain();
    if (!check.valid) throw new Error(`restore: chain verification failed: ${check.reason}`);
    const conservation = this.checkConservation();
    if (!conservation.holds) throw new Error('restore: conservation invariant broken');
    logger.info(`💾 Ledger restored: ${this.transfers.size} tx, ${this.blocks.length} blocks, ${this.accounts.size} accounts`);
  }

  // ── Supply stats ────────────────────────────────────────────────────────────

  getSupply() {
    return {
      capTokens: SUPPLY_CAP_TOKENS,
      capUnits: SUPPLY_CAP_UNITS.toString(),
      mintedUnits: this.totalMintedUnits.toString(),
      mintedTokens: unitsToTokenString(this.totalMintedUnits),
      remainingUnits: (SUPPLY_CAP_UNITS - this.totalMintedUnits).toString(),
      era: eraOf(this.totalMintedUnits),
      accounts: this.accounts.size,
      transfers: this.transfers.size,
      blocks: this.blocks.length,
      pendingTx: this.pendingTxIds.length,
      conservation: this.checkConservation().holds,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private applyToLog(tx: Transfer): void {
    this.transfers.set(tx.id, tx);
    this.pendingTxIds.push(tx.id);
    void this.persistTransfer(tx);
    try { this.onTransfer?.(tx); } catch (e: any) { logger.warn(`onTransfer hook: ${e.message}`); }
  }

  private async persistTransfer(tx: Transfer): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(tx.id, 'ValueTransfer', {
        from_did: tx.from,
        to_did: tx.to,
        amount_units: tx.amount,
        nonce: tx.nonce,
        memo: tx.memo,
        ts: tx.ts,
        content: `${tx.from} → ${tx.to}: ${unitsToTokenString(BigInt(tx.amount))} (${tx.memo})`,
      });
    } catch (e: any) {
      logger.warn(`value persist: ${e.message}`);
    }
  }

  private async persistBlock(block: Block): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(`block_${block.hash.substring(0, 24)}`, 'ValueBlock', {
        height: block.height,
        prev_hash: block.prevHash,
        tx_root: block.txRoot,
        tx_count: block.txIds.length,
        sealed_at: block.sealedAt,
        content: `Value block #${block.height} (${block.txIds.length} tx)`,
      });
    } catch (e: any) {
      logger.warn(`block persist: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes — bigint fields serialized as exact decimal strings
// ──────────────────────────────────────────────────────────────────────────────

function serializeAccount(acc: Account) {
  return {
    did: acc.did,
    balanceUnits: acc.balance.toString(),
    balanceTokens: unitsToTokenString(acc.balance),
    nonce: acc.nonce,
  };
}

export function registerValueRoutes(app: Express, service: ValueChainService): void {

  app.get('/api/value/supply', (_req: Request, res: Response): void => {
    res.json({ success: true, ...service.getSupply() });
  });

  app.get('/api/value/balance/:did', (req: Request, res: Response): void => {
    res.json({ success: true, account: serializeAccount(service.getAccount(req.params.did)) });
  });

  app.post('/api/value/transfer', (req: Request, res: Response): void => {
    const { from, to, amountUnits, amountTokens, memo } = req.body ?? {};
    let units: string;
    if (typeof amountUnits === 'string') units = amountUnits;
    else if (typeof amountTokens === 'number') {
      try { units = tokensToUnits(amountTokens).toString(); }
      catch (e: any) { res.status(400).json({ success: false, error: e.message }); return; }
    } else {
      res.status(400).json({ success: false, error: 'from, to and amountUnits (string) or amountTokens (number) required' });
      return;
    }
    if (!from || !to) {
      res.status(400).json({ success: false, error: 'from, to required' }); return;
    }
    try {
      const tx = service.transfer(from, to, units, memo ?? '');
      res.status(201).json({ success: true, transfer: tx });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/value/transfer/submit', (req: Request, res: Response): void => {
    const tx = req.body as Transfer;
    if (!tx?.signature || !tx?.from) {
      res.status(400).json({ success: false, error: 'signed transfer body required' }); return;
    }
    const result = service.submitTransfer(tx);
    res.status(result.applied ? 201 : 409).json({ success: result.applied, ...result });
  });

  app.get('/api/value/state-root', (_req: Request, res: Response): void => {
    res.json({ success: true, stateRoot: service.getStateRoot() });
  });

  app.get('/api/value/proof/:did', (req: Request, res: Response): void => {
    const { account, proof, stateRoot } = service.proveAccount(req.params.did);
    res.json({
      success: true,
      account: serializeAccount(account),
      leafValue: accountLeafValue(account),
      proof,
      stateRoot,
    });
  });

  app.get('/api/value/transfers/:did', (req: Request, res: Response): void => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    res.json({ success: true, transfers: service.transfersOf(req.params.did, limit) });
  });

  app.post('/api/value/blocks/seal', (_req: Request, res: Response): void => {
    const block = service.sealBlock();
    if (!block) { res.json({ success: true, sealed: false, message: 'no pending transfers' }); return; }
    res.status(201).json({ success: true, sealed: true, block });
  });

  app.get('/api/value/blocks', (req: Request, res: Response): void => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    res.json({ success: true, blocks: service.getBlocks(limit), verification: service.verifyChain() });
  });

  logger.info('✓ Value Chain API registered (/api/value/*)');
}

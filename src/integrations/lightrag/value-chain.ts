/**
 * Value Chain — capped-supply token ledger over sovereign identities
 *
 * The economic layer that makes attention and contribution WORTH something
 * (Tron BTT lesson: pay for bandwidth; here: pay for validated knowledge).
 * Design rules, learned from Bitcoin / account-model chains:
 *
 *  - HARD SUPPLY CAP: 888 888 888 tokens (mirrors the sparse-matrix
 *    dimension cap — one token of headroom per semantic dimension).
 *    Scarcity is the precondition for market value.
 *
 *  - HALVING ERAS (Bitcoin): minting rewards halve each time half of the
 *    REMAINING supply has been issued — era 0 mints at full rate until
 *    cap/2 is out, era 1 at half rate until 3cap/4, and so on. Geometric
 *    issuance converges to the cap and never exceeds it.
 *
 *  - SELF-CERTIFYING TRANSFERS: a transfer is signed by the sender's
 *    identity key, and the sender DID must derive from that key
 *    (did = sha256(publicKey)). No account registry needs to be trusted
 *    to validate a payment — the signature IS the authorization.
 *
 *  - NONCE REPLAY PROTECTION (Ethereum account model): each account carries
 *    a strictly incrementing nonce; a transfer is valid only at exactly
 *    nonce+1, so the same signed transfer can never be applied twice.
 *
 *  - SETTLEMENT BLOCKS: applied transfers batch into hash-chained blocks
 *    with a Merkle root over transfer hashes — the block root plugs
 *    straight into AnchorService/OTS, anchoring the ledger to Bitcoin or
 *    Ethereum for external auditability.
 *
 * REST (registerValueRoutes):
 *   GET  /api/value/supply           — minted / cap / era / current reward rate
 *   GET  /api/value/balance/:did     — balance + nonce
 *   POST /api/value/transfer         — node-held sender: sign + apply
 *   POST /api/value/transfer/submit  — externally signed transfer
 *   GET  /api/value/transfers/:did   — transfer history of one account
 *   POST /api/value/blocks/seal      — seal pending transfers into a block
 *   GET  /api/value/blocks           — the block chain
 */

import { verify as edVerify, createPublicKey } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import type { SovereignIdentityService } from './identity';
import { didFromPublicKey } from './identity';
import { canonicalize, sha256, buildMerkleRoot } from './graph-state-root';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Supply economics
// ──────────────────────────────────────────────────────────────────────────────

/** Hard cap — mirrors MAX_DIMENSIONS of the sparse semantic space. */
export const SUPPLY_CAP = 888_888_888;

/** Coinbase pseudo-DID: the only "account" allowed to create new tokens. */
export const COINBASE = 'did:vpc:coinbase';

/** Blocks chain from this constant. */
export const BLOCK_GENESIS = sha256('value-chain-genesis');

/**
 * Halving era for a given minted total. Era k spans
 * [cap·(1−2⁻ᵏ), cap·(1−2⁻⁽ᵏ⁺¹⁾)): era 0 until half the cap is out,
 * era 1 until three quarters, … (Bitcoin's schedule, supply-indexed).
 */
export function eraOf(minted: number): number {
  let era = 0;
  let slice = SUPPLY_CAP / 2;
  let boundary = slice;
  while (minted >= boundary && era < 53) {
    era++;
    slice /= 2;
    boundary += slice;
  }
  return era;
}

/** Reward multiplier at a minted total: 2⁻ᵉʳᵃ. */
export function rewardMultiplier(minted: number): number {
  return Math.pow(2, -eraOf(minted));
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface Transfer {
  id: string;
  from: string;                 // sender DID (or COINBASE for minting)
  to: string;                   // recipient DID
  amount: number;               // > 0, finite
  nonce: number;                // sender's account nonce + 1 (replay protection)
  memo: string;
  ts: string;                   // ISO wall clock (informational, NOT signed)
  publicKeyPem: string;         // sender's key — must derive the sender DID
  signature: string;            // base64 Ed25519 over transferPayload
}

export interface Account {
  did: string;
  balance: number;
  nonce: number;                // last applied nonce
}

export interface Block {
  height: number;
  prevHash: string;
  txRoot: string;               // Merkle root over transfer hashes
  txIds: string[];
  sealedAt: string;
  hash: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The exact bytes a transfer signature covers. `ts` is EXCLUDED (wall clocks
 * differ between signer and verifier); the nonce already pins uniqueness.
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
  if (!Number.isFinite(t.amount) || t.amount <= 0) return { valid: false, reason: 'amount must be positive' };
  if (!Number.isInteger(t.nonce) || t.nonce < 1) return { valid: false, reason: 'nonce must be a positive integer' };
  if (t.from === COINBASE) return { valid: true }; // coinbase txs are minted internally, never accepted from outside
  if (didFromPublicKey(t.publicKeyPem ?? '') !== t.from) {
    return { valid: false, reason: 'sender did does not derive from the signing key' };
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
  private totalMinted = 0;
  private coinbaseNonce = 0;

  constructor(lightrag: LightRAGClient, opts: { identity?: SovereignIdentityService } = {}) {
    this.lightrag = lightrag;
    this.identity = opts.identity;
  }

  // ── Accounts ────────────────────────────────────────────────────────────────

  getAccount(did: string): Account {
    return this.accounts.get(did) ?? { did, balance: 0, nonce: 0 };
  }

  private creditAccount(did: string, amount: number): void {
    const acc = this.accounts.get(did) ?? { did, balance: 0, nonce: 0 };
    acc.balance += amount;
    this.accounts.set(did, acc);
  }

  // ── Minting (coinbase) ──────────────────────────────────────────────────────

  /**
   * Mint new tokens to a DID at the current era's reward rate. The base
   * amount is scaled by 2⁻ᵉʳᵃ and clamped to the remaining supply, so the
   * cap can never be exceeded. Returns the minted transfer, or null when
   * the recipient is not a registered identity (sybil gate) or supply is out.
   */
  mintReward(toDid: string, baseAmount: number, memo = 'reward'): Transfer | null {
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) return null;
    // Sybil resistance: only registered sovereign identities earn rewards
    if (this.identity && !this.identity.resolve(toDid)) return null;
    const remaining = SUPPLY_CAP - this.totalMinted;
    if (remaining <= 0) return null;
    const amount = Math.min(baseAmount * rewardMultiplier(this.totalMinted), remaining);

    this.coinbaseNonce++;
    const tx: Transfer = {
      id: `tx_${uuid()}`,
      from: COINBASE,
      to: toDid,
      amount,
      nonce: this.coinbaseNonce,
      memo,
      ts: new Date().toISOString(),
      publicKeyPem: '',
      signature: '',
    };
    this.totalMinted += amount;
    this.creditAccount(toDid, amount);
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
   * Requires the identity service (it holds the private key).
   */
  transfer(fromDid: string, toDid: string, amount: number, memo = ''): Transfer {
    if (!this.identity) throw new Error('no identity service wired — use submitTransfer with a signed transfer');
    const acc = this.getAccount(fromDid);
    const unsigned = {
      id: `tx_${uuid()}`,
      from: fromDid,
      to: toDid,
      amount,
      nonce: acc.nonce + 1,
      memo,
    };
    const { signature, publicKeyPem } = this.identity.signAs(fromDid, transferPayload(unsigned));
    const tx: Transfer = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature };
    const result = this.submitTransfer(tx);
    if (!result.applied) throw new Error(result.reason);
    return tx;
  }

  /**
   * Apply an externally signed transfer: stateless verification, then the
   * stateful checks — exact next nonce (replay/double-spend protection) and
   * sufficient balance.
   */
  submitTransfer(tx: Transfer): { applied: boolean; reason?: string } {
    if (this.transfers.has(tx.id)) return { applied: false, reason: 'duplicate transfer id' };
    if (tx.from === COINBASE) return { applied: false, reason: 'coinbase transfers cannot be submitted' };
    const check = verifyTransfer(tx);
    if (!check.valid) return { applied: false, reason: check.reason };

    const sender = this.getAccount(tx.from);
    if (tx.nonce !== sender.nonce + 1) {
      return { applied: false, reason: `bad nonce: expected ${sender.nonce + 1}, got ${tx.nonce}` };
    }
    if (sender.balance < tx.amount) {
      return { applied: false, reason: `insufficient balance: ${sender.balance} < ${tx.amount}` };
    }

    sender.balance -= tx.amount;
    sender.nonce = tx.nonce;
    this.accounts.set(tx.from, sender);
    this.creditAccount(tx.to, tx.amount);
    this.applyToLog(tx);
    return { applied: true };
  }

  transfersOf(did: string, limit = 50): Transfer[] {
    return Array.from(this.transfers.values())
      .filter(t => t.from === did || t.to === did)
      .slice(-limit);
  }

  // ── Blocks ──────────────────────────────────────────────────────────────────

  /**
   * Seal all pending (applied, unsealed) transfers into a block. The block's
   * txRoot is a Merkle root over transfer hashes — anchor-ready.
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
      if (b.prevHash !== prev) return { valid: false, reason: `block ${b.height}: broken prev pointer` };
      const leaves = b.txIds.map(id => {
        const t = this.transfers.get(id);
        return t ? transferHash(t) : sha256(`missing:${id}`);
      });
      if (buildMerkleRoot(leaves) !== b.txRoot) return { valid: false, reason: `block ${b.height}: tx root mismatch` };
      const { hash, ...body } = b;
      if (sha256(canonicalize(body)) !== hash) return { valid: false, reason: `block ${b.height}: bad hash` };
      prev = b.hash;
    }
    return { valid: true };
  }

  getBlocks(limit = 20): Block[] {
    return this.blocks.slice(-limit);
  }

  // ── Supply stats ────────────────────────────────────────────────────────────

  getSupply() {
    return {
      cap: SUPPLY_CAP,
      minted: this.totalMinted,
      remaining: SUPPLY_CAP - this.totalMinted,
      era: eraOf(this.totalMinted),
      rewardMultiplier: rewardMultiplier(this.totalMinted),
      accounts: this.accounts.size,
      transfers: this.transfers.size,
      blocks: this.blocks.length,
      pendingTx: this.pendingTxIds.length,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private applyToLog(tx: Transfer): void {
    this.transfers.set(tx.id, tx);
    this.pendingTxIds.push(tx.id);
    void this.persistTransfer(tx);
  }

  private async persistTransfer(tx: Transfer): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(tx.id, 'ValueTransfer', {
        from_did: tx.from,
        to_did: tx.to,
        amount: tx.amount,
        nonce: tx.nonce,
        memo: tx.memo,
        ts: tx.ts,
        content: `${tx.from} → ${tx.to}: ${tx.amount} (${tx.memo})`,
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
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerValueRoutes(app: Express, service: ValueChainService): void {

  app.get('/api/value/supply', (_req: Request, res: Response): void => {
    res.json({ success: true, ...service.getSupply() });
  });

  app.get('/api/value/balance/:did', (req: Request, res: Response): void => {
    res.json({ success: true, account: service.getAccount(req.params.did) });
  });

  app.post('/api/value/transfer', (req: Request, res: Response): void => {
    const { from, to, amount, memo } = req.body ?? {};
    if (!from || !to || typeof amount !== 'number') {
      res.status(400).json({ success: false, error: 'from, to, amount required' }); return;
    }
    try {
      res.status(201).json({ success: true, transfer: service.transfer(from, to, amount, memo ?? '') });
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

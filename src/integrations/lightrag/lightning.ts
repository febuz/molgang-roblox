/**
 * Lightning Network — off-chain payment channels over the VPC value chain
 *
 * A Lightning-style protocol enabling instant, fee-minimal, high-volume
 * payments between nodes without touching the chain for every transfer.
 * Design mirrors BOLT #2 (channel establishment), #3 (commitment transactions),
 * and #4 (onion routing) at the semantic level, adapted for this stack:
 *
 *  PAYMENT CHANNELS — two parties lock on-chain funds into escrow. They
 *  exchange signed commitment states off-chain; only the FINAL balance
 *  (or a force-close of the latest state) settles on-chain. The channel
 *  capacity is immutable; balances shift with each off-chain payment.
 *
 *  HASH-TIME-LOCKED CONTRACTS (HTLCs) — atomic multi-hop routing. A
 *  payment from A to C via B uses an HTLC where B is only credited if it
 *  forwards a preimage it learns from C. If C doesn't reveal the preimage
 *  within the expiry window, the HTLC fails and no money moves.
 *
 *  SOURCE ROUTING — the sender computes the full route using Dijkstra over
 *  the channel graph (capacity-weighted). This keeps routing local;
 *  no channel discovery gossip protocol is needed.
 *
 *  BREACH REMEDY — if a party broadcasts a revoked commitment (old state),
 *  the counterparty can claim the entire channel balance using the stored
 *  revocation secret for that state. The watchtower hook lets external
 *  monitors enforce this.
 *
 *  FORK-SAFE COMMITMENTS — every commitment stateHash includes the
 *  network ID (imported from protocol-version.ts). A commitment signed on
 *  vpc-mainnet is cryptographically invalid on any fork with a different
 *  network ID. This mirrors EIP-155 and BOLT's chain_hash.
 *
 *  PQ-SAFE CHANNELS (optional) — when both parties have enrolled PQ keys,
 *  commitment signatures can be co-signed with hash-based OTS, giving
 *  quantum-resistant channel state proofs without a CRQC.
 *
 * REST (registerLightningRoutes):
 *   POST   /api/lightning/channels              — open channel
 *   GET    /api/lightning/channels              — list channels
 *   GET    /api/lightning/channels/:id          — channel detail + HTLCs
 *   POST   /api/lightning/channels/:id/close    — cooperative close
 *   POST   /api/lightning/channels/:id/force-close — force close (unilateral)
 *   POST   /api/lightning/send                  — off-chain payment
 *   POST   /api/lightning/htlc/resolve          — reveal preimage (receiver)
 *   GET    /api/lightning/graph                 — channel graph (nodes + edges)
 *   GET    /api/lightning/stats                 — capacity, payments, channels
 */

import { createHash, randomBytes } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { IdentityPort } from './identity-port';
import type { ValueChainService } from './value-chain';
import { canonicalize, sha256, buildMerkleRoot } from './graph-state-root';
import { verifyHbsSignature, type HashBasedSigner, type HbsSignature } from './pq-crypto';
import { PROTOCOL_VERSION, DEFAULT_NETWORK_ID } from './protocol-version';
import logger from '../../utils/logger';

// ── DoS bounds ────────────────────────────────────────────────────────────────
export const MAX_CHANNELS = 100_000;
export const MAX_HTLCS_PER_CHANNEL = 483;   // BOLT #2 limit
export const MAX_HOPS = 20;
export const MAX_PAYMENTS = 1_000_000;
export const CHANNEL_DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000;  // 1 day (logical)
export const MAX_MEMO_LENGTH = 256;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChannelStatus =
  | 'pending'               // proposed, not yet both-signed
  | 'open'                  // both parties confirmed; usable
  | 'closing_cooperative'   // mutual close in progress
  | 'closing_force'         // unilateral close; dispute window open
  | 'closed';               // settled on chain

export type HTLCDirection = 'outgoing' | 'incoming';
export type HTLCStatus = 'pending' | 'resolved' | 'failed';
export type PaymentStatus = 'routing' | 'settled' | 'failed';

export interface HTLC {
  id: string;
  channelId: string;
  amount: bigint;
  paymentHash: string;      // sha256(preimage)
  expiryMs: number;         // logical expiry in ms since epoch
  direction: HTLCDirection;
  status: HTLCStatus;
  preimage?: string;        // revealed when resolved (hex)
  addedAt: string;
  resolvedAt?: string;
}

/** A jointly signed commitment state — both signatures required for validity. */
export interface ChannelCommitment {
  channelId: string;
  sequenceNumber: number;
  localBalance: bigint;     // local party's balance
  remoteBalance: bigint;    // remote party's balance
  htlcRoot: string;         // sha256 over canonical HTLC set
  /** Network ID embedded for fork-replay protection (like EIP-155 / BOLT chain_hash). */
  networkId: string;
  protocolVersion: string;  // semver string e.g. "1.2.0"
  /** sha256(canonical({channelId, sequenceNumber, localBalance, remoteBalance, htlcRoot, networkId, protocolVersion})) */
  stateHash: string;
  localSignature: string;   // base64 Ed25519 over stateHash
  remoteSignature: string;  // base64 Ed25519 over stateHash
  pqLocalSig?: HbsSignature;   // optional PQ co-signature
  pqRemoteSig?: HbsSignature;
  pqLocalRoot?: string;
  pqRemoteRoot?: string;
}

export interface ChannelState {
  sequenceNumber: number;
  localBalance: bigint;
  remoteBalance: bigint;
  htlcs: HTLC[];
  commitment: ChannelCommitment | null;  // null until both parties sign
}

export interface Channel {
  id: string;
  localDid: string;
  remoteDid: string;
  /** Total locked capacity (immutable after open). */
  capacity: bigint;
  status: ChannelStatus;
  openedAt: string;
  closedAt?: string;
  forceClosedAt?: string;
  forceCloseDisputeExpiresAt?: string;
  state: ChannelState;
  /** Revocation secrets keyed by sequence number — used for breach remedy. */
  revocationSecrets: Map<number, string>;
  memo?: string;
}

export interface PaymentRoute {
  path: string[];           // [senderDid, hop1Did, ..., receiverDid]
  channelIds: string[];     // channelId for each hop (length = path.length - 1)
  hopFees: bigint[];        // fee taken by each intermediate hop
  totalFee: bigint;
  totalAmount: bigint;      // what sender locks (includes all fees)
  expiryDecrementMs: number;
}

export interface LightningPayment {
  id: string;
  sender: string;
  receiver: string;
  amount: bigint;           // delivered amount (no fees)
  paymentHash: string;
  paymentPreimage?: string;
  memo?: string;
  route: PaymentRoute;
  status: PaymentStatus;
  createdAt: string;
  settledAt?: string;
  failedAt?: string;
  failureReason?: string;
}

// ── Commitment payload builder ────────────────────────────────────────────────

function commitmentPayload(
  channelId: string,
  seq: number,
  localBalance: bigint,
  remoteBalance: bigint,
  htlcs: HTLC[],
  networkId: string,
): string {
  const htlcRoot = sha256(canonicalize(htlcs.map(h => ({
    id: h.id, amount: h.amount.toString(), paymentHash: h.paymentHash,
    expiryMs: h.expiryMs, direction: h.direction, status: h.status,
  }))));
  return canonicalize({
    channelId, sequenceNumber: seq,
    localBalance: localBalance.toString(),
    remoteBalance: remoteBalance.toString(),
    htlcRoot, networkId,
    protocolVersion: `${PROTOCOL_VERSION.major}.${PROTOCOL_VERSION.minor}.${PROTOCOL_VERSION.patch}`,
  });
}

function stateHashOf(payload: string): string {
  return sha256(payload);
}

function htlcRoot(htlcs: HTLC[]): string {
  const leaves = htlcs.map(h => sha256(h.id + h.paymentHash));
  return buildMerkleRoot(leaves.length > 0 ? leaves : [sha256('empty-htlc-set')]);
}

// ── LightningService ──────────────────────────────────────────────────────────

export interface LightningServiceOpts {
  networkId?: string;
  maxChannels?: number;
  maxHtlcsPerChannel?: number;
  /** Called when a breach is detected (old-state force-close). External watchtower hook. */
  onBreach?: (channelId: string, victimDid: string, breacherDid: string, penalty: bigint) => void;
  /** Called after any channel settles (cooperative or force-close). */
  onSettle?: (channelId: string, distributions: Array<{ did: string; units: bigint }>) => void;
}

export class LightningService {
  private channels = new Map<string, Channel>();
  private payments = new Map<string, LightningPayment>();
  /** paymentHash → preimage (only populated after the receiver reveals it) */
  private revealedPreimages = new Map<string, string>();
  private readonly networkId: string;
  private readonly maxChannels: number;
  private readonly maxHtlcsPerChannel: number;
  private readonly opts: LightningServiceOpts;

  constructor(
    private readonly identity: IdentityPort,
    private readonly valueChain: ValueChainService,
    opts: LightningServiceOpts = {},
  ) {
    this.networkId = opts.networkId ?? DEFAULT_NETWORK_ID;
    this.maxChannels = opts.maxChannels ?? MAX_CHANNELS;
    this.maxHtlcsPerChannel = opts.maxHtlcsPerChannel ?? MAX_HTLCS_PER_CHANNEL;
    this.opts = opts;
  }

  // ── Channel lifecycle ──────────────────────────────────────────────────────

  /**
   * Open a bidirectional payment channel. Funds are locked immediately from
   * both parties' on-chain balances. Both parties sign commitment state #0.
   *
   * In a real P2P network the remote party would need to send back their
   * signature via the gossip layer; here both DIDs are local so we can sign
   * for both in one call (use confirmChannelOpen for the two-step protocol).
   */
  openChannel(params: {
    localDid: string;
    remoteDid: string;
    localUnits: bigint;
    remoteUnits?: bigint;
    memo?: string;
    localPqSigner?: HashBasedSigner;
    remotePqSigner?: HashBasedSigner;
  }): Channel {
    if (this.channels.size >= this.maxChannels) {
      throw Object.assign(new Error('channel table full'), { status: 429 });
    }
    const { localDid, remoteDid, memo } = params;
    const localUnits = params.localUnits;
    const remoteUnits = params.remoteUnits ?? 0n;

    if (localUnits <= 0n && remoteUnits <= 0n) {
      throw Object.assign(new Error('at least one party must fund the channel'), { status: 422 });
    }
    if (localDid === remoteDid) {
      throw Object.assign(new Error('cannot open a channel with yourself'), { status: 422 });
    }

    // Lock funds on-chain from both parties
    if (localUnits > 0n) {
      const r = this.valueChain.channelLock(localDid, localUnits, 'pre-id');
      if (!r.locked) throw Object.assign(new Error(`local party: ${r.reason}`), { status: 422 });
    }
    if (remoteUnits > 0n) {
      const r = this.valueChain.channelLock(remoteDid, remoteUnits, 'pre-id');
      if (!r.locked) {
        // Rollback local lock
        if (localUnits > 0n) this.valueChain.channelSettle('rollback', [{ did: localDid, units: localUnits }]);
        throw Object.assign(new Error(`remote party: ${r.reason}`), { status: 422 });
      }
    }

    const channelId = `ln_${uuid()}`;
    const capacity = localUnits + remoteUnits;
    const now = new Date().toISOString();

    const state: ChannelState = {
      sequenceNumber: 0,
      localBalance: localUnits,
      remoteBalance: remoteUnits,
      htlcs: [],
      commitment: null,
    };

    const channel: Channel = {
      id: channelId,
      localDid,
      remoteDid,
      capacity,
      status: 'pending',
      openedAt: now,
      state,
      revocationSecrets: new Map(),
      memo,
    };
    this.channels.set(channelId, channel);

    // Sign commitment #0 (both parties since they're all local)
    const commitment = this.buildAndSignCommitment(
      channel, 0, localUnits, remoteUnits, [],
      params.localPqSigner, params.remotePqSigner,
    );
    channel.state.commitment = commitment;
    channel.status = 'open';

    logger.info(`⚡ channel opened ${channelId}: ${localDid} ↔ ${remoteDid} (capacity: ${capacity})`);
    return this.exportChannel(channel);
  }

  /** Two-step protocol: propose channel, get back the pending commitment for remote to sign. */
  proposeChannel(params: {
    localDid: string;
    remoteDid: string;
    localUnits: bigint;
    memo?: string;
  }): { channelId: string; stateHash: string; localSignature: string } {
    if (params.localUnits <= 0n) throw Object.assign(new Error('localUnits must be positive'), { status: 422 });
    if (params.localDid === params.remoteDid) throw Object.assign(new Error('cannot open channel with yourself'), { status: 422 });

    const r = this.valueChain.channelLock(params.localDid, params.localUnits, 'pre-id');
    if (!r.locked) throw Object.assign(new Error(r.reason!), { status: 422 });

    const channelId = `ln_${uuid()}`;
    const payload = commitmentPayload(channelId, 0, params.localUnits, 0n, [], this.networkId);
    const stateHash = stateHashOf(payload);
    const { signature: localSignature } = this.identity.signAs(params.localDid, stateHash);

    const channel: Channel = {
      id: channelId,
      localDid: params.localDid,
      remoteDid: params.remoteDid,
      capacity: params.localUnits,
      status: 'pending',
      openedAt: new Date().toISOString(),
      state: { sequenceNumber: 0, localBalance: params.localUnits, remoteBalance: 0n, htlcs: [], commitment: null },
      revocationSecrets: new Map(),
      memo: params.memo,
    };
    this.channels.set(channelId, channel);
    logger.info(`⚡ channel proposed ${channelId} (pending remote confirmation)`);
    return { channelId, stateHash, localSignature };
  }

  /** Confirm a pending channel. Remote party locks funds and counter-signs. */
  confirmChannelOpen(channelId: string, remoteDid: string, remoteUnits: bigint, remoteSignature: string): Channel {
    const channel = this.getChannelOrThrow(channelId);
    if (channel.status !== 'pending') throw Object.assign(new Error('channel already confirmed'), { status: 409 });
    if (channel.remoteDid !== remoteDid) throw Object.assign(new Error('remoteDid mismatch'), { status: 422 });

    if (remoteUnits > 0n) {
      const r = this.valueChain.channelLock(remoteDid, remoteUnits, channelId);
      if (!r.locked) throw Object.assign(new Error(r.reason!), { status: 422 });
      channel.state.remoteBalance = remoteUnits;
      (channel as any).capacity = channel.state.localBalance + remoteUnits;
    }

    // Verify remote signature
    const payload = commitmentPayload(channelId, 0, channel.state.localBalance, channel.state.remoteBalance, [], this.networkId);
    const stateHash = stateHashOf(payload);
    this.verifyOrThrow(remoteDid, stateHash, remoteSignature);

    const { signature: localSig } = this.identity.signAs(channel.localDid, stateHash);
    channel.state.commitment = {
      channelId, sequenceNumber: 0,
      localBalance: channel.state.localBalance,
      remoteBalance: channel.state.remoteBalance,
      htlcRoot: htlcRoot([]),
      networkId: this.networkId,
      protocolVersion: `${PROTOCOL_VERSION.major}.${PROTOCOL_VERSION.minor}.${PROTOCOL_VERSION.patch}`,
      stateHash,
      localSignature: localSig,
      remoteSignature,
    };
    channel.status = 'open';
    logger.info(`⚡ channel confirmed ${channelId}: capacity ${channel.capacity}`);
    return this.exportChannel(channel);
  }

  // ── State updates (off-chain payments) ────────────────────────────────────

  /**
   * Update the channel state: shift balance from one party to another.
   * Both parties sign the new commitment. Old commitment's revocation
   * secret is exchanged (modeled here as a deterministic per-sequence secret).
   */
  updateState(
    channelId: string,
    initiatorDid: string,
    deltaToRemote: bigint,    // positive = pay remote, negative = receive
    htlcsToAdd: Array<{ amount: bigint; paymentHash: string; expiryMs: number; direction: HTLCDirection }> = [],
    htlcResolutions: Array<{ htlcId: string; preimage?: string; fail?: boolean }> = [],
  ): ChannelCommitment {
    const channel = this.getChannelOrThrow(channelId);
    assertOpen(channel);
    if (channel.localDid !== initiatorDid && channel.remoteDid !== initiatorDid) {
      throw Object.assign(new Error('initiator not a channel party'), { status: 403 });
    }

    const isLocal = channel.localDid === initiatorDid;
    const newLocalBal = channel.state.localBalance - (isLocal ? deltaToRemote : -deltaToRemote);
    const newRemoteBal = channel.state.remoteBalance + (isLocal ? deltaToRemote : -deltaToRemote);

    if (newLocalBal < 0n || newRemoteBal < 0n) {
      throw Object.assign(new Error('insufficient channel balance'), { status: 422 });
    }

    // Apply HTLC resolutions first
    const remainingHtlcs = [...channel.state.htlcs];
    for (const res of htlcResolutions) {
      const idx = remainingHtlcs.findIndex(h => h.id === res.htlcId);
      if (idx < 0) continue;
      if (res.preimage) {
        remainingHtlcs[idx] = { ...remainingHtlcs[idx], status: 'resolved', preimage: res.preimage, resolvedAt: new Date().toISOString() };
        this.revealedPreimages.set(remainingHtlcs[idx].paymentHash, res.preimage);
      } else if (res.fail) {
        remainingHtlcs[idx] = { ...remainingHtlcs[idx], status: 'failed', resolvedAt: new Date().toISOString() };
      }
    }
    // Remove settled HTLCs
    const activeHtlcs = remainingHtlcs.filter(h => h.status === 'pending');

    // Add new HTLCs
    if (activeHtlcs.length + htlcsToAdd.length > this.maxHtlcsPerChannel) {
      throw Object.assign(new Error(`HTLC limit (${this.maxHtlcsPerChannel}) reached`), { status: 429 });
    }
    for (const h of htlcsToAdd) {
      activeHtlcs.push({
        id: `htlc_${uuid()}`,
        channelId,
        amount: h.amount,
        paymentHash: h.paymentHash,
        expiryMs: h.expiryMs,
        direction: h.direction,
        status: 'pending',
        addedAt: new Date().toISOString(),
      });
    }

    // Build new commitment
    const newSeq = channel.state.sequenceNumber + 1;
    channel.revocationSecrets.set(channel.state.sequenceNumber,
      sha256(`revocation:${channelId}:${channel.state.sequenceNumber}`));

    const commitment = this.buildAndSignCommitment(
      { ...channel, state: { ...channel.state, localBalance: newLocalBal, remoteBalance: newRemoteBal, htlcs: activeHtlcs } } as Channel,
      newSeq, newLocalBal, newRemoteBal, activeHtlcs,
    );

    channel.state.sequenceNumber = newSeq;
    channel.state.localBalance = newLocalBal;
    channel.state.remoteBalance = newRemoteBal;
    channel.state.htlcs = activeHtlcs;
    channel.state.commitment = commitment;

    return commitment;
  }

  // ── Payment routing ────────────────────────────────────────────────────────

  /**
   * Find a payment route from sender to receiver with sufficient capacity
   * using Dijkstra over the channel graph (edges weighted by capacity).
   */
  findRoute(fromDid: string, toDid: string, amount: bigint): PaymentRoute | null {
    if (fromDid === toDid) return null;

    // Build adjacency graph: edges are open channels with sufficient liquidity
    const adj = new Map<string, Array<{ neighbor: string; channelId: string; capacity: bigint }>>();
    for (const ch of this.channels.values()) {
      if (ch.status !== 'open') continue;
      const { localDid, remoteDid, id } = ch;
      const localCap = ch.state.localBalance;
      const remoteCap = ch.state.remoteBalance;
      if (!adj.has(localDid)) adj.set(localDid, []);
      if (!adj.has(remoteDid)) adj.set(remoteDid, []);
      if (localCap >= amount) adj.get(localDid)!.push({ neighbor: remoteDid, channelId: id, capacity: localCap });
      if (remoteCap >= amount) adj.get(remoteDid)!.push({ neighbor: localDid, channelId: id, capacity: remoteCap });
    }

    // Dijkstra (maximize bottleneck capacity)
    const dist = new Map<string, bigint>();
    const prev = new Map<string, { did: string; channelId: string }>();
    const visited = new Set<string>();
    dist.set(fromDid, BigInt(Number.MAX_SAFE_INTEGER));

    while (true) {
      let best: string | null = null;
      let bestCap = -1n;
      for (const [did, cap] of dist) {
        if (!visited.has(did) && cap > bestCap) { best = did; bestCap = cap; }
      }
      if (!best || bestCap <= 0n) break;
      if (best === toDid) break;
      visited.add(best);

      for (const edge of adj.get(best) ?? []) {
        const newCap = bestCap < edge.capacity ? bestCap : edge.capacity;
        if (newCap > (dist.get(edge.neighbor) ?? 0n)) {
          dist.set(edge.neighbor, newCap);
          prev.set(edge.neighbor, { did: best, channelId: edge.channelId });
        }
      }
    }

    if (!dist.has(toDid) || dist.get(toDid)! < amount) return null;

    // Reconstruct path
    const path: string[] = [];
    const channelIds: string[] = [];
    let cur = toDid;
    while (cur !== fromDid) {
      path.unshift(cur);
      const p = prev.get(cur)!;
      channelIds.unshift(p.channelId);
      cur = p.did;
    }
    path.unshift(fromDid);

    if (path.length > MAX_HOPS + 1) return null;

    // Fee model: each intermediate hop takes 0.01% (1 basis point) — floor 1 unit
    const hops = path.length - 1;
    const hopFees: bigint[] = [];
    let totalFee = 0n;
    for (let i = 0; i < hops - 1; i++) {
      const fee = amount / 10000n || 1n;
      hopFees.push(fee);
      totalFee += fee;
    }
    hopFees.push(0n);   // last hop (to receiver) takes no fee

    return {
      path,
      channelIds,
      hopFees,
      totalFee,
      totalAmount: amount + totalFee,
      expiryDecrementMs: 60_000,  // each hop reduces HTLC expiry by 1 minute
    };
  }

  /**
   * Execute an off-chain payment via HTLC routing. The preimage is generated
   * on behalf of the receiver (both parties are local in this implementation;
   * in a real network the receiver generates the preimage and shares the hash
   * out of band — e.g. in an invoice).
   */
  sendPayment(params: {
    senderDid: string;
    receiverDid: string;
    amount: bigint;
    memo?: string;
    /** Pre-generated by receiver (invoice-style). Auto-generated if absent. */
    preimage?: string;
  }): LightningPayment {
    if (this.payments.size >= MAX_PAYMENTS) {
      throw Object.assign(new Error('payment log full'), { status: 429 });
    }
    const { senderDid, receiverDid, amount, memo } = params;
    if (amount <= 0n) throw Object.assign(new Error('amount must be positive'), { status: 422 });
    if (senderDid === receiverDid) throw Object.assign(new Error('cannot pay yourself'), { status: 422 });

    const route = this.findRoute(senderDid, receiverDid, amount);
    if (!route) throw Object.assign(new Error('no route found'), { status: 404 });

    const preimage = params.preimage ?? randomBytes(32).toString('hex');
    const paymentHash = sha256(preimage);
    const paymentId = `pay_${uuid()}`;
    const now = new Date().toISOString();
    const nowMs = Date.now();

    const payment: LightningPayment = {
      id: paymentId,
      sender: senderDid,
      receiver: receiverDid,
      amount,
      paymentHash,
      memo,
      route,
      status: 'routing',
      createdAt: now,
    };
    this.payments.set(paymentId, payment);

    // Forward HTLCs along the route
    const hops = route.path.length - 1;
    let htlcIds: string[] = [];
    let success = true;
    let failReason = '';

    try {
      for (let i = 0; i < hops; i++) {
        const channelId = route.channelIds[i];
        const fromDid = route.path[i];
        const expiry = nowMs + route.expiryDecrementMs * (hops - i);
        const htlcAmount = i === 0 ? route.totalAmount : amount + route.hopFees.slice(i).reduce((a, b) => a + b, 0n);

        const ch = this.getChannelOrThrow(channelId);
        const isLocal = ch.localDid === fromDid;
        const delta = isLocal ? htlcAmount : -htlcAmount;

        // Add outbound HTLC on this channel
        const commitment = this.updateState(channelId, fromDid, delta, [{
          amount: htlcAmount,
          paymentHash,
          expiryMs: expiry,
          direction: 'outgoing',
        }]);
        htlcIds.push(commitment.channelId);
        void commitment;
      }

      // All HTLCs placed — now resolve them by revealing preimage backwards
      this.revealedPreimages.set(paymentHash, preimage);
      for (let i = hops - 1; i >= 0; i--) {
        const channelId = route.channelIds[i];
        const ch = this.channels.get(channelId)!;
        const htlc = ch.state.htlcs.find(h => h.paymentHash === paymentHash && h.status === 'pending');
        if (htlc) {
          this.updateState(channelId, ch.localDid, 0n, [], [{ htlcId: htlc.id, preimage }]);
        }
      }

      payment.status = 'settled';
      payment.settledAt = new Date().toISOString();
      payment.paymentPreimage = preimage;
      logger.info(`⚡ payment settled ${paymentId}: ${senderDid} → ${receiverDid} (${amount} units, ${hops} hops)`);
    } catch (e: any) {
      success = false;
      failReason = e.message;
      // Fail any placed HTLCs
      for (const chId of route.channelIds) {
        const ch = this.channels.get(chId);
        if (!ch) continue;
        const htlc = ch.state.htlcs.find(h => h.paymentHash === paymentHash && h.status === 'pending');
        if (htlc) {
          try {
            this.updateState(chId, ch.localDid, 0n, [], [{ htlcId: htlc.id, fail: true }]);
          } catch { /* best effort */ }
        }
      }
      payment.status = 'failed';
      payment.failedAt = new Date().toISOString();
      payment.failureReason = failReason;
      logger.warn(`⚡ payment failed ${paymentId}: ${failReason}`);
    }

    void success; void htlcIds;
    return payment;
  }

  /** Reveal an HTLC preimage (receiver-initiated resolution). */
  resolveHtlc(channelId: string, paymentHash: string, preimage: string): void {
    if (sha256(preimage) !== paymentHash) {
      throw Object.assign(new Error('preimage does not hash to paymentHash'), { status: 422 });
    }
    const ch = this.getChannelOrThrow(channelId);
    const htlc = ch.state.htlcs.find(h => h.paymentHash === paymentHash && h.status === 'pending');
    if (!htlc) throw Object.assign(new Error('pending HTLC not found'), { status: 404 });
    this.revealedPreimages.set(paymentHash, preimage);
    this.updateState(channelId, ch.localDid, 0n, [], [{ htlcId: htlc.id, preimage }]);
  }

  // ── Channel close ──────────────────────────────────────────────────────────

  /**
   * Cooperative close: both parties agree on final balances, funds are
   * settled on-chain immediately (no dispute window).
   */
  cooperativeClose(channelId: string, initiatorDid: string): { distributions: Array<{ did: string; units: bigint }> } {
    const channel = this.getChannelOrThrow(channelId);
    assertOpen(channel);
    if (channel.localDid !== initiatorDid && channel.remoteDid !== initiatorDid) {
      throw Object.assign(new Error('not a channel party'), { status: 403 });
    }
    if (channel.state.htlcs.some(h => h.status === 'pending')) {
      throw Object.assign(new Error('cannot cooperatively close with pending HTLCs — resolve or fail them first'), { status: 409 });
    }

    channel.status = 'closed';
    channel.closedAt = new Date().toISOString();

    const distributions = this.settleToChain(channel, channel.state.localBalance, channel.state.remoteBalance);
    logger.info(`⚡ cooperative close ${channelId}: settled (local ${channel.state.localBalance}, remote ${channel.state.remoteBalance})`);
    return { distributions };
  }

  /**
   * Force close: initiating party broadcasts the latest commitment state
   * unilaterally. A dispute window opens during which the counterparty can
   * submit a breach remedy if the initiator used an old state.
   */
  forceClose(channelId: string, initiatorDid: string, submittedSeqNo?: number): {
    distributions: Array<{ did: string; units: bigint }>;
    breach: boolean;
    disputeExpiresAt: string;
  } {
    const channel = this.getChannelOrThrow(channelId);
    if (channel.status !== 'open' && channel.status !== 'closing_cooperative') {
      throw Object.assign(new Error('channel not force-closeable'), { status: 409 });
    }
    if (channel.localDid !== initiatorDid && channel.remoteDid !== initiatorDid) {
      throw Object.assign(new Error('not a channel party'), { status: 403 });
    }

    const actualSeq = channel.state.sequenceNumber;
    const submittedSeq = submittedSeqNo ?? actualSeq;
    const breach = submittedSeq < actualSeq;

    channel.status = 'closing_force';
    const disputeExpiresAt = new Date(Date.now() + CHANNEL_DISPUTE_WINDOW_MS).toISOString();
    channel.forceClosedAt = new Date().toISOString();
    channel.forceCloseDisputeExpiresAt = disputeExpiresAt;

    let localBal = channel.state.localBalance;
    let remoteBal = channel.state.remoteBalance;

    if (breach) {
      // Breach remedy: entire channel balance goes to victim
      const victimDid = initiatorDid === channel.localDid ? channel.remoteDid : channel.localDid;
      const penalty = channel.capacity;
      this.opts.onBreach?.(channelId, victimDid, initiatorDid, penalty);
      if (initiatorDid === channel.localDid) {
        remoteBal = channel.capacity;
        localBal = 0n;
      } else {
        localBal = channel.capacity;
        remoteBal = 0n;
      }
      logger.warn(`⚡ BREACH detected on ${channelId}: ${initiatorDid} broadcast old state ${submittedSeq} (latest ${actualSeq})`);
    }

    // Pending HTLCs: fail them — amounts return to the sending side
    for (const htlc of channel.state.htlcs.filter(h => h.status === 'pending')) {
      if (htlc.direction === 'outgoing') {
        if (initiatorDid === channel.localDid) localBal += htlc.amount;
        else remoteBal += htlc.amount;
      }
    }

    channel.status = 'closed';
    channel.closedAt = new Date().toISOString();
    const distributions = this.settleToChain(channel, localBal, remoteBal);
    logger.info(`⚡ force close ${channelId}: breach=${breach}, local=${localBal}, remote=${remoteBal}`);
    return { distributions, breach, disputeExpiresAt };
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  getChannel(id: string): Channel | undefined {
    const ch = this.channels.get(id);
    return ch ? this.exportChannel(ch) : undefined;
  }

  listChannels(did?: string): Channel[] {
    const all = [...this.channels.values()];
    const filtered = did ? all.filter(ch => ch.localDid === did || ch.remoteDid === did) : all;
    return filtered.map(ch => this.exportChannel(ch));
  }

  getPayment(id: string): LightningPayment | undefined {
    return this.payments.get(id);
  }

  listPayments(did?: string, limit = 100): LightningPayment[] {
    const all = [...this.payments.values()];
    const filtered = did ? all.filter(p => p.sender === did || p.receiver === did) : all;
    return filtered.slice(-Math.min(limit, 1000));
  }

  /** Channel graph: nodes = DIDs, edges = open channels. */
  getGraph(): { nodes: string[]; edges: Array<{ id: string; from: string; to: string; capacity: string; localBal: string; remoteBal: string }> } {
    const nodes = new Set<string>();
    const edges: Array<{ id: string; from: string; to: string; capacity: string; localBal: string; remoteBal: string }> = [];
    for (const ch of this.channels.values()) {
      if (ch.status !== 'open') continue;
      nodes.add(ch.localDid);
      nodes.add(ch.remoteDid);
      edges.push({
        id: ch.id,
        from: ch.localDid,
        to: ch.remoteDid,
        capacity: ch.capacity.toString(),
        localBal: ch.state.localBalance.toString(),
        remoteBal: ch.state.remoteBalance.toString(),
      });
    }
    return { nodes: [...nodes], edges };
  }

  getStats(): {
    channels: { total: number; open: number; closed: number; pending: number };
    payments: { total: number; settled: number; failed: number; routing: number };
    totalCapacity: string;
    networkId: string;
    protocolVersion: string;
  } {
    let open = 0, closed = 0, pending = 0;
    let totalCapacity = 0n;
    for (const ch of this.channels.values()) {
      if (ch.status === 'open') { open++; totalCapacity += ch.capacity; }
      else if (ch.status === 'closed') closed++;
      else pending++;
    }
    let settled = 0, failed = 0, routing = 0;
    for (const p of this.payments.values()) {
      if (p.status === 'settled') settled++;
      else if (p.status === 'failed') failed++;
      else routing++;
    }
    return {
      channels: { total: this.channels.size, open, closed, pending },
      payments: { total: this.payments.size, settled, failed, routing },
      totalCapacity: totalCapacity.toString(),
      networkId: this.networkId,
      protocolVersion: `${PROTOCOL_VERSION.major}.${PROTOCOL_VERSION.minor}.${PROTOCOL_VERSION.patch}`,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildAndSignCommitment(
    channel: Channel,
    seq: number,
    localBalance: bigint,
    remoteBalance: bigint,
    htlcs: HTLC[],
    localPqSigner?: HashBasedSigner,
    remotePqSigner?: HashBasedSigner,
  ): ChannelCommitment {
    const payload = commitmentPayload(channel.id, seq, localBalance, remoteBalance, htlcs, this.networkId);
    const stateHash = stateHashOf(payload);
    const hRoot = htlcRoot(htlcs);

    const { signature: localSig } = this.identity.signAs(channel.localDid, stateHash);
    const { signature: remoteSig } = this.identity.signAs(channel.remoteDid, stateHash);

    const commitment: ChannelCommitment = {
      channelId: channel.id,
      sequenceNumber: seq,
      localBalance,
      remoteBalance,
      htlcRoot: hRoot,
      networkId: this.networkId,
      protocolVersion: `${PROTOCOL_VERSION.major}.${PROTOCOL_VERSION.minor}.${PROTOCOL_VERSION.patch}`,
      stateHash,
      localSignature: localSig,
      remoteSignature: remoteSig,
    };

    // Optional PQ co-signatures
    if (localPqSigner) {
      commitment.pqLocalSig = localPqSigner.sign(stateHash);
      commitment.pqLocalRoot = localPqSigner.root;
    }
    if (remotePqSigner) {
      commitment.pqRemoteSig = remotePqSigner.sign(stateHash);
      commitment.pqRemoteRoot = remotePqSigner.root;
    }

    return commitment;
  }

  private verifyOrThrow(did: string, message: string, sig: string): void {
    try {
      const doc = this.identity.resolve(did);
      if (!doc) throw new Error(`unknown DID ${did}`);
      const { verify: edVerify, createPublicKey } = require('node:crypto');
      const key = createPublicKey(doc.publicKeyPem);
      const ok = edVerify(null, Buffer.from(message, 'utf8'), key, Buffer.from(sig, 'base64'));
      if (!ok) throw new Error('signature mismatch');
    } catch (e: any) {
      throw Object.assign(new Error(`signature verification failed: ${e.message}`), { status: 422 });
    }
  }

  private settleToChain(channel: Channel, localBal: bigint, remoteBal: bigint): Array<{ did: string; units: bigint }> {
    const distributions: Array<{ did: string; units: bigint }> = [
      { did: channel.localDid, units: localBal },
      { did: channel.remoteDid, units: remoteBal },
    ];
    this.valueChain.channelSettle(channel.id, distributions);
    this.opts.onSettle?.(channel.id, distributions);
    return distributions;
  }

  private getChannelOrThrow(id: string): Channel {
    const ch = this.channels.get(id);
    if (!ch) throw Object.assign(new Error('channel not found'), { status: 404 });
    return ch;
  }

  /** Export removes the internal revocationSecrets map (sensitive). */
  private exportChannel(ch: Channel): Channel {
    const { revocationSecrets, ...rest } = ch as any;
    void revocationSecrets;
    return {
      ...rest,
      state: {
        ...ch.state,
        commitment: ch.state.commitment ? {
          ...ch.state.commitment,
          localBalance: ch.state.commitment.localBalance,
          remoteBalance: ch.state.commitment.remoteBalance,
        } : null,
      },
      revocationSecrets: new Map(),  // never export
    };
  }
}

function assertOpen(ch: Channel): void {
  if (ch.status !== 'open') throw Object.assign(new Error(`channel is ${ch.status}`), { status: 409 });
}

// ── REST routes ───────────────────────────────────────────────────────────────

export function registerLightningRoutes(app: Express, svc: LightningService): void {

  app.post('/api/lightning/channels', (req: Request, res: Response): void => {
    const { localDid, remoteDid, localUnits, remoteUnits, memo } = req.body ?? {};
    if (!localDid || !remoteDid) { res.status(422).json({ success: false, error: 'localDid and remoteDid required' }); return; }
    if (!localUnits) { res.status(422).json({ success: false, error: 'localUnits required' }); return; }
    try {
      const channel = svc.openChannel({
        localDid: String(localDid),
        remoteDid: String(remoteDid),
        localUnits: BigInt(localUnits),
        remoteUnits: remoteUnits ? BigInt(remoteUnits) : undefined,
        memo: memo ? String(memo) : undefined,
      });
      res.status(201).json({ success: true, channel: serializeChannel(channel) });
    } catch (e: any) {
      res.status(e.status ?? 500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/lightning/channels', (req: Request, res: Response): void => {
    const did = req.query.did as string | undefined;
    const channels = svc.listChannels(did).map(serializeChannel);
    res.json({ success: true, count: channels.length, channels });
  });

  app.get('/api/lightning/channels/:id', (req: Request, res: Response): void => {
    const ch = svc.getChannel(req.params.id);
    if (!ch) { res.status(404).json({ success: false, error: 'channel not found' }); return; }
    res.json({ success: true, channel: serializeChannel(ch) });
  });

  app.post('/api/lightning/channels/:id/close', (req: Request, res: Response): void => {
    const initiatorDid = req.body?.initiatorDid;
    if (!initiatorDid) { res.status(422).json({ success: false, error: 'initiatorDid required' }); return; }
    try {
      const result = svc.cooperativeClose(req.params.id, String(initiatorDid));
      res.json({ success: true, ...serializeDists(result.distributions) });
    } catch (e: any) {
      res.status(e.status ?? 500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/lightning/channels/:id/force-close', (req: Request, res: Response): void => {
    const initiatorDid = req.body?.initiatorDid;
    if (!initiatorDid) { res.status(422).json({ success: false, error: 'initiatorDid required' }); return; }
    const submittedSeqNo = req.body?.submittedSeqNo != null ? Number(req.body.submittedSeqNo) : undefined;
    try {
      const result = svc.forceClose(req.params.id, String(initiatorDid), submittedSeqNo);
      res.json({ success: true, breach: result.breach, disputeExpiresAt: result.disputeExpiresAt, ...serializeDists(result.distributions) });
    } catch (e: any) {
      res.status(e.status ?? 500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/lightning/send', (req: Request, res: Response): void => {
    const { senderDid, receiverDid, amount, memo, preimage } = req.body ?? {};
    if (!senderDid || !receiverDid || !amount) {
      res.status(422).json({ success: false, error: 'senderDid, receiverDid, amount required' }); return;
    }
    try {
      const payment = svc.sendPayment({
        senderDid: String(senderDid),
        receiverDid: String(receiverDid),
        amount: BigInt(amount),
        memo: memo ? String(memo) : undefined,
        preimage: preimage ? String(preimage) : undefined,
      });
      res.status(payment.status === 'settled' ? 201 : 422).json({
        success: payment.status === 'settled',
        payment: serializePayment(payment),
      });
    } catch (e: any) {
      res.status(e.status ?? 500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/lightning/htlc/resolve', (req: Request, res: Response): void => {
    const { channelId, paymentHash, preimage } = req.body ?? {};
    if (!channelId || !paymentHash || !preimage) {
      res.status(422).json({ success: false, error: 'channelId, paymentHash, preimage required' }); return;
    }
    try {
      svc.resolveHtlc(String(channelId), String(paymentHash), String(preimage));
      res.json({ success: true });
    } catch (e: any) {
      res.status(e.status ?? 500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/lightning/graph', (_req: Request, res: Response): void => {
    res.json({ success: true, ...svc.getGraph() });
  });

  app.get('/api/lightning/stats', (_req: Request, res: Response): void => {
    res.json({ success: true, ...svc.getStats() });
  });
}

// ── Serialization helpers (bigints → strings for JSON) ────────────────────────

function serializeChannel(ch: Channel): object {
  return {
    ...ch,
    capacity: ch.capacity.toString(),
    state: {
      ...ch.state,
      localBalance: ch.state.localBalance.toString(),
      remoteBalance: ch.state.remoteBalance.toString(),
      htlcs: ch.state.htlcs.map(h => ({ ...h, amount: h.amount.toString() })),
      commitment: ch.state.commitment ? {
        ...ch.state.commitment,
        localBalance: ch.state.commitment.localBalance.toString(),
        remoteBalance: ch.state.commitment.remoteBalance.toString(),
      } : null,
    },
  };
}

function serializePayment(p: LightningPayment): object {
  return {
    ...p,
    amount: p.amount.toString(),
    route: {
      ...p.route,
      hopFees: p.route.hopFees.map(f => f.toString()),
      totalFee: p.route.totalFee.toString(),
      totalAmount: p.route.totalAmount.toString(),
    },
  };
}

function serializeDists(dists: Array<{ did: string; units: bigint }>): object {
  return { distributions: dists.map(d => ({ did: d.did, units: d.units.toString() })) };
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function lightningFromEnv(
  identity: IdentityPort,
  valueChain: ValueChainService,
  opts: LightningServiceOpts = {},
): LightningService {
  return new LightningService(identity, valueChain, {
    networkId: process.env.LIGHTNING_NETWORK_ID ?? DEFAULT_NETWORK_ID,
    maxChannels: process.env.LIGHTNING_MAX_CHANNELS ? parseInt(process.env.LIGHTNING_MAX_CHANNELS) : undefined,
    ...opts,
  });
}

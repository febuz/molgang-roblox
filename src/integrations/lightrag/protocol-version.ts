/**
 * Protocol Versioning and Fork Preparation
 *
 * Makes the entire VPC P2P stack future-proof against protocol upgrades and
 * chain forks. The design mirrors Bitcoin's BIP process, Ethereum's EIP system,
 * and Lightning's feature-bit negotiation — battle-tested patterns for safely
 * evolving a live P2P network.
 *
 * KEY CONCEPTS:
 *
 *  NETWORK ID — every signed artifact (channel commitments, future transfer
 *  schema v2, consensus votes) embeds a network ID. A signature valid on
 *  vpc-mainnet is cryptographically invalid on any fork with a different ID.
 *  This is the same replay-protection insight as EIP-155 and BOLT's chain_hash.
 *
 *  SEMANTIC VERSIONING — major.minor.patch where:
 *    major = breaking change (hard fork — ALL nodes must upgrade)
 *    minor = additive feature (soft fork or new capability — opt-in)
 *    patch = bug fix / doc / no behavior change
 *
 *  FEATURE FLAGS (bitvector) — two bits per feature: required (must understand
 *  to participate) and optional (nice-to-have). Mirrors BOLT #9 feature bits.
 *  Even bits = optional, odd bits = required. A peer that does not understand
 *  a required feature must disconnect.
 *
 *  FORK REGISTRY — in-memory registry of known past and upcoming fork specs.
 *  Operators register a fork, signal readiness via governance proposals
 *  (linking to the group voting system), and activate when threshold is met.
 *
 *  PROTOCOL HANDSHAKE — a canonical capability advertisement (JSON blob) that
 *  every node serves at /api/protocol/capabilities. Peers compare networkId,
 *  genesisHash, and feature sets before forming connections.
 *
 *  MIGRATION HOOKS — forks register up/down migration functions. The
 *  ProtocolService calls them at activation time and records the migration log.
 *
 * REST (registerProtocolRoutes):
 *   GET  /api/protocol/version       — current version + network info
 *   GET  /api/protocol/capabilities  — full capability advertisement for peers
 *   GET  /api/protocol/forks         — known forks + status
 *   POST /api/protocol/forks         — register a new fork spec
 *   POST /api/protocol/forks/:id/activate  — activate a locked-in fork
 *   POST /api/protocol/negotiate     — negotiate compatibility with a peer blob
 */

import type { Express, Request, Response } from 'express';
import { canonicalize, sha256 } from './graph-state-root';
import { BLOCK_GENESIS } from './value-chain';
import logger from '../../utils/logger';

// ── Protocol version ──────────────────────────────────────────────────────────

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/** Canonical version string. */
export function semverStr(v: SemVer): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/** Compare: -1 < 0 = 0 > 1. */
export function semverCmp(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * Current protocol version — increment appropriately:
 *   major: hard fork (breaking schema / crypto change)
 *   minor: new module (lightning = 1.2.x, fork-prep = this file)
 *   patch: bug fix
 */
export const PROTOCOL_VERSION: SemVer = { major: 1, minor: 2, patch: 0 };

// ── Network IDs ───────────────────────────────────────────────────────────────

export const KNOWN_NETWORK_IDS = ['vpc-mainnet', 'vpc-testnet', 'vpc-regtest'] as const;
export type NetworkId = typeof KNOWN_NETWORK_IDS[number] | string;

export const DEFAULT_NETWORK_ID: NetworkId =
  (process.env.PROTOCOL_NETWORK_ID as NetworkId | undefined) ?? 'vpc-mainnet';

/** Genesis hashes per network. A different genesis hash = a different chain. */
export const GENESIS_HASHES: Record<string, string> = {
  'vpc-mainnet': BLOCK_GENESIS,
  'vpc-testnet': sha256('value-chain-testnet-genesis'),
  'vpc-regtest': sha256('value-chain-regtest-genesis'),
};

export function genesisHashFor(networkId: string): string {
  return GENESIS_HASHES[networkId] ?? sha256(`value-chain-${networkId}-genesis`);
}

// ── Feature flags (BOLT #9 style) ─────────────────────────────────────────────
//
// Even bit = feature is optional (peer may not support; do not disconnect)
// Odd bit  = feature is required (peer MUST support; disconnect if absent)
// Bit pairs: (2n = optional, 2n+1 = required)

export const FEATURE = {
  LIGHTNING_CHANNELS_OPT:     1 << 0,   // 0x0001 — off-chain payment channels
  LIGHTNING_CHANNELS_REQ:     1 << 1,   // 0x0002
  PQ_HYBRID_TRANSFERS_OPT:    1 << 2,   // 0x0004 — phase-2 PQ co-signatures
  PQ_HYBRID_TRANSFERS_REQ:    1 << 3,   // 0x0008
  BACKLOG_HUB_OPT:            1 << 4,   // 0x0010 — GitHub/GitLab backlog hub
  BACKLOG_HUB_REQ:            1 << 5,   // 0x0020
  SOVEREIGN_ELECTIONS_OPT:    1 << 6,   // 0x0040 — national election module
  SOVEREIGN_ELECTIONS_REQ:    1 << 7,   // 0x0080
  FORK_SIGNALING_OPT:         1 << 8,   // 0x0100 — governance-based fork signaling
  FORK_SIGNALING_REQ:         1 << 9,   // 0x0200
  WATCHTOWER_OPT:             1 << 10,  // 0x0400 — channel breach monitoring (future)
  MULTI_SIG_CHANNELS_OPT:     1 << 12,  // 0x1000 — multi-party channels (future)
  CHANNEL_SPLICING_OPT:       1 << 14,  // 0x4000 — splice-in/out (future)
} as const;

export type FeatureFlag = typeof FEATURE[keyof typeof FEATURE];

/** Features this node currently advertises. */
export const LOCAL_FEATURES = {
  required:
    FEATURE.FORK_SIGNALING_REQ,
  optional:
    FEATURE.LIGHTNING_CHANNELS_OPT |
    FEATURE.PQ_HYBRID_TRANSFERS_OPT |
    FEATURE.BACKLOG_HUB_OPT |
    FEATURE.SOVEREIGN_ELECTIONS_OPT |
    FEATURE.FORK_SIGNALING_OPT,
};

/** Human-readable feature name lookup. */
const FEATURE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(FEATURE).map(([k, v]) => [v, k]),
);

export function featureNames(bits: number): string[] {
  return Object.entries(FEATURE)
    .filter(([, v]) => (bits & v) !== 0)
    .map(([k]) => k);
}

// ── Fork types ────────────────────────────────────────────────────────────────

export type ForkType = 'soft' | 'hard';
export type ForkStatus = 'proposed' | 'signaling' | 'locked_in' | 'active' | 'abandoned';
export type ForkActivationType = 'height' | 'supermajority' | 'timestamp' | 'manual';

export interface ForkSpec {
  forkId: string;
  name: string;
  description: string;
  networkId: string;
  forkType: ForkType;
  activationType: ForkActivationType;
  /** Height, ISO timestamp, or fraction e.g. "0.75" for supermajority. */
  activationParam: string;
  /** Feature flags required AFTER this fork activates. */
  requiredFeatures: number;
  /** Feature flags deprecated / removed by this fork. */
  deprecatedFeatures: number;
  breakingChanges: string[];
  migrationNotes: string;
  status: ForkStatus;
  createdAt: string;
  activatedAt?: string;
  linkedProposalId?: string;   // group voting proposal ID for signaling
}

export interface ForkMigration {
  forkId: string;
  up: () => void;
  down?: () => void;   // rollback (best-effort; hard forks rarely have down migrations)
}

// ── Protocol handshake ────────────────────────────────────────────────────────

export interface ProtocolCapabilities {
  /** Unique peer identifier — their DID. */
  peerId: string;
  networkId: string;
  genesisHash: string;
  protocolVersion: SemVer;
  /** Feature bits this peer requires. Peers missing required features MUST disconnect. */
  requiredFeatures: number;
  /** Feature bits this peer optionally supports. */
  optionalFeatures: number;
  knownForkIds: string[];
  activeForkIds: string[];
  issuedAt: string;
}

export interface NegotiationResult {
  compatible: boolean;
  incompatibleReason?: string;
  /** Required feature bits the local node is missing. */
  missingRequired: number;
  /** Optional features both sides support. */
  sharedOptional: number;
  peerVersion: SemVer;
  versionOrder: -1 | 0 | 1;   // local vs peer
}

// ── ProtocolService ───────────────────────────────────────────────────────────

export class ProtocolService {
  private forks = new Map<string, ForkSpec>();
  private migrations = new Map<string, ForkMigration>();
  private migrationLog: Array<{ forkId: string; direction: 'up' | 'down'; appliedAt: string }> = [];
  private localPeerId: string;

  constructor(opts: { peerId?: string; networkId?: string } = {}) {
    this.localPeerId = opts.peerId ?? 'did:vpc:local';
    // Seed built-in fork specs
    this.seedBuiltinForks();
  }

  // ── Fork registration ──────────────────────────────────────────────────────

  registerFork(spec: Omit<ForkSpec, 'createdAt' | 'status'> & { status?: ForkStatus }): ForkSpec {
    const fork: ForkSpec = {
      ...spec,
      status: spec.status ?? 'proposed',
      createdAt: new Date().toISOString(),
    };
    this.forks.set(fork.forkId, fork);
    logger.info(`protocol: fork registered ${fork.forkId} (${fork.forkType}) on ${fork.networkId}`);
    return fork;
  }

  registerMigration(migration: ForkMigration): void {
    this.migrations.set(migration.forkId, migration);
  }

  /** Link a governance proposal to a fork for upgrade signaling. */
  linkProposal(forkId: string, proposalId: string): boolean {
    const fork = this.forks.get(forkId);
    if (!fork) return false;
    fork.linkedProposalId = proposalId;
    if (fork.status === 'proposed') fork.status = 'signaling';
    return true;
  }

  /** Advance a fork from signaling → locked_in (e.g. when proposal passes). */
  lockIn(forkId: string): boolean {
    const fork = this.forks.get(forkId);
    if (!fork || fork.status !== 'signaling') return false;
    fork.status = 'locked_in';
    logger.info(`protocol: fork ${forkId} locked in — ready for activation`);
    return true;
  }

  /** Activate a locked-in fork, running its migration. */
  activateFork(forkId: string): { activated: boolean; reason?: string } {
    const fork = this.forks.get(forkId);
    if (!fork) return { activated: false, reason: 'fork not found' };
    if (fork.status !== 'locked_in') return { activated: false, reason: `fork status is ${fork.status}, must be locked_in` };

    const migration = this.migrations.get(forkId);
    if (migration?.up) {
      try {
        migration.up();
        this.migrationLog.push({ forkId, direction: 'up', appliedAt: new Date().toISOString() });
      } catch (e: any) {
        return { activated: false, reason: `migration failed: ${e.message}` };
      }
    }

    fork.status = 'active';
    fork.activatedAt = new Date().toISOString();
    logger.info(`protocol: fork ${forkId} (${fork.forkType}) ACTIVATED on ${fork.networkId}`);
    return { activated: true };
  }

  isForkActive(forkId: string): boolean {
    return this.forks.get(forkId)?.status === 'active';
  }

  getFork(forkId: string): ForkSpec | undefined {
    return this.forks.get(forkId);
  }

  listForks(status?: ForkStatus): ForkSpec[] {
    const all = [...this.forks.values()];
    return status ? all.filter(f => f.status === status) : all;
  }

  // ── Capability advertisement ───────────────────────────────────────────────

  getCapabilities(peerId?: string): ProtocolCapabilities {
    const networkId = DEFAULT_NETWORK_ID;
    const activeForkIds = this.listForks('active').map(f => f.forkId);
    return {
      peerId: peerId ?? this.localPeerId,
      networkId,
      genesisHash: genesisHashFor(networkId),
      protocolVersion: { ...PROTOCOL_VERSION },
      requiredFeatures: LOCAL_FEATURES.required,
      optionalFeatures: LOCAL_FEATURES.optional,
      knownForkIds: [...this.forks.keys()],
      activeForkIds,
      issuedAt: new Date().toISOString(),
    };
  }

  // ── Peer negotiation ───────────────────────────────────────────────────────

  /**
   * Check if a remote peer (described by their ProtocolCapabilities blob) is
   * compatible with this node. Returns a detailed result.
   */
  negotiate(peer: ProtocolCapabilities): NegotiationResult {
    const local = this.getCapabilities();

    // Hard gate: network ID and genesis hash must match exactly
    if (peer.networkId !== local.networkId) {
      return {
        compatible: false,
        incompatibleReason: `network ID mismatch: peer=${peer.networkId}, local=${local.networkId}`,
        missingRequired: 0, sharedOptional: 0,
        peerVersion: peer.protocolVersion,
        versionOrder: semverCmp(local.protocolVersion, peer.protocolVersion) as -1 | 0 | 1,
      };
    }
    if (peer.genesisHash !== local.genesisHash) {
      return {
        compatible: false,
        incompatibleReason: 'genesis hash mismatch — peer is on a different fork',
        missingRequired: 0, sharedOptional: 0,
        peerVersion: peer.protocolVersion,
        versionOrder: semverCmp(local.protocolVersion, peer.protocolVersion) as -1 | 0 | 1,
      };
    }

    // Feature check: we must have every feature the peer requires of us
    const missingRequired = peer.requiredFeatures & ~(local.requiredFeatures | local.optionalFeatures);
    if (missingRequired !== 0) {
      return {
        compatible: false,
        incompatibleReason: `missing required features: ${featureNames(missingRequired).join(', ')}`,
        missingRequired,
        sharedOptional: 0,
        peerVersion: peer.protocolVersion,
        versionOrder: semverCmp(local.protocolVersion, peer.protocolVersion) as -1 | 0 | 1,
      };
    }

    const sharedOptional = peer.optionalFeatures & (local.requiredFeatures | local.optionalFeatures);
    const versionOrder = semverCmp(local.protocolVersion, peer.protocolVersion) as -1 | 0 | 1;

    return { compatible: true, missingRequired: 0, sharedOptional, peerVersion: peer.protocolVersion, versionOrder };
  }

  // ── Stats / health ─────────────────────────────────────────────────────────

  getMigrationLog(): typeof this.migrationLog {
    return [...this.migrationLog];
  }

  getStats(): {
    networkId: string;
    protocolVersion: string;
    genesisHash: string;
    forks: { total: number; active: number; signaling: number; proposed: number };
    features: { required: string[]; optional: string[] };
    migrations: number;
  } {
    const active = this.listForks('active').length;
    const signaling = this.listForks('signaling').length + this.listForks('locked_in').length;
    const proposed = this.listForks('proposed').length;
    return {
      networkId: DEFAULT_NETWORK_ID,
      protocolVersion: semverStr(PROTOCOL_VERSION),
      genesisHash: genesisHashFor(DEFAULT_NETWORK_ID),
      forks: { total: this.forks.size, active, signaling, proposed },
      features: {
        required: featureNames(LOCAL_FEATURES.required),
        optional: featureNames(LOCAL_FEATURES.optional),
      },
      migrations: this.migrationLog.length,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private seedBuiltinForks(): void {
    // Fork 0: Genesis — the founding spec (always active)
    this.registerFork({
      forkId: 'vpc-v1.0.0-genesis',
      name: 'Genesis',
      description: 'Initial protocol: Ed25519 DIDs, SMT state proofs, BFT consensus, value chain, attention chain',
      networkId: 'vpc-mainnet',
      forkType: 'hard',
      activationType: 'manual',
      activationParam: '0',
      requiredFeatures: 0,
      deprecatedFeatures: 0,
      breakingChanges: [],
      migrationNotes: 'Initial deployment — no migration needed.',
      status: 'active',
      activatedAt: '2024-01-01T00:00:00.000Z',
    });

    // Fork 1: Phase-1 PQ — hash-based wallet proofs (already active)
    this.registerFork({
      forkId: 'vpc-v1.1.0-pq-wallets',
      name: 'Phase-1 PQ Wallets',
      description: 'W-OTS+/Merkle hash-based signatures, AES-256-GCM vault, quantum-safe wallet proofs',
      networkId: 'vpc-mainnet',
      forkType: 'soft',
      activationType: 'manual',
      activationParam: '0',
      requiredFeatures: 0,
      deprecatedFeatures: 0,
      breakingChanges: [],
      migrationNotes: 'Additive only — existing nodes continue without PQ keys.',
      status: 'active',
      activatedAt: '2025-01-01T00:00:00.000Z',
    });

    // Fork 2: Phase-2 PQ transfers (already active — implemented this session)
    this.registerFork({
      forkId: 'vpc-v1.2.0-hybrid-transfers',
      name: 'Phase-2 Hybrid PQ Transfers',
      description: 'Optional hash-based co-signature on Transfer; enrolled-root binding check; require-enrolled rollout policy',
      networkId: 'vpc-mainnet',
      forkType: 'soft',
      activationType: 'manual',
      activationParam: '0',
      requiredFeatures: 0,
      deprecatedFeatures: 0,
      breakingChanges: [],
      migrationNotes: 'Additive: old transfers without pqSignature remain valid.',
      status: 'active',
      activatedAt: '2026-01-01T00:00:00.000Z',
    });

    // Fork 3: Lightning channels (current release — active)
    this.registerFork({
      forkId: 'vpc-v1.2.0-lightning',
      name: 'Lightning Payment Channels',
      description: 'Off-chain bidirectional payment channels with HTLC routing, breach remedy, and PQ-safe commitments',
      networkId: 'vpc-mainnet',
      forkType: 'soft',
      activationType: 'manual',
      activationParam: '0',
      requiredFeatures: 0,
      deprecatedFeatures: 0,
      breakingChanges: [],
      migrationNotes: 'Additive: nodes without lightning support continue without channels.',
      status: 'active',
      activatedAt: new Date().toISOString(),
    });

    // Fork 4: Require-enrolled PQ (future — proposed, not yet active)
    this.registerFork({
      forkId: 'vpc-v2.0.0-pq-required',
      name: 'PQ Mandatory (Phase-3)',
      description: 'Hard fork: all new accounts must enroll a PQ key; all new transfers require PQ co-signature; ML-DSA support added when OpenSSL ≥ 3.5',
      networkId: 'vpc-mainnet',
      forkType: 'hard',
      activationType: 'supermajority',
      activationParam: '0.75',
      requiredFeatures: FEATURE.PQ_HYBRID_TRANSFERS_REQ,
      deprecatedFeatures: 0,
      breakingChanges: [
        'Transfer.signature (Ed25519-only) no longer valid for new accounts',
        'PQ enrollment required before first transfer from any new DID',
        'verifyTransfer rejects missing pqSignature for enrolled DIDs regardless of policy',
      ],
      migrationNotes: 'All nodes must upgrade before activation. Run /api/users/:handle/pq/enroll for each account.',
      status: 'proposed',
    });

    // Fork 5: Channel splicing (future — proposed)
    this.registerFork({
      forkId: 'vpc-v1.3.0-channel-splicing',
      name: 'Channel Splicing',
      description: 'Add and remove funds from open channels without closing them (splice-in / splice-out)',
      networkId: 'vpc-mainnet',
      forkType: 'soft',
      activationType: 'supermajority',
      activationParam: '0.51',
      requiredFeatures: FEATURE.LIGHTNING_CHANNELS_OPT,
      deprecatedFeatures: 0,
      breakingChanges: [],
      migrationNotes: 'Nodes without splicing support cannot participate in splice negotiations but can still use non-spliced channels.',
      status: 'proposed',
    });
  }
}

// ── REST routes ───────────────────────────────────────────────────────────────

export function registerProtocolRoutes(app: Express, svc: ProtocolService): void {

  app.get('/api/protocol/version', (_req: Request, res: Response): void => {
    res.json({ success: true, ...svc.getStats() });
  });

  app.get('/api/protocol/capabilities', (req: Request, res: Response): void => {
    const peerId = req.query.peerId as string | undefined;
    res.json({ success: true, capabilities: svc.getCapabilities(peerId) });
  });

  app.get('/api/protocol/forks', (req: Request, res: Response): void => {
    const status = req.query.status as ForkStatus | undefined;
    const forks = svc.listForks(status);
    res.json({ success: true, count: forks.length, forks });
  });

  app.post('/api/protocol/forks', (req: Request, res: Response): void => {
    const { forkId, name, description, networkId, forkType, activationType, activationParam,
      requiredFeatures, deprecatedFeatures, breakingChanges, migrationNotes } = req.body ?? {};
    if (!forkId || !name || !forkType || !networkId) {
      res.status(422).json({ success: false, error: 'forkId, name, forkType, networkId required' }); return;
    }
    const fork = svc.registerFork({
      forkId, name,
      description: description ?? '',
      networkId,
      forkType: forkType as ForkType,
      activationType: (activationType ?? 'manual') as ForkActivationType,
      activationParam: String(activationParam ?? '0'),
      requiredFeatures: Number(requiredFeatures ?? 0),
      deprecatedFeatures: Number(deprecatedFeatures ?? 0),
      breakingChanges: Array.isArray(breakingChanges) ? breakingChanges.map(String) : [],
      migrationNotes: migrationNotes ?? '',
    });
    res.status(201).json({ success: true, fork });
  });

  app.post('/api/protocol/forks/:id/activate', (req: Request, res: Response): void => {
    const result = svc.activateFork(req.params.id);
    res.status(result.activated ? 200 : 409).json({ success: result.activated, ...result });
  });

  app.post('/api/protocol/negotiate', (req: Request, res: Response): void => {
    const peer = req.body?.capabilities as ProtocolCapabilities | undefined;
    if (!peer || !peer.networkId || !peer.genesisHash) {
      res.status(422).json({ success: false, error: 'capabilities object required (networkId, genesisHash, protocolVersion, ...)' }); return;
    }
    const result = svc.negotiate(peer);
    res.status(result.compatible ? 200 : 409).json({ success: result.compatible, ...result });
  });
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const protocolService = new ProtocolService();

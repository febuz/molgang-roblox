/**
 * Protocol versioning + fork registry
 *
 * Covers: PROTOCOL_VERSION constants, feature-flag bitvector, fork registration,
 * proposal linking, lock-in, activation, migration hooks, peer negotiation,
 * genesis hash verification, and the 5 REST routes.
 */

process.env.KAFKA_DISABLED = '1';

import express from 'express';
import * as http from 'http';
import {
  ProtocolService,
  registerProtocolRoutes,
  PROTOCOL_VERSION,
  DEFAULT_NETWORK_ID,
  FEATURE,
  KNOWN_NETWORK_IDS,
  genesisHashFor,
  semverStr,
  semverCmp,
  featureNames,
  type ProtocolCapabilities,
} from '../../src/integrations/lightrag/protocol-version';

// ── Helper ────────────────────────────────────────────────────────────────────

function makeService() {
  return new ProtocolService({ peerId: 'did:vpc:test' });
}

function startServer(svc: ProtocolService) {
  const app = express();
  app.use(express.json());
  registerProtocolRoutes(app, svc);
  const server = http.createServer(app);
  server.listen(0);
  const port = (server.address() as any).port;
  return { server, port };
}

async function httpCall(
  port: number,
  method: string,
  path: string,
  body?: object,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request({ hostname: 'localhost', port, path, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } },
      (res) => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(raw) }));
      });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── PROTOCOL_VERSION constants ────────────────────────────────────────────────

describe('PROTOCOL_VERSION constants', () => {
  it('is semver 1.2.0', () => {
    expect(PROTOCOL_VERSION.major).toBe(1);
    expect(PROTOCOL_VERSION.minor).toBe(2);
    expect(PROTOCOL_VERSION.patch).toBe(0);
  });

  it('semverStr formats correctly', () => {
    expect(semverStr(PROTOCOL_VERSION)).toBe('1.2.0');
  });

  it('semverCmp returns 0 for equal versions', () => {
    expect(semverCmp({ major: 1, minor: 2, patch: 0 }, { major: 1, minor: 2, patch: 0 })).toBe(0);
  });

  it('semverCmp returns 1 when local > peer', () => {
    expect(semverCmp({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 9, patch: 9 })).toBe(1);
  });

  it('semverCmp returns -1 when local < peer', () => {
    expect(semverCmp({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 2, patch: 0 })).toBe(-1);
  });
});

// ── Network IDs + genesis hashes ──────────────────────────────────────────────

describe('Network IDs and genesis hashes', () => {
  it('DEFAULT_NETWORK_ID is in KNOWN_NETWORK_IDS or custom', () => {
    expect(typeof DEFAULT_NETWORK_ID).toBe('string');
    expect(DEFAULT_NETWORK_ID.length).toBeGreaterThan(0);
  });

  it('KNOWN_NETWORK_IDS contains vpc-mainnet/testnet/regtest', () => {
    expect(KNOWN_NETWORK_IDS).toContain('vpc-mainnet');
    expect(KNOWN_NETWORK_IDS).toContain('vpc-testnet');
    expect(KNOWN_NETWORK_IDS).toContain('vpc-regtest');
  });

  it('genesisHashFor returns different hashes for different network IDs', () => {
    const main = genesisHashFor('vpc-mainnet');
    const test = genesisHashFor('vpc-testnet');
    expect(main).not.toBe(test);
    expect(main).toMatch(/^[0-9a-f]{64}$/);
  });

  it('genesisHashFor returns deterministic value', () => {
    expect(genesisHashFor('vpc-mainnet')).toBe(genesisHashFor('vpc-mainnet'));
  });
});

// ── Feature flags ─────────────────────────────────────────────────────────────

describe('Feature flags (BOLT #9 bitvector)', () => {
  it('FEATURE constants are distinct powers-of-two bit patterns', () => {
    const values = Object.values(FEATURE);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('optional features occupy even bit positions (BOLT #9: even position = optional)', () => {
    // bit position = log2(value); even position means the value is a power of 2 with even exponent
    expect(Math.log2(FEATURE.LIGHTNING_CHANNELS_OPT) % 2).toBe(0);    // position 0, even
    expect(Math.log2(FEATURE.PQ_HYBRID_TRANSFERS_OPT) % 2).toBe(0);  // position 2, even
    expect(Math.log2(FEATURE.FORK_SIGNALING_OPT) % 2).toBe(0);        // position 8, even
  });

  it('required features occupy odd bit positions (BOLT #9: odd position = required)', () => {
    expect(Math.log2(FEATURE.LIGHTNING_CHANNELS_REQ) % 2).toBe(1);    // position 1, odd
    expect(Math.log2(FEATURE.PQ_HYBRID_TRANSFERS_REQ) % 2).toBe(1);  // position 3, odd
    expect(Math.log2(FEATURE.FORK_SIGNALING_REQ) % 2).toBe(1);        // position 9, odd
  });

  it('featureNames returns human-readable names for set bits', () => {
    const names = featureNames(FEATURE.LIGHTNING_CHANNELS_OPT | FEATURE.FORK_SIGNALING_OPT);
    expect(names).toContain('LIGHTNING_CHANNELS_OPT');
    expect(names).toContain('FORK_SIGNALING_OPT');
  });

  it('featureNames returns empty array for 0', () => {
    expect(featureNames(0)).toEqual([]);
  });
});

// ── Built-in fork seeds ────────────────────────────────────────────────────────

describe('ProtocolService — built-in forks', () => {
  it('seeds genesis fork as active', () => {
    const svc = makeService();
    expect(svc.isForkActive('vpc-v1.0.0-genesis')).toBe(true);
  });

  it('seeds pq-wallets fork as active', () => {
    const svc = makeService();
    expect(svc.isForkActive('vpc-v1.1.0-pq-wallets')).toBe(true);
  });

  it('seeds lightning fork as active', () => {
    const svc = makeService();
    expect(svc.isForkActive('vpc-v1.2.0-lightning')).toBe(true);
  });

  it('seeds pq-required fork as proposed (not yet active)', () => {
    const svc = makeService();
    expect(svc.isForkActive('vpc-v2.0.0-pq-required')).toBe(false);
    expect(svc.getFork('vpc-v2.0.0-pq-required')?.status).toBe('proposed');
  });

  it('listForks returns all seeded forks', () => {
    const svc = makeService();
    expect(svc.listForks().length).toBeGreaterThanOrEqual(6);
  });

  it('listForks(active) returns only active forks', () => {
    const svc = makeService();
    const active = svc.listForks('active');
    expect(active.every(f => f.status === 'active')).toBe(true);
  });
});

// ── Fork registration ─────────────────────────────────────────────────────────

describe('ProtocolService — fork registration', () => {
  it('registers a new fork', () => {
    const svc = makeService();
    const fork = svc.registerFork({
      forkId: 'test-fork-1',
      name: 'Test Fork',
      description: 'for testing',
      networkId: 'vpc-mainnet',
      forkType: 'soft',
      activationType: 'manual',
      activationParam: '0',
      requiredFeatures: 0,
      deprecatedFeatures: 0,
      breakingChanges: [],
      migrationNotes: '',
    });
    expect(fork.forkId).toBe('test-fork-1');
    expect(fork.status).toBe('proposed');
    expect(svc.getFork('test-fork-1')).toBeDefined();
  });

  it('linkProposal advances status to signaling', () => {
    const svc = makeService();
    svc.registerFork({
      forkId: 'fork-signal', name: 'Signal Fork', description: '', networkId: 'vpc-mainnet',
      forkType: 'soft', activationType: 'manual', activationParam: '0',
      requiredFeatures: 0, deprecatedFeatures: 0, breakingChanges: [], migrationNotes: '',
    });
    const ok = svc.linkProposal('fork-signal', 'proposal-123');
    expect(ok).toBe(true);
    expect(svc.getFork('fork-signal')?.status).toBe('signaling');
    expect(svc.getFork('fork-signal')?.linkedProposalId).toBe('proposal-123');
  });

  it('lockIn advances status from signaling to locked_in', () => {
    const svc = makeService();
    svc.registerFork({ forkId: 'fork-lock', name: 'Lock Fork', description: '', networkId: 'vpc-mainnet',
      forkType: 'soft', activationType: 'manual', activationParam: '0',
      requiredFeatures: 0, deprecatedFeatures: 0, breakingChanges: [], migrationNotes: '' });
    svc.linkProposal('fork-lock', 'p-1');
    const ok = svc.lockIn('fork-lock');
    expect(ok).toBe(true);
    expect(svc.getFork('fork-lock')?.status).toBe('locked_in');
  });

  it('lockIn fails if fork is not in signaling state', () => {
    const svc = makeService();
    svc.registerFork({ forkId: 'fork-proposed', name: 'Proposed Fork', description: '', networkId: 'vpc-mainnet',
      forkType: 'soft', activationType: 'manual', activationParam: '0',
      requiredFeatures: 0, deprecatedFeatures: 0, breakingChanges: [], migrationNotes: '' });
    expect(svc.lockIn('fork-proposed')).toBe(false);
  });
});

// ── Fork activation + migrations ──────────────────────────────────────────────

describe('ProtocolService — fork activation and migrations', () => {
  it('activates a locked-in fork', () => {
    const svc = makeService();
    svc.registerFork({ forkId: 'fork-activate', name: 'A', description: '', networkId: 'vpc-mainnet',
      forkType: 'soft', activationType: 'manual', activationParam: '0',
      requiredFeatures: 0, deprecatedFeatures: 0, breakingChanges: [], migrationNotes: '' });
    svc.linkProposal('fork-activate', 'p-x');
    svc.lockIn('fork-activate');
    const { activated } = svc.activateFork('fork-activate');
    expect(activated).toBe(true);
    expect(svc.isForkActive('fork-activate')).toBe(true);
  });

  it('activation fails when not locked_in', () => {
    const svc = makeService();
    svc.registerFork({ forkId: 'fork-skip', name: 'B', description: '', networkId: 'vpc-mainnet',
      forkType: 'soft', activationType: 'manual', activationParam: '0',
      requiredFeatures: 0, deprecatedFeatures: 0, breakingChanges: [], migrationNotes: '' });
    const { activated, reason } = svc.activateFork('fork-skip');
    expect(activated).toBe(false);
    expect(reason).toMatch(/locked_in/);
  });

  it('activation fails for unknown fork', () => {
    const svc = makeService();
    const { activated } = svc.activateFork('nonexistent');
    expect(activated).toBe(false);
  });

  it('runs migration up() on activation and logs it', () => {
    const svc = makeService();
    let migrationRan = false;
    svc.registerFork({ forkId: 'fork-migrate', name: 'M', description: '', networkId: 'vpc-mainnet',
      forkType: 'soft', activationType: 'manual', activationParam: '0',
      requiredFeatures: 0, deprecatedFeatures: 0, breakingChanges: [], migrationNotes: '' });
    svc.registerMigration({ forkId: 'fork-migrate', up: () => { migrationRan = true; } });
    svc.linkProposal('fork-migrate', 'p-m');
    svc.lockIn('fork-migrate');
    svc.activateFork('fork-migrate');
    expect(migrationRan).toBe(true);
    expect(svc.getMigrationLog().length).toBeGreaterThan(0);
  });

  it('activation fails if migration throws, fork stays locked_in', () => {
    const svc = makeService();
    svc.registerFork({ forkId: 'fork-bad-migrate', name: 'N', description: '', networkId: 'vpc-mainnet',
      forkType: 'soft', activationType: 'manual', activationParam: '0',
      requiredFeatures: 0, deprecatedFeatures: 0, breakingChanges: [], migrationNotes: '' });
    svc.registerMigration({ forkId: 'fork-bad-migrate', up: () => { throw new Error('db down'); } });
    svc.linkProposal('fork-bad-migrate', 'p-n');
    svc.lockIn('fork-bad-migrate');
    const { activated, reason } = svc.activateFork('fork-bad-migrate');
    expect(activated).toBe(false);
    expect(reason).toMatch(/migration failed/);
    expect(svc.getFork('fork-bad-migrate')?.status).toBe('locked_in');  // NOT activated
  });
});

// ── Capability advertisement ──────────────────────────────────────────────────

describe('ProtocolService — capabilities', () => {
  it('getCapabilities returns all required fields', () => {
    const svc = makeService();
    const caps = svc.getCapabilities('did:vpc:peer1');
    expect(caps.peerId).toBe('did:vpc:peer1');
    expect(caps.networkId).toBeDefined();
    expect(caps.genesisHash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof caps.requiredFeatures).toBe('number');
    expect(typeof caps.optionalFeatures).toBe('number');
    expect(Array.isArray(caps.activeForkIds)).toBe(true);
    expect(Array.isArray(caps.knownForkIds)).toBe(true);
  });

  it('activeForkIds includes seeded active forks', () => {
    const svc = makeService();
    const caps = svc.getCapabilities();
    expect(caps.activeForkIds).toContain('vpc-v1.0.0-genesis');
    expect(caps.activeForkIds).toContain('vpc-v1.2.0-lightning');
  });
});

// ── Peer negotiation ──────────────────────────────────────────────────────────

describe('ProtocolService — negotiate', () => {
  it('compatible with self', () => {
    const svc = makeService();
    const caps = svc.getCapabilities();
    const result = svc.negotiate(caps);
    expect(result.compatible).toBe(true);
    expect(result.missingRequired).toBe(0);
  });

  it('incompatible when network IDs differ', () => {
    const svc = makeService();
    const caps = svc.getCapabilities();
    const foreignCaps: ProtocolCapabilities = {
      ...caps,
      networkId: 'some-other-chain',
      genesisHash: genesisHashFor('some-other-chain'),
    };
    const result = svc.negotiate(foreignCaps);
    expect(result.compatible).toBe(false);
    expect(result.incompatibleReason).toMatch(/network ID mismatch/);
  });

  it('incompatible when genesis hash differs (different fork chain)', () => {
    const svc = makeService();
    const caps = svc.getCapabilities();
    const forkedCaps: ProtocolCapabilities = { ...caps, genesisHash: 'aa'.repeat(32) };
    const result = svc.negotiate(forkedCaps);
    expect(result.compatible).toBe(false);
    expect(result.incompatibleReason).toMatch(/genesis hash/);
  });

  it('incompatible when peer requires a feature we lack', () => {
    const svc = makeService();
    const caps = svc.getCapabilities();
    // Peer demands a feature with bit that is 0 in LOCAL_FEATURES
    const strictCaps: ProtocolCapabilities = {
      ...caps,
      requiredFeatures: caps.requiredFeatures | (1 << 30),  // unknown feature
    };
    const result = svc.negotiate(strictCaps);
    expect(result.compatible).toBe(false);
    expect(result.missingRequired).toBeGreaterThan(0);
  });

  it('versionOrder correctly compares versions', () => {
    const svc = makeService();
    const caps = svc.getCapabilities();
    const olderPeer: ProtocolCapabilities = { ...caps, protocolVersion: { major: 1, minor: 0, patch: 0 } };
    const result = svc.negotiate(olderPeer);
    // local 1.2.0 vs peer 1.0.0: local is newer → versionOrder = 1
    expect(result.versionOrder).toBe(1);
  });
});

// ── Stats ─────────────────────────────────────────────────────────────────────

describe('ProtocolService — getStats', () => {
  it('returns protocolVersion, networkId, forks, features, migrations', () => {
    const svc = makeService();
    const stats = svc.getStats();
    expect(stats.protocolVersion).toBe('1.2.0');
    expect(stats.networkId).toBeDefined();
    expect(stats.forks.total).toBeGreaterThanOrEqual(6);
    expect(stats.forks.active).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(stats.features.required)).toBe(true);
    expect(Array.isArray(stats.features.optional)).toBe(true);
  });
});

// ── REST routes ───────────────────────────────────────────────────────────────

describe('ProtocolService — REST API', () => {
  let server: http.Server;
  let port: number;
  let svc: ProtocolService;

  beforeAll(() => {
    svc = makeService();
    ({ server, port } = startServer(svc));
  });

  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

  it('GET /api/protocol/version — returns stats with protocolVersion', async () => {
    const r = await httpCall(port, 'GET', '/api/protocol/version', undefined);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.protocolVersion).toBe('1.2.0');
  });

  it('GET /api/protocol/capabilities — returns full capability blob', async () => {
    const r = await httpCall(port, 'GET', '/api/protocol/capabilities', undefined);
    expect(r.status).toBe(200);
    expect(r.body.capabilities.networkId).toBeDefined();
    expect(r.body.capabilities.genesisHash).toBeTruthy();
  });

  it('GET /api/protocol/forks — lists all forks', async () => {
    const r = await httpCall(port, 'GET', '/api/protocol/forks', undefined);
    expect(r.status).toBe(200);
    expect(r.body.count).toBeGreaterThanOrEqual(6);
    expect(Array.isArray(r.body.forks)).toBe(true);
  });

  it('GET /api/protocol/forks?status=active — filters by status', async () => {
    const r = await httpCall(port, 'GET', '/api/protocol/forks?status=active', undefined);
    expect(r.status).toBe(200);
    expect(r.body.forks.every((f: any) => f.status === 'active')).toBe(true);
  });

  it('POST /api/protocol/forks — registers a new fork', async () => {
    const r = await httpCall(port, 'POST', '/api/protocol/forks', {
      forkId: 'test-rest-fork',
      name: 'REST Test Fork',
      description: 'via REST',
      networkId: 'vpc-mainnet',
      forkType: 'soft',
      activationType: 'manual',
      activationParam: '0',
      requiredFeatures: 0,
    });
    expect(r.status).toBe(201);
    expect(r.body.fork.forkId).toBe('test-rest-fork');
  });

  it('POST /api/protocol/forks — 422 on missing required fields', async () => {
    const r = await httpCall(port, 'POST', '/api/protocol/forks', { forkId: 'only-id' });
    expect(r.status).toBe(422);
  });

  it('POST /api/protocol/forks/:id/activate — 409 when not locked_in', async () => {
    // test-rest-fork is proposed, not locked_in
    const r = await httpCall(port, 'POST', '/api/protocol/forks/test-rest-fork/activate', {});
    expect(r.status).toBe(409);
    expect(r.body.success).toBe(false);
  });

  it('POST /api/protocol/negotiate — compatible with self', async () => {
    const caps = svc.getCapabilities();
    const r = await httpCall(port, 'POST', '/api/protocol/negotiate', { capabilities: caps });
    expect(r.status).toBe(200);
    expect(r.body.compatible).toBe(true);
  });

  it('POST /api/protocol/negotiate — 409 when network IDs differ', async () => {
    const caps = svc.getCapabilities();
    const r = await httpCall(port, 'POST', '/api/protocol/negotiate', {
      capabilities: { ...caps, networkId: 'alien-chain', genesisHash: 'bb'.repeat(32) },
    });
    expect(r.status).toBe(409);
    expect(r.body.compatible).toBe(false);
  });

  it('POST /api/protocol/negotiate — 422 on missing capabilities', async () => {
    const r = await httpCall(port, 'POST', '/api/protocol/negotiate', {});
    expect(r.status).toBe(422);
  });
});

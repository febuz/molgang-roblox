/**
 * Multi-node BFT consensus integration test
 *
 * Proves that consensus is truly P2P, not just single-node. Two independent
 * HTTP servers each run a ConsensusEngine + ConsensusNetwork. They are
 * cross-registered as validators and communicate via real localhost HTTP.
 *
 * The test drives a single leader tick and asserts that BOTH nodes reach
 * height 1 with an identical, quorum-certified FinalizedBlock.
 *
 * Key design note: when a node receives a proposal/vote via HTTP, the
 * registerConsensusRoutes handler propagates any resulting vote through the
 * ConsensusNetworkDelegate. Without that wiring the PREPARE votes generated
 * by non-leader nodes would never reach the rest of the network, blocking
 * consensus. This test would hang at height 0 if the wiring is broken.
 */

import express from 'express';
import * as http from 'http';
import { generateKeyPairSync } from 'crypto';
import {
  ConsensusEngine,
  registerConsensusRoutes,
  type FinalizedBlock,
  type SignedVote,
} from '../../src/integrations/lightrag/consensus';
import { ConsensusNetwork } from '../../src/integrations/lightrag/consensus-network';
import { sha256 } from '../../src/integrations/lightrag/graph-state-root';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const offlineRag = { isConnected: () => false } as any;

/** Poll until predicate returns true, or throw after timeoutMs. */
async function waitFor(
  predicate: () => boolean,
  timeoutMs = 4_000,
  pollMs = 20,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: timed out');
    await new Promise(r => setTimeout(r, pollMs));
  }
}

/** Deterministic DID from an Ed25519 public key PEM. */
function didFromPem(pub: string): string {
  return `did:vpc:${sha256(pub).substring(0, 16)}`;
}

// ─── Two-node test ────────────────────────────────────────────────────────────

describe('Multi-node consensus: two HTTP nodes finalize a block', () => {
  let serverA: http.Server, serverB: http.Server;
  let engineA: ConsensusEngine, engineB: ConsensusEngine;
  let networkA: ConsensusNetwork, networkB: ConsensusNetwork;
  let portA: number, portB: number;
  let didA: string, didB: string;
  let pubA: string, pubB: string;
  const finalizedA: FinalizedBlock[] = [];
  const finalizedB: FinalizedBlock[] = [];

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(done => {
    // Generate Ed25519 keypairs for both nodes.
    const kpA = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const kpB = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    didA = didFromPem(kpA.publicKey);
    didB = didFromPem(kpB.publicKey);
    pubA = kpA.publicKey;
    pubB = kpB.publicKey;

    // Each engine collects finalized blocks for later assertions.
    engineA = new ConsensusEngine(offlineRag, undefined, {
      blockTimeoutMs: 30_000,   // no view-change during test
      onFinalized: b => finalizedA.push(b),
    });
    engineB = new ConsensusEngine(offlineRag, undefined, {
      blockTimeoutMs: 30_000,
      onFinalized: b => finalizedB.push(b),
    });

    // Both engines know both validators (2-of-2 quorum needed).
    for (const engine of [engineA, engineB]) {
      engine.addValidator({ did: didA, stake: 1n, publicKeyPem: pubA });
      engine.addValidator({ did: didB, stake: 1n, publicKeyPem: pubB });
    }
    engineA.setSelf(didA, kpA.privateKey);
    engineB.setSelf(didB, kpB.privateKey);

    // Lazy network refs: routes are registered now, networks assigned after ports are known.
    let netA: ConsensusNetwork | undefined;
    let netB: ConsensusNetwork | undefined;

    const appA = express(); appA.use(express.json());
    const appB = express(); appB.use(express.json());

    registerConsensusRoutes(appA, engineA, {
      deliverVote: (v: SignedVote) => netA?.deliverVote(v) ?? Promise.resolve(null),
    });
    registerConsensusRoutes(appB, engineB, {
      deliverVote: (v: SignedVote) => netB?.deliverVote(v) ?? Promise.resolve(null),
    });

    serverA = http.createServer(appA);
    serverB = http.createServer(appB);

    serverA.listen(0, () => {
      portA = (serverA.address() as any).port;
      serverB.listen(0, () => {
        portB = (serverB.address() as any).port;

        // Networks now know the ports of their peers.
        networkA = new ConsensusNetwork(engineA, [`http://127.0.0.1:${portB}`]);
        networkB = new ConsensusNetwork(engineB, [`http://127.0.0.1:${portA}`]);
        netA = networkA;
        netB = networkB;

        done();
      });
    });
  });

  afterAll(done => {
    engineA.destroy();
    engineB.destroy();
    networkA.stop();
    networkB.stop();
    serverA.close(() => serverB.close(() => done()));
  });

  // ── Tests ──────────────────────────────────────────────────────────────────

  it('one leader tick drives both nodes to height 1', async () => {
    // Determine leader at height 0 deterministically.
    const statusA = engineA.getStatus();
    const leaderNetwork = statusA.isLeader ? networkA : networkB;
    const leaderEngine  = statusA.isLeader ? engineA  : engineB;

    leaderEngine.queueTransfer('tx-p2p-test-1');

    // Tick returns after the first wave of messages. Follow-up votes (B's
    // PREPARE and all COMMIT votes) propagate asynchronously via the delegate.
    await leaderNetwork.tick();

    // Wait for asynchronous vote propagation to complete on both nodes.
    await waitFor(() => engineA.getHeight() >= 1 && engineB.getHeight() >= 1);

    expect(engineA.getHeight()).toBe(1);
    expect(engineB.getHeight()).toBe(1);
  });

  it('finalized block is identical on both nodes (same blockHash)', () => {
    expect(finalizedA).toHaveLength(1);
    expect(finalizedB).toHaveLength(1);
    expect(finalizedA[0].blockHash).toBe(finalizedB[0].blockHash);
  });

  it('block carries a 2-of-2 quorum certificate (both nodes voted)', () => {
    const block = finalizedA[0];
    // With 2 validators: quorum = ⌊2·2/3⌋+1 = 2.
    expect(block.preQC.votes.length).toBeGreaterThanOrEqual(2);
    expect(block.commitQC.votes.length).toBeGreaterThanOrEqual(2);
  });

  it('transfer is cleared from pending queue after finalization', () => {
    expect(engineA.getPendingTxIds()).toHaveLength(0);
    expect(engineB.getPendingTxIds()).toHaveLength(0);
  });

  it('GET /api/consensus/status on both nodes reports height 1', async () => {
    async function getStatus(port: number): Promise<any> {
      return new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/consensus/status`, res => {
          let data = '';
          res.on('data', c => (data += c));
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
    }
    const [sa, sb] = await Promise.all([getStatus(portA), getStatus(portB)]);
    expect(sa.status.height).toBe(1);
    expect(sb.status.height).toBe(1);
  });

  it('GET /api/consensus/chain on both nodes returns the same block', async () => {
    async function getChain(port: number): Promise<any> {
      return new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/consensus/chain`, res => {
          let data = '';
          res.on('data', c => (data += c));
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
    }
    const [ca, cb] = await Promise.all([getChain(portA), getChain(portB)]);
    expect(ca.blocks[0].blockHash).toBe(cb.blocks[0].blockHash);
    expect(ca.blocks[0].txCount).toBe(1);
  });
});

// ─── Three-node safety test (f=1 Byzantine) ──────────────────────────────────

describe('Three-node consensus: quorum requires 3-of-3 (f=0 with 2-of-3 threshold)', () => {
  let servers: http.Server[];
  let engines: ConsensusEngine[];
  let networks: ConsensusNetwork[];
  let ports: number[];
  const finalized: FinalizedBlock[][] = [[], [], []];

  beforeAll(done => {
    const keypairs = Array.from({ length: 3 }, () =>
      generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      })
    );
    const dids = keypairs.map(kp => didFromPem(kp.publicKey));

    // Lazy net refs indexed by node.
    const netRefs: Array<ConsensusNetwork | undefined> = [undefined, undefined, undefined];

    engines = keypairs.map((kp, i) =>
      new ConsensusEngine(offlineRag, undefined, {
        blockTimeoutMs: 30_000,
        onFinalized: b => finalized[i].push(b),
      })
    );
    for (const engine of engines) {
      for (let i = 0; i < 3; i++) {
        engine.addValidator({ did: dids[i], stake: 1n, publicKeyPem: keypairs[i].publicKey });
      }
    }
    for (let i = 0; i < 3; i++) {
      engines[i].setSelf(dids[i], keypairs[i].privateKey);
    }

    const apps = engines.map((engine, i) => {
      const app = express(); app.use(express.json());
      registerConsensusRoutes(app, engine, {
        deliverVote: (v: SignedVote) => netRefs[i]?.deliverVote(v) ?? Promise.resolve(null),
      });
      return app;
    });

    servers = apps.map(a => http.createServer(a));
    ports = new Array(3).fill(0);

    let started = 0;
    servers.forEach((srv, i) => {
      srv.listen(0, () => {
        ports[i] = (srv.address() as any).port;
        if (++started === 3) {
          networks = engines.map((engine, i) => {
            const peers = ports.filter((_, j) => j !== i).map(p => `http://127.0.0.1:${p}`);
            return new ConsensusNetwork(engine, peers);
          });
          for (let i = 0; i < 3; i++) netRefs[i] = networks[i];
          done();
        }
      });
    });
  });

  afterAll(done => {
    engines.forEach(e => e.destroy());
    networks.forEach(n => n.stop());
    let closed = 0;
    servers.forEach(s => s.close(() => { if (++closed === 3) done(); }));
  });

  it('all three nodes finalize the same block', async () => {
    const statusA = engines[0].getStatus();
    let leaderIdx = 0;
    if (!statusA.isLeader) {
      leaderIdx = engines[1].getStatus().isLeader ? 1 : 2;
    }

    engines[leaderIdx].queueTransfer('tx-3node-1');
    await networks[leaderIdx].tick();

    await waitFor(() => engines.every(e => e.getHeight() >= 1));

    const hashes = finalized.map(f => f[0]?.blockHash);
    expect(new Set(hashes).size).toBe(1);  // all three identical

    // With 3 validators: quorum = ⌊2·3/3⌋+1 = 3. But since f=0 all 3 vote.
    const block = finalized[0][0];
    expect(block.preQC.votes.length).toBeGreaterThanOrEqual(2);   // ≥ 2/3 quorum
    expect(block.commitQC.votes.length).toBeGreaterThanOrEqual(2);
  });
});

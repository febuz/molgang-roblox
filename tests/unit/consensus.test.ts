/**
 * BFT Consensus Engine tests
 *
 * Tests cover: validator management, proposal creation + verification,
 * two-phase voting (Prepare → Commit), quorum certificate formation,
 * block finalization, view change, liveness with single validator,
 * safety (wrong leader, tampered sig, wrong height rejected), DoS caps.
 */

import { generateKeyPairSync, sign as edSign } from 'crypto';
import {
  ConsensusEngine,
  CONSENSUS_GENESIS,
  CONSENSUS_VERSION,
  MAX_VALIDATORS,
  MAX_PENDING_VOTES,
  quorumThreshold,
  proposalHash,
  votePayloadHash,
  buildTxRoot,
  verifyProposalSignature,
  verifyVoteSignature,
  type ValidatorInfo,
  type SignedProposal,
  type BlockProposal,
  type VotePayload,
  type SignedVote,
} from '../../src/integrations/lightrag/consensus';
import { canonicalize, sha256 } from '../../src/integrations/lightrag/graph-state-root';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TestNode {
  did: string;
  publicKeyPem: string;
  privateKeyPem: string;
  engine: ConsensusEngine;
}

function makeNode(did?: string): TestNode {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const theDid = did ?? `did:vpc:${sha256(publicKey).substring(0, 16)}`;
  const engine = new ConsensusEngine({ isConnected: () => false } as any, undefined, {
    blockTimeoutMs: 30_000, // long timeout so view-change doesn't fire in tests
  });
  engine.setSelf(theDid, privateKey);
  return {
    did: theDid,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    engine,
  };
}

function addValidatorToAll(nodes: TestNode[], validator: TestNode): void {
  for (const node of nodes) {
    node.engine.addValidator({
      did: validator.did,
      stake: 100n,
      publicKeyPem: validator.publicKeyPem,
    });
  }
}

function signVote(vp: VotePayload, privateKeyPem: string): SignedVote {
  const digest = Buffer.from(votePayloadHash(vp), 'hex');
  const sig = edSign(null, digest, privateKeyPem).toString('base64');
  return { payload: vp, ts: new Date().toISOString(), sig };
}

function signProposal(bp: BlockProposal, privateKeyPem: string): SignedProposal {
  const digest = Buffer.from(proposalHash(bp), 'hex');
  const sig = edSign(null, digest, privateKeyPem).toString('base64');
  return { payload: bp, ts: new Date().toISOString(), sig };
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

describe('consensus – pure helpers', () => {
  it('quorumThreshold: n=1 → 1, n=3 → 3, n=4 → 3, n=7 → 5', () => {
    expect(quorumThreshold(1)).toBe(1);
    expect(quorumThreshold(3)).toBe(3);
    expect(quorumThreshold(4)).toBe(3);
    expect(quorumThreshold(7)).toBe(5);
  });

  it('buildTxRoot for empty set is stable', () => {
    const r = buildTxRoot([]);
    expect(r).toBe(buildTxRoot([]));
  });

  it('buildTxRoot changes when tx set changes', () => {
    const r1 = buildTxRoot(['tx1', 'tx2']);
    const r2 = buildTxRoot(['tx1', 'tx3']);
    expect(r1).not.toBe(r2);
  });

  it('proposalHash is deterministic', () => {
    const bp: BlockProposal = {
      version: CONSENSUS_VERSION,
      height: 0,
      round: 0,
      leader: 'did:vpc:alice',
      prevHash: CONSENSUS_GENESIS,
      txIds: ['tx1', 'tx2'],
      stateRoot: buildTxRoot(['tx1', 'tx2']),
    };
    expect(proposalHash(bp)).toBe(proposalHash(bp));
  });
});

// ─── Validator management ─────────────────────────────────────────────────────

describe('ConsensusEngine – validators', () => {
  it('addValidator succeeds for valid DID', () => {
    const node = makeNode('did:vpc:test');
    const result = node.engine.addValidator({
      did: 'did:vpc:alice',
      stake: 100n,
      publicKeyPem: node.publicKeyPem,
    });
    expect(result.added).toBe(true);
    expect(node.engine.getValidators()).toHaveLength(1);
  });

  it('addValidator rejects invalid DID', () => {
    const engine = new ConsensusEngine({ isConnected: () => false } as any);
    const { publicKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const r = engine.addValidator({ did: 'not-a-did', stake: 0n, publicKeyPem: publicKey });
    expect(r.added).toBe(false);
  });

  it('getStatus reflects validator count', () => {
    const node = makeNode('did:vpc:a');
    node.engine.addValidator({ did: node.did, stake: 1n, publicKeyPem: node.publicKeyPem });
    const s = node.engine.getStatus();
    expect(s.validators).toBe(1);
    expect(s.isSelf).toBe(true);
    expect(s.isLeader).toBe(true); // only validator = always leader
  });
});

// ─── Single-node consensus (n=1, threshold=1) ─────────────────────────────────

describe('ConsensusEngine – single node (n=1)', () => {
  let node: TestNode;

  beforeEach(() => {
    node = makeNode('did:vpc:solo');
    node.engine.addValidator({
      did: node.did,
      stake: 100n,
      publicKeyPem: node.publicKeyPem,
    });
  });

  it('single node is the leader', () => {
    expect(node.engine.getStatus().isLeader).toBe(true);
  });

  it('createProposal returns a valid signed proposal', () => {
    const sp = node.engine.createProposal();
    expect(sp).not.toBeNull();
    expect(sp!.payload.height).toBe(0);
    expect(sp!.payload.round).toBe(0);
    expect(sp!.payload.leader).toBe(node.did);
    expect(sp!.payload.prevHash).toBe(CONSENSUS_GENESIS);
    expect(verifyProposalSignature(sp!, node.publicKeyPem)).toBe(true);
  });

  it('non-leader cannot create a proposal', () => {
    const node2 = makeNode('did:vpc:other');
    // node2 is not a validator, so not the leader
    node2.engine.addValidator({ did: node.did, stake: 100n, publicKeyPem: node.publicKeyPem });
    // node2 is set as self but is not in validator set
    const sp = node2.engine.createProposal();
    expect(sp).toBeNull();
  });

  it('single node finalizes a block in one round-trip', () => {
    node.engine.queueTransfer('tx-abc');
    const sp = node.engine.createProposal();
    expect(sp).not.toBeNull();

    // Receive proposal → PREPARE vote
    const r1 = node.engine.receiveProposal(sp!);
    expect(r1.accepted).toBe(true);
    expect(r1.vote).not.toBeNull();
    expect(r1.vote!.payload.phase).toBe('PREPARE');

    // Receive PREPARE vote (self) → forms PreQC → COMMIT vote
    const r2 = node.engine.receiveVote(r1.vote!);
    expect(r2.accepted).toBe(true);
    expect(r2.qc).toBeDefined();
    expect(r2.qc!.phase).toBe('PREPARE');
    expect(r2.vote).toBeDefined(); // COMMIT vote

    // Receive COMMIT vote → CommitQC → FINALIZED
    const r3 = node.engine.receiveVote(r2.vote!);
    expect(r3.accepted).toBe(true);
    expect(r3.finalized).toBeDefined();
    expect(r3.finalized!.proposal.payload.height).toBe(0);
    expect(r3.finalized!.proposal.payload.txIds).toEqual(['tx-abc']);

    // Height advances
    expect(node.engine.getHeight()).toBe(1);
    expect(node.engine.getPhase()).toBe('PROPOSE');
    expect(node.engine.getPendingTxIds()).not.toContain('tx-abc');
  });

  it('onFinalized callback is called', () => {
    const cb = jest.fn();
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const did = `did:vpc:${sha256(publicKey).substring(0, 16)}`;
    const eng = new ConsensusEngine({ isConnected: () => false } as any, undefined, {
      blockTimeoutMs: 30_000,
      onFinalized: cb,
    });
    eng.setSelf(did, privateKey);
    eng.addValidator({ did, stake: 1n, publicKeyPem: publicKey });

    const sp = eng.createProposal()!;
    const r1 = eng.receiveProposal(sp);
    const r2 = eng.receiveVote(r1.vote!);
    eng.receiveVote(r2.vote!);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].proposal.payload.height).toBe(0);
  });

  it('consecutive blocks chain by prevHash', () => {
    const finalized: string[] = [];
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const did = `did:vpc:${sha256(publicKey).substring(0, 16)}`;
    const eng = new ConsensusEngine({ isConnected: () => false } as any, undefined, {
      blockTimeoutMs: 30_000,
      onFinalized: (b) => finalized.push(b.blockHash),
    });
    eng.setSelf(did, privateKey);
    eng.addValidator({ did, stake: 1n, publicKeyPem: publicKey });

    const run = () => {
      const sp = eng.createProposal()!;
      const r1 = eng.receiveProposal(sp);
      const r2 = eng.receiveVote(r1.vote!);
      eng.receiveVote(r2.vote!);
    };
    run(); run(); run();

    const blocks = eng.getFinalizedBlocks(10);
    expect(blocks).toHaveLength(3);
    // newest first: blocks[0].prevHash = blocks[1].blockHash
    expect(blocks[0].proposal.payload.prevHash).toBe(blocks[1].blockHash);
    expect(blocks[1].proposal.payload.prevHash).toBe(blocks[2].blockHash);
    expect(blocks[2].proposal.payload.prevHash).toBe(CONSENSUS_GENESIS);
  });
});

// ─── Three-node consensus (n=3, f=1, threshold=3) ─────────────────────────────

describe('ConsensusEngine – three nodes (n=3, f=1)', () => {
  let nodes: TestNode[];

  beforeEach(() => {
    nodes = [
      makeNode('did:vpc:aaa'),
      makeNode('did:vpc:bbb'),
      makeNode('did:vpc:ccc'),
    ].sort((a, b) => a.did.localeCompare(b.did)); // sorted = leader order

    // Add all validators to all nodes
    for (const node of nodes) {
      for (const validator of nodes) {
        node.engine.addValidator({
          did: validator.did,
          stake: 100n,
          publicKeyPem: validator.publicKeyPem,
        });
      }
    }
  });

  it('quorum threshold is 3 for 3 validators', () => {
    expect(quorumThreshold(3)).toBe(3);
  });

  it('leader is the first DID in sorted order', () => {
    const leader = nodes[0].engine.getStatus().leader;
    expect(leader).toBe(nodes[0].did); // sorted[0 + 0 % 3 = 0]
  });

  it('full three-node consensus round finalizes a block on all nodes', () => {
    // Leader creates proposal
    const leaderNode = nodes[0];
    const sp = leaderNode.engine.createProposal()!;
    expect(sp).not.toBeNull();
    const bHash = proposalHash(sp.payload);

    // All nodes receive proposal → collect PREPARE votes
    const prepareVotes: SignedVote[] = [];
    for (const node of nodes) {
      const r = node.engine.receiveProposal(sp);
      expect(r.accepted).toBe(true);
      if (r.vote) prepareVotes.push(r.vote);
    }
    expect(prepareVotes).toHaveLength(3); // all 3 validators voted

    // Feed all PREPARE votes to all nodes
    const commitVotes: SignedVote[] = [];
    for (const node of nodes) {
      for (const vote of prepareVotes) {
        const r = node.engine.receiveVote(vote);
        expect(r.accepted).toBe(true);
        if (r.vote && !commitVotes.find(v => v.payload.voter === r.vote!.payload.voter)) {
          commitVotes.push(r.vote);
        }
      }
    }
    // At least one COMMIT vote per node
    expect(commitVotes.length).toBeGreaterThanOrEqual(3);

    // Feed all COMMIT votes to all nodes → first to reach quorum finalizes
    let finalizedCount = 0;
    for (const node of nodes) {
      for (const vote of commitVotes) {
        const r = node.engine.receiveVote(vote);
        if (r.finalized) finalizedCount++;
      }
    }
    expect(finalizedCount).toBeGreaterThanOrEqual(1);

    // All nodes should be at height 1
    for (const node of nodes) {
      expect(node.engine.getHeight()).toBe(1);
    }
  });

  it('2-of-3 PREPARE votes are NOT enough (threshold=3)', () => {
    const leaderNode = nodes[0];
    const sp = leaderNode.engine.createProposal()!;

    // Only two nodes receive and vote
    const r0 = nodes[0].engine.receiveProposal(sp);
    const r1 = nodes[1].engine.receiveProposal(sp);
    // nodes[2] offline

    // Feed only 2 PREPARE votes to leader
    const twoVotes = [r0.vote!, r1.vote!];
    let qcFormed = false;
    for (const v of twoVotes) {
      const r = nodes[0].engine.receiveVote(v);
      if (r.qc) qcFormed = true;
    }
    // n=3, threshold=3 → 2 votes not enough
    expect(qcFormed).toBe(false);
    expect(nodes[0].engine.getHeight()).toBe(0); // still at 0
  });
});

// ─── Safety properties ────────────────────────────────────────────────────────

describe('ConsensusEngine – safety', () => {
  let node: TestNode;

  beforeEach(() => {
    node = makeNode('did:vpc:safe');
    node.engine.addValidator({
      did: node.did,
      stake: 1n,
      publicKeyPem: node.publicKeyPem,
    });
  });

  it('rejects proposal with wrong version', () => {
    const sp = node.engine.createProposal()!;
    const tampered: SignedProposal = {
      ...sp,
      payload: { ...sp.payload, version: 99 },
    };
    const r = node.engine.receiveProposal(tampered);
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('version');
  });

  it('rejects proposal with wrong height', () => {
    const sp = node.engine.createProposal()!;
    const tampered: SignedProposal = {
      ...sp,
      payload: { ...sp.payload, height: 99 },
    };
    const r = node.engine.receiveProposal(tampered);
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('height');
  });

  it('rejects proposal from a non-leader', () => {
    // Add a second validator
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const did2 = 'did:vpc:zzzzzz'; // sorts after solo → not leader at h=0,r=0
    node.engine.addValidator({ did: did2, stake: 1n, publicKeyPem: publicKey });

    // Create a fraudulent proposal signed by did2 (not the leader)
    const bp: BlockProposal = {
      version: CONSENSUS_VERSION,
      height: 0,
      round: 0,
      leader: did2,
      prevHash: CONSENSUS_GENESIS,
      txIds: [],
      stateRoot: buildTxRoot([]),
    };
    const sp = signProposal(bp, privateKey);
    const r = node.engine.receiveProposal(sp);
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('leader');
  });

  it('rejects proposal with invalid signature', () => {
    const sp = node.engine.createProposal()!;
    const tampered: SignedProposal = { ...sp, sig: 'AAAAAAAAAAAAAAAA' };
    const r = node.engine.receiveProposal(tampered);
    expect(r.accepted).toBe(false);
  });

  it('rejects proposal with wrong prevHash', () => {
    const sp = node.engine.createProposal()!;
    // Tamper prevHash — need to re-sign
    const tamperedPayload: BlockProposal = { ...sp.payload, prevHash: 'a'.repeat(64) };
    const tampered = signProposal(tamperedPayload, node.privateKeyPem);
    const r = node.engine.receiveProposal(tampered);
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('prevHash');
  });

  it('rejects vote from non-validator', () => {
    const sp = node.engine.createProposal()!;
    node.engine.receiveProposal(sp);
    const bHash = proposalHash(sp.payload);

    const { publicKey: pk2, privateKey: priv2 } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const did2 = `did:vpc:${sha256(pk2).substring(0, 16)}`;
    // did2 is NOT in the validator set
    const vp: VotePayload = {
      version: CONSENSUS_VERSION, height: 0, round: 0,
      phase: 'PREPARE', blockHash: bHash, voter: did2,
    };
    const sv = signVote(vp, priv2);
    const r = node.engine.receiveVote(sv);
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('validator set');
  });

  it('rejects vote with wrong height', () => {
    const sp = node.engine.createProposal()!;
    node.engine.receiveProposal(sp);
    const bHash = proposalHash(sp.payload);
    const vp: VotePayload = {
      version: CONSENSUS_VERSION, height: 99, round: 0,
      phase: 'PREPARE', blockHash: bHash, voter: node.did,
    };
    const sv = signVote(vp, node.privateKeyPem);
    const r = node.engine.receiveVote(sv);
    expect(r.accepted).toBe(false);
  });

  it('votes are idempotent — same vote twice counts once', () => {
    const sp = node.engine.createProposal()!;
    const r1 = node.engine.receiveProposal(sp);
    const prepareVote = r1.vote!;

    // First PREPARE vote → PreQC forms (n=1), COMMIT vote returned
    const r2 = node.engine.receiveVote(prepareVote);
    expect(r2.qc?.phase).toBe('PREPARE');
    expect(r2.vote).toBeDefined();

    // Duplicate PREPARE vote: accepted (idempotent) but no new QC
    const r3 = node.engine.receiveVote(prepareVote);
    expect(r3.accepted).toBe(true);
    expect(r3.qc).toBeUndefined(); // no second PreQC
    expect(r3.finalized).toBeUndefined();

    // Height still 0 — need COMMIT vote to finalize
    expect(node.engine.getHeight()).toBe(0);

    // Receiving the COMMIT vote finalizes
    const r4 = node.engine.receiveVote(r2.vote!);
    expect(r4.finalized).toBeDefined();
    expect(node.engine.getHeight()).toBe(1);
  });
});

// ─── View change ──────────────────────────────────────────────────────────────

describe('ConsensusEngine – view change', () => {
  it('viewChange increments round and resets phase', () => {
    const node = makeNode('did:vpc:vc');
    node.engine.addValidator({ did: node.did, stake: 1n, publicKeyPem: node.publicKeyPem });
    expect(node.engine.getRound()).toBe(0);
    node.engine.viewChange();
    expect(node.engine.getRound()).toBe(1);
    expect(node.engine.getPhase()).toBe('PROPOSE');
  });

  it('multiple view changes cycle through leaders', () => {
    // n=3 validators; leader = sorted[h+r % 3]
    const n0 = makeNode('did:vpc:aaa');
    const n1 = makeNode('did:vpc:bbb');
    const n2 = makeNode('did:vpc:ccc');
    const sorted = [n0, n1, n2].sort((a, b) => a.did.localeCompare(b.did));

    for (const node of [n0, n1, n2]) {
      for (const v of [n0, n1, n2]) {
        node.engine.addValidator({ did: v.did, stake: 1n, publicKeyPem: v.publicKeyPem });
      }
    }

    // h=0, r=0 → leader = sorted[0]
    expect(n0.engine.getStatus().leader).toBe(sorted[0].did);
    n0.engine.viewChange(); // r=1 → leader = sorted[1]
    expect(n0.engine.getStatus().leader).toBe(sorted[1].did);
    n0.engine.viewChange(); // r=2 → leader = sorted[2]
    expect(n0.engine.getStatus().leader).toBe(sorted[2].did);
    n0.engine.viewChange(); // r=3 → leader = sorted[0] (wraps)
    expect(n0.engine.getStatus().leader).toBe(sorted[0].did);
  });

  it('pending transfers survive a view change', () => {
    const node = makeNode('did:vpc:vc');
    node.engine.addValidator({ did: node.did, stake: 1n, publicKeyPem: node.publicKeyPem });
    node.engine.queueTransfer('tx-survives');
    node.engine.viewChange();
    expect(node.engine.getPendingTxIds()).toContain('tx-survives');
  });
});

// ─── DoS caps ─────────────────────────────────────────────────────────────────

describe('ConsensusEngine – DoS caps', () => {
  it('rejects validators beyond MAX_VALIDATORS', () => {
    const engine = new ConsensusEngine({ isConnected: () => false } as any);
    const { publicKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    // Fill up to MAX_VALIDATORS
    for (let i = 0; i < MAX_VALIDATORS; i++) {
      engine.addValidator({ did: `did:vpc:v${i}`, stake: 1n, publicKeyPem: publicKey });
    }
    const overflow = engine.addValidator({
      did: `did:vpc:overflow`,
      stake: 1n,
      publicKeyPem: publicKey,
    });
    expect(overflow.added).toBe(false);
    expect(overflow.reason).toContain('full');
  });
});

// ─── Signature verification helpers ───────────────────────────────────────────

describe('consensus – signature helpers', () => {
  it('verifyProposalSignature returns true for valid sig', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const bp: BlockProposal = {
      version: CONSENSUS_VERSION, height: 0, round: 0,
      leader: 'did:vpc:test', prevHash: CONSENSUS_GENESIS,
      txIds: [], stateRoot: buildTxRoot([]),
    };
    const sp = signProposal(bp, privateKey);
    expect(verifyProposalSignature(sp, publicKey)).toBe(true);
  });

  it('verifyProposalSignature returns false for tampered payload', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const bp: BlockProposal = {
      version: CONSENSUS_VERSION, height: 0, round: 0,
      leader: 'did:vpc:test', prevHash: CONSENSUS_GENESIS,
      txIds: [], stateRoot: buildTxRoot([]),
    };
    const sp = signProposal(bp, privateKey);
    const tampered: SignedProposal = { ...sp, payload: { ...bp, height: 1 } };
    expect(verifyProposalSignature(tampered, publicKey)).toBe(false);
  });

  it('verifyVoteSignature returns true for valid sig', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const vp: VotePayload = {
      version: CONSENSUS_VERSION, height: 0, round: 0,
      phase: 'PREPARE', blockHash: 'a'.repeat(64), voter: 'did:vpc:x',
    };
    const sv = signVote(vp, privateKey);
    expect(verifyVoteSignature(sv, publicKey)).toBe(true);
  });

  it('verifyVoteSignature returns false for wrong key', () => {
    const { publicKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const { privateKey: wrongKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const vp: VotePayload = {
      version: CONSENSUS_VERSION, height: 0, round: 0,
      phase: 'COMMIT', blockHash: 'b'.repeat(64), voter: 'did:vpc:y',
    };
    const sv = signVote(vp, wrongKey);
    expect(verifyVoteSignature(sv, publicKey)).toBe(false);
  });
});

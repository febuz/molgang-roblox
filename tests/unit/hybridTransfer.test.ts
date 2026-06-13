/**
 * Hybrid PQ transfers — POST-QUANTUM-WALLET.md §6, phase 2
 *
 * Covers: optional pqSignature co-signature on Transfer (stateless verify),
 * partial-PQ-data rejection, wrong-root rejection, enrolled-root binding via
 * setPqRootResolver, the 'require-enrolled' policy, the node-held hybrid
 * transfer path (PqWalletService.transferHybrid + REST route), one-time index
 * consumption, and the proposal-close → backlog bridge (graph-as-hub wiring).
 */

process.env.KAFKA_DISABLED = '1';

import express from 'express';
import * as http from 'http';
import {
  ValueChainService, verifyTransfer, transferPayload, tokensToUnits, type Transfer,
} from '../../src/integrations/lightrag/value-chain';
import { PqWalletService, registerPqRoutes } from '../../src/integrations/lightrag/wallet-vault';
import { HashBasedSigner } from '../../src/integrations/lightrag/pq-crypto';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { GroupVotingService } from '../../src/integrations/lightrag/group-voting';
import { BacklogService } from '../../src/integrations/lightrag/backlog';

const offlineRag = { isConnected: () => false } as any;

function makeStack() {
  const identity = new SovereignIdentityService(offlineRag);
  const chain = new ValueChainService(offlineRag, { identity });
  const pq = new PqWalletService(identity, chain, { treeHeight: 3 });  // 8 sigs — fast tests
  return { identity, chain, pq };
}

/** Build a fully signed transfer by hand (external-submission path). */
function buildSignedTransfer(
  identity: SovereignIdentityService,
  chain: ValueChainService,
  fromDid: string,
  toDid: string,
  units: bigint,
  pqSigner?: HashBasedSigner,
  pqRootOverride?: string,
): Transfer {
  const acc = chain.getAccount(fromDid);
  const unsigned = {
    id: `tx_test_${Math.random().toString(36).slice(2)}`,
    from: fromDid,
    to: toDid,
    amount: units.toString(),
    nonce: acc.nonce + 1,
    memo: '',
  };
  const payload = transferPayload(unsigned);
  const { signature, publicKeyPem } = identity.signAs(fromDid, payload);
  const tx: Transfer = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature };
  if (pqSigner) {
    tx.pqSignature = pqSigner.sign(payload);
    tx.pqRoot = pqRootOverride ?? pqSigner.root;
  }
  return tx;
}

// ── Stateless verification ────────────────────────────────────────────────────

describe('verifyTransfer with PQ co-signature', () => {
  it('classical-only transfer remains valid (backward compatible)', () => {
    const { identity, chain } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 10);
    const tx = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1));
    expect(verifyTransfer(tx).valid).toBe(true);
  });

  it('hybrid transfer with valid PQ co-signature verifies', () => {
    const { identity, chain } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 10);
    const signer = new HashBasedSigner(undefined, 3);
    const tx = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1), signer);
    expect(verifyTransfer(tx).valid).toBe(true);
  });

  it('rejects pqSignature without pqRoot (and vice versa)', () => {
    const { identity, chain } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 10);
    const signer = new HashBasedSigner(undefined, 3);
    const tx = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1), signer);

    const noRoot = { ...tx, pqRoot: undefined };
    expect(verifyTransfer(noRoot).valid).toBe(false);
    expect(verifyTransfer(noRoot).reason).toMatch(/both/);

    const noSig = { ...tx, pqSignature: undefined };
    expect(verifyTransfer(noSig).valid).toBe(false);
  });

  it('rejects PQ signature under the wrong root', () => {
    const { identity, chain } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 10);
    const signer = new HashBasedSigner(undefined, 3);
    const otherSigner = new HashBasedSigner(undefined, 3);
    const tx = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1), signer, otherSigner.root);
    const result = verifyTransfer(tx);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/post-quantum/);
  });

  it('rejects PQ signature over tampered payload (amount changed after co-signing)', () => {
    const { identity, chain } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 10);
    const signer = new HashBasedSigner(undefined, 3);
    const tx = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1), signer);
    const tampered = { ...tx, amount: tokensToUnits(2).toString() };
    expect(verifyTransfer(tampered).valid).toBe(false);
  });
});

// ── Service-level binding + policy ────────────────────────────────────────────

describe('submitTransfer PQ binding via resolver', () => {
  it('accepts hybrid transfer whose root matches the enrolled root', () => {
    const { identity, chain, pq } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    pq.enroll('alice');
    chain.setPqRootResolver(did => pq.getEnrolledRoot(did));

    const tx = pq.transferHybrid('alice', b.did, tokensToUnits(1));
    expect(tx.pqRoot).toBe(pq.getEnrolledRoot(a.did));
    expect(chain.getAccount(b.did).balance).toBe(tokensToUnits(1));
  });

  it('rejects a carried pqRoot that differs from the enrolled root', () => {
    const { identity, chain, pq } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    pq.enroll('alice');
    chain.setPqRootResolver(did => pq.getEnrolledRoot(did));

    // Attacker signs with their OWN PQ key — valid signature, wrong binding
    const attacker = new HashBasedSigner(undefined, 3);
    const tx = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1), attacker);
    const result = chain.submitTransfer(tx);
    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/enrolled/);
  });

  it('rejects a pqRoot from a sender with no enrollment', () => {
    const { identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    chain.setPqRootResolver(() => undefined);   // nobody enrolled

    const signer = new HashBasedSigner(undefined, 3);
    const tx = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1), signer);
    const result = chain.submitTransfer(tx);
    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/no enrolled PQ key/);
  });

  it("policy 'require-enrolled': enrolled sender may not submit classical-only transfers", () => {
    const { identity, chain, pq } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    pq.enroll('alice');
    chain.setPqRootResolver(did => pq.getEnrolledRoot(did));
    chain.setPqPolicy('require-enrolled');

    const classical = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1));
    const rejected = chain.submitTransfer(classical);
    expect(rejected.applied).toBe(false);
    expect(rejected.reason).toMatch(/require-enrolled/);

    // The hybrid path still works
    const tx = pq.transferHybrid('alice', b.did, tokensToUnits(1));
    expect(chain.getAccount(b.did).balance).toBe(tokensToUnits(1));
    expect(tx.pqSignature).toBeDefined();
  });

  it("policy 'require-enrolled': NOT-enrolled senders are unaffected", () => {
    const { identity, chain, pq } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    chain.setPqRootResolver(did => pq.getEnrolledRoot(did));
    chain.setPqPolicy('require-enrolled');

    const classical = buildSignedTransfer(identity, chain, a.did, b.did, tokensToUnits(1));
    expect(chain.submitTransfer(classical).applied).toBe(true);
  });
});

// ── One-time index consumption ────────────────────────────────────────────────

describe('hybrid transfer one-time signature budget', () => {
  it('each hybrid transfer consumes one index; key exhaustion throws', () => {
    const { identity, chain, pq } = makeStack();   // treeHeight 3 → 8 signatures
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    pq.enroll('alice');
    chain.setPqRootResolver(did => pq.getEnrolledRoot(did));

    const before = pq.status('alice').remainingSignatures!;
    pq.transferHybrid('alice', b.did, tokensToUnits(1));
    expect(pq.status('alice').remainingSignatures).toBe(before - 1);

    for (let i = 0; i < before - 1; i++) pq.transferHybrid('alice', b.did, tokensToUnits(1));
    expect(() => pq.transferHybrid('alice', b.did, tokensToUnits(1))).toThrow(/exhausted/);
  });
});

// ── Snapshot replay ───────────────────────────────────────────────────────────

describe('hybrid transfers survive snapshot restore', () => {
  it('replaying a hybrid transfer after restart does not hit the binding check', () => {
    const { identity, chain, pq } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    pq.enroll('alice');
    chain.setPqRootResolver(did => pq.getEnrolledRoot(did));
    pq.transferHybrid('alice', b.did, tokensToUnits(1));

    const snapshot = chain.exportState();

    // Fresh chain after "restart": enrollments are gone, resolver knows nothing
    const fresh = new ValueChainService(offlineRag, { identity });
    fresh.setPqRootResolver(() => undefined);
    fresh.setPqPolicy('require-enrolled');
    expect(() => fresh.restoreState(snapshot)).not.toThrow();
    expect(fresh.getAccount(b.did).balance).toBe(tokensToUnits(1));
  });

  it('a tampered hybrid transfer in the snapshot still fails crypto verification', () => {
    const { identity, chain, pq } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    pq.enroll('alice');
    chain.setPqRootResolver(did => pq.getEnrolledRoot(did));
    pq.transferHybrid('alice', b.did, tokensToUnits(1));

    const snapshot = chain.exportState();
    const hybrid = snapshot.transfers.find(t => t.pqSignature)!;
    hybrid.amount = tokensToUnits(5).toString();   // tamper

    const fresh = new ValueChainService(offlineRag, { identity });
    expect(() => fresh.restoreState(snapshot)).toThrow();
  });
});

// ── REST route ────────────────────────────────────────────────────────────────

describe('POST /api/users/:handle/pq/transfer', () => {
  let url: string;
  let server: http.Server;
  let stack: ReturnType<typeof makeStack>;
  let bobDid: string;

  beforeEach(async () => {
    stack = makeStack();
    const alice = stack.identity.register('alice');
    const bob = stack.identity.register('bob');
    bobDid = bob.did;
    stack.chain.mintReward(alice.did, 100);
    stack.pq.enroll('alice');
    stack.chain.setPqRootResolver(did => stack.pq.getEnrolledRoot(did));

    const app = express();
    app.use(express.json());
    registerPqRoutes(app, stack.pq);
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        url = `http://localhost:${(server.address() as any).port}`;
        resolve();
      });
    });
  });

  afterEach(done => { server.close(done); });

  function post(path: string, body: unknown): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url + path);
      const payload = JSON.stringify(body);
      const req = http.request({
        hostname: parsed.hostname, port: parseInt(parsed.port), path: parsed.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, res => {
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString()) }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  it('creates a hybrid transfer with tokens amount', async () => {
    const res = await post('/api/users/alice/pq/transfer', { to: bobDid, tokens: 2.5, memo: 'hybrid' });
    expect(res.status).toBe(201);
    expect(res.body.transfer.pqSignature).toBeDefined();
    expect(res.body.transfer.pqRoot).toBe(stack.pq.getEnrolledRoot(res.body.transfer.from));
    expect(stack.chain.getAccount(bobDid).balance).toBe(tokensToUnits(2.5));
  });

  it('creates a hybrid transfer with exact units amount', async () => {
    const res = await post('/api/users/alice/pq/transfer', { to: bobDid, units: '100000000' });
    expect(res.status).toBe(201);
    expect(stack.chain.getAccount(bobDid).balance).toBe(100000000n);
  });

  it('rejects missing recipient', async () => {
    const res = await post('/api/users/alice/pq/transfer', { tokens: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects un-enrolled handle', async () => {
    const res = await post('/api/users/bob/pq/transfer', { to: bobDid, tokens: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/enroll/);
  });
});

// ── Proposal-close → backlog bridge (graph-as-hub) ────────────────────────────

describe('proposal close closes linked backlog items', () => {
  it('setOnClose hook fires closeByProposal for linked items', () => {
    const identity = new SovereignIdentityService(offlineRag);
    const groups = new GroupVotingService(identity);
    const backlog = new BacklogService();
    groups.setOnClose(cert => backlog.closeByProposal(cert.proposalId));

    const owner = identity.register('owner');
    const g = groups.createGroup({ name: 'maintainers', owner: owner.did });
    const proposal = groups.createProposal(g.id, {
      question: 'Ship the backlog feature?', options: ['yes', 'no'], createdBy: owner.did,
    });

    const item = backlog.create({ title: 'Implement backlog hub' });
    backlog.link(item.id, 'proposal', proposal.id);
    const unrelated = backlog.create({ title: 'Unrelated item' });

    groups.castVote(proposal.id, owner.did, 'yes');
    groups.close(proposal.id);

    expect(backlog.get(item.id)!.status).toBe('closed');
    expect(backlog.get(unrelated.id)!.status).toBe('open');
  });

  it('a throwing hook does not break close()', () => {
    const identity = new SovereignIdentityService(offlineRag);
    const groups = new GroupVotingService(identity);
    groups.setOnClose(() => { throw new Error('boom'); });

    const owner = identity.register('owner');
    const g = groups.createGroup({ name: 'g', owner: owner.did });
    const proposal = groups.createProposal(g.id, { question: 'q?', options: ['a', 'b'], createdBy: owner.did });
    const cert = groups.close(proposal.id);
    expect(cert.certHash).toBeDefined();
  });
});

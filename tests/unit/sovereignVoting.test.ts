/**
 * Unit tests for sovereign-voting.ts — DID-bound sybil-resistant referenda.
 * All offline (Node crypto Ed25519).
 */

import {
  SovereignVotingService,
  Ballot,
  ballotPayload,
  registerSovereignVotingRoutes,
} from '../../src/integrations/lightrag/sovereign-voting';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { ValueChainService } from '../../src/integrations/lightrag/value-chain';
import { NewsService } from '../../src/integrations/lightrag/news';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

async function callRoute(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const reqBody = body ? JSON.stringify(body) : '';
      const req = http.request(`http://127.0.0.1:${port}${path}`, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      }, (res) => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 200, body: data }); }
        });
      });
      req.on('error', e => { server.close(); reject(e); });
      if (reqBody) req.write(reqBody);
      req.end();
    });
  });
}

function makeStack() {
  const client = makeOfflineClient();
  const identity = new SovereignIdentityService(client);
  const valueChain = new ValueChainService(client, { identity });
  const news = new NewsService(client);
  const voting = new SovereignVotingService(client, { identity, valueChain, news });
  return { client, identity, valueChain, news, voting };
}

// ──────────────────────────────────────────────────────────────────────────────
// Proposals
// ──────────────────────────────────────────────────────────────────────────────

describe('createProposal', () => {
  it('creates an identity-mode proposal by default', async () => {
    const { client, identity, voting } = makeStack();
    const proposer = identity.register('kai');
    const p = voting.createProposal({ question: 'Kafka of NATS?', options: ['kafka', 'nats'], createdBy: proposer.did });
    expect(p.status).toBe('open');
    expect(p.mode).toBe('identity');
    await client.close();
  });

  it('rejects an unregistered proposer (sybil gate)', async () => {
    const { client, voting } = makeStack();
    expect(() => voting.createProposal({
      question: 'q', options: ['a', 'b'], createdBy: 'did:vpc:' + 'e'.repeat(32),
    })).toThrow(/not a registered/);
    await client.close();
  });

  it('rejects fewer than 2 distinct options', async () => {
    const { client, identity, voting } = makeStack();
    const p = identity.register('kai');
    expect(() => voting.createProposal({ question: 'q', options: ['a', 'a'], createdBy: p.did })).toThrow(/2 distinct/);
    expect(() => voting.createProposal({ question: 'q', options: ['a'], createdBy: p.did })).toThrow(/2 distinct/);
    await client.close();
  });

  it('stake mode requires a value chain', async () => {
    const client = makeOfflineClient();
    const identity = new SovereignIdentityService(client);
    const voting = new SovereignVotingService(client, { identity }); // no value chain
    const p = identity.register('kai');
    expect(() => voting.createProposal({
      question: 'q', options: ['a', 'b'], createdBy: p.did, mode: 'stake',
    })).toThrow(/value chain/);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Voting — identity mode (one DID, one vote)
// ──────────────────────────────────────────────────────────────────────────────

describe('identity-mode voting', () => {
  it('registered DIDs vote with weight 1', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const zip = identity.register('zip');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    const ballot = voting.castVote(p.id, kai.did, 'a');
    expect(ballot.weight).toBe(1);
    voting.castVote(p.id, zip.did, 'b');
    const t = voting.tally(p.id);
    expect(t.totals).toEqual({ a: 1, b: 1 });
    expect(t.winner).toBeNull(); // tie
    await client.close();
  });

  it('one DID cannot vote twice (sybil gate)', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    voting.castVote(p.id, kai.did, 'a');
    expect(() => voting.castVote(p.id, kai.did, 'b')).toThrow(/already voted/);
    await client.close();
  });

  it('an unregistered DID cannot vote', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    const ghost: Ballot = {
      proposalId: p.id, voter: 'did:vpc:' + 'f'.repeat(32), option: 'a',
      weight: 0, ts: new Date().toISOString(), publicKeyPem: 'x', signature: 'x',
    };
    expect(voting.submitBallot(ghost).reason).toMatch(/not a registered/);
    await client.close();
  });

  it('rejects a forged signature', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const mallory = identity.register('mallory');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    // Mallory signs a ballot claiming to be Kai
    const payload = ballotPayload({ proposalId: p.id, voter: kai.did, option: 'a' });
    const { signature, publicKeyPem } = identity.signAs(mallory.did, payload);
    const forged: Ballot = {
      proposalId: p.id, voter: kai.did, option: 'a', weight: 0,
      ts: new Date().toISOString(), publicKeyPem, signature,
    };
    expect(voting.submitBallot(forged).reason).toMatch(/does not belong/);
    await client.close();
  });

  it('a submitted weight is IGNORED — weight is server-derived', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    const payload = ballotPayload({ proposalId: p.id, voter: kai.did, option: 'a' });
    const { signature, publicKeyPem } = identity.signAs(kai.did, payload);
    const inflated: Ballot = {
      proposalId: p.id, voter: kai.did, option: 'a', weight: 1_000_000,
      ts: new Date().toISOString(), publicKeyPem, signature,
    };
    expect(voting.submitBallot(inflated).accepted).toBe(true);
    expect(voting.tally(p.id).totals.a).toBe(1); // not a million
    await client.close();
  });

  it('a ballot signed before key rotation still verifies (key history)', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    const payload = ballotPayload({ proposalId: p.id, voter: kai.did, option: 'a' });
    const { signature, publicKeyPem } = identity.signAs(kai.did, payload); // old key
    identity.rotateKey(kai.did);
    const ballot: Ballot = {
      proposalId: p.id, voter: kai.did, option: 'a', weight: 0,
      ts: new Date().toISOString(), publicKeyPem, signature,
    };
    expect(voting.submitBallot(ballot).accepted).toBe(true);
    await client.close();
  });

  it('rejects votes on closed proposals and unknown options', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const zip = identity.register('zip');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    expect(() => voting.castVote(p.id, kai.did, 'c')).toThrow(/unknown option/);
    await voting.close(p.id);
    expect(() => voting.castVote(p.id, zip.did, 'a')).toThrow(/closed/);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Voting — stake mode
// ──────────────────────────────────────────────────────────────────────────────

describe('stake-mode voting', () => {
  it('ballot weight equals the voter balance at cast time', async () => {
    const { client, identity, valueChain, voting } = makeStack();
    const whale = identity.register('whale');
    const fish = identity.register('fish');
    valueChain.mintReward(whale.did, 100);
    valueChain.mintReward(fish.did, 10);
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: whale.did, mode: 'stake' });
    voting.castVote(p.id, whale.did, 'a');
    voting.castVote(p.id, fish.did, 'b');
    const t = voting.tally(p.id);
    expect(t.totals).toEqual({ a: 100, b: 10 });
    expect(t.winner).toBe('a');
    await client.close();
  });

  it('zero-balance voters are rejected in stake mode', async () => {
    const { client, identity, voting } = makeStack();
    const rich = identity.register('rich');
    const broke = identity.register('broke');
    const { valueChain } = { valueChain: undefined };
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: rich.did, mode: 'stake' });
    expect(() => voting.castVote(p.id, broke.did, 'a')).toThrow(/zero balance/);
    await client.close();
  });

  it('balance changes after casting do not change the recorded weight', async () => {
    const { client, identity, valueChain, voting } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    valueChain.mintReward(a.did, 50);
    const p = voting.createProposal({ question: 'q', options: ['x', 'y'], createdBy: a.did, mode: 'stake' });
    voting.castVote(p.id, a.did, 'x');
    valueChain.transfer(a.did, b.did, 49); // dump after voting
    expect(voting.tally(p.id).totals.x).toBe(50); // snapshot stands
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Close → certificate → news
// ──────────────────────────────────────────────────────────────────────────────

describe('close + certificate', () => {
  it('closing produces a certificate with a ballot Merkle root', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const zip = identity.register('zip');
    const p = voting.createProposal({ question: 'Ship it?', options: ['yes', 'no'], createdBy: kai.did });
    voting.castVote(p.id, kai.did, 'yes');
    voting.castVote(p.id, zip.did, 'yes');
    const cert = await voting.close(p.id);
    expect(cert.tally.winner).toBe('yes');
    expect(cert.ballotRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.certHash).toMatch(/^[0-9a-f]{64}$/);
    expect(voting.getProposal(p.id)!.status).toBe('closed');
    await client.close();
  });

  it('closing twice returns the same certificate (idempotent)', async () => {
    const { client, identity, voting } = makeStack();
    const kai = identity.register('kai');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: kai.did });
    const first = await voting.close(p.id);
    const second = await voting.close(p.id);
    expect(second.certHash).toBe(first.certHash);
    await client.close();
  });

  it('the result is published as a news claim ("stem resultaat als nieuws")', async () => {
    const { client, identity, news, voting } = makeStack();
    const kai = identity.register('kai');
    const p = voting.createProposal({ question: 'Ship it?', options: ['yes', 'no'], createdBy: kai.did });
    voting.castVote(p.id, kai.did, 'yes');
    await voting.close(p.id);
    const items = news.list({ claimer: 'sovereign-voting' });
    expect(items).toHaveLength(1);
    expect(items[0].claimedFact).toContain('Stemresultaat');
    expect(items[0].claimedFact).toContain('yes');
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────────────────────────────────────

describe('Sovereign Voting REST API', () => {
  let client: LightRAGClient;
  let identity: SovereignIdentityService;
  let voting: SovereignVotingService;
  let app: express.Express;
  let proposerDid: string;

  beforeEach(() => {
    client = makeOfflineClient();
    identity = new SovereignIdentityService(client);
    const valueChain = new ValueChainService(client, { identity });
    voting = new SovereignVotingService(client, { identity, valueChain });
    app = express();
    app.use(express.json());
    registerSovereignVotingRoutes(app, voting);
    proposerDid = identity.register('proposer').did;
  });

  afterEach(async () => { await client.close(); });

  it('POST /proposals creates, GET /proposals lists', async () => {
    const { status } = await callRoute(app, 'post', '/api/sovereign-votes/proposals', {
      question: 'q', options: ['a', 'b'], createdBy: proposerDid,
    });
    expect(status).toBe(201);
    const { body } = await callRoute(app, 'get', '/api/sovereign-votes/proposals');
    expect(body.proposals).toHaveLength(1);
  });

  it('POST /proposals/:id/vote casts a node-held ballot', async () => {
    const { body: created } = await callRoute(app, 'post', '/api/sovereign-votes/proposals', {
      question: 'q', options: ['a', 'b'], createdBy: proposerDid,
    });
    const { status, body } = await callRoute(app, 'post', `/api/sovereign-votes/proposals/${created.proposal.id}/vote`, {
      voter: proposerDid, option: 'a',
    });
    expect(status).toBe(201);
    expect(body.ballot.weight).toBe(1);
  });

  it('POST /proposals/:id/vote accepts an externally signed ballot', async () => {
    const { body: created } = await callRoute(app, 'post', '/api/sovereign-votes/proposals', {
      question: 'q', options: ['a', 'b'], createdBy: proposerDid,
    });
    const voter = identity.register('ext');
    const payload = ballotPayload({ proposalId: created.proposal.id, voter: voter.did, option: 'b' });
    const { signature, publicKeyPem } = identity.signAs(voter.did, payload);
    const { status } = await callRoute(app, 'post', `/api/sovereign-votes/proposals/${created.proposal.id}/vote`, {
      ballot: { voter: voter.did, option: 'b', weight: 0, ts: new Date().toISOString(), publicKeyPem, signature },
    });
    expect(status).toBe(201);
  });

  it('GET /proposals/:id returns proposal + live tally', async () => {
    const { body: created } = await callRoute(app, 'post', '/api/sovereign-votes/proposals', {
      question: 'q', options: ['a', 'b'], createdBy: proposerDid,
    });
    await callRoute(app, 'post', `/api/sovereign-votes/proposals/${created.proposal.id}/vote`, {
      voter: proposerDid, option: 'a',
    });
    const { body } = await callRoute(app, 'get', `/api/sovereign-votes/proposals/${created.proposal.id}`);
    expect(body.tally.totals.a).toBe(1);
    expect(body.certificate).toBeNull();
  });

  it('POST /proposals/:id/close returns the certificate', async () => {
    const { body: created } = await callRoute(app, 'post', '/api/sovereign-votes/proposals', {
      question: 'q', options: ['a', 'b'], createdBy: proposerDid,
    });
    await callRoute(app, 'post', `/api/sovereign-votes/proposals/${created.proposal.id}/vote`, {
      voter: proposerDid, option: 'a',
    });
    const { body } = await callRoute(app, 'post', `/api/sovereign-votes/proposals/${created.proposal.id}/close`);
    expect(body.certificate.tally.winner).toBe('a');
  });

  it('duplicate DID vote returns 409 for signed ballots', async () => {
    const { body: created } = await callRoute(app, 'post', '/api/sovereign-votes/proposals', {
      question: 'q', options: ['a', 'b'], createdBy: proposerDid,
    });
    await callRoute(app, 'post', `/api/sovereign-votes/proposals/${created.proposal.id}/vote`, {
      voter: proposerDid, option: 'a',
    });
    const payload = ballotPayload({ proposalId: created.proposal.id, voter: proposerDid, option: 'b' });
    const { signature, publicKeyPem } = identity.signAs(proposerDid, payload);
    const { status } = await callRoute(app, 'post', `/api/sovereign-votes/proposals/${created.proposal.id}/vote`, {
      ballot: { voter: proposerDid, option: 'b', weight: 0, ts: new Date().toISOString(), publicKeyPem, signature },
    });
    expect(status).toBe(409);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Attention mining end-to-end (attention → value)
// ──────────────────────────────────────────────────────────────────────────────

describe('attention mining integration', () => {
  it('attention events from registered agents mint value tokens', async () => {
    const { AttentionChainService } = await import('../../src/integrations/lightrag/attention-chain');
    const client = makeOfflineClient();
    const identity = new SovereignIdentityService(client);
    const valueChain = new ValueChainService(client, { identity });
    const kai = identity.register('kai');

    const attention = new AttentionChainService(client, {
      onEvent: (e) => {
        const did = identity.didForHandle(e.agent);
        if (did) valueChain.rewardAttention(did, e.kind, e.weight);
      },
    });

    attention.record({ itemId: 'news_1', agent: 'kai', kind: 'validate' }); // weight 5
    attention.record({ itemId: 'news_1', agent: 'ghost', kind: 'anchor' }); // unregistered → no mint

    expect(valueChain.getAccount(kai.did).balance).toBe(5);
    expect(valueChain.getSupply().minted).toBe(5);
    await client.close();
  });
});

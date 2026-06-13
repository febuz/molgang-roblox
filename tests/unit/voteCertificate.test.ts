/**
 * Unit tests for vote-certificate.ts — signed votes, certificates,
 * "Stem resultaat als nieuws". All offline (Node crypto Ed25519).
 */

import {
  AgentKeyring,
  signVote,
  verifyVote,
  voteMessage,
  buildCertificate,
  verifyCertificate,
  publishCertificateAsNews,
  VoteCertificateService,
  registerVoteCertRoutes,
  SignedVote,
  CERT_QUORUM,
} from '../../src/integrations/lightrag/vote-certificate';
import { NewsService } from '../../src/integrations/lightrag/news';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

const ROOT = 'ab'.repeat(32);

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

function makeVotes(keyring: AgentKeyring, factId: string, voters: string[], vote: 'validate' | 'challenge' = 'validate'): SignedVote[] {
  return voters.map(voter => signVote(keyring, { factId, voter, vote, graphRoot: ROOT }));
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

// ──────────────────────────────────────────────────────────────────────────────
// Keyring + vote signing
// ──────────────────────────────────────────────────────────────────────────────

describe('AgentKeyring', () => {
  it('creates a keypair lazily and returns the same one afterwards', () => {
    const kr = new AgentKeyring();
    const a = kr.getOrCreate('kai');
    const b = kr.getOrCreate('kai');
    expect(a.publicKeyPem).toBe(b.publicKeyPem);
    expect(kr.agents()).toEqual(['kai']);
  });

  it('different agents get different keys', () => {
    const kr = new AgentKeyring();
    expect(kr.getOrCreate('kai').publicKeyPem).not.toBe(kr.getOrCreate('zip').publicKeyPem);
  });
});

describe('signVote / verifyVote', () => {
  const kr = new AgentKeyring();

  it('produces a vote that verifies', () => {
    const v = signVote(kr, { factId: 'fact_1', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    expect(verifyVote(v)).toBe(true);
  });

  it('round defaults to 0', () => {
    const v = signVote(kr, { factId: 'fact_1', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    expect(v.round).toBe(0);
  });

  it('detects a tampered vote choice', () => {
    const v = signVote(kr, { factId: 'fact_1', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    expect(verifyVote({ ...v, vote: 'challenge' })).toBe(false);
  });

  it('detects a tampered graph root', () => {
    const v = signVote(kr, { factId: 'fact_1', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    expect(verifyVote({ ...v, graphRoot: 'cd'.repeat(32) })).toBe(false);
  });

  it('detects voter impersonation (signature from a different key)', () => {
    const v = signVote(kr, { factId: 'fact_1', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    const other = new AgentKeyring().getOrCreate('evil');
    expect(verifyVote({ ...v, publicKeyPem: other.publicKeyPem })).toBe(false);
  });

  it('voteMessage excludes ts and key — same round message for identical votes', () => {
    const v1 = signVote(kr, { factId: 'f', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    const v2 = { ...v1, ts: '2099-01-01T00:00:00Z' };
    expect(voteMessage(v1)).toBe(voteMessage(v2));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Certificate building
// ──────────────────────────────────────────────────────────────────────────────

describe('buildCertificate', () => {
  const kr = new AgentKeyring();

  it('confirms at quorum validates', () => {
    const votes = makeVotes(kr, 'fact_1', ['kai', 'zip', 'fill']);
    const cert = buildCertificate({ factId: 'fact_1', graphRoot: ROOT, votes });
    expect(cert.result).toBe('confirmed');
    expect(cert.validateCount).toBe(3);
    expect(cert.scheme).toBe('ed25519-multisig-v1');
  });

  it('stays contested below quorum', () => {
    const votes = makeVotes(kr, 'fact_1', ['kai', 'zip']);
    const cert = buildCertificate({ factId: 'fact_1', graphRoot: ROOT, votes });
    expect(cert.result).toBe('contested');
  });

  it('rejects at 5 challenges', () => {
    const votes = makeVotes(kr, 'fact_1', ['a', 'b', 'c', 'd', 'e'], 'challenge');
    const cert = buildCertificate({ factId: 'fact_1', graphRoot: ROOT, votes });
    expect(cert.result).toBe('rejected');
    expect(cert.challengeCount).toBe(5);
  });

  it('drops votes with invalid signatures', () => {
    const votes = makeVotes(kr, 'fact_1', ['kai', 'zip', 'fill']);
    votes[0] = { ...votes[0], signature: Buffer.from('garbage-signature-bytes-padded-to-64'.padEnd(64, 'x')).toString('base64') };
    const cert = buildCertificate({ factId: 'fact_1', graphRoot: ROOT, votes });
    expect(cert.validateCount).toBe(2);
    expect(cert.result).toBe('contested'); // only 2 valid < quorum
  });

  it('drops duplicate voters', () => {
    const votes = [
      ...makeVotes(kr, 'fact_1', ['kai', 'zip', 'fill']),
      signVote(kr, { factId: 'fact_1', voter: 'kai', vote: 'validate', graphRoot: ROOT }),
    ];
    const cert = buildCertificate({ factId: 'fact_1', graphRoot: ROOT, votes });
    expect(cert.votes).toHaveLength(3);
  });

  it('drops votes for a different graph root', () => {
    const votes = makeVotes(kr, 'fact_1', ['kai', 'zip']);
    const otherRoot = signVote(kr, { factId: 'fact_1', voter: 'fill', vote: 'validate', graphRoot: 'cd'.repeat(32) });
    const cert = buildCertificate({ factId: 'fact_1', graphRoot: ROOT, votes: [...votes, otherRoot] });
    expect(cert.votes).toHaveLength(2);
  });

  it('certHash binds the certificate body', () => {
    const votes = makeVotes(kr, 'fact_1', ['kai', 'zip', 'fill']);
    const cert = buildCertificate({ factId: 'fact_1', graphRoot: ROOT, votes });
    expect(cert.certHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Certificate verification
// ──────────────────────────────────────────────────────────────────────────────

describe('verifyCertificate', () => {
  const kr = new AgentKeyring();

  function confirmedCert() {
    return buildCertificate({
      factId: 'fact_1',
      graphRoot: ROOT,
      votes: makeVotes(kr, 'fact_1', ['kai', 'zip', 'fill']),
    });
  }

  it('accepts a freshly built certificate', () => {
    expect(verifyCertificate(confirmedCert())).toEqual({ valid: true });
  });

  it('rejects when certHash is tampered', () => {
    const cert = { ...confirmedCert(), certHash: '0'.repeat(64) };
    expect(verifyCertificate(cert).reason).toMatch(/certHash/);
  });

  it('rejects when result is upgraded without votes', () => {
    const cert = confirmedCert();
    const tampered = { ...cert, votes: cert.votes.slice(0, 2), validateCount: 2 };
    // Recompute hash so only the result claim is inconsistent
    const { certHash, ...body } = tampered as any;
    const { sha256, canonicalize } = require('../../src/integrations/lightrag/graph-state-root');
    tampered.certHash = sha256(canonicalize(body));
    expect(verifyCertificate(tampered).reason).toMatch(/does not follow/);
  });

  it('rejects an unsupported scheme', () => {
    const cert = { ...confirmedCert(), scheme: 'bls12-381-v1' as const };
    const { certHash, ...body } = cert as any;
    const { sha256, canonicalize } = require('../../src/integrations/lightrag/graph-state-root');
    cert.certHash = sha256(canonicalize(body));
    expect(verifyCertificate(cert).reason).toMatch(/unsupported scheme/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Service + news integration ("Stem resultaat als nieuws")
// ──────────────────────────────────────────────────────────────────────────────

describe('VoteCertificateService', () => {
  let client: LightRAGClient;
  let service: VoteCertificateService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new VoteCertificateService(client);
  });

  afterEach(async () => { await client.close(); });

  it('castVote signs with the node keyring and stores the vote', async () => {
    const v = await service.castVote({ factId: 'fact_9', voter: 'kai', vote: 'validate' });
    expect(verifyVote(v)).toBe(true);
    expect(service.getVotes('fact_9')).toHaveLength(1);
  });

  it('addVote rejects invalid signatures', () => {
    const kr = new AgentKeyring();
    const v = signVote(kr, { factId: 'f', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    expect(service.addVote({ ...v, signature: v.signature.replace(/^./, 'A') })).toBe(false);
  });

  it('addVote deduplicates voter+round', () => {
    const kr = new AgentKeyring();
    const v = signVote(kr, { factId: 'f', voter: 'kai', vote: 'validate', graphRoot: ROOT });
    expect(service.addVote(v)).toBe(true);
    expect(service.addVote(v)).toBe(false);
  });

  it('buildFor returns null without votes, a certificate with them', async () => {
    expect(service.buildFor('fact_none')).toBeNull();
    await service.castVote({ factId: 'fact_9', voter: 'kai', vote: 'validate' });
    await service.castVote({ factId: 'fact_9', voter: 'zip', vote: 'validate' });
    await service.castVote({ factId: 'fact_9', voter: 'fill', vote: 'validate' });
    const cert = service.buildFor('fact_9');
    expect(cert!.result).toBe('confirmed');
    expect(verifyCertificate(cert!).valid).toBe(true);
    expect(service.getCertificate('fact_9')!.certHash).toBe(cert!.certHash);
  });

  it('publishCertificateAsNews publishes a signed claim with the cert hash as source', async () => {
    await service.castVote({ factId: 'fact_9', voter: 'kai', vote: 'validate' });
    await service.castVote({ factId: 'fact_9', voter: 'zip', vote: 'validate' });
    await service.castVote({ factId: 'fact_9', voter: 'fill', vote: 'validate' });
    const cert = service.buildFor('fact_9')!;

    const news = new NewsService(makeOfflineClient());
    const item = await publishCertificateAsNews(news, cert);
    expect(item.claimedFact).toContain('fact_9');
    expect(item.claimedFact).toContain('confirmed');
    expect(item.source).toBe(`vote-certificate:${cert.certHash}`);
    expect(item.status).toBe('unverified'); // instant publish, anchors later
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────────────────────────────────────

describe('Vote Certificate REST API', () => {
  let client: LightRAGClient;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    const service = new VoteCertificateService(client);
    const news = new NewsService(makeOfflineClient());
    app = express();
    app.use(express.json());
    registerVoteCertRoutes(app, service, { news });
  });

  afterEach(async () => { await client.close(); });

  it('POST /api/votes/sign signs and stores a vote', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/votes/sign', {
      factId: 'fact_1', voter: 'kai', vote: 'validate',
    });
    expect(status).toBe(201);
    expect(body.vote.signature).toBeTruthy();
  });

  it('POST /api/votes/sign rejects a bad vote choice', async () => {
    const { status } = await callRoute(app, 'post', '/api/votes/sign', {
      factId: 'fact_1', voter: 'kai', vote: 'maybe',
    });
    expect(status).toBe(400);
  });

  it('GET /api/votes/:factId lists signed votes', async () => {
    await callRoute(app, 'post', '/api/votes/sign', { factId: 'fact_1', voter: 'kai', vote: 'validate' });
    const { body } = await callRoute(app, 'get', '/api/votes/fact_1');
    expect(body.count).toBe(1);
  });

  it('POST /api/votes/:factId/certificate builds, verifies and publishes news', async () => {
    for (const voter of ['kai', 'zip', 'fill']) {
      await callRoute(app, 'post', '/api/votes/sign', { factId: 'fact_1', voter, vote: 'validate' });
    }
    const { status, body } = await callRoute(app, 'post', '/api/votes/fact_1/certificate');
    expect(status).toBe(201);
    expect(body.certificate.result).toBe('confirmed');
    expect(body.verification.valid).toBe(true);
    expect(body.news.claimedFact).toContain('confirmed');
  });

  it('POST certificate returns 404 without votes', async () => {
    const { status } = await callRoute(app, 'post', '/api/votes/fact_unknown/certificate');
    expect(status).toBe(404);
  });
});

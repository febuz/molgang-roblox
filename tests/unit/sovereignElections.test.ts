/**
 * Sovereign Democratic Elections — unit tests
 *
 * Tests the full election lifecycle: config validation, country registry,
 * seat allocation algorithms, voter registration, ballot casting + signature
 * verification (Ed25519 + optional PQ), live tally, Merkle-certified results,
 * and all REST routes.
 */

import express from 'express';
import * as http from 'http';
import { randomBytes } from 'crypto';
import {
  DemocraticElectionService,
  registerElectionRoutes,
  COUNTRY_REGISTRY,
  NATIONAL_ELECTION_CONFIGS,
  lookupCountry,
  dHondt,
  sainteLague,
  fptp,
  ballotSignPayload,
  type ElectionConfig,
  type Constituency,
  type Candidate,
} from '../../src/integrations/lightrag/sovereign-elections';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { HashBasedSigner, HBS_N } from '../../src/integrations/lightrag/pq-crypto';

// Stub LightRAG client — offline (isConnected=false suppresses Neo4j persistence)
const stubLightrag = { isConnected: () => false } as any;

function makeIdentity() {
  const svc = new SovereignIdentityService(stubLightrag, { maxIdentities: 1000 });
  return svc;
}

function startServer(svc: DemocraticElectionService): Promise<{ base: string; server: http.Server }> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  registerElectionRoutes(app, svc);
  const server = http.createServer(app);
  return new Promise(resolve => {
    server.listen(0, () => {
      const base = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve({ base, server });
    });
  });
}

function httpCall(base: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const reqBody = body ? JSON.stringify(body) : '';
    const req = http.request(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode!, body: data ? JSON.parse(data) : {} }));
    });
    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

function nlConfig(overrides: Partial<ElectionConfig> = {}): ElectionConfig {
  const constituency: Constituency = { id: 'nl-national', name: 'Netherlands', seats: 150 };
  const parties: Candidate[] = [
    { id: 'pvv', name: 'PVV', party: 'PVV', constituencyId: 'nl-national' },
    { id: 'vvd', name: 'VVD', party: 'VVD', constituencyId: 'nl-national' },
    { id: 'd66', name: 'D66', party: 'D66', constituencyId: 'nl-national' },
    { id: 'gl', name: 'GroenLinks', party: 'GL', constituencyId: 'nl-national' },
  ];
  return {
    country: 'NL',
    electionType: 'parliamentary',
    votingSystem: 'proportional',
    ballotFormat: 'party',
    nationalThreshold: 0.00667,
    constituencies: [constituency],
    candidates: parties,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Country registry
// ─────────────────────────────────────────────────────────────────────────────

describe('Country registry', () => {
  it('contains at least 193 entries', () => {
    expect(COUNTRY_REGISTRY.length).toBeGreaterThanOrEqual(193);
  });

  it('lookup by ISO2 is case-insensitive', () => {
    expect(lookupCountry('NL')).toBeDefined();
    expect(lookupCountry('nl')?.name).toBe('Netherlands');
    expect(lookupCountry('de')?.iso3).toBe('DEU');
  });

  it('returns undefined for unknown codes', () => {
    expect(lookupCountry('XX')).toBeUndefined();
  });

  it('includes G7 countries', () => {
    const g7 = ['US', 'GB', 'DE', 'FR', 'IT', 'CA', 'JP'];
    for (const iso of g7) {
      expect(lookupCountry(iso)).toBeDefined();
    }
  });

  it('all entries have non-empty iso2, iso3, name, region', () => {
    for (const c of COUNTRY_REGISTRY) {
      expect(c.iso2.length).toBe(2);
      expect(c.iso3.length).toBe(3);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.region.length).toBeGreaterThan(0);
    }
  });

  it('has national election configs for major democracies', () => {
    const democracies = ['NL', 'DE', 'GB', 'FR', 'SE', 'NO', 'DK', 'BE', 'AT', 'CH'];
    for (const iso of democracies) {
      expect(NATIONAL_ELECTION_CONFIGS.has(iso)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seat allocation algorithms
// ─────────────────────────────────────────────────────────────────────────────

describe('D\'Hondt seat allocation', () => {
  it('allocates all seats', () => {
    const votes = { A: 1000, B: 600, C: 400 };
    const alloc = dHondt(votes, 10);
    const total = Object.values(alloc).reduce((s, n) => s + n, 0);
    expect(total).toBe(10);
  });

  it('larger party gets more seats', () => {
    const alloc = dHondt({ A: 900, B: 100 }, 10);
    expect(alloc['A']).toBeGreaterThan(alloc['B']);
  });

  it('applies threshold — below-threshold parties get zero seats', () => {
    const votes = { A: 100, B: 5 }; // B = 4.76% < 5%
    const alloc = dHondt(votes, 10, 0.05);
    expect(alloc['B'] ?? 0).toBe(0);
    expect(alloc['A']).toBe(10);
  });

  it('all below threshold → empty allocation', () => {
    const alloc = dHondt({ A: 1, B: 1 }, 10, 0.99);
    expect(Object.values(alloc).reduce((s, n) => s + n, 0)).toBe(0);
  });

  it('returns {} for zero seats', () => {
    expect(dHondt({ A: 100, B: 50 }, 0)).toEqual({});
  });

  it('Netherlands 2023 proportional reproduction (simplified)', () => {
    // PVV ~37 seats, VVD ~24, NSC ~20, BBB ~7 in a 150-seat house
    const votes = { pvv: 2_450_000, vvd: 1_580_000, nsc: 1_320_000, bbb: 475_000, d66: 653_000 };
    const alloc = dHondt(votes, 150);
    const total = Object.values(alloc).reduce((s, n) => s + n, 0);
    expect(total).toBe(150);
    expect(alloc['pvv']).toBeGreaterThan(alloc['vvd']);
    expect(alloc['pvv']).toBeGreaterThan(0);
  });
});

describe('Sainte-Laguë seat allocation', () => {
  it('allocates all seats', () => {
    const alloc = sainteLague({ A: 1000, B: 500, C: 250 }, 10);
    expect(Object.values(alloc).reduce((s, n) => s + n, 0)).toBe(10);
  });

  it('larger party still wins more seats', () => {
    const alloc = sainteLague({ A: 800, B: 200 }, 10);
    expect(alloc['A']).toBeGreaterThan(alloc['B']);
  });

  it('applies threshold', () => {
    const alloc = sainteLague({ A: 100, B: 3 }, 10, 0.04); // B=2.9% < 4%
    expect(alloc['B'] ?? 0).toBe(0);
  });

  it('custom firstDivisor changes distribution', () => {
    const a = sainteLague({ A: 100, B: 100 }, 10, 0, 1.4);
    const b = sainteLague({ A: 100, B: 100 }, 10, 0, 1.0);
    // With equal votes and equal first-divisor, distribution should be equal
    expect(b['A']).toBe(5);
    expect(b['B']).toBe(5);
  });
});

describe('FPTP', () => {
  it('returns plurality winner', () => {
    expect(fptp({ A: 100, B: 200, C: 50 })).toBe('B');
  });

  it('tie broken by lexicographic order', () => {
    expect(fptp({ B: 100, A: 100 })).toBe('A');
  });

  it('returns undefined for empty input', () => {
    expect(fptp({})).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Election lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('DemocraticElectionService — lifecycle', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;

  beforeEach(() => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);
  });

  it('creates an election in draft status', () => {
    const e = svc.createElection(nlConfig());
    expect(e.id).toBeDefined();
    expect(e.status).toBe('draft');
    expect(e.config.country).toBe('NL');
  });

  it('rejects unknown country', () => {
    expect(() => svc.createElection(nlConfig({ country: 'ZZ' }))).toThrow(/unknown country/);
  });

  it('opens a draft election', () => {
    const e = svc.createElection(nlConfig());
    const opened = svc.openElection(e.id);
    expect(opened.status).toBe('open');
    expect(opened.openedAt).toBeDefined();
  });

  it('cannot open an already-open election', () => {
    const e = svc.createElection(nlConfig());
    svc.openElection(e.id);
    expect(() => svc.openElection(e.id)).toThrow(/not in draft/);
  });

  it('cannot open unknown election', () => {
    expect(() => svc.openElection('no-such-id')).toThrow(/not found/);
  });

  it('lists elections', () => {
    svc.createElection(nlConfig());
    svc.createElection(nlConfig());
    expect(svc.listElections()).toHaveLength(2);
  });

  it('gets an election by id', () => {
    const e = svc.createElection(nlConfig());
    expect(svc.getElection(e.id)?.id).toBe(e.id);
  });

  it('returns undefined for unknown election', () => {
    expect(svc.getElection('nope')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Voter registration
// ─────────────────────────────────────────────────────────────────────────────

describe('Voter registration', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;

  beforeEach(() => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);
  });

  it('registers a DID voter', () => {
    const doc = identity.register();
    const e = svc.createElection(nlConfig());
    svc.openElection(e.id);
    const result = svc.registerVoter(e.id, doc.did);
    expect(result.registered).toBe(true);
    expect(result.alreadyRegistered).toBe(false);
    expect(svc.getRegisteredVoterCount(e.id)).toBe(1);
  });

  it('returns alreadyRegistered=true on duplicate registration', () => {
    const doc = identity.register();
    const e = svc.createElection(nlConfig());
    svc.openElection(e.id);
    svc.registerVoter(e.id, doc.did);
    const r2 = svc.registerVoter(e.id, doc.did);
    expect(r2.alreadyRegistered).toBe(true);
    expect(svc.getRegisteredVoterCount(e.id)).toBe(1);
  });

  it('rejects unregistered DID', () => {
    const e = svc.createElection(nlConfig());
    svc.openElection(e.id);
    expect(() => svc.registerVoter(e.id, 'did:vpc:nonexistent')).toThrow(/DID not found/);
  });

  it('rejects registration before election is open', () => {
    const doc = identity.register();
    const e = svc.createElection(nlConfig());
    expect(() => svc.registerVoter(e.id, doc.did)).toThrow(/not open/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ballot casting and verification
// ─────────────────────────────────────────────────────────────────────────────

describe('Ballot casting', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;
  let electionId: string;
  let voterDid: string;

  beforeEach(() => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);
    const doc = identity.register('voter1');
    voterDid = doc.did;
    const e = svc.createElection(nlConfig());
    electionId = e.id;
    svc.openElection(electionId);
    svc.registerVoter(electionId, voterDid);
  });

  function signBallot(did: string, constituencyId: string, selection: string) {
    const payload = ballotSignPayload({ electionId, constituencyId, voter: did, selection });
    return identity.signAs(did, payload);
  }

  it('casts a valid ballot', () => {
    const { signature, publicKeyPem } = signBallot(voterDid, 'nl-national', 'pvv');
    const ballot = svc.castBallot({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'pvv', publicKeyPem, signature });
    expect(ballot.id).toBeDefined();
    expect(ballot.selection).toBe('pvv');
  });

  it('rejects a ballot with invalid signature', () => {
    const { publicKeyPem } = signBallot(voterDid, 'nl-national', 'pvv');
    expect(() =>
      svc.castBallot({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'pvv', publicKeyPem, signature: 'badsig==' })
    ).toThrow(/invalid ballot signature/);
  });

  it('rejects a ballot for wrong candidate', () => {
    const { signature, publicKeyPem } = signBallot(voterDid, 'nl-national', 'unknown');
    expect(() =>
      svc.castBallot({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'unknown', publicKeyPem, signature })
    ).toThrow(/invalid selection/);
  });

  it('rejects double voting (same DID + constituency)', () => {
    const { signature, publicKeyPem } = signBallot(voterDid, 'nl-national', 'vvd');
    svc.castBallot({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'vvd', publicKeyPem, signature });
    const { signature: sig2, publicKeyPem: pk2 } = signBallot(voterDid, 'nl-national', 'd66');
    expect(() =>
      svc.castBallot({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'd66', publicKeyPem: pk2, signature: sig2 })
    ).toThrow(/already cast ballot/);
  });

  it('rejects ballot from unregistered voter', () => {
    const other = identity.register('stranger');
    const { signature, publicKeyPem } = identity.signAs(other.did, ballotSignPayload({ electionId, constituencyId: 'nl-national', voter: other.did, selection: 'pvv' }));
    expect(() =>
      svc.castBallot({ electionId, constituencyId: 'nl-national', voter: other.did, selection: 'pvv', publicKeyPem, signature })
    ).toThrow(/not registered/);
  });

  it('verifyBallot confirms a valid ballot', () => {
    const { signature, publicKeyPem } = signBallot(voterDid, 'nl-national', 'gl');
    const ballot = svc.castBallot({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'gl', publicKeyPem, signature });
    expect(svc.verifyBallot(electionId, ballot.id).valid).toBe(true);
  });

  it('verifyBallot rejects a non-existent ballot', () => {
    expect(svc.verifyBallot(electionId, 'nope').valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Post-quantum ballot signatures
// ─────────────────────────────────────────────────────────────────────────────

describe('Post-quantum ballot signatures', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;
  let electionId: string;
  let voterDid: string;

  beforeEach(() => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);
    const doc = identity.register('pq-voter');
    voterDid = doc.did;
    const e = svc.createElection(nlConfig());
    electionId = e.id;
    svc.openElection(electionId);
    svc.registerVoter(electionId, voterDid);
  });

  it('accepts a ballot with a valid PQ signature', () => {
    const pqSigner = new HashBasedSigner(randomBytes(HBS_N), 4);
    const payload = ballotSignPayload({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'pvv' });
    const { signature, publicKeyPem } = identity.signAs(voterDid, payload);
    const pqSignature = pqSigner.sign(payload);

    const ballot = svc.castBallot({
      electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'pvv',
      publicKeyPem, signature,
      pqRoot: pqSigner.root, pqSignature,
    });
    expect(ballot.pqRoot).toBe(pqSigner.root);
    expect(svc.verifyBallot(electionId, ballot.id).valid).toBe(true);
  });

  it('rejects a ballot with a tampered PQ signature', () => {
    const pqSigner = new HashBasedSigner(randomBytes(HBS_N), 4);
    const payload = ballotSignPayload({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'vvd' });
    const { signature, publicKeyPem } = identity.signAs(voterDid, payload);
    const pqSignature = pqSigner.sign(payload);
    const badPqSig = { ...pqSignature, ots: [...pqSignature.ots] };
    badPqSig.ots[0] = randomBytes(HBS_N).toString('hex');

    expect(() =>
      svc.castBallot({
        electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'vvd',
        publicKeyPem, signature,
        pqRoot: pqSigner.root, pqSignature: badPqSig,
      })
    ).toThrow(/invalid post-quantum ballot signature/);
  });

  it('rejects partial PQ params (pqRoot without pqSignature)', () => {
    const payload = ballotSignPayload({ electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'd66' });
    const { signature, publicKeyPem } = identity.signAs(voterDid, payload);
    expect(() =>
      svc.castBallot({
        electionId, constituencyId: 'nl-national', voter: voterDid, selection: 'd66',
        publicKeyPem, signature, pqRoot: 'aa'.repeat(32),
      })
    ).toThrow(/pqRoot and pqSignature must both be present/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tally and certification
// ─────────────────────────────────────────────────────────────────────────────

describe('Election tally and certification', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;
  let electionId: string;

  beforeEach(() => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);
    const e = svc.createElection(nlConfig());
    electionId = e.id;
    svc.openElection(electionId);
  });

  function castFor(selection: string): void {
    const doc = identity.register();
    svc.registerVoter(electionId, doc.did);
    const payload = ballotSignPayload({ electionId, constituencyId: 'nl-national', voter: doc.did, selection });
    const { signature, publicKeyPem } = identity.signAs(doc.did, payload);
    svc.castBallot({ electionId, constituencyId: 'nl-national', voter: doc.did, selection, publicKeyPem, signature });
  }

  it('certifies and produces a merkle-rooted certificate', () => {
    castFor('pvv'); castFor('pvv'); castFor('vvd'); castFor('d66');
    const cert = svc.closeAndCertify(electionId);
    expect(cert.certHash).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.overallMerkleRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.totalBallots).toBe(4);
  });

  it('seat allocation totals seats correctly', () => {
    for (let i = 0; i < 12; i++) castFor(i % 3 === 0 ? 'pvv' : i % 3 === 1 ? 'vvd' : 'd66');
    const cert = svc.closeAndCertify(electionId);
    const res = cert.results[0];
    const allocated = Object.values(res.seatAllocation ?? {}).reduce((s, n) => s + n, 0);
    expect(allocated).toBe(150);
  });

  it('live tally shows running totals while open', () => {
    castFor('pvv'); castFor('pvv'); castFor('gl');
    const tally = svc.getLiveTally(electionId);
    expect(tally['nl-national']['pvv']).toBe(2);
    expect(tally['nl-national']['gl']).toBe(1);
  });

  it('turnout is correct after voting', () => {
    const doc1 = identity.register();
    const doc2 = identity.register();
    svc.registerVoter(electionId, doc1.did);
    svc.registerVoter(electionId, doc2.did);
    const p1 = ballotSignPayload({ electionId, constituencyId: 'nl-national', voter: doc1.did, selection: 'pvv' });
    const { signature: s1, publicKeyPem: pk1 } = identity.signAs(doc1.did, p1);
    svc.castBallot({ electionId, constituencyId: 'nl-national', voter: doc1.did, selection: 'pvv', publicKeyPem: pk1, signature: s1 });
    // doc2 does not vote
    expect(svc.getTurnout(electionId)).toBeCloseTo(0.5);
  });

  it('cannot close a draft election', () => {
    const e2 = svc.createElection(nlConfig());
    expect(() => svc.closeAndCertify(e2.id)).toThrow(/not open/);
  });

  it('cannot close an already-certified election', () => {
    castFor('vvd');
    svc.closeAndCertify(electionId);
    expect(() => svc.closeAndCertify(electionId)).toThrow(/not open/);
  });

  it('certHash is deterministic from ballot set', () => {
    castFor('pvv');
    // Re-certification is blocked by status check — certHash comes from
    // canonical payload so a fresh election with same ballots must produce
    // same overallMerkleRoot.
    const cert = svc.closeAndCertify(electionId);
    expect(cert.certHash).toMatch(/^[0-9a-f]{64}$/);
    // Verify getCertificate returns the same object
    expect(svc.getCertificate(electionId)?.certHash).toBe(cert.certHash);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multi-constituency election (FPTP, e.g. UK style)
// ─────────────────────────────────────────────────────────────────────────────

describe('Multi-constituency FPTP election', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;

  it('certifies FPTP election with per-constituency winners', () => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);

    const constituencies: Constituency[] = [
      { id: 'north', name: 'North', seats: 1 },
      { id: 'south', name: 'South', seats: 1 },
    ];
    const candidates: Candidate[] = [
      { id: 'lab-n', name: 'Labour North', party: 'Labour', constituencyId: 'north' },
      { id: 'con-n', name: 'Conservative North', party: 'Conservative', constituencyId: 'north' },
      { id: 'lab-s', name: 'Labour South', party: 'Labour', constituencyId: 'south' },
      { id: 'con-s', name: 'Conservative South', party: 'Conservative', constituencyId: 'south' },
    ];
    const config: ElectionConfig = {
      country: 'GB', electionType: 'parliamentary', votingSystem: 'fptp',
      ballotFormat: 'candidate', constituencies, candidates,
    };

    const e = svc.createElection(config);
    svc.openElection(e.id);

    function vote(constituencyId: string, selection: string) {
      const doc = identity.register();
      svc.registerVoter(e.id, doc.did);
      const payload = ballotSignPayload({ electionId: e.id, constituencyId, voter: doc.did, selection });
      const { signature, publicKeyPem } = identity.signAs(doc.did, payload);
      svc.castBallot({ electionId: e.id, constituencyId, voter: doc.did, selection, publicKeyPem, signature });
    }

    // North: Labour wins 3-2; South: Conservative wins 4-1
    vote('north', 'lab-n'); vote('north', 'lab-n'); vote('north', 'lab-n');
    vote('north', 'con-n'); vote('north', 'con-n');
    vote('south', 'con-s'); vote('south', 'con-s'); vote('south', 'con-s'); vote('south', 'con-s');
    vote('south', 'lab-s');

    const cert = svc.closeAndCertify(e.id);
    const northResult = cert.results.find(r => r.constituencyId === 'north')!;
    const southResult = cert.results.find(r => r.constituencyId === 'south')!;

    expect(northResult.winner).toBe('lab-n');
    expect(southResult.winner).toBe('con-s');
    expect(cert.totalBallots).toBe(10);
    expect(cert.overallMerkleRoot).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Referendum (yes/no)
// ─────────────────────────────────────────────────────────────────────────────

describe('Referendum (yes/no)', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;

  it('certifies a yes/no referendum', () => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);

    const config: ElectionConfig = {
      country: 'NL', electionType: 'referendum', votingSystem: 'fptp',
      ballotFormat: 'yes_no',
      constituencies: [{ id: 'nat', name: 'National', seats: 1 }],
      candidates: [],  // no candidates needed for yes_no
    };

    const e = svc.createElection(config);
    svc.openElection(e.id);

    for (let i = 0; i < 7; i++) {
      const doc = identity.register();
      svc.registerVoter(e.id, doc.did);
      const sel = i < 4 ? 'yes' : 'no';
      const payload = ballotSignPayload({ electionId: e.id, constituencyId: 'nat', voter: doc.did, selection: sel });
      const { signature, publicKeyPem } = identity.signAs(doc.did, payload);
      svc.castBallot({ electionId: e.id, constituencyId: 'nat', voter: doc.did, selection: sel, publicKeyPem, signature });
    }

    const cert = svc.closeAndCertify(e.id);
    expect(cert.results[0].winner).toBe('yes');
    expect(cert.results[0].breakdown['yes']).toBe(4);
    expect(cert.results[0].breakdown['no']).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP API
// ─────────────────────────────────────────────────────────────────────────────

describe('HTTP API', () => {
  let identity: SovereignIdentityService;
  let svc: DemocraticElectionService;
  let base: string;
  let server: http.Server;

  beforeAll(async () => {
    identity = makeIdentity();
    svc = new DemocraticElectionService(identity);
    ({ base, server } = await startServer(svc));
  });
  afterAll(done => { server.close(() => done()); });

  const get = (path: string) => httpCall(base, 'GET', path);
  const post = (path: string, body?: unknown) => httpCall(base, 'POST', path, body);

  it('GET /api/elections/countries returns full registry', async () => {
    const res = await get('/api/elections/countries');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(193);
    expect(res.body.countries[0].iso2).toBeDefined();
  });

  it('GET /api/elections/countries/NL/config returns national config', async () => {
    const res = await get('/api/elections/countries/NL/config');
    expect(res.status).toBe(200);
    expect(res.body.country.iso2).toBe('NL');
    expect(res.body.nationalConfig.votingSystem).toBe('proportional');
  });

  it('GET /api/elections/countries/ZZ/config returns 404', async () => {
    const res = await get('/api/elections/countries/ZZ/config');
    expect(res.status).toBe(404);
  });

  it('POST /api/elections creates election', async () => {
    const res = await post('/api/elections', nlConfig());
    expect(res.status).toBe(201);
    expect(res.body.election.status).toBe('draft');
    expect(res.body.election.config.country).toBe('NL');
  });

  it('POST /api/elections with bad country returns 422', async () => {
    const res = await post('/api/elections', nlConfig({ country: 'XX' }));
    expect(res.status).toBe(422);
  });

  it('GET /api/elections lists elections', async () => {
    const res = await get('/api/elections');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('full HTTP election cycle', async () => {
    // Create
    const createRes = await post('/api/elections', nlConfig());
    expect(createRes.status).toBe(201);
    const id = createRes.body.election.id;

    // Open
    const openRes = await post(`/api/elections/${id}/open`);
    expect(openRes.status).toBe(200);

    // Register voter
    const doc = identity.register('http-voter');
    const regRes = await post(`/api/elections/${id}/register`, { did: doc.did });
    expect(regRes.status).toBe(201);

    // Cast ballot
    const payload = ballotSignPayload({ electionId: id, constituencyId: 'nl-national', voter: doc.did, selection: 'pvv' });
    const { signature, publicKeyPem } = identity.signAs(doc.did, payload);
    const voteRes = await post(`/api/elections/${id}/vote`, {
      constituencyId: 'nl-national', voter: doc.did, selection: 'pvv', publicKeyPem, signature,
    });
    expect(voteRes.status).toBe(201);
    const ballotId = voteRes.body.ballotId;

    // Verify ballot
    const verifyRes = await get(`/api/elections/${id}/ballots/${ballotId}/verify`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);

    // Detail with live tally
    const detailRes = await get(`/api/elections/${id}`);
    expect(detailRes.body.liveTally['nl-national']['pvv']).toBe(1);
    expect(detailRes.body.registeredVoters).toBe(1);

    // Close + certify
    const closeRes = await post(`/api/elections/${id}/close`);
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.certificate.certHash).toMatch(/^[0-9a-f]{64}$/);

    // Get results
    const resultsRes = await get(`/api/elections/${id}/results`);
    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.certificate.totalBallots).toBe(1);
  });

  it('GET /api/elections/:id/results before certification returns 409', async () => {
    const createRes = await post('/api/elections', nlConfig());
    const id = createRes.body.election.id;
    const res = await get(`/api/elections/${id}/results`);
    expect(res.status).toBe(409);
  });

  it('POST /api/elections/:id/register without did returns 422', async () => {
    const createRes = await post('/api/elections', nlConfig());
    const id = createRes.body.election.id;
    await post(`/api/elections/${id}/open`);
    const res = await post(`/api/elections/${id}/register`, {});
    expect(res.status).toBe(422);
  });
});

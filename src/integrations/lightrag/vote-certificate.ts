/**
 * Vote Certificates — "Stem resultaat als nieuws"
 *
 * Turns a FactValidator quorum result into a verifiable certificate that is
 * published as a news claim. Per the whitepaper, every voter signs the same
 * round message:
 *
 *   R = H( graph-state-root ‖ fact-id ‖ round ‖ vote )
 *
 * and the certificate aggregates those signatures. The target construction
 * is BLS12-381 aggregation (σ = Σ σ_i → one 96-byte signature, one pairing
 * check). No BLS library is available in-repo, so this module ships an
 * Ed25519 multi-signature certificate with the SAME interface and a
 * `scheme` discriminator — BLS can drop in later without changing callers:
 *
 *   scheme: 'ed25519-multisig-v1'  → votes[] each carry their own signature
 *   scheme: 'bls12-381-v1'         → reserved: one aggregate signature
 *
 * Why signed votes matter: FactValidator accepts plain voter strings, so any
 * peer can impersonate any voter. A certificate only counts votes whose
 * signature verifies against the voter's published key.
 *
 * REST (registerVoteCertRoutes):
 *   POST /api/votes/sign                  — sign + store a vote for a fact
 *   GET  /api/votes/:factId               — list signed votes for a fact
 *   POST /api/votes/:factId/certificate   — build certificate, publish as news
 */

import { generateKeyPairSync, sign as edSign, verify as edVerify, createPublicKey, KeyObject } from 'crypto';
import type { Express, Request, Response } from 'express';
import { canonicalize, sha256 } from './graph-state-root';
import { computeGraphStateRoot } from './graph-state-root';
import type { LightRAGClient } from './client';
import type { NewsService, NewsItem } from './news';
import type { FactValidator } from './fact-validator';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type VoteChoice = 'validate' | 'challenge';
export type CertScheme = 'ed25519-multisig-v1' | 'bls12-381-v1';

export interface SignedVote {
  factId: string;
  voter: string;                  // agent id
  vote: VoteChoice;
  round: number;                  // voting round (0 unless re-voted)
  graphRoot: string;              // graph state root the voter saw
  ts: string;                     // ISO timestamp of signing
  publicKeyPem: string;           // voter's Ed25519 public key
  signature: string;              // base64 over voteMessage(...)
}

export interface VoteCertificate {
  factId: string;
  round: number;
  result: 'confirmed' | 'rejected' | 'contested';
  graphRoot: string;
  scheme: CertScheme;
  votes: SignedVote[];            // ed25519-multisig-v1: individual signatures
  aggregateSignature?: string;    // bls12-381-v1: reserved (96-byte σ = Σ σ_i)
  validateCount: number;
  challengeCount: number;
  quorum: number;
  createdAt: string;
  certHash: string;               // sha256 over the canonical certificate body
}

// ──────────────────────────────────────────────────────────────────────────────
// Keyring — per-agent Ed25519 identities on this node
// ──────────────────────────────────────────────────────────────────────────────

export class AgentKeyring {
  private keys = new Map<string, { publicKeyPem: string; privateKey: KeyObject }>();

  /** Get or lazily create the Ed25519 keypair for a local agent. */
  getOrCreate(agent: string): { publicKeyPem: string; privateKey: KeyObject } {
    let kp = this.keys.get(agent);
    if (!kp) {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519');
      kp = { publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(), privateKey };
      this.keys.set(agent, kp);
    }
    return kp;
  }

  has(agent: string): boolean {
    return this.keys.has(agent);
  }

  agents(): string[] {
    return Array.from(this.keys.keys());
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Vote signing
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The whitepaper round message R — every voter signs exactly these bytes.
 * ts/publicKeyPem are NOT part of R: two voters signing the same round
 * produce signatures over the identical message (required for BLS later).
 */
export function voteMessage(v: Pick<SignedVote, 'factId' | 'voter' | 'vote' | 'round' | 'graphRoot'>): string {
  return canonicalize({
    factId: v.factId,
    voter: v.voter,
    vote: v.vote,
    round: v.round,
    graphRoot: v.graphRoot,
  });
}

/** Sign a vote with the agent's key from the keyring. */
export function signVote(
  keyring: AgentKeyring,
  params: { factId: string; voter: string; vote: VoteChoice; round?: number; graphRoot: string },
): SignedVote {
  const kp = keyring.getOrCreate(params.voter);
  const round = params.round ?? 0;
  const unsigned = {
    factId: params.factId,
    voter: params.voter,
    vote: params.vote,
    round,
    graphRoot: params.graphRoot,
  };
  const signature = edSign(null, Buffer.from(voteMessage(unsigned), 'utf8'), kp.privateKey).toString('base64');
  return {
    ...unsigned,
    ts: new Date().toISOString(),
    publicKeyPem: kp.publicKeyPem,
    signature,
  };
}

/** Verify one signed vote against its embedded public key. */
export function verifyVote(v: SignedVote): boolean {
  try {
    const publicKey = createPublicKey(v.publicKeyPem);
    return edVerify(null, Buffer.from(voteMessage(v), 'utf8'), publicKey, Buffer.from(v.signature, 'base64'));
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Certificate building / verification
// ──────────────────────────────────────────────────────────────────────────────

export const CERT_QUORUM = 3;

/**
 * Build a certificate from signed votes for one fact+round.
 * Invalid signatures, duplicate voters and round/fact mismatches are dropped
 * (never trusted). Result follows the FactValidator thresholds:
 * confirmed at >= quorum validates, rejected at >= 5 challenges,
 * contested otherwise.
 */
export function buildCertificate(params: {
  factId: string;
  round?: number;
  graphRoot: string;
  votes: SignedVote[];
  quorum?: number;
}): VoteCertificate {
  const round = params.round ?? 0;
  const quorum = params.quorum ?? CERT_QUORUM;

  const seen = new Set<string>();
  const valid = params.votes.filter(v => {
    if (v.factId !== params.factId || v.round !== round) return false;
    if (v.graphRoot !== params.graphRoot) return false;
    if (seen.has(v.voter)) return false;
    if (!verifyVote(v)) return false;
    seen.add(v.voter);
    return true;
  });

  const validateCount = valid.filter(v => v.vote === 'validate').length;
  const challengeCount = valid.filter(v => v.vote === 'challenge').length;

  let result: VoteCertificate['result'];
  if (validateCount >= quorum && validateCount > challengeCount) {
    result = 'confirmed';
  } else if (challengeCount >= 5) {
    result = 'rejected';
  } else {
    result = 'contested';
  }

  const body = {
    factId: params.factId,
    round,
    result,
    graphRoot: params.graphRoot,
    scheme: 'ed25519-multisig-v1' as CertScheme,
    votes: valid,
    validateCount,
    challengeCount,
    quorum,
    createdAt: new Date().toISOString(),
  };

  return { ...body, certHash: sha256(canonicalize(body)) };
}

/**
 * Full certificate verification: hash integrity, every signature, voter
 * uniqueness, counts, and that the claimed result matches the votes.
 */
export function verifyCertificate(cert: VoteCertificate): { valid: boolean; reason?: string } {
  const { certHash, ...body } = cert;
  if (sha256(canonicalize(body)) !== certHash) {
    return { valid: false, reason: 'certHash mismatch' };
  }
  if (cert.scheme !== 'ed25519-multisig-v1') {
    return { valid: false, reason: `unsupported scheme ${cert.scheme}` };
  }
  const seen = new Set<string>();
  for (const v of cert.votes) {
    if (v.factId !== cert.factId || v.round !== cert.round || v.graphRoot !== cert.graphRoot) {
      return { valid: false, reason: `vote scope mismatch for ${v.voter}` };
    }
    if (seen.has(v.voter)) return { valid: false, reason: `duplicate voter ${v.voter}` };
    seen.add(v.voter);
    if (!verifyVote(v)) return { valid: false, reason: `bad signature from ${v.voter}` };
  }
  const validateCount = cert.votes.filter(v => v.vote === 'validate').length;
  const challengeCount = cert.votes.filter(v => v.vote === 'challenge').length;
  if (validateCount !== cert.validateCount || challengeCount !== cert.challengeCount) {
    return { valid: false, reason: 'vote counts do not match votes' };
  }
  const expected: VoteCertificate['result'] =
    validateCount >= cert.quorum && validateCount > challengeCount ? 'confirmed'
      : challengeCount >= 5 ? 'rejected'
      : 'contested';
  if (expected !== cert.result) {
    return { valid: false, reason: `result ${cert.result} does not follow from votes (expected ${expected})` };
  }
  return { valid: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// "Stem resultaat als nieuws" — publish a certificate as a news claim
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Publish the certificate outcome as a signed news claim. The claimed fact
 * is the vote RESULT; the certificate hash travels in the source field so
 * peers can fetch and re-verify the full certificate.
 */
export async function publishCertificateAsNews(
  news: NewsService,
  cert: VoteCertificate,
): Promise<NewsItem> {
  return news.publish({
    claimedFact: `Fact ${cert.factId} ${cert.result} by vote (${cert.validateCount} validate / ${cert.challengeCount} challenge, quorum ${cert.quorum})`,
    source: `vote-certificate:${cert.certHash}`,
    claimer: 'fact-validator',
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Vote registry + REST routes
// ──────────────────────────────────────────────────────────────────────────────

export class VoteCertificateService {
  private lightrag: LightRAGClient;
  private keyring: AgentKeyring;
  private votesByFact = new Map<string, SignedVote[]>();
  private certificates = new Map<string, VoteCertificate>();

  constructor(lightrag: LightRAGClient, keyring = new AgentKeyring()) {
    this.lightrag = lightrag;
    this.keyring = keyring;
  }

  getKeyring(): AgentKeyring {
    return this.keyring;
  }

  /** Sign a vote with this node's key for the agent and store it. */
  async castVote(params: { factId: string; voter: string; vote: VoteChoice; round?: number }): Promise<SignedVote> {
    const stateRoot = await computeGraphStateRoot(this.lightrag);
    const signed = signVote(this.keyring, { ...params, graphRoot: stateRoot.root });
    this.addVote(signed);
    return signed;
  }

  /** Store a signed vote (local or from a peer). Rejects invalid signatures. */
  addVote(v: SignedVote): boolean {
    if (!verifyVote(v)) {
      logger.warn(`vote-cert: rejected invalid signature from ${v.voter} on ${v.factId}`);
      return false;
    }
    const list = this.votesByFact.get(v.factId) ?? [];
    if (list.some(x => x.voter === v.voter && x.round === v.round)) return false; // duplicate
    list.push(v);
    this.votesByFact.set(v.factId, list);
    return true;
  }

  getVotes(factId: string): SignedVote[] {
    return this.votesByFact.get(factId) ?? [];
  }

  /**
   * Build (and cache) the certificate for a fact from its stored votes.
   * All votes must reference the same graph root — the root of the FIRST
   * stored vote wins; votes against other roots are dropped by the builder.
   */
  buildFor(factId: string, round = 0, quorum = CERT_QUORUM): VoteCertificate | null {
    const votes = this.getVotes(factId).filter(v => v.round === round);
    if (votes.length === 0) return null;
    const cert = buildCertificate({ factId, round, graphRoot: votes[0].graphRoot, votes, quorum });
    this.certificates.set(`${factId}:${round}`, cert);
    void this.persistCertificate(cert);
    return cert;
  }

  getCertificate(factId: string, round = 0): VoteCertificate | undefined {
    return this.certificates.get(`${factId}:${round}`);
  }

  private async persistCertificate(cert: VoteCertificate): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      const id = `cert_${cert.certHash.substring(0, 24)}`;
      await this.lightrag.mergeTypedNode(id, 'VoteCertificate', {
        fact_id: cert.factId,
        round: cert.round,
        result: cert.result,
        scheme: cert.scheme,
        graph_root: cert.graphRoot,
        validate_count: cert.validateCount,
        challenge_count: cert.challengeCount,
        quorum: cert.quorum,
        cert_hash: cert.certHash,
        voters: cert.votes.map(v => v.voter),
        created_at: cert.createdAt,
        content: `Vote certificate: fact ${cert.factId} ${cert.result} (${cert.validateCount}v/${cert.challengeCount}c)`,
      });
      await this.lightrag.addEdge(id, 'CERTIFIES', cert.factId, { result: cert.result });
    } catch (e: any) {
      logger.warn(`vote-cert persist: ${e.message}`);
    }
  }
}

export function registerVoteCertRoutes(
  app: Express,
  service: VoteCertificateService,
  opts: { factValidator?: FactValidator; news?: NewsService } = {},
): void {

  /** POST /api/votes/sign — sign + store a vote { factId, voter, vote, round? } */
  app.post('/api/votes/sign', async (req: Request, res: Response): Promise<void> => {
    const { factId, voter, vote, round } = req.body ?? {};
    if (!factId || !voter || (vote !== 'validate' && vote !== 'challenge')) {
      res.status(400).json({ success: false, error: 'factId, voter, vote(validate|challenge) required' }); return;
    }
    try {
      const signed = await service.castVote({ factId, voter, vote, round });
      // Mirror the vote into the (unsigned) FactValidator so both layers agree
      if (opts.factValidator) {
        const apply = vote === 'validate'
          ? opts.factValidator.validate(voter, factId)
          : opts.factValidator.challenge(voter, factId);
        await apply.catch(() => { /* fact may only exist remotely */ });
      }
      res.status(201).json({ success: true, vote: signed });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** GET /api/votes/:factId — signed votes for a fact */
  app.get('/api/votes/:factId', (req: Request, res: Response): void => {
    const votes = service.getVotes(req.params.factId);
    res.json({ success: true, count: votes.length, votes });
  });

  /** POST /api/votes/:factId/certificate — build + verify + publish as news */
  app.post('/api/votes/:factId/certificate', async (req: Request, res: Response): Promise<void> => {
    const round = Number(req.body?.round ?? 0);
    const cert = service.buildFor(req.params.factId, round);
    if (!cert) {
      res.status(404).json({ success: false, error: 'No signed votes for this fact' }); return;
    }
    const check = verifyCertificate(cert);
    let newsItem: NewsItem | undefined;
    if (check.valid && opts.news) {
      // Stem resultaat als nieuws
      newsItem = await publishCertificateAsNews(opts.news, cert).catch(() => undefined);
    }
    res.status(201).json({ success: true, certificate: cert, verification: check, news: newsItem ?? null });
  });

  logger.info('✓ Vote Certificate API registered (/api/votes/*)');
}

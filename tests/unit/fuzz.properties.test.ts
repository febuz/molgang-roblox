/**
 * Property-based fuzz tests — invariants that must hold for ALL inputs,
 * not just hand-picked examples.
 *
 * Uses a seeded mulberry32 PRNG so every run is deterministic and a failure
 * reproduces from its seed. Properties tested:
 *
 *   P1  Value conservation: Σ balances ≡ minted (bit-exact BigInt) after
 *       any random sequence of mints and transfers.
 *   P2  The supply cap is never exceeded under adversarial minting.
 *   P3  eraOf is monotone non-decreasing; the reward halves exactly at
 *       each era boundary.
 *   P4  Any single-field mutation of a signed transfer is rejected.
 *   P5  Any single-field mutation of an attention event breaks chain
 *       verification.
 *   P6  HLC timestamps are strictly monotone over random local/remote
 *       interleavings.
 *   P7  canonicalize() is invariant under object-key insertion order.
 *   P8  Merkle: leaf order is significant, and the CVE-2012-2459
 *       duplicate-leaf ambiguity exists in the raw algorithm — documented
 *       here, with the usage-level mitigations asserted (unique tx ids,
 *       block hash commits to the exact txIds array).
 *   P9  Ballot weights are server-derived: random submitted weights never
 *       influence the tally.
 *   P10 Identity documents survive random rotation sequences and reject
 *       random single-field tampering of any rotation.
 */

import {
  ValueChainService,
  Transfer,
  transferPayload,
  verifyTransfer,
  eraOf,
  scaledReward,
  tokensToUnits,
  SUPPLY_CAP_UNITS,
} from '../../src/integrations/lightrag/value-chain';
import { SovereignIdentityService, verifyIdentityDocument } from '../../src/integrations/lightrag/identity';
import { SovereignVotingService, Ballot, ballotPayload } from '../../src/integrations/lightrag/sovereign-voting';
import { AttentionChainService, AttentionEvent, verifyAgentChain, AttentionKind } from '../../src/integrations/lightrag/attention-chain';
import { hlcNow, hlcRecv, hlcCompare, HLC_ZERO, HLCTimestamp } from '../../src/integrations/lightrag/hlc';
import { canonicalize, sha256, buildMerkleRoot } from '../../src/integrations/lightrag/graph-state-root';
import { LightRAGClient } from '../../src/integrations/lightrag/client';

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

/** mulberry32 — small, fast, deterministic PRNG for reproducible fuzzing. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

// ──────────────────────────────────────────────────────────────────────────────
// P1 + P2 — value conservation and cap safety under random workloads
// ──────────────────────────────────────────────────────────────────────────────

describe('P1/P2: value-chain conservation under random mint/transfer sequences', () => {
  it.each([[42], [1337], [987654321]])('seed %d: Σ balances ≡ minted, cap never exceeded', async (seed) => {
    const rnd = mulberry32(seed);
    const client = makeOfflineClient();
    const identity = new SovereignIdentityService(client);
    const chain = new ValueChainService(client, { identity });
    const dids = Array.from({ length: 5 }, (_, i) => identity.register(`agent${i}`).did);

    for (let i = 0; i < 300; i++) {
      if (rnd() < 0.4) {
        chain.mintReward(pick(rnd, dids), 1 + Math.floor(rnd() * 100));
      } else {
        const from = pick(rnd, dids);
        const to = pick(rnd, dids.filter(d => d !== from));
        const balance = chain.getAccount(from).balance;
        if (balance > 0n) {
          // Random fraction of the balance, at least 1 unit
          const amount = 1n + (balance * BigInt(Math.floor(rnd() * 100))) / 100n;
          if (amount <= balance) {
            try { chain.transfer(from, to, amount); } catch { /* overspend race — fine */ }
          }
        }
      }
      if (rnd() < 0.1) chain.sealBlock();
    }

    const conservation = chain.checkConservation();
    expect(conservation.holds).toBe(true);
    expect(BigInt(chain.getSupply().mintedUnits) <= SUPPLY_CAP_UNITS).toBe(true);
    expect(chain.verifyChain().valid).toBe(true);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P3 — era monotonicity and exact halving
// ──────────────────────────────────────────────────────────────────────────────

describe('P3: eraOf monotone, reward halves exactly at boundaries', () => {
  it('era never decreases over 1000 random increasing minted totals', () => {
    const rnd = mulberry32(7);
    let minted = 0n;
    let lastEra = 0;
    for (let i = 0; i < 1000; i++) {
      minted += BigInt(Math.floor(rnd() * Number(SUPPLY_CAP_UNITS / 1000n)));
      if (minted > SUPPLY_CAP_UNITS) minted = SUPPLY_CAP_UNITS;
      const era = eraOf(minted);
      expect(era).toBeGreaterThanOrEqual(lastEra);
      lastEra = era;
    }
  });

  it('crossing each of the first 10 boundaries halves the reward exactly', () => {
    const base = tokensToUnits(64);
    let boundary = SUPPLY_CAP_UNITS / 2n;
    let slice = SUPPLY_CAP_UNITS / 4n;
    for (let k = 1; k <= 10; k++) {
      const before = scaledReward(base, boundary - 1n);
      const after = scaledReward(base, boundary);
      expect(after).toBe(before >> 1n);
      boundary += slice;
      slice /= 2n;
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P4 — transfer mutation rejection
// ──────────────────────────────────────────────────────────────────────────────

describe('P4: any single-field mutation of a signed transfer is rejected', () => {
  it('100 random mutations all fail stateless or stateful verification', async () => {
    const rnd = mulberry32(99);
    const client = makeOfflineClient();
    const identity = new SovereignIdentityService(client);
    const chain = new ValueChainService(client, { identity });
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 1000);

    for (let i = 0; i < 100; i++) {
      const unsigned = {
        id: `tx_fuzz_${i}`, from: a.did, to: b.did,
        amount: tokensToUnits(1 + Math.floor(rnd() * 10)).toString(),
        nonce: chain.getAccount(a.did).nonce + 1, memo: `m${i}`,
      };
      const { signature, publicKeyPem } = identity.signAs(a.did, transferPayload(unsigned));
      const valid: Transfer = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature };

      const field = pick(rnd, ['amount', 'to', 'nonce', 'memo', 'from'] as const);
      const mutated: Transfer = { ...valid };
      switch (field) {
        case 'amount': mutated.amount = (BigInt(valid.amount) + 1n).toString(); break;
        case 'to': mutated.to = a.did === valid.to ? b.did : 'did:vpc:' + 'e'.repeat(32); break;
        case 'nonce': mutated.nonce = valid.nonce + 1 + Math.floor(rnd() * 5); break;
        case 'memo': mutated.memo = valid.memo + 'x'; break;
        case 'from': mutated.from = b.did; break;
      }
      const result = chain.submitTransfer(mutated);
      expect(result.applied).toBe(false);
    }
    expect(chain.checkConservation().holds).toBe(true);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P5 — attention event mutation breaks chain verification
// ──────────────────────────────────────────────────────────────────────────────

describe('P5: any mutation of an attention event breaks chain verification', () => {
  it('100 random single-field mutations all invalidate the chain', async () => {
    const rnd = mulberry32(2024);
    const client = makeOfflineClient();
    const service = new AttentionChainService(client);
    const kinds: AttentionKind[] = ['view', 'share', 'reply', 'validate', 'anchor'];
    for (let i = 0; i < 20; i++) {
      service.record({ itemId: `item_${i % 5}`, agent: 'kai', kind: pick(rnd, kinds) });
    }
    const chain = service.getAgentChain('kai');
    expect(verifyAgentChain(chain).valid).toBe(true);

    for (let i = 0; i < 100; i++) {
      const idx = Math.floor(rnd() * chain.length);
      const field = pick(rnd, ['weight', 'itemId', 'kind', 'hlc', 'prev', 'hash'] as const);
      const forged = chain.map(e => ({ ...e }));
      const target = forged[idx] as AttentionEvent & Record<string, any>;
      switch (field) {
        case 'weight': target.weight = target.weight + 1; break;
        case 'itemId': target.itemId = target.itemId + '_evil'; break;
        case 'kind': target.kind = target.kind === 'view' ? 'anchor' : 'view'; break;
        case 'hlc': target.hlc = target.hlc.replace(/\d$/, d => String((parseInt(d, 10) + 1) % 10)); break;
        case 'prev': target.prev = sha256(`fuzz${i}`); break;
        case 'hash': target.hash = sha256(`fuzz${i}`); break;
      }
      expect(verifyAgentChain(forged).valid).toBe(false);
    }
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P6 — HLC monotonicity
// ──────────────────────────────────────────────────────────────────────────────

describe('P6: HLC strictly monotone over random local/remote interleavings', () => {
  it.each([[11], [222]])('seed %d: 500 mixed events never go backwards', (seed) => {
    const rnd = mulberry32(seed);
    let state: HLCTimestamp = HLC_ZERO;
    let prev: HLCTimestamp = HLC_ZERO;
    for (let i = 0; i < 500; i++) {
      if (rnd() < 0.5) {
        state = hlcNow(state);
      } else {
        // Remote timestamp near our clock (within drift bounds)
        const remote: HLCTimestamp = { l: Date.now() + Math.floor(rnd() * 1000), c: Math.floor(rnd() * 100) };
        state = hlcRecv(state, remote);
      }
      expect(hlcCompare(state, prev)).toBeGreaterThan(0);
      prev = state;
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P7 — canonicalize key-order invariance
// ──────────────────────────────────────────────────────────────────────────────

describe('P7: canonicalize is invariant under key insertion order', () => {
  it('100 random objects serialize identically regardless of key order', () => {
    const rnd = mulberry32(5);
    for (let i = 0; i < 100; i++) {
      const keys = Array.from({ length: 2 + Math.floor(rnd() * 8) }, (_, k) => `k${k}_${Math.floor(rnd() * 100)}`);
      const uniq = [...new Set(keys)];
      const values = uniq.map(() => (rnd() < 0.5 ? Math.floor(rnd() * 1e6) : `v${Math.floor(rnd() * 1e6)}`));

      const forward: Record<string, unknown> = {};
      uniq.forEach((k, idx) => { forward[k] = values[idx]; });
      const backward: Record<string, unknown> = {};
      [...uniq].reverse().forEach((k) => { backward[k] = forward[k]; });

      expect(canonicalize(backward)).toBe(canonicalize(forward));
      expect(sha256(canonicalize(backward))).toBe(sha256(canonicalize(forward)));
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P8 — Merkle order-sensitivity and the duplicate-leaf ambiguity
// ──────────────────────────────────────────────────────────────────────────────

describe('P8: Merkle tree properties', () => {
  it('leaf order is significant (permutation changes the root)', () => {
    const rnd = mulberry32(31);
    for (let i = 0; i < 50; i++) {
      const leaves = Array.from({ length: 3 + Math.floor(rnd() * 10) }, (_, k) => sha256(`leaf${i}_${k}`));
      const swapped = [...leaves];
      [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
      expect(buildMerkleRoot(swapped)).not.toBe(buildMerkleRoot(leaves));
    }
  });

  it('KNOWN LIMITATION (CVE-2012-2459 analog): [a,b,c] and [a,b,c,c] collide', () => {
    // Bitcoin's odd-leaf duplication makes these two leaf sets produce the
    // same root. This is why the value chain (a) uses unique tx ids as map
    // keys so a duplicate leaf cannot occur, and (b) commits to the exact
    // txIds array inside the block hash — the ambiguity is defused at the
    // usage layer, exactly as Bitcoin defused it post-CVE.
    const a = sha256('a'); const b = sha256('b'); const c = sha256('c');
    expect(buildMerkleRoot([a, b, c])).toBe(buildMerkleRoot([a, b, c, c]));
  });

  it('the block hash disambiguates what the tx root cannot', async () => {
    const client = makeOfflineClient();
    const identity = new SovereignIdentityService(client);
    const chain = new ValueChainService(client, { identity });
    const x = identity.register('x');
    chain.mintReward(x.did, 1);
    chain.mintReward(x.did, 1);
    chain.mintReward(x.did, 1);
    const block = chain.sealBlock()!;
    // txIds are unique — no duplicate leaves possible
    expect(new Set(block.txIds).size).toBe(block.txIds.length);
    // and the block hash covers the exact id list, not only the root
    const { hash, ...body } = block;
    expect(sha256(canonicalize(body))).toBe(hash);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P9 — ballot weight is server-derived
// ──────────────────────────────────────────────────────────────────────────────

describe('P9: random submitted ballot weights never influence the tally', () => {
  it('50 ballots with adversarial weights tally to exactly 1 per DID', async () => {
    const rnd = mulberry32(404);
    const client = makeOfflineClient();
    const identity = new SovereignIdentityService(client);
    const voting = new SovereignVotingService(client, { identity });
    const proposer = identity.register('proposer');
    const p = voting.createProposal({ question: 'q', options: ['a', 'b'], createdBy: proposer.did });

    let accepted = 0;
    for (let i = 0; i < 50; i++) {
      const voter = identity.register(`voter${i}`);
      const option = rnd() < 0.5 ? 'a' : 'b';
      const payload = ballotPayload({ proposalId: p.id, voter: voter.did, option });
      const { signature, publicKeyPem } = identity.signAs(voter.did, payload);
      const ballot: Ballot = {
        proposalId: p.id, voter: voter.did, option,
        weight: Math.floor(rnd() * 1e9),    // adversarial junk
        castAt: Math.floor(rnd() * 1e12),   // adversarial junk — server overrides it
        ts: new Date().toISOString(), publicKeyPem, signature,
      };
      if (voting.submitBallot(ballot).accepted) accepted++;
    }
    const t = voting.tally(p.id);
    expect(t.totals.a + t.totals.b).toBe(accepted); // every ballot counts exactly 1
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// P10 — identity rotation chains under fuzzing
// ──────────────────────────────────────────────────────────────────────────────

describe('P10: identity documents under random rotations + tampering', () => {
  it('documents stay valid through 1–15 random rotations', async () => {
    const rnd = mulberry32(808);
    const client = makeOfflineClient();
    const service = new SovereignIdentityService(client);
    for (let i = 0; i < 10; i++) {
      const doc = service.register(`agent${i}`);
      const rotations = 1 + Math.floor(rnd() * 15);
      for (let r = 0; r < rotations; r++) service.rotateKey(doc.did);
      const final = service.resolve(doc.did)!;
      expect(final.rotations).toHaveLength(rotations);
      expect(verifyIdentityDocument(final)).toEqual({ valid: true });
    }
    await client.close();
  });

  it('random tampering of any rotation field invalidates the document', async () => {
    const rnd = mulberry32(909);
    const client = makeOfflineClient();
    const service = new SovereignIdentityService(client);
    const doc = service.register('victim');
    for (let r = 0; r < 5; r++) service.rotateKey(doc.did);
    const valid = service.resolve(doc.did)!;

    for (let i = 0; i < 60; i++) {
      const idx = Math.floor(rnd() * valid.rotations.length);
      const field = pick(rnd, ['newKeyPem', 'prevKeyPem', 'prev', 'hash', 'rotatedAt'] as const);
      const forged = {
        ...valid,
        rotations: valid.rotations.map((rot, j) =>
          j === idx ? { ...rot, [field]: field.includes('Key') ? service.register(`m${i}`).publicKeyPem : sha256(`evil${i}`) } : { ...rot },
        ),
      };
      expect(verifyIdentityDocument(forged).valid).toBe(false);
    }
    await client.close();
  });
});

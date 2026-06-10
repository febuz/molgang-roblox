# P2P Knowledge Stack — Threat Model

Formal threat model for the Newsgroup 2.0 stack: news claims, attention
chains, sovereign identity, value chain, and sovereign voting
(`src/integrations/lightrag/`, `src/integrations/chain/`).

## 1. Adversary model

We assume a Dolev-Yao-style network adversary plus application-level
attackers:

| Capability | Assumed |
|---|---|
| Read, drop, delay, reorder, replay any network message | yes |
| Operate arbitrarily many malicious peers (sybil) | yes |
| Submit arbitrary REST payloads (unauthenticated endpoints) | yes |
| Compromise an agent's CURRENT private key | considered |
| Compromise an agent's GENESIS key | breaks that identity (by design) |
| Break Ed25519 / SHA-256 / Keccak-256 | no |
| Compromise the Node.js process / host | out of scope |
| Compromise Neo4j (persistence layer) | partially — see §4.6 |

## 2. Security goals and the mechanism that provides each

| Goal | Mechanism | Where |
|---|---|---|
| Claim authenticity | Ed25519 over canonical payload; `status`/`anchorId` excluded so lifecycle transitions don't break signatures | `news.ts` |
| Attention-event integrity & ordering | per-agent hash chain, `prev` inside the signed body, strictly increasing HLC | `attention-chain.ts` |
| Identity without registries | self-certifying DID = `sha256(genesis key)`; one hash check proves key ownership | `identity.ts` |
| Key-compromise recovery | rotation events signed by the *retiring* key, hash-chained from genesis | `identity.ts` |
| Money: no forgery | sender DID must derive from the signing key — the signature IS the authorization | `value-chain.ts` |
| Money: no replay / double-spend | strict `nonce + 1` per account; duplicate tx ids rejected | `value-chain.ts` |
| Money: no inflation | BigInt cap enforcement; coinbase txs rejected from outside; reward = `base >> era` | `value-chain.ts` |
| Money: exactness | BigInt fixed-point (10⁻⁸); conservation invariant `Σ balances ≡ minted` is exposed and fuzz-tested | `value-chain.ts` |
| Vote: sybil resistance | only registered DIDs vote; one ballot per DID per proposal | `sovereign-voting.ts` |
| Vote: weight integrity | weight is ALWAYS server-derived (1 or stake snapshot); submitted weights ignored | `sovereign-voting.ts` |
| Tamper-evident history | Merkle roots over tx/ballot hashes, hash-chained blocks, external anchoring (Ethereum/Tron/OTS→Bitcoin) | `value-chain.ts`, `anchor.ts`, `opentimestamps.ts` |
| Eclipse resistance | PEX capped at 2 new peers/source, peer table capped at 32 | `p2p-swarm.ts` |
| DoS (memory) | hard caps: identities, news items + field lengths, attention chains/agents, proposals/options, transfer log | all services |
| Signature malleability | canonical amount encoding `^[1-9][0-9]*$` — one number, one byte-representation | `value-chain.ts` |
| Timing side channels | `timingSafeEqual` on digest comparisons in verification paths (defense-in-depth; compared digests are public) | `constant-time.ts` |

## 3. Known attacks and their dispositions

### 3.1 CVE-2012-2459 analog (duplicate-leaf Merkle ambiguity)
The Bitcoin-style odd-leaf duplication makes `[a,b,c]` and `[a,b,c,c]`
produce the same root. **Disposition: defused at the usage layer** — tx ids
are unique map keys (duplicates cannot enter a block) and the block hash
additionally commits to the exact `txIds` array. Demonstrated and asserted
in `fuzz.properties.test.ts` (P8).

### 3.2 Stolen current key (identity)
An attacker holding an agent's current key can sign new events/transfers as
that agent until detected. They can NOT rewrite history (events are
hash-chained and replicated) and can NOT rotate the chain "around" the
victim retroactively: verifiers replay rotations from the genesis key.
Recovery = rotate from any honest device still holding the current key.
**Residual risk:** theft of the current key with no honest copy left is
unrecoverable — by design, like Bitcoin key loss.

### 3.3 Cross-node sybil identities
Registration is permissionless per node and `register()` is unauthenticated
REST. The caps bound memory, not identity count economics. A sybil earns
attention-mining rewards only on nodes where it is registered, and one vote
per proposal per DID per node. **Residual risk:** without a global identity
consensus (e.g., proof-of-personhood, stake-bonded registration, or social
attestation via the credential layer), cross-node vote aggregation must not
assume one-DID-one-human. Stake-weighted mode is the sybil-resistant option
today (splitting stake across sybils does not increase total weight).

### 3.4 Vote privacy
Ballots are PUBLIC and linkable to DIDs. This is verifiability-first
design (like on-chain governance), not coercion-resistant voting. Secret
ballots would need blind signatures or ZK proofs — out of scope.

### 3.5 Attention-mining gaming
`view` events cost nothing and mint nonzero value for registered agents.
Bounds: era halving caps total emission; the sybil gate restricts earning
to registered identities; reputation multipliers (0.1–10) let operators
dampen abusers. **Residual risk:** a registered agent can self-deal views.
Mitigation hooks exist (reputation), policy is operator-defined.

### 3.6 Persistence-layer trust
Neo4j persistence is a *cache/index*, not the source of truth — all
verification recomputes from signed in-memory state. A compromised Neo4j
can serve stale or wrong reads to graph queries but cannot forge
signatures, balances, or chain verifications. Anchored roots (OTS/chain)
externally bound the history even against local-state tampering.

### 3.7 HLC clock attacks
A peer presenting a far-future timestamp is rejected beyond the 60 s drift
guard (`hlc.ts`); within the guard, the local clock jumps forward but
monotonicity and causality are preserved (fuzz-tested, P6).

## 4. Explicit non-guarantees

1. **Consensus finality requires a configured validator set.** Nodes run a
   two-phase HotStuff BFT engine (`consensus.ts` + `consensus-network.ts`):
   a block is final once it carries a ⌊2n/3⌋+1 COMMIT quorum certificate,
   tolerating f < n/3 Byzantine validators. The guarantee is conditional —
   a single-node deployment self-finalizes (no Byzantine tolerance), and
   validator-set membership is currently administrative (REST), not
   on-chain governance. Histories that fork outside the validator set
   remain detectable via anchored roots but are not automatically resolved.
2. **No vote secrecy** (§3.4).
3. **No global identity uniqueness** (§3.3).
4. **No transport encryption requirement** — gossip authenticates content,
   not channels. Deploy behind TLS for metadata privacy.
5. **No availability guarantee under targeted DoS** — caps protect memory,
   not CPU; rate limiting is a deployment concern (reverse proxy).
6. **Classical signatures are not quantum-resistant.** Ed25519 falls to
   Shor's algorithm on a cryptographically relevant quantum computer. All
   hash commitments (DIDs, SMT roots, block hashes) are already
   quantum-safe, and accounts can enroll hash-based (SHA-256-only)
   signature keys plus produce quantum-safe wallet proofs today — see
   `POST-QUANTUM-WALLET.md` for the threat analysis and the phased
   migration of transfer/consensus signatures.

## 5. Invariants under continuous test

Property-based fuzz suite (`tests/unit/fuzz.properties.test.ts`, seeded
mulberry32 — every failure reproduces from its seed):

- P1 conservation: `Σ balances ≡ minted` bit-exact after random workloads
- P2 supply cap never exceeded under adversarial minting
- P3 era monotone; reward halves exactly at boundaries
- P4 any single-field transfer mutation rejected
- P5 any attention-event mutation breaks chain verification
- P6 HLC strict monotonicity over random interleavings
- P7 canonical serialization key-order invariance
- P8 Merkle order-sensitivity + duplicate-leaf disposition
- P9 ballot weights immune to adversarial input
- P10 identity docs valid through random rotations, invalid under tampering

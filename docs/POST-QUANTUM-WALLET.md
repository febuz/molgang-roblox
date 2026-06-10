# Post-Quantum Wallet — threat analysis, design, and migration plan

**Status:** implemented (`src/integrations/lightrag/pq-crypto.ts`,
`wallet-vault.ts`) · tested (`tests/unit/pqCrypto.test.ts`,
`walletVault.test.ts`) · this document is the research record the code
derives from.

---

## 1. The quantum threat, precisely

A cryptographically relevant quantum computer (CRQC) breaks public-key
cryptography in two distinct ways. They have very different consequences and
deadlines, and conflating them leads to wrong designs.

### 1.1 Shor's algorithm — breaks our signatures completely

Shor (1994) solves integer factorization and the discrete logarithm problem
(including elliptic-curve DLP) in polynomial time. **Every Ed25519 key in
this stack falls**: given a public key, a CRQC recovers the private key and
signs anything. Affected components:

| Component | Algorithm | Quantum status |
|-----------|-----------|----------------|
| Transfer signatures (`value-chain.ts`) | Ed25519 | **BROKEN by Shor** |
| Identity key rotation (`identity.ts`) | Ed25519 | **BROKEN by Shor** |
| Consensus votes/proposals (`consensus.ts`) | Ed25519 | **BROKEN by Shor** |
| Session challenge-response (`user-api.ts`) | Ed25519 | **BROKEN by Shor** |
| Ethereum/Tron anchoring keys | secp256k1 ECDSA | **BROKEN by Shor** |

### 1.2 Grover's algorithm — only *halves* symmetric/hash security

Grover (1996) searches an unstructured space of size N in √N quantum
queries. Against a 256-bit primitive that is 2¹²⁸ quantum work — and
Grover parallelizes *poorly* (quadratic speedup does not shard across
machines the way classical brute force does). Practical consensus
(NIST IR 8105, later analyses): **256-bit symmetric crypto and SHA-256
remain safe**.

| Component | Primitive | Quantum status |
|-----------|-----------|----------------|
| SMT account proofs (`sparse-merkle.ts`) | SHA-256 | **SAFE** (~128-bit PQ) |
| Block hashes, tx Merkle roots | SHA-256 | **SAFE** |
| DIDs (`did:vpc:` = sha256(pubkey)) | SHA-256 | **SAFE as commitment** |
| Session tokens (`user-api.ts`) | HMAC-SHA-256 | **SAFE** |
| Vault encryption (this work) | AES-256-GCM | **SAFE** |
| Hash-based signatures (this work) | SHA-256 | **SAFE** |

### 1.3 Harvest now, decrypt later — why "later" is too late

The attack that sets the deadline is not future forgery; it is **recording
today's traffic and breaking it when a CRQC exists**. For a *ledger* the
analog is sharper: every Ed25519 public key already published in a transfer
or identity document is a standing target. The moment a CRQC exists, an
adversary can forge transfers *from any account whose public key is on
chain* — which is every account that ever sent anything.

Bitcoin has the same exposure (≈25% of all BTC sits in outputs with exposed
public keys — reused P2PK/P2PKH addresses). The mitigation pattern there —
pay-to-hash so the public key stays hidden until spend — is exactly what
our `did:vpc: = sha256(publicKeyPem)` already does, but like Bitcoin, the
key is revealed on first spend.

**Timeline calibration** (public estimates as of 2025-2026): NIST mandates
federal migration off ECC by 2035; conservative industry estimates put a
CRQC capable of breaking 256-bit ECC at 10-20 years out; Mosca's theorem
says migrate when `shelf-life + migration-time > time-to-CRQC`. A ledger's
shelf-life is *forever* — by Mosca's inequality the migration must begin
**now**, which is what this work does.

## 2. What NIST standardized, and why we built hash-based anyway

NIST finalized three post-quantum standards in August 2024:

| Standard | Scheme | Family | Sig/key size | Notes |
|----------|--------|--------|--------------|-------|
| FIPS 203 | ML-KEM (Kyber) | Lattice (M-LWE) | 1.2 KB ct | Key encapsulation, not signatures |
| FIPS 204 | ML-DSA (Dilithium) | Lattice (M-LWE/SIS) | 2.4-4.6 KB sig | The default PQ signature |
| FIPS 205 | SLH-DSA (SPHINCS+) | **Hash-based** | 7.8-49 KB sig | Conservative fallback |
| SP 800-208 | XMSS / LMS | **Hash-based, stateful** | ~2.5 KB sig | Constrained: state management |

**Runtime reality check** (verified, not assumed): this stack runs Node 22
on OpenSSL 3.0.13. `crypto.generateKeyPairSync('ml-dsa-65')` throws —
native ML-DSA/ML-KEM arrive with OpenSSL 3.5 (Node 24+). The options were:

1. **Pull in an npm lattice library.** Rejected: a brand-new cryptographic
   dependency with native bindings contradicts this codebase's
   zero-dependency crypto discipline (everything else uses node:crypto),
   and lattice implementations are hard to audit.
2. **Wait for Node 24.** Rejected: harvest-now applies now, and the
   migration scaffolding (enrollment, vault, proof format) is needed
   regardless of which algorithm signs.
3. **Implement hash-based signatures on node:crypto SHA-256.** Chosen.
   Hash-based is the *most* conservative PQ family — its security reduces
   to nothing but second-preimage resistance of SHA-256, an assumption the
   entire ledger already rests on. It is implementable in ~300 auditable
   lines with zero new primitives. This mirrors NIST's own reasoning for
   standardizing SLH-DSA as the hedge against lattice cryptanalysis.

When Node ships native ML-DSA, it slots in as a *second* signature in the
same proof envelope (see §6 migration plan) — hybrid, not replacement.

## 3. The scheme: W-OTS+ chains under a Merkle tree (XMSS-style)

Implemented in `pq-crypto.ts`. Fixed parameters, version-tagged `VPC-HBS1`:

```
n = 32 bytes (SHA-256)        w = 16 (4 bits per digit)
len1 = 64 message chains      len2 = 3 checksum chains     len = 67
tree height h = 10 default    → 1024 one-time keys per wallet key
signature = 67·32 B (OTS) + 10·32 B (auth path) + 4 B index ≈ 2.5 KB
public key = 32 B (the Merkle root)
private key = 32 B (one master seed; all chain keys derived via PRF)
```

### 3.1 Signing, mechanically

1. `digest = SHA-256("VPC-HBS1-MSG" ‖ message)` → 64 base-16 digits `d_i`.
2. Checksum `C = Σ (15 − d_i)` encoded as 3 more digits. **Why:** a forger
   can only walk hash chains *forward* (apply more hashes). Raising any
   message digit forces the checksum *down* — which would require walking a
   checksum chain backward, i.e. inverting SHA-256.
3. For chain `i`: secret start `sk_i = PRF(seed, leaf, i)`; the signature
   element is `sk_i` hashed `d_i` times. The verifier continues the chain
   `15 − d_i` more steps and must land on the public chain end.
4. The 67 chain ends hash to the leaf; the leaf plus the `h` sibling hashes
   (auth path) must reproduce the Merkle root = the public key.

Every chain step is domain-separated by `(chain index, step number)` —
`SHA-256("VPC-HBS1-CHAIN" ‖ i ‖ s ‖ value)` — so values cannot be spliced
between positions (the multi-target hardening that distinguishes WOTS+
from naive WOTS).

### 3.2 Statefulness — the one sharp edge, and its handling

Each leaf signs **once**. Signing two different messages with the same leaf
reveals enough intermediate chain values to forge (`d` and `d'` differ
somewhere in both directions across the 67 digits). This is why XMSS lives
in SP 800-208's "constrained environments" box. Mitigations implemented:

- `HashBasedSigner` tracks `usedIndexes` and refuses reuse; signing past
  2^h **throws** rather than wrapping.
- `restoreState()` **unions** used-index sets — restoring an old snapshot
  can never resurrect an index.
- The vault export (§4) carries `pqState` alongside the seed, so custody
  transfer moves the state with the key.
- Remaining-signature count is surfaced in `GET /pq/status` so callers can
  rotate to a fresh key before exhaustion.

The residual risk — restoring a *pre-signature* backup and re-signing — is
inherent to all stateful HBS and documented by NIST as the operational
cost of the smallest, most conservative PQ signatures. The stateless
alternative (SPHINCS+) trades this for 8-49 KB signatures; §6 keeps that
door open.

### 3.3 Security reduction, stated

Forging a `VPC-HBS1` signature requires (one of): second-preimage on
SHA-256 (2¹²⁸ quantum work via Grover), inverting a hash chain
(preimage, same bound), or a Merkle-root collision (collision resistance,
2⁸⁵ quantum via BHT but with infeasible memory; ≥2¹²⁸ in realistic
models). There is no algebraic structure for Shor to attack. This is the
entire assumption set — strictly smaller than the ledger's existing one
(which assumes SHA-256 *and* Ed25519).

## 4. The vault: quantum-safe custody at rest

`wallet-vault.ts` implements encrypted wallet export:

```
key  = scrypt(passphrase, salt₁₆, N=2¹⁵, r=8, p=1) → 32 bytes
blob = AES-256-GCM(key, iv₁₂, JSON{did, pqMasterSeed, pqState, pqRoot})
```

- **AES-256**: Grover-resistant (2¹²⁸ quantum). GCM authenticates — a
  tampered vault throws, never decrypts to plausible garbage.
- **scrypt**: memory-hard (≈32 MB per guess), so passphrase brute force
  does not parallelize cheaply on ASICs — and Grover gives an attacker *no
  advantage* against a KDF it must evaluate serially per guess.
- KDF parameters are stored **in** the vault envelope, so they can be
  raised later without breaking old exports.
- The PQ master seed plus state re-derives the *entire* key (all 1024
  one-time keys and the Merkle tree) — a 32-byte seed is a full backup,
  the same property that makes BIP-32 wallets practical.

## 5. The quantum-safe wallet proof — end-to-end, no ECC anywhere

`POST /api/users/:handle/pq/prove` produces:

```
WalletProof {
  payload:     { did, balanceUnits, balanceTokens, nonce, stateRoot, issuedAt }
  smtProof:    SMT inclusion proof  (SHA-256)         account → stateRoot
  pqRoot:      hash-based public key (32 B)
  pqSignature: VPC-HBS1 signature   (SHA-256)         over sha256(canonicalize(payload))
}
```

`verifyWalletProof()` (stateless, also exposed as `POST /api/pq/verify`)
checks three links:

1. the hash-based signature verifies under `pqRoot`;
2. the SMT proof verifies under `payload.stateRoot`;
3. the SMT leaf equals `accountLeafValue(balance, nonce)` — the proof
   cannot claim a different balance than the tree commits to (and a
   non-inclusion proof can only claim the zero account).

**The claim, precisely:** an adversary with a CRQC that breaks every
Ed25519 and secp256k1 key in existence still cannot (a) forge this proof,
(b) alter the balance it attests, or (c) decrypt the vault. The only
assumptions are SHA-256 preimage resistance and AES-256 — the same
assumptions Bitcoin's mining and our block hashes already require.

What the verifier must source independently (stated, not hidden): that
`pqRoot` is bound to the DID (enrollment record / `pq/status`), and a
trusted `stateRoot` (a finalized block's). Both are hash commitments —
quantum-safe to verify.

## 6. Long-term migration plan (the part that outlives this commit)

Phased, mirroring Bitcoin's P2QRH discussions and NIST's 2035 deadline:

| Phase | What | Status |
|-------|------|--------|
| **0** | All *commitments* hash-based: DIDs, SMT roots, block hashes, tx roots | ✅ already true |
| **1** | PQ key enrollment + quantum-safe wallet proofs + encrypted vault (this work) | ✅ implemented |
| **2** | **Hybrid transfers**: optional `pqSignature` co-signature on `Transfer`, verified when the sender has an enrolled PQ root. Roll-out: optional → default → required-for-new-accounts. Keeps old transfers valid; new transfers survive a CRQC | designed, not yet implemented |
| **3** | **Native ML-DSA** when Node ≥ 24 / OpenSSL ≥ 3.5 lands: add `ml-dsa-65` as a second algorithm in the same envelopes (`alg` tag per signature). Hybrid hash-based + lattice — an attack must break both families | blocked on runtime |
| **4** | **Consensus votes**: extend `VotePayload` with PQ co-signatures once validator count × 2.5 KB per vote is paid for (QC size grows from ~100 B to ~2.5 KB per validator — acceptable at n ≤ 100) | after phase 2 |
| **5** | **Anchoring**: external chains (Ethereum/Tron/Bitcoin) migrate on their own schedules; our anchored *content* is already a hash, so anchor integrity inherits whatever the host chain achieves | external dependency |

Key sizing note for phase 2: at h=10 a key signs 1024 transfers, then the
account enrolls a successor key — the natural mechanism is a final
old-key-signs-new-root rotation, which is exactly the hash-chained
rotation pattern `identity.ts` already implements for Ed25519.

## 7. What this does NOT claim

- **No transport PQ**: TLS to peers still uses classical key exchange
  until the reverse proxy speaks ML-KEM (deployment concern, not ledger).
- **No retroactive protection for Ed25519-signed history**: a CRQC could
  forge *new* classical transfers from exposed keys — that is what phase 2
  closes. The wallet proof, however, attests *current* state quantum-safely
  today.
- **No protection against a compromised node**: the node holds PQ seeds in
  memory (same custody model as Ed25519 keys). Vault export is how users
  take keys off-node.
- **Stateful HBS restore hazard** (§3.2): operational discipline required —
  the vault carries state precisely so backups travel with it.

## 8. Test coverage

- `tests/unit/pqCrypto.test.ts` — chain/PRF determinism, sign/verify
  round-trips across leaves, tamper rejection (message, signature, auth
  path, root), checksum behavior, index single-use, key exhaustion, state
  export/restore monotonicity, signature size bounds.
- `tests/unit/walletVault.test.ts` — vault round-trip, wrong passphrase,
  ciphertext/tag tamper, seed→root re-derivation, enrollment idempotency,
  full prove→verify loop against the live chain, balance-mismatch
  rejection, non-inclusion proofs, HTTP route contract.

## 9. References

- NIST FIPS 203/204/205 (Aug 2024); NIST SP 800-208 (stateful HBS).
- NIST IR 8105 — Report on Post-Quantum Cryptography (Grover/Shor impact).
- Mosca, M. — "Cybersecurity in an era with quantum computers" (the
  migration-timing theorem in §1.3).
- Buchmann, Dahmen, Hülsing — "XMSS: A Practical Forward Secure Signature
  Scheme Based on Minimal Security Assumptions" (PQCrypto 2011).
- Hülsing — "W-OTS+: Shorter Signatures for Hash-Based Signature Schemes"
  (AFRICACRYPT 2013) — the chain domain-separation we adopt.
- Bitcoin BIP-360 (P2QRH) discussions — the hybrid migration pattern §6
  follows.

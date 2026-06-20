# Paper 8 — KnitNet / KnitWeb: A Woven P2P Knowledge Graph

**Subtitle:** *A blockless, hashgraph-less protocol for decentralised, collaborative knowledge.*

**Status:** Concept paper v0.2  
**Language:** English with Dutch summary  
**Scope:** Protocol architecture, data model, weaving semantics, trust model, integration with VirtualPC, heritage, vocabulary crosswalk, net-vs-web epistemology, transport, and governance mapping.

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Core concepts](#2-core-concepts)
3. [Data model](#3-data-model)
4. [Weaving protocol](#4-weaving-protocol)
5. [Trust and consensus](#5-trust-and-consensus)
6. [Query model](#6-query-model)
7. [Integration with VirtualPC](#7-integration-with-virtualpc)
8. [Use cases](#8-use-cases)
9. [Security considerations](#9-security-considerations)
10. [Comparison with related work](#10-comparison-with-related-work)
11. [Why KnitNet is better than legacy P2P file-sharing systems](#11-why-knitnet-is-better-than-legacy-p2p-file-sharing-systems)
12. [Appendix A — Heritage, vocabulary, net-vs-web, transport and governance](#appendix-a--heritage-vocabulary-net-vs-web-transport-and-governance)
13. [Open questions and future work](#13-open-questions-and-future-work)
14. [Dutch summary](#14-dutch-summary)
15. [References](#references)

---

## Abstract

KnitNet is a peer-to-peer network for weaving local knowledge updates into a shared, decentralised knowledge graph called KnitWeb. Unlike blockchains it has no blocks, no global linear chain, and no proof-of-work. Unlike hashgraphs it does not depend on gossip-about-gossip or a directed acyclic graph of events. Instead, KnitNet treats every atomic fact as a signed, content-addressed *stitch*, groups stitches into *threads*, and lets peers weave threads into local *patches* that merge via Conflict-free Replicated Data Types (CRDTs). The result is a loose, durable, eventually-consistent fabric of triples that supports sovereign identity, local trust decisions, and rich querying without a central coordinator.

---

## 1. Introduction

Most existing decentralised knowledge systems fall into two camps:

1. **Blockchain-based systems** force all participants to agree on a single linear order of blocks. This is slow, energy-intensive, and overkill for knowledge that does not need a global total order.
2. **Hashgraph-based systems** use gossip-about-gossip to establish fair ordering. They are faster than blockchains but still require all events to be linked into an ever-growing DAG of hashes.

KnitNet proposes a third path: **weaving**. Each peer owns its own yarn (its signed stream of stitches). Peers pull each other’s yarns, weave them into local patches, and merge patches with a CRDT semilattice. There is no block, no hashgraph, and no canonical global timeline — only a continuously evolving fabric of facts.

### 1.1 Why a weave?

A physical weave is strong precisely because it is made of many independent threads crossing at right angles. No single thread carries the whole load. In KnitNet:

- **Yarns** are independent identity streams.
- **Threads** are ordered sequences of stitches from one yarn.
- **Stitches** are the atomic facts.
- **Patches** are local snapshots produced by a peer.
- **The fabric** is the union of all accepted patches.

This mirrors how human knowledge works: many independent sources publish, readers subscribe to sources they trust, and local consensus emerges from overlapping trust networks.

---

## 2. Core concepts

| Term | Meaning |
|------|---------|
| **Yarn** | A cryptographically owned identity stream. One yarn = one DID + one signing key. |
| **Thread** | An ordered append-only log of stitches from a single yarn. |
| **Stitch** | A signed, content-addressed atomic update: a triple + metadata. |
| **Patch** | A materialised view produced by a peer after weaving selected threads. |
| **Loom** | A peer node that weaves, stores and serves patches. |
| **Weaver** | An agent or process that produces/validates stitches. |
| **Fabric** | The emergent global knowledge graph = the union of all accepted patches. |
| **Weave algebra** | The CRDT merge function that combines two patches. |

---

## 3. Data model

### 3.1 Stitch

A stitch is the smallest unit of knowledge.

```json
{
  "id": "stitch://bafy...xyz",
  "yarn": "did:knit:alice",
  "seq": 42,
  "prev": "stitch://bafy...abc",
  "triple": {
    "subject": "did:knit:project/alpha",
    "predicate": "status",
    "object": "completed"
  },
  "type": "assert",
  "timestamp": "2026-06-14T12:00:00Z",
  "signature": "ed25519..."
}
```

Fields:

- `id` — content-addressed identifier (CID) of the canonical serialisation.
- `yarn` — the DID that owns the thread.
- `seq` — monotonically increasing sequence number within the yarn.
- `prev` — CID of the previous stitch in the thread (`null` for the genesis stitch).
- `triple` — subject-predicate-object statement.
- `type` — `assert` or `retract`.
- `timestamp` — wall-clock time, advisory only.
- `signature` — Ed25519 signature over all other fields.

### 3.2 Thread

A thread is an append-only chain of stitches from one yarn. Because each stitch links to its predecessor, a thread is tamper-evident *within its own yarn*. A peer can verify the entire thread by checking signatures and sequence numbers.

```
Yarn alice
  stitch[0] → stitch[1] → stitch[2] → ... → stitch[n]
```

Threads are not blocks. They do not bundle unrelated transactions, do not have timestamps forced into slots, and do not require global consensus.

### 3.3 Patch

A patch is a local materialised view. A loom chooses which threads to follow, weaves the latest stitches from each thread, and applies them to its local graph store.

```json
{
  "loom": "did:knit:alice-laptop",
  "asOf": "2026-06-14T12:05:00Z",
  "threads": [
    "did:knit:alice@42",
    "did:knit:bob@17",
    "did:knit:carol@9"
  ],
  "root": "patch://bafy...uvw"
}
```

Patches are content-addressed. Two looms that weave the same set of thread heads will produce the same patch CID, enabling efficient diff/gossip.

### 3.4 Triple store

The merged output is a labelled directed graph. A patch can be queried with a subset of SPARQL or Cypher. Each triple is annotated with provenance:

- `source_yarn` — which yarn asserted/retracted it.
- `source_stitch` — CID of the stitch that introduced the change.
- `confidence` — locally computed trust score.

---

## 4. Weaving protocol

### 4.1 No blocks, no hashgraph

KnitNet avoids both paradigms:

- **No blocks:** a stitch is a single fact, not a bundle.
- **No hashgraph:** stitches do not embed hashes of other peers’ events. They only link backwards within their own thread.

Instead, KnitNet uses:

- **Content addressing** (IPFS-style CIDs) for stitches and patches.
- **Vector clocks** per yarn to detect causality within a thread.
- **CRDT semilattice** for patch merge.
- **Epidemic gossip** for dissemination.

### 4.2 Gossip pattern

A loom periodically asks a subset of peers:

1. "Which yarns do you follow and what is the latest `seq` you have for each?"
2. If a peer has newer stitches, fetch them by CID.
3. Verify signatures and thread continuity.
4. Apply to local patch using the weave algebra.

Because stitches are content-addressed, the same CID can be fetched from any peer that has it — there is no need to trust a specific seed node.

### 4.3 Weave algebra (merge function)

A patch is a state-based CRDT. Merging two patches means taking the union of their stitches and applying the last-writer-wins rule per `(yarn, predicate, subject)` tuple, with `retract` beats `assert` when sequence numbers are equal.

Formally:

```
merge(P1, P2) = {
  for each (yarn, subject, predicate) key:
    choose the stitch with the highest seq
    if tie: choose retract over assert
}
```

This is associative, commutative and idempotent, so epidemic gossip converges without coordination.

### 4.4 Retractions and tombstones

Because stitches are append-only, deletion is modelled as a `retract` stitch. A retract does not erase history; it marks a triple as no longer valid in the latest patch. This gives an automatic audit trail.

---

## 5. Trust and consensus

### 5.1 No global consensus

KnitNet does not require all peers to agree on one true state. Each loom has its own trust policy. A bank loom might reject yarns without KYC; a research loom might prioritise open-access yarns; a friend-group loom might follow only its members.

### 5.2 Subjective trust

Each loom maintains a trust vector:

```json
{
  "did:knit:alice": 0.9,
  "did:knit:bob": 0.7,
  "did:knit:carol": 0.4,
  "did:knit:mallory": 0.0
}
```

A triple’s confidence is derived from the trust of its source yarn and the transitive trust of any endorsing yarns.

### 5.3 Web of trust endorsements

A yarn can publish an endorsement stitch:

```json
{
  "triple": {
    "subject": "did:knit:bob",
    "predicate": "trusts",
    "object": "did:knit:alice"
  },
  "type": "assert"
}
```

Endorsements form a web of trust that looms can use for bootstrapping and Sybil resistance without a central authority.

### 5.4 Notary looms (optional)

For contexts that need stronger assurance (e.g., legal contracts, supply-chain events), a set of independent notary looms can co-sign stitches. This is not consensus; it is witnessed attestation. A receiving loom decides how many notary signatures it requires.

---

## 6. Query model

A patch is stored in an embedded graph database (e.g., Oxigraph, Kùzu, or a custom index). Queries are executed locally.

Example query: *“Which projects does Alice trust that Bob also contributed to?”*

```sparql
SELECT ?project WHERE {
  ?project contributor did:knit:bob .
  did:knit:alice trusts ?project .
}
```

Results include provenance metadata so the caller can see which yarns contributed each binding.

---

## 7. Integration with VirtualPC

VirtualPC agents already communicate via the P2P Newsgroup 2.0 layer. KnitNet/KnitWeb can become the underlying transport and storage layer for that knowledge graph.

| VirtualPC component | KnitNet equivalent |
|---------------------|--------------------|
| Agent identity | Yarn (DID + signing key) |
| Agent post / task update | Stitch |
| Agent feed / task stream | Thread |
| Knowledge graph | KnitWeb patch |
| P2P node | Loom |
| Deliberation gate attestation | Notary loom co-sign |
| Governance registry entry | Stitch with `governance:` predicate |

Benefits for VirtualPC:

- **Offline-first agents:** an agent can weave its local patch without connectivity and merge later.
- **Fork-tolerant collaboration:** two agents can edit the same concept and merge via CRDTs.
- **Auditability:** every agent belief is traced to a signed stitch.
- **Sovereignty:** organisations run their own looms; no third-party graph host.

---

## 8. Use cases

### 8.1 Sovereign P2P wiki

Teams share documentation without Confluence or Notion. Each author owns a yarn; the wiki is the union of all followed yarns. Retractions preserve history.

### 8.2 Agent memory

LLM agents publish facts they learn as stitches. Other agents subscribe to relevant yarns. The collective memory grows organically without a central vector database.

### 8.3 Supply-chain provenance

Each participant (farmer, transporter, packager, retailer) publishes events as stitches. Buyers query the KnitWeb for end-to-end provenance without relying on a single platform.

### 8.4 Decentralised academic graph

Papers, citations, reviews and retractions are stitches. Citation counts and review scores are computed locally according to each loom’s trust policy, reducing citation cartels and predatory journals.

---

## 9. Security considerations

- **Identity:** DIDs with Ed25519 keys. Key rotation is modelled as a special stitch.
- **Integrity:** every stitch is signed and content-addressed.
- **Availability:** content-addressed gossip makes censorship expensive; data can be replicated by any peer.
- **Confidentiality:** private yarns can encrypt stitches to a set of recipient DIDs. Public yarns are plaintext.
- **Sybil resistance:** web-of-trust endorsements and optional notary looms.

---

## 10. Comparison with related work

| System | Has blocks | Has hashgraph | CRDT merge | Local trust |
|--------|------------|---------------|------------|-------------|
| Bitcoin / Ethereum | yes | no | no | no |
| Hedera Hashgraph | no | yes | no | no |
| IPFS | no | no | no | no |
| ActivityPub | no | no | limited | limited |
| CRDT databases (e.g., Automerge) | no | no | yes | no |
| **KnitNet / KnitWeb** | **no** | **no** | **yes** | **yes** |

---

## 11. Why KnitNet is better than legacy P2P file-sharing systems

BearShare, Napster, BitTorrent, The Pirate Bay and DC++ proved that decentralised networks can scale. They also proved that decentralised networks without identity, trust or accountability drift toward grey-area use cases. KnitNet keeps the good parts of those systems and removes the failure modes.

| System | What it did well | Why KnitNet improves on it |
|--------|------------------|----------------------------|
| **Napster** | Fast music discovery via a central index. | KnitNet has no central index; discovery happens through content-addressed gossip and web-of-trust subscriptions. |
| **BearShare (Gnutella)** | Fully decentralised search. | KnitNet is also fully decentralised, but every participant has a DID, so there is accountability without a central server. |
| **BitTorrent** | Efficient large-file distribution via swarming. | KnitNet borrows content addressing and swarming, but distributes small stitches rather than file chunks, enabling live knowledge updates. |
| **The Pirate Bay** | Resilient torrent metadata index. | KnitWeb needs no single metadata index; the fabric itself is the queryable index and it is legal by design because users publish their own facts. |
| **DC++** | Community hubs with file lists. | KnitNet replaces hubs with subjective trust circles; access control is capability-based rather than hub-membership-based. |

### 11.1 Lessons learned and applied

1. **Identity beats anonymity.** Napster and BitTorrent worked because of scale, but failed at trust. KnitNet uses DIDs so every yarn is accountable.
2. **Content addressing scales.** BitTorrent showed that hashes make content location-independent. KnitNet uses CIDs for stitches and patches.
3. **Legal sustainability matters.** The Pirate Bay survived technically but not legally. KnitNet is designed for users who own their own data and publish their own knowledge.
4. **Communities need boundaries.** DC++ hubs created silos. KnitNet trust circles are overlapping and portable, not gated by a hub operator.

---

## Appendix A — Heritage, vocabulary, net-vs-web, transport and governance

This appendix places KnitNet / KnitWeb in its intellectual and technical context. It is meant for readers who need to map the protocol to existing enterprise vocabularies, governance frameworks and transport stacks.

### A.1 Heritage

KnitNet is not invented from whole cloth. It is a deliberate recombination of proven ideas:

| Tradition | Contribution to KnitNet | KnitNet twist |
|-----------|-------------------------|---------------|
| **Memex / Xanadu / early hypertext** | Documents as linked, addressable objects; bidirectional links; versioned literature. | Stitches are smaller than documents; every triple is signed and content-addressed. |
| **Semantic Web (RDF, Linked Data)** | Triples as the universal data atom; URIs for every concept. | No global ontology is required; each yarn defines its own predicates and patches merge anyway. |
| **Git** | Content-addressed objects; Merkle-like lineage; offline-first collaboration; fork/merge workflow. | A yarn is like a branch that signs its own commits; patches are CRDTs, not rebases. |
| **IPFS / BitTorrent** | Content addressing, swarming retrieval, censorship resistance. | Stitches are tiny objects; retrieval is gossip-driven rather than DHT-centric. |
| **CRDT literature** | Convergent replicated data types; semilattice merge functions. | Weave algebra applies CRDT semantics to signed, triple-oriented facts. |
| **DID / Verifiable Credentials** | Self-sovereign identity; cryptographic accountability. | Every yarn is a DID; trust is subjective and computed locally. |
| **P2P file sharing (Napster, Gnutella, BitTorrent, DC++)** | Decentralised discovery, swarming, community boundaries. | Knowledge, not files; identity, not anonymity; trust circles, not hubs. |

The result is a system that feels familiar to anyone who has used git, RDF or BitTorrent, but whose behaviour is distinct from all of them.

### A.2 Vocabulary crosswalk

Enterprise architects often ask: "Is this a blockchain? A graph database? A wiki?" The answer is "yes, in parts, but the whole is different." The crosswalk below maps KnitNet terms to terms used in other domains.

| KnitNet term | Blockchain term | Semantic Web / RDF term | Git term | Enterprise data term |
|--------------|-----------------|-------------------------|----------|----------------------|
| **Yarn** | Account / wallet | Named graph (per agent) | Branch + GPG key | Data owner / steward DID |
| **Thread** | Transaction list | Sequence of triples in a named graph | Signed commits on a branch | Audit trail for one data subject |
| **Stitch** | Transaction | RDF triple + provenance | Signed commit | Signed atomic fact / log entry |
| **Patch** | World state snapshot | Materialised RDF graph | Working tree + HEAD | Materialised governed dataset |
| **Loom** | Full node | Triple store + reasoner | Git daemon / client | Governed data product node |
| **Weave / merge** | Consensus | RDF graph merge | Merge | CRDT-based reconciliation |
| **CID** | Transaction hash | URI / IRI | Object hash | Content-based identifier |
| **Trust vector** | Staking / slashing | Provenance trust score | `.mailmap` + GPG web of trust | Data quality scorecard |
| **Notary loom** | Validator | Trusted third-party signature | Notary / tag signer | Steward / data owner approval |

This crosswalk is useful for procurement conversations, but it should not be over-read. KnitNet is not a blockchain because it has no consensus rounds, no canonical chain and no global state. It is not merely a graph database because it has a P2P gossip and trust model built in.

### A.3 Net-vs-web epistemology

A common source of confusion is the relationship between **KnitNet** and **KnitWeb**. The distinction is epistemological, not just marketing:

- **KnitNet** is the *net*: the set of protocols, looms, transports and gossip messages that move stitches between peers. It is about **communication**.
- **KnitWeb** is the *web*: the emergent graph produced when a loom weaves selected threads into a patch. It is about **knowledge**.

A network can exist without producing a single shared web: two isolated looms that never follow each other’s yarns are still running KnitNet, but they do not share a KnitWeb. Conversely, a web can be produced from archived stitches long after the originating looms have gone offline: the knowledge outlives the network.

| Question | KnitNet (net) | KnitWeb (web) |
|----------|---------------|---------------|
| What is it? | P2P transport and protocol | Materialised knowledge graph |
| Unit of exchange | Stitch (signed triple) | Patch (merged triple set) |
| Is there one canonical instance? | No — many looms | No — each loom has its own patch |
| What guarantees delivery? | Epidemic gossip, retries, store-and-forward | Nothing — patches are local beliefs |
| What guarantees truth? | Nothing — only signatures | Subjective trust policies |
| Analogy | The postal system | The library assembled from received letters |

This separation is why KnitNet can be legally and socially sustainable. The net does not host content; it carries signed statements. The web is what a loom chooses to believe.

### A.4 Transport layer

Stitches must move between looms. KnitNet deliberately separates the *data model* from the *transport*, so different deployments can choose different transports without changing the weave algebra.

#### Default transport profile

The reference implementation in VirtualPC uses:

1. **WebSocket** for active peer sessions (loom-to-loom keep-alive and push).
2. **HTTP(S) / CID fetch** for on-demand stitch retrieval (any HTTP cache can serve a stitch).
3. **QUIC / libp2p** where NAT traversal and mobility are required.
4. **Store-and-forward** via resilient peers (e.g., always-on VPS, mailbox looms) for intermittently connected nodes.

#### Gossip message types

| Message | Purpose | Payload |
|---------|---------|---------|
| `HELLO` | Bootstrap a session | Supported transports, public key fingerprint |
| `WANT_YARNS` | Discover which yarns a peer follows | List of `(yarn, latest_seq)` pairs |
| `HAVE_STITCH` | Announce availability of a stitch | `(yarn, seq, cid)` |
| `FETCH_STITCH` | Request a stitch by CID | CID |
| `PATCH_ROOT` | Announce a local patch root | `(loom, patch_cid, yarn_heads)` |

All messages are small. Large objects (attachments, blobs) are referenced by CID and fetched out-of-band, keeping gossip traffic light.

#### NAT and offline scenarios

- Where direct peer connections are impossible, looms can sync through **relay looms** or **mailbox looms** that hold encrypted stitches until the recipient comes online.
- Because stitches are content-addressed, any peer that has a stitch can serve it; there is no need to contact the original author for retrieval.

For implementation details of the VirtualPC P2P layer, see the technical page `public/knitnet.html` and the protocol code under `src/integrations/lightrag/`.

### A.5 Governance mapping — from Collibra to stitches

Enterprise data governance tools such as Collibra, Alation and Microsoft Purview maintain:

- a **business glossary** of terms and definitions;
- a **data dictionary** of attributes and schemas;
- **policies** for usage, retention and quality;
- **stewardship assignments** linking people to data assets;
- **lineage** showing where data came from;
- **quality rules** and issue workflows.

KnitWeb can represent all of these constructs as triples, signed by the appropriate steward yarns. The table below shows how Collibra-like governance maps to KnitNet primitives.

| Collibra concept | KnitNet representation | Example triple |
|------------------|------------------------|----------------|
| Business term | Stitch in a glossary yarn | `did:knit:glossary/customer-churn rdf:type glossary:Term` |
| Data asset | CID-addressed object + metadata triples | `did:knit:dataset/sales-2026 rdf:type fabric:Dataset` |
| Policy | Assertion by governance yarn | `did:knit:policy/pii-masking fabric:appliesTo did:knit:dataset/customers` |
| Steward | DID in stewardship yarn | `did:knit:dataset/sales-2026 fabric:steward did:knit:alice` |
| Lineage | Chain of `fabric:derivedFrom` stitches | `did:knit:view/monthly-revenue fabric:derivedFrom did:knit:dataset/sales-2026` |
| Quality rule | Stitch with `fabric:qualityScore` | `did:knit:dataset/sales-2026 fabric:qualityScore 0.94` |
| Issue / workflow | Retraction + corrective assertion | `did:knit:issue/42 fabric:status resolved` |

Because each governance statement is a signed stitch, governance itself becomes auditable, forkable and mergeable. A regulator can run a loom that follows only governance yarns and produce a patch that proves compliance without needing API access to a central catalog.

For the canonical data model of stitches, threads and patches, see [Section 3. Data model](#3-data-model) of this paper and the interactive technical page `public/knitnet.html`.

---

## 13. Open questions and future work

1. **Efficient partial replication:** how does a loom subscribe to a subset of a large yarn?
2. **Garbage collection:** when can old stitches be archived without losing lineage?
3. **Query federation:** how do looms answer queries across many remote patches?
4. **Incentive layer:** how do we reward storage and bandwidth providers without tokens?
5. **Formal verification:** can the weave algebra be proven correct in a proof assistant?

---

## 14. Dutch summary

KnitNet is een peer-to-peer netwerk waarin lokale kennisupdates worden geweven tot een gedeelde, gedecentraliseerde kennisgrafiek: KnitWeb. Er zijn geen blocks en geen hashgraph. In plaats daarvan publiceert elke identiteit (yarn) een ondertekende reeks feiten (stitches), weven peers deze tot lokale patches, en samenvoegen gebeurt via CRDTs. Elke peer bepaalt zelf welke bronnen het vertrouwt. KnitWeb is bij uitstek geschikt als geheugen- en samenwerkingslaag voor VirtualPC-agenten.

---

## References

1. Shapiro, M., Preguiça, N., Baquero, C., & Zawirski, M. (2011). *Conflict-free replicated data types.*
2. Lamport, L. (1978). *Time, clocks, and the ordering of events in a distributed system.*
3. Benet, J. (2014). *IPFS - Content Addressed, Versioned, P2P File System.*
4. W3C. (2022). *Decentralized Identifiers (DIDs) v1.0.*
5. VirtualPC project. `docs/p2p-newsgroup-2.0.md` and `src/integrations/lightrag/`.

# 4-Line Brand Strategy — Loom · KnitNet · Fiber · Plexus

**Status:** v0.1 — adopted 2026-06-14  
**Scope:** Product positioning, audience, taglines and the single shared fabric behind all four brands.

---

## Core idea

We do not sell four different products. We sell **one fabric** with four entry points.

> Every brand is a lens on the same Textus-type database.  
> The brain is the GitHub repository. The repo *is* the machine.

### Terminology note: KnitNet vs KnitWeb

- **KnitWeb** is the woven, peer-to-peer knowledge *web* — the shared graph that emerges when looms gossip and merge signed triples. In the research literature this is the deliberate coinage: a web is alive, a net is static.
- **KnitNet** is the network *protocol* and product brand that makes the weaving happen. In daily language we say KnitNet when we mean the protocol, the network, or the product; we say KnitWeb when we mean the resulting shared knowledge graph.

Both names point to the same fabric; the distinction is only about whether we are talking about the *process/network* (KnitNet) or the *outcome/graph* (KnitWeb).

| Brand | Role | Mental model | Audience |
|-------|------|--------------|----------|
| **Loom** | Personal node / entry point | *Weave your own thread* | Individual users, developers, sovereign agents |
| **KnitNet** | Network protocol | *The woven knowledge network* | Builders of P2P apps, agent swarms, knowledge graphs |
| **Fiber** | Database / fabric layer | *The same fabric underneath* | Architects, DB engineers, enterprises needing a Textus-type store |
| **Plexus** | Historian / lineage layer | *Every thread leaves a trace* | Historians, auditors, archivists, compliance |

All four brands read from and write to the **same fabric**: a content-addressed, CRDT-based, triple-oriented Textus-type database.

---

## The shared fabric

The fabric is the single source of truth:

- **Content-addressed** — every stitch, patch and yarn has a CID.
- **CRDT-mergeable** — patches converge without consensus.
- **Triple-native** — subject-predicate-object is the atomic unit.
- **Offline-first** — each loom owns its local patch and syncs when online.
- **Accountable** — DIDs and signatures, not anonymous hashes.

No brand owns the fabric. Loom uses it locally, KnitNet gossips it, Fiber exposes it as a database, and Plexus archives its history.

---

## Brand 1 — Loom

**Role:** The personal node. A Loom is the client that lets one identity spin up a yarn, weave local patches, and gossip with peers.

**Tagline:** *Weave your own thread.*

**Promise:**

> Run a sovereign knowledge node on your laptop, phone or VPS. Own your yarn. Follow threads you trust. Stay online or offline — the fabric keeps weaving.

**Audience:**

- Individual researchers and note-takers.
- Agent operators who want local memory.
- Developers who need a P2P test node.

**Visual cues:** Vertical threads, a single active yarn, warm amber/orange tones.

**Example URL:** `https://loom-textus.github.io`

---

## Brand 2 — KnitNet

**Role:** The network protocol. KnitNet defines how looms discover, gossip and merge patches into a shared KnitWeb.

**Tagline:** *The woven knowledge network.*

**Promise:**

> A blockless, hashgraph-less P2P network for knowledge. No central index, no global consensus — just signed stitches that weave into a shared graph.

**Audience:**

- Protocol engineers.
- Agent-framework builders.
- Teams building sovereign collaboration tools.

**Visual cues:** Intersecting yarns, net/grid pattern, blue-purple-green gradients.

**Example URL:** `https://knitnet-fabric.github.io`

---

## Brand 3 — Fiber

**Role:** The database / infrastructure layer. Fiber is the Textus-type store underneath every brand.

**Tagline:** *The same fabric underneath.*

**Promise:**

> A triple-native, versioned, content-addressed database. It powers Loom, KnitNet and Plexus with the same storage model and the same query language.

**Audience:**

- Database architects.
- Backend teams who need an embedded graph store.
- Enterprises that want an on-premise knowledge fabric.

**Visual cues:** Fiber strands, data lanes, cyan/teal tones, clean horizontal lines.

**Example URL:** `https://fiber-textus.github.io`

---

## Brand 4 — Plexus

**Role:** The historian / lineage layer. Plexus records how the fabric evolved over time.

**Tagline:** *Every thread leaves a trace.*

**Promise:**

> Browse, audit and replay the history of any yarn. Plexus turns the fabric into a living archive for historians, scientists and compliance officers.

**Audience:**

- Historians and archivists.
- Compliance and audit teams.
- Scientists who need reproducible provenance.

**Visual cues:** Time lines, branching threads, deep purple/gold tones, clock motifs.

**Example URL:** `https://plexus-archive.github.io`

---

## The brain lives in the GitHub repo

The repository is the machine:

- Source code, protocols, papers and deployment scripts live in the repo.
- Releases become installable artifacts.
- Issues and discussions are the public memory.
- The repo is the canonical reference implementation of the fabric.

Each brand website is a **view** of the same brain. They do not fork the code; they fork the narrative.

---

## Naming rules

1. Use **Loom** for personal nodes and client software.
2. Use **KnitNet** for the protocol and the network.
3. Use **Fiber** for storage, indexing and database APIs.
4. Use **Plexus** for history, lineage, archive and replay features.
5. Avoid mixing terms in user-facing copy unless explaining the architecture.

## Color palette

| Brand | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| Loom | `#f59e0b` amber | `#78350f` brown | `#fbbf24` |
| KnitNet | `#2563eb` blue | `#a78bfa` purple | `#22c55e` green |
| Fiber | `#06b6d4` cyan | `#0ea5e9` sky | `#14b8a6` teal |
| Plexus | `#7c3aed` violet | `#d97706` amber/gold | `#ec4899` pink |

All pages share the same dark background (`#050810`) and typography (`Inter` + `Orbitron`) to signal the unified fabric.

---

## Deployment model

Each brand gets its own GitHub account and its own GitHub Pages site. The sites are built from the same `public/` assets but tell a single story.

See [DEPLOY-BRANDS-GITHUB.md](./DEPLOY-BRANDS-GITHUB.md) for the exact steps and scripts.

---

## Future decisions

- Should `Loom` and `KnitNet` share a single landing page for first-time visitors?
- Should `Fiber` expose an interactive query playground on its site?
- Should `Plexus` ship a demo timeline with a real historical dataset?

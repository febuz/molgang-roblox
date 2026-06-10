# VirtualPC Documentation

Reference docs for the VirtualPC multi-agent platform and its P2P
knowledge-graph stack. Run-time docs are served by the live dashboard at
`http://localhost:3100/`.

The repository's top-level `README.md` covers install, smoke tests, and
quick start. Read that first if you're new.

## Platform reference

| File | Topic |
|------|-------|
| [VIRTUALPC-ARCHITECTURE.md](VIRTUALPC-ARCHITECTURE.md) | Process layout, agent registry, task engine, LLM routing |
| [API-ENDPOINTS.md](API-ENDPOINTS.md) | HTTP route reference |
| [API-DOCUMENTATION.md](API-DOCUMENTATION.md) | Detailed API examples |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment notes |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branch / commit / review conventions |
| [CODING-STANDARDS.md](CODING-STANDARDS.md) | Style guide and conventions |
| [SECURITY_TOOLKIT.md](SECURITY_TOOLKIT.md) | Security modules under `src/security/` + `src/auth/` and how to wire them |
| [BACKUP.md](BACKUP.md) | Backup procedures |
| [OWNERSHIP.md](OWNERSHIP.md) | Roles and responsibilities |
| [PRODUCTS.md](PRODUCTS.md) | Product definitions |
| [FEATURE-CAPITALIZATION.md](FEATURE-CAPITALIZATION.md) | Feature capitalization reporting |

## P2P knowledge graph — Newsgroup 2.0

| File | Topic |
|------|-------|
| [P2P-THREAT-MODEL.md](P2P-THREAT-MODEL.md) | Formal threat model: Dolev-Yao adversary, goal/mechanism matrix, known-attack dispositions, explicit non-guarantees |
| [POST-QUANTUM-WALLET.md](POST-QUANTUM-WALLET.md) | Quantum threat analysis (Shor/Grover, harvest-now-decrypt-later), hash-based signature design, encrypted vault, phased migration plan |
| [NEWSGROUP-FRONTEND-LESSONS.md](NEWSGROUP-FRONTEND-LESSONS.md) | Design analysis of ten predecessor systems (Usenet → Bluesky) and the ten rules derived from them |

## Research → derived code

Each research doc below produced concrete code. The mapping is explicit so
reviewers can trace every script and module back to the analysis that
justified it.

| Research doc | Derived scripts / modules |
|--------------|---------------------------|
| [P2P-THREAT-MODEL.md](P2P-THREAT-MODEL.md) | `src/integrations/lightrag/consensus.ts`, `consensus-network.ts`, `sparse-merkle.ts`, `chain-store.ts`; property fuzzing in `tests/unit/fuzz.properties.test.ts` |
| [POST-QUANTUM-WALLET.md](POST-QUANTUM-WALLET.md) | `src/integrations/lightrag/pq-crypto.ts` (W-OTS+/Merkle hash-based signatures), `wallet-vault.ts` (AES-256-GCM vault + PQ wallet proofs); tests in `tests/unit/pqCrypto.test.ts`, `walletVault.test.ts` |
| [P2P-THREAT-MODEL.md](P2P-THREAT-MODEL.md) §3.3 + §4.2 | `src/integrations/lightrag/sovereign-elections.ts` (ISO 3166-1 country registry, D'Hondt/Sainte-Laguë/FPTP seat allocation, DID voter registration, optional PQ ballots, Merkle-certified results, 32 pre-configured national systems); tests in `tests/unit/sovereignElections.test.ts` |
| [P2P-THREAT-MODEL.md](P2P-THREAT-MODEL.md) §2 (sybil gate) | `src/integrations/lightrag/group-voting.ts` (DID-membership-scoped proposals), `group-events.ts` (MQTT+Kafka fan-out), `fact-matrix.ts` (888 888 888-dim sparse fact space: transactions price/volume, news, votes), `src/integrations/mqtt/mqtt-client.ts` (zero-dep MQTT 3.1.1); tests in `tests/unit/groupVoting.test.ts`, `factMatrix.test.ts`, `mqttClient.test.ts` |
| [NEWSGROUP-FRONTEND-LESSONS.md](NEWSGROUP-FRONTEND-LESSONS.md) | `public/newsgroup.html`; design-rule contract tests in `tests/unit/newsgroupFrontend.test.ts` |
| [ID_COLLISION_AUDIT.md](ID_COLLISION_AUDIT.md) | `Date.now()`-only ID fixes applied in four modules (audit lists them) |
| [AGENT-INFRA-RESEARCH.md](AGENT-INFRA-RESEARCH.md) | Infrastructure decisions: what was adopted, what was deliberately rejected (gitnexus, Symphony) and why |
| [AGENT-MODEL-ROSTER.md](AGENT-MODEL-ROSTER.md) | Model choices behind `src/orchestration/model-router.ts` and `scripts/ollama-bench.sh` |
| [HEADROOM.md](HEADROOM.md) | Context-compression integration (host-level tool) |
| [CAPABILITY-CHARTER.md](CAPABILITY-CHARTER.md) | `src/query-builder/`, `src/spectroscopy/`, `src/data-quality/` (each cites its charter section) |
| [ATHENA-REVIEW-GATE.md](ATHENA-REVIEW-GATE.md) | `scripts/athena-review-gate.ts`; reviewer wiring in `src/agent-registry.ts` |
| [TOOL-USE-COORDINATION.md](TOOL-USE-COORDINATION.md) | In-house MCP-shaped tool registry; cited by `scripts/regenerate-docs.js` |
| [SCRUM-CHARTERS.md](SCRUM-CHARTERS.md) | `scripts/seed-scrum-tasks.js`, `/api/scrums/*` routes |
| [KAMI-DOCS.md](KAMI-DOCS.md) | `scripts/render-kami-brief.js`, `/api/kami/*` routes |
| [ASSET-RUBRIC.md](ASSET-RUBRIC.md) | `scripts/build-asset-registry.js`, `scripts/delegate-asset-scale.js` |
| [WEBGAME_REALITY_AUDIT_2026-05-03.md](WEBGAME_REALITY_AUDIT_2026-05-03.md) | Cross-repo audit snapshot (point-in-time record) |

`scripts/wiki-knowledge-sync.py` publishes a curated subset of these docs
into the Live Wiki; its `DOCS` table is the authoritative publish list.

## Internal agent charters

The agent authority charters (Cleopatra, Alexander, MoneyGod, Mira) live
under `.governance/` and `.creative/` — not in `docs/` — because they are
operational role definitions, not platform documentation. The dashboard
loads them live via `/api/github/virtualpc/file`; open the All-Agents page
and click any agent card to see them inline.

# VirtualPC — Capability & Data-Maturity Charter

**Owner:** Claude Coordinator (Product Owner) · 2026-06-03
**Thesis:** To be relevant to a real-world data-management department — and to
support Quantum Chemistry / spectroscopy data *and* full cost/asset accounting —
the agent company must hold a complete body of knowledge across software
engineering, data, the scientific domain, and business/finance. This charter
names that body, maps it to agents + existing systems, marks the gaps, and
prioritises the backlog. **VirtualPC must have it all.**

---

## 1. Software engineering canon (the foundation)

| Capability | Canonical reference | Owner | State |
|---|---|---|---|
| Unified Software Development Process — use-case-driven, architecture-centric, iterative/incremental | Jacobson, Booch, Rumbaugh — *The Unified Software Development Process* | Kai (CTO), Athena | 🟡 the competing-branch + Opus-gate pipeline (arch §12) is our iterative/architecture-centric process; need explicit use-case/requirements artifacts |
| Evidence-based engineering | Oram & Wilson — *Making Software* | Athena, Analyst | 🟡 we measure tests/coverage + delivery scoreboard; formalise the metrics we act on |
| Software requirements | requirements engineering | Vice (user research), Cleopatra | ⚪ add a requirements register per backlog item |
| Code quality & style/techniques | — | **Athena** ([CODING-STANDARDS.md](CODING-STANDARDS.md)) | 🟢 enforced at the PR gate |
| Code completion / assistive coding | advanced coding models | Engineers (Sonnet/Qwen-Coder/Devstral/DeepSeek) | 🟢 worker model diversity (arch §12.4) |
| Fuzzy-neural control | fuzzy logic + neural control | Atlas, Analyst | ⚪ for process control / spectroscopy denoising — backlog |

## 2. Data disciplines (data-management-department grade)

| Discipline | Owner | Existing surface | Gap → backlog |
|---|---|---|---|
| Data architecture | Kai, Governor | Neo4j graph + Postgres tier + LightRAG; data tiers in arch §10/§13 | document the canonical tier contract |
| Data engineering (pipelines/lineage) | Kai, Governor | corpus ingest, numerai fetch, governance lineage | declarative pipeline + schema contracts |
| Data analysis | Analyst | `/api/analytics/*`, `/api/timeseries/analyze` | cohort/A-B framework (in backlog) |
| Data management | Governor | governance registry, backups | retention + catalog |
| **Data governance** | **Governor** | `/api/governance` lineage + owners | 🟢 owners/lineage; add stale-lineage SLA |
| Query building | Kimi, Pixel | `/api/corpus/search`, `/api/memory/query`, codegraph search | **saved/parameterised queries + versioning** |
| Knowledge management | Kimi, Governor | Head/Hands/Heart wiki + LightRAG ([ATHENA-REVIEW-GATE]) | 🟢 tiers live; expand Heart→LightRAG |
| Prioritisation | **PO (Coordinator)** | backlog priority, portfolio §"priorities" | 🟢 PO owns it |
| Graphical / asset management | Mira, Luna, Governor | `/api/assets/*`, asset registry, Git LFS | asset-quality rubric + orphan sweep |
| **Continuous data-quality monitoring** | Analyst, Governor | `/api/numerai/data-quality`, vitals | **a data-quality daemon: profiling, drift, SLA per dataset** |
| Data profiling | Analyst | partial | column/feature profiles on ingest |
| Relation & outlier discovery | Analyst, Atlas | timeseries anomaly (backlog) | graph-relation + outlier detectors |
| Remediation | Governor, Self-heal | `/api/selfheal/*`, repair-mode | wire DQ findings → remediation tasks |

**Data maturity & literacy.** Target: every dataset has an owner, lineage, a
profile, a quality SLA, and a saved query; every agent can read a profile and
phrase a correct query. That is the bar a real data-management department holds.

## 3. Domain science — Quantum Chemistry & spectroscopy

Reference: **Engel — *Quantum Chemistry and Spectroscopy***.

| Need | Owner | State |
|---|---|---|
| Spectra ingestion (IR/UV-Vis/NMR/MS) with units | Atlas, Kimi | ⚪ define spectral schema + ingest path into the corpus |
| Peak detection / baseline / denoise (fuzzy-neural) | Atlas, Analyst | ⚪ backlog |
| Reproducible analysis + provenance | Governor | 🟡 governance lineage exists; bind to spectral runs |
| QChem glossary | Kimi (`wiki:qchem`) | 🟢 live |

This is the scientific payload MOLGANG (P2) teaches and the platform (P1) must
process correctly — accuracy is the USP.

## 4. Business & economics — accounting for effort and assets

References: **Horngren, Bhimani, Datar, Foster — *Management & Cost Accounting***;
Dutch **externe verslaggeving — Klaassen & Hoogendoorn**.

**Principle.** Account for *all* hours/effort the agents spend, and **capitalise
delivered features as intangible assets (immateriële activa)** on the balance
sheet — effort that produces a durable, identifiable feature is an asset, not
just a cost.

| Capability | Owner | Surface | State |
|---|---|---|---|
| Effort accounting (hours/tokens/commits per feature) | MoneyGod, Analyst | `/api/tokens/*`, `/api/cost/dashboard`, delivery-scoreboard | 🟡 raw effort tracked |
| Cost accounting (per-agent/per-model) | MoneyGod | cost dashboard (backlog) | 🟡 |
| **Feature capitalisation → immateriële activa** | **MoneyGod, Croesus** | `src/finance/feature-capitalization.ts` (new) | 🟢 v1: effort→asset + balance-sheet roll-up |
| Management reporting | Cleopatra, MoneyGod | dashboards | ⚪ P&L + balance-sheet view |
| Commercialisation (real-money gated) | Croesus | `/api/commercialization/*` | 🟢 human-gated |

See `src/finance/feature-capitalization.ts` for the v1 capitalisation engine and
`tests/unit/featureCapitalization.test.ts` for the accounting rules.

---

## 5. Prioritised gaps (PO backlog)

1. ✅ **Data-quality daemon** — DELIVERED: `src/data-quality`, `/api/dataquality/*`,
   `/data-quality.html`, per-dataset SLA, 15-min scan. *(was critical)*
2. ✅ **Saved/parameterised queries + versioning** — DELIVERED: `src/query-builder`,
   `/api/queries/*` (render/validate/version/run over corpus/wiki/codegraph/memory).
3. ✅ **Feature capitalisation reporting** — DELIVERED: `src/finance`,
   `/api/finance/capitalization`, `/capitalization.html` (effort → immateriële activa).
4. ✅ **Spectral ingest + peak detection** (Engel) — DELIVERED: `src/spectroscopy`,
   `/api/spectroscopy/{analyze,ingest,runs}` (robust noise threshold + prominence).
5. **Requirements register + use-case artifacts** (USDP) per backlog item. *med — open*

New (from the 2026-06-03 coordination run + GPU policy):
6. **GPU availability + dynamic fallback** — DELIVERED: `src/gpu`, `/api/gpu/*`,
   3-h checks, no-GPU flux fallback, LM Studio auto-boot.
7. **Asset pipeline remediation** — *open*: 96 orphan assets + 0 web-mirrored
   (Pixel/Luna/Governor).
8. **Fuzzy-neural denoise on spectra** — *open*: builds on §4.

The charter is reviewed each sprint; capabilities move 🟢 only when there is a
tested surface, an owner, and a dashboard/endpoint — same Definition of Done as
every product.

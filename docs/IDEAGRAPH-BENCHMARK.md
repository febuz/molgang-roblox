# IdeaGraph Benchmark — why this P2P graph, with numbers

A reproducible benchmark suite that backs the platform's core claim with
measurements instead of adjectives: **one P2P knowledge graph (the
"ideagraph") serves as the shared substrate for unrelated application
domains** — and it does so at speeds, integrity guarantees, and on-chain
footprints that a per-domain stack does not match.

Everything below runs on the production code paths (no mocks) and is
re-verified on every CI run by `tests/unit/ideagraphBenchmark.test.ts`.

```
npx ts-node scripts/run-ideagraph-benchmark.ts          # full scale
npx jest tests/unit/ideagraphBenchmark.test.ts           # CI contract
```

The full-scale run writes `data/benchmarks/ideagraph-benchmark-report.{md,json}`.

## The workload: two real application graphs

### VV graph (Value & Volume) — the financial use case

Dataset: `data/benchmarks/sparse-news-matrix-20k.csv.gz` — a sparse
news-feature matrix for **20 000 companies × 100 trading days** in COO
format (89 591 nonzeros; channels per nonzero: relevance 0–100,
sentiment −100…+100, novelty 0–100, decay 0–1; GICS sector; regime
event tags). The data is synthetic by construction (seed = 42, see the
source workbook's README sheet) with an embedded regime episode:
**days 60–66 = crash** (strongly negative sentiment), **days 70–85 =
capitulation** (sentiment flips positive). That episode is the ground
truth the benchmark must recover.

Each nonzero is encoded into the semantic region of the
888 888 888-dimension fact matrix via `encodeVvCoordinates`: the ticker
axis carries relevance, fixed axes carry sentiment/novelty/decay, and
sector + event tags are categorical dimensions. The encoding is
deterministic (`categoricalDim` is SHA-256 based), so every node maps
the same fact to the same coordinates.

Measured (full fixture, see the generated report for current numbers):

- **Ingest throughput** — ~20 000+ rows/s through the full validation +
  dedupe + event-emit path.
- **Merkle commitment** — one root over all 89 591 facts in ~300 ms,
  **independent of insertion order** (CI-asserted). This root is the
  anchor-able integrity commitment: per the platform's anchoring design
  it can go to Tron every 15 min, Ethereum hourly, and Bitcoin for free
  via OpenTimestamps aggregation.
- **Regime recovery** — decay-weighted mean sentiment per day,
  computed from graph contents alone, finds the crash window (mean
  ≈ −64 vs ≈ +3 normal) and the capitulation flip. The analytic result
  is auditable: every input row is inside the Merkle root.
- **k-NN latency** — cosine similarity over sparse coordinates; linear
  scan today (~120 ms avg at 89k rows), an honest number stated as such
  (see Limitations).
- **Storage** — sparse COO/CSR beats the dense equivalent by ×30 at
  this sample's density and by ~3 orders of magnitude at realistic
  full-ingest density (0.1–0.3%), because a dense 20 000-column matrix
  pays for every empty cell. (A dense layout would not even fit in a
  spreadsheet: 20 000 columns exceeds Excel's 16 384-column limit.)

### ChemGraph — the laboratory / science use case

A compound library (ethanol, benzene, acetone, …) is rendered to
synthetic spectra (Gaussian peaks + noise), pushed through the **real
peak detector** (`src/spectroscopy/peak-detection.ts`: robust
median+MAD noise threshold, prominence filtering), and the detected
peaks are binned to 50 cm⁻¹ buckets as semantic coordinates.

The correctness probe: every compound is re-measured with a held-out
noise seed **and a 10 cm⁻¹ instrument drift**, then the graph is asked
for the probe's nearest neighbour. **Retrieval accuracy@1 = 100%** in
the full run (CI floor: ≥ 75%) at sub-millisecond k-NN latency and
~900 spectra/s end-to-end.

The point is not chemistry per se — it is that adding a science domain
to the platform took **one encoder function** (`encodeSpectrumCoordinates`,
~15 lines). No second database, no second index, no second integrity
mechanism. ChemGraph facts and VV-graph facts coexist in one matrix and
remain cleanly separable (CI-asserted: a spectrum's nearest neighbour is
never a news fact, because unrelated domains share no semantic
dimensions).

### Settlement — the user-facing economics

The same N micro-payments executed two ways on the same value chain:

| | On-chain transfers | Lightning channel |
|---|---|---|
| Throughput | ~4 000 pay/s | ~3 000 pay/s |
| New chain transactions | **N** | **0** |

Raw in-process throughput is comparable — the decisive metric is the
**on-chain footprint**. A channel does all N payments with zero new
chain transfers (open/close are balance events), so the ledger that
every node must store and replay grows O(1) instead of O(N) with user
activity. That is the scalability headroom argument in one number:
**N payments per chain transaction**, where N is bounded only by
channel lifetime.

## Why this matters per audience

**Developers** — one substrate, one API surface. `FactMatrixService`
already carries transactions, news, votes, backlog items, spectra and
market features. A new domain = an encoder function + tests. The
deterministic coordinate scheme means no schema-migration coordination
across nodes, and the benchmark shows the integration cost empirically
(ChemGraph: ~15 lines, 100% retrieval).

**Investors** — the VV graph demonstrates production-scale financial
analytics (20k assets, ~90k facts, regime detection) on infrastructure
whose every output is committed to a Merkle root that can be anchored
to public chains for cents (Tron 15-min cadence) to free (Bitcoin via
OpenTimestamps). Auditability is not a feature roadmap item; it is a
hash anyone can recompute.

**Users** — micropayments settle off-chain at interactive latency with
a constant chain footprint, and the breach-remedy + dispute-window
design (see `lightning.ts`) means off-chain does not mean trust-me.

## Limitations (stated plainly)

- The news matrix fixture is **synthetic** (seed = 42). It demonstrates
  structure, throughput and recoverability — not alpha. Replace the COO
  layer with a real pipeline (FinBERT/NER/entity-linking on
  GDELT/Reuters) for live use.
- k-NN is a **linear scan** — fine at 10⁵ rows (~120 ms), not at 10⁷.
  An ANN index (HNSW/IVF) over the sparse coordinates is the known
  upgrade path; the benchmark records the honest baseline to beat.
- Settlement numbers are **single-process** measurements of protocol
  work (signing, state updates, SMT writes), not network round-trips.
  The on-chain-footprint comparison (N vs 0) is network-independent
  and is the durable claim.
- Dense-vs-sparse compression depends on density: ×30 at this sample's
  ~4.5% effective density, ~×1000 at the 0.1–0.3% density of full-scale
  news ingest.

## Files

| File | Role |
|---|---|
| `src/benchmarks/ideagraph-benchmark.ts` | Scenarios, dataset loader, synthetic generator, report renderer |
| `scripts/run-ideagraph-benchmark.ts` | Full-scale CLI runner |
| `tests/unit/ideagraphBenchmark.test.ts` | CI correctness contract (28 tests) |
| `data/benchmarks/sparse-news-matrix-20k.csv.gz` | VV-graph fixture (89 591 COO nonzeros, gzipped CSV) |
| `data/benchmarks/ideagraph-benchmark-report.{md,json}` | Generated full-scale report |

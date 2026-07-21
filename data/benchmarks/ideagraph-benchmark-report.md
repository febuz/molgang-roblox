# IdeaGraph Benchmark Report

Generated 2026-06-10T17:00:52.807Z on Node v22.22.2 (linux/x64).
Dataset: real sparse-news-matrix-20k fixture (20 000 companies × 100 days, COO).

## For developers — one substrate, real pipelines

| Metric | Value |
|---|---|
| ChemGraph: spectra through peak-detect → encode → ingest | 80 |
| ChemGraph: end-to-end throughput | 931.3 spectra/s |
| ChemGraph: peak detection per spectrum | 0.82 ms |
| ChemGraph: retrieval accuracy@1 (noisy + 10 cm⁻¹ drift probes) | 100% |
| ChemGraph: k-NN query latency | 0.07 ms |

The same `FactMatrixService` API ingests spectra, market news, votes and
backlog items — one deterministic coordinate scheme (`categoricalDim`),
one Merkle commitment, one k-NN. A new domain is an encoder function,
not a new database.

## For investors — the VV graph at production scale

| Metric | Value |
|---|---|
| News nonzeros ingested (20k companies × 100 days) | 89,591 |
| Ingest throughput | 21,698 rows/s |
| Merkle root over the full matrix | 285.4 ms |
| k-NN query (avg / p95 over 100 queries) | 115.93 / 152.87 ms |
| Sparse vs dense storage | 1.08 MB vs 32 MB (×30) |
| Crash regime (days 60–66) decay-weighted sentiment | -64.2 (normal: 3) — detected: true |
| Capitulation flip (days 70–85) | 4.7 — detected: true |

The embedded market-regime episode is recoverable from graph queries
alone, and every row is inside one Merkle root — auditable analytics, not
a black box.

## For users — settlement that scales

| Metric | On-chain | Lightning |
|---|---|---|
| 500 micro-payments | 121 ms | 166 ms |
| Throughput | 4,127 pay/s | 3,006 pay/s |
| New chain transactions | 500 | 0 |

**500 payments per chain transaction** on the
Lightning path: the chain footprint of a payment channel is constant no
matter how many payments flow through it, so user-scale micropayments
do not bloat the ledger every node must replay.

## Matrix root (integrity anchor)

`9ae7f92917b8c26ac0bd3e827096a1980274e80f98f97595faf14135d4b40123`

This root is the anchor-able commitment over all 89,591
ingested facts — the same value every honest node computes regardless of
insertion order.

# Athena Review Gate — the Opus 4.8 PR pipeline

**Owner:** Claude Coordinator (PO/Scrum Master) · reviewer agent: **Athena** 🦉
**Added:** 2026-06-03 · see also [VIRTUALPC-ARCHITECTURE.md §12](VIRTUALPC-ARCHITECTURE.md)

Athena is the single Principal Reviewer in the roster — the only agent on
**Claude Opus 4.8 (max)**. She reviews as the **most-senior PhD-level engineer**
on the team: she will spot any coding mistake, she owns
[CODING-STANDARDS.md](CODING-STANDARDS.md), and she enforces it. Every other
agent runs on a fast/advanced worker model. This is the pipeline she gates.

## The loop (competing branches)

```
 backlog item ─┬─ Engineer A (model X) ─ feat/<item>-A + tests ─ PR A ─┐
               └─ Engineer B (model Y) ─ feat/<item>-B + tests ─ PR B ─┤
                                                                       ▼
                            Athena (Opus 4.8) reviews BOTH branches
                            • runs the WHOLE suite (unit + regression) on each
                            • spots coding mistakes, enforces CODING-STANDARDS
                            • RELAYS the working part of A→B and B→A
                            • approves whatever passes the gate
                                                                       │
                approved branch(es) ─▶ Product Owner completes the one they
                                       prefer (or the only one that works).
                                       Engineer who built it owns completion.
                                       Loser closed — its wins already relayed.
```

At least **two** engineers, on **slightly different advanced coding models**,
build the same feature independently (arch §12.4). Athena reviews every branch
and is a *router of good ideas*, not just a yes/no gate.

## The rule Athena enforces

Athena approves a release candidate **only when all of these hold**:

1. The feature **actually works**.
2. She has **seen the unit + regression suite run on the whole**.
3. There are **zero real regressions** — every failing suite is green or an
   *environmental* integration failure (infra offline, e.g. Kafka
   `KAFKA_DISABLED=1`), never a failing unit suite.
4. The branch **adheres to [CODING-STANDARDS.md](CODING-STANDARDS.md)**
   (`standardsAdhered=false` blocks).
5. Her own review call is **approve**.

Only then does the **Product Owner complete the branch they prefer** among the
approved ones, and the engineer who built it owns that backlog item. Otherwise
feedback (plus the cross-relayed wins from the sibling branch) goes back and the
engineer improves the branch.

The rule lives as pure, unit-tested logic in
[`src/review/athena-gate.ts`](../src/review/athena-gate.ts) (`decideGate`), with
tests in `tests/unit/athenaGate.test.ts` — so the gate cannot silently drift.

## Workload balance

The PO keeps builds balanced and tracks per-worker delivery via
`scripts/worker-delivery-overview.ts` (logic + tests:
`src/review/delivery-scoreboard.ts`). The least-loaded eligible engineer is the
suggested next assignee.

## Running it

```bash
# Stage 1 — build the review packet + run the whole suite
ts-node scripts/athena-review-gate.ts --base vpc/master --head HEAD
#   → writes /tmp/athena-review-packet.json for Athena (Opus) to review

# Stage 2/3 — apply Athena's verdict, post feedback, complete the item on approval
ts-node scripts/athena-review-gate.ts --verdict /tmp/athena-verdict.json --apply

# Per-worker delivery + balance overview
ts-node scripts/worker-delivery-overview.ts
```

`athena-verdict.json` is Athena's structured call:

```json
{ "featureWorks": true, "reviewedTests": true, "standardsAdhered": true,
  "approve": true, "feedback": ["B's persistence layer is cleaner — A should adopt it"] }
```

The runner **never pushes to GitHub itself** — on approval it prints the release
command for the Product Owner's explicit step.

## Why Opus for the gate, advanced workers for the build

A spread of fast advanced coding models builds well-scoped backlog items at
volume and from different angles; Opus 4.8 is the deeper PhD-grade reviewer that
catches what a builder, close to its own code, misses — and it is the *one* place
we spend the premium tier. One reviewer, many builders: cost stays bounded, the
quality bar stays high.

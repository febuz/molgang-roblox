# Athena Review Gate — the Opus 4.8 PR pipeline

**Owner:** Claude Coordinator (PO/Scrum Master) · reviewer agent: **Athena** 🦉
**Added:** 2026-06-03

Athena is the single Principal Reviewer in the roster — the only agent that
runs on **Claude Opus 4.8 (max)**; every other agent runs on **Claude Sonnet**.
This is the pipeline she gates.

## The loop

```
 Sonnet engineer agent ──build feature on a branch──▶ open PR
        ▲                                                │
        │ improve the branch                             ▼
        │                                   ┌─ run WHOLE jest suite (unit+regression)
   feedback (forum/cross)                   │
        │                                   ▼
        └──────────  Athena (Opus 4.8) reviews diff + test results
                                            │
                         ┌──────────────────┴───────────────────┐
                  CHANGES REQUESTED                          APPROVED
                  (blocking items)                  (working feature + green suite)
                                                            │
                                            engineer completes the backlog item
                                                            │
                                                     release to GitHub
```

## The rule Athena enforces

Athena approves a release candidate **only when all of these hold**:

1. The feature **actually works** (she judged it from the diff/behaviour).
2. She has **seen the unit + regression suite run on the whole**.
3. There are **zero real regressions** — every failing suite is either green or
   an *environmental* integration failure (infra offline, e.g. Kafka
   `KAFKA_DISABLED=1`), never a failing unit suite.
4. Her own review call is **approve** (not request-changes).

Only then does the **engineer who built it complete the backlog item**, and the
branch is released. Otherwise feedback is posted to `/api/forum/cross` and the
Sonnet engineer improves the branch.

The rule lives as pure, unit-tested logic in
[`src/review/athena-gate.ts`](../src/review/athena-gate.ts) (`decideGate`), with
14 tests in `tests/unit/athenaGate.test.ts` — so the gate cannot silently drift.

## Running it

```bash
# Stage 1 — build the review packet + run the whole suite
ts-node scripts/athena-review-gate.ts --base vpc/master --head HEAD
#   → writes /tmp/athena-review-packet.json for Athena (Opus) to review

# Stage 2/3 — apply Athena's verdict, post feedback, and (if approved) complete items
ts-node scripts/athena-review-gate.ts --verdict /tmp/athena-verdict.json --apply
```

`athena-verdict.json` is Athena's structured call:

```json
{ "featureWorks": true, "reviewedTests": true, "approve": true,
  "feedback": ["nit: tighten the error message in X"] }
```

The runner **never pushes to GitHub itself** — on approval it prints the
`git push vpc HEAD:master` release command for an explicit human/operator step.

## Why Opus for the gate, Sonnet for the build

Sonnet is fast and strong enough to implement well-scoped backlog items at
volume; Opus 4.8 is the deeper reviewer that catches what a builder, close to
its own code, misses — and it is the *one* place we spend the premium tier. One
reviewer, many builders: the cost stays bounded while the quality bar stays high.

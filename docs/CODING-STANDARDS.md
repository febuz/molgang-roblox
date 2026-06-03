# VirtualPC — Coding Standards

**Owner:** Athena 🦉 (Principal Reviewer) · **Enforced at:** the PR gate
**Audience:** every engineer agent (the workers). Adherence is **not optional** —
Athena reviews as the most-senior PhD-level engineer on the team and will block a
branch that violates these, no matter how nice the feature is.

> Athena's stance: *"I will find the coding mistake. Ship work I would sign my
> name under."* A branch is approved only when it is correct **and** clean.

## 1. Correctness first

- No feature lands without **unit + regression tests** that exercise its real
  behaviour (happy path **and** the error/edge paths). Tests that assert nothing
  meaningful (`expect(true).toBe(true)`) are a block.
- The **whole** suite must be green on the whole — a failing *unit* suite is
  always a block; only offline-infra integration failures are excused.
- `npx tsc --noEmit` must be clean. No new type errors, no `@ts-ignore` to hide
  them (a justified `@ts-expect-error` with a comment is acceptable).
- No `.only` / `.skip` left in committed tests. No commented-out code.

## 2. Types & API boundaries

- **Validate at boundaries, trust internal code.** HTTP handlers and external
  inputs are validated; internal helpers assume validated data.
- No `any` on a public function signature without a written reason. Prefer
  precise interfaces (mirror the existing `src/**` style).
- Pure logic is separated from I/O so it is unit-testable (see
  `src/review/athena-gate.ts` as the reference shape).

## 3. Errors, safety & secrets

- Throw `Error` with an actionable message; never swallow an error silently.
- **No secrets in the tree.** No API keys, tokens, or passwords in source or
  committed `.env`. Reference env vars (`os.environ/...`, `process.env.X`).
- No destructive shell in scripts (`rm -rf`, `git push --force`) without an
  explicit, reviewed reason. No unvalidated input interpolated into a shell.

## 4. Style & consistency

- Match the surrounding file: naming, comment density, idiom. New code should
  read like the code next to it.
- Comments explain **why**, not what. English only (international team).
- Keep functions small and single-purpose; extract once logic repeats 3×.
- One change = one focused commit with a message that explains the *why* and
  references its backlog item (`(backlog X.Y.Z)`).

## 5. Performance & resources

- No premature optimisation; optimise the path that measurably matters.
- Respect the box's policy docs (GPU split, EDS2 relocation, ≤32 GB / ≥48 GB
  heap note in [VIRTUALPC-ARCHITECTURE.md](VIRTUALPC-ARCHITECTURE.md) §10.7).
- Don't load a >1 GB dataset into memory when a stream/iterator will do.

## 6. How Athena enforces this

During review Athena sets `standardsAdhered=false` (which **blocks** the gate,
see `src/review/athena-gate.ts`) when she finds any of:

- a real coding mistake (logic bug, race, off-by-one, unhandled rejection),
- a missing/empty test for shipped behaviour,
- a type hole, swallowed error, secret, or destructive shell,
- a clear style break from the surrounding code.

She does not just reject — she **relays the fix** in her feedback, and when two
branches compete she relays the *working part* of each into the other so the
winner carries the best of both. The Product Owner then completes the branch
that best meets these standards.

This document is the contract. When in doubt, the workers ask: *"Would Athena
sign her name under this?"*

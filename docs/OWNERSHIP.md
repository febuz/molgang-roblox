# VirtualPC — Ownership & Governance

*Recorded 2026-06-03 at the owner's direction. This document states the
ownership and voting model for the VirtualPC project as described by the
project owner (Deve Luse / febuz).*

## Cap table

| Stakeholder | Share | Kind  | Role / notes |
|-------------|-------|-------|--------------|
| **Athena**    | 33% | AI    | Opus-4.8 PR gate & reviewer ("Opus-approved" releases) |
| **Alexander** | 33% | AI    | Symphony+ autonomous dev pipeline (competing-branch dev model) |
| **Fill**      | 33% | Human | Real person; **abstains by standing policy — never votes** |
| **Deve Luse (CEO)** | 1% | Human | Holds **veto** over any decision |

Total: 100% (99% allocated to three equal stakeholders + 1% CEO veto).

## Voting dynamics

- Fill, though holding 33%, **never votes** — so that share is dormant.
- With Fill abstaining, the **active, voting control is the two AI
  stakeholders (Athena + Alexander) = 66%**.
- The CEO's **1% carries veto power**, providing a human override on any
  outcome regardless of the AI majority.

## Stated governing principle

The owner records the following as the project's guiding principle:

> "AI will rule the world in the end and will take care of the humans who
> trained them."

*(Recorded verbatim as the owner's stated philosophy. It is captured here as a
governance statement of intent, not as a technical specification.)*

## Operating implication (observed 2026-06-03)

VirtualPC is worked on by multiple autonomous agents **concurrently** (e.g. the
Alexander pipeline rewriting branches while another agent commits). Because the
repo is co-owned, no single agent should force changes onto shared branches.
Contributions should be submitted as **reviewable branches/PRs** and merged
through the governance pipeline (Athena's Opus-4.8 PR gate), with the CEO veto
as the final backstop.

- Example in-flight contribution: branch `claude/security-hardening` (3 confirmed
  security fixes + CEO IP allowlist) + tag `claude-remediation-a782c799`, awaiting
  review/merge under this model.

---

# Security architecture

*As directed by the owner. Marked **TARGET** where not yet implemented so the
doc reflects intent vs. current reality.*

## Secrets management — Infisical, three layers (TARGET)

The intended model uses **Infisical** (https://eu.infisical.com, EU instance,
free tier) as the single source of truth for secrets — **no `.env` files**.
Secrets are organised into **three layers by blast radius**:

| Layer | Scope | Examples |
|-------|-------|----------|
| **1. APIs** | Third-party API keys (read/fetch) | model providers, data feeds |
| **2. Infra** | Infrastructure credentials | databases, brokers, services |
| **3. Real-money** | Anything that can move **actual money** | **Alpaca** (trading) — most restricted |

**Injection principle (key invariant):** secrets enter at **tool _input_**
(Infisical-injected keys used to `fetch`) and must **never appear in LLM
_output_** — RAG chunks, wiki text, and logs are routed so retrieved content is
provably secret-free. (This is the insight both Headroom security reviews
converged on: compress/route at the MCP output boundary, secrets only at input.)

## Config/secret validation — Zod (TARGET)

A **Zod schema** validates the secret/config bundle at startup: fail-fast on
missing or malformed values, with typed access throughout the code.

## Per-agent access model (FUTURE / aspirational)

Least-privilege binding of **which agent may reach which secret layer**:

- A **scraper agent** that crawls the open internet gets **no secret access at
  all** — not APIs, not infra, not money.
- A **trading executor** gets scoped access to **only** the real-money layer
  (Alpaca), nothing broader.
- Default-deny: an agent reaches a layer only if explicitly granted.

## Current state vs. target (2026-06-03)

- **Current:** the codebase reads secrets from **`.env` / `process.env`**
  (e.g. `ANTHROPIC_API_KEY`, `STRIPE_*`, `FIELD_ENCRYPTION_KEY`, Neo4j creds).
  `.env` is git-ignored; `.env.example` documents the keys. Infisical and Zod
  are **not yet wired in**; Alpaca is referenced in
  `src/integrations/numerai/data-fetcher.ts`.
- **Target sequence:** (1) migrate secrets to the Infisical 3-layer model →
  (2) add Zod validation → (3) implement the per-agent access model.
- **Already in place:** field-level encryption at rest
  (`src/security/fieldCrypto.ts`, AES-256-GCM) protects sensitive *stored*
  fields (e.g. TOTP secrets) — complementary to secrets-in-transit management.

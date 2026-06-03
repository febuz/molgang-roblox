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

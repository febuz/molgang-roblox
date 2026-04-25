# Important Files — Fill's curated list

**Maintainer:** Fill (CEO)  
**Policy:** Any PR touching a file on this list requires Fill's primary review. Kai handles the heavy-lifting review of everything else on a best-effort basis. Alexander arbitrates on cross-cutting architectural decisions.

---

## Tier 1 — Critical runtime surface

These files are load-bearing for the VirtualPC dashboard and the agent system. Break one and the demo breaks.

| Path | Why it matters |
|---|---|
| `src/index.ts` | HTTP server entry; every endpoint is declared here |
| `src/task-engine.ts` | Agent task pools, tick loop, work log, CLI synth, social feed — the heart of VirtualPC |
| `src/commits-tracker.ts` | Git attribution + commits-overview backend |
| `src/token-tracker.ts` | Per-agent token accounting and tier routing |
| `dist/public/index.html` | Dashboard UI — the file users actually see |

## Tier 2 — Game surface

| Path | Why it matters |
|---|---|
| `public/game.html` | 2D zone-based MOLGANG web game |
| `public/game3d.html` | 3D open-world game (GTA-style) |
| `public/game-rts.html` | RTS factory builder mode |

## Tier 3 — Infrastructure & integration

| Path | Why it matters |
|---|---|
| `deploy/docker-compose.yml` | Dev stack |
| `deploy/docker-compose.gpu.yml` | GPU-enabled production stack |
| `deploy/Dockerfile` / `deploy/Dockerfile.gpu` | Build targets |
| `package.json` | Dependency contract |
| `tsconfig.json` | Compiler contract |
| `src/auth/**` | Authentication — do not break |
| `src/integrations/lightrag/**` | LightRAG / Neo4j knowledge graph |

## Tier 4 — Configuration & docs that drive decisions

| Path | Why it matters |
|---|---|
| `CLEOPATRA-AUTHORITY.md` | Executive authority charter |
| `ALEXANDER-PRINCIPLES.md` | Technical arbitration heuristics |
| `docs/VIRTUALPC-ARCHITECTURE.md` | System architecture of record |
| `docs/CHEMICAL-ENGINEERING-GAME-ENGINE.md` | Game engine roadmap |
| `docs/ENGINEER-SETUP-GUIDE.md` | Onboarding contract |
| `docs/important-files.md` | This file |

---

## Review rubric

When Fill reviews a change on this list, he checks:

1. **Correctness** — does the change do what the PR claims?
2. **Scope** — is the diff contained to the stated task, or has scope crept?
3. **Tests** — Tier 1 and Tier 2 changes require test coverage; escalate to Alexander if absent.
4. **Performance** — Tier 1 changes that affect the tick loop, HTTP hot path, or database queries need a latency note.
5. **Security** — any change touching auth, payments, user data requires dual sign-off with Cleopatra (per `CLEOPATRA-AUTHORITY.md`).
6. **Backwards compat** — public API paths under `/api/*` are contracts. Break only with a deprecation window.

## How this list is maintained

- Fill refreshes the list quarterly.
- Anyone can propose additions via PR; Fill approves or declines with a one-line reason.
- Removals require Cleopatra's sign-off (decommissioning a critical path is itself a critical decision).

## How to attribute your PR

Commits should use conventional format. When a PR touches a Tier 1 file:

```
fix(task-engine): resolve infinite loop in tickEngine

[...]

Co-Authored-By: Fill <fill@virtualpc.local>
Reviewed-By: Fill
```

The `Co-Authored-By` trailer surfaces you on the Commits page; the `Reviewed-By` closes the review loop.

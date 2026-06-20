# Agent infrastructure — research notes (May 2026)

Triggered by the user ask: *"Continue making sure all infrastructure and
also knowledge data infrastructure is improved. Also integrate gitnexus
and research if symphony is needed for better agent orchestration."*

This doc records what I evaluated, what I shipped, and what I deliberately
did not adopt — so a future maintainer doesn't re-litigate the same calls.

---

## Symphony — researched, not adopted

**What it is.** OpenAI released [Symphony](https://github.com/openai/symphony)
in April 2026 — a spec (not a runtime) for orchestrating coding agents on
issue-tracker queues. The reference implementation is Elixir; Codex has
since produced TypeScript / Python / Rust ports of the spec.

**Core ideas worth borrowing:**
- **Per-issue isolated workspaces.** Every queued issue gets its own clean
  git worktree. Agent commands run only inside that workspace.
- **WORKFLOW.md in-repo.** The agent prompt + runtime settings are versioned
  with the project, not stored in the orchestrator.
- **Polled cadence + bounded concurrency** with retries and authoritative
  orchestrator state. Decides which issues to dispatch / retry / release.

**Why not adopting it now:**
1. virtualpc already has an agent task engine. Symphony would replace it,
   not augment it.
2. The spec assumes Linear / GitHub Issues as the work source. virtualpc's
   `tasks[]` and `addTask()` API is the equivalent surface; rewiring to
   Linear is real work for ~14 active items.
3. Reference impl is Elixir; the TypeScript ports are <1 month old (April
   2026). Adoption risk is non-trivial.
4. Microsoft Agent Framework 1.0 (also April 2026) is a competing
   orchestration story — wait until one wins or fork the patterns we want.

**What we did borrow:**
- The "save-on-mutation, restart-safely" idea — `addTask`/`setTaskStatus`/
  `setTaskPriority` now mark dirty so the periodic save catches them; save
  interval reduced from 30 s → 5 s so a SIGKILL-after-SIGTERM (observed:
  the 68 MB snapshot was timing out the systemd shutdown grace period)
  loses at most 5 s of work. The unconditional save in the SIGTERM handler
  is still there; the dirty flag covers the case where systemd escalates
  to SIGKILL before the handler completes.
- The fan-in / fan-out idea (Symphony surfaces it for orchestrator-state
  health) → exposed at `/api/codegraph/dependencies` so agents can ask
  "what depends on logger.ts" before changing it.

If/when virtualpc grows past ~50 active queued tasks across multiple
repos, **Symphony adoption gets serious consideration**. Below that, the
infrastructure cost outweighs the orchestration benefit.

References: [SPEC.md](https://github.com/openai/symphony/blob/main/SPEC.md),
[OpenAI announcement](https://openai.com/index/open-source-codex-orchestration-symphony/),
[InfoWorld writeup](https://www.infoworld.com/article/4164173/openais-symphony-spec-pushes-coding-agents-from-prompts-to-orchestration.html).

---

## GitNexus — adapter shipped, binary not adopted

**What it is.** GitNexus is a structural code-graph tool — Tree-sitter-backed
indexing of symbols, call chains, file imports. The user's earlier ask
mentioned "integrate gitnexus" specifically.

**State on this box:** binary not installed; npm package `@gitnexus/cli`
returns 404 on the registry. Couldn't find a clean install path.

**What we shipped instead** (May 1 commit `03ac6112`, extended today):
A zero-dependency in-process code-graph adapter at
`src/integrations/codegraph/index.ts`. It walks `src/**.ts`, extracts:

- Per-file: exports (function/class/const/interface/type/enum), imports
  (resolved against the project tree, not raw "./foo" strings), local
  function declarations.
- Per-symbol: list of files that mention it (textual references).
- **NEW today**: cross-file dependency graph (`dependencies` + `importedBy`)
  with proper relative-path resolution. Same shape GitNexus surfaces.

Endpoints:

| Endpoint                              | Purpose                             |
|---------------------------------------|-------------------------------------|
| `GET  /api/codegraph/stats`           | summary counts                      |
| `POST /api/codegraph/rebuild`         | force a fresh build                 |
| `GET  /api/codegraph/symbol/:name`    | definitions + referenced-by         |
| `GET  /api/codegraph/file?path=X`     | file record + deps + importedBy     |
| `GET  /api/codegraph/search?q=…`      | substring symbol search             |
| `GET  /api/codegraph/dependencies`    | fan-in / fan-out (whole graph)      |
| `GET  /api/codegraph/dependencies?path=X` | per-file imports + importedBy   |

If real GitNexus becomes available later, swap drivers in this one file —
the response shape is compatible.

Live numbers (76 files indexed):
- 343 symbols, 267 exported
- 129 import edges
- top fan-in: `utils/logger.ts` at 42 importers
- top fan-out: `index.ts` at 50 imports

---

## LightRAG — running offline-mode

Neo4j (port 7687) is not bound on this box. The LightRAG client ships with
graceful in-memory fallback (commit history shows the fix went in earlier).
Adding a real Neo4j is its own piece of work; the offline-mode covers the
current usage (a few writes per session, no cross-session graph queries).

To enable: `docker run -d --name molgang-neo4j -p 7687:7687 -p 7474:7474
-e NEO4J_AUTH=neo4j/test neo4j:5`. Then `LIGHTRAG_NEO4J_URI=bolt://...` in
the virtualpc env file. The client connects automatically on next restart.

---

## What the autoexec layer would actually look like

The 14 delegated roadmap tasks won't progress on their own. A real autoexec
layer would need:

1. **Workspace isolation** (Symphony pattern): per-task git worktree with
   the right branch, so two agents can't stomp each other's edits.
2. **Tool-use harness** wrapping `lmstudio.chatAsAgent`: tools = read-file,
   write-file, run-bash, git-commit, git-push. Sandboxed (no network outside
   approved hosts; no `rm -rf` on parents).
3. **Approval gates** for anything that mutates state outside the workspace
   (push to main, publish package, etc.). CCR routines already do this for
   the existing sync routine; same pattern can apply.
4. **Replay / observability**: every tool call recorded to `cli-log` and
   indexed in LightRAG for "what did Atlas actually do last week".

This is multi-week work. The current path — agents queue tasks visibly,
human-driven sessions resolve them, sync routine keeps repos aligned — is
the realistic shape until that infra exists.

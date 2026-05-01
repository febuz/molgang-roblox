# VirtualPC — Architecture

**Status:** Production
**Repo:** `github.com/febuz/virtualpc`

VirtualPC is a project-agnostic multi-agent orchestration backend. It is the
platform; whatever your team is building plugs into it through the task
engine and the LiteLLM gateway. There are no domain-specific assumptions in
the core — agents, tasks, models, and dashboards are all pluggable.

---

## 1. Process layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser  →  http://localhost:3100                               │
│            │                                                     │
│            ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  virtualpc.service  (node dist/index.js)                    │ │
│  │  • Express HTTP + Socket.IO                                 │ │
│  │  • TaskEngine (in-memory, persisted JSONL)                  │ │
│  │  • Agent registry (single source of truth)                  │ │
│  │  • Vitals / Auto-update / Audit / Auth                      │ │
│  └────────┬─────────────────────────┬──────────────────────────┘ │
│           │                         │                            │
│           ▼                         ▼                            │
│  ┌──────────────────┐   ┌──────────────────────────────────┐     │
│  │ LiteLLM gateway  │   │  Local services                  │     │
│  │ 127.0.0.1:4000   │   │  • Redis (cache, queues)         │     │
│  │ • LM Studio      │   │  • Neo4j (LightRAG, optional)    │     │
│  │ • Cloud APIs     │   │  • Kafka (eventing, optional)    │     │
│  └──────────────────┘   └──────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

All three systemd user units (`virtualpc.service`,
`virtualpc-litellm.service`, `virtualpc-auto-update.timer`) are installed by
`scripts/install-systemd.sh`. Their unit files live in `deploy/systemd/`.

---

## 2. Agent registry — single source of truth

`src/agent-registry.ts` exports `AGENT_META` — the canonical list of agents.
Every other module (task engine, token tracker, dashboard, social roster,
LLM router) imports from this one file. Add an agent here and every dashboard
picks them up automatically.

The roster currently ships 14 personas, grouped into four kinds:

| Kind         | Agents                                         |
|--------------|------------------------------------------------|
| `core`       | Fill, Kai, Zip, Mira, Luna                     |
| `decision`   | Cleopatra, Alexander, MoneyGod                 |
| `resource`   | Analyst, VideoProducer                         |
| `specialist` | Vice, Atlas, Kimi, Croesus                     |

Each entry carries: `name`, `role`, `avatar`, `color`, `kind`, and a list
of preferred model substrings used by the LLM router for routing decisions.

Persona prompts (drafted by the local Gemma 4 model) live in
`data/agent-prompts.json` and surface in the dashboard's All-Agents page
via `/api/agents/overview` and `/api/agents/:name/prompt`.

---

## 3. Task engine

`src/task-engine.ts` is a single-process, in-memory task store with
JSONL persistence (`logs/work-log.jsonl`). It owns:

- **Tasks** — id, title, status (`pending`/`in-progress`/`completed`),
  priority (`critical`/`high`/`medium`/`low`), assigned_to, subtasks,
  progress.
- **Proposals** — agent-to-agent inbox/outbox messages.
- **Artifacts** — outputs from real LM Studio runs.
- **Work log** — every subtask completion timestamp + minutes-spent record.

The engine ticks every few seconds (`tickEngine()`), nudging in-progress
tasks forward and emitting CLI-log lines per agent that drive the
dashboard's live activity feed.

Mutators exposed through HTTP:

| Endpoint                              | Effect                              |
|---------------------------------------|-------------------------------------|
| `POST /api/backlog/:id/status`        | flip pending↔in-progress↔completed  |
| `POST /api/backlog/:id/priority`      | change priority tier                |
| `GET  /api/backlog/per-person`        | full per-agent task tree            |
| `GET  /api/agents/:name/inbox`        | proposals received                  |
| `GET  /api/agents/:name/outbox`       | proposals sent                      |
| `GET  /api/agents/:name/cli-log`      | recent CLI activity                 |

---

## 4. LLM routing

`src/lmstudio.ts` and `src/orchestration/model-router.ts` form a 3-tier
router:

- **Tier 1 (free, local)** — phi-4, gemma-4-26b, deepseek-r1, qwen3.5-27b,
  devstral. Runs on LM Studio at `127.0.0.1:1234`.
- **Tier 2 (low-cost cloud)** — Mistral 7B, Llama 70B.
- **Tier 3 (premium cloud)** — Claude Opus, GPT-4-class.

All requests funnel through the LiteLLM gateway at `127.0.0.1:4000` so the
TypeScript code only ever talks to one OpenAI-compatible endpoint. Routes
are picked per-agent (each agent has a preferred model list in
`AGENT_MODEL_ROUTES`) and per-task-type (`TASK_TYPE_ROUTES` — `concept`
goes to Gemma 4, `code` to Devstral, `reasoning` to DeepSeek-R1, etc.).

If a 26B model fails to load under memory pressure, the router falls
back to phi-4 automatically and logs the substitution.

---

## 5. HTTP surface

```
GET  /                         → public/dashboard.html (live)
GET  /agents.html              → All-Agents overview (14 cards)
GET  /vitals.html              → GPU + service vitals
GET  /api/health               → liveness probe
GET  /api/agents/overview      → roster + activity + persona previews
GET  /api/agents/:name/prompt  → full persona + runtime system prompt
POST /api/llm/chat             → OpenAI-compatible chat for any agent
GET  /api/backlog              → all tasks
GET  /api/backlog/per-person   → grouped per agent
GET  /api/vitals/auto-update   → systemd timer state
GET  /api/github/virtualpc/list  → list files in .backlog / .governance / etc.
GET  /api/github/virtualpc/file  → fetch a knowledge-dir markdown file
```

150+ routes total at present.

---

## 5b. Dual-graph context layer (codegraph + LightRAG)

VirtualPC pairs two graphs so agents have both **structural** and
**semantic** lenses on the codebase without loading the whole repo into a
prompt every time:

| Graph              | Layer       | Source                          | Answers                                        |
|--------------------|-------------|---------------------------------|------------------------------------------------|
| `codegraph`        | structural  | `src/**.ts` (regex-based AST)   | "Where is X defined?" "Who calls X?"           |
| LightRAG (Neo4j)   | semantic    | docs, comments, READMEs         | "Why is this done this way?"                   |

The codegraph adapter (`src/integrations/codegraph/`) is a zero-dep
TypeScript indexer. It walks `src/**.ts`, extracts exported symbols,
imports per file, and a coarse references map. ~250 ms first build, cached
for 30 minutes at `data/codegraph.json`. Endpoints:

```
GET  /api/codegraph/stats           summary: counts per kind
POST /api/codegraph/rebuild         force a full rebuild
GET  /api/codegraph/symbol/:name    definitions + referencedBy
GET  /api/codegraph/file?path=X     full file record
GET  /api/codegraph/search?q=…      substring symbol search
```

The adapter is GitNexus-compatible — when a real GitNexus CLI ships, the
internal driver swaps in one function without changing the response shape.

LightRAG (`src/integrations/lightrag/`) is the existing Neo4j-backed
semantic graph; it gracefully degrades to in-memory mode when Neo4j isn't
available, so VirtualPC never hard-fails on a missing optional service.

## 5c. Auto-research loop (Karpathy-style)

The four research-flavored agents (Vice, Kimi, Analyst, Atlas) can
delegate questions to a multi-step loop on local Gemma 4. The loop is in
`src/integrations/autoresearch/`:

1. **Plan** — Gemma 4 lists 3-5 sub-questions worth answering.
2. **Probe** — for each sub-question, hit a context source (`codegraph`,
   `lightrag`, or caller-supplied `static`).
3. **Synthesize** — fuse all evidence into a final write-up.
4. **Critique** — Gemma 4 reviews its own draft; if it finds gaps,
   recursion (depth-capped).

Endpoints:

```
POST /api/autoresearch              run the loop for an agent
GET  /api/autoresearch/agents       allowlist of research agents
```

Pure-local: every hop runs on Gemma 4 26B via the LiteLLM gateway. Zero
API credits, ~30-90 s per query for a 4-sub-question loop.

---

## 6. Persistence

| Store                    | Role                                          |
|--------------------------|-----------------------------------------------|
| `logs/work-log.jsonl`    | append-only log of every subtask completion  |
| `data/agent-prompts.json`| persona prompts drafted by Gemma 4            |
| `dist/` (gitignored)     | compiled TS output                            |
| `EDS2:/virtualpc/cache/` | LM Studio model cache, large blobs            |
| Redis                    | hot caches, rate limits                       |
| Neo4j (optional)         | LightRAG knowledge graph; offline-fallback   |

The task engine intentionally does **not** persist tasks themselves to disk
— restarting the service re-seeds from the example task pool in
`task-engine.ts`. Production deployments should swap that for a database
hookup (the engine's mutators are isolated functions; redirecting them at
Postgres or DynamoDB is a one-file change).

---

## 7. Auth & audit

- `src/auth/` — login, sessions, role-based dashboards. Roles: `ceo`,
  `cto`, `economy`, `creative`, `developer`, `viewer`. Specialist
  dashboards expose only the routes their role can read.
- `src/security/audit-logger.ts` — every mutation is logged with actor,
  IP, timestamp, target.
- `src/commit-audit.ts` — every git commit since installation is recorded
  and linked back to the task it delivered (when titles match).

---

## 8. Auto-update

`scripts/auto-update.sh` is the systemd timer's payload. Every 15 minutes
it:

1. `git fetch origin master`
2. If the working tree is clean and there's something to pull, `git pull`.
3. If `package.json` or any TypeScript file changed, `npm ci` then
   `npm run build`.
4. If `dist/` changed, `systemctl --user restart virtualpc.service`.

It refuses to act on a dirty or diverged tree; an out-of-band manual fix
is required in those cases. State is exposed at `/api/vitals/auto-update`.

---

## 9. Adding a new agent

1. Append to `AGENT_META` in `src/agent-registry.ts` (name, role, avatar,
   color, kind, models).
2. Optionally seed a few example tasks for them in `task-engine.ts`.
3. Run `node scripts/delegate-build-overview.js` to have Gemma 4 draft a
   persona prompt; output goes to `data/agent-prompts.json`.
4. Restart the service. The All-Agents grid, the sidebar nav and the
   per-agent detail panel all pick up the new agent automatically.

No other files need editing.

---

## 10. Adding a new dashboard route

All dashboard pages are static HTML in `public/`, served by the Express
static middleware. The dashboard navigates between sections by toggling
`.content-section.active` — no SPA framework, no build step for the UI.

To add a new section:
1. Add a `<div class="nav-item" data-page="myroute">` to the sidebar.
2. Add a `<div class="content-section" id="myroute">` with the body.
3. If the section needs live data, fetch from a `/api/...` endpoint in
   the existing `<script>` block.

That's the whole frontend pattern.

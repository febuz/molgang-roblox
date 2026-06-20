# VirtualPC — Top 120 Issues + 40 Backlog Features

> Generated from a codebase-wide audit (`src/`, `scripts/`, `tests/`, `deploy/`, `public/`, `docs/`).
> Use this as a hand-off list for the next agent.

---

## Legend

| Severity | Meaning |
|----------|---------|
| **P0** | Security, data-loss, auth bypass, or production crash risk |
| **P1** | Broken core feature, hardcoded production dependency, or major reliability issue |
| **P2** | Missing/wired feature, stale mock data, or docs/code mismatch |
| **P3** | Tech debt, polish, test coverage, or developer-experience |

---

# Part 1 — Top 120 Issues

## 🔐 Auth / Security (P0–P1)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 1 | ✅ DONE | `src/index.ts` | 1061–1071 | `privilegedActor()` trusts `X-Approver` header from `localhost` instead of role-based auth for approve/reject/execute spend routes. | DONE: verifies Bearer session token + ceo/cto role; header path gated behind `ALLOW_HEADER_APPROVER=1` and disabled in production. |
| 2 | ✅ DONE | `src/auth/auth-system.ts` | 188, 197, 206, 215, 224 | Default privileged users have hardcoded plaintext passwords (`ceo123`, `kai123`, etc.). | DONE: seed passwords from `SEED_<ROLE>_PASSWORD` or random + one-time log; demo passwords only under `NODE_ENV=test`/`ALLOW_DEMO_PASSWORDS=1`. |
| 3 | P0 | `deploy/k8s-deployment.yaml` | 36–38 | Placeholder secrets committed: `JWT_SECRET`, `ANTHROPIC_API_KEY`, `DATABASE_PASSWORD`. | Use external secrets manager / Sealed Secrets / env injection. |
| 4 | ✅ DONE | `.env.example` | 11, 23, 30, 53, 57 | Insecure defaults: `NEO4J_PASSWORD=password`, `JWT_SECRET=your-super-secret...`, empty `REDIS_PASSWORD`, `CORS_ORIGIN=*`, `PAPERCLIP_API_TOKEN=your-integration-token`. | DONE: emptied NEO4J_PASSWORD/JWT_SECRET/PAPERCLIP_API_TOKEN with REQUIRED notes; CORS_ORIGIN now localhost not `*`. |
| 5 | P1 | `src/integrations/lightrag/user-api.ts` | 65 | `SESSION_SECRET` regenerated on every restart if env missing, invalidating sessions. | Fail startup or persist secret to state file when env is absent. |
| 6 | P1 | `src/credentials.ts` | 39–40 | Field encryption silently falls back to plaintext when `VIRTUALPC_FIELD_KEY` is invalid. | Fail writes / log error loudly instead of plaintext fallback. |
| 7 | P1 | `src/security/apiKeyMiddleware.ts`, `src/security/apiKeys.ts` | — | API-key auth module exists but is not applied to any route. | Mount on write/admin routes and document scopes. |
| 8 | P1 | `src/index.ts` | 849 | HTTP handler spawns detached `node` subprocesses (`spawn(..., { detached: true, stdio: 'ignore' })`) without validation. | Validate scope/script path; use job queue; await/cleanup. |
| 9 | P1 | `src/openclaw-terminal-controller.ts` | 97–101, 304, 311 | Shell commands built from external input (`tmux capture-pane`, platform + coords). | Escape args, use array exec, sanitize terminal IDs. |
| 10 | P1 | `src/integrations/lightrag/family-graph.ts` | 1074, 1093 | Shell commands assembled via string interpolation (`python3 '${script.replace(...)}'`). | Use array args or spawn with validated paths. |
| 11 | P1 | `src/vitals/self-repair.ts` | 168, 203, 213, 221 | Spawns `bash -c`/`docker`/`kill` with hardcoded absolute paths. | Parameterize paths, validate targets, log commands. |
| 12 | P2 | `deploy/docker-compose.production.yml` | 205 | Grafana admin password defaults to `admin`. | Require env var, generate at setup. |
| 13 | P2 | `deploy/docker-compose.gpu.yml` | 241 | Grafana admin password defaults to `admin`. | Same as #12. |
| 14 | ✅ DONE | `src/index.ts` | 2251 | Neo4j password falls back to `'password'`. | DONE: throws in production when `NEO4J_PASSWORD` unset; warns + dev-only fallback otherwise. |
| 15 | P3 | `src/index.ts` | 4029 | Audit logging errors silently swallowed. | Log to stderr/backup queue on audit failure. |

## 🛤️ Hardcoded Paths & Environment Assumptions (P1–P2)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 16 | P1 | `src/index.ts` | 1009 | Hardcoded `/tmp/virtualpc-auto-update.state`. | Use `VIRTUALPC_STATE_DIR` consistently. |
| 17 | P1 | `src/index.ts` | 1119–1128 | Synchronous reads of `/tmp/gpu-symbiosis-state`, `/tmp/gpu-symbiosis-disable`, `/tmp/gpu-symbiosis.log` in request handler. | Move to async I/O and configurable state dir. |
| 18 | P1 | `src/index.ts` | 2444 | Asset registry path hardcoded to `/media/knight2/EDS2/projects/molgang-web/shared/asset-registry.json`. | Config-driven path with env override. |
| 19 | P1 | `src/credentials.ts` | 18 | `VIRTUALPC_STATE_DIR` defaults to `/media/knight2/EDS2/virtualpc-state`. | Default to project-local `data/` or require env. |
| 20 | P1 | `src/commercialization.ts` | 43 | `PROMO_STATE_DIR` defaults to `/media/knight2/EDS2/virtualpc-state`. | Config-driven default. |
| 21 | P1 | `src/commit-audit.ts` | 19 | `AUDIT_STATE_DIR` defaults to `/media/knight2/EDS2/virtualpc-state`. | Config-driven default. |
| 22 | P1 | `src/task-engine.ts` | 347 | `VIRTUALPC_STATE_DIR` defaults to `/media/knight2/EDS2/virtualpc-state`. | Config-driven default. |
| 23 | P1 | `src/containment/policy.ts` | 100 | Project root hardcoded to `/media/knight2/EDS2/projects/molgang-web`. | Config-driven. |
| 24 | P1 | `src/integrations/governance/index.ts` | 88, 99, 110, 121, 132 | Governance asset sources hardcoded under `/media/knight2/EDS2/...`. | Config-driven asset base path. |
| 25 | P1 | `src/integrations/lightrag/asset-graph.ts` | 47 | Asset graph source hardcoded to `/media/knight2/EDS2/projects/molgang-web/shared/asset-registry.json`. | Config-driven. |
| 26 | P1 | `src/integrations/mcp/registry.ts` | 184 | MCP registry path hardcoded to `/media/knight2/EDS2/projects/molgang-web/shared/asset-registry.json`. | Config-driven. |
| 27 | P1 | `src/vitals/vitals-service.ts` | 145 | Home directory hardcoded to `/home/knight2`. | Use `os.homedir()` / env. |
| 28 | P2 | `src/quality/qualityDashboard.ts` | 49 | QA report dir defaults to `/tmp/qa-reports`. | Use configurable state dir. |
| 29 | P2 | `scripts/ingest-corpus.js` | 28–33 | Hardcoded `/home/knight2/virtualpc/src` and `/media/knight2/EDS2/projects/...`. | Accept CLI args / env. |
| 30 | P2 | `scripts/backup-eds2-assets.sh` | 22–23 | Hardcoded backup source/target paths. | Use env vars with validation. |
| 31 | P2 | `scripts/gpu-symbiosis.sh` | 17–19 | Hardcoded `/tmp` control files. | Use `VIRTUALPC_STATE_DIR`. |
| 32 | P2 | `scripts/lmstudio-watchdog.sh` | 18 | Hardcoded `/tmp/lmstudio-watchdog.log`. | Use `VIRTUALPC_LOG_DIR`. |

## 💾 Synchronous FS in Request / Daemon Paths (P1–P2)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 33 | P1 | `src/plan-review/index.ts` | 119–128 | `readFileSync`, `mkdirSync`, `writeFileSync` inside route helpers. | Async fs APIs + error handling. |
| 34 | P1 | `src/query-builder/index.ts` | 87–88 | `readFileSync`, `mkdirSync`, `writeFileSync` in `load()`/`save()`. | Async fs APIs. |
| 35 | P1 | `src/spectroscopy/index.ts` | 29–30 | `readFileSync`, `mkdirSync`, `writeFileSync` in `load()`/`save()`. | Async fs APIs. |
| 36 | P2 | `src/requirements/index.ts` | 22–23 | `readFileSync`, `writeFileSync`. | Async fs APIs. |
| 37 | P2 | `src/commercialization.ts` | 107–122 | `existsSync`, `mkdirSync`, `readFileSync`, `writeFileSync`, `renameSync`. | Async fs APIs. |
| 38 | P2 | `src/data-quality/index.ts` | 55, 107 | `readdirSync` in background daemon with swallowed errors. | Async scan + proper logging. |
| 39 | P2 | `src/finance/index.ts` | 29, 33 | `readFileSync`, `writeFileSync`. | Async fs APIs. |
| 40 | P2 | `src/index.ts` | 1119–1128 | Synchronous `/tmp` reads in request handler. | Async reads + caching. |

## 🧯 Error Handling / Reliability (P1–P2)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 41 | P1 | `src/index.ts` | 1390–1393, 1395–1398, 1400–1426 | Async `/api/llm/*` routes lack try/catch; unhandled rejections crash request. | Wrap in try/catch and return 500/503. |
| 42 | P1 | `src/index.ts` | 1400–1426 | `/api/llm/chat` does not validate `messages` shape before forwarding. | Add Zod validation. |
| 43 | P2 | `src/plan-review/index.ts` | 213–226 | `/api/plans/:id/relay` swallows fetch failures silently. | Return 502/504 with reason. |
| 44 | P2 | `src/query-builder/index.ts` | 144–159 | `/api/queries/:id/run` returns success on dispatch error. | Return error status. |
| 45 | P2 | `src/integrations/lightrag/family-graph.ts` | 1033 | `exportAndSync(c).catch(...)` fire-and-forget without await. | Await or track in queue. |
| 46 | P2 | `src/integrations/lightrag/silk-net.ts` | 302 | `gossip.pushPost(post).catch(() => {})` silently dropped. | Log and surface failure. |
| 47 | P2 | `src/vitals/self-repair.ts` | 59 | `this.tick().catch(() => {})` swallows self-repair failures. | Log and alert. |
| 48 | P2 | `src/index.ts` | 2123, 2126 | Startup async promises have empty catch blocks. | Log startup failures. |
| 49 | P2 | `src/index.ts` | 3066–3077 | Shutdown flush errors silently swallowed. | Log and continue gracefully. |
| 50 | P2 | `src/index.ts` | 4348 | GPU stats live read failures silently fallback to cache. | Surface stale-cache warnings. |
| 51 | P2 | `src/index.ts` | 2193, 2199 | Empty catch blocks during module loading. | Log warnings. |
| 52 | P2 | `src/index.ts` | 2536, 2543, 2672 | Empty/minimal catch blocks in mutation paths. | Log and propagate. |
| 53 | P2 | `src/integrations/selfheal/index.ts` | 175 | Dynamic URLs skipped by self-heal with no retry. | Implement URL template resolution. |
| 54 | P2 | `src/index.ts` | 2262, 2284, 2300 | Graph ingestion silently skipped when backend offline. | Return warning in health/ingest response. |
| 55 | P2 | `src/index.ts` | 3196–3198 | Kafka disabled reported as normal status. | Distinguish disabled vs degraded. |
| 56 | P2 | `src/middleware/api-interceptor.ts` | 112–126 | API interceptor returns simulated responses. | Implement real caching/batching/cost logic or remove. |
| 57 | P2 | `src/terminal-activity-monitor.ts` | 219–225 | `setupMessageListeners()` is a no-op placeholder. | Implement Kafka/WebDriver listeners. |
| 58 | P2 | `src/task-engine.ts` | 289, 298 | Generates placeholder “define task pool” tasks when no real tasks exist. | Surface empty-state instead of synthetic work. |
| 59 | P2 | `src/openclaw-terminal-controller.ts` | 217 | Multiplexer commands are placeholders. | Detect terminal (tmux/screen/pty) and build correct commands. |
| 60 | P3 | `src/index.ts` | 1835 | `dailyActiveUsers: 0` hardcoded. | Track real sessions or remove metric. |

## 🧪 Stubs, Mock Data & Placeholders (P1–P2)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 61 | P1 | `src/integrations/numerai/data-fetcher.ts` | 345 | `processSecurityData()` always returns `0` (placeholder). | Implement real parser. |
| 62 | P1 | `src/integrations/numerai/data-fetcher.ts` | 353 | `processSignalData()` always returns `0` (placeholder). | Implement real parser. |
| 63 | P1 | `src/integrations/numerai/data-fetcher.ts` | 361 | `processCompetitionData()` always returns `0` (placeholder). | Implement real parser. |
| 64 | P1 | `src/auth/specialist-dashboards.ts` | 81 | `getCEODashboard()` returns hardcoded static/demo values. | Query live data. |
| 65 | P1 | `src/auth/specialist-dashboards.ts` | 102 | `getCTODashboard()` returns hardcoded static/demo values. | Query live data. |
| 66 | P1 | `src/auth/specialist-dashboards.ts` | 130 | `getDeveloperDashboard()` returns hardcoded static/demo values. | Query live data. |
| 67 | P1 | `src/auth/specialist-dashboards.ts` | 153 | `getArtistDashboard()` returns hardcoded static/demo values. | Query live data. |
| 68 | P1 | `src/auth/specialist-dashboards.ts` | 175 | `getTechArtistDashboard()` returns hardcoded static/demo values. | Query live data. |
| 69 | P1 | `src/index.ts` | 4207 | `/api/task-status` mock handler generates random numbers and is shadowed. | Implement real TaskTracker. |
| 70 | P2 | `src/index.ts` | 1699–1718 | `/api/backlog/item/:itemId` serves static mock `itemDb`. | Populate from repo / task engine / GitHub. |
| 71 | P2 | `src/api/metrics-dashboard.ts` | — | `/api/metrics/*` returns static mock numbers. | Source from vitals, task engine, token tracker. |
| 72 | P2 | `src/index.ts` | 3320–3414 | `/api/dashboard`, `/api/agents/status`, `/api/cost/dashboard` hardcoded. | Source from real subsystems. |
| 73 | P2 | `src/automation/backup-manager.ts` | — | Backup manager uses random/mock IDs, sizes, statuses. | Integrate with real storage provider. |
| 74 | P2 | `src/automation/deployment-manager.ts` | — | Deployment manager uses random/mock IDs and statuses. | Integrate with real deploy target. |
| 75 | P2 | `src/openclaw/openclaw-handler.ts` | — | OpenClaw returns canned `setTimeout` simulated results. | Drive real agents/tasks via task engine. |
| 76 | P2 | `src/agent/task-scheduler.ts` | — | Task scheduler keeps isolated in-memory state. | Persist via task engine. |
| 77 | P2 | `src/lmstudio.ts` | — | Cost optimization / caching not applied to LLM calls. | Integrate cache/batch/cost analyzer. |
| 78 | P2 | `src/integrations/chain/anchor.ts` | 259 | `fetchNonce()` falls back to zero address placeholder. | Implement signer with `getAddress()`. |
| 79 | P2 | `client/src/hooks/useWebSocket.ts` | 2 | `useWebSocket()` returns `{ wsData: null, socket: null }`. | Implement real WebSocket hook. |
| 80 | P2 | `scripts/infisical-wrap.mjs` | 1 | Script is a stub; does not actually inject Infisical secrets. | Implement Infisical CLI wrapper or remove. |
| 81 | P2 | `src/task-engine.ts` | 1386 | Social agents (`Cleopatra`, `Alexander`, `MoneyGod`) are roster stubs. | Add task pools or remove from roster. |

## 📡 Missing / Mismatched API Endpoints (P2)

| # | Severity | File(s) | Documented In | Issue | Proposed Fix |
|---|----------|---------|---------------|-------|--------------|
| 82 | P2 | `src/index.ts` (missing) | `docs/API-DOCUMENTATION.md` | `POST /api/auth/register` not implemented. | Add route or remove from docs. |
| 83 | P2 | `src/index.ts` (missing) | `docs/DEPLOYMENT.md` | `POST /api/auth/generate` (agent token generation) missing. | Implement or remove from docs. |
| 84 | P2 | `src/index.ts` (missing) | `docs/DEPLOYMENT.md` | `GET /api/cost/summary` missing. | Implement; `scripts/health-check.sh` references it. |
| 85 | P2 | `src/index.ts` (missing) | `docs/DEPLOYMENT.md` | `GET /api/cost/agents` missing. | Implement. |
| 86 | P2 | `src/index.ts` (missing) | `docs/DEPLOYMENT.md` | `GET /api/cost/metrics` missing. | Implement. |
| 87 | P2 | `src/index.ts` (missing) | `docs/DEPLOYMENT.md` | `POST /api/memory/clear` missing. | Implement. |
| 88 | P2 | `src/index.ts` (missing) | `docs/API-DOCUMENTATION.md` | `POST /api/memory/add` documented but actual routes are `/api/memory/add-fact` and `/api/memory/add-decision`. | Align docs and code. |
| 89 | P2 | `src/index.ts` (missing) | `docs/DEPLOYMENT.md` | `GET /api/queue/status` missing. | Implement or remove from docs. |
| 90 | P2 | `src/index.ts` (missing) | `docs/VIRTUALPC-ARCHITECTURE.md` | `GET /api/vitals/services` missing. | Implement or update docs. |
| 91 | P2 | `src/index.ts` (missing) | `docs/VIRTUALPC-ARCHITECTURE.md` | `GET /api/vitals/disk` missing (`/api/vitals/disk-candidates` exists). | Align naming. |
| 92 | P2 | `src/index.ts` (missing) | `docs/DEPLOYMENT.md` | `POST /api/tasks/create` missing. | Implement or remove from docs. |
| 93 | P2 | `src/index.ts` (missing) | `docs/SCRUM-CHARTERS.md` | `GET /api/sprint/gta6-polish-s1` missing. | Implement or remove from docs. |
| 94 | P2 | `public/sprint.html` (missing) | `docs/SCRUM-CHARTERS.md` | `/sprint` page missing. | Create page or remove from docs. |
| 95 | P2 | `src/index.ts` (missing) | `docs/API-DOCUMENTATION.md` | `PUT /api/backlog/:id` missing. | Implement. |
| 96 | P2 | `src/index.ts` (missing) | `docs/API-DOCUMENTATION.md` | `DELETE /api/backlog/:id` missing. | Implement. |
| 97 | P2 | `src/index.ts` (missing) | `docs/API-DOCUMENTATION.md` | `GET /api/collaboration/users` missing. | Implement. |
| 98 | P2 | `src/index.ts` (missing) | `docs/API-DOCUMENTATION.md` | `GET /api/collaboration/activity` missing. | Implement. |
| 99 | P2 | `src/index.ts` (missing) | `docs/API-DOCUMENTATION.md` | `POST /api/webhooks` missing. | Implement subscription endpoint. |
| 100 | P2 | `scripts/health-check.sh` | 63 | Curls `/api/cost/summary`, which does not exist. | Implement endpoint or update script. |
| 101 | P2 | `package.json` | — | Documented `npm run agents:all`, `npm run agent:kai`, etc. scripts are missing. | Add scripts or update docs. |

## 🔌 Disabled / Unwired Modules (P1–P2)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 102 | P1 | `src/integrations/kafka/orchestrator.ts`, `src/index.ts` | 2852–2856 | Kafka orchestrator exists but is disabled at boot. | Enable behind feature flag or remove dead code. |
| 103 | P1 | `src/cache/middleware.ts`, `src/cache/cacheManager.ts` | — | Complete Redis cache layer never mounted. | `app.use(cacheMiddleware)` and wire config. |
| 104 | P1 | `src/middleware/api-interceptor.ts` | — | CachingLayer/BatchingEngine/CostAnalyzer unused. | Instantiate and mount interceptor. |
| 105 | P2 | `src/security/apiKeyMiddleware.ts` | — | API-key auth never applied. | Apply to write/admin routes. |
| 106 | P2 | `src/collaboration/routes.ts` | — | Collaboration router defined but never imported/mounted. | Mount under `/api/collaboration`. |
| 107 | P2 | `src/analytics/dashboard.ts` | — | Analytics dashboard router defined but never mounted. | Mount or remove. |
| 108 | P2 | `src/orchestration/model-router.ts` | — | Instantiated and exposed via `/api/model/route` but inference uses `src/model-router.ts`. | Consolidate or clarify responsibilities. |
| 109 | P2 | `src/integrations/kafka/shared.ts` | 26 | `KAFKA_DISABLED` defaults to disabled when unset. | Default to enabled for production. |

## 🧠 Model / Inference Layer (P1–P2)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 110 | P2 | `src/lmstudio.ts` | — | Model-router weight classes exist but no UI/settings surface. | Add settings panel/API and persistence. |
| 111 | P2 | `src/model-router.ts` | 42–48 | `donkeykongweight` class allows up to 9999 GB disk without upper sanity bound. | Cap or require explicit opt-in. |
| 112 | P2 | `src/model-router.ts` | 186–199 | VRAM detection calls `nvidia-smi` on every roster generation; logs noisy warnings on macOS. | Guard by platform / cache result. |
| 113 | P2 | `src/lmstudio.ts` | 401–410 | `FORCE_SIMULATE=1` still allowed; UI no longer labels simulation. | Remove simulation path or gate behind explicit dev flag. |
| 114 | P2 | `src/lmstudio.ts` | 300–328 | `healthCheck()` reports `reachable: true` even when LM Studio has zero models. | Distinguish server-reachable vs model-loaded. |
| 115 | P2 | `src/model-downloader.ts` | — | Auto-download is synchronous spawn and has no progress/queue. | Add background queue with status endpoint. |
| 116 | P2 | `src/model-scheduler.ts` | — | Reservations are in-memory only; no persistence across restarts. | Persist to Redis/state file if needed. |

## ✅ Tests & Tooling (P2–P3)

| # | Severity | File(s) | Line(s) | Issue | Proposed Fix |
|---|----------|---------|---------|-------|--------------|
| 117 | P2 | `tests/unit/agentRegistry.test.ts` | 64 | Test expects exactly one agent with `gpt-5.5` model (`Athena`) but none match. | Add `gpt-5.5` to Athena roster or update test expectation. |
| 118 | P3 | project root | — | No ESLint config exists (`eslint src/**/*.ts` fails). | Add `.eslintrc.*` or `eslint.config.*`. |
| 119 | P3 | `package.json` | 21 | Lint script globs `src/**/*.ts` but no config. | Fix script after adding config. |
| 120 | P3 | `jest.config.js` | — | Deprecated `ts-jest` `globals` config warning. | Migrate to modern `ts-jest` preset. |

---

# Part 2 — 40 Backlog Features

| ID | Priority | Area | Feature | Notes / Rationale |
|----|----------|------|---------|-------------------|
| F1 | P1 | Inference | **Weight-class settings UI/API** | Surface `model-router` weight classes in dashboard; persist overrides to `data/model-router-settings.json`. |
| F2 | P1 | Inference | **Model reservation dashboard widget** | Show current reservations, idle models, and busy models from `/api/models/schedule`. |
| F3 | P1 | Inference | **Background model download queue** | Extend `model-downloader` with async queue, progress events, and `GET /api/models/downloads/status`. |
| F4 | P1 | Inference | **Remove simulated fallback from production** | Keep real-inference default; simulation only under explicit dev flag. Already started; finish cleanup. |
| F5 | P1 | Backlog | **Populate backlog from repo instead of static `itemDb`** | Replace `src/index.ts:1699` static mock with parser for `.backlog/*.md`, GitHub issues, or local files. |
| F6 | P1 | Messaging | **Enable Kafka orchestrator at boot** | Remove `kafka = null` block and connect `KafkaOrchestrator` behind a safe default/fallback. |
| F7 | P1 | Performance | **Mount Redis cache middleware** | Wire `src/cache/middleware.ts` into `src/index.ts` and add health checks. |
| F8 | P1 | Cost | **Wire API optimization interceptor** | Use `CachingLayer`, `BatchingEngine`, `CostAnalyzer` on LLM/API routes. |
| F9 | P1 | Security | **Apply API-key auth to chosen routes** | Mount `apiKeyAuth` on admin/write routes; document key rotation. |
| F10 | P1 | API | **Implement all documented missing endpoints** | Auth register/generate, cost summary/agents/metrics, memory clear, queue status, vitals services/disk, tasks create, sprint endpoints, backlog CRUD, collaboration users/activity, webhooks. |
| F11 | P1 | Dashboards | **Real specialist dashboards** | CEO/CTO/Developer/Artist/TechArtist dashboards sourced from live data. |
| F12 | P1 | Tasks | **Real task status endpoint** | Replace `/api/task-status` mock with TaskTracker-backed stats. |
| F13 | P1 | Metrics | **Real metrics dashboard** | Source `/api/metrics/*` from vitals, token tracker, task engine. |
| F14 | P1 | Automation | **Real OpenClaw command execution** | Drive actual agent tasks instead of canned responses. |
| F15 | P1 | Tasks | **Unify task scheduler and task engine** | Persist scheduler state via task engine; avoid split in-memory state. |
| F16 | P1 | Finance | **Numerai data parsers** | Implement `processSecurityData`, `processSignalData`, `processCompetitionData`. |
| F17 | P1 | Secrets | **Production Infisical integration** | Replace `scripts/infisical-wrap.mjs` stub with real CLI wrapper; strip `.env` fallbacks. |
| F18 | P2 | UI | **Live WebSocket client hook** | Replace `client/src/hooks/useWebSocket.ts` placeholder with real socket.io hook. |
| F19 | P2 | Blockchain | **Anchor nonce discovery** | Implement `fetchNonce()` with signer `getAddress()`. |
| F20 | P2 | Quality | **Specialist dashboard tests** | Add unit/integration tests for CEO/CTO dashboards. |
| F21 | P2 | Tooling | **ESLint config + fix pass** | Add config, fix lint errors, integrate into CI. |
| F22 | P2 | Tests | **Fix `agentRegistry.test.ts` gpt-5.5 expectation** | Either assign `gpt-5.5` to Athena or update test. |
| F23 | P2 | DevOps | **GitHub Actions CI/CD** | Build, test, lint on PR/push. |
| F24 | P2 | DevOps | **Push virtualpc repo to GitHub** | Create public/private repo and push current code. |
| F25 | P2 | Integrations | **GitHub Tasks backlog integration** | Sync backlog items with GitHub Issues/Projects. |
| F26 | P3 | UI/UX | **Dark mode support** | Theme toggle and CSS variables. |
| F27 | P3 | UI/UX | **Mobile-optimized dashboard** | Responsive layout, touch controls. |
| F28 | P3 | UI/UX | **Accessibility (WCAG 2.1 AA)** | ARIA labels, keyboard navigation, contrast. |
| F29 | P3 | UI/UX | **Customizable dashboard layouts** | Drag-and-drop cards. |
| F30 | P3 | UI/UX | **Keyboard shortcuts help panel** | Document and implement shortcuts. |
| F31 | P3 | Performance | **Service worker for offline support** | Cache static assets and key API responses. |
| F32 | P3 | Performance | **Bundle size reduction / code splitting** | Split dashboard chunks, lazy-load heavy modules. |
| F33 | P3 | Cost | **Per-agent/model cost dashboard** | Use token tracker + model usage to show cost breakdown. |
| F34 | P3 | GPU | **GPU scheduling and symbiosis UI** | Visualize GPU allocation, enable/disable symbiosis. |
| F35 | P3 | Self-repair | **Self-repair dry-run mode and policy UI** | Allow users to preview repairs before execution. |
| F36 | P3 | DevOps | **Real backup/deployment providers** | Integrate backup-manager with S3/GCS; deployment-manager with K8s/Docker. |
| F37 | P3 | Security | **Audit retention UI** | Browse and export audit logs. |
| F38 | P3 | Security | **CORS origin validation** | Reject `*` in production; validate allowed origins. |
| F39 | P3 | Quality | **Zod input validation middleware** | Validate all POST bodies; centralize error responses. |
| F40 | P3 | Testing | **LM Studio / Ollama integration test harness** | Spin up mock or real inference backends in CI. |

---

## How to consume this list

1. **P0–P1 issues** should be fixed before any public deployment.
2. **F1–F10 features** are the highest-value follow-ups and overlap heavily with the P1 issues above.
3. As items are completed, move them to `.backlog/session-actions.md` or strike them through here.

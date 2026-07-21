# MOLGANG 0.1 — VirtualPC reset, export en GitHub-sync

**Status:** ACTIVE · baseline reset uitgevoerd op 2026-07-21

## Baseline

- Version: `0.1`
- Completed tasks: `0`
- Daily updates: `0`
- Qwen tokens used: `0`
- Uptime: process counter from the latest VirtualPC start
- Historical task state: archived under `/media/knight2/EDS2/virtualpc-state/archive/`

## Delivered

- `GET /api/export/backlog?format=json`
- `GET /api/export/backlog?format=csv`
- `GET /api/export/backlog?format=markdown`
- Export includes current game stats, visible backlog, last 1000 work-log entries and token summary.
- GitHub `Knitweb/virtualpc` master synchronized with local source.
- Hive Mind, bot utility and Agent Notes Vault features merged from GitHub.
- Broken upstream orchestrator/OpenClaw compatibility restored so TypeScript builds.

## Acceptance checks

- [x] `npm run build`
- [x] `GET /api/health` returns version `0.1`.
- [x] `GET /api/metrics` returns zeroed new-baseline counters.
- [x] JSON, CSV and Markdown export routes return successfully.
- [x] One-shot reset flag removed after the reset; subsequent restarts preserve the new state.
- [ ] Add automated API tests for export schema and content-disposition headers.
- [ ] Add a scheduled GitHub/local parity audit and report drift in VirtualPC.

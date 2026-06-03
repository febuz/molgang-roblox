# Audit: `${Date.now()}`-only ID collision class

**Defect class:** building an entity id as `` `prefix_${Date.now()}` `` with **no
uniqueness suffix**. Two entities created in the same millisecond get the **same
id**, so they overwrite each other in a `Map` (lost records) or become
indistinguishable in an array (lookups/edits hit the wrong one). Surfaced while
adding unit tests; confirmed real in 4 modules and fixed there.

**The fix (uniform):** add a monotonic per-instance counter suffix:
```ts
private idSeq = 0;
// ...
id: `prefix_${Date.now()}_${this.idSeq++}`
```
(or a random suffix like the safe sites already use:
`` `${Date.now()}_${Math.random().toString(36).slice(2, 9)}` ``).

## Fixed (verified with regression tests)
| Module | id(s) | Commit / tag |
|--------|-------|--------------|
| `src/approval-monitor.ts` | `approval_<src>_<ms>` | `claude-fix-b61f45a3` |
| `src/features/collaboration.ts` | `collab_`/`msg_`/`workspace_`/`doc_<ms>` | `5b13c9a1` |
| `src/openclaw/openclaw-handler.ts` | (queue-drain, related defect) | `claude-fix-db3456fb` |

(Already-safe sites that use a random suffix — no change needed:
`agent/task-scheduler.ts`, `openclaw-handler.ts queueCommand`,
`analytics/advanced-analytics.ts` [id unused for lookup].)

## Remaining at-risk (in coupled/churning files — left for the gate/owners)
These weren't unit-fixed here because the modules are network/fs/multi-dep
coupled (mock-heavy) or pipeline-owned; apply the same suffix fix:

| Module:line | id |
|-------------|-----|
| `src/integrations/numerai/openclaw-edb-bridge.ts:101` | `cmd_fetch_${Date.now()}` |
| `src/integrations/lightrag/client.ts:125` | `node_${Date.now()}` (graph nodes — highest impact: dup node ids corrupt the graph) |
| `src/index.ts:2442` | `backlog-${Date.now()}` |
| `src/index.ts:2503` | `issue-${Date.now()}` |
| `src/integrations/claude-code-skills.ts:183` | `dec-${Date.now()}` (currently a stub) |

**Priority:** `lightrag/client.ts node_` first — duplicate node ids silently
corrupt the shared knowledge graph under any bulk ingest.

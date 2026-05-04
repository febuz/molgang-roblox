# Tool-use coordination — MCP, not Symphony

The user asked: *"coordinate tool use with symphony or alternative we
already have in our architecture (which is best)."* This doc records the
call and what we shipped.

## TL;DR

**Use the in-house MCP-shaped registry** at `src/integrations/mcp/registry.ts`.
Symphony (already evaluated and rejected in `AGENT-INFRA-RESEARCH.md`)
solves a different problem: it orchestrates *issue queues*. We needed
*tool-call* coordination — which is what MCP (Model Context Protocol)
was designed for.

## Why MCP wins for our use case

| Need | Symphony | Our MCP registry |
|---|---|---|
| Schema-validated tool calls | not its scope | yes — JSON-Schema per tool |
| Per-agent ACL | not its scope | yes — `tools` field on `AgentMeta` |
| Native CLI consumers | none | Claude CLI + Kimi CLI both speak MCP |
| Maps to existing endpoints | rewire required | direct (codegraph, governance, wiki, assets) |
| Adoption cost | weeks | shipped today |

Symphony is still the right answer when virtualpc grows past ~50 active
queued tasks across multiple repos and the orchestration surface is the
bottleneck. That isn't where we are today.

## What's in `src/integrations/mcp/registry.ts`

- A flat `TOOLS[]` catalogue with `{ name, description, inputSchema, handler }`.
- `listTools(agentName?)` — returns the catalogue, optionally filtered by
  the agent's ACL.
- `callTool(agent, name, args)` — checks ACL, dispatches, returns
  `{ ok, result } | { ok: false, error }`.
- Wildcard ACL rules: `'codegraph.*'` allows the whole namespace; `'*'`
  is admin.

## Tools shipped today

| Tool | Purpose |
|---|---|
| `codegraph.stats` | summary counts of files / symbols / edges |
| `codegraph.symbol` | find a symbol + its references |
| `codegraph.file` | exports / imports / dependencies for a file |
| `governance.list` | list data-governance entries (filter by kind/owner/tag) |
| `governance.lineage` | lineage + related-by-tag for an entry or wiki term |
| `governance.register` | upsert governance entry (Governor only) |
| `wiki.lookup` | look up a wiki term by id or fuzzy name |
| `wiki.upsert` | create/update wiki entry (Kimi/Governor/Pixel) |
| `assets.search` | search EDS2 asset registry |
| `docs.regenerate` | trigger Kimi-backed documentation refresh |

## HTTP surface

| Endpoint | Purpose |
|---|---|
| `GET  /api/mcp/tools[?agent=…]` | catalogue (optionally ACL-filtered) |
| `POST /api/mcp/call` | `{ agent, tool, args }` → `{ ok, result }` |

Body shape mirrors MCP `tools/call` so a future swap to
`@modelcontextprotocol/sdk` won't change agent-side calls.

## Per-agent tool ACL

Defined in `src/agent-registry.ts` on the `tools` field of each
`AgentMeta`. Examples:

- **Governor**: `governance.*`, `codegraph.*`, `assets.search`,
  `wiki.lookup`, `docs.regenerate`.
- **Pixel** (web developer): `codegraph.*`, `wiki.*`, `assets.search`,
  `governance.lineage`, `docs.regenerate`.
- **Kimi** (docs author): `docs.*`, `wiki.*`, `codegraph.*`,
  `governance.lineage`, `assets.search`, `forum.read`.
- **Zip** (developer): `codegraph.*`, `wiki.lookup`, `assets.search`.

Calls that bypass the ACL get a 403 with the calling agent's actual rule
set, so the failure is debuggable in one round-trip.

## When to add new tools

1. Implement the handler somewhere in `src/integrations/<area>/`.
2. Add a `ToolDefinition` to `TOOLS[]` in
   `src/integrations/mcp/registry.ts` — pick a dotted name in the right
   namespace.
3. Update the relevant agent ACLs in `src/agent-registry.ts`.
4. The HTTP surface picks it up automatically; no route changes needed.

## Future: real MCP transport

Both Claude CLI (`claude mcp add <name> <url>`) and Kimi CLI
(`kimi mcp ...`) speak MCP over stdio + HTTP-streamable. To upgrade:

1. `npm i @modelcontextprotocol/sdk`.
2. Replace the `/api/mcp/*` Express routes with the SDK's
   `StreamableHTTPServerTransport`.
3. Keep `TOOLS[]` exactly as-is — the SDK's tool-registration shape
   matches what we already export.

The schemas don't change, so this is a 1-2 day swap when we want it.

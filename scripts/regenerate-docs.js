#!/usr/bin/env node
/**
 * regenerate-docs.js — refresh virtualpc + webgame docs using Kimi.
 *
 * Walks the repo, gathers source + key data files, then asks the Kimi
 * agent (taskType:'docs', which routes through the Moonshot CLI) to
 * author/refresh:
 *
 *   --scope readme        → docs/README.md from current source state
 *   --scope architecture  → docs/VIRTUALPC-ARCHITECTURE.md
 *   --scope wiki          → seeds new wiki.json entries from glossary gaps
 *   --scope all           → run everything
 *
 * Kimi's long context window (200K+) means we can hand it the whole
 * src/index.ts + agent-registry + key integrations in one shot — that's
 * why this tool was chosen for documentation duty.
 *
 * Usage:
 *   node scripts/regenerate-docs.js --scope readme
 *   node scripts/regenerate-docs.js --scope all
 *
 * The script POSTs to virtualpc's local /api/agents/Kimi/chat with
 * taskType:'docs'. virtualpc must be running (port 3100).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const VIRTUALPC_URL = process.env.VIRTUALPC_URL || 'http://127.0.0.1:3100';
const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const scope = arg('scope', 'all');

function readSafe(p, max) {
  try {
    const s = fs.readFileSync(p, 'utf8');
    return max && s.length > max ? s.slice(0, max) + `\n\n[... truncated, original ${s.length} chars]` : s;
  } catch { return ''; }
}

async function postJSON(pathname, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(VIRTUALPC_URL + pathname);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
      timeout: 240000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.write(data); req.end();
  });
}

async function askKimi(systemPrompt, userPrompt) {
  const r = await postJSON('/api/agents/Kimi/chat', {
    agent: 'Kimi',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    taskType: 'docs',
    max_tokens: 4000,
    temperature: 0.2,
  });
  if (!r || r.success === false) {
    throw new Error(`Kimi call failed: ${(r && r.error) || 'no response'}`);
  }
  return (r.content || r.result?.content || '').trim();
}

function gatherSourceContext() {
  const roster = readSafe(path.join(REPO_ROOT, 'src', 'agent-registry.ts'));
  const indexHead = readSafe(path.join(REPO_ROOT, 'src', 'index.ts'), 30000);
  const lmstudio = readSafe(path.join(REPO_ROOT, 'src', 'lmstudio.ts'), 25000);
  const governance = readSafe(path.join(REPO_ROOT, 'src', 'integrations', 'governance', 'index.ts'));
  const wiki = readSafe(path.join(REPO_ROOT, 'src', 'integrations', 'wiki', 'index.ts'));
  const mcp = readSafe(path.join(REPO_ROOT, 'src', 'integrations', 'mcp', 'registry.ts'));
  const existingReadme = readSafe(path.join(DOCS_DIR, 'README.md'));
  const existingArch = readSafe(path.join(DOCS_DIR, 'VIRTUALPC-ARCHITECTURE.md'));
  return { roster, indexHead, lmstudio, governance, wiki, mcp, existingReadme, existingArch };
}

const SYSTEM_PROMPT = `You are Kimi, the long-context documentation author for virtualpc.
You write clear, accurate technical docs grounded in the source provided.
Output ONLY the requested markdown — no preamble, no commentary.
Be concise. Prefer tables for routes/endpoints/agents. Use absolute file
paths so readers can navigate. If a section in the existing doc is still
correct, preserve it verbatim.`;

async function regenerateReadme(ctx) {
  console.log('▶ regenerating docs/README.md via Kimi');
  const userPrompt = `Refresh the virtualpc README. Reflect:
- Current agent roster (29 agents incl. Hermes coordinators, testers, Governor, Pixel)
- New endpoints: /api/governance, /api/wiki, /api/mcp, /api/docs/regenerate
- The MCP tool-coordination layer (alternative to OpenAI Symphony)
- Kimi-backed documentation flow (taskType:'docs')

Source — agent registry:
\`\`\`ts
${ctx.roster}
\`\`\`

Source — current README (preserve sections still accurate):
\`\`\`md
${ctx.existingReadme}
\`\`\`

Source — top of index.ts (route surface):
\`\`\`ts
${ctx.indexHead.slice(0, 8000)}
\`\`\`

Output the full markdown for docs/README.md.`;
  const md = await askKimi(SYSTEM_PROMPT, userPrompt);
  if (md.length < 200) throw new Error(`README output too short (${md.length} chars) — likely Kimi error`);
  const target = path.join(DOCS_DIR, 'README.md');
  fs.writeFileSync(target, md);
  console.log(`  ✓ wrote ${target} (${md.length} chars)`);
}

async function regenerateArchitecture(ctx) {
  console.log('▶ regenerating docs/VIRTUALPC-ARCHITECTURE.md via Kimi');
  const userPrompt = `Update the virtualpc architecture doc. Key sections to cover:
1. Agent roster (29) grouped by kind: core / decision / specialist / resource / hermes-coordinator / tester / marketing / governance.
2. Model routing — LiteLLM → LM Studio fallback, plus Claude CLI for designers + Kimi CLI for docs (taskType:'docs').
3. Tool-use coordination — MCP registry at src/integrations/mcp/registry.ts; per-agent ACL via the \`tools\` field. Why this beats Symphony for our scale (Symphony orchestrates issue queues; we needed tool-call coordination).
4. Data layer — governance registry + wiki + asset registry. Lineage walks from wiki entry → governance entry → source file.
5. Existing systems we keep: Kafka (audit + cost), codegraph, autoresearch, self-heal, task-engine.

Source — current architecture (preserve still-accurate parts):
\`\`\`md
${ctx.existingArch}
\`\`\`

Source — agent registry:
\`\`\`ts
${ctx.roster}
\`\`\`

Source — MCP registry:
\`\`\`ts
${ctx.mcp}
\`\`\`

Source — governance:
\`\`\`ts
${ctx.governance}
\`\`\`

Output the full markdown.`;
  const md = await askKimi(SYSTEM_PROMPT, userPrompt);
  if (md.length < 200) throw new Error(`architecture output too short (${md.length} chars)`);
  const target = path.join(DOCS_DIR, 'VIRTUALPC-ARCHITECTURE.md');
  fs.writeFileSync(target, md);
  console.log(`  ✓ wrote ${target} (${md.length} chars)`);
}

async function regenerateWiki(ctx) {
  console.log('▶ regenerating wiki entries via Kimi');
  const userPrompt = `Propose 8 new wiki entries to expand the molgang glossary.
Mix of game terms (3) and quantum chemical engineering terms (5).
Output ONLY a JSON array of objects with: id (kebab-case), term, namespace ('game'|'qchem'), summary (1 sentence), body (markdown ~150 words), seeAlso (array of ids), governanceId.
Use governanceId 'wiki-terms-json' for qchem and 'shared-quests-json' for game.

Existing wiki module (don't duplicate ids):
\`\`\`ts
${ctx.wiki}
\`\`\`

Output JSON only.`;
  const raw = await askKimi(SYSTEM_PROMPT, userPrompt);
  let arr;
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    arr = JSON.parse(m ? m[0] : raw);
  } catch (e) {
    console.warn('  ! failed to parse Kimi JSON; raw output:\n' + raw.slice(0, 500));
    return;
  }
  if (!Array.isArray(arr)) { console.warn('  ! expected array'); return; }
  for (const entry of arr) {
    if (!entry.id || !entry.term || !entry.namespace || !entry.summary || !entry.body) continue;
    try {
      await postJSON('/api/wiki', { ...entry, author: 'Kimi' });
      console.log(`  ✓ upserted wiki:${entry.id}`);
    } catch (e) { console.warn(`  ! upsert failed for ${entry.id}: ${e.message}`); }
  }
}

(async () => {
  const ctx = gatherSourceContext();
  const t0 = Date.now();
  try {
    if (scope === 'readme' || scope === 'all') await regenerateReadme(ctx);
    if (scope === 'architecture' || scope === 'all') await regenerateArchitecture(ctx);
    if (scope === 'wiki' || scope === 'all') await regenerateWiki(ctx);
    console.log(`✓ regenerate-docs complete in ${Math.round((Date.now() - t0) / 1000)}s (scope=${scope})`);
  } catch (e) {
    console.error(`✗ regenerate-docs failed: ${e.message}`);
    process.exit(1);
  }
})();

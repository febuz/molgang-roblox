#!/usr/bin/env node
/**
 * regenerate-docs.js — queue Kami briefs to refresh virtualpc + webgame docs.
 *
 * Kami (https://github.com/tw93/kami) is a Claude Code SKILL — typeset
 * documents land in HTML/PDF/slides under a parchment + ink-blue design
 * language. The skill runs inside a Claude Code session, not from a
 * background daemon.
 *
 * This script does NOT render. It queues briefs to virtualpc's Kami
 * brief queue (POST /api/kami/queue). A Claude Code session (run in
 * ~/virtualpc) reads the queue, selects a brief, and lets the Kami
 * skill auto-trigger on the natural-language doc request.
 *
 *   --scope readme        → brief for the project README
 *   --scope architecture  → brief for the architecture doc
 *   --scope wiki          → brief for a wiki summary one-pager
 *   --scope all           → all three
 *
 * Usage:
 *   node scripts/regenerate-docs.js --scope architecture
 *   node scripts/regenerate-docs.js                           # default scope=all
 *
 * Then open Claude Code in this repo and ask:
 *   "Render the next pending Kami brief from /api/kami/briefs?status=queued"
 */
'use strict';

const http = require('http');

const VIRTUALPC_URL = process.env.VIRTUALPC_URL || 'http://127.0.0.1:3100';
const REQUESTER = process.env.KAMI_REQUESTER || 'Mira';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const scope = arg('scope', 'all');

async function postJSON(pathname, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(VIRTUALPC_URL + pathname);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
      timeout: 8000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(data); req.end();
  });
}

const READ_ME_BRIEF = {
  type: 'long-doc',
  title: 'virtualpc — multi-agent platform for molgang',
  audience: 'developers + technical stakeholders new to the repo',
  outline: [
    '## Mission',
    'virtualpc orchestrates a 31-agent roster across four scrums (roblox, web, marketing, cross) plus testers and Hermes coordinators.',
    'It produces the Roblox + web ports of molgang and the marketing perception layer.',
    '',
    '## Quick start',
    '- prerequisites (node 20+, LM Studio on :1234, optional Kimi CLI, optional Anthropic API key)',
    '- `npm install`',
    '- `npm run start` — defaults to port 3100',
    '- systemd: `systemctl --user enable --now virtualpc.service`',
    '',
    '## Agent roster',
    '- Core (8): Fill, Kai, Zip, Mira, Luna, Governor, Pixel + Atlas',
    '- Decision (3): Cleopatra, Alexander, MoneyGod',
    '- Specialists (4): Vice, Kimi, Croesus + Atlas',
    '- Resource (2): Analyst, VideoProducer',
    '- Hermes coordinators (5): Roblox, Web, Marketing, Cross, Reviewer',
    '- Testers (10): 4 Roblox + 4 Web + 2 Marketing',
    '',
    '## HTTP surface (key)',
    '- /api/agents/overview',
    '- /api/llm/chat — agent + messages + taskType',
    '- /api/scrums, /api/forum/:team, /api/wiki, /api/governance',
    '- /api/mcp/{tools,call} — schema-validated tool dispatch',
    '- /api/kami/{queue,briefs,briefs/:id/status}',
    '',
    '## Tool-use coordination',
    'See docs/TOOL-USE-COORDINATION.md — in-house MCP-shaped registry, ACL per agent.',
    '',
    '## Documentation pipeline',
    'See docs/KAMI-DOCS.md — agents queue Kami briefs; Claude Code session renders them via the Kami skill.',
  ].join('\n'),
  sources: ['src/agent-registry.ts', 'src/index.ts', 'docs/TOOL-USE-COORDINATION.md', 'docs/SCRUM-CHARTERS.md'],
  outputPath: 'docs/kami/README.html',
  language: 'en',
};

const ARCHITECTURE_BRIEF = {
  type: 'white-paper',
  title: 'virtualpc architecture — May 2026',
  audience: 'engineering leads + future maintainers',
  outline: [
    '## System overview',
    'Express + TypeScript service on port 3100, fronted by an LM Studio + LiteLLM gateway. Persists state to JSON files (data/) with dirty-flag + 5s save pattern; codegraph + governance + wiki + scrum + forum + kami modules each self-contained under src/integrations.',
    '',
    '## Model routing',
    '- Default: LiteLLM → LM Studio (phi-4, devstral, deepseek-r1, gemma-4-26b, qwen3.5-27b).',
    '- Kimi agent: shells to ~/.local/bin/kimi --quiet -p (Moonshot subscription).',
    '- Designer agents (Mira, Luna): claude --bare --print -p (when ANTHROPIC_API_KEY set).',
    '- Documentation: Kami skill via Claude Code session (this script queues briefs).',
    '',
    '## Tool-use coordination',
    'In-house MCP-shaped registry at src/integrations/mcp/registry.ts. 13 tools across codegraph, governance, wiki, assets, scrum, forum, kami namespaces. Per-agent ACL on AgentMeta.tools (wildcards allowed). HTTP surface at /api/mcp/{tools,call}.',
    'Why MCP not Symphony: see docs/TOOL-USE-COORDINATION.md.',
    '',
    '## Data layer',
    '- governance: registry of every shared/*.json + asset registry + wiki source-of-truth.',
    '- wiki: glossary of game terms + quantum-chem-engineering terms.',
    '- scrum: standups + bug reports per team.',
    '- forum: tester discussion threads per team.',
    '- kami: typeset-doc brief queue.',
    'Lineage walk: wiki entry → governance entry → source file.',
    '',
    '## Documentation pipeline (Kami)',
    'Agents queue briefs via kami.queue MCP tool or POST /api/kami/queue. A Claude Code session in ~/virtualpc reads /api/kami/briefs?status=queued and renders each via the Kami skill. Output lands in docs/kami/. Renderer marks the brief delivered via /api/kami/briefs/:id/status.',
    '',
    '## Operations',
    '- systemd unit: ~/.config/systemd/user/virtualpc.service',
    '- Backup timer: molgang-backup.timer (Sun 02:30, hardlink-deduped snapshots, see docs/BACKUP.md).',
  ].join('\n'),
  sources: ['src/agent-registry.ts', 'src/integrations/mcp/registry.ts', 'src/integrations/governance/index.ts', 'src/integrations/kami/index.ts', 'docs/TOOL-USE-COORDINATION.md'],
  outputPath: 'docs/kami/VIRTUALPC-ARCHITECTURE.html',
  language: 'en',
};

const WIKI_BRIEF = {
  type: 'one-pager',
  title: 'molgang glossary — game + quantum-chem-engineering terms',
  audience: 'players, educators, and chem-curious browsers',
  outline: [
    'Two-column layout: game terms (left) + quantum-chem-engineering terms (right).',
    'Each term: bold name + 1-line summary + (optional) brief expansion.',
    'Source: GET ' + VIRTUALPC_URL + '/api/wiki — 13 entries today, mix of namespaces.',
    'Cross-references rendered as small hyperlinks.',
    'Footer: governance lineage line ("authored by Kimi + curated by Governor; CC-BY-4.0").',
  ].join('\n'),
  sources: [VIRTUALPC_URL + '/api/wiki', 'shared/wiki-terms.json (molgang-web)'],
  outputPath: 'docs/kami/wiki-one-pager.html',
  language: 'en',
};

async function queue(brief) {
  const r = await postJSON('/api/kami/queue', { ...brief, requester: REQUESTER });
  if (r && r.success) {
    console.log(`  ✓ queued ${brief.type} → ${r.brief.id} → ${brief.outputPath}`);
  } else {
    console.warn(`  ! queue failed for ${brief.title}: ${(r && r.error) || JSON.stringify(r).slice(0, 200)}`);
  }
}

(async () => {
  console.log(`▶ queueing Kami briefs (scope=${scope}, requester=${REQUESTER})`);
  const t0 = Date.now();
  if (scope === 'readme' || scope === 'all')       await queue(READ_ME_BRIEF);
  if (scope === 'architecture' || scope === 'all') await queue(ARCHITECTURE_BRIEF);
  if (scope === 'wiki' || scope === 'all')         await queue(WIKI_BRIEF);
  console.log(`✓ done in ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log('');
  console.log('Next: open Claude Code in this repo and ask:');
  console.log(`  "Render the next pending Kami brief from ${VIRTUALPC_URL}/api/kami/briefs?status=queued"`);
  console.log('Or list them:');
  console.log(`  curl ${VIRTUALPC_URL}/api/kami/briefs?status=queued`);
})();

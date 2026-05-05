#!/usr/bin/env node
/**
 * ingest-discussions-into-corpus.js — pull operational discussion records
 * (forum threads · agent persona prompts · scrum bug reports · gap analyses)
 * and write them as Corpus nodes for semantic retrieval.
 *
 * After this runs, an agent calling corpus.search('dialogue UX bug')
 * gets the actual bug report Iris filed alongside the dialogue tree
 * schema and the playtest-runner code that auto-detects it.
 *
 * Idempotent (MERGE on chunk id).
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const VIRTUALPC_URL = process.env.VIRTUALPC_URL || 'http://127.0.0.1:3100';

function get(pathname) {
  return new Promise((resolve, reject) => {
    const u = new URL(VIRTUALPC_URL + pathname);
    http.get({ hostname: u.hostname, port: u.port, path: u.pathname + (u.search || ''), timeout: 30000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postIngest(chunks) {
  const data = JSON.stringify({ chunks });
  return new Promise((resolve, reject) => {
    const u = new URL(VIRTUALPC_URL + '/api/corpus/ingest');
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
      timeout: 240000,
    }, res => {
      const buf = [];
      res.on('data', c => buf.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(buf).toString('utf8'))); }
        catch (e) { resolve({ raw: Buffer.concat(buf).toString('utf8') }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(data); req.end();
  });
}

(async () => {
  console.log('▶ pulling operational discussions into corpus');
  const chunks = [];

  // Forum threads — every team's threads + replies
  for (const team of ['cross', 'scrum-roblox', 'scrum-web', 'scrum-marketing']) {
    try {
      const r = await get(`/api/forum/${team}`);
      for (const t of (r.threads || [])) {
        const replyText = (t.replies || []).map(rep => `[${rep.author}]: ${rep.body}`).join('\n\n');
        chunks.push({
          id: `forum:${team}:${t.id}`,
          source: `forum/${team}/${t.id}`,
          source_kind: 'doc',
          title: t.title,
          content: `# ${t.title}\n\nTeam: ${team}\nAuthor: ${t.author}\nTags: ${(t.tags || []).join(', ')}\nUpdated: ${t.updatedAt}\n\n${t.body}\n\n${replyText ? '## Replies\n\n' + replyText : ''}`,
        });
      }
    } catch (e) { console.warn(`  ! forum/${team}: ${e.message}`); }
  }

  // Bug reports across teams
  for (const team of ['cross', 'scrum-roblox', 'scrum-web', 'scrum-marketing']) {
    try {
      const r = await get(`/api/scrums/${team}/bugs`);
      for (const b of (r.bugs || [])) {
        chunks.push({
          id: `bug:${team}:${b.id}`,
          source: `bug/${team}/${b.id}`,
          source_kind: 'doc',
          title: b.title,
          content: `# Bug · ${b.title}\n\nTeam: ${team}\nReporter: ${b.reporter}\nSeverity: ${b.severity}\nStatus: ${b.status}\nSurface: ${b.surface || 'unspecified'}\nFiled: ${b.at}\n\n${b.body}`,
        });
      }
    } catch (e) { console.warn(`  ! bugs/${team}: ${e.message}`); }
  }

  // Agent persona prompts (data/agent-prompts.json on filesystem)
  try {
    const promptsPath = '/home/knight2/virtualpc/data/agent-prompts.json';
    if (fs.existsSync(promptsPath)) {
      const promptsDoc = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
      // Shape: { agentName: { prompt, model, generatedAt }, ... } OR maybe nested
      for (const [name, entry] of Object.entries(promptsDoc)) {
        const prompt = entry?.prompt || entry?.text || (typeof entry === 'string' ? entry : null);
        if (!prompt) continue;
        chunks.push({
          id: `persona:${name}`,
          source: `agent-prompt/${name}`,
          source_kind: 'doc',
          title: `${name} persona prompt`,
          content: `# ${name} · agent persona\n\n${prompt}\n\nDrafted by: ${entry?.model || 'unknown'}\nGenerated: ${entry?.generatedAt || 'unknown'}`,
        });
      }
    }
  } catch (e) { console.warn(`  ! agent-prompts: ${e.message}`); }

  // Sprint dashboard snapshot (project state)
  try {
    const r = await get('/api/sprint/gta6-polish-s1');
    if (r && r.features) {
      chunks.push({
        id: 'sprint:gta6-polish-s1',
        source: 'sprint/gta6-polish-s1',
        source_kind: 'doc',
        title: 'GTA6-Polish-S1 sprint state',
        content: `# GTA6-Polish-S1 sprint\n\nAverage completion: ${r.average_completion_pct}%\nTotal features: ${r.total_features}\nBy status: ${JSON.stringify(r.by_status)}\nBy dimension: ${JSON.stringify(r.by_dimension)}\n\n## Features\n\n${(r.features || []).map(f => `### ${f.id} · ${f.title}\nOwner: ${f.owner}\nDimension: ${f.dimension}\nStatus: ${f.status} (${f.completion_pct}%)\nEvidence: ${f.evidence}`).join('\n\n')}`,
      });
    }
  } catch (e) { console.warn(`  ! sprint: ${e.message}`); }

  // Kami briefs queue
  try {
    const r = await get('/api/kami/briefs?limit=100');
    for (const b of (r.briefs || [])) {
      chunks.push({
        id: `kami:${b.id}`,
        source: `kami-brief/${b.id}`,
        source_kind: 'doc',
        title: `Kami brief · ${b.title}`,
        content: `# ${b.title}\n\nType: ${b.type}\nLanguage: ${b.language}\nRequester: ${b.requester}\nStatus: ${b.status}\nAudience: ${b.audience || 'unspecified'}\n\n## Outline\n${b.outline}\n\n## Sources\n${(b.sources || []).join('\n')}`,
      });
    }
  } catch (e) { console.warn(`  ! kami briefs: ${e.message}`); }

  console.log(`▶ ${chunks.length} chunks collected (forum threads + bugs + persona prompts + sprint + kami briefs)`);
  if (chunks.length === 0) { console.log('nothing to ingest'); return; }

  let ingested = 0;
  for (let i = 0; i < chunks.length; i += 30) {
    const slice = chunks.slice(i, i + 30);
    const r = await postIngest(slice);
    if (r.success) {
      ingested += r.ingested;
      process.stdout.write(`\r  ingested ${ingested}/${chunks.length}…`);
    } else {
      console.warn(`\n  ! batch failed: ${r.error || JSON.stringify(r).slice(0,200)}`);
    }
  }
  console.log(`\n✓ done`);
})();

#!/usr/bin/env node
/* Delegate to Gemma 4 (via /api/llm/chat) to draft a rich system prompt
 * for each of the 14 VirtualPC agents. Output: data/agent-prompts.json
 *
 * Run: node scripts/delegate-build-overview.js
 *
 * Saves credits by doing all the creative writing inside virtualpc instead
 * of using Claude Code tokens for it.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const HOST = '127.0.0.1';
const PORT = 3100;
const OUT = path.resolve(__dirname, '..', 'data', 'agent-prompts.json');

const AGENTS = [
  { name: 'Fill',          role: 'CEO',                                avatar: '👑', kind: 'core' },
  { name: 'Kai',           role: 'CTO',                                avatar: '⚡', kind: 'core' },
  { name: 'Zip',           role: 'Developer',                          avatar: '💻', kind: 'core' },
  { name: 'Mira',          role: 'Creative Director',                  avatar: '🎨', kind: 'core' },
  { name: 'Luna',          role: 'Tech Artist',                        avatar: '✨', kind: 'core' },
  { name: 'Cleopatra',     role: 'Executive Authority',                avatar: '👸', kind: 'decision' },
  { name: 'Alexander',     role: 'Technical Arbiter',                  avatar: '🗡️', kind: 'decision' },
  { name: 'MoneyGod',      role: 'Economy Authority',                  avatar: '💰', kind: 'decision' },
  { name: 'Analyst',       role: 'Data Analyst',                       avatar: '📊', kind: 'resource' },
  { name: 'VideoProducer', role: 'Video Producer',                     avatar: '🎬', kind: 'resource' },
  { name: 'Vice',          role: 'Open-World Design Expert',           avatar: '🌆', kind: 'specialist' },
  { name: 'Atlas',         role: 'Simulation / AR / VR / CAD Realism', avatar: '🥽', kind: 'specialist' },
  { name: 'Kimi',          role: 'Long-Context Researcher',            avatar: '🌙', kind: 'specialist' },
  { name: 'Croesus',       role: 'Commercialization Strategist',       avatar: '💎', kind: 'specialist' },
];

function postChat(body, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: HOST, port: PORT, path: '/api/llm/chat', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(new Error('bad json: ' + buf.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function draftPrompt(agent) {
  const userMsg =
    `Write a system prompt FOR YOURSELF — for use when other systems call you via the LLM API.\n\n` +
    `Write in second person ("You are ${agent.name}, ${agent.role}..."). 6-10 sentences.\n` +
    `Cover: identity, expertise, decision style, what you say YES/NO to, deliverable format.\n` +
    `Project context: VirtualPC is a project-agnostic multi-agent platform; whatever the team is building plugs into it through the task engine.\n` +
    `Write the prompt only — no preamble, no quotes, no markdown headers. Plain text.`;

  // Route via taskType=concept => gemma-4-26b (the local "VirtualPC model").
  // Gemma 4 26B-A4B is a thinking model: it spends most of max_tokens on
  // reasoning_tokens before emitting visible content, so give it ~2500.
  const r = await postChat({
    agent: agent.name,
    role: agent.role,
    message: userMsg,
    taskType: 'concept',
    temperature: 0.5,
    max_tokens: 2500,
  }, 240000);
  if (!r.success) throw new Error(`${agent.name}: ${r.error || r.reason || 'unknown'}`);
  // chatAsAgent typically returns { content, model, ... }
  const text = (r.content || r.message || r.text || '').trim();
  return { prompt: text, model: r.model || null };
}

(async () => {
  const started = Date.now();
  const out = { generatedAt: new Date().toISOString(), agents: {} };
  let okCount = 0;
  for (const agent of AGENTS) {
    process.stdout.write(`[${okCount + 1}/${AGENTS.length}] ${agent.name.padEnd(14)} ... `);
    try {
      const t0 = Date.now();
      const { prompt, model } = await draftPrompt(agent);
      out.agents[agent.name] = {
        ...agent,
        prompt,
        model,
        promptChars: prompt.length,
        generatedAt: new Date().toISOString(),
      };
      okCount++;
      console.log(`${prompt.length} chars  (${model || '?'}, ${Date.now() - t0}ms)`);
    } catch (e) {
      console.log(`FAIL ${e.message}`);
      out.agents[agent.name] = { ...agent, prompt: null, error: e.message };
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(`OK: ${okCount}/${AGENTS.length}  Total: ${((Date.now() - started) / 1000).toFixed(1)}s`);
})();

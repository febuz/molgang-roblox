#!/usr/bin/env node
/**
 * render-kami-brief.js — fallback brief renderer using Kami templates.
 *
 * The full Kami skill runs inside an interactive Claude Code session
 * (content distillation, intent extraction, brand profile loading, the
 * full editorial judgement loop documented in SKILL.md). This script is
 * the *unattended* fallback: it reads a queued brief from
 * /api/kami/briefs, picks the matching Kami template, fills the
 * placeholders deterministically from the brief outline + source data,
 * writes HTML, and marks the brief delivered.
 *
 * The output is a usable A4 / letter-size HTML doc with the Kami design
 * language (parchment + ink-blue + serif). It is NOT a substitute for the
 * real skill's editorial polish — when the user opens Claude Code and
 * lets Kami fire on the same brief, the HTML will improve significantly.
 *
 * Usage:
 *   node scripts/render-kami-brief.js                    # render all queued briefs
 *   node scripts/render-kami-brief.js --id brief-…       # specific brief
 *   node scripts/render-kami-brief.js --type one-pager   # only this doc type
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const VIRTUALPC_URL = process.env.VIRTUALPC_URL || 'http://127.0.0.1:3100';
const REPO_ROOT = path.resolve(__dirname, '..');
const KAMI_SKILL_DIR = path.join(os.homedir(), '.claude', 'skills', 'kami');
const TEMPLATE_DIR = path.join(KAMI_SKILL_DIR, 'assets', 'templates');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const onlyId = arg('id', null);
const onlyType = arg('type', null);

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(VIRTUALPC_URL + pathname);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + (u.search || ''),
      method, timeout: 15000,
      headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (data) req.write(data);
    req.end();
  });
}

function escape(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function templatePath(type, language) {
  const lang = language === 'zh' || language === 'ja' ? '' : '-en';
  // Kami slide renderer is python; only HTML templates are reachable here.
  const map = {
    'one-pager':  `one-pager${lang}.html`,
    'long-doc':   `long-doc${lang}.html`,
    'letter':     `letter${lang}.html`,
    'portfolio':  `portfolio${lang}.html`,
    'resume':     `resume${lang}.html`,
    'white-paper':`equity-report${lang}.html`,  // closest analog in Kami's set
    'changelog':  `changelog${lang}.html`,
    'slides':     `slides-weasy${lang}.html`,
  };
  return path.join(TEMPLATE_DIR, map[type] || `one-pager${lang}.html`);
}

// ─── Renderers per doc type ────────────────────────────────────────────
async function renderOnePagerWiki(brief) {
  const tpl = fs.readFileSync(templatePath('one-pager', brief.language), 'utf8');
  const wiki = await request('GET', '/api/wiki');
  const game = (wiki.entries || []).filter(e => e.namespace === 'game');
  const qchem = (wiki.entries || []).filter(e => e.namespace === 'qchem');

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const counts = { game: game.length, qchem: qchem.length };

  // Two-column section: game terms left, qchem right. Use up to 5 each
  // so the page stays close to one A4.
  const renderTermList = (entries) => entries.slice(0, 5).map(e =>
    `<li><strong>${escape(e.term)}</strong>: ${escape(e.summary)}</li>`).join('\n      ');

  // Replacements honor the structural placeholders that appear in
  // one-pager-en.html. Anything not addressed below stays as-is — Kami's
  // template tolerates lingering placeholders gracefully when previewed.
  let out = tpl
    .replace('{{DOC_TITLE}}', escape(brief.title))
    .replace('{{AUTHOR}}', escape(brief.requester))
    .replace('{{AUTHOR}}', escape(brief.requester))  // appears twice (meta + footer)
    .replace('{{DESCRIPTION}}', escape(brief.audience || ''))
    .replace('{{KEYWORDS}}', 'molgang,wiki,quantum chemistry')
    .replace('{{EYEBROW - e.g. Proposal / Report / Exec Summary}}', 'GLOSSARY')
    .replace('{{Document headline - verb-led, fits in two lines, bookish.}}', escape(brief.title))
    .replace('{{One-line subtitle or the single sharpest claim.}}',
      `${counts.game + counts.qchem} terms · authored by Kimi · curated by Governor`)
    .replace('{{YYYY.MM.DD}}', today)
    .replace('{{VERSION / STATUS}}', 'v1 · live')
    // Metrics row: 4 numbers
    .replace(/<div class="metric-value">\{\{NUMBER\}\}<\/div>\s*<div class="metric-label">\{\{LABEL\}\}<\/div>/,
      `<div class="metric-value">${counts.game}</div><div class="metric-label">Game terms</div>`)
    .replace(/<div class="metric-value">\{\{NUMBER\}\}<\/div>\s*<div class="metric-label">\{\{LABEL\}\}<\/div>/,
      `<div class="metric-value">${counts.qchem}</div><div class="metric-label">Quantum-chem terms</div>`)
    .replace(/<div class="metric-value">\{\{NUMBER\}\}<\/div>\s*<div class="metric-label">\{\{LABEL\}\}<\/div>/,
      `<div class="metric-value">${counts.game + counts.qchem}</div><div class="metric-label">Total entries</div>`)
    .replace(/<div class="metric-value">\{\{NUMBER\}\}<\/div>\s*<div class="metric-label">\{\{LABEL\}\}<\/div>/,
      `<div class="metric-value">CC-BY-4.0</div><div class="metric-label">License</div>`)
    .replace(/\{\{~30-40 words[^}]*\}\}/,
      `Real chemistry, played as a game. The molgang glossary tracks every player-facing concept side by side with its quantum-chem-engineering source — one shelf for game vocabulary, one for the textbook terms that back it.`)
    .replace('{{Section one}}', 'Game vocabulary')
    .replace('{{Section two}}', 'Quantum chemical engineering')
    .replace('{{One or two sentences expanding the claim.}}',
      `Currencies, age bands, factions — terms that exist only inside molgang's economy.`)
    .replace('{{One or two sentences.}}',
      `Real-world thermodynamics + transport phenomena — IUPAC source, quantum-mechanically grounded.`)
    // Replace the 3 game-side bullets with our top 5 game terms (template
    // ships exactly 3 placeholder bullets in section one + 3 in section two).
    .replace('<li>{{Short bullet: a data point, observation, or judgment.}}</li>\n      <li>{{Short bullet with <span class="hl">key figure</span>.}}</li>\n      <li>{{Short bullet.}}</li>',
      renderTermList(game))
    .replace('<li>{{Short bullet.}}</li>\n      <li>{{Short bullet.}}</li>\n      <li>{{Short bullet.}}</li>',
      renderTermList(qchem))
    // Three-stage roadmap → three-stage growth narrative
    .replace(/\{\{STAGE_TITLE\}\}\s*<\/div>\s*<div class="tl-body">\{\{One-line explanation\.\}\}/,
      `Curate<\/div><div class="tl-body">Governor + Kimi expand the glossary every sprint`)
    .replace(/\{\{STAGE_TITLE\}\}\s*<\/div>\s*<div class="tl-body">\{\{One-line explanation\.\}\}/,
      `Cross-link<\/div><div class="tl-body">Each term carries a governanceId — lineage chain stays auditable`)
    .replace(/\{\{STAGE_TITLE\}\}\s*<\/div>\s*<div class="tl-body">\{\{One-line explanation\.\}\}/,
      `Render<\/div><div class="tl-body">Webgame /wiki page + Kami one-pager (this doc) both serve from the same source`)
    .replace(/\{\{Key quote[^}]*\}\}/,
      `Authored by <span class="em-brand">Kimi</span> from IUPAC source; curated by <span class="em-brand">Governor</span>; rendered via <span class="em-brand">Kami</span>. CC-BY-4.0.`)
    .replace('{{CONFIDENTIALITY - internal / public / draft}}', 'public · CC-BY-4.0')
    .replace('{{PAGE / CONTACT}}', 'molgang.app/wiki');
  return out;
}

async function renderArchitectureDoc(brief) {
  // For long-doc + white-paper, we punt on full content distillation here
  // (that's where the real Kami skill earns its keep). Use the long-doc
  // template, plug the outline as the main body, and let a Claude Code
  // session refine later. Better than nothing.
  const tpl = fs.readFileSync(templatePath('long-doc', brief.language), 'utf8');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  // Convert outline markdown headings → HTML sections (very simple).
  const outlineHtml = brief.outline.split('\n').map(line => {
    if (line.startsWith('## ')) return `<h2>${escape(line.slice(3))}</h2>`;
    if (line.startsWith('# '))  return `<h1>${escape(line.slice(2))}</h1>`;
    if (line.startsWith('- ')) return `<li>${escape(line.slice(2))}</li>`;
    if (!line.trim()) return '';
    return `<p>${escape(line)}</p>`;
  }).join('\n');

  // Replace the title + a few key placeholders; leave the rest of the
  // template's structure intact so the Kami styling is visible.
  let out = tpl
    .replace(/\{\{DOC_TITLE\}\}/g, escape(brief.title))
    .replace(/\{\{AUTHOR\}\}/g, escape(brief.requester))
    .replace(/\{\{DESCRIPTION\}\}/g, escape(brief.audience || ''))
    .replace(/\{\{KEYWORDS\}\}/g, 'virtualpc,architecture,multi-agent')
    .replace(/\{\{YYYY\.MM\.DD\}\}/g, today);

  // Append the outline body just after the closing </header> tag if we can find it.
  out = out.replace(/<\/header>/, `</header>\n<section class="content">\n${outlineHtml}\n<p style="margin-top: 18pt; color: var(--stone); font-size: 0.85em;"><em>Auto-rendered fallback — open Claude Code in this repo and ask Kami to refine for editorial polish.</em></p>\n</section>`);
  return out;
}

async function renderBrief(brief) {
  console.log(`▶ rendering ${brief.id} (${brief.type}: ${brief.title})`);

  // Mark in-progress
  await request('POST', `/api/kami/briefs/${brief.id}/status`, { status: 'in-progress' });

  let html;
  try {
    if (brief.type === 'one-pager' && /glossary|wiki/i.test(brief.title)) {
      html = await renderOnePagerWiki(brief);
    } else if (brief.type === 'long-doc' || brief.type === 'white-paper') {
      html = await renderArchitectureDoc(brief);
    } else {
      console.warn(`  ! no fallback renderer for type=${brief.type} — skipping`);
      await request('POST', `/api/kami/briefs/${brief.id}/status`, {
        status: 'queued',
        notes: 'no fallback renderer for this type; needs full Kami skill',
      });
      return;
    }
  } catch (e) {
    console.warn(`  ! render failed: ${e.message}`);
    await request('POST', `/api/kami/briefs/${brief.id}/status`, {
      status: 'queued', notes: `render error: ${e.message}`,
    });
    return;
  }

  const outPath = path.isAbsolute(brief.outputPath)
    ? brief.outputPath
    : path.join(REPO_ROOT, brief.outputPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);

  // Make styles.css available alongside (Kami stylesheets reference relative paths).
  const stylesSrc = path.join(KAMI_SKILL_DIR, 'styles.css');
  const stylesDst = path.join(path.dirname(outPath), 'styles.css');
  if (fs.existsSync(stylesSrc) && !fs.existsSync(stylesDst)) {
    fs.copyFileSync(stylesSrc, stylesDst);
  }

  console.log(`  ✓ wrote ${outPath} (${html.length} chars)`);

  await request('POST', `/api/kami/briefs/${brief.id}/status`, {
    status: 'delivered',
    notes: `fallback renderer used (scripts/render-kami-brief.js); editorial polish via real Kami skill recommended`,
  });
}

(async () => {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(`✗ Kami templates not found at ${TEMPLATE_DIR}`);
    console.error(`  install via: npx skills add tw93/kami -a claude-code -g -y`);
    process.exit(1);
  }
  const r = await request('GET', '/api/kami/briefs?status=queued');
  let briefs = r.briefs || [];
  if (onlyId) briefs = briefs.filter(b => b.id === onlyId);
  if (onlyType) briefs = briefs.filter(b => b.type === onlyType);
  if (briefs.length === 0) {
    console.log('No queued briefs match.');
    return;
  }
  for (const b of briefs) {
    await renderBrief(b);
  }
  console.log(`✓ done (${briefs.length} brief${briefs.length === 1 ? '' : 's'})`);
})();

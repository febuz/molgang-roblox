#!/usr/bin/env node
/**
 * ingest-chemistry-into-corpus.js — pull live chemistry data from the
 * molgang-web FastAPI (port 8000) and write it as Corpus chunks so that
 * agents can do corpus.search('bonding angle methane') and find the
 * recipe geometry + reaction conditions inline.
 *
 * Sources (all served by molgang-web/api/main.py):
 *   /api/elements              — 118 elements, ported from Roblox Lua
 *   /api/chemistry/recipes     — 10 hand-crafted molecule geometries
 *   /api/chemistry/conditions  — Atlas-generated reaction conditions
 *                                (T/P range, catalyst, activation E)
 *   /api/chemistry/subatomic   — electron config, oxidation states,
 *                                electronegativity for first 8 elements
 *
 * After this runs, an agent reasoning about a chemistry question gets
 * authoritative game-data passages instead of having to hallucinate.
 *
 * Idempotent (MERGE on chunk id).
 */
'use strict';
const http = require('http');

const VIRTUALPC_URL = process.env.VIRTUALPC_URL || 'http://127.0.0.1:3100';
const MOLGANG_URL   = process.env.MOLGANG_URL   || 'http://127.0.0.1:8000';

function get(baseUrl, pathname) {
  return new Promise((resolve, reject) => {
    const u = new URL(baseUrl + pathname);
    http.get({ hostname: u.hostname, port: u.port, path: u.pathname + (u.search || ''), timeout: 30000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) return reject(new Error(`${res.statusCode} ${pathname}`));
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`non-JSON response from ${pathname}`)); }
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
  console.log('▶ pulling chemistry data from molgang-web FastAPI');
  const chunks = [];

  // --- Elements (118) — enriched with subatomic data when available ---
  let subatomic = {};
  try {
    const sub = await get(MOLGANG_URL, '/api/chemistry/subatomic');
    subatomic = sub.elements || {};
  } catch (e) { console.warn(`  ! subatomic: ${e.message}`); }

  try {
    const ed = await get(MOLGANG_URL, '/api/elements');
    const els = ed.elements || [];
    for (const el of els) {
      const sub = subatomic[el.symbol] || {};
      const subDetail = Object.keys(sub).length ? `\n\n## Subatomic\nNeutrons: ${sub.neutrons}\nElectron shells: ${(sub.electronShells || []).join('-')}\nElectron configuration: ${sub.electronConfiguration}\nElectronegativity (Pauling): ${sub.electronegativity_pauling}\nCommon oxidation states: ${(sub.common_oxidation_states || []).join(', ')}` : '';
      const facts = (el.facts || []).map(f => `- ${f}`).join('\n');
      chunks.push({
        id: `chem-element:${el.symbol}`,
        source: `chemistry/element/${el.symbol}`,
        source_kind: 'doc',
        title: `${el.name} (${el.symbol}, Z=${el.id})`,
        content: `# ${el.name} · ${el.symbol}\n\nAtomic number: ${el.id}\nAtomic mass: ${el.atomicMass}\nGroup: ${el.group}\nPeriod: ${el.period}\nRarity (in-game): ${el.rarity}${subDetail}\n\n## Facts\n${facts || '(none)'}`,
      });
    }
    console.log(`  elements: ${els.length} chunks`);
  } catch (e) { console.warn(`  ! elements: ${e.message}`); }

  // --- Recipes (geometries + bonds + facts) joined with reaction conditions ---
  let conditions = {};
  try {
    const cd = await get(MOLGANG_URL, '/api/chemistry/conditions');
    conditions = cd.recipes || {};
  } catch (e) { console.warn(`  ! conditions: ${e.message}`); }

  try {
    const rd = await get(MOLGANG_URL, '/api/chemistry/recipes');
    const recipes = rd.recipes || [];
    for (const r of recipes) {
      const cond = conditions[r.name] || {};
      const consumes = Object.entries(r.consumes || {}).map(([k,v]) => `${v}×${k}`).join(' + ');
      const bonds = (r.bonds || []).map(b => `${b.from}–${b.to} (order ${b.order})`).join(', ');
      const facts = (r.facts || []).map(f => `- ${f}`).join('\n');
      const condBlock = cond && Object.keys(cond).length ? `\n\n## Reaction conditions\nTemperature (°C): ${cond.temperature_C?.min}–${cond.temperature_C?.max} (optimal ${cond.temperature_C?.optimal})\nPressure (atm): ${cond.pressure_atm?.min}–${cond.pressure_atm?.max} (optimal ${cond.pressure_atm?.optimal})\nCatalyst: ${cond.catalyst || 'none'}\nActivation energy: ${cond.activation_energy_kJ_mol} kJ/mol\nReaction type: ${cond.reaction_type}\nNotes: ${cond.notes || '—'}` : '';
      chunks.push({
        id: `chem-recipe:${r.name}`,
        source: `chemistry/recipe/${r.name}`,
        source_kind: 'doc',
        title: `${r.displayName || r.name} (${r.formula || r.name})`,
        content: `# ${r.displayName || r.name}\n\nFormula: ${r.formula || r.name}\nConsumes: ${consumes}\nCategory: ${r.category}\nEnergy: ${r.energy}\nBonds: ${bonds || '(none)'}${condBlock}\n\n## Facts\n${facts || '(none)'}`,
      });
    }
    console.log(`  recipes: ${recipes.length} chunks (joined with conditions)`);
  } catch (e) { console.warn(`  ! recipes: ${e.message}`); }

  console.log(`▶ ${chunks.length} chemistry chunks total`);
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

#!/usr/bin/env node
/**
 * ingest-wiki-into-corpus.js — pull every wiki + governance entry from the
 * live API and write them as Corpus chunks. After this runs, an agent
 * calling corpus.search('fugacity') gets the wiki entry alongside any
 * code passages that reference it.
 *
 * Re-runnable; idempotent (MERGE on chunk id).
 */
'use strict';
const http = require('http');
const VIRTUALPC_URL = process.env.VIRTUALPC_URL || 'http://127.0.0.1:3100';

function get(pathname) {
  return new Promise((resolve, reject) => {
    const u = new URL(VIRTUALPC_URL + pathname);
    http.get({ hostname: u.hostname, port: u.port, path: u.pathname + (u.search || '') }, (res) => {
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
  console.log('▶ pulling wiki + governance entries from live API');
  const wiki = await get('/api/wiki');
  const gov  = await get('/api/governance');

  const chunks = [];

  for (const w of (wiki.entries || [])) {
    chunks.push({
      id: `wiki:${w.id}`,
      source: `wiki/${w.id}`,
      source_kind: 'doc',
      title: w.term,
      content: `# ${w.term}\n\n${w.summary}\n\n${w.body || ''}\n\nNamespace: ${w.namespace}\nAuthor: ${w.author || 'unknown'}\nSee also: ${(w.seeAlso || []).join(', ')}`,
    });
  }

  for (const g of (gov.entries || [])) {
    chunks.push({
      id: `gov:${g.id}`,
      source: `governance/${g.id}`,
      source_kind: 'doc',
      title: g.name,
      content: `# ${g.name}\n\nKind: ${g.kind}\nOwner: ${g.owner}\nLicense: ${g.license || 'unspecified'}\nTags: ${(g.tags || []).join(', ')}\n\nLineage:\n${g.lineage || '(none)'}\n\nSource: ${g.source}`,
    });
  }

  console.log(`  ${(wiki.entries || []).length} wiki entries · ${(gov.entries || []).length} governance entries → ${chunks.length} chunks`);
  if (chunks.length === 0) { console.log('nothing to ingest'); return; }

  // Push in batches of 30
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

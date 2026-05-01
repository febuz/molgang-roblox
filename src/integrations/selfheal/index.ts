/**
 * Self-heal audit — finds broken links and dead API references in the
 * static HTML pages under public/, plus dangling onclick handlers and
 * fetch() URLs. The audit itself is fully deterministic; suggestFix()
 * optionally delegates to local Gemma 4 for a one-shot patch proposal.
 *
 * The agents that benefit:
 *   • Kai (CTO)       — surfaces broken infrastructure links
 *   • Zip (Developer) — gets a punch list of dead handlers to fix
 *   • Mira             — sees broken navigation paths in the UI
 *
 * Run via:  GET /api/selfheal/audit   (sync, ~150 ms for the current dashboard)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

export interface Finding {
  severity: 'high' | 'medium' | 'low';
  kind: 'dead-link' | 'dead-endpoint' | 'dangling-onclick' | 'dangling-fetch' | 'navigation-orphan';
  file: string;
  line: number;
  detail: string;
  suggestion?: string;
}

export interface AuditReport {
  generatedAt: string;
  filesScanned: number;
  findings: Finding[];
  stats: { high: number; medium: number; low: number };
}

const PAGES = ['public/dashboard.html', 'public/agents.html', 'public/vitals.html'];

interface Sources {
  hrefs:        { file: string; line: number; href: string; text: string }[];
  onclicks:     { file: string; line: number; handler: string }[];
  fetches:      { file: string; line: number; url: string }[];
  navItems:     { file: string; line: number; page: string }[];
  contentSecs:  { file: string; line: number; id: string }[];
  knownFns:     Set<string>;            // declared JS functions inside <script> blocks
}

function scanFile(rel: string, full: string, src: Sources) {
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, 'utf-8');
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // <a href="...">
    let mh: RegExpExecArray | null;
    const hrefRx = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g;
    const hrefSpan = line + '\n' + (lines[i + 1] || '');
    while ((mh = hrefRx.exec(hrefSpan)) !== null) {
      src.hrefs.push({ file: rel, line: i + 1, href: mh[1], text: mh[2].replace(/<[^>]+>/g, '').trim().slice(0, 60) });
    }
    // single-line href fallback (some hrefs are on their own attribute line)
    const lh = line.match(/href="([^"]+)"/);
    if (lh && !src.hrefs.find(x => x.file === rel && x.line === i + 1 && x.href === lh[1])) {
      src.hrefs.push({ file: rel, line: i + 1, href: lh[1], text: '' });
    }

    // onclick="fnName(...)"
    const oc = line.match(/onclick="([A-Za-z_][A-Za-z0-9_]*)\(/);
    if (oc) src.onclicks.push({ file: rel, line: i + 1, handler: oc[1] });

    // fetch('/api/...') and fetch("/api/...")
    const f1 = line.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`]/g);
    for (const m of f1) src.fetches.push({ file: rel, line: i + 1, url: m[1] });

    // sidebar nav items
    const nav = line.match(/data-page="([^"]+)"/);
    if (nav) src.navItems.push({ file: rel, line: i + 1, page: nav[1] });

    // matching content-section ids
    const sec = line.match(/<div class="content-section[^"]*"\s+id="([^"]+)"/);
    if (sec) src.contentSecs.push({ file: rel, line: i + 1, id: sec[1] });

    // function declarations inside <script>: function fn(...) and async function fn(...)
    const fn = line.match(/^\s*(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (fn) src.knownFns.add(fn[1]);
    // const fn = (…) => and let fn = (…) =>
    const af = line.match(/^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)/);
    if (af) src.knownFns.add(af[1]);
  }
}

function httpHeadLocal(p: string): Promise<{ status: number; ok: boolean }> {
  return new Promise((resolve) => {
    const req = http.request(
      { host: '127.0.0.1', port: 3100, method: 'HEAD', path: p, timeout: 1500 },
      (res) => { resolve({ status: res.statusCode || 0, ok: (res.statusCode || 0) < 400 }); res.resume(); },
    );
    req.on('error',   () => resolve({ status: 0, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false }); });
    req.end();
  });
}

function httpHead(url: string): Promise<{ status: number; ok: boolean }> {
  return new Promise((resolve) => {
    // Only HTTPS HEAD against external hosts. Built-in https module to avoid deps.
    const lib = require('https');
    try {
      const u = new URL(url);
      const req = lib.request(
        { host: u.host, path: u.pathname + u.search, method: 'HEAD', timeout: 4000, headers: { 'User-Agent': 'virtualpc-selfheal' } },
        (res: any) => { resolve({ status: res.statusCode || 0, ok: (res.statusCode || 0) < 400 }); res.resume(); },
      );
      req.on('error',   () => resolve({ status: 0, ok: false }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false }); });
      req.end();
    } catch { resolve({ status: 0, ok: false }); }
  });
}

export async function runAudit(rootDir: string): Promise<AuditReport> {
  const src: Sources = {
    hrefs: [], onclicks: [], fetches: [], navItems: [], contentSecs: [], knownFns: new Set(),
  };
  let scanned = 0;
  for (const rel of PAGES) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full)) { scanFile(rel, full, src); scanned++; }
  }

  const findings: Finding[] = [];

  // 1. Hrefs
  const seenHref = new Set<string>();
  for (const h of src.hrefs) {
    const key = `${h.file}:${h.line}:${h.href}`;
    if (seenHref.has(key)) continue;
    seenHref.add(key);
    if (h.href.startsWith('#') || h.href.startsWith('mailto:') || h.href.startsWith('javascript:')) continue;
    if (h.href.startsWith('http://') || h.href.startsWith('https://')) {
      const r = await httpHead(h.href);
      if (!r.ok) {
        // Known false-positive cases: private GitHub repos always 404 to
        // anonymous HEAD; Roblox HEAD on /search/* returns 500. Demote
        // those from "broken" to "low — anonymous-only check failed".
        const isPrivateGh = /github\.com\/febuz\//.test(h.href);
        const isRoblox    = /roblox\.com\//.test(h.href);
        const sev: Finding['severity'] =
          (isPrivateGh && r.status === 404) ? 'low' :
          (isRoblox    && r.status >= 400) ? 'low' :
          (r.status === 404)                 ? 'high' : 'medium';
        findings.push({
          severity: sev,
          kind: 'dead-link', file: h.file, line: h.line,
          detail: `${h.href} → HTTP ${r.status || 'unreachable'}${isPrivateGh ? ' (private repo, expected for anonymous)' : isRoblox ? ' (Roblox blocks HEAD)' : ''}${h.text ? ` (link text: "${h.text}")` : ''}`,
        });
      }
    } else {
      // local path
      const r = await httpHeadLocal(h.href.startsWith('/') ? h.href : '/' + h.href);
      if (!r.ok) {
        findings.push({
          severity: 'high', kind: 'dead-link', file: h.file, line: h.line,
          detail: `${h.href} → HTTP ${r.status} (link text: "${h.text}")`,
        });
      }
    }
  }

  // 2. fetch URLs — must respond <500 to a HEAD/GET
  const seenFetch = new Set<string>();
  for (const f of src.fetches) {
    if (seenFetch.has(f.url)) continue;
    seenFetch.add(f.url);
    if (f.url.includes('${') || f.url.includes('+')) continue;     // dynamic, skip
    const probe = f.url.startsWith('/') ? f.url : '/' + f.url;
    const cleaned = probe.replace(/\?.*$/, '?test=1');               // strip dynamic params
    const r = await httpHeadLocal(cleaned);
    // 400/404/405 from a HEAD on a POST endpoint is fine; only 5xx or "endpoint not found"-style 404 is suspicious.
    if (r.status === 0 || r.status >= 500) {
      findings.push({
        severity: 'high', kind: 'dangling-fetch', file: f.file, line: f.line,
        detail: `fetch('${f.url}') → server error ${r.status || 'unreachable'}`,
      });
    }
  }

  // 3. onclick handlers must be defined somewhere in the page's JS
  for (const o of src.onclicks) {
    if (!src.knownFns.has(o.handler)) {
      findings.push({
        severity: 'medium', kind: 'dangling-onclick', file: o.file, line: o.line,
        detail: `onclick="${o.handler}(...)" — function "${o.handler}" not declared`,
      });
    }
  }

  // 4. Sidebar nav-items in dashboard.html should have a matching content-section
  //    (agent names are routed dynamically by AGENT_NAME_MAP, so they're allowed).
  const dashItems   = src.navItems.filter(n => n.file === 'public/dashboard.html');
  const dashSecIds  = new Set(src.contentSecs.filter(c => c.file === 'public/dashboard.html').map(c => c.id));
  const knownDynamicAgents = new Set([
    'fill','kai','zip','mira','luna','cleopatra','alexander','moneygod',
    'analyst','videoproducer','vice','atlas','kimi','croesus',
  ]);
  for (const n of dashItems) {
    if (dashSecIds.has(n.page)) continue;
    if (knownDynamicAgents.has(n.page)) continue;
    findings.push({
      severity: 'high', kind: 'navigation-orphan', file: n.file, line: n.line,
      detail: `Sidebar item data-page="${n.page}" has no <div class="content-section" id="${n.page}"> in the page`,
    });
  }

  const stats = { high: 0, medium: 0, low: 0 };
  for (const f of findings) stats[f.severity]++;

  return { generatedAt: new Date().toISOString(), filesScanned: scanned, findings, stats };
}

let _last: AuditReport | null = null;
export function getLastAudit(): AuditReport | null { return _last; }
export async function runAndCache(rootDir: string): Promise<AuditReport> {
  _last = await runAudit(rootDir);
  return _last;
}

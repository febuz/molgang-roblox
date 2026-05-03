/**
 * Code-graph indexer — GitNexus-compatible adapter (in-process, zero-dep).
 *
 * Walks src/**.ts and extracts structural facts the agents can query:
 *   • exports per file (function, class, const, interface)
 *   • imports per file (which symbols come from which file)
 *   • a coarse call/reference graph (text-based: "this file mentions symbol X")
 *
 * The graph is built on demand by `buildCodegraph()` and cached on disk at
 * `data/codegraph.json`. Querying is O(N) over a 500-1000 symbol set, which
 * keeps every endpoint sub-millisecond and avoids any heavy parser dependency.
 *
 * If a real GitNexus CLI shows up later, the adapter can shell out to it and
 * keep the same response shape — `swap-driver` is a one-function change.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CodegraphSymbol {
  name: string;
  kind: 'function' | 'class' | 'const' | 'interface' | 'type' | 'enum';
  file: string;          // relative path from repo root
  line: number;
  exported: boolean;
}

export interface CodegraphFile {
  path: string;          // relative
  loc: number;
  symbols: number;
  imports: { from: string; symbols: string[] }[];
  exports: string[];
}

export interface Codegraph {
  generatedAt: string;
  rootDir: string;
  fileCount: number;
  symbolCount: number;
  files: { [relPath: string]: CodegraphFile };
  symbols: { [name: string]: CodegraphSymbol[] }; // multi-map (overloads, name reuse)
  references: { [name: string]: string[] };       // symbol → list of files that mention it
  dependencies: { [filePath: string]: string[] }; // file → resolved files it imports from
  importedBy:  { [filePath: string]: string[] };  // file → files that import it (inverse)
}

const SCAN_DIRS = ['src'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'logs', 'data', 'public', 'tests']);

function walk(dir: string, root: string, out: string[]) {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, root, out);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      out.push(path.relative(root, full));
    }
  }
}

const RX_EXPORT_FN     = /^export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/;
const RX_EXPORT_CLASS  = /^export\s+(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/;
const RX_EXPORT_CONST  = /^export\s+(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/;
const RX_EXPORT_IFACE  = /^export\s+interface\s+([A-Za-z_][A-Za-z0-9_]*)/;
const RX_EXPORT_TYPE   = /^export\s+type\s+([A-Za-z_][A-Za-z0-9_]*)/;
const RX_EXPORT_ENUM   = /^export\s+(?:const\s+)?enum\s+([A-Za-z_][A-Za-z0-9_]*)/;
const RX_LOCAL_FN      = /^(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/;
const RX_IMPORT        = /^import\s+(?:type\s+)?(?:\{([^}]+)\}|\*\s+as\s+([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*))?\s*(?:,\s*\{([^}]+)\})?\s*from\s+['"]([^'"]+)['"]/;

function indexFile(rel: string, full: string): { file: CodegraphFile; symbols: CodegraphSymbol[] } {
  const text = fs.readFileSync(full, 'utf-8');
  const lines = text.split('\n');
  const symbols: CodegraphSymbol[] = [];
  const exportsList: string[] = [];
  const imports: { from: string; symbols: string[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let m: RegExpMatchArray | null;
    if ((m = line.match(RX_EXPORT_FN)))   { symbols.push({ name: m[1], kind: 'function',  file: rel, line: i + 1, exported: true }); exportsList.push(m[1]); continue; }
    if ((m = line.match(RX_EXPORT_CLASS))){ symbols.push({ name: m[1], kind: 'class',     file: rel, line: i + 1, exported: true }); exportsList.push(m[1]); continue; }
    if ((m = line.match(RX_EXPORT_CONST))){ symbols.push({ name: m[1], kind: 'const',     file: rel, line: i + 1, exported: true }); exportsList.push(m[1]); continue; }
    if ((m = line.match(RX_EXPORT_IFACE))){ symbols.push({ name: m[1], kind: 'interface', file: rel, line: i + 1, exported: true }); exportsList.push(m[1]); continue; }
    if ((m = line.match(RX_EXPORT_TYPE))) { symbols.push({ name: m[1], kind: 'type',      file: rel, line: i + 1, exported: true }); exportsList.push(m[1]); continue; }
    if ((m = line.match(RX_EXPORT_ENUM))) { symbols.push({ name: m[1], kind: 'enum',      file: rel, line: i + 1, exported: true }); exportsList.push(m[1]); continue; }
    if ((m = line.match(RX_LOCAL_FN)))    { symbols.push({ name: m[1], kind: 'function',  file: rel, line: i + 1, exported: false }); continue; }
    if ((m = line.match(RX_IMPORT))) {
      const named = (m[1] || m[4] || '').split(',').map(s => s.trim()).filter(Boolean);
      const wildcard = m[2] ? [m[2]] : [];
      const def = m[3] ? [m[3]] : [];
      imports.push({ from: m[5], symbols: [...named, ...wildcard, ...def] });
    }
  }

  return {
    file: { path: rel, loc: lines.length, symbols: symbols.length, imports, exports: exportsList },
    symbols,
  };
}

function buildReferences(fileMap: { [k: string]: CodegraphFile }, symbolNames: Set<string>, root: string): { [name: string]: string[] } {
  const refs: { [name: string]: string[] } = {};
  for (const rel of Object.keys(fileMap)) {
    const text = fs.readFileSync(path.join(root, rel), 'utf-8');
    for (const name of symbolNames) {
      // Word-boundary check, skip declarations (they're already counted as exports).
      const rx = new RegExp(`\\b${name}\\b`);
      if (rx.test(text)) {
        if (!refs[name]) refs[name] = [];
        refs[name].push(rel);
      }
    }
  }
  return refs;
}

// Resolve an `import './foo'` from rel-file to its absolute index entry.
// Walks the relative path + tries .ts / .tsx / /index.ts. Returns the
// matching file path if found, else null. Pure path math — no fs calls.
function resolveImport(fromFile: string, importPath: string, files: Set<string>): string | null {
  if (!importPath.startsWith('.')) return null;       // skip node_modules / aliases
  const dir = path.posix.dirname(fromFile);
  const target = path.posix.normalize(path.posix.join(dir, importPath));
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx', '']) {
    if (files.has(target + ext)) return target + ext;
  }
  return null;
}

export function buildCodegraph(rootDir: string): Codegraph {
  const files: string[] = [];
  for (const sub of SCAN_DIRS) walk(path.join(rootDir, sub), rootDir, files);

  const fileMap: { [k: string]: CodegraphFile } = {};
  const symbols: { [name: string]: CodegraphSymbol[] } = {};
  for (const rel of files) {
    const r = indexFile(rel, path.join(rootDir, rel));
    fileMap[rel] = r.file;
    for (const s of r.symbols) {
      if (!symbols[s.name]) symbols[s.name] = [];
      symbols[s.name].push(s);
    }
  }
  const symbolNames = new Set(Object.keys(symbols));
  const references = buildReferences(fileMap, symbolNames, rootDir);

  // Cross-file dependency graph: file → [files it imports from] (resolved
  // to actual project files, not raw "./foo" strings). Plus the inverse
  // (importedBy) so callers can ask both "what does X depend on?" and
  // "what depends on X?". Same pattern GitNexus surfaces.
  const fileSet = new Set(files);
  const dependencies: { [k: string]: string[] } = {};
  const importedBy: { [k: string]: string[] } = {};
  for (const rel of files) {
    const deps = new Set<string>();
    for (const imp of fileMap[rel].imports) {
      const resolved = resolveImport(rel, imp.from, fileSet);
      if (resolved && resolved !== rel) deps.add(resolved);
    }
    dependencies[rel] = [...deps];
    for (const dep of deps) {
      (importedBy[dep] = importedBy[dep] || []).push(rel);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    rootDir,
    fileCount: Object.keys(fileMap).length,
    symbolCount: Object.values(symbols).reduce((s, arr) => s + arr.length, 0),
    files: fileMap,
    symbols,
    references,
    dependencies,        // file → files it imports
    importedBy,          // file → files that import it
  };
}

let _cache: Codegraph | null = null;
const CACHE_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'codegraph.json');

export function getCodegraph(rootDir: string, forceRebuild = false): Codegraph {
  if (_cache && !forceRebuild) return _cache;
  if (!forceRebuild) {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const stat = fs.statSync(CACHE_PATH);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs < 30 * 60 * 1000) {     // accept disk cache up to 30 min old
          _cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
          return _cache!;
        }
      }
    } catch { /* fall through to rebuild */ }
  }
  _cache = buildCodegraph(rootDir);
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(_cache, null, 2)); } catch { /* non-fatal */ }
  return _cache;
}

export function findSymbol(graph: Codegraph, query: string): CodegraphSymbol[] {
  const q = query.toLowerCase();
  const out: CodegraphSymbol[] = [];
  for (const [name, defs] of Object.entries(graph.symbols)) {
    if (name.toLowerCase() === q) out.push(...defs);
  }
  if (out.length) return out;
  // fallback: substring match
  for (const [name, defs] of Object.entries(graph.symbols)) {
    if (name.toLowerCase().includes(q)) out.push(...defs);
  }
  return out.slice(0, 50);
}

export function findReferences(graph: Codegraph, name: string): string[] {
  return graph.references[name] || [];
}

export function summarize(graph: Codegraph) {
  const byKind: { [k: string]: number } = {};
  for (const arr of Object.values(graph.symbols)) {
    for (const s of arr) byKind[s.kind] = (byKind[s.kind] || 0) + 1;
  }
  const exported = Object.values(graph.symbols).flat().filter(s => s.exported).length;
  return {
    generatedAt: graph.generatedAt,
    fileCount: graph.fileCount,
    symbolCount: graph.symbolCount,
    exported,
    byKind,
    cachePath: CACHE_PATH,
  };
}

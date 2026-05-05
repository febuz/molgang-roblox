/**
 * Auto-research adapter (Karpathy-style)
 *
 * A small multi-step research loop on top of the existing local LM Studio
 * client. Designed for the agents whose role is "research" — Vice (user
 * research), Kimi (long-context synthesis), Analyst (data exploration).
 *
 * The loop:
 *   1. Plan         — Gemma 4 lists 3-5 sub-questions worth answering.
 *   2. Probe        — for each sub-question, call a context source:
 *                       • "codegraph"  → /api/codegraph/* (structural facts)
 *                       • "lightrag"   → LightRAG (semantic facts from docs)
 *                       • "static"     → caller-supplied context strings
 *                     The choice of source is configured per-call so the
 *                     adapter never reaches the network unless the caller
 *                     asks it to.
 *   3. Synthesize   — Gemma 4 fuses every probe answer into a final write-up.
 *   4. Critique     — Gemma 4 reviews its own synthesis against the original
 *                     question; if it finds gaps, recursion (depth-capped).
 *
 * Cost: pure local Gemma 4 calls. Zero API credits. 4-8 LLM hops per run.
 */

import * as lmstudio from '../../lmstudio';
import * as codegraph from '../codegraph';
import * as corpus from '../corpus';
import type { LightRAGClient } from '../lightrag/client';
import * as path from 'path';

export interface AutoResearchOptions {
  agent: string;                  // Vice, Kimi, Analyst, etc.
  question: string;
  /**
   * Probe sources the loop is allowed to call. Default: ['corpus', 'codegraph'].
   * 'static' mode uses only the `staticContext` array; useful for tests.
   * 'corpus' uses the vector-embedded knowledge layer (chemistry, wiki,
   * forum threads, repo passages — everything ingested into Neo4j Corpus).
   */
  sources?: ('codegraph' | 'corpus' | 'lightrag' | 'static')[];
  staticContext?: string[];
  maxSubQuestions?: number;        // default 4
  maxDepth?: number;               // default 1 (single critique pass)
  rootDir?: string;                // for codegraph
  systemPrompt?: string;           // override the per-agent persona
  lightragClient?: LightRAGClient; // required when 'corpus' is in sources
}

export interface ResearchTrace {
  step: 'plan' | 'probe' | 'synthesize' | 'critique';
  prompt?: string;
  output: string;
  source?: string;
  ms: number;
}

export interface ResearchResult {
  agent: string;
  question: string;
  answer: string;
  subQuestions: string[];
  trace: ResearchTrace[];
  sourcesUsed: string[];
  totalMs: number;
}

async function llm(agent: string, system: string, user: string, max_tokens = 1500, temperature = 0.5): Promise<string> {
  const r = await lmstudio.chatAsAgent(
    agent,
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    { taskType: 'concept', temperature, max_tokens },
  );
  if (!r.ok) throw new Error(r.reason || 'llm failed');
  return r.content || '';
}

function planSystemPrompt(agent: string): string {
  return `You are ${agent}, in research-planning mode. Given a question, output 3-5 short sub-questions whose answers together would give a complete answer. One per line, no numbering, no preamble.`;
}

function synthesisSystemPrompt(agent: string): string {
  return `You are ${agent}. Synthesize a clear, grounded answer to the user's original question using the bullet-point evidence provided. Cite the evidence inline by referring to its label. Keep the answer under 6 sentences.`;
}

function critiqueSystemPrompt(agent: string): string {
  return `You are ${agent}, in self-critique mode. Read the question and your draft answer. If the answer is missing important angles, list 1-2 follow-up sub-questions worth probing. If the answer is complete, reply with the literal text "DONE".`;
}

async function probeCodegraph(rootDir: string, subQ: string): Promise<string> {
  const g = codegraph.getCodegraph(rootDir);
  // Heuristic: pick the longest CamelCase / snake_case-ish token in the
  // sub-question and look it up. Fall through to a substring match if needed.
  const tokens = (subQ.match(/\b[A-Z][A-Za-z0-9_]+\b|\b[a-z]+_[a-z_]+\b/g) || [])
    .sort((a, b) => b.length - a.length);
  const lines: string[] = [];
  for (const t of tokens.slice(0, 3)) {
    const defs = codegraph.findSymbol(g, t);
    if (defs.length) {
      const top = defs.slice(0, 5)
        .map(d => `${d.name} (${d.kind}, ${d.file}:${d.line}${d.exported ? ', exported' : ''})`)
        .join('\n  ');
      lines.push(`Symbol "${t}" — ${defs.length} definition(s):\n  ${top}`);
      const refs = codegraph.findReferences(g, t).slice(0, 8);
      if (refs.length) lines.push(`  Referenced by: ${refs.join(', ')}`);
    }
  }
  if (!lines.length) {
    lines.push(`No exact codegraph hit. Closest: ${codegraph.findSymbol(g, subQ.split(' ')[0]).slice(0, 3).map(d => `${d.name} @ ${d.file}:${d.line}`).join('; ') || '(none)'}`);
  }
  return lines.join('\n');
}

/** Hit the corpus vector index. Returns top-K passages formatted as
 *  evidence lines the synthesizer can cite. Skips if the corpus turns
 *  up nothing (so the loop falls through to the next configured source). */
async function probeCorpus(client: LightRAGClient, subQ: string): Promise<string> {
  try {
    const hits = await corpus.search(client, subQ, { k: 4, minScore: 0.55 });
    if (!hits.length) return '';
    return hits
      .map(h => `[${h.score.toFixed(3)}] ${h.source} — ${(h.title || '').slice(0, 60)}\n  ${h.content.replace(/\s+/g, ' ').slice(0, 320)}…`)
      .join('\n');
  } catch (e: any) {
    return `(corpus probe failed: ${e.message})`;
  }
}

async function probeStatic(staticContext: string[], subQ: string): Promise<string> {
  if (!staticContext.length) return '(no static context provided)';
  // Naive: keyword overlap to pick the 3 most-relevant items.
  const qWords = new Set(subQ.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);
  const ranked = staticContext
    .map(s => ({ s, score: ([...(s.toLowerCase().match(/\b[a-z]{3,}\b/g) || [])]).filter(w => qWords.has(w)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.s);
  return ranked.length ? ranked.map((x, i) => `[#${i + 1}] ${x.slice(0, 600)}`).join('\n') : '(no relevant static context)';
}

async function probe(opts: AutoResearchOptions, subQ: string): Promise<{ output: string; source: string }> {
  // Corpus first — semantic search is broad (chemistry data, wiki, forum,
  // repo passages all ingested), so it usually has the best shot. Fall
  // through to codegraph for structural questions, static for tests.
  const sources = opts.sources || ['corpus', 'codegraph'];
  const root = opts.rootDir || path.resolve(__dirname, '..', '..', '..');
  for (const src of sources) {
    if (src === 'corpus' && opts.lightragClient) {
      const r = await probeCorpus(opts.lightragClient, subQ);
      if (r && !r.startsWith('(corpus probe failed')) return { output: r, source: 'corpus' };
    } else if (src === 'codegraph') {
      const r = await probeCodegraph(root, subQ);
      if (r && !r.startsWith('No exact codegraph hit')) return { output: r, source: 'codegraph' };
    } else if (src === 'static') {
      const r = await probeStatic(opts.staticContext || [], subQ);
      if (r && r !== '(no static context provided)' && r !== '(no relevant static context)') {
        return { output: r, source: 'static' };
      }
    }
    // 'lightrag' source intentionally omitted from the default loop until the
    // server adds an offline-graceful query path; it's listed here so future
    // probes can plug in by adding another branch.
  }
  // No source matched — return an honest empty.
  return { output: '(no source produced evidence)', source: 'none' };
}

export async function research(opts: AutoResearchOptions): Promise<ResearchResult> {
  const t0 = Date.now();
  const trace: ResearchTrace[] = [];
  const sourcesUsed = new Set<string>();
  const maxQ = opts.maxSubQuestions ?? 4;
  const maxDepth = opts.maxDepth ?? 1;
  const planSys = opts.systemPrompt || planSystemPrompt(opts.agent);

  // 1. Plan
  let p0 = Date.now();
  const planRaw = await llm(opts.agent, planSys, opts.question, 600, 0.5);
  const subQs = planRaw.split('\n').map(s => s.replace(/^[\s\-•\d.)]+/, '').trim()).filter(Boolean).slice(0, maxQ);
  trace.push({ step: 'plan', prompt: opts.question, output: subQs.join(' | '), ms: Date.now() - p0 });

  // 2. Probe each
  const evidence: { sub: string; ev: string; source: string }[] = [];
  for (const sub of subQs) {
    const t = Date.now();
    const r = await probe(opts, sub);
    sourcesUsed.add(r.source);
    evidence.push({ sub, ev: r.output, source: r.source });
    trace.push({ step: 'probe', prompt: sub, output: r.output, source: r.source, ms: Date.now() - t });
  }

  // 3. Synthesize
  const evBlock = evidence
    .map((e, i) => `[E${i + 1}] (source: ${e.source}) sub-question "${e.sub}"\n${e.ev}`)
    .join('\n\n');
  let synthInput = `ORIGINAL QUESTION:\n${opts.question}\n\nEVIDENCE:\n${evBlock}`;
  let s0 = Date.now();
  let answer = await llm(opts.agent, synthesisSystemPrompt(opts.agent), synthInput, 1500, 0.5);
  trace.push({ step: 'synthesize', prompt: synthInput.slice(0, 800), output: answer, ms: Date.now() - s0 });

  // 4. Critique loop
  for (let depth = 0; depth < maxDepth; depth++) {
    const c0 = Date.now();
    const critique = await llm(
      opts.agent,
      critiqueSystemPrompt(opts.agent),
      `QUESTION: ${opts.question}\n\nDRAFT ANSWER: ${answer}`,
      400, 0.3,
    );
    trace.push({ step: 'critique', output: critique, ms: Date.now() - c0 });
    const critTrim = critique.trim();
    if (critTrim === 'DONE' || critTrim.toUpperCase().startsWith('DONE')) break;
    // Treat the critique as 1-2 follow-up sub-questions.
    const followUps = critTrim.split('\n').map(s => s.replace(/^[\s\-•\d.)]+/, '').trim()).filter(Boolean).slice(0, 2);
    if (!followUps.length) break;
    for (const f of followUps) {
      const t = Date.now();
      const r = await probe(opts, f);
      sourcesUsed.add(r.source);
      evidence.push({ sub: f, ev: r.output, source: r.source });
      trace.push({ step: 'probe', prompt: f, output: r.output, source: r.source, ms: Date.now() - t });
    }
    // Re-synthesize with the additional evidence.
    synthInput = `ORIGINAL QUESTION:\n${opts.question}\n\nEVIDENCE:\n${evidence.map((e, i) => `[E${i + 1}] (source: ${e.source}) sub-question "${e.sub}"\n${e.ev}`).join('\n\n')}`;
    const s1 = Date.now();
    answer = await llm(opts.agent, synthesisSystemPrompt(opts.agent), synthInput, 1500, 0.5);
    trace.push({ step: 'synthesize', prompt: '(re-synth after critique)', output: answer, ms: Date.now() - s1 });
  }

  return {
    agent: opts.agent,
    question: opts.question,
    answer,
    subQuestions: subQs,
    trace,
    sourcesUsed: [...sourcesUsed],
    totalMs: Date.now() - t0,
  };
}

/** Recommended-agent allowlist for the dashboard's research tab. */
export const RESEARCH_AGENTS = ['Vice', 'Kimi', 'Analyst', 'Atlas'];

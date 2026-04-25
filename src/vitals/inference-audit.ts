/**
 * InferenceAudit — append-only log of every local inference request.
 *
 * Answers the user's question "which task/agent caused that VRAM load?".
 * Each record captures caller identity (from X-Agent-ID or fallback), the
 * model tag, prompt head + hash (full prompt is not stored — could be PII),
 * token counts, latency, and whether this request triggered a model load
 * into VRAM (cross-referenced against Ollama's /api/ps state before/after).
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import logger from '../utils/logger';

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const AUDIT_PATH = path.join(LOG_DIR, 'inference-audit.jsonl');

export interface InferenceEvent {
  ts: string;
  caller: string;
  model: string;
  prompt_head: string;
  prompt_hash: string;
  max_tokens: number;
  tokens_prompt: number;
  tokens_completion: number;
  latency_ms: number;
  triggered_load: boolean;
  success: boolean;
  error?: string;
}

export class InferenceAudit {
  // Activity map is STATIC — shared across every InferenceAudit instance in
  // this process. The route layer and the self-repair engine historically
  // construct their own instances; a per-instance Map would mean markActivity
  // in one never reaches lastActivityMs in the other, and the idle rule would
  // race long-running inferences. Static map sidesteps that.
  private static activity = new Map<string, number>();

  markActivity(model: string): void {
    InferenceAudit.activity.set(model, Date.now());
  }

  lastActivityMs(model: string): number | undefined {
    return InferenceAudit.activity.get(model);
  }

  // Per-caller in-flight counter, also static so route + (future) repair
  // engine see the same numbers.
  private static inflight = new Map<string, number>();

  inflightFor(caller: string): number {
    return InferenceAudit.inflight.get(caller) || 0;
  }

  startInflight(caller: string): void {
    InferenceAudit.inflight.set(caller, (InferenceAudit.inflight.get(caller) || 0) + 1);
  }

  endInflight(caller: string): void {
    const n = (InferenceAudit.inflight.get(caller) || 0) - 1;
    if (n <= 0) InferenceAudit.inflight.delete(caller);
    else InferenceAudit.inflight.set(caller, n);
  }

  inflightSnapshot(): Record<string, number> {
    return Object.fromEntries(InferenceAudit.inflight);
  }

  async record(ev: InferenceEvent): Promise<void> {
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
      await fs.appendFile(AUDIT_PATH, JSON.stringify(ev) + '\n');
    } catch (e: any) {
      logger.error('InferenceAudit write failed', e?.message);
    }
  }

  async query(opts: { caller?: string; model?: string; since?: string; limit?: number } = {}): Promise<InferenceEvent[]> {
    try {
      const raw = await fs.readFile(AUDIT_PATH, 'utf8');
      const events: InferenceEvent[] = [];
      const sinceMs = opts.since ? new Date(opts.since).getTime() : 0;
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line) as InferenceEvent;
          if (opts.caller && ev.caller !== opts.caller) continue;
          if (opts.model  && ev.model  !== opts.model)  continue;
          if (sinceMs && new Date(ev.ts).getTime() < sinceMs) continue;
          events.push(ev);
        } catch {}
      }
      const limit = opts.limit ?? 100;
      return events.slice(-limit);
    } catch (e: any) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  /**
   * Roll the audit log up by caller and by model over a time window.
   * Window is in seconds; null = all time.
   * Returns counts, total tokens, avg latency, last-seen ts, error rate.
   */
  async stats(opts: { windowSec?: number | null } = {}): Promise<{
    window: string;
    by_caller: Record<string, any>;
    by_model: Record<string, any>;
    total: any;
  }> {
    const cutoff = opts.windowSec == null ? 0 : Date.now() - opts.windowSec * 1000;
    let raw = '';
    try { raw = await fs.readFile(AUDIT_PATH, 'utf8'); }
    catch (e: any) { if (e.code === 'ENOENT') return this.emptyStats(opts.windowSec); throw e; }

    type Bucket = { calls: number; tokens_in: number; tokens_out: number; latency_sum: number; errors: number; last_seen: string };
    const make = (): Bucket => ({ calls: 0, tokens_in: 0, tokens_out: 0, latency_sum: 0, errors: 0, last_seen: '' });
    const byCaller: Record<string, Bucket> = {};
    const byModel:  Record<string, Bucket> = {};
    const total = make();

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let ev: InferenceEvent;
      try { ev = JSON.parse(line); } catch { continue; }
      if (cutoff && new Date(ev.ts).getTime() < cutoff) continue;
      const update = (b: Bucket) => {
        b.calls += 1;
        b.tokens_in  += ev.tokens_prompt || 0;
        b.tokens_out += ev.tokens_completion || 0;
        b.latency_sum += ev.latency_ms || 0;
        if (!ev.success) b.errors += 1;
        if (ev.ts > b.last_seen) b.last_seen = ev.ts;
      };
      byCaller[ev.caller] ||= make();
      byModel[ev.model]   ||= make();
      update(byCaller[ev.caller]);
      update(byModel[ev.model]);
      update(total);
    }
    const finalize = (b: Bucket) => ({
      calls: b.calls,
      tokens_in: b.tokens_in,
      tokens_out: b.tokens_out,
      tokens_total: b.tokens_in + b.tokens_out,
      avg_latency_ms: b.calls ? Math.round(b.latency_sum / b.calls) : 0,
      error_rate: b.calls ? b.errors / b.calls : 0,
      last_seen: b.last_seen,
    });
    const win = opts.windowSec == null ? 'all' : `${opts.windowSec}s`;
    return {
      window: win,
      by_caller: Object.fromEntries(Object.entries(byCaller).map(([k, v]) => [k, finalize(v)])),
      by_model:  Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, finalize(v)])),
      total: finalize(total),
    };
  }

  private emptyStats(windowSec: number | null | undefined) {
    return {
      window: windowSec == null ? 'all' : `${windowSec}s`,
      by_caller: {},
      by_model: {},
      total: { calls: 0, tokens_in: 0, tokens_out: 0, tokens_total: 0, avg_latency_ms: 0, error_rate: 0, last_seen: '' },
    };
  }

  static hashPrompt(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  }

  // Best-effort: check Ollama's /api/ps before and after. If the model was
  // absent before and present after, this request triggered the load.
  static async checkLoadTrigger(model: string, before: Set<string>): Promise<boolean> {
    try {
      const r = await fetch('http://localhost:11434/api/ps');
      if (!r.ok) return false;
      const data: any = await r.json();
      const now = new Set<string>((data?.models || []).map((m: any) => m.name));
      return now.has(model) && !before.has(model);
    } catch { return false; }
  }

  static async loadedModels(): Promise<Set<string>> {
    try {
      const r = await fetch('http://localhost:11434/api/ps');
      if (!r.ok) return new Set();
      const data: any = await r.json();
      return new Set<string>((data?.models || []).map((m: any) => m.name));
    } catch { return new Set(); }
  }
}

export default InferenceAudit;

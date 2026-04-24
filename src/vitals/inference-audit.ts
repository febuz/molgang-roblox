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

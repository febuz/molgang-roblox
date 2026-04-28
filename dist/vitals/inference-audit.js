"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InferenceAudit = void 0;
/**
 * InferenceAudit — append-only log of every local inference request.
 *
 * Answers the user's question "which task/agent caused that VRAM load?".
 * Each record captures caller identity (from X-Agent-ID or fallback), the
 * model tag, prompt head + hash (full prompt is not stored — could be PII),
 * token counts, latency, and whether this request triggered a model load
 * into VRAM (cross-referenced against Ollama's /api/ps state before/after).
 */
const fs_1 = require("fs");
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const AUDIT_PATH = path.join(LOG_DIR, 'inference-audit.jsonl');
class InferenceAudit {
    markActivity(model) {
        InferenceAudit.activity.set(model, Date.now());
    }
    lastActivityMs(model) {
        return InferenceAudit.activity.get(model);
    }
    inflightFor(caller) {
        return InferenceAudit.inflight.get(caller) || 0;
    }
    startInflight(caller) {
        InferenceAudit.inflight.set(caller, (InferenceAudit.inflight.get(caller) || 0) + 1);
    }
    endInflight(caller) {
        const n = (InferenceAudit.inflight.get(caller) || 0) - 1;
        if (n <= 0)
            InferenceAudit.inflight.delete(caller);
        else
            InferenceAudit.inflight.set(caller, n);
    }
    inflightSnapshot() {
        return Object.fromEntries(InferenceAudit.inflight);
    }
    async record(ev) {
        try {
            await fs_1.promises.mkdir(LOG_DIR, { recursive: true });
            await fs_1.promises.appendFile(AUDIT_PATH, JSON.stringify(ev) + '\n');
        }
        catch (e) {
            logger_1.default.error('InferenceAudit write failed', e?.message);
        }
    }
    async query(opts = {}) {
        try {
            const raw = await fs_1.promises.readFile(AUDIT_PATH, 'utf8');
            const events = [];
            const sinceMs = opts.since ? new Date(opts.since).getTime() : 0;
            for (const line of raw.split('\n')) {
                if (!line.trim())
                    continue;
                try {
                    const ev = JSON.parse(line);
                    if (opts.caller && ev.caller !== opts.caller)
                        continue;
                    if (opts.model && ev.model !== opts.model)
                        continue;
                    if (sinceMs && new Date(ev.ts).getTime() < sinceMs)
                        continue;
                    events.push(ev);
                }
                catch { }
            }
            const limit = opts.limit ?? 100;
            return events.slice(-limit);
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return [];
            throw e;
        }
    }
    /**
     * Roll the audit log up by caller and by model over a time window.
     * Window is in seconds; null = all time.
     * Returns counts, total tokens, avg latency, last-seen ts, error rate.
     */
    async stats(opts = {}) {
        var _a, _b;
        const cutoff = opts.windowSec == null ? 0 : Date.now() - opts.windowSec * 1000;
        let raw = '';
        try {
            raw = await fs_1.promises.readFile(AUDIT_PATH, 'utf8');
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return this.emptyStats(opts.windowSec);
            throw e;
        }
        const make = () => ({ calls: 0, tokens_in: 0, tokens_out: 0, latency_sum: 0, errors: 0, last_seen: '' });
        const byCaller = {};
        const byModel = {};
        const total = make();
        for (const line of raw.split('\n')) {
            if (!line.trim())
                continue;
            let ev;
            try {
                ev = JSON.parse(line);
            }
            catch {
                continue;
            }
            if (cutoff && new Date(ev.ts).getTime() < cutoff)
                continue;
            const update = (b) => {
                b.calls += 1;
                b.tokens_in += ev.tokens_prompt || 0;
                b.tokens_out += ev.tokens_completion || 0;
                b.latency_sum += ev.latency_ms || 0;
                if (!ev.success)
                    b.errors += 1;
                if (ev.ts > b.last_seen)
                    b.last_seen = ev.ts;
            };
            byCaller[_a = ev.caller] || (byCaller[_a] = make());
            byModel[_b = ev.model] || (byModel[_b] = make());
            update(byCaller[ev.caller]);
            update(byModel[ev.model]);
            update(total);
        }
        const finalize = (b) => ({
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
            by_model: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, finalize(v)])),
            total: finalize(total),
        };
    }
    emptyStats(windowSec) {
        return {
            window: windowSec == null ? 'all' : `${windowSec}s`,
            by_caller: {},
            by_model: {},
            total: { calls: 0, tokens_in: 0, tokens_out: 0, tokens_total: 0, avg_latency_ms: 0, error_rate: 0, last_seen: '' },
        };
    }
    static hashPrompt(prompt) {
        return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    }
    // Best-effort: check Ollama's /api/ps before and after. If the model was
    // absent before and present after, this request triggered the load.
    static async checkLoadTrigger(model, before) {
        try {
            const r = await fetch('http://localhost:11434/api/ps');
            if (!r.ok)
                return false;
            const data = await r.json();
            const now = new Set((data?.models || []).map((m) => m.name));
            return now.has(model) && !before.has(model);
        }
        catch {
            return false;
        }
    }
    static async loadedModels() {
        try {
            const r = await fetch('http://localhost:11434/api/ps');
            if (!r.ok)
                return new Set();
            const data = await r.json();
            return new Set((data?.models || []).map((m) => m.name));
        }
        catch {
            return new Set();
        }
    }
}
exports.InferenceAudit = InferenceAudit;
// Activity map is STATIC — shared across every InferenceAudit instance in
// this process. The route layer and the self-repair engine historically
// construct their own instances; a per-instance Map would mean markActivity
// in one never reaches lastActivityMs in the other, and the idle rule would
// race long-running inferences. Static map sidesteps that.
InferenceAudit.activity = new Map();
// Per-caller in-flight counter, also static so route + (future) repair
// engine see the same numbers.
InferenceAudit.inflight = new Map();
exports.default = InferenceAudit;
//# sourceMappingURL=inference-audit.js.map
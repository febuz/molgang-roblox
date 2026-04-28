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
exports.SelfRepair = void 0;
/**
 * SelfRepair — periodic rules engine that heals stuck resources.
 *
 * Runs inside the virtualpc Node process, ticking every N seconds. Reads the
 * snapshot produced by vitals-monitor.sh plus Ollama's /api/ps and our own
 * inference audit log to decide if a resource has been held past a sensible
 * budget by an agent that isn't actively using it.
 *
 * Modes:
 *   SELF_REPAIR_MODE=observe  (default) — log findings, don't act
 *   SELF_REPAIR_MODE=act                — execute the safe action for each rule
 *
 * All actions and findings are appended to logs/self-repair.jsonl.
 */
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const REPAIR_LOG = path.join(LOG_DIR, 'self-repair.jsonl');
const SCRIPTS_DIR = path.join(__dirname, '..', '..', 'scripts');
const SNAP_PATH = path.join(LOG_DIR, 'gpu-overview.json');
const IDLE_UNLOAD_BUDGET_MS = Number(process.env.SELF_REPAIR_IDLE_BUDGET_MS || 10 * 60 * 1000); // 10m
const UNATTR_HEAVY_MIB = Number(process.env.SELF_REPAIR_UNATTR_HEAVY_MIB || 5000); // 5GB
const DISK_PRESSURE_PCT = Number(process.env.SELF_REPAIR_DISK_PCT || 92);
const OLLAMA_DOWN_TICKS = Number(process.env.SELF_REPAIR_OLLAMA_DOWN_TICKS || 3);
class SelfRepair {
    constructor(audit) {
        this.ticker = null;
        this.ollamaDownStreak = 0;
        this.unattrFirstSeen = new Map(); // pid → ts ms
        this.audit = audit;
        this.mode = (process.env.SELF_REPAIR_MODE === 'act') ? 'act' : 'observe';
        logger_1.default.info(`SelfRepair: mode=${this.mode}  budgets idle=${IDLE_UNLOAD_BUDGET_MS / 1000}s disk=${DISK_PRESSURE_PCT}%`);
    }
    start(intervalMs) {
        if (this.ticker)
            return;
        const ms = intervalMs ?? Number(process.env.SELF_REPAIR_TICK_MS || 60000);
        this.ticker = setInterval(() => this.tick().catch(e => logger_1.default.error('SelfRepair tick error', e?.message)), ms);
        logger_1.default.info(`SelfRepair: ticking every ${ms}ms`);
        // Run once immediately on start.
        this.tick().catch(() => { });
    }
    stop() {
        if (this.ticker) {
            clearInterval(this.ticker);
            this.ticker = null;
        }
    }
    setMode(m) { this.mode = m; logger_1.default.info(`SelfRepair: mode→${m}`); }
    getMode() { return this.mode; }
    async record(ev) {
        try {
            await fs_1.promises.mkdir(LOG_DIR, { recursive: true });
            await fs_1.promises.appendFile(REPAIR_LOG, JSON.stringify(ev) + '\n');
            logger_1.default.info(`[self-repair:${ev.severity}] ${ev.rule} — ${ev.finding} (action=${ev.action})`);
        }
        catch (e) {
            logger_1.default.error('SelfRepair log write failed', e?.message);
        }
    }
    async getRecent(limit = 50) {
        try {
            const raw = await fs_1.promises.readFile(REPAIR_LOG, 'utf8');
            const events = [];
            for (const line of raw.split('\n')) {
                if (!line.trim())
                    continue;
                try {
                    events.push(JSON.parse(line));
                }
                catch { }
            }
            return events.slice(-limit);
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return [];
            throw e;
        }
    }
    async tick() {
        const ts = new Date().toISOString();
        let snap = null;
        try {
            snap = JSON.parse(await fs_1.promises.readFile(SNAP_PATH, 'utf8'));
        }
        catch { /* no snapshot yet */ }
        if (process.env.SELF_REPAIR_DEBUG)
            logger_1.default.info(`[self-repair tick] mode=${this.mode} snap=${!!snap}`);
        // --- Rule 1: Ollama holding a model idle past keep-alive budget ---
        // Cross-reference loaded models against the last inference audit entry.
        await this.ruleIdleOllama(ts);
        // --- Rule 2: Ollama service health watchdog ---
        await this.ruleOllamaWatchdog(ts);
        // --- Rule 3: Unattributed heavy GPU holder ---
        if (snap)
            await this.ruleUnattributedHeavy(ts, snap);
        // --- Rule 4: Root disk pressure ---
        if (snap)
            await this.ruleDiskPressure(ts, snap);
        // --- Rule 5: Zombie ollama runner (PPID=1, no server) ---
        await this.ruleOrphanOllamaRunner(ts);
    }
    async ruleIdleOllama(ts) {
        let loaded;
        try {
            const r = await fetch('http://localhost:11434/api/ps');
            if (!r.ok)
                return;
            loaded = await r.json();
        }
        catch {
            return;
        }
        const models = loaded?.models || [];
        if (!models.length)
            return;
        if (process.env.SELF_REPAIR_DEBUG)
            logger_1.default.info(`[idle-ollama] loaded=${models.map((m) => m.name).join(',')}`);
        // Most recent audit entry across all models.
        const recent = await this.audit.query({ limit: 50 });
        for (const m of models) {
            const lastHit = recent.filter(e => e.model === m.name || e.model === m.model).pop();
            const lastAuditTs = lastHit ? new Date(lastHit.ts).getTime() : 0;
            // Also check the in-memory activity marker — a request may be in-flight
            // with the audit record not yet written.
            const lastActivityTs = this.audit.lastActivityMs(m.name) || 0;
            const lastSeenMs = Math.max(lastAuditTs, lastActivityTs);
            const sinceMs = lastSeenMs ? Date.now() - lastSeenMs : Infinity;
            if (process.env.SELF_REPAIR_DEBUG)
                logger_1.default.info(`[idle-ollama] ${m.name}: auditTs=${lastAuditTs} activityTs=${lastActivityTs} sinceMs=${sinceMs} budget=${IDLE_UNLOAD_BUDGET_MS}`);
            if (sinceMs > IDLE_UNLOAD_BUDGET_MS) {
                const finding = `Ollama model ${m.name} loaded (${(m.size_vram / (1024 ** 3)).toFixed(1)}GiB) with no inference for ${isFinite(sinceMs) ? Math.round(sinceMs / 1000) + 's' : 'ever'}`;
                if (this.mode === 'act') {
                    try {
                        await fetch('http://localhost:11434/api/generate', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model: m.name, keep_alive: 0 }),
                        });
                        await this.record({ ts, rule: 'ollama_idle_over_budget', severity: 'action', finding, action: 'unload_ollama', details: { model: m.name, vram_gb: (m.size_vram / (1024 ** 3)) } });
                    }
                    catch (e) {
                        await this.record({ ts, rule: 'ollama_idle_over_budget', severity: 'warn', finding: finding + ' (unload failed: ' + e?.message + ')', action: 'none' });
                    }
                }
                else {
                    await this.record({ ts, rule: 'ollama_idle_over_budget', severity: 'warn', finding: finding + ' [observe-only]', action: 'none' });
                }
            }
        }
    }
    async ruleOllamaWatchdog(ts) {
        try {
            const r = await fetch('http://localhost:11434/api/tags');
            if (r.ok) {
                this.ollamaDownStreak = 0;
                return;
            }
            this.ollamaDownStreak++;
        }
        catch {
            this.ollamaDownStreak++;
        }
        if (this.ollamaDownStreak >= OLLAMA_DOWN_TICKS) {
            const finding = `Ollama /api/tags failed ${this.ollamaDownStreak} consecutive checks`;
            if (this.mode === 'act') {
                const r = (0, child_process_1.spawnSync)('bash', ['-c', 'nohup /home/knight2/.local/bin/ollama-serve > /home/knight2/virtualpc/logs/ollama.log 2>&1 &']);
                await this.record({ ts, rule: 'service_down_ollama', severity: 'action', finding, action: 'restart_ollama', details: { status: r.status } });
                this.ollamaDownStreak = 0;
            }
            else {
                await this.record({ ts, rule: 'service_down_ollama', severity: 'critical', finding: finding + ' [observe-only]', action: 'none' });
            }
        }
    }
    async ruleUnattributedHeavy(ts, snap) {
        const heavy = (snap.gpu_procs || []).filter((p) => p.agent === 'other' && p.mem_mb > UNATTR_HEAVY_MIB);
        const now = Date.now();
        const ninety = 30 * 60 * 1000;
        for (const p of heavy) {
            if (!this.unattrFirstSeen.has(p.pid))
                this.unattrFirstSeen.set(p.pid, now);
            const firstSeen = this.unattrFirstSeen.get(p.pid);
            if (now - firstSeen >= ninety) {
                await this.record({
                    ts, rule: 'unattributed_gpu_heavy', severity: 'warn',
                    finding: `PID ${p.pid} (${p.name}) held ${p.mem_mb}MiB on gpu${p.gpu} for ${Math.round((now - firstSeen) / 60000)}m without classification`,
                    action: 'none', details: p,
                });
                this.unattrFirstSeen.delete(p.pid); // only notify once per 30m window
            }
        }
        // Prune PIDs that no longer hold VRAM
        const livePids = new Set((snap.gpu_procs || []).map((p) => p.pid));
        for (const pid of Array.from(this.unattrFirstSeen.keys()))
            if (!livePids.has(pid))
                this.unattrFirstSeen.delete(pid);
    }
    async ruleDiskPressure(ts, snap) {
        const pct = snap?.disk?.root_used_pct || 0;
        if (pct < DISK_PRESSURE_PCT)
            return;
        const finding = `Root disk at ${pct}% (free ${snap.disk.root_free_gb}GB)`;
        if (this.mode === 'act') {
            const r = (0, child_process_1.spawnSync)('docker', ['container', 'prune', '-f'], { encoding: 'utf8' });
            await this.record({ ts, rule: 'disk_pressure_root', severity: 'action', finding, action: 'docker_prune', details: { stdout: r.stdout?.slice(-500) } });
        }
        else {
            await this.record({ ts, rule: 'disk_pressure_root', severity: 'critical', finding: finding + ' [observe-only]', action: 'none' });
        }
    }
    async ruleOrphanOllamaRunner(ts) {
        // Find ollama runner processes whose parent isn't `ollama serve`.
        try {
            const r = (0, child_process_1.spawnSync)('bash', ['-c', 'ps -eo pid,ppid,cmd --no-headers | grep -E "ollama runner" | grep -v grep'], { encoding: 'utf8' });
            for (const line of (r.stdout || '').split('\n')) {
                const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
                if (!m)
                    continue;
                const pid = Number(m[1]), ppid = Number(m[2]);
                if (ppid === 1) {
                    const finding = `Ollama runner PID ${pid} is orphaned (PPID=1)`;
                    if (this.mode === 'act') {
                        (0, child_process_1.spawnSync)('kill', ['-TERM', String(pid)]);
                        await this.record({ ts, rule: 'orphan_ollama_runner', severity: 'action', finding, action: 'kill_pid', details: { pid } });
                    }
                    else {
                        await this.record({ ts, rule: 'orphan_ollama_runner', severity: 'warn', finding: finding + ' [observe-only]', action: 'none' });
                    }
                }
            }
        }
        catch { /* ignore */ }
    }
}
exports.SelfRepair = SelfRepair;
exports.default = SelfRepair;
//# sourceMappingURL=self-repair.js.map
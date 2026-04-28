"use strict";
/**
 * Commercialization — Croesus's promotion proposal engine.
 *
 * Croesus is an LLM agent that suggests promotional spend (Roblox sponsored
 * placements, Twitter/TikTok ads, Discord boosts) for the MOLGANG game. This
 * module enforces three guardrails so an LLM never moves real money on its own:
 *
 *   1. Croesus can only PROPOSE. Status starts at "pending"; nothing is paid.
 *   2. A human with role ceo|cto|economy must approve via /approve before
 *      execute is even callable. Approval is recorded with username + ts.
 *   3. Execute calls Stripe / Roblox APIs only when PROMO_REAL_MONEY=1 and
 *      the per-proposal + per-day spend caps allow it. Otherwise it dry-runs
 *      and records "executed_dryrun".
 *
 * Card details are NEVER stored as PAN. We hold a Stripe customer reference
 * in credentials; charges are made through Stripe's API by customer id +
 * payment method id.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.propose = propose;
exports.list = list;
exports.approve = approve;
exports.reject = reject;
exports.execute = execute;
exports.budget = budget;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const STATE_DIR = process.env.PROMO_STATE_DIR || '/media/knight2/EDS2/virtualpc-state';
const STATE_FILE = path.join(STATE_DIR, 'promotions.json');
const PER_PROPOSAL_CAP_USD = Number(process.env.PROMO_PER_PROPOSAL_CAP || 5);
const PER_DAY_CAP_USD = Number(process.env.PROMO_PER_DAY_CAP || 20);
const REAL_MONEY = process.env.PROMO_REAL_MONEY === '1';
function ensureState() {
    try {
        if (!fs.existsSync(STATE_DIR))
            fs.mkdirSync(STATE_DIR, { recursive: true });
        if (!fs.existsSync(STATE_FILE)) {
            const empty = { proposals: [] };
            fs.writeFileSync(STATE_FILE, JSON.stringify(empty, null, 2));
            return empty;
        }
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
    catch {
        return { proposals: [] };
    }
}
function writeState(s) {
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
    fs.renameSync(tmp, STATE_FILE);
}
function newId() {
    return 'promo_' + Date.now().toString(36) + '_' + (0, crypto_1.randomBytes)(4).toString('hex');
}
function startOfDayUtc() {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function spentToday(s) {
    const cutoff = startOfDayUtc();
    return s.proposals
        .filter(p => p.status === 'executed_real' && new Date(p.executed_at || 0).getTime() >= cutoff)
        .reduce((sum, p) => sum + p.budget_usd, 0);
}
function propose(input) {
    if (!input.pitch || input.pitch.length < 20) {
        return { ok: false, error: 'pitch must be at least 20 chars — explain who the audience is, what the asset is, and why it converts' };
    }
    if (!(input.budget_usd > 0)) {
        return { ok: false, error: 'budget_usd must be > 0' };
    }
    if (input.budget_usd > PER_PROPOSAL_CAP_USD) {
        return { ok: false, error: `budget_usd ${input.budget_usd} exceeds per-proposal cap $${PER_PROPOSAL_CAP_USD} (PROMO_PER_PROPOSAL_CAP)` };
    }
    if (input.predicted_roi_pct < 0) {
        return { ok: false, error: 'predicted_roi_pct must be ≥ 0' };
    }
    const proposal = {
        id: newId(),
        source_agent: input.source_agent,
        channel: input.channel,
        budget_usd: input.budget_usd,
        duration_hours: input.duration_hours,
        pitch: input.pitch,
        predicted_roi_pct: input.predicted_roi_pct,
        status: 'pending',
        created_at: new Date().toISOString(),
    };
    const s = ensureState();
    s.proposals.push(proposal);
    writeState(s);
    return { ok: true, proposal };
}
function list(filter) {
    const s = ensureState();
    if (!filter?.status)
        return s.proposals.slice().reverse();
    return s.proposals.filter(p => p.status === filter.status).reverse();
}
function approve(id, approvedBy) {
    const s = ensureState();
    const p = s.proposals.find(x => x.id === id);
    if (!p)
        return { ok: false, error: 'proposal not found' };
    if (p.status !== 'pending')
        return { ok: false, error: `cannot approve from status=${p.status}` };
    p.status = 'approved';
    p.approved_by = approvedBy;
    p.approved_at = new Date().toISOString();
    writeState(s);
    return { ok: true, proposal: p };
}
function reject(id, rejectedBy) {
    const s = ensureState();
    const p = s.proposals.find(x => x.id === id);
    if (!p)
        return { ok: false, error: 'proposal not found' };
    if (p.status !== 'pending')
        return { ok: false, error: `cannot reject from status=${p.status}` };
    p.status = 'rejected';
    p.rejected_by = rejectedBy;
    p.rejected_at = new Date().toISOString();
    writeState(s);
    return { ok: true, proposal: p };
}
function execute(id) {
    const s = ensureState();
    const p = s.proposals.find(x => x.id === id);
    if (!p)
        return { ok: false, mode: 'dryrun', proposal: { id, source_agent: '', channel: 'other', budget_usd: 0, duration_hours: 0, pitch: '', predicted_roi_pct: 0, status: 'failed', created_at: '' }, error: 'proposal not found' };
    if (p.status !== 'approved') {
        return { ok: false, mode: 'dryrun', proposal: p, error: `cannot execute from status=${p.status}` };
    }
    // Day-cap: hard refuse to spend over PER_DAY_CAP_USD on real money.
    if (REAL_MONEY) {
        const already = spentToday(s);
        if (already + p.budget_usd > PER_DAY_CAP_USD) {
            return { ok: false, mode: 'real', proposal: p, error: `would exceed daily cap: spent_today=$${already.toFixed(2)} + this=$${p.budget_usd} > $${PER_DAY_CAP_USD} (PROMO_PER_DAY_CAP)` };
        }
    }
    if (!REAL_MONEY) {
        p.status = 'executed_dryrun';
        p.executed_at = new Date().toISOString();
        writeState(s);
        return { ok: true, mode: 'dryrun', proposal: p };
    }
    // Real-money path is intentionally unimplemented. Wiring Stripe / Roblox
    // Open Cloud requires a separate review of the keys, the customer record,
    // and the API surface — none of which should ship behind this PR. Surfacing
    // the gate clearly so this isn't quietly skipped later.
    p.status = 'failed';
    p.failure_reason = 'real-money path not wired — implement Stripe/Roblox callout under separate review';
    p.executed_at = new Date().toISOString();
    writeState(s);
    return { ok: false, mode: 'real', proposal: p, error: p.failure_reason };
}
function budget() {
    const s = ensureState();
    const spent = spentToday(s);
    return {
        per_proposal_cap_usd: PER_PROPOSAL_CAP_USD,
        per_day_cap_usd: PER_DAY_CAP_USD,
        spent_today_usd: spent,
        remaining_today_usd: Math.max(0, PER_DAY_CAP_USD - spent),
        real_money_enabled: REAL_MONEY,
    };
}
//# sourceMappingURL=commercialization.js.map
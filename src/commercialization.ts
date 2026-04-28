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

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

const STATE_DIR = process.env.PROMO_STATE_DIR || '/media/knight2/EDS2/virtualpc-state';
const STATE_FILE = path.join(STATE_DIR, 'promotions.json');

const PER_PROPOSAL_CAP_USD = Number(process.env.PROMO_PER_PROPOSAL_CAP || 5);
const PER_DAY_CAP_USD = Number(process.env.PROMO_PER_DAY_CAP || 20);
const REAL_MONEY = process.env.PROMO_REAL_MONEY === '1';

export type PromoChannel =
  | 'roblox-sponsored'
  | 'twitter-ad'
  | 'tiktok-ad'
  | 'discord-boost'
  | 'youtube-shorts'
  | 'other';

export type PromoStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed_real'
  | 'executed_dryrun'
  | 'failed';

export interface PromotionProposal {
  id: string;
  source_agent: string;
  channel: PromoChannel;
  budget_usd: number;
  duration_hours: number;
  pitch: string;
  predicted_roi_pct: number;
  status: PromoStatus;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  executed_at?: string;
  failure_reason?: string;
  external_ref?: string;
}

interface PromotionsState {
  proposals: PromotionProposal[];
}

function ensureState(): PromotionsState {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    if (!fs.existsSync(STATE_FILE)) {
      const empty: PromotionsState = { proposals: [] };
      fs.writeFileSync(STATE_FILE, JSON.stringify(empty, null, 2));
      return empty;
    }
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as PromotionsState;
  } catch {
    return { proposals: [] };
  }
}

function writeState(s: PromotionsState): void {
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

function newId(): string {
  return 'promo_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex');
}

function startOfDayUtc(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function spentToday(s: PromotionsState): number {
  const cutoff = startOfDayUtc();
  return s.proposals
    .filter(p => p.status === 'executed_real' && new Date(p.executed_at || 0).getTime() >= cutoff)
    .reduce((sum, p) => sum + p.budget_usd, 0);
}

export interface ProposeInput {
  source_agent: string;
  channel: PromoChannel;
  budget_usd: number;
  duration_hours: number;
  pitch: string;
  predicted_roi_pct: number;
}

export function propose(input: ProposeInput): { ok: true; proposal: PromotionProposal } | { ok: false; error: string } {
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

  const proposal: PromotionProposal = {
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

export function list(filter?: { status?: PromoStatus }): PromotionProposal[] {
  const s = ensureState();
  if (!filter?.status) return s.proposals.slice().reverse();
  return s.proposals.filter(p => p.status === filter.status).reverse();
}

export function approve(id: string, approvedBy: string): { ok: true; proposal: PromotionProposal } | { ok: false; error: string } {
  const s = ensureState();
  const p = s.proposals.find(x => x.id === id);
  if (!p) return { ok: false, error: 'proposal not found' };
  if (p.status !== 'pending') return { ok: false, error: `cannot approve from status=${p.status}` };
  p.status = 'approved';
  p.approved_by = approvedBy;
  p.approved_at = new Date().toISOString();
  writeState(s);
  return { ok: true, proposal: p };
}

export function reject(id: string, rejectedBy: string): { ok: true; proposal: PromotionProposal } | { ok: false; error: string } {
  const s = ensureState();
  const p = s.proposals.find(x => x.id === id);
  if (!p) return { ok: false, error: 'proposal not found' };
  if (p.status !== 'pending') return { ok: false, error: `cannot reject from status=${p.status}` };
  p.status = 'rejected';
  p.rejected_by = rejectedBy;
  p.rejected_at = new Date().toISOString();
  writeState(s);
  return { ok: true, proposal: p };
}

export interface ExecuteResult {
  ok: boolean;
  mode: 'real' | 'dryrun';
  proposal: PromotionProposal;
  error?: string;
}

export function execute(id: string): ExecuteResult {
  const s = ensureState();
  const p = s.proposals.find(x => x.id === id);
  if (!p) return { ok: false, mode: 'dryrun', proposal: { id, source_agent: '', channel: 'other', budget_usd: 0, duration_hours: 0, pitch: '', predicted_roi_pct: 0, status: 'failed', created_at: '' }, error: 'proposal not found' };
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

export function budget(): {
  per_proposal_cap_usd: number;
  per_day_cap_usd: number;
  spent_today_usd: number;
  remaining_today_usd: number;
  real_money_enabled: boolean;
} {
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

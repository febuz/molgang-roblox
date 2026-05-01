/**
 * Commercialization — Croesus's promotion proposal engine.
 *
 * Croesus is an LLM agent that suggests promotional spend (legacy sponsored
 * placements, Twitter/TikTok ads, Discord boosts) for the the project game. This
 * module enforces three guardrails so an LLM never moves real money on its own:
 *
 *   1. Croesus can only PROPOSE. Status starts at "pending"; nothing is paid.
 *   2. A human with role ceo|cto|economy must approve via /approve before
 *      execute is even callable. Approval is recorded with username + ts.
 *   3. Execute calls Stripe / legacy APIs only when PROMO_REAL_MONEY=1 and
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

// Lazy-required so the module loads on a build that skipped `npm install`
// or in an environment that explicitly sets PROMO_REAL_MONEY=0 and never
// touches Stripe. The real-money path falls back to "stripe sdk not
// available" instead of crashing on module load.
let _stripeModule: any = null;
let _stripeClient: any = null;
function getStripe(): any | null {
  if (_stripeClient) return _stripeClient;
  if (!_stripeModule) {
    try { _stripeModule = require('stripe'); } catch { return null; }
  }
  const key = process.env.STRIPE_API_KEY;
  if (!key) return null;
  // typescript: _stripeModule is the constructor, called with the secret key.
  _stripeClient = _stripeModule(key, { apiVersion: '2024-06-20' as any, telemetry: false });
  return _stripeClient;
}

const STATE_DIR = process.env.PROMO_STATE_DIR || '/media/knight2/EDS2/virtualpc-state';
const STATE_FILE = path.join(STATE_DIR, 'promotions.json');

const PER_PROPOSAL_CAP_USD = Number(process.env.PROMO_PER_PROPOSAL_CAP || 5);
const PER_DAY_CAP_USD = Number(process.env.PROMO_PER_DAY_CAP || 20);
const REAL_MONEY = process.env.PROMO_REAL_MONEY === '1';

// VirtualV Holding B.V. Stripe identifiers — set via env so secrets never
// land in git. STRIPE_CUSTOMER_ID is the Stripe customer (cus_...) and
// STRIPE_PAYMENT_METHOD_ID is the saved card (pm_...). Both are required
// when REAL_MONEY=1.
const STRIPE_CUSTOMER_ID = process.env.STRIPE_CUSTOMER_ID || '';
const STRIPE_PAYMENT_METHOD_ID = process.env.STRIPE_PAYMENT_METHOD_ID || '';
const STRIPE_STATEMENT_DESCRIPTOR = (process.env.STRIPE_STATEMENT_DESCRIPTOR || 'VIRTUALV PROMO').slice(0, 22);

export type PromoChannel =
  | 'sponsored-channel-1'
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
  /** Stripe PaymentIntent id (pi_...) when status === 'executed_real'. */
  stripe_payment_intent_id?: string;
  /** Stripe charge status: succeeded | requires_action | failed — copied from the PI for the dashboard. */
  stripe_status?: string;
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

export async function execute(id: string): Promise<ExecuteResult> {
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

  // === Real-money path =====================================================
  // Charges the VirtualV Holding B.V. Stripe customer for the proposal's
  // budget, in USD, off-session (the saved card was set up earlier via the
  // Stripe dashboard or Setup Intent — this code never sees a PAN).
  //
  // Idempotency key = proposal id, so accidental double-clicks on /execute
  // are coalesced to a single charge by Stripe. `confirm: true` plus
  // off_session: true performs the charge synchronously when the saved card
  // is exempt from SCA; otherwise Stripe returns requires_action and we
  // surface that to the reviewer instead of charging.
  const stripe = getStripe();
  if (!stripe) {
    p.status = 'failed';
    p.failure_reason = 'STRIPE_API_KEY missing or stripe SDK unavailable — set the Stripe credential and restart';
    p.executed_at = new Date().toISOString();
    writeState(s);
    return { ok: false, mode: 'real', proposal: p, error: p.failure_reason };
  }
  if (!STRIPE_CUSTOMER_ID || !STRIPE_PAYMENT_METHOD_ID) {
    p.status = 'failed';
    p.failure_reason = 'STRIPE_CUSTOMER_ID and STRIPE_PAYMENT_METHOD_ID env vars are required for real-money execution';
    p.executed_at = new Date().toISOString();
    writeState(s);
    return { ok: false, mode: 'real', proposal: p, error: p.failure_reason };
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(p.budget_usd * 100),  // Stripe takes integer cents
      currency: 'usd',
      customer: STRIPE_CUSTOMER_ID,
      payment_method: STRIPE_PAYMENT_METHOD_ID,
      off_session: true,
      confirm: true,
      statement_descriptor: STRIPE_STATEMENT_DESCRIPTOR,
      description: `the project promo ${p.id} · ${p.channel} · ${p.duration_hours}h`,
      metadata: {
        proposal_id: p.id,
        channel: p.channel,
        approved_by: p.approved_by || '',
        predicted_roi_pct: String(p.predicted_roi_pct),
        source_agent: p.source_agent,
      },
    }, {
      idempotencyKey: `promo-${p.id}`,
    });

    p.stripe_payment_intent_id = intent.id;
    p.stripe_status = intent.status;

    if (intent.status === 'succeeded') {
      p.status = 'executed_real';
      p.external_ref = intent.id;
      p.executed_at = new Date().toISOString();
      writeState(s);
      return { ok: true, mode: 'real', proposal: p };
    }

    // requires_action / requires_payment_method / processing — keep the
    // proposal in 'approved' so the reviewer can retry once the upstream
    // resolves the SCA challenge or fixes the payment method. Recording the
    // PI id and status so the dashboard surfaces what's holding it up.
    p.failure_reason = `stripe returned status=${intent.status}; not charged. Resolve in the Stripe dashboard, then re-run /execute.`;
    writeState(s);
    return { ok: false, mode: 'real', proposal: p, error: p.failure_reason };
  } catch (e: any) {
    // CardError, RateLimitError, etc. Surface the Stripe-provided message so
    // the reviewer knows whether to retry or escalate.
    const code = e?.code || e?.type || 'unknown';
    const msg = (e?.message || 'stripe error').slice(0, 300);
    p.status = 'failed';
    p.failure_reason = `stripe ${code}: ${msg}`;
    p.executed_at = new Date().toISOString();
    writeState(s);
    return { ok: false, mode: 'real', proposal: p, error: p.failure_reason };
  }
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

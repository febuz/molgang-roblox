/**
 * Slag carry-over — Roblox players bring their MOLGANG slag stockpile into the
 * web build by submitting a screenshot of their Roblox inventory. A reviewer
 * verifies the screenshot vs the claimed amount, then approves the credit.
 *
 * Why a manual review step (not pure OCR-and-credit):
 *   - Anyone can make a fake screenshot. OCR can't tell forgery from genuine.
 *   - Per-user caps + reviewer sign-off keeps abuse bounded while we build
 *     trust in the OCR. The hook is here for OCR (extracted_text field),
 *     it just isn't wired yet — adding tesseract.js can fill that in later.
 *
 * Storage:
 *   - Claim records (no image bytes) → /media/knight2/EDS2/virtualpc-state/slag-claims.json
 *   - Image bytes  → /media/knight2/EDS2/virtualpc-state/slag-screenshots/<id>.png
 *
 * Caps (env-tunable):
 *   - SLAG_PER_CLAIM_MAX (default 100_000)
 *   - SLAG_PER_USER_PER_DAY_MAX (default 100_000)
 *   - SLAG_IMAGE_MAX_BYTES (default 4 * 1024 * 1024)
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes, createHash } from 'crypto';

const STATE_DIR = process.env.SLAG_STATE_DIR || '/media/knight2/EDS2/virtualpc-state';
const CLAIMS_FILE = path.join(STATE_DIR, 'slag-claims.json');
const SCREENSHOT_DIR = path.join(STATE_DIR, 'slag-screenshots');

const PER_CLAIM_MAX = Number(process.env.SLAG_PER_CLAIM_MAX || 100_000);
const PER_USER_PER_DAY_MAX = Number(process.env.SLAG_PER_USER_PER_DAY_MAX || 100_000);
const IMAGE_MAX_BYTES = Number(process.env.SLAG_IMAGE_MAX_BYTES || 4 * 1024 * 1024);

export type SlagClaimStatus = 'pending' | 'approved' | 'rejected';

export interface SlagClaim {
  id: string;
  roblox_username: string;
  web_username: string;
  claimed_amount: number;
  screenshot_path: string;     // path on disk
  screenshot_sha256: string;   // dedupe hash
  status: SlagClaimStatus;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  /**
   * Reserved for future OCR — populated by an enrichment pass once tesseract
   * lands. Reviewers can already read the value to cross-check the claim
   * even before the auto-OCR is wired.
   */
  extracted_text?: string;
}

interface ClaimsState {
  claims: SlagClaim[];
}

function ensureState(): ClaimsState {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  if (!fs.existsSync(CLAIMS_FILE)) {
    const empty: ClaimsState = { claims: [] };
    fs.writeFileSync(CLAIMS_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  try { return JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf8')) as ClaimsState; }
  catch { return { claims: [] }; }
}

function writeState(s: ClaimsState): void {
  const tmp = CLAIMS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, CLAIMS_FILE);
}

function newId(): string {
  return 'slag_' + Date.now().toString(36) + '_' + randomBytes(4).toString('hex');
}

function startOfUtcDay(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function approvedTodayForUser(state: ClaimsState, robloxUsername: string): number {
  const cutoff = startOfUtcDay();
  return state.claims
    .filter(c => c.status === 'approved' && c.roblox_username === robloxUsername && new Date(c.reviewed_at || 0).getTime() >= cutoff)
    .reduce((sum, c) => sum + c.claimed_amount, 0);
}

export interface SubmitInput {
  roblox_username: string;
  web_username: string;
  claimed_amount: number;
  /** Image bytes as a base64 string (data: prefix optional). */
  screenshot_base64: string;
}

export function submit(input: SubmitInput): { ok: true; claim: SlagClaim } | { ok: false; error: string } {
  const robloxName = (input.roblox_username || '').trim();
  const webName = (input.web_username || '').trim();
  if (!robloxName || !webName) {
    return { ok: false, error: 'roblox_username and web_username are required' };
  }
  if (!Number.isFinite(input.claimed_amount) || input.claimed_amount <= 0) {
    return { ok: false, error: 'claimed_amount must be a positive number' };
  }
  if (input.claimed_amount > PER_CLAIM_MAX) {
    return { ok: false, error: `claimed_amount ${input.claimed_amount} exceeds per-claim cap ${PER_CLAIM_MAX}` };
  }

  // Decode the image. Accept "data:image/png;base64,..." or raw base64.
  const raw = (input.screenshot_base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  if (!raw) return { ok: false, error: 'screenshot_base64 is required' };
  let imgBytes: Buffer;
  try { imgBytes = Buffer.from(raw, 'base64'); } catch { return { ok: false, error: 'screenshot is not valid base64' }; }
  if (imgBytes.length > IMAGE_MAX_BYTES) {
    return { ok: false, error: `image ${imgBytes.length} bytes exceeds cap ${IMAGE_MAX_BYTES}` };
  }
  if (imgBytes.length < 200) {
    return { ok: false, error: 'image too small to be a real screenshot' };
  }

  const state = ensureState();

  // Dedup: same SHA-256 image already submitted? Fail-safe to deny double-claim.
  const sha = createHash('sha256').update(imgBytes).digest('hex');
  if (state.claims.some(c => c.screenshot_sha256 === sha)) {
    return { ok: false, error: 'this screenshot was already submitted' };
  }

  const id = newId();
  const screenshotPath = path.join(SCREENSHOT_DIR, `${id}.png`);
  fs.writeFileSync(screenshotPath, imgBytes);

  const claim: SlagClaim = {
    id,
    roblox_username: robloxName,
    web_username: webName,
    claimed_amount: input.claimed_amount,
    screenshot_path: screenshotPath,
    screenshot_sha256: sha,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  state.claims.push(claim);
  writeState(state);
  return { ok: true, claim };
}

export function list(filter?: { status?: SlagClaimStatus; roblox_username?: string }): SlagClaim[] {
  const state = ensureState();
  let claims = state.claims.slice().reverse();
  if (filter?.status) claims = claims.filter(c => c.status === filter.status);
  if (filter?.roblox_username) claims = claims.filter(c => c.roblox_username === filter.roblox_username);
  return claims;
}

export function approve(id: string, reviewer: string, notes?: string): { ok: true; claim: SlagClaim } | { ok: false; error: string } {
  const state = ensureState();
  const c = state.claims.find(x => x.id === id);
  if (!c) return { ok: false, error: 'claim not found' };
  if (c.status !== 'pending') return { ok: false, error: `cannot approve from status=${c.status}` };

  // Per-user-per-day cap, evaluated at approval time so a queue of pending
  // claims can't all sneak through if they were submitted within seconds.
  const alreadyToday = approvedTodayForUser(state, c.roblox_username);
  if (alreadyToday + c.claimed_amount > PER_USER_PER_DAY_MAX) {
    return {
      ok: false,
      error: `would exceed daily cap for ${c.roblox_username}: approved_today=${alreadyToday} + this=${c.claimed_amount} > ${PER_USER_PER_DAY_MAX}`,
    };
  }

  c.status = 'approved';
  c.reviewed_by = reviewer;
  c.reviewed_at = new Date().toISOString();
  if (notes) c.review_notes = notes;
  writeState(state);
  return { ok: true, claim: c };
}

export function reject(id: string, reviewer: string, notes?: string): { ok: true; claim: SlagClaim } | { ok: false; error: string } {
  const state = ensureState();
  const c = state.claims.find(x => x.id === id);
  if (!c) return { ok: false, error: 'claim not found' };
  if (c.status !== 'pending') return { ok: false, error: `cannot reject from status=${c.status}` };
  c.status = 'rejected';
  c.reviewed_by = reviewer;
  c.reviewed_at = new Date().toISOString();
  if (notes) c.review_notes = notes;
  writeState(state);
  return { ok: true, claim: c };
}

export function summary() {
  const state = ensureState();
  const now = startOfUtcDay();
  const counts = { pending: 0, approved: 0, rejected: 0 };
  let approvedSlagToday = 0;
  let approvedSlagTotal = 0;
  for (const c of state.claims) {
    counts[c.status]++;
    if (c.status === 'approved') {
      approvedSlagTotal += c.claimed_amount;
      if (new Date(c.reviewed_at || 0).getTime() >= now) approvedSlagToday += c.claimed_amount;
    }
  }
  return {
    counts,
    approvedSlagToday,
    approvedSlagTotal,
    per_claim_max: PER_CLAIM_MAX,
    per_user_per_day_max: PER_USER_PER_DAY_MAX,
  };
}

/** Read raw bytes of a stored screenshot — used by GET /api/migration/slag/claims/:id/screenshot */
export function readScreenshot(id: string): { ok: true; bytes: Buffer } | { ok: false; error: string } {
  const state = ensureState();
  const c = state.claims.find(x => x.id === id);
  if (!c) return { ok: false, error: 'claim not found' };
  if (!fs.existsSync(c.screenshot_path)) return { ok: false, error: 'screenshot file missing on disk' };
  return { ok: true, bytes: fs.readFileSync(c.screenshot_path) };
}

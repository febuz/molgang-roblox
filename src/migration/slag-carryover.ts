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

// Lazy-required so the module loads even if tesseract.js was never installed
// (e.g. someone built dist/ without running `npm install`). The submit path
// degrades to "no extracted_text" rather than crashing.
let _tesseract: any = null;
function loadTesseract(): any | null {
  if (_tesseract) return _tesseract;
  try { _tesseract = require('tesseract.js'); return _tesseract; }
  catch { return null; }
}

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
   * OCR-extracted text (full output) and the numeric candidates parsed from
   * it. Populated asynchronously after submit() returns; reviewers see the
   * matched/mismatched flag once enrichment finishes.
   */
  extracted_text?: string;
  extracted_numbers?: number[];
  /** "match" if claimed_amount appears among extracted_numbers, "mismatch" if numbers were extracted but the claim isn't there, "no_text" if OCR found nothing. */
  ocr_status?: 'match' | 'mismatch' | 'no_text' | 'pending' | 'failed';
  ocr_error?: string;
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
    ocr_status: 'pending',
  };
  state.claims.push(claim);
  writeState(state);

  // Fire OCR enrichment in the background — submitter doesn't wait for the
  // multi-second tesseract pass. Errors are written into the claim record,
  // never throw out of here.
  enrich(id).catch(err => {
    process.stderr.write(`slag-carryover enrich(${id}) failed: ${err.message}\n`);
  });

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

/**
 * OCR enrichment — runs tesseract on the screenshot, extracts text + numeric
 * candidates, and writes them back to the claim record. Async on purpose so
 * the submit() response isn't blocked by a multi-second OCR pass.
 *
 * Status values:
 *   match     — claimed_amount is one of the numbers tesseract found
 *   mismatch  — numbers found, but none equal the claim (reviewer should look)
 *   no_text   — tesseract returned nothing (low-quality image, blank, etc.)
 *   failed    — tesseract.js not installed or threw mid-recognition
 *   pending   — set on submit, replaced once enrichment completes
 */
export async function enrich(claimId: string): Promise<void> {
  const state = ensureState();
  const c = state.claims.find(x => x.id === claimId);
  if (!c) return;

  const tesseract = loadTesseract();
  if (!tesseract) {
    c.ocr_status = 'failed';
    c.ocr_error = 'tesseract.js not available';
    writeState(ensureState());
    return;
  }

  let text = '';
  try {
    if (!fs.existsSync(c.screenshot_path)) {
      c.ocr_status = 'failed';
      c.ocr_error = 'screenshot file missing';
      writeState(ensureState());
      return;
    }
    // tesseract.recognize accepts a path. Default lang 'eng' — Roblox UI is
    // English, so we don't bundle other language models.
    const { data } = await tesseract.recognize(c.screenshot_path, 'eng');
    text = (data?.text || '').trim();
  } catch (e: any) {
    // Re-read state — another process may have approved/rejected meanwhile.
    const fresh = ensureState();
    const cur = fresh.claims.find(x => x.id === claimId);
    if (cur) {
      cur.ocr_status = 'failed';
      cur.ocr_error = e.message?.slice(0, 200) || 'ocr error';
      writeState(fresh);
    }
    return;
  }

  // Pull candidate numbers from the text. Roblox often shows formatted counts
  // like "12,345" or "1.2M" — handle commas; M/K suffixes are best-effort.
  const numbers: number[] = [];
  const matches = text.match(/[0-9][0-9,]*(?:\.[0-9]+)?\s*[MmKk]?/g) || [];
  for (const raw of matches) {
    const cleaned = raw.replace(/,/g, '').trim();
    let n = parseFloat(cleaned);
    if (!Number.isFinite(n)) continue;
    if (/M$/i.test(cleaned)) n *= 1_000_000;
    else if (/K$/i.test(cleaned)) n *= 1_000;
    if (n > 0 && n < 1e10) numbers.push(Math.round(n));
  }
  // Dedupe but keep order
  const seen = new Set<number>();
  const uniq = numbers.filter(n => seen.has(n) ? false : (seen.add(n), true));

  // Re-read because the claim may have been approved/rejected during OCR.
  const fresh = ensureState();
  const cur = fresh.claims.find(x => x.id === claimId);
  if (!cur) return;
  cur.extracted_text = text.slice(0, 4000); // cap stored length
  cur.extracted_numbers = uniq;
  if (!text) cur.ocr_status = 'no_text';
  else if (uniq.includes(cur.claimed_amount)) cur.ocr_status = 'match';
  else cur.ocr_status = 'mismatch';
  delete cur.ocr_error;
  writeState(fresh);
}

/** Read raw bytes of a stored screenshot — used by GET /api/migration/slag/claims/:id/screenshot */
export function readScreenshot(id: string): { ok: true; bytes: Buffer } | { ok: false; error: string } {
  const state = ensureState();
  const c = state.claims.find(x => x.id === id);
  if (!c) return { ok: false, error: 'claim not found' };
  if (!fs.existsSync(c.screenshot_path)) return { ok: false, error: 'screenshot file missing on disk' };
  return { ok: true, bytes: fs.readFileSync(c.screenshot_path) };
}

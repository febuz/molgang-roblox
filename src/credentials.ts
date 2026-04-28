/**
 * Provider credentials store — saves API keys + emails for upstream LLM
 * providers (Anthropic, OpenAI, Grok, DeepSeek, Kimi/Moonshot, Perplexity).
 *
 * Storage: /media/knight2/EDS2/virtualpc-state/credentials.json (gitignored)
 * Reading: returns *masked* values (show first 4 + last 4 chars only).
 * Writing: replaces a single provider's record at a time.
 *
 * Loaded into process.env on startup so VirtualPC's LM Studio router and any
 * cloud-fallback wrappers can see them without restarts.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from './utils/logger';

const STATE_DIR = process.env.VIRTUALPC_STATE_DIR || '/media/knight2/EDS2/virtualpc-state';
const CRED_PATH = path.join(STATE_DIR, 'credentials.json');

export interface ProviderRecord {
  provider: string;       // anthropic, openai, grok, deepseek, kimi, perplexity
  email: string;          // account email
  api_key: string;        // raw key (stored, never returned via API except masked)
  base_url?: string;      // optional override (Moonshot endpoint, OpenRouter, etc.)
  notes?: string;
  updated_at: string;     // ISO
}

export interface ProviderMeta {
  id: string;
  label: string;
  default_base_url: string;
  /** Env var name we expose so the rest of the app finds the key without changes. */
  env_var: string;
  docs_url: string;
}

export const PROVIDER_CATALOG: ProviderMeta[] = [
  { id: 'anthropic',  label: 'Anthropic Claude',  default_base_url: 'https://api.anthropic.com',           env_var: 'ANTHROPIC_API_KEY',  docs_url: 'https://docs.anthropic.com/' },
  { id: 'openai',     label: 'OpenAI',            default_base_url: 'https://api.openai.com/v1',           env_var: 'OPENAI_API_KEY',     docs_url: 'https://platform.openai.com/docs' },
  { id: 'grok',       label: 'xAI Grok',          default_base_url: 'https://api.x.ai/v1',                 env_var: 'XAI_API_KEY',        docs_url: 'https://docs.x.ai/' },
  { id: 'deepseek',   label: 'DeepSeek',          default_base_url: 'https://api.deepseek.com',            env_var: 'DEEPSEEK_API_KEY',   docs_url: 'https://platform.deepseek.com/' },
  { id: 'kimi',       label: 'Moonshot Kimi',     default_base_url: 'https://api.moonshot.cn/v1',          env_var: 'MOONSHOT_API_KEY',   docs_url: 'https://platform.moonshot.cn/' },
  { id: 'perplexity', label: 'Perplexity',        default_base_url: 'https://api.perplexity.ai',           env_var: 'PPLX_API_KEY',       docs_url: 'https://docs.perplexity.ai/' },
  { id: 'mistral',    label: 'Mistral',           default_base_url: 'https://api.mistral.ai/v1',           env_var: 'MISTRAL_API_KEY',    docs_url: 'https://docs.mistral.ai/' },
  { id: 'google',     label: 'Google Gemini',     default_base_url: 'https://generativelanguage.googleapis.com', env_var: 'GOOGLE_API_KEY', docs_url: 'https://ai.google.dev/' },
  // Stripe — for Croesus's commercialization spend. Account is registered
  // to VirtualV Holding B.V. Use a *restricted* key with charges:write only.
  { id: 'stripe',     label: 'Stripe (VirtualV Holding B.V.)', default_base_url: 'https://api.stripe.com', env_var: 'STRIPE_API_KEY',   docs_url: 'https://stripe.com/docs/api' },
];

let credentials: ProviderRecord[] = [];

function ensureDir() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

export function loadCredentials() {
  try {
    if (!fs.existsSync(CRED_PATH)) {
      credentials = [];
      return;
    }
    const raw = fs.readFileSync(CRED_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    credentials = Array.isArray(parsed.providers) ? parsed.providers : [];
    // Push every key into process.env using the canonical env var name
    for (const rec of credentials) {
      const meta = PROVIDER_CATALOG.find(p => p.id === rec.provider);
      if (meta && rec.api_key) {
        process.env[meta.env_var] = rec.api_key;
      }
    }
    logger.info(`credentials: loaded ${credentials.length} provider records`);
  } catch (e: any) {
    logger.warn(`credentials: load failed: ${e.message}`);
    credentials = [];
  }
}

function saveCredentials() {
  ensureDir();
  const tmp = CRED_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ updated_at: new Date().toISOString(), providers: credentials }, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CRED_PATH);
  fs.chmodSync(CRED_PATH, 0o600);
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '****';
  return key.slice(0, 4) + '…' + key.slice(-4);
}

export function listMasked() {
  return PROVIDER_CATALOG.map(meta => {
    const rec = credentials.find(c => c.provider === meta.id);
    return {
      ...meta,
      configured: !!rec,
      email: rec?.email || '',
      api_key_masked: rec ? maskKey(rec.api_key) : '',
      base_url: rec?.base_url || meta.default_base_url,
      notes: rec?.notes || '',
      updated_at: rec?.updated_at || null,
    };
  });
}

export function setProvider(provider: string, fields: { email?: string; api_key?: string; base_url?: string; notes?: string }) {
  const meta = PROVIDER_CATALOG.find(p => p.id === provider);
  if (!meta) throw new Error(`unknown provider: ${provider}`);
  const existing = credentials.find(c => c.provider === provider);
  const merged: ProviderRecord = {
    provider,
    email: fields.email ?? existing?.email ?? '',
    api_key: fields.api_key ?? existing?.api_key ?? '',
    base_url: fields.base_url ?? existing?.base_url,
    notes: fields.notes ?? existing?.notes,
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    credentials = credentials.map(c => c.provider === provider ? merged : c);
  } else {
    credentials.push(merged);
  }
  saveCredentials();
  if (merged.api_key) process.env[meta.env_var] = merged.api_key;
  logger.info(`credentials: updated ${provider} (key=${maskKey(merged.api_key)})`);
  return { provider, email: merged.email, api_key_masked: maskKey(merged.api_key) };
}

export function deleteProvider(provider: string) {
  const before = credentials.length;
  credentials = credentials.filter(c => c.provider !== provider);
  saveCredentials();
  const meta = PROVIDER_CATALOG.find(p => p.id === provider);
  if (meta) delete process.env[meta.env_var];
  return { removed: before !== credentials.length };
}

// Boot-time load
loadCredentials();

/**
 * Secrets management (replaces scattered process.env / .env secret reads).
 *
 * Design (see docs/OWNERSHIP.md › Security architecture):
 *  - Source of truth is Infisical (https://eu.infisical.com), NOT .env files.
 *  - Secrets are organised into three layers by blast radius:
 *      api   – third-party API keys (read/fetch)
 *      infra – infrastructure credentials (DBs, brokers, encryption keys)
 *      money – anything that can move real money (Alpaca trading) — most restricted
 *  - The fetched bundle is validated with a Zod schema (fail-fast).
 *  - A per-agent access model scopes which agent may read which layer
 *    (e.g. an internet scraper may read nothing).
 *
 * The ONLY environment variables read here are the Infisical machine-identity
 * *bootstrap* creds (INFISICAL_*), which a platform/systemd unit injects at
 * deploy time — they are never stored in a committed .env file, and no app
 * secret (API key, DB password, Alpaca key) lives in the environment.
 */

import { z } from 'zod';
import logger from '../utils/logger';

export type SecretLayer = 'api' | 'infra' | 'money';
export const SECRET_LAYERS: SecretLayer[] = ['api', 'infra', 'money'];

/** Known secret keys per layer (the migration target from process.env). */
export const LAYER_KEYS: Record<SecretLayer, string[]> = {
  api: ['ANTHROPIC_API_KEY'],
  infra: ['FIELD_ENCRYPTION_KEY', 'NEO4J_PASSWORD', 'KAFKA_BROKERS'],
  money: ['ALPACA_API_KEY', 'ALPACA_API_SECRET', 'STRIPE_PAYMENT_METHOD_ID'],
};

/**
 * Per-layer Zod schemas. Keys are optional (not every deployment sets every
 * one) but format-checked when present; unknown keys are tolerated (Infisical
 * folders may hold more than the app consumes). Validation is about catching
 * malformed/typo'd values early, not forcing presence.
 */
const LAYER_SCHEMAS = {
  api: z.object({
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
  }),
  infra: z.object({
    FIELD_ENCRYPTION_KEY: z.string().min(16).optional(),
    NEO4J_PASSWORD: z.string().min(1).optional(),
    KAFKA_BROKERS: z.string().min(1).optional(),
  }),
  money: z.object({
    ALPACA_API_KEY: z.string().min(1).optional(),
    ALPACA_API_SECRET: z.string().min(1).optional(),
    STRIPE_PAYMENT_METHOD_ID: z.string().min(1).optional(),
  }),
} satisfies Record<SecretLayer, unknown>;

/** A source of raw secrets for a layer. */
export interface SecretsProvider {
  load(layer: SecretLayer): Promise<Record<string, string>>;
}

/** In-memory provider for tests and local development — no network, no .env. */
export class InMemorySecretsProvider implements SecretsProvider {
  constructor(private readonly store: Partial<Record<SecretLayer, Record<string, string>>> = {}) {}
  async load(layer: SecretLayer): Promise<Record<string, string>> {
    return this.store[layer] ?? {};
  }
}

export interface InfisicalConfig {
  apiUrl: string;
  projectId: string;
  clientId: string;
  clientSecret: string;
  /** Maps each secret layer to its Infisical environment slug. */
  layerEnv: Record<SecretLayer, string>;
}

/**
 * Fetches secrets from Infisical via its REST API using machine-identity
 * (universal-auth) credentials. No SDK dependency — keeps the third-party
 * trust surface minimal, which matters for a trading-adjacent system.
 */
export class InfisicalSecretsProvider implements SecretsProvider {
  constructor(private readonly config: InfisicalConfig) {}

  /** Build from injected bootstrap env. Throws if bootstrap creds are absent. */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): InfisicalSecretsProvider {
    const need = (k: string): string => {
      const v = env[k];
      if (!v) throw new Error(`InfisicalSecretsProvider: missing bootstrap env ${k}`);
      return v;
    };
    return new InfisicalSecretsProvider({
      apiUrl: env.INFISICAL_API_URL || 'https://eu.infisical.com',
      projectId: need('INFISICAL_PROJECT_ID'),
      clientId: need('INFISICAL_CLIENT_ID'),
      clientSecret: need('INFISICAL_CLIENT_SECRET'),
      layerEnv: {
        api: env.INFISICAL_ENV_API || 'apis',
        infra: env.INFISICAL_ENV_INFRA || 'infra',
        money: env.INFISICAL_ENV_MONEY || 'money',
      },
    });
  }

  private async authenticate(): Promise<string> {
    const res = await fetch(`${this.config.apiUrl}/api/v1/auth/universal-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: this.config.clientId, clientSecret: this.config.clientSecret }),
    });
    if (!res.ok) throw new Error(`Infisical auth failed: HTTP ${res.status}`);
    const body = (await res.json()) as { accessToken?: string };
    if (!body.accessToken) throw new Error('Infisical auth: no accessToken in response');
    return body.accessToken;
  }

  async load(layer: SecretLayer): Promise<Record<string, string>> {
    const token = await this.authenticate();
    const url = new URL(`${this.config.apiUrl}/api/v3/secrets/raw`);
    url.searchParams.set('workspaceId', this.config.projectId);
    url.searchParams.set('environment', this.config.layerEnv[layer]);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Infisical fetch failed for layer '${layer}': HTTP ${res.status}`);
    const body = (await res.json()) as { secrets?: Array<{ secretKey: string; secretValue: string }> };
    const out: Record<string, string> = {};
    for (const s of body.secrets ?? []) out[s.secretKey] = s.secretValue;
    return out;
  }
}

export type AgentRole = 'scraper' | 'researcher' | 'trader' | 'infra' | 'orchestrator';

/**
 * Per-agent access model: which secret layers each agent role may read.
 * Default-deny — an agent reaches a layer only if listed here.
 */
export const AGENT_ACCESS: Record<AgentRole, SecretLayer[]> = {
  scraper: [], // internet crawler — NO secret access at all
  researcher: ['api'], // may call APIs, never infra/money
  trader: ['money'], // only the real-money layer (Alpaca)
  infra: ['infra'], // infrastructure agent
  orchestrator: ['api', 'infra'], // coordination — explicitly NOT money
};

/** Secret accessor scoped to one agent's allowed layers. */
export class ScopedSecrets {
  constructor(
    private readonly manager: SecretsManager,
    private readonly allowed: SecretLayer[]
  ) {}

  get(layer: SecretLayer, key: string): string | undefined {
    this.assertAllowed(layer);
    return this.manager.get(layer, key);
  }

  require(layer: SecretLayer, key: string): string {
    this.assertAllowed(layer);
    return this.manager.require(layer, key);
  }

  private assertAllowed(layer: SecretLayer): void {
    if (!this.allowed.includes(layer)) {
      throw new Error(`Access denied: agent may not read the '${layer}' secret layer`);
    }
  }
}

/** Loads, validates, caches, and gates access to secrets across the 3 layers. */
export class SecretsManager {
  private readonly cache = new Map<SecretLayer, Record<string, string>>();

  constructor(private readonly provider: SecretsProvider) {}

  /** Load + Zod-validate one layer. Throws on validation failure (fail-fast). */
  async loadLayer(layer: SecretLayer): Promise<void> {
    const raw = await this.provider.load(layer);
    const result = LAYER_SCHEMAS[layer].safeParse(raw);
    if (!result.success) {
      const detail = result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
      throw new Error(`Secret validation failed for layer '${layer}': ${detail}`);
    }
    // Keep the raw map (validated for format) rather than Zod's stripped output,
    // so keys beyond the known set remain reachable.
    this.cache.set(layer, raw);
    logger.info(`✓ Secrets loaded for layer '${layer}' (${Object.keys(raw).length} keys)`);
  }

  /** Load + validate every layer. */
  async loadAll(): Promise<void> {
    for (const layer of SECRET_LAYERS) await this.loadLayer(layer);
  }

  get(layer: SecretLayer, key: string): string | undefined {
    return this.cache.get(layer)?.[key];
  }

  require(layer: SecretLayer, key: string): string {
    const value = this.get(layer, key);
    if (value === undefined) {
      throw new Error(`Missing required secret '${key}' in layer '${layer}'`);
    }
    return value;
  }

  /** Get an accessor scoped to an agent role's allowed layers. */
  for(agent: AgentRole): ScopedSecrets {
    return new ScopedSecrets(this, AGENT_ACCESS[agent] ?? []);
  }
}

/**
 * Build the production SecretsManager from Infisical. Deliberately does NOT
 * fall back to .env — if Infisical bootstrap creds are absent it throws, so we
 * never silently read app secrets from the environment.
 */
export function createSecretsManager(env: NodeJS.ProcessEnv = process.env): SecretsManager {
  return new SecretsManager(InfisicalSecretsProvider.fromEnv(env));
}

export { LAYER_SCHEMAS };

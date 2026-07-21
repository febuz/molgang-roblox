import {
  SecretsManager,
  InMemorySecretsProvider,
  InfisicalSecretsProvider,
  AGENT_ACCESS,
  SECRET_LAYERS,
} from '../../src/security/secrets';

/**
 * Unit tests for the secrets foundation (Infisical 3-layer model + Zod
 * validation + per-agent access). Uses the in-memory provider — no network,
 * no .env.
 */

function manager(store: any) {
  return new SecretsManager(new InMemorySecretsProvider(store));
}

describe('SecretsManager', () => {
  describe('load + Zod validation', () => {
    it('loads and exposes valid secrets per layer', async () => {
      const m = manager({
        api: { ANTHROPIC_API_KEY: 'sk-ant-123' },
        infra: { NEO4J_PASSWORD: 'virtualpc-neo4j-pass' },
        money: { ALPACA_API_KEY: 'PK123', ALPACA_API_SECRET: 'secret123' },
      });
      await m.loadAll();
      expect(m.get('api', 'ANTHROPIC_API_KEY')).toBe('sk-ant-123');
      expect(m.require('money', 'ALPACA_API_KEY')).toBe('PK123');
    });

    it('fails fast when a known key has a malformed value', async () => {
      // FIELD_ENCRYPTION_KEY must be >= 16 chars.
      const m = manager({ infra: { FIELD_ENCRYPTION_KEY: 'tooshort' } });
      await expect(m.loadLayer('infra')).rejects.toThrow(/validation failed for layer 'infra'/);
    });

    it('tolerates unknown keys (Infisical may hold more than the app needs)', async () => {
      const m = manager({ api: { ANTHROPIC_API_KEY: 'sk', SOME_FUTURE_KEY: 'x' } });
      await m.loadLayer('api');
      expect(m.get('api', 'SOME_FUTURE_KEY')).toBe('x'); // reachable, not stripped
    });

    it('require() throws for a missing key', async () => {
      const m = manager({ money: {} });
      await m.loadLayer('money');
      expect(() => m.require('money', 'ALPACA_API_KEY')).toThrow(/Missing required secret/);
    });
  });

  describe('per-agent access model', () => {
    let m: SecretsManager;
    beforeEach(async () => {
      m = manager({
        api: { ANTHROPIC_API_KEY: 'sk' },
        infra: { NEO4J_PASSWORD: 'p' },
        money: { ALPACA_API_KEY: 'PK' },
      });
      await m.loadAll();
    });

    it('a scraper agent may read NOTHING', () => {
      const s = m.for('scraper');
      expect(() => s.get('api', 'ANTHROPIC_API_KEY')).toThrow(/Access denied/);
      expect(() => s.get('infra', 'NEO4J_PASSWORD')).toThrow(/Access denied/);
      expect(() => s.get('money', 'ALPACA_API_KEY')).toThrow(/Access denied/);
    });

    it('a trader may read ONLY the money layer', () => {
      const t = m.for('trader');
      expect(t.get('money', 'ALPACA_API_KEY')).toBe('PK');
      expect(() => t.get('api', 'ANTHROPIC_API_KEY')).toThrow(/Access denied/);
      expect(() => t.get('infra', 'NEO4J_PASSWORD')).toThrow(/Access denied/);
    });

    it('a researcher may read APIs but not infra or money', () => {
      const r = m.for('researcher');
      expect(r.get('api', 'ANTHROPIC_API_KEY')).toBe('sk');
      expect(() => r.get('money', 'ALPACA_API_KEY')).toThrow(/Access denied/);
    });

    it('the orchestrator may read api + infra but explicitly NOT money', () => {
      const o = m.for('orchestrator');
      expect(o.get('api', 'ANTHROPIC_API_KEY')).toBe('sk');
      expect(o.get('infra', 'NEO4J_PASSWORD')).toBe('p');
      expect(() => o.get('money', 'ALPACA_API_KEY')).toThrow(/Access denied/);
    });

    it('the access matrix is default-deny and covers every layer key', () => {
      // scraper has zero layers; money is reachable only by trader.
      expect(AGENT_ACCESS.scraper).toEqual([]);
      const moneyReaders = (Object.keys(AGENT_ACCESS) as Array<keyof typeof AGENT_ACCESS>).filter(a =>
        AGENT_ACCESS[a].includes('money')
      );
      expect(moneyReaders).toEqual(['trader']);
    });
  });

  describe('InfisicalSecretsProvider.fromEnv', () => {
    it('throws when bootstrap creds are missing (never silently falls back)', () => {
      expect(() => InfisicalSecretsProvider.fromEnv({} as NodeJS.ProcessEnv)).toThrow(/bootstrap env/);
    });

    it('builds when all bootstrap creds are present', () => {
      const p = InfisicalSecretsProvider.fromEnv({
        INFISICAL_PROJECT_ID: 'proj',
        INFISICAL_CLIENT_ID: 'cid',
        INFISICAL_CLIENT_SECRET: 'csecret',
      } as any);
      expect(p).toBeInstanceOf(InfisicalSecretsProvider);
    });
  });

  it('declares exactly three layers', () => {
    expect(SECRET_LAYERS).toEqual(['api', 'infra', 'money']);
  });
});

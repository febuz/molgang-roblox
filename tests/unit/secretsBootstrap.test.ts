import {
  isInfisicalConfigured,
  loadSecrets,
  resolveFieldCrypto,
  readSecret,
  setActiveSecrets,
  getActiveSecrets,
  secretOrEnv,
} from '../../src/security/secretsBootstrap';
import { SecretsManager, InMemorySecretsProvider } from '../../src/security/secrets';

const HEX_KEY = 'a'.repeat(64);

async function loadedManager(store: any) {
  const m = new SecretsManager(new InMemorySecretsProvider(store));
  for (const layer of Object.keys(store)) await m.loadLayer(layer as any);
  return m;
}

describe('secretsBootstrap', () => {
  describe('isInfisicalConfigured', () => {
    it('is false unless all bootstrap creds are present', () => {
      expect(isInfisicalConfigured({} as NodeJS.ProcessEnv)).toBe(false);
      expect(isInfisicalConfigured({ INFISICAL_CLIENT_ID: 'a' } as any)).toBe(false);
      expect(
        isInfisicalConfigured({
          INFISICAL_CLIENT_ID: 'a',
          INFISICAL_CLIENT_SECRET: 'b',
          INFISICAL_PROJECT_ID: 'c',
        } as any)
      ).toBe(true);
    });
  });

  describe('loadSecrets', () => {
    it('returns null (no throw) when Infisical is not configured — non-breaking transition', async () => {
      await expect(loadSecrets({} as NodeJS.ProcessEnv)).resolves.toBeNull();
    });
  });

  describe('resolveFieldCrypto', () => {
    it('builds a working FieldCrypto from the infra layer', async () => {
      const m = await loadedManager({ infra: { FIELD_ENCRYPTION_KEY: HEX_KEY } });
      const fc = resolveFieldCrypto(m)!;
      expect(fc).toBeDefined();
      expect(fc.decrypt(fc.encrypt('x'))).toBe('x');
    });

    it('returns undefined when the key is absent (encryption stays off)', async () => {
      const m = await loadedManager({ infra: {} });
      expect(resolveFieldCrypto(m)).toBeUndefined();
    });
  });

  describe('readSecret', () => {
    it('reads a secret for an allowed agent', async () => {
      const m = await loadedManager({ api: { ANTHROPIC_API_KEY: 'sk' } });
      expect(readSecret(m, 'researcher', 'api', 'ANTHROPIC_API_KEY')).toBe('sk');
    });

    it('enforces the access model (scraper is denied)', async () => {
      const m = await loadedManager({ api: { ANTHROPIC_API_KEY: 'sk' } });
      expect(() => readSecret(m, 'scraper', 'api', 'ANTHROPIC_API_KEY')).toThrow(/Access denied/);
    });
  });

  describe('secretOrEnv (active accessor)', () => {
    afterEach(() => {
      setActiveSecrets(null); // avoid cross-test pollution of the module singleton
      delete process.env.__TEST_SECRET__;
    });

    it('prefers the active SecretsManager (Infisical) over env', async () => {
      const m = await loadedManager({ api: { __TEST_SECRET__: 'from-vault' } });
      setActiveSecrets(m);
      process.env.__TEST_SECRET__ = 'from-env';
      expect(secretOrEnv('api', '__TEST_SECRET__')).toBe('from-vault');
    });

    it('falls back to process.env during the transition (no active manager)', () => {
      setActiveSecrets(null);
      process.env.__TEST_SECRET__ = 'from-env';
      expect(secretOrEnv('api', '__TEST_SECRET__')).toBe('from-env');
    });

    it('returns undefined when set nowhere', () => {
      setActiveSecrets(null);
      expect(secretOrEnv('money', '__TEST_SECRET__')).toBeUndefined();
    });

    it('getActiveSecrets reflects what was set', async () => {
      const m = await loadedManager({ api: {} });
      setActiveSecrets(m);
      expect(getActiveSecrets()).toBe(m);
    });
  });
});

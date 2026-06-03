import { SecretsManager, InMemorySecretsProvider } from '../../src/security/secrets';
import FieldCrypto from '../../src/security/fieldCrypto';

/**
 * Integration proof for the .env -> Infisical migration pattern.
 *
 * Demonstrates a REAL secret (FIELD_ENCRYPTION_KEY) flowing end-to-end:
 *   Infisical-style provider -> SecretsManager (Zod-validated) -> per-agent
 *   access control -> consumer (FieldCrypto) — with NO process.env / .env.
 *
 * This is the template every other secret follows when migrating off .env.
 */

const HEX_KEY = 'f'.repeat(64); // valid 32-byte hex field-encryption key

describe('secrets -> FieldCrypto migration pattern (no .env)', () => {
  it('builds a working FieldCrypto from the infra layer via an allowed agent', async () => {
    const secrets = new SecretsManager(
      new InMemorySecretsProvider({ infra: { FIELD_ENCRYPTION_KEY: HEX_KEY } })
    );
    await secrets.loadLayer('infra');

    // Infra-scoped agent resolves the key (no process.env involved).
    const key = secrets.for('infra').require('infra', 'FIELD_ENCRYPTION_KEY');
    const fc = new FieldCrypto(key);

    // The crypto built from the Infisical-sourced key actually works.
    expect(fc.decrypt(fc.encrypt('migrated-secret'))).toBe('migrated-secret');
  });

  it('denies a scraper agent the field-encryption key (access model holds end-to-end)', async () => {
    const secrets = new SecretsManager(
      new InMemorySecretsProvider({ infra: { FIELD_ENCRYPTION_KEY: HEX_KEY } })
    );
    await secrets.loadLayer('infra');
    expect(() => secrets.for('scraper').require('infra', 'FIELD_ENCRYPTION_KEY')).toThrow(/Access denied/);
  });

  it('fails fast at load if the migrated key is malformed (Zod guards the migration)', async () => {
    const secrets = new SecretsManager(
      new InMemorySecretsProvider({ infra: { FIELD_ENCRYPTION_KEY: 'short' } })
    );
    await expect(secrets.loadLayer('infra')).rejects.toThrow(/validation failed/);
  });
});

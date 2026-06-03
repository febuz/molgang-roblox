import AuthSystem from '../../src/auth/auth-system';
import FieldCrypto from '../../src/security/fieldCrypto';
import { generateTotp } from '../../src/auth/totp';

/**
 * Tests TOTP-secret encryption at rest (backlog 6.5.20).
 *
 * With a FieldCrypto injected, the stored secret must be ciphertext, yet the
 * full 2FA enable -> login -> verify flow must still work. Without it, the
 * secret stays plaintext (backward-compatible default).
 */

const HEX_KEY = 'c'.repeat(64);
const CEO = 'user_ceo_001';

describe('AuthSystem TOTP secret at rest', () => {
  it('stores the TOTP secret as ciphertext when field encryption is enabled', () => {
    const fc = new FieldCrypto(HEX_KEY);
    const auth = new AuthSystem({ fieldCrypto: fc });

    const setup = auth.setupTotp(CEO);
    expect(setup.success).toBe(true);
    const stored = auth.getUser(CEO)!.totpSecret!;
    expect(fc.isEncrypted(stored)).toBe(true);
    expect(stored).not.toBe(setup.secret); // not the plaintext secret
    expect(fc.decrypt(stored)).toBe(setup.secret); // but decrypts back to it
  });

  it('runs the full enable -> login -> verify 2FA flow with encryption on', () => {
    const auth = new AuthSystem({ fieldCrypto: new FieldCrypto(HEX_KEY) });
    const { secret } = auth.setupTotp(CEO);

    // Enable using a code derived from the plaintext secret handed to the user.
    expect(auth.enableTotp(CEO, generateTotp(secret!)).success).toBe(true);

    // Password login now returns a 2FA challenge instead of a session.
    const login = auth.login({ username: 'ceo', password: 'ceo123' });
    expect(login.requires2fa).toBe(true);
    expect(login.challengeId).toBeTruthy();

    // Exchanging the challenge + a valid code yields a session.
    const verified = auth.verifyTwoFactor(login.challengeId!, generateTotp(secret!));
    expect(verified.success).toBe(true);
    expect(verified.token?.username).toBe('ceo');
  });

  it('rejects a wrong 2FA code even with encryption enabled', () => {
    const auth = new AuthSystem({ fieldCrypto: new FieldCrypto(HEX_KEY) });
    const { secret } = auth.setupTotp(CEO);
    auth.enableTotp(CEO, generateTotp(secret!));
    const login = auth.login({ username: 'ceo', password: 'ceo123' });
    const bad = auth.verifyTwoFactor(login.challengeId!, '000000');
    expect(bad.success).toBe(false);
  });

  it('keeps the secret as plaintext when no encryption is configured (default)', () => {
    const auth = new AuthSystem(); // no fieldCrypto, no env key in tests
    const { secret } = auth.setupTotp(CEO);
    expect(auth.getUser(CEO)!.totpSecret).toBe(secret); // stored verbatim
    // 2FA still works on the plaintext path.
    expect(auth.enableTotp(CEO, generateTotp(secret!)).success).toBe(true);
  });
});

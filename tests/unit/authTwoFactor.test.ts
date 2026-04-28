import AuthSystem from '../../src/auth/auth-system';
import { generateTotp } from '../../src/auth/totp';

function loginCeo(auth: AuthSystem) {
  return auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '127.0.0.1' });
}

function ceoUser(auth: AuthSystem) {
  return auth.getAllUsers().find(u => u.username === 'ceo')!;
}

describe('AuthSystem 2FA (TOTP)', () => {
  it('setupTotp rotates the secret on repeated calls until enabled', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    const r1 = auth.setupTotp(ceo.id);
    const r2 = auth.setupTotp(ceo.id);
    expect(r1.success && r2.success).toBe(true);
    expect(r1.secret).not.toBe(r2.secret);
    expect(r1.uri).toMatch(/^otpauth:\/\/totp\//);
    expect(ceo.totpEnabled).toBe(false);
  });

  it('enableTotp arms 2FA when a valid code is provided', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    const setup = auth.setupTotp(ceo.id);
    const code = generateTotp(setup.secret!);
    expect(auth.enableTotp(ceo.id, code).success).toBe(true);
    expect(ceo.totpEnabled).toBe(true);
  });

  it('enableTotp refuses an invalid code', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    auth.setupTotp(ceo.id);
    expect(auth.enableTotp(ceo.id, '000000').success).toBe(false);
    expect(ceo.totpEnabled).toBe(false);
  });

  it('login returns a 2FA challenge instead of a session when enabled', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    const setup = auth.setupTotp(ceo.id);
    auth.enableTotp(ceo.id, generateTotp(setup.secret!));

    const result = loginCeo(auth);
    expect(result.success).toBe(false);
    expect(result.requires2fa).toBe(true);
    expect(result.challengeId).toMatch(/^2fa_/);
    expect(result.token).toBeUndefined();
  });

  it('verifyTwoFactor exchanges challenge + code for a session', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    const setup = auth.setupTotp(ceo.id);
    auth.enableTotp(ceo.id, generateTotp(setup.secret!));

    const challenge = loginCeo(auth);
    const code = generateTotp(setup.secret!);
    const verified = auth.verifyTwoFactor(challenge.challengeId!, code);
    expect(verified.success).toBe(true);
    expect(verified.token?.username).toBe('ceo');
  });

  it('challenges are single-use — second verify fails even with a valid code', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    const setup = auth.setupTotp(ceo.id);
    auth.enableTotp(ceo.id, generateTotp(setup.secret!));

    const challenge = loginCeo(auth);
    const code = generateTotp(setup.secret!);
    expect(auth.verifyTwoFactor(challenge.challengeId!, code).success).toBe(true);
    // Second use of same challenge:
    expect(auth.verifyTwoFactor(challenge.challengeId!, code).success).toBe(false);
  });

  it('verifyTwoFactor rejects a wrong code and consumes the challenge', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    const setup = auth.setupTotp(ceo.id);
    auth.enableTotp(ceo.id, generateTotp(setup.secret!));

    const challenge = loginCeo(auth);
    expect(auth.verifyTwoFactor(challenge.challengeId!, '000000').success).toBe(false);
    // Even the right code afterwards must fail — challenge already burned.
    expect(auth.verifyTwoFactor(challenge.challengeId!, generateTotp(setup.secret!)).success).toBe(false);
  });

  it('disableTotp requires both password and a valid code', () => {
    const auth = new AuthSystem();
    const ceo = ceoUser(auth);
    const setup = auth.setupTotp(ceo.id);
    auth.enableTotp(ceo.id, generateTotp(setup.secret!));

    expect(auth.disableTotp(ceo.id, 'wrong-password', generateTotp(setup.secret!)).success).toBe(false);
    expect(auth.disableTotp(ceo.id, 'ceo123', '000000').success).toBe(false);
    expect(auth.disableTotp(ceo.id, 'ceo123', generateTotp(setup.secret!)).success).toBe(true);
    expect(ceo.totpEnabled).toBe(false);
    expect(ceo.totpSecret).toBeUndefined();

    // After disable, login should issue a session directly.
    const after = loginCeo(auth);
    expect(after.success).toBe(true);
    expect(after.requires2fa).toBeUndefined();
  });
});

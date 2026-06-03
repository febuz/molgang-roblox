import AuthSystem from '../../src/auth/auth-system';
import FieldCrypto from '../../src/security/fieldCrypto';
import { generateTotp } from '../../src/auth/totp';

/**
 * Integration ("journey") tests for AuthSystem — validate that the pieces work
 * *together* across realistic security flows, beyond the per-method unit tests.
 */

describe('AuthSystem journeys', () => {
  it('full 2FA enrolment → challenge → verify → session', () => {
    const auth = new AuthSystem();
    // Password-only login works before enrolment.
    expect(auth.login({ username: 'ceo', password: 'ceo123' }).token).toBeDefined();

    // Enrol 2FA.
    const { secret } = auth.setupTotp('user_ceo_001');
    expect(auth.enableTotp('user_ceo_001', generateTotp(secret!)).success).toBe(true);

    // Now login returns a challenge instead of a session...
    const login = auth.login({ username: 'ceo', password: 'ceo123' });
    expect(login.token).toBeUndefined();
    expect(login.requires2fa).toBe(true);

    // ...which is exchanged for a real, verifiable session.
    const verified = auth.verifyTwoFactor(login.challengeId!, generateTotp(secret!));
    expect(verified.success).toBe(true);
    expect(auth.verifyToken(verified.token!.sessionId)).not.toBeNull();
  });

  it('suspending a user kills their live sessions AND blocks re-login', () => {
    const auth = new AuthSystem();
    const token = auth.login({ username: 'zip', password: 'zip123' }).token!;
    expect(auth.verifyToken(token.sessionId)).not.toBeNull();

    // CEO suspends the developer.
    expect(auth.setUserStatus('ceo', 'user_dev_001', 'suspended').success).toBe(true);

    // Live session is revoked...
    expect(auth.verifyToken(token.sessionId)).toBeNull();
    // ...and they can no longer log in.
    const relogin = auth.login({ username: 'zip', password: 'zip123' });
    expect(relogin.success).toBe(false);
    expect(relogin.error).toMatch(/not active/i);
  });

  it('admin revoke-session invalidates exactly that token, not others', () => {
    const auth = new AuthSystem();
    const s1 = auth.login({ username: 'kai', password: 'kai123' }).token!;
    const s2 = auth.login({ username: 'kai', password: 'kai123' }).token!;
    expect(auth.revokeSession(s1.sessionId)).toBe(true);
    expect(auth.verifyToken(s1.sessionId)).toBeNull();
    expect(auth.verifyToken(s2.sessionId)).not.toBeNull(); // the other device survives
  });

  it('deleting a user revokes sessions and respects last-CEO lockout', () => {
    const auth = new AuthSystem();
    const ceoToken = auth.login({ username: 'ceo', password: 'ceo123' }).token!;
    // Cannot delete the only CEO (lockout protection)...
    expect(auth.deleteUser('ceo', 'user_ceo_001').success).toBe(false);
    expect(auth.verifyToken(ceoToken.sessionId)).not.toBeNull();

    // ...but a lower-privileged user is deletable, and their session dies.
    const devToken = auth.login({ username: 'zip', password: 'zip123' }).token!;
    expect(auth.deleteUser('ceo', 'user_dev_001').success).toBe(true);
    expect(auth.verifyToken(devToken.sessionId)).toBeNull();
    expect(auth.getUser('user_dev_001')).toBeNull();
  });

  it('CEO IP allowlist + 2FA compose correctly', () => {
    const auth = new AuthSystem({ ceoIpAllowlist: ['10.0.0.1'] });
    const { secret } = auth.setupTotp('user_ceo_001');
    auth.enableTotp('user_ceo_001', generateTotp(secret!));

    // Wrong network: denied even with valid password (before any 2FA challenge).
    expect(auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '9.9.9.9' }).error).toMatch(/network/i);

    // Right network: proceeds to the 2FA challenge.
    const ok = auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '10.0.0.1' });
    expect(ok.requires2fa).toBe(true);
  });

  it('field encryption at rest does not break the 2FA journey', () => {
    const auth = new AuthSystem({ fieldCrypto: new FieldCrypto('d'.repeat(64)) });
    const { secret } = auth.setupTotp('user_ceo_001');
    // Stored secret is ciphertext, but the journey still completes.
    expect(auth.getUser('user_ceo_001')!.totpSecret).not.toBe(secret);
    auth.enableTotp('user_ceo_001', generateTotp(secret!));
    const login = auth.login({ username: 'ceo', password: 'ceo123' });
    expect(auth.verifyTwoFactor(login.challengeId!, generateTotp(secret!)).success).toBe(true);
  });
});

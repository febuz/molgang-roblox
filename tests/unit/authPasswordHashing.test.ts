import AuthSystem from '../../src/auth/auth-system';

describe('AuthSystem password hashing (scrypt)', () => {
  let auth: AuthSystem;

  beforeEach(() => {
    auth = new AuthSystem();
  });

  it('default seed users log in with their demo passwords', () => {
    const cases: [string, string][] = [
      ['ceo', 'ceo123'],
      ['kai', 'kai123'],
      ['zip', 'zip123'],
      ['mira', 'mira123'],
      ['luna', 'luna123'],
    ];

    for (const [username, password] of cases) {
      const result = auth.login({ username, password, ipAddress: '127.0.0.1' });
      expect(result.success).toBe(true);
      expect(result.token?.username).toBe(username);
    }
  });

  it('rejects wrong passwords', () => {
    const result = auth.login({ username: 'ceo', password: 'wrong', ipAddress: '127.0.0.1' });
    expect(result.success).toBe(false);
  });

  it('stores passwords as scrypt$salt$hash, not plaintext or base64', () => {
    const ceo = auth.getAllUsers().find(u => u.username === 'ceo')!;
    expect(ceo.passwordHash.startsWith('scrypt$')).toBe(true);
    const parts = ceo.passwordHash.split('$');
    expect(parts).toHaveLength(3);
    expect(Buffer.from(parts[1], 'base64').length).toBe(16);
    expect(Buffer.from(parts[2], 'base64').length).toBe(64);
    expect(ceo.passwordHash).not.toContain(Buffer.from('ceo123').toString('base64'));
  });

  it('produces a different hash each time (random salt)', () => {
    const created1 = auth.createUser('alice', 'a@x', 'developer', 'samepassword');
    const created2 = auth.createUser('bob', 'b@x', 'developer', 'samepassword');
    expect(created1.success && created2.success).toBe(true);
    expect(created1.user!.passwordHash).not.toBe(created2.user!.passwordHash);
  });

  it('changePassword rotates the hash and verifies the new one', () => {
    const ceoUser = auth.getAllUsers().find(u => u.username === 'ceo')!;
    const oldHash = ceoUser.passwordHash;
    const result = auth.changePassword(ceoUser.id, 'ceo123', 'newSecret456');
    expect(result.success).toBe(true);
    expect(ceoUser.passwordHash).not.toBe(oldHash);
    expect(auth.login({ username: 'ceo', password: 'newSecret456', ipAddress: '127.0.0.1' }).success).toBe(true);
    expect(auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '127.0.0.1' }).success).toBe(false);
  });

  it('verifyPassword refuses legacy base64 stored hashes', () => {
    const verify = (auth as any).verifyPassword.bind(auth);
    const legacyBase64 = Buffer.from('ceo123').toString('base64');
    expect(verify('ceo123', legacyBase64)).toBe(false);
  });
});

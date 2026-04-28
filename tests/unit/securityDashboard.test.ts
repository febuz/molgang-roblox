import AuthSystem from '../../src/auth/auth-system';
import CEOAuditLogger from '../../src/auth/audit-logger';
import { SecurityDashboard } from '../../src/security/securityDashboard';
import { generateTotp } from '../../src/auth/totp';

function logFailedLogin(audit: CEOAuditLogger, ip: string, count: number) {
  for (let i = 0; i < count; i++) {
    audit.logEvent(
      'unknown',
      'attacker',
      'unknown',
      'login',
      ip,
      'dev',
      'unknown',
      `bad attempt ${i}`,
      'failure'
    );
  }
}

describe('SecurityDashboard', () => {
  let auth: AuthSystem;
  let audit: CEOAuditLogger;
  let dash: SecurityDashboard;

  beforeEach(() => {
    auth = new AuthSystem();
    audit = new CEOAuditLogger();
    dash = new SecurityDashboard(auth, audit);
  });

  it('returns a top-level shape with score, grade, signals, threats, breakdown', () => {
    const snap = dash.snapshot();
    expect(typeof snap.score).toBe('number');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(snap.grade);
    expect(snap.signals).toBeDefined();
    expect(Array.isArray(snap.threats)).toBe(true);
    expect(snap.user_breakdown.total_users).toBe(5); // default seed
  });

  it('flags low 2FA adoption when no users have it on', () => {
    const snap = dash.snapshot();
    const t = snap.threats.find(t => t.category === '2fa_adoption');
    expect(t).toBeDefined();
    expect(t!.level).toBe('high'); // 0% adoption
    expect(snap.signals.twofa_adoption_pct).toBe(0);
  });

  it('drops the 2FA threat once a majority of users have it enabled', () => {
    // Enable 2FA for 3 of 5 default users → 60% adoption.
    for (const username of ['ceo', 'kai', 'zip']) {
      const user = auth.getAllUsers().find(u => u.username === username)!;
      const setup = auth.setupTotp(user.id);
      auth.enableTotp(user.id, generateTotp(setup.secret!));
    }
    const snap = dash.snapshot();
    expect(snap.signals.twofa_adoption_pct).toBe(60);
    expect(snap.threats.find(t => t.category === '2fa_adoption')).toBeUndefined();
  });

  it('lifts a brute_force threat when an IP has ≥3 failed logins in 24h', () => {
    logFailedLogin(audit, '203.0.113.7', 4);
    const snap = dash.snapshot();
    const t = snap.threats.find(t => t.category === 'brute_force');
    expect(t).toBeDefined();
    expect(t!.details!.ip).toBe('203.0.113.7');
    expect(t!.details!.failed_count).toBe(4);
    expect(snap.signals.suspicious_ips).toBe(1);
  });

  it('escalates a brute_force threat to high at ≥10 failures from one IP', () => {
    logFailedLogin(audit, '198.51.100.1', 12);
    const t = dash.snapshot().threats.find(t => t.category === 'brute_force')!;
    expect(t.level).toBe('high');
  });

  it('grade tracks score: 0 audit events + 0% 2FA → low grade', () => {
    // Audit score starts at 100 with no events → composite ~70, with -2FA bonus = ~70.
    // But a single critical event drops it further.
    audit.logEvent('u', 'mira', 'artist', 'invalid_access', '1.1.1.1', 'd', 'l', 'bad', 'failure', { severity: 'critical' });
    const snap = dash.snapshot();
    expect(snap.signals.critical_events_24h).toBe(1);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(snap.grade);
  });

  it('does not count failed logins from older than 24h as recent', () => {
    // Inject an old event by reaching into the logger's internal events array.
    const oldEvent = audit.logEvent('u', 'attacker', 'unknown', 'login', '10.0.0.1', 'd', 'l', 'old', 'failure');
    (oldEvent as any).timestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const snap = dash.snapshot();
    // The single old-IP event should NOT lift a brute force threat.
    expect(snap.threats.find(t => t.category === 'brute_force' && t.details?.ip === '10.0.0.1')).toBeUndefined();
  });
});

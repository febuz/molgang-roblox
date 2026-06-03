import { processLoginAttempt } from '../../src/auth/auth-routes';
import { LoginAnomalyMonitor } from '../../src/security/loginAnomalyMonitor';
import CEOAuditLogger from '../../src/auth/audit-logger';

/**
 * Tests for the login-anomaly wiring helper (backlog 6.5.19 integration).
 *
 * processLoginAttempt() is the pure, dependency-injected glue the login route
 * calls; testing it directly verifies the integration without an HTTP server.
 */

describe('processLoginAttempt', () => {
  let monitor: LoginAnomalyMonitor;
  let audit: CEOAuditLogger;

  beforeEach(() => {
    monitor = new LoginAnomalyMonitor();
    audit = new CEOAuditLogger();
  });

  it('is a no-op (returns null) when no monitor is wired', () => {
    const r = processLoginAttempt(
      { username: 'a', ipAddress: '1.1.1.1', deviceId: 'd', outcome: 'success' },
      {}
    );
    expect(r).toBeNull();
    expect(audit.getAllEvents()).toHaveLength(0);
  });

  it('records the attempt and returns an assessment when a monitor is wired', () => {
    const r = processLoginAttempt(
      { username: 'alice', ipAddress: '1.1.1.1', deviceId: 'mac', outcome: 'success' },
      { anomalyMonitor: monitor }
    );
    expect(r).not.toBeNull();
    expect(r!.level).toBe('low'); // first login = baseline
    expect(monitor.getUserProfile('alice')?.knownDevices).toContain('mac');
  });

  it('does not write an audit event for a low-risk login', () => {
    processLoginAttempt(
      { username: 'alice', ipAddress: '1.1.1.1', deviceId: 'mac', outcome: 'success' },
      { anomalyMonitor: monitor, auditLogger: audit }
    );
    expect(audit.getAllEvents()).toHaveLength(0);
  });

  it('writes a warning audit event for a medium-risk login (new device + IP)', () => {
    // Establish baseline, then log in from a brand-new device AND ip.
    monitor.record({ username: 'alice', ipAddress: '1.1.1.1', deviceId: 'mac', outcome: 'success' });
    const r = processLoginAttempt(
      { username: 'alice', ipAddress: '9.9.9.9', deviceId: 'burner', outcome: 'success' },
      { anomalyMonitor: monitor, auditLogger: audit }
    );
    expect(r!.level).toBe('medium');
    const events = audit.getAllEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('invalid_access');
    expect(events[0].severity).toBe('warning');
    expect(events[0].details?.flags).toEqual(expect.arrayContaining(['new_device', 'new_ip']));
  });

  it('escalates to a critical audit event for a high-risk login', () => {
    monitor.record({ username: 'alice', ipAddress: '1.1.1.1', deviceId: 'mac', outcome: 'success' });
    // Pile up failures from a new device/ip to push velocity + burst + novelty -> high.
    for (let i = 0; i < 5; i++) {
      monitor.record({ username: 'alice', ipAddress: '9.9.9.9', deviceId: 'burner', outcome: 'failure' });
    }
    const r = processLoginAttempt(
      { username: 'alice', ipAddress: '9.9.9.9', deviceId: 'burner', outcome: 'failure' },
      { anomalyMonitor: monitor, auditLogger: audit }
    );
    expect(r!.level).toBe('high');
    const events = audit.getAllEvents();
    expect(events).toHaveLength(1);
    expect(events[0].severity).toBe('critical');
    expect(events[0].outcome).toBe('failure');
  });

  it('scores but does not audit when a monitor is wired without an audit logger', () => {
    monitor.record({ username: 'alice', ipAddress: '1.1.1.1', deviceId: 'mac', outcome: 'success' });
    const r = processLoginAttempt(
      { username: 'alice', ipAddress: '9.9.9.9', deviceId: 'burner', outcome: 'success' },
      { anomalyMonitor: monitor } // no auditLogger
    );
    expect(r!.level).toBe('medium');
    expect(audit.getAllEvents()).toHaveLength(0); // separate logger, untouched
  });
});

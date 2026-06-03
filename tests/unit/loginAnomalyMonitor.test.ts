import { LoginAnomalyMonitor, LoginAttempt } from '../../src/security/loginAnomalyMonitor';

/**
 * Unit tests for LoginAnomalyMonitor (backlog 6.5.19).
 *
 * All attempts carry explicit timestamps so the time-window logic is
 * deterministic without fake timers.
 */

const T0 = 1_700_000_000_000; // fixed base epoch ms

function attempt(over: Partial<LoginAttempt> = {}): LoginAttempt {
  return {
    username: 'alice',
    ipAddress: '1.1.1.1',
    deviceId: 'macbook',
    outcome: 'success',
    timestamp: T0,
    ...over,
  };
}

describe('LoginAnomalyMonitor', () => {
  let mon: LoginAnomalyMonitor;

  beforeEach(() => {
    mon = new LoginAnomalyMonitor();
  });

  describe('baseline (new user)', () => {
    it('does not flag the very first login (no history to deviate from)', () => {
      const a = mon.evaluate(attempt());
      expect(a.flags).toEqual([]);
      expect(a.level).toBe('low');
      expect(a.score).toBe(0);
    });
  });

  describe('device / IP novelty', () => {
    beforeEach(() => {
      // Establish a baseline: alice on macbook from 1.1.1.1.
      mon.record(attempt());
    });

    it('does not flag a return from a known device + IP', () => {
      const a = mon.evaluate(attempt({ timestamp: T0 + 60_000 }));
      expect(a.flags).toEqual([]);
    });

    it('flags a new device for a known user', () => {
      const a = mon.evaluate(attempt({ deviceId: 'unknown-phone', timestamp: T0 + 60_000 }));
      expect(a.flags).toContain('new_device');
      expect(a.flags).not.toContain('new_ip');
    });

    it('flags a new IP for a known user', () => {
      const a = mon.evaluate(attempt({ ipAddress: '9.9.9.9', timestamp: T0 + 60_000 }));
      expect(a.flags).toContain('new_ip');
    });

    it('flags both new device and new IP together and escalates the level', () => {
      const a = mon.evaluate(attempt({ deviceId: 'x', ipAddress: '9.9.9.9', timestamp: T0 + 60_000 }));
      expect(a.flags).toEqual(expect.arrayContaining(['new_device', 'new_ip']));
      expect(a.score).toBe(45); // 25 + 20
      expect(a.level).toBe('medium');
    });

    it('learns a device/IP only from successful logins', () => {
      // A failed attempt from a new device must not whitelist that device.
      mon.record(attempt({ deviceId: 'phone', ipAddress: '2.2.2.2', outcome: 'failure', timestamp: T0 + 1000 }));
      const a = mon.evaluate(attempt({ deviceId: 'phone', ipAddress: '2.2.2.2', timestamp: T0 + 2000 }));
      expect(a.flags).toEqual(expect.arrayContaining(['new_device', 'new_ip']));
    });
  });

  describe('failed_burst', () => {
    it('flags once recent failures reach the threshold within the window', () => {
      mon.record(attempt()); // baseline success
      for (let i = 0; i < 3; i++) {
        mon.record(attempt({ outcome: 'failure', timestamp: T0 + (i + 1) * 1000 }));
      }
      const a = mon.evaluate(attempt({ timestamp: T0 + 5000 }));
      expect(a.flags).toContain('failed_burst');
    });

    it('does not flag failures that fall outside the failure window', () => {
      mon.record(attempt());
      for (let i = 0; i < 3; i++) {
        mon.record(attempt({ outcome: 'failure', timestamp: T0 + (i + 1) * 1000 }));
      }
      // Evaluate well past the 15-min failure window — old failures pruned.
      const a = mon.evaluate(attempt({ timestamp: T0 + 20 * 60 * 1000 }));
      expect(a.flags).not.toContain('failed_burst');
    });
  });

  describe('high_velocity', () => {
    it('flags when attempts in the velocity window reach the threshold', () => {
      mon.record(attempt());
      // 5 attempts inside the 60s window (threshold is 5).
      for (let i = 0; i < 5; i++) {
        mon.record(attempt({ outcome: 'failure', timestamp: T0 + i * 5000 }));
      }
      const a = mon.evaluate(attempt({ timestamp: T0 + 25_000 }));
      expect(a.flags).toContain('high_velocity');
      expect(a.level).toBe('high'); // velocity + failed_burst + new... pushes high
    });

    it('respects a custom config threshold', () => {
      const strict = new LoginAnomalyMonitor({ velocityThreshold: 2, velocityWindowMs: 60_000 });
      strict.record(attempt());
      strict.record(attempt({ timestamp: T0 + 1000 }));
      const a = strict.evaluate(attempt({ timestamp: T0 + 2000 }));
      expect(a.flags).toContain('high_velocity');
    });
  });

  describe('scoring + level boundaries', () => {
    it('caps the score at 100', () => {
      mon.record(attempt());
      for (let i = 0; i < 6; i++) {
        mon.record(attempt({ deviceId: 'd', ipAddress: 'i', outcome: 'failure', timestamp: T0 + i * 1000 }));
      }
      // new_device(25)+new_ip(20)+failed_burst(35)+high_velocity(30) = 110 -> capped.
      const a = mon.evaluate(attempt({ deviceId: 'd2', ipAddress: 'i2', timestamp: T0 + 7000 }));
      expect(a.score).toBe(100);
      expect(a.level).toBe('high');
    });
  });

  describe('assess (evaluate + record)', () => {
    it('returns the assessment and updates history in one call', () => {
      const a = mon.assess(attempt());
      expect(a.flags).toEqual([]);
      // Second known login should still be clean because assess() recorded the first.
      const b = mon.assess(attempt({ timestamp: T0 + 1000 }));
      expect(b.flags).toEqual([]);
      expect(mon.getUserProfile('alice')?.knownDevices).toContain('macbook');
    });
  });

  describe('getUserProfile', () => {
    it('returns null for an unseen user', () => {
      expect(mon.getUserProfile('ghost')).toBeNull();
    });

    it('reports learned devices and IPs', () => {
      mon.record(attempt());
      mon.record(attempt({ deviceId: 'ipad', ipAddress: '2.2.2.2', timestamp: T0 + 1000 }));
      const p = mon.getUserProfile('alice')!;
      expect(p.knownDevices).toEqual(expect.arrayContaining(['macbook', 'ipad']));
      expect(p.knownIps).toEqual(expect.arrayContaining(['1.1.1.1', '2.2.2.2']));
    });
  });
});

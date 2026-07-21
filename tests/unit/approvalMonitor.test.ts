import { ApprovalMonitor } from '../../src/approval-monitor';

describe('ApprovalMonitor', () => {
  let mon: ApprovalMonitor;
  beforeEach(() => {
    mon = new ApprovalMonitor();
  });

  describe('flagApproval', () => {
    it('creates a pending approval with defaults', () => {
      const a = mon.flagApproval('Terminal B', 'Continue?');
      expect(a.status).toBe('pending');
      expect(a.options).toEqual(['yes', 'no']);
      expect(a.urgency).toBe('high');
      expect(mon.getApproval(a.id)).toEqual(a);
      expect(mon.getPendingApprovals()).toHaveLength(1);
    });

    it('honors custom options and urgency', () => {
      const a = mon.flagApproval('T', 'Deploy?', ['ship', 'hold'], 'critical');
      expect(a.options).toEqual(['ship', 'hold']);
      expect(a.urgency).toBe('critical');
    });
  });

  describe('respondToApproval', () => {
    it('approves on "yes" and moves it to history', () => {
      const a = mon.flagApproval('T', 'go?');
      const res = mon.respondToApproval(a.id, 'yes')!;
      expect(res.status).toBe('approved');
      expect(mon.getPendingApprovals()).toHaveLength(0);
      expect(mon.getHistory().map(h => h.id)).toContain(a.id);
    });

    it('rejects on "no"', () => {
      const a = mon.flagApproval('T', 'go?');
      expect(mon.respondToApproval(a.id, 'no')!.status).toBe('rejected');
    });

    it('returns null for an unknown id', () => {
      expect(mon.respondToApproval('nope', 'yes')).toBeNull();
    });
  });

  describe('getPendingApprovals', () => {
    it('sorts by urgency: critical > high > medium > low', () => {
      mon.flagApproval('T', 'low one', ['yes', 'no'], 'low');
      mon.flagApproval('T', 'crit one', ['yes', 'no'], 'critical');
      mon.flagApproval('T', 'med one', ['yes', 'no'], 'medium');
      mon.flagApproval('T', 'high one', ['yes', 'no'], 'high');
      expect(mon.getPendingApprovals().map(a => a.urgency)).toEqual([
        'critical',
        'high',
        'medium',
        'low',
      ]);
    });
  });

  describe('clearExpired', () => {
    it('expires pending approvals older than the window and moves them to history', () => {
      const a = mon.flagApproval('T', 'old');
      mon.flagApproval('T', 'fresh');
      a.timestamp = new Date(Date.now() - 10 * 60 * 1000); // 10 min old

      const cleared = mon.clearExpired(5);
      expect(cleared).toBe(1);
      expect(mon.getPendingApprovals()).toHaveLength(1);
      const expired = mon.getHistory().find(h => h.id === a.id)!;
      expect(expired.status).toBe('expired');
    });

    it('clears nothing when all are fresh', () => {
      mon.flagApproval('T', 'q');
      expect(mon.clearExpired(5)).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('counts pending by urgency and reports history size', () => {
      mon.flagApproval('T', 'a', ['yes', 'no'], 'critical');
      mon.flagApproval('T', 'b', ['yes', 'no'], 'high');
      const c = mon.flagApproval('T', 'c', ['yes', 'no'], 'low');
      mon.respondToApproval(c.id, 'yes');

      const s = mon.getStatus();
      expect(s.totalPending).toBe(2);
      expect(s.critical).toBe(1);
      expect(s.high).toBe(1);
      expect(s.historicalTotal).toBe(1);
    });
  });

  describe('formatForDisplay', () => {
    it('reports no pending when empty', () => {
      expect(mon.formatForDisplay()).toMatch(/No pending approvals/);
    });

    it('lists pending approvals with their questions', () => {
      mon.flagApproval('Terminal B', 'Ship the release?', ['yes', 'no'], 'critical');
      const out = mon.formatForDisplay();
      expect(out).toMatch(/PENDING APPROVALS/);
      expect(out).toContain('Ship the release?');
      expect(out).toContain('Terminal B');
    });
  });
});

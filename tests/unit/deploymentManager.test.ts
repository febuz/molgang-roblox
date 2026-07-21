import { DeploymentManager } from '../../src/automation/deployment-manager';

describe('DeploymentManager', () => {
  let d: DeploymentManager;
  beforeEach(() => {
    d = new DeploymentManager();
  });

  describe('startDeployment', () => {
    it('records a deploying deployment retrievable by id', () => {
      const dep = d.startDeployment('1.0.0', 'staging', ['api-server']);
      expect(dep.status).toBe('deploying');
      expect(dep.id).toMatch(/^deploy_/);
      expect(d.getDeploymentStatus(dep.id)?.version).toBe('1.0.0');
    });

    it('gives rapid deployments distinct ids (collision fix)', () => {
      const a = d.startDeployment('1', 'dev', ['x']);
      const b = d.startDeployment('2', 'dev', ['x']);
      expect(a.id).not.toBe(b.id);
      // Both retained (a collision would have dropped the first).
      expect(d.getDeploymentStatus(a.id)).not.toBeNull();
      expect(d.getDeploymentStatus(b.id)).not.toBeNull();
      expect(d.getDeploymentHistory('dev')).toHaveLength(2);
    });
  });

  describe('completeDeployment', () => {
    it('marks success, sets duration, and pushes to the rollback stack', () => {
      const dep = d.startDeployment('1', 'production', ['api']);
      const done = d.completeDeployment(dep.id, true)!;
      expect(done.status).toBe('succeeded');
      expect(done.metrics.endTime).toBeInstanceOf(Date);
      expect(typeof done.metrics.duration).toBe('number');
    });

    it('marks failure without pushing to rollback; null for unknown', () => {
      const dep = d.startDeployment('1', 'production', ['api']);
      expect(d.completeDeployment(dep.id, false)!.status).toBe('failed');
      expect(d.completeDeployment('nope', true)).toBeNull();
    });
  });

  describe('rollback', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('rolls the current deployment back to the previous successful one', () => {
      jest.useFakeTimers();
      const v1 = d.startDeployment('1.0.0', 'production', ['api']);
      d.completeDeployment(v1.id, true);
      v1.timestamp = new Date(Date.now() - 60000); // ensure v1 is earlier than v2
      const v2 = d.startDeployment('2.0.0', 'production', ['api']);

      const rb = d.rollback(v2.id)!;
      expect(rb).not.toBeNull();
      expect(rb.version).toBe('1.0.0'); // rolled back to v1's version
      expect(d.getDeploymentStatus(v2.id)!.status).toBe('rolled_back');

      // The simulated rollback completes on its timer.
      jest.advanceTimersByTime(5000);
      expect(d.getDeploymentStatus(rb.id)!.status).toBe('succeeded');
    });

    it('returns null when there is no prior successful deployment', () => {
      const only = d.startDeployment('1', 'dev', ['x']);
      expect(d.rollback(only.id)).toBeNull();
      expect(d.rollback('unknown')).toBeNull();
    });
  });

  describe('health + readiness', () => {
    it('checkServiceHealth returns a valid health shape', () => {
      const h = d.checkServiceHealth('api-server');
      expect(h.service).toBe('api-server');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(h.status);
      expect(typeof h.latency).toBe('number');
      expect(typeof h.uptime).toBe('number');
    });

    it('getCurrentHealth reports all 5 services', () => {
      expect(Object.keys(d.getCurrentHealth())).toHaveLength(5);
    });

    it('getDeploymentReadiness reports ready ratio + latest deployment', () => {
      const dep = d.startDeployment('1', 'staging', ['api']);
      const r = d.getDeploymentReadiness('staging');
      expect(typeof r.ready).toBe('boolean');
      expect(r.readyServices).toMatch(/^\d+\/5$/);
      expect(r.latestDeployment.version).toBe('1');
    });
  });

  describe('metrics + history', () => {
    it('getDeploymentMetrics returns metrics; null for unknown', () => {
      const dep = d.startDeployment('1', 'dev', ['api']);
      d.completeDeployment(dep.id, true);
      const m = d.getDeploymentMetrics(dep.id);
      expect(m.version).toBe('1');
      expect(m.status).toBe('succeeded');
      expect(d.getDeploymentMetrics('nope')).toBeNull();
    });

    it('getDeploymentHistory filters by environment, newest first', () => {
      d.startDeployment('1', 'dev', ['x']);
      d.startDeployment('2', 'production', ['x']);
      expect(d.getDeploymentHistory('dev')).toHaveLength(1);
      expect(d.getDeploymentHistory('production')).toHaveLength(1);
    });
  });
});

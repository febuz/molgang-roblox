import SpecialistDashboards from '../../src/auth/specialist-dashboards';

/**
 * Unit tests for SpecialistDashboards (backlog 6.5.11).
 *
 * These lock the per-role dashboard shape contracts and the getDashboard()
 * role-dispatch, so future moves from static to live data can't silently
 * drop fields the frontend depends on.
 */

describe('SpecialistDashboards', () => {
  let dash: SpecialistDashboards;

  beforeEach(() => {
    dash = new SpecialistDashboards();
  });

  describe('per-role dashboards', () => {
    it('CEO dashboard exposes the headline metrics and team roster', () => {
      const d = dash.getCEODashboard();
      expect(d.totalAgents).toBeGreaterThanOrEqual(d.activeAgents);
      expect(d.systemHealth).toBeGreaterThanOrEqual(0);
      expect(d.systemHealth).toBeLessThanOrEqual(100);
      expect(typeof d.costThisMonth).toBe('number');
      expect(Array.isArray(d.teamEmpployeeStatus)).toBe(true);
      d.teamEmpployeeStatus.forEach(member => {
        expect(member).toEqual(
          expect.objectContaining({
            username: expect.any(String),
            role: expect.any(String),
            status: expect.any(String),
          })
        );
        expect(member.lastSeen).toBeInstanceOf(Date);
      });
    });

    it('CTO dashboard reports infrastructure, performance and security blocks', () => {
      const d = dash.getCTODashboard();
      expect(d.infrastructure.databases.healthy).toBeLessThanOrEqual(d.infrastructure.databases.count);
      expect(d.infrastructure.services.healthy).toBeLessThanOrEqual(d.infrastructure.services.count);
      expect(d.infrastructure.deployments.successful).toBeLessThanOrEqual(d.infrastructure.deployments.count);
      expect(d.performance.errorRate).toBeGreaterThanOrEqual(0);
      expect(d.security.securityScore).toBeGreaterThanOrEqual(0);
      expect(d.security.securityScore).toBeLessThanOrEqual(100);
      expect(d.latestDeployment.timestamp).toBeInstanceOf(Date);
    });

    it('Developer dashboard includes task counts and recent commits', () => {
      const d = dash.getDeveloperDashboard();
      expect(typeof d.assignedTasks).toBe('number');
      expect(typeof d.tasksCompleted).toBe('number');
      expect(d.currentTask?.dueDate).toBeInstanceOf(Date);
      expect(d.recentCommits.length).toBeGreaterThan(0);
      d.recentCommits.forEach(c => {
        expect(typeof c.message).toBe('string');
        expect(c.timestamp).toBeInstanceOf(Date);
      });
    });

    it('Artist dashboard includes asset library and collaborators', () => {
      const d = dash.getArtistDashboard();
      expect(d.assetLibrary.recentlyAdded).toBeLessThanOrEqual(d.assetLibrary.total);
      expect(Array.isArray(d.collaborators)).toBe(true);
      expect(d.recentDesigns.every(x => x.updatedAt instanceof Date)).toBe(true);
    });

    it('Tech Artist dashboard reports utilisation within 0-100 and recommendations', () => {
      const d = dash.getTechArtistDashboard();
      const { gpuUsage, memoryUsage, cpuUsage } = d.performanceMetrics;
      [gpuUsage, memoryUsage, cpuUsage].forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
      expect(d.benchmarks.every(b => b.fps > 0)).toBe(true);
      expect(d.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getDashboard role dispatch', () => {
    it.each(['ceo', 'cto', 'developer', 'artist', 'tech_artist'])(
      'returns a success envelope for the %s role',
      role => {
        const res = dash.getDashboard(role);
        expect(res.success).toBe(true);
        expect(res.role).toBe(role);
        expect(res.dashboard).toBeDefined();
      }
    );

    it('routes each role to its matching dashboard payload', () => {
      // The CTO payload is uniquely identifiable by its systemUptime field.
      expect(dash.getDashboard('cto').dashboard).toHaveProperty('systemUptime');
      // The developer payload is uniquely identifiable by buildStatus.
      expect(dash.getDashboard('developer').dashboard).toHaveProperty('buildStatus');
    });

    it('returns a failure envelope for an unknown role', () => {
      const res = dash.getDashboard('hacker');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unknown role');
      expect(res.dashboard).toBeUndefined();
    });
  });
});

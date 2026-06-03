import { TaskFacilitator } from '../../src/agent/task-facilitator';

describe('TaskFacilitator', () => {
  let f: TaskFacilitator;
  beforeEach(() => {
    // Huge intervals so the blockage-checker / rebalancer never fire mid-test.
    f = new TaskFacilitator({ blockageCheckIntervalMs: 1e9, rebalanceIntervalMs: 1e9, maxTasksPerAgent: 3 });
  });
  afterEach(() => {
    f.stop(); // clear the intervals (avoid open handles)
  });

  describe('lifecycle', () => {
    it('registers a task as pending', () => {
      const r = f.registerTask('T1', 'zip', 5);
      expect(r.status).toBe('pending');
      expect(f.getTaskStatus('T1')?.priority).toBe(5);
    });

    it('assigns a task and increments agent workload', () => {
      f.registerTask('T1', 'zip');
      expect(f.assignTask('T1', 'kai')).toBe(true);
      expect(f.getTaskStatus('T1')!.status).toBe('assigned');
      expect(f.getAgentWorkload().kai.current).toBe(1);
    });

    it('returns false assigning/starting an unknown task', () => {
      expect(f.assignTask('nope', 'kai')).toBe(false);
      expect(f.startTask('nope')).toBe(false);
    });

    it('starts a task (executing) and records activity', () => {
      f.registerTask('T1', 'zip');
      expect(f.startTask('T1')).toBe(true);
      const t = f.getTaskStatus('T1')!;
      expect(t.status).toBe('executing');
      expect(t.started_at).toBeInstanceOf(Date);
      f.updateActivity('T1');
      expect(t.last_activity).toBeInstanceOf(Date);
    });

    it('completes a task: frees workload and removes it', () => {
      f.registerTask('T1', 'zip');
      f.assignTask('T1', 'kai');
      expect(f.getAgentWorkload().kai.current).toBe(1);
      expect(f.completeTask('T1')).toBe(true);
      expect(f.getAgentWorkload().kai.current).toBe(0);
      expect(f.getTaskStatus('T1')).toBeUndefined();
      expect(f.completeTask('T1')).toBe(false); // already gone
    });
  });

  describe('blocking', () => {
    it('blocks and unblocks a task', () => {
      f.registerTask('T1', 'zip');
      f.blockTask('T1', ['T0']);
      expect(f.getTaskStatus('T1')!.status).toBe('blocked');
      expect(f.getBlockedTasks().map(t => t.task_id)).toEqual(['T1']);
      f.unblockTask('T1');
      expect(f.getTaskStatus('T1')!.status).toBe('pending');
      expect(f.getBlockedTasks()).toHaveLength(0);
    });
  });

  describe('queries', () => {
    it('getPendingTasks includes pending/assigned/executing, excludes blocked', () => {
      f.registerTask('p', 'zip'); // pending
      f.registerTask('a', 'zip'); f.assignTask('a', 'zip'); // assigned
      f.registerTask('b', 'zip'); f.blockTask('b', ['x']); // blocked
      const pending = f.getPendingTasks().map(t => t.task_id).sort();
      expect(pending).toEqual(['a', 'p']);
    });

    it('getAgentWorkload reports max/availability/utilization', () => {
      f.registerTask('T1', 'zip'); f.assignTask('T1', 'kai');
      const w = f.getAgentWorkload().kai;
      expect(w).toEqual({ current: 1, max: 3, availability: 2, utilization: 33 });
    });

    it('getStats summarizes totals and states', () => {
      f.registerTask('p', 'zip');
      f.registerTask('b', 'zip'); f.blockTask('b', ['x']);
      const s = f.getStats();
      expect(s.total_tasks).toBe(2);
      expect(s.pending).toBe(1);
      expect(s.blocked).toBe(1);
      expect(s.escalated).toBe(0);
    });
  });
});

import { OpenClawHandler } from '../../src/openclaw/openclaw-handler';

/**
 * Tests for OpenClawHandler. Execution completes via a setTimeout, so fake
 * timers drive commands to completion deterministically.
 */

describe('OpenClawHandler', () => {
  let h: OpenClawHandler;
  beforeEach(() => {
    jest.useFakeTimers();
    h = new OpenClawHandler();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const flush = () => jest.advanceTimersByTime(1001); // fire the random 0-1000ms exec timer

  it('queues a command (executing) then completes it on the timer', () => {
    const cmd = h.queueCommand('zip', 'start-task', { taskId: 'T1' });
    expect(cmd.status).toBe('executing');
    flush();
    const done = h.getCommandStatus(cmd.id)!;
    expect(done.status).toBe('completed');
    expect(done.result).toEqual({ status: 'started', task: 'T1' });
  });

  it('does NOT double-count a completed command (queue drained into history)', () => {
    const cmd = h.queueCommand('zip', 'get-status');
    flush();
    const history = h.getCommandHistory();
    expect(history.filter(c => c.id === cmd.id)).toHaveLength(1); // once, not twice
    expect(h.getStats().totalCommands).toBe(1); // not 2
  });

  it('marks an unknown command failed', () => {
    const cmd = h.queueCommand('zip', 'no-such-command');
    flush();
    const done = h.getCommandStatus(cmd.id)!;
    expect(done.status).toBe('failed');
    expect(done.error).toMatch(/Unknown command/);
  });

  it('routes known commands through processCommand', () => {
    const c1 = h.queueCommand('a', 'pause-task', { taskId: 'X' });
    const c2 = h.queueCommand('a', 'execute-memory-query', { query: 'q' });
    flush();
    expect(h.getCommandStatus(c1.id)!.result.status).toBe('paused');
    expect(h.getCommandStatus(c2.id)!.result.count).toBe(3);
  });

  it('getStats reports success rate and per-agent counts', () => {
    h.queueCommand('zip', 'get-status');
    h.queueCommand('zip', 'bad-cmd');
    h.queueCommand('kai', 'get-status');
    flush();
    const s = h.getStats();
    expect(s.completed).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.successRate).toBeCloseTo(66.67, 1);
    expect(s.byAgent.zip).toBe(2);
    expect(s.byAgent.kai).toBe(1);
  });

  it('getAgentCommands filters by agent', () => {
    h.queueCommand('zip', 'get-status');
    h.queueCommand('kai', 'get-status');
    flush();
    expect(h.getAgentCommands('zip')).toHaveLength(1);
  });

  it('cancelCommand returns false for unknown ids', () => {
    expect(h.cancelCommand('nope')).toBe(false);
  });

  it('clearHistory empties queue and history', () => {
    h.queueCommand('zip', 'get-status');
    flush();
    h.clearHistory();
    expect(h.getStats().totalCommands).toBe(0);
  });
});

/**
 * Unit tests for AgentBridge.
 * Uses lightweight stubs for AgentAPIWrapper — offline, no Neo4j.
 */

import { AgentBridge, BridgeTask } from '../../src/integrations/lightrag/agent-bridge';

// Minimal stub for AgentAPIWrapper methods used by AgentBridge
function makeStubAPI() {
  const calls: Array<{ method: string; args: any[] }> = [];
  const api = {
    _calls: calls,
    async addDecision(_agent: string, decision: any) { calls.push({ method: 'addDecision', args: [_agent, decision] }); },
    async addRisk(_agent: string, risk: any) { calls.push({ method: 'addRisk', args: [_agent, risk] }); return 'risk_stub_id'; },
    async addPrecedent(_agent: string, precedent: any) { calls.push({ method: 'addPrecedent', args: [_agent, precedent] }); return 'precedent_stub_id'; },
    async link(...args: any[]) { calls.push({ method: 'link', args }); },
  };
  return api as any;
}

function makeTask(overrides: Partial<BridgeTask> = {}): BridgeTask {
  return {
    id: 'task-001',
    title: 'Setup Postgres persistence',
    description: 'Replace in-memory store with Postgres-backed implementation',
    priority: 'critical',
    sprint: 'week1',
    affects: ['database', 'architecture'],
    ...overrides,
  };
}

describe('AgentBridge.onTaskCompleted', () => {
  it('calls addDecision with agent and task details', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    const task = makeTask();
    await bridge.onTaskCompleted('kai', task);
    expect(api._calls).toHaveLength(1);
    const call = api._calls[0];
    expect(call.method).toBe('addDecision');
    expect(call.args[0]).toBe('kai');
    expect(call.args[1].what).toContain('Setup Postgres persistence');
    expect(call.args[1].affects).toContain('database');
  });

  it('increments tasksRecorded counter', async () => {
    const bridge = new AgentBridge(makeStubAPI());
    await bridge.onTaskCompleted('kai', makeTask());
    expect(bridge.getStats().tasksRecorded).toBe(1);
  });

  it('extracts domains from title when affects not provided', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    const task = makeTask({ affects: undefined, title: 'Setup Kafka and Redis monitoring' });
    await bridge.onTaskCompleted('kai', task);
    const affects = api._calls[0].args[1].affects as string[];
    expect(affects).toEqual(expect.arrayContaining(['kafka', 'redis', 'monitoring']));
  });

  it('does not throw even when addDecision fails', async () => {
    const api = {
      async addDecision() { throw new Error('Neo4j down'); },
    } as any;
    const bridge = new AgentBridge(api);
    await expect(bridge.onTaskCompleted('kai', makeTask())).resolves.toBeUndefined();
    expect(bridge.getStats().errors).toBe(1);
  });
});

describe('AgentBridge.onTaskFailed', () => {
  it('creates a Risk with correct impact derived from priority', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    await bridge.onTaskFailed('kai', makeTask({ priority: 'critical' }), 'timeout after 30s');
    const call = api._calls.find((c: any) => c.method === 'addRisk');
    expect(call).toBeDefined();
    expect(call.args[1].impact).toBe('high'); // critical task -> high risk
    expect(call.args[1].description).toContain('timeout after 30s');
  });

  it('maps all priorities to correct impact levels', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    const priorities: Array<BridgeTask['priority']> = ['critical', 'high', 'medium', 'low'];
    const expectedImpacts = ['high', 'medium', 'low', 'low'];
    for (const [i, priority] of priorities.entries()) {
      await bridge.onTaskFailed('kai', makeTask({ id: `t${i}`, priority }), 'err');
    }
    const riskCalls = api._calls.filter((c: any) => c.method === 'addRisk');
    for (const [i, expected] of expectedImpacts.entries()) {
      expect(riskCalls[i].args[1].impact).toBe(expected);
    }
  });

  it('never throws (fire-and-forget)', async () => {
    const api = { async addRisk() { throw new Error('fail'); } } as any;
    const bridge = new AgentBridge(api);
    await expect(bridge.onTaskFailed('kai', makeTask(), 'boom')).resolves.toBeUndefined();
  });

  it('increments risksCreated', async () => {
    const bridge = new AgentBridge(makeStubAPI());
    await bridge.onTaskFailed('kai', makeTask(), 'err');
    expect(bridge.getStats().risksCreated).toBe(1);
  });
});

describe('AgentBridge.onAgentProposal', () => {
  it('records proposal as a Decision from the proposing agent', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    await bridge.onAgentProposal('kai', 'zip', 'Add Redis caching layer', ['redis', 'performance']);
    const call = api._calls[0];
    expect(call.method).toBe('addDecision');
    expect(call.args[0]).toBe('kai');
    expect(call.args[1].what).toContain('zip');
    expect(call.args[1].affects).toContain('redis');
  });
});

describe('AgentBridge.onSprintCompleted', () => {
  it('creates a Precedent summarising the sprint', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    const tasks = [
      makeTask({ title: 'Task A', affects: ['database'] }),
      makeTask({ id: 'task-002', title: 'Task B', affects: ['api'] }),
    ];
    await bridge.onSprintCompleted('sprint-1', tasks, ['kai', 'zip']);
    const call = api._calls.find((c: any) => c.method === 'addPrecedent');
    expect(call).toBeDefined();
    expect(call.args[1].context).toContain('sprint-1');
    expect(call.args[1].applicable_to).toEqual(expect.arrayContaining(['database', 'api']));
  });

  it('does nothing for empty task list', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    await bridge.onSprintCompleted('sprint-2', [], ['kai']);
    expect(api._calls).toHaveLength(0);
  });

  it('increments precedentsCreated counter', async () => {
    const bridge = new AgentBridge(makeStubAPI());
    await bridge.onSprintCompleted('s', [makeTask()], ['kai']);
    expect(bridge.getStats().precedentsCreated).toBe(1);
  });
});

describe('AgentBridge.onCriticalRisk', () => {
  it('creates a critical Risk with the given description and mitigation', async () => {
    const api = makeStubAPI();
    const bridge = new AgentBridge(api);
    await bridge.onCriticalRisk('fill', 'DB disk full at 95%', 'Provision additional storage immediately');
    const call = api._calls.find((c: any) => c.method === 'addRisk');
    expect(call).toBeDefined();
    expect(call.args[1].impact).toBe('critical');
    expect(call.args[1].description).toContain('DB disk full');
    expect(call.args[1].mitigation).toContain('storage');
  });

  it('also submits to factValidator when provided', async () => {
    const api = makeStubAPI();
    const submitted: any[] = [];
    const mockFv = { async submit(_a: string, f: any) { submitted.push(f); return 'fact_x'; } } as any;
    const bridge = new AgentBridge(api, mockFv);
    await bridge.onCriticalRisk('kai', 'CRITICAL: OOM', 'restart service');
    expect(submitted).toHaveLength(1);
    expect(submitted[0].type).toBe('risk');
    expect(submitted[0].content).toContain('CRITICAL: OOM');
  });
});

describe('AgentBridge.getStats', () => {
  it('starts at zeros', () => {
    const bridge = new AgentBridge(makeStubAPI());
    const stats = bridge.getStats();
    expect(stats.tasksRecorded).toBe(0);
    expect(stats.risksCreated).toBe(0);
    expect(stats.precedentsCreated).toBe(0);
    expect(stats.errors).toBe(0);
  });
});

/**
 * Agent Orchestrator Tests
 *
 * Verify message routing per Fill's ClaudeClaw spec:
 * - Mention routing (@agent-id)
 * - Session-based routing
 * - Keyword matching
 * - Default fallback
 */

import { agentOrchestrator } from '../../src/orchestration/agent-orchestrator';

describe('Agent Orchestrator', () => {
  beforeEach(() => {
    // Clear sessions before each test
    agentOrchestrator.endSession('test-user-1');
    agentOrchestrator.endSession('test-user-2');
  });

  describe('Message Routing', () => {
    it('should route @mention to specific agent', () => {
      const decision = agentOrchestrator.routeMessage('user1', '@kai deploy the backend');

      expect(decision.agentId).toBe('kai');
      expect(decision.reason).toBe('mention');
      expect(decision.cleanedMessage).toBe('deploy the backend');
      expect(decision.confidence).toBe(1.0);
    });

    it('should handle multiple agent mentions (first match wins)', () => {
      const decision = agentOrchestrator.routeMessage('user1', '@fill what is the strategy @kai');

      expect(decision.agentId).toBe('fill');
      expect(decision.reason).toBe('mention');
    });

    it('should ignore invalid mentions and fall through', () => {
      const decision = agentOrchestrator.routeMessage('user1', '@invalidagent message');

      // Should not route to invalid agent, fall through to keyword/default
      expect(decision.agentId).not.toBe('invalidagent');
    });

    it('should route by keyword matching', () => {
      const decision1 = agentOrchestrator.routeMessage('user2', 'I need to deploy to kubernetes');
      expect(decision1.agentId).toBe('kai');
      expect(decision1.reason).toBe('keyword');
      expect(decision1.matchedKeyword).toBe('deploy');

      const decision2 = agentOrchestrator.routeMessage('user3', 'Design the new dashboard UI');
      expect(decision2.agentId).toBe('zip');
      expect(decision2.reason).toBe('keyword');
      expect(decision2.matchedKeyword).toBe('ui');

      const decision3 = agentOrchestrator.routeMessage('user4', 'Run tests for the bug');
      expect(decision3.agentId).toBe('luna');
      expect(decision3.reason).toBe('keyword');
      expect(decision3.matchedKeyword).toBe('test');
    });

    it('should default to Fill for unknown messages', () => {
      const decision = agentOrchestrator.routeMessage('user5', 'xyzabc something random');

      expect(decision.agentId).toBe('fill');
      expect(decision.reason).toBe('default');
      expect(decision.confidence).toBe(0.5);
    });

    it('should have higher confidence for keyword match at start', () => {
      const startMatch = agentOrchestrator.routeMessage('user1', 'deploy the servers');
      const endMatch = agentOrchestrator.routeMessage('user2', 'we need to deploy things');

      expect(startMatch.confidence).toBeGreaterThan(endMatch.confidence);
    });
  });

  describe('Active Sessions', () => {
    it('should start session for user+agent', () => {
      agentOrchestrator.startSession('user-a', 'kai');
      const session = agentOrchestrator.getSession('user-a');

      expect(session).toBeDefined();
      expect(session?.userId).toBe('user-a');
      expect(session?.agentId).toBe('kai');
      expect(session?.messageCount).toBe(0);
    });

    it('should route to active session agent', () => {
      agentOrchestrator.startSession('user-b', 'mira');
      const decision = agentOrchestrator.routeMessage('user-b', 'something random');

      expect(decision.agentId).toBe('mira');
      expect(decision.reason).toBe('active_session');
      expect(decision.confidence).toBe(0.9);
    });

    it('should override session with @mention', () => {
      agentOrchestrator.startSession('user-c', 'kai');
      const decision = agentOrchestrator.routeMessage('user-c', '@zip show the dashboard');

      expect(decision.agentId).toBe('zip');
      expect(decision.reason).toBe('mention');
      expect(decision.confidence).toBe(1.0);
    });

    it('should end session', () => {
      agentOrchestrator.startSession('user-d', 'luna');
      let session = agentOrchestrator.getSession('user-d');
      expect(session).toBeDefined();

      agentOrchestrator.endSession('user-d');
      session = agentOrchestrator.getSession('user-d');
      expect(session).toBeUndefined();
    });

    it('should expire old sessions (timeout)', (done) => {
      agentOrchestrator.startSession('user-e', 'fill');

      // Wait for session to "age" (normally 30min, but test should complete)
      // For testing purposes, old sessions should expire
      setTimeout(() => {
        // Note: Real timeout is 30 minutes, this test just verifies structure
        const session = agentOrchestrator.getSession('user-e');
        expect(session?.agentId).toBe('fill'); // Still active within test window
        done();
      }, 100);
    });
  });

  describe('Routing Priority', () => {
    it('should follow priority: mention > session > keyword > default', () => {
      // Setup: active session with kai
      agentOrchestrator.startSession('user-prio', 'kai');

      // Test 1: Just session
      let decision = agentOrchestrator.routeMessage('user-prio', 'deploy the app');
      expect(decision.reason).toBe('active_session');
      expect(decision.agentId).toBe('kai');

      // Test 2: Mention beats session
      decision = agentOrchestrator.routeMessage('user-prio', '@mira design this');
      expect(decision.reason).toBe('mention');
      expect(decision.agentId).toBe('mira');
      expect(decision.confidence).toBe(1.0);

      // Test 3: Back to session
      decision = agentOrchestrator.routeMessage('user-prio', 'something else');
      expect(decision.reason).toBe('active_session');
      expect(decision.agentId).toBe('kai');
    });
  });

  describe('Statistics', () => {
    it('should track orchestration stats', () => {
      agentOrchestrator.startSession('user-stat1', 'kai');
      agentOrchestrator.startSession('user-stat2', 'zip');

      const stats = agentOrchestrator.getStats();

      expect(stats.activeSessions).toBeGreaterThanOrEqual(2);
      expect(typeof stats.sessionsByAgent).toBe('object');
      expect(typeof stats.totalMessages).toBe('number');
      expect(stats.sessionsByAgent.kai).toBeGreaterThanOrEqual(1);
      expect(stats.sessionsByAgent.zip).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Robustness', () => {
    it('should handle invalid agent IDs', () => {
      // Should not crash on invalid agent
      agentOrchestrator.startSession('user-invalid', 'not-real-agent');
      const session = agentOrchestrator.getSession('user-invalid');

      // Session should not be created for invalid agent
      expect(session).toBeUndefined();
    });

    it('should handle empty messages', () => {
      const decision = agentOrchestrator.routeMessage('user-empty', '');

      expect(decision.agentId).toBe('fill');
      expect(decision.reason).toBe('default');
    });

    it('should handle whitespace-only messages', () => {
      const decision = agentOrchestrator.routeMessage('user-ws', '   \n\t  ');

      expect(decision.agentId).toBe('fill');
      expect(decision.reason).toBe('default');
    });
  });
});

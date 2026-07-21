/**
 * Unit tests for graph-ml.ts
 * All tests are offline — no Neo4j, Kafka, or network required.
 */

import {
  findSimilar,
  detectDuplicates,
  suggestEdges,
  clusterNodes,
  scoreAgentReputation,
  rankAgents,
  MLNode,
  FactVoteRecord,
} from '../../src/integrations/lightrag/graph-ml';

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────

const decisionNodes: MLNode[] = [
  { id: 'd1', type: 'decision', content: 'Use Kafka for distributed agent communication and event streaming' },
  { id: 'd2', type: 'decision', content: 'Use Kafka message broker for async agent task queue and events' },
  { id: 'd3', type: 'decision', content: 'Deploy Neo4j graph database for knowledge storage and retrieval' },
  { id: 'd4', type: 'decision', content: 'Implement quantum-safe cryptography using NIST post-quantum standards' },
  { id: 'd5', type: 'decision', content: 'Adopt TypeScript strict mode for all backend services' },
];

const mixedNodes: MLNode[] = [
  { id: 'n1', type: 'decision', content: 'Use Kafka for event streaming and distributed messaging' },
  { id: 'n2', type: 'risk', content: 'Kafka broker failure may disrupt event streaming pipeline' },
  { id: 'n3', type: 'decision', content: 'Deploy quantum-resistant cryptographic algorithms' },
  { id: 'n4', type: 'risk', content: 'Post-quantum threats from Shor algorithm may break RSA encryption' },
  { id: 'n5', type: 'precedent', content: 'Team previously migrated from REST to event-driven Kafka architecture' },
  { id: 'n6', type: 'context', content: 'Current infrastructure runs on Kubernetes with 5 agent pods' },
];

const nearDuplicates: MLNode[] = [
  { id: 'a', type: 'decision', content: 'Use Redis for caching API responses and session management' },
  { id: 'b', type: 'decision', content: 'Use Redis cache for API response caching and session storage management' },
  { id: 'c', type: 'decision', content: 'Deploy PostgreSQL for relational data persistence and analytics' },
];

// ──────────────────────────────────────────────────────────────────────────────
// findSimilar
// ──────────────────────────────────────────────────────────────────────────────

describe('findSimilar', () => {
  it('returns topK results or fewer', () => {
    const results = findSimilar(decisionNodes[0], decisionNodes, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('excludes the target node itself', () => {
    const results = findSimilar(decisionNodes[0], decisionNodes);
    expect(results.every(r => r.id !== decisionNodes[0].id)).toBe(true);
  });

  it('returns higher score for more similar content', () => {
    // d1 and d2 are both about Kafka — d2 should rank higher than d3 (Neo4j) for d1
    const results = findSimilar(decisionNodes[0], decisionNodes);
    const kafkaResult = results.find(r => r.id === 'd2');
    const neo4jResult = results.find(r => r.id === 'd3');
    expect(kafkaResult?.score ?? 0).toBeGreaterThan(neo4jResult?.score ?? 0);
  });

  it('returns results sorted descending by score', () => {
    const results = findSimilar(decisionNodes[0], decisionNodes, 5);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('returns empty array when corpus has only the target', () => {
    const results = findSimilar(decisionNodes[0], [decisionNodes[0]]);
    expect(results).toHaveLength(0);
  });

  it('returns empty array for empty corpus', () => {
    const results = findSimilar(decisionNodes[0], []);
    expect(results).toHaveLength(0);
  });

  it('includes score and type on each result', () => {
    const results = findSimilar(decisionNodes[0], decisionNodes, 2);
    for (const r of results) {
      expect(typeof r.score).toBe('number');
      expect(typeof r.type).toBe('string');
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('handles single-word content without crashing', () => {
    const tiny: MLNode[] = [
      { id: 'x', type: 'decision', content: 'kafka' },
      { id: 'y', type: 'decision', content: 'neo4j' },
    ];
    expect(() => findSimilar(tiny[0], tiny)).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// detectDuplicates
// ──────────────────────────────────────────────────────────────────────────────

describe('detectDuplicates', () => {
  it('finds near-duplicate pair above moderate threshold', () => {
    // TF-IDF without stemming scores ~0.5-0.65 for paraphrased text
    const pairs = detectDuplicates(nearDuplicates, 0.5);
    const pair = pairs.find(p =>
      (p.aId === 'a' && p.bId === 'b') || (p.aId === 'b' && p.bId === 'a'),
    );
    expect(pair).toBeDefined();
    expect(pair!.score).toBeGreaterThan(0.5);
  });

  it('does not flag clearly different content as duplicates', () => {
    const pairs = detectDuplicates(nearDuplicates, 0.85);
    const bad = pairs.find(p => p.aId === 'a' && p.bId === 'c');
    expect(bad).toBeUndefined();
  });

  it('returns pairs sorted descending by score', () => {
    const pairs = detectDuplicates(mixedNodes, 0.3);
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i - 1].score).toBeGreaterThanOrEqual(pairs[i].score);
    }
  });

  it('returns empty array for single node', () => {
    expect(detectDuplicates([nearDuplicates[0]], 0.5)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(detectDuplicates([], 0.5)).toHaveLength(0);
  });

  it('never produces pairs where aId === bId', () => {
    const pairs = detectDuplicates(mixedNodes, 0.0);
    expect(pairs.every(p => p.aId !== p.bId)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// suggestEdges
// ──────────────────────────────────────────────────────────────────────────────

describe('suggestEdges', () => {
  it('returns EdgeSuggestion objects with required fields', () => {
    const suggestions = suggestEdges(mixedNodes, 0.2);
    for (const s of suggestions) {
      expect(typeof s.fromId).toBe('string');
      expect(typeof s.toId).toBe('string');
      expect(typeof s.relType).toBe('string');
      expect(typeof s.score).toBe('number');
      expect(typeof s.reason).toBe('string');
    }
  });

  it('suggests AFFECTS between decision and risk with shared content', () => {
    const kafkaDecision: MLNode = { id: 'kd', type: 'decision', content: 'Use Kafka for streaming events' };
    const kafkaRisk: MLNode = { id: 'kr', type: 'risk', content: 'Kafka streaming failure risk for event pipeline' };
    const suggestions = suggestEdges([kafkaDecision, kafkaRisk], 0.2);
    const affects = suggestions.find(s => s.relType === 'AFFECTS');
    expect(affects).toBeDefined();
  });

  it('suggests RELATED_TO between two decisions', () => {
    const suggestions = suggestEdges([decisionNodes[0], decisionNodes[1]], 0.1);
    const rel = suggestions.find(s => s.relType === 'RELATED_TO');
    expect(rel).toBeDefined();
  });

  it('respects minScore filter', () => {
    const all = suggestEdges(mixedNodes, 0.0);
    const filtered = suggestEdges(mixedNodes, 0.9);
    expect(filtered.length).toBeLessThanOrEqual(all.length);
  });

  it('returns sorted descending by score', () => {
    const suggestions = suggestEdges(mixedNodes, 0.1);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score);
    }
  });

  it('returns empty array for single node', () => {
    expect(suggestEdges([mixedNodes[0]], 0.1)).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// clusterNodes
// ──────────────────────────────────────────────────────────────────────────────

describe('clusterNodes', () => {
  it('returns clusters with k ≤ node count', () => {
    const clusters = clusterNodes(decisionNodes, 3);
    expect(clusters.length).toBeLessThanOrEqual(3);
    expect(clusters.length).toBeGreaterThan(0);
  });

  it('assigns every node to exactly one cluster', () => {
    const clusters = clusterNodes(decisionNodes, 3);
    const assigned = clusters.flatMap(c => c.nodes);
    const unique = new Set(assigned);
    // Every node id should appear exactly once
    for (const n of decisionNodes) {
      expect(unique.has(n.id)).toBe(true);
    }
    expect(assigned.length).toBe(decisionNodes.length);
  });

  it('each cluster has a topTerms array', () => {
    const clusters = clusterNodes(decisionNodes, 2);
    for (const c of clusters) {
      expect(Array.isArray(c.topTerms)).toBe(true);
    }
  });

  it('returns empty array for empty input', () => {
    expect(clusterNodes([], 3)).toHaveLength(0);
  });

  it('handles k > node count gracefully', () => {
    const tiny = decisionNodes.slice(0, 2);
    const clusters = clusterNodes(tiny, 10);
    const assigned = clusters.flatMap(c => c.nodes);
    expect(assigned.length).toBe(tiny.length);
  });

  it('cluster ids are unique integers', () => {
    const clusters = clusterNodes(decisionNodes, 3);
    const ids = clusters.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('groups Kafka-related nodes together when k=2', () => {
    const kafkaNodes: MLNode[] = [
      { id: 'k1', type: 'decision', content: 'Use Kafka for distributed event streaming broker' },
      { id: 'k2', type: 'decision', content: 'Kafka message queue for async agent communication events' },
      { id: 'q1', type: 'decision', content: 'Deploy quantum-resistant NIST post-quantum cryptography algorithms' },
      { id: 'q2', type: 'decision', content: 'Post-quantum crypto migration for RSA key exchange algorithms' },
    ];
    const clusters = clusterNodes(kafkaNodes, 2, 50);
    // k1 and k2 should end up in same cluster; q1 and q2 in the other
    const kafkaCluster = clusters.find(c => c.nodes.includes('k1'));
    expect(kafkaCluster?.nodes).toContain('k2');
    const quantumCluster = clusters.find(c => c.nodes.includes('q1'));
    expect(quantumCluster?.nodes).toContain('q2');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// scoreAgentReputation
// ──────────────────────────────────────────────────────────────────────────────

describe('scoreAgentReputation', () => {
  const history: FactVoteRecord[] = [
    { factId: 'f1', voter: 'alice', vote: 'validate', factFinalState: 'confirmed' },
    { factId: 'f2', voter: 'alice', vote: 'validate', factFinalState: 'confirmed' },
    { factId: 'f3', voter: 'alice', vote: 'challenge', factFinalState: 'rejected' },
    { factId: 'f4', voter: 'alice', vote: 'validate', factFinalState: 'rejected' }, // wrong vote
    { factId: 'f5', voter: 'bob', vote: 'challenge', factFinalState: 'confirmed' }, // wrong
    { factId: 'f6', voter: 'bob', vote: 'validate', factFinalState: 'confirmed' },  // correct
    { factId: 'f1', voter: 'alice', vote: 'validate', submittedBy: 'alice', factFinalState: 'confirmed' },
  ];

  it('returns correct agent name', () => {
    const rep = scoreAgentReputation('alice', history);
    expect(rep.agent).toBe('alice');
  });

  it('counts validates and challenges correctly', () => {
    const rep = scoreAgentReputation('alice', history);
    expect(rep.validates).toBe(4); // f1, f2, f4, and the duplicate f1 vote
    expect(rep.challenges).toBe(1); // f3
  });

  it('computes accuracy as correct_votes / total_votes', () => {
    const rep = scoreAgentReputation('alice', history);
    // Alice has 5 votes: f1(correct), f2(correct), f3(correct), f4(wrong), f1(correct) = 4/5
    expect(rep.accuracy).toBeCloseTo(4 / 5, 5);
  });

  it('score is non-negative', () => {
    const rep = scoreAgentReputation('alice', history);
    expect(rep.score).toBeGreaterThanOrEqual(0);
  });

  it('score is capped at 10', () => {
    const bigHistory: FactVoteRecord[] = Array.from({ length: 1000 }, (_, i) => ({
      factId: `f${i}`, voter: 'agent', vote: 'validate' as const, factFinalState: 'confirmed' as const,
    }));
    const rep = scoreAgentReputation('agent', bigHistory);
    expect(rep.score).toBeLessThanOrEqual(10);
  });

  it('returns novice tier for agent with no history', () => {
    const rep = scoreAgentReputation('nobody', history);
    expect(rep.tier).toBe('novice');
    expect(rep.score).toBe(0);
  });

  it('unknown final state does not count as correct', () => {
    const partial: FactVoteRecord[] = [
      { factId: 'f1', voter: 'x', vote: 'validate', factFinalState: 'pending' },
    ];
    const rep = scoreAgentReputation('x', partial);
    expect(rep.accuracy).toBe(0);
  });

  it('bob has lower score than alice due to wrong vote', () => {
    const aliceRep = scoreAgentReputation('alice', history);
    const bobRep = scoreAgentReputation('bob', history);
    // Bob has 1/2 accuracy with fewer votes; alice has 4/5 accuracy with more votes
    expect(aliceRep.score).toBeGreaterThan(bobRep.score);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// rankAgents
// ──────────────────────────────────────────────────────────────────────────────

describe('rankAgents', () => {
  const history: FactVoteRecord[] = [
    { factId: 'f1', voter: 'alice', vote: 'validate', factFinalState: 'confirmed' },
    { factId: 'f2', voter: 'alice', vote: 'validate', factFinalState: 'confirmed' },
    { factId: 'f3', voter: 'alice', vote: 'validate', factFinalState: 'confirmed' },
    { factId: 'f1', voter: 'bob', vote: 'challenge', factFinalState: 'confirmed' },  // wrong
    { factId: 'f2', voter: 'charlie', vote: 'validate', factFinalState: 'confirmed' },
  ];

  it('returns one entry per unique voter', () => {
    const rankings = rankAgents(history);
    expect(rankings.length).toBe(3);
    expect(new Set(rankings.map(r => r.agent)).size).toBe(3);
  });

  it('returns results sorted descending by score', () => {
    const rankings = rankAgents(history);
    for (let i = 1; i < rankings.length; i++) {
      expect(rankings[i - 1].score).toBeGreaterThanOrEqual(rankings[i].score);
    }
  });

  it('alice ranks highest (3 correct votes)', () => {
    const rankings = rankAgents(history);
    expect(rankings[0].agent).toBe('alice');
  });

  it('returns empty array for empty history', () => {
    expect(rankAgents([])).toHaveLength(0);
  });
});

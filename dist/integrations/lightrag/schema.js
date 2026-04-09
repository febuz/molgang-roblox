"use strict";
/**
 * LightRAG Memory Schema
 *
 * Defines Neo4j node and relationship types for shared agent memory.
 * Includes Cypher queries for common operations and index definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUERIES = exports.RELATIONSHIPS = exports.INDEXES = void 0;
exports.isDecision = isDecision;
exports.isRisk = isRisk;
exports.isPrecedent = isPrecedent;
exports.isContext = isContext;
/**
 * Neo4j Index Definitions
 *
 * These improve query performance for common lookups.
 * Execute these on first connection to Neo4j.
 */
exports.INDEXES = {
    // Decision indexes
    decisionById: `CREATE INDEX IF NOT EXISTS FOR (d:Decision) ON (d.id)`,
    decisionByWho: `CREATE INDEX IF NOT EXISTS FOR (d:Decision) ON (d.who)`,
    decisionByWhen: `CREATE INDEX IF NOT EXISTS FOR (d:Decision) ON (d.when)`,
    decisionStatus: `CREATE INDEX IF NOT EXISTS FOR (d:Decision) ON (d.status)`,
    // Risk indexes
    riskById: `CREATE INDEX IF NOT EXISTS FOR (r:Risk) ON (r.id)`,
    riskImpact: `CREATE INDEX IF NOT EXISTS FOR (r:Risk) ON (r.impact)`,
    riskStatus: `CREATE INDEX IF NOT EXISTS FOR (r:Risk) ON (r.status)`,
    // Precedent indexes
    precedentById: `CREATE INDEX IF NOT EXISTS FOR (p:Precedent) ON (p.id)`,
    precedentContext: `CREATE INDEX IF NOT EXISTS FOR (p:Precedent) ON (p.context)`,
    // Context indexes
    contextById: `CREATE INDEX IF NOT EXISTS FOR (c:Context) ON (c.id)`,
    contextProject: `CREATE INDEX IF NOT EXISTS FOR (c:Context) ON (c.project)`,
    // Full-text search indexes
    fullTextDecision: `CREATE FULLTEXT INDEX IF NOT EXISTS decision_search FOR (d:Decision) ON EACH [d.what, d.why]`,
    fullTextRisk: `CREATE FULLTEXT INDEX IF NOT EXISTS risk_search FOR (r:Risk) ON EACH [r.description, r.mitigation]`,
    fullTextPrecedent: `CREATE FULLTEXT INDEX IF NOT EXISTS precedent_search FOR (p:Precedent) ON EACH [p.context, p.outcome]`,
};
/**
 * Relationship Types
 */
exports.RELATIONSHIPS = {
    DEPENDS_ON: 'DEPENDS_ON', // Decision depends on another decision
    BLOCKS: 'BLOCKS', // Risk/decision blocks another decision
    ENABLES: 'ENABLES', // Decision enables another action
    RELATED_TO: 'RELATED_TO', // General relationship between nodes
    APPLIES_TO: 'APPLIES_TO', // Precedent applies to a context
    AFFECTS: 'AFFECTS', // Node affects another node
    MITIGATES: 'MITIGATES', // Mitigation addresses a risk
    REFERENCES: 'REFERENCES', // Node references another node
};
/**
 * Common Cypher Queries
 */
exports.QUERIES = {
    /**
     * Find all decisions made by an agent
     */
    findDecisionsByAgent: (agent) => `
    MATCH (d:Decision {who: $agent})
    WHERE d.status = 'active'
    RETURN d
    ORDER BY d.when DESC
    LIMIT 50
  `,
    /**
     * Find decisions affecting a topic
     */
    findDecisionsByTopic: (topic) => `
    MATCH (d:Decision)
    WHERE $topic IN d.affects
    AND d.status = 'active'
    RETURN d
    ORDER BY d.when DESC
    LIMIT 20
  `,
    /**
     * Find similar precedents
     */
    findSimilarPrecedents: (context) => `
    MATCH (p:Precedent)
    WITH p, apoc.text.jaroWinklerSimilarity(p.context, $context) AS similarity
    WHERE similarity > 0.7
    RETURN p, similarity
    ORDER BY similarity DESC
    LIMIT 10
  `,
    /**
     * Get full context for a project
     */
    getProjectContext: (project) => `
    MATCH (c:Context {project: $project})
    OPTIONAL MATCH (c)-[:APPLIES_TO*0..5]->(d:Decision)
    OPTIONAL MATCH (c)-[:APPLIES_TO*0..5]->(r:Risk)
    OPTIONAL MATCH (c)-[:APPLIES_TO*0..5]->(p:Precedent)
    RETURN {
      context: c,
      decisions: COLLECT(DISTINCT d),
      risks: COLLECT(DISTINCT r),
      precedents: COLLECT(DISTINCT p)
    } AS result
    LIMIT 1
  `,
    /**
     * Find critical risks
     */
    findCriticalRisks: () => `
    MATCH (r:Risk)
    WHERE r.impact IN ['high', 'critical']
    AND r.status IN ['identified', 'mitigating']
    RETURN r
    ORDER BY r.impact DESC
    LIMIT 20
  `,
    /**
     * Find decision dependencies
     */
    findDependencies: (decisionId) => `
    MATCH (d:Decision {id: $decisionId})
    OPTIONAL MATCH (d)-[:DEPENDS_ON*1..3]->(dep:Decision)
    OPTIONAL MATCH (d)<-[:DEPENDS_ON*1..3]-(dependent:Decision)
    RETURN {
      decision: d,
      dependencies: COLLECT(DISTINCT dep),
      dependents: COLLECT(DISTINCT dependent)
    } AS result
    LIMIT 1
  `,
    /**
     * Create a decision node
     */
    createDecision: () => `
    CREATE (d:Decision {
      id: $id,
      when: $when,
      who: $who,
      what: $what,
      why: $why,
      affects: $affects,
      status: 'active',
      created_at: datetime()
    })
    RETURN d
  `,
    /**
     * Create a risk node
     */
    createRisk: () => `
    CREATE (r:Risk {
      id: $id,
      description: $description,
      impact: $impact,
      mitigation: $mitigation,
      status: 'identified',
      created_at: datetime()
    })
    RETURN r
  `,
    /**
     * Find related decisions
     */
    findRelatedDecisions: (topic) => `
    MATCH (d:Decision)
    WHERE d.what CONTAINS $topic
      OR d.why CONTAINS $topic
      OR $topic IN d.affects
    RETURN d
    LIMIT 10
  `,
    /**
     * Get memory statistics
     */
    getMemoryStats: () => `
    MATCH (n)
    RETURN {
      totalNodes: COUNT(n),
      decisions: SIZE([d IN [n] WHERE labels(d)[0] = 'Decision']),
      risks: SIZE([r IN [n] WHERE labels(r)[0] = 'Risk']),
      precedents: SIZE([p IN [n] WHERE labels(p)[0] = 'Precedent']),
      contexts: SIZE([c IN [n] WHERE labels(c)[0] = 'Context'])
    } AS stats
  `,
};
/**
 * Type guards
 */
function isDecision(obj) {
    return obj && typeof obj.what === 'string' && typeof obj.why === 'string';
}
function isRisk(obj) {
    return obj && typeof obj.description === 'string' && ['low', 'medium', 'high', 'critical'].includes(obj.impact);
}
function isPrecedent(obj) {
    return obj && typeof obj.context === 'string' && typeof obj.outcome === 'string';
}
function isContext(obj) {
    return obj && typeof obj.project === 'string' && Array.isArray(obj.requirements);
}
//# sourceMappingURL=schema.js.map
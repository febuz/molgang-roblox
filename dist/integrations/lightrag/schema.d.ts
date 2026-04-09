/**
 * LightRAG Memory Schema
 *
 * Defines Neo4j node and relationship types for shared agent memory.
 * Includes Cypher queries for common operations and index definitions.
 */
export interface Decision {
    id?: string;
    when: string;
    who: string;
    what: string;
    why: string;
    affects: string[];
    status?: 'active' | 'superseded' | 'archived';
    created_at?: Date;
}
export interface Risk {
    id?: string;
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
    status?: 'identified' | 'mitigating' | 'resolved';
    created_at?: Date;
}
export interface Precedent {
    id?: string;
    context: string;
    outcome: string;
    applicable_to: string[];
    similarity_score?: number;
    created_at?: Date;
}
export interface Context {
    id?: string;
    project: string;
    scope: string;
    requirements: string[];
    blockers?: string[];
    decisions: Decision[];
    risks: Risk[];
    precedents: Precedent[];
    updated_at?: Date;
}
export interface Node {
    id?: string;
    type: 'Decision' | 'Risk' | 'Precedent' | 'Context';
    content: string;
    metadata?: Record<string, any>;
    created_at?: Date;
    updated_at?: Date;
}
/**
 * Neo4j Index Definitions
 *
 * These improve query performance for common lookups.
 * Execute these on first connection to Neo4j.
 */
export declare const INDEXES: {
    decisionById: string;
    decisionByWho: string;
    decisionByWhen: string;
    decisionStatus: string;
    riskById: string;
    riskImpact: string;
    riskStatus: string;
    precedentById: string;
    precedentContext: string;
    contextById: string;
    contextProject: string;
    fullTextDecision: string;
    fullTextRisk: string;
    fullTextPrecedent: string;
};
/**
 * Relationship Types
 */
export declare const RELATIONSHIPS: {
    DEPENDS_ON: string;
    BLOCKS: string;
    ENABLES: string;
    RELATED_TO: string;
    APPLIES_TO: string;
    AFFECTS: string;
    MITIGATES: string;
    REFERENCES: string;
};
/**
 * Common Cypher Queries
 */
export declare const QUERIES: {
    /**
     * Find all decisions made by an agent
     */
    findDecisionsByAgent: (agent: string) => string;
    /**
     * Find decisions affecting a topic
     */
    findDecisionsByTopic: (topic: string) => string;
    /**
     * Find similar precedents
     */
    findSimilarPrecedents: (context: string) => string;
    /**
     * Get full context for a project
     */
    getProjectContext: (project: string) => string;
    /**
     * Find critical risks
     */
    findCriticalRisks: () => string;
    /**
     * Find decision dependencies
     */
    findDependencies: (decisionId: string) => string;
    /**
     * Create a decision node
     */
    createDecision: () => string;
    /**
     * Create a risk node
     */
    createRisk: () => string;
    /**
     * Find related decisions
     */
    findRelatedDecisions: (topic: string) => string;
    /**
     * Get memory statistics
     */
    getMemoryStats: () => string;
};
/**
 * Type guards
 */
export declare function isDecision(obj: any): obj is Decision;
export declare function isRisk(obj: any): obj is Risk;
export declare function isPrecedent(obj: any): obj is Precedent;
export declare function isContext(obj: any): obj is Context;
//# sourceMappingURL=schema.d.ts.map
/**
 * Entity-Driven Numerai Data Model (FactSet-style)
 *
 * Core entity types:
 * - Security (crypto/stock)
 * - Signal (price predictor)
 * - Feature (market indicator)
 * - Competition (prediction contest)
 * - Submission (model submission)
 */
export interface Entity {
    id: string;
    type: 'security' | 'signal' | 'feature' | 'competition' | 'submission' | 'portfolio';
    metadata: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}
export interface Security extends Entity {
    type: 'security';
    ticker: string;
    name: string;
    asset_class: 'crypto' | 'stock';
    exchange: string;
    sector?: string;
    features: {
        price_features: string[];
        technical_features: string[];
        fundamental_features: string[];
    };
    status: 'active' | 'inactive' | 'delisted';
}
export interface Signal extends Entity {
    type: 'signal';
    security_id: string;
    signal_name: string;
    description: string;
    lookback_period: number;
    prediction_horizon: number;
    signal_type: 'directional' | 'probability' | 'regression';
    last_value: number;
    last_updated: Date;
    data_quality_score: number;
}
export interface Feature extends Entity {
    type: 'feature';
    feature_name: string;
    category: 'price' | 'technical' | 'fundamental' | 'sentiment' | 'alternative';
    description: string;
    calculation: string;
    update_frequency: 'daily' | 'hourly' | 'real-time';
    applicable_securities: string[];
}
export interface Competition extends Entity {
    type: 'competition';
    competition_name: string;
    start_date: Date;
    end_date?: Date;
    status: 'active' | 'closed' | 'upcoming';
    target_asset: string;
    submission_window: {
        start: Date;
        end: Date;
    };
    scoring_metric: string;
    prize_pool: number;
    participants: number;
}
export interface Submission extends Entity {
    type: 'submission';
    competition_id: string;
    submitter_id: string;
    submission_date: Date;
    model_type: string;
    predictions: Map<string, number>;
    score?: number;
    status: 'pending' | 'scored' | 'disqualified';
}
export interface Portfolio extends Entity {
    type: 'portfolio';
    portfolio_name: string;
    description: string;
    allocation: Map<string, number>;
    rebalance_frequency: 'daily' | 'weekly' | 'monthly';
    performance_history: {
        date: Date;
        value: number;
        return: number;
    }[];
    status: 'active' | 'backtesting' | 'archived';
}
export interface EntityRelationship {
    source_id: string;
    source_type: string;
    target_id: string;
    target_type: string;
    relationship_type: 'predicts' | 'uses' | 'contains' | 'competes_in' | 'references';
    strength: number;
    metadata: Record<string, any>;
}
export interface NumeraiDailyData {
    date: Date;
    securities: Security[];
    signals: Signal[];
    competitions: Competition[];
    submissions: Submission[];
    portfolios: Portfolio[];
    relationships: EntityRelationship[];
    data_quality: {
        completeness: number;
        timeliness: number;
        accuracy: number;
    };
}
export declare class EntityModel {
    private entities;
    private relationships;
    private lastUpdate;
    /**
     * Register new entity
     */
    addEntity(entity: Entity): void;
    /**
     * Create relationship between entities
     */
    addRelationship(relationship: EntityRelationship): void;
    /**
     * Query entities by type
     */
    getEntitiesByType(type: string): Entity[];
    /**
     * Get entity by ID
     */
    getEntity(id: string): Entity | undefined;
    /**
     * Get related entities
     */
    getRelatedEntities(entityId: string): Entity[];
    /**
     * Get all signals for a security
     */
    getSignalsForSecurity(securityId: string): Signal[];
    /**
     * Get all securities in a competition
     */
    getSecuritiesInCompetition(competitionId: string): Security[];
    /**
     * Export as FactSet-style entity feed
     */
    exportEntityFeed(): NumeraiDailyData;
    /**
     * Get entity statistics
     */
    getStats(): Record<string, number>;
    /**
     * Clear all data
     */
    clear(): void;
}
export default EntityModel;
//# sourceMappingURL=entity-model.d.ts.map
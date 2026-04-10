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
    price_features: string[]; // e.g., "momentum_10d", "volatility_20d"
    technical_features: string[]; // e.g., "rsi", "macd"
    fundamental_features: string[]; // e.g., "pe_ratio", "market_cap"
  };
  status: 'active' | 'inactive' | 'delisted';
}

export interface Signal extends Entity {
  type: 'signal';
  security_id: string;
  signal_name: string;
  description: string;
  lookback_period: number; // days
  prediction_horizon: number; // days ahead
  signal_type: 'directional' | 'probability' | 'regression';
  last_value: number;
  last_updated: Date;
  data_quality_score: number; // 0-100
}

export interface Feature extends Entity {
  type: 'feature';
  feature_name: string;
  category: 'price' | 'technical' | 'fundamental' | 'sentiment' | 'alternative';
  description: string;
  calculation: string;
  update_frequency: 'daily' | 'hourly' | 'real-time';
  applicable_securities: string[]; // ticker list
}

export interface Competition extends Entity {
  type: 'competition';
  competition_name: string;
  start_date: Date;
  end_date?: Date;
  status: 'active' | 'closed' | 'upcoming';
  target_asset: string; // "BTC", "ETH", etc.
  submission_window: { start: Date; end: Date };
  scoring_metric: string; // "sharpe", "correlation", "accuracy"
  prize_pool: number;
  participants: number;
}

export interface Submission extends Entity {
  type: 'submission';
  competition_id: string;
  submitter_id: string;
  submission_date: Date;
  model_type: string;
  predictions: Map<string, number>; // date -> prediction
  score?: number;
  status: 'pending' | 'scored' | 'disqualified';
}

export interface Portfolio extends Entity {
  type: 'portfolio';
  portfolio_name: string;
  description: string;
  allocation: Map<string, number>; // security_id -> weight
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
  strength: number; // 0-1
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
    completeness: number; // 0-100
    timeliness: number; // 0-100
    accuracy: number; // 0-100
  };
}

export class EntityModel {
  private entities: Map<string, Entity> = new Map();
  private relationships: EntityRelationship[] = [];
  private lastUpdate: Date = new Date();

  /**
   * Register new entity
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.lastUpdate = new Date();
  }

  /**
   * Create relationship between entities
   */
  addRelationship(relationship: EntityRelationship): void {
    this.relationships.push(relationship);
  }

  /**
   * Query entities by type
   */
  getEntitiesByType(type: string): Entity[] {
    return Array.from(this.entities.values()).filter(e => e.type === type);
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get related entities
   */
  getRelatedEntities(entityId: string): Entity[] {
    const related = this.relationships
      .filter(r => r.source_id === entityId || r.target_id === entityId)
      .map(r => r.source_id === entityId ? r.target_id : r.source_id);

    return related.map(id => this.entities.get(id)!).filter(e => e);
  }

  /**
   * Get all signals for a security
   */
  getSignalsForSecurity(securityId: string): Signal[] {
    return (this.getEntitiesByType('signal') as Signal[]).filter(s => s.security_id === securityId);
  }

  /**
   * Get all securities in a competition
   */
  getSecuritiesInCompetition(competitionId: string): Security[] {
    const comp = this.entities.get(competitionId) as Competition;
    if (!comp) return [];

    const securities = this.getEntitiesByType('security') as Security[];
    return securities.filter(s => s.ticker === comp.target_asset || s.name.includes(comp.target_asset));
  }

  /**
   * Export as FactSet-style entity feed
   */
  exportEntityFeed(): NumeraiDailyData {
    return {
      date: this.lastUpdate,
      securities: this.getEntitiesByType('security') as Security[],
      signals: this.getEntitiesByType('signal') as Signal[],
      competitions: this.getEntitiesByType('competition') as Competition[],
      submissions: this.getEntitiesByType('submission') as Submission[],
      portfolios: this.getEntitiesByType('portfolio') as Portfolio[],
      relationships: this.relationships,
      data_quality: {
        completeness: 95,
        timeliness: 98,
        accuracy: 92
      }
    };
  }

  /**
   * Get entity statistics
   */
  getStats(): Record<string, number> {
    const types = ['security', 'signal', 'feature', 'competition', 'submission', 'portfolio'];
    const stats: Record<string, number> = {};

    types.forEach(type => {
      stats[type] = this.getEntitiesByType(type).length;
    });

    stats['relationships'] = this.relationships.length;
    return stats;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.entities.clear();
    this.relationships = [];
  }
}

export default EntityModel;

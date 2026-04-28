"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityModel = void 0;
class EntityModel {
    constructor() {
        this.entities = new Map();
        this.relationships = [];
        this.lastUpdate = new Date();
    }
    /**
     * Register new entity
     */
    addEntity(entity) {
        this.entities.set(entity.id, entity);
        this.lastUpdate = new Date();
    }
    /**
     * Create relationship between entities
     */
    addRelationship(relationship) {
        this.relationships.push(relationship);
    }
    /**
     * Query entities by type
     */
    getEntitiesByType(type) {
        return Array.from(this.entities.values()).filter(e => e.type === type);
    }
    /**
     * Get entity by ID
     */
    getEntity(id) {
        return this.entities.get(id);
    }
    /**
     * Get related entities
     */
    getRelatedEntities(entityId) {
        const related = this.relationships
            .filter(r => r.source_id === entityId || r.target_id === entityId)
            .map(r => r.source_id === entityId ? r.target_id : r.source_id);
        return related.map(id => this.entities.get(id)).filter(e => e);
    }
    /**
     * Get all signals for a security
     */
    getSignalsForSecurity(securityId) {
        return this.getEntitiesByType('signal').filter(s => s.security_id === securityId);
    }
    /**
     * Get all securities in a competition
     */
    getSecuritiesInCompetition(competitionId) {
        const comp = this.entities.get(competitionId);
        if (!comp)
            return [];
        const securities = this.getEntitiesByType('security');
        return securities.filter(s => s.ticker === comp.target_asset || s.name.includes(comp.target_asset));
    }
    /**
     * Export as FactSet-style entity feed
     */
    exportEntityFeed() {
        return {
            date: this.lastUpdate,
            securities: this.getEntitiesByType('security'),
            signals: this.getEntitiesByType('signal'),
            competitions: this.getEntitiesByType('competition'),
            submissions: this.getEntitiesByType('submission'),
            portfolios: this.getEntitiesByType('portfolio'),
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
    getStats() {
        const types = ['security', 'signal', 'feature', 'competition', 'submission', 'portfolio'];
        const stats = {};
        types.forEach(type => {
            stats[type] = this.getEntitiesByType(type).length;
        });
        stats['relationships'] = this.relationships.length;
        return stats;
    }
    /**
     * Clear all data
     */
    clear() {
        this.entities.clear();
        this.relationships = [];
    }
}
exports.EntityModel = EntityModel;
exports.default = EntityModel;
//# sourceMappingURL=entity-model.js.map
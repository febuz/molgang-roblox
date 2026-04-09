"use strict";
/**
 * MOLGANG-6.7: Upload Zone
 * Player-generated levels from Roblox
 * Rating system (5 stars)
 * Leaderboard and seasonal featured levels
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadZoneManager = void 0;
class UploadZoneManager {
    constructor() {
        this.ZONE_ID = 'upload_zone';
        this.levels = new Map();
        this.reviews = [];
        this.featured = new Set();
        this.currentSeason = 'season_1';
    }
    /**
     * Upload a new level
     */
    async uploadLevel(creatorId, levelData) {
        const level = {
            id: `level_${Date.now()}`,
            creatorId,
            name: levelData.name,
            description: levelData.description,
            difficulty: levelData.difficulty || 'medium',
            robloxScreenshotUrl: levelData.screenshotUrl,
            generatedAt: new Date(),
            plays: 0,
            averageRating: 0,
            ratings: new Map(),
            featured: false,
            tags: levelData.tags || []
        };
        this.levels.set(level.id, level);
        return level;
    }
    /**
     * Play a level (increment play count)
     */
    playLevel(levelId) {
        const level = this.levels.get(levelId);
        if (!level)
            return false;
        level.plays++;
        return true;
    }
    /**
     * Rate a level (1-5 stars)
     */
    rateLevel(levelId, userId, rating, comment = '') {
        if (rating < 1 || rating > 5)
            return false;
        const level = this.levels.get(levelId);
        if (!level)
            return false;
        // Add/update rating count
        const currentCount = level.ratings.get(rating) || 0;
        level.ratings.set(rating, currentCount + 1);
        // Store review
        this.reviews.push({
            levelId,
            userId,
            rating,
            comment,
            helpful: 0,
            timestamp: new Date()
        });
        // Calculate new average rating
        let totalRating = 0;
        let totalCount = 0;
        for (const [stars, count] of level.ratings) {
            totalRating += stars * count;
            totalCount += count;
        }
        level.averageRating = totalRating / totalCount;
        return true;
    }
    /**
     * Feature a level for the season
     */
    featureLevel(levelId, daysActive = 14) {
        const level = this.levels.get(levelId);
        if (!level || level.plays < 10)
            return false; // Minimum plays required
        level.featured = true;
        level.featuredUntil = new Date(Date.now() + daysActive * 24 * 60 * 60 * 1000);
        this.featured.add(levelId);
        return true;
    }
    /**
     * Get leaderboard (by rating/plays)
     */
    getLeaderboard(sortBy = 'rating', limit = 50) {
        const sorted = Array.from(this.levels.values())
            .filter(l => l.plays > 0) // Must have plays
            .sort((a, b) => {
            if (sortBy === 'rating') {
                if (b.averageRating !== a.averageRating) {
                    return b.averageRating - a.averageRating;
                }
                return b.plays - a.plays;
            }
            return b.plays - a.plays;
        })
            .slice(0, limit);
        return sorted;
    }
    /**
     * Get featured levels for current season
     */
    getFeaturedLevels() {
        const now = new Date();
        return Array.from(this.levels.values())
            .filter(l => l.featured && l.featuredUntil && l.featuredUntil > now)
            .sort((a, b) => {
            // Sort by rating, then by plays
            if (b.averageRating !== a.averageRating) {
                return b.averageRating - a.averageRating;
            }
            return b.plays - a.plays;
        })
            .slice(0, 12); // Show top 12 featured
    }
    /**
     * Get level details with reviews
     */
    getLevelDetails(levelId) {
        const level = this.levels.get(levelId);
        if (!level)
            return null;
        const levelReviews = this.reviews
            .filter(r => r.levelId === levelId)
            .slice(-10); // Last 10 reviews
        return {
            ...level,
            reviews: levelReviews,
            difficulty_players: this.getPlayersForDifficulty(level.difficulty)
        };
    }
    /**
     * Get player count by difficulty
     */
    getPlayersForDifficulty(difficulty) {
        const allLevels = Array.from(this.levels.values())
            .filter(l => l.difficulty === difficulty);
        return allLevels.reduce((sum, l) => sum + l.plays, 0);
    }
    /**
     * Search levels by tags/name
     */
    searchLevels(query, limit = 20) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.levels.values())
            .filter(l => l.name.toLowerCase().includes(lowerQuery) ||
            l.tags.some(t => t.toLowerCase().includes(lowerQuery)))
            .sort((a, b) => b.plays - a.plays)
            .slice(0, limit);
    }
    /**
     * Get zone metrics
     */
    getMetrics() {
        const allLevels = Array.from(this.levels.values());
        const totalPlays = allLevels.reduce((sum, l) => sum + l.plays, 0);
        const avgRating = allLevels.length > 0
            ? allLevels.reduce((sum, l) => sum + l.averageRating, 0) / allLevels.length
            : 0;
        return {
            total_levels: allLevels.length,
            total_plays: totalPlays,
            featured_count: this.featured.size,
            average_rating: avgRating.toFixed(2),
            top_creator: this.getTopCreator(),
            total_reviews: this.reviews.length
        };
    }
    /**
     * Get top creator
     */
    getTopCreator() {
        const creatorMap = new Map();
        for (const level of this.levels.values()) {
            const current = creatorMap.get(level.creatorId) || 0;
            creatorMap.set(level.creatorId, current + level.plays);
        }
        if (creatorMap.size === 0)
            return null;
        const [creatorId, plays] = Array.from(creatorMap.entries())
            .sort((a, b) => b[1] - a[1])[0];
        return { creatorId, plays };
    }
}
exports.UploadZoneManager = UploadZoneManager;
exports.default = UploadZoneManager;
//# sourceMappingURL=upload-zone.js.map
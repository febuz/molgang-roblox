/**
 * MOLGANG-6.7: Upload Zone
 * Player-generated levels from Roblox
 * Rating system (5 stars)
 * Leaderboard and seasonal featured levels
 */
export interface UserGeneratedLevel {
    id: string;
    creatorId: string;
    name: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    robloxScreenshotUrl: string;
    generatedAt: Date;
    plays: number;
    averageRating: number;
    ratings: Map<number, number>;
    featured: boolean;
    featuredUntil?: Date;
    tags: string[];
}
export interface LevelReview {
    levelId: string;
    userId: string;
    rating: number;
    comment: string;
    helpful: number;
    timestamp: Date;
}
export declare class UploadZoneManager {
    private readonly ZONE_ID;
    private levels;
    private reviews;
    private featured;
    private currentSeason;
    /**
     * Upload a new level
     */
    uploadLevel(creatorId: string, levelData: any): Promise<UserGeneratedLevel>;
    /**
     * Play a level (increment play count)
     */
    playLevel(levelId: string): boolean;
    /**
     * Rate a level (1-5 stars)
     */
    rateLevel(levelId: string, userId: string, rating: number, comment?: string): boolean;
    /**
     * Feature a level for the season
     */
    featureLevel(levelId: string, daysActive?: number): boolean;
    /**
     * Get leaderboard (by rating/plays)
     */
    getLeaderboard(sortBy?: 'rating' | 'plays', limit?: number): UserGeneratedLevel[];
    /**
     * Get featured levels for current season
     */
    getFeaturedLevels(): UserGeneratedLevel[];
    /**
     * Get level details with reviews
     */
    getLevelDetails(levelId: string): any;
    /**
     * Get player count by difficulty
     */
    private getPlayersForDifficulty;
    /**
     * Search levels by tags/name
     */
    searchLevels(query: string, limit?: number): UserGeneratedLevel[];
    /**
     * Get zone metrics
     */
    getMetrics(): any;
    /**
     * Get top creator
     */
    private getTopCreator;
}
export default UploadZoneManager;
//# sourceMappingURL=upload-zone.d.ts.map
/**
 * MOLGANG-6.12: Battle Pass System
 * 100-tier progression with free/premium tiers
 * $9.99 seasonal pass
 * 10-week seasons
 */
interface PlayerProgress {
    playerId: string;
    seasonId: string;
    totalXp: number;
    currentTier: number;
    tierProgress: number;
    hasPremium: boolean;
    premiumPurchasedAt?: Date;
    claimedRewards: Map<number, boolean>;
}
export declare class BattlePassSystem {
    private seasons;
    private playerProgress;
    private currentSeasonId;
    constructor();
    /**
     * Initialize current season
     */
    private initializeCurrentSeason;
    /**
     * Initialize player in current season
     */
    initializePlayer(playerId: string, hasPremium?: boolean): PlayerProgress;
    /**
     * Award XP to player
     */
    awardXp(playerId: string, xp: number): void;
    /**
     * Purchase premium battle pass
     */
    purchasePremium(playerId: string): boolean;
    /**
     * Claim tier reward
     */
    claimReward(playerId: string, tier: number): any;
    /**
     * Get player progress
     */
    getProgress(playerId: string): PlayerProgress | null;
    /**
     * Get season leaderboard
     */
    getSeasonLeaderboard(limit?: number): PlayerProgress[];
    /**
     * Get season metrics
     */
    getSeasonMetrics(): {
        season: string;
        total_players: number;
        premium_players: number;
        free_players: number;
        premium_percentage: string;
        total_revenue: number;
        average_tier: string;
        days_remaining: number;
    };
}
export default BattlePassSystem;
//# sourceMappingURL=battle-pass.d.ts.map
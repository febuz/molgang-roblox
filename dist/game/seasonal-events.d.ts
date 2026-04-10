/**
 * Seasonal Events System
 * Time-limited events, challenges, and rewards
 */
interface Event {
    id: string;
    name: string;
    description: string;
    type: 'seasonal' | 'limited-time' | 'daily' | 'weekly';
    startDate: Date;
    endDate: Date;
    rewards: {
        experience: number;
        currency: number;
        cosmetics: string[];
        achievements: string[];
    };
    challenges: Challenge[];
    active: boolean;
}
interface Challenge {
    id: string;
    title: string;
    description: string;
    objective: string;
    progress: number;
    target: number;
    reward: any;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}
interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: string;
    reward: number;
    unlockedAt?: Date;
}
export declare class SeasonalEventsManager {
    private events;
    private achievements;
    private playerProgress;
    constructor();
    /**
     * Initialize seasonal events
     */
    private initializeSeasons;
    /**
     * Initialize achievements
     */
    private initializeAchievements;
    /**
     * Get active events
     */
    getActiveEvents(): Event[];
    /**
     * Get event progress
     */
    getEventProgress(playerId: string, eventId: string): any;
    /**
     * Update challenge progress
     */
    updateChallengeProgress(eventId: string, challengeId: string, increment: number): Challenge | null;
    /**
     * Get unlocked achievements
     */
    getUnlockedAchievements(playerId: string): Achievement[];
    /**
     * Check and award achievements
     */
    checkAchievements(playerId: string, metric: string, value: number): Achievement[];
    /**
     * Get leaderboard for event
     */
    getEventLeaderboard(eventId: string, limit?: number): any[];
    /**
     * Get all active challenges
     */
    getActiveChallenges(): any[];
    /**
     * Get overall leaderboard
     */
    getLeaderboard(limit?: number): any[];
    /**
     * Update event progress for player
     */
    updateEventProgress(eventId: string, playerId: string, progressData: any): any;
}
export default SeasonalEventsManager;
//# sourceMappingURL=seasonal-events.d.ts.map
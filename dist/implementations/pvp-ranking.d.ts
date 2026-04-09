/**
 * MOLGANG-6.9: Ranked PvP System
 * Glicko-2 Elo rating algorithm
 * Tournament bracket generation
 */
interface PlayerRating {
    playerId: string;
    rating: number;
    deviation: number;
    volatility: number;
    lastRated: Date;
    wins: number;
    losses: number;
    streak: number;
}
interface Match {
    id: string;
    player1Id: string;
    player2Id: string;
    winner: string | null;
    score: [number, number];
    duration: number;
    timestamp: Date;
}
interface Tournament {
    id: string;
    name: string;
    players: string[];
    bracket: any[];
    winner: string | null;
    status: 'registration' | 'active' | 'completed';
    prizePool: number;
}
export declare class RankedPvPSystem {
    private ratings;
    private matches;
    private tournaments;
    private readonly TAU;
    private readonly RATING_SCALE;
    /**
     * Initialize player rating
     */
    initializePlayer(playerId: string): PlayerRating;
    /**
     * Record match result and update ratings
     */
    recordMatch(player1Id: string, player2Id: string, winner: string): void;
    /**
     * Update ratings using Glicko-2 algorithm
     */
    private updateRatingsGlicko2;
    /**
     * Generate tournament bracket
     */
    generateTournamentBracket(playerIds: string[], tournamentName: string): Tournament;
    /**
     * Generate single-elimination bracket
     */
    private generateBracket;
    /**
     * Get player rating
     */
    getPlayerRating(playerId: string): PlayerRating | null;
    /**
     * Get leaderboard
     */
    getLeaderboard(limit?: number): PlayerRating[];
    /**
     * Get match history
     */
    getMatchHistory(playerId: string, limit?: number): Match[];
    /**
     * Get PvP metrics
     */
    getMetrics(): {
        players_rated: number;
        total_matches: number;
        average_rating: number;
        tournaments: number;
        top_10: PlayerRating[];
    };
}
export default RankedPvPSystem;
//# sourceMappingURL=pvp-ranking.d.ts.map
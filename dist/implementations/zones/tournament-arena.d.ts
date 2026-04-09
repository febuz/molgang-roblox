/**
 * MOLGANG-6.8: Tournament Arena
 * Ranked PvP (1v1, 2v2, 5v5)
 * Competitive aesthetics
 * Anti-cheat validation
 */
export interface TournamentMatch {
    id: string;
    format: '1v1' | '2v2' | '5v5';
    team1: string[];
    team2: string[];
    startTime: Date;
    endTime?: Date;
    winner: string[];
    score: [number, number];
    mapId: string;
    validations: {
        checksumVerified: boolean;
        antiCheatPassed: boolean;
        recordingAvailable: boolean;
    };
}
export interface ArenaStats {
    playerId: string;
    wins: number;
    losses: number;
    winRate: number;
    averageKDA: number;
    totalMatches: number;
    skillRating: number;
}
export declare class TournamentArena {
    private readonly ZONE_ID;
    private matches;
    private playerStats;
    private activeMatches;
    private leaderboard;
    /**
     * Start a tournament match
     */
    startMatch(format: '1v1' | '2v2' | '5v5', team1: string[], team2: string[], mapId: string): TournamentMatch;
    /**
     * End a match and record results
     */
    endMatch(matchId: string, winnerTeam: '1' | '2', finalScore: [number, number], stats: any): boolean;
    /**
     * Validate anti-cheat
     */
    private validateAntiCheat;
    /**
     * Update player stats and recalculate ratings
     */
    private updatePlayerStats;
    /**
     * Get competitive leaderboard
     */
    getLeaderboard(limit?: number, minMatches?: number): ArenaStats[];
    /**
     * Get player stats
     */
    getPlayerStats(playerId: string): ArenaStats | null;
    /**
     * Get arena metrics
     */
    getMetrics(): any;
    /**
     * Get match details
     */
    getMatchDetails(matchId: string): TournamentMatch | null;
    /**
     * Dispute a match (for anti-cheat flagged matches)
     */
    disputeMatch(matchId: string, reportedBy: string, reason: string): boolean;
}
export default TournamentArena;
//# sourceMappingURL=tournament-arena.d.ts.map
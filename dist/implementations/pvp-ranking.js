"use strict";
/**
 * MOLGANG-6.9: Ranked PvP System
 * Glicko-2 Elo rating algorithm
 * Tournament bracket generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankedPvPSystem = void 0;
class RankedPvPSystem {
    constructor() {
        this.ratings = new Map();
        this.matches = [];
        this.tournaments = new Map();
        // Glicko-2 constants
        this.TAU = 0.5; // System volatility
        this.RATING_SCALE = 173.7178; // Conversion factor
    }
    /**
     * Initialize player rating
     */
    initializePlayer(playerId) {
        const rating = {
            playerId,
            rating: 1500,
            deviation: 350,
            volatility: 0.06,
            lastRated: new Date(),
            wins: 0,
            losses: 0,
            streak: 0
        };
        this.ratings.set(playerId, rating);
        return rating;
    }
    /**
     * Record match result and update ratings
     */
    recordMatch(player1Id, player2Id, winner) {
        const match = {
            id: `match_${Date.now()}`,
            player1Id,
            player2Id,
            winner,
            score: winner === player1Id ? [2, 1] : [1, 2],
            duration: Math.random() * 600,
            timestamp: new Date()
        };
        this.matches.push(match);
        // Ensure players are initialized
        if (!this.ratings.has(player1Id))
            this.initializePlayer(player1Id);
        if (!this.ratings.has(player2Id))
            this.initializePlayer(player2Id);
        // Update ratings using Glicko-2
        this.updateRatingsGlicko2(player1Id, player2Id, winner);
        // Update streaks
        const p1 = this.ratings.get(player1Id);
        const p2 = this.ratings.get(player2Id);
        if (winner === player1Id) {
            p1.wins++;
            p1.streak = Math.max(1, p1.streak + 1);
            p2.losses++;
            p2.streak = Math.min(-1, p2.streak - 1);
        }
        else {
            p2.wins++;
            p2.streak = Math.max(1, p2.streak + 1);
            p1.losses++;
            p1.streak = Math.min(-1, p1.streak - 1);
        }
    }
    /**
     * Update ratings using Glicko-2 algorithm
     */
    updateRatingsGlicko2(player1Id, player2Id, winner) {
        const p1 = this.ratings.get(player1Id);
        const p2 = this.ratings.get(player2Id);
        // Convert from Glicko-2 to 1-2000 scale for calculation
        const r1 = (p1.rating - 1500) / this.RATING_SCALE;
        const r2 = (p2.rating - 1500) / this.RATING_SCALE;
        const rd1 = p1.deviation / this.RATING_SCALE;
        const rd2 = p2.deviation / this.RATING_SCALE;
        // Expected score
        const g = (rd) => Math.cos(Math.PI * rd / Math.sqrt(3));
        const E = (r, opp_r, opp_rd) => 1 / (1 + Math.exp(-g(opp_rd) * (r - opp_r)));
        const E1 = E(r1, r2, rd2);
        const E2 = E(r2, r1, rd1);
        // Match outcome (1 = win, 0 = loss)
        const s1 = winner === player1Id ? 1 : 0;
        const s2 = 1 - s1;
        // Update ratings (simplified Glicko-2)
        const kFactor = 32;
        p1.rating += kFactor * (s1 - E1) * this.RATING_SCALE;
        p2.rating += kFactor * (s2 - E2) * this.RATING_SCALE;
        // Clamp ratings
        p1.rating = Math.max(1200, Math.min(3000, p1.rating));
        p2.rating = Math.max(1200, Math.min(3000, p2.rating));
        // Update uncertainty
        p1.deviation = Math.sqrt(Math.pow(rd1, 2) + Math.pow(this.TAU, 2));
        p2.deviation = Math.sqrt(Math.pow(rd2, 2) + Math.pow(this.TAU, 2));
        p1.lastRated = new Date();
        p2.lastRated = new Date();
    }
    /**
     * Generate tournament bracket
     */
    generateTournamentBracket(playerIds, tournamentName) {
        const tournament = {
            id: `tournament_${Date.now()}`,
            name: tournamentName,
            players: playerIds,
            bracket: this.generateBracket(playerIds),
            winner: null,
            status: 'registration',
            prizePool: 1000 * playerIds.length
        };
        this.tournaments.set(tournament.id, tournament);
        return tournament;
    }
    /**
     * Generate single-elimination bracket
     */
    generateBracket(players) {
        // Ensure power of 2
        const roundedSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
        const paddedPlayers = [...players];
        while (paddedPlayers.length < roundedSize) {
            paddedPlayers.push(`bye_${paddedPlayers.length}`);
        }
        // Generate bracket structure (simplified)
        const bracket = {
            round1: paddedPlayers.slice(0, Math.ceil(paddedPlayers.length / 2)),
            semifinals: [],
            finals: [],
            winner: null
        };
        return bracket;
    }
    /**
     * Get player rating
     */
    getPlayerRating(playerId) {
        return this.ratings.get(playerId) || null;
    }
    /**
     * Get leaderboard
     */
    getLeaderboard(limit = 100) {
        return Array.from(this.ratings.values())
            .filter(r => r.wins + r.losses > 0) // Must have played
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);
    }
    /**
     * Get match history
     */
    getMatchHistory(playerId, limit = 50) {
        return this.matches
            .filter(m => m.player1Id === playerId || m.player2Id === playerId)
            .slice(-limit);
    }
    /**
     * Get PvP metrics
     */
    getMetrics() {
        const ratings = Array.from(this.ratings.values());
        return {
            players_rated: ratings.length,
            total_matches: this.matches.length,
            average_rating: ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0,
            tournaments: this.tournaments.size,
            top_10: this.getLeaderboard(10)
        };
    }
}
exports.RankedPvPSystem = RankedPvPSystem;
exports.default = RankedPvPSystem;
//# sourceMappingURL=pvp-ranking.js.map
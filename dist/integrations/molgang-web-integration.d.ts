/**
 * MOLGANG Web Version Integration with VirtualPC
 *
 * Purpose: Connect VirtualPC autonomous systems with MOLGANG educational game
 * Mission: Enable 1M+ students to learn economics through gameplay
 *
 * Handles:
 * - Player authentication & account management
 * - Game server communication
 * - Educational data tracking
 * - Real-time multiplayer synchronization
 * - Player progress & achievements
 * - Economic simulation data
 */
import { Express } from 'express';
export declare class MOLGANGWebIntegration {
    private players;
    private sessions;
    private economyData;
    /**
     * Register all MOLGANG web integration endpoints
     */
    registerEndpoints(app: Express): void;
    private handleRegister;
    private handleLogin;
    private handleLogout;
    private handleVerifyToken;
    private handleGetPlayer;
    private handleUpdatePlayer;
    private handleGetProgress;
    private handleGetLeaderboard;
    private handleStartSession;
    private handleEndSession;
    private handleSessionAction;
    private handleGetSessionStatus;
    private handleGetEducationalProgress;
    private handleCompleteLesson;
    private handleGetLessons;
    private handleGetMarketData;
    private handleExecuteTrade;
    private handleGetPortfolio;
    private handleGetEconomyStats;
    private handleBroadcastEvent;
    private handleGetNearbyPlayers;
    private handleTradeRequest;
    private handleStatus;
    /**
     * Get integration statistics
     */
    getStats(): {
        totalPlayers: number;
        activeSessions: number;
        totalSessions: number;
        players: {
            username: string;
            level: number;
            molcoins: number;
        }[];
    };
}
export declare const molGangIntegration: MOLGANGWebIntegration;
//# sourceMappingURL=molgang-web-integration.d.ts.map
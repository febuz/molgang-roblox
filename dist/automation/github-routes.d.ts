/**
 * GitHub Sync API Routes
 *
 * Wires the GitHubSync class into HTTP endpoints. CEO-only for actions that
 * mutate remote state (configure, trigger sync); read-only endpoints are
 * authenticated but available to any logged-in role so dashboards can show
 * sync health.
 *
 * Endpoints:
 *   GET  /api/github/sync/status   — last result + remote-configured flag
 *   GET  /api/github/sync/history  — recent SyncResult entries (?limit=N)
 *   GET  /api/github/sync/stats    — aggregate statistics
 *   POST /api/github/sync          — trigger an immediate sync (CEO)
 *   POST /api/github/sync/configure — add/update origin remote (CEO)
 */
import express from 'express';
import GitHubSync from './github-sync';
export declare function setupGitHubRoutes(app: express.Express, githubSync: GitHubSync, authMiddleware: any): void;
export default setupGitHubRoutes;
//# sourceMappingURL=github-routes.d.ts.map
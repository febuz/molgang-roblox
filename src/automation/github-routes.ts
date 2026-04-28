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
import { AuthRequest } from '../auth/auth-middleware';
import logger from '../utils/logger';

export function setupGitHubRoutes(
  app: express.Express,
  githubSync: GitHubSync,
  authMiddleware: any
) {
  app.get(
    '/api/github/sync/status',
    authMiddleware.verifyToken(),
    (_req: AuthRequest, res: express.Response) => {
      try {
        const last = githubSync.getLastSync();
        return res.json({
          success: true,
          remote_configured: githubSync.isConfigured(),
          last_sync: last,
        });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.get(
    '/api/github/sync/history',
    authMiddleware.verifyToken(),
    (req: AuthRequest, res: express.Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        const history = githubSync.getSyncHistory(limit);
        return res.json({ success: true, count: history.length, history });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.get(
    '/api/github/sync/stats',
    authMiddleware.verifyToken(),
    (_req: AuthRequest, res: express.Response) => {
      try {
        return res.json({ success: true, stats: githubSync.getStatistics() });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    '/api/github/sync',
    authMiddleware.requireRole('ceo'),
    async (_req: AuthRequest, res: express.Response) => {
      try {
        const result = await githubSync.sync();
        const status = result.success ? 200 : 500;
        return res.status(status).json({ success: result.success, result });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    '/api/github/sync/configure',
    authMiddleware.requireRole('ceo'),
    (_req: AuthRequest, res: express.Response) => {
      try {
        const result = githubSync.configureRemote();
        const status = result.success ? 200 : 500;
        return res.status(status).json(result);
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  logger.info('✓ GitHub sync routes configured');
}

export default setupGitHubRoutes;

/**
 * Quality Dashboard routes — CEO-only.
 *
 * Endpoint:
 *   GET /api/quality/dashboard — full QualityDashboardSnapshot
 *
 * Reads the latest QA report JSON files (written by CI runs of the four
 * tools defined in <project>/docs/QUALITY_STANDARDS.md) and stitches
 * them into a single snapshot.
 */

import express from 'express';
import { QualityDashboard } from './qualityDashboard';
import { AuthRequest } from '../auth/auth-middleware';
import logger from '../utils/logger';

export function setupQualityRoutes(
  app: express.Express,
  dashboard: QualityDashboard,
  authMiddleware: any
) {
  app.get(
    '/api/quality/dashboard',
    authMiddleware.requireRole('ceo'),
    async (_req: AuthRequest, res: express.Response) => {
      try {
        const snap = await dashboard.snapshot();
        return res.json({ success: true, dashboard: snap });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  logger.info('✓ Quality dashboard routes configured');
}

export default setupQualityRoutes;

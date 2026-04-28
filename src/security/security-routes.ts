/**
 * Security Dashboard routes — CEO-only composite view.
 *
 * Endpoint:
 *   GET /api/security/dashboard — full SecurityDashboardSnapshot
 *
 * Kept separate from /api/audit/* (which exposes the raw audit log) so the
 * frontend has a single high-signal call to render the CEO security panel.
 */

import express from 'express';
import { SecurityDashboard } from './securityDashboard';
import { AuthRequest } from '../auth/auth-middleware';
import logger from '../utils/logger';

export function setupSecurityRoutes(
  app: express.Express,
  dashboard: SecurityDashboard,
  authMiddleware: any
) {
  app.get(
    '/api/security/dashboard',
    authMiddleware.requireRole('ceo'),
    (_req: AuthRequest, res: express.Response) => {
      try {
        return res.json({ success: true, dashboard: dashboard.snapshot() });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  logger.info('✓ Security dashboard routes configured');
}

export default setupSecurityRoutes;

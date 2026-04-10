/**
 * Specialist Dashboard Routes
 * Role-specific views and data endpoints
 */

import express from 'express';
import SpecialistDashboards from './specialist-dashboards';
import { AuthRequest } from './auth-middleware';
import logger from '../utils/logger';

export function setupSpecialistRoutes(app: express.Express, dashboards: SpecialistDashboards, authMiddleware: any) {
  /**
   * Get my dashboard (authenticated users only)
   */
  app.get('/api/dashboard/my', authMiddleware.verifyToken(), (req: AuthRequest, res: express.Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const dashboardData = dashboards.getDashboard(req.user.role);

      return res.json(dashboardData);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get CEO Dashboard (CEO only)
   */
  app.get('/api/dashboard/ceo', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const dashboard = dashboards.getCEODashboard();
      return res.json({ success: true, dashboard });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get CTO Dashboard (CTO only)
   */
  app.get('/api/dashboard/cto', authMiddleware.requireRole('cto'), (req: AuthRequest, res: express.Response) => {
    try {
      const dashboard = dashboards.getCTODashboard();
      return res.json({ success: true, dashboard });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get Developer Dashboard (Developer only)
   */
  app.get('/api/dashboard/developer', authMiddleware.requireRole('developer'), (req: AuthRequest, res: express.Response) => {
    try {
      const dashboard = dashboards.getDeveloperDashboard();
      return res.json({ success: true, dashboard });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get Artist Dashboard (Artist only)
   */
  app.get('/api/dashboard/artist', authMiddleware.requireRole('artist'), (req: AuthRequest, res: express.Response) => {
    try {
      const dashboard = dashboards.getArtistDashboard();
      return res.json({ success: true, dashboard });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get Tech Artist Dashboard (Tech Artist only)
   */
  app.get('/api/dashboard/tech-artist', authMiddleware.requireRole('tech_artist'), (req: AuthRequest, res: express.Response) => {
    try {
      const dashboard = dashboards.getTechArtistDashboard();
      return res.json({ success: true, dashboard });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  logger.info('✓ Specialist dashboard routes configured');
}

export default setupSpecialistRoutes;

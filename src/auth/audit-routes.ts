/**
 * Audit Log Routes
 * CEO-only access to audit logs with filtering and export
 */

import express from 'express';
import CEOAuditLogger from './audit-logger';
import { AuthRequest } from './auth-middleware';
import logger from '../utils/logger';

export function setupAuditRoutes(app: express.Express, auditLogger: CEOAuditLogger, authMiddleware: any) {
  /**
   * Get audit statistics (CEO only)
   */
  app.get('/api/audit/stats', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const stats = auditLogger.getStatistics();
      const securityScore = auditLogger.getSecurityScore();

      return res.json({
        success: true,
        stats,
        security_score: securityScore,
        score_grade: securityScore >= 80 ? 'A' : securityScore >= 60 ? 'B' : securityScore >= 40 ? 'C' : 'D'
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get all audit events (CEO only)
   */
  app.get('/api/audit/events', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = auditLogger.getAllEvents(limit);

      return res.json({
        success: true,
        count: events.length,
        events
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get events by user (CEO only)
   */
  app.get('/api/audit/events/user/:username', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = auditLogger.getEventsByUser(req.params.username, limit);

      return res.json({
        success: true,
        user: req.params.username,
        count: events.length,
        events
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get events by type (CEO only)
   */
  app.get('/api/audit/events/type/:type', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = auditLogger.getEventsByType(req.params.type as any, limit);

      return res.json({
        success: true,
        type: req.params.type,
        count: events.length,
        events
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get events by severity (CEO only)
   */
  app.get('/api/audit/events/severity/:severity', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = auditLogger.getEventsBySeverity(req.params.severity as any, limit);

      return res.json({
        success: true,
        severity: req.params.severity,
        count: events.length,
        events
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get events from IP (CEO only)
   */
  app.get('/api/audit/events/ip/:ip', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = auditLogger.getEventsByIP(req.params.ip, limit);

      return res.json({
        success: true,
        ip: req.params.ip,
        count: events.length,
        events
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Export audit log as CSV (CEO only)
   */
  app.get('/api/audit/export/csv', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response): any => {
    try {
      const csv = auditLogger.exportAsCSV();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
      return res.send(csv);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Export audit log as JSON (CEO only)
   */
  app.get('/api/audit/export/json', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response): any => {
    try {
      const json = auditLogger.exportAsJSON();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-log.json');
      return res.send(json);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Clear old events (CEO only)
   */
  app.post('/api/audit/clear-old', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const { daysOld } = req.body;

      if (!daysOld || daysOld < 7) {
        return res.status(400).json({ success: false, error: 'daysOld must be >= 7 days' });
      }

      const deleted = auditLogger.clearOldEvents(daysOld);

      // Audit the action itself
      if (req.user) {
        auditLogger.logEvent(
          req.user.userId,
          req.user.username,
          req.user.role,
          'config_change',
          req.ip || 'unknown',
          req.headers['x-device-id'] as string || 'unknown',
          req.headers['x-location'] as string || 'unknown',
          `Cleared ${deleted} audit events older than ${daysOld} days`,
          'success',
          { severity: 'critical' }
        );
      }

      return res.json({ success: true, deleted });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Combined audit search (CEO only). All filters are optional query params and
   * combine with AND semantics: username, ip, eventType, severity, outcome,
   * action, start (ISO), end (ISO), limit.
   */
  app.get('/api/audit/search', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
    try {
      const q = req.query;
      const parseDate = (v: any): Date | undefined => {
        if (!v) return undefined;
        const d = new Date(v as string);
        return isNaN(d.getTime()) ? undefined : d;
      };
      const limit = Math.min(parseInt(q.limit as string) || 100, 1000);
      const events = auditLogger.search(
        {
          username: (q.username as string) || undefined,
          ipAddress: (q.ip as string) || undefined,
          eventType: (q.eventType as any) || undefined,
          severity: (q.severity as any) || undefined,
          outcome: (q.outcome as any) || undefined,
          action: (q.action as string) || undefined,
          startTime: parseDate(q.start),
          endTime: parseDate(q.end),
        },
        limit
      );
      return res.json({ success: true, count: events.length, events });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  logger.info('✓ Audit routes configured');
}

export default setupAuditRoutes;

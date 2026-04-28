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
export declare function setupSecurityRoutes(app: express.Express, dashboard: SecurityDashboard, authMiddleware: any): void;
export default setupSecurityRoutes;
//# sourceMappingURL=security-routes.d.ts.map
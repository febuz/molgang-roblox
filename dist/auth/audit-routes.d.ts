/**
 * Audit Log Routes
 * CEO-only access to audit logs with filtering and export
 */
import express from 'express';
import CEOAuditLogger from './audit-logger';
export declare function setupAuditRoutes(app: express.Express, auditLogger: CEOAuditLogger, authMiddleware: any): void;
export default setupAuditRoutes;
//# sourceMappingURL=audit-routes.d.ts.map
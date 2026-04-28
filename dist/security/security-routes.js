"use strict";
/**
 * Security Dashboard routes — CEO-only composite view.
 *
 * Endpoint:
 *   GET /api/security/dashboard — full SecurityDashboardSnapshot
 *
 * Kept separate from /api/audit/* (which exposes the raw audit log) so the
 * frontend has a single high-signal call to render the CEO security panel.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSecurityRoutes = setupSecurityRoutes;
const logger_1 = __importDefault(require("../utils/logger"));
function setupSecurityRoutes(app, dashboard, authMiddleware) {
    app.get('/api/security/dashboard', authMiddleware.requireRole('ceo'), (_req, res) => {
        try {
            return res.json({ success: true, dashboard: dashboard.snapshot() });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    logger_1.default.info('✓ Security dashboard routes configured');
}
exports.default = setupSecurityRoutes;
//# sourceMappingURL=security-routes.js.map
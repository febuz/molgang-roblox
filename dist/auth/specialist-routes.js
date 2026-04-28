"use strict";
/**
 * Specialist Dashboard Routes
 * Role-specific views and data endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSpecialistRoutes = setupSpecialistRoutes;
const logger_1 = __importDefault(require("../utils/logger"));
function setupSpecialistRoutes(app, dashboards, authMiddleware) {
    /**
     * Get my dashboard (authenticated users only)
     */
    app.get('/api/dashboard/my', authMiddleware.verifyToken(), (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }
            const dashboardData = dashboards.getDashboard(req.user.role);
            return res.json(dashboardData);
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get CEO Dashboard (CEO only)
     */
    app.get('/api/dashboard/ceo', authMiddleware.requireRole('ceo'), (req, res) => {
        try {
            const dashboard = dashboards.getCEODashboard();
            return res.json({ success: true, dashboard });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get CTO Dashboard (CTO only)
     */
    app.get('/api/dashboard/cto', authMiddleware.requireRole('cto'), (req, res) => {
        try {
            const dashboard = dashboards.getCTODashboard();
            return res.json({ success: true, dashboard });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get Developer Dashboard (Developer only)
     */
    app.get('/api/dashboard/developer', authMiddleware.requireRole('developer'), (req, res) => {
        try {
            const dashboard = dashboards.getDeveloperDashboard();
            return res.json({ success: true, dashboard });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get Artist Dashboard (Artist only)
     */
    app.get('/api/dashboard/artist', authMiddleware.requireRole('artist'), (req, res) => {
        try {
            const dashboard = dashboards.getArtistDashboard();
            return res.json({ success: true, dashboard });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get Tech Artist Dashboard (Tech Artist only)
     */
    app.get('/api/dashboard/tech-artist', authMiddleware.requireRole('tech_artist'), (req, res) => {
        try {
            const dashboard = dashboards.getTechArtistDashboard();
            return res.json({ success: true, dashboard });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    logger_1.default.info('✓ Specialist dashboard routes configured');
}
exports.default = setupSpecialistRoutes;
//# sourceMappingURL=specialist-routes.js.map
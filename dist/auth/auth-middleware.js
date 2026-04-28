"use strict";
/**
 * Authentication Middleware
 * Protects routes, validates tokens, enforces role-based access
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class AuthMiddleware {
    constructor(authSystem) {
        this.authSystem = authSystem;
    }
    /**
     * Verify token middleware
     */
    verifyToken() {
        return (req, res, next) => {
            const token = req.headers.authorization?.split(' ')[1]; // Bearer token
            if (!token) {
                return res.status(401).json({ success: false, error: 'No token provided' });
            }
            const authToken = this.authSystem.verifyToken(token);
            if (!authToken) {
                return res.status(401).json({ success: false, error: 'Invalid or expired token' });
            }
            req.user = authToken;
            req.userId = authToken.userId;
            req.userRole = authToken.role;
            next();
        };
    }
    /**
     * Require role middleware
     */
    requireRole(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'No authentication token' });
            }
            if (!roles.includes(req.user.role)) {
                logger_1.default.warn(`🚫 Access denied: ${req.user.username} (${req.user.role}) tried to access ${req.path}`);
                return res.status(403).json({
                    success: false,
                    error: `Access denied. Required roles: ${roles.join(', ')}`
                });
            }
            next();
        };
    }
    /**
     * Require permission middleware
     */
    requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'No authentication token' });
            }
            const permissions = this.authSystem.getPermissions(req.user.role);
            const hasPermission = permissions[`can${permission.charAt(0).toUpperCase() + permission.slice(1)}`];
            if (!hasPermission) {
                logger_1.default.warn(`🚫 Permission denied: ${req.user.username} (${req.user.role}) - permission: ${permission}`);
                return res.status(403).json({
                    success: false,
                    error: `Permission denied: ${permission}`
                });
            }
            next();
        };
    }
    /**
     * Public route (no auth required)
     */
    public() {
        return (req, res, next) => {
            next();
        };
    }
    /**
     * Optional auth (checks token if provided)
     */
    optional() {
        return (req, res, next) => {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                const authToken = this.authSystem.verifyToken(token);
                if (authToken) {
                    req.user = authToken;
                    req.userId = authToken.userId;
                    req.userRole = authToken.role;
                }
            }
            next();
        };
    }
}
exports.AuthMiddleware = AuthMiddleware;
exports.default = AuthMiddleware;
//# sourceMappingURL=auth-middleware.js.map
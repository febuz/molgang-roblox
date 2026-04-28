"use strict";
/**
 * Authentication Routes
 * Login, logout, profile, user management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAuthRoutes = setupAuthRoutes;
const rateLimiter_1 = require("../security/rateLimiter");
const logger_1 = __importDefault(require("../utils/logger"));
function setupAuthRoutes(app, authSystem, authMiddleware) {
    // Rate limiting (one shared store across all auth routes)
    const limiter = new rateLimiter_1.AdvancedRateLimiter();
    // Login: 10 attempts per 15 minutes per (IP, username) pair. Combining IP
    // with username catches credential stuffing (one IP, many usernames) and
    // password guessing (many IPs unlikely, but still bounded). Complements the
    // per-username brute-force lockout already inside AuthSystem.
    const loginLimiter = limiter.perIp({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        keyGenerator: (req) => `login:${req.ip || 'noip'}:${(req.body && req.body.username) || 'nouser'}`,
    });
    // Sensitive mutations (password change, user create): 30/min per IP.
    const mutationLimiter = limiter.perIp({
        windowMs: 60 * 1000,
        maxRequests: 30,
        keyGenerator: (req) => `mutate:${req.ip || 'noip'}`,
    });
    /**
     * Login endpoint
     */
    app.post('/api/auth/login', loginLimiter, (req, res) => {
        try {
            const { username, password } = req.body;
            const ipAddress = req.ip || 'unknown';
            const deviceId = req.headers['x-device-id'] || 'unknown-device';
            const location = req.headers['x-location'] || 'unknown-location';
            const result = authSystem.login({
                username,
                password,
                ipAddress,
                deviceId,
                location
            });
            if (!result.success) {
                if (result.requires2fa && result.challengeId) {
                    return res.status(200).json({
                        success: false,
                        requires2fa: true,
                        challengeId: result.challengeId,
                    });
                }
                return res.status(401).json({ success: false, error: result.error });
            }
            return res.json({
                success: true,
                token: result.token?.sessionId,
                user: {
                    username: result.token?.username,
                    role: result.token?.role
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Complete a 2FA-required login by submitting the challengeId from the
     * login response and the 6-digit TOTP code from the user's authenticator.
     */
    app.post('/api/auth/2fa/verify', loginLimiter, (req, res) => {
        try {
            const { challengeId, code } = req.body;
            const result = authSystem.verifyTwoFactor(challengeId, code);
            if (!result.success) {
                return res.status(401).json({ success: false, error: result.error });
            }
            return res.json({
                success: true,
                token: result.token?.sessionId,
                user: { username: result.token?.username, role: result.token?.role },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Begin 2FA setup for the logged-in user. Returns a fresh secret + the
     * otpauth:// URI to render as a QR code on the client. Must be followed
     * by /api/auth/2fa/enable before 2FA actually arms.
     */
    app.post('/api/auth/2fa/setup', mutationLimiter, authMiddleware.verifyToken(), (req, res) => {
        try {
            if (!req.user)
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            const result = authSystem.setupTotp(req.user.userId);
            if (!result.success)
                return res.status(400).json({ success: false, error: result.error });
            return res.json({ success: true, secret: result.secret, uri: result.uri });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Confirm 2FA setup by submitting a code from the new secret.
     */
    app.post('/api/auth/2fa/enable', mutationLimiter, authMiddleware.verifyToken(), (req, res) => {
        try {
            if (!req.user)
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            const { code } = req.body;
            const result = authSystem.enableTotp(req.user.userId, code);
            if (!result.success)
                return res.status(400).json({ success: false, error: result.error });
            return res.json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Disable 2FA. Requires both the current password and a valid 2FA code so
     * a stolen session alone cannot turn it off.
     */
    app.post('/api/auth/2fa/disable', mutationLimiter, authMiddleware.verifyToken(), (req, res) => {
        try {
            if (!req.user)
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            const { password, code } = req.body;
            const result = authSystem.disableTotp(req.user.userId, password, code);
            if (!result.success)
                return res.status(400).json({ success: false, error: result.error });
            return res.json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Logout endpoint
     */
    app.post('/api/auth/logout', authMiddleware.verifyToken(), (req, res) => {
        try {
            if (req.user) {
                authSystem.logout(req.user.sessionId);
            }
            return res.json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get current user profile
     */
    app.get('/api/auth/profile', authMiddleware.verifyToken(), (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }
            const user = authSystem.getUser(req.user.userId);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            const permissions = authSystem.getPermissions(user.role);
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
                },
                permissions
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Change password
     */
    app.post('/api/auth/change-password', mutationLimiter, authMiddleware.verifyToken(), (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }
            const result = authSystem.changePassword(req.user.userId, oldPassword, newPassword);
            if (!result.success) {
                return res.status(400).json({ success: false, error: result.error });
            }
            return res.json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get all users (CEO only)
     */
    app.get('/api/auth/users', authMiddleware.requireRole('ceo'), (req, res) => {
        try {
            const users = authSystem.getAllUsers();
            return res.json({
                success: true,
                users: users.map(u => ({
                    id: u.id,
                    username: u.username,
                    email: u.email,
                    role: u.role,
                    status: u.status,
                    createdAt: u.createdAt,
                    lastLogin: u.lastLogin
                }))
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Create new user (CEO only)
     */
    app.post('/api/auth/users', mutationLimiter, authMiddleware.requireRole('ceo'), (req, res) => {
        try {
            const { username, email, role, password } = req.body;
            const result = authSystem.createUser(username, email, role, password);
            if (!result.success) {
                return res.status(400).json({ success: false, error: result.error });
            }
            return res.status(201).json({
                success: true,
                user: {
                    id: result.user?.id,
                    username: result.user?.username,
                    email: result.user?.email,
                    role: result.user?.role
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    /**
     * Get session statistics (CEO & CTO only)
     */
    app.get('/api/auth/sessions', authMiddleware.requireRole('ceo', 'cto'), (req, res) => {
        try {
            const stats = authSystem.getSessionStats();
            return res.json({ success: true, ...stats });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
    logger_1.default.info('✓ Auth routes configured');
}
exports.default = setupAuthRoutes;
//# sourceMappingURL=auth-routes.js.map
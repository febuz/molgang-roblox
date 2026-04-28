/**
 * Authentication Routes
 * Login, logout, profile, user management
 */

import express from 'express';
import AuthSystem from './auth-system';
import AuthMiddleware, { AuthRequest } from './auth-middleware';
import { AdvancedRateLimiter } from '../security/rateLimiter';
import logger from '../utils/logger';

export function setupAuthRoutes(app: express.Express, authSystem: AuthSystem, authMiddleware: AuthMiddleware) {
  // Rate limiting (one shared store across all auth routes)
  const limiter = new AdvancedRateLimiter();

  // Login: 10 attempts per 15 minutes per (IP, username) pair. Combining IP
  // with username catches credential stuffing (one IP, many usernames) and
  // password guessing (many IPs unlikely, but still bounded). Complements the
  // per-username brute-force lockout already inside AuthSystem.
  const loginLimiter = limiter.perIp({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) =>
      `login:${req.ip || 'noip'}:${(req.body && req.body.username) || 'nouser'}`,
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
  app.post('/api/auth/login', loginLimiter, (req: AuthRequest, res: express.Response) => {
    try {
      const { username, password } = req.body;
      const ipAddress = req.ip || 'unknown';
      const deviceId = req.headers['x-device-id'] as string || 'unknown-device';
      const location = req.headers['x-location'] as string || 'unknown-location';

      const result = authSystem.login({
        username,
        password,
        ipAddress,
        deviceId,
        location
      });

      if (!result.success) {
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
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Logout endpoint
   */
  app.post('/api/auth/logout', authMiddleware.verifyToken(), (req: AuthRequest, res: express.Response) => {
    try {
      if (req.user) {
        authSystem.logout(req.user.sessionId);
      }
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get current user profile
   */
  app.get('/api/auth/profile', authMiddleware.verifyToken(), (req: AuthRequest, res: express.Response) => {
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
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Change password
   */
  app.post('/api/auth/change-password', mutationLimiter, authMiddleware.verifyToken(), (req: AuthRequest, res: express.Response) => {
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
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get all users (CEO only)
   */
  app.get('/api/auth/users', authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
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
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Create new user (CEO only)
   */
  app.post('/api/auth/users', mutationLimiter, authMiddleware.requireRole('ceo'), (req: AuthRequest, res: express.Response) => {
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
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Get session statistics (CEO & CTO only)
   */
  app.get('/api/auth/sessions', authMiddleware.requireRole('ceo', 'cto'), (req: AuthRequest, res: express.Response) => {
    try {
      const stats = authSystem.getSessionStats();
      return res.json({ success: true, ...stats });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  logger.info('✓ Auth routes configured');
}

export default setupAuthRoutes;

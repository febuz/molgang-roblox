/**
 * Authentication Middleware
 * Protects routes, validates tokens, enforces role-based access
 */

import express from 'express';
import logger from '../utils/logger';
import AuthSystem, { AuthToken } from './auth-system';

export interface AuthRequest extends express.Request {
  user?: AuthToken;
  userId?: string;
  userRole?: string;
}

export class AuthMiddleware {
  private authSystem: AuthSystem;

  constructor(authSystem: AuthSystem) {
    this.authSystem = authSystem;
  }

  /**
   * Verify token middleware
   */
  verifyToken() {
    return (req: AuthRequest, res: express.Response, next: express.NextFunction): any => {
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
  requireRole(...roles: string[]) {
    return (req: AuthRequest, res: express.Response, next: express.NextFunction): any => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'No authentication token' });
      }

      if (!roles.includes(req.user.role)) {
        logger.warn(`🚫 Access denied: ${req.user.username} (${req.user.role}) tried to access ${req.path}`);
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
  requirePermission(permission: string) {
    return (req: AuthRequest, res: express.Response, next: express.NextFunction): any => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'No authentication token' });
      }

      const permissions = this.authSystem.getPermissions(req.user.role as any);
      const hasPermission = (permissions as any)[`can${permission.charAt(0).toUpperCase() + permission.slice(1)}`];

      if (!hasPermission) {
        logger.warn(`🚫 Permission denied: ${req.user.username} (${req.user.role}) - permission: ${permission}`);
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
    return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
      next();
    };
  }

  /**
   * Optional auth (checks token if provided)
   */
  optional() {
    return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
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

export default AuthMiddleware;

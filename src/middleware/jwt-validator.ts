/**
 * JWT Token Validator - Authentication & Authorization Middleware
 *
 * Validates JWT tokens and API keys for incoming requests
 * - Token validation with expiration checks
 * - Role-based access control (RBAC)
 * - Token refresh logic
 * - Token revocation support
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export interface DecodedToken {
  sub: string; // Subject (agent ID)
  iat: number; // Issued At
  exp: number; // Expiration
  role: string; // Agent role (admin, user, agent)
  permissions?: string[]; // Array of permissions
  agent_name?: string;
}

export interface AuthRequest extends Request {
  agent?: {
    id: string;
    name: string;
    role: string;
    permissions: string[];
  };
  token?: string;
}

const JWT_SECRET: string = process.env.JWT_SECRET || 'development-secret-key';
const TOKEN_EXPIRY: string = process.env.TOKEN_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY: string = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Revoked tokens (in production, use Redis)
const revokedTokens = new Set<string>();

/**
 * Generate JWT token
 */
export function generateToken(agentId: string, agentName: string, role: string = 'user'): any {
  const token = jwt.sign(
    {
      sub: agentId,
      agent_name: agentName,
      role,
      permissions: getPermissionsByRole(role),
    } as any,
    JWT_SECRET as any,
    { expiresIn: TOKEN_EXPIRY } as any
  );

  const refreshToken = jwt.sign(
    {
      sub: agentId,
      type: 'refresh',
    } as any,
    JWT_SECRET as any,
    { expiresIn: REFRESH_TOKEN_EXPIRY } as any
  );

  return {
    token,
    refreshToken,
    expiresIn: TOKEN_EXPIRY,
  };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    // Check if token is revoked
    if (revokedTokens.has(token)) {
      logger.warn('Attempt to use revoked token');
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('Invalid token');
    }
    return null;
  }
}

/**
 * Refresh token
 */
export function refreshToken(refreshToken: string): { token: string; expiresIn: string } | null {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

    if (decoded.type !== 'refresh') {
      return null;
    }

    const newToken = jwt.sign(
      {
        sub: decoded.sub,
        role: decoded.role || 'user',
        permissions: decoded.permissions || [],
      } as any,
      JWT_SECRET as any,
      { expiresIn: TOKEN_EXPIRY } as any
    );

    return {
      token: newToken,
      expiresIn: TOKEN_EXPIRY,
    };
  } catch (error) {
    logger.debug('Refresh token validation failed');
    return null;
  }
}

/**
 * Revoke token
 */
export function revokeToken(token: string): void {
  revokedTokens.add(token);
  logger.info(`Token revoked for agent`);
}

/**
 * Middleware: Validate JWT token
 */
export function validateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing authentication token' });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.agent = {
    id: decoded.sub,
    name: decoded.agent_name || decoded.sub,
    role: decoded.role,
    permissions: decoded.permissions || [],
  };
  req.token = token;

  next();
}

/**
 * Middleware: Check required permissions
 */
export function requirePermission(...permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.agent) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hasPermission = permissions.some((perm) => req.agent!.permissions.includes(perm));

    if (!hasPermission) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Middleware: Check required role
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.agent) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.agent.role)) {
      res.status(403).json({ error: 'Insufficient role' });
      return;
    }

    next();
  };
}

/**
 * Middleware: API Key authentication (alternative to JWT)
 */
export function validateApiKey(req: AuthRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || !isValidApiKey(apiKey)) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const agentInfo = getAgentByApiKey(apiKey);
  if (!agentInfo) {
    res.status(401).json({ error: 'Unknown API key' });
    return;
  }

  req.agent = agentInfo;
  next();
}

/**
 * Middleware: Optional authentication (uses token if present)
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.agent = {
        id: decoded.sub,
        name: decoded.agent_name || decoded.sub,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };
    }
  }

  next();
}

// ============================================================
// Helper Functions
// ============================================================

function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check x-access-token header
  const xToken = req.headers['x-access-token'];
  if (xToken && typeof xToken === 'string') {
    return xToken;
  }

  // Check cookie
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  return null;
}

function getPermissionsByRole(role: string): string[] {
  switch (role) {
    case 'admin':
      return [
        'read:all',
        'write:all',
        'delete:all',
        'manage:agents',
        'manage:tokens',
        'view:analytics',
      ];
    case 'agent':
      return ['read:own', 'write:own', 'read:shared', 'execute:tasks'];
    case 'user':
    default:
      return ['read:own', 'write:own'];
  }
}

function isValidApiKey(apiKey: string): boolean {
  // In production, validate against database
  // For now, check format
  return apiKey.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

function getAgentByApiKey(apiKey: string): { id: string; name: string; role: string; permissions: string[] } | null {
  // In production, query database
  // For testing, generate from hash
  if (!isValidApiKey(apiKey)) {
    return null;
  }

  const hash = require('crypto').createHash('sha256').update(apiKey).digest('hex');

  return {
    id: hash.slice(0, 16),
    name: `agent-${hash.slice(0, 8)}`,
    role: 'agent',
    permissions: getPermissionsByRole('agent'),
  };
}

export default {
  generateToken,
  verifyToken,
  refreshToken,
  revokeToken,
  validateToken,
  requirePermission,
  requireRole,
  validateApiKey,
  optionalAuth,
};

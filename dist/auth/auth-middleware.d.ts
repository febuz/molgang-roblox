/**
 * Authentication Middleware
 * Protects routes, validates tokens, enforces role-based access
 */
import express from 'express';
import AuthSystem, { AuthToken } from './auth-system';
export interface AuthRequest extends express.Request {
    user?: AuthToken;
    userId?: string;
    userRole?: string;
}
export declare class AuthMiddleware {
    private authSystem;
    constructor(authSystem: AuthSystem);
    /**
     * Verify token middleware
     */
    verifyToken(): (req: AuthRequest, res: express.Response, next: express.NextFunction) => any;
    /**
     * Require role middleware
     */
    requireRole(...roles: string[]): (req: AuthRequest, res: express.Response, next: express.NextFunction) => any;
    /**
     * Require permission middleware
     */
    requirePermission(permission: string): (req: AuthRequest, res: express.Response, next: express.NextFunction) => any;
    /**
     * Public route (no auth required)
     */
    public(): (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
    /**
     * Optional auth (checks token if provided)
     */
    optional(): (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
}
export default AuthMiddleware;
//# sourceMappingURL=auth-middleware.d.ts.map
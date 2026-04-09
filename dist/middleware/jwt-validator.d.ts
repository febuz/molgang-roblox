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
export interface DecodedToken {
    sub: string;
    iat: number;
    exp: number;
    role: string;
    permissions?: string[];
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
/**
 * Generate JWT token
 */
export declare function generateToken(agentId: string, agentName: string, role?: string): any;
/**
 * Verify and decode JWT token
 */
export declare function verifyToken(token: string): DecodedToken | null;
/**
 * Refresh token
 */
export declare function refreshToken(refreshToken: string): {
    token: string;
    expiresIn: string;
} | null;
/**
 * Revoke token
 */
export declare function revokeToken(token: string): void;
/**
 * Middleware: Validate JWT token
 */
export declare function validateToken(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Middleware: Check required permissions
 */
export declare function requirePermission(...permissions: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware: Check required role
 */
export declare function requireRole(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware: API Key authentication (alternative to JWT)
 */
export declare function validateApiKey(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Middleware: Optional authentication (uses token if present)
 */
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void;
declare const _default: {
    generateToken: typeof generateToken;
    verifyToken: typeof verifyToken;
    refreshToken: typeof refreshToken;
    revokeToken: typeof revokeToken;
    validateToken: typeof validateToken;
    requirePermission: typeof requirePermission;
    requireRole: typeof requireRole;
    validateApiKey: typeof validateApiKey;
    optionalAuth: typeof optionalAuth;
};
export default _default;
//# sourceMappingURL=jwt-validator.d.ts.map
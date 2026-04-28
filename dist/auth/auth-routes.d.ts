/**
 * Authentication Routes
 * Login, logout, profile, user management
 */
import express from 'express';
import AuthSystem from './auth-system';
import AuthMiddleware from './auth-middleware';
export declare function setupAuthRoutes(app: express.Express, authSystem: AuthSystem, authMiddleware: AuthMiddleware): void;
export default setupAuthRoutes;
//# sourceMappingURL=auth-routes.d.ts.map
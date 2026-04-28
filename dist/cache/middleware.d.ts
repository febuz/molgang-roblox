import { Request, Response, NextFunction } from 'express';
import CacheManager from './cacheManager';
declare const cacheManager: CacheManager;
/**
 * Cache GET requests
 */
export declare const cacheMiddleware: (ttl?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Invalidate cache on mutations
 */
export declare const invalidateCacheMiddleware: (pattern: string) => (_req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Get cache stats endpoint
 */
export declare const getCacheStats: (_req: Request, res: Response) => Promise<void>;
export default cacheManager;
//# sourceMappingURL=middleware.d.ts.map
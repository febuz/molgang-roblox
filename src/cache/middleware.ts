import { Request, Response, NextFunction } from 'express';
import CacheManager from './cacheManager';

const cacheManager = new CacheManager();

/**
 * Cache GET requests
 */
export const cacheMiddleware = (ttl: number = 3600) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;

    // Try to get from cache
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Intercept response
    const originalJson = res.json.bind(res);
    res.json = function (data: unknown) {
      // Cache the response
      cacheManager.set(cacheKey, data, { ttl });
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache on mutations
 */
export const invalidateCacheMiddleware = (pattern: string) => {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    // Invalidate on POST/PUT/DELETE
    const originalJson = _res.json.bind(_res);
    _res.json = function (data: unknown) {
      if ([201, 204].includes(_res.statusCode)) {
        cacheManager.invalidatePattern(pattern);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Get cache stats endpoint
 */
export const getCacheStats = async (_req: Request, res: Response) => {
  const stats = cacheManager.getStats();
  res.json({
    status: 'ok',
    cache: stats,
  });
};

export default cacheManager;

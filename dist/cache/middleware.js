"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheStats = exports.invalidateCacheMiddleware = exports.cacheMiddleware = void 0;
const cacheManager_1 = __importDefault(require("./cacheManager"));
const cacheManager = new cacheManager_1.default();
/**
 * Cache GET requests
 */
const cacheMiddleware = (ttl = 3600) => {
    return async (req, res, next) => {
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
        res.json = function (data) {
            // Cache the response
            cacheManager.set(cacheKey, data, { ttl });
            res.set('X-Cache', 'MISS');
            return originalJson(data);
        };
        next();
    };
};
exports.cacheMiddleware = cacheMiddleware;
/**
 * Invalidate cache on mutations
 */
const invalidateCacheMiddleware = (pattern) => {
    return async (_req, _res, next) => {
        // Invalidate on POST/PUT/DELETE
        const originalJson = _res.json.bind(_res);
        _res.json = function (data) {
            if ([201, 204].includes(_res.statusCode)) {
                cacheManager.invalidatePattern(pattern);
            }
            return originalJson(data);
        };
        next();
    };
};
exports.invalidateCacheMiddleware = invalidateCacheMiddleware;
/**
 * Get cache stats endpoint
 */
const getCacheStats = async (_req, res) => {
    const stats = cacheManager.getStats();
    res.json({
        status: 'ok',
        cache: stats,
    });
};
exports.getCacheStats = getCacheStats;
exports.default = cacheManager;
//# sourceMappingURL=middleware.js.map
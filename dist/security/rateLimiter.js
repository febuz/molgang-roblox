"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedRateLimiter = void 0;
class AdvancedRateLimiter {
    constructor() {
        this.store = {};
        this.tierLimits = {
            free: {
                requestsPerMinute: 10,
                burstLimit: 15,
                concurrentRequests: 2,
            },
            pro: {
                requestsPerMinute: 100,
                burstLimit: 150,
                concurrentRequests: 10,
            },
            enterprise: {
                requestsPerMinute: 1000,
                burstLimit: 1500,
                concurrentRequests: 100,
            },
        };
    }
    /**
     * Per-IP rate limiter
     */
    perIp(config) {
        return (req, res, next) => {
            const key = (config.keyGenerator ? config.keyGenerator(req) : req.ip) || 'unknown';
            const now = Date.now();
            if (!this.store[key]) {
                this.store[key] = {
                    count: 1,
                    resetTime: now + config.windowMs,
                };
                return next();
            }
            const entry = this.store[key];
            // Reset window if expired
            if (now > entry.resetTime) {
                entry.count = 1;
                entry.resetTime = now + config.windowMs;
                return next();
            }
            // Check limit
            if (entry.count >= config.maxRequests) {
                res.status(429).json({
                    status: 'error',
                    message: 'Too many requests',
                    retryAfter: Math.ceil((entry.resetTime - now) / 1000),
                });
                return;
            }
            entry.count++;
            res.setHeader('X-RateLimit-Limit', config.maxRequests);
            res.setHeader('X-RateLimit-Remaining', config.maxRequests - entry.count);
            res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
            next();
        };
    }
    /**
     * Per-user/API key rate limiter
     */
    perUser(config) {
        return (req, res, next) => {
            const userId = req.user?.id || req.ip;
            const key = `user:${userId}`;
            const now = Date.now();
            if (!this.store[key]) {
                this.store[key] = {
                    count: 1,
                    resetTime: now + config.windowMs,
                };
                return next();
            }
            const entry = this.store[key];
            if (now > entry.resetTime) {
                entry.count = 1;
                entry.resetTime = now + config.windowMs;
                return next();
            }
            if (entry.count >= config.maxRequests) {
                res.status(429).json({
                    status: 'error',
                    message: 'Rate limit exceeded for your account',
                    retryAfter: Math.ceil((entry.resetTime - now) / 1000),
                });
                return;
            }
            entry.count++;
            next();
        };
    }
    /**
     * Tier-based rate limiting (free/pro/enterprise)
     */
    tierBased(tierFromRequest) {
        return (req, res, next) => {
            const tier = tierFromRequest(req) || 'free';
            const tierConfig = this.tierLimits[tier];
            if (!tierConfig) {
                return res.status(400).json({ error: 'Invalid tier' });
            }
            const key = `tier:${tier}:${req.ip}`;
            const now = Date.now();
            const windowMs = 60000; // 1 minute
            if (!this.store[key]) {
                this.store[key] = {
                    count: 1,
                    resetTime: now + windowMs,
                };
                res.locals.rateLimitInfo = {
                    limit: tierConfig.requestsPerMinute,
                    remaining: tierConfig.requestsPerMinute - 1,
                };
                return next();
            }
            const entry = this.store[key];
            if (now > entry.resetTime) {
                entry.count = 1;
                entry.resetTime = now + windowMs;
                res.locals.rateLimitInfo = {
                    limit: tierConfig.requestsPerMinute,
                    remaining: tierConfig.requestsPerMinute - 1,
                };
                return next();
            }
            if (entry.count >= tierConfig.requestsPerMinute) {
                // Allow burst
                if (entry.count >= tierConfig.burstLimit) {
                    res.status(429).json({
                        status: 'error',
                        message: 'Rate limit exceeded',
                        tier,
                        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
                    });
                    return;
                }
            }
            entry.count++;
            res.locals.rateLimitInfo = {
                limit: tierConfig.requestsPerMinute,
                remaining: Math.max(0, tierConfig.requestsPerMinute - entry.count),
            };
            next();
        };
    }
    /**
     * Sliding window rate limiter (more accurate)
     */
    slidingWindow(windowMs, maxRequests) {
        return (req, res, next) => {
            const key = `window:${req.ip}`;
            const now = Date.now();
            if (!this.store[key]) {
                this.store[key] = {
                    count: 1,
                    resetTime: now + windowMs,
                };
                return next();
            }
            const entry = this.store[key];
            // Remove old timestamps (sliding window)
            if (now > entry.resetTime) {
                entry.count = 1;
                entry.resetTime = now + windowMs;
                return next();
            }
            if (entry.count >= maxRequests) {
                const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
                res.status(429).json({
                    status: 'error',
                    message: 'Rate limit exceeded',
                    retryAfter,
                    windowMs,
                    maxRequests,
                });
                return;
            }
            entry.count++;
            next();
        };
    }
    /**
     * Clean up old entries periodically
     */
    cleanup() {
        const now = Date.now();
        Object.keys(this.store).forEach((key) => {
            if (this.store[key].resetTime < now) {
                delete this.store[key];
            }
        });
    }
    /**
     * Get current stats
     */
    getStats() {
        return {
            totalKeys: Object.keys(this.store).length,
            entries: this.store,
        };
    }
}
exports.AdvancedRateLimiter = AdvancedRateLimiter;
exports.default = AdvancedRateLimiter;
//# sourceMappingURL=rateLimiter.js.map
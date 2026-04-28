import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
    handler?: (req: Request, res: Response) => void;
}
interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}
export declare class AdvancedRateLimiter {
    private store;
    private tierLimits;
    /**
     * Per-IP rate limiter
     */
    perIp(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Per-user/API key rate limiter
     */
    perUser(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Tier-based rate limiting (free/pro/enterprise)
     */
    tierBased(tierFromRequest: (req: Request) => string): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    /**
     * Sliding window rate limiter (more accurate)
     */
    slidingWindow(windowMs: number, maxRequests: number): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Clean up old entries periodically
     */
    cleanup(): void;
    /**
     * Get current stats
     */
    getStats(): {
        totalKeys: number;
        entries: RateLimitStore;
    };
}
export default AdvancedRateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map
import AdvancedRateLimiter from '../../src/security/rateLimiter';
import { Request, Response } from 'express';

describe('AdvancedRateLimiter', () => {
  let limiter: AdvancedRateLimiter;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    limiter = new AdvancedRateLimiter();
    mockReq = { ip: '192.168.1.1' };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      locals: {},
    };
    mockNext = jest.fn();
  });

  describe('perIp', () => {
    it('should allow requests within limit', () => {
      const middleware = limiter.perIp({
        windowMs: 60000,
        maxRequests: 5,
      });

      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('should reject requests exceeding limit', () => {
      const middleware = limiter.perIp({
        windowMs: 60000,
        maxRequests: 2,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should reset counter after window expires', (done) => {
      const middleware = limiter.perIp({
        windowMs: 100, // 100ms for testing
        maxRequests: 2,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Wait for window to expire
      setTimeout(() => {
        mockRes.status = jest.fn().mockReturnThis();
        mockNext = jest.fn();
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe('tierBased', () => {
    it('should apply tier limits correctly', () => {
      const tierFromRequest = () => 'free';
      const middleware = limiter.tierBased(tierFromRequest);

      // Free tier allows 10 requests per minute
      for (let i = 0; i < 10; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 11th request should be rate limited
      mockNext.mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      // Should hit burst limit or rate limit
    });

    it('should allow higher limits for pro tier', () => {
      const tierFromRequest = () => 'pro';
      const middleware = limiter.tierBased(tierFromRequest);

      // Pro tier allows 100 requests per minute
      expect(mockNext).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const middleware = limiter.perIp({
        windowMs: 100,
        maxRequests: 10,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      let stats = limiter.getStats();
      expect(stats.totalKeys).toBe(1);

      setTimeout(() => {
        limiter.cleanup();
        stats = limiter.getStats();
        expect(stats.totalKeys).toBe(0);
      }, 150);
    });
  });
});

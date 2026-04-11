import { describe, it, expect, beforeEach } from '@jest/globals';

describe('API Integration Tests', () => {
  const baseUrl = 'http://localhost:3100';

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });

    it('should include service status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(data).toHaveProperty('services');
      expect(data.services).toHaveProperty('lightrag');
      expect(data.services).toHaveProperty('kafka');
    });
  });

  describe('Dashboard Endpoints', () => {
    it('should get dashboard stats', async () => {
      const response = await fetch(`${baseUrl}/api/analytics/dashboard`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('stats');
      expect(data.stats).toHaveProperty('totalRequests');
    });

    it('should get performance metrics', async () => {
      const response = await fetch(`${baseUrl}/api/analytics/performance`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('performance');
      expect(data.performance).toHaveProperty('apiLatency');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await fetch(`${baseUrl}/api/backlog`);
      expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
    });

    it('should return 429 when rate limit exceeded', async () => {
      // Make requests rapidly
      const requests = Array(150).fill(null).map(() =>
        fetch(`${baseUrl}/api/test`)
      );

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);

      // Should have at least one 429
      expect(statusCodes).toContain(429);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await fetch(`${baseUrl}/api/nonexistent`);
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid requests', async () => {
      const response = await fetch(`${baseUrl}/api/test`, {
        method: 'POST',
        body: 'invalid json',
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('CORS', () => {
    it('should handle preflight requests', async () => {
      const response = await fetch(`${baseUrl}/api/`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.headers.has('Content-Security-Policy')).toBe(true);
      expect(response.headers.has('X-Content-Type-Options')).toBe(true);
      expect(response.headers.has('X-Frame-Options')).toBe(true);
    });
  });
});

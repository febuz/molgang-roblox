import { apiKeyAuth, ApiKeyRequest } from '../../src/security/apiKeyMiddleware';
import { ApiKeyManager } from '../../src/security/apiKeys';

/**
 * Unit tests for the apiKeyAuth middleware. Uses a real ApiKeyManager and
 * mocked req/res/next.
 */

function res() {
  const r: any = {
    statusCode: 200,
    body: undefined,
    status: jest.fn((c: number) => ((r.statusCode = c), r)),
    json: jest.fn((b: any) => ((r.body = b), r)),
  };
  return r;
}

function req(headers: Record<string, string> = {}): ApiKeyRequest {
  return { headers } as any;
}

describe('apiKeyAuth middleware', () => {
  let mgr: ApiKeyManager;
  let key: string;

  beforeEach(() => {
    mgr = new ApiKeyManager();
    key = mgr.issue('numerai-fetcher', { scopes: ['data:read'] }).key;
  });

  it('401s when no key is present', () => {
    const r = res();
    const next = jest.fn();
    apiKeyAuth(mgr)(req(), r, next);
    expect(r.statusCode).toBe(401);
    expect(r.body.error).toBe('API key required');
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid key via X-API-Key and attaches key info', () => {
    const r = res();
    const next = jest.fn();
    const request = req({ 'x-api-key': key });
    apiKeyAuth(mgr)(request, r, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(r.status).not.toHaveBeenCalled();
    expect(request.apiKey?.name).toBe('numerai-fetcher');
    expect(request.apiKey?.scopes).toContain('data:read');
  });

  it('accepts a valid key via Authorization: ApiKey <key>', () => {
    const r = res();
    const next = jest.fn();
    apiKeyAuth(mgr)(req({ authorization: `ApiKey ${key}` }), r, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('401s on an invalid key', () => {
    const r = res();
    const next = jest.fn();
    apiKeyAuth(mgr)(req({ 'x-api-key': 'vpk_bogus.nope' }), r, next);
    expect(r.statusCode).toBe(401);
    expect(r.body.error).toBe('Invalid API key');
    expect(next).not.toHaveBeenCalled();
  });

  it('401s on a revoked key', () => {
    const { key: k, info } = mgr.issue('temp');
    mgr.revoke(info.id);
    const r = res();
    apiKeyAuth(mgr)(req({ 'x-api-key': k }), r, jest.fn());
    expect(r.statusCode).toBe(401);
  });

  describe('scope enforcement', () => {
    it('allows when the key has the required scope', () => {
      const r = res();
      const next = jest.fn();
      apiKeyAuth(mgr, { scope: 'data:read' })(req({ 'x-api-key': key }), r, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('403s when the key lacks the required scope', () => {
      const r = res();
      const next = jest.fn();
      apiKeyAuth(mgr, { scope: 'admin' })(req({ 'x-api-key': key }), r, next);
      expect(r.statusCode).toBe(403);
      expect(r.body.error).toMatch(/missing required scope: admin/);
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('supports a custom header name', () => {
    const r = res();
    const next = jest.fn();
    apiKeyAuth(mgr, { header: 'x-service-key' })(req({ 'x-service-key': key }), r, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

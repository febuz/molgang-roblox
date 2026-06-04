import { securityHeaders, corsHeaders } from '../../src/security/securityHeaders';

/**
 * Unit tests for the security/CORS header middleware. Verifies the actual
 * header values (these are real security controls) + the CORS origin
 * allow-list and OPTIONS short-circuit.
 */

function mockRes() {
  const headers: Record<string, string> = {};
  const res: any = {
    headers,
    statusSent: undefined as number | undefined,
    setHeader: jest.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    sendStatus: jest.fn((code: number) => {
      res.statusSent = code;
      return res;
    }),
  };
  return res;
}

function mockReq(opts: { origin?: string; method?: string } = {}) {
  return {
    method: opts.method ?? 'GET',
    get: (h: string) => (h.toLowerCase() === 'origin' ? opts.origin : undefined),
  } as any;
}

describe('securityHeaders (gated — TOP_100 #2)', () => {
  const SAVED = process.env.ENFORCE_STRICT_SECURITY;
  afterEach(() => {
    if (SAVED === undefined) delete process.env.ENFORCE_STRICT_SECURITY;
    else process.env.ENFORCE_STRICT_SECURITY = SAVED;
  });

  it('always sets the always-safe headers and calls next', () => {
    delete process.env.ENFORCE_STRICT_SECURITY;
    const res = mockRes();
    const next = jest.fn();
    securityHeaders(mockReq(), res, next);

    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-XSS-Protection']).toBe('1; mode=block');
    expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(res.headers['Strict-Transport-Security']).toContain('includeSubDomains');
    expect(res.headers['Permissions-Policy']).toContain('camera=()');
    expect(next).toHaveBeenCalledTimes(1);
  });

  describe('default (permissive) mode — must not break the live dashboards', () => {
    it('uses X-Frame-Options SAMEORIGIN so the dashboard iframe still loads', () => {
      delete process.env.ENFORCE_STRICT_SECURITY;
      const res = mockRes();
      securityHeaders(mockReq(), res, jest.fn());
      expect(res.headers['X-Frame-Options']).toBe('SAMEORIGIN');
    });

    it('CSP allows https://unpkg.com so the Three.js demos load', () => {
      process.env.ENFORCE_STRICT_SECURITY = 'false';
      const res = mockRes();
      securityHeaders(mockReq(), res, jest.fn());
      expect(res.headers['Content-Security-Policy']).toContain('https://unpkg.com');
      expect(res.headers['Content-Security-Policy']).toMatch(/default-src 'self'/);
    });

    it('does NOT send COEP/COOP by default (they would block unpkg.com)', () => {
      delete process.env.ENFORCE_STRICT_SECURITY;
      const res = mockRes();
      securityHeaders(mockReq(), res, jest.fn());
      expect(res.headers['Cross-Origin-Embedder-Policy']).toBeUndefined();
      expect(res.headers['Cross-Origin-Opener-Policy']).toBeUndefined();
    });
  });

  describe('strict mode (ENFORCE_STRICT_SECURITY=true)', () => {
    it('locks X-Frame-Options to DENY and CSP to self', () => {
      process.env.ENFORCE_STRICT_SECURITY = 'true';
      const res = mockRes();
      securityHeaders(mockReq(), res, jest.fn());
      expect(res.headers['X-Frame-Options']).toBe('DENY');
      expect(res.headers['Content-Security-Policy']).not.toContain('unpkg.com');
      expect(res.headers['Content-Security-Policy']).toContain("script-src 'self'");
    });

    it('sends COEP require-corp + COOP same-origin', () => {
      process.env.ENFORCE_STRICT_SECURITY = 'true';
      const res = mockRes();
      securityHeaders(mockReq(), res, jest.fn());
      expect(res.headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
      expect(res.headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    });
  });
});

describe('corsHeaders', () => {
  it('reflects an allow-listed origin', () => {
    const res = mockRes();
    const next = jest.fn();
    corsHeaders(mockReq({ origin: 'http://localhost:3100' }), res, next);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3100');
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(res.headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does NOT reflect a non-allow-listed origin', () => {
    const res = mockRes();
    corsHeaders(mockReq({ origin: 'https://evil.example.com' }), res, jest.fn());
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('sets no ACAO when there is no Origin header', () => {
    const res = mockRes();
    corsHeaders(mockReq(), res, jest.fn());
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    // Still sets the static CORS headers.
    expect(res.headers['Access-Control-Max-Age']).toBe('3600');
  });

  it('short-circuits a preflight OPTIONS with 200 and does not call next', () => {
    const res = mockRes();
    const next = jest.fn();
    corsHeaders(mockReq({ method: 'OPTIONS', origin: 'http://localhost:3000' }), res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for a non-OPTIONS request', () => {
    const res = mockRes();
    const next = jest.fn();
    corsHeaders(mockReq({ method: 'POST' }), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});

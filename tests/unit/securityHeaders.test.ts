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

describe('securityHeaders', () => {
  it('sets all expected security headers and calls next', () => {
    const res = mockRes();
    const next = jest.fn();
    securityHeaders(mockReq(), res, next);

    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['X-XSS-Protection']).toBe('1; mode=block');
    expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(res.headers['Strict-Transport-Security']).toContain('includeSubDomains');
    expect(res.headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    expect(res.headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(res.headers['Permissions-Policy']).toContain('camera=()');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("sets a CSP that defaults to 'self'", () => {
    const res = mockRes();
    securityHeaders(mockReq(), res, jest.fn());
    expect(res.headers['Content-Security-Policy']).toMatch(/default-src 'self'/);
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

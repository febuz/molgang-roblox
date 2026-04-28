import { AdvancedRateLimiter } from '../../src/security/rateLimiter';
import { Request, Response, NextFunction } from 'express';

/**
 * Mirrors the keyGenerator used in setupAuthRoutes for /api/auth/login.
 * The behaviour we care about: distinct (ip, username) pairs get distinct
 * counters, so one attacker burning their budget on user A doesn't lock out
 * user B from the same IP, and one shared NAT IP doesn't burn down everyone
 * else's logins.
 */
function makeLoginLimiter() {
  const limiter = new AdvancedRateLimiter();
  return limiter.perIp({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) =>
      `login:${req.ip || 'noip'}:${(req.body && req.body.username) || 'nouser'}`,
  });
}

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

function call(
  middleware: Middleware,
  ip: string,
  username: string
): { allowed: boolean; status?: number } {
  const req = { ip, body: { username } } as unknown as Request;
  let status: number | undefined;
  let allowed = false;
  const res = {
    status: (s: number) => { status = s; return res; },
    json: () => res,
    setHeader: () => res,
  } as unknown as Response;
  const next: NextFunction = () => { allowed = true; };
  middleware(req, res, next);
  return { allowed, status };
}

describe('auth login rate limiter wiring', () => {
  it('blocks the 11th login attempt for the same (ip, username)', () => {
    const mw = makeLoginLimiter();
    for (let i = 0; i < 10; i++) {
      const r = call(mw, '1.2.3.4', 'ceo');
      expect(r.allowed).toBe(true);
    }
    const r11 = call(mw, '1.2.3.4', 'ceo');
    expect(r11.allowed).toBe(false);
    expect(r11.status).toBe(429);
  });

  it('does not lock out a different username from the same IP', () => {
    const mw = makeLoginLimiter();
    for (let i = 0; i < 10; i++) call(mw, '1.2.3.4', 'ceo');
    // ceo is now locked, but kai from same IP should still be free
    const kai = call(mw, '1.2.3.4', 'kai');
    expect(kai.allowed).toBe(true);
  });

  it('does not lock out the same username from a different IP', () => {
    const mw = makeLoginLimiter();
    for (let i = 0; i < 10; i++) call(mw, '1.2.3.4', 'ceo');
    const fromOtherIp = call(mw, '5.6.7.8', 'ceo');
    expect(fromOtherIp.allowed).toBe(true);
  });
});

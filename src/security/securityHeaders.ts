import { Request, Response, NextFunction } from 'express';

// Strict mode gates the headers that can break the live dashboards. It is OFF
// by default so wiring this middleware is non-breaking; turn it on in a
// hardened deployment that has verified no cross-origin resources are loaded.
//
// Why each gated header is risky by default (see the 2026-06-04 recon):
//   - X-Frame-Options: DENY blocks dashboard.html's same-origin <iframe> of
//     /agents.html. SAMEORIGIN keeps clickjacking protection without breaking it.
//   - Cross-Origin-Embedder-Policy: require-corp blocks the Three.js modules the
//     demo pages import from https://unpkg.com (no CORP headers there). It is
//     also unnecessary without SharedArrayBuffer, which the app doesn't use.
//   - A 'self'-only CSP blocks those same unpkg.com scripts.
function strictModeEnabled(): boolean {
  return (process.env.ENFORCE_STRICT_SECURITY || 'false').toLowerCase() === 'true';
}

export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  const strict = strictModeEnabled();

  // --- Always-safe headers (no known dashboard impact) ---
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Clickjacking protection: SAMEORIGIN by default (allows the dashboard's own
  // iframes); DENY only under strict mode.
  res.setHeader('X-Frame-Options', strict ? 'DENY' : 'SAMEORIGIN');

  // Content Security Policy: permissive-but-meaningful by default (self + the
  // one external origin the demos use); locked to 'self' under strict mode.
  res.setHeader(
    'Content-Security-Policy',
    strict
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:",
  );

  // Cross-origin isolation headers — only under strict mode (they break the
  // unpkg.com Three.js imports and external-link window.open()).
  if (strict) {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }

  next();
};

export const corsHeaders = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3100',
    'https://api.virtualpc.com',
  ];

  const origin = req.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  return next();
};

export default { securityHeaders, corsHeaders };

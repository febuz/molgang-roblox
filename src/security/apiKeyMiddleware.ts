/**
 * Opt-in Express middleware for service-to-service API-key auth.
 *
 * Provides the *mechanism* without choosing which routes use it — apply
 * `apiKeyAuth(manager, { scope })` to whatever endpoints should accept `vpk_`
 * keys. Reads the key from `X-API-Key` or `Authorization: ApiKey <key>`,
 * verifies it via ApiKeyManager, optionally enforces a scope, and attaches the
 * verified key info to the request.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiKeyManager } from './apiKeys';

export interface ApiKeyRequest extends Request {
  apiKey?: { id: string; name: string; scopes: string[] };
}

export interface ApiKeyAuthOptions {
  /** Require the verified key to carry this scope. */
  scope?: string;
  /** Header to read the key from (default 'x-api-key'). */
  header?: string;
}

/** Extract a key from the configured header or `Authorization: ApiKey <key>`. */
function extractKey(req: Request, header: string): string | undefined {
  const direct = req.headers[header];
  if (typeof direct === 'string' && direct) return direct;
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('ApiKey ')) {
    return auth.slice('ApiKey '.length).trim() || undefined;
  }
  return undefined;
}

export function apiKeyAuth(manager: ApiKeyManager, opts: ApiKeyAuthOptions = {}) {
  const header = (opts.header || 'x-api-key').toLowerCase();
  return (req: ApiKeyRequest, res: Response, next: NextFunction): any => {
    const presented = extractKey(req, header);
    if (!presented) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }
    const result = manager.verify(presented);
    if (!result.ok) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    if (opts.scope && !manager.hasScope(result.info!, opts.scope)) {
      return res.status(403).json({ success: false, error: `API key missing required scope: ${opts.scope}` });
    }
    req.apiKey = { id: result.info!.id, name: result.info!.name, scopes: result.info!.scopes };
    return next();
  };
}

export default apiKeyAuth;

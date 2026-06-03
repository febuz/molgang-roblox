/**
 * OpenAPI 3.0 spec serving for the auth/audit/dashboard/security API (backlog 6.5.12).
 *
 * The spec itself lives at public/openapi.json (statically served too); this
 * module exposes it at GET /api/openapi.json and renders a zero-dependency
 * Swagger UI at GET /api/docs (loaded from the unpkg CDN — no npm dependency
 * added to the build).
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

let cached: Readonly<Record<string, any>> | null = null;

/** Recursively freeze an object so callers cannot mutate the shared cache. */
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj as Record<string, unknown>)) deepFreeze(v);
  }
  return obj;
}

/**
 * Load (and memoise) the OpenAPI spec from public/openapi.json. The returned
 * object is deep-frozen, so a caller mutating it cannot poison the cache for
 * subsequent requests. Throws if the spec file is missing/unreadable — callers
 * should catch and return a generic error (don't leak the path).
 */
export function loadOpenApiSpec(): Readonly<Record<string, any>> {
  if (cached) return cached;
  // dist/api/openapi.js -> ../../public ; src/api/openapi.ts (ts-jest) -> ../../public
  const specPath = path.resolve(__dirname, '..', '..', 'public', 'openapi.json');
  cached = deepFreeze(JSON.parse(fs.readFileSync(specPath, 'utf-8')));
  return cached!;
}

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VirtualPC Admin API — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`;

/** Register the public docs routes. */
export function setupOpenApiRoutes(app: express.Express): void {
  app.get('/api/openapi.json', (_req: express.Request, res: express.Response) => {
    try {
      return res.json(loadOpenApiSpec());
    } catch (error: any) {
      // Log the real error (incl. path) server-side; return a generic message
      // so a missing-file error can't leak the filesystem path to clients.
      logger.error('Failed to load OpenAPI spec:', error);
      return res.status(500).json({ success: false, error: 'Failed to load OpenAPI specification' });
    }
  });

  app.get('/api/docs', (_req: express.Request, res: express.Response) => {
    return res.type('html').send(SWAGGER_HTML);
  });

  logger.info('✓ OpenAPI docs at /api/docs (spec: /api/openapi.json)');
}

export default setupOpenApiRoutes;

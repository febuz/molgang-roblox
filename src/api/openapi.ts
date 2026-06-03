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

let cached: Record<string, any> | null = null;

/** Load (and memoise) the OpenAPI spec from public/openapi.json. */
export function loadOpenApiSpec(): Record<string, any> {
  if (cached) return cached;
  // dist/api/openapi.js -> ../../public ; src/api/openapi.ts (ts-jest) -> ../../public
  const specPath = path.resolve(__dirname, '..', '..', 'public', 'openapi.json');
  cached = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
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
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/docs', (_req: express.Request, res: express.Response) => {
    return res.type('html').send(SWAGGER_HTML);
  });

  logger.info('✓ OpenAPI docs at /api/docs (spec: /api/openapi.json)');
}

export default setupOpenApiRoutes;

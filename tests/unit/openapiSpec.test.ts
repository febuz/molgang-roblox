import * as fs from 'fs';
import * as path from 'path';
import { loadOpenApiSpec } from '../../src/api/openapi';

/**
 * Structural validation of the generated OpenAPI spec (backlog 6.5.12).
 *
 * Guards: every documented endpoint matches the real route inventory, the
 * bearer security scheme is defined, protected routes carry a security
 * requirement (and public ones don't), every $ref resolves, and Express-style
 * ':param' segments were converted to OpenAPI '{param}' form.
 */

// Real route inventory (method + OpenAPI-style path), derived from the source.
const INVENTORY = [
  'post /api/auth/login',
  'post /api/auth/logout',
  'post /api/auth/2fa/setup',
  'post /api/auth/2fa/enable',
  'post /api/auth/2fa/disable',
  'post /api/auth/2fa/verify',
  'post /api/auth/change-password',
  'get /api/auth/profile',
  'get /api/auth/users',
  'post /api/auth/users',
  'post /api/auth/users/{userId}/status',
  'delete /api/auth/users/{userId}',
  'get /api/auth/sessions',
  'delete /api/auth/sessions/{sessionId}',
  'post /api/auth/sessions/revoke-user',
  'get /api/audit/stats',
  'get /api/audit/events',
  'get /api/audit/events/user/{username}',
  'get /api/audit/events/type/{type}',
  'get /api/audit/events/severity/{severity}',
  'get /api/audit/events/ip/{ip}',
  'get /api/audit/export/csv',
  'get /api/audit/export/json',
  'post /api/audit/clear-old',
  'get /api/audit/search',
  'get /api/dashboard/my',
  'get /api/dashboard/ceo',
  'get /api/dashboard/cto',
  'get /api/dashboard/developer',
  'get /api/dashboard/artist',
  'get /api/dashboard/tech-artist',
  'get /api/security/dashboard',
];

// Only these two routes are public (no auth middleware in the source).
const PUBLIC = new Set(['post /api/auth/login', 'post /api/auth/2fa/verify']);

describe('OpenAPI spec (public/openapi.json)', () => {
  const spec = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'public', 'openapi.json'), 'utf-8')
  );

  const operations: Array<{ key: string; op: any }> = [];
  for (const [p, methods] of Object.entries<any>(spec.paths)) {
    for (const [m, op] of Object.entries<any>(methods)) {
      operations.push({ key: `${m.toLowerCase()} ${p}`, op });
    }
  }

  it('is OpenAPI 3.0.x with info and a bearer security scheme', () => {
    expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
    expect(spec.info?.title).toBeTruthy();
    const bearer = spec.components?.securitySchemes?.bearerAuth;
    expect(bearer).toEqual(expect.objectContaining({ type: 'http', scheme: 'bearer' }));
  });

  it('documents exactly the real route inventory (no missing, no extras)', () => {
    const documented = operations.map(o => o.key).sort();
    expect(documented).toEqual([...INVENTORY].sort());
  });

  it('marks protected routes with a bearerAuth requirement and leaves public ones open', () => {
    for (const { key, op } of operations) {
      if (PUBLIC.has(key)) {
        expect(op.security ?? []).toEqual([]);
      } else {
        expect(op.security).toEqual([{ bearerAuth: [] }]);
      }
    }
  });

  it('documents a 401 response on every protected route', () => {
    for (const { key, op } of operations) {
      if (!PUBLIC.has(key)) {
        expect(Object.keys(op.responses || {})).toContain('401');
      }
    }
  });

  it('uses OpenAPI {param} path syntax, never Express :param', () => {
    for (const p of Object.keys(spec.paths)) {
      expect(p).not.toMatch(/:/);
    }
  });

  it('resolves every local $ref to a defined component schema', () => {
    const schemas = spec.components?.schemas || {};
    const refs: string[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.$ref === 'string') refs.push(node.$ref);
      for (const v of Object.values(node)) walk(v);
    };
    walk(spec.paths);
    walk(spec.components?.schemas);
    expect(refs.length).toBeGreaterThan(0); // the spec does use refs
    for (const ref of refs) {
      expect(ref).toMatch(/^#\/components\/schemas\//);
      const name = ref.replace('#/components/schemas/', '');
      expect(schemas[name]).toBeDefined();
    }
  });

  it('loadOpenApiSpec() returns the same spec object the file holds', () => {
    const loaded = loadOpenApiSpec();
    expect(loaded.openapi).toBe(spec.openapi);
    expect(Object.keys(loaded.paths).sort()).toEqual(Object.keys(spec.paths).sort());
  });

  it('loadOpenApiSpec() returns a deep-frozen object (no cache poisoning)', () => {
    const loaded = loadOpenApiSpec();
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.paths)).toBe(true);
    expect(Object.isFrozen(loaded.components.schemas)).toBe(true);
    // Mutating a frozen object is a silent no-op in non-strict mode — assert
    // the value is unchanged so a caller can't poison the shared cache.
    const before = loaded.info.title;
    try {
      (loaded as any).info.title = 'HACKED';
    } catch {
      /* strict mode throws — also acceptable */
    }
    expect(loadOpenApiSpec().info.title).toBe(before);
  });
});

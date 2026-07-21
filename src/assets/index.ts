/**
 * Asset mirror-coverage route — surfaces the cross-platform remediation plan
 * (Roblox → Web) for the designers. Reads the live asset registry via the
 * existing /api/assets surface and runs the pure analyzer; fabricates nothing.
 *
 *   GET /api/assets/mirror-coverage  → coverage per category + remediation manifest
 */
import type { Express } from 'express';
import { analyzeMirrorCoverage, Asset } from './mirror-coverage';

export function registerAssetMirrorRoutes(app: Express): void {
  app.get('/api/assets/mirror-coverage', async (_req, res) => {
    try {
      const base = 'http://localhost:' + (process.env.PORT || '3100');
      const r = await fetch(`${base}/api/assets?limit=2000`);
      const data: any = await r.json().catch(() => ({}));
      const assets: Asset[] = (data.assets || data.items || []) as Asset[];
      const report = analyzeMirrorCoverage(assets);
      res.json({ success: true, ...report });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

import { analyzeMirrorCoverage, stem, Asset } from '../../src/assets/mirror-coverage';

/**
 * Unit tests for the asset mirror-coverage analyzer — no fabricated web entries,
 * just a real coverage report + remediation manifest from the asset list.
 */

describe('stem', () => {
  it('strips path + extension, lower-cases', () => {
    expect(stem('assets/models/Anvil_Hammer.fbx')).toBe('anvil_hammer');
  });
});

describe('analyzeMirrorCoverage', () => {
  const assets: Asset[] = [
    { id: 'r1', origin: 'roblox', path: 'models/anvil.fbx', category: '3d-model' },
    { id: 'r2', origin: 'roblox', path: 'models/hammer.fbx', category: '3d-model' },
    { id: 'w1', origin: 'web', path: 'models/anvil.glb', category: '3d-model' }, // mirrors anvil
    { id: 'r3', origin: 'roblox', path: 'tex/rock.png', category: 'texture' },
  ];

  it('counts roblox/web/mirrored per category and overall coverage', () => {
    const r = analyzeMirrorCoverage(assets);
    const models = r.byCategory.find(c => c.category === '3d-model')!;
    expect(models.roblox).toBe(2);
    expect(models.web).toBe(1);
    expect(models.mirrored).toBe(1);     // anvil mirrored
    expect(models.unmirrored).toBe(1);   // hammer not
    expect(models.coveragePct).toBe(50);
    // overall: 1 mirrored of 3 roblox -> 33%
    expect(r.overallCoveragePct).toBe(33);
  });

  it('emits a remediation manifest for the unmirrored roblox assets with target format', () => {
    const r = analyzeMirrorCoverage(assets);
    const stems = r.remediation.map(x => x.stem).sort();
    expect(stems).toEqual(['hammer', 'rock']);
    expect(r.remediation.find(x => x.stem === 'hammer')!.targetExt).toBe('.glb');
    expect(r.remediation.find(x => x.stem === 'rock')!.targetExt).toBe('.webp');
  });

  it('reports 100% coverage when there is nothing to mirror', () => {
    const r = analyzeMirrorCoverage([{ id: 'w', origin: 'web', path: 'a.glb', category: '3d-model' }]);
    expect(r.overallCoveragePct).toBe(100);
    expect(r.remediation).toHaveLength(0);
  });

  it('handles empty input', () => {
    const r = analyzeMirrorCoverage([]);
    expect(r.totalAssets).toBe(0);
    expect(r.byCategory).toEqual([]);
  });
});

/**
 * IdeaGraph benchmark — correctness contract
 *
 * The benchmark's claims only persuade if CI continuously verifies them.
 * This suite runs scaled-down versions of all three audience scenarios and
 * asserts the CORRECTNESS properties (regime recovery, retrieval accuracy,
 * deterministic roots, zero-chain-footprint channels) plus generous
 * performance floors that catch order-of-magnitude regressions without
 * being flaky on slow CI machines.
 */

process.env.KAFKA_DISABLED = '1';

import * as fs from 'fs';
import {
  loadNewsCooDataset, syntheticNewsCoo, encodeVvCoordinates,
  benchVvGraph, benchChemGraph, benchSettlement,
  runIdeagraphBenchmark, renderReportMarkdown,
  compoundLibrary, synthesizeSpectrum, encodeSpectrumCoordinates,
  DEFAULT_DATASET_PATH,
  type NewsCooRow,
} from '../../src/benchmarks/ideagraph-benchmark';
import { detectPeaks } from '../../src/spectroscopy/peak-detection';
import { FactMatrixService } from '../../src/integrations/lightrag/fact-matrix';

const FIXTURE_PRESENT = fs.existsSync(DEFAULT_DATASET_PATH);

// ── Dataset loader ────────────────────────────────────────────────────────────

describe('sparse-news-matrix-20k dataset', () => {
  (FIXTURE_PRESENT ? it : it.skip)('loads all COO rows from the fixture', () => {
    const rows = loadNewsCooDataset();
    expect(rows.length).toBe(89_591);
    const r = rows[0];
    expect(r.ticker).toMatch(/^TCK\d{5}$/);
    expect(r.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.relevance).toBeGreaterThanOrEqual(0);
    expect(r.relevance).toBeLessThanOrEqual(100);
    expect(r.sentiment).toBeGreaterThanOrEqual(-100);
    expect(r.sentiment).toBeLessThanOrEqual(100);
    expect(r.decay).toBeGreaterThan(0);
    expect(r.decay).toBeLessThanOrEqual(1);
  });

  (FIXTURE_PRESENT ? it : it.skip)('fixture contains the regime event tags', () => {
    const rows = loadNewsCooDataset();
    const tags = new Set(rows.map(r => r.eventTag).filter(Boolean));
    expect(tags.has('beurscrash')).toBe(true);
    expect(tags.has('capitulatie')).toBe(true);
  });

  it('synthetic generator is deterministic for a given seed', () => {
    const a = syntheticNewsCoo(500, 42);
    const b = syntheticNewsCoo(500, 42);
    expect(a).toEqual(b);
    const c = syntheticNewsCoo(500, 43);
    expect(a).not.toEqual(c);
  });

  it('synthetic rows respect the schema ranges', () => {
    for (const r of syntheticNewsCoo(300, 7)) {
      expect(r.relevance).toBeGreaterThanOrEqual(0);
      expect(r.relevance).toBeLessThanOrEqual(100);
      expect(r.sentiment).toBeGreaterThanOrEqual(-100);
      expect(r.sentiment).toBeLessThanOrEqual(100);
      expect(r.decay).toBeGreaterThan(0);
      expect(r.decay).toBeLessThanOrEqual(1);
    }
  });
});

// ── VV graph encoding ─────────────────────────────────────────────────────────

describe('VV graph encoding', () => {
  const row: NewsCooRow = {
    day: '2026-01-21', ticker: 'TCK00001', sector: 'InfoTech',
    relevance: 80, sentiment: -50, novelty: 60, decay: 0.9, eventTag: 'beurscrash',
  };

  it('encodes ticker, sector, channels and tag as sparse coordinates', () => {
    const coords = encodeVvCoordinates(row);
    expect(coords.length).toBe(6);   // ticker, sector, sentiment, novelty, decay, tag
    for (const c of coords) expect(c.value).not.toBe(0);
  });

  it('is deterministic: identical rows produce identical coordinates', () => {
    expect(encodeVvCoordinates(row)).toEqual(encodeVvCoordinates({ ...row }));
  });

  it('same ticker maps to the same dimension across rows', () => {
    const a = encodeVvCoordinates(row);
    const b = encodeVvCoordinates({ ...row, day: '2026-03-01', sentiment: 30 });
    expect(a[0].dim === b[0].dim || a.some(ca => b.some(cb => ca.dim === cb.dim))).toBe(true);
  });
});

// ── VV graph scenario ─────────────────────────────────────────────────────────

describe('benchVvGraph (investor scenario)', () => {
  // Fixture subset when available, synthetic otherwise — both carry the episode.
  const rows = FIXTURE_PRESENT
    ? loadNewsCooDataset().filter((_, i) => i % 8 === 0)   // ~11k rows, all days
    : syntheticNewsCoo(11_000);

  const result = benchVvGraph(rows, { knnQueries: 10 });

  it('ingests every row', () => {
    expect(result.rowsIngested).toBe(rows.length);
  });

  it('recovers the crash regime (days 60–66) from the graph', () => {
    expect(result.regime.crashDetected).toBe(true);
    expect(result.regime.crashWindowMean).toBeLessThan(result.regime.normalMean - 20);
  });

  it('recovers the capitulation flip (days 70–85)', () => {
    expect(result.regime.flipDetected).toBe(true);
    expect(result.regime.capitulationWindowMean).toBeGreaterThan(result.regime.crashWindowMean + 20);
  });

  it('sparse storage beats dense by ≥ 2 orders of magnitude', () => {
    expect(result.storage.compressionFactor).toBeGreaterThan(100);
  });

  it('ingest throughput is at least 1 000 rows/s (order-of-magnitude floor)', () => {
    expect(result.ingestRowsPerSec).toBeGreaterThan(1_000);
  });

  it('matrix root is a 64-hex Merkle commitment', () => {
    expect(result.matrixRoot).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matrix root is insertion-order independent (re-ingest reversed)', () => {
    const sample = rows.slice(0, 400);
    const a = benchVvGraph(sample, { knnQueries: 1 });
    const b = benchVvGraph([...sample].reverse(), { knnQueries: 1 });
    expect(a.matrixRoot).toBe(b.matrixRoot);
  });

  it('k-NN queries answer in bounded time', () => {
    expect(result.knnQueries).toBeGreaterThan(0);
    expect(result.knnAvgMs).toBeLessThan(5_000);
  });
});

// ── ChemGraph scenario ────────────────────────────────────────────────────────

describe('benchChemGraph (developer / science scenario)', () => {
  it('peak detection finds the expected fingerprint peaks', () => {
    const lib = compoundLibrary();
    const water = lib.find(c => c.name === 'water')!;
    const spec = synthesizeSpectrum(water, 123);
    const peaks = detectPeaks(spec.y, { minProminence: 1 }, spec.x);
    // Both water peaks (1640, 3400) within ±60 cm⁻¹
    for (const expected of water.peaks) {
      expect(peaks.some(p => Math.abs(p.x - expected.pos) < 60)).toBe(true);
    }
  });

  it('spectrum encoding maps peaks to deterministic semantic dims', () => {
    const c = compoundLibrary()[0];
    const s1 = synthesizeSpectrum(c, 5);
    const s2 = synthesizeSpectrum(c, 5);
    const p1 = detectPeaks(s1.y, { minProminence: 1 }, s1.x);
    const p2 = detectPeaks(s2.y, { minProminence: 1 }, s2.x);
    expect(encodeSpectrumCoordinates(p1)).toEqual(encodeSpectrumCoordinates(p2));
  });

  const result = benchChemGraph({ samplesPerCompound: 5 });

  it('runs the full pipeline for the whole library', () => {
    expect(result.spectraIngested).toBe(compoundLibrary().length * 5);
  });

  it('retrieval accuracy@1 ≥ 75% under noise + instrument drift', () => {
    expect(result.retrievalAccuracyAt1).toBeGreaterThanOrEqual(0.75);
  });

  it('processes at least 5 spectra/s end-to-end (floor)', () => {
    expect(result.spectraPerSec).toBeGreaterThan(5);
  });
});

// ── Settlement scenario ───────────────────────────────────────────────────────

describe('benchSettlement (user scenario)', () => {
  const result = benchSettlement({ payments: 60 });

  it('executes all payments on both paths', () => {
    expect(result.payments).toBe(60);
    expect(result.onChain.paymentsPerSec).toBeGreaterThan(0);
    expect(result.lightning.paymentsPerSec).toBeGreaterThan(0);
  });

  it('on-chain path grows the chain by one transfer per payment', () => {
    expect(result.onChain.chainTransfersAdded).toBe(60);
  });

  it('lightning path adds ZERO chain transfers for all payments', () => {
    expect(result.lightning.chainTransfersAdded).toBe(0);
  });

  it('payments-per-chain-tx equals the full batch (constant footprint)', () => {
    expect(result.paymentsPerChainTx).toBe(60);
  });
});

// ── Full report ───────────────────────────────────────────────────────────────

describe('runIdeagraphBenchmark + report', () => {
  const report = runIdeagraphBenchmark({
    maxNewsRows: 3_000, knnQueries: 5, samplesPerCompound: 3, payments: 30,
  });

  it('produces a complete report object', () => {
    expect(report.vvGraph.rowsIngested).toBe(3_000);
    expect(report.chemGraph.spectraIngested).toBeGreaterThan(0);
    expect(report.settlement.payments).toBe(30);
    expect(['fixture', 'synthetic']).toContain(report.datasetSource);
  });

  it('renders markdown with all three audience sections', () => {
    const md = renderReportMarkdown(report);
    expect(md).toContain('## For developers');
    expect(md).toContain('## For investors');
    expect(md).toContain('## For users');
    expect(md).toContain(report.vvGraph.matrixRoot);
  });

  it('report is JSON-serializable', () => {
    expect(() => JSON.stringify(report)).not.toThrow();
  });
});

// ── Cross-domain integration ──────────────────────────────────────────────────

describe('one matrix, many domains', () => {
  it('chem facts and vv facts coexist and stay separable via k-NN', () => {
    const matrix = new FactMatrixService();

    // 3 chem spectra of the same compound
    const c = compoundLibrary()[1];   // benzene
    const chemIds: string[] = [];
    for (let s = 0; s < 3; s++) {
      const spec = synthesizeSpectrum(c, 50 + s);
      const peaks = detectPeaks(spec.y, { minProminence: 1 }, spec.x);
      const f = matrix.ingestNews({
        newsId: `x_chem_${s}`, claimer: 'did:vpc:lab', source: 'chem',
        semanticCoordinates: encodeSpectrumCoordinates(peaks),
      });
      chemIds.push(f.id);
    }

    // 30 vv news facts
    for (const [i, r] of syntheticNewsCoo(30, 9).entries()) {
      matrix.ingestNews({
        newsId: `x_vv_${i}`, claimer: 'did:vpc:feed', source: 'vv',
        semanticCoordinates: encodeVvCoordinates(r),
      });
    }

    // The nearest neighbour of a chem fact must be another chem fact —
    // unrelated domains share no semantic dimensions.
    const hits = matrix.similar(chemIds[0], 2);
    expect(chemIds).toContain(hits[0].row.id);
    expect(hits[0].similarity).toBeGreaterThan(0.5);

    const stats = matrix.getStats();
    expect(stats.rows).toBe(33);
  });
});

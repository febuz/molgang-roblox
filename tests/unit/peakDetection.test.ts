import {
  detectPeaks,
  noiseThreshold,
  median,
  mad,
  summarizeSpectrum,
} from '../../src/spectroscopy/peak-detection';

/**
 * Unit tests for spectral peak detection. Spectra are explicit numeric arrays
 * (no synthetic randomness) so detection is deterministic.
 */

describe('robust statistics', () => {
  it('median + MAD', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(mad([1, 2, 3, 100])).toBeGreaterThan(0);
  });
  it('noiseThreshold rises with k', () => {
    const y = [1, 3, 2, 5, 1, 4, 2, 6]; // non-zero MAD so k matters
    expect(noiseThreshold(y, 5)).toBeGreaterThan(noiseThreshold(y, 1));
  });
});

describe('detectPeaks', () => {
  it('finds two clear peaks above the noise floor', () => {
    // flat baseline ~1 with two sharp peaks
    const y = [1, 1, 1, 9, 1, 1, 1, 1, 7, 1, 1, 1];
    const peaks = detectPeaks(y, { k: 2 });
    expect(peaks.map(p => p.index)).toEqual([3, 8]);
    expect(peaks[0].height).toBe(9);
  });

  it('maps peak positions onto the supplied x axis (wavenumber)', () => {
    const y = [0, 0, 5, 0, 0];
    const x = [400, 500, 600, 700, 800];
    const peaks = detectPeaks(y, { k: 1 }, x);
    expect(peaks[0].x).toBe(600);
  });

  it('respects minDistance, keeping the taller of two close peaks', () => {
    const y = [0, 8, 0, 9, 0, 0, 0, 0];   // peaks at 1 (h8) and 3 (h9), 2 apart
    const peaks = detectPeaks(y, { k: 1, minDistance: 3 });
    expect(peaks).toHaveLength(1);
    expect(peaks[0].index).toBe(3);        // taller kept
  });

  it('filters low-prominence bumps', () => {
    const y = [0, 0, 10, 9, 10, 0, 0];     // a tiny dip between two equal tops
    const high = detectPeaks(y, { k: 1, minProminence: 5 });
    // neither sub-peak has prominence >= 5 over the 9 valley
    expect(high.every(p => p.prominence >= 5)).toBe(true);
  });

  it('returns nothing for a flat/empty spectrum', () => {
    expect(detectPeaks([2, 2, 2, 2])).toEqual([]);
    expect(detectPeaks([])).toEqual([]);
  });
});

describe('summarizeSpectrum', () => {
  it('reports baseline, noise, peaks and max', () => {
    const y = [1, 1, 1, 9, 1, 1];
    const s = summarizeSpectrum(y, { k: 2 });
    expect(s.points).toBe(6);
    expect(s.maxIntensity).toBe(9);
    expect(s.peaks).toHaveLength(1);
  });
});

/**
 * Spectral peak detection — the pure core of the QChem/spectroscopy ingest
 * (Engel). Operates on REAL spectra supplied by the caller (no synthetic data):
 * an intensity series y[] with an optional axis x[] (wavelength / wavenumber).
 *
 * Pipeline: robust noise threshold (median + k·MAD) → local maxima above it →
 * prominence filter → minimum-separation merge. All pure + unit-tested.
 */

export interface Peak {
  index: number;
  x: number;        // axis position (index if no axis supplied)
  height: number;   // intensity at the peak
  prominence: number;
}

export interface PeakOptions {
  /** Noise sensitivity: threshold = median + k·MAD. Default 3. */
  k?: number;
  /** Absolute intensity floor (overrides the robust threshold if higher). */
  threshold?: number;
  /** Minimum prominence (peak height above the higher neighbouring valley). */
  minProminence?: number;
  /** Minimum index separation between peaks; keep the taller. Default 1. */
  minDistance?: number;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation — robust noise estimate. */
export function mad(values: number[]): number {
  if (!values.length) return 0;
  const med = median(values);
  return median(values.map(v => Math.abs(v - med)));
}

/** Robust noise threshold = median + k·(1.4826·MAD). */
export function noiseThreshold(y: number[], k = 3): number {
  return median(y) + k * 1.4826 * mad(y);
}

/** Prominence of a local maximum at i: its height above the higher of the two
 * neighbouring valleys (the min on each side before a higher peak / the ends). */
function prominenceAt(y: number[], i: number): number {
  const h = y[i];
  let leftMin = h;
  for (let j = i - 1; j >= 0; j--) { if (y[j] > h) break; leftMin = Math.min(leftMin, y[j]); }
  let rightMin = h;
  for (let j = i + 1; j < y.length; j++) { if (y[j] > h) break; rightMin = Math.min(rightMin, y[j]); }
  // Prominence is height above the higher of the two surrounding valleys.
  return h - Math.max(leftMin, rightMin);
}

/** Detect peaks in a spectrum. */
export function detectPeaks(y: number[], opts: PeakOptions = {}, x?: number[]): Peak[] {
  const { k = 3, minProminence = 0, minDistance = 1 } = opts;
  if (!Array.isArray(y) || y.length < 3) return [];
  const thr = Math.max(opts.threshold ?? -Infinity, noiseThreshold(y, k));

  const candidates: Peak[] = [];
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] > thr && y[i] > y[i - 1] && y[i] >= y[i + 1]) {
      const prom = prominenceAt(y, i);
      if (prom >= minProminence) {
        candidates.push({ index: i, x: x && x[i] !== undefined ? x[i] : i, height: y[i], prominence: Number(prom.toFixed(6)) });
      }
    }
  }

  // Minimum-distance merge: sort by height desc, greedily keep, drop neighbours.
  candidates.sort((a, b) => b.height - a.height);
  const kept: Peak[] = [];
  for (const c of candidates) {
    if (kept.every(p => Math.abs(p.index - c.index) >= minDistance)) kept.push(c);
  }
  return kept.sort((a, b) => a.index - b.index);
}

export interface SpectrumSummary {
  points: number;
  baseline: number;
  noiseThreshold: number;
  peaks: Peak[];
  maxIntensity: number;
}

/** Summarise a spectrum: baseline, noise, and the detected peaks. */
export function summarizeSpectrum(y: number[], opts: PeakOptions = {}, x?: number[]): SpectrumSummary {
  const peaks = detectPeaks(y, opts, x);
  return {
    points: y.length,
    baseline: Number(median(y).toFixed(6)),
    noiseThreshold: Number(noiseThreshold(y, opts.k ?? 3).toFixed(6)),
    peaks,
    maxIntensity: y.length ? Math.max(...y) : 0,
  };
}

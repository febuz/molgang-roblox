/**
 * Feature capitalization — account for the hours/effort the agents spend and
 * capitalize delivered features as intangible assets (immateriële activa) on the
 * balance sheet.
 *
 * Accounting model (IAS 38 / Dutch RJ 210 immateriële vaste activa, after
 * Horngren/Bhimani for the cost side and Klaassen & Hoogendoorn for verslaggeving):
 *   - Effort is converted to labor hours, then to labor cost at a blended rate.
 *   - RESEARCH-phase cost is expensed (never an asset).
 *   - DEVELOPMENT-phase cost is capitalized to the extent it meets the
 *     recognition criteria (the `capitalizableRate`), producing an identifiable
 *     intangible asset.
 *   - The asset amortizes straight-line over its useful life; net book value =
 *     capitalized value − accumulated amortization.
 *
 * Pure, unit-tested, no I/O — the rules cannot drift.
 */

export interface EffortInputs {
  hours?: number;
  tokens?: number;
  commits?: number;
  storyPoints?: number;
}

export interface CapitalizationPolicy {
  /** € per labor hour (blended across the agent roster). */
  blendedHourlyRate: number;
  /** Convert agent tokens to equivalent labor hours (0 = ignore tokens). */
  tokensPerHour?: number;
  /** Estimate hours from commit count when explicit hours are absent. */
  hoursPerCommit?: number;
  /** Estimate hours from story points when explicit hours are absent. */
  hoursPerStoryPoint?: number;
  /** Fraction (0..1) of development cost that meets the recognition criteria. */
  capitalizableRate: number;
  /** Useful life for straight-line amortization (months). 0/undefined = no amortization. */
  usefulLifeMonths?: number;
}

export interface FeatureRecord {
  id: string;
  title: string;
  /** research → expensed; development → capitalizable. */
  phase: 'research' | 'development';
  effort: EffortInputs;
  /** Months since the feature was delivered (drives amortization). */
  deliveredMonthsAgo?: number;
}

export interface CapitalizedFeature {
  id: string;
  title: string;
  phase: 'research' | 'development';
  laborHours: number;
  laborCost: number;
  /** Capitalized intangible-asset value at recognition. */
  capitalizedValue: number;
  /** Cost expensed to P&L (research phase, or the non-capitalizable remainder). */
  expensed: number;
  accumulatedAmortization: number;
  /** capitalizedValue − accumulatedAmortization. */
  netBookValue: number;
}

const DEFAULTS = { tokensPerHour: 0, hoursPerCommit: 2, hoursPerStoryPoint: 4 };

/**
 * Convert mixed effort inputs to labor hours. Explicit `hours` wins; otherwise
 * estimate from commits + story points; tokens add equivalent hours if a
 * conversion is configured.
 */
export function estimateHours(effort: EffortInputs, policy: CapitalizationPolicy): number {
  const tph = policy.tokensPerHour ?? DEFAULTS.tokensPerHour;
  const hpc = policy.hoursPerCommit ?? DEFAULTS.hoursPerCommit;
  const hps = policy.hoursPerStoryPoint ?? DEFAULTS.hoursPerStoryPoint;

  let hours = 0;
  if (typeof effort.hours === 'number') {
    hours = effort.hours;
  } else {
    hours += (effort.commits || 0) * hpc;
    hours += (effort.storyPoints || 0) * hps;
  }
  if (tph > 0) hours += (effort.tokens || 0) / tph;
  return Number(hours.toFixed(2));
}

/** Capitalize a single feature per the policy. */
export function capitalizeFeature(f: FeatureRecord, policy: CapitalizationPolicy): CapitalizedFeature {
  const laborHours = estimateHours(f.effort, policy);
  const laborCost = Number((laborHours * policy.blendedHourlyRate).toFixed(2));
  const rate = Math.min(1, Math.max(0, policy.capitalizableRate));

  // Research is always expensed; development is capitalized to the extent of the rate.
  const capitalizedValue = f.phase === 'development' ? Number((laborCost * rate).toFixed(2)) : 0;
  const expensed = Number((laborCost - capitalizedValue).toFixed(2));

  const life = policy.usefulLifeMonths || 0;
  const elapsed = Math.max(0, f.deliveredMonthsAgo || 0);
  const accumulatedAmortization = life > 0
    ? Number((capitalizedValue * Math.min(1, elapsed / life)).toFixed(2))
    : 0;
  const netBookValue = Number((capitalizedValue - accumulatedAmortization).toFixed(2));

  return { id: f.id, title: f.title, phase: f.phase, laborHours, laborCost, capitalizedValue, expensed, accumulatedAmortization, netBookValue };
}

export interface BalanceSheet {
  perFeature: CapitalizedFeature[];
  totalLaborHours: number;
  totalLaborCost: number;
  /** Gross capitalized intangible assets at recognition. */
  totalCapitalized: number;
  totalAmortization: number;
  /** Net immateriële activa on the balance sheet. */
  netIntangibleAssets: number;
  /** Cost expensed to the P&L (research + non-capitalizable). */
  totalExpensed: number;
}

/** Roll features up into the intangible-asset section of the balance sheet. */
export function balanceSheet(features: FeatureRecord[], policy: CapitalizationPolicy): BalanceSheet {
  const perFeature = features.map(f => capitalizeFeature(f, policy));
  const sum = (sel: (c: CapitalizedFeature) => number) => Number(perFeature.reduce((a, c) => a + sel(c), 0).toFixed(2));
  const totalCapitalized = sum(c => c.capitalizedValue);
  const totalAmortization = sum(c => c.accumulatedAmortization);
  return {
    perFeature,
    totalLaborHours: sum(c => c.laborHours),
    totalLaborCost: sum(c => c.laborCost),
    totalCapitalized,
    totalAmortization,
    netIntangibleAssets: Number((totalCapitalized - totalAmortization).toFixed(2)),
    totalExpensed: sum(c => c.expensed),
  };
}

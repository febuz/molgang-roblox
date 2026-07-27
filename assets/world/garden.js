/* garden.js — every player's own multi-plot garden: real crop-nutrition
 * chemistry, walkable in the 3D world.
 *
 * This does NOT invent a second fertilizer/crop economy. The game already
 * has one real system (ported from the Roblox Lua design): collect
 * elements -> synthesize real fertilizer compounds (urea, DAP, MOP, ...)
 * in the Fertilizer Lab -> apply their real N-P-K grades to a crop under
 * Liebig's law of the minimum (see world.js buildFarm()/liebig()). The
 * garden is the walkable, multi-plot, VR-reachable front end for that SAME
 * data — crops and fertilisers are passed in from moleculia.json's
 * meta.crops / meta.fertilizers, not redefined here.
 *
 * "Grow a Garden", but real: growth rate is set by whichever of N, P, K,
 * water or pH is scarcest (Michaelis-Menten uptake curves against the
 * crop's real idealNPK/idealPH — the existing single-plot Farm parses
 * idealPH but never uses it; this fills that gap). Deficiencies show the
 * real symptoms: N -> chlorosis (old leaves yellow), P -> purple tint,
 * K -> scorched leaf edges, drought -> wilting.
 *
 * Pure state machine, no three.js: world.js renders it, tests drive it
 * through window.__garden. Each plot has a fixed soil pH (a little
 * different per plot) so picking the right crop for the spot matters, the
 * same way it would on a real field. Persisted per player in localStorage,
 * including catch-up growth while away (capped).
 */

const KM = { N: 60, P: 25, K: 45 };     // Michaelis-Menten half-saturation, mg available
const WATER_KM = 8;                     // mm
const EVAP_MM_S = 0.010;                // sunny-world evaporation
const AWAY_CAP_S = 3600;                // catch-up growth cap while away
const PLOT_PH = [5.4, 6.0, 6.6, 7.0, 5.8, 6.3];   // fixed per-plot soil pH

function michaelis(avail, km) { return avail / (avail + km); }

export function newPlot(i) {
  return { crop: null, growth: 0, health: 1,
           soil: { N: 70, P: 35, K: 55, water: 20, ph: PLOT_PH[i % PLOT_PH.length] } };
}

export class Garden {
  constructor(nPlots = 6) {
    this.plots = Array.from({ length: nPlots }, (_, i) => newPlot(i));
    this.harvested = 0;
  }

  factors(p, crop) {
    if (!p.crop || !crop) return null;
    const [idealN, idealP, idealK] = crop.idealNPK;
    // Half-saturation scales with the crop's own appetite, so a hungry
    // crop (e.g. rice, idealN=150) isn't punished for needing more mg.
    const f = {
      N: michaelis(p.soil.N, KM.N * idealN / 100),
      P: michaelis(p.soil.P, KM.P * idealP / 100),
      K: michaelis(p.soil.K, KM.K * idealK / 100),
      water: michaelis(p.soil.water, WATER_KM),
      licht: 1.0,                        // Moleculia sun is generous
      ph: 1.0,
    };
    const [lo, hi] = crop.idealPH || [5.5, 7.5];
    if (p.soil.ph < lo) f.ph = Math.max(0.15, 1 - (lo - p.soil.ph) * 0.9);
    if (p.soil.ph > hi) f.ph = Math.max(0.15, 1 - (p.soil.ph - hi) * 0.9);
    return f;
  }

  limiting(p, crop) {
    const f = this.factors(p, crop);
    if (!f) return null;
    let worst = 'N', v = 2;
    for (const k of Object.keys(f)) if (f[k] < v) { v = f[k]; worst = k; }
    return { name: worst, value: v };
  }

  symptoms(p, crop) {
    const s = [];
    if (!p.crop || !crop) return s;
    const f = this.factors(p, crop);
    if (f.water < 0.45) s.push('slap');           // wilting
    if (f.N < 0.5) s.push('geel');                // chlorosis, old leaves
    if (f.P < 0.5) s.push('paars');               // anthocyanin build-up
    if (f.K < 0.5) s.push('bladrand');            // marginal scorch
    if (f.ph < 0.6) s.push('ph');                 // wrong crop for this soil
    return s;
  }

  step(dt, cropOf) {
    for (const p of this.plots) {
      p.soil.water = Math.max(0, p.soil.water - EVAP_MM_S * dt);
      if (!p.crop || p.growth >= 1) continue;
      const crop = cropOf(p.crop);
      if (!crop) continue;
      const f = this.factors(p, crop);
      const lim = Math.min(f.N, f.P, f.K, f.water, f.licht, f.ph); // Liebig
      const gmax = 1 / ((crop.growthDays || 4) * 120);    // real pacing
      const dg = gmax * lim * dt;
      if (dg <= 0) continue;
      p.growth = Math.min(1, p.growth + dg);
      const [idealN, idealP, idealK] = crop.idealNPK;
      p.soil.N = Math.max(0, p.soil.N - idealN * 0.35 * dg);
      p.soil.P = Math.max(0, p.soil.P - idealP * 0.35 * dg);
      p.soil.K = Math.max(0, p.soil.K - idealK * 0.35 * dg);
      p.soil.water = Math.max(0, p.soil.water - 8 * dg);
      if (lim < 0.4) p.health = Math.max(0.3, p.health - 0.010 * dt);
      else if (lim > 0.75) p.health = Math.min(1, p.health + 0.004 * dt);
    }
  }

  sow(i, cropId) {
    const p = this.plots[i];
    if (p.crop) return { ok: false, msg: 'Hier groeit al iets — oogst eerst' };
    p.crop = cropId; p.growth = 0.02; p.health = 1;
    return { ok: true, msg: 'Gezaaid' };
  }

  waterPlot(i, mm = 18) {
    this.plots[i].soil.water = Math.min(60, this.plots[i].soil.water + mm);
    return { ok: true, msg: `💧 +${mm} mm water` };
  }

  // fert = one of the game's REAL synthesized fertiliser records
  // ({npk:[N,P,K], name}), the same ones the Fertilizer Lab produces —
  // the garden never invents its own fertiliser grades.
  fertilise(i, fert) {
    if (!fert) return { ok: false, msg: 'Geen meststof' };
    const p = this.plots[i];
    p.soil.N = Math.min(400, p.soil.N + fert.npk[0]);
    p.soil.P = Math.min(300, p.soil.P + fert.npk[1]);
    p.soil.K = Math.min(400, p.soil.K + fert.npk[2]);
    return { ok: true, msg: `${fert.name} gestrooid (NPK ${fert.npk.join('-')})` };
  }

  harvest(i, cropOf) {
    const p = this.plots[i];
    if (!p.crop) return { ok: false, msg: 'Niets om te oogsten' };
    if (p.growth < 0.95) {
      return { ok: false, msg: `Nog niet rijp (${Math.round(p.growth * 100)}%)` };
    }
    const crop = cropOf(p.crop);
    // Same payout shape as the single-plot Farm: growthDays * 100 * yield —
    // one consistent economy whether you use the menu or walk the garden.
    const pay = Math.round((crop ? crop.growthDays : 4) * 100 * p.health);
    const name = crop ? crop.name : p.crop;
    p.crop = null; p.growth = 0; p.health = 1;
    this.harvested += 1;
    return { ok: true, pay, msg: `${name} geoogst: +${pay} MolCoins `
             + `(${Math.round(100 * p.health)}% gezond)` };
  }

  hint(i, cropOf) {
    const p = this.plots[i];
    if (!p.crop) return 'Kies een gewas en zaai';
    const crop = cropOf(p.crop);
    if (!crop) return '';
    const lim = this.limiting(p, crop);
    if (lim.name === 'ph') {
      return `Verkeerde grond voor ${crop.name} (pH ${p.soil.ph.toFixed(1)}, `
        + `wil ${crop.idealPH[0]}–${crop.idealPH[1]}) — probeer een ander vak`;
    }
    if (lim.name === 'water') return 'Dorst — geef water';
    if (p.growth >= 0.95) return 'Rijp! Oogst maar';
    return `Beperkt door ${lim.name} — bemest met de juiste meststof`;
  }

  // ---- persistence -----------------------------------------------------
  save(storage, now = Date.now()) {
    try {
      storage.setItem('molgang.garden.v1',
        JSON.stringify({ t: now, plots: this.plots, harvested: this.harvested }));
    } catch { /* quota */ }
  }

  static load(storage, cropOf, now = Date.now()) {
    const g = new Garden();
    try {
      const raw = storage.getItem('molgang.garden.v1');
      if (!raw) return g;
      const d = JSON.parse(raw);
      if (Array.isArray(d.plots) && d.plots.length === g.plots.length) {
        g.plots = d.plots;
        g.harvested = d.harvested || 0;
        const away = Math.min(AWAY_CAP_S, Math.max(0, (now - d.t) / 1000));
        for (let k = 0; k < away; k += 5) g.step(5, cropOf);
      }
    } catch { /* fresh garden */ }
    return g;
  }
}

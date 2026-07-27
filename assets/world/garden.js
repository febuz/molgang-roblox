/* garden.js — every player's own garden: honest crop-nutrition chemistry.
 *
 * "Grow a Garden", but real: growth follows Liebig's law of the minimum
 * over nitrogen, phosphorus, potassium, water, light and pH — the factor
 * in shortest supply sets the pace. Crops have real N:P:K appetites
 * (wheat is N-hungry, tomato K-hungry, sunflower loves P/K), fertilisers
 * carry real N-P-K grades (urea 46-0-0, DAP 18-46-0, MOP 0-0-60, lime
 * for pH), and deficiencies show the real symptoms: N -> chlorosis
 * (old leaves yellow), P -> purple tint + stunting, K -> scorched leaf
 * edges, drought -> wilting.
 *
 * Pure state machine, no three.js: world.js renders it, tests drive it
 * through window.__garden. Persisted per player in localStorage,
 * including catch-up growth while away (capped).
 */

export const CROPS = {
  tarwe: { name: 'Tarwe 🌾', gmax: 1 / 420, seed: 40, yield: 260,
           // nutrient demand mg per full plant + uptake ratio
           need: { N: 260, P: 90, K: 140 }, water: 26, ph: [5.8, 7.2] },
  tomaat: { name: 'Tomaat 🍅', gmax: 1 / 540, seed: 60, yield: 420,
            need: { N: 200, P: 110, K: 320 }, water: 34, ph: [5.8, 6.8] },
  zonnebloem: { name: 'Zonnebloem 🌻', gmax: 1 / 480, seed: 50, yield: 330,
                need: { N: 160, P: 150, K: 260 }, water: 30, ph: [6.0, 7.5] },
};

export const FERTILISERS = {
  ureum: { name: 'Ureum 46-0-0', cost: 35, N: 180, P: 0, K: 0, dph: -0.08 },
  dap: { name: 'DAP 18-46-0', cost: 45, N: 70, P: 180, K: 0, dph: -0.04 },
  mop: { name: 'Kalium (MOP) 0-0-60', cost: 40, N: 0, P: 0, K: 200, dph: 0 },
  kalk: { name: 'Kalk (pH omhoog)', cost: 25, N: 0, P: 0, K: 0, dph: +0.35 },
};

const KM = { N: 60, P: 25, K: 45 };     // half-saturation, mg available
const WATER_KM = 8;                     // mm
const EVAP_MM_S = 0.010;                // sunny-world evaporation
const AWAY_CAP_S = 3600;                // catch-up growth cap while away

function michaelis(avail, km) { return avail / (avail + km); }

export function newPlot() {
  return { crop: null, growth: 0, health: 1,
           soil: { N: 90, P: 45, K: 70, water: 22, ph: 6.6 } };
}

export class Garden {
  constructor(nPlots = 6) {
    this.plots = Array.from({ length: nPlots }, newPlot);
    this.harvested = 0;
  }

  factors(p) {
    if (!p.crop) return null;
    const c = CROPS[p.crop];
    const f = {
      N: michaelis(p.soil.N, KM.N),
      P: michaelis(p.soil.P, KM.P),
      K: michaelis(p.soil.K, KM.K),
      water: michaelis(p.soil.water, WATER_KM),
      licht: 1.0,                        // Moleculia sun is generous
      ph: 1.0,
    };
    const [lo, hi] = c.ph;
    if (p.soil.ph < lo) f.ph = Math.max(0.15, 1 - (lo - p.soil.ph) * 0.9);
    if (p.soil.ph > hi) f.ph = Math.max(0.15, 1 - (p.soil.ph - hi) * 0.9);
    return f;
  }

  limiting(p) {
    const f = this.factors(p);
    if (!f) return null;
    let worst = 'N', v = 2;
    for (const k of Object.keys(f)) if (f[k] < v) { v = f[k]; worst = k; }
    return { name: worst, value: v };
  }

  symptoms(p) {
    // Real visual diagnostics, worst first.
    const s = [];
    if (!p.crop) return s;
    const f = this.factors(p);
    if (f.water < 0.45) s.push('slap');           // wilting
    if (f.N < 0.5) s.push('geel');                // chlorosis, old leaves
    if (f.P < 0.5) s.push('paars');               // anthocyanin build-up
    if (f.K < 0.5) s.push('bladrand');            // marginal scorch
    if (f.ph < 0.6) s.push('ph');
    return s;
  }

  step(dt) {
    for (const p of this.plots) {
      p.soil.water = Math.max(0, p.soil.water - EVAP_MM_S * dt);
      if (!p.crop || p.growth >= 1) continue;
      const c = CROPS[p.crop];
      const f = this.factors(p);
      const lim = Math.min(f.N, f.P, f.K, f.water, f.licht, f.ph); // Liebig
      const dg = c.gmax * lim * dt;
      if (dg <= 0) continue;
      p.growth = Math.min(1, p.growth + dg);
      // Growing tissue takes up nutrients in the crop's own ratio.
      p.soil.N = Math.max(0, p.soil.N - c.need.N * dg);
      p.soil.P = Math.max(0, p.soil.P - c.need.P * dg);
      p.soil.K = Math.max(0, p.soil.K - c.need.K * dg);
      p.soil.water = Math.max(0, p.soil.water - c.water * dg);
      // Sustained deficiency slowly costs health (yield at harvest).
      if (lim < 0.4) p.health = Math.max(0.3, p.health - 0.010 * dt);
      else if (lim > 0.75) p.health = Math.min(1, p.health + 0.004 * dt);
    }
  }

  sow(i, crop) {
    const p = this.plots[i];
    if (p.crop) return { ok: false, msg: 'Hier groeit al iets — oogst eerst' };
    if (!CROPS[crop]) return { ok: false, msg: 'Onbekend gewas' };
    p.crop = crop; p.growth = 0.02; p.health = 1;
    return { ok: true, cost: CROPS[crop].seed,
             msg: `${CROPS[crop].name} gezaaid` };
  }

  waterPlot(i, mm = 18) {
    const p = this.plots[i];
    p.soil.water = Math.min(60, p.soil.water + mm);
    return { ok: true, msg: `💧 +${mm} mm water` };
  }

  fertilise(i, kind) {
    const f = FERTILISERS[kind];
    if (!f) return { ok: false, msg: 'Onbekende meststof' };
    const p = this.plots[i];
    p.soil.N = Math.min(400, p.soil.N + f.N);
    p.soil.P = Math.min(300, p.soil.P + f.P);
    p.soil.K = Math.min(400, p.soil.K + f.K);
    p.soil.ph = Math.min(8.2, Math.max(4.5, p.soil.ph + f.dph));
    return { ok: true, cost: f.cost, msg: `${f.name} gestrooid` };
  }

  harvest(i) {
    const p = this.plots[i];
    if (!p.crop) return { ok: false, msg: 'Niets om te oogsten' };
    if (p.growth < 0.95) {
      return { ok: false,
               msg: `Nog niet rijp (${Math.round(p.growth * 100)}%)` };
    }
    const c = CROPS[p.crop];
    const pay = Math.round(c.yield * p.health);
    const name = c.name;
    p.crop = null; p.growth = 0; p.health = 1;
    this.harvested += 1;
    return { ok: true, pay, msg: `${name} geoogst: +${pay} MolCoins `
             + `(gezondheid ${Math.round(100 * (pay / c.yield))}%)` };
  }

  // ---- persistence -----------------------------------------------------
  save(storage, now = Date.now()) {
    try {
      storage.setItem('molgang.garden.v1',
        JSON.stringify({ t: now, plots: this.plots,
                         harvested: this.harvested }));
    } catch { /* quota */ }
  }

  static load(storage, now = Date.now()) {
    const g = new Garden();
    try {
      const raw = storage.getItem('molgang.garden.v1');
      if (!raw) return g;
      const d = JSON.parse(raw);
      if (Array.isArray(d.plots) && d.plots.length === g.plots.length) {
        g.plots = d.plots;
        g.harvested = d.harvested || 0;
        // Catch-up: plants kept drinking/growing while you were away.
        const away = Math.min(AWAY_CAP_S, Math.max(0, (now - d.t) / 1000));
        for (let k = 0; k < away; k += 5) g.step(5);
      }
    } catch { /* fresh garden */ }
    return g;
  }
}

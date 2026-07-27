/* MOLGANG viscosity sim — 1:1 JS port of the Python reference
 * (molgang-web/simulation/viscosity_lab/viscosity_core.py).
 *
 * Stirring of steel-slag slurry (5 um particles, 1-100 wt% solids) in a
 * cylindrical tank, top-down 2D stable-fluids solver (Stam GDC 2003 with
 * implicit Gauss-Seidel diffusion: unconditionally stable from water to
 * paste). Krieger-Dougherty + Bingham yield rheology at the Metzner-Otto
 * shear rate; torque-limited mains stirrer with Np(Re) power correlation,
 * stall current and a thermal breaker; wall-socket kW/kWh meter; hindered
 * Stokes settling with a packed-bed cap.
 *
 * Parity contract: tests/test_viscosity_sim_parity.py runs this file under
 * node and compares against golden values from the Python proof suite.
 * Change formulas ONLY together with the Python reference.
 */

export const RHO_WATER = 1000.0;
export const RHO_SLAG = 3400.0;
export const ETA_WATER = 1.0e-3;
export const PHI_MAX = 0.58;
export const INTRINSIC_VISC = 2.5;
export const PHI_YIELD_ONSET = 0.20;
export const TAU0 = 3.0;
export const KS_METZNER_OTTO = 11.0;
export const D_PARTICLE = 5.0e-6;
export const GRAVITY = 9.81;
export const GAMMA_MIN = 0.05;
export const ETA_CAP = 1.0e6;
export const PHI_PACK_BED = 0.62;
export const ELECTRICITY_EUR_PER_KWH = 0.30;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* ------------------------------------------------------------------ */
export class SlurryRheology {
  constructor({
    rhoSolid = RHO_SLAG, rhoLiquid = RHO_WATER, etaLiquid = ETA_WATER,
    phiMax = PHI_MAX, intrinsic = INTRINSIC_VISC,
    phiYield = PHI_YIELD_ONSET, tau0 = TAU0,
  } = {}) {
    this.rhoSolid = rhoSolid; this.rhoLiquid = rhoLiquid;
    this.etaLiquid = etaLiquid; this.phiMax = phiMax;
    this.intrinsic = intrinsic; this.phiYield = phiYield; this.tau0 = tau0;
  }

  phiFromW(w) {
    w = clamp(w, 0, 1);
    const vs = w / this.rhoSolid, vl = (1 - w) / this.rhoLiquid;
    return (vs + vl) > 0 ? vs / (vs + vl) : 0;
  }

  rhoMix(w) {
    w = clamp(w, 0, 1);
    return 1 / (w / this.rhoSolid + (1 - w) / this.rhoLiquid);
  }

  etaInfinite(phi) {
    const ratio = Math.min(phi / this.phiMax, 0.9998);
    const eta = this.etaLiquid * Math.pow(1 - ratio, -this.intrinsic * this.phiMax);
    return Math.min(eta, ETA_CAP);
  }

  tauYield(phi) {
    if (phi <= this.phiYield) return 0;
    const gap = Math.max(this.phiMax - phi, 1e-4);
    return this.tau0 * Math.pow((phi - this.phiYield) / gap, 2);
  }

  apparentViscosity(phi, gammaDot) {
    const g = Math.max(gammaDot, GAMMA_MIN);
    return Math.min(this.etaInfinite(phi) + this.tauYield(phi) / g, ETA_CAP);
  }

  settlingVelocity(phi) {
    const v0 = (this.rhoSolid - this.rhoLiquid) * GRAVITY * D_PARTICLE * D_PARTICLE
      / (18 * this.etaLiquid);
    const tauHold = 0.5;
    const hind = Math.pow(clamp(1 - phi, 0, 1), 4.65);
    return v0 * hind * Math.exp(-this.tauYield(phi) / tauHold);
  }
}

/* ------------------------------------------------------------------ */
export class FluidGrid2D {
  constructor(n = 64, tankDiameter = 0.40) {
    this.n = n;
    this.diameter = tankDiameter;
    this.dx = tankDiameter / n;
    const n2 = n * n;
    this.u = new Float64Array(n2);
    this.v = new Float64Array(n2);
    this.c = new Float64Array(n2);
    this.cx = (n - 1) / 2; this.cy = (n - 1) / 2;
    this.radiusCells = n / 2 - 1.5;
    this.liquid = new Uint8Array(n2);
    this.r = new Float64Array(n2);
    this.nLiquidCells = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const rr = Math.hypot(x - this.cx, y - this.cy);
        this.r[y * n + x] = rr;
        if (rr <= this.radiusCells) { this.liquid[y * n + x] = 1; this.nLiquidCells++; }
      }
    }
    this._p = new Float64Array(n2);
    this._div = new Float64Array(n2);
    this._tmp = new Float64Array(n2);
  }

  // Red-black Gauss-Seidel for (1 + a*nliq) x = x0 + a * sum(liquid nb)
  _gsSolve(x, x0, a, iters) {
    const n = this.n, L = this.liquid;
    for (let it = 0; it < iters; it++) {
      for (let color = 0; color < 2; color++) {
        for (let y = 1; y < n - 1; y++) {
          for (let xx = 1 + ((y + color) & 1); xx < n - 1; xx += 2) {
            const i = y * n + xx;
            if (!L[i]) continue;
            let s = 0, nl = 0;
            if (L[i + 1]) { s += x[i + 1]; nl++; }
            if (L[i - 1]) { s += x[i - 1]; nl++; }
            if (L[i + n]) { s += x[i + n]; nl++; }
            if (L[i - n]) { s += x[i - n]; nl++; }
            x[i] = (x0[i] + a * s) / (1 + a * nl);
          }
        }
      }
    }
    for (let i = 0; i < n * n; i++) if (!L[i]) x[i] = 0;
  }

  diffuse(field, nu, dt, iters = 20) {
    const a = nu * dt / (this.dx * this.dx);
    if (a < 1e-9) return;
    this._tmp.set(field);
    this._gsSolve(field, this._tmp, a, iters);
  }

  project(iters = 30) {
    const n = this.n, L = this.liquid, dx = this.dx;
    const p = this._p, div = this._div;
    p.fill(0); div.fill(0);
    for (let y = 1; y < n - 1; y++) {
      for (let x = 1; x < n - 1; x++) {
        const i = y * n + x;
        if (!L[i]) continue;
        div[i] = ((this.u[i + 1] - this.u[i - 1])
          + (this.v[i + n] - this.v[i - n])) / (2 * dx);
      }
    }
    const dx2 = dx * dx;
    for (let it = 0; it < iters; it++) {
      for (let color = 0; color < 2; color++) {
        for (let y = 1; y < n - 1; y++) {
          for (let x = 1 + ((y + color) & 1); x < n - 1; x += 2) {
            const i = y * n + x;
            if (!L[i]) continue;
            let s = 0, nl = 0;
            if (L[i + 1]) { s += p[i + 1]; nl++; }
            if (L[i - 1]) { s += p[i - 1]; nl++; }
            if (L[i + n]) { s += p[i + n]; nl++; }
            if (L[i - n]) { s += p[i - n]; nl++; }
            p[i] = (s - dx2 * div[i]) / Math.max(nl, 1);
          }
        }
      }
    }
    // Neumann-mirrored gradient at solid neighbours (see Python ref).
    for (let y = 1; y < n - 1; y++) {
      for (let x = 1; x < n - 1; x++) {
        const i = y * n + x;
        if (!L[i]) continue;
        const pc = p[i];
        const pr = L[i + 1] ? p[i + 1] : pc, pl = L[i - 1] ? p[i - 1] : pc;
        const pd = L[i + n] ? p[i + n] : pc, pu = L[i - n] ? p[i - n] : pc;
        this.u[i] -= (pr - pl) / (2 * dx);
        this.v[i] -= (pd - pu) / (2 * dx);
      }
    }
    this._zeroSolids();
  }

  _zeroSolids() {
    for (let i = 0; i < this.n * this.n; i++) {
      if (!this.liquid[i]) { this.u[i] = 0; this.v[i] = 0; }
    }
  }

  _bilinear(f, gx, gy) {
    const n = this.n;
    gx = clamp(gx, 0, n - 1.001); gy = clamp(gy, 0, n - 1.001);
    const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0;
    const i = y0 * n + x0;
    return (1 - fy) * ((1 - fx) * f[i] + fx * f[i + 1])
      + fy * ((1 - fx) * f[i + n] + fx * f[i + n + 1]);
  }

  advectField(field, dt) {
    const n = this.n, k = dt / this.dx, out = this._tmp;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        out[i] = this.liquid[i]
          ? this._bilinear(field, x - this.u[i] * k, y - this.v[i] * k) : 0;
      }
    }
    field.set(out);
  }

  advectVelocity(dt) {
    const n = this.n, k = dt / this.dx;
    const u2 = new Float64Array(n * n), v2 = new Float64Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (!this.liquid[i]) continue;
        const gx = x - this.u[i] * k, gy = y - this.v[i] * k;
        u2[i] = this._bilinear(this.u, gx, gy);
        v2[i] = this._bilinear(this.v, gx, gy);
      }
    }
    this.u.set(u2); this.v.set(v2);
    this._zeroSolids();
  }

  advectSolids(dt) {
    let tot0 = this.totalPhi();
    tot0 = Math.min(tot0, this.nLiquidCells * PHI_PACK_BED * 0.995);
    this.advectField(this.c, dt);
    const tot1 = this.totalPhi();
    if (tot1 > 1e-12) {
      const s = tot0 / tot1;
      for (let i = 0; i < this.c.length; i++) this.c[i] *= s;
    }
    let excess = 0, roomCount = 0;
    for (let i = 0; i < this.c.length; i++) {
      if (!this.liquid[i]) continue;
      if (this.c[i] > PHI_PACK_BED) { excess += this.c[i] - PHI_PACK_BED; this.c[i] = PHI_PACK_BED; }
      else if (this.c[i] < PHI_PACK_BED * 0.98) roomCount++;
    }
    if (excess > 0 && roomCount > 0) {
      const add = excess / roomCount;
      for (let i = 0; i < this.c.length; i++) {
        if (this.liquid[i] && this.c[i] < PHI_PACK_BED * 0.98) {
          this.c[i] = Math.min(this.c[i] + add, PHI_PACK_BED);
        }
      }
    }
  }

  applyImpeller(theta, omega, rImpM, dt, nBlades = 2, coupling = 6.0, uCap = 2.0) {
    const n = this.n, halfW = Math.PI / nBlades * 0.45;
    const blend = Math.min(1, coupling * dt);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (!this.liquid[i]) continue;
        const rM = this.r[i] * this.dx;
        if (rM >= rImpM) continue;
        const ang = Math.atan2(y - this.cy, x - this.cx);
        let onBlade = false;
        for (let b = 0; b < nBlades; b++) {
          const tb = theta + b * (2 * Math.PI / nBlades);
          let d = ang - tb;
          d = Math.atan2(Math.sin(d), Math.cos(d)); // wrap to [-pi, pi]
          if (Math.abs(d) < halfW) { onBlade = true; break; }
        }
        if (!onBlade) continue;
        const speed = clamp(omega * rM, -uCap, uCap);
        const tx = -Math.sin(ang) * speed, ty = Math.cos(ang) * speed;
        this.u[i] += (tx - this.u[i]) * blend;
        this.v[i] += (ty - this.v[i]) * blend;
      }
    }
  }

  splatVelocity(gx, gy, ux, uy, radiusCells = 5.0, blend = 0.6) {
    const n = this.n, s2 = 2 * radiusCells * radiusCells;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (!this.liquid[i]) continue;
        const w = Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / s2) * blend;
        this.u[i] += (ux - this.u[i]) * w;
        this.v[i] += (uy - this.v[i]) * w;
      }
    }
  }

  settle(rheo, dt) {
    const n = this.n, c = this.c, L = this.liquid;
    const flux = this._tmp; flux.fill(0);
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (!(L[i] && L[i + n])) continue;
        const vs = rheo.settlingVelocity(c[i]);
        const k = clamp(vs * dt / this.dx, 0, 0.45);
        flux[i] = Math.min(c[i] * k, Math.max(0, PHI_PACK_BED - c[i + n]));
      }
    }
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        c[i] -= flux[i];
        c[i + n] += flux[i];
      }
    }
  }

  addSolidsBlob(phiAmount, gx, gy, sigma = 3.0) {
    const n = this.n, s2 = 2 * sigma * sigma, w = this._tmp;
    let tot = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        w[i] = this.liquid[i]
          ? Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / s2) : 0;
        tot += w[i];
      }
    }
    if (tot <= 0) return phiAmount;
    let over = 0;
    for (let i = 0; i < n * n; i++) {
      const nw = this.c[i] + w[i] / tot * phiAmount;
      if (nw > PHI_PACK_BED) { over += nw - PHI_PACK_BED; this.c[i] = PHI_PACK_BED; }
      else this.c[i] = nw;
    }
    return over;
  }

  meanPhi() {
    let s = 0;
    for (let i = 0; i < this.c.length; i++) if (this.liquid[i]) s += this.c[i];
    return this.nLiquidCells ? s / this.nLiquidCells : 0;
  }

  totalPhi() {
    let s = 0;
    for (let i = 0; i < this.c.length; i++) if (this.liquid[i]) s += this.c[i];
    return s;
  }

  mixedness() {
    let s = 0, s2 = 0, m = this.nLiquidCells;
    if (!m) return 100;
    for (let i = 0; i < this.c.length; i++) {
      if (this.liquid[i]) { s += this.c[i]; s2 += this.c[i] * this.c[i]; }
    }
    const mean = s / m;
    if (mean < 1e-9) return 100;
    const std = Math.sqrt(Math.max(0, s2 / m - mean * mean));
    return Math.max(0, 1 - std / mean) * 100;
  }

  maxSpeed() {
    let mx = 0;
    for (let i = 0; i < this.u.length; i++) {
      const s = Math.hypot(this.u[i], this.v[i]);
      if (s > mx) mx = s;
    }
    return mx;
  }
}

/* ------------------------------------------------------------------ */
export class Stirrer {
  constructor({
    dImpeller = 0.12, kp = 70.0, npTurb = 1.5, torqueMax = 1.5,
    motorEff = 0.65, pStandby = 5.0, pStall = 300.0,
  } = {}) {
    this.d = dImpeller; this.kp = kp; this.npTurb = npTurb;
    this.torqueMax = torqueMax; this.motorEff = motorEff;
    this.pStandby = pStandby; this.pStall = pStall;
    this.rpmSet = 0; this.rpmActual = 0;
    this.pluggedIn = false; this.on = false;
    this.overload = false; this.tripped = false;
    this._overloadS = 0;
    this.theta = 0;
    this.re = 0; this.torque = 0; this.pShaft = 0; this.pElectric = 0;
    this.etaApp = ETA_WATER;
  }

  powerNumber(re) {
    re = Math.max(re, 1e-9);
    return this.kp / re + this.npTurb * re / (re + 300);
  }

  _shaft(nRps, rho, rheo, phi) {
    const gamma = KS_METZNER_OTTO * Math.max(nRps, 1e-6);
    const eta = rheo.apparentViscosity(phi, gamma);
    const re = rho * nRps * this.d * this.d / eta;
    const p = this.powerNumber(re) * rho * nRps ** 3 * this.d ** 5;
    const tq = nRps > 1e-9 ? p / (2 * Math.PI * nRps) : 0;
    return [p, tq, re, eta];
  }

  update(rho, rheo, phi, dt) {
    const running = this.pluggedIn && this.on && !this.tripped;
    const nSet = this.rpmSet / 60;
    if (!running || nSet < 1e-6) {
      this.rpmActual = 0; this.re = 0; this.torque = 0; this.pShaft = 0;
      this.pElectric = this.pluggedIn ? this.pStandby : 0;
      this.overload = false;
      this.etaApp = rheo.apparentViscosity(phi, GAMMA_MIN);
      return;
    }
    let [p, tq, re, eta] = this._shaft(nSet, rho, rheo, phi);
    let nAct = nSet;
    if (tq > this.torqueMax) {
      let lo = 0, hi = nSet;
      for (let i = 0; i < 40; i++) {
        const mid = 0.5 * (lo + hi);
        const tqM = this._shaft(Math.max(mid, 1e-6), rho, rheo, phi)[1];
        if (tqM > this.torqueMax) hi = mid; else lo = mid;
      }
      nAct = lo;
      [p, tq, re, eta] = this._shaft(Math.max(nAct, 1e-6), rho, rheo, phi);
    }
    this.rpmActual = nAct * 60;
    this.re = re; this.torque = tq; this.pShaft = p; this.etaApp = eta;
    this.pElectric = p / this.motorEff + this.pStandby;
    this.overload = nAct < 0.999 * nSet;
    if (this.overload) {
      this.pElectric = Math.max(this.pElectric, this.pStall);
      this._overloadS += dt;
      if (this._overloadS > 5) { this.tripped = true; this.on = false; }
    } else {
      this._overloadS = 0;
    }
    this.theta += Math.min(Math.abs(nAct) * 2 * Math.PI, 4 * Math.PI) * dt;
  }

  resetTrip() { this.tripped = false; this._overloadS = 0; }

  regime() {
    if (this.re <= 0) return "stil";
    if (this.re < 10) return "laminair";
    if (this.re < 1e4) return "overgang";
    return "turbulent";
  }
}

/* ------------------------------------------------------------------ */
export class PowerMeter {
  constructor(eurPerKwh = ELECTRICITY_EUR_PER_KWH) {
    this.eurPerKwh = eurPerKwh;
    this.pWatt = 0;
    this.energyKwh = 0;
  }
  add(pWatt, dt) {
    this.pWatt = pWatt;
    this.energyKwh += pWatt * dt / 3.6e6;
  }
  get costEur() { return this.energyKwh * this.eurPerKwh; }
}

/* ------------------------------------------------------------------ */
export class MixingTank {
  constructor({
    n = 64, diameter = 0.40, capacityL = 20.0, waterL = 14.0,
    wPct = 20.0, rheo = null,
  } = {}) {
    this.rheo = rheo || new SlurryRheology();
    this.grid = new FluidGrid2D(n, diameter);
    this.stirrer = new Stirrer();
    this.meter = new PowerMeter();
    this.capacityL = capacityL;
    this.waterKg = waterL * RHO_WATER / 1000;
    this.slagKg = 0;
    this.placed = true;
    this.pourQueueKg = 0;
    this.pourRateKgS = 2.0;
    this.timeS = 0;
    this.settleBoost = 200.0;
    this.settleBoostActive = false;
    this.bottomDrag = 0.3;
    if (wPct > 0) this.setComposition(wPct, true);
  }

  get volumeL() {
    return (this.waterKg / RHO_WATER + this.slagKg / RHO_SLAG) * 1000;
  }

  liquidDepthM() {
    const area = Math.PI * (this.grid.diameter / 2) ** 2;
    return Math.max(this.volumeL / 1000 / area, 1e-3);
  }

  w() {
    const tot = this.waterKg + this.slagKg;
    return tot > 0 ? this.slagKg / tot : 0;
  }

  phiBulk() { return this.rheo.phiFromW(this.w()); }

  _phiPerKg() {
    const cellVol = this.grid.dx * this.grid.dx * this.liquidDepthM();
    return (1 / RHO_SLAG) / cellVol;
  }

  addWater(liters) {
    const room = Math.max(0, this.capacityL - this.volumeL);
    const add = Math.min(liters, room);
    this.waterKg += add * RHO_WATER / 1000;
    if (add > 0) this._rescaleField();
    return add;
  }

  addSlag(kg) {
    const room = Math.max(0, this.capacityL - this.volumeL);
    const add = Math.min(kg, room / 1000 * RHO_SLAG);
    this.pourQueueKg += add;
    return add;
  }

  setComposition(wPct, instant = false) {
    // Capacity-aware lab recomposition: drain water first if the target
    // does not fit, so the tank never exceeds capacityL (Python parity).
    const w = clamp(wPct / 100, 0, 0.995);
    let targetSlag = this.waterKg * w / (1 - w);
    const volM3 = this.waterKg / RHO_WATER + targetSlag / RHO_SLAG;
    const capM3 = this.capacityL / 1000;
    if (volM3 > capM3) {
      const denom = 1 / RHO_WATER + w / Math.max((1 - w) * RHO_SLAG, 1e-9);
      this.waterKg = capM3 / denom;
      targetSlag = this.waterKg * w / (1 - w);
    }
    const delta = targetSlag - (this.slagKg + this.pourQueueKg);
    if (delta >= 0) {
      if (instant) {
        // Collapse any pending pour into the instant recomposition.
        this.slagKg = targetSlag;
        this.pourQueueKg = 0;
        this._spreadUniform();
      }
      else this.pourQueueKg += delta;
    } else {
      const takeQueue = Math.min(this.pourQueueKg, -delta);
      this.pourQueueKg -= takeQueue;
      const rest = -delta - takeQueue;
      if (this.slagKg > 1e-12) {
        const scale = Math.max(0, (this.slagKg - rest) / this.slagKg);
        for (let i = 0; i < this.grid.c.length; i++) this.grid.c[i] *= scale;
        this.slagKg *= scale;
      }
    }
    return this.w();
  }

  _spreadUniform() {
    const g = this.grid, nliq = g.nLiquidCells;
    if (!nliq) return;
    const phiCell = Math.min(this.slagKg * this._phiPerKg() / nliq, PHI_PACK_BED);
    for (let i = 0; i < g.c.length; i++) g.c[i] = g.liquid[i] ? phiCell : 0;
  }

  _rescaleField() {
    const want = this.slagKg * this._phiPerKg();
    const have = this.grid.totalPhi();
    if (have > 1e-12) {
      const s = want / have;
      for (let i = 0; i < this.grid.c.length; i++) this.grid.c[i] *= s;
    }
  }

  settleBottom() {
    this._spreadUniform();
    const g = this.grid, n = g.n;
    for (let y = 0; y < n; y++) {
      const bias = Math.max(0.1, 1 + 1.5 * (y - g.cy) / n);
      for (let x = 0; x < n; x++) g.c[y * n + x] *= bias;
    }
    this._rescaleField();
  }

  step(dt = 1 / 30, mouseSplat = null) {
    const g = this.grid, st = this.stirrer, rheo = this.rheo;
    const w = this.w(), phi = this.phiBulk(), rho = rheo.rhoMix(w);

    if (this.pourQueueKg > 1e-9) {
      const drop = Math.min(this.pourQueueKg, this.pourRateKgS * dt);
      const leftover = g.addSolidsBlob(drop * this._phiPerKg(),
        g.cx, g.cy - g.radiusCells * 0.55);
      this.pourQueueKg -= drop;
      this.slagKg += drop;
      if (leftover > 1e-9) {
        const back = leftover / this._phiPerKg();
        this.slagKg -= back;
        this.pourQueueKg += back;
      }
    }

    if (!this.placed) {
      this.meter.add(st.pluggedIn ? st.pStandby : 0, dt);
      this.timeS += dt;
      return;
    }

    st.update(rho, rheo, phi, dt);
    this.meter.add(st.pElectric, dt);
    const nu = st.etaApp / rho;

    const omega = st.rpmActual / 60 * 2 * Math.PI;
    const stirring = omega > 1e-3;
    if (stirring || mouseSplat !== null || g.maxSpeed() > 1e-4) {
      g.diffuse(g.u, nu, dt);
      g.diffuse(g.v, nu, dt);
      const umax = g.maxSpeed();
      const sub = clamp(Math.ceil(umax * dt / (3 * g.dx)), 1, 4);
      const dts = dt / sub;
      for (let s = 0; s < sub; s++) {
        if (stirring) g.applyImpeller(st.theta, omega, st.d / 2, dts);
        if (mouseSplat !== null) {
          const [gx, gy, ux, uy] = mouseSplat;
          g.splatVelocity(gx, gy, ux, uy);
        }
        g.project(16);
        g.advectVelocity(dts);
      }
      g.project(30);
      const drag = Math.exp(-this.bottomDrag * dt);
      for (let i = 0; i < g.u.length; i++) { g.u[i] *= drag; g.v[i] *= drag; }
      g.advectSolids(dt);
    }

    const quiescent = !stirring && g.maxSpeed() < 0.05;
    this.settleBoostActive = quiescent;
    g.settle(rheo, dt * (quiescent ? this.settleBoost : 1));

    this.timeS += dt;
  }

  snapshot() {
    const st = this.stirrer, rheo = this.rheo;
    const w = this.w(), phi = this.phiBulk();
    return {
      time_s: this.timeS,
      w_pct: w * 100,
      phi_pct: phi * 100,
      rho_mix: rheo.rhoMix(w),
      eta_app_pa_s: st.etaApp,
      tau_yield_pa: rheo.tauYield(phi),
      volume_l: this.volumeL,
      re_impeller: st.re,
      regime: st.regime(),
      rpm_set: st.rpmSet,
      rpm_actual: st.rpmActual,
      torque_nm: st.torque,
      p_shaft_w: st.pShaft,
      p_electric_w: st.pElectric,
      energy_kwh: this.meter.energyKwh,
      cost_eur: this.meter.costEur,
      mixedness_pct: this.grid.mixedness(),
      overload: st.overload,
      tripped: st.tripped,
      settling_mm_h: rheo.settlingVelocity(phi) * 3.6e6,
      settle_boost: this.settleBoostActive,
    };
  }
}

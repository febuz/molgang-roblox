// MOLGANG chem-lab 3D — BOF redox engine (JS port of molgang-godot
// scripts/ChemistryEngine.gd). Same balanced reactions, formation-energy
// thermodynamics, mol bookkeeping, electron accounting and heat-loss
// calibration, so the web lab and the Godot simulator agree.

export const MOLAR_MASS = { // g/mol
  Fe: 55.845, V: 50.942, Si: 28.085, Mn: 54.938, C: 12.011,
  FeO: 71.844, SiO2: 60.084, MnO: 70.938, V2O5: 181.88, CaO: 56.077,
  CO: 28.010, CO2: 44.009, O2: 31.998,
};

const DHF = { // kJ/mol formation enthalpy (298 K)
  Fe: 0, V: 0, Si: 0, Mn: 0, C: 0, O2: 0,
  FeO: -272.0, SiO2: -910.7, MnO: -385.2, V2O5: -1550.6,
  CaO: -635.1, CO: -110.5, CO2: -393.5,
};
const DGF = { // kJ/mol formation Gibbs (298 K)
  Fe: 0, V: 0, Si: 0, Mn: 0, C: 0, O2: 0,
  FeO: -251.4, SiO2: -856.3, MnO: -362.9, V2O5: -1419.5,
  CaO: -603.3, CO: -137.2, CO2: -394.4,
};

export const REACTIONS = {
  iron_oxidation:      { reactants: { Fe: 2, O2: 1 }, products: { FeO: 2 },          electrons: 4 },
  decarburization:     { reactants: { FeO: 1, C: 1 }, products: { Fe: 1, CO: 1 },     electrons: 2 },
  wustite_reduction:   { reactants: { FeO: 1, CO: 1 }, products: { Fe: 1, CO2: 1 },   electrons: 2, equilibrium: true },
  silicon_oxidation:   { reactants: { Si: 1, FeO: 2 }, products: { SiO2: 1, Fe: 2 },  electrons: 4 },
  manganese_oxidation: { reactants: { Mn: 1, FeO: 1 }, products: { MnO: 1, Fe: 1 },   electrons: 2 },
  vanadium_oxidation:  { reactants: { V: 2, FeO: 5 }, products: { V2O5: 1, Fe: 5 },   electrons: 10 },
};

const PHASE_OF = {
  Fe: 'metal', V: 'metal', Si: 'metal', Mn: 'metal', C: 'metal',
  FeO: 'slag', SiO2: 'slag', MnO: 'slag', V2O5: 'slag', CaO: 'slag',
  CO: 'gas', CO2: 'gas', O2: 'gas',
};

const T_REF = 298.15;
const R_J_MOL_K = 8.314;
const FARADAY = 96485.332;
const ACTIVITY_EPS = 1e-12;
const CP_STEEL = 0.5, CP_SLAG = 0.7;              // kJ/(kg·K)
const HEAT_LOSS_KJ_PER_S_K = 0.30, HEAT_LOSS_REF_MASS_KG = 125.0;
const MOL_PER_NM3 = 101325.0 / (8.314 * 273.15);  // ideal gas at NTP

export function reactionEquation(name) {
  const rx = REACTIONS[name];
  const side = (s) => Object.entries(s)
    .map(([sp, k]) => (k === 1 ? sp : `${k} ${sp}`)).join(' + ');
  return `${side(rx.reactants)} → ${side(rx.products)}  (${rx.electrons} e⁻)`;
}

function reactionDelta(table, name) {
  const rx = REACTIONS[name];
  let d = 0;
  for (const [sp, k] of Object.entries(rx.products)) d += k * table[sp];
  for (const [sp, k] of Object.entries(rx.reactants)) d -= k * table[sp];
  return d;
}

export function gibbsAt(tempK, name) { // Gibbs-Helmholtz linear approximation
  const dh = reactionDelta(DHF, name), dg298 = reactionDelta(DGF, name);
  const ds = (dh - dg298) / T_REF;
  return dh - tempK * ds;
}

export function equilibriumConstant(tempK, name) {
  // K = exp(-dG/RT), exponent clamped against overflow
  const expo = Math.max(-60, Math.min(60, (-gibbsAt(tempK, name) * 1000.0) / (R_J_MOL_K * tempK)));
  return Math.exp(expo);
}

export function standardCellPotential(tempK, name) {
  const n = REACTIONS[name].electrons;
  return (-gibbsAt(tempK, name) * 1000.0) / (n * FARADAY);
}

export class BofSim {
  constructor() { this.reset(); }

  reset() {
    // Same standard charge as the Godot ChemistryController
    this.metal = { Fe: 77.6, V: 2.0, Si: 0.4 };       // kg (80 kg: 97/2.5/0.5 wt%)
    this.slag = { CaO: 12.0, SiO2: 5.0, FeO: 3.0 };   // kg (20 kg: 60/25/15 wt%)
    this.gas = {};                                     // kg
    this.tempK = 1600.0;
    this.o2Nm3h = 80.0;
    this.timeS = 0.0;
    this.electronsMol = 0.0;
    this.o2InjectedMol = 0.0;
    this.running = false;
  }

  massOf(phase) { return Object.values(phase).reduce((a, b) => a + b, 0); }
  molOf(phase, sp) { return ((phase[sp] || 0) * 1000.0) / MOLAR_MASS[sp]; }
  phase(sp) { return this[PHASE_OF[sp]]; }

  addMol(sp, mol) {
    // Parity with the Godot engine: only round off numerical noise; a hard
    // clamp to zero silently destroys mass over many steps.
    const kg = (mol * MOLAR_MASS[sp]) / 1000.0;
    const ph = this.phase(sp);
    let next = (ph[sp] || 0) + kg;
    if (next < 0 && next > -1e-9) next = 0;
    ph[sp] = next;
  }

  maxExtent(name, exclude = []) {
    let lim = Infinity;
    for (const [sp, k] of Object.entries(REACTIONS[name].reactants)) {
      if (exclude.includes(sp)) continue;
      lim = Math.min(lim, this.molOf(this.phase(sp), sp) / k);
    }
    return Math.max(0, lim);
  }

  maxExtentDir(name, forward) { // reverse consumes the products
    if (forward) return this.maxExtent(name);
    let lim = Infinity;
    for (const [sp, k] of Object.entries(REACTIONS[name].products)) {
      lim = Math.min(lim, this.molOf(this.phase(sp), sp) / k);
    }
    return Math.max(0, lim);
  }

  moleFraction(sp) {
    const ph = this.phase(sp);
    const total = Object.keys(ph).reduce((a, s) => a + this.molOf(ph, s), 0);
    return total > 0 ? this.molOf(ph, sp) / total : 0;
  }

  reactionQuotient(name) { // ideal-mixture activities = in-phase mole fractions
    const rx = REACTIONS[name];
    let q = 1.0;
    for (const [sp, k] of Object.entries(rx.products)) q *= Math.pow(Math.max(this.moleFraction(sp), ACTIVITY_EPS), k);
    for (const [sp, k] of Object.entries(rx.reactants)) q /= Math.pow(Math.max(this.moleFraction(sp), ACTIVITY_EPS), k);
    return q;
  }

  reactionDrive(tempK, name) { // signed (1 - Q/K), clamped to [-1, 1]
    const k = equilibriumConstant(tempK, name);
    if (k <= 0) return 0;
    return Math.max(-1, Math.min(1, 1 - this.reactionQuotient(name) / k));
  }

  nernstPotential(tempK, name) { // E = E0 - (RT/nF)·lnQ; zero at Q = K
    const n = REACTIONS[name].electrons;
    return standardCellPotential(tempK, name)
      - ((R_J_MOL_K * tempK) / (n * FARADAY)) * Math.log(this.reactionQuotient(name));
  }

  applyReaction(name, extent, o2FromLance = false) {
    const rx = REACTIONS[name];
    for (const [sp, k] of Object.entries(rx.reactants)) {
      if (o2FromLance && sp === 'O2') continue; // lance O2 enters as it reacts
      this.addMol(sp, -k * extent);
    }
    for (const [sp, k] of Object.entries(rx.products)) this.addMol(sp, k * extent);
    // Gross electron transfer: n electrons move per unit extent, either direction
    this.electronsMol += rx.electrons * Math.abs(extent);
    return -reactionDelta(DHF, name) * extent; // kJ released (exothermic > 0)
  }

  rateMolS(name, reverse = false) { // first-order in consumed-side mole fractions
    let f = 1.0;
    const side = reverse ? REACTIONS[name].products : REACTIONS[name].reactants;
    for (const sp of Object.keys(side)) {
      const ph = this.phase(sp);
      const total = Object.keys(ph).reduce((a, s) => a + this.molOf(ph, s), 0);
      if (total <= 0) return 0;
      f *= Math.min(1, Math.max(0, this.molOf(ph, sp) / total));
    }
    return 50.0 * f;
  }

  step(dtS, activeReactions = []) {
    if (!this.running) return;
    this.timeS += dtS;
    let heatKJ = 0;

    const o2Mol = (this.o2Nm3h / 3600.0) * MOL_PER_NM3 * dtS;
    if (o2Mol > 0) {
      const extent = Math.min(o2Mol, this.maxExtent('iron_oxidation', ['O2']));
      if (extent > 0) {
        this.o2InjectedMol += extent;
        heatKJ += this.applyReaction('iron_oxidation', extent, true);
      }
    }

    for (const name of Object.keys(REACTIONS)) {
      if (name === 'iron_oxidation') continue;
      if (activeReactions.length && !activeReactions.includes(name)) continue;
      if (!REACTIONS[name].equilibrium) {
        // One-way, kinetics-limited while thermodynamically downhill
        if (gibbsAt(this.tempK, name) >= 0) continue;
        const extent = Math.min(this.rateMolS(name) * dtS, 0.25 * this.maxExtentDir(name, true));
        if (extent > 0) heatKJ += this.applyReaction(name, extent);
        continue;
      }
      // Reversible mass action (the CO/CO2 couple): drive-scaled damped steps
      const drive = this.reactionDrive(this.tempK, name);
      if (Math.abs(drive) < 1e-6) continue;
      const reverse = drive < 0;
      const rate = this.rateMolS(name, reverse);
      const limit = 0.25 * Math.abs(drive) * this.maxExtentDir(name, !reverse);
      const magnitude = Math.min(rate * dtS * Math.abs(drive), limit);
      if (magnitude > 0) heatKJ += this.applyReaction(name, reverse ? -magnitude : magnitude);
    }

    if (this.tempK > T_REF) {
      const massKg = this.massOf(this.metal) + this.massOf(this.slag);
      heatKJ -= HEAT_LOSS_KJ_PER_S_K * (massKg / HEAT_LOSS_REF_MASS_KG)
        * (this.tempK - T_REF) * dtS;
    }
    const capacity = this.massOf(this.metal) * CP_STEEL + this.massOf(this.slag) * CP_SLAG;
    if (capacity > 0) this.tempK = Math.max(T_REF, this.tempK + heatKJ / capacity);
  }

  snapshot() {
    const vTotal = (this.metal.V || 0)
      + (2 * this.molOf(this.slag, 'V2O5') * MOLAR_MASS.V) / 1000.0;
    const vInSlagKg = (2 * this.molOf(this.slag, 'V2O5') * MOLAR_MASS.V) / 1000.0;
    return {
      tempK: this.tempK,
      timeS: this.timeS,
      metalKg: this.massOf(this.metal),
      slagKg: this.massOf(this.slag),
      gasKg: this.massOf(this.gas),
      electronsMol: this.electronsMol,
      molV: this.molOf(this.metal, 'V'),
      molFeO: this.molOf(this.slag, 'FeO'),
      molV2O5: this.molOf(this.slag, 'V2O5'),
      molCO: this.molOf(this.gas, 'CO'),
      recoveryPct: vTotal > 0 ? (100.0 * vInSlagKg) / vTotal : 0,
    };
  }
}

// Parity test for the lab3d chemistry engine (JS port of the Godot
// ChemistryEngine, which has its own 85-check suite). Guards the same
// physical invariants so the two ports cannot silently drift apart.
// Run: node chemistry.test.mjs   (exit 0 = pass)

import { BofSim, REACTIONS, gibbsAt, reactionEquation, MOLAR_MASS, equilibriumConstant, standardCellPotential } from './chemistry.js';

let failures = 0;
function check(cond, msg) {
  console.log(`  ${cond ? '✓' : '✗ FAIL:'} ${msg}`);
  if (!cond) failures += 1;
}
const approx = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('\n=== lab3d chemistry.js parity suite ===\n');

// 1. Reaction table: element mol counts conserved in every equation
const ATOMS = {
  Fe: { Fe: 1 }, V: { V: 1 }, Si: { Si: 1 }, Mn: { Mn: 1 }, C: { C: 1 },
  O2: { O: 2 }, FeO: { Fe: 1, O: 1 }, SiO2: { Si: 1, O: 2 }, MnO: { Mn: 1, O: 1 },
  V2O5: { V: 2, O: 5 }, CaO: { Ca: 1, O: 1 }, CO: { C: 1, O: 1 }, CO2: { C: 1, O: 2 },
};
for (const [name, rx] of Object.entries(REACTIONS)) {
  const delta = {};
  for (const [side, sign] of [[rx.reactants, -1], [rx.products, 1]]) {
    for (const [sp, k] of Object.entries(side)) {
      for (const [el, n] of Object.entries(ATOMS[sp])) delta[el] = (delta[el] || 0) + sign * k * n;
    }
  }
  check(Object.values(delta).every((v) => v === 0), `${name}: element mol counts conserved`);
}

// 2. Thermodynamic parity with the Godot suite
check(gibbsAt(1573, 'vanadium_oxidation') < 0, 'V oxidation spontaneous at 1573 K');
check(approx(gibbsAt(1573, 'vanadium_oxidation'), -42.3, 1.0), 'dG(V ox, 1573K) ~ -42.3 kJ/mol');
check(gibbsAt(298.15, 'decarburization') > 0, 'decarburization NOT spontaneous cold');
check(gibbsAt(1573, 'decarburization') < 0, 'decarburization spontaneous at 1573 K');
check(gibbsAt(1573, 'wustite_reduction') > 0, 'FeO+CO->CO2 unfavorable at BOF temp (Boudouard)');

// 3. Mass conservation: total system mass = start + O2 fed
const sim = new BofSim();
sim.running = true;
const startMass = sim.massOf(sim.metal) + sim.massOf(sim.slag) + sim.massOf(sim.gas);
for (let i = 0; i < 600; i++) sim.step(0.1); // 60 s
const endMass = sim.massOf(sim.metal) + sim.massOf(sim.slag) + sim.massOf(sim.gas);
const o2Kg = (sim.o2InjectedMol * MOLAR_MASS.O2) / 1000.0;
check(approx(endMass, startMass + o2Kg, 1e-3), // same tolerance as the Godot suite
  `mass conserved: ${endMass.toFixed(4)} kg = ${startMass.toFixed(1)} + O2 ${o2Kg.toFixed(4)}`);
check(sim.electronsMol > 0, `electron flow tracked (${sim.electronsMol.toFixed(1)} mol e-)`);

// 4. V -> V2O5 stoichiometry is exactly 2:1 in mol
const vStartMol = (2.0 * 1000) / MOLAR_MASS.V; // 2.0 kg V charged
const vNowMol = sim.molOf(sim.metal, 'V');
const v2o5Mol = sim.molOf(sim.slag, 'V2O5');
check(approx(vStartMol - vNowMol, 2 * v2o5Mol, 1e-6),
  `V consumed (${(vStartMol - vNowMol).toFixed(2)} mol) = 2 x V2O5 formed (${v2o5Mol.toFixed(2)} mol)`);

// 5. Temperature steering (heat-loss calibration parity)
const cool = new BofSim(); cool.running = true; cool.o2Nm3h = 0; cool.tempK = 1700;
for (let i = 0; i < 300; i++) cool.step(0.1);
check(cool.tempK < 1700 && cool.tempK >= 298.15, `O2=0 cools the bath (${cool.tempK.toFixed(0)} K after 30 s)`);
const hot = new BofSim(); hot.running = true; hot.o2Nm3h = 150; hot.tempK = 1700;
for (let i = 0; i < 300; i++) hot.step(0.1);
check(hot.tempK > 1700, `O2=150 heats the bath (${hot.tempK.toFixed(0)} K after 30 s)`);

// 6. No negative inventories anywhere after a long blow
const long = new BofSim(); long.running = true;
for (let i = 0; i < 6000; i++) long.step(0.1); // 10 min
const negatives = [];
for (const phase of [long.metal, long.slag, long.gas]) {
  for (const [sp, kg] of Object.entries(phase)) if (kg < -1e-9) negatives.push(sp);
}
check(negatives.length === 0, `no negative inventories after 10 min (${negatives.join(',') || 'clean'})`);
check(long.tempK >= 298.15, `temperature floored at ambient (${long.tempK.toFixed(0)} K)`);

// 7. Equilibrium & Nernst parity (mirrors Godot tests 10/11)
for (const name of Object.keys(REACTIONS)) {
  const kEq = equilibriumConstant(1573, name);
  const dg = gibbsAt(1573, name);
  if ((dg < 0) !== (kEq > 1)) { check(false, `K/dG sign mismatch for ${name}`); }
}
check(true, 'K > 1 <=> dG < 0 for all reactions at 1573 K');
check(approx(equilibriumConstant(1573, 'wustite_reduction'), 0.2846, 0.001),
  `K(wustite, 1573K) = 0.2846 (Godot parity)`);
check(approx(standardCellPotential(1573, 'vanadium_oxidation'), 0.0439, 0.001),
  'E0(V ox, 1573K) ~ +0.0439 V');
check(standardCellPotential(1573, 'wustite_reduction') < 0, 'E0(wustite, 1573K) negative');

// CO2-flooded closed system: wustite must run in REVERSE and settle on Q = K
const eq = new BofSim();
eq.running = true; eq.o2Nm3h = 0;
eq.metal = { Fe: 60.0 };
eq.slag = { CaO: 10.0, FeO: 10.0 };
eq.gas = { CO2: 0.54, CO: 0.06 };
eq.tempK = 1573.0;
check(eq.reactionDrive(1573, 'wustite_reduction') < 0, 'CO2-flooded gas: reverse drive');
const coBefore = eq.molOf(eq.gas, 'CO');
for (let i = 0; i < 600; i++) { eq.step(1.0, ['wustite_reduction']); eq.tempK = 1573.0; }
check(eq.molOf(eq.gas, 'CO') > coBefore, 'reverse run regenerates CO');
const qOverK = eq.reactionQuotient('wustite_reduction') / equilibriumConstant(1573, 'wustite_reduction');
check(approx(qOverK, 1.0, 0.1), `isolated wustite converges to Q/K ~ 1 (${qOverK.toFixed(3)})`);
check(Math.abs(eq.nernstPotential(1573, 'wustite_reduction')) < 0.002,
  `E_nernst ~ 0 at equilibrium (${(eq.nernstPotential(1573, 'wustite_reduction') * 1000).toFixed(2)} mV)`);

// 8. Equation formatter sanity (feeds the HUD)
check(reactionEquation('vanadium_oxidation').startsWith('2 V + 5 FeO'),
  'equation formatter renders coefficients');

console.log(`\n${failures === 0 ? '✅ all parity checks passed' : `❌ ${failures} failure(s)`}\n`);
process.exit(failures === 0 ? 0 : 1);

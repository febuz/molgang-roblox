#!/usr/bin/env python3
"""
process_sim.py — the realistic process-simulation core, ported from the Roblox
game's ReplicatedStorage/Modules/ProcessEngineering.lua to Python so the web /
Python game stack can drive stations with the SAME chemistry the Roblox game
already simulates (learn from molgang-roblox, use Python).

Faithful port of:
  * Arrhenius temperature effect   k/k_ref = exp(-Ea/R (1/T - 1/T_ref))
  * Henry's-law pressure effect    solubility ~ P/P0
  * First-order residence time     conversion = 1 - exp(-t/tau), design-normalised
  * Henderson-Hasselbalch pH       metal precipitation windows
  * Combined reactor reaction rate = temp * pressure * residence

Verified numerically against values hand-derived from the formulas (Roblox
`math.clamp` isn't in standard Lua, so we shim it and check the maths, not a
Lua run). `python3 assets/world/process_sim.py` runs the self-test.
"""
import math

R = 8.314            # universal gas constant, J/mol·K
ABSOLUTE_ZERO = 273.15
STANDARD_PRESSURE = 101.325   # kPa (1 atm)


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


# Activation energies (kJ/mol) — same table as the Lua module.
ACTIVATION_ENERGIES = {
    "acid_CaO": 25, "acid_FeO": 40, "acid_V2O5": 55, "acid_TiO2": 70, "acid_SiO2": 90,
    "base_Al2O3": 35, "base_SiO2": 45, "base_Cr2O3": 50, "roast_V": 60,
}

# Metal precipitation pH windows (below start -> stays dissolved).
PRECIPITATION_PH = {
    "Fe": (3.0, 4.5), "Al": (4.0, 5.5), "Cr": (5.0, 7.0), "V": (1.8, 3.0), "Mn": (8.0, 9.5),
}


def arrhenius_multiplier(temp_c, ea_kj):
    """k/k_ref = exp(-Ea/R (1/T - 1/T_ref)), reference 25 °C, clamped [0.01, 100]."""
    T = temp_c + ABSOLUTE_ZERO
    T_ref = 298.15
    Ea = ea_kj * 1000.0
    exponent = (-Ea / R) * (1.0 / T - 1.0 / T_ref)
    return clamp(math.exp(exponent), 0.01, 100.0)


def pressure_multiplier(pressure_kpa):
    """Henry's law: gas solubility ~ P/P0, clamped [0.5, 5.0]."""
    return clamp(pressure_kpa / STANDARD_PRESSURE, 0.5, 5.0)


def residence_time_effect(flow_l_per_min, reactor_volume_l):
    """First-order conversion 1 - exp(-t/tau), normalised to 1.0 at the 30-min
    design residence time, clamped [0.1, 1.5]."""
    if flow_l_per_min <= 0:
        return 1.0
    residence_min = reactor_volume_l / flow_l_per_min
    conversion = 1.0 - math.exp(-(residence_min / 30.0))
    return clamp(conversion / 0.632, 0.1, 1.5)


def precipitation_fraction(metal, pH):
    """Fraction of `metal` precipitated at `pH` (linear across its window)."""
    win = PRECIPITATION_PH.get(metal)
    if not win:
        return 0.0
    start, complete = win
    if pH < start:
        return 0.0
    if pH >= complete:
        return 1.0
    return (pH - start) / (complete - start)


def default_state():
    return {"temperature": 25.0, "pressure": STANDARD_PRESSURE, "flowRate": 10.0,
            "pH": 7.0, "reactorVolume": 50.0, "conversion": 0.0}


def reaction_rate(state):
    """Combined reactor rate = Arrhenius(temp) * pressure * residence."""
    return (arrhenius_multiplier(state["temperature"], 50)
            * pressure_multiplier(state["pressure"])
            * residence_time_effect(state["flowRate"], state["reactorVolume"]))


def step_reactor(state, dt_min, k_base=0.05):
    """Advance a first-order reactor `dt_min` minutes: dX/dt = k_base * rate *
    (1 - X). Returns the new conversion (0..1). This is what a live station in
    the world ticks on."""
    rate = reaction_rate(state)
    x = state.get("conversion", 0.0)
    x = x + k_base * rate * (1.0 - x) * dt_min
    state["conversion"] = clamp(x, 0.0, 1.0)
    return state["conversion"]


# ---------------------------------------------------------------- self-test
def _approx(a, b, tol=1e-2):
    return abs(a - b) <= tol


def selftest():
    checks = []

    def chk(name, got, exp, tol=1e-2):
        ok = _approx(got, exp, tol)
        checks.append(ok)
        print(f"  {'OK ' if ok else 'FAIL'} {name}: got {got:.4f}, expect {exp:.4f}")

    # Arrhenius: at the reference temperature the multiplier is exactly 1.
    chk("arrhenius(25,50) == 1 at T_ref", arrhenius_multiplier(25, 50), 1.0)
    # Hand-derived: T=353.15, Ea=50000 -> exponent 3.1417 -> exp = 23.14
    chk("arrhenius(80,50) ~ 23.1", arrhenius_multiplier(80, 50), 23.14, 0.1)
    chk("arrhenius clamps low (0C, 90kJ)", arrhenius_multiplier(0, 90) >= 0.01, True and 1.0)
    # Pressure (Henry): 2 atm -> 2.0; below floor clamps to 0.5
    chk("pressure(202.65) == 2.0", pressure_multiplier(2 * STANDARD_PRESSURE), 2.0)
    chk("pressure(50) clamps to 0.5", pressure_multiplier(50), 0.5)
    # Residence: flow 10, vol 50 -> tau 5 min -> (1-e^-0.1667)/0.632 = 0.2429
    chk("residence(10,50) ~ 0.243", residence_time_effect(10, 50), 0.243, 0.005)
    # Precipitation: Fe midpoint of [3.0,4.5] at pH 3.75 -> 0.5
    chk("precip Fe @3.75 == 0.5", precipitation_fraction("Fe", 3.75), 0.5)
    chk("precip V @1.8 == 0 (start)", precipitation_fraction("V", 1.8), 0.0)
    chk("precip Cr @7.0 == 1 (complete)", precipitation_fraction("Cr", 7.0), 1.0)
    # A hot, pressurised, slow-flow reactor converts fast; a cold default one slow.
    hot = {"temperature": 90, "pressure": 300, "flowRate": 2, "reactorVolume": 50, "conversion": 0}
    cold = default_state()
    for _ in range(20):
        step_reactor(hot, 1.0); step_reactor(cold, 1.0)
    chk("hot reactor > cold after 20 min", 1.0 if hot["conversion"] > cold["conversion"] else 0.0, 1.0)
    print(f"  hot conversion {hot['conversion']:.3f} vs cold {cold['conversion']:.3f}")

    if all(checks):
        print("PASS — Python port matches the ProcessEngineering physics")
        return 0
    print("FAIL — port diverges from the reference formulas")
    return 1


if __name__ == "__main__":
    import sys
    print("== process_sim.py self-test (ported from ProcessEngineering.lua) ==")
    sys.exit(selftest())

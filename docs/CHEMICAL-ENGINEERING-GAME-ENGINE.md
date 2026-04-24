# Ideal Engine Architecture: CAD 3D Realistic Chemical Engineering Games

**Author:** VirtualPC Agent Team (Fill, Kai, Zip, Mira, Luna)
**Project:** MOLGANG Chemical Engineering Simulator
**Registered for:** Edwin Hauwert 219252713
**Date:** 2026-04-23

---

## 1. Vision

A browser-based, CAD-quality 3D Chemical Engineering simulator where students design real chemical processes using accurate thermodynamics, fluid dynamics, and reaction kinetics. The game bridges Roblox (fun entry point) to professional-grade simulation (web platform for advanced students).

---

## 2. Engine Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GAME CLIENT (Browser)                        │
├──────────┬──────────┬──────────┬──────────┬────────────────────────┤
│ Three.js │  React   │  WebGPU  │  WASM    │   Web Workers          │
│ 3D Scene │  UI/HUD  │ Compute  │ Physics  │   Background Calc      │
├──────────┴──────────┴──────────┴──────────┴────────────────────────┤
│                     Game Engine Core (TypeScript)                    │
├──────────┬──────────┬──────────┬──────────┬────────────────────────┤
│Chemistry │ Process  │ Thermo-  │ Fluid    │  Equipment             │
│Simulation│ Flowsheet│ dynamics │ Dynamics │  Library               │
│Engine    │ Editor   │ Solver   │ Solver   │  (CAD Models)          │
├──────────┴──────────┴──────────┴──────────┴────────────────────────┤
│                     Networking Layer (WebSocket)                     │
├─────────────────────────────────────────────────────────────────────┤
│                     Game Server (Node.js + WASM)                    │
├──────────┬──────────┬──────────┬──────────┬────────────────────────┤
│ Auth     │ State    │ Anti-    │ Economy  │  Educational           │
│ System   │ Sync     │ Cheat    │ Engine   │  Progress Tracker      │
├──────────┴──────────┴──────────┴──────────┴────────────────────────┤
│                     Data Layer                                      │
├──────────┬──────────┬──────────┬──────────────────────────────────┤
│ Neo4j    │ Redis    │ Postgres │ Roblox DataStore Bridge          │
│ Knowledge│ Cache    │ Player   │ Cross-Platform Sync              │
│ Graph    │          │ Data     │                                   │
└──────────┴──────────┴──────────┴──────────────────────────────────┘
```

---

## 3. 3D Rendering Stack

### 3.1 Primary: Three.js + WebGPU

- **Three.js r170+** as scene graph and rendering framework
- **WebGPU backend** for modern GPUs (Chrome 113+, Safari 18+, Samsung Internet 25+)
- **WebGL 2.0 fallback** for older devices (iPhone 15 and earlier)
- Custom **PBR shader pipeline** for realistic metal/glass/liquid materials

### 3.2 CAD-Quality Equipment Models

All chemical engineering equipment rendered as parametric 3D models:

| Equipment | Detail Level | Interactivity |
|-----------|-------------|---------------|
| Distillation Column | Internal trays visible, liquid cascade animation | Control: temperature, reflux ratio, feed position |
| CSTR Reactor | Cutaway showing agitator, baffles, cooling jacket | Control: temperature, volume, catalyst loading |
| PFR Reactor | Tubular with temperature gradient visualization | Control: length, diameter, flow rate |
| Heat Exchanger | Shell-and-tube with flow visualization | Control: hot/cold streams, fouling factor |
| Pump | Centrifugal with impeller animation | Control: speed, NPSH |
| Separator | Flash drum with vapor/liquid split | Control: pressure, temperature |
| Compressor | Multistage with intercooling | Control: compression ratio, stages |

### 3.3 Model Format

- **glTF 2.0** (Draco compressed) for all 3D assets
- **LOD system**: 3 levels per model (High/Medium/Low)
  - High: CAD-quality, internal detail, ~50K triangles
  - Medium: External detail only, ~10K triangles
  - Low: Silhouette, ~2K triangles
- **Instancing** for repeated equipment (e.g., tray stacks in columns)

### 3.4 Fluid Visualization

```
Fluid Rendering Pipeline:
  1. SPH (Smoothed Particle Hydrodynamics) in WASM
     - 10K-50K particles depending on device
     - Simulates liquid flow, cascading, mixing
  2. Marching Cubes → mesh generation (Web Worker)
  3. Volume rendering for vapor/gas phases
  4. Temperature → color mapping (cold blue → hot red)
  5. Transparency + refraction for glass vessels
```

### 3.5 Device Targets

| Device | GPU | Target FPS | Particle Count | LOD Level |
|--------|-----|-----------|----------------|-----------|
| Desktop (RTX 3060+) | WebGPU | 60 | 50K | High |
| MacBook Pro M2+ | WebGPU/Metal | 60 | 30K | High |
| iPhone 16 (A18) | WebGL 2.0 | 60 | 10K | Medium |
| Samsung Z Fold 5 (Mali-G715) | WebGL 2.0 | 60 | 15K | Medium |
| iPhone 16 Pro (A18 Pro) | WebGPU | 60 | 20K | High |
| Mid-range Android | WebGL 2.0 | 30 | 5K | Low |

---

## 4. Chemistry Simulation Engine

### 4.1 Thermodynamic Models

Implemented in **Rust compiled to WASM** for performance:

```rust
// Core thermodynamic calculations
pub struct ThermodynamicEngine {
    equation_of_state: PengRobinsonEOS,  // PR-EOS for VLE
    activity_model: NRTL,                // Non-ideal liquid mixtures
    enthalpy_model: ShomatEquation,      // Temperature-dependent H
    database: PureComponentDB,           // 200+ chemicals
}

impl ThermodynamicEngine {
    // Vapor-Liquid Equilibrium (flash calculation)
    pub fn flash_pt(&self, pressure: f64, temperature: f64,
                     feed: &Composition) -> FlashResult { ... }

    // Bubble/dew point calculation
    pub fn bubble_point(&self, pressure: f64,
                         liquid: &Composition) -> f64 { ... }

    // Enthalpy calculation (for energy balance)
    pub fn enthalpy(&self, t: f64, p: f64,
                     comp: &Composition, phase: Phase) -> f64 { ... }
}
```

### 4.2 Reaction Kinetics

```
Supported reaction types:
  - First-order irreversible: r = k * C_A
  - Second-order: r = k * C_A * C_B
  - Reversible: r = k_f * C_A - k_r * C_B
  - Catalytic (Langmuir-Hinshelwood)
  - Enzyme kinetics (Michaelis-Menten)

Arrhenius temperature dependence:
  k(T) = A * exp(-Ea / (R * T))

Reactor models:
  - Batch: dC/dt = r(C, T)
  - CSTR: F_in * C_in - F_out * C_out + V * r = 0
  - PFR: dF/dV = r(C, T)  (solved with RK4)
  - Packed Bed: Ergun equation for pressure drop
```

### 4.3 Process Flowsheet Solver

```
Flowsheet Calculation Order:
  1. Topological sort of unit operations
  2. Sequential modular: solve each unit in order
  3. Recycle streams: Wegstein acceleration or Broyden method
  4. Convergence check: mass balance < 0.001%, energy < 0.01%
  5. If not converged, iterate (max 50 iterations)

Unit Operation Models:
  - Distillation: MESH equations (Material, Equilibrium, Summation, Heat)
  - Heat Exchanger: LMTD or ε-NTU method
  - Reactor: Varies by type (see 4.2)
  - Separator: Flash calculation at operating conditions
  - Mixer/Splitter: Mass/energy balance
  - Pump/Compressor: Isentropic efficiency model
```

---

## 5. Process Flow Diagram (PFD) Editor

### 5.1 CAD-Style Interaction

- **Drag-and-drop** equipment from library palette
- **Stream connections**: click output port → drag to input port
- **Smart routing**: automatic pipe routing around equipment
- **Snap grid**: alignment helpers, auto-spacing
- **Zoom/pan**: mouse wheel + middle-button drag
- **Selection**: click, shift-click multi-select, rubber-band

### 5.2 Real-Time Simulation

When all streams are connected and conditions set:
```
User drags CSTR onto canvas → connects feed stream → sets T, V
  → Engine solves reactor equations in WASM worker
  → Results stream to Three.js for fluid animation
  → HUD shows conversion, yield, selectivity
  → If conditions dangerous: warning overlay + shake effect
```

### 5.3 Educational Overlays

- **McCabe-Thiele diagram**: auto-generated for distillation columns
- **T-xy diagram**: phase envelope for binary mixtures
- **Reaction progress chart**: conversion vs. time/volume
- **Energy balance Sankey diagram**: heat flows between units

---

## 6. Gamification Layer

### 6.1 Progression (Roblox → Web)

```
ROBLOX (Ages 8-14, Fun Entry)        WEB (Ages 14+, Advanced)
├── Level 1-10: Collect atoms          ├── Level 10-20: Design processes
├── Level 10-20: Basic synthesis       ├── Level 20-30: Optimize plants
├── Level 20-30: Fertilizer factory    ├── Level 30-40: Troubleshooting
├── Level 30+: Minigames & PvP        ├── Level 40+: Real-world cases
│                                      │
│   ← MIGRATION GATE (Level 30) →     │
│   Player data syncs to web           │
│   Advanced content unlocks           │
│   Roblox becomes "casual mode"       │
```

### 6.2 Reward System

| Action | MolCoins | XP |
|--------|----------|-----|
| Collect atom | 0 | 5 |
| Synthesize basic molecule | 10-20 | 10-20 |
| Synthesize rare/epic molecule | 40-80 | 40-80 |
| Produce fertilizer (>80% quality) | 40-60 | 40-60 |
| Complete quest | 20-300 | 20-300 |
| Design valid PFD (web only) | 100-500 | 100-500 |
| Pass certification exam (web only) | 1000 | 1000 |
| Sell on market | Varies | price/2 |

### 6.3 Certification System (Web Only)

Students completing advanced web content earn verifiable certificates:

1. **ChemE Fundamentals** - Mass/energy balance, thermo basics
2. **Reactor Design** - CSTR, PFR, packed bed design
3. **Separation Processes** - Distillation, absorption, extraction
4. **Process Design** - Full PFD with recycle, heat integration
5. **Process Safety** - HAZOP, relief valve sizing, inherent safety

---

## 7. Technology Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| 3D Rendering | Three.js + WebGPU | Cross-platform, CAD quality |
| Physics/Thermo | Rust → WASM | Native performance in browser |
| UI Framework | React 19 | Component model for HUD/menus |
| State Management | Zustand | Lightweight, no boilerplate |
| Networking | Socket.io | Real-time multiplayer |
| Backend | Node.js + Express | API server, game logic validation |
| Database | PostgreSQL + Neo4j | Player data + knowledge graph |
| Cache | Redis | Session, market prices, leaderboards |
| Message Queue | Kafka | Distributed agent/event processing |
| CI/CD | GitHub Actions | Build, test, deploy both platforms |
| Mobile | PWA + TWA | Samsung Z Fold 5, iPhone 16 |
| Asset Pipeline | Blender → glTF → Draco | CAD models to web-optimized |
| Audio | Tone.js | 3D spatial audio, dynamic music |

---

## 8. Performance Budget

```
Initial load:  < 3 seconds (60% of assets deferred)
Bundle size:   < 2 MB (main) + 5 MB (WASM) + lazy-loaded models
Memory:        < 512 MB (mobile), < 1 GB (desktop)
Frame time:    < 16.6ms (60fps) on target devices
Network:       < 50 KB/s during gameplay (WebSocket)
Offline:       Core gameplay works offline (PWA cache)
```

---

## 9. Roblox → Web Migration Path

```
Phase 1 (Current): Roblox game live, web dashboard + atom minigame
Phase 2: Web chemistry engine (port Chemistry.lua to WASM)
Phase 3: Web fertilizer factory + quest system
Phase 4: 3D PFD editor with basic equipment
Phase 5: Full thermodynamic solver + distillation
Phase 6: Multiplayer labs + certification exams
Phase 7: Enterprise deployment (university partnerships)
```

Each phase delivers a playable game. Players migrate when web content exceeds what Roblox offers.

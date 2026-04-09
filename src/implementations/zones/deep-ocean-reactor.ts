/**
 * MOLGANG-6.4: Deep Ocean Reactor Zone
 * Hydrothermal vents, radioactive elements (U, Pu, Th, Cs)
 * Boss: Admiral Thalassa
 * Temperature-based mechanics
 */

export interface Atom {
  id: string;
  element: 'U' | 'Pu' | 'Th' | 'Cs';
  position: { x: number; y: number; z: number };
  temperature: number;
  radioactivity: number;
  stability: number; // 0-100, decreases over time
}

export interface Vent {
  id: string;
  position: { x: number; y: number; z: number };
  intensity: number; // 0-100
  temperature: number; // 0-1000°C
  spawnRate: number; // atoms per second
}

export interface ZoneState {
  atoms: Map<string, Atom>;
  vents: Vent[];
  temperature: number;
  oceanCurrent: { x: number; y: number };
  bossHealth: number;
  bossPhase: 'calm' | 'active' | 'rage';
}

export class DeepOceanReactorZone {
  private state: ZoneState;
  private readonly ZONE_ID = 'deep_ocean_reactor';
  private readonly ZONE_WIDTH = 1000;
  private readonly ZONE_HEIGHT = 1000;
  private readonly ZONE_DEPTH = 500;

  constructor() {
    this.state = {
      atoms: new Map(),
      vents: [],
      temperature: 200,
      oceanCurrent: { x: 1, y: -0.5 },
      bossHealth: 1000,
      bossPhase: 'calm'
    };
    this.initializeVents();
  }

  /**
   * Initialize hydrothermal vents
   */
  private initializeVents(): void {
    const ventPositions = [
      { x: 250, y: 0, z: 100 },
      { x: 500, y: 0, z: 150 },
      { x: 750, y: 0, z: 100 },
      { x: 300, y: 300, z: 200 },
      { x: 700, y: 200, z: 180 }
    ];

    this.state.vents = ventPositions.map((pos, idx) => ({
      id: `vent_${idx}`,
      position: pos,
      intensity: 50 + Math.random() * 50,
      temperature: 400 + Math.random() * 300,
      spawnRate: 0.5 + Math.random() * 1.5
    }));
  }

  /**
   * Spawn atoms from vents
   */
  spawnAtoms(deltaTime: number): Atom[] {
    const newAtoms: Atom[] = [];
    const elements: Array<'U' | 'Pu' | 'Th' | 'Cs'> = ['U', 'Pu', 'Th', 'Cs'];

    for (const vent of this.state.vents) {
      const spawnCount = Math.floor(vent.spawnRate * deltaTime);

      for (let i = 0; i < spawnCount; i++) {
        const atom: Atom = {
          id: `atom_${Date.now()}_${Math.random()}`,
          element: elements[Math.floor(Math.random() * elements.length)],
          position: {
            x: vent.position.x + (Math.random() - 0.5) * 100,
            y: vent.position.y + (Math.random() - 0.5) * 100,
            z: vent.position.z + Math.random() * 50
          },
          temperature: vent.temperature + (Math.random() - 0.5) * 100,
          radioactivity: 50 + Math.random() * 50,
          stability: 100
        };

        this.state.atoms.set(atom.id, atom);
        newAtoms.push(atom);
      }
    }

    return newAtoms;
  }

  /**
   * Update atom physics and temperature
   */
  updateAtoms(deltaTime: number): void {
    for (const [atomId, atom] of this.state.atoms) {
      // Apply ocean current
      atom.position.x += this.state.oceanCurrent.x * deltaTime * 2;
      atom.position.y += this.state.oceanCurrent.y * deltaTime * 2;

      // Gravity (sinks slowly)
      atom.position.z = Math.max(0, atom.position.z - deltaTime * 0.1);

      // Temperature decay
      atom.temperature = Math.max(0, atom.temperature - deltaTime * 2);

      // Stability decay (radioactive decay over time)
      atom.stability = Math.max(0, atom.stability - deltaTime * 0.5);

      // Remove unstable atoms
      if (atom.stability <= 0) {
        this.state.atoms.delete(atomId);
      }

      // Boundary checking (remove out-of-bounds atoms)
      if (atom.position.x < 0 || atom.position.x > this.ZONE_WIDTH ||
          atom.position.y < 0 || atom.position.y > this.ZONE_HEIGHT ||
          atom.position.z < 0 || atom.position.z > this.ZONE_DEPTH) {
        this.state.atoms.delete(atomId);
      }
    }
  }

  /**
   * Boss AI: Admiral Thalassa
   */
  updateBossAI(deltaTime: number): any {
    const playerCount = Math.random() > 0.5 ? 1 : 0; // Simulated

    if (playerCount === 0) {
      // Boss rests
      this.state.bossHealth = Math.min(1000, this.state.bossHealth + deltaTime * 5);
      this.state.bossPhase = 'calm';
    } else {
      // Boss attacks
      if (this.state.bossHealth > 500) {
        this.state.bossPhase = 'active';
        this.state.bossHealth -= deltaTime * 10;
      } else {
        this.state.bossPhase = 'rage';
        this.state.bossHealth -= deltaTime * 20;
      }
    }

    return {
      health: this.state.bossHealth,
      phase: this.state.bossPhase,
      position: { x: 500, y: 500, z: 300 },
      threat: this.state.bossPhase === 'rage' ? 'critical' : 'moderate'
    };
  }

  /**
   * Temperature affects gameplay
   */
  getTemperatureEffect(): any {
    const temp = this.state.temperature;
    return {
      playerSlowdown: Math.max(0, (temp - 50) / 200),
      damagePerSecond: Math.max(0, (temp - 100) / 200),
      atomInstability: temp > 300 ? 'high' : temp > 150 ? 'medium' : 'low'
    };
  }

  /**
   * Get zone state
   */
  getState(): any {
    return {
      zoneId: this.ZONE_ID,
      atomCount: this.state.atoms.size,
      temperature: this.state.temperature,
      ventCount: this.state.vents.length,
      boss: {
        health: this.state.bossHealth,
        phase: this.state.bossPhase
      },
      conditions: this.getTemperatureEffect()
    };
  }

  /**
   * Tick the zone
   */
  tick(deltaTime: number): void {
    this.updateAtoms(deltaTime);
    this.updateBossAI(deltaTime);

    // Zone temperature fluctuation
    this.state.temperature += (Math.random() - 0.5) * 10 * deltaTime;
    this.state.temperature = Math.max(0, Math.min(500, this.state.temperature));
  }
}

export default DeepOceanReactorZone;

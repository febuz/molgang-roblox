/**
 * MOLGANG-6.4: Deep Ocean Reactor Zone
 * Hydrothermal vents, radioactive elements (U, Pu, Th, Cs)
 * Boss: Admiral Thalassa
 * Temperature-based mechanics
 */
export interface Atom {
    id: string;
    element: 'U' | 'Pu' | 'Th' | 'Cs';
    position: {
        x: number;
        y: number;
        z: number;
    };
    temperature: number;
    radioactivity: number;
    stability: number;
}
export interface Vent {
    id: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    intensity: number;
    temperature: number;
    spawnRate: number;
}
export interface ZoneState {
    atoms: Map<string, Atom>;
    vents: Vent[];
    temperature: number;
    oceanCurrent: {
        x: number;
        y: number;
    };
    bossHealth: number;
    bossPhase: 'calm' | 'active' | 'rage';
}
export declare class DeepOceanReactorZone {
    private state;
    private readonly ZONE_ID;
    private readonly ZONE_WIDTH;
    private readonly ZONE_HEIGHT;
    private readonly ZONE_DEPTH;
    constructor();
    /**
     * Initialize hydrothermal vents
     */
    private initializeVents;
    /**
     * Spawn atoms from vents
     */
    spawnAtoms(deltaTime: number): Atom[];
    /**
     * Update atom physics and temperature
     */
    updateAtoms(deltaTime: number): void;
    /**
     * Boss AI: Admiral Thalassa
     */
    updateBossAI(deltaTime: number): any;
    /**
     * Temperature affects gameplay
     */
    getTemperatureEffect(): any;
    /**
     * Get zone state
     */
    getState(): any;
    /**
     * Tick the zone
     */
    tick(deltaTime: number): void;
}
export default DeepOceanReactorZone;
//# sourceMappingURL=deep-ocean-reactor.d.ts.map
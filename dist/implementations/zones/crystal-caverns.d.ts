/**
 * MOLGANG-6.5: Crystal Caverns Zone
 * Crystalline terrain, brittle atoms
 * Boss: Gemmaster Silex
 * Reflective surfaces and special mechanics
 */
export interface CrystalStructure {
    id: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    brittleness: number;
    reflectivity: number;
    color: string;
    size: number;
    crystalType: 'quartz' | 'amethyst' | 'topaz' | 'diamond';
}
export interface BrittleAtom {
    id: string;
    type: 'C' | 'Si' | 'O';
    position: {
        x: number;
        y: number;
        z: number;
    };
    stability: number;
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    resonanceFrequency: number;
}
export declare class CrystalCavernsZone {
    private readonly ZONE_ID;
    private readonly ZONE_WIDTH;
    private readonly ZONE_HEIGHT;
    private readonly ZONE_DEPTH;
    private crystals;
    private atoms;
    private bossHealth;
    private bossPhase;
    private resonanceFrequency;
    private shardCount;
    constructor();
    /**
     * Initialize crystal formations
     */
    private initializeCrystals;
    /**
     * Spawn brittle atoms from crystals
     */
    spawnBrittleAtoms(deltaTime: number): BrittleAtom[];
    /**
     * Update atoms with resonance effects
     */
    updateAtoms(deltaTime: number): void;
    /**
     * Crystal breaking mechanic
     */
    breakCrystal(crystalId: string): void;
    /**
     * Boss AI: Gemmaster Silex
     */
    updateBossAI(deltaTime: number, playerCount: number): any;
    /**
     * Reflectivity mechanic (light bounces off crystals)
     */
    getReflectionEffect(): any;
    /**
     * Check if position is in bounds
     */
    private isOutOfBounds;
    /**
     * Get zone state
     */
    getState(): any;
    /**
     * Tick the zone
     */
    tick(deltaTime: number, playerCount?: number): void;
}
export default CrystalCavernsZone;
//# sourceMappingURL=crystal-caverns.d.ts.map
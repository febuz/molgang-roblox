/**
 * MOLGANG-6.6: Atmospheric Station Zone
 * Weather system with rain, wind, lightning
 * Air chemistry (N, O, Ar, CO2)
 * Boss: Storm Keeper Cyclonis
 */
export interface WeatherSystem {
    rainIntensity: number;
    windSpeed: number;
    windDirection: number;
    temperature: number;
    pressure: number;
    humidity: number;
    lightningStrikes: number;
    weatherPhase: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'lightning';
}
export interface Atom {
    id: string;
    type: 'N' | 'O' | 'Ar' | 'CO2';
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    temperature: number;
    lifetime: number;
}
export interface LightningStrike {
    id: string;
    position: {
        x: number;
        y: number;
    };
    timestamp: Date;
    damage: number;
    radius: number;
}
export declare class AtmosphericStationZone {
    private readonly ZONE_ID;
    private readonly ZONE_WIDTH;
    private readonly ZONE_HEIGHT;
    private readonly ZONE_DEPTH;
    private weather;
    private atoms;
    private strikes;
    private bossHealth;
    private bossPhase;
    private stormIntensity;
    private playerBonus;
    constructor();
    /**
     * Update weather system over time
     */
    updateWeather(deltaTime: number): void;
    /**
     * Spawn atmospheric atoms (N, O, Ar, CO2)
     */
    spawnAtoms(deltaTime: number): Atom[];
    /**
     * Update atoms with wind effects
     */
    updateAtoms(deltaTime: number): void;
    /**
     * Generate lightning strikes during storms
     */
    generateLightning(deltaTime: number): LightningStrike[];
    /**
     * Storm bonus: players get bonuses during storms
     */
    updateStormBonus(): void;
    /**
     * Boss AI: Storm Keeper Cyclonis
     */
    updateBossAI(deltaTime: number, playerCount: number): any;
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
export default AtmosphericStationZone;
//# sourceMappingURL=atmospheric-station.d.ts.map
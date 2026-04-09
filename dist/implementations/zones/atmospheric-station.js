"use strict";
/**
 * MOLGANG-6.6: Atmospheric Station Zone
 * Weather system with rain, wind, lightning
 * Air chemistry (N, O, Ar, CO2)
 * Boss: Storm Keeper Cyclonis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtmosphericStationZone = void 0;
class AtmosphericStationZone {
    constructor() {
        this.ZONE_ID = 'atmospheric_station';
        this.ZONE_WIDTH = 1500;
        this.ZONE_HEIGHT = 1000;
        this.ZONE_DEPTH = 800;
        this.atoms = new Map();
        this.strikes = [];
        this.bossHealth = 1000;
        this.bossPhase = 'calm';
        this.stormIntensity = 0;
        this.playerBonus = 1.0; // Bonus multiplier during storms
        this.weather = {
            rainIntensity: 0,
            windSpeed: 0,
            windDirection: 0,
            temperature: 20,
            pressure: 1013,
            humidity: 50,
            lightningStrikes: 0,
            weatherPhase: 'clear'
        };
    }
    /**
     * Update weather system over time
     */
    updateWeather(deltaTime) {
        // Simulate weather changes
        this.weather.rainIntensity += (Math.random() - 0.5) * 20 * deltaTime;
        this.weather.windSpeed += (Math.random() - 0.5) * 10 * deltaTime;
        this.weather.temperature += (Math.random() - 0.5) * 5 * deltaTime;
        this.weather.humidity += (Math.random() - 0.5) * 15 * deltaTime;
        this.weather.pressure += (Math.random() - 0.5) * 5 * deltaTime;
        // Clamp values
        this.weather.rainIntensity = Math.max(0, Math.min(100, this.weather.rainIntensity));
        this.weather.windSpeed = Math.max(0, Math.min(100, this.weather.windSpeed));
        this.weather.temperature = Math.max(-50, Math.min(50, this.weather.temperature));
        this.weather.humidity = Math.max(0, Math.min(100, this.weather.humidity));
        this.weather.pressure = Math.max(900, Math.min(1050, this.weather.pressure));
        this.weather.windDirection = (this.weather.windDirection + Math.random() * 10) % 360;
        // Determine weather phase
        if (this.weather.rainIntensity < 20) {
            this.weather.weatherPhase = 'clear';
        }
        else if (this.weather.rainIntensity < 40) {
            this.weather.weatherPhase = 'cloudy';
        }
        else if (this.weather.rainIntensity < 70) {
            this.weather.weatherPhase = 'rainy';
        }
        else if (this.weather.rainIntensity < 90) {
            this.weather.weatherPhase = 'stormy';
        }
        else {
            this.weather.weatherPhase = 'lightning';
            this.weather.lightningStrikes = Math.floor(this.weather.rainIntensity / 10);
        }
    }
    /**
     * Spawn atmospheric atoms (N, O, Ar, CO2)
     */
    spawnAtoms(deltaTime) {
        const newAtoms = [];
        const types = ['N', 'O', 'Ar', 'CO2'];
        // More atoms during storms
        const baseSpawnRate = 2;
        const stormMultiplier = 1 + this.stormIntensity / 100;
        const spawnCount = Math.floor(baseSpawnRate * stormMultiplier * deltaTime);
        for (let i = 0; i < spawnCount; i++) {
            const atom = {
                id: `atom_${Date.now()}_${Math.random()}`,
                type: types[Math.floor(Math.random() * types.length)],
                position: {
                    x: Math.random() * this.ZONE_WIDTH,
                    y: Math.random() * this.ZONE_HEIGHT,
                    z: Math.random() * this.ZONE_DEPTH
                },
                velocity: {
                    x: Math.cos(this.weather.windDirection * Math.PI / 180) * this.weather.windSpeed / 10,
                    y: Math.sin(this.weather.windDirection * Math.PI / 180) * this.weather.windSpeed / 10,
                    z: (Math.random() - 0.5) * 5
                },
                temperature: this.weather.temperature + (Math.random() - 0.5) * 10,
                lifetime: 30 + Math.random() * 30
            };
            this.atoms.set(atom.id, atom);
            newAtoms.push(atom);
        }
        return newAtoms;
    }
    /**
     * Update atoms with wind effects
     */
    updateAtoms(deltaTime) {
        for (const [atomId, atom] of this.atoms) {
            // Apply wind velocity
            atom.position.x += atom.velocity.x * deltaTime;
            atom.position.y += atom.velocity.y * deltaTime;
            atom.position.z += atom.velocity.z * deltaTime;
            // Gravity (slight downward drift)
            atom.velocity.z -= deltaTime * 0.5;
            // Temperature effects
            atom.temperature = Math.max(-50, atom.temperature - deltaTime * 0.5);
            // Lifetime decay
            atom.lifetime -= deltaTime;
            // Remove expired atoms
            if (atom.lifetime <= 0 || this.isOutOfBounds(atom.position)) {
                this.atoms.delete(atomId);
            }
        }
    }
    /**
     * Generate lightning strikes during storms
     */
    generateLightning(deltaTime) {
        const strikes = [];
        if (this.weather.weatherPhase === 'lightning') {
            const strikeCount = Math.floor(this.weather.lightningStrikes * deltaTime);
            for (let i = 0; i < strikeCount; i++) {
                const strike = {
                    id: `strike_${Date.now()}_${i}`,
                    position: {
                        x: Math.random() * this.ZONE_WIDTH,
                        y: Math.random() * this.ZONE_HEIGHT
                    },
                    timestamp: new Date(),
                    damage: 50 + Math.random() * 50,
                    radius: 100 + Math.random() * 50
                };
                this.strikes.push(strike);
                strikes.push(strike);
                // Clear old strikes (keep only last 100)
                if (this.strikes.length > 100) {
                    this.strikes.shift();
                }
            }
        }
        return strikes;
    }
    /**
     * Storm bonus: players get bonuses during storms
     */
    updateStormBonus() {
        if (this.weather.weatherPhase === 'stormy' || this.weather.weatherPhase === 'lightning') {
            this.playerBonus = 1 + (this.stormIntensity / 100) * 0.5; // Up to 1.5x bonus
        }
        else {
            this.playerBonus = Math.max(1.0, this.playerBonus - 0.1); // Fade out bonus
        }
    }
    /**
     * Boss AI: Storm Keeper Cyclonis
     */
    updateBossAI(deltaTime, playerCount) {
        if (playerCount === 0) {
            this.bossHealth = Math.min(1000, this.bossHealth + deltaTime * 5);
            this.bossPhase = 'calm';
            this.stormIntensity = 0;
        }
        else {
            this.stormIntensity = Math.min(100, this.stormIntensity + deltaTime * 10);
            if (this.bossHealth > 700) {
                this.bossPhase = 'active';
                this.bossHealth -= deltaTime * 10;
            }
            else if (this.bossHealth > 300) {
                this.bossPhase = 'storm';
                this.bossHealth -= deltaTime * 20;
                this.weather.rainIntensity = 80 + Math.random() * 20;
                this.weather.windSpeed = 80 + Math.random() * 20;
            }
            else {
                this.bossHealth -= deltaTime * 30;
                this.weather.rainIntensity = 100;
                this.weather.windSpeed = 100;
            }
        }
        return {
            health: Math.max(0, this.bossHealth),
            phase: this.bossPhase,
            stormIntensity: this.stormIntensity,
            position: { x: 750, y: 500, z: 400 }
        };
    }
    /**
     * Check if position is in bounds
     */
    isOutOfBounds(pos) {
        return pos.x < 0 || pos.x > this.ZONE_WIDTH ||
            pos.y < 0 || pos.y > this.ZONE_HEIGHT ||
            pos.z < 0 || pos.z > this.ZONE_DEPTH;
    }
    /**
     * Get zone state
     */
    getState() {
        return {
            zoneId: this.ZONE_ID,
            weather: {
                phase: this.weather.weatherPhase,
                rainIntensity: this.weather.rainIntensity,
                windSpeed: this.weather.windSpeed,
                temperature: this.weather.temperature,
                lightningStrikes: this.strikes.length
            },
            atoms: this.atoms.size,
            boss: {
                health: this.bossHealth,
                phase: this.bossPhase
            },
            playerBonus: this.playerBonus
        };
    }
    /**
     * Tick the zone
     */
    tick(deltaTime, playerCount = 0) {
        this.updateWeather(deltaTime);
        this.spawnAtoms(deltaTime);
        this.updateAtoms(deltaTime);
        this.generateLightning(deltaTime);
        this.updateBossAI(deltaTime, playerCount);
        this.updateStormBonus();
    }
}
exports.AtmosphericStationZone = AtmosphericStationZone;
exports.default = AtmosphericStationZone;
//# sourceMappingURL=atmospheric-station.js.map
"use strict";
/**
 * MOLGANG-6.5: Crystal Caverns Zone
 * Crystalline terrain, brittle atoms
 * Boss: Gemmaster Silex
 * Reflective surfaces and special mechanics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrystalCavernsZone = void 0;
class CrystalCavernsZone {
    constructor() {
        this.ZONE_ID = 'crystal_caverns';
        this.ZONE_WIDTH = 1200;
        this.ZONE_HEIGHT = 800;
        this.ZONE_DEPTH = 600;
        this.crystals = new Map();
        this.atoms = new Map();
        this.bossHealth = 1000;
        this.bossPhase = 'calm';
        this.resonanceFrequency = 0; // boss ability
        this.shardCount = 0;
        this.initializeCrystals();
    }
    /**
     * Initialize crystal formations
     */
    initializeCrystals() {
        const crystalData = [
            {
                id: 'crystal_0',
                position: { x: 200, y: 100, z: 50 },
                brittleness: 40,
                reflectivity: 85,
                color: '#9932CC',
                size: 150,
                crystalType: 'amethyst'
            },
            {
                id: 'crystal_1',
                position: { x: 600, y: 200, z: 100 },
                brittleness: 60,
                reflectivity: 90,
                color: '#00BFFF',
                size: 200,
                crystalType: 'topaz'
            },
            {
                id: 'crystal_2',
                position: { x: 1000, y: 150, z: 80 },
                brittleness: 30,
                reflectivity: 95,
                color: '#FFFFFF',
                size: 180,
                crystalType: 'diamond'
            }
        ];
        crystalData.forEach(c => this.crystals.set(c.id, c));
    }
    /**
     * Spawn brittle atoms from crystals
     */
    spawnBrittleAtoms(deltaTime) {
        const newAtoms = [];
        const types = ['C', 'Si', 'O'];
        for (const [, crystal] of this.crystals) {
            const spawnRate = crystal.brittleness / 100 * 2; // Higher brittleness = more atoms
            const spawnCount = Math.floor(spawnRate * deltaTime);
            for (let i = 0; i < spawnCount; i++) {
                const atom = {
                    id: `atom_${Date.now()}_${Math.random()}`,
                    type: types[Math.floor(Math.random() * types.length)],
                    position: {
                        x: crystal.position.x + (Math.random() - 0.5) * 50,
                        y: crystal.position.y + (Math.random() - 0.5) * 50,
                        z: crystal.position.z + Math.random() * 30
                    },
                    stability: 80 + Math.random() * 20,
                    velocity: {
                        x: (Math.random() - 0.5) * 10,
                        y: (Math.random() - 0.5) * 10,
                        z: Math.random() * 5
                    },
                    resonanceFrequency: 100 + Math.random() * 200
                };
                this.atoms.set(atom.id, atom);
                newAtoms.push(atom);
            }
        }
        return newAtoms;
    }
    /**
     * Update atoms with resonance effects
     */
    updateAtoms(deltaTime) {
        for (const [atomId, atom] of this.atoms) {
            // Apply velocity
            atom.position.x += atom.velocity.x * deltaTime;
            atom.position.y += atom.velocity.y * deltaTime;
            atom.position.z += atom.velocity.z * deltaTime;
            // Gravity
            atom.velocity.z = Math.max(-50, atom.velocity.z - deltaTime * 20);
            // Resonance damage (from boss ability)
            const frequencyDiff = Math.abs(atom.resonanceFrequency - this.resonanceFrequency);
            if (frequencyDiff < 20) {
                atom.stability -= deltaTime * 50; // Takes damage from resonance
            }
            // Natural decay
            atom.stability = Math.max(0, atom.stability - deltaTime * 0.3);
            // Remove unstable atoms
            if (atom.stability <= 0 || this.isOutOfBounds(atom.position)) {
                this.atoms.delete(atomId);
                this.shardCount++;
            }
        }
    }
    /**
     * Crystal breaking mechanic
     */
    breakCrystal(crystalId) {
        const crystal = this.crystals.get(crystalId);
        if (!crystal)
            return;
        crystal.brittleness = Math.max(0, crystal.brittleness - 30);
        if (crystal.brittleness <= 0) {
            this.crystals.delete(crystalId);
            this.shardCount += 50;
        }
    }
    /**
     * Boss AI: Gemmaster Silex
     */
    updateBossAI(deltaTime, playerCount) {
        if (playerCount === 0) {
            this.bossHealth = Math.min(1000, this.bossHealth + deltaTime * 5);
            this.bossPhase = 'calm';
            this.resonanceFrequency = 0;
        }
        else {
            if (this.bossHealth > 600) {
                this.bossPhase = 'active';
                this.bossHealth -= deltaTime * 15;
                this.resonanceFrequency = 150;
            }
            else if (this.bossHealth > 200) {
                this.bossPhase = 'resonance';
                this.bossHealth -= deltaTime * 25;
                // Rapid resonance frequency changes
                this.resonanceFrequency += Math.sin(Date.now() / 1000) * 30;
            }
            else {
                this.bossHealth -= deltaTime * 40;
            }
        }
        return {
            health: this.bossHealth,
            phase: this.bossPhase,
            resonanceFrequency: this.resonanceFrequency,
            position: { x: 600, y: 400, z: 300 }
        };
    }
    /**
     * Reflectivity mechanic (light bounces off crystals)
     */
    getReflectionEffect() {
        let totalReflectivity = 0;
        for (const [, crystal] of this.crystals) {
            totalReflectivity += crystal.reflectivity;
        }
        const avgReflectivity = this.crystals.size > 0
            ? totalReflectivity / this.crystals.size
            : 50;
        return {
            brightness: avgReflectivity / 100,
            hazeFactor: (100 - avgReflectivity) / 100,
            playerDamage: 0 // No damage from reflections, only from breaking
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
            atomCount: this.atoms.size,
            crystalCount: this.crystals.size,
            shardCount: this.shardCount,
            boss: {
                health: this.bossHealth,
                phase: this.bossPhase,
                resonanceFrequency: this.resonanceFrequency
            },
            reflectivity: this.getReflectionEffect()
        };
    }
    /**
     * Tick the zone
     */
    tick(deltaTime, playerCount = 0) {
        this.updateAtoms(deltaTime);
        this.updateBossAI(deltaTime, playerCount);
    }
}
exports.CrystalCavernsZone = CrystalCavernsZone;
exports.default = CrystalCavernsZone;
//# sourceMappingURL=crystal-caverns.js.map
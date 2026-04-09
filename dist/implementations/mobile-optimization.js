"use strict";
/**
 * MOLGANG-6.13: React Native Mobile Optimization
 * iOS/Android support for iPhone 12+, Galaxy S20+
 * Target: 60fps on mobile
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileOptimizer = void 0;
class MobileOptimizer {
    constructor(deviceType) {
        this.frameMetrics = {
            fps: 60,
            cpuFrameTime: 0,
            gpuFrameTime: 0,
            memoryUsedMB: 0,
            droppedFrames: 0
        };
        this.config = {
            targetFPS: 60,
            maxMemoryMB: deviceType === 'iphone' ? 1000 : 800,
            enableGPUAcceleration: true,
            textureCompression: 'astc',
            particleQuality: 'high',
            shadowQuality: 'medium',
            lodDistance: 100
        };
    }
    /**
     * Optimize textures for mobile
     */
    optimizeTextures() {
        return {
            compression: this.config.textureCompression,
            maxSize: 2048, // Max texture size
            mipmapping: true,
            compression_ratio: '10:1',
            estimated_savings_percent: 75
        };
    }
    /**
     * Optimize particles for mobile
     */
    optimizeParticles() {
        const particleSettings = {
            low: { maxParticles: 500, updateRate: 0.5 },
            medium: { maxParticles: 1500, updateRate: 0.75 },
            high: { maxParticles: 3000, updateRate: 1.0 }
        };
        return particleSettings[this.config.particleQuality];
    }
    /**
     * Optimize rendering pipeline
     */
    optimizeRendering() {
        return {
            drawCallReduction: true,
            batchingEnabled: true,
            gpuInstancing: true,
            shadowDistance: this.config.shadowQuality === 'off' ? 0 : 50,
            lodBias: 0.5, // Lower detail on mobile
            targetFrameTime_ms: 1000 / this.config.targetFPS
        };
    }
    /**
     * Optimize memory usage
     */
    optimizeMemory() {
        return {
            maxMemoryMB: this.config.maxMemoryMB,
            poolingEnabled: true,
            objectPoolSize: 1000,
            autoUnloadUnusedAssets: true,
            unloadInterval_seconds: 30
        };
    }
    /**
     * Monitor frame performance
     */
    updateFrameMetrics(cpuTime, gpuTime, memoryMB) {
        this.frameMetrics.cpuFrameTime = cpuTime;
        this.frameMetrics.gpuFrameTime = gpuTime;
        this.frameMetrics.memoryUsedMB = memoryMB;
        const totalFrameTime = cpuTime + gpuTime;
        const targetFrameTime = 1000 / this.config.targetFPS;
        if (totalFrameTime > targetFrameTime) {
            this.frameMetrics.droppedFrames++;
            this.optimizeIfNeeded();
        }
        this.frameMetrics.fps = 1000 / totalFrameTime;
    }
    /**
     * Automatically optimize if performance degrades
     */
    optimizeIfNeeded() {
        if (this.frameMetrics.fps < 50) {
            // Reduce quality
            if (this.config.particleQuality !== 'low') {
                this.config.particleQuality = 'medium';
            }
            if (this.config.shadowQuality !== 'off') {
                this.config.shadowQuality = 'low';
            }
        }
        if (this.frameMetrics.memoryUsedMB > this.config.maxMemoryMB * 0.9) {
            // Force garbage collection
            this.clearUnusedMemory();
        }
    }
    /**
     * Clear unused memory
     */
    clearUnusedMemory() {
        // Simulated memory cleanup
        this.frameMetrics.memoryUsedMB *= 0.8; // Reduce by 20%
    }
    /**
     * Touch input optimization
     */
    optimizeTouchInput() {
        return {
            touchRaycast: true,
            multiTouchSupport: true,
            gestureRecognition: ['tap', 'swipe', 'pinch', 'rotate'],
            tapRadius_pixels: 50,
            debounceTime_ms: 16 // One frame at 60fps
        };
    }
    /**
     * Push notifications setup
     */
    setupPushNotifications() {
        return {
            enabled: true,
            services: ['FCM', 'APNs'],
            events: [
                'friend_request',
                'tournament_ready',
                'battle_pass_tier_unlock',
                'seasonal_update',
                'shop_new_item'
            ],
            maxFrequency: 3, // Max 3 per day
            quietHours: { start: 22, end: 8 } // 10pm to 8am
        };
    }
    /**
     * Get optimization report
     */
    getReport() {
        return {
            device_optimization: {
                target_fps: this.config.targetFPS,
                current_fps: this.frameMetrics.fps,
                memory_usage_mb: this.frameMetrics.memoryUsedMB,
                max_memory_mb: this.config.maxMemoryMB,
                memory_pressure: (this.frameMetrics.memoryUsedMB / this.config.maxMemoryMB * 100).toFixed(1) + '%'
            },
            quality_settings: {
                particles: this.config.particleQuality,
                shadows: this.config.shadowQuality,
                textures: this.config.textureCompression
            },
            performance_metrics: {
                cpu_frame_time_ms: this.frameMetrics.cpuFrameTime,
                gpu_frame_time_ms: this.frameMetrics.gpuFrameTime,
                dropped_frames: this.frameMetrics.droppedFrames
            },
            optimizations_enabled: {
                gpu_acceleration: this.config.enableGPUAcceleration,
                texture_compression: true,
                particle_culling: true,
                lod_enabled: true
            }
        };
    }
}
exports.MobileOptimizer = MobileOptimizer;
exports.default = MobileOptimizer;
//# sourceMappingURL=mobile-optimization.js.map
/**
 * MOLGANG-6.13: React Native Mobile Optimization
 * iOS/Android support for iPhone 12+, Galaxy S20+
 * Target: 60fps on mobile
 */
export interface MobileOptimizationConfig {
    targetFPS: number;
    maxMemoryMB: number;
    enableGPUAcceleration: boolean;
    textureCompression: 'astc' | 'etc2' | 'pvrtc';
    particleQuality: 'low' | 'medium' | 'high';
    shadowQuality: 'off' | 'low' | 'medium';
    lodDistance: number;
}
export declare class MobileOptimizer {
    private config;
    private frameMetrics;
    constructor(deviceType: 'iphone' | 'android');
    /**
     * Optimize textures for mobile
     */
    optimizeTextures(): any;
    /**
     * Optimize particles for mobile
     */
    optimizeParticles(): any;
    /**
     * Optimize rendering pipeline
     */
    optimizeRendering(): any;
    /**
     * Optimize memory usage
     */
    optimizeMemory(): any;
    /**
     * Monitor frame performance
     */
    updateFrameMetrics(cpuTime: number, gpuTime: number, memoryMB: number): void;
    /**
     * Automatically optimize if performance degrades
     */
    private optimizeIfNeeded;
    /**
     * Clear unused memory
     */
    private clearUnusedMemory;
    /**
     * Touch input optimization
     */
    optimizeTouchInput(): any;
    /**
     * Push notifications setup
     */
    setupPushNotifications(): any;
    /**
     * Get optimization report
     */
    getReport(): any;
}
export default MobileOptimizer;
//# sourceMappingURL=mobile-optimization.d.ts.map
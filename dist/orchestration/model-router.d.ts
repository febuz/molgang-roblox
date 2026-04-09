/**
 * Model Router - Intelligent API Call Routing
 *
 * Routes requests to optimal model based on:
 * - Task complexity
 * - Required capabilities
 * - Cost efficiency
 * - Available capacity
 */
export interface RoutingDecision {
    model: string;
    tier: 'local' | 'cloud';
    estimated_cost: number;
    estimated_latency: number;
    reasoning: string;
}
export declare class ModelRouter {
    private localModels;
    private cloudModels;
    private defaultRouting;
    private modelProfiles;
    constructor(config: {
        local_models: string[];
        cloud_models: string[];
        default_routing: string;
    });
    /**
     * Route a task to the optimal model
     */
    route(task: any, context?: any): Promise<RoutingDecision>;
    /**
     * Analyze task complexity
     */
    private analyzeComplexity;
    /**
     * Extract required capabilities
     */
    private extractCapabilities;
    /**
     * Select local model for task
     */
    private selectLocalModel;
    /**
     * Select cloud model for task
     */
    private selectCloudModel;
    /**
     * Get routing statistics
     */
    getStats(): any;
}
//# sourceMappingURL=model-router.d.ts.map
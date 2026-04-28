/**
 * Unified Inference Executor
 *
 * Handles both local (Ollama) and cloud (Claude) model execution with:
 * - Intelligent fallback (local → Claude)
 * - Cost optimization
 * - Performance tracking
 * - Load balancing across 2x 3090s
 */
import OllamaClient from './ollama-client';
export interface ExecutionConfig {
    preferLocal: boolean;
    fallbackToClaude: boolean;
    maxRetries: number;
    timeoutMs: number;
}
export interface ExecutionResult {
    response: string;
    model: string;
    provider: 'local' | 'claude';
    latency_ms: number;
    cost: number;
    tokens?: {
        prompt?: number;
        prompt_tokens?: number;
        completion?: number;
        completion_tokens?: number;
        total?: number;
        total_tokens?: number;
    };
    fallback: boolean;
}
export declare class UnifiedExecutor {
    private ollamaClient;
    private config;
    private executionStats;
    private agentModels;
    constructor(ollama: OllamaClient);
    /**
     * Execute task with intelligent model selection
     */
    execute(agent: string, task: string, options?: Partial<ExecutionConfig>): Promise<ExecutionResult>;
    /**
     * Execute on local model (Ollama)
     */
    private executeLocal;
    /**
     * Execute on Claude (API)
     */
    private executeClaude;
    /**
     * Calculate Claude API cost
     */
    private calculateCost;
    /**
     * Check if model is local (Ollama)
     */
    private isLocalModel;
    /**
     * Check if model is Claude
     */
    private isClaudeModel;
    /**
     * Get agent's preferred models
     */
    getAgentModels(agent: string): string[];
    /**
     * Set agent model preferences
     */
    setAgentModels(agent: string, models: string[]): void;
    /**
     * Get execution statistics
     */
    getStats(): any;
    /**
     * Get Ollama status
     */
    getOllamaStatus(): Promise<any>;
    private recordSuccess;
    private recordFallback;
    private initializeStats;
}
export default UnifiedExecutor;
//# sourceMappingURL=unified-executor.d.ts.map
/**
 * Batching Engine - Batch Similar API Requests
 *
 * Groups similar requests together to reduce total API calls
 * - Window: 50ms for request collection
 * - Groups by model and task type
 * - ~30% reduction in API calls
 */
export interface BatchRequest {
    id: string;
    model: string;
    prompts: string[];
    parameters: Record<string, any>;
    timestamp: number;
}
export interface BatchResponse {
    batchId: string;
    results: Array<{
        requestId: string;
        response: string;
        tokensPrompt: number;
        tokensCompletion: number;
    }>;
    totalCost: number;
    totalTokens: number;
}
export declare class BatchingEngine {
    private batches;
    private batchWindow;
    private batchTimers;
    private stats;
    /**
     * Generate batch key from model and parameters
     */
    private generateBatchKey;
    /**
     * Add request to batch
     */
    addRequest(model: string, prompt: string, parameters?: Record<string, any>): Promise<{
        batchId: string;
        requestId: string;
    }>;
    /**
     * Process batch (send to model)
     */
    private processBatch;
    /**
     * Force process all pending batches
     */
    flush(): Promise<void>;
    /**
     * Get batching statistics
     */
    getStats(): {
        totalRequests: number;
        batchedRequests: number;
        totalBatches: number;
        apiCallsReduced: number;
        reductionPercentage: number;
        pendingBatches: number;
    };
    /**
     * Get pending batches info
     */
    getPendingBatches(): Array<{
        key: string;
        model: string;
        count: number;
        age: number;
    }>;
    /**
     * Reset statistics
     */
    resetStats(): void;
}
export default BatchingEngine;
//# sourceMappingURL=batching-engine.d.ts.map
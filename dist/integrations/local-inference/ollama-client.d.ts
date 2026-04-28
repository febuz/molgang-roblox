/**
 * Ollama Client - Local Model Inference
 *
 * Runs open source models on local 3090 GPUs via Ollama
 * Supports: Qwen, DeepSeek, Phi, Llama, Mistral
 */
export interface OllamaModelConfig {
    name: string;
    variant: string;
    max_tokens: number;
    temperature: number;
    gpu_layers: number;
    batch_size: number;
}
export interface InferenceRequest {
    model: string;
    prompt: string;
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
}
export interface InferenceResponse {
    response: string;
    model: string;
    done: boolean;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    latency_ms: number;
}
export declare class OllamaClient {
    private baseUrl;
    private timeout;
    private modelConfigs;
    private healthCheck;
    private inferenceStats;
    constructor(baseUrl?: string);
    /**
     * Initialize model configurations for 3090 GPUs
     */
    private initializeModels;
    /**
     * Check if Ollama is running
     */
    checkHealth(): Promise<boolean>;
    /**
     * Run inference on local model
     */
    infer(request: InferenceRequest): Promise<InferenceResponse>;
    /**
     * Batch inference for multiple prompts
     */
    batchInfer(model: string, prompts: string[]): Promise<InferenceResponse[]>;
    /**
     * Get model status
     */
    getModelStatus(): Promise<any>;
    /**
     * Get inference statistics
     */
    getStats(): {
        model: string;
        calls: number;
        avgLatency: number;
    }[];
    /**
     * Is Ollama healthy?
     */
    isHealthy(): boolean;
}
export default OllamaClient;
//# sourceMappingURL=ollama-client.d.ts.map
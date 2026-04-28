"use strict";
/**
 * Ollama Client - Local Model Inference
 *
 * Runs open source models on local 3090 GPUs via Ollama
 * Supports: Qwen, DeepSeek, Phi, Llama, Mistral
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
class OllamaClient {
    constructor(baseUrl = process.env.OLLAMA_HOST
        ? (process.env.OLLAMA_HOST.startsWith('http') ? process.env.OLLAMA_HOST : `http://${process.env.OLLAMA_HOST}`)
        : 'http://localhost:11434') {
        this.modelConfigs = new Map();
        this.healthCheck = false;
        this.inferenceStats = new Map();
        this.baseUrl = baseUrl;
        this.timeout = 120000; // 2 minutes for long inference
        this.initializeModels();
        this.checkHealth();
    }
    /**
     * Initialize model configurations for 3090 GPUs
     */
    initializeModels() {
        // Variants map internal names to real Ollama tags. Unpulled tags
        // fall back to cloud tier via UnifiedExecutor's fallback chain.
        const models = [
            {
                name: 'qwen-27b',
                variant: 'qwen2.5-coder:32b',
                max_tokens: 32000,
                temperature: 0.7,
                gpu_layers: 99,
                batch_size: 1
            },
            {
                name: 'qwen-14b',
                variant: 'qwen2.5-coder:14b',
                max_tokens: 32000,
                temperature: 0.7,
                gpu_layers: 99,
                batch_size: 2
            },
            {
                name: 'qwen-7b',
                variant: 'qwen2.5-coder:7b',
                max_tokens: 32000,
                temperature: 0.7,
                gpu_layers: 99,
                batch_size: 4
            },
            {
                name: 'deepseek-r1-8b',
                variant: 'deepseek-r1:8b',
                max_tokens: 32000,
                temperature: 0.7,
                gpu_layers: 99,
                batch_size: 2
            },
            {
                name: 'phi-4-15b',
                variant: 'phi4:14b',
                max_tokens: 16000,
                temperature: 0.7,
                gpu_layers: 99,
                batch_size: 4
            },
            {
                name: 'mistral-7b',
                variant: 'mistral:7b',
                max_tokens: 32000,
                temperature: 0.7,
                gpu_layers: 99,
                batch_size: 4
            },
            {
                name: 'llama-70b',
                variant: 'llama3.3:70b',
                max_tokens: 8000,
                temperature: 0.7,
                gpu_layers: 99,
                batch_size: 1
            }
        ];
        models.forEach(config => {
            this.modelConfigs.set(config.name, config);
            this.inferenceStats.set(config.name, { count: 0, totalLatency: 0 });
        });
        logger_1.default.info(`✓ Ollama client configured with ${models.length} local models`);
    }
    /**
     * Check if Ollama is running
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET'
            });
            if (response.ok) {
                const data = await response.json();
                const modelCount = data?.models?.length || 0;
                logger_1.default.info(`✓ Ollama health check passed (${modelCount} models available)`);
                this.healthCheck = true;
                return true;
            }
        }
        catch (error) {
            logger_1.default.warn('⚠️ Ollama not responding - local inference unavailable');
            logger_1.default.warn('Start Ollama with: ollama serve');
            this.healthCheck = false;
        }
        return false;
    }
    /**
     * Run inference on local model
     */
    async infer(request) {
        if (!this.healthCheck) {
            throw new Error('Ollama service not available');
        }
        const config = this.modelConfigs.get(request.model);
        if (!config) {
            throw new Error(`Model not configured: ${request.model}`);
        }
        const startTime = Date.now();
        try {
            logger_1.default.debug(`Inferring on ${request.model}: ${request.prompt.substring(0, 50)}...`);
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.variant,
                    prompt: request.prompt,
                    stream: false,
                    options: {
                        num_predict: request.max_tokens || config.max_tokens,
                        temperature: request.temperature ?? config.temperature,
                        num_gpu: config.gpu_layers, // Layers to GPU
                        num_thread: 16, // CPU threads
                        repeat_penalty: 1.1,
                        top_k: 40,
                        top_p: 0.9
                    }
                })
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Ollama API error: ${error}`);
            }
            const data = await response.json();
            const latency = Date.now() - startTime;
            // Record stats
            const stats = this.inferenceStats.get(request.model);
            if (stats) {
                stats.count++;
                stats.totalLatency += latency;
            }
            return {
                response: data?.response || '',
                model: request.model,
                done: true,
                usage: {
                    prompt_tokens: data?.prompt_eval_count || 0,
                    completion_tokens: data?.eval_count || 0,
                    total_tokens: (data?.prompt_eval_count || 0) + (data?.eval_count || 0)
                },
                latency_ms: latency
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            logger_1.default.error(`Inference error on ${request.model}:`, error.message);
            throw new Error(`Local inference failed: ${error.message}`);
        }
    }
    /**
     * Batch inference for multiple prompts
     */
    async batchInfer(model, prompts) {
        const results = [];
        for (const prompt of prompts) {
            try {
                const result = await this.infer({ model, prompt });
                results.push(result);
            }
            catch (error) {
                logger_1.default.error(`Batch inference failed for prompt: ${prompt.substring(0, 50)}`);
                results.push({
                    response: '',
                    model,
                    done: false,
                    latency_ms: 0
                });
            }
        }
        return results;
    }
    /**
     * Get model status
     */
    async getModelStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            const data = await response.json();
            return {
                health: this.healthCheck ? 'operational' : 'offline',
                models_available: data.models?.map((m) => m.name) || [],
                models_configured: Array.from(this.modelConfigs.keys()),
                inference_stats: Object.fromEntries(this.inferenceStats)
            };
        }
        catch {
            return {
                health: 'offline',
                error: 'Failed to reach Ollama service'
            };
        }
    }
    /**
     * Get inference statistics
     */
    getStats() {
        const stats = [];
        for (const [model, data] of this.inferenceStats.entries()) {
            if (data.count > 0) {
                stats.push({
                    model,
                    calls: data.count,
                    avgLatency: Math.round(data.totalLatency / data.count)
                });
            }
        }
        return stats.sort((a, b) => b.calls - a.calls);
    }
    /**
     * Is Ollama healthy?
     */
    isHealthy() {
        return this.healthCheck;
    }
}
exports.OllamaClient = OllamaClient;
exports.default = OllamaClient;
//# sourceMappingURL=ollama-client.js.map
export interface InferenceEvent {
    ts: string;
    caller: string;
    model: string;
    prompt_head: string;
    prompt_hash: string;
    max_tokens: number;
    tokens_prompt: number;
    tokens_completion: number;
    latency_ms: number;
    triggered_load: boolean;
    success: boolean;
    error?: string;
}
export declare class InferenceAudit {
    private static activity;
    markActivity(model: string): void;
    lastActivityMs(model: string): number | undefined;
    private static inflight;
    inflightFor(caller: string): number;
    startInflight(caller: string): void;
    endInflight(caller: string): void;
    inflightSnapshot(): Record<string, number>;
    record(ev: InferenceEvent): Promise<void>;
    query(opts?: {
        caller?: string;
        model?: string;
        since?: string;
        limit?: number;
    }): Promise<InferenceEvent[]>;
    /**
     * Roll the audit log up by caller and by model over a time window.
     * Window is in seconds; null = all time.
     * Returns counts, total tokens, avg latency, last-seen ts, error rate.
     */
    stats(opts?: {
        windowSec?: number | null;
    }): Promise<{
        window: string;
        by_caller: Record<string, any>;
        by_model: Record<string, any>;
        total: any;
    }>;
    private emptyStats;
    static hashPrompt(prompt: string): string;
    static checkLoadTrigger(model: string, before: Set<string>): Promise<boolean>;
    static loadedModels(): Promise<Set<string>>;
}
export default InferenceAudit;
//# sourceMappingURL=inference-audit.d.ts.map
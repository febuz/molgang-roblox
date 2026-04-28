import InferenceAudit from './inference-audit';
export interface RepairEvent {
    ts: string;
    rule: string;
    severity: 'info' | 'warn' | 'action' | 'critical';
    finding: string;
    action: 'none' | 'unload_ollama' | 'kill_pid' | 'restart_ollama' | 'docker_prune';
    details?: any;
}
export declare class SelfRepair {
    private audit;
    private mode;
    private ticker;
    private ollamaDownStreak;
    private unattrFirstSeen;
    constructor(audit: InferenceAudit);
    start(intervalMs?: number): void;
    stop(): void;
    setMode(m: 'observe' | 'act'): void;
    getMode(): "observe" | "act";
    private record;
    getRecent(limit?: number): Promise<RepairEvent[]>;
    private tick;
    private ruleIdleOllama;
    private ruleOllamaWatchdog;
    private ruleUnattributedHeavy;
    private ruleDiskPressure;
    private ruleOrphanOllamaRunner;
}
export default SelfRepair;
//# sourceMappingURL=self-repair.d.ts.map
/**
 * Paperclip OSS Integration Bridge
 *
 * Enables seamless integration between:
 * - Paperclip OSS (user-facing UI/CLI)
 * - VirtualPC (autonomous agent system)
 *
 * Provides:
 * - Task import/export
 * - Result synchronization
 * - Memory sharing via LightRAG
 * - Cost tracking transparency
 */
import { Router } from 'express';
export interface PaperclipTask {
    id: string;
    title: string;
    description: string;
    agent: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    deadline?: string;
    context?: Record<string, any>;
    model?: string;
}
export interface VirtualPCTask {
    id: string;
    title: string;
    description: string;
    assigned_to: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    deadline?: string;
    context?: Record<string, any>;
    complexity?: number;
}
export declare class PaperclipBridge {
    private agentMapping;
    private reverseAgentMapping;
    /**
     * Convert Paperclip task format to VirtualPC format
     */
    convertTaskToVirtualPC(paperclipTask: PaperclipTask): VirtualPCTask;
    /**
     * Convert VirtualPC result back to Paperclip format
     */
    convertResultToPaperclip(result: any): any;
    /**
     * Analyze task complexity
     */
    private analyzeComplexity;
    /**
     * Create Express router for bridge endpoints
     */
    createRouter(): Router;
}
export default PaperclipBridge;
//# sourceMappingURL=paperclip-bridge.d.ts.map
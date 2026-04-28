/**
 * OpenClaw + EDB Integration Bridge
 *
 * Connects OpenClaw command execution with EDB database
 * for Numerai cryptos and signals competition
 */
import OpenClawHandler from '../../openclaw/openclaw-handler';
import { EntityModel } from './entity-model';
import NumeraiDataFetcher from './data-fetcher';
export interface EDBConfig {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
    timeout: number;
}
export interface EDBCommand {
    command: string;
    params: Record<string, any>;
    priority: 'low' | 'medium' | 'high';
    requester: string;
    timestamp: Date;
}
export declare class OpenClawEDBBridge {
    private openclaw;
    private entityModel;
    private dataFetcher;
    private edbConfig;
    private commandQueue;
    private executionLog;
    private lastDailyFetch;
    private autoFetchInterval?;
    constructor(openclaw: OpenClawHandler, entityModel: EntityModel, dataFetcher: NumeraiDataFetcher, edbConfig: EDBConfig);
    /**
     * Initialize automatic daily data fetching
     */
    private initializeAutoFetch;
    /**
     * Execute fetch command via OpenClaw
     */
    private executeFetchCommand;
    /**
     * Queue command for OpenClaw execution with special handling for fetch
     */
    queueCommand(command: string, params: Record<string, any>, priority?: 'low' | 'medium' | 'high'): Promise<string>;
    /**
     * Route command to appropriate agent
     */
    private routeCommand;
    /**
     * Execute fetch command (internal implementation)
     */
    private executeFetchInternal;
    /**
     * Store data to EDB database
     */
    private storeToEDB;
    /**
     * Get command status
     */
    getCommandStatus(commandId: string): EDBCommand | undefined;
    /**
     * Get execution log
     */
    getExecutionLog(limit?: number): Array<{
        timestamp: Date;
        command: string;
        status: string;
        result?: any;
    }>;
    /**
     * Get last fetch time
     */
    getLastFetchTime(): Date;
    /**
     * Get EDB status
     */
    getEDBStatus(): Record<string, any>;
    /**
     * Get Numerai competition status
     */
    getNumeraiStatus(): Record<string, any>;
    /**
     * Manual trigger for fetch (CEO command)
     */
    manualFetch(): Promise<void>;
    /**
     * Stop auto-fetch
     */
    stop(): void;
}
export default OpenClawEDBBridge;
//# sourceMappingURL=openclaw-edb-bridge.d.ts.map
/**
 * GitHub Sync System
 *
 * Automatically sync VirtualPC repository to GitHub
 * Keep remote repo updated without leaking sensitive data
 */
export interface SyncConfig {
    remoteUrl: string;
    branch: string;
    autoSync: boolean;
    syncInterval: number;
    excludePatterns: string[];
}
export interface SyncResult {
    success: boolean;
    timestamp: Date;
    branch: string;
    changes: {
        added: number;
        modified: number;
        deleted: number;
    };
    commits: number;
    message?: string;
    error?: string;
}
export declare class GitHubSync {
    private config;
    private lastSync;
    private syncHistory;
    private syncInterval?;
    constructor(config: SyncConfig);
    /**
     * Check if remote is configured
     */
    isConfigured(): boolean;
    /**
     * Configure remote if not exists
     */
    configureRemote(): {
        success: boolean;
        message?: string;
    };
    /**
     * Execute git command
     */
    private execGit;
    /**
     * Perform sync
     */
    sync(): Promise<SyncResult>;
    /**
     * Parse git diff output
     */
    private parseChanges;
    /**
     * Start automatic sync
     */
    private startAutoSync;
    /**
     * Get last sync result
     */
    getLastSync(): SyncResult | null;
    /**
     * Get sync history
     */
    getSyncHistory(limit?: number): SyncResult[];
    /**
     * Get sync statistics
     */
    getStatistics(): Record<string, any>;
    /**
     * Stop auto-sync
     */
    stop(): void;
}
export default GitHubSync;
//# sourceMappingURL=github-sync.d.ts.map
"use strict";
/**
 * GitHub Sync System
 *
 * Automatically sync VirtualPC repository to GitHub
 * Keep remote repo updated without leaking sensitive data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubSync = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const child_process_1 = require("child_process");
class GitHubSync {
    constructor(config) {
        this.lastSync = new Date(0);
        this.syncHistory = [];
        this.config = config;
        if (config.autoSync) {
            this.startAutoSync();
        }
        logger_1.default.info(`✓ GitHub Sync initialized (${config.branch})`);
    }
    /**
     * Check if remote is configured
     */
    isConfigured() {
        try {
            const remotes = this.execGit('git remote -v');
            return remotes.includes(this.config.remoteUrl);
        }
        catch {
            return false;
        }
    }
    /**
     * Configure remote if not exists
     */
    configureRemote() {
        try {
            // Check if origin exists
            const remotes = this.execGit('git remote -v');
            if (!remotes.includes('origin')) {
                this.execGit(`git remote add origin ${this.config.remoteUrl}`);
                logger_1.default.info(`✓ Added remote: ${this.config.remoteUrl}`);
            }
            else {
                // Update existing origin
                this.execGit(`git remote set-url origin ${this.config.remoteUrl}`);
                logger_1.default.info(`✓ Updated remote: ${this.config.remoteUrl}`);
            }
            return { success: true, message: 'Remote configured' };
        }
        catch (error) {
            logger_1.default.error('Failed to configure remote:', error.message);
            return { success: false, message: error.message };
        }
    }
    /**
     * Execute git command
     */
    execGit(command) {
        try {
            return (0, child_process_1.execSync)(command, { encoding: 'utf-8' }).trim();
        }
        catch (error) {
            throw new Error(`Git command failed: ${error.message}`);
        }
    }
    /**
     * Perform sync
     */
    async sync() {
        const startTime = Date.now();
        try {
            // Get current status
            const statusBefore = this.execGit('git status --short');
            // Stage changes (excluding sensitive patterns)
            for (const pattern of this.config.excludePatterns) {
                try {
                    this.execGit(`git rm --cached --quiet '${pattern}' 2>/dev/null`);
                }
                catch {
                    // Pattern doesn't exist, ignore
                }
            }
            // Stage all other changes
            this.execGit('git add -A');
            // Check if there are changes
            const statusAfter = this.execGit('git diff --cached --name-only');
            if (!statusAfter) {
                logger_1.default.info('✓ No changes to sync');
                return {
                    success: true,
                    timestamp: new Date(),
                    branch: this.config.branch,
                    changes: { added: 0, modified: 0, deleted: 0 },
                    commits: 0,
                    message: 'No changes'
                };
            }
            // Parse changes
            const changes = this.parseChanges(statusAfter);
            // Create commit if not already synced
            const lastCommit = this.execGit('git log -1 --format=%H').substring(0, 7);
            const commitMessage = `Auto-sync: ${Object.values(changes).reduce((a, b) => a + b, 0)} file(s) changed`;
            this.execGit(`git commit -m "${commitMessage}"`);
            logger_1.default.info(`✓ Created commit: ${commitMessage}`);
            // Push to remote
            this.execGit(`git push origin ${this.config.branch}`);
            logger_1.default.info(`✓ Pushed to origin/${this.config.branch}`);
            const result = {
                success: true,
                timestamp: new Date(),
                branch: this.config.branch,
                changes,
                commits: 1,
                message: `Synced ${Object.values(changes).reduce((a, b) => a + b, 0)} files`
            };
            this.lastSync = new Date();
            this.syncHistory.push(result);
            if (this.syncHistory.length > 100) {
                this.syncHistory.shift();
            }
            return result;
        }
        catch (error) {
            logger_1.default.error('Sync failed:', error.message);
            const result = {
                success: false,
                timestamp: new Date(),
                branch: this.config.branch,
                changes: { added: 0, modified: 0, deleted: 0 },
                commits: 0,
                error: error.message
            };
            this.syncHistory.push(result);
            return result;
        }
    }
    /**
     * Parse git diff output
     */
    parseChanges(diffOutput) {
        const lines = diffOutput.split('\n').filter(l => l.trim());
        let added = 0, modified = 0, deleted = 0;
        lines.forEach(line => {
            const status = line.charAt(0);
            if (status === 'A')
                added++;
            else if (status === 'M')
                modified++;
            else if (status === 'D')
                deleted++;
        });
        return { added, modified, deleted };
    }
    /**
     * Start automatic sync
     */
    startAutoSync() {
        this.syncInterval = setInterval(async () => {
            logger_1.default.info('🔄 Running scheduled GitHub sync...');
            await this.sync();
        }, this.config.syncInterval * 60 * 1000);
        logger_1.default.info(`✓ Auto-sync enabled (every ${this.config.syncInterval} minutes)`);
    }
    /**
     * Get last sync result
     */
    getLastSync() {
        return this.syncHistory.length > 0 ? this.syncHistory[this.syncHistory.length - 1] : null;
    }
    /**
     * Get sync history
     */
    getSyncHistory(limit = 10) {
        return this.syncHistory.slice(-limit);
    }
    /**
     * Get sync statistics
     */
    getStatistics() {
        const successful = this.syncHistory.filter(r => r.success).length;
        const failed = this.syncHistory.filter(r => !r.success).length;
        const totalFiles = this.syncHistory.reduce((sum, r) => sum + Object.values(r.changes).reduce((a, b) => a + b, 0), 0);
        return {
            total_syncs: this.syncHistory.length,
            successful,
            failed,
            success_rate: this.syncHistory.length > 0 ? (successful / this.syncHistory.length * 100).toFixed(1) : 0,
            total_files_synced: totalFiles,
            last_sync: this.lastSync.toISOString(),
            remote_configured: this.isConfigured()
        };
    }
    /**
     * Stop auto-sync
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            logger_1.default.info('✓ Auto-sync stopped');
        }
    }
}
exports.GitHubSync = GitHubSync;
exports.default = GitHubSync;
//# sourceMappingURL=github-sync.js.map
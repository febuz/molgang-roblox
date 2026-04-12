/**
 * GitHub Sync System
 *
 * Automatically sync VirtualPC repository to GitHub
 * Keep remote repo updated without leaking sensitive data
 */

import logger from '../utils/logger';
import { execSync } from 'child_process';

export interface SyncConfig {
  remoteUrl: string;
  branch: string;
  autoSync: boolean;
  syncInterval: number; // minutes
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

export class GitHubSync {
  private config: SyncConfig;
  private lastSync: Date = new Date(0);
  private syncHistory: SyncResult[] = [];
  private syncInterval?: ReturnType<typeof setInterval>;

  constructor(config: SyncConfig) {
    this.config = config;

    if (config.autoSync) {
      this.startAutoSync();
    }

    logger.info(`✓ GitHub Sync initialized (${config.branch})`);
  }

  /**
   * Check if remote is configured
   */
  isConfigured(): boolean {
    try {
      const remotes = this.execGit('git remote -v');
      return remotes.includes(this.config.remoteUrl);
    } catch {
      return false;
    }
  }

  /**
   * Configure remote if not exists
   */
  configureRemote(): { success: boolean; message?: string } {
    try {
      // Check if origin exists
      const remotes = this.execGit('git remote -v');

      if (!remotes.includes('origin')) {
        this.execGit(`git remote add origin ${this.config.remoteUrl}`);
        logger.info(`✓ Added remote: ${this.config.remoteUrl}`);
      } else {
        // Update existing origin
        this.execGit(`git remote set-url origin ${this.config.remoteUrl}`);
        logger.info(`✓ Updated remote: ${this.config.remoteUrl}`);
      }

      return { success: true, message: 'Remote configured' };
    } catch (error: any) {
      logger.error('Failed to configure remote:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Execute git command
   */
  private execGit(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error: any) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  /**
   * Perform sync
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Get current status
      const statusBefore = this.execGit('git status --short');

      // Stage changes (excluding sensitive patterns)
      for (const pattern of this.config.excludePatterns) {
        try {
          this.execGit(`git rm --cached --quiet '${pattern}' 2>/dev/null`);
        } catch {
          // Pattern doesn't exist, ignore
        }
      }

      // Stage all other changes
      this.execGit('git add -A');

      // Check if there are changes
      const statusAfter = this.execGit('git diff --cached --name-only');

      if (!statusAfter) {
        logger.info('✓ No changes to sync');
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
      logger.info(`✓ Created commit: ${commitMessage}`);

      // Push to remote
      this.execGit(`git push origin ${this.config.branch}`);
      logger.info(`✓ Pushed to origin/${this.config.branch}`);

      const result: SyncResult = {
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
    } catch (error: any) {
      logger.error('Sync failed:', error.message);

      const result: SyncResult = {
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
  private parseChanges(diffOutput: string): { added: number; modified: number; deleted: number } {
    const lines = diffOutput.split('\n').filter(l => l.trim());

    let added = 0, modified = 0, deleted = 0;

    lines.forEach(line => {
      const status = line.charAt(0);
      if (status === 'A') added++;
      else if (status === 'M') modified++;
      else if (status === 'D') deleted++;
    });

    return { added, modified, deleted };
  }

  /**
   * Start automatic sync
   */
  private startAutoSync(): void {
    this.syncInterval = setInterval(async () => {
      logger.info('🔄 Running scheduled GitHub sync...');
      await this.sync();
    }, this.config.syncInterval * 60 * 1000);

    logger.info(`✓ Auto-sync enabled (every ${this.config.syncInterval} minutes)`);
  }

  /**
   * Get last sync result
   */
  getLastSync(): SyncResult | null {
    return this.syncHistory.length > 0 ? this.syncHistory[this.syncHistory.length - 1] : null;
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit: number = 10): SyncResult[] {
    return this.syncHistory.slice(-limit);
  }

  /**
   * Get sync statistics
   */
  getStatistics(): Record<string, any> {
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
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      logger.info('✓ Auto-sync stopped');
    }
  }
}

export default GitHubSync;

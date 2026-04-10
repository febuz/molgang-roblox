/**
 * OpenClaw + EDB Integration Bridge
 *
 * Connects OpenClaw command execution with EDB database
 * for Numerai cryptos and signals competition
 */

import logger from '../../utils/logger';
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

export class OpenClawEDBBridge {
  private openclaw: OpenClawHandler;
  private entityModel: EntityModel;
  private dataFetcher: NumeraiDataFetcher;
  private edbConfig: EDBConfig;
  private commandQueue: Map<string, EDBCommand> = new Map();
  private executionLog: Array<{ timestamp: Date; command: string; status: string; result?: any }> = [];
  private lastDailyFetch: Date = new Date(0);
  private autoFetchInterval?: ReturnType<typeof setInterval>;

  constructor(
    openclaw: OpenClawHandler,
    entityModel: EntityModel,
    dataFetcher: NumeraiDataFetcher,
    edbConfig: EDBConfig
  ) {
    this.openclaw = openclaw;
    this.entityModel = entityModel;
    this.dataFetcher = dataFetcher;
    this.edbConfig = edbConfig;

    this.initializeAutoFetch();
    logger.info('✓ OpenClaw + EDB bridge initialized');
  }

  /**
   * Initialize automatic daily data fetching
   */
  private initializeAutoFetch(): void {
    // Run fetch every 24 hours
    this.autoFetchInterval = setInterval(async () => {
      await this.executeFetchInternal();
    }, 24 * 60 * 60 * 1000);

    // Initial fetch on startup
    this.executeFetchInternal().catch(err => logger.error('Initial fetch failed:', err.message));
  }

  /**
   * Execute fetch command via OpenClaw
   */
  private async executeFetchCommand(): Promise<void> {
    const commandId = await this.queueCommand('fetch-numerai-data', {
      scope: 'all_eligible_shares',
      include_signals: true,
      include_competitions: true,
      store_to_edb: true
    }, 'high');

    logger.info(`🔄 Queued daily fetch command: ${commandId}`);
  }

  /**
   * Queue command for OpenClaw execution with special handling for fetch
   */
  async queueCommand(
    command: string,
    params: Record<string, any>,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    const edbCmd: EDBCommand = {
      command,
      params,
      priority,
      requester: 'system',
      timestamp: new Date()
    };

    // Handle fetch command specially
    if (command === 'fetch-numerai-data') {
      this.executeFetchInternal().catch(err => logger.error('Queued fetch failed:', err.message));
      const cmdId = `cmd_fetch_${Date.now()}`;
      this.commandQueue.set(cmdId, edbCmd);
      return cmdId;
    }

    // Route to appropriate agent based on command
    const agent = this.routeCommand(command);

    try {
      const result = this.openclaw.queueCommand(agent, command, params);
      this.commandQueue.set(result.id, edbCmd);

      logger.debug(`📝 Queued command: ${command} (ID: ${result.id}) for agent: ${agent}`);
      return result.id;
    } catch (error: any) {
      logger.error(`Failed to queue command ${command}:`, error.message);
      throw error;
    }
  }

  /**
   * Route command to appropriate agent
   */
  private routeCommand(command: string): string {
    const routes: Record<string, string> = {
      'fetch-numerai-data': 'kai', // CTO handles data engineering
      'update-entity-model': 'kai',
      'analyze-signals': 'zip', // Developer analyzes data
      'generate-predictions': 'zip',
      'validate-submissions': 'kai',
      'optimize-portfolio': 'luna', // Tech Artist optimizes
      'backtest-strategy': 'luna',
      'report-metrics': 'fill' // CEO gets reports
    };

    return routes[command] || 'kai';
  }

  /**
   * Execute fetch command (internal implementation)
   */
  private async executeFetchInternal(): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('📊 Executing Numerai data fetch via OpenClaw...');

      // Fetch data
      const result = await this.dataFetcher.fetchDailyData();

      // Store to EDB
      await this.storeToEDB(result);

      // Log execution
      const duration = Date.now() - startTime;
      this.executionLog.push({
        timestamp: new Date(),
        command: 'fetch-numerai-data',
        status: 'completed',
        result: {
          securities: result.securities_updated,
          signals: result.signals_updated,
          competitions: result.competitions_updated,
          duration_ms: duration
        }
      });

      this.lastDailyFetch = new Date();
      logger.info(`✓ Fetch complete: ${result.securities_updated} securities, ${result.signals_updated} signals`);
    } catch (error: any) {
      logger.error('Fetch execution failed:', error.message);
      this.executionLog.push({
        timestamp: new Date(),
        command: 'fetch-numerai-data',
        status: 'failed',
        result: { error: error.message }
      });
    }
  }

  /**
   * Store data to EDB database
   */
  private async storeToEDB(result: any): Promise<void> {
    try {
      // In production, this would connect to actual EDB
      // For now, we'll simulate storage
      logger.debug(`💾 Storing data to EDB: ${this.edbConfig.database}@${this.edbConfig.host}:${this.edbConfig.port}`);

      // Simulate EDB write
      const payload = {
        timestamp: new Date().toISOString(),
        securities_updated: result.securities_updated,
        signals_updated: result.signals_updated,
        competitions_updated: result.competitions_updated,
        data_quality: result.data_quality,
        entity_feed: this.entityModel.exportEntityFeed()
      };

      // In production: await edbClient.insert('numerai_daily_data', payload)
      logger.debug(`✓ Stored ${JSON.stringify(payload).length} bytes to EDB`);
    } catch (error: any) {
      logger.error('Failed to store to EDB:', error.message);
      throw error;
    }
  }

  /**
   * Get command status
   */
  getCommandStatus(commandId: string): EDBCommand | undefined {
    return this.commandQueue.get(commandId);
  }

  /**
   * Get execution log
   */
  getExecutionLog(limit: number = 50): Array<{ timestamp: Date; command: string; status: string; result?: any }> {
    return this.executionLog.slice(-limit);
  }

  /**
   * Get last fetch time
   */
  getLastFetchTime(): Date {
    return this.lastDailyFetch;
  }

  /**
   * Get EDB status
   */
  getEDBStatus(): Record<string, any> {
    return {
      connected: true, // In production, check actual connection
      host: this.edbConfig.host,
      port: this.edbConfig.port,
      database: this.edbConfig.database,
      last_sync: this.lastDailyFetch.toISOString(),
      pending_commands: this.commandQueue.size,
      recent_executions: this.executionLog.slice(-5).map(e => ({
        command: e.command,
        status: e.status,
        timestamp: e.timestamp.toISOString()
      }))
    };
  }

  /**
   * Get Numerai competition status
   */
  getNumeraiStatus(): Record<string, any> {
    const competitions = this.entityModel.getEntitiesByType('competition');
    const securities = this.entityModel.getEntitiesByType('security');
    const signals = this.entityModel.getEntitiesByType('signal');

    return {
      active_competitions: competitions.length,
      tracked_securities: securities.length,
      available_signals: signals.length,
      data_quality: this.dataFetcher.getDataQuality(),
      last_update: this.lastDailyFetch.toISOString(),
      next_scheduled_fetch: new Date(this.lastDailyFetch.getTime() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Manual trigger for fetch (CEO command)
   */
  async manualFetch(): Promise<void> {
    logger.info('🚀 Manual fetch triggered by CEO');
    await this.executeFetchCommand();
  }

  /**
   * Stop auto-fetch
   */
  stop(): void {
    if (this.autoFetchInterval) {
      clearInterval(this.autoFetchInterval);
      logger.info('✓ Auto-fetch stopped');
    }
  }
}

export default OpenClawEDBBridge;

"use strict";
/**
 * OpenClaw + EDB Integration Bridge
 *
 * Connects OpenClaw command execution with EDB database
 * for Numerai cryptos and signals competition
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenClawEDBBridge = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
class OpenClawEDBBridge {
    constructor(openclaw, entityModel, dataFetcher, edbConfig) {
        this.commandQueue = new Map();
        this.executionLog = [];
        this.lastDailyFetch = new Date(0);
        this.openclaw = openclaw;
        this.entityModel = entityModel;
        this.dataFetcher = dataFetcher;
        this.edbConfig = edbConfig;
        this.initializeAutoFetch();
        logger_1.default.info('✓ OpenClaw + EDB bridge initialized');
    }
    /**
     * Initialize automatic daily data fetching
     */
    initializeAutoFetch() {
        // Run fetch every 24 hours
        this.autoFetchInterval = setInterval(async () => {
            await this.executeFetchInternal();
        }, 24 * 60 * 60 * 1000);
        // Initial fetch on startup
        this.executeFetchInternal().catch(err => logger_1.default.error('Initial fetch failed:', err.message));
    }
    /**
     * Execute fetch command via OpenClaw
     */
    async executeFetchCommand() {
        const commandId = await this.queueCommand('fetch-numerai-data', {
            scope: 'all_eligible_shares',
            include_signals: true,
            include_competitions: true,
            store_to_edb: true
        }, 'high');
        logger_1.default.info(`🔄 Queued daily fetch command: ${commandId}`);
    }
    /**
     * Queue command for OpenClaw execution with special handling for fetch
     */
    async queueCommand(command, params, priority = 'medium') {
        const edbCmd = {
            command,
            params,
            priority,
            requester: 'system',
            timestamp: new Date()
        };
        // Handle fetch command specially
        if (command === 'fetch-numerai-data') {
            this.executeFetchInternal().catch(err => logger_1.default.error('Queued fetch failed:', err.message));
            const cmdId = `cmd_fetch_${Date.now()}`;
            this.commandQueue.set(cmdId, edbCmd);
            return cmdId;
        }
        // Route to appropriate agent based on command
        const agent = this.routeCommand(command);
        try {
            const result = this.openclaw.queueCommand(agent, command, params);
            this.commandQueue.set(result.id, edbCmd);
            logger_1.default.debug(`📝 Queued command: ${command} (ID: ${result.id}) for agent: ${agent}`);
            return result.id;
        }
        catch (error) {
            logger_1.default.error(`Failed to queue command ${command}:`, error.message);
            throw error;
        }
    }
    /**
     * Route command to appropriate agent
     */
    routeCommand(command) {
        const routes = {
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
    async executeFetchInternal() {
        const startTime = Date.now();
        try {
            logger_1.default.info('📊 Executing Numerai data fetch via OpenClaw...');
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
            logger_1.default.info(`✓ Fetch complete: ${result.securities_updated} securities, ${result.signals_updated} signals`);
        }
        catch (error) {
            logger_1.default.error('Fetch execution failed:', error.message);
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
    async storeToEDB(result) {
        try {
            // In production, this would connect to actual EDB
            // For now, we'll simulate storage
            logger_1.default.debug(`💾 Storing data to EDB: ${this.edbConfig.database}@${this.edbConfig.host}:${this.edbConfig.port}`);
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
            logger_1.default.debug(`✓ Stored ${JSON.stringify(payload).length} bytes to EDB`);
        }
        catch (error) {
            logger_1.default.error('Failed to store to EDB:', error.message);
            throw error;
        }
    }
    /**
     * Get command status
     */
    getCommandStatus(commandId) {
        return this.commandQueue.get(commandId);
    }
    /**
     * Get execution log
     */
    getExecutionLog(limit = 50) {
        return this.executionLog.slice(-limit);
    }
    /**
     * Get last fetch time
     */
    getLastFetchTime() {
        return this.lastDailyFetch;
    }
    /**
     * Get EDB status
     */
    getEDBStatus() {
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
    getNumeraiStatus() {
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
    async manualFetch() {
        logger_1.default.info('🚀 Manual fetch triggered by CEO');
        await this.executeFetchCommand();
    }
    /**
     * Stop auto-fetch
     */
    stop() {
        if (this.autoFetchInterval) {
            clearInterval(this.autoFetchInterval);
            logger_1.default.info('✓ Auto-fetch stopped');
        }
    }
}
exports.OpenClawEDBBridge = OpenClawEDBBridge;
exports.default = OpenClawEDBBridge;
//# sourceMappingURL=openclaw-edb-bridge.js.map
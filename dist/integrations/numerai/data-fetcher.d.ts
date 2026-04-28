/**
 * Numerai Daily Data Fetcher
 *
 * Fetches eligible shares and signals daily
 * Updates entity model with latest market data
 */
import { EntityModel } from './entity-model';
export interface DataSourceConfig {
    name: string;
    url: string;
    frequency: 'daily' | 'hourly' | 'real-time';
    timeout: number;
    retry: number;
}
export interface FetchResult {
    success: boolean;
    timestamp: Date;
    securities_updated: number;
    signals_updated: number;
    competitions_updated: number;
    data_quality: {
        completeness: number;
        timeliness: number;
        accuracy: number;
    };
    errors: string[];
}
export declare class NumeraiDataFetcher {
    private entityModel;
    private dataSources;
    private lastFetch;
    private fetchHistory;
    private eligibleAssets;
    constructor(entityModel: EntityModel);
    /**
     * Initialize data sources
     */
    private initializeDataSources;
    /**
     * Load eligible assets for Numerai competition
     */
    private loadEligibleAssets;
    /**
     * Fetch all data for the day
     */
    fetchDailyData(): Promise<FetchResult>;
    /**
     * Fetch from individual source
     */
    private fetchFromSource;
    /**
     * Fetch eligible shares (cryptos/stocks)
     */
    private fetchEligibleShares;
    /**
     * Update signals for all securities
     */
    private updateSignalsForSecurities;
    /**
     * Fetch active competitions
     */
    private fetchActiveCompetitions;
    /**
     * Process security data from response
     */
    private processSecurityData;
    /**
     * Process signal data from response
     */
    private processSignalData;
    /**
     * Process competition data from response
     */
    private processCompetitionData;
    /**
     * Get fetch history
     */
    getFetchHistory(limit?: number): FetchResult[];
    /**
     * Get last fetch timestamp
     */
    getLastFetch(): Date;
    /**
     * Get data quality metrics
     */
    getDataQuality(): Record<string, number>;
}
export default NumeraiDataFetcher;
//# sourceMappingURL=data-fetcher.d.ts.map
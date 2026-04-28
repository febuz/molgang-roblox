/**
 * Timeseries analyzer — CSV upload, per-column statistics, Pearson pair
 * correlations, z-score anomaly detection.
 *
 * Scoped to the ChemE simulator use case first: reactor temperature, pressure,
 * NPK, yield, market prices. Analyst + Atlas consume the output.
 */
export interface ColumnStats {
    name: string;
    count: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    /** Indices where |z| > threshold */
    anomalies: Array<{
        index: number;
        value: number;
        z: number;
        timestamp?: string;
    }>;
}
export interface PairCorrelation {
    a: string;
    b: string;
    pearson: number;
    n: number;
}
export interface AnalysisResult {
    rowCount: number;
    columnCount: number;
    timestampColumn: string | null;
    columns: ColumnStats[];
    correlations: PairCorrelation[];
    topAnomalies: Array<{
        column: string;
        index: number;
        value: number;
        z: number;
        timestamp?: string;
    }>;
    processingMs: number;
}
/** Parse a CSV string into { header: string[], rows: string[][] }. */
export declare function parseCsv(text: string): {
    header: string[];
    rows: string[][];
};
export declare function analyzeCsv(text: string, opts?: {
    zThreshold?: number;
    maxCorrelationPairs?: number;
}): AnalysisResult;
//# sourceMappingURL=timeseries.d.ts.map
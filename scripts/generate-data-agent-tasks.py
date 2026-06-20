#!/usr/bin/env python3
"""Generate 100+ small backlog tasks for the five data agents and splice them into src/task-engine.ts."""
from __future__ import annotations
from pathlib import Path
import re

BASE = Path(__file__).parent.parent
TARGET = BASE / "src/task-engine.ts"

TASKS = {
    "Data-Steward": [
        ("Schema audit: commodity_companies.csv", "high", "Infer schema, missing values, duplicates, and catalog the commodity companies dataset.", 2, ["Load dataset", "Infer schema", "Compute quality metrics", "Log issues", "Publish catalog entry"]),
        ("Schema audit: filings as-reported", "high", "Validate the standardized as-reported filings table for XBRL tag coverage.", 2, ["Load standardized filings", "Check tag coverage", "Flag missing standard fields", "Publish schema"]),
        ("Data quality rule: revenue non-negative", "high", "Add a rule that revenue values must be non-negative across all standardized filings.", 1, ["Define rule", "Implement check", "Run on sample", "Log violations"]),
        ("Data quality rule: fiscal year consistency", "high", "Ensure fiscalYear, period, and date fields are mutually consistent.", 1, ["Define consistency rules", "Implement checks", "Run on sample", "Report violations"]),
        ("Critical-column coverage: filings", "medium", "Ensure every standardized filing row has symbol, fiscalYear, period, revenue, netIncome, assets.", 1, ["List critical columns", "Scan dataset", "Flag gaps", "Update steward logic"]),
        ("Duplicate detection: commodity companies", "medium", "Detect duplicate company-year rows in the commodity dataset.", 1, ["Hash rows", "Find duplicates", "Sample suspect rows", "Log lineage"]),
        ("Duplicate detection: filings", "medium", "Detect duplicate symbol-fiscalYear-period rows in standardized filings.", 1, ["Define key", "Find duplicates", "Resolve conflicts", "Log lineage"]),
        ("Currency standardization check", "medium", "Verify reportedCurrency is ISO-4217 across all filings.", 1, ["List valid currencies", "Scan dataset", "Flag invalid values", "Report"]),
        ("Unit standardization check", "medium", "Ensure all monetary values are in the same unit (e.g., whole dollars) across filings.", 1, ["Inspect sample values", "Define unit rule", "Implement check", "Report outliers"]),
        ("Catalog entry: Gold sector", "low", "Create a governance catalog entry for the Gold peer group.", 1, ["Collect metadata", "Define owner", "Document lineage", "Publish entry"]),
        ("Catalog entry: Silver sector", "low", "Create a governance catalog entry for the Silver peer group.", 1, ["Collect metadata", "Define owner", "Document lineage", "Publish entry"]),
        ("Catalog entry: Uranium sector", "low", "Create a governance catalog entry for the Uranium peer group.", 1, ["Collect metadata", "Define owner", "Document lineage", "Publish entry"]),
        ("Catalog entry: Rhodium sector", "low", "Create a governance catalog entry for the Rhodium peer group.", 1, ["Collect metadata", "Define owner", "Document lineage", "Publish entry"]),
        ("Catalog entry: Vanadium sector", "low", "Create a governance catalog entry for the Vanadium peer group.", 1, ["Collect metadata", "Define owner", "Document lineage", "Publish entry"]),
        ("Catalog entry: Si28 sector", "low", "Create a governance catalog entry for the Si28 peer group.", 1, ["Collect metadata", "Define owner", "Document lineage", "Publish entry"]),
        ("Quality scorecard: filings", "medium", "Compute an overall data-quality score for the filings dataset.", 2, ["Define scoring rubric", "Run checks", "Compute score", "Publish scorecard"]),
        ("Quality scorecard: commodity dataset", "medium", "Compute an overall data-quality score for the commodity companies dataset.", 2, ["Define scoring rubric", "Run checks", "Compute score", "Publish scorecard"]),
        ("Steward review: outlier flags", "low", "Review outlier flags produced by the analyst and confirm they are data-quality issues or genuine anomalies.", 1, ["Load outlier report", "Classify each flag", "Update rules", "Log decisions"]),
        ("Steward review: peer group assignments", "low", "Validate that each commodity company is assigned to the correct peer group.", 1, ["Load peer groups", "Cross-check names", "Fix misassignments", "Log changes"]),
        ("Steward review: API credential registry", "low", "Document which API tokens are used for which data source and who owns them.", 1, ["List sources", "Record tokens", "Set owners", "Publish registry"]),
    ],
    "Data-Engineer": [
        ("ETL run: as-reported filings → standardized table", "high", "Run the filings standardizer over the as-reported CSV and write a clean parquet output.", 3, ["Read as-reported CSV", "Map XBRL tags", "Write parquet", "Validate schema", "Commit artifact"]),
        ("ETL run: commodity_companies.csv → cleaned CSV", "high", "Run the data-agent sidecar ETL pipeline over the commodity companies dataset.", 2, ["Load raw data", "Clean and engineer", "Write output", "Validate"]),
        ("Feature: sector one-hot encoding", "medium", "Add one-hot encoded sector columns to the commodity dataset.", 1, ["Identify sectors", "Encode columns", "Validate", "Commit"]),
        ("Feature: revenue per employee", "medium", "Compute revenue per employee for each company-year in filings.", 1, ["Load income + employees", "Compute ratio", "Handle zeros", "Commit"]),
        ("Feature: EBITDA margin", "medium", "Compute EBITDA margin from standardized income statement fields.", 1, ["Load standardized income", "Compute margin", "Validate range", "Commit"]),
        ("Feature: net debt / EBITDA", "medium", "Compute net debt to EBITDA ratio from standardized balance sheet and income statement fields.", 2, ["Load balance sheet", "Load income", "Compute ratio", "Validate", "Commit"]),
        ("Feature: year-over-year revenue growth", "medium", "Compute YoY revenue growth per company.", 1, ["Sort by year", "Compute growth", "Handle missing", "Commit"]),
        ("Feature: market cap to revenue", "low", "Compute market-cap-to-revenue ratio from market cap and revenue data.", 1, ["Load market cap", "Load revenue", "Compute ratio", "Commit"]),
        ("Feature: reserve life index", "low", "Compute reserve life index for commodity companies where reserves data is available.", 1, ["Load reserves", "Compute index", "Handle missing", "Commit"]),
        ("Feature: production cost curve rank", "low", "Rank commodity companies by all-in sustaining cost within each sector.", 2, ["Load cost data", "Rank within sector", "Assign percentile", "Commit"]),
        ("Pipeline idempotency: filings", "medium", "Verify re-running the filings standardizer yields identical parquet output for identical input.", 2, ["Run twice", "Diff outputs", "Document determinism", "Fix non-idempotent steps"]),
        ("Pipeline idempotency: commodity ETL", "low", "Verify re-running the commodity ETL yields identical output.", 1, ["Run twice", "Diff outputs", "Document"]),
        ("Data validation: standardized filings", "medium", "Validate the standardized filings table against the steward's quality rules.", 1, ["Run steward checks", "Fix issues", "Re-validate", "Commit"]),
        ("Data validation: peer comparison table", "medium", "Validate the peer comparison table for missing values and outliers.", 1, ["Load peer table", "Run checks", "Fix issues", "Commit"]),
        ("Normalize: z-score numeric filings metrics", "low", "Apply z-score normalization to key numeric metrics in the standardized filings table.", 1, ["Select metrics", "Compute stats", "Apply z-score", "Commit"]),
        ("Partition: filings by sector", "low", "Write one parquet file per sector for the standardized filings table.", 1, ["Load table", "Group by sector", "Write partitions", "Validate"]),
        ("Partition: commodity data by year", "low", "Write one CSV per year for the commodity companies dataset.", 1, ["Load table", "Group by year", "Write partitions", "Validate"]),
        ("Engineer: combine income + balance + key metrics", "high", "Join standardized income, balance sheet, and key metrics into a single analytics-ready table.", 3, ["Load tables", "Define keys", "Join", "Validate", "Commit"]),
        ("Engineer: build company fundamentals snapshot", "medium", "Create a latest-fundamentals snapshot per company from the standardized filings.", 2, ["Filter latest fiscal year", "Aggregate", "Write snapshot", "Validate"]),
        ("Engineer: build sector aggregates", "medium", "Create sector-level aggregate metrics (total revenue, median margin, etc.).", 2, ["Load fundamentals", "Group by sector", "Compute aggregates", "Commit"]),
    ],
    "Data-Analyst": [
        ("Summary report: commodity companies", "high", "Generate descriptive statistics and sector breakdowns for the commodity dataset.", 2, ["Load data", "Compute stats", "Sector breakdown", "Publish report"]),
        ("Summary report: standardized filings", "high", "Generate descriptive statistics for the standardized filings dataset.", 2, ["Load data", "Compute stats", "Publish report"]),
        ("Correlation heatmap: commodity metrics", "medium", "Render a correlation heatmap of numeric columns in the commodity dataset.", 2, ["Select numeric columns", "Compute correlations", "Render heatmap", "Commit PNG"]),
        ("Correlation heatmap: filings fundamentals", "medium", "Render a correlation heatmap of revenue, net income, EBITDA, assets, and liabilities.", 2, ["Select fundamentals", "Compute correlations", "Render heatmap", "Commit PNG"]),
        ("Sector distribution chart: commodity companies", "medium", "Render a bar chart of company counts by sector.", 1, ["Aggregate counts", "Render chart", "Commit PNG"]),
        ("Revenue trend chart: by sector", "medium", "Render line charts of total revenue by sector over time.", 2, ["Aggregate revenue", "Render lines", "Commit PNG"]),
        ("EBITDA margin distribution", "medium", "Render a boxplot of EBITDA margin by sector.", 2, ["Compute margins", "Render boxplot", "Commit PNG"]),
        ("Market cap vs revenue scatter", "medium", "Render a scatter plot of market cap vs revenue colored by sector.", 2, ["Load data", "Render scatter", "Commit PNG"]),
        ("Outlier detection: revenue", "high", "Detect revenue outliers per sector using IQR and z-score methods.", 2, ["Load data", "Compute IQR/z-score", "Flag outliers", "Publish report"]),
        ("Outlier detection: EBITDA margin", "high", "Detect EBITDA margin outliers per sector.", 2, ["Load data", "Compute IQR/z-score", "Flag outliers", "Publish report"]),
        ("Outlier detection: market cap", "medium", "Detect market cap outliers per sector.", 2, ["Load data", "Compute IQR/z-score", "Flag outliers", "Publish report"]),
        ("Outlier detection: net debt / EBITDA", "medium", "Detect leverage outliers per sector.", 2, ["Load data", "Compute ratio", "Flag outliers", "Publish report"]),
        ("Peer comparison table: Gold", "high", "Build a peer comparison table for Gold companies with key metrics.", 2, ["Filter sector", "Select metrics", "Compute ratios", "Write table"]),
        ("Peer comparison table: Silver", "high", "Build a peer comparison table for Silver companies with key metrics.", 2, ["Filter sector", "Select metrics", "Compute ratios", "Write table"]),
        ("Peer comparison table: Uranium", "high", "Build a peer comparison table for Uranium companies with key metrics.", 2, ["Filter sector", "Select metrics", "Compute ratios", "Write table"]),
        ("Peer comparison table: Rhodium", "high", "Build a peer comparison table for Rhodium/ PGM companies with key metrics.", 2, ["Filter sector", "Select metrics", "Compute ratios", "Write table"]),
        ("Peer comparison table: Vanadium", "high", "Build a peer comparison table for Vanadium companies with key metrics.", 2, ["Filter sector", "Select metrics", "Compute ratios", "Write table"]),
        ("Peer comparison table: Si28", "high", "Build a peer comparison table for Si28 / silicon wafer companies with key metrics.", 2, ["Filter sector", "Select metrics", "Compute ratios", "Write table"]),
        ("Anomaly report: discount spikes", "low", "Flag unusual discount values in the sample sales dataset.", 1, ["Compute stats", "Flag spikes", "Summarize", "Publish"]),
        ("Anomaly report: missing filings by year", "low", "Flag companies with missing fiscal years in the standardized filings.", 1, ["Compute year coverage", "Flag gaps", "Publish"]),
    ],
    "Data-Scientist": [
        ("Baseline regression: predict revenue", "high", "Train a Linear Regression baseline to predict revenue from engineered features.", 3, ["Select features", "Train/test split", "Fit model", "Evaluate", "Log experiment"]),
        ("Baseline regression: predict EBITDA", "high", "Train a Linear Regression baseline to predict EBITDA.", 3, ["Select features", "Split", "Fit", "Evaluate", "Log"]),
        ("Classification: sector from fundamentals", "medium", "Train a simple classifier to predict sector from financial fundamentals.", 3, ["Prepare features", "Encode target", "Train classifier", "Evaluate", "Log"]),
        ("Clustering: peer groups via k-means", "medium", "Run k-means clustering on standardized fundamentals to discover natural peer groups.", 3, ["Prepare features", "Choose k", "Run k-means", "Interpret clusters", "Log"]),
        ("Feature importance: revenue drivers", "medium", "Rank features by importance for revenue prediction.", 2, ["Train model", "Extract importance", "Rank", "Visualize"]),
        ("Feature importance: EBITDA drivers", "medium", "Rank features by importance for EBITDA prediction.", 2, ["Train model", "Extract importance", "Rank", "Visualize"]),
        ("Model reproducibility: fixed seed", "medium", "Re-run baseline regression with a fixed random seed and verify metrics match.", 1, ["Set seed", "Run", "Compare", "Document"]),
        ("Model benchmark: Linear vs Ridge vs Lasso", "medium", "Compare Linear, Ridge, and Lasso regression for revenue prediction.", 3, ["Train models", "Compare metrics", "Select best", "Log"]),
        ("Time-series: naive revenue forecast", "low", "Build a naive revenue forecast per company using the latest growth rate.", 2, ["Compute growth", "Project forward", "Evaluate", "Log"]),
        ("Outlier model: isolation forest", "high", "Train an isolation forest model to detect multivariate outliers in fundamentals.", 3, ["Prepare features", "Train model", "Score rows", "Publish outliers"]),
        ("Outlier model: LOF local outliers", "medium", "Train a Local Outlier Factor model for fundamentals outlier detection.", 3, ["Prepare features", "Train LOF", "Score rows", "Publish outliers"]),
        ("Experiment tracking: index.json", "medium", "Create an index of all model experiments and their metrics.", 1, ["List experiments", "Build index", "Write JSON", "Commit"]),
        ("Experiment tracking: compare runs", "medium", "Compare all baseline regression runs and produce a leaderboard.", 1, ["Load experiments", "Rank by metric", "Write leaderboard", "Commit"]),
        ("Model calibration: probability scores", "low", "If running classifiers, produce calibrated probability scores.", 2, ["Train classifier", "Calibrate", "Evaluate calibration", "Log"]),
        ("Cross-validation: sector classifier", "low", "Run 5-fold cross-validation on the sector classifier.", 2, ["Prepare data", "Run CV", "Report scores", "Log"]),
        ("Cross-validation: revenue regression", "low", "Run time-series-aware cross-validation on revenue regression.", 2, ["Prepare data", "Run CV", "Report scores", "Log"]),
        ("Hyperparameter sweep: Ridge alpha", "low", "Grid-search Ridge regression alpha values.", 2, ["Define grid", "Run sweep", "Pick best", "Log"]),
        ("Residual analysis: revenue model", "low", "Analyze residuals of the revenue regression model.", 1, ["Predict", "Compute residuals", "Plot", "Publish"]),
        ("Residual analysis: EBITDA model", "low", "Analyze residuals of the EBITDA regression model.", 1, ["Predict", "Compute residuals", "Plot", "Publish"]),
        ("Model card: baseline regression", "low", "Write a model card documenting the baseline regression model.", 1, ["Summarize model", "Document inputs", "Document limitations", "Commit"]),
    ],
    "Data-Manager": [
        ("Snapshot: filings standardization artifacts", "high", "Version-control the standardized filings parquet and metadata.", 2, ["Identify artifacts", "Stage files", "Create commit", "Record lineage"]),
        ("Snapshot: peer comparison tables", "high", "Version-control all peer comparison CSV/parquet files.", 2, ["Identify artifacts", "Stage files", "Create commit", "Record lineage"]),
        ("Snapshot: analysis plots", "medium", "Version-control all PNG plots produced by the analyst.", 1, ["Identify plots", "Stage files", "Create commit", "Record lineage"]),
        ("Snapshot: model experiments", "medium", "Version-control model experiment JSON files.", 1, ["Identify experiments", "Stage files", "Create commit", "Record lineage"]),
        ("Lineage report: filings pipeline", "high", "Compile lineage from raw as-reported CSV → standardized table → features.", 2, ["Collect events", "Order pipeline", "Map artifacts", "Publish"]),
        ("Lineage report: peer comparison pipeline", "high", "Compile lineage from standardized filings → peer comparison tables.", 2, ["Collect events", "Order pipeline", "Map artifacts", "Publish"]),
        ("Lineage report: model experiments", "medium", "Compile lineage from engineer features → scientist experiments.", 1, ["Collect events", "Map artifacts", "Publish"]),
        ("Workspace status: data-agents-sidecar", "medium", "Report git status, artifact count, and knowledge-graph stats.", 1, ["Run git status", "Count artifacts", "Query KG stats", "Publish status"]),
        ("Data catalog refresh: filings", "medium", "Update the governance registry with standardized filings metadata.", 2, ["Read catalog", "Update registry", "Validate JSON", "Commit"]),
        ("Data catalog refresh: peer groups", "medium", "Update the governance registry with peer group definitions.", 1, ["Read peer groups", "Update registry", "Validate", "Commit"]),
        ("Governance report: access tokens", "medium", "Review and document which API tokens are configured and their rate limits.", 1, ["List tokens", "Record limits", "Publish report"]),
        ("Governance report: data retention", "low", "Document retention policy for raw downloads vs. cleaned artifacts.", 1, ["Define policy", "Map files", "Publish"]),
        ("Audit: download rate-limit compliance", "medium", "Verify that download scripts respect free-tier rate limits.", 1, ["Review code", "Check sleep/throttle", "Report compliance"]),
        ("Audit: PII scan", "low", "Scan datasets for potential PII / sensitive fields.", 1, ["Define PII patterns", "Scan", "Report findings"]),
        ("Dashboard publish: HTML index", "high", "Generate and version-control the HTML dashboard index.", 2, ["Generate dashboard", "Stage files", "Create commit", "Publish link"]),
        ("Dashboard publish: sector drill-down", "medium", "Generate per-sector HTML dashboard pages.", 2, ["Generate pages", "Link from index", "Stage", "Commit"]),
        ("Backlog grooming: data-agent tasks", "medium", "Review the 100+ data-agent backlog tasks and remove duplicates.", 1, ["List tasks", "Identify duplicates", "Propose removals"]),
        ("Backlog grooming: prioritize next sprint", "medium", "Rank the top 10 data-agent tasks for the next sprint.", 1, ["Score tasks", "Rank", "Publish"]),
        ("Metrics: artifact count trend", "low", "Track the number of artifacts produced per data-agent run.", 1, ["Count artifacts", "Compare to prior", "Plot trend"]),
        ("Metrics: task completion trend", "low", "Track simulated task completion rates for the data agents.", 1, ["Count completions", "Compare to prior", "Plot trend"]),
    ],
}


def format_pool(agent: str, tasks: list) -> str:
    lines = [f"  '{agent}': ["]
    for title, priority, description, hours, subtasks in tasks:
        sub_list = ", ".join(f"'{s.replace(chr(39), chr(92)+chr(39))}'" for s in subtasks)
        lines.append(f"    {{ title: '{title.replace(chr(39), chr(92)+chr(39))}', priority: '{priority}', description: '{description.replace(chr(39), chr(92)+chr(39))}', estimated_hours: {hours}, subtasks: [{sub_list}] }},")
    lines.append("  ],")
    return "\n".join(lines)


def main():
    if not TARGET.exists():
        print(f"Target not found: {TARGET}")
        return
    source = TARGET.read_text()
    for agent, tasks in TASKS.items():
        # Find the existing agent pool block and replace it
        pattern = rf"  '{agent}': \[.*?\],\n"
        replacement = format_pool(agent, tasks) + "\n"
        new_source, count = re.subn(pattern, replacement, source, flags=re.DOTALL)
        if count == 0:
            print(f"WARNING: pool for {agent} not found")
        else:
            source = new_source
            print(f"Updated {agent}: {len(tasks)} tasks")
    TARGET.write_text(source)
    total = sum(len(t) for t in TASKS.values())
    print(f"\nTotal data-agent tasks: {total}")


if __name__ == "__main__":
    main()

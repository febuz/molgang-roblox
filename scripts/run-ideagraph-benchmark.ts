/**
 * Full-scale IdeaGraph benchmark runner.
 *
 *   npx ts-node scripts/run-ideagraph-benchmark.ts [--rows N] [--payments N]
 *
 * Runs the three audience scenarios (VV graph / ChemGraph / settlement) on
 * the real sparse-news-matrix-20k fixture (all ~89.6k nonzeros by default)
 * and writes the report to data/benchmarks/ideagraph-benchmark-report.{md,json}.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runIdeagraphBenchmark, renderReportMarkdown } from '../src/benchmarks/ideagraph-benchmark';

function argNum(flag: string): number | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : undefined;
}

const report = runIdeagraphBenchmark({
  maxNewsRows: argNum('--rows'),
  payments: argNum('--payments') ?? 500,
  samplesPerCompound: 10,
  knnQueries: 100,
});

const outDir = path.resolve(__dirname, '..', 'data', 'benchmarks');
fs.mkdirSync(outDir, { recursive: true });
const md = renderReportMarkdown(report);
fs.writeFileSync(path.join(outDir, 'ideagraph-benchmark-report.md'), md);
fs.writeFileSync(path.join(outDir, 'ideagraph-benchmark-report.json'), JSON.stringify(report, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

console.log(md);
console.log(`\nWritten to ${outDir}/ideagraph-benchmark-report.{md,json}`);

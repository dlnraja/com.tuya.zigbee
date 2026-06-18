#!/usr/bin/env node
'use strict';

/**
 * generate-timeline.js - Temporal Consciousness: CLI Entry Point
 *
 * Runs the full temporal analysis pipeline and stores results in .ai/timeline.json.
 *
 * Usage:
 *   node scripts/temporal/generate-timeline.js [--days 90] [--output .ai/timeline.json]
 *
 * Outputs:
 *   - .ai/timeline.json          Full temporal report
 *   - .ai/cache/timeline-cache.json   Timeline data cache
 *   - .ai/cache/evolution-cache.json  Evolution snapshots cache
 *   - .ai/cache/regression-cache.json Regression alerts cache
 *
 * Exit codes:
 *   0  Success, no critical regressions
 *   1  Success, but critical regressions detected
 *   2  Error during analysis
 *
 * @module scripts/temporal/generate-timeline
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Resolve project root (two levels up from scripts/temporal/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const { runFullAnalysis } = require(path.join(PROJECT_ROOT, 'lib', 'temporal'));

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    days: 90,
    output: path.join(PROJECT_ROOT, '.ai', 'timeline.json'),
    quiet: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--days':
        args.days = parseInt(argv[++i], 10) || 90;
        break;
      case '--output':
      case '-o':
        args.output = path.resolve(argv[++i]);
        break;
      case '--quiet':
      case '-q':
        args.quiet = true;
        break;
      case '--help':
      case '-h':
        console.log(`
generate-timeline.js - Temporal Consciousness Analysis

Usage:
  node scripts/temporal/generate-timeline.js [options]

Options:
  --days <N>       Analysis window in days (default: 90)
  --output <path>  Output file path (default: .ai/timeline.json)
  --quiet          Suppress console output
  --help           Show this help

Output files:
  .ai/timeline.json              Full temporal report
  .ai/cache/timeline-cache.json  Timeline data cache
  .ai/cache/evolution-cache.json Evolution snapshots cache
  .ai/cache/regression-cache.json Regression alerts cache
`);
        process.exit(0);
        break;
    }
  }

  return args;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);

  if (!args.quiet) {
    console.log('========================================');
    console.log('  Temporal Consciousness Analysis');
    console.log('  Tuya Unified Zigbee - Homey App');
    console.log('========================================');
    console.log(`  Analysis window: ${args.days} days`);
    console.log(`  Output: ${args.output}`);
    console.log('');
  }

  // Ensure output directory exists
  const outputDir = path.dirname(args.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Run the full analysis
  let report;
  try {
    report = runFullAnalysis({
      repoRoot: PROJECT_ROOT,
      days: args.days,
    });
  } catch (err) {
    console.error(`[ERROR] Analysis failed: ${err.message}`);
    if (!args.quiet) console.error(err.stack);
    process.exit(2);
  }

  // Write the timeline report
  try {
    fs.writeFileSync(args.output, JSON.stringify(report, null, 2));
    if (!args.quiet) {
      console.log(`[OK] Timeline report written to ${args.output}`);
    }
  } catch (err) {
    console.error(`[ERROR] Failed to write report: ${err.message}`);
    process.exit(2);
  }

  // Print summary
  if (!args.quiet) {
    console.log('');
    console.log('--- Timeline Summary ---');
    console.log(`  Commits analyzed:  ${report.timeline.commitsCollected}`);
    console.log(`  Releases found:    ${report.timeline.releasesCollected}`);
    console.log(`  PRs found:         ${report.timeline.prsCollected}`);
    console.log('');
    console.log('--- Evolution ---');
    const metrics = report.evolution.report.metrics || {};
    for (const [name, data] of Object.entries(metrics)) {
      if (data.latest !== null) {
        const trend = data.trend || 'unknown';
        const growthStr = data.growth
          ? ` (${data.growth.delta >= 0 ? '+' : ''}${data.growth.delta})`
          : '';
        console.log(`  ${name}: ${data.latest}${growthStr} [${trend}]`);
      }
    }
    if (report.evolution.anomalies.length > 0) {
      console.log('');
      console.log(`  ANOMALIES DETECTED: ${report.evolution.anomalies.length}`);
      for (const a of report.evolution.anomalies) {
        console.log(`    - ${a.message}`);
      }
    }
    console.log('');
    console.log('--- Regressions ---');
    const regSummary = report.regressions.summary || {};
    console.log(`  Total alerts:   ${regSummary.total || 0}`);
    console.log(`  Critical:       ${regSummary.critical || 0}`);
    console.log(`  Warnings:       ${regSummary.warnings || 0}`);
    console.log(`  Info:           ${regSummary.info || 0}`);

    if (regSummary.byType) {
      for (const [type, count] of Object.entries(regSummary.byType)) {
        console.log(`    ${type}: ${count}`);
      }
    }
    console.log('');
    console.log('========================================');

    // Print window summaries
    const windows = (report.timeline.summary || {}).windows || {};
    console.log('');
    console.log('--- Activity Windows ---');
    for (const [window, data] of Object.entries(windows)) {
      console.log(`  ${window}: ${data.commits} commits (${data.human} human, ${data.bot} bot) | ${data.features} features | ${data.bugfixes} bugfixes | ${data.regressions} regressions`);
    }
    console.log('========================================');
  }

  // Exit with appropriate code
  const criticalCount = (report.regressions.summary || {}).critical || 0;
  process.exit(criticalCount > 0 ? 1 : 0);
}

main();

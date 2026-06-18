'use strict';

/**
 * Temporal Consciousness System - Index
 *
 * Exports the three temporal engines as a unified API:
 *   - ProjectTimeline  (T0): commit/PR/issue history
 *   - EvolutionTracker (T1): metric snapshots & trends
 *   - RegressionDetector (T2): regression detection
 *
 * @module lib/temporal
 * @version 1.0.0
 */

const ProjectTimeline = require('./ProjectTimeline');
const EvolutionTracker = require('./EvolutionTracker');
const RegressionDetector = require('./RegressionDetector');

/**
 * Create a fully-wired temporal consciousness instance.
 * All three engines share the same repoRoot and can cross-reference data.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @returns {{ timeline: ProjectTimeline, evolution: EvolutionTracker, regressions: RegressionDetector }}
 */
function createTemporalSystem(options = {}) {
  const timeline = new ProjectTimeline(options);
  const evolution = new EvolutionTracker(options);
  const regressions = new RegressionDetector(options);

  return { timeline, evolution, regressions };
}

/**
 * Run a full temporal analysis: collect data, take snapshots, detect regressions.
 * Returns a consolidated report suitable for CI output or audit inclusion.
 *
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {number} [options.days] - Analysis window (default: 90)
 * @returns {object} Full temporal report
 */
function runFullAnalysis(options = {}) {
  const { timeline, evolution, regressions } = createTemporalSystem(options);
  const days = options.days || 90;

  // T0: Refresh timeline from git
  const timelineResult = timeline.refresh(days);

  // T1: Take current snapshot + scan history
  const currentSnapshot = evolution.takeSnapshot();
  evolution.scanGitHistory(days);
  const evolutionReport = evolution.getFullEvolutionReport();
  const anomalies = evolution.detectAnomalies();

  // T2: Run regression detection with evolution snapshots
  const regressionResult = regressions.runFullScan({
    days,
    snapshots: evolution._snapshots,
  });

  // Cross-reference: timeline regressions
  const timelineRegressions = timeline.getRegressions(days);

  return {
    generatedAt: new Date().toISOString(),
    analysisWindow: `${days} days`,
    timeline: {
      commitsCollected: timelineResult.commits,
      releasesCollected: timelineResult.releases,
      prsCollected: timelineResult.prs,
      summary: timeline.getFullSummary(),
    },
    evolution: {
      currentSnapshot,
      report: evolutionReport,
      anomalies,
    },
    regressions: {
      ...regressionResult,
      timelineRegressions: timelineRegressions.length,
    },
  };
}

module.exports = {
  ProjectTimeline,
  EvolutionTracker,
  RegressionDetector,
  createTemporalSystem,
  runFullAnalysis,
};

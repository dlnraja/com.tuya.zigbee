'use strict';

/**
 * RegressionDetector.js - Temporal Consciousness: Regression Engine
 *
 * Detects regressions in the project by analyzing:
 * - Fix reversions (a fix commit whose changes are later undone)
 * - Bug reintroduction (same issue number reappearing in fix commits)
 * - Feature removal (files/modules deleted that were previously added)
 * - Metric regressions (driver/FP/capability counts decreasing)
 *
 * Part of the Tuya Unified Zigbee Temporal Consciousness System (Layer T2).
 *
 * @module lib/temporal/RegressionDetector
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_DIR = path.join(__dirname, '..', '..', '.ai', 'cache');
const REGRESSION_CACHE = path.join(CACHE_DIR, 'regression-cache.json');

// Severity levels
const SEVERITY = {
  CRITICAL: 'critical',   // Fix reverted, feature removed
  WARNING: 'warning',     // Metric decreased, bug reintroduced
  INFO: 'info',           // Possible regression, needs review
};

class RegressionDetector {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot]
   */
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || path.join(__dirname, '..', '..');
    this._alerts = [];
    this._loadCache();
  }

  // =========================================================================
  // CACHE MANAGEMENT
  // =========================================================================

  /** @private */
  _loadCache() {
    try {
      if (fs.existsSync(REGRESSION_CACHE)) {
        const raw = fs.readFileSync(REGRESSION_CACHE);
        const data = JSON.parse(raw);
        this._alerts = data.alerts || [];
      }
    } catch (err) {
      this._alerts = [];
    }
  }

  /** @private */
  _saveCache() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(
        REGRESSION_CACHE,
        JSON.stringify(
          {
            version: '1.0.0',
            lastRun: new Date().toISOString(),
            alerts: this._alerts,
          },
          null,
          2
        )
      );
    } catch (err) {
      // Non-fatal
    }
  }

  // =========================================================================
  // DETECTION: FIX REVERSIONS
  // =========================================================================

  /**
   * Detect when a previously fixed file is changed back to a broken state.
   * Strategy: use a single `git log --name-only` pass to build a commit-to-files
   * map, then find fix commits whose files are later touched by non-fix commits.
   *
   * @param {number} [days=90] - Lookback window
   * @returns {Array<object>} Reversion alerts
   */
  detectFixReversions(days = 90) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      // Single git pass: commit metadata + changed files in one command
      const cmd = `git log --format="COMMIT|%H|%ai|%s" --name-only --since="${since}" --no-merges`;
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
        timeout: 30000,
      }).trim();

      if (!output) return [];

      // Parse the combined log output
      const commits = [];
      let current = null;

      for (const line of output.split('\n')) {
        if (line.startsWith('COMMIT|')) {
          if (current) commits.push(current);
          const [, hash, date, ...msgParts] = line.split('|');
          current = {
            hash: (hash || '').trim(),
            date: (date || '').trim(),
            message: msgParts.join('|').trim(),
            files: [],
          };
        } else if (current && line.trim()) {
          current.files.push(line.trim());
        }
      }
      if (current) commits.push(current);

      // Find fix commits
      const fixCommits = commits.filter(
        (c) => /^(fix|hotfix|bugfix|patch)[:(]/i.test(c.message)
      );

      const reversionAlerts = [];

      for (const fix of fixCommits) {
        if (!fix.files.length) continue;
        const fixDate = new Date(fix.date);
        const windowEnd = new Date(fixDate.getTime() + 14 * 86400000);

        for (const later of commits) {
          const laterDate = new Date(later.date);
          if (laterDate <= fixDate || laterDate > windowEnd) continue;
          if (/^(fix|hotfix|bugfix|patch)[:(]/i.test(later.message)) continue;

          const overlap = fix.files.filter((f) => later.files.includes(f));
          if (overlap.length > 0 && overlap.length >= fix.files.length * 0.5) {
            reversionAlerts.push({
              type: 'fix_reversion',
              severity: SEVERITY.WARNING,
              originalFix: {
                hash: fix.hash,
                date: fix.date,
                message: fix.message,
              },
              possibleReversion: {
                hash: later.hash,
                date: later.date,
                message: later.message,
              },
              affectedFiles: overlap,
              message: `Fix "${fix.message}" may have been partially reverted by "${later.message}" (${overlap.length} overlapping files)`,
            });
          }
        }
      }

      return reversionAlerts;
    } catch (err) {
      return [];
    }
  }

  // =========================================================================
  // DETECTION: BUG REINTRODUCTION
  // =========================================================================

  /**
   * Detect when the same issue number appears in multiple fix commits,
   * suggesting the bug was reintroduced.
   *
   * @param {number} [days=180]
   * @returns {Array<object>} Reintroduction alerts
   */
  detectBugReintroduction(days = 180) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const cmd = `git log --format="%ai|%s" --since="${since}" --no-merges --grep="fix"`;
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 5 * 1024 * 1024,
        timeout: 15000,
      }).trim();

      if (!output) return [];

      const issueRegex = /#(\d+)/g;
      const issueFixes = {}; // issue number -> [dates]

      for (const line of output.split('\n')) {
        const [date, ...msgParts] = line.split('|');
        const message = msgParts.join('|');
        let match;
        while ((match = issueRegex.exec(message)) !== null) {
          const num = parseInt(match[1], 10);
          if (!issueFixes[num]) issueFixes[num] = [];
          issueFixes[num].push({
            date: (date || '').trim(),
            message: message.trim(),
          });
        }
      }

      const alerts = [];
      for (const [issueNum, fixes] of Object.entries(issueFixes)) {
        if (fixes.length >= 2) {
          // Sort by date
          fixes.sort((a, b) => new Date(a.date) - new Date(b.date));
          alerts.push({
            type: 'bug_reintroduction',
            severity: SEVERITY.WARNING,
            issueNumber: parseInt(issueNum, 10),
            fixCount: fixes.length,
            fixes,
            message: `Issue #${issueNum} was fixed ${fixes.length} times - possible reintroduction`,
          });
        }
      }

      return alerts;
    } catch (err) {
      return [];
    }
  }

  // =========================================================================
  // DETECTION: FEATURE REMOVAL
  // =========================================================================

  /**
   * Detect when a file that was previously added (feat: commit) is later deleted.
   *
   * @param {number} [days=90]
   * @returns {Array<object>} Feature removal alerts
   */
  detectFeatureRemoval(days = 90) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

      // Find files added in feat: commits
      const featCmd = `git log --format="%H|%ai|%s" --since="${since}" --no-merges --diff-filter=A --name-only --grep="^feat"`;
      const featOutput = execSync(featCmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      }).trim();

      if (!featOutput) return [];

      const addedFiles = new Map(); // file -> { date, message }
      let currentDate = '';
      let currentMessage = '';

      for (const line of featOutput.split('\n')) {
        if (/^[0-9a-f]{40}\|/.test(line)) {
          const parts = line.split('|');
          currentDate = (parts[1] || '').trim();
          currentMessage = parts.slice(2).join('|').trim();
        } else if (line.trim() && !line.startsWith(' ')) {
          addedFiles.set(line.trim(), { date: currentDate, message: currentMessage });
        }
      }

      // Check which of those files are now deleted
      const alerts = [];
      for (const [file, info] of addedFiles) {
        const fullPath = path.join(this.repoRoot, file);
        if (!fs.existsSync(fullPath)) {
          alerts.push({
            type: 'feature_removal',
            severity: SEVERITY.CRITICAL,
            file,
            addedIn: info,
            message: `Feature file "${file}" (added by "${info.message}") no longer exists`,
          });
        }
      }

      return alerts;
    } catch (err) {
      return [];
    }
  }

  // =========================================================================
  // DETECTION: METRIC REGRESSIONS
  // =========================================================================

  /**
   * Detect metric regressions using evolution data.
   * @param {Array<object>} snapshots - Evolution snapshots (from EvolutionTracker)
   * @returns {Array<object>} Metric regression alerts
   */
  detectMetricRegressions(snapshots) {
    if (!snapshots || snapshots.length < 2) return [];

    const alerts = [];
    const monotonicMetrics = ['drivers', 'fingerprints', 'flowCards', 'capabilities'];

    for (const metric of monotonicMetrics) {
      const values = snapshots
        .filter((s) => s.metrics && s.metrics[metric] !== undefined)
        .map((s) => ({
          version: s.version,
          value: s.metrics[metric],
          timestamp: s.timestamp,
        }));

      for (let i = 1; i < values.length; i++) {
        if (values[i].value < values[i - 1].value) {
          const drop = values[i - 1].value - values[i].value;
          const severity = drop > 10 ? SEVERITY.CRITICAL : SEVERITY.WARNING;
          alerts.push({
            type: 'metric_regression',
            severity,
            metric,
            from: values[i - 1],
            to: values[i],
            drop,
            message: `${metric} dropped by ${drop}: ${values[i - 1].value} (${values[i - 1].version}) -> ${values[i].value} (${values[i].version})`,
          });
        }
      }
    }

    return alerts;
  }

  // =========================================================================
  // COMPREHENSIVE SCAN
  // =========================================================================

  /**
   * Run all regression detection methods and return consolidated alerts.
   * @param {object} [options]
   * @param {number} [options.days=90]
   * @param {Array<object>} [options.snapshots] - From EvolutionTracker
   * @returns {object} { alerts: Array, summary: object }
   */
  runFullScan(options = {}) {
    const days = options.days || 90;
    const allAlerts = [];

    // 1. Fix reversions
    const reversions = this.detectFixReversions(days);
    allAlerts.push(...reversions);

    // 2. Bug reintroduction
    const reintroductions = this.detectBugReintroduction(days * 2);
    allAlerts.push(...reintroductions);

    // 3. Feature removal
    const removals = this.detectFeatureRemoval(days);
    allAlerts.push(...removals);

    // 4. Metric regressions
    if (options.snapshots) {
      const metricAlerts = this.detectMetricRegressions(options.snapshots);
      allAlerts.push(...metricAlerts);
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    allAlerts.sort(
      (a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
    );

    this._alerts = allAlerts;
    this._saveCache();

    const summary = {
      total: allAlerts.length,
      critical: allAlerts.filter((a) => a.severity === SEVERITY.CRITICAL).length,
      warnings: allAlerts.filter((a) => a.severity === SEVERITY.WARNING).length,
      info: allAlerts.filter((a) => a.severity === SEVERITY.INFO).length,
      byType: {},
    };

    for (const alert of allAlerts) {
      if (!summary.byType[alert.type]) summary.byType[alert.type] = 0;
      summary.byType[alert.type]++;
    }

    return { alerts: allAlerts, summary };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Get the list of files changed in a specific commit.
   * @param {string} hash
   * @returns {string[]}
   * @private
   */
  _getFilesInCommit(hash) {
    try {
      const cmd = `git diff-tree --no-commit-id --name-only -r ${hash}`;
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024,
        timeout: 5000,
      }).trim();

      return output ? output.split('\n').filter((f) => f.trim()) : [];
    } catch (err) {
      return [];
    }
  }
}

module.exports = RegressionDetector;

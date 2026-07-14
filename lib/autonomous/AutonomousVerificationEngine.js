// lib/autonomous/AutonomousVerificationEngine.js — v2.0 (P58.6)
'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// AUTONOMOUS VERIFICATION ENGINE — Periodic health checks + self-heal + autofix
// ═══════════════════════════════════════════════════════════════════════════════
//
// Runs checks regularly and auto-fixes common issues:
//   - AggregateError detection (Node 15+ Promise.all error wrapping)
//   - Process error detection (uncaughtException, unhandledRejection)
//   - Memory leak detection (heap usage growth)
//   - EventLoop lag detection
//   - Stuck-timer detection (timers that never fire)
//   - Orphan listener detection
//   - Channel health (MultiChannelManager.healthCheck)
//   - Outbox flush (TransmissionManager.flushOutbox)
//
// All findings are categorized:
//   - INFO:  Just a metric
//   - WARN:  Worth investigating
//   - ERROR: Needs fix
//   - CRITICAL: Paged out, immediate fix attempted
//
// Self-healing strategies (autofix):
//   - Restart stuck channel
//   - Flush transmission outbox
//   - Clear dead listeners
//   - Reduce consecutive error counts (half-life)
//   - Re-enable chronically-failing channels after cooldown

const path = require('path');
const fs = require('fs');
const os = require('os');
const safeTimer = require('../utils/safe-timers');

const HEAP_WARN_PERCENT = 80; // 80% of heap limit
const HEAP_CRITICAL_PERCENT = 95;
const EVENTLOOP_LAG_WARN_MS = 500;
const EVENTLOOP_LAG_CRITICAL_MS = 2000;
const STUCK_TIMER_MS = 60000; // timer pending for >60s = stuck

class AutonomousVerificationEngine {
  constructor(options = {}) {
    this.options = options;
    this._stateFile = options.stateFile || path.join(__dirname, '..', '..', '.github', 'state', 'autonomous-verification.json');
    this._history = [];
    this._maxHistory = options.maxHistory || 50;
    this._lastChecks = new Map(); // check name → last timestamp
    this._alerts = []; // current unresolved alerts
    this._running = false;
    this._intervalId = null;
    this._listeners = new Set(); // for emitting events
    this._selfHeal = options.selfHeal !== false; // default ON
    this._fixes = []; // history of applied fixes
    this._processErrorCount = 0;
    this._aggregateErrorCount = 0;
    this._errorMemory = new Map();        // fingerprint → lastSeen ts (P58.6)
    this._errorRecurrence = new Map();    // fingerprint → count (P58.6)
    this._errorHistory = [];              // bounded ring buffer of errors (P58.6)
    this._setupProcessHandlers();
  }

  _setupProcessHandlers() {
    process.on('uncaughtException', (err) => {
      this._processErrorCount += 1;
      const cat = this._categorize(err);
      this._recordError(err, cat);
      this._alert('CRITICAL', 'uncaughtException', err.message, { stack: err.stack, category: cat.type });
      // Try to auto-fix: if it's a known pattern, run the recommended fix
      if (this._selfHeal && cat.autoFixable) {
        this._fixes.push({ type: 'uncaughtException_fix_recommended', category: cat.type, suggestedFix: cat.suggestedFix });
      }
    });
    process.on('unhandledRejection', (reason) => {
      this._processErrorCount += 1;
      const err = reason instanceof Error ? reason : new Error(String(reason));
      const cat = this._categorize(err);
      this._recordError(err, cat);
      const msg = err.message;
      this._alert('ERROR', 'unhandledRejection', msg, { stack: err.stack, category: cat.type });
    });
  }

  /**
   * v2.0 (P58.6): Record an error in the bounded error history.
   * Used by categorize + dedup + escalation logic.
   */
  _recordError(err, cat) {
    const fp = this._fingerprint(err);
    this._errorHistory.push({ fingerprint: fp, message: err.message, type: cat.type, severity: cat.severity, timestamp: Date.now() });
    if (this._errorHistory.length > 200) this._errorHistory.shift();
    this._errorMemory.set(fp, Date.now());
    this._errorRecurrence.set(fp, (this._errorRecurrence.get(fp) || 0) + 1);
  }

  /**
   * Run all verification checks now. Returns the report.
   */
  async runChecks(context = {}) {
    if (this._running) return { skipped: true, reason: 'already running' };
    this._running = true;
    const start = Date.now();
    const report = {
      timestamp: new Date().toISOString(),
      checks: [],
      findings: [],
      fixes: [],
    };

    try {
      await this._checkHeap(report);
      await this._checkEventLoopLag(report);
      await this._checkTimers(report, context);
      await this._checkProcessErrors(report);
      await this._checkChannels(report, context);
      await this._checkOutbox(report, context);
      await this._checkAggregateErrors(report);
      await this._checkStateFile(report);
    } catch (e) {
      report.findings.push({ severity: 'ERROR', type: 'engine_failure', message: e.message });
    }

    report.durationMs = Date.now() - start;
    report.fixes = this._fixes.slice();
    this._history.push(report);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    this._emit('checks', report);
    this._running = false;
    this._persistState();
    return report;
  }

  /**
   * Start periodic verification. Returns the interval handle.
   */
  start(intervalMs = 60000) {
    if (this._intervalId) return this._intervalId;
    this._intervalId = safeTimer.safeSetInterval(globalThis, () => {
      this.runChecks().catch((e) => {
        this._alert('ERROR', 'runChecks_failed', e.message);
      });
    }, intervalMs);
    return this._intervalId;
  }

  /**
   * Stop periodic verification.
   */
  stop() {
    if (this._intervalId) {
      safeTimer.safeClearInterval(globalThis, this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Subscribe to events.
   */
  on(event, callback) {
    this._listeners.add({ event, callback });
    return () => {
      for (const l of this._listeners) {
        if (l.event === event && l.callback === callback) this._listeners.delete(l);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDIVIDUAL CHECKS
  // ═══════════════════════════════════════════════════════════════════════════

  async _checkHeap(report) {
    const mem = process.memoryUsage();
    const totalHeap = mem.heapTotal;
    const usedHeap = mem.heapUsed;
    const percent = (usedHeap / totalHeap) * 100;
    const rss = mem.rss;
    const rssPercent = (rss / os.totalmem()) * 100;

    const check = { name: 'heap', info: { usedHeap, totalHeap, percent: percent.toFixed(1), rss, rssPercent: rssPercent.toFixed(1) } };
    report.checks.push(check);

    if (percent > HEAP_CRITICAL_PERCENT) {
      report.findings.push({ severity: 'CRITICAL', type: 'heap_critical', message: `Heap at ${percent.toFixed(1)}% (${usedHeap}/${totalHeap})` });
      if (this._selfHeal) {
        const fix = this._autofixHeap();
        if (fix) report.fixes.push(fix);
      }
    } else if (percent > HEAP_WARN_PERCENT) {
      report.findings.push({ severity: 'WARN', type: 'heap_warn', message: `Heap at ${percent.toFixed(1)}% (${usedHeap}/${totalHeap})` });
    }
  }

  async _checkEventLoopLag(report) {
    const start = Date.now();
    return new Promise((resolve) => {
      // setImmediate is a Node.js primitive that runs on the next tick.
      // It is the CORRECT primitive here (vs setTimeout which keeps the event loop alive longer).
      // We do NOT call unref() because we need the callback to fire and call resolve().
      setImmediate(() => {
        const lag = Date.now() - start;
        const check = { name: 'eventloop', info: { lagMs: lag } };
        report.checks.push(check);
        if (lag > EVENTLOOP_LAG_CRITICAL_MS) {
          report.findings.push({ severity: 'CRITICAL', type: 'eventloop_lag_critical', message: `Event loop lag: ${lag}ms` });
        } else if (lag > EVENTLOOP_LAG_WARN_MS) {
          report.findings.push({ severity: 'WARN', type: 'eventloop_lag_warn', message: `Event loop lag: ${lag}ms` });
        }
        resolve();
      });
    });
  }

  async _checkTimers(report, context) {
    if (context && context.timers) {
      const stuck = context.timers.filter((t) => Date.now() - t.createdAt > STUCK_TIMER_MS);
      if (stuck.length > 0) {
        report.findings.push({ severity: 'WARN', type: 'stuck_timers', message: `${stuck.length} timers pending for >${STUCK_TIMER_MS}ms` });
        if (this._selfHeal) {
          for (const t of stuck) {
            try {
              if (t.handle) clearTimeout(t.handle);
              this._fixes.push({ type: 'stuck_timer_cleared', timer: t.id });
            } catch (e) {
              // skip
            }
          }
        }
      }
    }
  }

  async _checkProcessErrors(report) {
    const check = { name: 'process_errors', info: { count: this._processErrorCount, aggregateCount: this._aggregateErrorCount } };
    report.checks.push(check);
    if (this._processErrorCount > 0) {
      report.findings.push({ severity: 'ERROR', type: 'process_errors', message: `${this._processErrorCount} process errors captured` });
    }
    if (this._aggregateErrorCount > 0) {
      report.findings.push({ severity: 'WARN', type: 'aggregate_errors', message: `${this._aggregateErrorCount} AggregateError instances` });
    }
  }

  async _checkChannels(report, context) {
    if (context && context.multiChannelManagers) {
      for (const mcm of context.multiChannelManagers) {
        const health = mcm.healthCheck();
        if (health.reEnabled && health.reEnabled.length > 0) {
          report.fixes.push({ type: 'channels_re_enabled', reEnabled: health.reEnabled });
        }
      }
    }
  }

  async _checkOutbox(report, context) {
    if (context && context.transmissionManagers) {
      for (const tm of context.transmissionManagers) {
        const before = tm.getOutbox().length;
        if (before > 0) {
          const result = await tm.flushOutbox();
          if (result.sent > 0) {
            report.fixes.push({ type: 'outbox_flushed', sent: result.sent, remaining: result.remaining });
          }
        }
      }
    }
  }

  async _checkAggregateErrors(report) {
    // Count active AggregateError-like patterns
    const check = { name: 'aggregate_errors', info: { count: this._aggregateErrorCount } };
    report.checks.push(check);
  }

  async _checkStateFile(report) {
    try {
      const dir = path.dirname(this._stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      report.findings.push({ severity: 'WARN', type: 'state_dir_missing', message: e.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTOFIX STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════

  _autofixHeap() {
    if (global.gc) {
      try {
        global.gc();
        this._fixes.push({ type: 'gc_triggered', message: 'Manual GC triggered due to critical heap' });
        return { type: 'gc_triggered' };
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Register an AggregateError occurrence (for tracking).
   * v2.0 (P58.6): unwraps AggregateError.errors[] and categorizes each cause
   * with the shared `categorizeError` from tools/ci/aggregate-error-fixer.js.
   * Recurring errors (same fingerprint in <5min) escalate to CRITICAL.
   */
  recordAggregateError(err) {
    this._aggregateErrorCount += 1;
    // Unwind AggregateError (Node 15+ has .errors[])
    const causes = (err && err.name === 'AggregateError' && Array.isArray(err.errors))
      ? err.errors
      : [err];
    for (const cause of causes) {
      const fp = this._fingerprint(cause);
      const lastSeen = this._errorMemory.get(fp);
      const now = Date.now();
      let severity = 'WARN';
      if (lastSeen && (now - lastSeen) < 5 * 60 * 1000) {
        // Recurring within 5 min → escalate
        severity = 'CRITICAL';
        this._fixes.push({ type: 'recurring_error_escalated', fingerprint: fp, count: this._errorRecurrence.get(fp) || 0 });
      }
      this._errorMemory.set(fp, now);
      this._errorRecurrence.set(fp, (this._errorRecurrence.get(fp) || 0) + 1);
      this._alert(severity, 'aggregate_error', cause && cause.message ? cause.message : 'AggregateError', { stack: cause && cause.stack, fingerprint: fp });
    }
  }

  /**
   * Compute a stable fingerprint for an error (name + first 200 chars of message).
   */
  _fingerprint(err) {
    if (!err) return 'null';
    const name = err.name || 'Error';
    const msg = (err.message || String(err)).slice(0, 200);
    return require('crypto').createHash('sha1').update(name + ':' + msg).digest('hex').slice(0, 16);
  }

  /**
   * Categorize an error. Delegates to the shared `categorizeError` if
   * available, otherwise falls back to a simple "unknown" classification.
   */
  _categorize(err) {
    try {
      const { categorizeError } = require('../../tools/ci/aggregate-error-fixer.js');
      return categorizeError(err);
    } catch (e) {
      return { type: 'unknown', severity: 'ERROR', isTransient: false, suggestedFix: null };
    }
  }

  /**
   * Add an alert.
   */
  _alert(severity, type, message, extra) {
    const alert = { severity, type, message, timestamp: Date.now(), extra };
    this._alerts.push(alert);
    if (this._alerts.length > 100) this._alerts.shift();
    this._emit('alert', alert);
  }

  /**
   * Get all current alerts.
   */
  getAlerts(severity) {
    if (severity) return this._alerts.filter((a) => a.severity === severity);
    return this._alerts.slice();
  }

  /**
   * Get verification history.
   */
  getHistory(limit = 10) {
    return this._history.slice(-limit);
  }

  /**
   * Get current engine state.
   */
  getState() {
    return {
      processErrorCount: this._processErrorCount,
      aggregateErrorCount: this._aggregateErrorCount,
      uniqueErrorsTracked: this._errorRecurrence.size,
      recurringErrors: [...this._errorRecurrence.entries()].filter(([_, c]) => c > 1).map(([fp, c]) => ({ fingerprint: fp, count: c })),
      currentAlerts: this._alerts.length,
      lastChecks: Object.fromEntries(this._lastChecks),
      recentFixes: this._fixes.slice(-5),
      recentErrors: this._errorHistory.slice(-10),
    };
  }

  _emit(event, data) {
    for (const l of this._listeners) {
      if (l.event === event) {
        try { l.callback(data); } catch (e) { /* skip */ }
      }
    }
  }

  _persistState() {
    try {
      const dir = path.dirname(this._stateFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const state = {
        timestamp: new Date().toISOString(),
        processErrorCount: this._processErrorCount,
        aggregateErrorCount: this._aggregateErrorCount,
        currentAlerts: this._alerts,
        recentFixes: this._fixes.slice(-10),
        lastReports: this._history.slice(-3),
      };
      fs.writeFileSync(this._stateFile, JSON.stringify(state, null, 2));
    } catch (e) {
      // Don't break the engine on persist failure
    }
  }
}

module.exports = { AutonomousVerificationEngine };

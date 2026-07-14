#!/usr/bin/env node
/**
 * SmartDataValidator.js — P57 Smart Data Validation Framework
 *
 * Solves the "flooding" problem: the same data arrives from multiple sources
 * (RX attribute, TX response, ZCL cluster, Tuya DP, cached value, last known)
 * and we don't want to update the same capability value 5 times per second.
 *
 * Solves the "stale data" problem: when one source fails (ZCL timeout, DP
 * parsing error), we want to fall back to alternative sources automatically.
 *
 * Solves the "drift" problem: when sources disagree (e.g. battery at 72% per
 * ZCL but 68% per voltage curve), we use a confidence-weighted tie-breaker.
 *
 * Architecture:
 *   - Per capability, register ALL known sources (with priority + weight)
 *   - On update, call record(source, value, timestamp, confidence)
 *   - Validator decides whether to commit (update Homey capability) based on:
 *     1. Multi-source agreement (>= 2 sources agree within tolerance)
 *     2. Confidence threshold (single high-confidence source)
 *     3. Debouncing (don't fire if value unchanged for X ms)
 *   - On source failure, mark source as stale; next read uses fallback
 *
 * Example usage:
 *   const validator = new SmartDataValidator('measure_battery');
 *   validator.addSource('zcl', { priority: 1, weight: 0.4, ttl: 60000 });
 *   validator.addSource('tuya-dp', { priority: 2, weight: 0.3, ttl: 30000 });
 *   validator.addSource('voltage', { priority: 3, weight: 0.2, ttl: 30000 });
 *   validator.addSource('cached', { priority: 9, weight: 0.1, ttl: 86400000 });
 *
 *   validator.record('zcl', 72, Date.now(), 0.95);
 *   validator.record('voltage', 70, Date.now(), 0.6);
 *   const decision = validator.commit();  // { value: 71, agree: true, sources: ['zcl', 'voltage'] }
 *
 *   if (decision.value !== null) {
 *     this.setCapabilityValue('measure_battery', decision.value);
 *   }
 *
 * Anti-flooding:
 *   - Calls within debounceMs of last commit are merged
 *   - Identical values within hysteresisMs are dropped (don't trigger event)
 *   - Confidence-weighted: low confidence + only one source = don't commit
 *
 * Fallback:
 *   - On source.record() failure, mark source as failed
 *   - If primary sources fail for >staleMs, query alternative sources
 *   - last known good value cached in fallback chain
 */
'use strict';

const DEFAULT_DEBOUNCE_MS = 500;       // min time between commits
const DEFAULT_HYSTERESIS_MS = 10000;   // min time between same-value commits
const DEFAULT_STALE_MS = 120000;       // mark source stale after no updates
const DEFAULT_AGREE_TOLERANCE = 0.05;   // 5% tolerance for "agreement"
const DEFAULT_MIN_CONFIDENCE = 0.5;    // min confidence for single-source commit

class SmartDataValidator {
  /**
   * @param {string} capability - The capability being validated (e.g. 'measure_battery')
   * @param {object} [opts]
   * @param {number} [opts.debounceMs=500] - Min ms between commits (anti-flood)
   * @param {number} [opts.hysteresisMs=10000] - Min ms between same-value commits
   * @param {number} [opts.staleMs=120000] - Mark source stale after no updates
   * @param {number} [opts.agreeTolerance=0.05] - % tolerance for agreement
   * @param {number} [opts.minConfidence=0.5] - Min confidence for single-source commit
   * @param {string} [opts.method='weighted'] - 'weighted' | 'majority' | 'last' | 'highest-confidence'
   */
  constructor(capability, opts = {}) {
    this.capability = capability;
    this.debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.hysteresisMs = opts.hysteresisMs ?? DEFAULT_HYSTERESIS_MS;
    this.staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
    this.agreeTolerance = opts.agreeTolerance ?? DEFAULT_AGREE_TOLERANCE;
    this.minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.method = opts.method || 'weighted';
    this.sources = new Map();        // name -> { priority, weight, ttl, lastValue, lastTs, lastConfidence, stale, failed, error }
    this.history = [];               // [{ source, value, ts, confidence }]
    this.lastCommit = { value: null, ts: 0 };
    this.stats = {
      records: 0, commits: 0, flooded: 0, deduped: 0, fallbacks: 0, disagreements: 0,
    };
  }

  /**
   * Register a data source.
   * @param {string} name - Source identifier (e.g. 'zcl', 'tuya-dp', 'voltage', 'cached', 'last-known')
   * @param {object} [opts]
   * @param {number} [opts.priority=5] - Lower = higher priority (1=primary, 9=fallback)
   * @param {number} [opts.weight=0.5] - Vote weight in 'weighted' method
   * @param {number} [opts.ttl=60000] - How long a value is "fresh" before going stale
   * @param {number} [opts.timeout] - Custom timeout for this source's read
   */
  addSource(name, opts = {}) {
    this.sources.set(name, {
      priority: opts.priority ?? 5,
      weight: opts.weight ?? 0.5,
      ttl: opts.ttl ?? 60000,
      timeout: opts.timeout ?? null,
      lastValue: null,
      lastTs: 0,
      lastConfidence: 0,
      stale: true,
      failed: false,
      error: null,
      readCount: 0,
    });
  }

  /**
   * Record a value from a source.
   * @param {string} source - Source name
   * @param {*} value - Value (number, string, bool)
   * @param {number} [ts=Date.now()] - Timestamp
   * @param {number} [confidence=1.0] - Source confidence (0-1)
   * @returns {{ recorded: boolean, reason: string }}
   */
  record(source, value, ts = Date.now(), confidence = 1.0) {
    this.stats.records++;
    const src = this.sources.get(source);
    if (!src) return { recorded: false, reason: `unknown source: ${source}` };
    src.lastValue = value;
    src.lastTs = ts;
    src.lastConfidence = confidence;
    src.stale = false;
    src.failed = false;
    src.readCount = (src.readCount || 0) + 1;
    this.history.push({ source, value, ts, confidence });
    // Keep history bounded
    if (this.history.length > 100) this.history = this.history.slice(-50);
    return { recorded: true };
  }

  /**
   * Mark a source as failed (e.g. timeout, parse error).
   * @param {string} source
   * @param {string} [error]
   */
  markFailed(source, error = null) {
    const src = this.sources.get(source);
    if (!src) return;
    src.failed = true;
    src.stale = true;
    src.error = error;
    this.stats.fallbacks++;
  }

  /**
   * Get current best value + metadata (does NOT commit).
   * @returns {{ value, sources, agree, confidence, maxSourceConfidence }}
   */
  getBest(now = Date.now()) {
    this._refreshStaleState(now);
    const fresh = this._getFreshSources(now);
    if (fresh.length === 0) {
      const lastKnown = this._getLastKnownGood();
      return { value: lastKnown, sources: [], agree: false, confidence: 0, maxSourceConfidence: 0, reason: 'no-fresh-sources', lastKnown };
    }
    const agg = this._aggregate(fresh, this.method);
    const agree = this._checkAgreement(fresh, agg.sourcesList);
    const maxSourceConfidence = fresh.reduce((max, s) => Math.max(max, s.lastConfidence), 0);
    return { value: agg.value, sources: agg.sources, agree, confidence: agg.confidence, maxSourceConfidence, reason: agree ? 'agreement' : 'best-estimate' };
  }

  /**
   * Decide whether to commit (update capability) and return the decision.
   * @returns {{ value, commit, reason, sources, confidence, flooded, deduped }}
   */
  commit(now = Date.now()) {
    const best = this.getBest(now);

    // Anti-flooding: debounce (only applies to RE-COMMITS, not the first one)
    if (this.lastCommit.ts && (now - this.lastCommit.ts) < this.debounceMs) {
      this.stats.flooded++;
      return { ...best, commit: false, reason: 'debounce', flooded: true };
    }

    // Hysteresis: STRICT equality (not 5% tolerance) within hysteresisMs
    // (only after a successful commit). This is much stricter than agreement
    // because we want to commit when value genuinely CHANGED.
    if (this.lastCommit.value !== null &&
        this._valuesStrictlyEqual(best.value, this.lastCommit.value) &&
        (now - this.lastCommit.ts) < this.hysteresisMs) {
      this.stats.deduped++;
      return { ...best, commit: false, reason: 'hysteresis', deduped: true };
    }

    // Confidence check: at least one source must have high confidence
    // Use maxSourceConfidence (NOT the weighted aggregate) so single-source
    // high-confidence can still commit
    if ((best.maxSourceConfidence ?? 0) < this.minConfidence) {
      return { ...best, commit: false, reason: 'low-confidence' };
    }

    // Commit! Update lastCommit BEFORE returning so next call sees this as the last commit
    this.lastCommit = { value: best.value, ts: now };
    this.stats.commits++;
    return { value: best.value, commit: true, reason: best.reason || 'ok', ...best };
  }

  /**
   * Convenience: record + commit in one call.
   * @returns {object} Same as commit()
   */
  recordAndCommit(source, value, ts, confidence) {
    this.record(source, value, ts, confidence);
    return this.commit(ts);
  }

  /**
   * Get stats.
   */
  getStats() {
    return {
      capability: this.capability,
      ...this.stats,
      sources: Object.fromEntries(
        [...this.sources.entries()].map(([k, v]) => [k, {
          priority: v.priority, weight: v.weight, stale: v.stale, failed: v.failed,
          lastValue: v.lastValue, lastTs: v.lastTs, lastConfidence: v.lastConfidence,
          readCount: v.readCount,
        }])
      ),
    };
  }

  /**
   * Reset state (e.g. on device re-init).
   */
  reset() {
    this.history = [];
    this.lastCommit = { value: null, ts: 0 };
    for (const src of this.sources.values()) {
      src.lastValue = null;
      src.lastTs = 0;
      src.lastConfidence = 0;
      src.stale = true;
      src.failed = false;
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────

  _refreshStaleState(now) {
    for (const src of this.sources.values()) {
      if (src.lastTs && (now - src.lastTs) > src.ttl) src.stale = true;
    }
  }

  _getFreshSources(now) {
    const fresh = [];
    for (const [name, src] of this.sources) {
      if (src.failed) continue;
      if (src.lastValue === null || src.lastTs === 0) continue;
      if (src.stale && (now - src.lastTs) > src.ttl) continue;
      fresh.push({ name, ...src });
    }
    return fresh.sort((a, b) => a.priority - b.priority);
  }

  _getLastKnownGood() {
    // Fall back to most recent non-null value from history
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].value !== null) return this.history[i].value;
    }
    return null;
  }

  _aggregate(fresh, method) {
    if (fresh.length === 1) {
      const s = fresh[0];
      return { value: s.lastValue, sources: [s.name], sourcesList: [s], confidence: s.lastConfidence * s.weight };
    }
    switch (method) {
      case 'majority':
        return this._aggregateMajority(fresh);
      case 'highest-confidence':
        return this._aggregateHighestConfidence(fresh);
      case 'last':
        return this._aggregateLast(fresh);
      case 'weighted':
      default:
        return this._aggregateWeighted(fresh);
    }
  }

  _aggregateWeighted(fresh) {
    let totalWeight = 0, weightedSum = 0, totalConfidence = 0;
    for (const s of fresh) {
      const effWeight = s.weight * s.lastConfidence;
      weightedSum += s.lastValue * effWeight;
      totalWeight += effWeight;
      totalConfidence += s.lastConfidence * s.weight;
    }
    return {
      value: totalWeight > 0 ? weightedSum / totalWeight : null,
      sources: fresh.map(s => s.name),
      sourcesList: fresh,
      confidence: fresh.length > 0 ? totalConfidence / fresh.length : 0,
    };
  }

  _aggregateMajority(fresh) {
    // Bucket values within tolerance, pick the most-populated bucket
    const buckets = [];
    for (const s of fresh) {
      let found = false;
      for (const b of buckets) {
        if (this._valuesClose(s.lastValue, b.value)) { b.items.push(s); found = true; break; }
      }
      if (!found) buckets.push({ value: s.lastValue, items: [s] });
    }
    buckets.sort((a, b) => b.items.length - a.items.length);
    const winner = buckets[0];
    if (!winner) return { value: null, sources: [], confidence: 0, sourcesList: [] };
    const totalConf = winner.items.reduce((s, x) => s + x.lastConfidence, 0) / winner.items.length;
    return {
      value: winner.value,
      sources: winner.items.map(s => s.name),
      sourcesList: winner.items,
      confidence: totalConf,
    };
  }

  _aggregateHighestConfidence(fresh) {
    fresh.sort((a, b) => b.lastConfidence - a.lastConfidence);
    const best = fresh[0];
    return {
      value: best.lastValue,
      sources: [best.name],
      sourcesList: [best],
      confidence: best.lastConfidence,
    };
  }

  _aggregateLast(fresh) {
    fresh.sort((a, b) => b.lastTs - a.lastTs);
    const last = fresh[0];
    return {
      value: last.lastValue,
      sources: [last.name],
      sourcesList: [last],
      confidence: last.lastConfidence,
    };
  }

  _checkAgreement(fresh, sourcesList) {
    if (fresh.length < 2) return true;
    // If sourcesList is provided (from weighted/majority/last/highest), check those agree
    const checkList = sourcesList || fresh;
    if (checkList.length < 2) return true;
    const base = checkList[0].lastValue;
    for (let i = 1; i < checkList.length; i++) {
      if (!this._valuesClose(checkList[i].lastValue, base)) {
        this.stats.disagreements++;
        return false;
      }
    }
    return true;
  }

  _valuesClose(a, b) {
    if (a === null || b === null) return a === b;
    if (typeof a !== 'number' || typeof b !== 'number') return a === b;
    if (b === 0) return Math.abs(a) < 0.01;
    return Math.abs(a - b) / Math.max(Math.abs(b), 1) < this.agreeTolerance;
  }

  /**
   * Strict equality for hysteresis: same value (within 0.1% for floats, or exact for others).
   * Much stricter than _valuesClose which uses 5% tolerance for agreement.
   */
  _valuesStrictlyEqual(a, b) {
    if (a === null || b === null) return a === b;
    if (typeof a !== 'number' || typeof b !== 'number') return a === b;
    if (b === 0) return Math.abs(a) < 0.001;
    return Math.abs(a - b) / Math.max(Math.abs(b), 1) < 0.001;
  }
}

module.exports = { SmartDataValidator };

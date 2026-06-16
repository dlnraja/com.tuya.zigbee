'use strict';

/**
 * DPAdaptationEngine - v6.0.0
 *
 * Real-time DP pattern analysis and adaptation engine for Tuya Zigbee devices.
 *
 * Monitors incoming DP reports and:
 * 1. Tracks DP reporting patterns (frequency, timing, value stability)
 * 2. Detects new DP patterns not seen before
 * 3. Correlates DPs across time to identify logical groups (e.g., temp+humidity = climate sensor)
 * 4. Identifies DPs that have changed behavior (firmware update detection)
 * 5. Manages DP retirement (DPs that stop reporting)
 * 6. Provides confidence-boosting signals to DynamicCapabilityManager
 *
 * Architecture:
 * - Sits between TuyaEF00Manager (raw DP source) and DynamicCapabilityManager (capability creator)
 * - Non-blocking: does not delay DP processing
 * - Persistently stores pattern data for cross-restart learning
 *
 * Usage:
 *   this.dpAdaptationEngine = new DPAdaptationEngine(this);
 *   await this.dpAdaptationEngine.initialize();
 *   // Connect to DP flow:
 *   this.dpAdaptationEngine.analyzeDP(dpId, value, dpType);
 */

class DPAdaptationEngine {

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.log = (...args) => device.log('[DP-ADAPT]', ...args);
    this.error = (...args) => device.error('[DP-ADAPT]', ...args);
    this._destroyed = false;

    // DP pattern tracking: dpId -> { firstSeen, lastSeen, reportCount, valueHistory, intervals }
    this._dpPatterns = new Map();

    // DP group detection: identifies correlated DPs (e.g., temp + humidity sensors)
    this._dpGroups = new Map(); // groupId -> { dpIds, category, confidence }

    // Retirement tracking: DPs that have stopped reporting
    this._retiredDPs = new Map(); // dpId -> { retiredAt, lastValue }

    // Adaptation decisions log
    this._decisions = [];
    this._maxDecisions = 200;

    // Configuration
    this.CONFIG = {
      // Pattern detection
      MIN_REPORTS_FOR_PATTERN: 3,
      STABLE_VALUE_THRESHOLD: 0.02,  // 2% variance = stable

      // Retirement detection
      RETIREMENT_TIMEOUT_MS: 7 * 24 * 60 * 60 * 1000, // 7 days without report
      RETIREMENT_CHECK_INTERVAL: 60 * 60 * 1000,       // Check every hour

      // Group detection
      GROUP_CORRELATION_WINDOW_MS: 60 * 1000, // DPs within 60s = correlated
      MIN_GROUP_SIZE: 2,

      // Value anomaly detection
      ANOMALY_Z_SCORE_THRESHOLD: 3.0,
    };

    // Periodic check timer
    this._retirementTimer = null;
  }

  /**
   * Initialize the adaptation engine
   */
  async initialize() {
    this.log('Initializing DP adaptation engine...');

    // Restore persisted patterns
    try {
      const stored = await this.device.getStoreValue('dp_adaptation_patterns') || {};
      for (const [dpId, pattern] of Object.entries(stored)) {
        this._dpPatterns.set(parseInt(dpId), pattern);
      }
      this.log(`Restored patterns for ${this._dpPatterns.size} DPs`);
    } catch (err) {
      this.error('Failed to restore patterns:', err.message);
    }

    // Start retirement check
    this._startRetirementCheck();

    this.log('DP adaptation engine ready');
  }

  /**
   * Analyze an incoming DP report.
   * This is the main entry point - called for every DP report.
   *
   * @param {number} dpId - DataPoint ID
   * @param {any} value - DP value
   * @param {number|null} dpType - Tuya DP type code
   * @returns {Object} Analysis result with signals for DynamicCapabilityManager
   */
  analyzeDP(dpId, value, dpType = null) {
    if (this._destroyed) return { action: 'skip' };

    const now = Date.now();
    const result = { dpId, isNew: false, isAnomaly: false, groups: [], action: 'process' };

    // Get or create pattern for this DP
    if (!this._dpPatterns.has(dpId)) {
      this._dpPatterns.set(dpId, this._createPattern(dpId, value, dpType));
      result.isNew = true;
      this.log(`New DP pattern detected: DP${dpId} (type: ${dpType}, value: ${JSON.stringify(value)})`);
      this._recordDecision('new_dp', dpId, { value, dpType });
      return result;
    }

    const pattern = this._dpPatterns.get(dpId);

    // Update pattern
    pattern.lastSeen = now;
    pattern.reportCount++;

    // Track intervals
    if (pattern.lastReportTime) {
      const interval = now - pattern.lastReportTime;
      pattern.intervals.push(interval);
      if (pattern.intervals.length > 50) {pattern.intervals.shift();}
    }
    pattern.lastReportTime = now;

    // Track value history
    pattern.valueHistory.push({ value, time: now });
    if (pattern.valueHistory.length > 100) {pattern.valueHistory.shift();}

    // Detect if value is stable or changing
    pattern.isStable = this._isValueStable(pattern.valueHistory);

    // Detect anomalies (value suddenly far from mean)
    if (typeof value === 'number' && pattern.valueHistory.length >= 5) {
      result.isAnomaly = this._isValueAnomaly(pattern, value);
      if (result.isAnomaly) {
        this.log(`Anomaly detected on DP${dpId}: value ${value} deviates significantly from pattern`);
        this._recordDecision('anomaly', dpId, { value, mean: this._getMean(pattern), stdDev: this._getStdDev(pattern) });
      }
    }

    // Check for DP groups (correlated DPs)
    result.groups = this._checkDPGroup(dpId, now);

    // Mark as seen (not retired)
    this._retiredDPs.delete(dpId);

    return result;
  }

  /**
   * Create initial pattern for a new DP
   */
  _createPattern(dpId, value, dpType) {
    const now = Date.now();
    return {
      dpId,
      firstSeen: now,
      lastSeen: now,
      lastReportTime: now,
      reportCount: 1,
      dpType,
      valueHistory: [{ value, time: now }],
      intervals: [],
      isStable: true,
      retiredAt: null,
    };
  }

  /**
   * Check if value history is stable (low variance)
   */
  _isValueStable(history) {
    if (history.length < 3) return true;

    const numericValues = history
      .slice(-10) // Last 10 values
      .map(h => h.value)
      .filter(v => typeof v === 'number');

    if (numericValues.length < 3) return true;

    const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    if (mean === 0) return numericValues.every(v => v === 0);

    const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length;
    const cv = Math.sqrt(variance) / Math.abs(mean); // Coefficient of variation

    return cv < this.CONFIG.STABLE_VALUE_THRESHOLD;
  }

  /**
   * Detect anomalous value using z-score
   */
  _isValueAnomaly(pattern, value) {
    const mean = this._getMean(pattern);
    const stdDev = this._getStdDev(pattern);

    if (stdDev === 0) return false;

    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > this.CONFIG.ANOMALY_Z_SCORE_THRESHOLD;
  }

  _getMean(pattern) {
    const values = pattern.valueHistory
      .map(h => h.value)
      .filter(v => typeof v === 'number');
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  _getStdDev(pattern) {
    const values = pattern.valueHistory
      .map(h => h.value)
      .filter(v => typeof v === 'number');
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Check if a DP belongs to a correlated group
   * DPs that report within the same time window are considered correlated
   */
  _checkDPGroup(dpId, now) {
    const matchedGroups = [];

    for (const [groupId, group] of this._dpGroups) {
      // Check if any DP in this group was recently seen
      const hasRecentDP = group.dpIds.some(id => {
        const p = this._dpPatterns.get(id);
        return p && (now - p.lastSeen) < this.CONFIG.GROUP_CORRELATION_WINDOW_MS;
      });

      if (hasRecentDP && !group.dpIds.includes(dpId)) {
        // This DP is correlated with this group
        group.dpIds.push(dpId);
        group.confidence = Math.min(100, group.confidence + 10);
        matchedGroups.push(groupId);
        this.log(`DP${dpId} correlated with group ${groupId} (DPs: ${group.dpIds.join(',')})`);
      } else if (hasRecentDP && group.dpIds.includes(dpId)) {
        // Already in group, boost confidence
        group.confidence = Math.min(100, group.confidence + 1);
        matchedGroups.push(groupId);
      }
    }

    // Check if this DP should start a new group
    if (matchedGroups.length === 0) {
      // Find other DPs that recently reported
      const recentDPs = [];
      for (const [otherDpId, pattern] of this._dpPatterns) {
        if (otherDpId !== dpId && (now - pattern.lastSeen) < this.CONFIG.GROUP_CORRELATION_WINDOW_MS) {
          recentDPs.push(otherDpId);
        }
      }

      if (recentDPs.length > 0) {
        const groupId = `group_${dpId}_${now}`;
        this._dpGroups.set(groupId, {
          dpIds: [dpId, ...recentDPs],
          category: null,
          confidence: 30,
          createdAt: now,
        });
        this.log(`New DP group created: ${groupId} (DPs: ${[dpId, ...recentDPs].join(',')})`);
      }
    }

    return matchedGroups;
  }

  /**
   * Get reporting frequency for a DP
   */
  getReportingFrequency(dpId) {
    const pattern = this._dpPatterns.get(dpId);
    if (!pattern || pattern.intervals.length < 2) return null;

    const avgInterval = pattern.intervals.reduce((a, b) => a + b, 0) / pattern.intervals.length;
    return {
      avgIntervalMs: Math.round(avgInterval),
      reportsPerHour: Math.round(3600000 / avgInterval),
      reportCount: pattern.reportCount,
    };
  }

  /**
   * Check if a DP is considered "retired" (no reports for extended time)
   */
  isDPRetired(dpId) {
    return this._retiredDPs.has(dpId);
  }

  /**
   * Get all active DP patterns
   */
  getActivePatterns() {
    const active = [];
    for (const [dpId, pattern] of this._dpPatterns) {
      if (!pattern.retiredAt) {
        active.push({
          dpId,
          reportCount: pattern.reportCount,
          firstSeen: pattern.firstSeen,
          lastSeen: pattern.lastSeen,
          isStable: pattern.isStable,
          frequency: this.getReportingFrequency(dpId),
        });
      }
    }
    return active;
  }

  /**
   * Get DP groups for correlation analysis
   */
  getDPGroups() {
    const groups = [];
    for (const [groupId, group] of this._dpGroups) {
      if (group.confidence >= 30) {
        groups.push({
          id: groupId,
          dpIds: group.dpIds,
          category: group.category,
          confidence: group.confidence,
        });
      }
    }
    return groups;
  }

  /**
   * Start periodic retirement check
   */
  _startRetirementCheck() {
    this._retirementTimer = this.homey.setInterval(() => {
      this._checkRetirements();
    }, this.CONFIG.RETIREMENT_CHECK_INTERVAL);
  }

  /**
   * Check for DPs that have stopped reporting
   */
  _checkRetirements() {
    if (this._destroyed) return;

    const now = Date.now();
    for (const [dpId, pattern] of this._dpPatterns) {
      if (pattern.retiredAt) continue;

      const timeSinceLastReport = now - pattern.lastSeen;
      if (timeSinceLastReport > this.CONFIG.RETIREMENT_TIMEOUT_MS) {
        pattern.retiredAt = now;
        this._retiredDPs.set(dpId, {
          retiredAt: now,
          lastValue: pattern.valueHistory.length > 0
            ? pattern.valueHistory[pattern.valueHistory.length - 1].value
            : null,
        });
        this.log(`DP${dpId} retired after ${Math.round(timeSinceLastReport / 86400000)} days without reports`);
        this._recordDecision('retired', dpId, { daysSinceLastReport: Math.round(timeSinceLastReport / 86400000) });
      }
    }
  }

  /**
   * Record adaptation decision for debugging
   */
  _recordDecision(type, dpId, details) {
    this._decisions.push({
      type,
      dpId,
      details,
      timestamp: Date.now(),
    });

    if (this._decisions.length > this._maxDecisions) {
      this._decisions.shift();
    }
  }

  /**
   * Get adaptation decisions for debugging
   */
  getDecisions() {
    return [...this._decisions];
  }

  /**
   * Save patterns to device store
   */
  async save() {
    if (this._destroyed) return;

    try {
      const data = {};
      for (const [dpId, pattern] of this._dpPatterns) {
        // Only save essential data, not full value history
        data[dpId] = {
          firstSeen: pattern.firstSeen,
          lastSeen: pattern.lastSeen,
          reportCount: pattern.reportCount,
          dpType: pattern.dpType,
          isStable: pattern.isStable,
          retiredAt: pattern.retiredAt,
        };
      }
      await this.device.setStoreValue('dp_adaptation_patterns', data);
    } catch (err) {
      this.error('Save patterns failed:', err.message);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this._destroyed = true;
    if (this._retirementTimer) {
      clearInterval(this._retirementTimer);
      this._retirementTimer = null;
    }
    this._dpPatterns.clear();
    this._dpGroups.clear();
    this._retiredDPs.clear();
    this._decisions = [];
  }
}

module.exports = DPAdaptationEngine;

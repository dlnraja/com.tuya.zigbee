'use strict';

/**
 * Memory Leak Detection - PERFORMANCE #74
 *
 * Monitors heap usage for memory leaks:
 * - Periodic heap snapshots
 * - Growth rate analysis
 * - Object count tracking
 * - Leak suspicion scoring
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class MemoryLeakDetector extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Configuration
    this.checkIntervalMs = options.checkIntervalMs || 60000; // 1 minute
    this.maxSnapshots = options.maxSnapshots || 30;
    this.growthThresholdPercent = options.growthThresholdPercent || 10; // 10% growth triggers warning
    this.criticalThresholdBytes = options.criticalThresholdBytes || 50 * 1024 * 1024; // 50MB

    // State
    this._snapshots = [];
    this._checkTimer = null;
    this._objectCounts = new Map(); // key -> count
    this._suspicionScore = 0;
    this._lastCheck = 0;
    this._baselineHeap = 0;
  }

  /**
   * Start monitoring
   */
  start() {
    // Take baseline snapshot
    this._baselineHeap = this._getHeapUsed();
    this._takeSnapshot('baseline');

    // Start periodic checks
    this._checkTimer = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._performCheck();
    }, this.checkIntervalMs);

    this.homey.log('[MemoryLeak] Monitoring started, baseline:', this._formatBytes(this._baselineHeap));
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this._checkTimer) {
      this.homey.clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
  }

  /**
   * Track an object allocation (call when creating tracked objects)
   * @param {string} category - e.g., 'device', 'session', 'buffer'
   * @param {string} id - Object identifier
   */
  trackAllocation(category, id) {
    const key = `${category}:${id}`;
    this._objectCounts.set(key, (this._objectCounts.get(key) || 0) + 1);
  }

  /**
   * Track an object deallocation
   * @param {string} category
   * @param {string} id
   */
  trackDeallocation(category, id) {
    const key = `${category}:${id}`;
    const count = this._objectCounts.get(key) || 0;
    if (count <= 1) {
      this._objectCounts.delete(key);
    } else {
      this._objectCounts.set(key, count - 1);
    }
  }

  /**
   * Take a manual snapshot
   * @param {string} label
   */
  takeSnapshot(label = 'manual') {
    return this._takeSnapshot(label);
  }

  /**
   * Get current memory status
   */
  getMemoryStatus() {
    const current = this._getHeapUsed();
    const growth = this._baselineHeap > 0
      ? ((current - this._baselineHeap) / this._baselineHeap) * 100
      : 0;

    return {
      currentHeap: this._formatBytes(current),
      baselineHeap: this._formatBytes(this._baselineHeap),
      growthPercent: Math.round(growth * 10) / 10,
      heapUsedBytes: current,
      baselineBytes: this._baselineHeap,
      suspicionScore: this._suspicionScore,
      objectCategories: this._getCategoryCounts(),
      isCritical: current > this.criticalThresholdBytes,
      isWarning: growth > this.growthThresholdPercent
    };
  }

  /**
   * Get leak analysis
   */
  getLeakAnalysis() {
    if (this._snapshots.length < 3) {
      return { status: 'insufficient_data', snapshots: this._snapshots.length };
    }

    const recent = this._snapshots.slice(-5);
    const heapValues = recent.map(s => s.heapUsed);

    // Linear regression to find trend
    const n = heapValues.length;
    const xMean = (n - 1) / 2;
    const yMean = heapValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (heapValues[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const bytesPerCheck = slope; // Growth per check interval

    const estimatedTimeToCritical = bytesPerCheck > 0
      ? Math.round((this.criticalThresholdBytes - heapValues[n - 1]) / bytesPerCheck * this.checkIntervalMs / 1000)
      : Infinity;

    // Update suspicion score
    if (slope > 0) {
      this._suspicionScore = Math.min(100, this._suspicionScore + 1);
    } else {
      this._suspicionScore = Math.max(0, this._suspicionScore - 2);
    }

    return {
      status: slope > 1024 ? 'likely_leak' : slope > 0 ? 'monitoring' : 'healthy',
      trendBytesPerCheck: Math.round(slope),
      trendBytesPerHour: Math.round(slope * (3600000 / this.checkIntervalMs)),
      estimatedTimeToCriticalSeconds: estimatedTimeToCritical,
      suspicionScore: this._suspicionScore,
      recentHeapValues: heapValues.map(v => this._formatBytes(v))
    };
  }

  /**
   * Get top object categories by count
   */
  _getCategoryCounts() {
    const categories = {};
    for (const [key, count] of this._objectCounts.entries()) {
      const category = key.split(':')[0];
      categories[category] = (categories[category] || 0) + count;
    }
    return categories;
  }

  _performCheck() {
    const snapshot = this._takeSnapshot('periodic');

    // Check for rapid growth
    if (this._snapshots.length >= 2) {
      const prev = this._snapshots[this._snapshots.length - 2];
      const growthBytes = snapshot.heapUsed - prev.heapUsed;
      const growthPercent = (growthBytes / prev.heapUsed) * 100;

      if (growthPercent > this.growthThresholdPercent) {
        this.emit('rapidGrowth', {
          growthPercent: Math.round(growthPercent * 10) / 10,
          growthBytes,
          currentHeap: snapshot.heapUsed
        });
      }
    }

    // Check critical threshold
    if (snapshot.heapUsed > this.criticalThresholdBytes) {
      this.emit('criticalHeap', {
        heapUsed: snapshot.heapUsed,
        threshold: this.criticalThresholdBytes
      });
    }

    // Emit status
    this.emit('statusUpdate', this.getMemoryStatus());
  }

  _takeSnapshot(label) {
    const heapUsed = this._getHeapUsed();
    const heapTotal = this._getHeapTotal();
    const rss = this._getRSS();

    const snapshot = {
      label,
      timestamp: Date.now(),
      heapUsed,
      heapTotal,
      rss,
      objectCount: this._objectCounts.size
    };

    this._snapshots.push(snapshot);

    // Trim
    if (this._snapshots.length > this.maxSnapshots) {
      this._snapshots.shift();
    }

    return snapshot;
  }

  _getHeapUsed() {
    try {
      return process.memoryUsage().heapUsed || 0;
    } catch (e) {
      return 0;
    }
  }

  _getHeapTotal() {
    try {
      return process.memoryUsage().heapTotal || 0;
    } catch (e) {
      return 0;
    }
  }

  _getRSS() {
    try {
      return process.memoryUsage().rss || 0;
    } catch (e) {
      return 0;
    }
  }

  _formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / 1024 / 1024 * 10) / 10}MB`;
  }

  destroy() {
    this.stop();
    this._snapshots = [];
    this._objectCounts.clear();
  }
}

module.exports = MemoryLeakDetector;

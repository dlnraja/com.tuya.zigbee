'use strict';

/**
 * Real-Time Communication Monitor - UX #89
 *
 * Monitors and displays real-time device communication:
 * - Live message feed
 * - TX/RX statistics per device
 * - Protocol distribution (ZCL vs Tuya DP)
 * - Error rate tracking
 * - Signal quality overlay
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class RealTimeCommunicationMonitor extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Configuration
    this.maxFeedEntries = options.maxFeedEntries || 200;
    this.statsWindowMs = options.statsWindowMs || 60000; // 1 minute window
    this.showRawData = options.showRawData || false;

    // Live feed
    this._feed = [];
    this._isCapturing = false;

    // Per-device stats
    this._deviceStats = new Map(); // deviceId -> { tx, rx, errors, protocols, lastActivity }
    this._globalStats = {
      totalTx: 0,
      totalRx: 0,
      totalErrors: 0,
      startTime: Date.now()
    };

    // Protocol distribution
    this._protocolCounts = {
      zcl: 0,
      tuya_dp: 0,
      unknown: 0
    };
  }

  /**
   * Start capturing communications
   */
  startCapture() {
    this._isCapturing = true;
    this.emit('captureStarted');
    this.homey.log('[CommMonitor] Capture started');
  }

  /**
   * Stop capturing
   */
  stopCapture() {
    this._isCapturing = false;
    this.emit('captureStopped');
    this.homey.log('[CommMonitor] Capture stopped');
  }

  /**
   * Record a transmitted message (device <- app)
   * @param {string} deviceId
   * @param {Object} message - { type, dpId, value, protocol, cluster }
   */
  recordTX(deviceId, message = {}) {
    if (!this._isCapturing) return;

    const entry = {
      direction: 'TX',
      deviceId,
      timestamp: Date.now(),
      type: message.type || 'command',
      dpId: message.dpId,
      value: this.showRawData ? message.value : this._truncateValue(message.value),
      protocol: message.protocol || 'unknown',
      cluster: message.cluster,
      endpoint: message.endpoint
    };

    this._addToFeed(entry);
    this._updateDeviceStats(deviceId, 'tx', message.protocol);
    this._globalStats.totalTx++;

    const proto = this._mapProtocol(message.protocol);
    this._protocolCounts[proto]++;

    this.emit('tx', entry);
  }

  /**
   * Record a received message (device -> app)
   * @param {string} deviceId
   * @param {Object} message
   */
  recordRX(deviceId, message = {}) {
    if (!this._isCapturing) return;

    const entry = {
      direction: 'RX',
      deviceId,
      timestamp: Date.now(),
      type: message.type || 'report',
      dpId: message.dpId,
      value: this.showRawData ? message.value : this._truncateValue(message.value),
      protocol: message.protocol || 'unknown',
      cluster: message.cluster,
      endpoint: message.endpoint,
      rssi: message.rssi
    };

    this._addToFeed(entry);
    this._updateDeviceStats(deviceId, 'rx', message.protocol);
    this._globalStats.totalRx++;

    const proto = this._mapProtocol(message.protocol);
    this._protocolCounts[proto]++;

    this.emit('rx', entry);
  }

  /**
   * Record a communication error
   * @param {string} deviceId
   * @param {Object} error
   */
  recordError(deviceId, error = {}) {
    const entry = {
      direction: 'ERR',
      deviceId,
      timestamp: Date.now(),
      type: 'error',
      errorMessage: error.message || 'Unknown error',
      errorCode: error.code,
      protocol: error.protocol
    };

    this._addToFeed(entry);
    this._globalStats.totalErrors++;

    const stats = this._getOrCreateDeviceStats(deviceId);
    stats.errors++;

    this.emit('error', entry);
  }

  /**
   * Get live feed entries
   * @param {Object} filter - { deviceId, direction, protocol, limit, since }
   * @returns {Array}
   */
  getFeed(filter = {}) {
    let feed = [...this._feed];

    if (filter.deviceId) {
      feed = feed.filter(e => e.deviceId === filter.deviceId);
    }
    if (filter.direction) {
      feed = feed.filter(e => e.direction === filter.direction);
    }
    if (filter.protocol) {
      feed = feed.filter(e => e.protocol === filter.protocol);
    }
    if (filter.since) {
      feed = feed.filter(e => e.timestamp >= filter.since);
    }

    return filter.limit ? feed.slice(-filter.limit) : feed;
  }

  /**
   * Get device communication stats
   * @param {string} deviceId
   */
  getDeviceStats(deviceId) {
    const stats = this._deviceStats.get(deviceId);
    if (!stats) return null;

    const now = Date.now();
    const windowStart = now - this.statsWindowMs;

    // Count recent messages
    const recentFeed = this._feed.filter(e =>
      e.deviceId === deviceId && e.timestamp > windowStart
    );

    return {
      deviceId,
      totalTx: stats.tx,
      totalRx: stats.rx,
      totalErrors: stats.errors,
      recentTx: recentFeed.filter(e => e.direction === 'TX').length,
      recentRx: recentFeed.filter(e => e.direction === 'RX').length,
      recentErrors: recentFeed.filter(e => e.direction === 'ERR').length,
      protocols: stats.protocols,
      lastActivity: stats.lastActivity,
      errorRate: stats.rx > 0 ? Math.round((stats.errors / (stats.tx + stats.rx)) * 100) : 0
    };
  }

  /**
   * Get global stats
   */
  getGlobalStats() {
    const uptimeMs = Date.now() - this._globalStats.startTime;
    const uptimeMinutes = Math.round(uptimeMs / 60000);

    return {
      ...this._globalStats,
      uptimeMinutes,
      messagesPerMinute: uptimeMinutes > 0
        ? Math.round((this._globalStats.totalTx + this._globalStats.totalRx) / uptimeMinutes)
        : 0,
      errorRate: (this._globalStats.totalTx + this._globalStats.totalRx) > 0
        ? Math.round((this._globalStats.totalErrors / (this._globalStats.totalTx + this._globalStats.totalRx)) * 100)
        : 0,
      protocolDistribution: { ...this._protocolCounts },
      deviceCount: this._deviceStats.size,
      isCapturing: this._isCapturing
    };
  }

  /**
   * Get top talkers (most active devices)
   * @param {number} limit
   */
  getTopTalkers(limit = 10) {
    const devices = [];
    for (const [deviceId, stats] of this._deviceStats.entries()) {
      devices.push({
        deviceId,
        totalMessages: stats.tx + stats.rx,
        tx: stats.tx,
        rx: stats.rx,
        errors: stats.errors,
        lastActivity: stats.lastActivity
      });
    }

    return devices
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, limit);
  }

  /**
   * Clear all captured data
   */
  clearAll() {
    this._feed = [];
    this._deviceStats.clear();
    this._globalStats = { totalTx: 0, totalRx: 0, totalErrors: 0, startTime: Date.now() };
    this._protocolCounts = { zcl: 0, tuya_dp: 0, unknown: 0 };
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _addToFeed(entry) {
    this._feed.push(entry);
    if (this._feed.length > this.maxFeedEntries) {
      this._feed = this._feed.slice(-this.maxFeedEntries);
    }
  }

  _getOrCreateDeviceStats(deviceId) {
    if (!this._deviceStats.has(deviceId)) {
      this._deviceStats.set(deviceId, {
        tx: 0, rx: 0, errors: 0,
        protocols: { zcl: 0, tuya_dp: 0, unknown: 0 },
        lastActivity: null
      });
    }
    return this._deviceStats.get(deviceId);
  }

  _updateDeviceStats(deviceId, direction, protocol) {
    const stats = this._getOrCreateDeviceStats(deviceId);
    stats[direction]++;
    stats.lastActivity = Date.now();

    const proto = this._mapProtocol(protocol);
    stats.protocols[proto]++;
  }

  _mapProtocol(protocol) {
    if (!protocol) return 'unknown';
    const p = String(protocol).toLowerCase();
    if (p.includes('zcl') || p.includes('cluster')) return 'zcl';
    if (p.includes('tuya') || p.includes('dp') || p.includes('ef00')) return 'tuya_dp';
    return 'unknown';
  }

  _truncateValue(value) {
    if (value === null || value === undefined) return value;
    const str = String(value);
    return str.length > 50 ? str.substring(0, 50) + '...' : value;
  }

  destroy() {
    this._feed = [];
    this._deviceStats.clear();
  }
}

module.exports = RealTimeCommunicationMonitor;

'use strict';

/**
 * ConnectionStateTracker - Track device connection state with history and statistics
 * v5.0.0 - TITAN Protocol V5
 *
 * Tracks connection state transitions for WiFi and Zigbee devices.
 * Emits 'stateChange' events for listeners to react to connectivity changes.
 *
 * Usage:
 *   const tracker = new ConnectionStateTracker();
 *   tracker.on('stateChange', ({ oldState, newState, timestamp }) => {
 *     if (newState === 'connected') { ... }
 *   });
 *   tracker.state = 'connected';
 */

const EventEmitter = require('events');

class ConnectionStateTracker extends EventEmitter {
  /**
   * Create a new connection state tracker
   * @param {Object} options - Configuration options
   * @param {string} options.deviceId - Device identifier for logging
   * @param {number} options.maxHistory - Maximum history entries to keep (default: 100)
   * @param {number} options.staleThreshold - Ms before connection considered stale (default: 300000 = 5min)
   */
  constructor(options = {}) {
    super();
    this._state = 'disconnected';
    this._lastConnected = null;
    this._lastDisconnected = null;
    this._reconnectCount = 0;
    this._disconnectCount = 0;
    this._history = [];
    this._maxHistory = options.maxHistory || 100;
    this._staleThreshold = options.staleThreshold || 300000; // 5 minutes
    this._deviceId = options.deviceId || 'unknown';
    this._connectedSince = null;
    this._totalConnectedTime = 0;
    this._totalDisconnectedTime = 0;
    this._lastStateChangeTime = Date.now();
  }

  /**
   * Get current connection state
   * @returns {string} Current state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
   */
  get state() {
    return this._state;
  }

  /**
   * Set connection state (triggers stateChange event)
   * @param {string} newState - New state value
   */
  set state(newState) {
    const validStates = ['disconnected', 'connecting', 'connected', 'reconnecting', 'error'];
    if (!validStates.includes(newState)) {
      throw new Error(`Invalid state: ${newState}. Valid states: ${validStates.join(', ')}`);
    }

    const oldState = this._state;
    if (oldState === newState) return; // No-op for same state

    const timestamp = Date.now();
    const duration = timestamp - this._lastStateChangeTime;

    // Update statistics
    this._updateStats(oldState, newState, duration);

    // Update state
    this._state = newState;
    this._lastStateChangeTime = timestamp;

    // Record history
    this._recordHistory(oldState, newState, timestamp, duration);

    // Emit event
    this.emit('stateChange', {
      oldState,
      newState,
      timestamp,
      duration,
      deviceId: this._deviceId,
    });
  }

  /**
   * Check if device is currently connected
   * @returns {boolean}
   */
  get isConnected() {
    return this._state === 'connected';
  }

  /**
   * Check if device is in a transitional state
   * @returns {boolean}
   */
  get isTransitioning() {
    return this._state === 'connecting' || this._state === 'reconnecting';
  }

  /**
   * Check if connection is stale (connected but no recent activity)
   * @returns {boolean}
   */
  get isStale() {
    if (this._state !== 'connected' || !this._connectedSince) return false;
    return (Date.now() - this._connectedSince) > this._staleThreshold;
  }

  /**
   * Get time since last state change
   * @returns {number} Milliseconds since last state change
   */
  get timeSinceLastChange() {
    return Date.now() - this._lastStateChangeTime;
  }

  /**
   * Get time connected in current session
   * @returns {number} Milliseconds connected (0 if not connected)
   */
  get currentConnectionDuration() {
    if (this._state !== 'connected' || !this._connectedSince) return 0;
    return Date.now() - this._connectedSince;
  }

  /**
   * Update internal statistics
   * @param {string} oldState - Previous state
   * @param {string} newState - New state
   * @param {number} duration - Time spent in old state (ms)
   */
  _updateStats(oldState, newState, duration) {
    if (newState === 'connected') {
      this._lastConnected = Date.now();
      this._connectedSince = Date.now();
      this._reconnectCount++;
      this._totalDisconnectedTime += duration;
    } else if (oldState === 'connected') {
      this._lastDisconnected = Date.now();
      this._connectedSince = null;
      this._disconnectCount++;
      this._totalConnectedTime += duration;
    }
  }

  /**
   * Record state transition in history
   * @param {string} oldState - Previous state
   * @param {string} newState - New state
   * @param {number} timestamp - Transition timestamp
   * @param {number} duration - Time spent in old state
   */
  _recordHistory(oldState, newState, timestamp, duration) {
    this._history.push({
      from: oldState,
      to: newState,
      timestamp,
      duration,
    });

    // Trim history to max size
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory);
    }
  }

  /**
   * Get comprehensive connection statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const now = Date.now();
    return {
      deviceId: this._deviceId,
      state: this._state,
      isConnected: this.isConnected,
      isTransitioning: this.isTransitioning,
      isStale: this.isStale,
      lastConnected: this._lastConnected,
      lastDisconnected: this._lastDisconnected,
      connectedSince: this._connectedSince,
      reconnectCount: this._reconnectCount,
      disconnectCount: this._disconnectCount,
      currentConnectionDuration: this.currentConnectionDuration,
      totalConnectedTime: this._totalConnectedTime + (this._state === 'connected' ? (now - (this._connectedSince || now)) : 0),
      totalDisconnectedTime: this._totalDisconnectedTime + (this._state !== 'connected' ? (now - this._lastStateChangeTime) : 0),
      timeSinceLastChange: this.timeSinceLastChange,
      uptime: this._reconnectCount > 0 ? this._calculateUptime() : 0,
    };
  }

  /**
   * Calculate connection uptime percentage
   * @returns {number} Uptime percentage (0-100)
   */
  _calculateUptime() {
    const total = this._totalConnectedTime + this._totalDisconnectedTime;
    if (total === 0) return 0;
    return Math.round((this._totalConnectedTime / total) * 100 * 100) / 100;
  }

  /**
   * Get state transition history
   * @param {number} limit - Number of recent entries to return
   * @returns {Array} History entries
   */
  getHistory(limit = 10) {
    return this._history.slice(-limit);
  }

  /**
   * Mark as connected (convenience method)
   */
  markConnected() {
    this.state = 'connected';
  }

  /**
   * Mark as disconnected (convenience method)
   */
  markDisconnected() {
    this.state = 'disconnected';
  }

  /**
   * Mark as connecting (convenience method)
   */
  markConnecting() {
    this.state = 'connecting';
  }

  /**
   * Mark as reconnecting (convenience method)
   */
  markReconnecting() {
    this.state = 'reconnecting';
  }

  /**
   * Mark as error state (convenience method)
   */
  markError() {
    this.state = 'error';
  }

  /**
   * Reset all statistics and history
   */
  reset() {
    this._state = 'disconnected';
    this._lastConnected = null;
    this._lastDisconnected = null;
    this._reconnectCount = 0;
    this._disconnectCount = 0;
    this._history = [];
    this._connectedSince = null;
    this._totalConnectedTime = 0;
    this._totalDisconnectedTime = 0;
    this._lastStateChangeTime = Date.now();
  }

  /**
   * Export state for persistence
   * @returns {Object} Serializable state object
   */
  toJSON() {
    return {
      deviceId: this._deviceId,
      state: this._state,
      lastConnected: this._lastConnected,
      lastDisconnected: this._lastDisconnected,
      reconnectCount: this._reconnectCount,
      disconnectCount: this._disconnectCount,
      totalConnectedTime: this._totalConnectedTime,
      totalDisconnectedTime: this._totalDisconnectedTime,
      history: this._history.slice(-20), // Keep last 20 for persistence
    };
  }

  /**
   * Restore state from persisted data
   * @param {Object} data - Persisted state object
   */
  fromJSON(data) {
    if (!data) return;
    this._deviceId = data.deviceId || this._deviceId;
    this._state = data.state || 'disconnected';
    this._lastConnected = data.lastConnected || null;
    this._lastDisconnected = data.lastDisconnected || null;
    this._reconnectCount = data.reconnectCount || 0;
    this._disconnectCount = data.disconnectCount || 0;
    this._totalConnectedTime = data.totalConnectedTime || 0;
    this._totalDisconnectedTime = data.totalDisconnectedTime || 0;
    this._history = data.history || [];
  }
}

module.exports = ConnectionStateTracker;

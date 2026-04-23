'use strict';
const { safeMultiply } = require('./tuyaUtils.js');

/**
 * UniversalThrottleManager - v5.7.36
 * 
 * Provides consistent throttling, debouncing, and deduplication
 * across all device handlers to prevent log flooding and duplicate triggers.
 * 
 * Features:
 * - Per-capability value deduplication (same value won't trigger twice)
 * - Configurable throttle windows per capability type
 * - Global log throttling to prevent console spam
 * - Flow trigger deduplication
 */

// Singleton instance for global throttle state
const ATTRS = {
  // Per-device capability value cache: { deviceId: { capabilityId: { value, timestamp } } }
  capabilityCache: new Map(),
  
  // Per-device flow trigger cache: { deviceId: { flowId: timestamp } }
  flowTriggerCache: new Map(),
  
  // Log throttle cache: { logKey: timestamp }
  logCache: new Map(),
  
  // v5.13.1: TX/RX tracking for flood prevention
  // Per-device TX counter: { deviceId: { count, windowStart, blocked } }
  txTracker: new Map(),
  
  // Per-device RX counter: { deviceId: { count, windowStart } }
  rxTracker: new Map(),
  
  // Cleanup interval
  cleanupInterval,
};

// v5.13.1: TX/RX limits per time window (prevent Zigbee flooding)
const TX_RX_LIMITS = {
  txPerMinute: 30,      // Max TX commands per device per minute
  rxPerMinute: 120,     // Max RX reports per device per minute (higher for sensors)
  burstWindow: 5000,    // Burst detection window (5 seconds)
  burstLimit: 10,       // Max commands in burst window
  cooldownMs: 30000,    // Cooldown when limit exceeded
};

// Default throttle windows (ms)
const THROTTLE_WINDOWS = {
  // Sensor values - allow updates every 5 seconds
  measure_temperature: 30000,
  measure_humidity: 30000,
  measure_luminance: 30000,
  measure_battery: 600000,  // Battery only every 10 minutes
  measure_power: 5000,
  measure_voltage: 10000,
  measure_current: 10000,
  'measure_luminance.distance': 10000,
  
  // Alarms - immediate but dedupe same value
  alarm_motion: 2000,
  alarm_contact: 1000,
  alarm_water: 500,
  alarm_smoke: 500,
  alarm_generic: 500,
  
  // Switch states - fast response
  onoff: 300,
  dim: 500,
  
  // Default for unknown capabilities
  default: 1000,
};

// Log throttle - same log message limited to once per interval
const LOG_THROTTLE_MS = 5000;

/**
 * Get throttle window for a capability
 */
function getThrottleWindow(capabilityId) {
  // Check exact match first
  if (THROTTLE_WINDOWS[capabilityId]) {
    return THROTTLE_WINDOWS[capabilityId];
  }
  
  // Check prefix matches
  for (const [prefix, window] of Object.entries(THROTTLE_WINDOWS)) {
    if (capabilityId.startsWith(prefix)) {
      return window;
    }
  }
  
  return THROTTLE_WINDOWS.default;
}

/**
 * Check if capability value should be updated (not duplicate or throttled)
 * 
 * @param {string} deviceId - Unique device identifier
 * @param {string} capabilityId - Capability ID
 * @param {any} value - New value to set
 * @param {Object} options - Options
 * @param {number} options.throttleMs - Override throttle window
 * @param {boolean} options.forceDedupe - Only dedupe, don't throttle
 * @returns {{ shouldUpdate: boolean, reason: string }}
 */
function shouldUpdateCapability(deviceId, capabilityId, value, options = {}) {
  const now = Date.now();
  const throttleMs = options.throttleMs || getThrottleWindow(capabilityId);
  
  // Get or create device cache
  if (!globalState.capabilityCache.has(deviceId)) {
    globalState.capabilityCache.set(deviceId, new Map());
  }
  const deviceCache = globalState.capabilityCache.get(deviceId);
  
  // Get last value/time for this capability
  const lastEntry = deviceCache.get(capabilityId);
  
  if (lastEntry) {
    const timeSinceLastUpdate = now - lastEntry.timestamp;
    
    // Value deduplication - same value within throttle window
    if (lastEntry.value === value && timeSinceLastUpdate < throttleMs) {
      return { 
        shouldUpdate: false, 
        reason: `duplicate_value (${value}, ${timeSinceLastUpdate}ms ago)` 
      };
    }
    
    // Time throttle (unless forceDedupe which only checks value)
    if (!options.forceDedupe && timeSinceLastUpdate < throttleMs) {
      // Allow if value changed significantly for numeric values
      if (typeof value === 'number' && typeof lastEntry.value === 'number') {
        const percentChange = Math.abs((value - lastEntry.value / (lastEntry.value || 1)), 100);
        // Allow >5% change even within throttle window
        if (percentChange < 5) {
          return { 
            shouldUpdate: false, 
            reason: `throttled (${timeSinceLastUpdate}ms < ${throttleMs}ms, change=${percentChange.toFixed(1)}%)` 
          };
        }
      } else {
        return { 
          shouldUpdate: false, 
          reason: `throttled (${timeSinceLastUpdate}ms < ${throttleMs}ms)` 
        };
      }
    }
  }
  
  // Update cache
  deviceCache.set(capabilityId, { value, timestamp: now });
  
  return { shouldUpdate: true, reason: 'ok' };
}

/**
 * Check if flow trigger should fire (not duplicate)
 * 
 * @param {string} deviceId - Unique device identifier
 * @param {string} flowId - Flow card ID
 * @param {number} dedupeMs - Deduplication window (default 500ms)
 * @returns {boolean} - True if should trigger
 */
function shouldTriggerFlow(deviceId, flowId, dedupeMs = 500) {
  const now = Date.now();
  
  // Get or create device cache
  if (!globalState.flowTriggerCache.has(deviceId)) {
    globalState.flowTriggerCache.set(deviceId, new Map());
  }
  const deviceCache = globalState.flowTriggerCache.get(deviceId);
  
  const lastTrigger = deviceCache.get(flowId);
  
  if (lastTrigger && (now - lastTrigger) < dedupeMs) {
    return false; // Duplicate trigger
  }
  
  deviceCache.set(flowId, now);
  return true;
}

/**
 * Check if log should be shown (not spamming)
 * 
 * @param {string} logKey - Unique key for this log type
 * @param {number} throttleMs - Throttle window (default 5000ms)
 * @returns {boolean} - True if should log
 */
function shouldLog(logKey, throttleMs = LOG_THROTTLE_MS) {
  const now = Date.now();
  const lastLog = globalState.logCache.get(logKey);
  
  if (lastLog && (now - lastLog) < throttleMs) {
    return false;
  }
  
  globalState.logCache.set(logKey, now);
  return true;
}

/**
 * Clear cache for a device (call on device delete)
 */
function clearDeviceCache(deviceId) {
  globalState.capabilityCache.delete(deviceId);
  globalState.flowTriggerCache.delete(deviceId);
}

/**
 * Cleanup old entries (run periodically)
 */
function cleanup() {
  const now = Date.now();
  const maxAge = 300000; // 5 minutes
  
  // Clean capability cache
  for (const [deviceId, deviceCache] of globalState.capabilityCache.entries()) {
    for (const [capId, entry] of deviceCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        deviceCache.delete(capId);
      }
    }
    if (deviceCache.size === 0) {
      globalState.capabilityCache.delete(deviceId);
    }
  }
  
  // Clean flow trigger cache
  for (const [deviceId, deviceCache] of globalState.flowTriggerCache.entries()) {
    for (const [flowId, timestamp] of deviceCache.entries()) {
      if (now - timestamp > maxAge) {
        deviceCache.delete(flowId);
      }
    }
    if (deviceCache.size === 0) {
      globalState.flowTriggerCache.delete(deviceId);
    }
  }
  
  // Clean log cache
  for (const [logKey, timestamp] of globalState.logCache.entries()) {
    if (now - timestamp > maxAge) {
      globalState.logCache.delete(logKey);
    }
  }
}

// Start cleanup interval if not already running
if (!globalState.cleanupInterval) {
  globalState.cleanupInterval = setInterval(cleanup, 60000); // Every minute
  // Don't prevent process exit
  if (globalState.cleanupInterval.unref) {
    globalState.cleanupInterval.unref();
  }
}

/**
 * Create a throttled version of a function
 * 
 * @param {Function} fn - Function to throttle
 * @param {number} wait - Throttle window in ms
 * @returns {Function} - Throttled function
 */
function throttle(fn, wait) {
  let lastCall = 0;
  let lastResult;
  
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      lastResult = fn.apply(this, args);
    }
    return lastResult;
  };
}

/**
 * Create a debounced version of a function
 * 
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Debounce window in ms
 * @returns {Function} - Debounced function
 */
function debounce(fn, wait) {
  let timeout;
  
  return function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}

/**
 * Get statistics for debugging
 */
function trackTx(deviceId) {
  const now = Date.now();
  if (!globalState.txTracker.has(deviceId)) {
    globalState.txTracker.set(deviceId, { count: 0, windowStart: now, blocked: false, blockedUntil: 0 });
  }
  const t = globalState.txTracker.get(deviceId);
  if (t.blocked && now < t.blockedUntil) return { allowed: false, reason: 'cooldown' };
  if (t.blocked) { t.blocked = false; t.count = 0; t.windowStart = now; }
  if (now - t.windowStart > 60000) { t.count = 0; t.windowStart = now; }
  t.count++;
  if (t.count > TX_RX_LIMITS.txPerMinute) {
    t.blocked = true; t.blockedUntil = now + TX_RX_LIMITS.cooldownMs;
    return { allowed: false, reason: 'rate_limit' };
  }
  return { allowed: true, count: t.count };
}

function trackRx(deviceId) {
  const now = Date.now();
  if (!globalState.rxTracker.has(deviceId)) {
    globalState.rxTracker.set(deviceId, { count: 0, windowStart: now });
  }
  const t = globalState.rxTracker.get(deviceId);
  if (now - t.windowStart > 60000) { t.count = 0; t.windowStart = now; }
  t.count++;
  return { count: t.count, exceeded: t.count > TX_RX_LIMITS.rxPerMinute };
}

function getStats() {
  return {
    deviceCount: globalState.capabilityCache.size,
    flowCacheCount: globalState.flowTriggerCache.size,
    logCacheCount: globalState.logCache.size,
    txTrackerCount: globalState.txTracker.size,
    rxTrackerCount: globalState.rxTracker.size,
  };
}

module.exports = {
  shouldUpdateCapability,
  shouldTriggerFlow,
  shouldLog,
  clearDeviceCache,
  cleanup,
  throttle,
  trackTx,
  trackRx,
  TX_RX_LIMITS,
  debounce,
  getStats,
  getThrottleWindow,
  THROTTLE_WINDOWS,
};

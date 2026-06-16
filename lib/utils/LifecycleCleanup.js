'use strict';

/**
 * LifecycleCleanup - Shared cleanup utilities for device classes
 *
 * Extracts duplicated try/catch cleanup patterns from BaseUnifiedDevice,
 * UnifiedSwitchBase, UnifiedSensorBase, and other device classes.
 *
 * Follows CLAUDE.md rules:
 * - Uses this.log/this.error (not console.log) when device context available
 * - Safe cleanup: every operation wrapped in try/catch
 * - Null-safe: checks typeof before calling cleanup methods
 */

/**
 * Safely call cleanup/destroy on a manager instance
 * @param {Object} ctx - Device instance (for logging)
 * @param {Object|null} manager - The manager to clean up
 * @param {string} name - Human-readable name for logging
 */
function safeCleanupManager(ctx, manager, name) {
  if (!manager) return;
  try {
    if (typeof manager.cleanup === 'function') {
      manager.cleanup();
    } else if (typeof manager.destroy === 'function') {
      manager.destroy();
    }
    ctx.log(`[CLEANUP] ${name} cleaned up`);
  } catch (err) {
    ctx.error(`[CLEANUP] ${name} cleanup failed:`, err.message);
  }
}

/**
 * Remove all tracked cluster listeners from a device
 * @param {Object} ctx - Device instance (for logging)
 * @returns {number} Number of listeners removed
 */
function removeClusterListeners(ctx) {
  if (!ctx._clusterListeners || ctx._clusterListeners.length === 0) return 0;

  let removed = 0;
  ctx.log(`[CLEANUP] Removing ${ctx._clusterListeners.length} cluster listeners...`);

  for (const listener of ctx._clusterListeners) {
    try {
      if (listener.cluster && typeof listener.cluster.removeListener === 'function') {
        listener.cluster.removeListener(listener.event, listener.handler);
        removed++;
      } else if (listener.cluster && typeof listener.cluster.off === 'function') {
        listener.cluster.off(listener.event, listener.handler);
        removed++;
      }
    } catch (err) {
      ctx.error(`[CLEANUP] Could not remove listener ${listener.event}:`, err.message);
    }
  }

  ctx._clusterListeners = [];
  ctx.log(`[CLEANUP] Removed ${removed} cluster listeners`);
  return removed;
}

/**
 * Clear all tracked timers on a device
 * @param {Object} ctx - Device instance
 * @param {string[]} timerNames - Array of timer property names
 */
function clearTimers(ctx, timerNames) {
  for (const name of timerNames) {
    if (ctx[name]) {
      clearTimeout(ctx[name]);
      ctx[name] = null;
    }
  }
}

/**
 * Clear interval timers on a device
 * @param {Object} ctx - Device instance
 * @param {string[]} intervalNames - Array of interval property names
 */
function clearIntervals(ctx, intervalNames) {
  for (const name of intervalNames) {
    if (ctx[name]) {
      clearInterval(ctx[name]);
      ctx[name] = null;
    }
  }
}

/**
 * Perform a complete device cleanup sequence
 * Common pattern used by BaseUnifiedDevice.onDeleted and UnifiedSwitchBase.onDeleted
 *
 * @param {Object} ctx - Device instance
 * @param {Object} options - Cleanup configuration
 * @param {Object[]} options.managers - Array of { instance, name } to clean up
 * @param {string[]} options.timerNames - Timer property names to clear
 * @param {string[]} options.intervalNames - Interval property names to clear
 */
function performFullCleanup(ctx, options = {}) {
  const {
    managers = [],
    timerNames = [],
    intervalNames = [],
  } = options;

  // Remove cluster listeners
  removeClusterListeners(ctx);

  // Clean up managers
  for (const { instance, name } of managers) {
    safeCleanupManager(ctx, instance, name);
  }

  // Clear timers
  clearTimers(ctx, timerNames);

  // Clear intervals
  clearIntervals(ctx, intervalNames);
}

/**
 * Safely read a ZCL attribute with timeout
 * Common pattern duplicated in _forceReadAllInitialValues and registerAllCapabilitiesWithReporting
 *
 * @param {Object} cluster - ZCL cluster instance
 * @param {string} attribute - Attribute name to read
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<any|null>} - Attribute value or null
 */
async function safeReadAttribute(cluster, attribute, timeout = 5000) {
  if (!cluster || typeof cluster.readAttributes !== 'function') return null;
  try {
    const { ZigbeeTimeout } = require('./ZigbeeTimeout');
    const result = await ZigbeeTimeout.readAttributes(cluster, [attribute], timeout);
    return result?.[attribute] ?? null;
  } catch {
    return null;
  }
}

module.exports = {
  safeCleanupManager,
  removeClusterListeners,
  clearTimers,
  clearIntervals,
  performFullCleanup,
  safeReadAttribute,
};

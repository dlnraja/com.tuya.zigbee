'use strict';

/**
 * BootBudget — keep Homey Pro JS heap free for driver onNodeInit.
 *
 * WHY: Peter #2183 (9.0.589) showed Universal Tuya at 93.8 MB, greyed Flows,
 * and sleepy SOS/button/water/contact that never finish starting. Feature
 * managers + UDP discovery + ID-database scans compete with device init.
 * HOW: Defer MASTER_ONLY extras; skip them when heap is already high.
 * WHO: Homey Test / master soak. Not a stable-v5 feature dump.
 * WHEN: app.onInit immediately vs delayed pass.
 * AGAINST: Loading mfs overlays / energy history / WiFi UDP before gangs exist.
 */

const HEAP_HEAVY_MAX_BYTES = 42 * 1024 * 1024;
const DEFER_MS = 60 * 1000;

function heapUsedBytes() {
  try {
    return (process.memoryUsage() && process.memoryUsage().heapUsed) || 0;
  } catch (_e) {
    return 0;
  }
}

function heapUsedMb() {
  return Math.round((heapUsedBytes() / (1024 * 1024)) * 10) / 10;
}

function shouldStartHeavyFeatures(bytes) {
  const used = Number.isFinite(bytes) ? bytes : heapUsedBytes();
  return used < HEAP_HEAVY_MAX_BYTES;
}

module.exports = {
  HEAP_HEAVY_MAX_BYTES,
  DEFER_MS,
  heapUsedBytes,
  heapUsedMb,
  shouldStartHeavyFeatures,
};

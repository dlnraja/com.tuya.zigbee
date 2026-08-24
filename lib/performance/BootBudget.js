'use strict';

/**
 * BootBudget — keep Homey Pro JS heap free for driver onNodeInit,
 * then run the same features later when RAM and radio allow it.
 *
 * WHY: Peter #2183 (9.0.589) showed Universal Tuya at 93.8 MB, greyed Flows,
 * and sleepy SOS/button/water/contact that never finish starting.
 * HOW: Defer MASTER_ONLY extras; skip TX while asleep or when heap is high;
 *      retry engines; scale caches. Features stay in the app — they wait.
 * WHO: Homey Test / master soak.
 * WHEN: app.onInit vs delayed pass vs device wake.
 * AGAINST: Dropping engines forever, or polling sleepy nodes at boot.
 */

const HEAP_HEAVY_MAX_BYTES = 42 * 1024 * 1024;
const HEAP_CRITICAL_BYTES = 52 * 1024 * 1024;
const DEFER_MS = 60 * 1000;
const RETRY_MS = 120 * 1000;
const AWAKE_WINDOW_MS = 20 * 1000;

function heapUsedBytes() {
  try {
    return (process.memoryUsage() && process.memoryUsage().heapUsed) || 0;
  } catch (_e) {
    return 0;
  }
}

function resolveHeapBytes(bytes, device) {
  if (Number.isFinite(bytes)) {return bytes;}
  if (Number.isFinite(device?._bootBudgetHeapBytes)) {return device._bootBudgetHeapBytes;}
  return heapUsedBytes();
}

function heapUsedMb() {
  return Math.round((heapUsedBytes() / (1024 * 1024)) * 10) / 10;
}

function shouldStartHeavyFeatures(bytes, device) {
  return resolveHeapBytes(bytes, device) < HEAP_HEAVY_MAX_BYTES;
}

function isHeapCritical(bytes, device) {
  return resolveHeapBytes(bytes, device) >= HEAP_CRITICAL_BYTES;
}

function shouldDoBackgroundWork(bytes, device) {
  return !isHeapCritical(bytes, device) && shouldStartHeavyFeatures(bytes, device);
}

function adaptiveCacheMemory(bytes, device) {
  const used = resolveHeapBytes(bytes, device);
  if (used >= HEAP_HEAVY_MAX_BYTES) {return 2 * 1024 * 1024;}
  if (used >= 28 * 1024 * 1024) {return 4 * 1024 * 1024;}
  return 8 * 1024 * 1024;
}

function adaptiveCacheSize(bytes, device) {
  const mem = adaptiveCacheMemory(bytes, device);
  if (mem >= 8 * 1024 * 1024) {return 800;}
  if (mem >= 4 * 1024 * 1024) {return 400;}
  return 200;
}

function markRadioActivity(device) {
  if (!device) {return;}
  device._lastRadioActivity = Date.now();
}

function isRecentlyAwake(device, windowMs = AWAKE_WINDOW_MS) {
  if (!device) {return false;}
  const t = device._lastRadioActivity || device._lastActivity || 0;
  return t > 0 && (Date.now() - t) < windowMs;
}

function shouldTxSleepy(device, bytes) {
  if (isHeapCritical(bytes, device)) {return false;}
  if (!device) {return false;}
  if (device.forceActiveTuyaMode === true) {return true;}
  if (device.mainsPowered === true) {return true;}
  return isRecentlyAwake(device);
}

function noteSeenDp(device, dpId) {
  if (!device) {return;}
  markRadioActivity(device);
  const n = Number(dpId);
  if (!Number.isFinite(n)) {return;}
  if (!device._seenDpIds) {device._seenDpIds = new Set();}
  device._seenDpIds.add(n);
}

function seenDpList(device, max = 3) {
  if (!device?._seenDpIds) {return [];}
  return Array.from(device._seenDpIds).slice(0, max);
}

function maybeGc() {
  if (typeof global.gc !== 'function') {return;}
  if (heapUsedBytes() < HEAP_HEAVY_MAX_BYTES) {return;}
  try { global.gc(); } catch (_e) { /* best-effort */ }
}

module.exports = {
  HEAP_HEAVY_MAX_BYTES,
  HEAP_CRITICAL_BYTES,
  DEFER_MS,
  RETRY_MS,
  AWAKE_WINDOW_MS,
  heapUsedBytes,
  heapUsedMb,
  shouldStartHeavyFeatures,
  isHeapCritical,
  shouldDoBackgroundWork,
  adaptiveCacheMemory,
  adaptiveCacheSize,
  markRadioActivity,
  isRecentlyAwake,
  shouldTxSleepy,
  noteSeenDp,
  seenDpList,
  maybeGc,
};

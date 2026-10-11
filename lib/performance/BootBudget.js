'use strict';

/**
 * BootBudget — keep Homey Pro JS heap + RSS free for driver onNodeInit,
 * then run the same features later when RAM and radio allow it.
 *
 * WHY: Peter #2183 (9.0.589) showed Universal Tuya at 93.8 MB RSS (Homey
 *      counts RSS ≈64MB, not only V8 heapUsed), greyed Flows, sleepy SOS.
 * HOW: Defer MASTER_ONLY extras; skip TX while asleep or when heap/RSS high;
 *      retry engines; scale caches. Features stay — they wait.
 * WHO: Homey Test / master soak (BOTH reliability).
 * WHEN: app.onInit vs delayed pass vs device wake.
 * AGAINST: Dropping engines forever, or polling sleepy nodes at boot.
 *
 * P2586: RSS-aware gates (align LiveDataUpdater / NetworkResilience).
 */

const HEAP_HEAVY_MAX_BYTES = 42 * 1024 * 1024;
const HEAP_CRITICAL_BYTES = 52 * 1024 * 1024;
/** Homey Pro soft RSS budget — grey Flows / OOM near 64MB process RSS */
const RSS_HEAVY_MAX_BYTES = 55 * 1024 * 1024;
const RSS_CRITICAL_BYTES = 60 * 1024 * 1024;
const DEFER_MS = 60 * 1000;
const RETRY_MS = 120 * 1000;
const AWAKE_WINDOW_MS = 20 * 1000;

function _mem() {
  try {
    return process.memoryUsage() || {};
  } catch (_e) {
    return {};
  }
}

function heapUsedBytes() {
  return Number(_mem().heapUsed) || 0;
}

function rssUsedBytes() {
  return Number(_mem().rss) || 0;
}

function resolveHeapBytes(bytes, device) {
  if (Number.isFinite(bytes)) {return bytes;}
  if (Number.isFinite(device?._bootBudgetHeapBytes)) {return device._bootBudgetHeapBytes;}
  return heapUsedBytes();
}

function resolveRssBytes(bytes, device) {
  if (Number.isFinite(bytes)) {return bytes;}
  if (Number.isFinite(device?._bootBudgetRssBytes)) {return device._bootBudgetRssBytes;}
  return rssUsedBytes();
}

function heapUsedMb() {
  return Math.round((heapUsedBytes() / (1024 * 1024)) * 10) / 10;
}

function rssUsedMb() {
  return Math.round((rssUsedBytes() / (1024 * 1024)) * 10) / 10;
}

function memoryPressureSummary() {
  return {
    heapUsed: heapUsedBytes(),
    rss: rssUsedBytes(),
    heapMb: heapUsedMb(),
    rssMb: rssUsedMb(),
    heavy: !shouldStartHeavyFeatures(),
    critical: isHeapCritical(),
  };
}

function shouldApplyLiveRss() {
  // WHY(P2586): unit tests / Cursor IDE have huge host RSS — only gate on Homey runtime.
  return process.env.BOOTBUDGET_LIVE_RSS === '1'
    || process.env.HOMEY === '1'
    || typeof global.Homey !== 'undefined';
}

function shouldStartHeavyFeatures(bytes, device) {
  const heap = resolveHeapBytes(bytes, device);
  if (heap >= HEAP_HEAVY_MAX_BYTES) return false;
  if (Number.isFinite(device?._bootBudgetRssBytes)
      && device._bootBudgetRssBytes >= RSS_HEAVY_MAX_BYTES) {
    return false;
  }
  if (shouldApplyLiveRss() && rssUsedBytes() >= RSS_HEAVY_MAX_BYTES) return false;
  return true;
}

function isHeapCritical(bytes, device) {
  const heap = resolveHeapBytes(bytes, device);
  if (heap >= HEAP_CRITICAL_BYTES) return true;
  if (Number.isFinite(device?._bootBudgetRssBytes)
      && device._bootBudgetRssBytes >= RSS_CRITICAL_BYTES) {
    return true;
  }
  if (shouldApplyLiveRss() && rssUsedBytes() >= RSS_CRITICAL_BYTES) return true;
  return false;
}

function shouldDoBackgroundWork(bytes, device) {
  return !isHeapCritical(bytes, device) && shouldStartHeavyFeatures(bytes, device);
}

function adaptiveCacheMemory(bytes, device) {
  const used = resolveHeapBytes(bytes, device);
  let rss = 0;
  if (Number.isFinite(device?._bootBudgetRssBytes)) rss = device._bootBudgetRssBytes;
  else if (shouldApplyLiveRss()) rss = rssUsedBytes();
  if (used >= HEAP_HEAVY_MAX_BYTES || rss >= RSS_HEAVY_MAX_BYTES) {return 2 * 1024 * 1024;}
  if (used >= 28 * 1024 * 1024 || rss >= 48 * 1024 * 1024) {return 4 * 1024 * 1024;}
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
  if (!isHeapCritical() && shouldStartHeavyFeatures()) {return;}
  try { global.gc(); } catch (_e) { /* best-effort */ }
}

module.exports = {
  HEAP_HEAVY_MAX_BYTES,
  HEAP_CRITICAL_BYTES,
  RSS_HEAVY_MAX_BYTES,
  RSS_CRITICAL_BYTES,
  DEFER_MS,
  RETRY_MS,
  AWAKE_WINDOW_MS,
  heapUsedBytes,
  rssUsedBytes,
  heapUsedMb,
  rssUsedMb,
  memoryPressureSummary,
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
  shouldApplyLiveRss,
};

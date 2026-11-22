'use strict';

/**
 * P3384 / Tuya Local 154077 #477/#517 (Andi, Stephen): a pet feeder must
 * NEVER dispense because the app restarted or reconnected. Do not replay a
 * feed/dispense DP from restore_on_reconnect, and block feed writes during
 * the short post-connect window unless the caller marks a user action.
 */

const FEED_CAP_RE = /feed|dispense|portion|meal/i;
const FEED_DRIVER_RE = /pet_feeder|feeder/i;
const DEFAULT_GUARD_MS = 15000;
const TYPICAL_FEED_DPS = Object.freeze([3, 4, 5]);

function isFeederContext(opts) {
  const o = opts || {};
  if (o.forceFeeder === true) {return true;}
  const driver = String(o.driverId || o.driver || '');
  if (FEED_DRIVER_RE.test(driver)) {return true;}
  const cap = String(o.capability || '');
  if (FEED_CAP_RE.test(cap)) {return true;}
  return false;
}

function isFeedCapability(capability) {
  return FEED_CAP_RE.test(String(capability || ''));
}

function isFeedDp(dp, opts) {
  const o = opts || {};
  if (isFeedCapability(o.capability)) {return true;}
  if (!isFeederContext(o)) {return false;}
  const n = Number(dp);
  if (Array.isArray(o.feedDps) && o.feedDps.map(Number).includes(n)) {return true;}
  return TYPICAL_FEED_DPS.includes(n);
}

function filterRestoreDps(payload, opts) {
  const out = {};
  if (!payload || typeof payload !== 'object') {return out;}
  for (const [dp, value] of Object.entries(payload)) {
    if (isFeedDp(dp, opts)) {continue;}
    out[dp] = value;
  }
  return out;
}

function shouldBlockWrite(dp, opts) {
  const o = opts || {};
  if (o.userAction === true) {return false;}
  if (!isFeedDp(dp, o)) {return false;}
  const now = o.now == null ? Date.now() : Number(o.now);
  const connectedAt = Number(o.connectedAt || 0);
  const windowMs = o.guardMs == null ? DEFAULT_GUARD_MS : Number(o.guardMs);
  if (!connectedAt) {return true;}
  return now - connectedAt < windowMs;
}

module.exports = {
  FEED_CAP_RE,
  DEFAULT_GUARD_MS,
  TYPICAL_FEED_DPS,
  isFeederContext,
  isFeedCapability,
  isFeedDp,
  filterRestoreDps,
  shouldBlockWrite,
};

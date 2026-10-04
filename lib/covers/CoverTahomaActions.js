'use strict';

/**
 * CoverTahomaActions: TaHoma-style extras for covers, as app-level flow actions.
 *
 * WHY(P2802): Somfy TaHoma users expect (a) "position + tilt" as one scene step,
 * (b) "Identify" to find which blind is which, and (c) grouped commands that do
 * not flood the network. Ideas come from Overkiz/TaHoma (iMicknl/pyoverkiz, HA
 * overkiz: setClosureAndOrientation, identify, execution queue; see CREDITS).
 * This is a fresh implementation, no code copied.
 *
 * Honest limits:
 * - ZCL Window Covering (0x0102) has no combined lift+tilt command, and no Tuya
 *   DP for it is known in this repo. A device can offer one through an optional
 *   `setCoverPositionAndTilt(pos, tilt)` method (0..1). Otherwise we send the
 *   position, wait for the cover to arrive (or a bounded travel time), then send
 *   the tilt. That is what TaHoma does for devices without the combined command.
 * - Identify is offered only when an endpoint really exposes cluster 0x0003.
 * - No slow-speed / "My" DP is invented. "My" is the favorite_position setting
 *   (P2799). Motor speed DP8 in UnifiedCoverBase conflicts with Moes ZTS (DP8 has
 *   another meaning there), so it is not exposed as an action.
 */

const { getCoverQueue } = require('./CoverCommandQueue');

const POLL_MS = 500;
const DEFAULT_TRAVEL_S = 30;
const MAX_TRAVEL_S = 120;
const REACHED_EPS = 0.03;

function pct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) {return null;}
  return Math.min(100, Math.max(0, n)) / 100;
}

function _has(device, cap) {
  try { return typeof device.hasCapability === 'function' && device.hasCapability(cap); } catch (_) { return false; }
}

/** Bounded wait budget (ms) for one move, from optional open/close time settings. */
function travelBudgetMs(device) {
  let s = 0;
  for (const key of ['open_time', 'close_time', 'travel_time', 'calibration_time']) {
    let v;
    try { v = typeof device.getSetting === 'function' ? Number(device.getSetting(key)) : NaN; } catch (_) { v = NaN; }
    if (Number.isFinite(v) && v > s) {s = v;}
  }
  if (!s) {s = DEFAULT_TRAVEL_S;}
  return Math.min(MAX_TRAVEL_S, Math.max(3, s + 3)) * 1000;
}

function _sleep(homey, ms) {
  return new Promise((resolve) => {
    if (homey && typeof homey.setTimeout === 'function') {
      homey.setTimeout(resolve, ms);
      return;
    }
    // native setTimeout fallback: no homey instance (unit tests only)
    setTimeout(resolve, ms);
  });
}

/** Wait until windowcoverings_set is within REACHED_EPS of target, or budget expires. */
async function waitForPosition(device, target, budgetMs, sleep) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    let cur;
    try { cur = Number(device.getCapabilityValue('windowcoverings_set')); } catch (_) { return false; }
    if (Number.isFinite(cur) && Math.abs(cur - target) <= REACHED_EPS) {return true;}
    await sleep(POLL_MS);
  }
  return false;
}

/**
 * Move to position then tilt (percent 0..100). One command if the device supports it.
 * @returns {Promise<{combined:boolean, reached?:boolean}>}
 */
async function setPositionAndTilt(device, positionPct, tiltPct, opts = {}) {
  if (!device || typeof device.triggerCapabilityListener !== 'function') {throw new Error('Device not ready');}
  const pos = pct(positionPct);
  const tilt = pct(tiltPct);
  if (pos === null) {throw new Error('Invalid position');}
  const homey = opts.homey || device.homey;
  const queue = opts.queue || getCoverQueue(homey);
  const sleep = opts.sleep || ((ms) => _sleep(homey, ms));

  if (typeof device.setCoverPositionAndTilt === 'function' && tilt !== null) {
    await queue.run(() => device.setCoverPositionAndTilt(pos, tilt));
    return { combined: true };
  }
  if (!_has(device, 'windowcoverings_set')) {throw new Error('Device has no position capability');}
  await queue.run(() => device.triggerCapabilityListener('windowcoverings_set', pos));
  if (tilt === null || !_has(device, 'windowcoverings_tilt_set')) {return { combined: false };}
  const reached = await waitForPosition(device, pos, opts.budgetMs || travelBudgetMs(device), sleep);
  await queue.run(() => device.triggerCapabilityListener('windowcoverings_tilt_set', tilt));
  return { combined: false, reached };
}

/** First endpoint exposing the Identify cluster (0x0003), or null. */
function findIdentifyCluster(device) {
  const eps = device && device.zclNode && device.zclNode.endpoints;
  if (!eps || typeof eps !== 'object') {return null;}
  for (const id of Object.keys(eps)) {
    const c = eps[id] && eps[id].clusters && eps[id].clusters.identify;
    if (c && typeof c.identify === 'function') {return c;}
  }
  return null;
}

function supportsIdentify(device) { return findIdentifyCluster(device) !== null; }

/** Ask the device to identify itself (blink/jog) for `seconds` (1..60). */
async function identifyCover(device, seconds, opts = {}) {
  const cluster = findIdentifyCluster(device);
  if (!cluster) {throw new Error('This device does not support Identify (Zigbee cluster 0x0003)');}
  const s = Math.min(60, Math.max(1, Math.round(Number(seconds) || 5)));
  const queue = opts.queue || getCoverQueue(device.homey);
  await queue.run(() => cluster.identify({ identifyTime: s }));
  return true;
}

/** Register the app-level cards (ids must exist in .homeycompose/flow/actions). */
function registerCoverTahomaCards(homey, { log } = {}) {
  const wired = [];
  const flow = homey && homey.flow;
  if (!flow || typeof flow.getActionCard !== 'function') {return wired;}
  const reg = (id, fn) => {
    try {
      const card = flow.getActionCard(id);
      if (!card || typeof card.registerRunListener !== 'function') {return;}
      card.registerRunListener(async (args) => args && args.cover ? fn(args) : false);
      wired.push(id);
    } catch (_) { /* card not in this build */ }
  };
  reg('cover_set_position_and_tilt', async (a) => {
    // range args are 0..1 (labelMultiplier 100); API below takes percent
    await setPositionAndTilt(a.cover, Number(a.position) * 100, Number(a.tilt) * 100, { homey });
    return true;
  });
  reg('cover_identify', async (a) => identifyCover(a.cover, a.seconds));
  if (log && wired.length) {log(`P2802 cover TaHoma cards: ${wired.join(', ')}`);}
  return wired;
}

module.exports = {
  setPositionAndTilt, identifyCover, supportsIdentify, findIdentifyCluster,
  travelBudgetMs, waitForPosition, registerCoverTahomaCards
};

'use strict';

/**
 * CoverFlowActions — give real behaviour to cover flow actions that were
 * registered as log-only placeholders (open / close / stop / favorite).
 *
 * WHY(P2799): on curtain_motor, curtain_motor_shutter, curtain_motor_wall and
 * contact_sensor_curtain the "Open", "Close", "Stop" and "Go to favorite
 * position" action cards only logged and returned true, so flows silently did
 * nothing. Idea of a stored "My" position inspired by Somfy TaHoma/Overkiz
 * (see CREDITS). Everything goes through the device's own capability
 * listeners, so per-device inversion, calibration and DP mapping still apply.
 *
 * Contre quoi: silent no-op cover flow actions.
 */

const DEFAULT_FAVORITE = 50;

function clampPercent(v, fallback = DEFAULT_FAVORITE) {
  const n = Number(v);
  if (!Number.isFinite(n)) {return fallback;}
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Favorite ("My") position in percent, from the optional device setting. */
function favoritePercent(device) {
  let raw;
  try { raw = device && typeof device.getSetting === 'function' ? device.getSetting('favorite_position') : undefined; } catch (_) { raw = undefined; }
  return clampPercent(raw);
}

async function _trigger(device, capability, value) {
  if (!device || typeof device.triggerCapabilityListener !== 'function') {
    throw new Error('Device not ready');
  }
  if (typeof device.hasCapability === 'function' && !device.hasCapability(capability)) {
    return false;
  }
  await device.triggerCapabilityListener(capability, value);
  return true;
}

/**
 * Run a cover action through the device's own capability listeners.
 * @param {object} device Homey device
 * @param {'open'|'close'|'stop'|'favorite'} kind
 * @returns {Promise<boolean>}
 */
async function runCoverAction(device, kind) {
  switch (kind) {
  case 'open':
    if (await _trigger(device, 'windowcoverings_state', 'up')) {return true;}
    return _trigger(device, 'windowcoverings_set', 1);
  case 'close':
    if (await _trigger(device, 'windowcoverings_state', 'down')) {return true;}
    return _trigger(device, 'windowcoverings_set', 0);
  case 'stop':
    return _trigger(device, 'windowcoverings_state', 'idle');
  case 'favorite':
    return _trigger(device, 'windowcoverings_set', favoritePercent(device) / 100);
  default:
    throw new Error(`Unknown cover action: ${kind}`);
  }
}

/**
 * Register run listeners for the given action card ids.
 * @param {object} driver Homey driver (needs this.homey.flow)
 * @param {{open?: string[], close?: string[], stop?: string[], favorite?: string[]}} map
 * @returns {string[]} ids that were wired
 */
function wireCoverActions(driver, map) {
  const wired = [];
  const flow = driver && driver.homey && driver.homey.flow;
  if (!flow || typeof flow.getActionCard !== 'function' || !map) {return wired;}
  for (const kind of ['open', 'close', 'stop', 'favorite']) {
    for (const id of map[kind] || []) {
      try {
        const card = flow.getActionCard(id);
        if (!card || typeof card.registerRunListener !== 'function') {continue;}
        card.registerRunListener(async (args) => {
          if (!args || !args.device) {return false;}
          return runCoverAction(args.device, kind);
        });
        wired.push(id);
      } catch (_) { /* card not declared in this build: skip */ }
    }
  }
  return wired;
}

module.exports = { runCoverAction, wireCoverActions, favoritePercent, clampPercent, DEFAULT_FAVORITE };

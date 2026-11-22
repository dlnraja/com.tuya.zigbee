'use strict';

/**
 * P3384 / Tuya Cloud 21313:
 *  - #2820 "Missing Capability Listener: onoff": register an onoff listener
 *    when the capability is present, even if the DP map was late or empty.
 *  - #2763 thermostat exposing ambient only: when a known setpoint DP is
 *    seen, add target_temperature additively (never remove ambient).
 *
 * Known setpoint DPs are the documented Tuya thermostat set DPs, not ambient.
 * Source: common Tuya thermostat profiles (DP 2 / 16 / 24 family) plus
 * Moes ZHT-S01 DP 111 (Z2M herdsman moes.ts, model ZHT-S01).
 */

const SETPOINT_DPS = Object.freeze([2, 16, 111]);
const AMBIENT_DPS = Object.freeze([3, 24, 117]);

function isSetpointDp(dp) {
  const n = Number(dp);
  return SETPOINT_DPS.includes(n);
}

function isAmbientDp(dp) {
  const n = Number(dp);
  return AMBIENT_DPS.includes(n);
}

/**
 * Register the onoff listener once. The setFn receives the boolean the user
 * asked for. Returns true when a listener was installed this call.
 */
function ensureOnoffListener(device, setFn) {
  if (!device || typeof device.hasCapability !== 'function') {return false;}
  if (!device.hasCapability('onoff')) {return false;}
  if (device._p3384OnoffListenerReady) {return false;}
  if (typeof device.registerCapabilityListener !== 'function') {return false;}
  const writer = typeof setFn === 'function' ? setFn : async () => {};
  device.registerCapabilityListener('onoff', async (value) => writer(!!value));
  device._p3384OnoffListenerReady = true;
  return true;
}

async function ensureSetpointCapability(device, dp, options) {
  if (!device || !isSetpointDp(dp)) {return { added: false, reason: 'not-setpoint-dp' };}
  if (typeof device.hasCapability === 'function' && device.hasCapability('target_temperature')) {
    return { added: false, reason: 'already-present' };
  }
  if (typeof device.addCapability !== 'function') {return { added: false, reason: 'no-add' };}
  await device.addCapability('target_temperature');
  if (options && typeof options.onAdded === 'function') {
    await options.onAdded(device);
  }
  return { added: true, reason: 'added' };
}

module.exports = {
  SETPOINT_DPS,
  AMBIENT_DPS,
  isSetpointDp,
  isAmbientDp,
  ensureOnoffListener,
  ensureSetpointCapability,
};

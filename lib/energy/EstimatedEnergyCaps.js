'use strict';

/**
 * P3130 / t699u: deterministic estimated-energy capabilities.
 *
 * Same driver, same "enable_power_estimation" setting, two tiles: one showed
 * "0 ≈" (estimated measure_power), the other only "Activé". Cause: the estimator
 * defers adding measure_power/meter_power while the 5-min SmartEnergy audit runs
 * and never retries, and the VirtualEnergyMeterMixin path never adds them at all.
 * Whether a device ended up with the caps depended on init timing.
 *
 * This helper adds them once the audit is done (re-checked at audit end), never removes
 * anything, never touches a real (measured) capability.
 */

const CAPS = ['measure_power', 'meter_power'];

async function ensureOnce(device) {
  const smart = device.smartEnergy;
  if (smart && typeof smart.isAuditComplete === 'function' && !smart.isAuditComplete()) {return 'wait';}
  let added = 0;
  for (const cap of CAPS) {
    if (device.hasCapability(cap)) {continue;}
    if (smart && smart.isRealCapability && smart.isRealCapability(cap)) {continue;}
    try { await device.addCapability(cap); added++; } catch (_e) { /* ignore */ }
  }
  if (device.hasCapability('measure_power') && typeof device.setCapabilityOptions === 'function') {
    let cur = {};
    try { cur = device.getCapabilityOptions('measure_power') || {}; } catch (_e) { cur = {}; }
    if (cur.approximated !== true && !(smart && smart.isRealCapability && smart.isRealCapability('measure_power'))) {
      try { await device.setCapabilityOptions('measure_power', { ...cur, approximated: true }); } catch (_e) { /* ignore */ }
    }
  }
  return added;
}

/**
 * @param {object} device Homey device
 */
async function ensure(device) {
  if (!device || typeof device.hasCapability !== 'function' || typeof device.addCapability !== 'function') {return 'no-api';}
  if (typeof device.getSetting === 'function' && device.getSetting('enable_power_estimation') === false) {return 'disabled';}
  // Timer-free: if the 5-min audit is still running, SmartEnergyManager._finalizeAudit
  // calls ensureOnce() again for flagged devices (no closure kept after delete).
  device._p3130WantEstimated = true;
  return ensureOnce(device).catch(() => 'error');
}

module.exports = { ensure, ensureOnce, CAPS };

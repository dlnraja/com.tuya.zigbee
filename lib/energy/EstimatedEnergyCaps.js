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
 * This helper adds them once the audit is done (bounded retries), never removes
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
 * @param {object} [o] { intervalMs=60000, maxTries=12, setTimeoutFn }
 */
async function ensure(device, o = {}) {
  if (!device || typeof device.hasCapability !== 'function' || typeof device.addCapability !== 'function') {return 'no-api';}
  if (typeof device.getSetting === 'function' && device.getSetting('enable_power_estimation') === false) {return 'disabled';}
  const interval = o.intervalMs || 60000;
  const maxTries = o.maxTries || 12;
  const st = o.setTimeoutFn || ((fn, ms) => device.homey && device.homey.setTimeout ? device.homey.setTimeout(fn, ms) : null);
  let tries = 0;
  const run = async () => {
    if (device._destroyed) {return 'destroyed';}
    tries++;
    const r = await ensureOnce(device).catch(() => 'error');
    if (r === 'wait' && tries < maxTries) {st(() => { run().catch(() => {}); }, interval);}
    return r;
  };
  return run();
}

module.exports = { ensure, ensureOnce, CAPS };

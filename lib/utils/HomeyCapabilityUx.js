'use strict';

/**
 * HomeyCapabilityUx (P2500)
 *
 * WHY: Athom + Device Capabilities (T43287) — sensor readables must stay getable
 * so Homey shows tiles + Insights. button.N getable:false remains OK (P2492).
 * Contre quoi: Peter Smartbutton battery hidden by getable:false (P2499).
 */

const SENSOR_PREFIXES = ['measure_', 'meter_', 'alarm_'];

function isSensorReadableCap(cap) {
  const id = String(cap || '');
  return SENSOR_PREFIXES.some((p) => id.startsWith(p));
}

function mustNeverGetableFalse(cap) {
  return isSensorReadableCap(cap);
}

function isButtonMaintenanceCap(cap) {
  return /^button(\.|$)/.test(String(cap || ''));
}

/**
 * Soft-heal: if any measure_/meter_/alarm_ has getable:false at runtime, restore true.
 * Idempotent via `_homeyCapabilityUxHealed`.
 */
async function healSensorCapabilityGetable(device) {
  if (!device || device._homeyCapabilityUxHealed) {
    return { skipped: true, healed: [] };
  }
  device._homeyCapabilityUxHealed = true;
  const healed = [];

  if (typeof device.setCapabilityOptions !== 'function'
    || typeof device.getCapabilities !== 'function') {
    return { healed, noApi: true };
  }

  const caps = device.getCapabilities() || [];
  for (const cap of caps) {
    if (!mustNeverGetableFalse(cap)) continue;
    try {
      const cur = (typeof device.getCapabilityOptions === 'function'
        && device.getCapabilityOptions(cap)) || {};
      if (cur.getable === false) {
        await device.setCapabilityOptions(cap, { ...cur, getable: true });
        healed.push(cap);
      }
      if (cur.preventInsights === true
        && /^(measure_battery|measure_temperature|measure_humidity|meter_power|measure_power)$/.test(cap)) {
        await device.setCapabilityOptions(cap, { ...cur, getable: true, preventInsights: false });
        if (!healed.includes(cap)) healed.push(cap);
      }
    } catch (_e) { /* soft — Athom may reject option merges */ }
  }

  if (healed.length && typeof device.log === 'function') {
    device.log(`[P2500] restored sensor getable/insights → ${healed.join(',')}`);
  }
  return { healed };
}

module.exports = {
  SENSOR_PREFIXES,
  isSensorReadableCap,
  mustNeverGetableFalse,
  isButtonMaintenanceCap,
  healSensorCapabilityGetable,
};

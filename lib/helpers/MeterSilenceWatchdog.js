'use strict';
/**
 * P3213 - MeterSilenceWatchdog (t783u, diag fb5be1fe "energy meter pairs but cannot be read").
 * Generic, OPTIONAL, additive: for any device exposing metering capabilities, if none of them
 * received a value some time after init, send ONE non-blocking wake/read burst:
 *   - Tuya EF00 devices: query-all dataQuery (0x03) — after init, never at pairing;
 *   - ZCL meters: read haElectricalMeasurement + seMetering attributes, then try configureReporting.
 * Every step is try/catch, unsupported clusters/attrs are simply skipped. Never throws.
 */
const METER_CAPS = ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
const DEFAULT_DELAY_MS = 3 * 60 * 1000;

function _hasMeterCap(device) {
  try { return METER_CAPS.some((c) => device.hasCapability && device.hasCapability(c)); } catch (_e) { return false; }
}
function _isSilent(device) {
  try {
    return METER_CAPS.every((c) => !device.hasCapability(c) || device.getCapabilityValue(c) === null || device.getCapabilityValue(c) === undefined);
  } catch (_e) { return false; }
}
function _cluster(ep, names) {
  const cl = (ep && ep.clusters) || {};
  for (const n of names) { if (cl[n]) {return cl[n];} }
  return null;
}

async function wake(device) {
  const done = [];
  const zcl = device && device.zclNode;
  if (!zcl || !zcl.endpoints) {return done;}
  const ep = zcl.endpoints[1] || zcl.endpoints[Object.keys(zcl.endpoints)[0]];
  const tuya = _cluster(ep, ['tuya', 'manuSpecificTuya', 'tuyaSpecific', 61184, '61184']);
  if (tuya) {
    try {
      const { sendQueryAllFallback } = require('../tuya/TuyaDataQuery');
      const r = await sendQueryAllFallback(tuya, device.tuyaEF00Manager || null, device);
      if (r) {done.push(`ef00:${  r}`);}
    } catch (_e) { /* optional */ }
  }
  const em = _cluster(ep, ['electricalMeasurement', 'haElectricalMeasurement']);
  if (em && typeof em.readAttributes === 'function') {
    try { await em.readAttributes(['activePower', 'rmsVoltage', 'rmsCurrent']); done.push('em:read'); } catch (_e) { /* optional */ }
    if (typeof em.configureReporting === 'function') {
      try {
        await em.configureReporting({ activePower: { minInterval: 10, maxInterval: 300, minChange: 1 } });
        done.push('em:report');
      } catch (_e) { /* optional */ }
    }
  }
  const me = _cluster(ep, ['metering', 'seMetering']);
  if (me && typeof me.readAttributes === 'function') {
    try { await me.readAttributes(['currentSummationDelivered']); done.push('me:read'); } catch (_e) { /* optional */ }
    if (typeof me.configureReporting === 'function') {
      try {
        await me.configureReporting({ currentSummationDelivered: { minInterval: 60, maxInterval: 3600, minChange: 1 } });
        done.push('me:report');
      } catch (_e) { /* optional */ }
    }
  }
  return done;
}

function attach(device, opts = {}) {
  try {
    if (!device || device._p3213MeterWd || !_hasMeterCap(device)) {return false;}
    if (!device.homey || typeof device.homey.setTimeout !== 'function') {return false;}
    device._p3213MeterWd = device.homey.setTimeout(async () => {
      try {
        if (device._destroyed || !_isSilent(device)) {return;}
        const done = await wake(device);
        if (typeof device.log === 'function') {device.log(`[P3213-METER-WD] no metering value after init → wake burst: ${done.join(',') || 'none supported'}`);}
      } catch (_e) { /* never throw */ }
    }, opts.delayMs || DEFAULT_DELAY_MS);
    return true;
  } catch (_e) { return false; }
}

module.exports = { attach, wake, _isSilent, METER_CAPS };

'use strict';

/**
 * P2792 — in-place identity layer (optional, non-blocking, additive).
 *
 * Some identities are paired on a driver of another device type and must stay there (already-paired
 * users, couple uniqueness). This layer gives them their real functions in the driver they are on,
 * without re-pairing: capabilities are added at runtime only when the exact manufacturerName +
 * productId match AND the node actually exposes the needed cluster. Nothing is removed; every step
 * is wrapped so a failure never blocks the host driver.
 *
 * Profiles (sources in data/leads/p2791-review.json and the profile notes):
 * Decided per exact couple: other couples of the same mfr (e.g. a TS0042 button) keep the host behaviour.
 *  - zcl_relay: Homey-native On/Off cluster per endpoint (onoff, onoff.gang2), optional metering when
 *    electricalMeasurement / metering clusters exist on endpoint 1.
 *  - tuya_smoke: EF00 datapoints DP1 smoke (0 = alarm), DP4 tamper, DP14 battery state (0/1/2),
 *    DP15 battery %.
 */

const PROFILES = Object.freeze({
  // Moes 2-gang switch module (settings screenshot: _TZ3000_pmz6mjyu / TS011F, mains, on/off)
  // Same mfr seen with the 2/3-gang module pids of its peer driver; TS0042 (button) is left to the host.
  _tz3000_pmz6mjyu: { pids: ['TS011F', 'TS0002', 'TS0003', 'TS0012', 'TS0013'], kind: 'zcl_relay', maxGangs: 3, hosts: ['button_wireless_2'] },
  // BSEED 2-gang wall switch (device request + screenshot: _TZ3000_mklgayek / TS0002)
  _tz3000_mklgayek: { pids: ['TS0002', 'TS0012'], kind: 'zcl_relay', maxGangs: 2, hosts: ['button_wireless_2'] },
  // TS0601 smoke detector (DP1 smoke 0 = alarm, DP14 battery state, DP15 battery)
  _tze200_vzekyi4c: { pids: ['TS0601'], kind: 'tuya_smoke', hosts: ['switch_wireless'] },
});

const RELAY_CAPS = ['onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4'];
const METER_CAPS = ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
const SMOKE_CAPS = ['alarm_smoke', 'alarm_tamper', 'alarm_battery', 'measure_battery'];

function _s(fn) { try { return fn(); } catch (_e) { return undefined; } }

function identityOf(device) {
  const mfr = String(
    _s(() => device.getSetting('zb_manufacturer_name'))
    || _s(() => device.getData().manufacturerName)
    || _s(() => device.zclNode.manufacturerName)
    || _s(() => device.getStoreValue('manufacturerName'))
    || '',
  ).trim().toLowerCase();
  const pid = String(
    _s(() => device.getSetting('zb_model_id'))
    || _s(() => device.getData().productId)
    || _s(() => device.zclNode.modelId)
    || _s(() => device.getStoreValue('modelId'))
    || '',
  ).trim().toUpperCase();
  return { mfr, pid };
}

/** Profile for this device in this host driver, or null. Exact mfr + pid only. */
function profileFor(device) {
  const { mfr, pid } = identityOf(device);
  const p = PROFILES[mfr];
  if (!p || !p.pids.includes(pid)) {return null;}
  const host = _s(() => device.driver.id);
  if (host && p.hosts && !p.hosts.includes(host)) {return null;}
  return p;
}

/** Capabilities this layer owns for the device (host strip routines must keep them). */
function keepsCapability(device, cap) {
  const own = device && device._inPlaceIdentityCaps;
  if (own instanceof Set) {return own.has(cap);}
  const p = _s(() => profileFor(device));
  if (!p) {return false;}
  if (p.kind === 'zcl_relay') {return RELAY_CAPS.includes(cap) || METER_CAPS.includes(cap);}
  if (p.kind === 'tuya_smoke') {return SMOKE_CAPS.includes(cap);}
  return false;
}

/** Tuya DP → capability overrides for tuya_smoke (merged by the host dpMappings). */
function dpOverrides(device) {
  const p = _s(() => profileFor(device));
  if (!p || p.kind !== 'tuya_smoke') {return null;}
  return {
    1: { capability: 'alarm_smoke', transform: (v) => Number(v) === 0 || v === false },
    4: { capability: 'alarm_tamper', transform: (v) => Boolean(Number(v)) },
    14: { capability: 'alarm_battery', transform: (v) => Number(v) === 0 },
    15: { capability: 'measure_battery', transform: (v) => Math.max(0, Math.min(100, Number(v))) },
  };
}

function _clusterNames(ep) {
  return Object.keys((ep && ep.clusters) || {});
}

async function _addCap(device, cap, owned) {
  owned.add(cap);
  if (device.hasCapability(cap)) {return true;}
  try { await device.addCapability(cap); return true; } catch (e) {
    device.log?.(`[IN-PLACE] addCapability ${cap} failed: ${e.message}`);
    owned.delete(cap);
    return false;
  }
}

function _set(device, cap, v) {
  if (!device.hasCapability(cap) || v === undefined || v === null || Number.isNaN(v)) {return;}
  const fn = typeof device.safeSetCapabilityValue === 'function' ? device.safeSetCapabilityValue : device.setCapabilityValue;
  Promise.resolve(fn.call(device, cap, v)).catch(() => {});
}

async function _applyRelay(device, zclNode, p, owned) {
  const eps = (zclNode && zclNode.endpoints) || {};
  let gangs = 0;
  for (let g = 1; g <= (p.maxGangs || 1); g++) {
    if (_clusterNames(eps[g]).includes('onOff')) {gangs = g;} else {break;}
  }
  if (!gangs) {return { applied: false, reason: 'no onOff cluster' };}
  for (let g = 1; g <= gangs; g++) {
    const cap = g === 1 ? 'onoff' : `onoff.gang${g}`;
    if (!await _addCap(device, cap, owned)) {continue;}
    const cluster = eps[g].clusters.onOff;
    _s(() => device.registerCapabilityListener(cap, async (value) => {
      await (value ? cluster.setOn() : cluster.setOff());
    }));
    _s(() => cluster.on('attr.onOff', (v) => _set(device, cap, Boolean(v))));
    Promise.resolve(_s(() => cluster.readAttributes(['onOff'])))
      .then((r) => { if (r && r.onOff !== undefined) {_set(device, cap, Boolean(r.onOff));} })
      .catch(() => {});
  }
  // Optional metering: only when endpoint 1 exposes the native clusters.
  const ep1 = eps[1] || {};
  const em = ep1.clusters && ep1.clusters.electricalMeasurement;
  const me = ep1.clusters && ep1.clusters.metering;
  if (em) {
    for (const cap of ['measure_power', 'measure_voltage', 'measure_current']) {await _addCap(device, cap, owned);}
    _s(() => em.on('attr.activePower', (v) => _set(device, 'measure_power', Number(v))));
    _s(() => em.on('attr.rmsVoltage', (v) => _set(device, 'measure_voltage', Number(v))));
    _s(() => em.on('attr.rmsCurrent', (v) => _set(device, 'measure_current', Number(v) / 1000)));
  }
  if (me) {
    await _addCap(device, 'meter_power', owned);
    _s(() => me.on('attr.currentSummationDelivered', (v) => _set(device, 'meter_power', Number(v) / 100)));
  }
  return { applied: true, gangs, metering: Boolean(em || me) };
}

async function _applySmoke(device, zclNode, owned) {
  const ep1 = (zclNode && zclNode.endpoints && zclNode.endpoints[1]) || {};
  const names = _clusterNames(ep1);
  const hasEf00 = names.some((n) => /tuya|ef00|61184/i.test(n));
  if (!hasEf00 && names.length) {return { applied: false, reason: 'no EF00 cluster' };}
  for (const cap of SMOKE_CAPS) {await _addCap(device, cap, owned);}
  return { applied: true };
}

/**
 * Apply the layer. Never throws. Call at the end of the host onNodeInit.
 * @returns {Promise<{applied:boolean, kind?:string, reason?:string}>}
 */
async function applyInPlaceIdentityLayer(device, zclNode) {
  try {
    if (!device || device._inPlaceIdentityApplied) {return { applied: false, reason: 'skip' };}
    const p = profileFor(device);
    if (!p) {return { applied: false, reason: 'no profile' };}
    const owned = new Set();
    device._inPlaceIdentityCaps = owned;
    const res = p.kind === 'zcl_relay'
      ? await _applyRelay(device, zclNode || device.zclNode, p, owned)
      : await _applySmoke(device, zclNode || device.zclNode, owned);
    device._inPlaceIdentityApplied = Boolean(res.applied);
    device.log?.(`[IN-PLACE] ${p.kind}: ${JSON.stringify(res)}`);
    return { kind: p.kind, ...res };
  } catch (e) {
    try { device.log?.(`[IN-PLACE] soft-fail: ${e.message}`); } catch (_e) { /* ignore */ }
    return { applied: false, reason: e.message };
  }
}

module.exports = { PROFILES, profileFor, keepsCapability, dpOverrides, applyInPlaceIdentityLayer, identityOf };

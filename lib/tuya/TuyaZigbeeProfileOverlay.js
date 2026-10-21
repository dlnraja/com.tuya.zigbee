'use strict';
/**
 * P2931 — Optional overlay: builds the per-device Tuya Zigbee protocol profile at runtime
 * (TuyaZigbeeProtocolProfile) from Basic attributes and the EF00 commands actually seen.
 * Read-only: one deferred Basic read (sleepy devices may ignore it — that is fine), passive
 * listeners, result stored as store value `tuya_zb_profile`. Never changes native handling.
 */
const { buildProfile } = require('./TuyaZigbeeProtocolProfile');

const EVENT_TO_CMD = Object.freeze({
  reporting: 0x01, response: 0x02, dataReport: 0x02, statusReport: 0x05, reportingConfiguration: 0x06,
  mcuVersionResponse: 0x11, timeSync: 0x24, mcuSyncTime: 0x24, mcuGatewayConnectionStatus: 0x25,
});
const MAX_DELAY_MS = 120000;

function _ef00Cluster(device) {
  const eps = device && device.zclNode && device.zclNode.endpoints;
  if (!eps) {return null;}
  for (const ep of Object.values(eps)) {
    const cl = ep && ep.clusters && (ep.clusters.tuya || ep.clusters.tuyaSpecific || ep.clusters[61184]);
    if (cl && typeof cl.on === 'function') {return cl;}
  }
  return null;
}

function attach(device, opts = {}) {
  if (!device || device.__tzProfile) {return device && device.__tzProfile;}
  const state = { seen: new Set(), basic: {}, listeners: [], timer: null, profile: null };
  device.__tzProfile = state;
  const cl = _ef00Cluster(device);
  if (cl) {
    for (const [ev, id] of Object.entries(EVENT_TO_CMD)) {
      const fn = () => { if (state.seen.size < 16) {state.seen.add(id);} };
      try { cl.on(ev, fn); state.listeners.push([cl, ev, fn]); } catch (_e) { /* optional */ }
    }
  }
  // P2933: MCU/time service on the EF00 cluster + ZCL Time server (both additive, passive
  // until the device asks; periodic push only for clock-type devices per TimeClusterPolicy).
  if (cl && opts.mcu !== false) {
    try {
      const { TuyaMcuTimeService } = require('./TuyaMcuTimeService');
      state.mcu = new TuyaMcuTimeService(device, cl).start();
    } catch (_e) { state.mcu = null; }
  }
  if (opts.timeServer !== false) {
    try { state.timeServer = require('../zigbee/TimeServerBoundCluster').bindTimeServer(device); } catch (_e) { /* optional */ }
  }
  const delay = opts.delayMs !== undefined ? opts.delayMs : 45000 + Math.floor(Math.random() * 30000);
  const run = () => refresh(device).catch(() => {});
  const setT = device.homey && typeof device.homey.setTimeout === 'function' ? device.homey.setTimeout.bind(device.homey) : setTimeout;
  state.timer = setT(run, Math.min(delay, MAX_DELAY_MS));
  return state;
}

async function refresh(device) {
  const state = device && device.__tzProfile;
  if (!state || device._destroyed) {return null;}
  const basic = device.zclNode && device.zclNode.endpoints && device.zclNode.endpoints[1]
    && device.zclNode.endpoints[1].clusters && device.zclNode.endpoints[1].clusters.basic;
  if (basic && typeof basic.readAttributes === 'function') {
    try {
      const r = await basic.readAttributes(['zclVersion', 'appVersion', 'stackVersion', 'hwVersion']);
      Object.assign(state.basic, r || {});
    } catch (_e) { /* sleepy / unsupported: keep what we have */ }
  }
  const data = (device.getData && device.getData()) || {};
  const settings = (device.getSettings && device.getSettings()) || {};
  // P2933: ask the MCU its version once for EF00 devices that never sent 0x11
  if (state.mcu && !state.mcu.mcuVersion && state.seen.size && !state.seen.has(0x11)) {
    try { await state.mcu.requestMcuVersion(); } catch (_e) { /* sleepy */ }
  }
  state.profile = buildProfile({
    manufacturerName: settings.zb_manufacturer_name || data.manufacturerName || device.manufacturerName,
    modelId: settings.zb_product_id || data.productId || device.productId,
    ...state.basic,
    profileId: 0x0104,
    seenCommands: [...state.seen],
  });
  try { if (device.setStoreValue) {await device.setStoreValue('tuya_zb_profile', state.profile);} } catch (_e) { /* soft */ }
  if (state.mcu && state.mcu.mcuVersion) {state.profile.firmware.mcu = state.mcu.mcuVersion.version;}
  if (state.dpFormat) {state.profile.dpFormat = state.dpFormat;}
  if (device.log) {device.log(`[TZ-PROFILE] gen=${state.profile.generation.prefix || '?'} fw=${state.profile.firmware.app || '?'} chain=${state.profile.chain.join('>')}`);}
  return state.profile;
}

/**
 * P2933: evidence-based DP parsing variant. Called by the EF00 passive parser only after
 * the standard parse found nothing. Accepted only when the short-length layout consumes
 * the whole buffer exactly; the variant is then remembered for the profile.
 */
function parseFallback(device, buf) {
  const { parseDpFrame } = require('./TuyaZigbeeProtocolProfile');
  const r = parseDpFrame(buf);
  const state = device && device.__tzProfile;
  if (r.format === 'short_len' && state) {state.dpFormat = 'short_len';}
  if (r.format === 'lead' && state) {state.leads = (state.leads || []).slice(-9).concat([r.raw]);}
  return r;
}

/** P2934: every incoming frame — time requests on any path and wake signs. Cheap, throttled. */
function onFrame(device, clusterId, frame) {
  const state = device && device.__tzProfile;
  if (!state || !state.mcu) {return null;}
  return state.mcu.onFrame(clusterId, frame).catch(() => null);
}

/** Queue a write for a sleepy device; flushed on wake. */
function enqueueForWake(device, label, fn) {
  const state = device && device.__tzProfile;
  return !!(state && state.mcu && state.mcu.enqueue(label, fn));
}

async function onRejoin(device) {
  const state = device && device.__tzProfile;
  if (!state || !state.mcu) {return null;}
  return state.mcu.onRejoin();
}

function detach(device) {
  const state = device && device.__tzProfile;
  if (!state) {return;}
  try { if (state.mcu) {state.mcu.stop();} } catch (_e) { /* noop */ }
  for (const [cl, ev, fn] of state.listeners) {try { cl.removeListener(ev, fn); } catch (_e) { /* noop */ }}
  state.listeners = [];
  if (state.timer) {
    try { (device.homey && device.homey.clearTimeout ? device.homey.clearTimeout.bind(device.homey) : clearTimeout)(state.timer); } catch (_e) { /* noop */ }
  }
  device.__tzProfile = null;
}

module.exports = { attach, refresh, detach, parseFallback, onRejoin, onFrame, enqueueForWake, EVENT_TO_CMD };

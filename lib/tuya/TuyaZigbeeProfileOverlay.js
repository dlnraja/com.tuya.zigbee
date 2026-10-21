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
  state.profile = buildProfile({
    manufacturerName: settings.zb_manufacturer_name || data.manufacturerName || device.manufacturerName,
    modelId: settings.zb_product_id || data.productId || device.productId,
    ...state.basic,
    profileId: 0x0104,
    seenCommands: [...state.seen],
  });
  try { if (device.setStoreValue) {await device.setStoreValue('tuya_zb_profile', state.profile);} } catch (_e) { /* soft */ }
  if (device.log) {device.log(`[TZ-PROFILE] gen=${state.profile.generation.prefix || '?'} fw=${state.profile.firmware.app || '?'} chain=${state.profile.chain.join('>')}`);}
  return state.profile;
}

function detach(device) {
  const state = device && device.__tzProfile;
  if (!state) {return;}
  for (const [cl, ev, fn] of state.listeners) {try { cl.removeListener(ev, fn); } catch (_e) { /* noop */ }}
  state.listeners = [];
  if (state.timer) {
    try { (device.homey && device.homey.clearTimeout ? device.homey.clearTimeout.bind(device.homey) : clearTimeout)(state.timer); } catch (_e) { /* noop */ }
  }
  device.__tzProfile = null;
}

module.exports = { attach, refresh, detach, EVENT_TO_CMD };

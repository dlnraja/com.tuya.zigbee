'use strict';

/**
 * healZigbeeNodeIdentity — P2314 PresentSky / Gmail m1cvyneb
 *
 * WHY: Homey throws "Missing Zigbee Node's IEEE Address (token: …)" when
 * zclNode lost ieeeAddr after re-pair while getData().token still exists.
 * Soft-skip (P2308) kept the UI alive but left wall_dimmer controls dead.
 *
 * Patch ieeeAddr/ieeeAddress onto zclNode from every known source so
 * cluster.datapoint / endpoint.sendFrame can TX again.
 *
 * @param {object} device Homey ZigBeeDevice
 * @param {object} [opts]
 * @param {boolean} [opts.force] bypass short cache
 * @returns {Promise<{ok:boolean,ieee:string|null,via:string|null}>}
 */
async function healZigbeeNodeIdentity(device, opts = {}) {
  const out = { ok: false, ieee: null, via: null };
  if (!device || device._destroyed) {return out;}

  const now = Date.now();
  if (!opts.force && device._ieeeHealAt && (now - device._ieeeHealAt) < 15_000 && device._ieeeHealOk) {
    return { ok: true, ieee: device._ieeeHealValue || null, via: 'cache' };
  }

  const node = device.zclNode;
  const existing = node?.ieeeAddr || node?.ieeeAddress || null;
  if (existing && _looksLikeIeee(existing)) {
    _stampNode(node, existing);
    device._ieeeHealAt = now;
    device._ieeeHealOk = true;
    device._ieeeHealValue = String(existing);
    return { ok: true, ieee: String(existing), via: 'zclNode' };
  }

  const candidates = [];

  try {
    const data = typeof device.getData === 'function' ? device.getData() : null;
    if (data?.ieeeAddress) {candidates.push({ via: 'getData.ieeeAddress', v: data.ieeeAddress });}
    if (data?.ieeeAddr) {candidates.push({ via: 'getData.ieeeAddr', v: data.ieeeAddr });}
    // Homey Zigbee token is often the IEEE hex — only use if it looks like one
    if (data?.token && _looksLikeIeee(data.token)) {
      candidates.push({ via: 'getData.token', v: data.token });
    }
  } catch (_e) { /* noop */ }

  try {
    const s = device.getSetting?.('zb_ieee_address') || device.getSetting?.('ieee_address');
    if (s) {candidates.push({ via: 'settings', v: s });}
  } catch (_e) { /* noop */ }

  try {
    const store = device.getStoreValue?.('zb_ieee_address') || device.getStoreValue?.('ieeeAddress');
    if (store) {candidates.push({ via: 'store', v: store });}
  } catch (_e) { /* noop */ }

  try {
    if (device.homey?.zigbee?.getNode) {
      const fresh = await device.homey.zigbee.getNode(device);
      const ie = fresh?.ieeeAddress || fresh?.ieeeAddr;
      if (ie) {candidates.push({ via: 'homey.zigbee.getNode', v: ie });}
      // If getNode returned a richer object, prefer it as zclNode when ours is hollow
      if (fresh && node && !node.ieeeAddr && !node.ieeeAddress && ie) {
        try {
          if (!device.zclNode?.endpoints && fresh.endpoints) {
            device.zclNode = fresh;
          }
        } catch (_e) { /* noop */ }
      }
    }
  } catch (_e) { /* noop */ }

  try {
    const IEEEAddressManager = require('../managers/IEEEAddressManager');
    const mgr = new IEEEAddressManager(device);
    const ie = await mgr.getDeviceIeeeAddress(true);
    if (ie) {candidates.push({ via: 'IEEEAddressManager', v: ie });}
  } catch (_e) { /* noop */ }

  for (const c of candidates) {
    if (!_looksLikeIeee(c.v)) {continue;}
    const target = device.zclNode || node;
    if (!target) {continue;}
    _stampNode(target, c.v);
    try {
      await device.setStoreValue?.('zb_ieee_address', String(c.v)).catch?.(() => {});
    } catch (_e) { /* noop */ }
    device._ieeeHealAt = now;
    device._ieeeHealOk = true;
    device._ieeeHealValue = String(c.v);
    try { device.log?.(`[P2314] healed Zigbee IEEE via ${c.via}`); } catch (_e) { /* noop */ }
    return { ok: true, ieee: String(c.v), via: c.via };
  }

  device._ieeeHealAt = now;
  device._ieeeHealOk = false;
  return out;
}

function _looksLikeIeee(v) {
  if (v == null) {return false;}
  if (Buffer.isBuffer(v) && v.length === 8) {return true;}
  const s = String(v).replace(/[:\-\s]/g, '').replace(/^0x/i, '');
  // 16 hex chars = EUI-64; reject UUIDs / short tokens
  return /^[0-9a-fA-F]{16}$/.test(s) && !/^0+$/.test(s);
}

function _stampNode(node, ieee) {
  if (!node || ieee == null) {return;}
  try {
    const s = String(ieee);
    if (!node.ieeeAddr) {
      try { node.ieeeAddr = s; } catch (_e) {
        try { Object.defineProperty(node, 'ieeeAddr', { value: s, writable: true, configurable: true }); } catch (__e) { /* noop */ }
      }
    }
    if (!node.ieeeAddress) {
      try { node.ieeeAddress = s; } catch (_e) {
        try { Object.defineProperty(node, 'ieeeAddress', { value: s, writable: true, configurable: true }); } catch (__e) { /* noop */ }
      }
    }
  } catch (_e) { /* noop */ }
}

function isMissingIeeeError(err) {
  const msg = String(err?.message || err || '');
  return /Missing Zigbee Node'?s? IEEE Address/i.test(msg)
    || /ieee address/i.test(msg) && /missing|not ready|undefined/i.test(msg);
}

module.exports = {
  healZigbeeNodeIdentity,
  isMissingIeeeError,
  _looksLikeIeee,
};

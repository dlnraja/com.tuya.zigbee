'use strict';

const { parseTuyaMultiDpFrame } = require('../TuyaDataPoints');

/**
 * P3064: receive-only Tuya datapoint listener for drivers whose base class has no EF00 layer
 * (e.g. TuyaZigbeeDevice smoke sensors that also host TS0601 couples).
 * Nothing is ever written to 0xEF00 here: no query, no magic packet, no time sync.
 * Order: the shared tuyaEF00Manager when present, otherwise the raw cluster (dataReport/response),
 * multi-DP frames split like UnifiedCoverBase does.
 */
function _scalar(d) {
  if (Buffer.isBuffer(d.data)) {
    if (d.data.length === 0) { return null; }
    return d.data.length === 1 ? d.data[0] : d.data.readUIntBE(0, Math.min(d.data.length, 4));
  }
  return d.value ?? d.data;
}

function attach(device, handler) {
  if (!device || typeof handler !== 'function' || device._passiveDpRxAttached) { return false; }
  const safe = (dp, v) => {
    if (device._destroyed || dp === undefined || dp === null || v === null || v === undefined) { return; }
    try { handler(Number(dp), v); } catch (e) { try { device.log?.('[PASSIVE-DP] rx', dp, e.message); } catch (_) { /* noop */ } }
  };
  const mgr = device.tuyaEF00Manager;
  if (mgr && typeof mgr.on === 'function') {
    mgr.on('dpReport', ({ dpId, value } = {}) => safe(dpId, value));
    device._passiveDpRxAttached = 'manager';
    return true;
  }
  const ep = device.zclNode?.endpoints?.[1]?.clusters;
  const tc = ep?.tuya || ep?.[61184] || ep?.['61184'];
  if (!tc || typeof tc.on !== 'function') { return false; }
  const h = (d) => {
    if (!d || d.dp === undefined) { return; }
    if (Buffer.isBuffer(d.data) && typeof d.length === 'number' && d.data.length > d.length) {
      for (const sub of parseTuyaMultiDpFrame(d)) { safe(sub.dp, _scalar({ data: sub.data })); }
      return;
    }
    safe(d.dp, _scalar(d));
  };
  tc.on('dataReport', h);
  tc.on('response', (s, t, d) => h(d));
  device._passiveDpRxAttached = 'cluster';
  return true;
}

module.exports = { attach, _scalar };

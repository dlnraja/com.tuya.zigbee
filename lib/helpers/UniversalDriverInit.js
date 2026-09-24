'use strict';

/**
 * UniversalDriverInit - v5.5.929
 * Universal initialization for ZCL, Tuya DP, and protocols
 */

const PROTOCOL = {
  ZCL: 'ZCL_ONLY',
  TUYA: 'TUYA_DP', 
  HYBRID: 'HYBRID',
  UNKNOWN: 'UNKNOWN'
};

const TUYA_CLUSTER = 0xEF00;

const { equalsCI, startsWithCI } = require('../utils/CaseInsensitiveMatcher');

function detectProtocol(device, zclNode) {
  const settings = device.getSettings?.() || {};
  const store = device.getStore?.() || {};
  const modelId = settings.zb_model_id || store.modelId || '';
  const mfr = settings.zb_manufacturer_name || store.manufacturerName || '';

  // TS0601 or _TZE = Tuya DP
  if (equalsCI(modelId, 'TS0601') || startsWithCI(mfr, '_TZE')) {return PROTOCOL.TUYA;}
  
  const ep1 = zclNode?.endpoints?.[1];
  const hasTuya = ep1?.clusters?.[TUYA_CLUSTER] || ep1?.clusters?.tuya;
  const hasZCL = ep1?.clusters?.onOff || ep1?.clusters?.[6];

  if (hasTuya && hasZCL) {return PROTOCOL.HYBRID;}
  if (hasTuya) {return PROTOCOL.TUYA;}
  if (hasZCL) {return PROTOCOL.ZCL;}
  return PROTOCOL.UNKNOWN;
}

async function initZCL(device, zclNode, clusters = ['onOff']) {
  const ep = zclNode?.endpoints?.[1];
  if (!ep) {return false;}
  
  for (const name of clusters) {
    const cluster = ep.clusters?.[name];
    if (cluster?.bind) {await cluster.bind().catch(() => {});}
  }
  return true;
}

async function initTuyaDP(device, zclNode) {
  const ep = zclNode?.endpoints?.[1];
  const tuya = ep?.clusters?.[TUYA_CLUSTER] || ep?.clusters?.tuya;
  if (!tuya) {return false;}
  
  device._tuyaCluster = tuya;
  ['dataReport', 'response'].forEach(e => {
    tuya.on?.(e, data => device.handleTuyaDP?.(data));
  });
  return true;
}

async function sendTuyaDP(device, dp, value, type = 'bool') {
  // P102: prefer DeviceIOFacade when present (Unified I/O path)
  if (device?.io && typeof device.io.sendDP === 'function') {
    try {
      return !!(await device.io.sendDP(dp, value, { type }));
    } catch (_e) { /* fall through to legacy */ }
  }

  // Prefer EF00 manager (full status/transid/length frame) when present
  if (device?.tuyaEF00Manager && typeof device.tuyaEF00Manager.sendDP === 'function') {
    try {
      return !!(await device.tuyaEF00Manager.sendDP(dp, value, type));
    } catch (_e) { /* fall through */ }
  }

  const tuya = device._tuyaCluster;
  if (!tuya?.datapoint) {return false;}
  
  const typeMap = { bool: 1, value: 2, string: 3, enum: 4 };
  const dt = typeMap[type] || 1;
  let buf;
  
  if (type === 'bool') {buf = Buffer.from([value ? 1 : 0]);}
  else if (type === 'enum') {buf = Buffer.from([Number(value) & 0xff]);}
  else if (type === 'value') {
    buf = Buffer.alloc(4);
    buf.writeUInt32BE(Math.round(Number(value) || 0), 0);
  } else {buf = Buffer.from(String(value));}

  // WHY(P2711 / Michaelp #2253): Homey zigbee-clusters rejects unknown keys like `value`;
  // COMMANDS.datapoint requires status + transid + dp + datatype + length + data.
  const transid = Math.floor(Math.random() * 255);
  await tuya.datapoint({
    status: 0,
    transid,
    dp: Number(dp) & 0xff,
    datatype: dt,
    length: buf.length,
    data: buf,
  });
  return true;
}

module.exports = { PROTOCOL, detectProtocol, initZCL, initTuyaDP, sendTuyaDP };

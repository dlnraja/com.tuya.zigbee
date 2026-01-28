'use strict';

/**
 * UniversalDriverInit - v5.5.929
 * Universal initialization for ZCL, Tuya DP, and Hybrid protocols
 */

const PROTOCOL = {
  ZCL: 'ZCL_ONLY',
  TUYA: 'TUYA_DP', 
  HYBRID: 'HYBRID',
  UNKNOWN: 'UNKNOWN'
};

const TUYA_CLUSTER = 0xEF00;

function detectProtocol(device, zclNode) {
  const settings = device.getSettings?.() || {};
  const store = device.getStore?.() || {};
  const modelId = settings.zb_model_id || store.modelId || '';
  const mfr = settings.zb_manufacturer_name || store.manufacturerName || '';

  // TS0601 or _TZE = Tuya DP
  if (modelId === 'TS0601' || mfr.startsWith('_TZE')) return PROTOCOL.TUYA;
  
  const ep1 = zclNode?.endpoints?.[1];
  const hasTuya = ep1?.clusters?.[TUYA_CLUSTER] || ep1?.clusters?.tuya;
  const hasZCL = ep1?.clusters?.onOff || ep1?.clusters?.[6];

  if (hasTuya && hasZCL) return PROTOCOL.HYBRID;
  if (hasTuya) return PROTOCOL.TUYA;
  if (hasZCL) return PROTOCOL.ZCL;
  return PROTOCOL.UNKNOWN;
}

async function initZCL(device, zclNode, clusters = ['onOff']) {
  const ep = zclNode?.endpoints?.[1];
  if (!ep) return false;
  
  for (const name of clusters) {
    const cluster = ep.clusters?.[name];
    if (cluster?.bind) await cluster.bind().catch(() => {});
  }
  return true;
}

async function initTuyaDP(device, zclNode) {
  const ep = zclNode?.endpoints?.[1];
  const tuya = ep?.clusters?.[TUYA_CLUSTER] || ep?.clusters?.tuya;
  if (!tuya) return false;
  
  device._tuyaCluster = tuya;
  ['dataReport', 'response'].forEach(e => {
    tuya.on?.(e, data => device.handleTuyaDP?.(data));
  });
  return true;
}

async function sendTuyaDP(device, dp, value, type = 'bool') {
  const tuya = device._tuyaCluster;
  if (!tuya?.datapoint) return false;
  
  const typeMap = { bool: 1, value: 2, string: 3, enum: 4 };
  const dt = typeMap[type] || 1;
  let buf;
  
  if (type === 'bool') buf = Buffer.from([value ? 1 : 0]);
  else if (type === 'enum') buf = Buffer.from([value]);
  else if (type === 'value') {
    buf = Buffer.alloc(4);
    buf.writeUInt32BE(value);
  } else buf = Buffer.from(String(value));
  
  await tuya.datapoint({ dp, datatype: dt, data: buf });
  return true;
}

module.exports = { PROTOCOL, detectProtocol, initZCL, initTuyaDP, sendTuyaDP };

'use strict';
const { safeParse } = require('./tuyaUtils.js');

const ATTRS = {0:'Raw',1:'Bool',2:'Value',3:'String',4:'Enum',5:'Bitmap'};

function inferType(v) {
  if (typeof v === 'boolean') return {type:'bool',hint:'onoff / alarm_*'};
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v >= 0 && v <= 5) return {type:'enum',hint:'mode/state'};
    if (v >= -400 && v <= 1000) return {type:'temp',hint:'measure_temperature (div10)'};
    if (v >= 0 && v <= 100) return {type:'pct',hint:'measure_battery/humidity'};
    if (v > 100 && v <= 65535) return {type:'raw_val',hint:'meter/power/voltage_mV'};
    return {type:'value('+v+')',hint:'check Z2M/ZHA'};
  }
  if (typeof v === 'string') return {type:'string',hint:'setting/label'};
  if (Buffer.isBuffer(v)) return {type:'raw('+v.length+'B)',hint:'schedule/complex'};
  return {type:'unknown',hint:''};
}

function logUnknownDP(device, dpId, value) {
  if (!device._unknownDPs) device._unknownDPs = {};
  const e = device._unknownDPs[dpId] || {first:Date.now(),count:0,vals:[]};
  e.count++; e.last = Date.now(); e.lastVal = value;
  if (e.vals.length < 8) e.vals.push(value);
  device._unknownDPs[dpId] = e;
  const {type,hint} = inferType(value);
  const mfr = (device.getSetting?.('zb_manufacturer_name') || '?');
  const mdl = (device.getSetting?.('zb_model_id') || '?');
  device.log('[UNKNOWN-DP] DP' + dpId + ' = ' + JSON.stringify(value) + ' | type=' + type + ' | hint=' + hint + ' | mfr=' + mfr + ' | model=' + mdl + ' | seen=' + e.count + 'x');
  if (e.count === 1) device.log('[UNKNOWN-DP] ^ FIRST TIME  add to dpMappings or report for next revision');
  device.setStoreValue('_unknown_dp_' + dpId, {v:value,t:type,c:e.count,ts:Date.now()}).catch(()=>{});
  if (!device._unknownDPTimer) {
    device._unknownDPTimer = setTimeout(() => { logSummary(device); device._unknownDPTimer = null; }, 300000);
  }
}

function logSummary(device) {
  if (!device._unknownDPs) return;
  const entries = Object.entries(device._unknownDPs);
  if (entries.length === 0) return;
  const mfr = (device.getSetting?.('zb_manufacturer_name') || '?');
  const mdl = (device.getSetting?.('zb_model_id') || '?');
  device.log('[UNKNOWN-DP-SUMMARY]  ' + mfr + ' / ' + mdl + ' ');
  for (const [dp, e] of entries) {
    const {type,hint} = inferType(e.lastVal);
    device.log('[UNKNOWN-DP-SUMMARY] DP' + dp + ': ' + type + ' val=' + JSON.stringify(e.lastVal) + ' (' + e.count + 'x)  ' + hint);
  }
  device.log('[UNKNOWN-DP-SUMMARY]  END ');
}

function autoMapUnknownDP(device, dpId, value) {
  if (!device?.hasCapability) return false;
  const {type} = inferType(value);
  const maps = {
    'temp': ['measure_temperature', v => safeParse(v, 10)],
    'pct': ['measure_humidity', v => v],
    'bool': ['onoff', v => Boolean(v)],
  };
  const m = maps[type];
  if (!m) return false;
  const [cap, fn] = m;
  if (!device.hasCapability(cap)) return false;
  const v = fn(value);
  device.log('[AUTO-DP] DP' + dpId + '  ' + cap + ' = ' + v);
  device.setCapabilityValue(cap, v).catch(() => {});
  return true;
}

function logUnknownClusterAttr(device, cluster, attr, value, epId) {
  if (!device._unknownAttrs) device._unknownAttrs = {};
  const key = cluster + '.' + attr;
  const e = device._unknownAttrs[key] || {count:0};
  e.count++; e.last = value; e.ep = epId;
  device._unknownAttrs[key] = e;
  device.log('[UNKNOWN-ZCL] EP' + epId + ' ' + key + ' = ' + JSON.stringify(value) + ' (' + e.count + 'x)');
  device.setStoreValue('_unknown_zcl_' + cluster + '_' + attr, {v:value,c:e.count}).catch(()=>{});
}

module.exports = { logUnknownDP, logUnknownClusterAttr, logSummary, inferType, autoMapUnknownDP, DP_TYPES };




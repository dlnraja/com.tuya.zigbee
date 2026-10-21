'use strict';
/**
 * P2930 — Which Tuya LAN command to use, per protocol and firmware family.
 * Behaviour summarised in our own words from tinytuya (jasonacox, MIT), tuyapi
 * (codetheweb, MIT) and localtuya (rospogrigio / xZetsubou, GPL-3.0, study only):
 *  - CONTROL (7) sets DPs on 3.1-3.3; 3.4/3.5 firmwares expect CONTROL_NEW (13).
 *  - "device22"/type_0d firmwares (22-char ids on 3.3) answer status only to
 *    CONTROL_NEW with an explicit dps list.
 *  - DP_QUERY (10) reads all DPs; 3.4+ uses DP_QUERY_NEW (16).
 *  - UPDATEDPS (18) asks devices that never push (energy DPs 18-20 …) to refresh.
 *  - Gateway sub-devices (Zigbee/BLE behind a WiFi hub) are addressed by "cid".
 */
const CMD = Object.freeze({ CONTROL: 7, STATUS: 8, HEART_BEAT: 9, DP_QUERY: 10, CONTROL_NEW: 13, DP_QUERY_NEW: 16, UPDATEDPS: 18 });

function verNum(v) { const n = parseFloat(String(v || '3.3')); return Number.isFinite(n) ? n : 3.3; }
function isDevice22(id, version) { return typeof id === 'string' && id.length === 22 && verNum(version) <= 3.3; }

function setCommand(version, opts = {}) {
  if (opts.forceControlNew) {return CMD.CONTROL_NEW;}
  return verNum(version) >= 3.4 ? CMD.CONTROL_NEW : CMD.CONTROL;
}

function queryCommand(version, id) {
  if (verNum(version) >= 3.4) {return CMD.DP_QUERY_NEW;}
  if (isDevice22(id, version)) {return CMD.CONTROL_NEW;}
  return CMD.DP_QUERY;
}

/** Bounded UPDATEDPS payload: only valid DP ids, deduped, max 32. */
function refreshPayload(dpIds) {
  const ids = [...new Set((dpIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 256))].slice(0, 32);
  return { dpId: ids.length ? ids : [18, 19, 20] };
}

/** Wrap a DP write for a gateway sub-device when a cid is known. */
function setPayload(dps, opts = {}) {
  const body = { dps: { ...dps } };
  if (opts.cid) {body.cid = String(opts.cid);}
  return body;
}

module.exports = { CMD, setCommand, queryCommand, refreshPayload, setPayload, isDevice22 };

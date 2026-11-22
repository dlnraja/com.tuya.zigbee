'use strict';

/**
 * P3372 - generic Tuya fault bitmap (cloud labels) -> alarm_*. Device-type tables: FaultBitmapDecoder.js.
 *
 * Source: Homey forum 146735 post 509 (Arete Two dehumidifiers):
 * https://community.homey.app/t/146735/509
 * The cloud DP table carries { code: "fault", type: "Bitmap", values: { label: [...] } }
 * (labels there: tankfull, defrost, E1, E2, L2, L3, L4, wet). Bit n set = label[n] active.
 * Users saw the tank state in the device info but no capability/trigger changed.
 *
 * Mapping (alarm_* only, no invented capability):
 *   tank-full words      -> alarm_water   (only when the device already has it)
 *   any other active bit -> alarm_problem (Homey system capability, added once, additive)
 * Homey's own "alarm turned on/off" cards give the flow trigger on change.
 */

const TANK_RE = /^(tankfull|tank_full|water_full|full_water|waterfull|full|bucket_full|tank)$/i;
const INFO_RE = /^(defrost|defrosting)$/i; // a state, not a problem

/**
 * @param {number|string|boolean[]|Buffer} raw
 * @param {string[]} labels
 * @returns {string[]} active labels (unknown bits as "bit<n>")
 */
function decode(raw, labels = []) {
  let n = 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) {n = raw >>> 0;}
  else if (typeof raw === 'string' && /^\d+$/.test(raw)) {n = Number(raw) >>> 0;}
  else if (typeof raw === 'string' && /^(0x)?[0-9a-f]+$/i.test(raw)) {n = parseInt(raw.replace(/^0x/i, ''), 16) >>> 0;}
  else if (Buffer.isBuffer(raw)) {for (const b of raw) {n = ((n << 8) | b) >>> 0;}}
  else if (Array.isArray(raw)) {raw.forEach((b, i) => { if (b) {n |= 1 << i;} });}
  const out = [];
  for (let i = 0; i < 32; i++) {
    if (n & (1 << i)) {out.push(labels[i] ? String(labels[i]) : `bit${i}`);}
  }
  return out;
}

/** @returns {{alarm_water:boolean, alarm_problem:boolean, active:string[]}} */
function toAlarms(active) {
  const list = Array.isArray(active) ? active : [];
  return {
    active: list,
    alarm_water: list.some((l) => TANK_RE.test(l)),
    alarm_problem: list.some((l) => !TANK_RE.test(l) && !INFO_RE.test(l)),
  };
}

/**
 * Find a fault bitmap in a cloud DP table (tinytuya "mapping" / OpenAPI functions+status).
 * @returns {{dp:number, labels:string[]}|null}
 */
function findFaultDp(device) {
  if (!device || typeof device !== 'object') {return null;}
  const parse = (v) => { if (typeof v === 'string') { try { return JSON.parse(v) || {}; } catch (_e) { return {}; } } return v && typeof v === 'object' ? v : {}; };
  const check = (dp, e) => {
    if (!e || !/^bitmap$/i.test(String(e.type || ''))) {return null;}
    if (!/fault|alarm|error/i.test(String(e.code || ''))) {return null;}
    const vals = parse(e.values);
    const labels = Array.isArray(vals.label) ? vals.label.map(String).slice(0, 32) : [];
    const id = Number(dp);
    return Number.isInteger(id) && id > 0 && id < 256 ? { dp: id, labels } : null;
  };
  if (device.mapping && typeof device.mapping === 'object') {
    for (const [dp, e] of Object.entries(device.mapping)) { const r = check(dp, e); if (r) {return r;} }
  }
  for (const k of ['status', 'functions']) {
    if (!Array.isArray(device[k])) {continue;}
    for (const e of device[k]) { const r = e && check(e.dp_id, e); if (r) {return r;} }
  }
  return null;
}

module.exports = { decode, toAlarms, findFaultDp, TANK_RE };

'use strict';
/**
 * P2956 — Read a cloud DP table carried on a discovered device, when one is present.
 * Shapes handled (field names from public formats, parsing is our own):
 *  - tinytuya wizard devices.json "mapping": { "<dp>": { code, type, values } } (jasonacox/tinytuya)
 *  - Tuya OpenAPI specification arrays "functions" / "status": [{ dp_id, code, type, values }]
 *  - a plain "dps" object { "<dp>": value }
 * Used by forum 154077 #491 (Andi, https://community.homey.app/t/154077/491): the words a
 * motor expects on DP1 come from its DP table. No table -> null, callers keep old behaviour.
 */
function parseValues(v) {
  if (!v) {return {};}
  if (typeof v === 'string') { try { return JSON.parse(v) || {}; } catch (_e) { return {}; } }
  return typeof v === 'object' ? v : {};
}

/** @returns {Object<string,{type:string,range:string[]|null,code:string|null}>} */
function readTable(device) {
  const out = {};
  if (!device || typeof device !== 'object') {return out;}
  const add = (dp, e) => {
    const id = Number(dp);
    if (!Number.isInteger(id) || id < 1 || id > 255 || !e) {return;}
    const vals = parseValues(e.values);
    const range = Array.isArray(vals.range) ? vals.range.map(String) : null;
    out[String(id)] = { type: String(e.type || '').toLowerCase(), range, code: e.code || null };
  };
  if (device.mapping && typeof device.mapping === 'object') {
    for (const [dp, e] of Object.entries(device.mapping)) {add(dp, e);}
  }
  for (const k of ['functions', 'status']) {
    if (Array.isArray(device[k])) {for (const e of device[k]) {if (e && e.dp_id !== undefined && !out[String(e.dp_id)]) {add(e.dp_id, e);}}}
  }
  return out;
}

/** Enum range for one DP, or null. */
function enumRange(device, dp = 1) {
  const e = readTable(device)[String(dp)];
  return e && e.type === 'enum' && e.range && e.range.length ? e.range : null;
}

/** Representative dps (for driver suggestion) built from the table or a plain dps object. */
function sampleDps(device) {
  if (device && device.dps && typeof device.dps === 'object') {return { ...device.dps };}
  const dps = {};
  for (const [dp, e] of Object.entries(readTable(device))) {
    if (e.type === 'bool' || e.type === 'boolean') {dps[dp] = false;}
    else if (e.type === 'enum' && e.range && e.range.length) {dps[dp] = e.range.includes('stop') ? 'stop' : e.range[0];}
    else if (e.type === 'value' || e.type === 'integer') {dps[dp] = 0;}
  }
  return dps;
}

/** Schema shape expected by CoverModeInference ({dp:{type:'enum',range}}). */
function toSchema(device) {
  const s = {};
  for (const [dp, e] of Object.entries(readTable(device))) {if (e.type === 'enum' && e.range) {s[dp] = { type: 'enum', range: e.range };}}
  return s;
}

module.exports = { readTable, enumRange, sampleDps, toSchema };

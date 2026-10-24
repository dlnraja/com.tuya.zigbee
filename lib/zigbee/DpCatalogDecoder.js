'use strict';

/**
 * P3018: exact Tuya DP decoding from the shipped per-couple catalogue
 * (lib/zigbee/data/unknown-dp-catalog.json v2: names + converter tokens).
 *
 * Converter semantics are re-expressed facts from zigbee-herdsman-converters `valueConverter`
 * (MIT, Koenkk and contributors) — rewritten, not copied; see docs/knowledge/KB_SOURCES.md.
 *
 * Pure functions + one guarded helper (capabilityFor) that never writes by itself:
 *  - entry(mfr, pid, dp)       → { name, conv } | null   (caseless couple)
 *  - decode(conv, raw)         → { value } | null        (null = no exact decoder → keep generic typed value)
 *  - capabilityFor(device, dp, raw)
 *        → null                                    catalogue does not know this DP for this couple
 *        → { known:true, capability:null, reason } catalogue knows it but it must NOT be written
 *                                                  (no matching capability / driver owns it / out of range)
 *        → { known:true, capability, value, source } safe exact write candidate
 */

let _catalog = null;
function _cat() {
  if (_catalog === null) {
    try { _catalog = require('./data/unknown-dp-catalog.json'); } catch (_e) { _catalog = false; }
  }
  return _catalog || null;
}

function _key(mfr, pid) { return `${String(mfr || '').toLowerCase()}|${String(pid || '').toUpperCase()}`; }

/** Catalogue row for one DP of one couple. */
function entry(mfr, pid, dp) {
  const cc = _couple(mfr, pid);
  if (cc === undefined) { return _entryFull(mfr, pid, dp); }
  const row = cc ? cc.rows.find((r) => r.dp === Number(dp)) : null;
  return row ? { name: row.name, conv: row.conv } : null;
}

// P3023: per-couple lookups go through the sharded CatalogStore (no whole-catalogue parse);
// undefined = store unavailable → original full-catalogue path below.
function _couple(mfr, pid) {
  try { return require('../memory/CatalogStore').couple(mfr, pid); } catch (_e) { return undefined; }
}

function _entryFull(mfr, pid, dp) {
  const c = _cat();
  if (!c || !c.idx) { return null; }
  const pi = c.idx[_key(mfr, pid)];
  if (!Number.isInteger(pi)) { return null; }
  const prof = c.profiles[pi] || [];
  const cv = (c.cv && c.cv[pi]) || [];
  for (let i = 0, j = 0; i < prof.length; i += 2, j++) {
    if (prof[i] === Number(dp)) {
      const ci = cv[j];
      return { name: c.names[prof[i + 1]] || null, conv: Number.isInteger(ci) && ci >= 0 && c.convs ? c.convs[ci] : null };
    }
  }
  return null;
}

/** All catalogue DPs of a couple: [{dp, name, conv}]. */
function coupleDps(mfr, pid) {
  const cc = _couple(mfr, pid);
  if (cc !== undefined) { return cc ? cc.rows.map((r) => ({ dp: r.dp, name: r.name, conv: r.conv })) : []; }
  const c = _cat();
  if (!c || !c.idx) { return []; }
  const pi = c.idx[_key(mfr, pid)];
  if (!Number.isInteger(pi)) { return []; }
  const prof = c.profiles[pi] || [];
  const cv = (c.cv && c.cv[pi]) || [];
  const out = [];
  for (let i = 0, j = 0; i < prof.length; i += 2, j++) {
    const ci = cv[j];
    out.push({ dp: prof[i], name: c.names[prof[i + 1]] || null, conv: Number.isInteger(ci) && ci >= 0 && c.convs ? c.convs[ci] : null });
  }
  return out;
}

function _num(raw) {
  if (typeof raw === 'number') { return raw; }
  if (typeof raw === 'boolean') { return raw ? 1 : 0; }
  if (Buffer.isBuffer(raw) && raw.length > 0 && raw.length <= 4) { return raw.readUIntBE(0, raw.length); }
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

const _lk = new Map(); // parsed lookup tokens (bounded by catalogue convs size)

/** Decode one raw DP value with a converter token. */
function decode(conv, raw) {
  if (!conv) { return null; }
  const [k, arg = ''] = String(conv).split(/:(.*)/s);
  const n = _num(raw);
  switch (k) {
  case 'raw': return { value: typeof raw === 'boolean' || typeof raw === 'number' ? raw : Number.isFinite(n) ? n : raw };
  case 'div': return Number.isFinite(n) && Number(arg) > 0 ? { value: n / Number(arg) } : null;
  case 'divFrom': return Number.isFinite(n) && Number(arg) > 0 ? { value: n / Number(arg) } : null;
  case 'mul': return Number.isFinite(n) ? { value: n * Number(arg) } : null;
  case 'tf': return Number.isFinite(n) ? { value: n === Number(arg) } : null;
  case 'inv': return { value: !(Number.isFinite(n) ? n !== 0 : !!raw) };
  case 'onOff':
  case 'bool': return { value: Number.isFinite(n) ? n !== 0 : !!raw };
  case 'batt3': return Number.isFinite(n) && n >= 0 && n <= 2 ? { value: ['low', 'medium', 'high'][n] } : null;
  case 'twos8': {
    if (!Number.isFinite(n)) { return null; }
    const s = n >= 128 ? n - 256 : n;
    return { value: s / (Number(arg) || 1) };
  }
  case 'power': return Number.isFinite(n) ? { value: n > 0x0fffffff ? (0x1999999c - n) * -1 : n } : null;
  case 'plus1': return Number.isFinite(n) ? { value: n + 1 } : null;
  case 'scale': {
    const [a, b, c, d] = arg.split(',').map(Number);
    if (!Number.isFinite(n) || b === a) { return null; }
    // device range [c..d] → user range [a..b] (upstream `from` direction)
    return { value: ((n - c) * (b - a)) / (d - c) + a };
  }
  case 'lookup': {
    let m = _lk.get(arg);
    if (!m) { try { m = JSON.parse(arg); } catch (_e) { m = {}; } if (_lk.size < 512) { _lk.set(arg, m); } }
    const lab = typeof raw === 'boolean' ? m[String(raw)] : m[String(Number.isFinite(n) ? n : raw)];
    return lab === undefined ? null : { value: lab };
  }
  default: return null;
  }
}

// WHY: only measurements / alarms are auto-applied — control capabilities (onoff, dim, target)
// would fight the driver's own command path. Battery stays with BatteryCalculator.
const NAME_CAP = Object.freeze({
  temperature: 'measure_temperature', local_temperature: 'measure_temperature',
  humidity: 'measure_humidity', soil_moisture: 'measure_humidity',
  illuminance: 'measure_luminance', illuminance_lux: 'measure_luminance',
  power: 'measure_power', active_power: 'measure_power', voltage: 'measure_voltage', current: 'measure_current',
  energy: 'meter_power', co2: 'measure_co2', pm25: 'measure_pm25', voc: 'measure_voc', formaldehyd: 'measure_formaldehyde',
  occupancy: 'alarm_motion', presence: 'alarm_motion', contact: 'alarm_contact', water_leak: 'alarm_water',
  smoke: 'alarm_smoke', tamper: 'alarm_tamper', vibration: 'alarm_vibration', battery_low: 'alarm_battery',
  gas: 'alarm_gas', carbon_monoxide: 'alarm_co', co: 'alarm_co',
});

const RANGE = Object.freeze({
  measure_temperature: [-50, 125], measure_humidity: [0, 100], measure_luminance: [0, 200000],
  measure_power: [-100000, 100000], measure_voltage: [0, 500], measure_current: [0, 125], meter_power: [0, 1e9],
  measure_co2: [0, 20000], measure_pm25: [0, 2000], measure_voc: [0, 100000], measure_formaldehyde: [0, 100],
});

const TRUTHY_LABEL = /^(true|presence|present|occupied|motion|move|moving|alarm|leak|detected|on|open|tamper|smoke|low|1)$/i;
const FALSY_LABEL = /^(false|none|clear|unoccupied|no(_|-)?(motion|presence)|normal|off|closed|close|ok|safe|0|high|medium)$/i;

function _driverOwns(device, cap) {
  try {
    const m = device.dpMappings;
    if (m && typeof m === 'object') {
      for (const row of Object.values(m)) { if (row && (row.capability === cap)) { return true; } }
    }
  } catch (_e) { /* getter may throw on half-initialised devices */ }
  return false;
}

// WHY: many drivers decode DPs in a hand-written handler (switch/case) instead of dpMappings.
// If the driver's own code mentions this DP, the driver owns it → never write from the catalogue.
const HANDLER_NAMES = ['_handleDP', 'handleDP', '_handleDp', '_onDataPoint', 'onDataPoint', '_processDP', 'processDP', 'onTuyaDP', '_onTuyaDP', 'handleTuyaDP', '_handleTuyaDP', '_handleDatapoint', 'handleDatapoint', '_onDP', 'onDP'];
const _srcCache = new WeakMap();
function _handlerSource(device) {
  const ctor = device && device.constructor;
  if (!ctor || typeof ctor !== 'function') { return ''; }
  if (_srcCache.has(ctor)) { return _srcCache.get(ctor); }
  let src = '';
  try {
    let proto = Object.getPrototypeOf(device);
    let depth = 0;
    while (proto && proto !== Object.prototype && depth < 4) {
      const name = proto.constructor && proto.constructor.name;
      if (/^(TuyaUnifiedDevice|TuyaZigbeeDevice|BaseUnifiedDevice|ZigBeeDevice|Device|SimpleClass)$/.test(name || '')) { break; }
      for (const m of HANDLER_NAMES) {
        const d = Object.getOwnPropertyDescriptor(proto, m);
        if (d && typeof d.value === 'function') { src += Function.prototype.toString.call(d.value).slice(0, 60000); }
      }
      proto = Object.getPrototypeOf(proto);
      depth++;
    }
  } catch (_e) { src = ''; }
  _srcCache.set(ctor, src);
  return src;
}
function _customHandles(device, dp) {
  const src = _handlerSource(device);
  if (!src) { return false; }
  const n = Number(dp);
  return new RegExp(`(case\\s+${n}\\s*:|\\b(?:dp|dpId|dpid|id)\\s*===?\\s*${n}\\b|\\b${n}\\s*===?\\s*(?:dp|dpId|dpid|id)\\b)`).test(src);
}

/** Decide whether an unknown DP can be written to an existing capability from the catalogue. */
function capabilityFor(device, dp, raw) {
  try {
    if (!device) { return null; }
    const s = (k) => (typeof device.getSetting === 'function' ? device.getSetting(k) : null) || (typeof device.getStoreValue === 'function' ? device.getStoreValue(k) : null);
    const mfr = s('zb_manufacturer_name');
    const pid = s('zb_model_id') || s('zb_product_id');
    const e = entry(mfr, pid, dp);
    if (!e || !e.name) { return null; }
    const no = (reason) => ({ known: true, capability: null, name: e.name, conv: e.conv, reason });
    // project research (data/dp_couple_knowledge.json) sometimes names the DP by its Homey capability
    const cap = NAME_CAP[e.name] || (/^(measure_(?!battery)|alarm_(?!battery)|meter_)[a-z0-9_.]+$/.test(e.name) ? e.name : null);
    if (!cap) { return no('name-not-auto-applied'); }
    if (typeof device.hasCapability !== 'function' || !device.hasCapability(cap)) { return no('capability-absent'); }
    if (_driverOwns(device, cap)) { return no('driver-owns-capability'); }
    if (_customHandles(device, dp)) { return no('driver-handles-dp'); }
    const owners = device._dpCatOwner || (device._dpCatOwner = new Map());
    if (owners.has(cap) && owners.get(cap) !== Number(dp)) { return no('capability-owned-by-other-dp'); }
    const d = decode(e.conv, raw);
    if (!d) { return no(e.conv ? 'undecodable' : 'no-exact-converter'); }
    let v = d.value;
    if (cap.startsWith('alarm_')) {
      if (typeof v === 'string') {
        if (TRUTHY_LABEL.test(v)) { v = true; } else if (FALSY_LABEL.test(v)) { v = false; } else { return no('label-not-boolean'); }
      }
      if (typeof v !== 'boolean') { return no('type-mismatch'); }
    } else {
      if (typeof v !== 'number' || !Number.isFinite(v)) { return no('type-mismatch'); }
      const r = RANGE[cap];
      if (r && (v < r[0] || v > r[1])) { return no('out-of-range'); }
      v = Math.round(v * 1000) / 1000;
    }
    if (!owners.has(cap) && owners.size < 32) { owners.set(cap, Number(dp)); }
    return { known: true, capability: cap, value: v, name: e.name, conv: e.conv, source: `z2m:tuyaDatapoints ${String(pid || '').toUpperCase()} DP${dp}=${e.name} (${e.conv})` };
  } catch (_e) { return null; }
}

// Broader name → capability (incl. battery/controls) used ONLY to veto a heuristic guess that
// contradicts the catalogue; never used to write.
const VETO_CAP = Object.freeze({
  battery: 'measure_battery', battery_percentage: 'measure_battery', battery_state: 'measure_battery', measure_battery: 'measure_battery',
  state: 'onoff', state_l1: 'onoff', switch: 'onoff', onoff: 'onoff', brightness: 'dim', position: 'windowcoverings_set',
});
const _root = (c) => String(c || '').split('.')[0];
/**
 * P3018: may a universal/heuristic mapping write `cap` for this DP? true when the catalogue does
 * not know the DP; otherwise only when the catalogue name means the same capability. WHY: a
 * heuristic "DP1 = temperature÷10" must not fire on a couple whose DP1 is documented as e.g.
 * sensitivity, but a matching guess (battery on a documented battery DP) keeps working.
 */
function heuristicAllowed(device, dp, cap) {
  try {
    const s = (k) => (typeof device.getSetting === 'function' ? device.getSetting(k) : null) || (typeof device.getStoreValue === 'function' ? device.getStoreValue(k) : null);
    const e = entry(s('zb_manufacturer_name'), s('zb_model_id') || s('zb_product_id'), dp);
    if (!e || !e.name) { return true; }
    const target = NAME_CAP[e.name] || VETO_CAP[e.name] || (/^(measure_|alarm_|meter_)[a-z0-9_.]+$/.test(e.name) ? e.name : null);
    return !!target && _root(target) === _root(cap);
  } catch (_e) { return true; }
}

function _resetForTests() { _catalog = null; _lk.clear(); }

module.exports = { entry, coupleDps, decode, capabilityFor, heuristicAllowed, VETO_CAP, NAME_CAP, RANGE, _customHandles, _driverOwns, _resetForTests };

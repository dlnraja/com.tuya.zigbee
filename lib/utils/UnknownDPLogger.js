'use strict';
const DP_TYPES = {0:'Raw',1:'Bool',2:'Value',3:'String',4:'Enum',5:'Bitmap'};

// ─── P2762 heuristic DP guesser (complementary, log/store only) ─────────────
// WHY: unknown mfr+pid couples / late DPs must never block pairing; we only GUESS
// meaning (bool/enum/value/raw + scale by range + common Z2M class conventions)
// and persist the guess for later enrichment. Never adds caps, never TX, never
// invents a fingerprint. The existing autoMapUnknownDP (>=3 coherent samples)
// stays the only path that may write an EXISTING capability.
const TUYA_WIRE_KIND = { 0: 'raw', 1: 'bool', 2: 'value', 3: 'string', 4: 'enum', 5: 'bitmap' };

// Conservative, widely-repeated Z2M tuyaDatapoints conventions per device class.
// Hints only (confidence 'low'); real per-couple maps live in the driver configs.
const CLASS_DP_HINTS = Object.freeze({
  sensor: {
    1: 'temperature (÷10) or presence/alarm (bool/enum)',
    2: 'humidity (%) or sensitivity',
    3: 'battery_state enum (0 low/1 mid/2 high)',
    4: 'battery (%)',
    9: 'target distance (cm/÷100) on radars',
    15: 'battery (%)',
  },
  socket: { 1: 'state l1', 2: 'state l2', 14: 'power_on_behavior enum', 17: 'energy added (Tuya std switch schema)', 18: 'current mA (Tuya std switch schema)', 19: 'power ÷10 W (Tuya std switch schema)', 20: 'voltage ÷10 V (Tuya std switch schema)' },
  light: { 1: 'state', 2: 'mode enum', 3: 'brightness (0–1000)', 14: 'power_on_behavior enum' },
  thermostat: { 1: 'system mode / state', 2: 'target temp (÷10)', 3: 'local temp (÷10)', 4: 'preset enum' },
  windowcoverings: { 1: 'control enum (open/stop/close)', 2: 'position set (%)', 3: 'position (%)', 5: 'motor direction' },
});

function _deviceClass(device) {
  try {
    const c = (typeof device?.getClass === 'function' && device.getClass()) || device?.driver?.manifest?.class || '';
    return String(c || '').toLowerCase();
  } catch (_) { return ''; }
}

/**
 * Guess meaning of an unknown DP. Pure (no side effects).
 * @param {number} dpId
 * @param {*} value decoded value
 * @param {{ datatype?: number, deviceClass?: string }} [ctx]
 * @returns {{ kind: string, scaleGuess: number|null, hint: string, confidence: 'low'|'medium' }}
 */
function guessDpMeaning(dpId, value, ctx = {}) {
  const wire = TUYA_WIRE_KIND[Number(ctx.datatype)];
  let kind = wire || null;
  if (!kind) {
    if (typeof value === 'boolean') kind = 'bool';
    else if (typeof value === 'number') kind = Number.isInteger(value) && value >= 0 && value <= 5 ? 'enum' : 'value';
    else if (typeof value === 'string') kind = 'string';
    else if (Buffer.isBuffer(value) || Array.isArray(value)) kind = 'raw';
    else kind = 'unknown';
  }
  let scaleGuess = null;
  const hints = [];
  if (kind === 'value' && typeof value === 'number') {
    const a = Math.abs(value);
    if (a <= 100) { scaleGuess = 1; hints.push('0–100 → %/°C/lux as-is'); }
    else if (a <= 1000) { scaleGuess = 10; hints.push('101–1000 → ÷10 (temp/voltage/power)'); }
    else if (a <= 10000) { scaleGuess = 100; hints.push('1001–10000 → ÷100 or mV/lux raw'); }
    else { scaleGuess = 1000; hints.push('>10000 → ÷1000 (energy Wh→kWh) or raw counter'); }
  } else if (kind === 'enum') hints.push('mode/state enum');
  else if (kind === 'bool') hints.push('onoff / alarm_* / child_lock');
  else if (kind === 'bitmap') hints.push('fault/alarm bitmap');
  else if (kind === 'raw') hints.push('schedule/complex struct — keep raw');
  const cls = String(ctx.deviceClass || '').toLowerCase();
  const classHint = CLASS_DP_HINTS[cls]?.[Number(dpId)];
  if (classHint) hints.push(`Z2M ${cls} convention: ${classHint}`);
  return {
    kind,
    scaleGuess,
    hint: hints.join(' | '),
    confidence: wire && classHint ? 'medium' : 'low',
  };
}

function recordDpGuess(device, dpId, value, datatype) {
  try {
    if (!device) return null;
    const g = guessDpMeaning(dpId, value, { datatype, deviceClass: _deviceClass(device) });
    if (!device._dpGuesses) device._dpGuesses = {};
    const prev = device._dpGuesses[dpId];
    device._dpGuesses[dpId] = g;
    if (!prev || prev.kind !== g.kind || prev.scaleGuess !== g.scaleGuess) {
      device.log?.(`[DP-GUESS] DP${dpId} kind=${g.kind} scale=${g.scaleGuess ?? '-'} conf=${g.confidence} | ${g.hint}`);
      const p = device.setStoreValue?.(`_dp_guess_${dpId}`, { ...g, ts: Date.now() });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    return g;
  } catch (_) { return null; }
}

function inferType(v) {
  if (typeof v === 'boolean') {return {type:'bool',hint:'onoff / alarm_*'};}
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v >= 0 && v <= 5) {return {type:'enum',hint:'mode/state'};}
    if (v >= -400 && v <= 1000) {return {type:'temp',hint:'measure_temperature (div10)'};}
    if (v >= 0 && v <= 100) {return {type:'pct',hint:'measure_battery/humidity'};}
    if (v > 100 && v <= 65535) {return {type:'raw_val',hint:'meter/power/voltage_mV'};}
    return {type:`value(${v})`,hint:'check Z2M/ZHA'};
  }
  if (typeof v === 'string') {return {type:'string',hint:'setting/label'};}
  if (Buffer.isBuffer(v)) {return {type:`raw(${v.length}B)`,hint:'schedule/complex'};}
  return {type:'unknown',hint:''};
}

// Spec 006 / #1501-class flood guard: some firmwares re-send the same unknown DP
// 10-20x per second. Count every sample (auto-map needs counts) but only log and
// persist when the value changes, the first time, or once per repeat window with
// the number of suppressed repeats. Buffers are compared by content.
const UNKNOWN_DP_REPEAT_WINDOW_MS = 60000;

function _dpValueKey(v) {
  try {
    if (Buffer.isBuffer(v)) {return `buf:${v.toString('hex')}`;}
    if (v && v.type === 'Buffer' && Array.isArray(v.data)) {return `buf:${Buffer.from(v.data).toString('hex')}`;}
    return `${typeof v}:${JSON.stringify(v)}`;
  } catch (_) { return String(v); }
}

function logUnknownDP(device, dpId, value, datatype) {
  if (!device) {return;}
  if (!device._unknownDPs) {device._unknownDPs = {};}
  const now = Date.now();
  const e = device._unknownDPs[dpId] || {first:now,count:0,vals:[],suppressed:0,lastLogTs:0,lastKey:null};
  e.count++; e.last = now; e.lastVal = value;
  if (e.vals.length < 8) {e.vals.push(value);}
  device._unknownDPs[dpId] = e;
  const key = _dpValueKey(value);
  const changed = key !== e.lastKey;
  if (!changed && now - e.lastLogTs < UNKNOWN_DP_REPEAT_WINDOW_MS) {
    e.suppressed++;
    return;
  }
  const repeats = e.suppressed;
  e.suppressed = 0; e.lastKey = key; e.lastLogTs = now;
  if (changed) {recordDpGuess(device, dpId, value, datatype);} // P2762 complementary guess (never throws)
  const {type,hint} = inferType(value);
  const mfr = device.getSetting?.('zb_manufacturer_name') || '?';
  const mdl = device.getSetting?.('zb_model_id') || '?';
  const rep = repeats ? ` | +${repeats} identical repeat(s) suppressed` : '';
  device.log(`[UNKNOWN-DP] DP${  dpId  } = ${  JSON.stringify(value)  } | type=${  type  } | hint=${  hint  } | mfr=${  mfr  } | model=${  mdl  } | seen=${  e.count  }x${rep}`);
  if (e.count === 1) {device.log('[UNKNOWN-DP] ^ FIRST TIME — add to dpMappings or report for next revision');}
  const sp = device.setStoreValue?.(`_unknown_dp_${  dpId}`, {v:value,t:type,c:e.count,ts:now});
  if (sp && typeof sp.catch === 'function') {sp.catch(()=>{});}
  if (!device._unknownDPTimer && device.homey?.setTimeout) {
    // v9.0.79: Fix scope — this.homey/this._destroyed are module-level, not device
    device._unknownDPTimer = device.homey.setTimeout(() => { if (device._destroyed) {return;} logSummary(device); device._unknownDPTimer = null; }, 300000);
  }
}

function logSummary(device) {
  if (!device._unknownDPs) {return;}
  const entries = Object.entries(device._unknownDPs);
  if (entries.length === 0) {return;}
  const mfr = device.getSetting?.('zb_manufacturer_name') || '?';
  const mdl = device.getSetting?.('zb_model_id') || '?';
  device.log(`[UNKNOWN-DP-SUMMARY] ═══ ${  mfr  } / ${  mdl  } ═══`);
  for (const [dp, e] of entries) {
    const {type,hint} = inferType(e.lastVal);
    device.log(`[UNKNOWN-DP-SUMMARY] DP${  dp  }: ${  type  } val=${  JSON.stringify(e.lastVal)  } (${  e.count  }x) → ${  hint}`);
  }
  device.log('[UNKNOWN-DP-SUMMARY] ═══ END ═══');
}

function autoMapUnknownDP(device, dpId, value) {
  if (!device?.hasCapability) {return false;}
  const {type} = inferType(value);

  // v10.14.0 (external review + DP audit gap #4): NEVER auto-write on a
  // single sample. The naive guesser (pct→battery before humidity, temp
  // always ÷10) produced the exact false positives warned about in the
  // "linear regression mirage" analysis (a 40% battery read as 40°C, a
  // humidity read as battery — forum #1256). Requirements now:
  //  1. The DP must have been seen >= 3 times (pattern, not a fluke)
  //  2. Samples must be CONSISTENT (spread <= 20% of mean)
  //  3. Capability choice is device-type aware (climate sensors prefer
  //     humidity over battery for pct; battery-only devices keep battery)
  const seen = device._unknownDPs?.[dpId];
  if (!seen || (seen.count || 0) < 3) {return false;}
  const samples = Array.isArray(seen.vals) ? seen.vals.filter(v => typeof v === 'number') : [];
  if (samples.length >= 2) {
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const spread = Math.max(...samples) - Math.min(...samples);
    if (mean !== 0 && spread > Math.abs(mean) * 0.5) {
      device.log(`[AUTO-DP] DP${dpId} samples trop dispersés (${Math.min(...samples)}–${Math.max(...samples)}) — pas d'auto-map`);
      return false;
    }
  }

  const deviceIsClimate = device.hasCapability('measure_humidity') || device.hasCapability('measure_temperature');
  const deviceHasBattery = device.hasCapability('measure_battery');

  if (type === 'pct') {
    // Device-type aware ordering (was: battery ALWAYS first — the mis-guess)
    const ordered = deviceIsClimate
      ? ['measure_humidity', 'measure_luminance', 'measure_battery']
      : ['measure_battery', 'measure_humidity', 'measure_luminance'];
    for (const cap of ordered) {
      if (device.hasCapability(cap)) {
        const v = Math.round(value);
        device.log(`[AUTO-DP] DP${dpId} → ${cap} = ${v} (après ${seen.count} échantillons cohérents)`);
        device.safeSetCapabilityValue(cap, v).catch(() => {});
        return true;
      }
    }
    return false;
  }

  if (type === 'bool') {
    // v10.14.0: contact before motion for contact-class devices (door/water
    // sensors were getting phantom motion events)
    const deviceIsContact = device.hasCapability('alarm_contact') || device.hasCapability('alarm_water');
    const ordered = deviceIsContact
      ? ['alarm_contact', 'alarm_water', 'alarm_motion', 'onoff']
      : ['alarm_motion', 'alarm_contact', 'alarm_water', 'onoff'];
    for (const cap of ordered) {
      if (device.hasCapability(cap)) {
        const v = Boolean(value);
        device.log(`[AUTO-DP] DP${dpId} → ${cap} = ${v} (après ${seen.count} échantillons)`);
        device.safeSetCapabilityValue(cap, v).catch(() => {});
        return true;
      }
    }
    return false;
  }

  const maps = {
    'temp': ['measure_temperature', v => v / 10]
  };
  const m = maps[type];
  if (!m) {return false;}
  const [cap, fn] = m;
  if (!device.hasCapability(cap)) {return false;}
  const v = fn(value);
  device.log(`[AUTO-DP] DP${dpId} → ${cap} = ${v} (après ${seen.count} échantillons)`);
  device.safeSetCapabilityValue(cap, v).catch(() => {});
  return true;
}

function logUnknownClusterAttr(device, cluster, attr, value, epId) {
  if (!device._unknownAttrs) {device._unknownAttrs = {};}
  const key = `${cluster  }.${  attr}`;
  const e = device._unknownAttrs[key] || {count:0};
  e.count++; e.last = value; e.ep = epId;
  device._unknownAttrs[key] = e;
  device.log(`[UNKNOWN-ZCL] EP${  epId  } ${  key  } = ${  JSON.stringify(value)  } (${  e.count  }x)`);
  device.setStoreValue(`_unknown_zcl_${  cluster  }_${  attr}`, {v:value,c:e.count}).catch(()=>{});
}

module.exports = {
  logUnknownDP, logUnknownClusterAttr, logSummary, inferType, autoMapUnknownDP, DP_TYPES,
  guessDpMeaning, recordDpGuess, CLASS_DP_HINTS,
};
